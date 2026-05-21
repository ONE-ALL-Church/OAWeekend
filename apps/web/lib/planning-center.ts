import { z } from "zod";

const PCO_BASE_URL =
  process.env.PLANNING_CENTER_BASE_URL?.replace(/\/+$/, "") ??
  "https://api.planningcenteronline.com";
const PCO_WEB_BASE_URL =
  process.env.PLANNING_CENTER_WEB_BASE_URL?.replace(/\/+$/, "") ??
  "https://services.planningcenteronline.com";
const PCO_CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID;
const PCO_CLIENT_SECRET = process.env.PLANNING_CENTER_CLIENT_SECRET;

class PlanningCenterRequestError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Planning Center request failed (${status}): ${body}`);
  }
}

const SERVICE_TYPE_IDS = {
  sanDimas: 235,
  ranchoCucamonga: 228631,
  westCovina: 962810,
} as const;

export type PlanningCenterCampusKey = keyof typeof SERVICE_TYPE_IDS;

export const PLANNING_CENTER_CAMPUSES: Array<{
  key: PlanningCenterCampusKey;
  serviceTypeId: number;
  campusName: string;
}> = [
  {
    key: "sanDimas",
    serviceTypeId: SERVICE_TYPE_IDS.sanDimas,
    campusName: "San Dimas",
  },
  {
    key: "ranchoCucamonga",
    serviceTypeId: SERVICE_TYPE_IDS.ranchoCucamonga,
    campusName: "Rancho Cucamonga",
  },
  {
    key: "westCovina",
    serviceTypeId: SERVICE_TYPE_IDS.westCovina,
    campusName: "West Covina",
  },
] as const;

const planSchema = z.object({
  id: z.string(),
  attributes: z.object({
    dates: z.string().nullable().optional(),
    series_title: z.string().nullable().optional(),
    short_dates: z.string().nullable().optional(),
    sort_date: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    total_length: z.number().nullable().optional(),
  }),
});

const itemSchema = z.object({
  id: z.string(),
  attributes: z.object({
    description: z.string().nullable().optional(),
    item_type: z.string().nullable().optional(),
    key_name: z.string().nullable().optional(),
    length: z.number().nullable().optional(),
    sequence: z.number().nullable().optional(),
    title: z.string().nullable().optional(),
  }),
  relationships: z.object({
    song: z.object({
      data: z.object({ type: z.string(), id: z.string() }).nullable().optional(),
    }).optional(),
    item_notes: z.object({
      data: z.array(z.object({ type: z.string(), id: z.string() })).optional(),
    }).optional(),
  }).optional(),
});

const teamMemberSchema = z.object({
  id: z.string(),
  attributes: z.object({
    name: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    team_position_name: z.string().nullable().optional(),
    photo_thumbnail: z.string().nullable().optional(),
  }),
  relationships: z.object({
    person: z.object({
      data: z.object({ id: z.string() }).nullable().optional(),
    }).optional(),
  }).optional(),
});

const planTimeSchema = z.object({
  id: z.string(),
  attributes: z.object({
    name: z.string().nullable().optional(),
    starts_at: z.string().nullable().optional(),
    time_type: z.string().nullable().optional(),
  }),
});

type PlanningCenterPlan = z.infer<typeof planSchema>;
type PlanningCenterTeamMember = z.infer<typeof teamMemberSchema>;
type PlanningCenterPlanTime = z.infer<typeof planTimeSchema>;

export interface PlanningCenterItemNote {
  categoryName: string | null;
  content: string | null;
}

export interface PlanningCenterSongSummary {
  title: string;
  key: string | null;
  author: string | null;
  ccliNumber: string | null;
  themes: string | null;
  lastScheduled: string | null;
  description: string | null;
  lengthSeconds: number | null;
  songLeader: string | null;
  sourceUrl: string | null;
}

export interface PlanningCenterTeamAssignment extends PlanningCenterPerson {
  role: string | null;
  status: string | null;
}

export interface PlanningCenterPlanTimeSummary {
  name: string | null;
  startsAt: string | null;
  timeType: string | null;
  displayTime: string | null;
}

export interface PlanningCenterServiceItem {
  id: string;
  sequence: number | null;
  title: string;
  description: string | null;
  itemType: string | null;
  keyName: string | null;
  lengthSeconds: number | null;
  songId: string | null;
  song: Omit<PlanningCenterSongSummary, "sourceUrl"> | null;
  notes: PlanningCenterItemNote[];
  sourceUrl: string | null;
}

export interface WeekendPlanSummary {
  campusName: string;
  serviceTypeId: number;
  planId: string;
  planUrl: string;
  dates: string | null;
  seriesTitle: string | null;
  sermonTitle: string | null;
  weekLabel: string | null;
  totalLengthSeconds: number | null;
  songs: PlanningCenterSongSummary[];
  serviceItems: PlanningCenterServiceItem[];
  teamMembers: PlanningCenterTeamAssignment[];
  planTimes: PlanningCenterPlanTimeSummary[];
  hosts: PlanningCenterPerson[];
  worshipLeaders: PlanningCenterPerson[];
  serviceTimes: string[];
}

export type PlanningCenterPlanSearchKind =
  | "empty"
  | "week"
  | "planId"
  | "unsupported";

export interface PlanningCenterPlanSearchMatch {
  campusName: string;
  serviceTypeId: number;
  planId: string;
  planUrl: string;
  weekStart: string | null;
  dates: string | null;
  seriesTitle: string | null;
  planTitle: string | null;
  sortDate: string | null;
}

export interface PlanningCenterPlanSearchResult {
  input: string;
  kind: PlanningCenterPlanSearchKind;
  weekStart: string | null;
  planId: string | null;
  matches: PlanningCenterPlanSearchMatch[];
  campusErrors: Array<{ campusName: string; message: string }>;
}

function assertPlanningCenterConfig() {
  if (!PCO_CLIENT_ID || !PCO_CLIENT_SECRET) {
    throw new Error("Planning Center credentials are not configured");
  }
}

async function pcoFetch<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  assertPlanningCenterConfig();

  const res = await fetch(`${PCO_BASE_URL}${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${PCO_CLIENT_ID}:${PCO_CLIENT_SECRET}`,
      ).toString("base64")}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new PlanningCenterRequestError(res.status, body);
  }

  return schema.parse(await res.json());
}

async function listPlans(serviceTypeId: number, perPage = 25) {
  return pcoFetch(
    `/services/v2/service_types/${serviceTypeId}/plans?per_page=${perPage}&order=-sort_date`,
    z.object({ data: z.array(planSchema) }),
  );
}

async function getPlan(serviceTypeId: number, planId: string) {
  return pcoFetch(
    `/services/v2/service_types/${serviceTypeId}/plans/${planId}`,
    z.object({ data: planSchema }),
  );
}

// Included records can be Song or ItemNote — use passthrough to avoid union failures
const includedRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  attributes: z.record(z.unknown()),
}).passthrough();

async function listPlanItems(serviceTypeId: number, planId: string) {
  return pcoFetch(
    `/services/v2/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100&include=song,item_notes`,
    z.object({ data: z.array(itemSchema), included: z.array(includedRecordSchema).optional() }),
  );
}

async function listPlanTeamMembers(serviceTypeId: number, planId: string) {
  return pcoFetch(
    `/services/v2/service_types/${serviceTypeId}/plans/${planId}/team_members?per_page=200`,
    z.object({ data: z.array(teamMemberSchema) }),
  );
}

async function listPlanTimes(serviceTypeId: number, planId: string) {
  return pcoFetch(
    `/services/v2/service_types/${serviceTypeId}/plans/${planId}/plan_times?per_page=100`,
    z.object({ data: z.array(planTimeSchema) }),
  );
}

function toPacificDateKey(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function isValidDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === dateKey;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSaturdayWeekStartFromDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  const daysSinceSaturday = (day + 1) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceSaturday);
  return toDateKey(date);
}

function extractDateKey(input: string) {
  const isoMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch?.[1] && isValidDateKey(isoMatch[1])) {
    return isoMatch[1];
  }

  const slashMatch = input.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!slashMatch) return null;

  const month = slashMatch[1].padStart(2, "0");
  const day = slashMatch[2].padStart(2, "0");
  const dateKey = `${slashMatch[3]}-${month}-${day}`;
  return isValidDateKey(dateKey) ? dateKey : null;
}

function extractPlanId(input: string) {
  const urlMatch = input.match(/\/plans\/(\d+)/i);
  if (urlMatch?.[1]) return urlMatch[1];

  const numericInput = input.trim();
  return /^\d{5,}$/.test(numericInput) ? numericInput : null;
}

function toPlanSearchMatch(
  campus: (typeof PLANNING_CENTER_CAMPUSES)[number],
  plan: PlanningCenterPlan,
): PlanningCenterPlanSearchMatch {
  const sortDate = toPacificDateKey(plan.attributes.sort_date);
  return {
    campusName: campus.campusName,
    serviceTypeId: campus.serviceTypeId,
    planId: plan.id,
    planUrl: getPlanUrl(plan.id),
    weekStart: sortDate ? getSaturdayWeekStartFromDateKey(sortDate) : null,
    dates: plan.attributes.dates ?? null,
    seriesTitle: plan.attributes.series_title?.trim() ?? null,
    planTitle: plan.attributes.title?.trim() ?? null,
    sortDate,
  };
}

function getSundayKey(weekStart: string) {
  const saturday = new Date(`${weekStart}T00:00:00`);
  saturday.setDate(saturday.getDate() + 1);
  return saturday.toISOString().slice(0, 10);
}

function findPlanForWeek(plans: PlanningCenterPlan[], weekStart: string) {
  const sundayKey = getSundayKey(weekStart);
  return (
    plans.find((plan) => {
      const planDate = toPacificDateKey(plan.attributes.sort_date);
      return planDate === weekStart || planDate === sundayKey;
    }) ?? null
  );
}

function getPlanUrl(planId: string) {
  return `${PCO_WEB_BASE_URL}/plans/${planId}`;
}

function getPlanItemUrl(planId: string, itemId: string) {
  return `${getPlanUrl(planId)}?item_id=${itemId}`;
}

function stringAttr(
  record: Record<string, unknown> | undefined,
  key: string,
) {
  const value = record?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function ccliAttr(record: Record<string, unknown> | undefined) {
  const value = record?.ccli_number;
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function plainText(value: string | null | undefined) {
  if (!value) return null;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function isActiveAssignment(status: string | null | undefined) {
  return status !== "D";
}

export interface PlanningCenterPerson {
  name: string;
  photoUrl: string | null;
  pcoPersonId: string | null;
}

function pickPeopleByRole(
  teamMembers: PlanningCenterTeamMember[],
  matcher: (role: string) => boolean,
): PlanningCenterPerson[] {
  const people = teamMembers.flatMap((member) => {
    const role = member.attributes.team_position_name ?? "";
    if (!matcher(role) || !isActiveAssignment(member.attributes.status)) {
      return [];
    }
    const name = member.attributes.name?.trim();
    if (!name) return [];
    const pcoPersonId = member.relationships?.person?.data?.id ?? null;
    return [{ name, photoUrl: member.attributes.photo_thumbnail ?? null, pcoPersonId }];
  });
  // Deduplicate by name, keep first occurrence
  const seen = new Set<string>();
  return people.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

function buildTeamAssignments(
  teamMembers: PlanningCenterTeamMember[],
): PlanningCenterTeamAssignment[] {
  return teamMembers.flatMap((member) => {
    if (!isActiveAssignment(member.attributes.status)) return [];
    const name = member.attributes.name?.trim();
    if (!name) return [];

    return [
      {
        name,
        photoUrl: member.attributes.photo_thumbnail ?? null,
        pcoPersonId: member.relationships?.person?.data?.id ?? null,
        role: member.attributes.team_position_name?.trim() ?? null,
        status: member.attributes.status ?? null,
      },
    ];
  });
}

function formatPlanTimeDisplay(startsAt: string | null | undefined) {
  if (!startsAt) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

function buildServiceTimeCandidate(
  time: PlanningCenterPlanTime,
  namedOnly: boolean,
) {
  const startsAt = time.attributes.starts_at;
  if (!startsAt) return null;

  const displayTime = formatPlanTimeDisplay(startsAt);
  if (!displayTime) return null;

  const name = time.attributes.name?.trim();
  if (name && /^service\s*#\d+/i.test(name)) {
    return { label: `${name} - ${displayTime}`, startsAt };
  }
  if (!namedOnly && time.attributes.time_type === "service") {
    return { label: displayTime, startsAt };
  }
  return null;
}

function buildServiceTimes(planTimes: PlanningCenterPlanTime[]) {
  const namedServiceTimes = planTimes
    .map((time) => buildServiceTimeCandidate(time, true))
    .filter((time): time is { label: string; startsAt: string } => Boolean(time));
  const genericServiceTimes = planTimes
    .map((time) => buildServiceTimeCandidate(time, false))
    .filter((time): time is { label: string; startsAt: string } => Boolean(time));
  const serviceTimes =
    namedServiceTimes.length > 0 ? namedServiceTimes : genericServiceTimes;
  const labels = new Set<string>();

  return serviceTimes
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .flatMap((time) => {
      if (labels.has(time.label)) return [];
      labels.add(time.label);
      return time.label;
    });
}

function normalizeSermonTitle(title: string | null | undefined) {
  if (!title) return null;
  const trimmed = title.trim();
  if (!trimmed) return null;
  if (/^week\s+\d+$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function extractWeekLabel(title: string | null | undefined) {
  if (!title) return null;
  const trimmed = title.trim();
  return /^week\s+\d+$/i.test(trimmed) ? trimmed : null;
}

export function extractWeekNumber(title: string | null | undefined) {
  if (!title) return null;
  const match = title.match(/week\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

export async function searchPlanningCenterPlans(
  input: string,
): Promise<PlanningCenterPlanSearchResult> {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return {
      input: normalizedInput,
      kind: "empty",
      weekStart: null,
      planId: null,
      matches: [],
      campusErrors: [],
    };
  }

  const planId = extractPlanId(normalizedInput);
  if (planId) {
    const campusResults = await Promise.allSettled(
      PLANNING_CENTER_CAMPUSES.map(async (campus) => ({
        campus,
        plan: (await getPlan(campus.serviceTypeId, planId)).data,
      })),
    );
    const matches: PlanningCenterPlanSearchMatch[] = [];
    const campusErrors: PlanningCenterPlanSearchResult["campusErrors"] = [];

    for (const [index, result] of campusResults.entries()) {
      const campus = PLANNING_CENTER_CAMPUSES[index];
      if (result.status === "rejected") {
        if (
          result.reason instanceof PlanningCenterRequestError &&
          result.reason.status === 404
        ) {
          continue;
        }

        campusErrors.push({
          campusName: campus.campusName,
          message:
            result.reason instanceof Error
              ? result.reason.message
              : "Planning Center lookup failed",
        });
        continue;
      }

      matches.push(toPlanSearchMatch(result.value.campus, result.value.plan));
    }

    return {
      input: normalizedInput,
      kind: "planId",
      weekStart: matches[0]?.weekStart ?? null,
      planId,
      matches,
      campusErrors,
    };
  }

  const dateKey = extractDateKey(normalizedInput);
  if (dateKey) {
    return {
      input: normalizedInput,
      kind: "week",
      weekStart: getSaturdayWeekStartFromDateKey(dateKey),
      planId: null,
      matches: [],
      campusErrors: [],
    };
  }

  return {
    input: normalizedInput,
    kind: "unsupported",
    weekStart: null,
    planId: null,
    matches: [],
    campusErrors: [],
  };
}

async function buildWeekendPlanSummary(
  campusName: string,
  serviceTypeId: number,
  plan: PlanningCenterPlan,
): Promise<WeekendPlanSummary> {
  const [itemsResult, teamMembersResult, planTimesResult] = await Promise.all([
    listPlanItems(serviceTypeId, plan.id),
    listPlanTeamMembers(serviceTypeId, plan.id),
    listPlanTimes(serviceTypeId, plan.id),
  ]);

  const items = itemsResult.data;
  const includedRecords = itemsResult.included ?? [];
  const teamMembers = teamMembersResult.data;
  const planTimes = planTimesResult.data;

  // Build lookups for included song details and item notes by type
  const songDetailsById = new Map<string, Record<string, unknown>>();
  const noteById = new Map<string, Record<string, unknown>>();
  for (const rec of includedRecords) {
    if (rec.type === "Song") {
      songDetailsById.set(rec.id, rec.attributes);
    } else if (rec.type === "ItemNote") {
      noteById.set(rec.id, rec.attributes);
    }
  }

  const serviceItems = items
    .map((item) => {
      const songId = item.relationships?.song?.data?.id;
      const details = songId ? songDetailsById.get(songId) : undefined;
      const noteIds = item.relationships?.item_notes?.data ?? [];
      const notes = noteIds
        .map((nr) => {
          const note = noteById.get(nr.id);
          return {
            categoryName: stringAttr(note, "category_name"),
            content: plainText(stringAttr(note, "content")),
          };
        })
        .filter((note) => note.categoryName || note.content);

      const songLeader =
        notes.find((note) => note.categoryName?.toLowerCase() === "by")
          ?.content ?? null;
      const title = item.attributes.title?.trim() ?? "";
      const keyName = item.attributes.key_name?.trim() ?? null;
      const description = plainText(item.attributes.description);
      const lengthSeconds = item.attributes.length ?? null;
      const song = songId
        ? {
            title,
            key: keyName,
            author: stringAttr(details, "author"),
            ccliNumber: ccliAttr(details),
            themes: stringAttr(details, "themes"),
            lastScheduled: stringAttr(details, "last_scheduled_short_dates"),
            description,
            lengthSeconds,
            songLeader,
          }
        : null;

      return {
        id: item.id,
        sequence: item.attributes.sequence ?? null,
        title,
        description,
        itemType: item.attributes.item_type?.trim() ?? null,
        keyName,
        lengthSeconds,
        songId: songId ?? null,
        song,
        notes,
        sourceUrl: getPlanItemUrl(plan.id, item.id),
      };
    })
    .filter((item) => item.title || item.notes.length > 0)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const songs = serviceItems
    .filter((item) => item.itemType === "song" && item.song)
    .map((item) => ({
      ...item.song!,
      sourceUrl: item.sourceUrl,
    }))
    .filter((song) => song.title);

  const hosts = pickPeopleByRole(teamMembers, (role) => /host/i.test(role));
  const worshipLeaders = pickPeopleByRole(
    teamMembers,
    (role) => /worship leader/i.test(role),
  );
  const teamAssignments = buildTeamAssignments(teamMembers);
  const planTimeSummaries = planTimes.map((time) => ({
    name: time.attributes.name?.trim() ?? null,
    startsAt: time.attributes.starts_at ?? null,
    timeType: time.attributes.time_type ?? null,
    displayTime: formatPlanTimeDisplay(time.attributes.starts_at),
  }));

  const serviceTimes = buildServiceTimes(planTimes);

  return {
    campusName,
    serviceTypeId,
    planId: plan.id,
    planUrl: getPlanUrl(plan.id),
    dates: plan.attributes.dates ?? null,
    seriesTitle: plan.attributes.series_title?.trim() ?? null,
    sermonTitle: normalizeSermonTitle(plan.attributes.title),
    weekLabel: extractWeekLabel(plan.attributes.title),
    totalLengthSeconds: plan.attributes.total_length ?? null,
    songs,
    serviceItems,
    teamMembers: teamAssignments,
    planTimes: planTimeSummaries,
    hosts,
    worshipLeaders,
    serviceTimes,
  };
}

export async function getWeekendPlansForWeek(weekStart: string) {
  const planSummaries = await Promise.all(
    PLANNING_CENTER_CAMPUSES.map(async (campus) => {
      const plans = await listPlans(campus.serviceTypeId);
      const weekendPlan = findPlanForWeek(plans.data, weekStart);
      if (!weekendPlan) {
        return {
          campusName: campus.campusName,
          serviceTypeId: campus.serviceTypeId,
          plan: null,
        };
      }

      return {
        campusName: campus.campusName,
        serviceTypeId: campus.serviceTypeId,
        plan: await buildWeekendPlanSummary(
          campus.campusName,
          campus.serviceTypeId,
          weekendPlan,
        ),
      };
    }),
  );

  return {
    sanDimas:
      planSummaries.find((summary) => summary.campusName === "San Dimas")?.plan ??
      null,
    ranchoCucamonga:
      planSummaries.find(
        (summary) => summary.campusName === "Rancho Cucamonga",
      )?.plan ?? null,
    westCovina:
      planSummaries.find((summary) => summary.campusName === "West Covina")?.plan ??
      null,
    plans: planSummaries,
  };
}
