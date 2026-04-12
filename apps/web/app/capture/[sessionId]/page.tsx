"use client";

import { use, useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useDeepgram, type DeepgramTranscript } from "@/hooks/use-deepgram";
import { useTranscript } from "@/hooks/use-transcript";
import { useSession, useSessionUpdate, useKeyterms } from "@/hooks/use-session";
import { AudioLevelMeter } from "@/components/audio-level-meter";

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

  const [recentTranscripts, setRecentTranscripts] = useState<string[]>([]);
  const isStreamingRef = useRef(false);

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

  // Wire audio data to Deepgram
  useEffect(() => {
    onAudioData((pcm) => {
      sendAudio(pcm);
    });
  }, [onAudioData, sendAudio]);

  // Wire transcript handler
  useEffect(() => {
    onTranscript((transcript: DeepgramTranscript) => {
      handleTranscript(transcript);

      // Update recent transcripts for preview
      if (transcript.kind === "final") {
        setRecentTranscripts((prev) => {
          const next = [...prev, transcript.text];
          return next.slice(-5); // Keep last 5 lines
        });
      }
    });
  }, [onTranscript, handleTranscript]);

  const startStreaming = useCallback(async () => {
    if (isStreamingRef.current) return;
    isStreamingRef.current = true;
    resetSequence();

    const activeKeyterms = keyterms
      .filter((k) => k.active)
      .map((k) => `${k.term}:${k.boost}`);

    // Start audio capture
    await startCapture();

    // Connect to Deepgram
    await connect({
      profanityFilter: session?.profanityFilter ?? true,
      keywords: activeKeyterms,
    });

    // Update session status to live
    updateSession({
      status: "live",
      startedAt: Date.now(),
    });
  }, [
    startCapture,
    connect,
    updateSession,
    session?.profanityFilter,
    keyterms,
    resetSequence,
  ]);

  const stopStreaming = useCallback(() => {
    isStreamingRef.current = false;
    disconnect();
    stopCapture();

    updateSession({
      status: "ended",
      endedAt: Date.now(),
    });
  }, [disconnect, stopCapture, updateSession]);

  const error = audioError || dgError;

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-500">Loading session...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col p-6 max-w-2xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Audio Capture</h1>
          <p className="text-sm text-neutral-500">
            {session.campusName} &mdash; {session.sermonTitle ?? "Untitled"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-green-500"
                : isCapturing
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-neutral-300"
            }`}
          />
          <span className="text-xs text-neutral-500">
            {isConnected
              ? "Connected"
              : isCapturing
                ? "Connecting..."
                : "Idle"}
          </span>
          {reconnectCount > 0 && (
            <span className="text-xs text-yellow-600">
              (retry {reconnectCount})
            </span>
          )}
        </div>
      </div>

      {/* Audio Device Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Audio Input Device</label>
        <select
          value={selectedDeviceId ?? ""}
          onChange={(e) => selectDevice(e.target.value)}
          disabled={isCapturing}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:opacity-50"
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

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Start/Stop Button */}
      <div className="flex flex-col gap-3">
        {needsPermission && (
          <button
            onClick={requestPermission}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Grant Microphone Access
          </button>
        )}
        {!needsPermission && !isCapturing && (
          <button
            onClick={startStreaming}
            disabled={!selectedDeviceId}
            className="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            Start Capture
          </button>
        )}
        {isCapturing && (
          <button
            onClick={stopStreaming}
            className="w-full rounded-lg bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            Stop &amp; End Session
          </button>
        )}
      </div>

      {/* Transcript Preview */}
      <div className="flex-1 space-y-1">
        <h2 className="text-sm font-medium text-neutral-500">
          Transcript Preview
        </h2>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 min-h-[200px]">
          {recentTranscripts.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">
              {isCapturing
                ? "Listening for audio..."
                : "Start capture to see transcripts"}
            </p>
          ) : (
            <div className="space-y-1">
              {recentTranscripts.map((text, i) => (
                <p key={i} className="text-sm">
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3 text-sm">
        <button
          onClick={() =>
            window.open(`/display/${sessionId}`, "_blank")
          }
          className="text-neutral-500 hover:text-neutral-700 underline"
        >
          Open Display View
        </button>
        <button
          onClick={() => router.push(`/operator/${sessionId}`)}
          className="text-neutral-500 hover:text-neutral-700 underline"
        >
          Operator Panel
        </button>
      </div>
    </main>
  );
}
