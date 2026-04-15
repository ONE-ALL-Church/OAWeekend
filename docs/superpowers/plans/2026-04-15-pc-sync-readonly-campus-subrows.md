# PC Sync Read-Only & Campus Sub-Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Planning Center-synced calendar entries read-only and display Host/Worship Leader as campus sub-rows grouped under parent headers.

**Architecture:** Add `source` field to `calendarEntries` schema and `campusId`/`parentRowId` to `calendarRows`. Restructure worship section constants to define parent+sub-row groups. Update prefill API to write per-campus entries with `source: "planning-center"`. Update grid/detail UI to render sub-rows indented under parents and enforce read-only on PC-sourced entries.

**Tech Stack:** InstantDB (schema + admin SDK), Next.js App Router, React, TypeScript

---

### Task 1: Add `source` field to `calendarEntries` schema

**Files:**
- Modify: `apps/web/instant.schema.ts:73-78`
- Modify: `packages/shared/src/types.ts:71` (add `CalendarEntrySource` type)

- [ ] **Step 1: Add CalendarEntrySource type to shared types**

In `packages/shared/src/types.ts`, add after line 71 (`export type CalendarEntryStatus = ...`):

```typescript
export type CalendarEntrySource = "manual" | "planning-center";
```

- [ ] **Step 2: Add `source` field to calendarEntries entity in InstantDB schema**

In `apps/web/instant.schema.ts`, modify the `calendarEntries` entity to add the `source` field:

```typescript
    calendarEntries: i.entity({
      content: i.string(),
      notes: i.string().optional(),
      status: i.string().indexed(),
      source: i.string().optional(),
      updatedAt: i.number().indexed(),
      updatedBy: i.string().optional(),
    }),
```

- [ ] **Step 3: Push schema to InstantDB**

