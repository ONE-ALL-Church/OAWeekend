"use client";

import db from "@/lib/instant";

export function useSession(sessionId: string) {
  const { isLoading, error, data } = db.useQuery({
    sessions: {
      $: { where: { id: sessionId } },
    },
  });

  const session = data?.sessions?.[0] ?? null;

  return { session, isLoading, error };
}

export function useSessionUpdate(sessionId: string) {
  function updateSession(updates: Record<string, unknown>) {
    db.transact(db.tx.sessions[sessionId].update(updates));
  }

  return { updateSession };
}

export function useSessions() {
  const { isLoading, error, data } = db.useQuery({
    sessions: {
      $: {
        order: { startedAt: "desc" },
      },
    },
  });

  return { sessions: data?.sessions ?? [], isLoading, error };
}

export function useKeyterms() {
  const { isLoading, error, data } = db.useQuery({
    keyterms: {},
  });

  return { keyterms: data?.keyterms ?? [], isLoading, error };
}
