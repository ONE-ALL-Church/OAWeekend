"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useCalendarSections,
  useCalendarWeeks,
  useDateRangeFromAnchor,
  buildEntryMap,
} from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import { CalendarCell } from "@/components/calendar/calendar-cell";
import { CellEditor } from "@/components/calendar/cell-editor";
import type { CalendarFieldType } from "@oaweekend/shared";
import type { CalendarEntry } from "@/lib/instant";

export default function SectionDetailPage() {
  const params = useParams<{ sectionSlug: string }>();
  const now = new Date();
  const [anchorYear, setAnchorYear] = useState(now.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(now.getMonth());
  const { rangeStart, rangeEnd } = useDateRangeFromAnchor(anchorYear, anchorMonth);

  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { weeks, isLoading: weeksLoading } = useCalendarWeeks(rangeStart, rangeEnd);
  const { editableSectionIds } = useUserEditableSections();

  const section = sections.find((s) => s.slug === params.sectionSlug);
  const isLoading = sectionsLoading || weeksLoading;

  const entryMap = useMemo(() => buildEntryMap(weeks), [weeks]);

  const isEditable =
    section &&
    (editableSectionIds === null || editableSectionIds.has(section.id));

  const [editingCell, setEditingCell] = useState<{
    entryId?: string;
    weekId: string;
    rowId: string;
    rowName: string;
    fieldType: CalendarFieldType;
    currentContent: string;
    currentStatus: "empty" | "draft" | "confirmed";
  } | null>(null);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#faf9f7]">
        <p className="text-sm text-oa-stone-300">Loading...</p>
      </main>
    );
  }

  if (!section) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#faf9f7] gap-3">
        <p className="text-sm text-oa-stone-300">Section not found</p>
        <Link href="/calendar" className="text-sm text-oa-yellow-600 hover:underline">
          ← Back to calendar
        </Link>
      </main>
    );
  }

  const gridCols = `180px repeat(${weeks.length}, minmax(140px, 1fr))`;

  return (
    <main className="flex flex-col flex-1 bg-oa-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-oa-stone-200 bg-oa-white sticky top-0 z-10">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Calendar
        </Link>
        <div
          className="w-[3px] h-5 rounded-sm"
          style={{ backgroundColor: section.color }}
        />
        <h1 className="text-xl font-bold tracking-tight text-oa-black-900">
          {section.name}
        </h1>
        <span className="text-xs text-oa-stone-300">
          {section.rows.length} row{section.rows.length !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <select
            value={anchorMonth}
            onChange={(e) => setAnchorMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm font-medium bg-oa-white text-oa-black-900"
          >
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={anchorYear}
            onChange={(e) => setAnchorYear(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm font-medium bg-oa-white text-oa-black-900"
          >
            {Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => { setAnchorYear(now.getFullYear()); setAnchorMonth(now.getMonth()); }}
            className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
          >
            Today
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: gridCols,
            minWidth: `${180 + weeks.length * 140}px`,
          }}
        >
          {/* Week headers */}
          <div className="bg-oa-white border-b-2 border-oa-stone-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-oa-stone-300">
            Date
          </div>
          {weeks.map((week) => {
            const sat = new Date(week.weekStart + "T00:00:00");
            const sun = new Date(sat);
            sun.setDate(sat.getDate() + 1);
            return (
              <Link
                key={week.id}
                href={`/calendar/week/${week.weekStart}`}
                className="bg-oa-white border-b-2 border-oa-stone-200 px-2 py-2.5 text-center hover:bg-oa-sand-100/35 transition-colors duration-[220ms]"
              >
                <div className="text-[13px] font-semibold text-oa-black-900">
                  {sat.getDate()} &amp; {sun.getDate()}
                </div>
                {week.label && (
                  <div className="mt-1 inline-block rounded-[10px] bg-oa-yellow-500/12 px-2 py-0.5 text-[10px] font-semibold text-oa-yellow-600">
                    {week.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Rows */}
          {section.rows.map((row, rowIdx) => {
            const isLastRow = rowIdx === section.rows.length - 1;
            const borderClass = isLastRow
              ? "border-b-2 border-b-oa-stone-200"
              : "border-b border-b-oa-stone-200/50";

            return (
              <div key={row.id} className="contents">
                <div
                  className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center min-h-[60px]`}
                >
                  {row.name}
                </div>
                {weeks.map((week) => {
                  const entry = entryMap.get(`${week.id}:${row.id}`);
                  return (
                    <div key={`${week.id}:${row.id}`} className="min-h-[60px]">
                      <CalendarCell
                        content={entry?.content ?? ""}
                        fieldType={row.fieldType as CalendarFieldType}
                        status={entry?.status ?? "empty"}
                        isEditable={!!isEditable}
                        isLastRow={isLastRow}
                        onClick={() =>
                          setEditingCell({
                            entryId: entry?.id,
                            weekId: week.id,
                            rowId: row.id,
                            rowName: row.name,
                            fieldType: row.fieldType as CalendarFieldType,
                            currentContent: entry?.content ?? "",
                            currentStatus:
                              (entry?.status as "empty" | "draft" | "confirmed") ?? "empty",
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {editingCell && (
        <CellEditor
          entryId={editingCell.entryId}
          weekId={editingCell.weekId}
          rowId={editingCell.rowId}
          rowName={editingCell.rowName}
          fieldType={editingCell.fieldType}
          currentContent={editingCell.currentContent}
          currentStatus={editingCell.currentStatus}
          onClose={() => setEditingCell(null)}
        />
      )}
    </main>
  );
}
