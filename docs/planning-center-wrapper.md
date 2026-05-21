---
title: Planning Center Wrapper
type: reference
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: active
---

# Planning Center Wrapper

## Current State

OA Weekend has two Planning Center surfaces:

- Calendar prefill: `POST /api/calendar/week/[weekStart]/prefill-planning-center`
- Read-only drill-down: `/planning-center/week/[weekStart]`

The calendar prefill writes source-of-truth rows only. These rows are not editable in the calendar UI and are overwritten on every sync:

- Songs 1-4: Planning Center, San Dimas source of truth
- Hosts: Planning Center, one campus sub-row per campus
- Worship leaders: Planning Center, one campus sub-row per campus
- Series and sermon title: Rock first, Planning Center fallback
- Speaker: Rock only

## Data Pulled From Planning Center

`apps/web/lib/planning-center.ts` currently pulls these service-plan surfaces:

- Plan metadata: campus, plan id, dates, series title, plan title, week label, total length
- Songs: title, key, author, CCLI, themes, previous scheduling label, description, duration, song leader, source URL
- Full service order: sequence, title, item type, key, duration, description, notes, linked song metadata, item source URL
- People: hosts, worship leaders, and all active team assignments by role
- Times: all plan times plus filtered service-time labels

## Auth And Write Boundaries

Calendar pages, Planning Center pages, and calendar write APIs are protected by `apps/web/proxy.ts`.

The prefill endpoint also verifies write access server-side:

- Browser/user sync requires a valid `instant_token` cookie.
- Cron sync requires `Authorization: Bearer $CRON_SECRET`.
- The daily cron route forwards that bearer token to the prefill endpoint.

## Next Wrapper Direction

The next practical slice is to turn the read-only drill-down into a wrapper around the service plan:

- Add a week list or service-plan search entry point outside the calendar.
- Add campus tabs and item-level detail panels for songs, notes, people, and times.
- Add Planning Center deep links at every level.
- Keep OA Weekend writes separate from Planning Center writes until there is an explicit edit workflow and audit trail.
