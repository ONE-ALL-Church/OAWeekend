"use client";

import { useEffect } from "react";
import db from "@/lib/instant";

/**
 * Reads the instant_token cookie and signs the user into InstantDB.
 * This runs once on mount after the OAuth callback sets the cookie.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, user, error } = db.useAuth();

  useEffect(() => {
    // If already authenticated, nothing to do
    if (user) return;

    // Check for token cookie from OAuth callback
    const token = getCookie("instant_token");
    if (token) {
      db.auth.signInWithToken(token);
    }
  }, [user]);

  return <>{children}</>;
}

export function useUser() {
  return db.useAuth();
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}
