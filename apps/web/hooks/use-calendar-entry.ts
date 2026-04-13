"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Create or update a calendar entry for a given week + row intersection.
 * If entryId is provided, updates the existing entry.
 * If not, creates a new entry and links it to the week and row.
 */
export async function upsertCalendarEntry(params: {
  entryId?: string;
  weekId: string;
  rowId: string;
  content: string;
  status?: string;
  userId?: string;
}) {
  const { entryId, weekId, rowId, content, status, userId } = params;
  const now = Date.now();

  if (entryId) {
    // Update existing entry
    await db.transact(
      db.tx.calendarEntries[entryId].update({
        content,
        status: status ?? "draft",
        updatedAt: now,
        updatedBy: userId ?? "",
      }),
    );
    return entryId;
  }

  // Create new entry and link to week + row
  const newId = id();
  await db.transact([
    db.tx.calendarEntries[newId].update({
      content,
      status: status ?? "draft",
      updatedAt: now,
      updatedBy: userId ?? "",
    }),
    db.tx.calendarEntries[newId].link({ week: weekId }),
    db.tx.calendarEntries[newId].link({ row: rowId }),
  ]);
  return newId;
}

/**
 * Update entry status (e.g., draft → confirmed).
 */
export async function updateEntryStatus(
  entryId: string,
  status: string,
  userId?: string,
) {
  await db.transact(
    db.tx.calendarEntries[entryId].update({
      status,
      updatedAt: Date.now(),
      updatedBy: userId ?? "",
    }),
  );
}

/**
 * Update entry notes.
 */
export async function updateEntryNotes(
  entryId: string,
  notes: string,
  userId?: string,
) {
  await db.transact(
    db.tx.calendarEntries[entryId].update({
      notes,
      updatedAt: Date.now(),
      updatedBy: userId ?? "",
    }),
  );
}

/**
 * Delete a calendar entry.
 */
export async function deleteCalendarEntry(entryId: string) {
  await db.transact(db.tx.calendarEntries[entryId].delete());
}
