"use client";

import { useDisplays, setDisplaySession } from "@/hooks/use-displays";
import { DISPLAY_ONLINE_THRESHOLD_MS } from "@oaweekend/shared";

interface DisplayAssignmentProps {
  sessionId: string;
  campusId: string;
}

export function DisplayAssignment({
  sessionId,
  campusId,
}: DisplayAssignmentProps) {
  const { displays, isLoading } = useDisplays();

  if (isLoading) {
    return (
      <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-5 shadow-[--shadow-card]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
          Display Assignment
        </h3>
        <p className="mt-3 text-sm text-oa-stone-300">Loading displays...</p>
      </div>
    );
  }

  if (displays.length === 0) {
    return (
      <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-5 shadow-[--shadow-card]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
          Display Assignment
        </h3>
        <p className="mt-3 text-sm text-oa-stone-300">
          No displays configured yet
        </p>
      </div>
    );
  }

  // Sort: campus-matching displays first, then alphabetical
  const sorted = [...displays].sort((a, b) => {
    const aMatch = a.campusId === campusId ? 0 : 1;
    const bMatch = b.campusId === campusId ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-5 shadow-[--shadow-card] space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
        Display Assignment
      </h3>

      <div className="space-y-2">
        {sorted.map((d) => {
          const isAssigned = d.activeSessionId === sessionId;
          const isBusy =
            !isAssigned && !!d.activeSessionId && d.activeSessionId !== "";
          const isOnline =
            !!d.lastSeenAt &&
            Date.now() - d.lastSeenAt < DISPLAY_ONLINE_THRESHOLD_MS;

          return (
            <div
              key={d.id}
              className={`flex items-center gap-3 rounded-[--radius-input] border px-3 py-2.5 transition-all duration-150 ${
                isAssigned
                  ? "border-oa-yellow-500 bg-oa-yellow-500/5 ring-1 ring-oa-yellow-500"
                  : "border-oa-stone-200"
              }`}
            >
              {/* Online indicator */}
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-oa-stone-300"
                }`}
              />

              {/* Name and campus */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-oa-black-900 truncate block">
                  {d.name}
                </span>
                <span className="text-xs text-oa-stone-300 truncate block">
                  {d.campusName}
                  {isBusy && (
                    <span className="ml-1.5 text-oa-stone-300">
                      &middot; showing another session
                    </span>
                  )}
                </span>
              </div>

              {/* Action */}
              {isAssigned ? (
                <button
                  onClick={() => setDisplaySession(d.id, null)}
                  className="shrink-0 rounded-full bg-oa-yellow-500/15 px-2.5 py-0.5 text-xs font-semibold text-oa-yellow-700 hover:bg-red-100 hover:text-red-700 transition-colors"
                  title="Remove display assignment"
                >
                  Remove
                </button>
              ) : isBusy ? (
                <span className="shrink-0 rounded-full bg-oa-stone-100 px-2.5 py-0.5 text-xs font-semibold text-oa-stone-300">
                  Busy
                </span>
              ) : (
                <button
                  onClick={() => setDisplaySession(d.id, sessionId)}
                  className="shrink-0 rounded-full bg-oa-stone-100 px-2.5 py-0.5 text-xs font-semibold text-oa-black-700 hover:bg-oa-yellow-500/15 hover:text-oa-yellow-700 transition-colors"
                >
                  Assign
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
