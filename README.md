# OA Weekend

ONE&ALL Church weekend services platform — starting with real-time live captioning.

## Architecture

```
[Dante AVIO USB] → [Campus Laptop Browser] → [Deepgram Nova-3] → [InstantDB] → [Display/Projector]
```

- **Audio Capture**: Browser-based via Web Audio API (AudioWorklet)
- **Speech-to-Text**: Deepgram Nova-3 streaming API (direct browser WebSocket)
- **Real-time Sync**: InstantDB (sessions, transcripts, keyterms)
- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind
- **Hosting**: Vercel
- **System of Record**: Rock RMS

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- InstantDB account (instantdb.com)
- Deepgram API key (deepgram.com)

### Setup

```bash
# Install dependencies
pnpm install

# Copy and fill environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your keys

# Run development server
pnpm dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_INSTANT_APP_ID` | Yes | InstantDB app ID |
| `INSTANT_ADMIN_TOKEN` | Yes | InstantDB admin token |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key (server-only) |
| `OPERATOR_PASSWORD` | Yes | Shared password for operator access |
| `ROCK_BASE_URL` | No | Rock RMS instance URL |
| `ROCK_API_KEY` | No | Rock RMS API key |
| `ROCK_CONTENT_CHANNEL_GUID` | No | Rock content channel for sermons |

## Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Landing page |
| `/login` | No | Operator login |
| `/operator` | Yes | Session dashboard + keyterm management |
| `/operator/[sessionId]` | Yes | Live control panel (font, position, pause) |
| `/capture/[sessionId]` | Yes | Audio capture (runs on soundboard laptop) |
| `/display/[sessionId]` | No | Full-screen captions (runs on projector) |

## Monorepo Structure

```
OAWeekend/
├── apps/web/          # Next.js app
│   ├── app/           # Pages and API routes
│   ├── components/    # UI components
│   ├── hooks/         # React hooks (audio, deepgram, transcripts)
│   ├── lib/           # Server utilities (deepgram, rock)
│   └── workers/       # AudioWorklet processor
├── packages/shared/   # Shared types and constants
└── docs/              # Documentation
```

## How It Works

1. **Operator** creates a session on `/operator`, selecting campus and service metadata
2. **Capture laptop** opens `/capture/[sessionId]`, selects audio input (Dante AVIO USB), starts streaming
3. **AudioWorklet** captures PCM audio, sends to Deepgram via WebSocket
4. **Deepgram** returns real-time transcripts (interim + final)
5. **Transcripts** are broadcast via InstantDB Topics and persisted for archival
6. **Display** at `/display/[sessionId]` shows full-screen captions on the projector
7. **Operator** controls font size, position, pause, profanity filter in real-time
