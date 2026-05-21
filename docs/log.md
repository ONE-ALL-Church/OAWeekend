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
