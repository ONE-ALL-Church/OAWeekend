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
 * @param sub - The OIDC `sub` claim. Rock OIDC returns the **PersonAlias GUID**
 *              as the subject identifier.
 * @returns The PersonId if authorized, or null if not.
 *
 * Resolves PersonAlias GUID → PersonId, then checks GroupMembers.
 * Throws if Rock RMS is not configured or unreachable.
 */
export async function isAuthorizedGroupMember(sub: string): Promise<number | null> {
  const groupId = process.env.ROCK_AUTH_GROUP_ID ?? "2";

  // Validate GUID format to prevent LINQ injection — sub is interpolated
  // into the query string, so it must be a valid GUID and nothing else.
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!sub || !guidRegex.test(sub)) return null;

  // Step 1: resolve PersonAlias GUID → PersonId
  const aliases = await rockSearch(
    "personaliases",
    { where: `Guid == "${sub}"`, limit: 1 },
    PersonAliasSchema
  );

  if (aliases.length === 0) return null;

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

  return members.length > 0 ? personId : null;
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

const ScheduleV2Schema = z.object({
  id: z.number(),
  effectiveStartDate: z.string().nullable().optional(),
  effectiveEndDate: z.string().nullable().optional(),
  friendlyScheduleText: z.string().nullable().optional(),
  iCalendarContent: z.string().nullable().optional(),
  weeklyDayOfWeek: z.number().nullable().optional(),
  weeklyTimeOfDay: z.string().nullable().optional(),
});

