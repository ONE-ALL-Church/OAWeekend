# Strategic Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an editable strategic calendar for planning church weekend services across all campuses, with configurable sections/rows, drill-down views, and role-based editing — all backed by InstantDB.

**Architecture:** Extends the existing Next.js 16 + InstantDB monorepo. New entities added to `instant.schema.ts`, new routes under `/calendar`, new components and hooks following established patterns. All data is real-time via InstantDB subscriptions. The calendar grid is a CSS Grid with frozen label column and horizontally scrollable week columns.

**Tech Stack:** Next.js 16 (App Router), React 19, InstantDB (`@instantdb/react`), Tailwind CSS 4, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-04-13-strategic-calendar-design.md`

**Key codebase conventions (read before coding):**
- `"use client"` directive on all components and hooks
- Named exports for components/hooks, default exports for pages
- `@/` path alias points to `apps/web/`
- Tailwind classes use `oa-` prefixed custom colors (e.g., `bg-oa-yellow-500`, `text-oa-black-900`)
- CSS custom properties for radii/shadows: `rounded-[--radius-card]`, `shadow-[--shadow-card]`
- InstantDB `db` imported from `@/lib/instant`
- `id()` from `@instantdb/react` for entity IDs
- Hooks return `{ data, isLoading, error }` pattern
- Write helpers are plain async functions (not hooks)
- Read the AGENTS.md warning: Next.js 16 may differ from training data — check `node_modules/next/dist/docs/` if unsure

---

## File Structure

### Schema & Permissions
- **Modify:** `apps/web/instant.schema.ts` — add 6 new entities, 7 new links
- **Modify:** `apps/web/instant.perms.ts` — add permission rules for new entities

### Shared Types & Constants
- **Modify:** `packages/shared/src/types.ts` — add calendar field types and content JSON types
- **Modify:** `packages/shared/src/constants.ts` — add calendar defaults and field type options

### Type Exports
- **Modify:** `apps/web/lib/instant.ts` — add type exports for new entities

### CSS
- **Modify:** `apps/web/app/globals.css` — add calendar-specific status colors (green confirmed)

### Hooks
- **Create:** `apps/web/hooks/use-calendar.ts` — query weeks, sections, rows, entries by date range
- **Create:** `apps/web/hooks/use-calendar-entry.ts` — CRUD for entries with optimistic updates
- **Create:** `apps/web/hooks/use-calendar-series.ts` — query/manage series
- **Create:** `apps/web/hooks/use-calendar-roles.ts` — query user roles and permissions
- **Create:** `apps/web/hooks/use-calendar-settings.ts` — admin CRUD for sections/rows

### Components
- **Create:** `apps/web/components/calendar/calendar-toolbar.tsx` — date nav, campus filter, actions
- **Create:** `apps/web/components/calendar/calendar-section-header.tsx` — collapsible section header
- **Create:** `apps/web/components/calendar/calendar-cell.tsx` — cell renderer dispatching by field type
- **Create:** `apps/web/components/calendar/calendar-grid.tsx` — main grid with sections, rows, weeks
- **Create:** `apps/web/components/calendar/cell-editor.tsx` — inline edit panel by field type
- **Create:** `apps/web/components/calendar/person-chip.tsx` — avatar + name chip
- **Create:** `apps/web/components/calendar/week-detail-section.tsx` — section card for week detail
- **Create:** `apps/web/components/calendar/series-timeline.tsx` — week timeline table for series view
- **Create:** `apps/web/components/calendar/calendar-settings-panel.tsx` — admin config UI

### Routes
- **Create:** `apps/web/app/calendar/layout.tsx` — calendar layout wrapper
- **Create:** `apps/web/app/calendar/page.tsx` — main grid view
- **Create:** `apps/web/app/calendar/week/[weekStart]/page.tsx` — week detail
- **Create:** `apps/web/app/calendar/series/[seriesId]/page.tsx` — series detail
- **Create:** `apps/web/app/calendar/section/[sectionSlug]/page.tsx` — section detail
- **Create:** `apps/web/app/calendar/settings/page.tsx` — admin settings

### Seed Script
- **Create:** `apps/web/scripts/seed-calendar.ts` — seed default sections/rows matching the spreadsheet

---

## Task 1: Schema — Add Calendar Entities

**Files:**
- Modify: `apps/web/instant.schema.ts`

- [ ] **Step 1: Add the 6 new entities to the schema**

Open `apps/web/instant.schema.ts` and add the new entities inside the `entities` object, after `displays`:

```typescript
calendarSections: i.entity({
  name: i.string(),
  slug: i.string().unique().indexed(),
  sortOrder: i.number().indexed(),
  color: i.string(),
  createdAt: i.number().indexed(),
  updatedAt: i.number(),
}),
calendarRows: i.entity({
  name: i.string(),
  slug: i.string().indexed(),
  sortOrder: i.number().indexed(),
  fieldType: i.string().indexed(),
  campusSpecific: i.boolean(),
  createdAt: i.number().indexed(),
}),
calendarWeeks: i.entity({
  weekStart: i.string().indexed(),
  label: i.string().optional(),
  createdAt: i.number().indexed(),
}),
calendarEntries: i.entity({
  content: i.string(),
  notes: i.string().optional(),
  status: i.string().indexed(),
  updatedAt: i.number().indexed(),
  updatedBy: i.string().optional(),
}),
calendarSeries: i.entity({
  name: i.string(),
  description: i.string().optional(),
  color: i.string(),
  startWeek: i.string().indexed(),
  endWeek: i.string().indexed(),
  createdAt: i.number().indexed(),
}),
calendarRoles: i.entity({
  name: i.string(),
  createdAt: i.number().indexed(),
}),
```

- [ ] **Step 2: Add the 7 new links**

Add these inside the `links` object, after `displaySession`:

```typescript
sectionRows: {
  forward: { on: "calendarSections", has: "many", label: "rows" },
  reverse: { on: "calendarRows", has: "one", label: "section" },
},
entryWeek: {
  forward: { on: "calendarEntries", has: "one", label: "week" },
  reverse: { on: "calendarWeeks", has: "many", label: "entries" },
},
entryRow: {
  forward: { on: "calendarEntries", has: "one", label: "row" },
  reverse: { on: "calendarRows", has: "many", label: "entries" },
},
entryUpdater: {
  forward: { on: "calendarEntries", has: "one", label: "updater" },
  reverse: { on: "$users", has: "many", label: "updatedEntries" },
},
seriesWeeks: {
  forward: { on: "calendarSeries", has: "many", label: "weeks" },
  reverse: { on: "calendarWeeks", has: "many", label: "series" },
},
roleSections: {
  forward: { on: "calendarRoles", has: "many", label: "sections" },
  reverse: { on: "calendarSections", has: "many", label: "roles" },
},
roleMembers: {
  forward: { on: "calendarRoles", has: "many", label: "members" },
  reverse: { on: "$users", has: "many", label: "calendarRoles" },
},
```

- [ ] **Step 3: Push schema**

```bash
cd apps/web && npx instant-cli push schema --yes
```

Expected: Schema pushed successfully with new entities and links.

- [ ] **Step 4: Commit**

```bash
git add apps/web/instant.schema.ts
git commit -m "feat(calendar): add strategic calendar entities and links to schema"
```

---

## Task 2: Permissions — Add Calendar Rules

**Files:**
- Modify: `apps/web/instant.perms.ts`

- [ ] **Step 1: Add permission rules for all 6 calendar entities**

Add these inside the `namespaces` object in `instant.perms.ts`, after the `displays` block:

```typescript
calendarSections: {
  allow: {
    read: "true",
    create: "auth.id != null",
    update: "auth.id != null",
    delete: "auth.id != null",
  },
},
calendarRows: {
  allow: {
    read: "true",
    create: "auth.id != null",
    update: "auth.id != null",
    delete: "auth.id != null",
  },
},
calendarWeeks: {
  allow: {
    read: "true",
    create: "auth.id != null",
    update: "auth.id != null",
    delete: "auth.id != null",
  },
},
calendarEntries: {
  allow: {
    read: "true",
    create: "auth.id != null",
    update: "auth.id != null",
    delete: "auth.id != null",
  },
},
calendarSeries: {
  allow: {
    read: "true",
    create: "auth.id != null",
    update: "auth.id != null",
    delete: "auth.id != null",
  },
},
calendarRoles: {
  allow: {
    read: "auth.id != null",
    create: "auth.id != null",
    update: "auth.id != null",
    delete: "auth.id != null",
  },
},
```

Note: For MVP, all authenticated users can edit. Role-based section locking will be enforced client-side first. Server-side permission refinement (using `data.ref()` to check role membership) is a follow-up.

- [ ] **Step 2: Push permissions**

```bash
cd apps/web && npx instant-cli push perms --yes
```

Expected: Permissions pushed successfully.

- [ ] **Step 3: Commit**

```bash
git add apps/web/instant.perms.ts
git commit -m "feat(calendar): add permission rules for calendar entities"
```

---

## Task 3: Shared Types & Constants

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/constants.ts`

- [ ] **Step 1: Add calendar types to shared types**

Append to `packages/shared/src/types.ts`:

```typescript
// ---------------------------------------------------------------------------
// Strategic Calendar
// ---------------------------------------------------------------------------

export type CalendarFieldType =
  | "text"
  | "multilineText"
  | "personPicker"
  | "seriesPicker"
  | "campusPicker"
  | "tagList"
  | "boolean"
  | "richText";

export type CalendarEntryStatus = "empty" | "draft" | "confirmed";

// Content JSON shapes per field type
export interface TextContent {
  value: string;
}

export interface MultilineTextContent {
  value: string;
}

export interface PersonPickerContent {
  people: Array<{
    name: string;
    initials: string;
    rockPersonId: string | null;
  }>;
}

export interface SeriesPickerContent {
  seriesId: string;
  weekNumber: number;
}

export interface CampusPickerContent {
  campuses: Array<{ id: string; name: string }>;
}

export interface TagListContent {
  tags: string[];
}

export interface BooleanContent {
  value: boolean;
}

export interface RichTextContent {
  html: string;
}

export type CalendarCellContent =
  | TextContent
  | MultilineTextContent
  | PersonPickerContent
  | SeriesPickerContent
  | CampusPickerContent
  | TagListContent
  | BooleanContent
  | RichTextContent;
```

- [ ] **Step 2: Add calendar constants**

Append to `packages/shared/src/constants.ts`:

