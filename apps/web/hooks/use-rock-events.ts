"use client";

import { useState, useEffect, useMemo } from "react";

export interface RockCallToAction {
  label: string;
  url: string;
}

export interface RockEventOccurrence {
  eventItemId: number;
  name: string;
  summary: string | null;
  photoUrl: string | null;
  campuses: string | null;
  campusList: string[];
  ministry: string | null;
  callsToAction: RockCallToAction[];
  location: string | null;
  campusId: number | null;
  nextStartDateTime: string | null;
}

/** Campus categories matching the original Google Sheet rows */
export type EventCategory = "all-church" | "san-dimas" | "rancho" | "west-covina";

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
              campusList: ev.campusList ?? [],
              ministry: ev.ministry ?? null,
              callsToAction: ev.callsToAction ?? [],
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
 * Categorize an event into the Google Sheet row it belongs to.
 *
 * - If campusList is empty or has 3+ campuses → "all-church"
 * - If campusList has exactly 1 campus → that campus row
 * - If campusList has 2 campuses → "all-church" (cross-campus)
 *
 * For single-campus events we check the name for keywords.
 */
export function categorizeEvent(ev: RockEventOccurrence): EventCategory {
  const c = ev.campusList;

  // No campus info or 3+ campuses = all church
  if (c.length === 0 || c.length >= 3) return "all-church";

  // 2 campuses = all church (cross-campus)
  if (c.length === 2) return "all-church";

  // Single campus
  const campus = c[0].toLowerCase();
  if (campus.includes("san dimas")) return "san-dimas";
  if (campus.includes("rancho")) return "rancho";
  if (campus.includes("west covina")) return "west-covina";

  return "all-church";
}

/** Events grouped by category for a single week */
export interface CategorizedWeekEvents {
  "all-church": RockEventOccurrence[];
  "san-dimas": RockEventOccurrence[];
  "rancho": RockEventOccurrence[];
  "west-covina": RockEventOccurrence[];
}

/**
 * Build a map: weekStart → categorized event lists.
 */
export function useEventsByWeek(
  events: RockEventOccurrence[],
  weekStarts: string[],
): Map<string, CategorizedWeekEvents> {
  return useMemo(() => {
    const map = new Map<string, CategorizedWeekEvents>();
    if (events.length === 0 || weekStarts.length === 0) return map;

    // Initialise all weeks
    for (const ws of weekStarts) {
      map.set(ws, {
        "all-church": [],
        "san-dimas": [],
        "rancho": [],
        "west-covina": [],
      });
    }

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
      const cat = categorizeEvent(ev);

      for (const b of boundaries) {
        if (evTime >= b.start && evTime <= b.end) {
          const weekData = map.get(b.weekStart)!;
          const arr = weekData[cat];
          // Deduplicate by eventItemId within the same week/category
          if (!arr.some((e) => e.eventItemId === ev.eventItemId)) {
            arr.push(ev);
          }
          break;
        }
      }
    }

    return map;
  }, [events, weekStarts]);
}
