---
title: Integration Inventory
type: reference
owner: brian.davis@oneandall.church
last_reviewed: 2026-05-21
status: active
---

# Integration Inventory

This page lists external systems and the source files that own their contracts.

## InstantDB

- Client: `apps/web/lib/instant.ts`
- Admin client: `apps/web/lib/instant-admin.ts`
- Schema: `apps/web/instant.schema.ts`
- Permissions: `apps/web/instant.perms.ts`
- Required env vars: `NEXT_PUBLIC_INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`

## Deepgram

- Token API: `apps/web/app/api/deepgram-token/route.ts`
- Helper: `apps/web/lib/deepgram.ts`
- Client hook: `apps/web/hooks/use-deepgram.ts`
- Shared audio constants: `packages/shared/src/constants.ts`
- Required env var: `DEEPGRAM_API_KEY`

## Rock RMS

- Helper: `apps/web/lib/rock.ts`
- API routes: `apps/web/app/api/rock/*`
- Auth routes: `apps/web/app/api/auth/login/route.ts`, `apps/web/app/api/auth/callback/route.ts`, `apps/web/app/api/auth/logout/route.ts`
- Required env vars: `ROCK_BASE_URL`, `ROCK_API_KEY`, `ROCK_CONTENT_CHANNEL_ID`
- Optional env vars: `ROCK_AUTH_GROUP_ID`, `ROCK_WEBHOOK_SECRET`, `ROCK_CLIENT_ID`, `ROCK_CLIENT_SECRET`, `ROCK_OIDC_BASE_URL`
- Owning doc: [Rock RMS Integration](../rock-integration.md)

## Planning Center Services

- Helper: `apps/web/lib/planning-center.ts`
- Week drill-down: `apps/web/app/planning-center/week/[weekStart]/page.tsx`
- Week prefill API: `apps/web/app/api/calendar/week/[weekStart]/prefill-planning-center/route.ts`
- Person lookup API: `apps/web/app/api/calendar/person/[pcoPersonId]/route.ts`
- Shared row definitions: `packages/shared/src/constants.ts`
- Required env vars: `PLANNING_CENTER_CLIENT_ID`, `PLANNING_CENTER_CLIENT_SECRET`
- Optional env vars: `PLANNING_CENTER_BASE_URL`, `PLANNING_CENTER_WEB_BASE_URL`
- Owning doc: [Planning Center Wrapper](../planning-center-wrapper.md)

## Vercel Cron

- Config: `apps/web/vercel.json`
- Handler: `apps/web/app/api/cron/sync-calendar/route.ts`
- Required env var: `CRON_SECRET`
- Current schedule: `0 6 * * *`

## Authentication boundary

- Proxy: `apps/web/proxy.ts`
- Protected pages: `/operator`, `/capture`, `/calendar`, `/planning-center`
- Protected APIs: `/api/deepgram-token`, `/api/calendar/*`, `/api/rock/*`
- Dev-only bypass: `DEV_AUTH_BYPASS=true` or `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`, only when `NODE_ENV !== "production"`
