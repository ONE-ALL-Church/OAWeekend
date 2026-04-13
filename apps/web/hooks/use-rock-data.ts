"use client";

import { useState, useEffect } from "react";

export interface RockCampusClient {
  id: number;
  name: string;
  shortCode: string | null;
}

export interface RockServiceClient {
  id: number;
  title: string;
  startDateTime: string | null;
  speaker: string | null;
  contentChannelItemId: number;
}

interface RockDataState {
  campuses: RockCampusClient[];
  services: RockServiceClient[];
  isLoading: boolean;
  error: string | null;
}

export function useRockData(): RockDataState {
  const [state, setState] = useState<RockDataState>({
    campuses: [],
    services: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/rock/services");
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        setState({
          campuses: data.campuses ?? [],
          services: data.services ?? [],
          isLoading: false,
          error: null,
        });
      } catch {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          error: "Rock RMS unavailable",
        }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
