# Planning Center Sync: Read-Only Entries & Campus Sub-Rows

**Date:** 2026-04-15
**Status:** Implemented

## Overview

Calendar entries synced from Planning Center and Rock are source-of-truth fields and should be read-only in the interface. Host and Worship Leader rows display as campus sub-rows (one per campus) grouped under a parent header. Songs continue to pull from San Dimas only. A separate Planning Center drill-down page exposes the fuller service plan data without making those source rows editable.

## Data Model Changes

### `calendarEntries` — new `source` field

- Type: `"manual" | "planning-center" | "rock"`
- Default: `"manual"`
- Set by the prefill endpoint when it creates or updates source rows
- UI uses this, plus system row slugs, to determine editability: Planning Center/Rock-managed rows are read-only
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

Songs 1-4, Series, Sermon Title, and Speaker remain single source rows. Series/Sermon Title prefer Rock data and fall back to Planning Center when Rock has no value. Speaker comes from Rock only.

## Planning Center Prefill Changes

### Entry source tracking

Planning Center rows get `source: "planning-center"`. Rock rows get `source: "rock"`.

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

Source rows are authoritative. Every prefill overwrites Planning Center/Rock-managed rows and clears stale source values when upstream data is missing. Manual rows are not changed by the prefill.

### Additional source data exposed

The Planning Center integration now pulls:

- Full service order items, including item type, sequence, duration, notes, song links, and key names
- Active team assignments by role
- All plan times, plus filtered service-time labels
- Planning Center source URLs for plans and items

This data powers `/planning-center/week/[weekStart]` and is the foundation for the future Planning Center wrapper.

## UI Changes

### Read-only enforcement

- `calendar-cell.tsx`: Check the row slug and `entry.source`. If source-managed:
  - Disable click handler
  - Remove hover/cursor-pointer styles
  - Show a subtle Planning Center or Rock indicator where appropriate
- `week-detail-section.tsx`: Same check, disable edit button
- This is independent of role-based editability. A Planning Center/Rock source row is read-only even if the user has edit access to the section.

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

- Making source-managed campus sub-rows manually editable
- Campus sub-rows for any rows other than Host and Worship Leader
- Editing Planning Center plans from inside OA Weekend
