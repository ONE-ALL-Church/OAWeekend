export const SESSION_DEFAULTS = {
  fontSize: 64,
  positionVertical: "bottom" as const,
  maxDurationMinutes: 120,
  profanityFilter: true,
  paused: false,
} as const;

export const MAX_DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
] as const;

/** Hard cap regardless of user setting (4 hours in minutes) */
export const ABSOLUTE_MAX_DURATION_MINUTES = 240;

export const DISPLAY_MAX_LINES = 3;

export const FONT_SIZE_MIN = 36;
export const FONT_SIZE_MAX = 120;

export const DEEPGRAM_MODEL = "nova-3";
export const DEEPGRAM_SAMPLE_RATE = 16000;
export const DEEPGRAM_CHANNELS = 1;
export const DEEPGRAM_ENCODING = "linear16";

export const RECONNECT_MAX_RETRIES = 5;
export const RECONNECT_BASE_DELAY_MS = 1000;
export const AUDIO_BUFFER_MAX_SECONDS = 10;

export const DISPLAY_DEFAULTS = {
  theme: "dark" as const,
  fontSize: 64,
  positionVertical: "bottom" as const,
  maxLines: 3,
} as const;

export const DISPLAY_THEMES = [
  { value: "dark", label: "Dark (black bg, white text)" },
  { value: "light", label: "Light (white bg, black text)" },
] as const;

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const DISPLAY_ONLINE_THRESHOLD_MS = 90_000;
