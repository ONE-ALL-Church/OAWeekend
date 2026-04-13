"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";
import type { CalendarSeriesWithWeeks } from "@/lib/instant";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useCalendarSeries() {
  const { isLoading, error, data } = db.useQuery({
    calendarSeries: {
      $: { order: { startWeek: "asc" } },
      weeks: {},
    },
  });

  return {
    seriesList: (data?.calendarSeries ?? []) as CalendarSeriesWithWeeks[],
    isLoading,
    error,
  };
}

export function useCalendarSeriesById(seriesId: string) {
  const { isLoading, error, data } = db.useQuery({
    calendarSeries: {
      $: { where: { id: seriesId } },
      weeks: {
        $: { order: { weekStart: "asc" } },
        entries: {
          row: {},
        },
      },
    },
  });

  return {
    series: data?.calendarSeries?.[0] ?? null,
    isLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

export async function createCalendarSeries(params: {
  name: string;
  description?: string;
  color: string;
  startWeek: string;
  endWeek: string;
  weekIds: string[];
}) {
  const seriesId = id();
  const linkOps = params.weekIds.map((weekId) =>
    db.tx.calendarSeries[seriesId].link({ weeks: weekId }),
  );

  await db.transact([
    db.tx.calendarSeries[seriesId].update({
      name: params.name,
      description: params.description ?? "",
      color: params.color,
      startWeek: params.startWeek,
      endWeek: params.endWeek,
      createdAt: Date.now(),
    }),
    ...linkOps,
  ]);
  return seriesId;
}

export async function updateCalendarSeries(
  seriesId: string,
  updates: Partial<{
    name: string;
    description: string;
    color: string;
    startWeek: string;
    endWeek: string;
  }>,
) {
  await db.transact(db.tx.calendarSeries[seriesId].update(updates));
}

export async function deleteCalendarSeries(seriesId: string) {
  await db.transact(db.tx.calendarSeries[seriesId].delete());
}
