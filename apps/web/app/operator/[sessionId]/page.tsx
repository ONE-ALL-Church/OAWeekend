"use client";

import { use, useState } from "react";
import Link from "next/link";
import db from "@/lib/instant";
import { useSession, useSessionUpdate } from "@/hooks/use-session";
import { SessionControls } from "@/components/operator-panel";
import { DisplayAssignment } from "@/components/display-assignment";

export default function OperatorSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { session, isLoading } = useSession(sessionId);
  const { updateSession } = useSessionUpdate(sessionId);
  const [transcriptLines, setTranscriptLines] = useState<
    { kind: string; text: string }[]
  >([]);

  const room = db.room("captions", sessionId);
  db.rooms.useTopicEffect(room, "transcript", (msg) => {
    const data = msg as { kind: string; text: string };
    setTranscriptLines((prev) => {
      const next = [...prev, data];
      return next.slice(-50);
    });
  });

  if (isLoading || !session) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Loading session...</p>
      </main>
    );
  }

  const statusConfig: Record<string, { dot: string; label: string }> = {
    idle: { dot: "bg-oa-stone-300", label: "Idle" },
    live: { dot: "bg-green-500 animate-pulse", label: "Live" },
    ended: { dot: "bg-oa-coral", label: "Ended" },
    archived: { dot: "bg-oa-blue", label: "Archived" },
  };
  const config = statusConfig[session.status] ?? statusConfig.idle;

  return (
    <main className="flex flex-1 flex-col p-6 lg:p-8 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/operator"
            className="inline-flex items-center gap-1 text-sm text-oa-black-700 hover:text-oa-black-900 transition-colors duration-150"
          >
            <span>&larr;</span> Dashboard
          </Link>
          <h1 className="text-xl font-bold tracking-tight">
            {session.campusName} &mdash;{" "}
            {session.sermonTitle ?? "Untitled Session"}
          </h1>
          <p className="text-sm text-oa-black-700">
            {session.speakerName ?? "Unknown speaker"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-oa-white border border-oa-stone-200 px-4 py-2 shadow-[--shadow-card]">
          <div className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Transcript */}
        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700 mb-3">
            Live Transcript
          </h2>
          <div className="flex-1 overflow-y-auto rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-5 space-y-1.5 shadow-[--shadow-card]">
            {transcriptLines.length === 0 ? (
              <p className="text-sm text-oa-stone-300 italic">
                Waiting for transcript data...
              </p>
            ) : (
              transcriptLines.map((line, i) => (
                <p
                  key={i}
                  className={`text-sm leading-relaxed ${
                    line.kind === "interim"
                      ? "text-oa-stone-300 italic"
                      : "text-oa-black-900"
                  }`}
                >
                  {line.text}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          <SessionControls
            profanityFilter={session.profanityFilter ?? true}
            paused={session.paused ?? false}
            onUpdate={updateSession}
          />

          <DisplayAssignment
            sessionId={sessionId}
            campusId={session.campusId}
          />

          {/* Quick actions */}
          <div className="space-y-2">
            <button
              onClick={() =>
                window.open(`/display/session/${sessionId}`, "_blank")
              }
              className="w-full rounded-[--radius-button] border border-oa-stone-200 bg-oa-white py-2.5 text-sm font-medium text-oa-black-900 hover:bg-oa-stone-100 transition-colors duration-150 shadow-[--shadow-card]"
            >
              Open Display Preview
            </button>
            <button
              onClick={() =>
                window.open(`/capture/${sessionId}`, "_blank")
              }
              className="w-full rounded-[--radius-button] border border-oa-stone-200 bg-oa-white py-2.5 text-sm font-medium text-oa-black-900 hover:bg-oa-stone-100 transition-colors duration-150 shadow-[--shadow-card]"
            >
              Open Capture Page
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
