"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCalendarSeriesById } from "@/hooks/use-calendar-series";
import { SeriesTimeline } from "@/components/calendar/series-timeline";

export default function SeriesDetailPage() {
  const params = useParams<{ seriesId: string }>();
  const { series, isLoading } = useCalendarSeriesById(params.seriesId);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#faf9f7]">
        <p className="text-sm text-oa-stone-300">Loading series...</p>
      </main>
    );
  }

  if (!series) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#faf9f7] gap-3">
        <p className="text-sm text-oa-stone-300">Series not found</p>
        <Link
          href="/calendar"
          className="text-sm text-oa-yellow-600 hover:underline"
        >
          ← Back to calendar
        </Link>
      </main>
    );
  }

  const typedSeries = series as {
    id: string;
    name: string;
    description?: string;
    color: string;
    startWeek: string;
    endWeek: string;
    weeks: Array<{ id: string; weekStart: string; label?: string }>;
  };

  const weekCount = typedSeries.weeks?.length ?? 0;
  const startDate = typedSeries.startWeek
    ? new Date(typedSeries.startWeek + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const endDate = typedSeries.endWeek
    ? new Date(typedSeries.endWeek + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <main className="flex flex-col flex-1 bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-oa-white border-b border-oa-stone-200 px-8 py-6 flex items-start gap-5">
        <Link
          href="/calendar"
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-[220ms] mt-1"
        >
          ← Calendar
        </Link>
        <div
          className="w-1 min-h-[70px] rounded-sm shrink-0"
          style={{ backgroundColor: typedSeries.color }}
        />
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-yellow-600 mb-1">
            Sermon Series
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-oa-black-900">
            {typedSeries.name}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-[13px] text-oa-black-700">
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: typedSeries.color }}
              />
              {weekCount} week{weekCount !== 1 ? "s" : ""}
            </span>
            <span>
              {startDate} — {endDate}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto w-full px-8 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-stone-300 mb-1.5">
              Duration
            </div>
            <div className="text-xl font-bold text-oa-black-900">
              {weekCount} weeks
            </div>
            <div className="text-xs text-oa-black-700 mt-0.5">
              {startDate} — {endDate}
            </div>
          </div>
          <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-stone-300 mb-1.5">
              Description
            </div>
            <div className="text-sm text-oa-black-900">
              {typedSeries.description || (
                <span className="text-oa-stone-300 italic">No description</span>
              )}
            </div>
          </div>
          <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-oa-stone-300 mb-1.5">
              Color
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: typedSeries.color }}
              />
              <span className="text-sm font-mono text-oa-black-700">
                {typedSeries.color}
              </span>
            </div>
          </div>
        </div>

        {/* Week timeline */}
        <SeriesTimeline
          weeks={typedSeries.weeks ?? []}
          seriesName={typedSeries.name}
        />
      </div>
    </main>
  );
}
