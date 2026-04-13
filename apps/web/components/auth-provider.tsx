"use client";

import { useEffect } from "react";
import db from "@/lib/instant";

/**
 * Reads the instant_token cookie (set by the OAuth callback) and
 * signs the user into InstantDB. Once signed in, db.useAuth()
 * returns the user everywhere in the app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = db.useAuth();

  useEffect(() => {
    if (user) return;

    const token = getCookie("instant_token");
    if (token) {
      db.auth.signInWithToken(token);
    }
  }, [user]);

  return <>{children}</>;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}
