import { z } from "zod";

const PCO_BASE_URL =
  process.env.PLANNING_CENTER_BASE_URL?.replace(/\/+$/, "") ??
  "https://api.planningcenteronline.com";
const PCO_CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID;
const PCO_CLIENT_SECRET = process.env.PLANNING_CENTER_CLIENT_SECRET;

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

const itemNoteSchema = z.object({
  id: z.string(),
  attributes: z.object({
    category_name: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
  }),
});

const songSchema = z.object({
  id: z.string(),
  attributes: z.object({
    title: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    ccli_number: z.union([z.string(), z.number()]).nullable().optional(),
    copyright: z.string().nullable().optional(),
    themes: z.string().nullable().optional(),
    last_scheduled_short_dates: z.string().nullable().optional(),
  }),
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

export interface WeekendPlanSummary {
  campusName: string;
  serviceTypeId: number;
  planId: string;
  dates: string | null;
  seriesTitle: string | null;
  sermonTitle: string | null;
  weekLabel: string | null;
  totalLengthSeconds: number | null;
  songs: Array<{
    title: string;
    key: string | null;
    author: string | null;
    ccliNumber: string | null;
    themes: string | null;
    lastScheduled: string | null;
    description: string | null;
    lengthSeconds: number | null;
    songLeader: string | null;
  }>;
  hosts: PlanningCenterPerson[];
  worshipLeaders: PlanningCenterPerson[];
  serviceTimes: string[];
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
    throw new Error(`Planning Center request failed (${res.status}): ${body}`);
  }

  return schema.parse(await res.json());
}

async function listPlans(serviceTypeId: number, perPage = 25) {
  return pcoFetch(
    `/services/v2/service_types/${serviceTypeId}/plans?per_page=${perPage}&order=-sort_date`,
    z.object({ data: z.array(planSchema) }),
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

function uniqueSorted(values: Array<string | null | undefined>) {
  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
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

function formatServiceTimeLabel(time: PlanningCenterPlanTime) {
  const startsAt = time.attributes.starts_at;
  if (!startsAt) return null;

  const displayTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));

  const name = time.attributes.name?.trim();
  if (name && /^service\s*#\d+/i.test(name)) {
    return `${name} - ${displayTime}`;
  }
  if (time.attributes.time_type === "service") {
    return displayTime;
  }
  return null;
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

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : null);

  const songs = items
    .filter((item) => item.attributes.item_type === "song")
    .map((item) => {
      const songId = item.relationships?.song?.data?.id;
      const details = songId ? songDetailsById.get(songId) : undefined;

      // Get "By" note (song leader) from item_notes
      const noteIds = item.relationships?.item_notes?.data ?? [];
      let songLeader: string | null = null;
      for (const nr of noteIds) {
        const note = noteById.get(nr.id);
        if (note?.category_name === "By" && note.content) {
          songLeader = String(note.content).trim();
          break;
        }
      }

      return {
        title: item.attributes.title?.trim() ?? "",
        key: item.attributes.key_name?.trim() ?? null,
        author: str(details?.author) ?? null,
        ccliNumber: details?.ccli_number != null ? String(details.ccli_number).trim() : null,
        themes: str(details?.themes) ?? null,
        lastScheduled: str(details?.last_scheduled_short_dates) ?? null,
        description: item.attributes.description?.trim() ?? null,
        lengthSeconds: item.attributes.length ?? null,
        songLeader,
      };
    })
    .filter((song) => song.title);

  const hosts = pickPeopleByRole(teamMembers, (role) => /host/i.test(role));
  const worshipLeaders = pickPeopleByRole(
    teamMembers,
    (role) => /worship leader/i.test(role),
  );

  const serviceTimes = uniqueSorted(
    planTimes.map((time) => formatServiceTimeLabel(time)),
  );

  return {
    campusName,
    serviceTypeId,
    planId: plan.id,
    dates: plan.attributes.dates ?? null,
    seriesTitle: plan.attributes.series_title?.trim() ?? null,
    sermonTitle: normalizeSermonTitle(plan.attributes.title),
    weekLabel: extractWeekLabel(plan.attributes.title),
    totalLengthSeconds: plan.attributes.total_length ?? null,
    songs,
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
