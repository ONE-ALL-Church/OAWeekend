"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface PersonContact {
  emails: Array<{ address: string; location: string | null; primary: boolean }>;
  phones: Array<{ number: string; location: string | null; primary: boolean }>;
}

interface PersonHoverCardProps {
  name: string;
  initials: string;
  photoUrl?: string | null;
  pcoPersonId?: string | null;
  children: React.ReactNode;
}

export function PersonHoverCard({
  name,
  initials,
  photoUrl,
  pcoPersonId,
  children,
}: PersonHoverCardProps) {
  const [showCard, setShowCard] = useState(false);
  const [contact, setContact] = useState<PersonContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardW = 280;
    const cardH = 200;
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
    if (!showCard) return;
    updatePosition();

    if (pcoPersonId && !fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      fetch(`/api/calendar/person/${pcoPersonId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setContact(data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [showCard, pcoPersonId, updatePosition]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => setShowCard(true)}
      onMouseLeave={() => setShowCard(false)}
      className="inline-flex"
    >
      {children}

      {showCard && pos && createPortal(
        <div
          className="fixed z-[100] w-70 rounded-xl bg-oa-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-oa-stone-200 overflow-hidden pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="px-4 py-3.5 flex items-center gap-3">
            {/* Avatar */}
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-oa-yellow-500 flex items-center justify-center font-bold text-sm text-oa-black-900 shrink-0">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-oa-black-900 truncate">{name}</p>
            </div>
          </div>

          {/* Contact info */}
          <div className="px-4 pb-3.5 space-y-2">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="h-3 w-32 rounded bg-oa-stone-200/40" />
              </div>
            )}

            {contact && (
              <>
                {contact.emails.map((e, i) => (
                  <div key={`e-${i}`} className="flex items-center gap-2 text-[12px] text-oa-black-700">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-oa-stone-300">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M1.5 5l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    <span className="truncate">{e.address}</span>
                  </div>
                ))}
                {contact.phones.map((p, i) => (
                  <div key={`p-${i}`} className="flex items-center gap-2 text-[12px] text-oa-black-700">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-oa-stone-300">
                      <path d="M3.5 1.5h3l1.5 4-2 1.5a8.5 8.5 0 003 3l1.5-2 4 1.5v3c0 .6-.4 1-1 1C6 14 2 10 1.5 4.5c0-.6.4-1 1-1l1-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    <span>{p.number}</span>
                  </div>
                ))}
                {contact.emails.length === 0 && contact.phones.length === 0 && (
                  <p className="text-[11px] text-oa-stone-300 italic">No contact info available</p>
                )}
              </>
            )}

            {!pcoPersonId && !loading && (
              <p className="text-[11px] text-oa-stone-300 italic">No linked profile</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