```typescript
// ---------------------------------------------------------------------------
// Strategic Calendar
// ---------------------------------------------------------------------------

export const CALENDAR_FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "multilineText", label: "Multi-line Text" },
  { value: "personPicker", label: "Person Picker" },
  { value: "seriesPicker", label: "Series Picker" },
  { value: "campusPicker", label: "Campus Picker" },
  { value: "tagList", label: "Tag List" },
  { value: "boolean", label: "Yes / No" },
  { value: "richText", label: "Rich Text" },
] as const;

export const CALENDAR_ENTRY_STATUS_OPTIONS = [
  { value: "empty", label: "Empty" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
] as const;

export const CALENDAR_WEEKS_PER_PAGE = 8;

export const CALENDAR_DEFAULT_SECTIONS = [
  { name: "Service Planning", slug: "service-planning", color: "#272728", sortOrder: 0 },
  { name: "Events & Campaigns", slug: "events-campaigns", color: "#6873B3", sortOrder: 1 },
  { name: "Social Media", slug: "social-media", color: "#D07A84", sortOrder: 2 },
  { name: "Email & Text", slug: "email-text", color: "#CDA5AC", sortOrder: 3 },
  { name: "Podcast & YouTube", slug: "podcast-youtube", color: "#272728", sortOrder: 4 },
  { name: "Worship", slug: "worship", color: "#FFC905", sortOrder: 5 },
] as const;

export const CALENDAR_DEFAULT_ROWS: Record<string, Array<{ name: string; slug: string; fieldType: string; sortOrder: number; campusSpecific: boolean }>> = {
  "service-planning": [
    { name: "Series", slug: "series", fieldType: "seriesPicker", sortOrder: 0, campusSpecific: false },
    { name: "Speaker", slug: "speaker", fieldType: "personPicker", sortOrder: 1, campusSpecific: false },
    { name: "Host", slug: "host", fieldType: "personPicker", sortOrder: 2, campusSpecific: false },
    { name: "Communion", slug: "communion", fieldType: "tagList", sortOrder: 3, campusSpecific: false },
    { name: "In Service Video", slug: "in-service-video", fieldType: "multilineText", sortOrder: 4, campusSpecific: false },
    { name: "Campus - Live Speaking", slug: "campus-live", fieldType: "campusPicker", sortOrder: 5, campusSpecific: false },
    { name: "Special", slug: "special", fieldType: "text", sortOrder: 6, campusSpecific: false },
  ],
  "events-campaigns": [
    { name: "All Church Events", slug: "all-church-events", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "San Dimas Events", slug: "sd-events", fieldType: "multilineText", sortOrder: 1, campusSpecific: true },
    { name: "Rancho Events", slug: "rc-events", fieldType: "multilineText", sortOrder: 2, campusSpecific: true },
    { name: "West Covina Events", slug: "wc-events", fieldType: "multilineText", sortOrder: 3, campusSpecific: true },
    { name: "Campaign 1", slug: "campaign-1", fieldType: "text", sortOrder: 4, campusSpecific: false },
    { name: "Campaign 2", slug: "campaign-2", fieldType: "text", sortOrder: 5, campusSpecific: false },
    { name: "Campaign 3", slug: "campaign-3", fieldType: "text", sortOrder: 6, campusSpecific: false },
  ],
  "social-media": [
    { name: "Monday", slug: "social-mon", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "Tuesday", slug: "social-tue", fieldType: "multilineText", sortOrder: 1, campusSpecific: false },
    { name: "Wednesday", slug: "social-wed", fieldType: "multilineText", sortOrder: 2, campusSpecific: false },
    { name: "Thursday", slug: "social-thu", fieldType: "multilineText", sortOrder: 3, campusSpecific: false },
    { name: "Friday", slug: "social-fri", fieldType: "multilineText", sortOrder: 4, campusSpecific: false },
    { name: "Saturday", slug: "social-sat", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
    { name: "Sunday", slug: "social-sun", fieldType: "multilineText", sortOrder: 6, campusSpecific: false },
  ],
  "email-text": [
    { name: "All Church Email", slug: "all-church-email", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "Campus Email", slug: "campus-email", fieldType: "multilineText", sortOrder: 1, campusSpecific: true },
    { name: "Ministry Email", slug: "ministry-email", fieldType: "multilineText", sortOrder: 2, campusSpecific: false },
    { name: "All Church Text", slug: "all-church-text", fieldType: "multilineText", sortOrder: 3, campusSpecific: false },
    { name: "Campus Text", slug: "campus-text", fieldType: "multilineText", sortOrder: 4, campusSpecific: true },
    { name: "Ministry Text", slug: "ministry-text", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
  ],
  "podcast-youtube": [
    { name: "Daily - Monday", slug: "podcast-mon", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "Daily - Tuesday", slug: "podcast-tue", fieldType: "multilineText", sortOrder: 1, campusSpecific: false },
    { name: "Daily - Wednesday", slug: "podcast-wed", fieldType: "multilineText", sortOrder: 2, campusSpecific: false },
    { name: "Daily - Thursday", slug: "podcast-thu", fieldType: "multilineText", sortOrder: 3, campusSpecific: false },
    { name: "Daily - Friday", slug: "podcast-fri", fieldType: "multilineText", sortOrder: 4, campusSpecific: false },
    { name: "Weekend Broadcast", slug: "yt-broadcast", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
    { name: "Shorter Content", slug: "yt-shorts", fieldType: "multilineText", sortOrder: 6, campusSpecific: false },
    { name: "YouTube Series", slug: "yt-series", fieldType: "text", sortOrder: 7, campusSpecific: false },
  ],
  "worship": [
    { name: "Song 1", slug: "song-1", fieldType: "text", sortOrder: 0, campusSpecific: false },
    { name: "Song 2", slug: "song-2", fieldType: "text", sortOrder: 1, campusSpecific: false },
    { name: "Song 3", slug: "song-3", fieldType: "text", sortOrder: 2, campusSpecific: false },
    { name: "Song 4", slug: "song-4", fieldType: "text", sortOrder: 3, campusSpecific: false },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/constants.ts
git commit -m "feat(calendar): add calendar types and default section/row constants"
```

---

## Task 4: Type Exports & CSS Tokens

**Files:**
- Modify: `apps/web/lib/instant.ts`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add calendar type exports to instant.ts**

Append to `apps/web/lib/instant.ts` after the existing type exports:

```typescript
export type CalendarSection = InstaQLEntity<AppSchema, "calendarSections">;
export type CalendarSectionWithRows = InstaQLEntity<
  AppSchema,
  "calendarSections",
  { rows: {} }
>;
export type CalendarRow = InstaQLEntity<AppSchema, "calendarRows">;
export type CalendarWeek = InstaQLEntity<AppSchema, "calendarWeeks">;
export type CalendarWeekWithEntries = InstaQLEntity<
  AppSchema,
  "calendarWeeks",
  { entries: { row: {} }; series: {} }
>;
export type CalendarEntry = InstaQLEntity<AppSchema, "calendarEntries">;
export type CalendarEntryWithLinks = InstaQLEntity<
  AppSchema,
  "calendarEntries",
  { week: {}; row: {} }
>;
export type CalendarSeries = InstaQLEntity<AppSchema, "calendarSeries">;
export type CalendarSeriesWithWeeks = InstaQLEntity<
  AppSchema,
  "calendarSeries",
  { weeks: {} }
>;
export type CalendarRole = InstaQLEntity<AppSchema, "calendarRoles">;
export type CalendarRoleWithMembers = InstaQLEntity<
  AppSchema,
  "calendarRoles",
  { members: {}; sections: {} }
>;
```

- [ ] **Step 2: Add confirmed status color to globals.css**

Add inside the `@theme inline` block in `apps/web/app/globals.css`, after the supplemental accents:

```css
/* Calendar status colors */
--color-oa-green: #22c55e;
--color-oa-green-bg: rgba(34, 197, 94, 0.1);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/instant.ts apps/web/app/globals.css
git commit -m "feat(calendar): add calendar type exports and status color tokens"
```

---

## Task 5: Core Data Hooks — use-calendar.ts

**Files:**
- Create: `apps/web/hooks/use-calendar.ts`

- [ ] **Step 1: Create the calendar query hook**

Create `apps/web/hooks/use-calendar.ts`:

```typescript
"use client";

import { useMemo } from "react";
import db from "@/lib/instant";
import type {
  CalendarSectionWithRows,
  CalendarWeekWithEntries,
  CalendarEntry,
} from "@/lib/instant";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/**
 * Query all calendar sections with their rows, ordered by sortOrder.
 */
export function useCalendarSections() {
  const { isLoading, error, data } = db.useQuery({
    calendarSections: {
      $: { order: { sortOrder: "asc" } },
      rows: {
        $: { order: { sortOrder: "asc" } },
      },
    },
  });

  return {
    sections: (data?.calendarSections ?? []) as CalendarSectionWithRows[],
    isLoading,
    error,
  };
}

/**
 * Query calendar weeks within a date range, with their entries and series.
 * Weeks are ordered by weekStart ascending.
 */
export function useCalendarWeeks(rangeStart: string, rangeEnd: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarWeeks: {
      $: {
        where: {
          and: [
            { weekStart: { $gte: rangeStart } },
            { weekStart: { $lte: rangeEnd } },
          ],
        },
        order: { weekStart: "asc" },
      },
      entries: {
        row: {},
      },
      series: {},
    },
  });

  return {
    weeks: (data?.calendarWeeks ?? []) as CalendarWeekWithEntries[],
    isLoading,
    error,
  };
}

/**
 * Query a single week by its weekStart date string.
 */
export function useCalendarWeek(weekStart: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarWeeks: {
      $: { where: { weekStart } },
      entries: {
        row: {},
      },
      series: {},
    },
  });

  return {
    week: (data?.calendarWeeks?.[0] ?? null) as CalendarWeekWithEntries | null,
    isLoading,
    error,
  };
}

/**
 * Query all series overlapping a date range (for rendering series spans in grid).
 */
export function useCalendarSeriesInRange(rangeStart: string, rangeEnd: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarSeries: {
      $: {
        where: {
          and: [
            { startWeek: { $lte: rangeEnd } },
            { endWeek: { $gte: rangeStart } },
          ],
        },
        order: { startWeek: "asc" },
      },
      weeks: {},
    },
  });

  return {
    seriesList: data?.calendarSeries ?? [],
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// Grid data builder
// ---------------------------------------------------------------------------

/**
 * Build a lookup map from (weekId, rowId) → CalendarEntry for fast cell access.
 */
export function buildEntryMap(
  weeks: CalendarWeekWithEntries[],
): Map<string, CalendarEntry> {
  const map = new Map<string, CalendarEntry>();
  for (const week of weeks) {
    for (const entry of week.entries ?? []) {
      const row = (entry as CalendarEntry & { row?: { id: string } }).row;
      if (row) {
        map.set(`${week.id}:${row.id}`, entry);
      }
    }
  }
  return map;
}

/**
 * Compute the date range for a given page offset (0 = current, -1 = prev, 1 = next).
 * Each page spans ~2 months (8 weeks).
 */
export function useDateRange(pageOffset: number) {
  return useMemo(() => {
    const today = new Date();
    // Find the most recent Saturday
    const day = today.getDay();
    const diffToSaturday = (day + 1) % 7; // days since last Saturday
    const baseSaturday = new Date(today);
    baseSaturday.setDate(today.getDate() - diffToSaturday);

    // Apply page offset (8 weeks per page)
    const startDate = new Date(baseSaturday);
    startDate.setDate(baseSaturday.getDate() + pageOffset * 56); // 8 weeks * 7 days

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 55); // 8 weeks - 1 day

    const rangeStart = startDate.toISOString().slice(0, 10);
    const rangeEnd = endDate.toISOString().slice(0, 10);

    return { rangeStart, rangeEnd };
  }, [pageOffset]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors related to use-calendar.ts

- [ ] **Step 3: Commit**

```bash
git add apps/web/hooks/use-calendar.ts
git commit -m "feat(calendar): add core calendar query hooks and grid data builder"
```

---

## Task 6: Entry CRUD Hook — use-calendar-entry.ts

**Files:**
- Create: `apps/web/hooks/use-calendar-entry.ts`

- [ ] **Step 1: Create the entry CRUD hook**

Create `apps/web/hooks/use-calendar-entry.ts`:

```typescript
"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Create or update a calendar entry for a given week + row intersection.
 * If entryId is provided, updates the existing entry.
 * If not, creates a new entry and links it to the week and row.
 */
