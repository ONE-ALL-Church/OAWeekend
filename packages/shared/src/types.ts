export type SessionStatus = "idle" | "live" | "ended" | "archived";
export type PositionVertical = "top" | "middle" | "bottom";
export type TranscriptEventKind = "interim" | "final";

export interface Session {
  id: string;
  campusId: string;
  campusName: string;
  scheduleId: string | null;
  sermonTitle: string | null;
  speakerName: string | null;
  rockContentChannelItemId: number | null;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  fontSize: number;
  positionVertical: PositionVertical;
  profanityFilter: boolean;
  paused: boolean;
}

export interface TranscriptEvent {
  id: string;
  sessionId: string;
  kind: TranscriptEventKind;
  text: string;
  startMs: number;
  endMs: number;
  sequence: number;
  createdAt: number;
}

export interface Keyterm {
  id: string;
  term: string;
  boost: number;
  active: boolean;
}

export type DisplayTheme = "dark" | "light";

export interface Display {
  id: string;
  name: string;
  slug: string;
  campusId: string;
  campusName: string;
  activeSessionId: string | null;
  theme: DisplayTheme;
  fontSize: number;
  positionVertical: PositionVertical;
  maxLines: number;
  lastSeenAt: number | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Strategic Calendar
// ---------------------------------------------------------------------------

export type CalendarFieldType =
  | "text"
  | "multilineText"
  | "personPicker"
  | "seriesPicker"
  | "campusPicker"
  | "tagList"
  | "boolean"
  | "richText";

export type CalendarEntryStatus = "empty" | "draft" | "confirmed";

export interface TextContent {
  value: string;
}

export interface MultilineTextContent {
  value: string;
}

export interface PersonPickerContent {
  people: Array<{
    name: string;
    initials: string;
    rockPersonId: string | null;
  }>;
}

export interface SeriesPickerContent {
  seriesId: string;
  weekNumber: number;
}

export interface CampusPickerContent {
  campuses: Array<{ id: string; name: string }>;
}

export interface TagListContent {
  tags: string[];
}

export interface BooleanContent {
  value: boolean;
}

export interface RichTextContent {
  html: string;
}

export type CalendarCellContent =
  | TextContent
  | MultilineTextContent
  | PersonPickerContent
  | SeriesPickerContent
  | CampusPickerContent
  | TagListContent
  | BooleanContent
  | RichTextContent;
