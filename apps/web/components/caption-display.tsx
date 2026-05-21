"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface CaptionLine {
  id: number;
  text: string;
  timestamp: number;
  startMs?: number;
  endMs?: number;
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
  void fontSize;
  void positionVertical;
  void maxLines;
  return null;
}

interface CaptionOverlayProps {
  fontSize: number;
  positionVertical: "top" | "middle" | "bottom";
  maxLines?: number;
  paused: boolean;
  lines: CaptionLine[];
  textColorClass?: string;
}

interface CaptionCue {
  id: string;
  sourceId: number;
  text: string;
  lines: string[];
  durationMs: number;
}

interface ArchivedCue extends CaptionCue {
  exitedAt: number;
}

const MAX_CHARS_PER_LINE = 36;
const TARGET_CHARS_PER_LINE = 28;
const MAX_WORDS_PER_CUE = 12;
const MIN_CUE_DURATION_MS = 1200;
const MAX_CUE_DURATION_MS = 3400;
const HISTORY_RETENTION_MS = 7000;
const MAX_HISTORY_CUES = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function splitLongPhrase(phrase: string) {
  const words = phrase.split(" ");
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const nextWords = [...current, word];
    const nextText = nextWords.join(" ");
    if (
      current.length > 0 &&
      (nextWords.length > MAX_WORDS_PER_CUE || nextText.length > MAX_CHARS_PER_LINE * 2)
    ) {
      chunks.push(current.join(" "));
      current = [word];
      continue;
    }
    current = nextWords;
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
}

function splitIntoCueTexts(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const clauses = normalized
    .split(/(?<=[,;:.!?])\s+|(?<=\))\s+|(?<=\])\s+/)
    .flatMap((clause) => splitLongPhrase(clause));

  const cues: string[] = [];
  let current = "";

  for (const clause of clauses) {
    const next = current ? `${current} ${clause}` : clause;
    const nextWordCount = next.split(" ").length;
    if (
      current &&
      (next.length > MAX_CHARS_PER_LINE * 2 || nextWordCount > MAX_WORDS_PER_CUE)
    ) {
      cues.push(current);
      current = clause;
      continue;
    }
    current = next;
  }

  if (current) {
    cues.push(current);
  }

  return cues;
}

function balanceCueLines(text: string) {
  if (text.length <= MAX_CHARS_PER_LINE) return [text];

  const words = text.split(" ");
  let bestSplit = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 1; i < words.length; i += 1) {
    const top = words.slice(0, i).join(" ");
    const bottom = words.slice(i).join(" ");
    const tooWide = top.length > MAX_CHARS_PER_LINE || bottom.length > MAX_CHARS_PER_LINE;
    const balancePenalty = Math.abs(top.length - bottom.length);
    const targetPenalty =
      Math.abs(top.length - TARGET_CHARS_PER_LINE) +
      Math.abs(bottom.length - TARGET_CHARS_PER_LINE);
    const score = balancePenalty + targetPenalty + (tooWide ? 1000 : 0);

    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }

  const top = words.slice(0, bestSplit).join(" ");
  const bottom = words.slice(bestSplit).join(" ");
  return bottom ? [top, bottom] : [top];
}

function cueDurationMs(text: string, audioDurationMs: number, queueDepth: number) {
  const readingMs = clamp(text.length * 52, MIN_CUE_DURATION_MS, MAX_CUE_DURATION_MS);
  const sourceMs = audioDurationMs > 0 ? clamp(audioDurationMs, MIN_CUE_DURATION_MS, 5000) : 0;
  const base = Math.max(readingMs, sourceMs);
  const pressureFactor = queueDepth >= 5 ? 0.66 : queueDepth >= 3 ? 0.78 : queueDepth >= 1 ? 0.9 : 1;
  return clamp(Math.round(base * pressureFactor), 900, MAX_CUE_DURATION_MS);
}

function buildCueQueue(line: CaptionLine, queueDepth: number) {
  const cueTexts = splitIntoCueTexts(line.text);
  if (cueTexts.length === 0) return [];

  const sourceDuration = Math.max(0, (line.endMs ?? 0) - (line.startMs ?? 0));
  const totalChars = cueTexts.reduce((sum, cueText) => sum + cueText.length, 0) || 1;

  return cueTexts.map((cueText, index) => {
    const proportionalSourceMs = sourceDuration
      ? Math.round((sourceDuration * cueText.length) / totalChars)
      : 0;

    return {
      id: `${line.id}-${index}`,
      sourceId: line.id,
      text: cueText,
      lines: balanceCueLines(cueText),
      durationMs: cueDurationMs(cueText, proportionalSourceMs, queueDepth + index),
    } satisfies CaptionCue;
  });
}

