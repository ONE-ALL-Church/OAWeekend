# Planning Center Sync: Read-Only Entries & Campus Sub-Rows

**Date:** 2026-04-15
**Status:** Draft

## Overview

Calendar entries synced from Planning Center should be read-only. Host and Worship Leader rows should display as campus sub-rows (one per campus) grouped under a parent header. Songs continue to pull from San Dimas only.

## Data Model Changes

### `calendarEntries` — new `source` field

- Type: `"manual" | "planning-center"`
- Default: `"manual"`
- Set by the prefill endpoint when it creates or updates an entry
- UI uses this to determine editability: `source === "planning-center"` → read-only
- Entries without a `source` field (legacy) are treated as `"manual"`

### `calendarRows` — new fields

- `campusId` (optional string): References a Planning Center campus ID. Present on campus sub-rows.
- `parentRowId` (optional string): References the parent row's ID. Present on sub-rows to establish grouping.

## Constants Changes

### Campus Sub-Row Structure

Host and Worship Leader rows are restructured from single rows into parent + sub-row groups:

**Host (parent header):**
- `host` — group header, `fieldType: "personPicker"`, no entries rendered
  - `host-san-dimas` — `campusId: "235"`, `parentRowId: <host-row-id>`
  - `host-rancho` — `campusId: "228631"`, `parentRowId: <host-row-id>`
  - `host-west-covina` — `campusId: "962810"`, `parentRowId: <host-row-id>`

**Worship Leader (parent header):**
- `worship-leader` — group header, `fieldType: "personPicker"`, no entries rendered
  - `worship-leader-san-dimas` — `campusId: "235"`, `parentRowId: <worship-leader-row-id>`
  - `worship-leader-rancho` — `campusId: "228631"`, `parentRowId: <worship-leader-row-id>`
  - `worship-leader-west-covina` — `campusId: "962810"`, `parentRowId: <worship-leader-row-id>`

All other rows (Songs 1-4, Series, Sermon Title, Service Times) remain single rows unchanged.

## Planning Center Prefill Changes

### Entry source tracking

All entries created or updated by the prefill endpoint get `source: "planning-center"`.

### Per-campus entries for Host/Worship Leader

- Instead of combining all campuses into one entry with "(Campus Name)" suffixes, the prefill writes separate entries to each campus sub-row
- San Dimas host → `host-san-dimas` row
- Rancho host → `host-rancho` row
- West Covina host → `host-west-covina` row
- Same pattern for Worship Leader
- Person names no longer include the "(Campus Name)" suffix

### Songs (unchanged source, new source flag)

- Songs 1-4 continue pulling from San Dimas Planning Center plan only
- Now marked with `source: "planning-center"`

### Overwrite behavior

Unchanged — prefill still skips cells that already have meaningful content.

## UI Changes

### Read-only enforcement

- `calendar-cell.tsx`: Check `entry.source === "planning-center"`. If true:
  - Disable click handler
  - Remove hover/cursor-pointer styles
  - Show a subtle lock icon or Planning Center indicator
- `week-detail-section.tsx`: Same check, disable edit button
- This is independent of role-based editability — a PC-synced entry is read-only even if the user has edit access to the section

### Sub-row rendering

**Grid view (`calendar-grid.tsx`):**
- Rows with a `parentRowId` render indented beneath their parent row
- Parent rows render as group headers: bold label, no entry cells
- Campus sub-rows show the campus name as label (e.g., "San Dimas")
- All three campus sub-rows always appear, even when empty
- Sort order: parent's `sortOrder` determines group position; sub-rows sort by their own `sortOrder` within the group

**Week detail view (`week-detail-section.tsx`):**
- Same pattern: parent as header, campus sub-rows indented
- Empty sub-rows show "—" placeholder

## Seed/Init

- Update `DEFAULT_CALENDAR_SECTIONS` in `packages/shared/src/constants.ts` with the new sub-row structure
- Since we're in dev with test data, no migration needed — re-seed with updated constants
- Seed logic creates parent rows first, then sub-rows with `parentRowId` and `campusId` set

## Out of Scope

- Making empty campus sub-rows manually editable (all sub-rows are read-only when populated by PC)
- Campus sub-rows for any rows other than Host and Worship Leader
- Backfill migration of existing data
