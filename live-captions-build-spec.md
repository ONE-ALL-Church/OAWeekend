# ONE&ALL Live Captioning System — Build Spec

You are Claude Code. Build this project from scratch. Read this entire document before writing any code. Ask clarifying questions only if something is genuinely ambiguous; otherwise proceed and note assumptions inline.

## Who this is for

ONE&ALL Church (oneandall.church) runs weekend services across three campuses:
- **Main campus**: Saturday evening + three Sunday services
- **Campus 2**: Sunday only
- **Campus 3**: Sunday only

Each campus has a full production setup with a soundboard. The digital director (Brian Davis) wants to replace a paid live-captioning service with a self-built, AI-powered system that is cheaper, more curated to church vocabulary, and extensible toward archival and real-time translation.

## The three phases

Build Phase 1 completely. Scaffold Phase 2 so data is captured from day one. Leave Phase 3 as documented future work.

### Phase 1 — Live captions on screen
Audio from the soundboard is streamed to a cloud function, transcribed in real time, and displayed as captions on a projector/screen in the auditorium. A second browser provides operator control (start/stop, font, position, service metadata, profanity filter toggle).

### Phase 2 — Perpetual archive
Every service produces a stored record: raw audio file, timestamped transcript JSON, generated WebVTT, plus metadata linking it to Rock RMS (campus, schedule/service occurrence, speaker, series, sermon title). This becomes a data layer for future AI applications (sermon search, quote extraction, analytics, feedback).

### Phase 3 — Real-time translation (future)
Fan the transcript stream through a translation model (GPT-4o or Gemini), and optionally TTS, delivered to attendees via a QR code → web app in their chosen language. Do not build this now — just keep the architecture clean so it drops in later.

## Architecture

```
[Soundboard line-out]
        │
        ▼
[Capture laptop: Python capture client]
        │ WebSocket (PCM audio frames + session metadata)
        ▼
[Modal: Python WebSocket endpoint]
        │  ├── Streams audio → Deepgram Nova-3 (streaming STT)
        │  ├── Receives interim + final transcripts w/ word timestamps
        │  ├── Writes transcript events → InstantDB
        │  └── On session end: archives audio + JSON + VTT → Cloudflare R2
        │                       and writes session row back to Rock RMS
        ▼
[InstantDB: realtime sync layer]
        │
        ├──▶ [Display client: Next.js full-screen caption view]
        ├──▶ [Operator client: Next.js admin/config panel]
        └──▶ [Future: per-language translation viewers]
```

**Key separation**: Modal handles audio and compute. InstantDB handles realtime fan-out and UI state. Rock RMS is the system of record for service metadata. Cloudflare R2 is long-term blob storage.

## Stack (locked in — use exactly these)

| Layer | Choice | Why |
|---|---|---|
| Compute / STT orchestration | **Modal** (Python) | Handles WebSocket endpoints, autoscaling, deployment. No infra mgmt. |
| Speech-to-text | **Deepgram Nova-3** streaming API | ~150–300ms first-word latency, keyterm prompting for proper nouns, cheap (~$0.0077/min). |
| Realtime data + sync | **InstantDB** | Fan-out to many displays, offline-cache resilience, built-in persistence. |
| Frontend | **Next.js 15 (App Router) + TypeScript + Tailwind** | Polished, fast to build, great InstantDB SDK. |
| Archive blob storage | **Cloudflare R2** (`cdn.oneandall.church`) | Already in use at the church. |
| System of record | **Rock RMS** via existing MCP / REST API | Source of truth for Campus, Schedule, ContentChannelItem (sermon). |
| Capture client | **Python + sounddevice + websockets** | Runs on a dedicated laptop at each campus soundboard. |

Do not substitute any of these without explicit approval.

## Repository layout

Create a monorepo:

