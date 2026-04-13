"use client";

import { use, useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useDeepgram, type DeepgramTranscript } from "@/hooks/use-deepgram";
import { useTranscript } from "@/hooks/use-transcript";
import { useSession, useSessionUpdate, useKeyterms } from "@/hooks/use-session";
import { useDisplays, setDisplaySession } from "@/hooks/use-displays";
import { AudioLevelMeter } from "@/components/audio-level-meter";
import { ABSOLUTE_MAX_DURATION_MINUTES } from "@oaweekend/shared";

export default function CapturePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { session } = useSession(sessionId);
  const { updateSession } = useSessionUpdate(sessionId);
  const { keyterms } = useKeyterms();
  const { handleTranscript, resetSequence } = useTranscript({ sessionId });
  const { displays } = useDisplays();

  const [recentTranscripts, setRecentTranscripts] = useState<string[]>([]);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const isStreamingRef = useRef(false);
  const autoStopCalledRef = useRef(false);

  const {
    devices,
    selectedDeviceId,
    isCapturing,
    audioLevel,
    error: audioError,
    needsPermission,
    selectDevice,
    requestPermission,
    startCapture,
    stopCapture,
    onAudioData,
  } = useAudioCapture();

  const {
    isConnected,
    error: dgError,
    reconnectCount,
    connect,
    disconnect,
    sendAudio,
    onTranscript,
  } = useDeepgram();

  useEffect(() => {
    onAudioData((pcm) => sendAudio(pcm));
  }, [onAudioData, sendAudio]);

  useEffect(() => {
    onTranscript((transcript: DeepgramTranscript) => {
      handleTranscript(transcript);
      if (transcript.kind === "final") {
        setRecentTranscripts((prev) => [...prev, transcript.text].slice(-5));
      }
    });
  }, [onTranscript, handleTranscript]);

  const stopStreaming = useCallback(async () => {
    isStreamingRef.current = false;
    disconnect();
    stopCapture();
    updateSession({ status: "ended", endedAt: Date.now() });

    // Clear this session from any displays showing it
    const assignedDisplays = displays.filter(
      (d) => d.activeSessionId === sessionId,
    );
    for (const d of assignedDisplays) {
      await setDisplaySession(d.id, null);
    }
  }, [disconnect, stopCapture, updateSession, displays, sessionId]);

  // Duration countdown + auto-stop
  useEffect(() => {
    if (!session || session.status !== "live") {
      setRemainingMs(null);
      autoStopCalledRef.current = false;
      return;
    }
    const userLimit = (session.maxDurationMinutes as number) ?? 120;
    const effectiveLimit = Math.min(userLimit, ABSOLUTE_MAX_DURATION_MINUTES);
    const deadlineMs = (session.startedAt as number) + effectiveLimit * 60_000;

    const interval = setInterval(() => {
      const remaining = deadlineMs - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !autoStopCalledRef.current) {
        autoStopCalledRef.current = true;
        stopStreaming();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, stopStreaming]);

  const startStreaming = useCallback(async () => {
    if (isStreamingRef.current) return;
    isStreamingRef.current = true;
    autoStopCalledRef.current = false;
    resetSequence();

    const activeKeyterms = keyterms
      .filter((k) => k.active)
      .map((k) => `${k.term}:${k.boost}`);

    await startCapture();
    await connect({
      profanityFilter: session?.profanityFilter ?? true,
      keywords: activeKeyterms,
    });
    updateSession({ status: "live", startedAt: Date.now() });
  }, [startCapture, connect, updateSession, session?.profanityFilter, keyterms, resetSequence]);

  const error = audioError || dgError;

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Loading session...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col p-6 lg:p-8 max-w-2xl mx-auto w-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight">Audio Capture</h1>
          <p className="text-sm text-oa-black-700">
            {session.campusName} &mdash; {session.sermonTitle ?? "Untitled"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-oa-white border border-oa-stone-200 px-4 py-2 shadow-[--shadow-card]">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected
                ? "bg-green-500"
                : isCapturing
                  ? "bg-oa-yellow-500 animate-pulse"
                  : "bg-oa-stone-300"
            }`}
          />
          <span className="text-sm font-medium">
            {isConnected ? "Connected" : isCapturing ? "Connecting..." : "Idle"}
          </span>
          {reconnectCount > 0 && (
            <span className="text-xs text-oa-yellow-600 font-medium">
              retry {reconnectCount}
            </span>
          )}
        </div>
      </div>

      {/* Duration Timer */}
      {session.status === "live" && remainingMs !== null && (
        <DurationBar
          remainingMs={remainingMs}
          maxDurationMinutes={Math.min(
            (session.maxDurationMinutes as number) ?? 120,
            ABSOLUTE_MAX_DURATION_MINUTES
          )}
        />
      )}

      {/* Audio Device */}
      <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-4 shadow-[--shadow-card] space-y-2">
        <label className="text-xs font-medium text-oa-black-700">
          Audio Input Device
        </label>
        <select
          value={selectedDeviceId ?? ""}
          onChange={(e) => selectDevice(e.target.value)}
          disabled={isCapturing}
          className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm focus:border-oa-yellow-500 focus:outline-none transition-colors disabled:opacity-50"
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audio Level */}
      {isCapturing && <AudioLevelMeter level={audioLevel} />}

      {/* Error */}
      {error && (
        <div className="rounded-[--radius-card] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Start/Stop */}
      <div className="flex flex-col gap-3">
        {needsPermission && (
          <button
            onClick={requestPermission}
            className="w-full rounded-[--radius-button] bg-oa-blue py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity duration-150"
          >
            Grant Microphone Access
          </button>
        )}
        {!needsPermission && !isCapturing && (
          <button
            onClick={startStreaming}
            disabled={!selectedDeviceId}
            className="w-full rounded-[--radius-button] bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors duration-150 disabled:opacity-50"
          >
            Start Capture
          </button>
        )}
        {isCapturing && (
          <button
            onClick={stopStreaming}
            className="w-full rounded-[--radius-button] bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors duration-150"
          >
            Stop &amp; End Session
          </button>
        )}
      </div>

      {/* Transcript Preview */}
      <div className="flex-1 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
          Transcript Preview
        </h2>
        <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-5 min-h-[200px] shadow-[--shadow-card]">
          {recentTranscripts.length === 0 ? (
            <p className="text-sm text-oa-stone-300 italic">
              {isCapturing
                ? "Listening for audio..."
                : "Start capture to see transcripts"}
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentTranscripts.map((text, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4 text-sm">
        <button
          onClick={() => window.open(`/display/session/${sessionId}`, "_blank")}
          className="text-oa-black-700 hover:text-oa-black-900 underline underline-offset-2 transition-colors duration-150"
        >
          Open Display View
        </button>
        <button
          onClick={() => router.push(`/operator/${sessionId}`)}
          className="text-oa-black-700 hover:text-oa-black-900 underline underline-offset-2 transition-colors duration-150"
        >
          Operator Panel
        </button>
      </div>
    </main>
  );
}

function DurationBar({
  remainingMs,
  maxDurationMinutes,
}: {
  remainingMs: number;
  maxDurationMinutes: number;
}) {
  const totalMs = maxDurationMinutes * 60_000;
  const elapsed = totalMs - remainingMs;
  const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
  const isWarning = remainingMs < 5 * 60_000;
  const isExpired = remainingMs <= 0;

  const mins = Math.max(0, Math.floor(remainingMs / 60_000));
  const secs = Math.max(0, Math.floor((remainingMs % 60_000) / 1000));

  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-4 shadow-[--shadow-card] space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-oa-black-700">Time remaining</span>
        <span
          className={`font-semibold tabular-nums ${
            isExpired
              ? "text-red-600"
              : isWarning
                ? "text-amber-600"
                : "text-oa-black-900"
          }`}
        >
          {isExpired
            ? "Auto-stopping..."
            : `${mins}:${secs.toString().padStart(2, "0")}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-oa-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isExpired
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-500"
                : "bg-green-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
