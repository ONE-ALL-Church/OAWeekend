---
title: "ADR-0001: Docs Vault as Work Log"
type: decision
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: active
---

# ADR-0001: Docs Vault as Work Log

## Status

Accepted.

## Context

OAWeekend is moving from one-off implementation threads into a longer-running product surface that will connect Rock RMS, Planning Center, live captions, calendar planning, and future service-plan wrapper workflows. Work needs to be traceable across reboots, agents, PRs, deploys, and production verification.

## Decision

Use `docs/` as the git-tracked Obsidian vault and project memory layer. Every material implementation session should update the relevant docs and append [Wiki Log](../log.md) with validation and deployment evidence.

## Consequences

- Future agents start from [Agent Quickstart](../agents/start-here.md), [System Map](../reference/system-map.md), and [Wiki Log](../log.md).
- Durable facts live in docs instead of being buried only in chat history.
- PRs that materially change integrations, architecture, or deployment behavior should include documentation updates.
- Log entries stay concise and append-only so the history remains auditable.