```
oneandall-captions/
├── README.md
├── .env.example
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── apps/
│   ├── web/                        # Next.js: display + operator clients
│   │   ├── app/
│   │   │   ├── display/[sessionId]/page.tsx     # Full-screen captions
│   │   │   ├── operator/page.tsx                # Admin/control panel
│   │   │   ├── operator/[sessionId]/page.tsx    # Per-session control
│   │   │   └── layout.tsx
│   │   ├── lib/
│   │   │   ├── instant.ts                       # InstantDB client + schema
│   │   │   └── rock.ts                          # Rock RMS fetch helpers
│   │   └── components/
│   │       ├── CaptionStream.tsx
│   │       ├── OperatorPanel.tsx
│   │       └── SessionPicker.tsx
│   └── capture/                    # Python capture client
│       ├── capture.py              # Mic/line-in → WebSocket
│       ├── config.yaml             # Campus/device settings
│       └── requirements.txt
├── services/
│   └── modal/                      # Modal deployment
│       ├── app.py                  # Main Modal app entry
│       ├── transcribe.py           # WebSocket endpoint + Deepgram bridge
│       ├── archive.py              # Session-end R2 upload + Rock write-back
│       ├── instant_writer.py       # Helper for pushing events to InstantDB
│       └── requirements.txt
├── packages/
│   └── shared/                     # Shared TS types
│       └── src/types.ts            # Session, TranscriptEvent, etc.
└── docs/
    ├── deployment.md
    ├── rock-integration.md
    └── phase-3-translation.md
```

## Data model (InstantDB schema)

Define in `apps/web/lib/instant.ts`:

```ts
// Entities
sessions: {
  id: string;                    // uuid
  campusId: string;              // Rock CampusId
  campusName: string;            // denormalized for display
  scheduleId: string | null;     // Rock ScheduleId
  sermonTitle: string | null;
  speakerName: string | null;
  rockContentChannelItemId: number | null;
  startedAt: number;             // epoch ms
  endedAt: number | null;
  status: 'idle' | 'live' | 'ended' | 'archived';
  // Operator-controlled display settings
  fontSize: number;              // default 64
  positionVertical: 'top' | 'middle' | 'bottom';  // default 'bottom'
  profanityFilter: boolean;      // default true
  paused: boolean;               // operator can freeze captions
}

transcriptEvents: {
  id: string;
  sessionId: string;             // FK
  kind: 'interim' | 'final';
  text: string;
  startMs: number;               // relative to session start
  endMs: number;
  sequence: number;              // monotonic per session
  createdAt: number;
}

// Keyterm list for Deepgram — edited in operator UI, read by Modal at session start
keyterms: {
  id: string;
  term: string;                  // e.g. "ONE&ALL", pastor names, book of the Bible
  boost: number;                 // 1–5
  active: boolean;
}
```

Keep the InstantDB schema in one file so Modal and Next can both reference shapes (duplicate as Python TypedDicts in `services/modal/schema.py`).

## Modal service — detailed spec

`services/modal/app.py` defines a Modal App with:

1. **A WebSocket endpoint** `/ingest` that:
   - Accepts a session id + capture auth token as query params
   - Expects 16kHz mono linear16 PCM frames (or Opus — confirm with capture client)
   - Opens a Deepgram streaming connection with: `model=nova-3`, `interim_results=true`, `smart_format=true`, `punctuate=true`, `profanity_filter` (from session settings), `keyterm=...` (loaded from InstantDB `keyterms` where active)
   - Forwards audio frames to Deepgram; pipes transcripts back as `transcriptEvents` written to InstantDB
   - Also writes the raw PCM to a Modal Volume for later archival (append to `/audio/{sessionId}.wav`)
   - On socket close or session end signal: triggers `archive_session`

2. **A function** `archive_session(session_id)` that:
   - Reads the raw audio from the Volume, converts to MP3 (save space)
   - Fetches all `final` transcript events for the session from InstantDB
   - Generates a WebVTT file from the final events
   - Uploads all three (mp3, transcript.json, transcript.vtt) to R2 under `transcripts/{campus_slug}/{YYYY-MM-DD}/{session_id}/`
   - Updates the session row in InstantDB: `status = 'archived'`, add R2 URLs
   - Writes a record back to Rock RMS (see Rock Integration below)

