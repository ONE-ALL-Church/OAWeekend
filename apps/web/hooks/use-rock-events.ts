"use client";

import { useState, useEffect, useMemo } from "react";

export interface RockEventOccurrence {
  eventItemId: number;
  name: string;
  summary: string | null;
  photoUrl: string | null;
  campuses: string | null;
  location: string | null;
  campusId: number | null;
  nextStartDateTime: string | null;
}

interface RockEventsState {
  events: RockEventOccurrence[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetch featured events from Rock RMS Calendar 1 and flatten into
 * per-occurrence records for easy mapping to calendar weeks.
 */
export function useRockEvents(): RockEventsState {
  const [state, setState] = useState<RockEventsState>({
    events: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/rock/events");
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        // Flatten: one record per occurrence
        const flat: RockEventOccurrence[] = [];
        for (const ev of data.events ?? []) {
          for (const occ of ev.occurrences ?? []) {
            flat.push({
              eventItemId: ev.eventItemId,
              name: ev.name,
              summary: ev.summary ?? null,
              photoUrl: ev.photoUrl ?? null,
              campuses: ev.campuses ?? null,
              location: occ.location ?? null,
              campusId: occ.campusId ?? null,
              nextStartDateTime: occ.nextStartDateTime ?? null,
            });
          }
        }

        setState({ events: flat, isLoading: false, error: null });
      } catch {
        if (cancelled) return;
        setState((s) => ({ ...s, isLoading: false, error: "Failed to load events" }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Build a map: weekStart (YYYY-MM-DD) → list of event occurrences that
 * fall within that Sat–Fri week.
 *
 * @param events  flat occurrence list from useRockEvents()
 * @param weekStarts  array of weekStart date strings currently visible
 */
export function useEventsByWeek(
  events: RockEventOccurrence[],
  weekStarts: string[],
): Map<string, RockEventOccurrence[]> {
  return useMemo(() => {
    const map = new Map<string, RockEventOccurrence[]>();
    if (events.length === 0 || weekStarts.length === 0) return map;

    // Pre-compute week boundaries: each week runs Sat 00:00 → next Fri 23:59
    const boundaries = weekStarts.map((ws) => {
      const sat = new Date(ws + "T00:00:00");
      const fri = new Date(sat);
      fri.setDate(fri.getDate() + 6);
      fri.setHours(23, 59, 59, 999);
      return { weekStart: ws, start: sat.getTime(), end: fri.getTime() };
    });

    for (const ev of events) {
      if (!ev.nextStartDateTime) continue;
      const evTime = new Date(ev.nextStartDateTime).getTime();

      for (const b of boundaries) {
        if (evTime >= b.start && evTime <= b.end) {
          const arr = map.get(b.weekStart) ?? [];
          // Deduplicate by eventItemId within the same week
          if (!arr.some((e) => e.eventItemId === ev.eventItemId && e.campusId === ev.campusId)) {
            arr.push(ev);
          }
          map.set(b.weekStart, arr);
          break;
        }
      }
    }

    return map;
  }, [events, weekStarts]);
}
