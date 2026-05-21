---
title: Agent Quickstart
type: tutorial
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: active
---

# Agent Quickstart

Use this page to orient quickly before changing anything.

## 1. Get context

- Read repository-level `AGENTS.md`.
- Read [System Map](../reference/system-map.md).
- Read [Integration Inventory](../reference/integration-inventory.md).
- Read [Wiki Log](../log.md) for the latest deploy and verification trail.

## 2. Confirm scope

- Identify the owning app, route, API, or integration before editing.
- Verify whether a runbook or reference doc already exists.
- Update existing docs before creating new pages.

## 3. Capture durable knowledge

After material work, update docs with:

- What changed.
- Why it changed.
- Where the source-of-truth files live.
- How it was validated.
- PR, commit, deploy URL, and production verification when applicable.

## 4. Use consistent page types

- Procedure: put it in `how-to/`.
- Fixed facts: put them in `reference/`.
- Rationale: put it in `explanation/`.
- Major decision: add an ADR in `decisions/`.

## 5. Local command notes

- Prefer `PATH=/usr/local/bin:$PATH pnpm --filter web lint` for web linting.
- Prefer `PATH=/usr/local/bin:$PATH pnpm --filter web build` for web builds.
- Run build and type generation sequentially; avoid concurrent commands that race on `.next/types`.
- For Vercel CLI operations, run from the repo root unless the project config says otherwise.
- Several known Obsidian vaults on this machine are named `docs`; before using `obsidian vault=docs ...`, run `obsidian vaults verbose` and verify the active path is `/Users/briand/Documents/GitHub/OAWeekend/docs`.
