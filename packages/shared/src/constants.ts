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

// ---------------------------------------------------------------------------
// Strategic Calendar
// ---------------------------------------------------------------------------

export const CALENDAR_FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "multilineText", label: "Multi-line Text" },
  { value: "personPicker", label: "Person Picker" },
  { value: "seriesPicker", label: "Series Picker" },
  { value: "campusPicker", label: "Campus Picker" },
  { value: "tagList", label: "Tag List" },
  { value: "boolean", label: "Yes / No" },
  { value: "richText", label: "Rich Text" },
] as const;

export const CALENDAR_ENTRY_STATUS_OPTIONS = [
  { value: "empty", label: "Empty" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
] as const;

export const CALENDAR_WEEKS_PER_PAGE = 8;

export const CALENDAR_DEFAULT_SECTIONS = [
  { name: "Service Planning", slug: "service-planning", color: "#272728", sortOrder: 0 },
  { name: "Events & Campaigns", slug: "events-campaigns", color: "#6873B3", sortOrder: 1 },
  { name: "Social Media", slug: "social-media", color: "#D07A84", sortOrder: 2 },
  { name: "Email & Text", slug: "email-text", color: "#CDA5AC", sortOrder: 3 },
  { name: "Podcast & YouTube", slug: "podcast-youtube", color: "#272728", sortOrder: 4 },
  { name: "Worship", slug: "worship", color: "#FFC905", sortOrder: 5 },
] as const;

export const CALENDAR_DEFAULT_ROWS: Record<string, Array<{ name: string; slug: string; fieldType: string; sortOrder: number; campusSpecific: boolean }>> = {
  "service-planning": [
    { name: "Series", slug: "series", fieldType: "seriesPicker", sortOrder: 0, campusSpecific: false },
    { name: "Speaker", slug: "speaker", fieldType: "personPicker", sortOrder: 1, campusSpecific: false },
    { name: "Host", slug: "host", fieldType: "personPicker", sortOrder: 2, campusSpecific: false },
    { name: "Communion", slug: "communion", fieldType: "tagList", sortOrder: 3, campusSpecific: false },
    { name: "In Service Video", slug: "in-service-video", fieldType: "multilineText", sortOrder: 4, campusSpecific: false },
    { name: "Campus - Live Speaking", slug: "campus-live", fieldType: "campusPicker", sortOrder: 5, campusSpecific: false },
    { name: "Special", slug: "special", fieldType: "text", sortOrder: 6, campusSpecific: false },
  ],
  "events-campaigns": [
    { name: "All Church Events", slug: "all-church-events", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "San Dimas Events", slug: "sd-events", fieldType: "multilineText", sortOrder: 1, campusSpecific: true },
    { name: "Rancho Events", slug: "rc-events", fieldType: "multilineText", sortOrder: 2, campusSpecific: true },
    { name: "West Covina Events", slug: "wc-events", fieldType: "multilineText", sortOrder: 3, campusSpecific: true },
    { name: "Campaign 1", slug: "campaign-1", fieldType: "text", sortOrder: 4, campusSpecific: false },
    { name: "Campaign 2", slug: "campaign-2", fieldType: "text", sortOrder: 5, campusSpecific: false },
    { name: "Campaign 3", slug: "campaign-3", fieldType: "text", sortOrder: 6, campusSpecific: false },
  ],
  "social-media": [
    { name: "Monday", slug: "social-mon", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "Tuesday", slug: "social-tue", fieldType: "multilineText", sortOrder: 1, campusSpecific: false },
    { name: "Wednesday", slug: "social-wed", fieldType: "multilineText", sortOrder: 2, campusSpecific: false },
    { name: "Thursday", slug: "social-thu", fieldType: "multilineText", sortOrder: 3, campusSpecific: false },
    { name: "Friday", slug: "social-fri", fieldType: "multilineText", sortOrder: 4, campusSpecific: false },
    { name: "Saturday", slug: "social-sat", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
    { name: "Sunday", slug: "social-sun", fieldType: "multilineText", sortOrder: 6, campusSpecific: false },
  ],
  "email-text": [
    { name: "All Church Email", slug: "all-church-email", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "Campus Email", slug: "campus-email", fieldType: "multilineText", sortOrder: 1, campusSpecific: true },
    { name: "Ministry Email", slug: "ministry-email", fieldType: "multilineText", sortOrder: 2, campusSpecific: false },
    { name: "All Church Text", slug: "all-church-text", fieldType: "multilineText", sortOrder: 3, campusSpecific: false },
    { name: "Campus Text", slug: "campus-text", fieldType: "multilineText", sortOrder: 4, campusSpecific: true },
    { name: "Ministry Text", slug: "ministry-text", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
  ],
  "podcast-youtube": [
    { name: "Daily - Monday", slug: "podcast-mon", fieldType: "multilineText", sortOrder: 0, campusSpecific: false },
    { name: "Daily - Tuesday", slug: "podcast-tue", fieldType: "multilineText", sortOrder: 1, campusSpecific: false },
    { name: "Daily - Wednesday", slug: "podcast-wed", fieldType: "multilineText", sortOrder: 2, campusSpecific: false },
    { name: "Daily - Thursday", slug: "podcast-thu", fieldType: "multilineText", sortOrder: 3, campusSpecific: false },
    { name: "Daily - Friday", slug: "podcast-fri", fieldType: "multilineText", sortOrder: 4, campusSpecific: false },
    { name: "Weekend Broadcast", slug: "yt-broadcast", fieldType: "multilineText", sortOrder: 5, campusSpecific: false },
    { name: "Shorter Content", slug: "yt-shorts", fieldType: "multilineText", sortOrder: 6, campusSpecific: false },
    { name: "YouTube Series", slug: "yt-series", fieldType: "text", sortOrder: 7, campusSpecific: false },
  ],
  "worship": [
    { name: "Song 1", slug: "song-1", fieldType: "text", sortOrder: 0, campusSpecific: false },
    { name: "Song 2", slug: "song-2", fieldType: "text", sortOrder: 1, campusSpecific: false },
    { name: "Song 3", slug: "song-3", fieldType: "text", sortOrder: 2, campusSpecific: false },
    { name: "Song 4", slug: "song-4", fieldType: "text", sortOrder: 3, campusSpecific: false },
  ],
};
