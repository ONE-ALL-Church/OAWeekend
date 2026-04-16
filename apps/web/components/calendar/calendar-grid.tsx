"use client";

import React, { useState, useMemo, useCallback, forwardRef, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  CalendarSectionWithRows,
  CalendarWeekWithEntries,
  CalendarEntry,
  CalendarRow,
} from "@/lib/instant";
import { buildEntryMap } from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import type { RockEventOccurrence, CategorizedWeekEvents } from "@/hooks/use-rock-events";
import { CalendarSectionHeader } from "./calendar-section-header";
import { CalendarCell } from "./calendar-cell";
import { CellEditor } from "./cell-editor";
import type { CalendarFieldType } from "@oaweekend/shared";

interface CalendarGridProps {
  sections: CalendarSectionWithRows[];
  weeks: CalendarWeekWithEntries[];
  campusFilter: string;
  /** Rock events mapped by weekStart → categorized event lists */
  eventsByWeek?: Map<string, CategorizedWeekEvents>;
  /** Whether Rock events are still loading */
  eventsLoading?: boolean;
  /** weekStart → CSS background color for series column tinting */
  seriesTintByWeek?: Map<string, string>;
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
  seriesTintByWeek,
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

  // Scroll buttons
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, weeks.length]);

  const scrollBy = useCallback((dir: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -420 : 420, behavior: "smooth" });
  }, []);

  // Merge refs — forward ref + local ref
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  return (
    <>
      {/* min-w-0 is critical — parent is flex column, without min-w-0 this div
          expands to fit the inner grid and overflow-x-auto never triggers.
          The w-full forces it to the flex parent's width so the scrollable
          child can overflow horizontally within a clipped viewport. */}
      <div className="relative w-full min-w-0 overflow-hidden">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-[180px] top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-oa-white/90 border border-oa-stone-200 shadow-md flex items-center justify-center text-oa-black-700 hover:bg-oa-sand-100 transition-colors"
            aria-label="Scroll left"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-oa-white/90 border border-oa-stone-200 shadow-md flex items-center justify-center text-oa-black-700 hover:bg-oa-sand-100 transition-colors"
            aria-label="Scroll right"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}

      <div ref={mergedRef} className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-oa-stone-100/50 [&::-webkit-scrollbar-thumb]:bg-oa-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-oa-stone-300">
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
              className="bg-oa-sand-100/10 border-b border-oa-stone-200 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-oa-black-700"
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
            const tint = seriesTintByWeek?.get(week.weekStart);

            return (
              <Link
                key={week.id}
                href={`/calendar/week/${week.weekStart}`}
                className="border-b-2 border-oa-stone-200 px-2 py-2.5 text-center hover:bg-oa-sand-100/10 transition-colors duration-[220ms]"
                style={{ backgroundColor: tint ?? "var(--color-oa-white)" }}
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
                seriesTintByWeek={seriesTintByWeek}
              />
            );
          })}
        </div>
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
  seriesTintByWeek,
}: {
  section: CalendarSectionWithRows;
  rows: CalendarRow[];
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isExpanded: boolean;
  onToggle: () => void;
  isEditable: boolean;
  onCellClick: (cell: EditingCell) => void;
  eventsByWeek?: Map<string, CategorizedWeekEvents>;
  eventsLoading?: boolean;
  seriesTintByWeek?: Map<string, string>;
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

  const eventRows: Array<{ label: string; category: keyof CategorizedWeekEvents }> = [
    { label: "All Church Events", category: "all-church" },
    { label: "San Dimas Events", category: "san-dimas" },
    { label: "Rancho Events", category: "rancho" },
    { label: "West Covina Events", category: "west-covina" },
  ];

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
          {/* Rock featured event rows — one per category matching Google Sheet */}
          {eventsByWeek !== undefined &&
            eventRows.map((er, idx) => (
              <RockEventsRow
                key={er.category}
                label={er.label}
                category={er.category}
                weeks={weeks}
                eventsByWeek={eventsByWeek}
                isLoading={eventsLoading ?? false}
                isLastRow={manualRows.length === 0 && idx === eventRows.length - 1}
                seriesTintByWeek={seriesTintByWeek}
              />
            ))}

          {/* Manual rows (campaigns, or all rows if not events section) */}
          {(() => {
            const elements: React.ReactNode[] = [];

            for (let i = 0; i < manualRows.length; i++) {
              const row = manualRows[i]!;
              const parentRowId = (row as Record<string, unknown>).parentRowId as string | undefined;

              // Skip child rows — they're rendered under their parent
              if (parentRowId) continue;

              const children = manualRows.filter(
                (r) => (r as Record<string, unknown>).parentRowId === row.id,
              );

              if (children.length > 0) {
                // Parent header row
                elements.push(
                  <ParentRowHeader
                    key={`parent-${row.id}`}
                    name={row.name}
                    weeks={weeks}
                    isLastRow={false}
                    seriesTintByWeek={seriesTintByWeek}
                  />,
                );

                children.forEach((child, childIdx) => {
                  // Check if this is the last row in the entire section
                  const isLastChild = childIdx === children.length - 1;
                  const remainingNonChildRows = manualRows.slice(i + 1).filter(
                    (r) => !(r as Record<string, unknown>).parentRowId,
                  );
                  const isLastInSection = isLastChild && remainingNonChildRows.length === 0;

                  elements.push(
                    <RowBlock
                      key={child.id}
                      row={child}
                      weeks={weeks}
                      entryMap={entryMap}
                      isLastRow={isLastInSection}
                      isEditable={isEditable}
                      isSubRow={true}
                      onCellClick={onCellClick}
                      seriesTintByWeek={seriesTintByWeek}
                    />,
                  );
                });
              } else {
                // Regular row
                const isLast = manualRows.slice(i + 1).every(
                  (r) => !!(r as Record<string, unknown>).parentRowId,
                );

                elements.push(
                  <RowBlock
                    key={row.id}
                    row={row}
                    weeks={weeks}
                    entryMap={entryMap}
                    isLastRow={isLast}
                    isEditable={isEditable}
                    isSubRow={false}
                    onCellClick={onCellClick}
                    seriesTintByWeek={seriesTintByWeek}
                  />,
                );
              }
            }
            return elements;
          })()}
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
  isSubRow,
  onCellClick,
  seriesTintByWeek,
}: {
  row: CalendarRow;
  weeks: CalendarWeekWithEntries[];
  entryMap: Map<string, CalendarEntry>;
  isLastRow: boolean;
  isEditable: boolean;
  isSubRow: boolean;
  onCellClick: (cell: EditingCell) => void;
  seriesTintByWeek?: Map<string, string>;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  // A row with a campusId is always a PC-synced sub-row — never editable
  const isRowSyncedFromPC = !!(row as Record<string, unknown>).campusId;

  return (
    <>
      {/* Row label */}
      <div
        className={`px-4 py-2 text-xs font-medium text-oa-black-900 bg-oa-white ${borderClass} border-r border-r-oa-stone-200/30 flex items-center ${
          isSubRow ? "pl-8 text-oa-black-700" : ""
        }`}
      >
        {row.name}
      </div>

      {/* Cells */}
      {weeks.map((week) => {
        const entry = entryMap.get(`${week.id}:${row.id}`);
        const entrySource = (entry as Record<string, unknown> | undefined)?.source as string | undefined;
        const isSyncedFromPC = isRowSyncedFromPC || entrySource === "planning-center" || entrySource === "rock";
        const tint = seriesTintByWeek?.get(week.weekStart);

        return (
          <CalendarCell
            key={`${week.id}:${row.id}`}
            content={entry?.content ?? ""}
            fieldType={row.fieldType as CalendarFieldType}
            isEditable={isEditable}
            isSyncedFromPC={isSyncedFromPC}
            bgTint={tint}
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

function ParentRowHeader({
  name,
  weeks,
  isLastRow,
  seriesTintByWeek,
}: {
  name: string;
  weeks: CalendarWeekWithEntries[];
  isLastRow: boolean;
  seriesTintByWeek?: Map<string, string>;
}) {
  const borderClass = isLastRow
    ? "border-b-2 border-b-oa-stone-200"
    : "border-b border-b-oa-stone-200/50";

  return (
    <>
      <div
        className={`px-4 py-2 text-xs font-bold text-oa-black-900 bg-oa-sand-100/20 ${borderClass} border-r border-r-oa-stone-200/30 flex items-center gap-1.5`}
      >
        <span>{name}</span>
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#00A4C7]/12 text-[8px] font-bold text-[#00A4C7]" title="Synced from Planning Center">
          PC
        </span>
      </div>
      {weeks.map((week) => {
        const tint = seriesTintByWeek?.get(week.weekStart);
        return (
          <div
            key={`parent-${name}-${week.id}`}
            className={`${borderClass} border-r border-r-oa-stone-200/20 min-h-[40px]`}
            style={{ backgroundColor: tint ?? "rgba(var(--color-oa-sand-100), 0.2)" }}
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
  label,
  category,
  weeks,
  eventsByWeek,
  isLoading,
  isLastRow,
  seriesTintByWeek,
}: {
  label: string;
  category: keyof CategorizedWeekEvents;
  weeks: CalendarWeekWithEntries[];
  eventsByWeek: Map<string, CategorizedWeekEvents>;
  isLoading: boolean;
  isLastRow: boolean;
  seriesTintByWeek?: Map<string, string>;
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
        <span>{label}</span>
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#6873B3]/12 text-[8px] font-bold text-[#6873B3]">
          R
        </span>
      </div>

      {/* Cells */}
      {weeks.map((week) => {
        const weekData = eventsByWeek.get(week.weekStart);
        const eventsForRow = weekData ? weekData[category] : [];
        const tint = seriesTintByWeek?.get(week.weekStart);

        return (
          <div
            key={`rock-${category}-${week.id}`}
            className={`px-1.5 py-1.5 text-xs ${borderClass} border-r border-r-oa-stone-200/20 flex flex-col items-center justify-center gap-1 min-h-[40px]`}
            style={{ backgroundColor: tint ?? "var(--color-oa-white)" }}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-1 w-full animate-pulse">
                <div className="h-3 w-14 rounded-[6px] bg-oa-stone-200/40" />
              </div>
            ) : eventsForRow.length === 0 ? (
              <span className="text-oa-stone-300/60 text-[11px]">—</span>
            ) : (
              eventsForRow.map((ev) => (
                <EventPill
                  key={`${ev.eventItemId}`}
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
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
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
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 rounded-[--radius-card] bg-oa-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-oa-stone-200 overflow-hidden pointer-events-auto">
          {/* Photo banner */}
          {event.photoUrl && (
            <div className="h-32 w-full bg-oa-stone-100 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <p className="absolute bottom-2 left-3 right-3 text-sm font-bold text-white leading-tight drop-shadow-sm">
                {event.name}
              </p>
            </div>
          )}

          <div className="px-3.5 py-3 space-y-2">
            {/* Event name (only if no photo) */}
            {!event.photoUrl && (
              <p className="text-sm font-bold text-oa-black-900 leading-tight">
                {event.name}
              </p>
            )}

            {/* Date & time */}
            {dateStr && (
              <div className="flex items-start gap-2 text-xs text-oa-black-900">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-[#6873B3]">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="font-medium">{dateStr}</p>
                  {timeStr && <p className="text-oa-stone-300 text-[11px]">{timeStr}</p>}
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-2 text-xs text-oa-black-900">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-[#6873B3]">
                  <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <p>{event.location}</p>
              </div>
            )}

            {/* Campuses */}
            {event.campuses && (
              <div className="flex items-start gap-2 text-xs text-oa-black-900">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-[#6873B3]">
                  <path d="M8 1.5L2 5.5v9h12v-9L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <rect x="6" y="9.5" width="4" height="5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <p>{event.campuses}</p>
              </div>
            )}

            {/* Ministry tags */}
            {event.ministry && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {event.ministry.split(",").map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-medium bg-oa-yellow-500/15 text-oa-yellow-600"
                  >
                    {m.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Summary */}
            {event.summary && (
              <p className="text-[11px] text-oa-stone-300 leading-relaxed pt-1 border-t border-oa-stone-200/50">
                {event.summary}
              </p>
            )}

            {/* Calls to action */}
            {event.callsToAction.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-oa-stone-200/50">
                {event.callsToAction.map((cta, i) => (
                  <a
                    key={i}
                    href={cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex px-2.5 py-1 rounded-[--radius-button] text-[10px] font-semibold bg-[#6873B3] text-white hover:bg-[#5a64a0] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cta.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