Run: `cd apps/web && npx instant-cli push-schema`
Expected: Schema updated successfully

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts apps/web/instant.schema.ts
git commit -m "feat(schema): add source field to calendarEntries for PC sync tracking"
```

---

### Task 2: Add `campusId` and `parentRowId` fields to `calendarRows` schema

**Files:**
- Modify: `apps/web/instant.schema.ts:59-65`

- [ ] **Step 1: Add fields to calendarRows entity**

In `apps/web/instant.schema.ts`, modify the `calendarRows` entity:

```typescript
    calendarRows: i.entity({
      name: i.string(),
      slug: i.string().indexed(),
      sortOrder: i.number().indexed(),
      fieldType: i.string().indexed(),
      campusSpecific: i.boolean(),
      campusId: i.string().optional(),
      parentRowId: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
```

- [ ] **Step 2: Push schema to InstantDB**

Run: `cd apps/web && npx instant-cli push-schema`
Expected: Schema updated successfully

- [ ] **Step 3: Commit**

```bash
git add apps/web/instant.schema.ts
git commit -m "feat(schema): add campusId and parentRowId to calendarRows for sub-rows"
```

---

### Task 3: Update constants with campus sub-row structure

**Files:**
- Modify: `packages/shared/src/constants.ts:72-135`

- [ ] **Step 1: Add Planning Center campus constants**

In `packages/shared/src/constants.ts`, add before the `CALENDAR_DEFAULT_SECTIONS` definition (after line 70):

```typescript
export const PLANNING_CENTER_CAMPUS_IDS = {
  sanDimas: "235",
  ranchoCucamonga: "228631",
  westCovina: "962810",
} as const;

export const PLANNING_CENTER_CAMPUS_LIST = [
  { key: "sanDimas" as const, id: PLANNING_CENTER_CAMPUS_IDS.sanDimas, name: "San Dimas" },
  { key: "ranchoCucamonga" as const, id: PLANNING_CENTER_CAMPUS_IDS.ranchoCucamonga, name: "Rancho Cucamonga" },
  { key: "westCovina" as const, id: PLANNING_CENTER_CAMPUS_IDS.westCovina, name: "West Covina" },
] as const;
```

- [ ] **Step 2: Update CALENDAR_DEFAULT_ROWS type to support sub-rows**

Replace the `CALENDAR_DEFAULT_ROWS` type and the `"service-planning"` entry (keep it the same), but update the worship section. The type needs `campusId` and `parentSlug`:

```typescript
export const CALENDAR_DEFAULT_ROWS: Record<string, Array<{
  name: string;
  slug: string;
  fieldType: string;
  sortOrder: number;
  campusSpecific: boolean;
  campusId?: string;
  parentSlug?: string;
}>> = {
```

- [ ] **Step 3: Update the "service-planning" rows — add Host parent + campus sub-rows**

Replace the Host row in service-planning with a parent header and three campus sub-rows:

```typescript
  "service-planning": [
    { name: "Series", slug: "series", fieldType: "seriesPicker", sortOrder: 0, campusSpecific: false },
    { name: "Sermon Title", slug: "sermon-title", fieldType: "text", sortOrder: 1, campusSpecific: false },
    { name: "Speaker", slug: "speaker", fieldType: "personPicker", sortOrder: 2, campusSpecific: false },
    { name: "Host", slug: "host", fieldType: "personPicker", sortOrder: 3, campusSpecific: false },
    { name: "San Dimas", slug: "host-san-dimas", fieldType: "personPicker", sortOrder: 3.1, campusSpecific: false, campusId: PLANNING_CENTER_CAMPUS_IDS.sanDimas, parentSlug: "host" },
    { name: "Rancho Cucamonga", slug: "host-rancho", fieldType: "personPicker", sortOrder: 3.2, campusSpecific: false, campusId: PLANNING_CENTER_CAMPUS_IDS.ranchoCucamonga, parentSlug: "host" },
    { name: "West Covina", slug: "host-west-covina", fieldType: "personPicker", sortOrder: 3.3, campusSpecific: false, campusId: PLANNING_CENTER_CAMPUS_IDS.westCovina, parentSlug: "host" },
    { name: "Communion", slug: "communion", fieldType: "tagList", sortOrder: 4, campusSpecific: false },
    { name: "In Service Video", slug: "in-service-video", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
    { name: "Campus - Live Speaking", slug: "campus-live", fieldType: "campusPicker", sortOrder: 6, campusSpecific: false },
    { name: "Special", slug: "special", fieldType: "text", sortOrder: 7, campusSpecific: false },
  ],
```

- [ ] **Step 4: Update the "worship" rows — add Worship Leader parent + campus sub-rows**

```typescript
  "worship": [
    { name: "Worship Leader", slug: "worship-leader", fieldType: "personPicker", sortOrder: 0, campusSpecific: false },
    { name: "San Dimas", slug: "worship-leader-san-dimas", fieldType: "personPicker", sortOrder: 0.1, campusSpecific: false, campusId: PLANNING_CENTER_CAMPUS_IDS.sanDimas, parentSlug: "worship-leader" },
    { name: "Rancho Cucamonga", slug: "worship-leader-rancho", fieldType: "personPicker", sortOrder: 0.2, campusSpecific: false, campusId: PLANNING_CENTER_CAMPUS_IDS.ranchoCucamonga, parentSlug: "worship-leader" },
    { name: "West Covina", slug: "worship-leader-west-covina", fieldType: "personPicker", sortOrder: 0.3, campusSpecific: false, campusId: PLANNING_CENTER_CAMPUS_IDS.westCovina, parentSlug: "worship-leader" },
    { name: "Song 1", slug: "song-1", fieldType: "text", sortOrder: 1, campusSpecific: false },
    { name: "Song 2", slug: "song-2", fieldType: "text", sortOrder: 2, campusSpecific: false },
    { name: "Song 3", slug: "song-3", fieldType: "text", sortOrder: 3, campusSpecific: false },
    { name: "Song 4", slug: "song-4", fieldType: "text", sortOrder: 4, campusSpecific: false },
  ],
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants.ts
git commit -m "feat(constants): restructure host/worship-leader as parent+campus sub-rows"
```

---

### Task 4: Update seed script to support sub-rows

**Files:**
- Modify: `apps/web/scripts/seed-calendar.ts`

- [ ] **Step 1: Update seed script to wire `parentRowId` and `campusId`**

Replace the entire seed function body to handle `parentSlug` resolution:

```typescript
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

    // First pass: create IDs for all rows; track slug → id for parentSlug resolution
    const slugToId = new Map<string, string>();
    for (const rowDef of rows) {
      slugToId.set(rowDef.slug, id());
    }

    // Second pass: build transactions
    for (const rowDef of rows) {
      const rowId = slugToId.get(rowDef.slug)!;
      const parentRowId = rowDef.parentSlug
        ? slugToId.get(rowDef.parentSlug) ?? undefined
        : undefined;

      txns.push(
        adminDb.tx.calendarRows[rowId].update({
          name: rowDef.name,
          slug: rowDef.slug,
          fieldType: rowDef.fieldType,
          sortOrder: rowDef.sortOrder,
          campusSpecific: rowDef.campusSpecific,
          campusId: rowDef.campusId ?? "",
          parentRowId: parentRowId ?? "",
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/scripts/seed-calendar.ts
git commit -m "feat(seed): support campusId and parentRowId in calendar row seeding"
```

---

### Task 5: Update prefill API to write per-campus entries with source tracking

**Files:**
- Modify: `apps/web/app/api/calendar/week/[weekStart]/prefill-planning-center/route.ts`

- [ ] **Step 1: Remove EXTRA_ROW_DEFS for worship-leader (now seeded via constants)**

Delete the `EXTRA_ROW_DEFS` array and the `ensureExtraRows()` function entirely. The worship-leader row is now part of the seed constants. Remove the `await ensureExtraRows()` call from the `POST` handler.

- [ ] **Step 2: Add helper to upsert an entry with source tracking**

Add this helper function after the existing helpers (`jsonText`, `jsonPeople`, etc.):

```typescript
function upsertEntry(
  txs: Parameters<typeof adminDb.transact>[0],
  opts: {
    rowId: string;
    weekId: string;
    content: string;
    existing: { id: string; content: string } | undefined;
  },
) {
  if (opts.existing && hasMeaningfulContent(opts.existing.content)) {
    return false; // skipped
  }

  if (opts.existing) {
    txs.push(
      adminDb.tx.calendarEntries[opts.existing.id].update({
        content: opts.content,
        status: "draft",
        source: "planning-center",
        updatedAt: Date.now(),
        updatedBy: "planning-center-prefill",
      }),
    );
  } else {
    const entryId = id();
    txs.push(
      adminDb.tx.calendarEntries[entryId].update({
        content: opts.content,
        status: "draft",
        source: "planning-center",
        updatedAt: Date.now(),
        updatedBy: "planning-center-prefill",
      }),
      adminDb.tx.calendarEntries[entryId].link({ week: opts.weekId }),
      adminDb.tx.calendarEntries[entryId].link({ row: opts.rowId }),
    );
  }
  return true; // written
}
```

- [ ] **Step 3: Refactor songs/series/sermon-title prefill to use `upsertEntry`**

Replace the inline song loop with:

```typescript
    const songs = sanDimasPlan?.songs ?? [];
    songs.slice(0, 4).forEach((song, index) => {
      const row = rowsBySlug.get(`song-${index + 1}`);
      if (!row) return;
      const slug = `song-${index + 1}`;
      const didWrite = upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonText(song.title),
        existing: entriesByRowId.get(row.id),
      });
      (didWrite ? written : skipped).push(slug);
    });
```

Apply the same pattern for series, sermon-title. Use `upsertEntry` instead of the inline if/else blocks.

- [ ] **Step 4: Replace host/worship-leader prefill with per-campus sub-row writes**

Remove the old `campusLabeledNames` usage. Replace with per-campus writes:

```typescript
    // Host — write per-campus sub-rows
    const campusHostSlugs: Record<string, string> = {
      "San Dimas": "host-san-dimas",
      "Rancho Cucamonga": "host-rancho",
      "West Covina": "host-west-covina",
    };

    for (const plan of campusPlans) {
      if (!plan) continue;
      const slug = campusHostSlugs[plan.campusName];
      if (!slug) continue;
      const row = rowsBySlug.get(slug);
      if (!row || plan.hosts.length === 0) continue;

      const didWrite = upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonPeople(plan.hosts),
        existing: entriesByRowId.get(row.id),
      });
      (didWrite ? written : skipped).push(slug);
    }

    // Worship Leader — write per-campus sub-rows
    const campusWLSlugs: Record<string, string> = {
      "San Dimas": "worship-leader-san-dimas",
      "Rancho Cucamonga": "worship-leader-rancho",
      "West Covina": "worship-leader-west-covina",
    };

    for (const plan of campusPlans) {
      if (!plan) continue;
      const slug = campusWLSlugs[plan.campusName];
      if (!slug) continue;
      const row = rowsBySlug.get(slug);
      if (!row || plan.worshipLeaders.length === 0) continue;

      const didWrite = upsertEntry(txs, {
        rowId: row.id,
        weekId: week.id,
        content: jsonPeople(plan.worshipLeaders),
        existing: entriesByRowId.get(row.id),
      });
      (didWrite ? written : skipped).push(slug);
    }
```

- [ ] **Step 5: Remove the `campusLabeledNames` function**

It's no longer needed since we write per-campus instead of aggregating.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/calendar/week/[weekStart]/prefill-planning-center/route.ts
git commit -m "feat(prefill): write per-campus sub-rows and set source=planning-center"
```

---

### Task 6: Update CalendarCell to support read-only PC-sourced entries

**Files:**
- Modify: `apps/web/components/calendar/calendar-cell.tsx`

- [ ] **Step 1: Add `source` prop to CalendarCellProps**

```typescript
interface CalendarCellProps {
  content: string;
  fieldType: CalendarFieldType;
  isEditable: boolean;
  isSyncedFromPC: boolean;
  onClick: () => void;
  isLastRow?: boolean;
}
```

- [ ] **Step 2: Use `isSyncedFromPC` to override editability and show indicator**

Update the component to disable clicks when synced and show a subtle PC indicator:

```typescript
export function CalendarCell({
  content,
  fieldType,
  isEditable,
  isSyncedFromPC,
  onClick,
  isLastRow,
}: CalendarCellProps) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  const parsed = parseCellContent(content);
  const effectiveEditable = isEditable && !isSyncedFromPC;

  return (
    <div
      onClick={effectiveEditable ? onClick : undefined}
      className={`px-2.5 py-2 text-xs text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/20 flex items-center justify-center min-h-[40px] text-center transition-colors duration-[220ms] relative ${
        effectiveEditable
          ? "cursor-pointer hover:bg-oa-sand-100/35"
          : ""
      }`}
    >
      {!parsed ? (
        <span className="text-oa-stone-300 text-base">—</span>
      ) : (
        <CellValueRenderer value={parsed} fieldType={fieldType} />
      )}
      {isSyncedFromPC && parsed && (
        <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#00A4C7]/12 text-[6px] font-bold text-[#00A4C7]" title="Synced from Planning Center">
          PC
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/calendar-cell.tsx
git commit -m "feat(cell): add read-only enforcement for PC-synced entries"
```

---

### Task 7: Update CalendarGrid to render sub-rows and pass source info

**Files:**
- Modify: `apps/web/components/calendar/calendar-grid.tsx`

- [ ] **Step 1: Update RowBlock to handle sub-rows and PC source**

Add `isSubRow` and `isSyncedFromPC` callback props to `RowBlock`:

```typescript
function RowBlock({
  row,
  weeks,
  entryMap,
  isLastRow,
  isEditable,
  isSubRow,
  onCellClick,
}: {
  row: CalendarRow;
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isLastRow: boolean;
  isEditable: boolean;
  isSubRow: boolean;
  onCellClick: (cell: EditingCell) => void;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  return (
    <>
      {/* Row label */}
      <div
        className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center ${
          isSubRow ? "pl-8 text-oa-black-700" : ""
        }`}
      >
        {row.name}
      </div>

      {/* Cells */}
      {weeks.map((week) => {
        const entry = entryMap.get(`${week.id}:${row.id}`);
        const isSyncedFromPC = (entry as Record<string, unknown> | undefined)?.source === "planning-center";

        return (
          <CalendarCell
            key={`${week.id}:${row.id}`}
            content={entry?.content ?? ""}
            fieldType={row.fieldType as CalendarFieldType}
            isEditable={isEditable}
            isSyncedFromPC={isSyncedFromPC}
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

- [ ] **Step 2: Add ParentRowHeader component for group headers**

Add a new component that renders a header row with no cells:

```typescript
function ParentRowHeader({
  name,
  weeks,
  isLastRow,
}: {
  name: string;
  weeks: CalendarWeekWithEntries[];
  isLastRow: boolean;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  return (
    <>
      <div
        className={`px-4 py-2 text-xs font-bold text-oa-black-900 bg-oa-sand-100/20 ${borderClass} border-r border-r-oa-stone-200/30 flex items-center`}
      >
        {name}
      </div>
      {weeks.map((week) => (
        <div
          key={`parent-${name}-${week.id}`}
          className={`bg-oa-sand-100/20 ${borderClass} border-r border-r-oa-stone-200/20 min-h-[40px]`}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 3: Update SectionBlock to group rows by parent**

In the `SectionBlock` component, restructure the row rendering. Replace the `manualRows.map(...)` block with logic that groups rows:

```typescript
          {/* Manual rows with sub-row grouping */}
          {(() => {
            const elements: React.ReactNode[] = [];
            let i = 0;
            while (i < manualRows.length) {
              const row = manualRows[i]!;
              const parentRowId = (row as Record<string, unknown>).parentRowId as string | undefined;
              const hasChildren = manualRows.some(
                (r) => (r as Record<string, unknown>).parentRowId === row.id,
              );

              if (hasChildren) {
                // This is a parent header row
                const children = manualRows.filter(
                  (r) => (r as Record<string, unknown>).parentRowId === row.id,
                );
                const isLastGroup = !manualRows.slice(i + 1).some(
                  (r) => (r as Record<string, unknown>).parentRowId !== row.id,
                );

                elements.push(
                  <ParentRowHeader
                    key={`parent-${row.id}`}
                    name={row.name}
                    weeks={weeks}
                    isLastRow={false}
                  />,
                );

                children.forEach((child, childIdx) => {
                  const isLast = isLastGroup && childIdx === children.length - 1;
                  elements.push(
                    <RowBlock
                      key={child.id}
                      row={child}
                      weeks={weeks}
                      entryMap={entryMap}
                      isLastRow={isLast}
                      isEditable={editable}
                      isSubRow={true}
                      onCellClick={onCellClick}
                    />,
                  );
                });
                // Skip past all children
                i += 1 + children.length;
              } else if (parentRowId) {
                // Already handled as child of a parent; skip
                i++;
              } else {
                // Regular row (no parent, no children)
                const isLast = i === manualRows.length - 1;
                elements.push(
                  <RowBlock
                    key={row.id}
                    row={row}
                    weeks={weeks}
                    entryMap={entryMap}
                    isLastRow={isLast}
                    isEditable={editable}
                    isSubRow={false}
                    onCellClick={onCellClick}
                  />,
                );
                i++;
              }
            }
            return elements;
          })()}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/calendar-grid.tsx
git commit -m "feat(grid): render campus sub-rows under parent headers with PC read-only"
```

---

### Task 8: Update WeekDetailSection to render sub-rows and enforce read-only

**Files:**
- Modify: `apps/web/components/calendar/week-detail-section.tsx`

- [ ] **Step 1: Update row rendering to support parent headers and sub-rows**

Replace the `section.rows.map(...)` block with grouped rendering:

```typescript
        {/* Field rows with sub-row grouping */}
        {(() => {
          const rows = section.rows;
          const elements: React.ReactNode[] = [];
          let i = 0;

          while (i < rows.length) {
            const row = rows[i]!;
            const parentRowId = (row as Record<string, unknown>).parentRowId as string | undefined;
            const hasChildren = rows.some(
              (r) => (r as Record<string, unknown>).parentRowId === row.id,
            );

            if (hasChildren) {
              // Parent header
              elements.push(
                <div
                  key={`parent-${row.id}`}
                  className="flex items-start px-5 py-2.5 border-b border-oa-stone-200/30 bg-oa-sand-100/20"
                >
                  <div className="w-[160px] shrink-0 pt-0.5 text-xs font-bold uppercase tracking-wider text-oa-black-900">
                    {row.name}
                  </div>
                </div>,
              );

              // Children
              const children = rows.filter(
                (r) => (r as Record<string, unknown>).parentRowId === row.id,
              );
              for (const child of children) {
                const entry = entries.get(child.id);
                const content = entry?.content ?? "";
                const isSyncedFromPC = (entry as Record<string, unknown> | undefined)?.source === "planning-center";
                const rowEditable = isEditable && !isSyncedFromPC;

                elements.push(
                  <div
                    key={child.id}
                    className="flex items-start px-5 py-3 border-b border-oa-stone-200/30 last:border-b-0 group hover:bg-oa-sand-100/35 transition-colors duration-[220ms] pl-10"
                  >
                    <div className="w-[140px] shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider text-oa-black-700">
                      {child.name}
                    </div>
                    <div className="flex-1 text-sm text-oa-black-900">
                      <FieldValueDisplay
                        content={content}
                        fieldType={child.fieldType as CalendarFieldType}
                      />
                    </div>
                    {isSyncedFromPC && content && content !== "{}" && (
                      <span className="text-[9px] font-bold text-[#00A4C7]/60 ml-1 shrink-0" title="Synced from Planning Center">
                        PC
                      </span>
                    )}
                    {rowEditable && (
                      <button
                        onClick={() => setEditingRowId(child.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms] text-oa-stone-300 hover:text-oa-black-700 text-sm ml-2 shrink-0"
                      >
                        ✎
                      </button>
                    )}
                  </div>,
                );
              }

              i += 1 + children.length;
            } else if (parentRowId) {
              // Already handled as child; skip
              i++;
            } else {
              // Regular row
              const entry = entries.get(row.id);
              const content = entry?.content ?? "";
              const isSyncedFromPC = (entry as Record<string, unknown> | undefined)?.source === "planning-center";
              const rowEditable = isEditable && !isSyncedFromPC;

              elements.push(
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
                  {isSyncedFromPC && content && content !== "{}" && (
                    <span className="text-[9px] font-bold text-[#00A4C7]/60 ml-1 shrink-0" title="Synced from Planning Center">
                      PC
                    </span>
                  )}
                  {rowEditable && (
                    <button
                      onClick={() => setEditingRowId(row.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms] text-oa-stone-300 hover:text-oa-black-700 text-sm ml-2 shrink-0"
                    >
                      ✎
                    </button>
                  )}
                </div>,
              );
              i++;
            }
          }
          return elements;
        })()}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/week-detail-section.tsx
git commit -m "feat(week-detail): render campus sub-rows and enforce PC read-only"
```

---

### Task 9: Re-seed and verify

- [ ] **Step 1: Clear existing calendar data in InstantDB**

Since we're in dev with test data, delete all existing calendar rows, entries, sections, series, and weeks via the InstantDB dashboard or a cleanup script, then re-seed.

- [ ] **Step 2: Run the seed script**

Run: `cd apps/web && npx tsx scripts/seed-calendar.ts`
Expected: All sections seed with the new sub-row structure. Host should show 4 rows (1 parent + 3 campus), Worship Leader should show 4 rows.

- [ ] **Step 3: Start the dev server and verify grid rendering**

Run: `cd apps/web && npm run dev`
Navigate to the calendar grid. Verify:
- Host row appears as a bold header with San Dimas, Rancho Cucamonga, West Covina indented below
- Worship Leader row appears the same way
- All other rows render normally

- [ ] **Step 4: Test the prefill endpoint**

Call `POST /api/calendar/week/{weekStart}/prefill-planning-center` for a week with Planning Center data. Verify:
- Campus sub-rows get separate entries (not combined)
- Entries have `source: "planning-center"` in the response
- Song entries also have the source set
- Sub-row cells show the "PC" indicator and are not clickable

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
