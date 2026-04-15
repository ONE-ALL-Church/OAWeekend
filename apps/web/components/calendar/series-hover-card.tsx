"use client";

import { useState } from "react";
import type { SeriesPickerContent } from "@oaweekend/shared";

interface SeriesHoverCardProps {
  series: SeriesPickerContent;
  children: React.ReactNode;
}

export function SeriesHoverCard({ series, children }: SeriesHoverCardProps) {
  const [showCard, setShowCard] = useState(false);

  const hasDetails = series.narrative || series.imageUrl || (series.objectives && series.objectives.length > 0);

  if (!hasDetails) {
    return <>{children}</>;
  }

  const startDateLabel = series.startDate
    ? new Date(`${series.startDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowCard(true)}
      onMouseLeave={() => setShowCard(false)}
    >
      {children}

      {showCard && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 rounded-[--radius-card] bg-oa-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-oa-stone-200 overflow-hidden pointer-events-auto">
          {/* Series image banner */}
          {series.imageUrl && (
            <div className="h-36 w-full bg-oa-stone-100 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={series.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <p className="absolute bottom-2 left-3 right-3 text-sm font-bold text-white leading-tight drop-shadow-sm">
                {series.label}
              </p>
            </div>
          )}

          <div className="px-3.5 py-3 space-y-2.5">
            {/* Series name (only if no image) */}
            {!series.imageUrl && (
              <p className="text-sm font-bold text-oa-black-900 leading-tight">
                {series.label}
              </p>
            )}

            {/* Week number + start date */}
            <div className="flex items-center gap-2 text-xs text-oa-black-700">
              {series.weekNumber > 0 && (
                <span className="inline-flex px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600">
                  Week {series.weekNumber}
                </span>
              )}
              {startDateLabel && (
                <span className="text-oa-stone-300">Started {startDateLabel}</span>
              )}
            </div>

            {/* Narrative */}
            {series.narrative && (
              <p className="text-[12px] text-oa-black-700 leading-relaxed">
                {series.narrative}
              </p>
            )}

            {/* Objectives */}
            {series.objectives && series.objectives.length > 0 && (
              <div className="pt-1 border-t border-oa-stone-200/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-oa-stone-300 mb-1">
                  Objectives
                </p>
                <ul className="space-y-1">
                  {series.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-oa-black-700 leading-tight">
                      <span className="text-oa-yellow-500 mt-0.5 shrink-0">&#8226;</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