const EventItemOccurrenceV2Schema = z.object({
  id: z.number(),
  eventItemId: z.number(),
  campusId: z.number().nullable().optional(),
  scheduleId: z.number().nullable().optional(),
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

// --- Series channel ID (channel 4 = sermon series) ---

const ROCK_SERIES_CHANNEL_ID = 4;

export interface RockSeriesDetails {
  title: string;
  narrative: string | null;
  objectives: string[];
  imageUrl: string | null;
  startDate: string | null;
  rockItemId: number;
}

export interface RockSermonForWeek {
  sermonTitle: string;
  speaker: string | null;
  seriesTitle: string | null;
  seriesDetails: RockSeriesDetails | null;
  contentChannelItemId: number;
}

/**
 * Find the sermon and series for a given weekend date from Rock.
 *
 * - Sermons live in channel 5 (ROCK_CONTENT_CHANNEL_ID) with startDateTime on Saturdays
 * - Series live in channel 4 — the active series is the latest one whose startDateTime <= weekStart
 * - Speaker comes from the sermon's "Speaker" attribute
 *
 * @param weekStart - Saturday date string (YYYY-MM-DD)
 */
export async function getSermonForWeek(weekStart: string): Promise<RockSermonForWeek | null> {
  const sermonChannelId = process.env.ROCK_CONTENT_CHANNEL_ID;
  if (!sermonChannelId) return null;

  // The weekStart is a Saturday. Rock dates include time, so we need to match
  // sermons whose startDateTime falls on this Saturday or the following Sunday.
  const satDate = new Date(`${weekStart}T00:00:00`);
  const sunDate = new Date(satDate);
  sunDate.setDate(satDate.getDate() + 2); // Monday 00:00 as upper bound

  const satStr = satDate.toISOString().slice(0, 10);
  const sunStr = sunDate.toISOString().slice(0, 10);

  // Find sermon for this weekend
  const sermons = await rockSearch(
    "contentchannelitems",
    {
      where: [
        `ContentChannelId == ${sermonChannelId}`,
        `StartDateTime >= "${satStr}"`,
        `StartDateTime < "${sunStr}"`,
      ].join(" AND "),
      sort: "StartDateTime desc",
      limit: 1,
    },
    ContentChannelItemSchema,
  );

  if (sermons.length === 0) return null;

  const sermon = sermons[0];

  // Fetch speaker attribute
  const attrs = await rockAttributeValues("contentchannelitems", sermon.id);
  const speaker = attrs.Speaker?.textValue || null;

  // Find the active series — latest series whose start date is on or before this weekend
  const seriesList = await rockSearch(
    "contentchannelitems",
    {
      where: [
        `ContentChannelId == ${ROCK_SERIES_CHANNEL_ID}`,
        `StartDateTime <= "${sunStr}"`,
      ].join(" AND "),
      sort: "StartDateTime desc",
      limit: 1,
    },
    ContentChannelItemSchema,
  );

  let seriesTitle: string | null = null;
  let seriesDetails: RockSeriesDetails | null = null;

  if (seriesList.length > 0) {
    const series = seriesList[0];
    seriesTitle = series.title;

    const seriesAttrs = await rockAttributeValues("contentchannelitems", series.id);
    const imageGuid = seriesAttrs.SeriesImage?.value || null;

    seriesDetails = {
      title: series.title,
      narrative: seriesAttrs.Narrative?.textValue || seriesAttrs.Summary?.textValue || null,
      objectives: (seriesAttrs.Objectives?.value || "")
        .split("|")
        .map((s: string) => decodeURIComponent(s).trim())
        .filter(Boolean),
      imageUrl: imageGuid ? `${ROCK_BASE_URL}/GetImage.ashx?guid=${imageGuid}` : null,
      startDate: series.startDateTime?.slice(0, 10) ?? null,
      rockItemId: series.id,
    };
  }

  return {
    sermonTitle: sermon.title,
    speaker,
    seriesTitle,
    seriesDetails,
    contentChannelItemId: sermon.id,
  };
}

/**
 * Fetch featured events via the Rock Lava Webhook. Single HTTP call, the
 * webhook does all the joining, attribute resolution, and schedule expansion
 * server-side via `eventscheduledinstance`.
 */
async function getFeaturedEventsViaWebhook(
  months = 3,
): Promise<RockFeaturedEvent[] | null> {
  const base = process.env.ROCK_BASE_URL;
  const secret = process.env.ROCK_WEBHOOK_SECRET;
  if (!base || !secret) return null;

  const url = `${base.replace(/\/+$/, "")}/Webhooks/Lava.ashx/oa-weekend/featured-events?months=${months}`;
  const res = await fetch(url, {
    headers: { "X-Webhook-Secret": secret, Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) return null;

  const raw = (await res.json()) as Array<{
    eventItemId: number;
    name: string;
    summary: string | null;
    photoUrl: string | null;
    detailsUrl: string | null;
    campuses: string | null;
    campusList: string[];
    ministry: string | null;
    callsToAction: RockCallToAction[];
    occurrences: Array<{
      date: string | null;
      endDate: string | null;
      campus: string | null;
      location: string | null;
      locationDescription: string | null;
      note: string | null;
    }>;
  }>;

  if (!Array.isArray(raw)) return null;

  return raw.map((ev) => ({
    eventItemId: ev.eventItemId,
    name: ev.name,
    summary: ev.summary,
    photoUrl: ev.photoUrl ? (ev.photoUrl.startsWith("/") ? `/api/rock/image?path=${encodeURIComponent(ev.photoUrl)}` : ev.photoUrl) : null,
    detailsUrl: ev.detailsUrl,
    campuses: ev.campuses,
    campusList: ev.campusList ?? [],
    ministry: ev.ministry,
    callsToAction: ev.callsToAction ?? [],
    occurrences: (ev.occurrences ?? []).map((o, idx) => ({
      occurrenceId: ev.eventItemId * 1000 + idx,
      campusId: null,
      nextStartDateTime: o.date,
      location: o.location,
    })),
  }));
}

/**
 * Fetch all Featured Events from Rock Calendar 1 (Public).
 *
 * Prefers the Rock Lava Webhook (single API call, server-side expansion)
 * when ROCK_WEBHOOK_SECRET is configured. Falls back to the legacy 6-call
 * fan-out if the webhook is unavailable or errors.
 */
export async function getFeaturedEvents(): Promise<RockFeaturedEvent[]> {
  // Try webhook first
  try {
    const viaWebhook = await getFeaturedEventsViaWebhook();
    if (viaWebhook && viaWebhook.length > 0) return viaWebhook;
  } catch (err) {
    console.warn("Rock webhook failed, falling back to V2 API:", err);
  }

  return getFeaturedEventsViaV2Api();
}

/**
 * Legacy fallback: fetch featured events via the Rock V2 REST API.
 *
 * 1. V2 bulk fetch EventCalendarItems for calendar 1
 * 2. Fetch attributes for each to find Featured flag + ForCampuses
 * 3. V2 bulk fetch active EventItems + EventItemOccurrences with future dates
 * 4. Join client-side by EventItemId
 */
async function getFeaturedEventsViaV2Api(): Promise<RockFeaturedEvent[]> {
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

  // Step 3: Bulk fetch active EventItems + ALL occurrences for featured events
  const [allEventItems, allOccurrences] = await Promise.all([
    rockSearch(
      "eventitems",
      { where: "IsActive == true", limit: 1000 },
      EventItemV2Schema,
    ),
    rockSearch(
      "eventitemoccurrences",
      { limit: 2000 },
      EventItemOccurrenceV2Schema,
    ),
  ]);

  // Filter to only featured event occurrences
  const featuredOccurrences = allOccurrences.filter((o) =>
    featuredEventIds.has(o.eventItemId),
  );

  // Step 4: Fetch schedules for featured occurrences to expand recurring dates
  const scheduleIds = new Set(
    featuredOccurrences
      .map((o) => o.scheduleId)
      .filter((id): id is number => id != null),
  );

  const schedules = scheduleIds.size > 0
    ? await rockSearch(
        "schedules",
        {
          where: [...scheduleIds].map((id) => `Id == ${id}`).join(" OR "),
          limit: 500,
        },
        ScheduleV2Schema,
      )
    : [];

  const scheduleById = new Map(schedules.map((s) => [s.id, s]));

  // Compute a date range for expansion: 3 months back to 3 months forward
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setMonth(rangeStart.getMonth() - 3);
  const rangeEnd = new Date(now);
  rangeEnd.setMonth(rangeEnd.getMonth() + 3);

  // Index expanded occurrences by eventItemId
  type ExpandedOcc = {
    occurrenceId: number;
    campusId: number | null;
    nextStartDateTime: string | null;
    location: string | null;
  };
  const occurrencesByEvent = new Map<number, ExpandedOcc[]>();

  for (const occ of featuredOccurrences) {
    const list = occurrencesByEvent.get(occ.eventItemId) ?? [];

    const schedule = occ.scheduleId ? scheduleById.get(occ.scheduleId) : undefined;
    const dates = schedule
      ? expandScheduleDates(schedule, rangeStart, rangeEnd)
      : occ.nextStartDateTime
        ? [occ.nextStartDateTime]
        : [];

    for (const dt of dates) {
      list.push({
        occurrenceId: occ.id,
        campusId: occ.campusId ?? null,
        nextStartDateTime: dt,
        location: occ.location ?? null,
      });
    }

    occurrencesByEvent.set(occ.eventItemId, list);
  }

  // Step 5: Build results — only featured + active events
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
      occurrences: occs,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Schedule date expansion — computes concrete dates from iCal RRULE
// ---------------------------------------------------------------------------

function expandScheduleDates(
  schedule: z.infer<typeof ScheduleV2Schema>,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const ical = schedule.iCalendarContent;
  if (!ical) return [];

  // Parse DTSTART and RRULE from iCal
  const dtStartMatch = ical.match(/DTSTART[^:]*:(\d{8}T\d{6})/);
  const rruleMatch = ical.match(/RRULE:(.*?)(?:\r?\n|$)/);
  if (!dtStartMatch) return [];

  const dtStart = parseICalDate(dtStartMatch[1]);
  if (!dtStart) return [];

  // If no RRULE, it's a single occurrence
  if (!rruleMatch) {
    if (dtStart >= rangeStart && dtStart <= rangeEnd) {
      return [dtStart.toISOString()];
    }
    return [];
  }

  const rrule = parseRRule(rruleMatch[1]);
  const effectiveEnd = schedule.effectiveEndDate
    ? new Date(schedule.effectiveEndDate)
    : rangeEnd;
  const endBound = effectiveEnd < rangeEnd ? effectiveEnd : rangeEnd;

  const dates: string[] = [];
  const freq = String(rrule.FREQ ?? "");
  const interval = Number(rrule.INTERVAL ?? 1);
  const count = rrule.COUNT != null ? Number(rrule.COUNT) : undefined;
  const byDay = rrule.BYDAY != null ? String(rrule.BYDAY) : undefined;

  if (freq === "WEEKLY") {
    // Weekly recurrence — step by interval weeks from dtStart
    const cursor = new Date(dtStart);
    let n = 0;
    while (cursor <= endBound && (!count || n < count)) {
      if (cursor >= rangeStart) {
        dates.push(cursor.toISOString());
      }
      cursor.setDate(cursor.getDate() + 7 * interval);
      n++;
      if (dates.length > 100) break; // safety
    }
  } else if (freq === "MONTHLY" && byDay) {
    // Monthly on Nth weekday (e.g., "3SA" = 3rd Saturday)
    const nthMatch = byDay.match(/(-?\d)?(\w{2})/);
    if (nthMatch) {
      const nth = nthMatch[1] ? parseInt(nthMatch[1]) : 1;
      const dayCode = nthMatch[2];
      const dayMap: Record<string, number> = {
        SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
      };
      const targetDay = dayMap[dayCode];
      if (targetDay !== undefined) {
        const cursor = new Date(rangeStart);
        cursor.setDate(1);
        let n = 0;
        while (cursor <= endBound && (!count || n < count)) {
          const date = getNthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), targetDay, nth);
          if (date && date >= rangeStart && date <= endBound) {
            dates.push(copyTime(date, dtStart).toISOString());
            n++;
          }
          cursor.setMonth(cursor.getMonth() + interval);
          if (dates.length > 100) break;
        }
      }
    }
  } else if (freq === "DAILY") {
    const cursor = new Date(dtStart);
    let n = 0;
    while (cursor <= endBound && (!count || n < count)) {
      if (cursor >= rangeStart) {
        dates.push(cursor.toISOString());
      }
      cursor.setDate(cursor.getDate() + interval);
      n++;
      if (dates.length > 200) break;
    }
  }

  return dates;
}

function parseICalDate(s: string): Date | null {
  // Format: 20260328T140000
  const m = s.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

function parseRRule(s: string): Record<string, string | number | undefined> {
  const parts: Record<string, string | number | undefined> = {};
  for (const part of s.split(";")) {
    const [key, val] = part.split("=");
    if (key && val) {
      parts[key] = /^\d+$/.test(val) ? parseInt(val) : val;
    }
  }
  return parts;
}

function getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, nth: number): Date | null {
  if (nth > 0) {
    const first = new Date(year, month, 1);
    let day = 1 + ((dayOfWeek - first.getDay() + 7) % 7);
    day += (nth - 1) * 7;
    const result = new Date(year, month, day);
    if (result.getMonth() !== month) return null;
    return result;
  }
  // nth <= 0: last, second-to-last, etc.
  const last = new Date(year, month + 1, 0);
  let day = last.getDate() - ((last.getDay() - dayOfWeek + 7) % 7);
  day += (nth + 1) * 7; // nth=-1 means last
  const result = new Date(year, month, day);
  if (result.getMonth() !== month) return null;
  return result;
}

function copyTime(target: Date, source: Date): Date {
  const result = new Date(target);
  result.setHours(source.getHours(), source.getMinutes(), source.getSeconds());
  return result;
}
