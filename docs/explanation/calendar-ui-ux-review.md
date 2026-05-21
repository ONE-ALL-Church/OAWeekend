---
title: Calendar UI UX Review
type: explanation
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: active
---

# Calendar UI UX Review

Review target: `/calendar` strategic calendar grid.

## Current Fixes

- The far-left row-header column must stay visible during horizontal scrolling. This applies to the `Date` header, section headers, parent rows, normal row labels, and Rock event row labels.
- The sticky row-header column needs a stronger right boundary so users can tell the labels are pinned above the horizontally scrolling week cells.
- The top toolbar must sit above sticky grid layers and wrap gracefully when the viewport is narrower.

## Findings

- The grid is intentionally dense, but without sticky row labels users lose row context after scrolling right across multiple weeks.
- `R` and `PC` badges are useful, but they need a visible legend or source explanation near the grid for non-technical users.
- The month/week headers help orientation horizontally, but the long page still loses column context during vertical scrolling. A future pass should evaluate sticky vertical grid headers below the toolbar.
- The campus filter needs a behavior audit. The current UX implies it filters campus rows, but the calendar has a mix of Rock campus ids, Planning Center campus ids, campus-specific rows, and campus sub-rows.
- Hover cards add useful detail, but they are mouse-first. A later accessibility pass should add keyboard/focus behavior and table-like semantics for the grid.
- `Sync PCO/Rock` is operationally important and should eventually show per-week progress, last-sync status, and failure detail instead of only a temporary button label.

## Recommendation

Keep the calendar as the high-density overview. Use the Planning Center wrapper and week drill-downs for detailed inspection, source comparison, and lower-density workflows.