3. **A scheduled function** `cleanup_abandoned_sessions` that runs hourly and archives/closes any session that's been `live` but idle for 30+ minutes.

Use Deepgram's Python SDK (`deepgram-sdk>=3`). Use `instant-client` Python SDK if stable; otherwise hit the InstantDB REST admin API. Use `boto3` with R2's S3-compatible endpoint.

Secrets via `modal.Secret`: `DEEPGRAM_API_KEY`, `INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`, `R2_ACCESS_KEY`, `R2_SECRET`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `ROCK_API_KEY`, `ROCK_BASE_URL`, `CAPTURE_AUTH_TOKEN`.

## Capture client — detailed spec

`apps/capture/capture.py` is a small Python script that runs on a dedicated laptop at each campus.

Behavior:
- Reads `config.yaml`: `campus_id`, `campus_name`, `audio_device_name`, `modal_ws_url`, `capture_auth_token`
- On startup, prompts operator (CLI menu or minimal Tk UI) to select today's service from a list fetched via Rock RMS (today's ScheduleOccurrences for this campus)
- Creates a new `session` in InstantDB with that metadata, gets back a session id
- Opens a WebSocket to `{modal_ws_url}/ingest?sessionId={id}&token={auth}`
- Uses `sounddevice.RawInputStream` to capture 16kHz mono PCM from the selected audio device and pipes frames to the WebSocket at 20ms cadence
- Displays a small status window: connection state, audio level meter, "End Service" button
- On "End Service": sends a close frame, flips `session.status = 'ended'`, exits cleanly

This client must be bulletproof: auto-reconnect on WebSocket drop (up to 5 retries with backoff), local buffering of audio during disconnects (max 10s), visible alerts on disconnect.

## Next.js web app — detailed spec

### `/operator` — Session launcher (the primary control surface)
- Auth: simple shared-password gate for now (env var `OPERATOR_PASSWORD`)
- Lists today's planned services (from Rock) per campus
- Shows which have an active capture session, which are archived
- "Open control panel" button per session → `/operator/[sessionId]`
- Manage keyterms (add/edit/remove/toggle active)

### `/operator/[sessionId]` — Live control panel
Subscribes to the session and latest 50 transcript events via InstantDB hooks.
- Live transcript preview (interim in gray, finals in white)
- Font size slider, position toggle, profanity filter toggle, pause button
- Shows connection/audio-level status mirrored from capture client (capture writes heartbeat to session every 2s)
- "End session" button (triggers archive)

### `/display/[sessionId]` — Full-screen caption view
- Designed for the auditorium screen computer, opened in a browser in fullscreen/kiosk mode
- Black background, large text, wrapping to 2–3 lines max, old lines fade out
- Reads operator-controlled font/position/paused from the session row live
- Shows only `final` events. Interims optionally behind a feature flag.
- No chrome, no UI — just captions.

Styling: Tailwind. High-contrast white-on-black by default. Must be readable from 100+ feet. Default font size 64px, minimum 36px, maximum 120px.

## Rock RMS integration

Brian already has Rock MCP access and knows the schema. Use Rock's REST API (`{ROCK_BASE_URL}/api/`) with his API key.

Needed endpoints:
- **GET Campuses**: `/api/Campuses?$select=Id,Name,Guid` — for capture client campus picker and operator UI
- **GET today's schedule occurrences**: query `Schedules` filtered to this weekend + campus
- **GET active ContentChannelItems**: for selecting the sermon/message tied to a session (content channel guid is configurable in env)
- **POST session record**: on archive, create a row in a custom Rock entity or attribute collection. Use a `DefinedType` called "Live Caption Sessions" if one doesn't exist — document this in `docs/rock-integration.md` as a prerequisite Brian sets up in Rock himself.

Write `apps/web/lib/rock.ts` with typed helpers: `getCampuses()`, `getTodaysServices(campusId)`, `getActiveSermonItem(campusId)`.

Document in `docs/rock-integration.md` exactly what Brian needs to create in Rock before first run.

## Environment / setup

