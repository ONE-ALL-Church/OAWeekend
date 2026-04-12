"use client";

import { use, useState } from "react";
import Link from "next/link";
import db from "@/lib/instant";
import { useSession, useSessionUpdate } from "@/hooks/use-session";
import { OperatorPanel } from "@/components/operator-panel";

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

  // Subscribe to live transcript topic
  const room = db.room("captions", sessionId);
  db.rooms.useTopicEffect(room, "transcript", (msg) => {
    const data = msg as { kind: string; text: string };
    setTranscriptLines((prev) => {
      const next = [...prev, data];
      return next.slice(-50); // Keep last 50 lines
    });
  });

  if (isLoading || !session) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-500">Loading session...</p>
      </main>
    );
  }

  const statusColor = {
    idle: "bg-neutral-400",
    live: "bg-green-500",
    ended: "bg-red-400",
    archived: "bg-blue-400",
  }[session.status as string] ?? "bg-neutral-400";

  return (
    <main className="flex flex-1 flex-col p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/operator"
              className="text-sm text-neutral-400 hover:text-neutral-600"
            >
              &larr; Dashboard
            </Link>
          </div>
          <h1 className="text-xl font-bold mt-1">
            {session.campusName} &mdash;{" "}
            {session.sermonTitle ?? "Untitled Session"}
          </h1>
          <p className="text-sm text-neutral-500">
            {session.speakerName ?? "Unknown speaker"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm capitalize">{session.status}</span>
        </div>
      </div>

      {/* Main content: Transcript + Controls */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Transcript preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="text-sm font-medium text-neutral-500 mb-2">
            Live Transcript
          </h2>
          <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-1">
            {transcriptLines.length === 0 ? (
              <p className="text-sm text-neutral-400 italic">
                Waiting for transcript data...
              </p>
            ) : (
              transcriptLines.map((line, i) => (
                <p
                  key={i}
                  className={`text-sm ${
                    line.kind === "interim"
                      ? "text-neutral-400 italic"
                      : "text-neutral-900"
                  }`}
                >
                  {line.text}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="w-72 shrink-0 space-y-6">
          <h2 className="text-sm font-medium text-neutral-500">
            Display Controls
          </h2>
          <OperatorPanel
            fontSize={session.fontSize ?? 64}
            positionVertical={session.positionVertical ?? "bottom"}
            profanityFilter={session.profanityFilter ?? true}
            paused={session.paused ?? false}
            onUpdate={updateSession}
          />

          {/* Quick actions */}
          <div className="space-y-2 pt-4 border-t border-neutral-200">
            <button
              onClick={() =>
                window.open(`/display/${sessionId}`, "_blank")
              }
              className="w-full rounded-lg border border-neutral-300 py-2 text-sm hover:bg-neutral-50 transition-colors"
            >
              Open Display Preview
            </button>
            <button
              onClick={() =>
                window.open(`/capture/${sessionId}`, "_blank")
              }
              className="w-full rounded-lg border border-neutral-300 py-2 text-sm hover:bg-neutral-50 transition-colors"
            >
              Open Capture Page
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
