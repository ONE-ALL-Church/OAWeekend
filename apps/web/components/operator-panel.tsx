"use client";

import { FONT_SIZE_MIN, FONT_SIZE_MAX } from "@oaweekend/shared";

interface OperatorPanelProps {
  fontSize: number;
  positionVertical: string;
  profanityFilter: boolean;
  paused: boolean;
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function OperatorPanel({
  fontSize,
  positionVertical,
  profanityFilter,
  paused,
  onUpdate,
}: OperatorPanelProps) {
  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-5 shadow-[--shadow-card] space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-oa-black-700">
        Display Controls
      </h3>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-oa-black-900">
            Font Size
          </label>
          <span className="text-sm font-medium text-oa-black-700 tabular-nums">
            {fontSize}px
          </span>
        </div>
        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          value={fontSize}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
          className="w-full accent-oa-yellow-500"
        />
        <div className="flex justify-between text-xs text-oa-stone-300">
          <span>{FONT_SIZE_MIN}px</span>
          <span>{FONT_SIZE_MAX}px</span>
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-oa-black-900">
          Caption Position
        </label>
        <div className="flex gap-1.5">
          {(["top", "middle", "bottom"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onUpdate({ positionVertical: pos })}
              className={`flex-1 rounded-[--radius-input] border py-2 text-sm capitalize transition-all duration-150 ${
                positionVertical === pos
                  ? "border-oa-yellow-500 bg-oa-yellow-500 text-oa-black-900 font-semibold"
                  : "border-oa-stone-200 text-oa-black-700 hover:border-oa-stone-300 hover:bg-oa-stone-100"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <Toggle
          label="Profanity Filter"
          checked={profanityFilter}
          activeColor="bg-green-500"
          onChange={() => onUpdate({ profanityFilter: !profanityFilter })}
        />
        <Toggle
          label="Pause Captions"
          checked={paused}
          activeColor="bg-oa-yellow-500"
          onChange={() => onUpdate({ paused: !paused })}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  activeColor,
  onChange,
}: {
  label: string;
  checked: boolean;
  activeColor: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-oa-black-900">{label}</label>
      <button
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
          checked ? activeColor : "bg-oa-stone-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
