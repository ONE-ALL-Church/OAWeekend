# Rock RMS Integration

## Overview

Rock RMS serves as the system of record for campus, schedule, and sermon metadata. The OA Weekend platform reads from Rock to populate session creation with accurate service information.

## Prerequisites

Before first run, ensure the following in Rock RMS:

1. **API Key**: Create a REST API key with read access to:
   - `Campuses` (Id, Name, Guid)
   - `Schedules` (Id, Name, iCalendarContent)
   - `ContentChannelItems` (Id, Title, StartDateTime, Status)

2. **Content Channel**: Identify the GUID of the Content Channel used for sermons/messages. Set this as `ROCK_CONTENT_CHANNEL_GUID` in your environment.

3. **Phase 2 - Archive Write-Back**: Create a DefinedType called "Live Caption Sessions" with attributes for storing archive URLs. This is not needed for Phase 1.

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/Campuses` | List all campuses |
| `GET /api/Schedules` | List today's service schedules |
| `GET /api/ContentChannelItems` | List active sermon items |

## Environment Variables

```
ROCK_BASE_URL=https://rock.oneandall.church
ROCK_API_KEY=your-api-key-here
ROCK_CONTENT_CHANNEL_GUID=your-content-channel-guid
```

## Helper Functions

Located in `apps/web/lib/rock.ts`:

- `getCampuses()` — Returns all campuses
- `getTodaysServices(campusId?)` — Returns today's scheduled services
- `getActiveSermonItems()` — Returns recent sermon content channel items

All responses are validated with Zod schemas and cached for 5 minutes via Next.js `revalidate`.
