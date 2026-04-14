import { z } from "zod";

const ROCK_BASE_URL = process.env.ROCK_BASE_URL;
const ROCK_API_KEY = process.env.ROCK_API_KEY;

// --- Zod Schemas ---

// V2 API returns camelCase property names
const CampusSchema = z.object({
  id: z.number(),
  name: z.string(),
  guid: z.string(),
  shortCode: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const ContentChannelItemSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    startDateTime: z.string().nullable().optional(),
    status: z.number(),
  })
  .passthrough();

export type RockCampus = z.infer<typeof CampusSchema>;
export type RockContentChannelItem = z.infer<typeof ContentChannelItemSchema>;

// --- V2 Fetch helpers ---

function rockHeaders(): Record<string, string> {
  return {
    "Authorization-Token": ROCK_API_KEY!,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** POST /api/v2/models/{entity}/search with dynamic LINQ query */
async function rockSearch<T>(
  entity: string,
  query: {
    where?: string;
    sort?: string;
    limit?: number;
    offset?: number;
    select?: string;
  },
  schema: z.ZodType<T>
): Promise<T[]> {
  if (!ROCK_BASE_URL || !ROCK_API_KEY) {
    throw new Error("Rock RMS not configured");
  }

  const url = `${ROCK_BASE_URL}/api/v2/models/${entity}/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: rockHeaders(),
    body: JSON.stringify(query),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Rock API error: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  // V2 search returns { count, items } wrapper
  const items = data.items ?? data;
  return z.array(schema).parse(items);
}

/** GET /api/v2/models/{entity}/{id}/attributevalues */
async function rockAttributeValues(
  entity: string,
  id: number
): Promise<Record<string, { value: string; textValue: string }>> {
  if (!ROCK_BASE_URL || !ROCK_API_KEY) {
    throw new Error("Rock RMS not configured");
  }

  const url = `${ROCK_BASE_URL}/api/v2/models/${entity}/${id}/attributevalues`;
  const res = await fetch(url, {
    headers: rockHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) return {};

  const data = await res.json();
  return data;
}

// --- V1 REST helpers ---

/** GET a V1 REST endpoint with OData filters */
async function rockGet<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  if (!ROCK_BASE_URL || !ROCK_API_KEY) {
    throw new Error("Rock RMS not configured");
  }

  const url = `${ROCK_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: rockHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Rock API error: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return z.array(schema).parse(data);
}

// --- Event schemas (V1, PascalCase) ---

const EventCalendarItemSchema = z.object({
  Id: z.number(),
  EventCalendarId: z.number(),
  EventItemId: z.number(),
  Attributes: z.record(z.unknown()).optional(),
  AttributeValues: z
    .record(
      z.object({ Value: z.string().optional(), TextValue: z.string().optional() }).passthrough(),
    )
    .optional(),
});

const EventItemSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  Summary: z.string().nullable().optional(),
  Description: z.string().nullable().optional(),
  PhotoId: z.number().nullable().optional(),
  IsActive: z.boolean().optional(),
  IsApproved: z.boolean().optional(),
  DetailsUrl: z.string().nullable().optional(),
});

const EventItemOccurrenceSchema = z.object({
  Id: z.number(),
  EventItemId: z.number(),
  CampusId: z.number().nullable().optional(),
  NextStartDateTime: z.string().nullable().optional(),
  Location: z.string().nullable().optional(),
  Note: z.string().nullable().optional(),
});

// --- Public types ---

export interface RockFeaturedEvent {
  eventItemId: number;
  name: string;
  summary: string | null;
  photoUrl: string | null;
  detailsUrl: string | null;
  occurrences: Array<{
    occurrenceId: number;
    campusId: number | null;
    nextStartDateTime: string | null;
  }>;
}

// --- Public API ---

export async function getCampuses(): Promise<RockCampus[]> {
  return rockSearch(
    "campuses",
    {
      where: "IsActive == true",
    },
    CampusSchema
  );
}

export interface WeekendService {
  id: number;
  title: string;
  startDateTime: string | null;
  speaker: string | null;
  contentChannelItemId: number;
}

export async function getWeekendServices(): Promise<WeekendService[]> {
  const channelId = process.env.ROCK_CONTENT_CHANNEL_ID;
  if (!channelId) return [];

  const items = await rockSearch(
    "contentchannelitems",
    {
      where: `ContentChannelId == ${channelId}`,
      sort: "StartDateTime desc",
      limit: 10,
    },
    ContentChannelItemSchema
  );

  // Include both Approved (2) and PendingApproval (1) items
  const filtered = items.filter(
    (item) => item.status === 1 || item.status === 2
  );

  // Fetch attribute values (speaker name) for each item in parallel
  const results = await Promise.all(
    filtered.map(async (item) => {
      const attrs = await rockAttributeValues("contentchannelitems", item.id);
      return {
        id: item.id,
        title: item.title,
        startDateTime: item.startDateTime ?? null,
        speaker: attrs.Speaker?.textValue || null,
        contentChannelItemId: item.id,
      };
    })
  );

  return results;
}

/**
 * Fetch all Featured Events from Rock Calendar 1 (Public).
 *
 * Uses 3 bulk fetches (not per-event) for efficiency:
 *  1. EventCalendarItems for calendar 1 → filter for Featured attribute
 *  2. All active EventItems (bulk)
 *  3. All EventItemOccurrences with a future NextStartDateTime (bulk)
 *  4. Join client-side by EventItemId
 */
export async function getFeaturedEvents(): Promise<RockFeaturedEvent[]> {
  // Step 1: Get all calendar items for calendar 1 with attributes loaded
  const calendarItems = await rockGet(
    "/api/EventCalendarItems?$filter=EventCalendarId eq 1&loadAttributes=simple",
    EventCalendarItemSchema,
  );

  // Step 2: Filter for Featured
  const featured = calendarItems.filter((item) => {
    const val = item.AttributeValues?.FeaturedEvent?.Value;
    return val === "value1" || val === "True" || val === "true";
  });

  if (featured.length === 0) return [];

  const featuredEventIds = new Set(featured.map((f) => f.EventItemId));

  // Step 3: Bulk fetch active EventItems + future occurrences in parallel
  const [allEventItems, allOccurrences] = await Promise.all([
    rockGet(
      "/api/EventItems?$filter=IsActive eq true",
      EventItemSchema,
    ),
    rockGet(
      "/api/EventItemOccurrences?$filter=NextStartDateTime ne null",
      EventItemOccurrenceSchema,
    ),
  ]);

  // Index occurrences by EventItemId
  const occurrencesByEvent = new Map<number, typeof allOccurrences>();
  for (const occ of allOccurrences) {
    if (!featuredEventIds.has(occ.EventItemId)) continue;
    const list = occurrencesByEvent.get(occ.EventItemId) ?? [];
    list.push(occ);
    occurrencesByEvent.set(occ.EventItemId, list);
  }

  // Step 4: Build results — only featured + active events
  const results: RockFeaturedEvent[] = [];
  for (const event of allEventItems) {
    if (!featuredEventIds.has(event.Id)) continue;

    const occs = occurrencesByEvent.get(event.Id) ?? [];

    results.push({
      eventItemId: event.Id,
      name: event.Name,
      summary: event.Summary ?? null,
      photoUrl: event.PhotoId
        ? `${ROCK_BASE_URL}/GetImage.ashx?Id=${event.PhotoId}`
        : null,
      detailsUrl: event.DetailsUrl ?? null,
      occurrences: occs.map((o) => ({
        occurrenceId: o.Id,
        campusId: o.CampusId ?? null,
        nextStartDateTime: o.NextStartDateTime ?? null,
      })),
    });
  }

  return results;
}
