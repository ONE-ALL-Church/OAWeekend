"use client";

import Link from "next/link";

interface CalendarSectionHeaderProps {
  name: string;
  slug: string;
  color: string;
  rowCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CalendarSectionHeader({
  name,
  slug,
  color,
  rowCount,
  isExpanded,
  onToggle,
}: CalendarSectionHeaderProps) {
  return (
    <div
      className="sticky left-0 z-20 col-span-full flex items-center gap-2.5 border-b border-oa-stone-200 bg-oa-white/95 px-4 py-2.5 shadow-[10px_0_18px_-18px_rgba(39,39,40,0.55)] transition-colors duration-[220ms] hover:bg-oa-sand-100/20 cursor-pointer"
      onClick={onToggle}
    >
      <div
        className="w-[3px] h-5 rounded-sm shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-oa-stone-300">
        {isExpanded ? "▾" : "▸"}
      </span>
      <Link
        href={`/calendar/section/${slug}`}
        onClick={(e) => e.stopPropagation()}
        className="text-[13px] font-bold tracking-tight text-oa-black-900 hover:underline"
      >
        {name}
      </Link>
      {!isExpanded && (
        <span className="text-[11px] text-oa-stone-300 font-normal">
          {rowCount} row{rowCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
