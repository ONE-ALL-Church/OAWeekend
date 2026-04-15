"use client";

import { useState } from "react";
import type { CalendarSectionWithRows, CalendarEntry } from "@/lib/instant";
import { CellEditor } from "./cell-editor";
import { PersonChip } from "./person-chip";
import type {
  CalendarFieldType,
  PersonPickerContent,
  TagListContent,
  MultilineTextContent,
  TextContent,
  SeriesPickerContent,
  CampusPickerContent,
} from "@oaweekend/shared";

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

        {/* Field rows with sub-row grouping */}
        {(() => {
          const rows = section.rows;
          const elements: React.ReactNode[] = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]!;
            const parentRowId = (row as Record<string, unknown>).parentRowId as string | undefined;

            // Skip child rows — rendered under their parent
            if (parentRowId) continue;

            const children = rows.filter(
              (r) => (r as Record<string, unknown>).parentRowId === row.id,
            );

            if (children.length > 0) {
              // Parent header
              elements.push(
                <div
                  key={`parent-${row.id}`}
                  className="flex items-start px-5 py-2.5 border-b border-oa-stone-200/30 bg-oa-sand-100/20"
                >
                  <div className="w-[160px] shrink-0 pt-0.5 text-xs font-bold uppercase tracking-wider text-oa-black-900 flex items-center gap-1.5">
                    <span>{row.name}</span>
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#00A4C7]/12 text-[8px] font-bold text-[#00A4C7] normal-case tracking-normal" title="Synced from Planning Center">
                      PC
                    </span>
                  </div>
                </div>,
              );

              // Children — campus sub-rows are always non-editable
              for (const child of children) {
                const entry = entries.get(child.id);
                const content = entry?.content ?? "";
                const isChildSyncedFromPC = !!(child as Record<string, unknown>).campusId || (entry as Record<string, unknown> | undefined)?.source === "planning-center";
                const rowEditable = isEditable && !isChildSyncedFromPC;

                elements.push(
                  <div
                    key={child.id}
                    className="flex items-start px-5 py-3 border-b border-oa-stone-200/30 last:border-b-0 group hover:bg-oa-sand-100/35 transition-colors duration-[220ms] pl-10"
                  >
                    <div className="w-[140px] shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider text-oa-black-700">
                      {child.name}
                    </div>
                    <div className="flex-1 text-sm text-oa-black-900">
                      <FieldValueDisplay
                        content={content}
                        fieldType={child.fieldType as CalendarFieldType}
                      />
                    </div>
                    {rowEditable && (
                      <button
                        onClick={() => setEditingRowId(child.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms] text-oa-stone-300 hover:text-oa-black-700 text-sm ml-2 shrink-0"
                      >
                        ✎
                      </button>
                    )}
                  </div>,
                );
              }
            } else {
              // Regular row
              const entry = entries.get(row.id);
              const content = entry?.content ?? "";
              const isSyncedFromPC = (entry as Record<string, unknown> | undefined)?.source === "planning-center";
              const rowEditable = isEditable && !isSyncedFromPC;

              elements.push(
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
                  {isSyncedFromPC && content && content !== "{}" && (
                    <span className="text-[9px] font-bold text-[#00A4C7]/60 ml-1 shrink-0" title="Synced from Planning Center">
                      PC
                    </span>
                  )}
                  {rowEditable && (
                    <button
                      onClick={() => setEditingRowId(row.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-[220ms] text-oa-stone-300 hover:text-oa-black-700 text-sm ml-2 shrink-0"
                    >
                      ✎
                    </button>
                  )}
                </div>,
              );
            }
          }
          return elements;
        })()}
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
    case "seriesPicker": {
      const v = parsed as unknown as SeriesPickerContent;
      if (!v.seriesId && !v.label) {
        return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      }
      return (
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-semibold">{v.label ?? "Series"}</span>
          {v.weekNumber > 0 && (
            <span className="text-[12px] text-oa-stone-300">Week {v.weekNumber}</span>
          )}
        </div>
      );
    }
    case "campusPicker": {
      const v = parsed as unknown as CampusPickerContent;
      if (!v.campuses?.length) {
        return <span className="text-oa-stone-300 italic text-[13px]">Not assigned</span>;
      }
      return (
        <div className="text-[14px] leading-relaxed">
          {v.campuses.map((campus) => (
            <div key={campus.id || campus.name}>{campus.name}</div>
          ))}
        </div>
      );
    }
    default: {
      return <span className="text-[13px]">{JSON.stringify(parsed)}</span>;
    }
  }
}
