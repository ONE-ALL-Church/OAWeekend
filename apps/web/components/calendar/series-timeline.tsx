"use client";

import Link from "next/link";

interface SeriesWeek {
  id: string;
  weekStart: string;
  label?: string;
}

interface SeriesTimelineProps {
  weeks: SeriesWeek[];
  seriesName: string;
}

export function SeriesTimeline({ weeks, seriesName }: SeriesTimelineProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-oa-stone-200/50">
        <span className="text-sm font-bold text-oa-black-900">
          Weeks in Series
        </span>
        <span className="text-xs text-oa-stone-300">
          {weeks.length} week{weeks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {weeks.map((week, i) => {
        const isCurrent =
          week.weekStart <= today &&
          (i === weeks.length - 1 || weeks[i + 1]!.weekStart > today);

        const sat = new Date(week.weekStart + "T00:00:00");
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        const dateLabel = `${sat.toLocaleDateString("en-US", { month: "short", day: "numeric" })} & ${sun.getDate()}`;

        return (
          <Link
            key={week.id}
            href={`/calendar/week/${week.weekStart}`}
            className={`flex items-center gap-3 px-5 py-3.5 border-b border-oa-stone-200/30 last:border-b-0 hover:bg-oa-sand-100/35 transition-colors duration-[220ms] ${
              isCurrent ? "bg-oa-yellow-500/4" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                isCurrent
                  ? "bg-oa-yellow-500 text-oa-black-900"
                  : "bg-oa-yellow-500/8 text-oa-yellow-600"
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-oa-black-900">
                {dateLabel}
              </div>
              {week.label && (
                <div className="mt-0.5 inline-block rounded-[10px] bg-oa-yellow-500/12 px-2 py-0.5 text-[10px] font-semibold text-oa-yellow-600">
                  {week.label}
                </div>
              )}
            </div>
            {isCurrent && (
              <span className="px-2.5 py-0.5 rounded-[10px] text-[10px] font-semibold bg-oa-yellow-500 text-oa-black-900">
                This Week
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
