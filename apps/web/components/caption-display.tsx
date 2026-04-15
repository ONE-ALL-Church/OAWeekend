"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// --- Public types ---

export interface CaptionLine {
  id: number;
  text: string;
  timestamp: number;
}

interface CaptionOverlayProps {
  fontSize: number;
  positionVertical: "top" | "middle" | "bottom";
  maxLines?: number;
  paused: boolean;
  completedLines: CaptionLine[];
  textColorClass?: string;
}

// --- Constants ---

const FADE_DURATION = 600;
const LINE_MAX_AGE = 10000;
const PADDING_VW = 5;

// --- Text measurement ---

function createTextMeasurer(fontSize: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  return (text: string) => ctx.measureText(text).width;
}

function splitIntoVisualLines(
  text: string,
  maxWidth: number,
  measure: (text: string) => number
): string[] {
  if (!text.trim()) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && measure(test) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// --- Frozen row ---

interface FrozenRow {
  id: number;
  text: string;
  groupId: number;
  timestamp: number;
}

/**
 * Simple roll-up captions — finals only, no interim replacement.
 *
 * - Each final transcript is split into visual lines at word boundaries.
 * - Every row is `white-space: nowrap`, left-aligned, fixed height.
 * - Rows from the same transcript share a groupId and expire together.
 * - Layout is column-reverse: newest at bottom, old rows scroll up.
 * - Nothing is ever replaced or corrected after it's placed on screen.
 */
export function CaptionOverlay({
  fontSize,
  positionVertical,
  maxLines = 4,
  paused,
  completedLines,
  textColorClass = "text-white",
}: CaptionOverlayProps) {
  const [frozenRows, setFrozenRows] = useState<FrozenRow[]>([]);
  const measureRef = useRef<((text: string) => number) | null>(null);
  const rowIdRef = useRef(0);
  const groupIdRef = useRef(0);
  const prevCompletedLenRef = useRef(0);

  useEffect(() => {
    measureRef.current = createTextMeasurer(fontSize);
  }, [fontSize]);

  const getMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return 800;
    return window.innerWidth * (1 - (PADDING_VW * 2) / 100);
  }, []);

  // When new completed lines arrive, split into frozen visual rows
  useEffect(() => {
    if (paused) return;
    const measure = measureRef.current;
    if (!measure) return;

    const newCount = completedLines.length;
    const prevCount = prevCompletedLenRef.current;

    if (newCount > prevCount) {
      const maxWidth = getMaxWidth();
      const newLines = completedLines.slice(prevCount);
      const newRows: FrozenRow[] = [];

      for (const line of newLines) {
        const gid = groupIdRef.current++;
        const visualLines = splitIntoVisualLines(line.text, maxWidth, measure);
        for (const vl of visualLines) {
          newRows.push({
            id: rowIdRef.current++,
            text: vl,
            groupId: gid,
            timestamp: line.timestamp,
          });
        }
      }

      setFrozenRows((prev) => [...prev, ...newRows]);
    }
    prevCompletedLenRef.current = newCount;
  }, [completedLines, paused, getMaxWidth]);

  // Expire old frozen rows — entire groups at once
  useEffect(() => {
    const timer = setInterval(() => {
      if (paused) return;
      const now = Date.now();
      setFrozenRows((prev) => {
        const expiredGroups = new Set<number>();
        for (const row of prev) {
          if (now - row.timestamp >= LINE_MAX_AGE) {
            expiredGroups.add(row.groupId);
          }
        }
        if (expiredGroups.size === 0) return prev;
        return prev.filter((r) => !expiredGroups.has(r.groupId));
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused]);

  const lineHeight = fontSize * 1.375;
  const viewportHeight = lineHeight * maxLines;
  const visibleFrozen = frozenRows.slice(-maxLines);

  // Group opacity: all rows in same group fade together
  const groupOpacity = new Map<number, number>();
  const now = Date.now();
  for (const row of visibleFrozen) {
    if (!groupOpacity.has(row.groupId)) {
      const age = now - row.timestamp;
      const fadingOut = age > LINE_MAX_AGE - FADE_DURATION;
      groupOpacity.set(
        row.groupId,
        fadingOut
          ? Math.max(0, 1 - (age - (LINE_MAX_AGE - FADE_DURATION)) / FADE_DURATION)
          : 1
      );
    }
  }

  const positionStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    height: `${viewportHeight}px`,
    ...(positionVertical === "top"
      ? { top: "10vh" }
      : positionVertical === "middle"
        ? { top: "50%", transform: "translateY(-50%)" }
        : { bottom: "10vh" }),
  };

  const rowStyle = (opacity: number): React.CSSProperties => ({
    fontSize: `${fontSize}px`,
    height: `${lineHeight}px`,
    lineHeight: `${lineHeight}px`,
    whiteSpace: "nowrap",
    overflow: "hidden",
    opacity,
    transition: `opacity ${FADE_DURATION}ms ease`,
    flexShrink: 0,
  });

  return (
    <div style={positionStyle}>
      <div
        className="w-full px-[5vw]"
        style={{
          display: "flex",
          flexDirection: "column-reverse",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {[...visibleFrozen].reverse().map((row) => (
          <p
            key={row.id}
            className={`${textColorClass} font-semibold text-left`}
            style={rowStyle(groupOpacity.get(row.groupId) ?? 1)}
          >
            {row.text}
          </p>
        ))}
      </div>
    </div>
  );
}
