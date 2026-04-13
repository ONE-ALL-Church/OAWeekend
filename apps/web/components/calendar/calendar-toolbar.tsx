"use client";

import Link from "next/link";

interface CalendarToolbarProps {
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  campus: string;
  onCampusChange: (campus: string) => void;
  campuses: Array<{ id: string; name: string }>;
  onAddWeek?: () => void;
}

export function CalendarToolbar({
  rangeLabel,
  onPrev,
  onNext,
  campus,
  onCampusChange,
  campuses,
  onAddWeek,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-oa-stone-200 bg-oa-white sticky top-0 z-10">
      <h1 className="text-xl font-bold tracking-tight text-oa-black-900">
        Strategic Calendar
      </h1>

      <div className="flex-1" />

      {/* Date range navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          ← Prev
        </button>
        <span className="text-sm font-semibold text-oa-black-900 min-w-[140px] text-center">
          {rangeLabel}
        </span>
        <button
          onClick={onNext}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          Next →
        </button>
      </div>

      {/* Campus filter */}
      <select
        value={campus}
        onChange={(e) => onCampusChange(e.target.value)}
        className="px-3 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm bg-oa-white text-oa-black-900 focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
      >
        <option value="">All Campuses</option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Actions */}
      {onAddWeek && (
        <button
          onClick={onAddWeek}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          + Add Week
        </button>
      )}

      <Link
        href="/calendar/settings"
        className="px-3 py-1.5 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
      >
        ⚙ Manage Sections
      </Link>
    </div>
  );
}
