"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { TextContent } from "@oaweekend/shared";

interface SongHoverCardProps {
  song: TextContent;
  children: React.ReactNode;
}

export function SongHoverCard({ song, children }: SongHoverCardProps) {
  const [showCard, setShowCard] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const hasDetails = song.songAuthor || song.songKey || song.songCcli;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardW = 300;
    const cardH = 160;
    const pad = 8;

    let top = rect.bottom + pad;
    let left = rect.left;

    if (top + cardH > window.innerHeight) top = rect.top - cardH - pad;
    if (top < pad) top = pad;
    if (left + cardW > window.innerWidth - pad) left = window.innerWidth - cardW - pad;
    if (left < pad) left = pad;

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (showCard) updatePosition();
  }, [showCard, updatePosition]);

  if (!hasDetails) {
    return <>{children}</>;
  }

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => setShowCard(true)}
      onMouseLeave={() => setShowCard(false)}
    >
      {children}

      {showCard && pos && createPortal(
        <div
          className="fixed z-[100] w-[300px] rounded-xl bg-oa-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-oa-stone-200 overflow-hidden pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="px-4 py-3.5 space-y-2">
            {/* Song title + key */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-oa-black-900 leading-tight">
                {song.value}
              </p>
              {song.songKey && (
                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-oa-yellow-500/15 text-oa-yellow-600 shrink-0">
                  {song.songKey}
                </span>
              )}
            </div>

            {/* Author */}
            {song.songAuthor && (
              <div className="flex items-start gap-2 text-[12px] text-oa-black-700">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-oa-stone-300">
                  <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2 14c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span>{song.songAuthor}</span>
              </div>
            )}

            {/* CCLI + Copyright */}
            {(song.songCcli || song.songCopyright) && (
              <div className="pt-1.5 border-t border-oa-stone-200/50 space-y-1">
                {song.songCcli && (
                  <div className="flex items-center gap-2 text-[11px] text-oa-stone-300">
                    <span className="font-semibold">CCLI</span>
                    <span>{song.songCcli}</span>
                  </div>
                )}
                {song.songCopyright && (
                  <p className="text-[10px] text-oa-stone-300 leading-snug">
                    {song.songCopyright}
                  </p>
                )}
              </div>
            )}

            {/* Last scheduled */}
            {song.songLastScheduled && (
              <p className="text-[10px] text-oa-stone-300 italic">
                Last used: {song.songLastScheduled}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
