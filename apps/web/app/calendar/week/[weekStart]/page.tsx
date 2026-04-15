"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCalendarWeek, useCalendarSections } from "@/hooks/use-calendar";
import { useUserEditableSections } from "@/hooks/use-calendar-roles";
import { WeekDetailSection } from "@/components/calendar/week-detail-section";
import type { CalendarEntry } from "@/lib/instant";

interface PrefillResult {
  written: string[];
  skipped: string[];
  planningCenter: {
    sourceOfTruth: string | null;
    seriesTitle: string | null;
    sermonTitle: string | null;
    songs: Array<{ title: string; key: string | null }>;
    hostsByCampus: Array<{ campusName: string | null; hosts: string[] }>;
    worshipLeadersByCampus: Array<{
      campusName: string | null;
      worshipLeaders: string[];
    }>;
    serviceTimesByCampus: Array<{
      campusName: string | null;
      serviceTimes: string[];
    }>;
    notes: string[];
  };
}

export default function WeekDetailPage() {
  const params = useParams<{ weekStart: string }>();
  const weekStart = params.weekStart;
  const [prefillState, setPrefillState] = useState<{
    isLoading: boolean;
    error: string | null;
    result: PrefillResult | null;
  }>({
    isLoading: false,
    error: null,
    result: null,
  });

  const { week, isLoading: weekLoading } = useCalendarWeek(weekStart);
  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { editableSectionIds } = useUserEditableSections();

  const isLoading = weekLoading || sectionsLoading;

  // Build per-section entry maps: sectionId → (rowId → entry)
  const sectionEntryMaps = useMemo(() => {
    const maps = new Map<string, Map<string, CalendarEntry>>();
    if (!week) return maps;

    for (const entry of week.entries ?? []) {
      const row = (entry as CalendarEntry & { row?: { id: string } }).row;
      if (row) {
        // Find which section this row belongs to
        for (const section of sections) {
          if (section.rows.some((r) => r.id === row.id)) {
            if (!maps.has(section.id)) maps.set(section.id, new Map());
            maps.get(section.id)!.set(row.id, entry);
            break;
          }
        }
      }
    }
    return maps;
  }, [week, sections]);

  // Format header
  const weekDate = weekStart
    ? (() => {
        const sat = new Date(weekStart + "T00:00:00");
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        return `${sat.toLocaleDateString("en-US", { month: "long", day: "numeric" })} & ${sun.getDate()}, ${sat.getFullYear()}`;
      })()
    : "";

  // Prev/next week
  const prevWeek = weekStart
    ? (() => {
        const d = new Date(weekStart + "T00:00:00");
        d.setDate(d.getDate() - 7);
        return d.toISOString().slice(0, 10);
      })()
    : null;
  const nextWeek = weekStart
    ? (() => {
        const d = new Date(weekStart + "T00:00:00");
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  // Series info from the week's linked series
  const seriesInfo = week?.series?.[0] ?? null;

  async function handlePrefill() {
    setPrefillState({
      isLoading: true,
      error: null,
      result: null,
    });

    try {
      const res = await fetch(
        `/api/calendar/week/${weekStart}/prefill-planning-center`,
        {
          method: "POST",
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Planning Center prefill failed");
      }

      setPrefillState({
        isLoading: false,
        error: null,
        result: data as PrefillResult,
      });
    } catch (error) {
      setPrefillState({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Planning Center prefill failed",
        result: null,
      });
    }
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#faf9f7]">
        <p className="text-sm text-oa-stone-300">Loading week...</p>
      </main>
    );
  }

  if (!week) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#faf9f7] gap-3">
        <p className="text-sm text-oa-stone-300">Week not found</p>
        <Link
          href="/calendar"
          className="text-sm text-oa-yellow-600 hover:underline"
        >
          ← Back to calendar
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-oa-white border-b border-oa-stone-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Calendar
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-oa-black-900">
            {weekDate}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {seriesInfo && (
              <Link
                href={`/calendar/series/${seriesInfo.id}`}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-oa-yellow-600 hover:underline"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: (seriesInfo as { color?: string }).color ?? "#FFC905" }}
                />
                {(seriesInfo as { name?: string }).name}
              </Link>
            )}
            {week.label && (
              <span className="inline-flex px-2.5 py-0.5 rounded-[12px] text-[11px] font-semibold bg-oa-yellow-500/12 text-oa-yellow-600">
                {week.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={handlePrefill}
            disabled={prefillState.isLoading}
            className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms] disabled:opacity-50"
          >
            {prefillState.isLoading
              ? "Pulling Planning Center..."
              : "Prefill from Planning Center"}
          </button>
          {prevWeek && (
            <Link
              href={`/calendar/week/${prevWeek}`}
              className="w-9 h-9 rounded-[--radius-button] border border-oa-stone-200 flex items-center justify-center text-sm text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
            >
              ←
            </Link>
          )}
          {nextWeek && (
            <Link
              href={`/calendar/week/${nextWeek}`}
              className="w-9 h-9 rounded-[--radius-button] border border-oa-stone-200 flex items-center justify-center text-sm text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms]"
            >
              →
            </Link>
          )}
        </div>
      </div>

      {(prefillState.error || prefillState.result) && (
        <div className="max-w-[960px] mx-auto w-full px-8 pt-6">
          <div className="rounded-[--radius-card] border border-oa-stone-200 bg-oa-white px-5 py-4 shadow-[--shadow-card]">
            {prefillState.error ? (
              <p className="text-sm text-[#b42318]">{prefillState.error}</p>
            ) : prefillState.result ? (
              <div className="space-y-3 text-sm text-oa-black-900">
                <p>
                  Filled {prefillState.result.written.length} blank field
                  {prefillState.result.written.length === 1 ? "" : "s"} from
                  Planning Center.
                  {prefillState.result.skipped.length > 0 &&
                    ` Skipped ${prefillState.result.skipped.length} field${prefillState.result.skipped.length === 1 ? "" : "s"} that already had content.`}
                </p>
                <p className="text-oa-black-700">
                  Source of truth for songs:{" "}
                  {prefillState.result.planningCenter.sourceOfTruth ?? "none"}.
                  {prefillState.result.planningCenter.seriesTitle &&
                    ` Series: ${prefillState.result.planningCenter.seriesTitle}.`}
                  {prefillState.result.planningCenter.sermonTitle &&
                    ` Sermon title: ${prefillState.result.planningCenter.sermonTitle}.`}
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {prefillState.result.planningCenter.hostsByCampus.map(
                    (campus) => (
                      <div key={`hosts-${campus.campusName ?? "unknown"}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-oa-stone-300">
                          {campus.campusName ?? "Unknown campus"} Host
                        </div>
                        <div className="mt-1 text-[13px]">
                          {campus.hosts.length > 0
                            ? campus.hosts.join(", ")
                            : "No host assigned"}
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <p className="text-[12px] text-oa-stone-300">
                  Also available from the API for a future wrapper: worship
                  leaders, service times, song keys, and full service items.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Section cards */}
      <div className="max-w-[960px] mx-auto w-full px-8 py-6 space-y-4">
        {sections.map((section) => {
          const entryMap = sectionEntryMaps.get(section.id) ?? new Map();
          const isEditable =
            editableSectionIds === null || editableSectionIds.has(section.id);

          return (
            <WeekDetailSection
              key={section.id}
              section={section}
              entries={entryMap}
              weekId={week.id}
              isEditable={isEditable}
            />
          );
        })}
      </div>
    </main>
  );
}