export async function upsertCalendarEntry(params: {
  entryId?: string;
  weekId: string;
  rowId: string;
  content: string;
  status?: string;
  userId?: string;
}) {
  const { entryId, weekId, rowId, content, status, userId } = params;
  const now = Date.now();

  if (entryId) {
    // Update existing entry
    await db.transact(
      db.tx.calendarEntries[entryId].update({
        content,
        status: status ?? "draft",
        updatedAt: now,
        updatedBy: userId ?? "",
      }),
    );
    return entryId;
  }

  // Create new entry and link to week + row
  const newId = id();
  await db.transact([
    db.tx.calendarEntries[newId].update({
      content,
      status: status ?? "draft",
      updatedAt: now,
      updatedBy: userId ?? "",
    }),
    db.tx.calendarEntries[newId].link({ week: weekId }),
    db.tx.calendarEntries[newId].link({ row: rowId }),
  ]);
  return newId;
}

/**
 * Update entry status (e.g., draft → confirmed).
 */
export async function updateEntryStatus(
  entryId: string,
  status: string,
  userId?: string,
) {
  await db.transact(
    db.tx.calendarEntries[entryId].update({
      status,
      updatedAt: Date.now(),
      updatedBy: userId ?? "",
    }),
  );
}

/**
 * Update entry notes.
 */
export async function updateEntryNotes(
  entryId: string,
  notes: string,
  userId?: string,
) {
  await db.transact(
    db.tx.calendarEntries[entryId].update({
      notes,
      updatedAt: Date.now(),
      updatedBy: userId ?? "",
    }),
  );
}

/**
 * Delete a calendar entry.
 */
