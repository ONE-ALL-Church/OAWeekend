"use client";

import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarToolbarProps {
  anchorYear: number;
  anchorMonth: number;
  onAnchorChange: (year: number, month: number) => void;
  campus: string;
  onCampusChange: (campus: string) => void;
  campuses: Array<{ id: string; name: string }>;
  onAddWeek?: () => void;
}

export function CalendarToolbar({
  anchorYear,
  anchorMonth,
  onAnchorChange,
  campus,
  onCampusChange,
  campuses,
  onAddWeek,
}: CalendarToolbarProps) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Generate year options: current year -1 through +2
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const handleToday = () => {
    onAnchorChange(now.getFullYear(), now.getMonth());
  };

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-oa-stone-200 bg-oa-white sticky top-0 z-10">
      <h1 className="text-xl font-bold tracking-tight text-oa-black-900">
        Strategic Calendar
      </h1>

      <div className="flex-1" />

      {/* Jump to month/year */}
      <div className="flex items-center gap-1.5">
        <select
          value={anchorMonth}
          onChange={(e) => onAnchorChange(anchorYear, Number(e.target.value))}
          className="px-2.5 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm font-medium bg-oa-white text-oa-black-900 focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={anchorYear}
          onChange={(e) => onAnchorChange(Number(e.target.value), anchorMonth)}
          className="px-2.5 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm font-medium bg-oa-white text-oa-black-900 focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          onClick={handleToday}
          className="px-3 py-1.5 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
        >
          Today
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
        Settings
      </Link>
    </div>
  );
}
