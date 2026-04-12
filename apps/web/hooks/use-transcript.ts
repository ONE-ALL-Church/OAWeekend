"use client";

import { useCallback, useRef } from "react";
import { id } from "@instantdb/react";
import db from "@/lib/instant";
import type { DeepgramTranscript } from "./use-deepgram";

interface UseTranscriptOptions {
  sessionId: string;
}

export function useTranscript({ sessionId }: UseTranscriptOptions) {
  const sequenceRef = useRef(0);
  const room = db.room("captions", sessionId);
  const publishTranscript = db.rooms.usePublishTopic(room, "transcript");

  const handleTranscript = useCallback(
    (transcript: DeepgramTranscript) => {
      const seq = sequenceRef.current++;

      // Broadcast via InstantDB Topics for low-latency delivery to displays
      publishTranscript({
        kind: transcript.kind,
        text: transcript.text,
        sequence: seq,
        startMs: transcript.startMs,
        endMs: transcript.endMs,
      });

      // Persist final transcripts to InstantDB for archival
      if (transcript.kind === "final") {
        const eventId = id();
        db.transact([
          db.tx.transcriptEvents[eventId].update({
            kind: "final",
            text: transcript.text,
            startMs: transcript.startMs,
            endMs: transcript.endMs,
            sequence: seq,
            createdAt: Date.now(),
          }),
          db.tx.transcriptEvents[eventId].link({
            session: sessionId,
          }),
        ]);
      }
    },
    [sessionId, publishTranscript]
  );

  const resetSequence = useCallback(() => {
    sequenceRef.current = 0;
  }, []);

  return { handleTranscript, resetSequence };
}
