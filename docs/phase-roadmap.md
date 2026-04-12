# Phase Roadmap

## Phase 1 — Live Captions on Screen (Current)

- [x] Browser-based audio capture from Dante AVIO USB
- [x] Deepgram Nova-3 streaming transcription
- [x] Full-screen display view for projectors
- [x] Operator control panel (font, position, pause, profanity filter)
- [x] Session management dashboard
- [x] Keyterm vocabulary boosting
- [x] Rock RMS integration for campus/service metadata
- [x] Shared password authentication

## Phase 2 — Perpetual Archive

- [ ] MediaRecorder in capture page for audio recording
- [ ] Upload audio blobs to Cloudflare R2 on session end
- [ ] Generate WebVTT files from persisted transcript events
- [ ] Generate transcript JSON exports
- [ ] Write archive records back to Rock RMS (custom DefinedType)
- [ ] Raspberry Pi + AVIO USB as dedicated capture devices
- [ ] Add Supabase or similar for analytics queries
- [ ] Sermon search (full-text search on transcripts)
- [ ] Planning Center data sync

## Phase 3 — Real-Time Translation (Future)

- [ ] Fan transcripts through translation API (Claude, GPT-4o, or Gemini)
- [ ] Language-specific broadcast channels (e.g., `session:{id}:es`)
- [ ] QR code → web app for attendees to choose language
- [ ] Optional text-to-speech for translated captions
- [ ] Per-language display views

## Future Platform Ideas

- Live stats dashboards for staff
- Dynamic data sync between Planning Center and Rock RMS
- Attendance analytics
- Quote extraction from sermon transcripts
- Feedback collection tools