export async function deleteCalendarEntry(entryId: string) {
  await db.transact(db.tx.calendarEntries[entryId].delete());
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/use-calendar-entry.ts
git commit -m "feat(calendar): add entry CRUD helpers"
```

---

## Task 7: Series Hook — use-calendar-series.ts

**Files:**
- Create: `apps/web/hooks/use-calendar-series.ts`

- [ ] **Step 1: Create the series hook**

Create `apps/web/hooks/use-calendar-series.ts`:

```typescript
"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";
import type { CalendarSeriesWithWeeks } from "@/lib/instant";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useCalendarSeries() {
  const { isLoading, error, data } = db.useQuery({
    calendarSeries: {
      $: { order: { startWeek: "asc" } },
      weeks: {},
    },
  });

  return {
    seriesList: (data?.calendarSeries ?? []) as CalendarSeriesWithWeeks[],
    isLoading,
    error,
  };
}

export function useCalendarSeriesById(seriesId: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarSeries: {
      $: { where: { id: seriesId } },
      weeks: {
        $: { order: { weekStart: "asc" } },
        entries: {
          row: {},
        },
      },
    },
  });

  return {
    series: data?.calendarSeries?.[0] ?? null,
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

export async function createCalendarSeries(params: {
  name: string;
  description?: string;
  color: string;
  startWeek: string;
  endWeek: string;
  weekIds: string[];
}) {
  const seriesId = id();
  const linkOps = params.weekIds.map((weekId) =>
    db.tx.calendarSeries[seriesId].link({ weeks: weekId }),
  );

  await db.transact([
    db.tx.calendarSeries[seriesId].update({
      name: params.name,
      description: params.description ?? "",
      color: params.color,
      startWeek: params.startWeek,
      endWeek: params.endWeek,
      createdAt: Date.now(),
    }),
    ...linkOps,
  ]);
  return seriesId;
}

export async function updateCalendarSeries(
  seriesId: string,
  updates: Partial<{
    name: string;
    description: string;
    color: string;
    startWeek: string;
    endWeek: string;
  }>,
) {
  await db.transact(db.tx.calendarSeries[seriesId].update(updates));
}

export async function deleteCalendarSeries(seriesId: string) {
  await db.transact(db.tx.calendarSeries[seriesId].delete());
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/use-calendar-series.ts
git commit -m "feat(calendar): add series query and CRUD hooks"
```

---

## Task 8: Settings Hook — use-calendar-settings.ts

**Files:**
- Create: `apps/web/hooks/use-calendar-settings.ts`

- [ ] **Step 1: Create the settings admin hook**

Create `apps/web/hooks/use-calendar-settings.ts`:

```typescript
"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";

// ---------------------------------------------------------------------------
// Section CRUD
// ---------------------------------------------------------------------------

export async function createCalendarSection(params: {
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
}) {
  const sectionId = id();
  await db.transact(
    db.tx.calendarSections[sectionId].update({
      name: params.name,
      slug: params.slug,
      color: params.color,
      sortOrder: params.sortOrder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return sectionId;
}

export async function updateCalendarSection(
  sectionId: string,
  updates: Partial<{ name: string; slug: string; color: string; sortOrder: number }>,
) {
  await db.transact(
    db.tx.calendarSections[sectionId].update({
      ...updates,
      updatedAt: Date.now(),
    }),
  );
}

export async function deleteCalendarSection(sectionId: string) {
  await db.transact(db.tx.calendarSections[sectionId].delete());
}

// ---------------------------------------------------------------------------
// Row CRUD
// ---------------------------------------------------------------------------

export async function createCalendarRow(params: {
  sectionId: string;
  name: string;
  slug: string;
  fieldType: string;
  sortOrder: number;
  campusSpecific: boolean;
}) {
  const rowId = id();
  await db.transact([
    db.tx.calendarRows[rowId].update({
      name: params.name,
      slug: params.slug,
      fieldType: params.fieldType,
      sortOrder: params.sortOrder,
      campusSpecific: params.campusSpecific,
      createdAt: Date.now(),
    }),
    db.tx.calendarRows[rowId].link({ section: params.sectionId }),
  ]);
  return rowId;
}

export async function updateCalendarRow(
  rowId: string,
  updates: Partial<{
    name: string;
    slug: string;
    fieldType: string;
    sortOrder: number;
    campusSpecific: boolean;
  }>,
) {
  await db.transact(db.tx.calendarRows[rowId].update(updates));
}

export async function deleteCalendarRow(rowId: string) {
  await db.transact(db.tx.calendarRows[rowId].delete());
}

// ---------------------------------------------------------------------------
// Week CRUD
// ---------------------------------------------------------------------------

export async function createCalendarWeek(params: {
  weekStart: string;
  label?: string;
}) {
  const weekId = id();
  await db.transact(
    db.tx.calendarWeeks[weekId].update({
      weekStart: params.weekStart,
      label: params.label ?? "",
      createdAt: Date.now(),
    }),
  );
  return weekId;
}

export async function updateCalendarWeek(
  weekId: string,
  updates: Partial<{ weekStart: string; label: string }>,
) {
  await db.transact(db.tx.calendarWeeks[weekId].update(updates));
}

export async function deleteCalendarWeek(weekId: string) {
  await db.transact(db.tx.calendarWeeks[weekId].delete());
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/use-calendar-settings.ts
git commit -m "feat(calendar): add settings CRUD for sections, rows, and weeks"
```

---

## Task 9: Roles Hook — use-calendar-roles.ts

**Files:**
- Create: `apps/web/hooks/use-calendar-roles.ts`

- [ ] **Step 1: Create the roles hook**

Create `apps/web/hooks/use-calendar-roles.ts`:

```typescript
"use client";

import { useMemo } from "react";
import { id } from "@instantdb/react";
import db from "@/lib/instant";
import type { CalendarRoleWithMembers } from "@/lib/instant";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useCalendarRoles() {
  const { isLoading, error, data } = db.useQuery({
    calendarRoles: {
      sections: {},
      members: {},
    },
  });

  return {
    roles: (data?.calendarRoles ?? []) as CalendarRoleWithMembers[],
    isLoading,
    error,
  };
}

/**
 * Returns the set of section IDs the current user can edit.
 * If the user has no roles, returns an empty set (view-only).
 * Admin check is done by a special role name "Admin".
 */
export function useUserEditableSections() {
  const { user } = db.useAuth();
  const { roles, isLoading } = useCalendarRoles();

  const editableSectionIds = useMemo(() => {
    if (!user) return new Set<string>();

    const userRoles = roles.filter((role) =>
      (role.members ?? []).some((m) => m.id === user.id),
    );

    // Admin role grants access to everything
    const isAdmin = userRoles.some((r) => r.name === "Admin");
    if (isAdmin) return null; // null = all sections editable

    const sectionIds = new Set<string>();
    for (const role of userRoles) {
      for (const section of role.sections ?? []) {
        sectionIds.add(section.id);
      }
    }
    return sectionIds;
  }, [user, roles]);

  return { editableSectionIds, isLoading };
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

export async function createCalendarRole(name: string) {
  const roleId = id();
  await db.transact(
    db.tx.calendarRoles[roleId].update({
      name,
      createdAt: Date.now(),
    }),
  );
  return roleId;
}

export async function updateCalendarRole(roleId: string, name: string) {
  await db.transact(db.tx.calendarRoles[roleId].update({ name }));
}

export async function deleteCalendarRole(roleId: string) {
  await db.transact(db.tx.calendarRoles[roleId].delete());
}

export async function addRoleMember(roleId: string, userId: string) {
  await db.transact(db.tx.calendarRoles[roleId].link({ members: userId }));
}

export async function removeRoleMember(roleId: string, userId: string) {
  await db.transact(db.tx.calendarRoles[roleId].unlink({ members: userId }));
}

export async function setRoleSections(roleId: string, sectionIds: string[]) {
  // Unlink all existing sections, then link the new ones
  const linkOps = sectionIds.map((sId) =>
    db.tx.calendarRoles[roleId].link({ sections: sId }),
  );
  await db.transact(linkOps);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/use-calendar-roles.ts
git commit -m "feat(calendar): add roles hook with user permission checking"
```

---

## Task 10: Seed Script — Default Sections & Rows

**Files:**
- Create: `apps/web/scripts/seed-calendar.ts`

- [ ] **Step 1: Create the seed script**

Create `apps/web/scripts/seed-calendar.ts`:

```typescript
/**
 * Seed the calendar with default sections and rows.
 * Run: npx tsx apps/web/scripts/seed-calendar.ts
 */
import { init, id } from "@instantdb/admin";
import schema from "../instant.schema";
import {
  CALENDAR_DEFAULT_SECTIONS,
  CALENDAR_DEFAULT_ROWS,
} from "@oaweekend/shared";

const INSTANT_APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const INSTANT_ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;

if (!INSTANT_APP_ID || !INSTANT_ADMIN_TOKEN) {
  console.error("Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in env");
  process.exit(1);
}

const adminDb = init({ appId: INSTANT_APP_ID, adminToken: INSTANT_ADMIN_TOKEN, schema });

async function seed() {
  console.log("Seeding calendar sections and rows...");

  for (const sectionDef of CALENDAR_DEFAULT_SECTIONS) {
    const sectionId = id();
    const txns: Parameters<typeof adminDb.transact>[0] = [
      adminDb.tx.calendarSections[sectionId].update({
        name: sectionDef.name,
        slug: sectionDef.slug,
        color: sectionDef.color,
        sortOrder: sectionDef.sortOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ];

    const rows = CALENDAR_DEFAULT_ROWS[sectionDef.slug] ?? [];
    for (const rowDef of rows) {
      const rowId = id();
      txns.push(
        adminDb.tx.calendarRows[rowId].update({
          name: rowDef.name,
          slug: rowDef.slug,
          fieldType: rowDef.fieldType,
          sortOrder: rowDef.sortOrder,
          campusSpecific: rowDef.campusSpecific,
          createdAt: Date.now(),
        }),
        adminDb.tx.calendarRows[rowId].link({ section: sectionId }),
      );
    }

    await adminDb.transact(txns);
    console.log(`  ✓ ${sectionDef.name} (${rows.length} rows)`);
  }

  // Seed a few weeks (next 8 Saturdays from today)
  console.log("\nSeeding 8 upcoming weeks...");
  const today = new Date();
  const day = today.getDay();
  const diffToSaturday = (6 - day + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + diffToSaturday);

  for (let i = 0; i < 8; i++) {
    const weekDate = new Date(nextSaturday);
    weekDate.setDate(nextSaturday.getDate() + i * 7);
    const weekStart = weekDate.toISOString().slice(0, 10);
    const weekId = id();
    await adminDb.transact(
      adminDb.tx.calendarWeeks[weekId].update({
        weekStart,
        label: "",
        createdAt: Date.now(),
      }),
    );
    console.log(`  ✓ Week: ${weekStart}`);
  }

  console.log("\n✅ Calendar seeded successfully!");
}

seed().catch(console.error);
```

- [ ] **Step 2: Run the seed script**

First, source the env vars:

```bash
cd apps/web && source .env.local && npx tsx scripts/seed-calendar.ts
```

Expected: Output showing all 6 sections with their rows created, plus 8 weeks seeded.

- [ ] **Step 3: Verify data in InstantDB**

```bash
cd apps/web && npx instant-cli query '{ calendarSections: { rows: {} } }' --admin
```

Expected: JSON showing 6 sections, each with their rows linked.

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/seed-calendar.ts
git commit -m "feat(calendar): add seed script for default sections, rows, and weeks"
```

---

## Task 11: Calendar Layout & Toolbar Component

**Files:**
- Create: `apps/web/app/calendar/layout.tsx`
- Create: `apps/web/components/calendar/calendar-toolbar.tsx`

- [ ] **Step 1: Create the calendar layout**

Create `apps/web/app/calendar/layout.tsx`:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategic Calendar — OA Weekend",
  description: "Plan weekend services across all campuses and channels",
};

export default function CalendarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create the toolbar component**

Create `apps/web/components/calendar/calendar-toolbar.tsx`:

```typescript
"use client";

import Link from "next/link";

interface CalendarToolbarProps {
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  campus: string;
  onCampusChange: (campus: string) => void;
  campuses: Array<{ id: string; name: string }>;
  onAddWeek?: () => void;
}

export function CalendarToolbar({
  rangeLabel,
  onPrev,
  onNext,
  campus,
  onCampusChange,
  campuses,
  onAddWeek,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-oa-stone-200 bg-oa-white sticky top-0 z-10">
      <h1 className="text-xl font-bold tracking-tight text-oa-black-900">
        Strategic Calendar
      </h1>

      <div className="flex-1" />

      {/* Date range navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Prev
        </button>
        <span className="text-sm font-semibold text-oa-black-900 min-w-[140px] text-center">
          {rangeLabel}
        </span>
        <button
          onClick={onNext}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          Next →
        </button>
      </div>

      {/* Campus filter */}
      <select
        value={campus}
        onChange={(e) => onCampusChange(e.target.value)}
        className="px-3 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm bg-oa-white text-oa-black-900 focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
      >
        <option value="">All Campuses</option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Actions */}
      {onAddWeek && (
        <button
          onClick={onAddWeek}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          + Add Week
        </button>
      )}

      <Link
        href="/calendar/settings"
        className="px-3 py-1.5 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
      >
        ⚙ Manage Sections
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/calendar/layout.tsx apps/web/components/calendar/calendar-toolbar.tsx
git commit -m "feat(calendar): add calendar layout and toolbar component"
```

---

## Task 12: Person Chip & Section Header Components

**Files:**
- Create: `apps/web/components/calendar/person-chip.tsx`
- Create: `apps/web/components/calendar/calendar-section-header.tsx`

- [ ] **Step 1: Create the person chip component**

Create `apps/web/components/calendar/person-chip.tsx`:

```typescript
"use client";

interface PersonChipProps {
  name: string;
  initials: string;
  size?: "sm" | "md";
}

export function PersonChip({ name, initials, size = "md" }: PersonChipProps) {
  const avatarSize = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  const chipPadding = size === "sm" ? "py-0.5 pl-0.5 pr-2 text-xs" : "py-1 pl-1 pr-3 text-[13px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-oa-sand-100/50 border border-oa-stone-200/50 font-medium ${chipPadding}`}
    >
      <span
        className={`${avatarSize} rounded-full bg-oa-yellow-500 flex items-center justify-center font-bold text-oa-black-900`}
      >
        {initials}
      </span>
      {name}
    </span>
  );
}
```

- [ ] **Step 2: Create the section header component**

Create `apps/web/components/calendar/calendar-section-header.tsx`:

```typescript
"use client";

import Link from "next/link";

interface CalendarSectionHeaderProps {
  name: string;
  slug: string;
  color: string;
  rowCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CalendarSectionHeader({
  name,
  slug,
  color,
  rowCount,
  isExpanded,
  onToggle,
}: CalendarSectionHeaderProps) {
  return (
    <div
      className="col-span-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-oa-sand-100/35 transition-colors duration-[220ms] border-b border-oa-stone-200"
      onClick={onToggle}
    >
      <div
        className="w-[3px] h-5 rounded-sm shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-oa-stone-300">
        {isExpanded ? "▾" : "▸"}
      </span>
      <Link
        href={`/calendar/section/${slug}`}
        onClick={(e) => e.stopPropagation()}
        className="text-[13px] font-bold tracking-tight text-oa-black-900 hover:underline"
      >
        {name}
      </Link>
      {!isExpanded && (
        <span className="text-[11px] text-oa-stone-300 font-normal">
          {rowCount} row{rowCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/person-chip.tsx apps/web/components/calendar/calendar-section-header.tsx
git commit -m "feat(calendar): add person chip and section header components"
```

---

## Task 13: Calendar Cell Component

**Files:**
- Create: `apps/web/components/calendar/calendar-cell.tsx`

- [ ] **Step 1: Create the cell renderer**

Create `apps/web/components/calendar/calendar-cell.tsx`:

```typescript
"use client";

import { PersonChip } from "./person-chip";
import type {
  TextContent,
  MultilineTextContent,
  PersonPickerContent,
  TagListContent,
  BooleanContent,
  CalendarFieldType,
} from "@oaweekend/shared";

interface CalendarCellProps {
  content: string; // JSON string
  fieldType: CalendarFieldType;
  status: string;
  isEditable: boolean;
  onClick: () => void;
  isLastRow?: boolean;
}

export function CalendarCell({
  content,
  fieldType,
  status,
  isEditable,
  onClick,
  isLastRow,
}: CalendarCellProps) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  const parsed = parseCellContent(content);

  return (
    <div
      onClick={isEditable ? onClick : undefined}
      className={`px-2.5 py-2 text-xs text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/20 flex items-center justify-center min-h-[40px] text-center transition-colors duration-[220ms] ${
        isEditable
          ? "cursor-pointer hover:bg-oa-sand-100/35"
          : ""
      }`}
    >
      {!parsed ? (
        <span className="text-oa-stone-300 text-base">—</span>
      ) : (
        <CellValueRenderer value={parsed} fieldType={fieldType} />
      )}
    </div>
  );
}

function CellValueRenderer({
  value,
  fieldType,
}: {
  value: unknown;
  fieldType: CalendarFieldType;
}) {
  switch (fieldType) {
    case "text": {
      const v = value as TextContent;
      return <span>{v.value}</span>;
    }
    case "multilineText": {
      const v = value as MultilineTextContent;
      return (
        <div className="flex flex-col items-center gap-0.5 leading-tight text-[11px]">
          {v.value.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    }
    case "personPicker": {
      const v = value as PersonPickerContent;
      return (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.people.map((p, i) => (
            <PersonChip key={i} name={p.name} initials={p.initials} size="sm" />
          ))}
        </div>
      );
    }
    case "tagList": {
      const v = value as TagListContent;
      return (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }
    case "boolean": {
      const v = value as BooleanContent;
      return (
        <span
          className={`inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-semibold ${
            v.value
              ? "bg-oa-green-bg text-oa-green"
              : "bg-oa-stone-100 text-oa-stone-300"
          }`}
        >
          {v.value ? "Yes" : "No"}
        </span>
      );
    }
    case "seriesPicker":
    case "campusPicker":
    case "richText":
    default: {
      // Fallback: render as text
      const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
      return <span className="text-[11px]">{raw}</span>;
    }
  }
}

function parseCellContent(content: string): unknown | null {
  if (!content || content === "" || content === "{}") return null;
  try {
    const parsed = JSON.parse(content);
    // Check if the parsed value is "empty"
    if (parsed.value === "" || parsed.value === undefined) {
      if (!parsed.people?.length && !parsed.tags?.length && !parsed.campuses?.length) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/calendar-cell.tsx
git commit -m "feat(calendar): add cell renderer with field-type dispatch"
```

---

## Task 14: Cell Editor Component

**Files:**
- Create: `apps/web/components/calendar/cell-editor.tsx`

- [ ] **Step 1: Create the inline cell editor**

Create `apps/web/components/calendar/cell-editor.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { upsertCalendarEntry } from "@/hooks/use-calendar-entry";
import type { CalendarFieldType, CalendarEntryStatus } from "@oaweekend/shared";

interface CellEditorProps {
  entryId?: string;
  weekId: string;
  rowId: string;
  rowName: string;
  fieldType: CalendarFieldType;
  currentContent: string;
  currentStatus: CalendarEntryStatus;
  userId?: string;
  onClose: () => void;
}

export function CellEditor({
  entryId,
  weekId,
  rowId,
  rowName,
  fieldType,
  currentContent,
  currentStatus,
  userId,
  onClose,
}: CellEditorProps) {
  const [content, setContent] = useState(currentContent || getDefaultContent(fieldType));
  const [status, setStatus] = useState<CalendarEntryStatus>(
    currentStatus === "empty" ? "draft" : currentStatus,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await upsertCalendarEntry({
        entryId,
        weekId,
        rowId,
        content,
        status,
        userId,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setIsSaving(false);
    }
  }, [entryId, weekId, rowId, content, status, userId, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-oa-black-900/20">
      <div className="bg-oa-white rounded-[--radius-card] border border-oa-stone-200 shadow-[--shadow-elevated] w-full max-w-md p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-oa-black-900">{rowName}</h3>
          <button
            onClick={onClose}
            className="text-oa-stone-300 hover:text-oa-black-700 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Editor by field type */}
        <div className="mb-4">
          <FieldEditor
            fieldType={fieldType}
            content={content}
            onChange={setContent}
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
            Status
          </span>
          <div className="flex gap-1">
            {(["draft", "confirmed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1 rounded-[10px] text-[10px] font-semibold transition-colors duration-[220ms] ${
                  status === s
                    ? s === "confirmed"
                      ? "bg-oa-green-bg text-oa-green"
                      : "bg-oa-sand-100 text-oa-black-700"
                    : "bg-oa-stone-100 text-oa-stone-300 hover:text-oa-black-700"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldEditor({
  fieldType,
  content,
  onChange,
}: {
  fieldType: CalendarFieldType;
  content: string;
  onChange: (c: string) => void;
}) {
  const parsed = safeJsonParse(content);

  switch (fieldType) {
    case "text": {
      const value = parsed?.value ?? "";
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(JSON.stringify({ value: e.target.value }))}
          autoFocus
          className="w-full px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
          placeholder="Enter text..."
        />
      );
    }
    case "multilineText": {
      const value = parsed?.value ?? "";
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(JSON.stringify({ value: e.target.value }))}
          autoFocus
          rows={4}
          className="w-full px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2 resize-y"
          placeholder="Enter content (use new lines for lists)..."
        />
      );
    }
    case "tagList": {
      const tags: string[] = parsed?.tags ?? [];
      const [newTag, setNewTag] = useState("");
      return (
        <div>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[11px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600"
              >
                {tag}
                <button
                  onClick={() => {
                    const updated = tags.filter((_, idx) => idx !== i);
                    onChange(JSON.stringify({ tags: updated }));
                  }}
                  className="text-oa-yellow-600/50 hover:text-oa-yellow-600 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTag.trim()) {
                  onChange(JSON.stringify({ tags: [...tags, newTag.trim()] }));
                  setNewTag("");
                }
              }}
              className="flex-1 px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
              placeholder="Add tag and press Enter..."
            />
          </div>
        </div>
      );
    }
    case "boolean": {
      const value = parsed?.value ?? false;
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(JSON.stringify({ value: e.target.checked }))}
            className="w-5 h-5 rounded accent-oa-yellow-500"
          />
          <span className="text-sm text-oa-black-900">
            {value ? "Yes" : "No"}
          </span>
        </label>
      );
    }
    case "personPicker": {
      // Simple name-based input for MVP
      const people: Array<{ name: string; initials: string; rockPersonId: string | null }> = parsed?.people ?? [];
      const [newName, setNewName] = useState("");
      return (
        <div>
          <div className="flex flex-wrap gap-1 mb-2">
            {people.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-oa-sand-100/50 border border-oa-stone-200/50 text-xs font-medium"
              >
                <span className="w-5 h-5 rounded-full bg-oa-yellow-500 flex items-center justify-center text-[9px] font-bold text-oa-black-900">
                  {p.initials}
                </span>
                {p.name}
                <button
                  onClick={() => {
                    const updated = people.filter((_, idx) => idx !== i);
                    onChange(JSON.stringify({ people: updated }));
                  }}
                  className="text-oa-stone-300 hover:text-oa-black-700 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  const name = newName.trim();
                  const parts = name.split(" ");
                  const initials =
                    parts.length >= 2
                      ? (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
                      : name.slice(0, 2).toUpperCase();
                  const updated = [...people, { name, initials, rockPersonId: null }];
                  onChange(JSON.stringify({ people: updated }));
                  setNewName("");
                }
              }}
              className="flex-1 px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
              placeholder="Type name and press Enter..."
            />
          </div>
        </div>
      );
    }
    default: {
      // Fallback: plain text editor for richText, seriesPicker, campusPicker
      const raw = typeof content === "string" ? content : JSON.stringify(content);
      return (
        <textarea
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          rows={4}
          className="w-full px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm font-mono focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2 resize-y"
          placeholder="Enter JSON content..."
        />
      );
    }
  }
}

function getDefaultContent(fieldType: CalendarFieldType): string {
  switch (fieldType) {
    case "text":
    case "multilineText":
      return JSON.stringify({ value: "" });
    case "personPicker":
      return JSON.stringify({ people: [] });
    case "tagList":
      return JSON.stringify({ tags: [] });
    case "boolean":
      return JSON.stringify({ value: false });
    case "campusPicker":
      return JSON.stringify({ campuses: [] });
    case "seriesPicker":
      return JSON.stringify({ seriesId: "", weekNumber: 0 });
    case "richText":
      return JSON.stringify({ html: "" });
    default:
      return "{}";
  }
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/cell-editor.tsx
git commit -m "feat(calendar): add cell editor with field-type-specific inputs"
```

---

## Task 15: Calendar Grid Component

**Files:**
- Create: `apps/web/components/calendar/calendar-grid.tsx`

- [ ] **Step 1: Create the main grid component**

Create `apps/web/components/calendar/calendar-grid.tsx`:

```typescript
"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type {
  CalendarSectionWithRows,
  CalendarWeekWithEntries,
  CalendarEntry,
  CalendarRow,
} from "@/lib/instant";
import { buildEntryMap } from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import { CalendarSectionHeader } from "./calendar-section-header";
import { CalendarCell } from "./calendar-cell";
import { CellEditor } from "./cell-editor";
import type { CalendarFieldType } from "@oaweekend/shared";

interface CalendarGridProps {
  sections: CalendarSectionWithRows[];
  weeks: CalendarWeekWithEntries[];
  campusFilter: string;
}

interface EditingCell {
  entryId?: string;
  weekId: string;
  rowId: string;
  rowName: string;
  fieldType: CalendarFieldType;
  currentContent: string;
  currentStatus: "empty" | "draft" | "confirmed";
}

export function CalendarGrid({
  sections,
  weeks,
  campusFilter,
}: CalendarGridProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const { editableSectionIds } = useUserEditableSections();

  const entryMap = useMemo(() => buildEntryMap(weeks), [weeks]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSectionEditable = useCallback(
    (sectionId: string) => {
      if (editableSectionIds === null) return true; // Admin
      return editableSectionIds.has(sectionId);
    },
    [editableSectionIds],
  );

  // Compute month spans for header
  const monthSpans = useMemo(() => {
    const spans: Array<{ label: string; count: number }> = [];
    let currentMonth = "";
    let count = 0;

    for (const week of weeks) {
      const date = new Date(week.weekStart + "T00:00:00");
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (monthLabel !== currentMonth) {
        if (currentMonth) spans.push({ label: currentMonth, count });
        currentMonth = monthLabel;
        count = 1;
      } else {
        count++;
      }
    }
    if (currentMonth) spans.push({ label: currentMonth, count });
    return spans;
  }, [weeks]);

  const columnCount = weeks.length + 1; // +1 for label column
  const gridCols = `180px repeat(${weeks.length}, minmax(140px, 1fr))`;

  return (
    <>
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: gridCols,
            minWidth: `${180 + weeks.length * 140}px`,
          }}
        >
          {/* Month header row */}
          <div className="bg-oa-white border-b border-oa-stone-200" />
          {monthSpans.map((span, i) => (
            <div
              key={i}
              className="bg-oa-sand-100/35 border-b border-oa-stone-200 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-oa-black-700"
              style={{ gridColumn: `span ${span.count}` }}
            >
              {span.label}
            </div>
          ))}

          {/* Week header row */}
          <div className="bg-oa-white border-b-2 border-oa-stone-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-oa-stone-300">
            Date
          </div>
          {weeks.map((week) => {
            const sat = new Date(week.weekStart + "T00:00:00");
            const sun = new Date(sat);
            sun.setDate(sat.getDate() + 1);
            const satDay = sat.getDate();
            const sunDay = sun.getDate();

            return (
              <Link
                key={week.id}
                href={`/calendar/week/${week.weekStart}`}
                className="bg-oa-white border-b-2 border-oa-stone-200 px-2 py-2.5 text-center hover:bg-oa-sand-100/35 transition-colors duration-[220ms]"
              >
                <div className="text-[13px] font-semibold text-oa-black-900">
                  {satDay} &amp; {sunDay}
                </div>
                {week.label && (
                  <div className="mt-1 inline-block rounded-[10px] bg-oa-yellow-500/12 px-2 py-0.5 text-[10px] font-semibold text-oa-yellow-600">
                    {week.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Section rows */}
          {sections.map((section) => {
            const isExpanded = !collapsedSections.has(section.id);
            const visibleRows = campusFilter
              ? section.rows.filter(
                  (r) => !r.campusSpecific || r.campusSpecific,
                )
              : section.rows;
            const editable = isSectionEditable(section.id);

            return (
              <SectionBlock
                key={section.id}
                section={section}
                rows={visibleRows as CalendarRow[]}
                weeks={weeks}
                entryMap={entryMap}
                isExpanded={isExpanded}
                onToggle={() => toggleSection(section.id)}
                isEditable={editable}
                onCellClick={(cell) => setEditingCell(cell)}
              />
            );
          })}
        </div>
      </div>

      {/* Cell editor modal */}
      {editingCell && (
        <CellEditor
          entryId={editingCell.entryId}
          weekId={editingCell.weekId}
          rowId={editingCell.rowId}
          rowName={editingCell.rowName}
          fieldType={editingCell.fieldType}
          currentContent={editingCell.currentContent}
          currentStatus={editingCell.currentStatus}
          onClose={() => setEditingCell(null)}
        />
      )}
    </>
  );
}

function SectionBlock({
  section,
  rows,
  weeks,
  entryMap,
  isExpanded,
  onToggle,
  isEditable,
  onCellClick,
}: {
  section: CalendarSectionWithRows;
  rows: CalendarRow[];
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isExpanded: boolean;
  onToggle: () => void;
  isEditable: boolean;
  onCellClick: (cell: EditingCell) => void;
}) {
  return (
    <>
      <CalendarSectionHeader
        name={section.name}
        slug={section.slug}
        color={section.color}
        rowCount={rows.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />

      {isExpanded &&
        rows.map((row, rowIdx) => {
          const isLastRow = rowIdx === rows.length - 1;

          return (
            <RowBlock
              key={row.id}
              row={row}
              weeks={weeks}
              entryMap={entryMap}
              isLastRow={isLastRow}
              isEditable={isEditable}
              onCellClick={onCellClick}
            />
          );
        })}
    </>
  );
}

function RowBlock({
  row,
  weeks,
  entryMap,
  isLastRow,
  isEditable,
  onCellClick,
}: {
  row: CalendarRow;
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isLastRow: boolean;
  isEditable: boolean;
  onCellClick: (cell: EditingCell) => void;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  return (
    <>
      {/* Row label */}
      <div
        className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center`}
      >
        {row.name}
      </div>

      {/* Cells */}
      {weeks.map((week) => {
        const entry = entryMap.get(`${week.id}:${row.id}`);

        return (
          <CalendarCell
            key={`${week.id}:${row.id}`}
            content={entry?.content ?? ""}
            fieldType={row.fieldType as CalendarFieldType}
            status={entry?.status ?? "empty"}
            isEditable={isEditable}
            isLastRow={isLastRow}
            onClick={() =>
              onCellClick({
                entryId: entry?.id,
                weekId: week.id,
                rowId: row.id,
                rowName: row.name,
                fieldType: row.fieldType as CalendarFieldType,
                currentContent: entry?.content ?? "",
                currentStatus: (entry?.status as "empty" | "draft" | "confirmed") ?? "empty",
              })
            }
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/calendar-grid.tsx
git commit -m "feat(calendar): add main calendar grid with sections, rows, and cell editing"
```

---

## Task 16: Main Calendar Page

**Files:**
- Create: `apps/web/app/calendar/page.tsx`

- [ ] **Step 1: Create the main calendar page**

Create `apps/web/app/calendar/page.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import db from "@/lib/instant";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import {
  useCalendarSections,
  useCalendarWeeks,
  useDateRange,
} from "@/hooks/use-calendar";
import { useRockCampuses } from "@/hooks/use-rock-data";
import { createCalendarWeek } from "@/hooks/use-calendar-settings";

export default function CalendarPage() {
  const { user } = db.useAuth();
  const [pageOffset, setPageOffset] = useState(0);
  const [campus, setCampus] = useState("");
  const { rangeStart, rangeEnd } = useDateRange(pageOffset);

  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { weeks, isLoading: weeksLoading } = useCalendarWeeks(
    rangeStart,
    rangeEnd,
  );
  const { campuses } = useRockCampuses();

  const isLoading = sectionsLoading || weeksLoading;

  // Build range label
  const rangeLabel = (() => {
    if (weeks.length === 0) return "No weeks";
    const first = new Date(weeks[0]!.weekStart + "T00:00:00");
    const last = new Date(weeks[weeks.length - 1]!.weekStart + "T00:00:00");
    const fmtOpts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    const startLabel = first.toLocaleDateString("en-US", fmtOpts);
    const endLabel = last.toLocaleDateString("en-US", fmtOpts);
    return startLabel === endLabel ? startLabel : `${startLabel} — ${endLabel}`;
  })();

  const handleAddWeek = useCallback(async () => {
    // Add the next Saturday after the last week
    if (weeks.length === 0) return;
    const lastWeek = weeks[weeks.length - 1]!;
    const lastDate = new Date(lastWeek.weekStart + "T00:00:00");
    lastDate.setDate(lastDate.getDate() + 7);
    const nextWeekStart = lastDate.toISOString().slice(0, 10);
    await createCalendarWeek({ weekStart: nextWeekStart });
  }, [weeks]);

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Please sign in to view the calendar.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-oa-white">
      <CalendarToolbar
        rangeLabel={rangeLabel}
        onPrev={() => setPageOffset((p) => p - 1)}
        onNext={() => setPageOffset((p) => p + 1)}
        campus={campus}
        onCampusChange={setCampus}
        campuses={campuses}
        onAddWeek={handleAddWeek}
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-sm text-oa-stone-300">Loading calendar...</p>
        </div>
      ) : weeks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center space-y-2">
            <p className="text-sm text-oa-stone-300 italic">
              No weeks in this range
            </p>
            <button
              onClick={handleAddWeek}
              className="px-4 py-2 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
            >
              + Add First Week
            </button>
          </div>
        </div>
      ) : (
        <CalendarGrid
          sections={sections}
          weeks={weeks}
          campusFilter={campus}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Check if useRockCampuses exists**

The page imports `useRockCampuses` from `@/hooks/use-rock-data`. Verify this hook exists and returns `{ campuses }`. If it doesn't exist or has a different name, check `apps/web/hooks/use-rock-data.ts` and adapt the import.

```bash
cd apps/web && grep -n "export.*function.*[Cc]ampus" hooks/use-rock-data.ts
```

Adapt the import if the function name differs.

- [ ] **Step 3: Verify the page compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/calendar/page.tsx
git commit -m "feat(calendar): add main calendar page with grid, toolbar, and data loading"
```

---

## Task 17: Week Detail Page

**Files:**
- Create: `apps/web/components/calendar/week-detail-section.tsx`
- Create: `apps/web/app/calendar/week/[weekStart]/page.tsx`

- [ ] **Step 1: Create the week detail section card component**

Create `apps/web/components/calendar/week-detail-section.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { CalendarSectionWithRows, CalendarEntry, CalendarRow } from "@/lib/instant";
import { CellEditor } from "./cell-editor";
import { PersonChip } from "./person-chip";
import type { CalendarFieldType, PersonPickerContent, TagListContent, MultilineTextContent, TextContent } from "@oaweekend/shared";

interface WeekDetailSectionProps {
  section: CalendarSectionWithRows;
  entries: Map<string, CalendarEntry>; // rowId → entry
  weekId: string;
  isEditable: boolean;
}

export function WeekDetailSection({
  section,
  entries,
  weekId,
  isEditable,
}: WeekDetailSectionProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const editingRow = editingRowId
    ? section.rows.find((r) => r.id === editingRowId)
    : null;
  const editingEntry = editingRowId ? entries.get(editingRowId) : null;

  return (
    <>
      <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-oa-stone-200/50">
          <div
            className="w-[3px] h-[18px] rounded-sm shrink-0"
            style={{ backgroundColor: section.color }}
          />
          <span className="text-sm font-bold text-oa-black-900">
            {section.name}
          </span>
        </div>

        {/* Field rows */}
        {section.rows.map((row) => {
          const entry = entries.get(row.id);
          const content = entry?.content ?? "";

          return (
            <div
              key={row.id}
              className="flex items-start px-5 py-3 border-b border-oa-stone-200/30 last:border-b-0 group hover:bg-oa-sand-100/35 transition-colors duration-[220ms]"
            >
              <div className="w-[160px] shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider text-oa-black-700">
                {row.name}
              </div>
              <div className="flex-1 text-sm text-oa-black-900">
                <FieldValueDisplay
                  content={content}
                  fieldType={row.fieldType as CalendarFieldType}
                />
              </div>
              {isEditable && (
                <button
                  onClick={() => setEditingRowId(row.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms] text-oa-stone-300 hover:text-oa-black-700 text-sm ml-2 shrink-0"
                >
                  ✎
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editingRow && (
        <CellEditor
          entryId={editingEntry?.id}
          weekId={weekId}
          rowId={editingRow.id}
          rowName={editingRow.name}
          fieldType={editingRow.fieldType as CalendarFieldType}
          currentContent={editingEntry?.content ?? ""}
          currentStatus={(editingEntry?.status as "empty" | "draft" | "confirmed") ?? "empty"}
          onClose={() => setEditingRowId(null)}
        />
      )}
    </>
  );
}

function FieldValueDisplay({
  content,
  fieldType,
}: {
  content: string;
  fieldType: CalendarFieldType;
}) {
  if (!content || content === "" || content === "{}") {
    return (
      <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return <span className="text-[13px]">{content}</span>;
  }

  switch (fieldType) {
    case "text": {
      const v = parsed as unknown as TextContent;
      if (!v.value) return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      return <span className="text-[14px]">{v.value}</span>;
    }
    case "multilineText": {
      const v = parsed as unknown as MultilineTextContent;
      if (!v.value) return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      return (
        <div className="text-[14px] leading-relaxed">
          {v.value.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    }
    case "personPicker": {
      const v = parsed as unknown as PersonPickerContent;
      if (!v.people?.length) return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {v.people.map((p, i) => (
            <PersonChip key={i} name={p.name} initials={p.initials} />
          ))}
        </div>
      );
    }
    case "tagList": {
      const v = parsed as unknown as TagListContent;
      if (!v.tags?.length) return <span className="text-oa-stone-300 italic text-[13px]">None</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {v.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex px-2.5 py-0.5 rounded-[10px] text-[11px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }
    default: {
      return <span className="text-[13px]">{JSON.stringify(parsed)}</span>;
    }
  }
}
```

- [ ] **Step 2: Create the week detail page**

Create `apps/web/app/calendar/week/[weekStart]/page.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCalendarWeek, useCalendarSections } from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import { WeekDetailSection } from "@/components/calendar/week-detail-section";
import type { CalendarEntry } from "@/lib/instant";

export default function WeekDetailPage() {
  const params = useParams<{ weekStart: string }>();
  const weekStart = params.weekStart;

  const { week, isLoading: weekLoading } = useCalendarWeek(weekStart);
  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { editableSectionIds } = useUserEditableSections();

  const isLoading = weekLoading || sectionsLoading;

  // Build per-section entry maps: sectionId → (rowId → entry)
  const sectionEntryMaps = useMemo(() => {
    const maps = new Map<string, Map<string, CalendarEntry>>();
    if (!week) return maps;

    for (const entry of week.entries ?? []) {
      const row = (entry as CalendarEntry & { row?: { id: string } }).row;
      if (row) {
        // Find which section this row belongs to
        for (const section of sections) {
          if (section.rows.some((r) => r.id === row.id)) {
            if (!maps.has(section.id)) maps.set(section.id, new Map());
            maps.get(section.id)!.set(row.id, entry);
            break;
          }
        }
      }
    }
    return maps;
  }, [week, sections]);

  // Format header
  const weekDate = weekStart
    ? (() => {
        const sat = new Date(weekStart + "T00:00:00");
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        return `${sat.toLocaleDateString("en-US", { month: "long", day: "numeric" })} & ${sun.getDate()}, ${sat.getFullYear()}`;
      })()
    : "";

  // Prev/next week
  const prevWeek = weekStart
    ? (() => {
        const d = new Date(weekStart + "T00:00:00");
        d.setDate(d.getDate() - 7);
        return d.toISOString().slice(0, 10);
      })()
    : null;
  const nextWeek = weekStart
    ? (() => {
        const d = new Date(weekStart + "T00:00:00");
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  // Series info from the week's linked series
  const seriesInfo = week?.series?.[0] ?? null;

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#faf9f7]">
        <p className="text-sm text-oa-stone-300">Loading week...</p>
      </main>
    );
  }

  if (!week) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#faf9f7] gap-3">
        <p className="text-sm text-oa-stone-300">Week not found</p>
        <Link
          href="/calendar"
          className="text-sm text-oa-yellow-600 hover:underline"
        >
          ← Back to calendar
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-oa-white border-b border-oa-stone-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Calendar
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-oa-black-900">
            {weekDate}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {seriesInfo && (
              <Link
                href={`/calendar/series/${seriesInfo.id}`}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-oa-yellow-600 hover:underline"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: (seriesInfo as { color?: string }).color ?? "#FFC905" }}
                />
                {(seriesInfo as { name?: string }).name}
              </Link>
            )}
            {week.label && (
              <span className="inline-flex px-2.5 py-0.5 rounded-[12px] text-[11px] font-semibold bg-oa-yellow-500/12 text-oa-yellow-600">
                {week.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {prevWeek && (
            <Link
              href={`/calendar/week/${prevWeek}`}
              className="w-9 h-9 rounded-[--radius-button] border border-oa-stone-200 flex items-center justify-center text-sm text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
            >
              ←
            </Link>
          )}
          {nextWeek && (
            <Link
              href={`/calendar/week/${nextWeek}`}
              className="w-9 h-9 rounded-[--radius-button] border border-oa-stone-200 flex items-center justify-center text-sm text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
            >
              →
            </Link>
          )}
        </div>
      </div>

      {/* Section cards */}
      <div className="max-w-[960px] mx-auto w-full px-8 py-6 space-y-4">
        {sections.map((section) => {
          const entryMap = sectionEntryMaps.get(section.id) ?? new Map();
          const isEditable =
            editableSectionIds === null || editableSectionIds.has(section.id);

          return (
            <WeekDetailSection
              key={section.id}
              section={section}
              entries={entryMap}
              weekId={week.id}
              isEditable={isEditable}
            />
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/week-detail-section.tsx apps/web/app/calendar/week/\[weekStart\]/page.tsx
git commit -m "feat(calendar): add week detail view with section cards and inline editing"
```

---

## Task 18: Series Detail Page

**Files:**
- Create: `apps/web/components/calendar/series-timeline.tsx`
- Create: `apps/web/app/calendar/series/[seriesId]/page.tsx`

- [ ] **Step 1: Create the series timeline component**

Create `apps/web/components/calendar/series-timeline.tsx`:

```typescript
"use client";

import Link from "next/link";

interface SeriesWeek {
  id: string;
  weekStart: string;
  label?: string;
}

interface SeriesTimelineProps {
  weeks: SeriesWeek[];
  seriesName: string;
}

export function SeriesTimeline({ weeks, seriesName }: SeriesTimelineProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-oa-stone-200/50">
        <span className="text-sm font-bold text-oa-black-900">
          Weeks in Series
        </span>
        <span className="text-xs text-oa-stone-300">
          {weeks.length} week{weeks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {weeks.map((week, i) => {
        const isCurrent =
          week.weekStart <= today &&
          (i === weeks.length - 1 || weeks[i + 1]!.weekStart > today);

        const sat = new Date(week.weekStart + "T00:00:00");
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        const dateLabel = `${sat.toLocaleDateString("en-US", { month: "short", day: "numeric" })} & ${sun.getDate()}`;

        return (
          <Link
            key={week.id}
            href={`/calendar/week/${week.weekStart}`}
            className={`flex items-center gap-3 px-5 py-3.5 border-b border-oa-stone-200/30 last:border-b-0 hover:bg-oa-sand-100/35 transition-colors duration-[220ms] ${
              isCurrent ? "bg-oa-yellow-500/4" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                isCurrent
                  ? "bg-oa-yellow-500 text-oa-black-900"
                  : "bg-oa-yellow-500/8 text-oa-yellow-600"
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-oa-black-900">
                {dateLabel}
              </div>
              {week.label && (
                <div className="mt-0.5 inline-block rounded-[10px] bg-oa-yellow-500/12 px-2 py-0.5 text-[10px] font-semibold text-oa-yellow-600">
                  {week.label}
                </div>
              )}
            </div>
            {isCurrent && (
              <span className="px-2.5 py-0.5 rounded-[10px] text-[10px] font-semibold bg-oa-yellow-500 text-oa-black-900">
                This Week
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create the series detail page**

Create `apps/web/app/calendar/series/[seriesId]/page.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCalendarSeriesById } from "@/hooks/use-calendar-series";
import { SeriesTimeline } from "@/components/calendar/series-timeline";

export default function SeriesDetailPage() {
  const params = useParams<{ seriesId: string }>();
  const { series, isLoading } = useCalendarSeriesById(params.seriesId);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#faf9f7]">
        <p className="text-sm text-oa-stone-300">Loading series...</p>
      </main>
    );
  }

  if (!series) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#faf9f7] gap-3">
        <p className="text-sm text-oa-stone-300">Series not found</p>
        <Link
          href="/calendar"
          className="text-sm text-oa-yellow-600 hover:underline"
        >
          ← Back to calendar
        </Link>
      </main>
    );
  }

  const typedSeries = series as {
    id: string;
    name: string;
    description?: string;
    color: string;
    startWeek: string;
    endWeek: string;
    weeks: Array<{ id: string; weekStart: string; label?: string }>;
  };

  const weekCount = typedSeries.weeks?.length ?? 0;
  const startDate = typedSeries.startWeek
    ? new Date(typedSeries.startWeek + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const endDate = typedSeries.endWeek
    ? new Date(typedSeries.endWeek + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <main className="flex flex-col flex-1 bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-oa-white border-b border-oa-stone-200 px-8 py-6 flex items-start gap-5">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms] mt-1"
        >
          ← Calendar
        </Link>
        <div
          className="w-1 min-h-[70px] rounded-sm shrink-0"
          style={{ backgroundColor: typedSeries.color }}
        />
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-yellow-600 mb-1">
            Sermon Series
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-oa-black-900">
            {typedSeries.name}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-[13px] text-oa-black-700">
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: typedSeries.color }}
              />
              {weekCount} week{weekCount !== 1 ? "s" : ""}
            </span>
            <span>
              {startDate} — {endDate}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto w-full px-8 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-stone-300 mb-1.5">
              Duration
            </div>
            <div className="text-xl font-bold text-oa-black-900">
              {weekCount} weeks
            </div>
            <div className="text-xs text-oa-black-700 mt-0.5">
              {startDate} — {endDate}
            </div>
          </div>
          <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-stone-300 mb-1.5">
              Description
            </div>
            <div className="text-sm text-oa-black-900">
              {typedSeries.description || (
                <span className="text-oa-stone-300 italic">No description</span>
              )}
            </div>
          </div>
          <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-stone-300 mb-1.5">
              Color
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: typedSeries.color }}
              />
              <span className="text-sm font-mono text-oa-black-700">
                {typedSeries.color}
              </span>
            </div>
          </div>
        </div>

        {/* Week timeline */}
        <SeriesTimeline
          weeks={typedSeries.weeks ?? []}
          seriesName={typedSeries.name}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/series-timeline.tsx apps/web/app/calendar/series/\[seriesId\]/page.tsx
git commit -m "feat(calendar): add series detail page with timeline and summary cards"
```

---

## Task 19: Section Detail Page

**Files:**
- Create: `apps/web/app/calendar/section/[sectionSlug]/page.tsx`

- [ ] **Step 1: Create the section detail page**

Create `apps/web/app/calendar/section/[sectionSlug]/page.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import db from "@/lib/instant";
import {
  useCalendarSections,
  useCalendarWeeks,
  useDateRange,
  buildEntryMap,
} from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import { CalendarCell } from "@/components/calendar/calendar-cell";
import { CellEditor } from "@/components/calendar/cell-editor";
import type { CalendarFieldType } from "@oaweekend/shared";
import type { CalendarEntry } from "@/lib/instant";

export default function SectionDetailPage() {
  const params = useParams<{ sectionSlug: string }>();
  const [pageOffset, setPageOffset] = useState(0);
  const { rangeStart, rangeEnd } = useDateRange(pageOffset);

  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { weeks, isLoading: weeksLoading } = useCalendarWeeks(rangeStart, rangeEnd);
  const { editableSectionIds } = useUserEditableSections();

  const section = sections.find((s) => s.slug === params.sectionSlug);
  const isLoading = sectionsLoading || weeksLoading;

  const entryMap = useMemo(() => buildEntryMap(weeks), [weeks]);

  const isEditable =
    section &&
    (editableSectionIds === null || editableSectionIds.has(section.id));

  const [editingCell, setEditingCell] = useState<{
    entryId?: string;
    weekId: string;
    rowId: string;
    rowName: string;
    fieldType: CalendarFieldType;
    currentContent: string;
    currentStatus: "empty" | "draft" | "confirmed";
  } | null>(null);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#faf9f7]">
        <p className="text-sm text-oa-stone-300">Loading...</p>
      </main>
    );
  }

  if (!section) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#faf9f7] gap-3">
        <p className="text-sm text-oa-stone-300">Section not found</p>
        <Link href="/calendar" className="text-sm text-oa-yellow-600 hover:underline">
          ← Back to calendar
        </Link>
      </main>
    );
  }

  const gridCols = `180px repeat(${weeks.length}, minmax(140px, 1fr))`;

  return (
    <main className="flex flex-col flex-1 bg-oa-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-oa-stone-200 bg-oa-white sticky top-0 z-10">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Calendar
        </Link>
        <div
          className="w-[3px] h-5 rounded-sm"
          style={{ backgroundColor: section.color }}
        />
        <h1 className="text-xl font-bold tracking-tight text-oa-black-900">
          {section.name}
        </h1>
        <span className="text-xs text-oa-stone-300">
          {section.rows.length} row{section.rows.length !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageOffset((p) => p - 1)}
            className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
          >
            ← Prev
          </button>
          <button
            onClick={() => setPageOffset((p) => p + 1)}
            className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: gridCols,
            minWidth: `${180 + weeks.length * 140}px`,
          }}
        >
          {/* Week headers */}
          <div className="bg-oa-white border-b-2 border-oa-stone-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-oa-stone-300">
            Date
          </div>
          {weeks.map((week) => {
            const sat = new Date(week.weekStart + "T00:00:00");
            const sun = new Date(sat);
            sun.setDate(sat.getDate() + 1);
            return (
              <Link
                key={week.id}
                href={`/calendar/week/${week.weekStart}`}
                className="bg-oa-white border-b-2 border-oa-stone-200 px-2 py-2.5 text-center hover:bg-oa-sand-100/35 transition-colors duration-[220ms]"
              >
                <div className="text-[13px] font-semibold text-oa-black-900">
                  {sat.getDate()} &amp; {sun.getDate()}
                </div>
                {week.label && (
                  <div className="mt-1 inline-block rounded-[10px] bg-oa-yellow-500/12 px-2 py-0.5 text-[10px] font-semibold text-oa-yellow-600">
                    {week.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Rows */}
          {section.rows.map((row, rowIdx) => {
            const isLastRow = rowIdx === section.rows.length - 1;
            const borderClass = isLastRow
              ? "border-b-2 border-b-oa-stone-200"
              : "border-b border-b-oa-stone-200/50";

            return (
              <>
                <div
                  key={`label-${row.id}`}
                  className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center min-h-[60px]`}
                >
                  {row.name}
                </div>
                {weeks.map((week) => {
                  const entry = entryMap.get(`${week.id}:${row.id}`);
                  return (
                    <div key={`${week.id}:${row.id}`} className="min-h-[60px]">
                      <CalendarCell
                        content={entry?.content ?? ""}
                        fieldType={row.fieldType as CalendarFieldType}
                        status={entry?.status ?? "empty"}
                        isEditable={!!isEditable}
                        isLastRow={isLastRow}
                        onClick={() =>
                          setEditingCell({
                            entryId: entry?.id,
                            weekId: week.id,
                            rowId: row.id,
                            rowName: row.name,
                            fieldType: row.fieldType as CalendarFieldType,
                            currentContent: entry?.content ?? "",
                            currentStatus:
                              (entry?.status as "empty" | "draft" | "confirmed") ?? "empty",
                          })
                        }
                      />
                    </div>
                  );
                })}
              </>
            );
          })}
        </div>
      </div>

      {editingCell && (
        <CellEditor
          entryId={editingCell.entryId}
          weekId={editingCell.weekId}
          rowId={editingCell.rowId}
          rowName={editingCell.rowName}
          fieldType={editingCell.fieldType}
          currentContent={editingCell.currentContent}
          currentStatus={editingCell.currentStatus}
          onClose={() => setEditingCell(null)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/calendar/section/\[sectionSlug\]/page.tsx
git commit -m "feat(calendar): add section detail page with focused grid view"
```

---

## Task 20: Settings Page

**Files:**
- Create: `apps/web/components/calendar/calendar-settings-panel.tsx`
- Create: `apps/web/app/calendar/settings/page.tsx`

- [ ] **Step 1: Create the settings panel component**

Create `apps/web/components/calendar/calendar-settings-panel.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useCalendarSections } from "@/hooks/use-calendar";
import {
  createCalendarSection,
  updateCalendarSection,
  deleteCalendarSection,
  createCalendarRow,
  updateCalendarRow,
  deleteCalendarRow,
} from "@/hooks/use-calendar-settings";
import { CALENDAR_FIELD_TYPE_OPTIONS } from "@oaweekend/shared";
import type { CalendarSectionWithRows } from "@/lib/instant";

export function CalendarSettingsPanel() {
  const { sections, isLoading } = useCalendarSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [addingSectionName, setAddingSectionName] = useState("");

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-oa-stone-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sections list */}
      <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-oa-stone-200/50">
          <h2 className="text-sm font-bold text-oa-black-900">Sections</h2>
        </div>

        <div className="divide-y divide-oa-stone-200/30">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => setSelectedSectionId(section.id)}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors duration-[220ms] ${
                selectedSectionId === section.id
                  ? "bg-oa-yellow-500/8"
                  : "hover:bg-oa-sand-100/35"
              }`}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: section.color }}
              />
              <span className="flex-1 text-sm font-medium text-oa-black-900">
                {section.name}
              </span>
              <span className="text-xs text-oa-stone-300">
                {section.rows.length} rows
              </span>
            </div>
          ))}
        </div>

        {/* Add section */}
        <div className="px-5 py-3 border-t border-oa-stone-200/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={addingSectionName}
              onChange={(e) => setAddingSectionName(e.target.value)}
              placeholder="New section name..."
              className="flex-1 px-3 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
            />
            <button
              onClick={async () => {
                if (!addingSectionName.trim()) return;
                const slug = addingSectionName
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-");
                await createCalendarSection({
                  name: addingSectionName.trim(),
                  slug,
                  color: "#272728",
                  sortOrder: sections.length,
                });
                setAddingSectionName("");
              }}
              className="px-3 py-1.5 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Selected section detail */}
      {selectedSection ? (
        <SectionDetail section={selectedSection} />
      ) : (
        <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] flex items-center justify-center p-12">
          <p className="text-sm text-oa-stone-300 italic">
            Select a section to manage its rows
          </p>
        </div>
      )}
    </div>
  );
}

function SectionDetail({ section }: { section: CalendarSectionWithRows }) {
  const [addingRowName, setAddingRowName] = useState("");
  const [addingRowFieldType, setAddingRowFieldType] = useState("text");

  return (
    <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-oa-stone-200/50 flex items-center gap-2.5">
        <div
          className="w-3 h-3 rounded-sm shrink-0"
          style={{ backgroundColor: section.color }}
        />
        <h2 className="text-sm font-bold text-oa-black-900">{section.name}</h2>
        <div className="flex-1" />
        <button
          onClick={async () => {
            if (confirm(`Delete section "${section.name}" and all its rows?`)) {
              await deleteCalendarSection(section.id);
            }
          }}
          className="text-xs text-oa-coral hover:text-red-600 transition-colors"
        >
          Delete Section
        </button>
      </div>

      {/* Rows */}
      <div className="divide-y divide-oa-stone-200/30">
        {section.rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-3 px-5 py-2.5 group"
          >
            <span className="flex-1 text-sm text-oa-black-900">{row.name}</span>
            <span className="text-xs text-oa-stone-300 bg-oa-stone-100 px-2 py-0.5 rounded">
              {row.fieldType}
            </span>
            {row.campusSpecific && (
              <span className="text-[10px] text-oa-blue font-semibold">
                Campus
              </span>
            )}
            <button
              onClick={async () => {
                if (confirm(`Delete row "${row.name}"?`)) {
                  await deleteCalendarRow(row.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-xs text-oa-coral hover:text-red-600 transition-all"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className="px-5 py-3 border-t border-oa-stone-200/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={addingRowName}
            onChange={(e) => setAddingRowName(e.target.value)}
            placeholder="New row name..."
            className="flex-1 px-3 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
          />
          <select
            value={addingRowFieldType}
            onChange={(e) => setAddingRowFieldType(e.target.value)}
            className="px-2 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm bg-oa-white"
          >
            {CALENDAR_FIELD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (!addingRowName.trim()) return;
              const slug = addingRowName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
              await createCalendarRow({
                sectionId: section.id,
                name: addingRowName.trim(),
                slug,
                fieldType: addingRowFieldType,
                sortOrder: section.rows.length,
                campusSpecific: false,
              });
              setAddingRowName("");
            }}
            className="px-3 py-1.5 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the settings page**

Create `apps/web/app/calendar/settings/page.tsx`:

```typescript
"use client";

import Link from "next/link";
import db from "@/lib/instant";
import { CalendarSettingsPanel } from "@/components/calendar/calendar-settings-panel";

export default function CalendarSettingsPage() {
  const { user } = db.useAuth();

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Please sign in.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-oa-white border-b border-oa-stone-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Calendar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-oa-black-900">
          Calendar Settings
        </h1>
      </div>

      <div className="max-w-[1100px] mx-auto w-full px-8 py-6">
        <CalendarSettingsPanel />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/calendar-settings-panel.tsx apps/web/app/calendar/settings/page.tsx
git commit -m "feat(calendar): add settings page with section and row management"
```

---

## Task 21: Navigation Link & Final Verification

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Add a link to the calendar from the home page**

Read `apps/web/app/page.tsx` and add a link to `/calendar` in the navigation. Add a link element similar to existing ones:

```typescript
<Link
  href="/calendar"
  className="flex items-center gap-4 rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-4 hover:border-oa-stone-300 hover:shadow-[--shadow-elevated] transition-all duration-150 shadow-[--shadow-card]"
>
  <div className="flex-1">
    <p className="text-sm font-semibold">Strategic Calendar</p>
    <p className="text-xs text-oa-black-700 mt-0.5">
      Plan weekend services across all campuses
    </p>
  </div>
</Link>
```

- [ ] **Step 2: Run full TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors. If there are errors, fix them before proceeding.

- [ ] **Step 3: Run the dev server and verify**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/calendar` and verify:
1. The toolbar renders with date navigation and campus filter
2. Section headers render with collapse/expand
3. Week columns render with dates
4. Clicking a cell opens the editor modal
5. Clicking a week header navigates to `/calendar/week/[weekStart]`
6. Clicking "Manage Sections" navigates to `/calendar/settings`

- [ ] **Step 4: Commit all remaining changes**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(calendar): add calendar link to home page"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Schema — entities & links | `instant.schema.ts` |
| 2 | Permissions | `instant.perms.ts` |
| 3 | Shared types & constants | `packages/shared/src/types.ts`, `constants.ts` |
| 4 | Type exports & CSS | `lib/instant.ts`, `globals.css` |
| 5 | Core query hooks | `hooks/use-calendar.ts` |
| 6 | Entry CRUD | `hooks/use-calendar-entry.ts` |
| 7 | Series hooks | `hooks/use-calendar-series.ts` |
| 8 | Settings hooks | `hooks/use-calendar-settings.ts` |
| 9 | Roles hooks | `hooks/use-calendar-roles.ts` |
| 10 | Seed script | `scripts/seed-calendar.ts` |
| 11 | Layout & toolbar | `calendar/layout.tsx`, `calendar-toolbar.tsx` |
| 12 | Person chip & section header | `person-chip.tsx`, `calendar-section-header.tsx` |
| 13 | Cell renderer | `calendar-cell.tsx` |
| 14 | Cell editor | `cell-editor.tsx` |
| 15 | Main grid | `calendar-grid.tsx` |
| 16 | Calendar page | `calendar/page.tsx` |
| 17 | Week detail | `week-detail-section.tsx`, `week/[weekStart]/page.tsx` |
| 18 | Series detail | `series-timeline.tsx`, `series/[seriesId]/page.tsx` |
| 19 | Section detail | `section/[sectionSlug]/page.tsx` |
| 20 | Settings page | `calendar-settings-panel.tsx`, `settings/page.tsx` |
| 21 | Nav link & verification | `page.tsx` |
