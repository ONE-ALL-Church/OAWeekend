"use client";

import { useState, useCallback } from "react";
import db from "@/lib/instant";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import {
  useCalendarSections,
  useCalendarWeeks,
  useDateRange,
} from "@/hooks/use-calendar";
import { useRockData } from "@/hooks/use-rock-data";
import { createCalendarWeek } from "@/hooks/use-calendar-settings";

export default function CalendarPage() {
  const { user } = db.useAuth();
  const [pageOffset, setPageOffset] = useState(0);
  const [campus, setCampus] = useState("");
  const { rangeStart, rangeEnd } = useDateRange(pageOffset);

  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { weeks, isLoading: weeksLoading } = useCalendarWeeks(
    rangeStart,
    rangeEnd,
  );
  const { campuses } = useRockData();

  const isLoading = sectionsLoading || weeksLoading;

  // Map Rock campuses (id: number) to toolbar format (id: string)
  const toolbarCampuses = campuses.map((c) => ({ id: String(c.id), name: c.name }));

  // Build range label
  const rangeLabel = (() => {
    if (weeks.length === 0) return "No weeks";
    const first = new Date(weeks[0]!.weekStart + "T00:00:00");
    const last = new Date(weeks[weeks.length - 1]!.weekStart + "T00:00:00");
    const fmtOpts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    const startLabel = first.toLocaleDateString("en-US", fmtOpts);
    const endLabel = last.toLocaleDateString("en-US", fmtOpts);
    return startLabel === endLabel ? startLabel : `${startLabel} — ${endLabel}`;
  })();

  const handleAddWeek = useCallback(async () => {
    // Add the next Saturday after the last week
    if (weeks.length === 0) return;
    const lastWeek = weeks[weeks.length - 1]!;
    const lastDate = new Date(lastWeek.weekStart + "T00:00:00");
    lastDate.setDate(lastDate.getDate() + 7);
    const nextWeekStart = lastDate.toISOString().slice(0, 10);
    await createCalendarWeek({ weekStart: nextWeekStart });
  }, [weeks]);

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Please sign in to view the calendar.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-oa-white">
      <CalendarToolbar
        rangeLabel={rangeLabel}
        onPrev={() => setPageOffset((p) => p - 1)}
        onNext={() => setPageOffset((p) => p + 1)}
        campus={campus}
        onCampusChange={setCampus}
        campuses={toolbarCampuses}
        onAddWeek={handleAddWeek}
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-sm text-oa-stone-300">Loading calendar...</p>
        </div>
      ) : weeks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center space-y-2">
            <p className="text-sm text-oa-stone-300 italic">
              No weeks in this range
            </p>
            <button
              onClick={handleAddWeek}
              className="px-4 py-2 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
            >
              + Add First Week
            </button>
          </div>
        </div>
      ) : (
        <CalendarGrid
          sections={sections}
          weeks={weeks}
          campusFilter={campus}
        />
      )}
    </main>
  );
}
