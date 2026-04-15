"use client";

import { PersonChip } from "./person-chip";
import type {
  TextContent,
  MultilineTextContent,
  PersonPickerContent,
  SeriesPickerContent,
  CampusPickerContent,
  TagListContent,
  BooleanContent,
  CalendarFieldType,
} from "@oaweekend/shared";

interface CalendarCellProps {
  content: string; // JSON string
  fieldType: CalendarFieldType;
  isEditable: boolean;
  isSyncedFromPC: boolean;
  onClick: () => void;
  isLastRow?: boolean;
}

export function CalendarCell({
  content,
  fieldType,
  isEditable,
  isSyncedFromPC,
  onClick,
  isLastRow,
}: CalendarCellProps) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  const parsed = parseCellContent(content);
  const effectiveEditable = isEditable && !isSyncedFromPC;

  return (
    <div
      onClick={effectiveEditable ? onClick : undefined}
      className={`px-2.5 py-2 text-xs text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/20 flex items-center justify-center min-h-[40px] text-center transition-colors duration-[220ms] relative ${
        effectiveEditable
          ? "cursor-pointer hover:bg-oa-sand-100/35"
          : ""
      }`}
    >
      {!parsed ? (
        <span className="text-oa-stone-300 text-base">—</span>
      ) : (
        <CellValueRenderer value={parsed} fieldType={fieldType} />
      )}
      {isSyncedFromPC && !!parsed && (
        <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#00A4C7]/12 text-[6px] font-bold text-[#00A4C7]" title="Synced from Planning Center">
          PC
        </span>
      )}
    </div>
  );
}

function CellValueRenderer({
  value,
  fieldType,
}: {
  value: unknown;
  fieldType: CalendarFieldType;
}) {
  switch (fieldType) {
    case "text": {
      const v = value as TextContent;
      return <span>{v.value}</span>;
    }
    case "multilineText": {
      const v = value as MultilineTextContent;
      return (
        <div className="flex flex-col items-center gap-0.5 leading-tight text-[11px]">
          {v.value.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    }
    case "personPicker": {
      const v = value as PersonPickerContent;
      return (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.people.map((p, i) => (
            <PersonChip key={i} name={p.name} initials={p.initials} size="sm" />
          ))}
        </div>
      );
    }
    case "tagList": {
      const v = value as TagListContent;
      return (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }
    case "boolean": {
      const v = value as BooleanContent;
      return (
        <span
          className={`inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-semibold ${
            v.value
              ? "bg-oa-green-bg text-oa-green"
              : "bg-oa-stone-100 text-oa-stone-300"
          }`}
        >
          {v.value ? "Yes" : "No"}
        </span>
      );
    }
    case "seriesPicker": {
      const v = value as SeriesPickerContent;
      if (!v.seriesId && !v.label) {
        return <span className="text-oa-stone-300 text-base">—</span>;
      }
      return (
        <div className="flex flex-col items-center gap-0.5 leading-tight">
          <span className="font-semibold text-[11px]">{v.label ?? "Series"}</span>
          {v.weekNumber > 0 && (
            <span className="text-[10px] text-oa-stone-300">Week {v.weekNumber}</span>
          )}
        </div>
      );
    }
    case "campusPicker": {
      const v = value as CampusPickerContent;
      return (
        <div className="flex flex-col items-center gap-0.5 leading-tight text-[11px]">
          {v.campuses.map((campus) => (
            <div key={campus.id || campus.name}>{campus.name}</div>
          ))}
        </div>
      );
    }
    case "richText":
    default: {
      // Fallback: render as text
      const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
      return <span className="text-[11px]">{raw}</span>;
    }
  }
}

function parseCellContent(content: string): unknown | null {
  if (!content || content === "" || content === "{}") return null;
  try {
    const parsed = JSON.parse(content);
    // Check if the parsed value is "empty"
    if (parsed.value === "" || parsed.value === undefined) {
      if (!parsed.people?.length && !parsed.tags?.length && !parsed.campuses?.length) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}
