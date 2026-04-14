"use client";

import { useState, useMemo, useCallback, forwardRef } from "react";
import Link from "next/link";
import type {
  CalendarSectionWithRows,
  CalendarWeekWithEntries,
  CalendarEntry,
  CalendarRow,
} from "@/lib/instant";
import { buildEntryMap } from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import type { RockEventOccurrence } from "@/hooks/use-rock-events";
import { CalendarSectionHeader } from "./calendar-section-header";
import { CalendarCell } from "./calendar-cell";
import { CellEditor } from "./cell-editor";
import type { CalendarFieldType } from "@oaweekend/shared";

interface CalendarGridProps {
  sections: CalendarSectionWithRows[];
  weeks: CalendarWeekWithEntries[];
  campusFilter: string;
  /** Rock events mapped by weekStart → occurrences for that week */
  eventsByWeek?: Map<string, RockEventOccurrence[]>;
  /** Whether Rock events are still loading */
  eventsLoading?: boolean;
}

interface EditingCell {
  entryId?: string;
  weekId: string;
  rowId: string;
  rowName: string;
  fieldType: CalendarFieldType;
  currentContent: string;
  currentStatus: "empty" | "draft" | "confirmed";
}

export const CalendarGrid = forwardRef<HTMLDivElement, CalendarGridProps>(function CalendarGrid({
  sections,
  weeks,
  campusFilter,
  eventsByWeek,
  eventsLoading,
}, ref) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const { editableSectionIds } = useUserEditableSections();

  const entryMap = useMemo(() => buildEntryMap(weeks), [weeks]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSectionEditable = useCallback(
    (sectionId: string) => {
      if (editableSectionIds === null) return true; // Admin
      return editableSectionIds.has(sectionId);
    },
    [editableSectionIds],
  );

  // Compute month spans for header
  const monthSpans = useMemo(() => {
    const spans: Array<{ label: string; count: number }> = [];
    let currentMonth = "";
    let count = 0;

    for (const week of weeks) {
      const date = new Date(week.weekStart + "T00:00:00");
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (monthLabel !== currentMonth) {
        if (currentMonth) spans.push({ label: currentMonth, count });
        currentMonth = monthLabel;
        count = 1;
      } else {
        count++;
      }
    }
    if (currentMonth) spans.push({ label: currentMonth, count });
    return spans;
  }, [weeks]);

  const gridCols = `180px repeat(${weeks.length}, minmax(140px, 1fr))`;

  return (
    <>
      <div ref={ref} className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: gridCols,
            minWidth: `${180 + weeks.length * 140}px`,
          }}
        >
          {/* Month header row */}
          <div className="bg-oa-white border-b border-oa-stone-200" />
          {monthSpans.map((span, i) => (
            <div
              key={i}
              className="bg-oa-sand-100/35 border-b border-oa-stone-200 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-oa-black-700"
              style={{ gridColumn: `span ${span.count}` }}
            >
              {span.label}
            </div>
          ))}

          {/* Week header row */}
          <div className="bg-oa-white border-b-2 border-oa-stone-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-oa-stone-300">
            Date
          </div>
          {weeks.map((week) => {
            const sat = new Date(week.weekStart + "T00:00:00");
            const sun = new Date(sat);
            sun.setDate(sat.getDate() + 1);
            const satDay = sat.getDate();
            const sunDay = sun.getDate();

            return (
              <Link
                key={week.id}
                href={`/calendar/week/${week.weekStart}`}
                className="bg-oa-white border-b-2 border-oa-stone-200 px-2 py-2.5 text-center hover:bg-oa-sand-100/35 transition-colors duration-[220ms]"
              >
                <div className="text-[13px] font-semibold text-oa-black-900">
                  {satDay} &amp; {sunDay}
                </div>
                {week.label && (
                  <div className="mt-1 inline-block rounded-[10px] bg-oa-yellow-500/12 px-2 py-0.5 text-[10px] font-semibold text-oa-yellow-600">
                    {week.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Section rows */}
          {sections.map((section) => {
            const isExpanded = !collapsedSections.has(section.id);
            const visibleRows = campusFilter
              ? section.rows.filter(
                  (r) => !r.campusSpecific || r.campusSpecific,
                )
              : section.rows;
            const editable = isSectionEditable(section.id);
            const isEventsSection = section.slug === "events-campaigns";

            return (
              <SectionBlock
                key={section.id}
                section={section}
                rows={visibleRows as CalendarRow[]}
                weeks={weeks}
                entryMap={entryMap}
                isExpanded={isExpanded}
                onToggle={() => toggleSection(section.id)}
                isEditable={editable}
                onCellClick={(cell) => setEditingCell(cell)}
                eventsByWeek={isEventsSection ? eventsByWeek : undefined}
                eventsLoading={isEventsSection ? eventsLoading : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Cell editor modal */}
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
    </>
  );
});

function SectionBlock({
  section,
  rows,
  weeks,
  entryMap,
  isExpanded,
  onToggle,
  isEditable,
  onCellClick,
  eventsByWeek,
  eventsLoading,
}: {
  section: CalendarSectionWithRows;
  rows: CalendarRow[];
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isExpanded: boolean;
  onToggle: () => void;
  isEditable: boolean;
  onCellClick: (cell: EditingCell) => void;
  eventsByWeek?: Map<string, RockEventOccurrence[]>;
  eventsLoading?: boolean;
}) {
  // Split rows: event rows are auto-populated from Rock, campaign rows stay manual
  const eventRowSlugs = new Set([
    "all-church-events",
    "sd-events",
    "rc-events",
    "wc-events",
  ]);
  const manualRows = eventsByWeek !== undefined
    ? rows.filter((r) => !eventRowSlugs.has(r.slug))
    : rows;

  return (
    <>
      <CalendarSectionHeader
        name={section.name}
        slug={section.slug}
        color={section.color}
        rowCount={rows.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />

      {isExpanded && (
        <>
          {/* Rock featured events row (replaces manual event rows) */}
          {eventsByWeek !== undefined && (
            <RockEventsRow
              weeks={weeks}
              eventsByWeek={eventsByWeek}
              isLoading={eventsLoading ?? false}
              isLastRow={manualRows.length === 0}
            />
          )}

          {/* Manual rows (campaigns, or all rows if not events section) */}
          {manualRows.map((row, rowIdx) => {
            const isLastRow = rowIdx === manualRows.length - 1;
            return (
              <RowBlock
                key={row.id}
                row={row}
                weeks={weeks}
                entryMap={entryMap}
                isLastRow={isLastRow}
                isEditable={isEditable}
                onCellClick={onCellClick}
              />
            );
          })}
        </>
      )}
    </>
  );
}

function RowBlock({
  row,
  weeks,
  entryMap,
  isLastRow,
  isEditable,
  onCellClick,
}: {
  row: CalendarRow;
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isLastRow: boolean;
  isEditable: boolean;
  onCellClick: (cell: EditingCell) => void;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  return (
    <>
      {/* Row label */}
      <div
        className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center`}
      >
        {row.name}
      </div>

      {/* Cells */}
      {weeks.map((week) => {
        const entry = entryMap.get(`${week.id}:${row.id}`);

        return (
          <CalendarCell
            key={`${week.id}:${row.id}`}
            content={entry?.content ?? ""}
            fieldType={row.fieldType as CalendarFieldType}
            status={entry?.status ?? "empty"}
            isEditable={isEditable}
            isLastRow={isLastRow}
            onClick={() =>
              onCellClick({
                entryId: entry?.id,
                weekId: week.id,
                rowId: row.id,
                rowName: row.name,
                fieldType: row.fieldType as CalendarFieldType,
                currentContent: entry?.content ?? "",
                currentStatus: (entry?.status as "empty" | "draft" | "confirmed") ?? "empty",
              })
            }
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Rock Events Row — auto-populated from Rock RMS Featured Events
// ---------------------------------------------------------------------------

function RockEventsRow({
  weeks,
  eventsByWeek,
  isLoading,
  isLastRow,
}: {
  weeks: CalendarWeekWithEntries[];
  eventsByWeek: Map<string, RockEventOccurrence[]>;
  isLoading: boolean;
  isLastRow: boolean;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  return (
    <>
      {/* Row label */}
      <div
        className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center gap-1.5`}
      >
        <span>Featured Events</span>
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6873B3]/15 text-[9px] font-bold text-[#6873B3]">
          R
        </span>
      </div>

      {/* Cells */}
      {weeks.map((week) => {
        const eventsForWeek = eventsByWeek.get(week.weekStart) ?? [];

        return (
          <div
            key={`rock-events-${week.id}`}
            className={`px-2 py-1.5 text-xs bg-oa-white ${borderClass} border-r border-r-oa-stone-200/20 flex flex-col items-center justify-center gap-1 min-h-[40px]`}
          >
            {isLoading ? (
              /* Subtle skeleton placeholder */
              <div className="flex flex-col items-center gap-1 w-full animate-pulse">
                <div className="h-3 w-16 rounded-[6px] bg-oa-stone-200/40" />
                <div className="h-3 w-12 rounded-[6px] bg-oa-stone-200/25" />
              </div>
            ) : eventsForWeek.length === 0 ? (
              <span className="text-oa-stone-300 text-base">—</span>
            ) : (
              eventsForWeek.map((ev) => (
                <EventPill
                  key={`${ev.eventItemId}-${ev.campusId ?? "all"}`}
                  event={ev}
                />
              ))
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// EventPill — single event badge with rich hover card
// ---------------------------------------------------------------------------

function EventPill({ event }: { event: RockEventOccurrence }) {
  const [showCard, setShowCard] = useState(false);

  const dateStr = event.nextStartDateTime
    ? new Date(event.nextStartDateTime).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  const timeStr = event.nextStartDateTime
    ? new Date(event.nextStartDateTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowCard(true)}
      onMouseLeave={() => setShowCard(false)}
    >
      <span className="inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-[#6873B3]/12 text-[#6873B3] text-center leading-tight max-w-full truncate cursor-default">
        {event.name}
      </span>

      {/* Rich hover card */}
      {showCard && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-[--radius-card] bg-oa-white shadow-[--shadow-elevated] border border-oa-stone-200 overflow-hidden pointer-events-none">
          {/* Photo banner */}
          {event.photoUrl && (
            <div className="h-24 w-full bg-oa-stone-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="px-3 py-2.5 space-y-1.5">
            {/* Event name */}
            <p className="text-xs font-bold text-oa-black-900 leading-tight">
              {event.name}
            </p>

            {/* Date & time */}
            {dateStr && (
              <div className="flex items-center gap-1.5 text-[11px] text-oa-stone-300">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>{dateStr}{timeStr ? ` at ${timeStr}` : ""}</span>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-1.5 text-[11px] text-oa-stone-300">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Campuses */}
            {event.campuses && (
              <div className="flex items-center gap-1.5 text-[11px] text-oa-stone-300">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M8 1.5L2 5.5v9h12v-9L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <rect x="6" y="9.5" width="4" height="5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span className="truncate">{event.campuses}</span>
              </div>
            )}

            {/* Summary */}
            {event.summary && (
              <p className="text-[11px] text-oa-stone-300 leading-snug line-clamp-3 pt-0.5 border-t border-oa-stone-200/50">
                {event.summary}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
