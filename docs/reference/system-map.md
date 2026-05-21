---
title: System Map
type: reference
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: active
---

# System Map

OAWeekend is a pnpm/turbo monorepo for live captions, weekend planning, and service-data workflows.

## Runtime shape

- `apps/web` - Next.js 16 / React 19 app deployed to Vercel.
- `packages/shared` - shared TypeScript constants and types, including calendar row definitions and Planning Center campus IDs.
- `apps/web/instant.schema.ts` - InstantDB schema for sessions, transcripts, displays, calendar data, and calendar access roles.
- `apps/web/instant.perms.ts` - InstantDB permissions. Display/session read surfaces are public; operator and calendar data require auth.
- `apps/web/proxy.ts` - route protection for operator, capture, calendar, Planning Center, and API routes.

## Primary product surfaces

- `/operator` and `/operator/[sessionId]` - live caption operator flow.
- `/capture/[sessionId]` - browser audio capture flow.
- `/display/[slug]` and `/display/session/[sessionId]` - projector-safe display surfaces.
- `/calendar` - weekend calendar grid and week planning entry point.
- `/calendar/week/[weekStart]` - week detail and source-data entry point.
- `/planning-center/week/[weekStart]` - read-only Planning Center drill-down.

## API surfaces

- `/api/deepgram-token` - issues temporary Deepgram access for caption streaming.
- `/api/rock/*` - Rock-backed campus, service, event, and image reads.
- `/api/calendar/week/[weekStart]/prefill-planning-center` - writes Rock/Planning Center source rows into InstantDB calendar entries.
- `/api/calendar/person/[pcoPersonId]` - Planning Center person lookup helper.
- `/api/cron/sync-calendar` - Vercel Cron entry point for rolling calendar sync.

## Data stores and systems

- InstantDB stores live caption sessions, transcript events, displays, calendar structure, calendar entries, series, and roles.
- Deepgram powers live transcription using the Nova-3 model.
- Rock RMS is the source of truth for campuses, services, sermon metadata, series details, speakers, and featured-event context.
- Planning Center Services is the source of truth for weekend service plans, songs, hosts, worship leaders, plan times, service order, and team assignments.

## Source-of-truth contract

- Rock-first fields: sermon title, series, speaker, featured events, and campus/service metadata.
- Planning Center-first fields: songs, service order, plan times, hosts, worship leaders, and team assignments.
- Calendar rows with `source: "rock"` or `source: "planning-center"` are system-managed and should remain read-only in the interface.
- Hosts and worship leaders are campus sub-rows, not one combined editable row.

## Cron and deployment

- Vercel Cron is configured in `apps/web/vercel.json` for `0 6 * * *`.
- Cron sync creates or finds the rolling 12-week window, then calls the week prefill endpoint sequentially with a 3-second delay.
- Cron authentication uses `Authorization: Bearer $CRON_SECRET`; browser sync requires a valid `instant_token` cookie.
- Last documented production alias: `https://web-lake-five-79.vercel.app` as of 2026-05-21.

## Operational commands

```bash
PATH=/usr/local/bin:$PATH pnpm --filter web lint
PATH=/usr/local/bin:$PATH pnpm --filter web build
PATH=/usr/local/bin:$PATH pnpm test
```

Use [Wiki Log](../log.md) for the latest validation and deployment evidence.
