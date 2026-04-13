"use client";

import { useState } from "react";
import type { CalendarSectionWithRows, CalendarEntry, CalendarRow } from "@/lib/instant";
import { CellEditor } from "./cell-editor";
import { PersonChip } from "./person-chip";
import type { CalendarFieldType, PersonPickerContent, TagListContent, MultilineTextContent, TextContent } from "@oaweekend/shared";

interface WeekDetailSectionProps {
  section: CalendarSectionWithRows;
  entries: Map<string, CalendarEntry>; // rowId → entry
  weekId: string;
  isEditable: boolean;
}

export function WeekDetailSection({
  section,
  entries,
  weekId,
  isEditable,
}: WeekDetailSectionProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const editingRow = editingRowId
    ? section.rows.find((r) => r.id === editingRowId)
    : null;
  const editingEntry = editingRowId ? entries.get(editingRowId) : null;

  return (
    <>
      <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-oa-stone-200/50">
          <div
            className="w-[3px] h-[18px] rounded-sm shrink-0"
            style={{ backgroundColor: section.color }}
          />
          <span className="text-sm font-bold text-oa-black-900">
            {section.name}
          </span>
        </div>

        {/* Field rows */}
        {section.rows.map((row) => {
          const entry = entries.get(row.id);
          const content = entry?.content ?? "";

          return (
            <div
              key={row.id}
              className="flex items-start px-5 py-3 border-b border-oa-stone-200/30 last:border-b-0 group hover:bg-oa-sand-100/35 transition-colors duration-[220ms]"
            >
              <div className="w-[160px] shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider text-oa-black-700">
                {row.name}
              </div>
              <div className="flex-1 text-sm text-oa-black-900">
                <FieldValueDisplay
                  content={content}
                  fieldType={row.fieldType as CalendarFieldType}
                />
              </div>
              {isEditable && (
                <button
                  onClick={() => setEditingRowId(row.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms] text-oa-stone-300 hover:text-oa-black-700 text-sm ml-2 shrink-0"
                >
                  ✎
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editingRow && (
        <CellEditor
          entryId={editingEntry?.id}
          weekId={weekId}
          rowId={editingRow.id}
          rowName={editingRow.name}
          fieldType={editingRow.fieldType as CalendarFieldType}
          currentContent={editingEntry?.content ?? ""}
          currentStatus={(editingEntry?.status as "empty" | "draft" | "confirmed") ?? "empty"}
          onClose={() => setEditingRowId(null)}
        />
      )}
    </>
  );
}

function FieldValueDisplay({
  content,
  fieldType,
}: {
  content: string;
  fieldType: CalendarFieldType;
}) {
  if (!content || content === "" || content === "{}") {
    return (
      <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return <span className="text-[13px]">{content}</span>;
  }

  switch (fieldType) {
    case "text": {
      const v = parsed as unknown as TextContent;
      if (!v.value) return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      return <span className="text-[14px]">{v.value}</span>;
    }
    case "multilineText": {
      const v = parsed as unknown as MultilineTextContent;
      if (!v.value) return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      return (
        <div className="text-[14px] leading-relaxed">
          {v.value.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    }
    case "personPicker": {
      const v = parsed as unknown as PersonPickerContent;
      if (!v.people?.length) return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {v.people.map((p, i) => (
            <PersonChip key={i} name={p.name} initials={p.initials} />
          ))}
        </div>
      );
    }
    case "tagList": {
      const v = parsed as unknown as TagListContent;
      if (!v.tags?.length) return <span className="text-oa-stone-300 italic text-[13px]">None</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {v.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex px-2.5 py-0.5 rounded-[10px] text-[11px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }
    default: {
      return <span className="text-[13px]">{JSON.stringify(parsed)}</span>;
    }
  }
}
