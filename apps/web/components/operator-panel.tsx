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
    <div className="space-y-5">
      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Font Size</label>
          <span className="text-sm text-neutral-500">{fontSize}px</span>
        </div>
        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          value={fontSize}
          onChange={(e) =>
            onUpdate({ fontSize: parseInt(e.target.value) })
          }
          className="w-full accent-neutral-900"
        />
        <div className="flex justify-between text-xs text-neutral-400">
          <span>{FONT_SIZE_MIN}px</span>
          <span>{FONT_SIZE_MAX}px</span>
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Caption Position</label>
        <div className="flex gap-2">
          {(["top", "middle", "bottom"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onUpdate({ positionVertical: pos })}
              className={`flex-1 rounded-lg border py-2 text-sm capitalize transition-colors ${
                positionVertical === pos
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 hover:border-neutral-400"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Profanity Filter</label>
          <button
            onClick={() =>
              onUpdate({ profanityFilter: !profanityFilter })
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              profanityFilter ? "bg-green-500" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                profanityFilter ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Pause Captions
          </label>
          <button
            onClick={() => onUpdate({ paused: !paused })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              paused ? "bg-yellow-500" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                paused ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
