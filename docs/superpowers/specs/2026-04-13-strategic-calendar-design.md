# Strategic Calendar — Design Spec

**Date:** 2026-04-13
**Sub-brand:** Core
**Status:** Draft

## Summary

An editable strategic calendar for planning church weekend services across all campuses and communication channels. Modeled after the existing Google Sheets strategic calendar, but built as a first-class feature in OA Weekend with structured data, role-based access, drill-down views, and real-time collaborative editing via InstantDB.

### Goals

1. Replace the spreadsheet-based strategic calendar with an in-app experience
2. Enable drill-down navigation: by week, series, section, and individual cell
3. Support configurable sections and rows so the structure can evolve
4. Role-based editing so teams only modify their sections
5. Lay groundwork for future integration with Rock RMS, ClickUp, Planning Center, and the existing transcript system

### Non-Goals (MVP)

- Live integration with Rock RMS entities (future — data model supports it)
- ClickUp or Planning Center sync (future)
- Import from existing Google Sheets (manual data entry for MVP)
- Notifications or approval workflows
- Mobile-optimized layout (responsive is fine, but desktop is primary)

---

## Data Model (InstantDB)

### New Entities

#### `calendarSections`

Configurable section groups (e.g., "Service Planning", "Social Media", "Email & Text").

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `name` | `string` | no | Display name |
| `slug` | `string` | unique, indexed | URL-safe identifier |
| `sortOrder` | `number` | indexed | Position in grid |
| `color` | `string` | no | Hex accent color for left bar |
| `createdAt` | `number` | indexed | Epoch ms |
| `updatedAt` | `number` | no | Epoch ms |

#### `calendarRows`

Configurable rows within a section (e.g., "Series", "Speaker", "Host").

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `name` | `string` | no | Display name |
| `slug` | `string` | indexed | Unique within section |
| `sortOrder` | `number` | indexed | Position within section |
| `fieldType` | `string` | indexed | One of: `text`, `multilineText`, `personPicker`, `seriesPicker`, `campusPicker`, `tagList`, `boolean`, `richText` |
| `campusSpecific` | `boolean` | no | Whether this row filters by campus |
| `createdAt` | `number` | indexed | Epoch ms |

#### `calendarWeeks`

Each column in the grid — anchored to a weekend (Saturday).

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `weekStart` | `string` | indexed | Saturday ISO date (e.g., "2026-04-11") — primary sort key |
| `label` | `string` | no | Optional display override (e.g., "Mother's Day", "EASTER") |
| `createdAt` | `number` | indexed | Epoch ms |

#### `calendarEntries`

The cell data — one per week + row intersection.

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `content` | `string` | no | JSON string — structure depends on row's `fieldType` |
| `notes` | `string` | no | Optional freeform notes |
| `status` | `string` | indexed | `empty`, `draft`, `confirmed` |
| `updatedAt` | `number` | indexed | Epoch ms |
| `updatedBy` | `string` | no | User ID who last edited |

#### `calendarSeries`

Named sermon series spanning multiple weeks.

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `name` | `string` | no | Series name (e.g., "Awake") |
| `description` | `string` | no | Optional description |
| `color` | `string` | no | Hex color for visual grouping |
| `startWeek` | `string` | indexed | ISO date of first Saturday |
| `endWeek` | `string` | indexed | ISO date of last Saturday |
| `createdAt` | `number` | indexed | Epoch ms |

#### `calendarRoles`

Role-based section access control.

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `name` | `string` | no | Role name (e.g., "Worship Team", "Comms Team") |
| `createdAt` | `number` | indexed | Epoch ms |

### New Links

| Link Name | Forward | Reverse |
|-----------|---------|---------|
| `sectionRows` | `calendarSections` → many `calendarRows` | `calendarRows` → one `calendarSections` (label: `section`) |
| `entryWeek` | `calendarEntries` → one `calendarWeeks` | `calendarWeeks` → many `calendarEntries` (label: `entries`) |
| `entryRow` | `calendarEntries` → one `calendarRows` | `calendarRows` → many `calendarEntries` (label: `entries`) |
| `entryUpdater` | `calendarEntries` → one `$users` | `$users` → many `calendarEntries` (label: `updatedEntries`) |
| `seriesWeeks` | `calendarSeries` → many `calendarWeeks` | `calendarWeeks` → many `calendarSeries` (label: `series`) |
| `roleSections` | `calendarRoles` → many `calendarSections` | `calendarSections` → many `calendarRoles` (label: `roles`) |
| `roleMembers` | `calendarRoles` → many `$users` | `$users` → many `calendarRoles` (label: `calendarRoles`) |

