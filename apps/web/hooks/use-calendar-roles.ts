"use client";

import { useMemo } from "react";
import { id } from "@instantdb/react";
import db from "@/lib/instant";
import type { CalendarRoleWithMembers } from "@/lib/instant";

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useCalendarRoles() {
  const { isLoading, error, data } = db.useQuery({
    calendarRoles: {
      sections: {},
      members: {},
    },
  });

  return {
    roles: (data?.calendarRoles ?? []) as CalendarRoleWithMembers[],
    isLoading,
    error,
  };
}

/**
 * Returns the set of section IDs the current user can edit.
 * If the user has no roles, returns an empty set (view-only).
 * Admin check is done by a special role name "Admin".
 */
export function useUserEditableSections() {
  const { user } = db.useAuth();
  const { roles, isLoading } = useCalendarRoles();

  const editableSectionIds = useMemo(() => {
    if (!user) return new Set<string>();

    const userRoles = roles.filter((role) =>
      (role.members ?? []).some((m) => m.id === user.id),
    );

    // Admin role grants access to everything
    const isAdmin = userRoles.some((r) => r.name === "Admin");
    if (isAdmin) return null; // null = all sections editable

    const sectionIds = new Set<string>();
    for (const role of userRoles) {
      for (const section of role.sections ?? []) {
        sectionIds.add(section.id);
      }
    }
    return sectionIds;
  }, [user, roles]);

  return { editableSectionIds, isLoading };
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

export async function createCalendarRole(name: string) {
  const roleId = id();
  await db.transact(
    db.tx.calendarRoles[roleId].update({
      name,
      createdAt: Date.now(),
    }),
  );
  return roleId;
}

export async function updateCalendarRole(roleId: string, name: string) {
  await db.transact(db.tx.calendarRoles[roleId].update({ name }));
}

export async function deleteCalendarRole(roleId: string) {
  await db.transact(db.tx.calendarRoles[roleId].delete());
}

export async function addRoleMember(roleId: string, userId: string) {
  await db.transact(db.tx.calendarRoles[roleId].link({ members: userId }));
}

export async function removeRoleMember(roleId: string, userId: string) {
  await db.transact(db.tx.calendarRoles[roleId].unlink({ members: userId }));
}

export async function setRoleSections(roleId: string, sectionIds: string[]) {
  // Unlink all existing sections, then link the new ones
  const linkOps = sectionIds.map((sId) =>
    db.tx.calendarRoles[roleId].link({ sections: sId }),
  );
  await db.transact(linkOps);
}
