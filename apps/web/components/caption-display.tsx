"use client";

import { useState, useEffect, useRef } from "react";

interface CaptionLine {
  id: number;
  text: string;
  timestamp: number;
}

interface CaptionDisplayProps {
  fontSize: number;
  positionVertical: "top" | "middle" | "bottom";
  maxLines?: number;
}

export function CaptionDisplay({
  fontSize,
  positionVertical,
  maxLines = 3,
}: CaptionDisplayProps) {
  // This component exposes an imperative API via ref or context
  // The lines are managed by the parent via the addLine function
  return null; // Used as a sub-component; see CaptionOverlay below
}

interface CaptionOverlayProps {
  fontSize: number;
  positionVertical: "top" | "middle" | "bottom";
  maxLines?: number;
  paused: boolean;
  lines: CaptionLine[];
  textColorClass?: string;
}

const FADE_DURATION = 500;
const LINE_MAX_AGE = 8000; // Lines fade after 8 seconds

export function CaptionOverlay({
  fontSize,
  positionVertical,
  maxLines = 3,
  paused,
  lines,
  textColorClass = "text-white",
}: CaptionOverlayProps) {
  const [visibleLines, setVisibleLines] = useState<CaptionLine[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    setVisibleLines(lines.slice(-maxLines));
  }, [lines, maxLines, paused]);

  // Periodically remove old lines
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (paused) return;
      const now = Date.now();
      setVisibleLines((prev) =>
        prev.filter((l) => now - l.timestamp < LINE_MAX_AGE)
      );
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const positionClass = {
    top: "items-start pt-[10vh]",
    middle: "items-center",
    bottom: "items-end pb-[10vh]",
  }[positionVertical];

  return (
    <div
      className={`fixed inset-0 flex flex-col justify-center ${positionClass}`}
    >
      <div className="w-full px-[5vw] text-center">
        {visibleLines.map((line) => {
          const age = Date.now() - line.timestamp;
          const opacity = age > LINE_MAX_AGE - FADE_DURATION
            ? Math.max(0, 1 - (age - (LINE_MAX_AGE - FADE_DURATION)) / FADE_DURATION)
            : 1;

          return (
            <p
              key={line.id}
              className={`${textColorClass} font-semibold leading-tight transition-opacity duration-500`}
              style={{
                fontSize: `${fontSize}px`,
                opacity,
              }}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
