"use client";

import { useState } from "react";
import { useCalendarSections } from "@/hooks/use-calendar";
import {
  createCalendarSection,
  deleteCalendarSection,
  createCalendarRow,
  deleteCalendarRow,
} from "@/hooks/use-calendar-settings";
import { CALENDAR_FIELD_TYPE_OPTIONS } from "@oaweekend/shared";
import type { CalendarSectionWithRows } from "@/lib/instant";

export function CalendarSettingsPanel() {
  const { sections, isLoading } = useCalendarSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [addingSectionName, setAddingSectionName] = useState("");

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-oa-stone-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sections list */}
      <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-oa-stone-200/50">
          <h2 className="text-sm font-bold text-oa-black-900">Sections</h2>
        </div>

        <div className="divide-y divide-oa-stone-200/30">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => setSelectedSectionId(section.id)}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors duration-[220ms] ${
                selectedSectionId === section.id
                  ? "bg-oa-yellow-500/8"
                  : "hover:bg-oa-sand-100/35"
              }`}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: section.color }}
              />
              <span className="flex-1 text-sm font-medium text-oa-black-900">
                {section.name}
              </span>
              <span className="text-xs text-oa-stone-300">
                {section.rows.length} rows
              </span>
            </div>
          ))}
        </div>

        {/* Add section */}
        <div className="px-5 py-3 border-t border-oa-stone-200/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={addingSectionName}
              onChange={(e) => setAddingSectionName(e.target.value)}
              placeholder="New section name..."
              className="flex-1 px-3 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
            />
            <button
              onClick={async () => {
                if (!addingSectionName.trim()) return;
                const slug = addingSectionName
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-");
                await createCalendarSection({
                  name: addingSectionName.trim(),
                  slug,
                  color: "#272728",
                  sortOrder: sections.length,
                });
                setAddingSectionName("");
              }}
              className="px-3 py-1.5 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Selected section detail */}
      {selectedSection ? (
        <SectionDetail section={selectedSection} />
      ) : (
        <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] flex items-center justify-center p-12">
          <p className="text-sm text-oa-stone-300 italic">
            Select a section to manage its rows
          </p>
        </div>
      )}
    </div>
  );
}

function SectionDetail({ section }: { section: CalendarSectionWithRows }) {
  const [addingRowName, setAddingRowName] = useState("");
  const [addingRowFieldType, setAddingRowFieldType] = useState("text");

  return (
    <div className="bg-oa-white border border-oa-stone-200 rounded-[--radius-card] shadow-[--shadow-card] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-oa-stone-200/50 flex items-center gap-2.5">
        <div
          className="w-3 h-3 rounded-sm shrink-0"
          style={{ backgroundColor: section.color }}
        />
        <h2 className="text-sm font-bold text-oa-black-900">{section.name}</h2>
        <div className="flex-1" />
        <button
          onClick={async () => {
            if (confirm(`Delete section "${section.name}" and all its rows?`)) {
              await deleteCalendarSection(section.id);
            }
          }}
          className="text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          Delete Section
        </button>
      </div>

      {/* Rows */}
      <div className="divide-y divide-oa-stone-200/30">
        {section.rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-3 px-5 py-2.5 group"
          >
            <span className="flex-1 text-sm text-oa-black-900">{row.name}</span>
            <span className="text-xs text-oa-stone-300 bg-oa-stone-100 px-2 py-0.5 rounded">
              {row.fieldType}
            </span>
            {row.campusSpecific && (
              <span className="text-[10px] text-blue-500 font-semibold">
                Campus
              </span>
            )}
            <button
              onClick={async () => {
                if (confirm(`Delete row "${row.name}"?`)) {
                  await deleteCalendarRow(row.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-600 transition-all"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className="px-5 py-3 border-t border-oa-stone-200/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={addingRowName}
            onChange={(e) => setAddingRowName(e.target.value)}
            placeholder="New row name..."
            className="flex-1 px-3 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm focus-visible:outline-2 focus-visible:outline-oa-yellow-500 focus-visible:outline-offset-2"
          />
          <select
            value={addingRowFieldType}
            onChange={(e) => setAddingRowFieldType(e.target.value)}
            className="px-2 py-1.5 rounded-[--radius-input] border border-oa-stone-200 text-sm bg-oa-white"
          >
            {CALENDAR_FIELD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (!addingRowName.trim()) return;
              const slug = addingRowName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
              await createCalendarRow({
                sectionId: section.id,
                name: addingRowName.trim(),
                slug,
                fieldType: addingRowFieldType,
                sortOrder: section.rows.length,
                campusSpecific: false,
              });
              setAddingRowName("");
            }}
            className="px-3 py-1.5 rounded-[--radius-button] bg-oa-yellow-500 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-[220ms]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
