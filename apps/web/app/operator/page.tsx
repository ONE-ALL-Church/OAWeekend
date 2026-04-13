"use client";

import Link from "next/link";
import db from "@/lib/instant";
import { useSessions } from "@/hooks/use-session";
import { SessionPicker } from "@/components/session-picker";
import { KeytermManager } from "@/components/keyterm-manager";

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
    <main className="flex flex-1 flex-col p-6 max-w-4xl mx-auto w-full gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operator Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage live captioning sessions for ONE&amp;ALL weekend services
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">{user.email}</span>
            <button
              onClick={() => {
                db.auth.signOut();
                document.cookie = "instant_token=; Max-Age=0; Path=/";
                window.location.href = "/login";
              }}
              className="text-sm text-neutral-400 hover:text-neutral-600"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Sessions */}
        <div className="space-y-6">
          <SessionPicker />

          {/* Active Sessions */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-neutral-500">
              Active Sessions
            </h2>
            {isLoading ? (
              <p className="text-sm text-neutral-400">Loading...</p>
            ) : activeSessions.length === 0 ? (
              <p className="text-sm text-neutral-400 italic">
                No active sessions
              </p>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-neutral-500">
                Recent Sessions
              </h2>
              <div className="space-y-2">
                {recentSessions.slice(0, 10).map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Keyterms */}
        <div>
          <KeytermManager />
        </div>
      </div>
    </main>
  );
}

function SessionCard({ session }: { session: Record<string, unknown> }) {
  const statusColor = {
    idle: "bg-neutral-400",
    live: "bg-green-500 animate-pulse",
    ended: "bg-red-400",
    archived: "bg-blue-400",
  }[(session.status as string) ?? "idle"];

  const startTime = session.startedAt
    ? new Date(session.startedAt as number).toLocaleTimeString()
    : "";

  return (
    <Link
      href={`/operator/${session.id}`}
      className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 transition-colors"
    >
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {(session.campusName as string) ?? "Unknown"} &mdash;{" "}
          {(session.sermonTitle as string) ?? "Untitled"}
        </p>
        <p className="text-xs text-neutral-400">
          {(session.speakerName as string) ?? "Unknown speaker"} &middot;{" "}
          {startTime}
        </p>
      </div>
      <span className="text-xs capitalize text-neutral-400">
        {session.status as string}
      </span>
    </Link>
  );
}
