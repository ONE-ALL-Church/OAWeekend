import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    sessions: i.entity({
      campusId: i.string(),
      campusName: i.string(),
      scheduleId: i.string().optional(),
      sermonTitle: i.string().optional(),
      speakerName: i.string().optional(),
      rockContentChannelItemId: i.number().optional(),
      startedAt: i.number(),
      endedAt: i.number().optional(),
      status: i.string(), // 'idle' | 'live' | 'ended' | 'archived'
      fontSize: i.number(),
      positionVertical: i.string(), // 'top' | 'middle' | 'bottom'
      profanityFilter: i.boolean(),
      paused: i.boolean(),
    }),
    transcriptEvents: i.entity({
      kind: i.string(), // 'interim' | 'final'
      text: i.string(),
      startMs: i.number(),
      endMs: i.number(),
      sequence: i.number(),
      createdAt: i.number(),
    }),
    keyterms: i.entity({
      term: i.string(),
      boost: i.number(),
      active: i.boolean(),
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
  },
  rooms: {
    captions: {
      presence: i.entity({
        role: i.string(), // 'capture' | 'display' | 'operator'
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

export default schema;
export type Schema = typeof schema;
