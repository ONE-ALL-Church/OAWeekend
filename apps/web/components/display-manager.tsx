"use client";

import { useState } from "react";
import {
  useDisplays,
  createDisplay,
  updateDisplay,
  deleteDisplay,
} from "@/hooks/use-displays";
import { useRockData } from "@/hooks/use-rock-data";
import {
  DISPLAY_ONLINE_THRESHOLD_MS,
  DISPLAY_THEMES,
} from "@oaweekend/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isOnline(lastSeenAt: number | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt < DISPLAY_ONLINE_THRESHOLD_MS;
}

// ---------------------------------------------------------------------------
// CreateDisplayForm
// ---------------------------------------------------------------------------

export function CreateDisplayForm({
  onCreated,
  defaultCampusId,
  defaultCampusName,
}: {
  onCreated: (displayId: string) => void;
  defaultCampusId?: string;
  defaultCampusName?: string;
}) {
  const { campuses, isLoading: campusesLoading } = useRockData();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [campusId, setCampusId] = useState(defaultCampusId ?? "");
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  const selectedCampus = campuses.find((c) => String(c.id) === campusId);
  const canSubmit = name.trim() && slug.trim() && campusId && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedCampus) return;

    setSubmitting(true);
    try {
      const displayId = await createDisplay({
        name: name.trim(),
        slug: slug.trim(),
        campusId: String(selectedCampus.id),
        campusName: selectedCampus.name,
      });
      setName("");
      setSlug("");
      setSlugTouched(false);
      setCampusId(defaultCampusId ?? "");
      onCreated(displayId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-oa-black-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Main Sanctuary"
          className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm placeholder:text-oa-stone-300 focus:border-oa-yellow-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-oa-black-700">Slug</label>
        <div className="flex items-center gap-0">
          <span className="rounded-l-[--radius-input] border border-r-0 border-oa-stone-200 bg-oa-stone-100 px-3 py-2.5 text-sm text-oa-stone-300">
            /display/
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="main-sanctuary"
            className="flex-1 rounded-r-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm placeholder:text-oa-stone-300 focus:border-oa-yellow-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-oa-black-700">Campus</label>
        <select
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          disabled={campusesLoading}
          className="w-full rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-3 py-2.5 text-sm focus:border-oa-yellow-500 focus:outline-none transition-colors disabled:opacity-50"
        >
          <option value="">
            {campusesLoading ? "Loading campuses..." : "Select a campus"}
          </option>
          {campuses.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-[--radius-button] bg-oa-yellow-500 px-4 py-2.5 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Display"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// DisplayCard
// ---------------------------------------------------------------------------

function DisplayCard({
  display,
}: {
  display: {
    id: string;
    name: string;
    slug: string;
    campusName?: string;
    lastSeenAt?: number;
    activeSessionId?: string;
    theme?: string;
    fontSize?: number;
    positionVertical?: string;
    maxLines?: number;
  };
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const online = isOnline(display.lastSeenAt);
  const hasSession = !!display.activeSessionId;

  async function handleCopyUrl() {
    const url = `${window.location.origin}/display/${display.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteDisplay(display.id);
  }

  return (
    <div className="rounded-[--radius-input] border border-oa-stone-200 transition-colors duration-150">
      {/* Summary row */}
      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-oa-stone-100 transition-colors duration-150">
        {/* Status dot */}
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
            online ? "bg-green-500" : "bg-oa-stone-300"
          }`}
          title={online ? "Online" : "Offline"}
        />

        {/* Info — click to expand settings */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-medium text-oa-black-900 truncate">
            {display.name}
          </p>
          <p className="text-xs text-oa-stone-300">
            {display.campusName ?? "No campus"}
            {" \u00B7 "}
            {hasSession ? "Showing session" : "Idle"}
          </p>
        </button>

        {/* Actions */}
        <button
          onClick={handleCopyUrl}
          className="shrink-0 rounded-[--radius-button] border border-oa-stone-200 px-2.5 py-1.5 text-xs font-medium text-oa-black-700 hover:bg-oa-stone-100 transition-colors duration-150"
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>

        <button
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          className={`shrink-0 text-sm transition-colors duration-150 ${
            confirming
              ? "text-oa-coral font-semibold"
              : "text-oa-stone-300 hover:text-oa-coral"
          }`}
          title={confirming ? "Click again to confirm" : "Delete display"}
        >
          {confirming ? "Confirm?" : "\u00D7"}
        </button>
      </div>

      {/* Settings panel */}
      {expanded && (
        <DisplaySettings displayId={display.id} display={display} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DisplaySettings (inline per-display controls)
// ---------------------------------------------------------------------------

function DisplaySettings({
  displayId,
  display,
}: {
  displayId: string;
  display: {
    theme?: string;
    fontSize?: number;
    positionVertical?: string;
    maxLines?: number;
  };
}) {
  const theme = display.theme ?? "dark";
  const fontSize = display.fontSize ?? 64;
  const positionVertical = display.positionVertical ?? "bottom";
  const maxLines = display.maxLines ?? 3;

  async function set(field: string, value: string | number) {
    await updateDisplay(displayId, { [field]: value });
  }

  return (
    <div className="border-t border-oa-stone-200 px-3 py-3 space-y-3 bg-oa-stone-100/50">
      {/* Theme */}
      <div className="flex items-center justify-between gap-4">
        <label className="text-xs font-medium text-oa-black-700 shrink-0">
          Theme
        </label>
        <select
          value={theme}
          onChange={(e) => set("theme", e.target.value)}
          className="rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-2.5 py-1.5 text-xs focus:border-oa-yellow-500 focus:outline-none transition-colors"
        >
          {DISPLAY_THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="flex items-center justify-between gap-4">
        <label className="text-xs font-medium text-oa-black-700 shrink-0">
          Font Size
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={32}
            max={128}
            step={4}
            value={fontSize}
            onChange={(e) => set("fontSize", Number(e.target.value))}
            className="w-24 accent-oa-yellow-500"
          />
          <span className="text-xs tabular-nums text-oa-black-700 w-8 text-right">
            {fontSize}
          </span>
        </div>
      </div>

      {/* Position */}
      <div className="flex items-center justify-between gap-4">
        <label className="text-xs font-medium text-oa-black-700 shrink-0">
          Position
        </label>
        <select
          value={positionVertical}
          onChange={(e) => set("positionVertical", e.target.value)}
          className="rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-2.5 py-1.5 text-xs focus:border-oa-yellow-500 focus:outline-none transition-colors"
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      </div>

      {/* Max Lines */}
      <div className="flex items-center justify-between gap-4">
        <label className="text-xs font-medium text-oa-black-700 shrink-0">
          Max Lines
        </label>
        <select
          value={maxLines}
          onChange={(e) => set("maxLines", Number(e.target.value))}
          className="rounded-[--radius-input] border border-oa-stone-200 bg-oa-white px-2.5 py-1.5 text-xs focus:border-oa-yellow-500 focus:outline-none transition-colors"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DisplayManager (main export)
// ---------------------------------------------------------------------------

export function DisplayManager() {
  const { displays, isLoading } = useDisplays();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card]">
        <p className="text-sm text-oa-stone-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-6 shadow-[--shadow-card] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-oa-black-900">Displays</h2>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-[--radius-button] bg-oa-yellow-500 px-3 py-1.5 text-xs font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Display"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateDisplayForm onCreated={() => setShowCreate(false)} />

      )}

      {/* Display list */}
      <div className="space-y-1.5">
        {displays.length === 0 ? (
          <p className="text-sm text-oa-stone-300 italic py-2">
            No displays configured.
          </p>
        ) : (
          displays.map((d) => <DisplayCard key={d.id} display={d} />)
        )}
      </div>
    </div>
  );
}
