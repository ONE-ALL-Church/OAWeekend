import { z } from "zod";

const ROCK_BASE_URL = process.env.ROCK_BASE_URL;
const ROCK_API_KEY = process.env.ROCK_API_KEY;

const CampusSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  Guid: z.string(),
});

const ScheduleSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  iCalendarContent: z.string().nullable().optional(),
});

const ContentChannelItemSchema = z.object({
  Id: z.number(),
  Title: z.string(),
  StartDateTime: z.string().nullable().optional(),
  Status: z.number(),
});

export type RockCampus = z.infer<typeof CampusSchema>;
export type RockSchedule = z.infer<typeof ScheduleSchema>;
export type RockContentChannelItem = z.infer<typeof ContentChannelItemSchema>;

async function rockFetch<T>(
  path: string,
  schema: z.ZodType<T>
): Promise<T[]> {
  if (!ROCK_BASE_URL || !ROCK_API_KEY) {
    throw new Error("Rock RMS not configured");
  }

  const url = `${ROCK_BASE_URL}/api${path}`;
  const res = await fetch(url, {
    headers: {
      "Authorization-Token": ROCK_API_KEY,
      Accept: "application/json",
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`Rock API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return z.array(schema).parse(data);
}

export async function getCampuses(): Promise<RockCampus[]> {
  return rockFetch("/Campuses?$select=Id,Name,Guid", CampusSchema);
}

export async function getTodaysServices(
  campusId?: number
): Promise<RockSchedule[]> {
  let path = "/Schedules?$select=Id,Name,iCalendarContent&$top=20";
  if (campusId) {
    path += `&$filter=CategoryId eq ${campusId}`;
  }
  return rockFetch(path, ScheduleSchema);
}

export async function getActiveSermonItems(): Promise<
  RockContentChannelItem[]
> {
  const channelGuid = process.env.ROCK_CONTENT_CHANNEL_GUID;
  if (!channelGuid) return [];

  const path = `/ContentChannelItems?$filter=ContentChannel/Guid eq guid'${channelGuid}' and Status eq 2&$select=Id,Title,StartDateTime,Status&$top=10&$orderby=StartDateTime desc`;
  return rockFetch(path, ContentChannelItemSchema);
}
