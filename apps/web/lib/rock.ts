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

// --- Auth / Group membership schemas (V2, camelCase) ---

const PersonAliasSchema = z.object({
  id: z.number(),
  personId: z.number(),
});

const GroupMemberSchema = z.object({
  id: z.number(),
  personId: z.number(),
  groupId: z.number(),
  groupMemberStatus: z.number(),
  isArchived: z.boolean().optional(),
});

/**
 * Check whether an OIDC subject is an active, non-archived member of the
 * configured Rock security group (ROCK_AUTH_GROUP_ID, default 2).
 *
 * @param sub - The OIDC `sub` claim (Rock PersonAliasId).
 *              This is immutable and unique per person — never use email.
 *
 * Resolves PersonAliasId → PersonId, then checks GroupMembers.
 * Throws if Rock RMS is not configured or unreachable.
 */
export async function isAuthorizedGroupMember(sub: string): Promise<boolean> {
  const groupId = process.env.ROCK_AUTH_GROUP_ID ?? "2";

  // Rock OIDC sub is the PersonAliasId (numeric)
  const aliasId = parseInt(sub, 10);
  if (isNaN(aliasId) || aliasId <= 0) return false;

  // Step 1: resolve PersonAliasId → PersonId
  const aliases = await rockSearch(
    "personalias",
    { where: `Id == ${aliasId}`, limit: 1 },
    PersonAliasSchema
  );

  if (aliases.length === 0) return false;

  const personId = aliases[0].personId;

  // Step 2: check active, non-archived membership in the auth group
  // GroupMemberStatus: 1 = Active
  const members = await rockSearch(
    "groupmembers",
    {
      where: [
        `GroupId == ${groupId}`,
        `PersonId == ${personId}`,
        `GroupMemberStatus == 1`,
        `IsArchived == false`,
      ].join(" AND "),
      limit: 1,
    },
    GroupMemberSchema
  );

  return members.length > 0;
}

// --- Event schemas (V2, camelCase) ---

const EventCalendarItemV2Schema = z.object({
  id: z.number(),
  eventCalendarId: z.number(),
  eventItemId: z.number(),
});

const EventItemV2Schema = z.object({
  id: z.number(),
  name: z.string(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  photoId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  detailsUrl: z.string().nullable().optional(),
});

const EventItemOccurrenceV2Schema = z.object({
  id: z.number(),
  eventItemId: z.number(),
  campusId: z.number().nullable().optional(),
  nextStartDateTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

// --- Public types ---

export interface RockCallToAction {
  label: string;
  url: string;
}

export interface RockFeaturedEvent {
  eventItemId: number;
  name: string;
  summary: string | null;
  photoUrl: string | null;
  detailsUrl: string | null;
  campuses: string | null;
  campusList: string[];          // individual campus names
  ministry: string | null;       // e.g. "Care, Community"
  callsToAction: RockCallToAction[];
  occurrences: Array<{
    occurrenceId: number;
    campusId: number | null;
    nextStartDateTime: string | null;
    location: string | null;
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
 * Fetch all Featured Events from Rock Calendar 1 (Public) using V2 API.
 *
 * 1. V2 bulk fetch EventCalendarItems for calendar 1
 * 2. Fetch attributes for each to find Featured flag + ForCampuses
 * 3. V2 bulk fetch active EventItems + EventItemOccurrences with future dates
 * 4. Join client-side by EventItemId
 */
export async function getFeaturedEvents(): Promise<RockFeaturedEvent[]> {
  // Step 1: Get all calendar items for calendar 1 via V2
  const calendarItems = await rockSearch(
    "eventcalendaritems",
    { where: "EventCalendarId == 1", limit: 500 },
    EventCalendarItemV2Schema,
  );

  // Step 2: Fetch attributes for each calendar item to find Featured flag
  // Batch in groups of 20 to avoid overwhelming the API
  const calItemAttrs = new Map<
    number,
    Record<string, { value: string; textValue: string }>
  >();

  const batchSize = 20;
  for (let i = 0; i < calendarItems.length; i += batchSize) {
    const batch = calendarItems.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (item) => {
        const attrs = await rockAttributeValues("eventcalendaritems", item.id);
        return { id: item.id, eventItemId: item.eventItemId, attrs };
      }),
    );
    for (const r of results) {
      calItemAttrs.set(r.id, r.attrs);
    }
  }

  // Filter for Featured
  const featured = calendarItems.filter((item) => {
    const attrs = calItemAttrs.get(item.id);
    const val = attrs?.FeaturedEvent?.value;
    return val === "value1" || val === "True" || val === "true";
  });

  if (featured.length === 0) return [];

  const featuredEventIds = new Set(featured.map((f) => f.eventItemId));

  // Build maps of eventItemId → enriched attribute data
  const enrichedAttrs = new Map<number, {
    campuses: string | null;
    campusList: string[];
    ministry: string | null;
    callsToAction: RockCallToAction[];
  }>();
  for (const item of featured) {
    const attrs = calItemAttrs.get(item.id);
    const campusText = attrs?.ForCampuses?.textValue || null;
    const campusList = campusText
      ? campusText.split(",").map((c) => c.trim()).filter(Boolean)
      : [];
    const ministry = attrs?.ForMinistry?.textValue || null;
    const ctaRaw = attrs?.CallsToAction?.value || "";
    const callsToAction: RockCallToAction[] = ctaRaw
      .split("|")
      .filter(Boolean)
      .map((pair) => {
        const [label, url] = pair.split("^").map((s) => s.trim());
        return label && url ? { label, url } : null;
      })
      .filter((c): c is RockCallToAction => c !== null);

    enrichedAttrs.set(item.eventItemId, {
      campuses: campusText,
      campusList,
      ministry,
      callsToAction,
    });
  }

  // Step 3: Bulk fetch active EventItems + future occurrences via V2
  const [allEventItems, allOccurrences] = await Promise.all([
    rockSearch(
      "eventitems",
      { where: "IsActive == true", limit: 1000 },
      EventItemV2Schema,
    ),
    rockSearch(
      "eventitemoccurrences",
      { where: "NextStartDateTime != null", limit: 2000 },
      EventItemOccurrenceV2Schema,
    ),
  ]);

  // Index occurrences by eventItemId
  const occurrencesByEvent = new Map<number, (typeof allOccurrences)>();
  for (const occ of allOccurrences) {
    if (!featuredEventIds.has(occ.eventItemId)) continue;
    const list = occurrencesByEvent.get(occ.eventItemId) ?? [];
    list.push(occ);
    occurrencesByEvent.set(occ.eventItemId, list);
  }

  // Step 4: Build results — only featured + active events
  const results: RockFeaturedEvent[] = [];
  for (const event of allEventItems) {
    if (!featuredEventIds.has(event.id)) continue;

    const occs = occurrencesByEvent.get(event.id) ?? [];
    const enriched = enrichedAttrs.get(event.id);

    results.push({
      eventItemId: event.id,
      name: event.name,
      summary: event.summary ?? null,
      photoUrl: event.photoId
        ? `/api/rock/image?id=${event.photoId}`
        : null,
      detailsUrl: event.detailsUrl ?? null,
      campuses: enriched?.campuses ?? null,
      campusList: enriched?.campusList ?? [],
      ministry: enriched?.ministry ?? null,
      callsToAction: enriched?.callsToAction ?? [],
      occurrences: occs.map((o) => ({
        occurrenceId: o.id,
        campusId: o.campusId ?? null,
        nextStartDateTime: o.nextStartDateTime ?? null,
        location: o.location ?? null,
      })),
    });
  }

  return results;
}
