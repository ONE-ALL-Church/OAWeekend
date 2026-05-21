"use client";

import { use, useState, useEffect, useRef } from "react";
import db from "@/lib/instant";
import { useSession } from "@/hooks/use-session";
import { useDisplayBySlug, sendHeartbeat } from "@/hooks/use-displays";
import { CaptionOverlay, type CaptionLine } from "@/components/caption-display";
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
      <SessionCaptionStream
        key={sessionId}
        sessionId={sessionId}
        fontSize={display.fontSize ?? 64}
        positionVertical={
          (display.positionVertical as "top" | "middle" | "bottom") ?? "bottom"
        }
        maxLines={display.maxLines ?? 3}
        paused={session.paused ?? false}
        textColorClass={textClass}
      />
    </div>
  );
}

function SessionCaptionStream({
  sessionId,
  fontSize,
  positionVertical,
  maxLines,
  paused,
  textColorClass,
}: {
  sessionId: string;
  fontSize: number;
  positionVertical: "top" | "middle" | "bottom";
  maxLines: number;
  paused: boolean;
  textColorClass: string;
}) {
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const lineIdRef = useRef(0);
  const interimRef = useRef<string>("");

  const room = db.room("captions", sessionId);
  db.rooms.useTopicEffect(room, "transcript", (msg) => {
    const data = msg as {
      kind: string;
      text: string;
      sequence: number;
      startMs: number;
      endMs: number;
    };

    if (data.kind === "final") {
      interimRef.current = "";
      setLines((prev) => [
        ...prev,
        {
          id: lineIdRef.current++,
          text: data.text,
          timestamp: Date.now(),
          startMs: data.startMs,
          endMs: data.endMs,
        },
      ]);
    } else {
      interimRef.current = data.text;
    }
  });

  return (
    <CaptionOverlay
      fontSize={fontSize}
      positionVertical={positionVertical}
      maxLines={maxLines}
      paused={paused}
      lines={lines}
      textColorClass={textColorClass}
    />
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
