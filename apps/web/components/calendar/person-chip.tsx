"use client";

interface PersonChipProps {
  name: string;
  initials: string;
  size?: "sm" | "md";
}

export function PersonChip({ name, initials, size = "md" }: PersonChipProps) {
  const avatarSize = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  const chipPadding = size === "sm" ? "py-0.5 pl-0.5 pr-2 text-xs" : "py-1 pl-1 pr-3 text-[13px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-oa-sand-100/50 border border-oa-stone-200/50 font-medium ${chipPadding}`}
    >
      <span
        className={`${avatarSize} rounded-full bg-oa-yellow-500 flex items-center justify-center font-bold text-oa-black-900`}
      >
        {initials}
      </span>
      {name}
    </span>
  );
}
