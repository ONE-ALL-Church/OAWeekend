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
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card] space-y-5">
      <h2 className="text-sm font-semibold text-oa-black-900">
        Create New Session
      </h2>

      <div className="space-y-4">
        <Field label="Campus">
          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm focus:border-oa-yellow-500 focus:outline-none transition-colors"
          >
            {DEFAULT_CAMPUSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sermon Title" optional>
          <input
            type="text"
            value={sermonTitle}
            onChange={(e) => setSermonTitle(e.target.value)}
            placeholder="e.g. The Good Shepherd"
            className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm placeholder:text-oa-stone-300 focus:border-oa-yellow-500 focus:outline-none transition-colors"
          />
        </Field>

        <Field label="Speaker" optional>
          <input
            type="text"
            value={speakerName}
            onChange={(e) => setSpeakerName(e.target.value)}
            placeholder="e.g. Pastor Brian"
            className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm placeholder:text-oa-stone-300 focus:border-oa-yellow-500 focus:outline-none transition-colors"
          />
        </Field>

        <Field label="Max Duration" hint="Capture auto-stops after this time">
          <select
            value={maxDurationMinutes}
            onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
            className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm focus:border-oa-yellow-500 focus:outline-none transition-colors"
          >
            {MAX_DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          onClick={createSession}
          disabled={creating}
          className="w-full rounded-[--radius-button] bg-oa-yellow-500 py-3 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-150 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Session"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-1.5 text-xs font-medium text-oa-black-700">
        {label}
        {optional && (
          <span className="text-oa-stone-300 font-normal">optional</span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-oa-stone-300">{hint}</p>}
    </div>
  );
}