### Content JSON Structures by Field Type

```typescript
// text
{ "value": "Jeff Vines" }

// multilineText
{ "value": "Community Group Focus\nStarting Point (15th)" }

// personPicker
{ "people": [{ "name": "Jeff Vines", "initials": "JV", "rockPersonId": null }] }

// seriesPicker
{ "seriesId": "<calendarSeries id>", "weekNumber": 3 }

// campusPicker
{ "campuses": [{ "id": "...", "name": "San Dimas" }] }

// tagList
{ "tags": ["Communion", "Creative"] }

// boolean
{ "value": true }

// richText
{ "html": "<p>Some <strong>rich</strong> content</p>" }
```

---

## Routing

All new routes live under `/calendar` within the existing authenticated app.

| Route | Purpose |
|-------|---------|
| `/calendar` | Main grid view — scrollable calendar with sections, weeks, campus filter |
| `/calendar/week/[weekStart]` | Week detail — all sections for a specific weekend |
| `/calendar/series/[seriesId]` | Series detail — all weeks in a series with messaging themes |
| `/calendar/section/[sectionSlug]` | Section detail — focused view of one section across full timeline |
| `/calendar/settings` | Section/row configuration, role management |

---

## Views

### 1. Main Grid View (`/calendar`)

The primary view. A horizontally scrollable grid mirroring the spreadsheet layout.

**Toolbar:**
- Title: "Strategic Calendar"
- Date range navigator (← Prev / "Apr — Jun 2026" / Next →) — shifts by 2 months
- Campus filter dropdown (All Campuses, San Dimas, Rancho, West Covina)
- "+ Add Week" button
- "Manage Sections" button (links to `/calendar/settings`)

