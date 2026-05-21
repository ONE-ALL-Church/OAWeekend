# Docs Vault - Schema for LLM-Maintained Wiki

This folder is both the team's documentation and the git-tracked Obsidian vault for OAWeekend. Humans direct priorities and verify outcomes; agents maintain structure, cross-links, summaries, and the work log.

## Layer model

1. **Raw sources** - code, PRs, deployments, external APIs, Vercel output, Planning Center data, Rock data, and user direction. Agents read these sources and summarize durable facts here.
2. **The wiki** - everything in `docs/`. It follows the Diataxis model:
   - `tutorials/` - learning paths.
   - `how-to/` - task runbooks.
   - `reference/` - facts, inventories, and system maps.
   - `explanation/` - concepts, architecture, and rationale.
   - `decisions/` - ADRs and durable decisions.
3. **The schema** - this file, plus [index.md](index.md), [log.md](log.md), and [wiki.base](wiki.base).

## Special files

- [index.md](index.md) - content catalog and curated entry points.
- [log.md](log.md) - append-only chronology of ingest, query, lint, deploy, and verification work.
- [wiki.base](wiki.base) - Obsidian Bases query over pages with `type:` frontmatter.

## The three operations

### Ingest

Use this when a new source needs to be absorbed: a feature lands, a deployment happens, an API contract is discovered, or an incident creates durable knowledge.

1. Read the source in full.
2. Decide page type: procedure -> `how-to/`, fact -> `reference/`, rationale -> `explanation/`, decision -> `decisions/`.
3. Update existing pages before creating new pages.
4. Write or update pages in kebab-case with frontmatter.
5. Update [index.md](index.md) when a page deserves top-level discovery.
6. Add reciprocal links where they improve discovery.
7. Append [log.md](log.md) with source, touched pages, validation, and deployment evidence.

### Query

Use this when the human asks a question of the vault.

1. Open [index.md](index.md) first.
2. Read the relevant 2-5 pages fully.
3. Answer with links to the docs used.
4. If the answer is durable and not already captured, add or update the appropriate page and append [log.md](log.md).

### Lint

Use this periodically or when docs drift is suspected.

1. Find orphan pages that are not discoverable from [index.md](index.md).
2. Find stale claims: dates, version numbers, TODOs, in-progress notes, deployment aliases.
3. Find contradictions between docs and current code.
4. Add missing cross-links.
5. Append [log.md](log.md) with a checklist of findings and fixes.

## Work logging standard

- Append at least one [log.md](log.md) entry for each material work session.
- Add checkpoint entries for deployment, merge, production verification, API discovery, or direction changes.
- Include exact PR numbers, commit SHAs, deployment URLs, commands, and validation results when they matter.
- Keep entries concise and grep-friendly.

## Frontmatter convention

```yaml
---
title: Human-Readable Title
type: reference | explanation | how-to | tutorial | decision
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: draft | active | archived
---
```

## Link convention

- Use relative markdown links for docs links so pages work in GitHub and Obsidian.
- Use Obsidian wikilinks only for private notes that do not need GitHub rendering.
- Do not leave dangling links. Create the stub or remove the link.

## What not to do

- Do not duplicate durable facts across several pages. Link to the owning page.
- Do not invent new top-level folders without a clear reason.
- Do not let implementation work finish without logging what changed and how it was verified.
