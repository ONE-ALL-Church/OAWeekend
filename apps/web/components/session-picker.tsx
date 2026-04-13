"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { id } from "@instantdb/react";
import db from "@/lib/instant";
import { SESSION_DEFAULTS, MAX_DURATION_OPTIONS } from "@oaweekend/shared";

const DEFAULT_CAMPUSES = [
  { id: "main", name: "Main Campus" },
  { id: "campus2", name: "Campus 2" },
  { id: "campus3", name: "Campus 3" },
];

export function SessionPicker() {
  const router = useRouter();
  const [campusId, setCampusId] = useState(DEFAULT_CAMPUSES[0].id);
  const [sermonTitle, setSermonTitle] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number>(
    SESSION_DEFAULTS.maxDurationMinutes
  );
  const [creating, setCreating] = useState(false);

  const campus = DEFAULT_CAMPUSES.find((c) => c.id === campusId);

  async function createSession() {
    if (!campus) return;
    setCreating(true);

    const sessionId = id();
    db.transact(
      db.tx.sessions[sessionId].update({
        campusId: campus.id,
        campusName: campus.name,
        sermonTitle: sermonTitle || null,
        speakerName: speakerName || null,
        scheduleId: null,
        rockContentChannelItemId: null,
        startedAt: Date.now(),
        endedAt: null,
        status: "idle",
        ...SESSION_DEFAULTS,
        maxDurationMinutes,
      })
    );

    router.push(`/operator/${sessionId}`);
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 p-4">
      <h2 className="text-sm font-medium">Create New Session</h2>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-neutral-500">Campus</label>
          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {DEFAULT_CAMPUSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-neutral-500">
            Sermon Title (optional)
          </label>
          <input
            type="text"
            value={sermonTitle}
            onChange={(e) => setSermonTitle(e.target.value)}
            placeholder="e.g. The Good Shepherd"
            className="w-full mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500">
            Speaker (optional)
          </label>
          <input
            type="text"
            value={speakerName}
            onChange={(e) => setSpeakerName(e.target.value)}
            placeholder="e.g. Pastor Brian"
            className="w-full mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500">Max Duration</label>
          <select
            value={maxDurationMinutes}
            onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
            className="w-full mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {MAX_DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Capture will auto-stop after this time
          </p>
        </div>

        <button
          onClick={createSession}
          disabled={creating}
          className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Session"}
        </button>
      </div>
    </div>
  );
}