`.env.example`:
```
# Modal
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=

# Deepgram
DEEPGRAM_API_KEY=

# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=
INSTANT_ADMIN_TOKEN=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET=
R2_BUCKET=oneandall-transcripts
R2_PUBLIC_BASE=https://cdn.oneandall.church/transcripts

# Rock RMS
ROCK_BASE_URL=https://rock.oneandall.church
ROCK_API_KEY=

# Capture auth (shared secret)
CAPTURE_AUTH_TOKEN=

# Operator auth
OPERATOR_PASSWORD=
```

## Build order (strict — do not skip ahead)

1. **Scaffold the monorepo** (pnpm workspaces, tsconfig, tailwind, shared types)
2. **InstantDB app + schema** — set up Instant, define schema, generate typed client
3. **Modal service skeleton** — deploy a hello-world `/ingest` WebSocket that just echoes; confirm deployable
4. **Deepgram integration** — wire Modal → Deepgram, write interim+final events to InstantDB, test with a Python script that streams a WAV file to the WebSocket
5. **Display page** (`/display/[sessionId]`) — render transcript events from InstantDB full-screen
6. **Operator page** (`/operator/[sessionId]`) — control panel with font/position/pause controls
7. **Capture client** — real Python client with audio-device selection and reconnect
8. **Rock integration** — campus + service metadata on session start
9. **Archive function** — audio + VTT + JSON to R2, session update, Rock write-back
10. **Operator home page** — session launcher, keyterms management
11. **Docs** — `docs/deployment.md` walks through deploying Modal, setting up Instant, configuring each campus laptop. `docs/rock-integration.md` lists prerequisites in Rock. `docs/phase-3-translation.md` sketches how translation would be added.

Get each step working end-to-end before moving to the next. After step 5 the system should already be useful (you can send a WAV file and see captions render).

## Success criteria for Phase 1

- [ ] Operator can start a session tied to a specific campus + service from Rock data
- [ ] Capture laptop streams live mic audio with <1s end-to-end perceived latency on display
- [ ] Display shows clean, readable, full-screen captions with no UI chrome
- [ ] Operator can adjust font, position, pause, and toggle profanity filter and see it reflected within ~500ms
- [ ] Multiple display clients on the same session stay in sync
- [ ] Keyterm list correctly boosts recognition of pastor names and church-specific terms
- [ ] At session end, `.mp3`, `.vtt`, `.json` are in R2 under the documented path
- [ ] A row appears in Rock tying the archive URLs back to the service
- [ ] Capture client survives a 30-second WiFi drop without losing the session

## Guidelines while building

- **TypeScript strict mode everywhere. No `any`.**
- **Tailwind only**, no CSS modules or styled-components.
- Server components for the operator home; client components where realtime subscriptions are needed.
- Keep functions small. Keep files under 300 lines when possible.
- Use `zod` for all runtime validation at boundaries (capture client handshake, Rock responses).
- Every external call (Deepgram, Instant, R2, Rock) gets a typed wrapper in `lib/` with error handling. No raw `fetch` in components.
- Log structured JSON from Modal so it's easy to grep in Modal's log viewer.
- Do **not** put the Deepgram API key in any client code. It lives in Modal only.
- The InstantDB admin token stays server-side (Modal + Next.js route handlers only). Browser clients use the public app id with Instant's built-in permissions.
- Write a README with a 5-minute "get it running locally" path.

## Out of scope for this build

- Phase 3 translation (document, don't build)
- Mobile apps (web only)
- Multi-tenant / multi-church support (single-tenant for ONE&ALL)
- Speaker diarization (nice-to-have, defer)
- Video / livestream overlay integration (Phase 2.5 — document in phase-3 doc as a follow-on)

## Starting task

Begin by creating the monorepo structure, `README.md`, `.env.example`, `pnpm-workspace.yaml`, and the Next.js + Modal skeleton apps. Then propose the InstantDB schema as code and wait for approval before proceeding to step 3. After approval, build straight through the numbered steps.

When in doubt about Rock RMS specifics, ask Brian — he has deep admin access and will answer quickly.
