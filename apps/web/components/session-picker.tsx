"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { id } from "@instantdb/react";
import db from "@/lib/instant";
import { SESSION_DEFAULTS, MAX_DURATION_OPTIONS } from "@oaweekend/shared";
import {
  useRockData,
  type RockServiceClient,
} from "@/hooks/use-rock-data";

export function SessionPicker() {
  const router = useRouter();
  const { campuses, services, isLoading: rockLoading, error: rockError } = useRockData();

  const [campusId, setCampusId] = useState<string>("");
  const [campusName, setCampusName] = useState("");
  const [sermonTitle, setSermonTitle] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number>(
    SESSION_DEFAULTS.maxDurationMinutes
  );
  const [creating, setCreating] = useState(false);

  // When campuses load, default to first one
  if (campuses.length > 0 && !campusId) {
    setCampusId(String(campuses[0].id));
    setCampusName(campuses[0].name);
  }

  function selectService(service: RockServiceClient) {
    setSelectedServiceId(service.id);
    setSermonTitle(service.title);
    setSpeakerName(service.speaker ?? "");
  }

  function clearServiceSelection() {
    setSelectedServiceId(null);
    setSermonTitle("");
    setSpeakerName("");
  }

  function handleCampusChange(value: string) {
    setCampusId(value);
    const c = campuses.find((c) => String(c.id) === value);
    setCampusName(c?.name ?? value);
  }

  async function createSession() {
    if (!campusName) return;
    setCreating(true);

    const sessionId = id();
    db.transact(
      db.tx.sessions[sessionId].update({
        campusId: campusId || "manual",
        campusName,
        sermonTitle: sermonTitle || null,
        speakerName: speakerName || null,
        scheduleId: null,
        rockContentChannelItemId: selectedServiceId ?? null,
        startedAt: Date.now(),
        endedAt: null,
        status: "idle",
        ...SESSION_DEFAULTS,
        maxDurationMinutes,
      })
    );

    router.push(`/operator/${sessionId}`);
  }

  const hasCampuses = campuses.length > 0;
  const recentServices = services.slice(0, 3);
  const hasServices = recentServices.length > 0;

  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card] space-y-5">
      <h2 className="text-sm font-semibold text-oa-black-900">
        Create New Session
      </h2>

      {/* Today's Services (if available) */}
      {rockLoading && (
        <div className="flex items-center gap-2 text-xs text-oa-stone-300">
          <div className="h-3 w-3 rounded-full border-2 border-oa-stone-300 border-t-transparent animate-spin" />
          Loading from Rock...
        </div>
      )}

      {hasServices && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-oa-black-700">
            Recent Messages
          </label>
          <div className="space-y-1.5">
            {recentServices.map((svc) => {
              const isSelected = selectedServiceId === svc.id;
              const time = svc.startDateTime
                ? new Date(svc.startDateTime).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : null;
              return (
                <button
                  key={svc.id}
                  onClick={() =>
                    isSelected ? clearServiceSelection() : selectService(svc)
                  }
                  className={`w-full text-left rounded-[--radius-input] border p-3 transition-all duration-150 ${
                    isSelected
                      ? "border-oa-yellow-500 bg-oa-yellow-500/5 ring-1 ring-oa-yellow-500"
                      : "border-oa-stone-200 hover:border-oa-stone-300 hover:bg-oa-stone-100"
                  }`}
                >
                  <p className="text-sm font-semibold text-oa-black-900">
                    {svc.title}
                  </p>
                  <p className="text-xs text-oa-black-700 mt-0.5">
                    {svc.speaker ?? "Speaker TBD"}
                    {time && (
                      <>
                        {" "}
                        <span className="text-oa-stone-300">&middot;</span>{" "}
                        {time}
                      </>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedServiceId && (
            <p className="text-xs text-oa-stone-300">
              Fields auto-filled from Rock. Edit below to override.
            </p>
          )}
        </div>
      )}

      {rockError && !rockLoading && (
        <p className="text-xs text-oa-stone-300 italic">
          Rock RMS unavailable — enter details manually.
        </p>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        <Field label="Campus">
          {hasCampuses ? (
            <select
              value={campusId}
              onChange={(e) => handleCampusChange(e.target.value)}
              className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm focus:border-oa-yellow-500 focus:outline-none transition-colors"
            >
              {campuses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={campusName}
              onChange={(e) => {
                setCampusName(e.target.value);
                setCampusId(e.target.value);
              }}
              placeholder="e.g. San Dimas Campus"
              className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm placeholder:text-oa-stone-300 focus:border-oa-yellow-500 focus:outline-none transition-colors"
            />
          )}
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
          disabled={creating || !campusName}
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