function trimVisibleCues(
  history: ArchivedCue[],
  activeCue: CaptionCue | null,
  maxLines: number,
) {
  const visible: Array<
    | ({ isActive: true } & CaptionCue)
    | ({ isActive: false } & ArchivedCue)
  > = [];
  let remainingLineBudget = Math.max(1, maxLines);

  if (activeCue) {
    visible.unshift({ ...activeCue, isActive: true });
    remainingLineBudget -= activeCue.lines.length;
  }

  for (let i = history.length - 1; i >= 0 && remainingLineBudget > 0; i -= 1) {
    const cue = history[i];
    if (cue.lines.length > remainingLineBudget) continue;
    visible.unshift({ ...cue, isActive: false });
    remainingLineBudget -= cue.lines.length;
  }

  return visible;
}

export function CaptionOverlay({
  fontSize,
  positionVertical,
  maxLines = 3,
  paused,
  lines,
  textColorClass = "text-white",
}: CaptionOverlayProps) {
  const [pendingCues, setPendingCues] = useState<CaptionCue[]>([]);
  const [activeCue, setActiveCue] = useState<CaptionCue | null>(null);
  const [history, setHistory] = useState<ArchivedCue[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedLineIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const newLines = lines.filter((line) => !processedLineIdsRef.current.has(line.id));
    if (newLines.length === 0) return;

    for (const line of newLines) {
      processedLineIdsRef.current.add(line.id);
    }

    setPendingCues((prev) => {
      const next = [...prev];
      let queueDepth = next.length + (activeCue ? 1 : 0);

      for (const line of newLines) {
        const cues = buildCueQueue(line, queueDepth);
        next.push(...cues);
        queueDepth += cues.length;
      }

      return next;
    });
  }, [activeCue, lines]);

  useEffect(() => {
    if (paused || activeCue || pendingCues.length === 0) return;

    const promoteTimer = setTimeout(() => {
      setPendingCues((prev) => {
        const [nextCue, ...rest] = prev;
        if (nextCue) {
          setActiveCue(nextCue);
        }
        return rest;
      });
    }, 0);

    return () => clearTimeout(promoteTimer);
  }, [activeCue, paused, pendingCues]);

  useEffect(() => {
    if (!activeCue || paused) return;

    timeoutRef.current = setTimeout(() => {
      const exitedAt = Date.now();
      setHistory((prev) => [...prev, { ...activeCue, exitedAt }].slice(-MAX_HISTORY_CUES));
      setActiveCue(null);
    }, activeCue.durationMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeCue, paused]);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setHistory((prev) => prev.filter((cue) => now - cue.exitedAt < HISTORY_RETENTION_MS));
    }, 500);

    return () => clearInterval(interval);
  }, [paused]);

  const visibleCues = useMemo(
    () => trimVisibleCues(history, activeCue, maxLines),
    [activeCue, history, maxLines],
  );

  const positionClass = {
    top: "items-start pt-[8vh]",
    middle: "items-center",
    bottom: "items-end pb-[7vh]",
  }[positionVertical];

  return (
    <div className={`fixed inset-0 flex flex-col ${positionClass} pointer-events-none`}>
      <div className="w-full px-[6vw]">
        <div
          className="mx-auto flex w-full max-w-[18ch] flex-col justify-end gap-[0.28em]"
          style={{
            minHeight: `${fontSize * Math.max(2.8, maxLines * 1.12)}px`,
            maskImage:
              "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 48%, rgba(0,0,0,0.58) 78%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 48%, rgba(0,0,0,0.58) 78%, rgba(0,0,0,0) 100%)",
          }}
        >
          {visibleCues.map((cue, index) => {
            const distanceFromActive = visibleCues.length - 1 - index;
            const opacity = cue.isActive ? 1 : Math.max(0.18, 0.72 - distanceFromActive * 0.24);
            const translateY = cue.isActive ? 0 : distanceFromActive * -6;

            return (
              <div
                key={cue.id}
                className="transition-all duration-300 ease-out"
                style={{
                  opacity,
                  transform: `translateY(${translateY}px)`,
                }}
              >
                {cue.lines.map((lineText, lineIndex) => (
                  <p
                    key={`${cue.id}-${lineIndex}`}
                    className={`${textColorClass} text-center font-semibold tracking-[-0.02em]`}
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.02,
                      textShadow:
                        "0 1px 2px rgba(0,0,0,0.45), 0 6px 18px rgba(0,0,0,0.28)",
                    }}
                  >
                    {lineText}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
