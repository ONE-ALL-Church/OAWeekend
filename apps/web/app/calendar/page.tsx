"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import db from "@/lib/instant";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import {
  useCalendarSections,
  useCalendarWeeks,
  useDateRangeFromAnchor,
} from "@/hooks/use-calendar";
import { useRockData } from "@/hooks/use-rock-data";
import { createCalendarWeek } from "@/hooks/use-calendar-settings";

export default function CalendarPage() {
  const { user } = db.useAuth();
  const now = new Date();
  const [anchorYear, setAnchorYear] = useState(now.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(now.getMonth());
  const [campus, setCampus] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rangeStart, rangeEnd } = useDateRangeFromAnchor(anchorYear, anchorMonth);

  const { sections, isLoading: sectionsLoading } = useCalendarSections();
  const { weeks, isLoading: weeksLoading } = useCalendarWeeks(
    rangeStart,
    rangeEnd,
  );
  const { campuses } = useRockData();

  const isLoading = sectionsLoading || weeksLoading;

  // Map Rock campuses (id: number) to toolbar format (id: string)
  const toolbarCampuses = campuses.map((c) => ({ id: String(c.id), name: c.name }));

  // Scroll to the anchor month column when anchor changes or weeks load
  useEffect(() => {
    if (!scrollRef.current || weeks.length === 0) return;

    // Find the first week that falls in the anchor month
    const anchorStr = `${anchorYear}-${String(anchorMonth + 1).padStart(2, "0")}`;
    const targetIdx = weeks.findIndex((w) => w.weekStart.startsWith(anchorStr));

    if (targetIdx >= 0) {
      // Each column is ~140px, label column is 180px
      const scrollTo = targetIdx * 140;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  }, [anchorYear, anchorMonth, weeks]);

  const handleAnchorChange = useCallback((year: number, month: number) => {
    setAnchorYear(year);
    setAnchorMonth(month);
  }, []);

  const handleAddWeek = useCallback(async () => {
    let nextWeekStart: string;

    if (weeks.length === 0) {
      // No weeks visible — create one for the Saturday in the anchor month
      const anchor = new Date(anchorYear, anchorMonth, 1);
      const day = anchor.getDay();
      // Find the first Saturday on or after the 1st
      const daysUntilSat = (6 - day + 7) % 7;
      anchor.setDate(anchor.getDate() + daysUntilSat);
      nextWeekStart = anchor.toISOString().slice(0, 10);
    } else {
      const lastWeek = weeks[weeks.length - 1]!;
      const lastDate = new Date(lastWeek.weekStart + "T00:00:00");
      lastDate.setDate(lastDate.getDate() + 7);
      nextWeekStart = lastDate.toISOString().slice(0, 10);
    }

    await createCalendarWeek({ weekStart: nextWeekStart });
  }, [weeks, anchorYear, anchorMonth]);

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
        anchorYear={anchorYear}
        anchorMonth={anchorMonth}
        onAnchorChange={handleAnchorChange}
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
          ref={scrollRef}
          sections={sections}
          weeks={weeks}
          campusFilter={campus}
        />
      )}
    </main>
  );
}
