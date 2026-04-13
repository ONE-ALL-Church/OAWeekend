import { init, type InstaQLEntity } from "@instantdb/react";
import schema, { type AppSchema } from "../instant.schema";

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
});

export default db;

// Utility types for typed entities
export type Session = InstaQLEntity<AppSchema, "sessions">;
export type TranscriptEvent = InstaQLEntity<AppSchema, "transcriptEvents">;
export type Keyterm = InstaQLEntity<AppSchema, "keyterms">;
export type SessionWithTranscripts = InstaQLEntity<
  AppSchema,
  "sessions",
  { transcriptEvents: {} }
>;
