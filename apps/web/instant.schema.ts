import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    sessions: i.entity({
      campusId: i.string().indexed(),
      campusName: i.string(),
      scheduleId: i.string().optional(),
      sermonTitle: i.string().optional(),
      speakerName: i.string().optional(),
      rockContentChannelItemId: i.number().optional(),
      startedAt: i.number().indexed(),
      endedAt: i.number().optional(),
      status: i.string().indexed(),
      fontSize: i.number(),
      positionVertical: i.string(),
      maxDurationMinutes: i.number(),
      profanityFilter: i.boolean(),
      paused: i.boolean(),
    }),
    transcriptEvents: i.entity({
      kind: i.string().indexed(),
      text: i.string(),
      startMs: i.number(),
      endMs: i.number(),
      sequence: i.number().indexed(),
      createdAt: i.number().indexed(),
    }),
    keyterms: i.entity({
      term: i.string(),
      boost: i.number(),
      active: i.boolean(),
    }),
    displays: i.entity({
      name: i.string(),
      slug: i.string().unique().indexed(),
      campusId: i.string().indexed(),
      campusName: i.string(),
      activeSessionId: i.string().optional(),
      theme: i.string(),
      fontSize: i.number(),
      positionVertical: i.string(),
      maxLines: i.number(),
      lastSeenAt: i.number().optional(),
      createdAt: i.number().indexed(),
    }),
    calendarSections: i.entity({
      name: i.string(),
      slug: i.string().unique().indexed(),
      sortOrder: i.number().indexed(),
      color: i.string(),
      createdAt: i.number().indexed(),
      updatedAt: i.number(),
    }),
    calendarRows: i.entity({
      name: i.string(),
      slug: i.string().indexed(),
      sortOrder: i.number().indexed(),
      fieldType: i.string().indexed(),
      campusSpecific: i.boolean(),
      createdAt: i.number().indexed(),
    }),
    calendarWeeks: i.entity({
      weekStart: i.string().indexed(),
      label: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
    calendarEntries: i.entity({
      content: i.string(),
      notes: i.string().optional(),
      status: i.string().indexed(),
      updatedAt: i.number().indexed(),
      updatedBy: i.string().optional(),
    }),
    calendarSeries: i.entity({
      name: i.string(),
      description: i.string().optional(),
      color: i.string(),
      startWeek: i.string().indexed(),
      endWeek: i.string().indexed(),
      createdAt: i.number().indexed(),
    }),
    calendarRoles: i.entity({
      name: i.string(),
      createdAt: i.number().indexed(),
    }),
  },
  links: {
    sessionTranscriptEvents: {
      forward: {
        on: "sessions",
        has: "many",
        label: "transcriptEvents",
      },
      reverse: {
        on: "transcriptEvents",
        has: "one",
        label: "session",
      },
    },
    sessionCreator: {
      forward: {
        on: "sessions",
        has: "one",
        label: "creator",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "createdSessions",
      },
    },
    displaySession: {
      forward: {
        on: "displays",
        has: "one",
        label: "activeSession",
      },
      reverse: {
        on: "sessions",
        has: "many",
        label: "displays",
      },
    },
    sectionRows: {
      forward: { on: "calendarSections", has: "many", label: "rows" },
      reverse: { on: "calendarRows", has: "one", label: "section" },
    },
    entryWeek: {
      forward: { on: "calendarEntries", has: "one", label: "week" },
      reverse: { on: "calendarWeeks", has: "many", label: "entries" },
    },
    entryRow: {
      forward: { on: "calendarEntries", has: "one", label: "row" },
      reverse: { on: "calendarRows", has: "many", label: "entries" },
    },
    entryUpdater: {
      forward: { on: "calendarEntries", has: "one", label: "updater" },
      reverse: { on: "$users", has: "many", label: "updatedEntries" },
    },
    seriesWeeks: {
      forward: { on: "calendarSeries", has: "many", label: "weeks" },
      reverse: { on: "calendarWeeks", has: "many", label: "series" },
    },
    roleSections: {
      forward: { on: "calendarRoles", has: "many", label: "sections" },
      reverse: { on: "calendarSections", has: "many", label: "roles" },
    },
    roleMembers: {
      forward: { on: "calendarRoles", has: "many", label: "members" },
      reverse: { on: "$users", has: "many", label: "calendarRoles" },
    },
  },
  rooms: {
    captions: {
      presence: i.entity({
        role: i.string(),
      }),
      topics: {
        transcript: i.entity({
          kind: i.string(),
          text: i.string(),
          sequence: i.number(),
          startMs: i.number(),
          endMs: i.number(),
        }),
      },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
