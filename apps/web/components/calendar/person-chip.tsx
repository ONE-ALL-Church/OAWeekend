"use client";

import { useState } from "react";

interface PersonChipProps {
  name: string;
  initials: string;
  photoUrl?: string | null;
  size?: "sm" | "md";
}

export function PersonChip({ name, initials, photoUrl, size = "md" }: PersonChipProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarSize = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  const chipPadding = size === "sm" ? "py-0.5 pl-0.5 pr-2 text-xs" : "py-1 pl-1 pr-3 text-[13px]";
  const showPhoto = photoUrl && !imgFailed;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-oa-sand-100/50 border border-oa-stone-200/50 font-medium ${chipPadding}`}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name}
          className={`${avatarSize} rounded-full object-cover`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className={`${avatarSize} rounded-full bg-oa-yellow-500 flex items-center justify-center font-bold text-oa-black-900`}
        >
          {initials}
        </span>
      )}
      {name}
    </span>
  );
}
