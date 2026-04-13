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
  value: z.string().nullable().optional().default(""),
  textValue: z.string().nullable().optional().default(""),
});

const ContentChannelItemSchema = z
  .object({
    Id: z.number(),
    Title: z.string(),
    StartDateTime: z.string().nullable().optional(),
    Status: z.number(),
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
  return z.array(schema).parse(data);
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
  const parsed: Record<string, { value: string; textValue: string }> = {};
  for (const [key, val] of Object.entries(data)) {
    const result = AttributeValueSchema.safeParse(val);
    if (result.success) {
      parsed[key] = {
        value: result.data.value ?? "",
        textValue: result.data.textValue ?? "",
      };
    }
  }
  return parsed;
}

// --- Public API ---

export async function getCampuses(): Promise<RockCampus[]> {
  return rockSearch(
    "campuses",
    {
      where: "IsActive == true",
      select: "new { Id, Name, Guid, ShortCode, IsActive }",
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
  const channelGuid = process.env.ROCK_CONTENT_CHANNEL_GUID;
  if (!channelGuid) return [];

  const items = await rockSearch(
    "contentchannelitems",
    {
      where: `ContentChannel.Guid == guid("${channelGuid}")`,
      sort: "StartDateTime desc",
      limit: 10,
    },
    ContentChannelItemSchema
  );

  // Include both Approved (2) and PendingApproval (1) items
  const filtered = items.filter(
    (item) => item.Status === 1 || item.Status === 2
  );

  // Fetch attribute values (speaker name) for each item in parallel
  const results = await Promise.all(
    filtered.map(async (item) => {
      const attrs = await rockAttributeValues("contentchannelitems", item.Id);
      return {
        id: item.Id,
        title: item.Title,
        startDateTime: item.StartDateTime ?? null,
        speaker: attrs.Speaker?.textValue || null,
        contentChannelItemId: item.Id,
      };
    })
  );

  return results;
}
