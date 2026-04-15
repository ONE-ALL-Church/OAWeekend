"use client";

import { use, useState, useEffect, useRef } from "react";
import db from "@/lib/instant";
import { useSession } from "@/hooks/use-session";
import { useDisplayBySlug, sendHeartbeat } from "@/hooks/use-displays";
import { CaptionOverlay } from "@/components/caption-display";
import type { CaptionLine } from "@/components/caption-display";
import { HEARTBEAT_INTERVAL_MS } from "@oaweekend/shared";


function DisplayRenderer({
  display,
}: {
  display: {
    id: string;
    name: string;
    activeSessionId?: string;
    theme?: string;
    fontSize?: number;
    positionVertical?: string;
    maxLines?: number;
  };
}) {
  const sessionId = display.activeSessionId || null;
  const { session } = useSession(sessionId ?? "__none__");

  const [completedLines, setCompletedLines] = useState<CaptionLine[]>([]);
  const lineIdRef = useRef(0);
  const prevSessionIdRef = useRef<string | null>(sessionId);

  // Clear caption state when session changes
  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      setCompletedLines([]);
      lineIdRef.current = 0;
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId]);

  // Subscribe to transcript topic
  const room = db.room("captions", sessionId ?? "__none__");
  db.rooms.useTopicEffect(room, "transcript", (msg) => {
    if (!sessionId) return;

    const data = msg as {
      kind: string;
      text: string;
      sequence: number;
      startMs: number;
      endMs: number;
    };

    if (data.kind === "final") {
      setCompletedLines((prev) => [
        ...prev,
        {
          id: lineIdRef.current++,
          text: data.text,
          timestamp: Date.now(),
        },
      ]);
    }
  });

  // Heartbeat
  useEffect(() => {
    sendHeartbeat(display.id);
    const interval = setInterval(() => {
      sendHeartbeat(display.id);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [display.id]);

  const isDark = display.theme !== "light";
  const bgClass = isDark ? "bg-black" : "bg-white";
  const textClass = isDark ? "text-white" : "text-black";
  const mutedTextClass = isDark ? "text-neutral-600" : "text-neutral-400";

  // No active session — idle screen
  if (!sessionId) {
    return (
      <div
        className={`fixed inset-0 ${bgClass} flex flex-col items-center justify-center`}
      >
        <p className={`${mutedTextClass} text-lg font-medium`}>
          {display.name}
        </p>
        <p className={`${mutedTextClass} text-sm mt-2`}>
          Waiting for service...
        </p>
      </div>
    );
  }

  // Session ended or archived
  if (
    session &&
    (session.status === "ended" || session.status === "archived")
  ) {
    return (
      <div
        className={`fixed inset-0 ${bgClass} flex items-center justify-center`}
      >
        <p className={`${mutedTextClass} text-sm`}>Session ended</p>
      </div>
    );
  }

  // Session loading
  if (!session) {
    return (
      <div
        className={`fixed inset-0 ${bgClass} flex items-center justify-center`}
      >
        <p className={`${mutedTextClass} text-sm`}>Connecting...</p>
      </div>
    );
  }

  // Live / idle session — show captions
  return (
    <div className={`fixed inset-0 ${bgClass}`}>
      <CaptionOverlay
        fontSize={display.fontSize ?? 64}
        positionVertical={
          (display.positionVertical as "top" | "middle" | "bottom") ?? "bottom"
        }
        maxLines={display.maxLines ?? 3}
        paused={session.paused ?? false}
        completedLines={completedLines}
        textColorClass={textClass}
      />
    </div>
  );
}

export default function PersistentDisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { display, isLoading } = useDisplayBySlug(slug);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-600 text-sm">Connecting...</p>
      </div>
    );
  }

  if (!display) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-600 text-sm">Display not found</p>
      </div>
    );
  }

  return <DisplayRenderer display={display} />;
}
