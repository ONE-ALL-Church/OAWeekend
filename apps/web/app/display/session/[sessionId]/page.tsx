"use client";

import { use, useState, useCallback, useRef } from "react";
import db from "@/lib/instant";
import { useSession } from "@/hooks/use-session";
import { CaptionOverlay } from "@/components/caption-display";

interface CaptionLine {
  id: number;
  text: string;
  timestamp: number;
}

export default function DisplayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { session } = useSession(sessionId);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const lineIdRef = useRef(0);
  const interimRef = useRef<string>("");

  // Subscribe to transcript topic for low-latency updates
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
        },
      ]);
    } else {
      // Store interim for potential display (currently hidden)
      interimRef.current = data.text;
    }
  });

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-600 text-sm">Connecting...</p>
      </div>
    );
  }

  if (session.status === "ended" || session.status === "archived") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-600 text-sm">Session ended</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <CaptionOverlay
        fontSize={session.fontSize ?? 64}
        positionVertical={
          (session.positionVertical as "top" | "middle" | "bottom") ?? "bottom"
        }
        maxLines={3}
        paused={session.paused ?? false}
        lines={lines}
      />
    </div>
  );
}
