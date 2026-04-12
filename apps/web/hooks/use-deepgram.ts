"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  DEEPGRAM_MODEL,
  DEEPGRAM_SAMPLE_RATE,
  DEEPGRAM_CHANNELS,
  DEEPGRAM_ENCODING,
  RECONNECT_MAX_RETRIES,
  RECONNECT_BASE_DELAY_MS,
  AUDIO_BUFFER_MAX_SECONDS,
} from "@oaweekend/shared";

export interface DeepgramTranscript {
  kind: "interim" | "final";
  text: string;
  startMs: number;
  endMs: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word: string;
  }>;
}

interface DeepgramState {
  isConnected: boolean;
  error: string | null;
  reconnectCount: number;
}

interface DeepgramActions {
  connect: (options: DeepgramConnectOptions) => Promise<void>;
  disconnect: () => void;
  sendAudio: (pcm: ArrayBuffer) => void;
  onTranscript: (callback: (transcript: DeepgramTranscript) => void) => void;
}

interface DeepgramConnectOptions {
  profanityFilter: boolean;
  keywords: string[];
}

export function useDeepgram(): DeepgramState & DeepgramActions {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const callbackRef = useRef<((t: DeepgramTranscript) => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const audioBufferSizeRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const connectOptionsRef = useRef<DeepgramConnectOptions | null>(null);

  const maxBufferBytes =
    AUDIO_BUFFER_MAX_SECONDS * DEEPGRAM_SAMPLE_RATE * 2; // 2 bytes per sample (int16)

  const onTranscript = useCallback(
    (callback: (t: DeepgramTranscript) => void) => {
      callbackRef.current = callback;
    },
    []
  );

  const connectWebSocket = useCallback(
    async (options: DeepgramConnectOptions, retryNum: number = 0) => {
      try {
        setError(null);

        // Fetch temporary Deepgram token
        const tokenRes = await fetch("/api/deepgram-token");
        if (!tokenRes.ok) throw new Error("Failed to get Deepgram token");
        const { key } = await tokenRes.json();

        // Build WebSocket URL with params
        const params = new URLSearchParams({
          model: DEEPGRAM_MODEL,
          encoding: DEEPGRAM_ENCODING,
          sample_rate: String(DEEPGRAM_SAMPLE_RATE),
          channels: String(DEEPGRAM_CHANNELS),
          interim_results: "true",
          smart_format: "true",
          punctuate: "true",
          profanity_filter: String(options.profanityFilter),
        });

        // Add keywords
        for (const kw of options.keywords) {
          params.append("keywords", kw);
        }

        const wsUrl = `wss://api.deepgram.com/v1/listen?${params}`;
        const ws = new WebSocket(wsUrl, ["token", key]);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setReconnectCount(retryNum);
          setError(null);

          // Flush any buffered audio
          for (const buf of audioBufferRef.current) {
            ws.send(buf);
          }
          audioBufferRef.current = [];
          audioBufferSizeRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type !== "Results" || !data.channel?.alternatives?.[0])
              return;

            const alt = data.channel.alternatives[0];
            const text = alt.transcript;
            if (!text) return;

            const transcript: DeepgramTranscript = {
              kind: data.is_final ? "final" : "interim",
              text,
              startMs: Math.round((data.start ?? 0) * 1000),
              endMs: Math.round(
                ((data.start ?? 0) + (data.duration ?? 0)) * 1000
              ),
              words: alt.words ?? [],
            };

            callbackRef.current?.(transcript);
          } catch {
            // Ignore non-JSON messages (e.g., metadata)
          }
        };

        ws.onerror = () => {
          setError("Deepgram WebSocket error");
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;

          if (
            !intentionalCloseRef.current &&
            retryNum < RECONNECT_MAX_RETRIES
          ) {
            const delay =
              RECONNECT_BASE_DELAY_MS * Math.pow(2, retryNum);
            reconnectTimerRef.current = setTimeout(() => {
              connectWebSocket(options, retryNum + 1);
            }, delay);
          } else if (retryNum >= RECONNECT_MAX_RETRIES) {
            setError("Connection lost. Max reconnection attempts reached.");
          }
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect to Deepgram";
        setError(message);
      }
    },
    [maxBufferBytes]
  );

  const connect = useCallback(
    async (options: DeepgramConnectOptions) => {
      intentionalCloseRef.current = false;
      connectOptionsRef.current = options;
      await connectWebSocket(options);
    },
    [connectWebSocket]
  );

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      // Send close message to Deepgram to finalize transcript
      wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setReconnectCount(0);
    audioBufferRef.current = [];
    audioBufferSizeRef.current = 0;
  }, []);

  const sendAudio = useCallback(
    (pcm: ArrayBuffer) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(pcm);
      } else {
        // Buffer audio during disconnects
        if (audioBufferSizeRef.current + pcm.byteLength <= maxBufferBytes) {
          audioBufferRef.current.push(pcm);
          audioBufferSizeRef.current += pcm.byteLength;
        }
        // If buffer is full, drop oldest frames
        else if (audioBufferRef.current.length > 0) {
          const dropped = audioBufferRef.current.shift()!;
          audioBufferSizeRef.current -= dropped.byteLength;
          audioBufferRef.current.push(pcm);
          audioBufferSizeRef.current += pcm.byteLength;
        }
      }
    },
    [maxBufferBytes]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    isConnected,
    error,
    reconnectCount,
    connect,
    disconnect,
    sendAudio,
    onTranscript,
  };
}
