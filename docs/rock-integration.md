# Rock RMS Integration

## Overview

Rock RMS serves as the system of record for campus, service, sermon, series, speaker, and featured-event metadata. The OA Weekend platform reads from Rock to populate session creation, calendar source rows, and event/campaign context.

## Prerequisites

Before first run, ensure the following in Rock RMS:

1. **API Key**: Create a REST API key with read access to Rock v2 model search and attribute-value reads for:
   - `campuses`
   - `personaliases`
   - `groupmembers`
   - `contentchannelitems`
   - `eventcalendaritems`
   - `eventitems`
   - `eventitemoccurrences`
   - `schedules`

2. **Content Channel**: Identify the numeric Content Channel ID used for sermons/messages. Set this as `ROCK_CONTENT_CHANNEL_ID` in your environment.

3. **Phase 2 - Archive Write-Back**: Create a DefinedType called "Live Caption Sessions" with attributes for storing archive URLs. This is not needed for Phase 1.

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v2/models/{entity}/search` | Query Rock models with filtered/sorted v2 search |
| `GET /api/v2/models/{entity}/{id}/attributevalues` | Resolve sermon, series, and event attributes |
| `GET /Webhooks/Lava.ashx/oa-weekend/featured-events` | Preferred featured-events feed when `ROCK_WEBHOOK_SECRET` is configured |

## Environment Variables

```
ROCK_BASE_URL=https://your-rock-instance.example.com
ROCK_API_KEY=your-api-key-here
ROCK_CONTENT_CHANNEL_ID=5
ROCK_AUTH_GROUP_ID=2
ROCK_WEBHOOK_SECRET=shared-secret-for-featured-events
```

## Helper Functions

Located in `apps/web/lib/rock.ts`:

- `getCampuses()` — Returns all campuses
- `getWeekendServices()` — Returns recent approved/pending sermon content items with speaker attributes
- `getSermonForWeek(weekStart)` — Returns sermon title, speaker, and active series for a Saturday week start
- `isAuthorizedGroupMember(sub)` — Resolves OIDC subject to a Rock person and checks group membership
- `getFeaturedEvents()` — Returns featured events via the Lava webhook, falling back to Rock v2 search

Responses are validated with Zod schemas and most Rock reads use a 5-minute Next.js `revalidate`.
