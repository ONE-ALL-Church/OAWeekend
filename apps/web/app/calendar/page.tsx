"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import db from "@/lib/instant";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import {
  useCalendarSections,
  useCalendarWeeks,
  useCalendarSeriesInRange,
  useLatestCalendarWeek,
  useDateRangeFromAnchor,
} from "@/hooks/use-calendar";
import { useRockData } from "@/hooks/use-rock-data";
import { useRockEvents, useEventsByWeek } from "@/hooks/use-rock-events";
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
  const { seriesList } = useCalendarSeriesInRange(rangeStart, rangeEnd);
  const latestWeek = useLatestCalendarWeek();
  const { campuses } = useRockData();
  const { events: rockEvents, isLoading: eventsLoading } = useRockEvents();
  const weekStarts = weeks.map((w) => w.weekStart);
  const eventsByWeek = useEventsByWeek(rockEvents, weekStarts);

  const isLoading = sectionsLoading || weeksLoading;

  // Build a map of weekStart → series tint color for column highlighting
  const seriesTintByWeek = useMemo(() => {
    const map = new Map<string, string>();
    // Assign alternating tint styles to consecutive series
    const tints = [
      "rgba(255, 201, 5, 0.06)",   // warm yellow
      "rgba(104, 115, 179, 0.06)", // cool indigo
    ];
    // Sort series by startWeek
    const sorted = [...seriesList].sort((a, b) => a.startWeek.localeCompare(b.startWeek));
    sorted.forEach((series, idx) => {
      const tint = tints[idx % tints.length]!;
      for (const week of series.weeks ?? []) {
        map.set(week.weekStart, tint);
      }
    });
    return map;
  }, [seriesList]);

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
    if (latestWeek) {
      // Add the next Saturday after the latest week in the entire calendar
      const lastDate = new Date(latestWeek.weekStart + "T00:00:00");
      lastDate.setDate(lastDate.getDate() + 7);
      await createCalendarWeek({ weekStart: lastDate.toISOString().slice(0, 10) });
    } else {
      // No weeks at all — seed with the upcoming Saturday
      const today = new Date();
      const day = today.getDay();
      const daysUntilSat = (6 - day + 7) % 7 || 7;
      today.setDate(today.getDate() + daysUntilSat);
      await createCalendarWeek({ weekStart: today.toISOString().slice(0, 10) });
    }
  }, [latestWeek]);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = useCallback(async () => {
    if (isSyncing || weeks.length === 0) return;
    setIsSyncing(true);
    try {
      await Promise.all(
        weeks.map((week) =>
          fetch(`/api/calendar/week/${week.weekStart}/prefill-planning-center`, {
            method: "POST",
          }),
        ),
      );
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, weeks]);

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-oa-stone-300">Please sign in to view the calendar.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 min-w-0 overflow-x-hidden bg-oa-white">
      <CalendarToolbar
        anchorYear={anchorYear}
        anchorMonth={anchorMonth}
        onAnchorChange={handleAnchorChange}
        campus={campus}
        onCampusChange={setCampus}
        campuses={toolbarCampuses}
        onAddWeek={handleAddWeek}
        onSync={handleSync}
        isSyncing={isSyncing}
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
          eventsByWeek={eventsByWeek}
          eventsLoading={eventsLoading}
          seriesTintByWeek={seriesTintByWeek}
        />
      )}
    </main>
  );
}
