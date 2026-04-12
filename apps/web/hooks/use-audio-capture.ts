"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface AudioCaptureState {
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  isCapturing: boolean;
  audioLevel: number;
  error: string | null;
  needsPermission: boolean;
}

interface AudioCaptureActions {
  selectDevice: (deviceId: string) => void;
  requestPermission: () => Promise<void>;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  onAudioData: (callback: (pcm: ArrayBuffer) => void) => void;
}

export function useAudioCapture(): AudioCaptureState & AudioCaptureActions {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const callbackRef = useRef<((pcm: ArrayBuffer) => void) | null>(null);

  const enumerateDevices = useCallback(async () => {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = allDevices
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
      }));

    setDevices(audioInputs);
    if (audioInputs.length > 0) {
      setSelectedDeviceId(audioInputs[0].deviceId);
    }
    setNeedsPermission(false);
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      tempStream.getTracks().forEach((t) => t.stop());
      await enumerateDevices();
    } catch {
      setError(
        "Microphone access denied. Please allow audio access in your browser."
      );
    }
  }, [enumerateDevices]);

  // Try to enumerate on mount (works if permission was previously granted)
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const audioInputs = allDevices.filter(
        (d) => d.kind === "audioinput" && d.label
      );
      if (audioInputs.length > 0) {
        setDevices(
          audioInputs.map((d) => ({
            deviceId: d.deviceId,
            label: d.label,
          }))
        );
        setSelectedDeviceId(audioInputs[0].deviceId);
        setNeedsPermission(false);
      }
    });
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  const onAudioData = useCallback(
    (callback: (pcm: ArrayBuffer) => void) => {
      callbackRef.current = callback;
    },
    []
  );

  const startCapture = useCallback(async () => {
    if (!selectedDeviceId) {
      setError("No audio device selected");
      return;
    }

    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedDeviceId },
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Load the AudioWorklet processor from public/
      await audioContext.audioWorklet.addModule("/audio-processor.worklet.js");

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        "audio-capture-processor"
      );
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const { type, pcm, audioLevel: level } = event.data;
        if (type === "audio") {
          setAudioLevel(level);
          callbackRef.current?.(pcm);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      setIsCapturing(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start audio capture";
      setError(message);
    }
  }, [selectedDeviceId]);

  const stopCapture = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    setIsCapturing(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    isCapturing,
    audioLevel,
    error,
    needsPermission,
    selectDevice,
    requestPermission,
    startCapture,
    stopCapture,
    onAudioData,
  };
}
