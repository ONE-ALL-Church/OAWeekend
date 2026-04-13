"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";
import { DISPLAY_DEFAULTS } from "@oaweekend/shared";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useDisplays() {
  const { isLoading, error, data } = db.useQuery({
    displays: {
      $: { order: { createdAt: "asc" } },
    },
  });

  // Secondary sort by name in JS since name is not indexed
  const sorted = [...(data?.displays ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { displays: sorted, isLoading, error };
}

export function useDisplayBySlug(slug: string) {
  const { isLoading, error, data } = db.useQuery({
    displays: {
      $: { where: { slug } },
    },
  });

  return { display: data?.displays?.[0] ?? null, isLoading, error };
}

export function useDisplayWithSession(displayId: string) {
  const { isLoading, error, data } = db.useQuery({
    displays: {
      $: { where: { id: displayId } },
      activeSession: {},
    },
  });

  return { display: data?.displays?.[0] ?? null, isLoading, error };
}

export function useDisplaysForCampus(campusId: string) {
  const { isLoading, error, data } = db.useQuery({
    displays: {
      $: { where: { campusId }, order: { createdAt: "asc" } },
    },
  });

  const sorted = [...(data?.displays ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { displays: sorted, isLoading, error };
}

// ---------------------------------------------------------------------------
// Write helpers (plain async functions)
// ---------------------------------------------------------------------------

export async function createDisplay(params: {
  name: string;
  slug: string;
  campusId: string;
  campusName: string;
  theme?: string;
  fontSize?: number;
  positionVertical?: string;
  maxLines?: number;
}) {
  const displayId = id();
  await db.transact(
    db.tx.displays[displayId].update({
      name: params.name,
      slug: params.slug,
      campusId: params.campusId,
      campusName: params.campusName,
      theme: params.theme ?? DISPLAY_DEFAULTS.theme,
      fontSize: params.fontSize ?? DISPLAY_DEFAULTS.fontSize,
      positionVertical:
        params.positionVertical ?? DISPLAY_DEFAULTS.positionVertical,
      maxLines: params.maxLines ?? DISPLAY_DEFAULTS.maxLines,
      createdAt: Date.now(),
    }),
  );
  return displayId;
}

export async function updateDisplay(
  displayId: string,
  updates: Record<string, unknown>,
) {
  await db.transact(db.tx.displays[displayId].update(updates));
}

export async function setDisplaySession(
  displayId: string,
  sessionId: string | null,
) {
  if (sessionId) {
    await db.transact([
      db.tx.displays[displayId].update({ activeSessionId: sessionId }),
      db.tx.displays[displayId].link({ activeSession: sessionId }),
    ]);
  } else {
    // Clear session — unlink and remove the stored ID
    await db.transact([
      db.tx.displays[displayId].update({ activeSessionId: "" }),
      db.tx.displays[displayId].unlink({ activeSession: "" }),
    ]);
  }
}

export async function sendHeartbeat(displayId: string) {
  await db.transact(
    db.tx.displays[displayId].update({ lastSeenAt: Date.now() }),
  );
}

export async function deleteDisplay(displayId: string) {
  await db.transact(db.tx.displays[displayId].delete());
}
