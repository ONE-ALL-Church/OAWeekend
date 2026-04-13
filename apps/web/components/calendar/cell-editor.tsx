"use client";

import { useState, useEffect, useCallback } from "react";
import { upsertCalendarEntry } from "@/hooks/use-calendar-entry";
import type { CalendarFieldType, CalendarEntryStatus } from "@oaweekend/shared";

interface CellEditorProps {
  entryId?: string;
  weekId: string;
  rowId: string;
  rowName: string;
  fieldType: CalendarFieldType;
  currentContent: string;
  currentStatus: CalendarEntryStatus;
  userId?: string;
  onClose: () => void;
}

export function CellEditor({
  entryId,
  weekId,
  rowId,
  rowName,
  fieldType,
  currentContent,
  currentStatus,
  userId,
  onClose,
}: CellEditorProps) {
  const [content, setContent] = useState(currentContent || getDefaultContent(fieldType));
  const [status, setStatus] = useState<CalendarEntryStatus>(
    currentStatus === "empty" ? "draft" : currentStatus,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await upsertCalendarEntry({
        entryId,
        weekId,
        rowId,
        content,
        status,
        userId,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setIsSaving(false);
    }
  }, [entryId, weekId, rowId, content, status, userId, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-oa-black-900/20">
      <div className="bg-oa-white rounded-[--radius-card] border border-oa-stone-200 shadow-[--shadow-elevated] w-full max-w-md p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-oa-black-900">{rowName}</h3>
          <button
            onClick={onClose}
            className="text-oa-stone-300 hover:text-oa-black-700 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Editor by field type */}
        <div className="mb-4">
          <FieldEditor
            fieldType={fieldType}
            content={content}
            onChange={setContent}
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
            Status
          </span>
          <div className="flex gap-1">
            {(["draft", "confirmed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1 rounded-[10px] text-[10px] font-semibold transition-colors duration-[220ms] ${
                  status === s
                    ? s === "confirmed"
                      ? "bg-oa-green-bg text-oa-green"
                      : "bg-oa-sand-100 text-oa-black-700"
                    : "bg-oa-stone-100 text-oa-stone-300 hover:text-oa-black-700"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[--radius-button] border border-oa-stone-200 text-sm font-medium hover:bg-oa-stone-100 transition-colors duration-[220ms]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldEditor({
  fieldType,
  content,
  onChange,
}: {
  fieldType: CalendarFieldType;
  content: string;
  onChange: (c: string) => void;
}) {
  const parsed = safeJsonParse(content);

  switch (fieldType) {
    case "text": {
      const value = parsed?.value ?? "";
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(JSON.stringify({ value: e.target.value }))}
          autoFocus
          className="w-full px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
          placeholder="Enter text..."
        />
      );
    }
    case "multilineText": {
      const value = parsed?.value ?? "";
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(JSON.stringify({ value: e.target.value }))}
          autoFocus
          rows={4}
          className="w-full px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2 resize-y"
          placeholder="Enter content (use new lines for lists)..."
        />
      );
    }
    case "tagList": {
      const tags: string[] = parsed?.tags ?? [];
      const [newTag, setNewTag] = useState("");
      return (
        <div>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[11px] font-semibold bg-oa-yellow-500/15 text-oa-yellow-600"
              >
                {tag}
                <button
                  onClick={() => {
                    const updated = tags.filter((_, idx) => idx !== i);
                    onChange(JSON.stringify({ tags: updated }));
                  }}
                  className="text-oa-yellow-600/50 hover:text-oa-yellow-600 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTag.trim()) {
                  onChange(JSON.stringify({ tags: [...tags, newTag.trim()] }));
                  setNewTag("");
                }
              }}
              className="flex-1 px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
              placeholder="Add tag and press Enter..."
            />
          </div>
        </div>
      );
    }
    case "boolean": {
      const value = parsed?.value ?? false;
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(JSON.stringify({ value: e.target.checked }))}
            className="w-5 h-5 rounded accent-oa-yellow-500"
          />
          <span className="text-sm text-oa-black-900">
            {value ? "Yes" : "No"}
          </span>
        </label>
      );
    }
    case "personPicker": {
      // Simple name-based input for MVP
      const people: Array<{ name: string; initials: string; rockPersonId: string | null }> = parsed?.people ?? [];
      const [newName, setNewName] = useState("");
      return (
        <div>
          <div className="flex flex-wrap gap-1 mb-2">
            {people.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-oa-sand-100/50 border border-oa-stone-200/50 text-xs font-medium"
              >
                <span className="w-5 h-5 rounded-full bg-oa-yellow-500 flex items-center justify-center text-[9px] font-bold text-oa-black-900">
                  {p.initials}
                </span>
                {p.name}
                <button
                  onClick={() => {
                    const updated = people.filter((_, idx) => idx !== i);
                    onChange(JSON.stringify({ people: updated }));
                  }}
                  className="text-oa-stone-300 hover:text-oa-black-700 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  const name = newName.trim();
                  const parts = name.split(" ");
                  const initials =
                    parts.length >= 2
                      ? (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
                      : name.slice(0, 2).toUpperCase();
                  const updated = [...people, { name, initials, rockPersonId: null }];
                  onChange(JSON.stringify({ people: updated }));
                  setNewName("");
                }
              }}
              className="flex-1 px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
              placeholder="Type name and press Enter..."
            />
          </div>
        </div>
      );
    }
    default: {
      // Fallback: plain text editor for richText, seriesPicker, campusPicker
      const raw = typeof content === "string" ? content : JSON.stringify(content);
      return (
        <textarea
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          rows={4}
          className="w-full px-3 py-2 rounded-[--radius-input] border border-oa-stone-200 text-sm font-mono focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2 resize-y"
          placeholder="Enter JSON content..."
        />
      );
    }
  }
}

function getDefaultContent(fieldType: CalendarFieldType): string {
  switch (fieldType) {
    case "text":
    case "multilineText":
      return JSON.stringify({ value: "" });
    case "personPicker":
      return JSON.stringify({ people: [] });
    case "tagList":
      return JSON.stringify({ tags: [] });
    case "boolean":
      return JSON.stringify({ value: false });
    case "campusPicker":
      return JSON.stringify({ campuses: [] });
    case "seriesPicker":
      return JSON.stringify({ seriesId: "", weekNumber: 0 });
    case "richText":
      return JSON.stringify({ html: "" });
    default:
      return "{}";
  }
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
