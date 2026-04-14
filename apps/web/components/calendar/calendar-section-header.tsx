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
      className="col-span-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-oa-sand-100/10 transition-colors duration-[220ms] border-b border-oa-stone-200"
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
