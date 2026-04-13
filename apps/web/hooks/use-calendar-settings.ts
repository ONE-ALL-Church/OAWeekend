"use client";

import { id } from "@instantdb/react";
import db from "@/lib/instant";

// ---------------------------------------------------------------------------
// Section CRUD
// ---------------------------------------------------------------------------

export async function createCalendarSection(params: {
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
}) {
  const sectionId = id();
  await db.transact(
    db.tx.calendarSections[sectionId].update({
      name: params.name,
      slug: params.slug,
      color: params.color,
      sortOrder: params.sortOrder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return sectionId;
}

export async function updateCalendarSection(
  sectionId: string,
  updates: Partial<{ name: string; slug: string; color: string; sortOrder: number }>,
) {
  await db.transact(
    db.tx.calendarSections[sectionId].update({
      ...updates,
      updatedAt: Date.now(),
    }),
  );
}

export async function deleteCalendarSection(sectionId: string) {
  await db.transact(db.tx.calendarSections[sectionId].delete());
}

// ---------------------------------------------------------------------------
// Row CRUD
// ---------------------------------------------------------------------------

export async function createCalendarRow(params: {
  sectionId: string;
  name: string;
  slug: string;
  fieldType: string;
  sortOrder: number;
  campusSpecific: boolean;
}) {
  const rowId = id();
  await db.transact([
    db.tx.calendarRows[rowId].update({
      name: params.name,
      slug: params.slug,
      fieldType: params.fieldType,
      sortOrder: params.sortOrder,
      campusSpecific: params.campusSpecific,
      createdAt: Date.now(),
    }),
    db.tx.calendarRows[rowId].link({ section: params.sectionId }),
  ]);
  return rowId;
}

export async function updateCalendarRow(
  rowId: string,
  updates: Partial<{
    name: string;
    slug: string;
    fieldType: string;
    sortOrder: number;
    campusSpecific: boolean;
  }>,
) {
  await db.transact(db.tx.calendarRows[rowId].update(updates));
}

export async function deleteCalendarRow(rowId: string) {
  await db.transact(db.tx.calendarRows[rowId].delete());
}

// ---------------------------------------------------------------------------
// Week CRUD
// ---------------------------------------------------------------------------

export async function createCalendarWeek(params: {
  weekStart: string;
  label?: string;
}) {
  const weekId = id();
  await db.transact(
    db.tx.calendarWeeks[weekId].update({
      weekStart: params.weekStart,
      label: params.label ?? "",
      createdAt: Date.now(),
    }),
  );
  return weekId;
}

export async function updateCalendarWeek(
  weekId: string,
  updates: Partial<{ weekStart: string; label: string }>,
) {
  await db.transact(db.tx.calendarWeeks[weekId].update(updates));
}

export async function deleteCalendarWeek(weekId: string) {
  await db.transact(db.tx.calendarWeeks[weekId].delete());
}
