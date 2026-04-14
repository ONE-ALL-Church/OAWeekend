"use client";

import Link from "next/link";
import db from "@/lib/instant";
import type { Session } from "@/lib/instant";
import { useSessions } from "@/hooks/use-session";
import { SessionPicker } from "@/components/session-picker";
import { KeytermManager } from "@/components/keyterm-manager";
import { DisplayManager } from "@/components/display-manager";

export default function OperatorPage() {
  const { user } = db.useAuth();
  const { sessions, isLoading } = useSessions();

  const activeSessions = sessions.filter(
    (s) => s.status === "idle" || s.status === "live"
  );
  const recentSessions = sessions.filter(
    (s) => s.status === "ended" || s.status === "archived"
  );

  return (
    <main className="flex flex-1 flex-col p-6 lg:p-8 max-w-5xl mx-auto w-full gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Operator Dashboard
          </h1>
          <p className="text-sm text-oa-black-700">
            Manage live captioning for ONE&amp;ALL weekend services
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-oa-white border border-oa-stone-200 px-4 py-2 shadow-[--shadow-card]">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-oa-black-700">{user.email}</span>
            </div>
            <button
              onClick={async () => {
                db.auth.signOut();
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-sm text-oa-stone-300 hover:text-oa-black-700 transition-colors duration-150"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column: Sessions (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <SessionPicker />

          {/* Active Sessions */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
              Active Sessions
            </h2>
            {isLoading ? (
              <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card]">
                <p className="text-sm text-oa-stone-300">Loading...</p>
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card]">
                <p className="text-sm text-oa-stone-300 italic">
                  No active sessions
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </section>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
                Recent Sessions
              </h2>
              <div className="space-y-2">
                {recentSessions.slice(0, 10).map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Keyterms (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          <DisplayManager />
          <KeytermManager />
        </div>
      </div>
    </main>
  );
}

function SessionCard({ session }: { session: Session }) {
  const statusConfig: Record<string, { dot: string; label: string }> = {
    idle: { dot: "bg-oa-stone-300", label: "Idle" },
    live: { dot: "bg-green-500 animate-pulse", label: "Live" },
    ended: { dot: "bg-oa-coral", label: "Ended" },
    archived: { dot: "bg-oa-blue", label: "Archived" },
  };

  const config = statusConfig[session.status] ?? statusConfig.idle;

  const startTime = session.startedAt
    ? new Date(session.startedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <Link
      href={`/operator/${session.id}`}
      className="flex items-center gap-4 rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-4 hover:border-oa-stone-300 hover:shadow-[--shadow-elevated] transition-all duration-150 shadow-[--shadow-card]"
    >
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${config.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {session.campusName ?? "Unknown"} &mdash;{" "}
          {session.sermonTitle ?? "Untitled"}
        </p>
        <p className="text-xs text-oa-black-700 mt-0.5">
          {session.speakerName ?? "Unknown speaker"} &middot; {startTime}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-oa-stone-100 px-3 py-1 text-xs font-medium text-oa-black-700">
        {config.label}
      </span>
    </Link>
  );
}
