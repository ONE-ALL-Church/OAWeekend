"use client";

import { useMemo } from "react";
import db from "@/lib/instant";
import type {
  CalendarSectionWithRows,
  CalendarWeekWithEntries,
  CalendarEntry,
} from "@/lib/instant";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/**
 * Query all calendar sections with their rows, ordered by sortOrder.
 */
export function useCalendarSections() {
  const { isLoading, error, data } = db.useQuery({
    calendarSections: {
      $: { order: { sortOrder: "asc" } },
      rows: {
        $: { order: { sortOrder: "asc" } },
      },
    },
  });

  return {
    sections: (data?.calendarSections ?? []) as CalendarSectionWithRows[],
    isLoading,
    error,
  };
}

/**
 * Query calendar weeks within a date range, with their entries and series.
 * Weeks are ordered by weekStart ascending.
 */
export function useCalendarWeeks(rangeStart: string, rangeEnd: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarWeeks: {
      $: {
        where: {
          and: [
            { weekStart: { $gte: rangeStart } },
            { weekStart: { $lte: rangeEnd } },
          ],
        },
        order: { weekStart: "asc" },
      },
      entries: {
        row: {},
      },
      series: {},
    },
  });

  return {
    weeks: (data?.calendarWeeks ?? []) as CalendarWeekWithEntries[],
    isLoading,
    error,
  };
}

/**
 * Query a single week by its weekStart date string.
 */
export function useCalendarWeek(weekStart: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarWeeks: {
      $: { where: { weekStart } },
      entries: {
        row: {},
      },
      series: {},
    },
  });

  return {
    week: (data?.calendarWeeks?.[0] ?? null) as CalendarWeekWithEntries | null,
    isLoading,
    error,
  };
}

/**
 * Query all series overlapping a date range (for rendering series spans in grid).
 */
export function useCalendarSeriesInRange(rangeStart: string, rangeEnd: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarSeries: {
      $: {
        where: {
          and: [
            { startWeek: { $lte: rangeEnd } },
            { endWeek: { $gte: rangeStart } },
          ],
        },
        order: { startWeek: "asc" },
      },
      weeks: {},
    },
  });

  return {
    seriesList: data?.calendarSeries ?? [],
    isLoading,
    error,
  };
}

/**
 * Query the single latest (max weekStart) calendar week across ALL data.
 */
export function useLatestCalendarWeek() {
  const { data } = db.useQuery({
    calendarWeeks: {
      $: { order: { weekStart: "desc" }, limit: 1 },
    },
  });

  return data?.calendarWeeks?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Grid data builder
// ---------------------------------------------------------------------------

/**
 * Build a lookup map from (weekId, rowId) → CalendarEntry for fast cell access.
 */
export function buildEntryMap(
  weeks: CalendarWeekWithEntries[],
): Map<string, CalendarEntry> {
  const map = new Map<string, CalendarEntry>();
  for (const week of weeks) {
    for (const entry of week.entries ?? []) {
      const row = (entry as CalendarEntry & { row?: { id: string } }).row;
      if (row) {
        map.set(`${week.id}:${row.id}`, entry);
      }
    }
  }
  return map;
}

/**
 * Compute the date range for a given page offset (0 = current, -1 = prev, 1 = next).
 * Each page spans ~2 months (8 weeks).
 */
export function useDateRange(pageOffset: number) {
  return useMemo(() => {
    const today = new Date();
    // Find the most recent Saturday
    const day = today.getDay();
    const diffToSaturday = (day + 1) % 7; // days since last Saturday
    const baseSaturday = new Date(today);
    baseSaturday.setDate(today.getDate() - diffToSaturday);

    // Apply page offset (8 weeks per page)
    const startDate = new Date(baseSaturday);
    startDate.setDate(baseSaturday.getDate() + pageOffset * 56); // 8 weeks * 7 days

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 55); // 8 weeks - 1 day

    const rangeStart = startDate.toISOString().slice(0, 10);
    const rangeEnd = endDate.toISOString().slice(0, 10);

    return { rangeStart, rangeEnd };
  }, [pageOffset]);
}

/**
 * Compute a wide date range centered on an anchor month/year.
 * Loads 3 months before and 3 months after the anchor (≈26 weeks total).
 */
export function useDateRangeFromAnchor(anchorYear: number, anchorMonth: number) {
  return useMemo(() => {
    // 3 months before the anchor
    const startDate = new Date(anchorYear, anchorMonth - 3, 1);
    // Find the Saturday on or before that date
    const startDay = startDate.getDay();
    const diffToSat = (startDay + 1) % 7;
    startDate.setDate(startDate.getDate() - diffToSat);

    // 3 months after the anchor (end of that month)
    const endDate = new Date(anchorYear, anchorMonth + 4, 0); // last day of month+3

    const rangeStart = startDate.toISOString().slice(0, 10);
    const rangeEnd = endDate.toISOString().slice(0, 10);

    return { rangeStart, rangeEnd };
  }, [anchorYear, anchorMonth]);
}
