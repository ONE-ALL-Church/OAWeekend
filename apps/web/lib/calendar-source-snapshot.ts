import adminDb from "@/lib/instant-admin";
import {
  CALENDAR_DEFAULT_ROWS,
  CALENDAR_DEFAULT_SECTIONS,
  CALENDAR_SYSTEM_ROW_SLUGS,
} from "@oaweekend/shared";

export interface CalendarStoredSourceRow {
  slug: string;
  rowName: string;
  sectionName: string;
  fieldType: string;
  source: string | null;
  status: string | null;
  updatedAt: number | null;
  updatedBy: string | null;
  displayValue: string;
  rawContent: string | null;
  rowExists: boolean;
  entryExists: boolean;
}

export interface CalendarSourceSnapshot {
  weekStart: string;
  weekId: string | null;
  weekFound: boolean;
  rows: CalendarStoredSourceRow[];
  latestUpdatedAt: number | null;
  planningCenterCount: number;
  rockCount: number;
  missingSlugs: string[];
}

interface CalendarRowRecord {
  id: string;
  name: string;
  slug: string;
  fieldType: string;
  sortOrder: number;
}

interface CalendarEntryRecord {
  id: string;
  content?: string;
  source?: string;
  status?: string;
  updatedAt?: number;
  updatedBy?: string;
  row?: { id: string; slug?: string };
}

const SOURCE_FILLED_ROW_SLUGS = new Set(
  (CALENDAR_SYSTEM_ROW_SLUGS as readonly string[]).filter(
    (slug) => slug !== "host" && slug !== "worship-leader",
  ),
);

const DEFAULT_SOURCE_ROWS = CALENDAR_DEFAULT_SECTIONS.flatMap((section) =>
  (CALENDAR_DEFAULT_ROWS[section.slug] ?? [])
    .filter((row) => SOURCE_FILLED_ROW_SLUGS.has(row.slug))
    .map((row) => ({
      sectionName: section.name,
      rowName: row.name,
      slug: row.slug,
      fieldType: row.fieldType,
      sortOrder: row.sortOrder,
      sectionSortOrder: section.sortOrder,
    })),
).sort(
  (a, b) =>
    a.sectionSortOrder - b.sectionSortOrder || a.sortOrder - b.sortOrder,
);

export async function getCalendarSourceSnapshotForWeek(
  weekStart: string,
): Promise<CalendarSourceSnapshot> {
  const data = await adminDb.query({
    calendarSections: {
      rows: {},
    },
    calendarWeeks: {
      $: { where: { weekStart } },
      entries: {
        row: {},
      },
    },
  });

  const rowsBySlug = new Map<
    string,
    CalendarRowRecord & { sectionName: string }
  >();
  const rowIdToSlug = new Map<string, string>();

  for (const section of data.calendarSections ?? []) {
    for (const row of section.rows ?? []) {
      const typedRow = row as CalendarRowRecord;
      rowsBySlug.set(typedRow.slug, {
        ...typedRow,
        sectionName: section.name,
      });
      rowIdToSlug.set(typedRow.id, typedRow.slug);
    }
  }

  const week = data.calendarWeeks?.[0] ?? null;
  const entriesBySlug = new Map<string, CalendarEntryRecord>();
  for (const entry of (week?.entries ?? []) as CalendarEntryRecord[]) {
    const rowId = entry.row?.id;
    const slug = rowId ? rowIdToSlug.get(rowId) : entry.row?.slug;
    if (slug) {
      entriesBySlug.set(slug, entry);
    }
  }

  const rows = DEFAULT_SOURCE_ROWS.map((defaultRow) => {
    const row = rowsBySlug.get(defaultRow.slug);
    const entry = entriesBySlug.get(defaultRow.slug);
    const content = entry?.content ?? null;

    return {
      slug: defaultRow.slug,
      rowName: row?.name ?? defaultRow.rowName,
      sectionName: row?.sectionName ?? defaultRow.sectionName,
      fieldType: row?.fieldType ?? defaultRow.fieldType,
      source: entry?.source ?? null,
      status: entry?.status ?? null,
      updatedAt: typeof entry?.updatedAt === "number" ? entry.updatedAt : null,
      updatedBy: entry?.updatedBy ?? null,
      displayValue: formatStoredContent(content, row?.fieldType ?? defaultRow.fieldType),
      rawContent: content,
      rowExists: Boolean(row),
      entryExists: Boolean(entry),
    };
  });

  const latestUpdatedAt =
    rows.reduce<number | null>((latest, row) => {
      if (!row.updatedAt) return latest;
      return latest == null || row.updatedAt > latest ? row.updatedAt : latest;
    }, null) ?? null;

  return {
    weekStart,
    weekId: week?.id ?? null,
    weekFound: Boolean(week),
    rows,
    latestUpdatedAt,
    planningCenterCount: rows.filter((row) => row.source === "planning-center")
      .length,
    rockCount: rows.filter((row) => row.source === "rock").length,
    missingSlugs: rows
      .filter((row) => !row.entryExists || isUnset(row.displayValue))
      .map((row) => row.slug),
  };
}

function formatStoredContent(content: string | null, fieldType: string) {
  if (!content || content === "{}") return "Not assigned";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return content.trim() || "Not assigned";
  }

  if (fieldType === "personPicker" && Array.isArray(parsed.people)) {
    const names = parsed.people
      .map((person) =>
        typeof person === "object" &&
        person != null &&
        "name" in person &&
        typeof person.name === "string"
          ? person.name.trim()
          : null,
      )
      .filter((name): name is string => Boolean(name));

    return names.length > 0 ? names.join(", ") : "Not assigned";
  }

  if (fieldType === "seriesPicker") {
    const label = typeof parsed.label === "string" ? parsed.label.trim() : "";
    const weekNumber =
      typeof parsed.weekNumber === "number" && parsed.weekNumber > 0
        ? ` - Week ${parsed.weekNumber}`
        : "";
    return label ? `${label}${weekNumber}` : "Not assigned";
  }

  if (typeof parsed.value === "string") {
    return parsed.value.trim() || "Not assigned";
  }

  return JSON.stringify(parsed);
}

function isUnset(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "not assigned" ||
    normalized === "none"
  );
}
