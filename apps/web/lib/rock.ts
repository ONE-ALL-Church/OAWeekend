import { z } from "zod";

const ROCK_BASE_URL = process.env.ROCK_BASE_URL;
const ROCK_API_KEY = process.env.ROCK_API_KEY;

// --- Zod Schemas ---

const CampusSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  Guid: z.string(),
  ShortCode: z.string().nullable().optional(),
  IsActive: z.boolean().optional(),
});

const AttributeValueSchema = z.object({
  Value: z.string().optional().default(""),
  ValueFormatted: z.string().optional().default(""),
});

const ContentChannelItemSchema = z.object({
  Id: z.number(),
  Title: z.string(),
  StartDateTime: z.string().nullable().optional(),
  Status: z.number(),
  AttributeValues: z.record(AttributeValueSchema).optional(),
});

export type RockCampus = z.infer<typeof CampusSchema>;
export type RockContentChannelItem = z.infer<typeof ContentChannelItemSchema>;

// --- Fetch helper ---

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
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Rock API error: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return z.array(schema).parse(data);
}

// --- Public API ---

export async function getCampuses(): Promise<RockCampus[]> {
  return rockFetch(
    "/Campuses?$select=Id,Name,Guid,ShortCode,IsActive&$filter=IsActive eq true",
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
  const channelGuid = process.env.ROCK_CONTENT_CHANNEL_GUID;
  if (!channelGuid) return [];

  // Note: Don't use $select with loadAttributes — Rock returns an OData type error.
  // Speaker name comes from AttributeValues.Speaker.ValueFormatted (no extra fetch needed).
  const items = await rockFetch(
    `/ContentChannelItems?$filter=ContentChannel/Guid eq guid'${channelGuid}'&$top=10&$orderby=StartDateTime desc&loadAttributes=simple`,
    ContentChannelItemSchema
  );

  // Filter to approved (Status 2) items in code since OData $select + Status filter conflicts
  return items
    .filter((item) => item.Status === 2)
    .map((item) => ({
      id: item.Id,
      title: item.Title,
      startDateTime: item.StartDateTime ?? null,
      speaker: item.AttributeValues?.Speaker?.ValueFormatted || null,
      contentChannelItemId: item.Id,
    }));
}