**Grid structure:**
- **Frozen left column** (180px): row labels
- **Month header row**: spans across week columns, uppercase, sand background
- **Week header row**: "11 & 12" format with optional special label badges (Easter, Mother's Day) in yellow pills
- **Section headers**: full-width, collapsible, with 3px colored left accent bar. Click toggles expand/collapse. Collapsed state shows row count summary.
- **Data rows**: cells within sections, editable on click
- **Series spanning**: series cells get colored background tint + 3px top accent bar matching series color. Same series across adjacent weeks visually connects.

**Cell interactions:**
- Click → opens inline edit panel (right side drawer or popover depending on field type)
- Hover → subtle sand background highlight
- Empty cells show "—" in muted text

**Campus filtering:**
- When a campus is selected, rows with `campusSpecific: true` filter to show only that campus's data
- "All Campuses" shows everything

### 2. Week Detail View (`/calendar/week/[weekStart]`)

Vertical layout showing all sections for a specific weekend.

**Header:**
- Back button (← Calendar)
- Week date: "April 18 & 19, 2026"
- Series badge with color dot ("Awake — Week 7")
- Special label badge if applicable ("Easter")
- Prev/Next week arrows

**Body:**
- Stacked section cards, each with:
  - Section header with accent bar and status indicator (e.g., "All confirmed", "Draft", "3 of 7 days planned")
  - Field rows: label (160px, uppercase, muted) + value + hover edit icon (✎)
  - "Last updated" footer per section with timestamp and user name

**Field rendering by type:**
- `personPicker`: avatar chip with initials + name
- `seriesPicker`: yellow tag linking to series detail ("Awake — Week 7 of 8 →")
- `tagList`: colored pills (yellow/blue/coral)
- `multilineText`: line-broken content block
- `text`: inline text
- `boolean`: tag or checkbox visual

**Special section renderings:**
- **Worship**: numbered song list with song number badge, title, and worship leader
- **Social Media**: 7-day grid (Mon-Sun) with daily content or "Not planned" placeholder
- **Events**: event cards with colored dots, name, date, campus scope tags
- **Campaigns**: campaign slot cards (C1, C2, C3...) with dashed yellow border

### 3. Series Detail View (`/calendar/series/[seriesId]`)

Overview of a sermon series across its full duration.

**Header:**
- Back button, series color bar (4px vertical), series name (28px), eyebrow label ("Sermon Series")
- Meta: duration, date span, speaker chips
- Edit Series button

**Summary cards** (3-column grid):
- Duration (weeks + date range)
- Primary Speaker (name + breakdown)
- Completion (confirmed/draft/empty counts)

**Week timeline:**
- Table rows: week number badge, date, speaker chip, message title + scripture, status tag
- Current week highlighted with yellow background
- Each row clickable → navigates to week detail

**Messaging across series:**
- Mini-grid showing how content aligns across channels (In Service Video, Campaign Focus, Social Theme, Email Push) for the final weeks of the series
- Current week highlighted

**Related content** (2-column grid):
- Events during series: dot + name + date
- Active campaigns: dot + name + week span

### 4. Section Detail View (`/calendar/section/[sectionSlug]`)

A focused view of a single section across the full timeline — the main grid filtered to one section, with more vertical space per cell for comfortable editing.

**Header:**
- Back button (← Calendar)
- Section name with accent color bar
- Row count (e.g., "7 rows")
- Date range navigator (same as main grid)
- Campus filter (if section contains campus-specific rows)

**Body:**
- Same horizontal week columns as main grid
- Only rows from this section shown
- Taller cells (min-height 60px vs 40px in main grid) for detailed content
- Click-to-edit directly in cells (no drawer needed — more space available)
- Section header is not shown (redundant — the whole page is the section)
- Row labels in frozen left column, same as main grid

### 5. Settings View (`/calendar/settings`)

Admin configuration for sections, rows, and roles.

**Sections tab:**
- Draggable list of sections with name, color picker, sort order
- Add/remove sections
- Click section → shows its rows

**Rows tab** (within a section):
- Draggable list of rows with name, field type selector, campus-specific toggle
- Add/remove rows

**Roles tab:**
- List of roles with name and member count
- Click role → shows assigned sections (checkboxes) and member list (user picker)

---

## Visual Design

Follows the ONE&ALL brand system (Core sub-brand).

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary accent | `#FFC905` (Yellow) | CTAs, series highlights, current week, song badges, progress |
| Text primary | `#272728` (Black) | Headers, body text, section names |
| Text secondary | `rgba(39,39,40,0.55)` | Labels, metadata, scripture refs |
| Text muted | `rgba(39,39,40,0.35)` | Placeholders, empty states, collapsed info |
| Surface | `#FFFFFF` (White) | Cards, cells, toolbar |
| Surface background | `#faf9f7` | Page background on detail views |
| Surface raised | `rgba(245,237,228,0.35)` (Sand subtle) | Hover states, event chips, person chips |
| Border | `#E0DBD9` (Stone) | Card borders, grid lines, dividers |
| Border subtle | `rgba(224,219,217,0.3)` | Internal row dividers |
| Focus ring | `0 0 0 4px rgba(255,201,5,0.22)` | Focus states on inputs/buttons |

### Supplemental Accents (section colors, event dots, campus tags)

| Token | Value | Usage |
|-------|-------|-------|
| Blue | `#6873B3` | Events section, youth events |
| Coral | `#D07A84` | Social media section, campus tags |
| Soft pink | `#CDA5AC` | Email/text section |
| Green | `#22c55e` / `rgba(34,197,94,0.1)` | Confirmed status, "All campuses" tag |

### Typography

- Font: Inter (fallback to system sans-serif; Neue Montreal when available via custom font loading)
- H1 (page titles): 24-28px, weight 700, letter-spacing -0.03em
- Section headers: 13-14px, weight 700, letter-spacing -0.01em
- Field labels: 11-12px, weight 600, uppercase, letter-spacing 0.04-0.06em
- Body/cell text: 12-14px, weight 400-500
- Tags/badges: 10-11px, weight 600
- Scripture refs: 10-12px, weight 400, secondary color

### Shape & Spacing

- Card radius: 12px
- Button/tag radius: 8px (buttons), 10-12px (tags/pills)
- Shadow: `0 1px 3px rgba(39,39,40,0.06)` (cards), `0 2px 8px rgba(39,39,40,0.08)` (hover)
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48px
- Grid column min-width: 140px
- Frozen label column: 180px
- Minimum touch target: 44px (for mobile-friendly click areas)

### Motion

- State transitions: 220ms ease-out
- Hover backgrounds: fade in via transition
- Section collapse/expand: 220ms ease-out on height
- Edit icon reveal: opacity 0→1 on row hover, 220ms

### Accessibility

- Body text contrast: WCAG AA minimum (4.5:1)
- Yellow accents never used as text on light backgrounds without dark support
- Focus rings: 2px offset, `#272728` color on interactive elements
- Semantic heading order maintained
- Keyboard navigation: Tab through cells, Enter to edit, Escape to close

---

## Permissions Model

### InstantDB Permissions

```
calendarSections: authenticated users can view; admins can create/update/delete
calendarRows: authenticated users can view; admins can create/update/delete
calendarWeeks: authenticated users can view; admins can create/delete; editors can update
calendarEntries: authenticated users can view; role-checked users can update entries in their sections
calendarSeries: authenticated users can view; admins can create/update/delete
calendarRoles: admins only for all operations
```

### Role-Based Section Access

- Each user can be assigned to one or more `calendarRoles`
- Each role grants edit access to specific `calendarSections`
- Users can view all sections but can only edit sections their role permits
- Admin role bypasses all section restrictions
- Edit icon (✎) only appears on cells the user has permission to edit

---

## Component Architecture

### New Components

| Component | Purpose |
|-----------|---------|
| `calendar-grid.tsx` | Main grid view with horizontal scroll, section collapse, cell rendering |
| `calendar-toolbar.tsx` | Date navigation, campus filter, action buttons |
| `calendar-cell.tsx` | Individual cell renderer — dispatches to field-type-specific renderers |
| `calendar-section-header.tsx` | Collapsible section header with accent bar |
| `week-detail.tsx` | Week detail page layout with section cards |
| `series-detail.tsx` | Series detail page with timeline, messaging grid, related content |
| `section-detail.tsx` | Section-focused timeline view |
| `cell-editor.tsx` | Inline edit panel — renders appropriate editor for field type |
| `person-picker.tsx` | Person selection chip component with avatar |
| `series-picker.tsx` | Series selector with color and week info |
| `tag-editor.tsx` | Tag list editor with add/remove |
| `calendar-settings.tsx` | Admin settings for sections, rows, roles |
| `song-list.tsx` | Numbered worship song list renderer |
| `social-media-grid.tsx` | 7-day social media planning grid |
| `event-list.tsx` | Event cards with dots and campus tags |
| `campaign-list.tsx` | Campaign slot cards |

### New Hooks

| Hook | Purpose |
|------|---------|
| `use-calendar.ts` | Query calendar weeks, sections, rows, entries; handle date range pagination |
| `use-calendar-entry.ts` | CRUD for individual entries with optimistic updates |
| `use-calendar-series.ts` | Query/manage series with linked weeks |
| `use-calendar-roles.ts` | Query user roles and section permissions |
| `use-calendar-settings.ts` | Admin CRUD for sections and rows |

---

## Data Flow

### Main Grid Load

1. Query `calendarWeeks` filtered by date range (weekStart >= rangeStart, weekStart <= rangeEnd), ordered by weekStart asc
2. Query `calendarSections` with nested `calendarRows`, ordered by sortOrder
3. Query `calendarEntries` linked to the fetched weeks, with nested row and week links
4. Build grid: sections × rows × weeks, placing entries at intersections
5. Query `calendarSeries` overlapping the date range for series span rendering

### Cell Edit

1. User clicks cell → `cell-editor` opens with current entry data (or empty)
2. User edits → optimistic update via InstantDB transaction
3. Entry `updatedAt` and `updatedBy` set automatically
4. Entry `status` transitions: `empty` → `draft` on first edit, manual toggle to `confirmed`
5. Real-time sync — other users see changes immediately via InstantDB subscriptions

### Week Navigation

1. Prev/Next shifts the date range by 2 months
2. New query fires for the updated range
3. InstantDB handles caching — previously loaded weeks remain available

---

## Future Integration Points

These are not part of MVP but the data model is designed to support them:

- **Rock RMS**: `calendarEntries` with `personPicker` field type can store `rockPersonId` for linking to Rock people. `calendarSeries` can store `rockContentChannelItemId`. `calendarWeeks` can store `scheduleId` linking to Rock schedules.
- **ClickUp**: `calendarEntries` can store `clickupTaskId` for linking cells to ClickUp tasks. Campaign entries could auto-create ClickUp tasks.
- **Planning Center**: Worship song entries could link to Planning Center song IDs and pull set lists.
- **Transcript system**: `calendarWeeks` can link to existing `sessions` entity via the `scheduleId` field, connecting the strategic calendar to live capture sessions.

---

## Mockup References

Visual mockups created during brainstorming are available at:
- `.superpowers/brainstorm/29144-1776111193/content/calendar-grid-v2.html` — Main grid view
- `.superpowers/brainstorm/29144-1776111193/content/week-detail.html` — Week detail view
- `.superpowers/brainstorm/29144-1776111193/content/series-detail.html` — Series detail view
