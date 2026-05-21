# Wiki Log

Append-only chronology of ingest / query / lint / deploy / verification passes. Newest at the bottom. Grep-friendly.

Format:

```md
## [YYYY-MM-DD] {ingest|query|lint|deploy|verification} | {title}

- Touched: [page](path)
- Notes: ...
```

---

## [2026-05-21] ingest | Planning Center and Rock source-data baseline

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), [Rock RMS Integration](rock-integration.md), [Phase Roadmap](phase-roadmap.md)
- Notes: Captured the current source-of-truth contract after the Planning Center/Rock calendar work. Planning Center feeds read-only calendar rows for songs, campus hosts, campus worship leaders, plan times, people, and service order. Rock remains the first source for sermon, series, speaker, and featured-event metadata where available. Production alias last verified in this workstream: `https://web-lake-five-79.vercel.app`. Relevant merged PRs: `#14` Planning Center source drill-down, `#15` calendar cron failure reporting, `#16` cron throttling. Production cron sync was verified with 12 weeks and 0 failures.

## [2026-05-21] ingest | Obsidian vault bootstrap

- Touched: [index.md](index.md), [wiki-schema.md](wiki-schema.md), [Agent Quickstart](agents/start-here.md), [System Map](reference/system-map.md), [Integration Inventory](reference/integration-inventory.md), [ADR-0001](decisions/ADR-0001-docs-vault-as-work-log.md), this file
- Notes: Converted `docs/` into the git-tracked Obsidian vault for OAWeekend, mirroring the RockProduction pattern: Dataview/Templater enabled, root index, schema, append-only log, reference inventory, and agent quickstart. Established that future material work must update docs and append log entries with validation and deploy evidence. Obsidian CLI caveat: multiple known vaults on this machine are named `docs`, so agents must verify the active vault path before CLI writes.

## [2026-05-21] ingest | Planning Center wrapper entry point

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), [System Map](reference/system-map.md), [Integration Inventory](reference/integration-inventory.md), [Phase Roadmap](phase-roadmap.md), this file
- Notes: Added `/planning-center` as the protected wrapper landing page with a rolling weekend selector outside the calendar. Updated `/planning-center/week/[weekStart]` to use campus tabs, previous/next wrapper navigation, item-level service order panels, richer song metadata, and Planning Center person/item deep links while preserving read-only source data boundaries.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local Chrome smoke rendered `/planning-center`, loaded `/planning-center/week/2026-05-23`, and expanded a song item panel with description, notes, metadata, and Planning Center item link.

## [2026-05-21] ingest | Planning Center wrapper search

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), [System Map](reference/system-map.md), [Integration Inventory](reference/integration-inventory.md), [Phase Roadmap](phase-roadmap.md), this file
- Notes: Added `/planning-center?q=...` read-only search for exact dates/week starts, numeric Planning Center plan ids, and Planning Center plan URLs. Week/date searches normalize to the matching Saturday wrapper route. Plan id and URL searches do direct lookups across configured campus service types and return campus-specific wrapper and Planning Center links.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local HTTP smoke rendered `/planning-center?q=2026-05-23`, `/planning-center?q=87349503`, and `/planning-center?q=https://services.planningcenteronline.com/plans/87349503`; exact plan lookup returned San Dimas plan `87349503` with wrapper link `/planning-center/week/2026-05-23?campus=san-dimas`.

## [2026-05-21] ingest | Planning Center source comparison panel

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), [System Map](reference/system-map.md), [Integration Inventory](reference/integration-inventory.md), [Phase Roadmap](phase-roadmap.md), this file
- Notes: Added a read-only comparison panel to `/planning-center/week/[weekStart]` that compares expected Rock/Planning Center source values against the current stored InstantDB calendar source rows. The panel surfaces matched, review, and missing states for system-managed rows without adding any write path.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local HTTP smoke returned `HTTP 200` for `/planning-center/week/2026-05-23` and rendered Source comparison, Managed Row Diff, Empty managed rows, and San Dimas songs content.

## [2026-05-21] ingest | Calendar grid UI UX review

- Touched: [Calendar UI UX Review](explanation/calendar-ui-ux-review.md), this file
- Notes: Reviewed `/calendar` after browser feedback that the far-left `Date` column scrolled away. Implemented sticky row-header behavior for the month/date headers, section headers, parent rows, normal row labels, and Rock event row labels. Raised the toolbar above grid sticky layers and improved toolbar wrapping for narrower viewports.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local HTTP smoke returned `HTTP 200` for `/calendar`; fully populated local grid render requires real InstantDB auth, so sticky behavior was verified by code-level class audit and production build/type checks.

## [2026-05-21] ingest | Calendar event pill overflow fix

- Touched: [Calendar UI UX Review](explanation/calendar-ui-ux-review.md), this file
- Notes: Fixed `/calendar` Rock event pills so long event names truncate inside the week cell instead of widening or bleeding across neighboring columns. Hover-card action links now wrap inside the card, and the card is constrained to the viewport height/width.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local HTTP smoke returned `HTTP 200` for `/calendar`.

## [2026-05-21] ingest | Planning Center week workspace redesign

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), this file
- Notes: Rebuilt `/planning-center/week/[weekStart]` around the actual campus service plan instead of the source-audit panel. Campus tabs are sticky, service order renders before secondary source details, source health is collapsed unless drift/errors exist, plan times and team assignments are grouped behind disclosure controls, and Planning Center source values remain read-only.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local visual smoke captured `/tmp/pco-week-redesign-804-top-v2.png`, `/tmp/pco-week-redesign-804-full-v2.png`, and `/tmp/pco-week-redesign-desktop-v2.png` from `http://localhost:3001/planning-center/week/2026-03-21`.

## [2026-05-21] ingest | Planning Center service-row cleanup

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), this file
- Notes: Removed redundant service-row metadata from `/planning-center/week/[weekStart]`: generic `ITEM` and `HEADER` pills no longer render, header rows no longer show empty duration pills, and repeated `Planning Center link` summary copy was removed while keeping the expanded Planning Center deep link.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local visual smoke captured `/tmp/pco-week-row-cleanup-804.png` from `http://localhost:3001/planning-center/week/2026-03-21?campus=san-dimas`.

## [2026-05-21] ingest | Planning Center header sections

- Touched: [Planning Center Wrapper](planning-center-wrapper.md), this file
- Notes: Changed `/planning-center/week/[weekStart]` service order from flat rows into collapsible sections keyed by Planning Center header rows. Header rows no longer show sequence numbers and instead control the visibility of their underlying service items.
- Validation: `git diff --check`, docs markdown link check, `PATH=/usr/local/bin:$PATH pnpm --filter web lint` (existing warnings only), `PATH=/usr/local/bin:$PATH pnpm --filter web build`, and `PATH=/usr/local/bin:$PATH pnpm test`. Local visual smoke captured `/tmp/pco-week-header-sections-rancho-1025.png` from `http://localhost:3001/planning-center/week/2026-03-21?campus=rancho-cucamonga`.
