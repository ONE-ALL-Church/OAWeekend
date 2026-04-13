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
export type Display = InstaQLEntity<AppSchema, "displays">;
export type DisplayWithSession = InstaQLEntity<AppSchema, "displays", { activeSession: {} }>;
export type CalendarSection = InstaQLEntity<AppSchema, "calendarSections">;
export type CalendarSectionWithRows = InstaQLEntity<
  AppSchema,
  "calendarSections",
  { rows: {} }
>;
export type CalendarRow = InstaQLEntity<AppSchema, "calendarRows">;
export type CalendarWeek = InstaQLEntity<AppSchema, "calendarWeeks">;
export type CalendarWeekWithEntries = InstaQLEntity<
  AppSchema,
  "calendarWeeks",
  { entries: { row: {} }; series: {} }
>;
export type CalendarEntry = InstaQLEntity<AppSchema, "calendarEntries">;
export type CalendarEntryWithLinks = InstaQLEntity<
  AppSchema,
  "calendarEntries",
  { week: {}; row: {} }
>;
export type CalendarSeries = InstaQLEntity<AppSchema, "calendarSeries">;
export type CalendarSeriesWithWeeks = InstaQLEntity<
  AppSchema,
  "calendarSeries",
  { weeks: {} }
>;
export type CalendarRole = InstaQLEntity<AppSchema, "calendarRoles">;
export type CalendarRoleWithMembers = InstaQLEntity<
  AppSchema,
  "calendarRoles",
  { members: {}; sections: {} }
>;
