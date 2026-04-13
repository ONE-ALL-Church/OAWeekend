"use client";

interface AudioLevelMeterProps {
  level: number; // 0 to 1 (RMS)
}

export function AudioLevelMeter({ level }: AudioLevelMeterProps) {
  const dB = level > 0 ? 20 * Math.log10(level) : -100;
  const normalized = Math.max(0, Math.min(1, (dB + 60) / 60));
  const pct = Math.round(normalized * 100);

  const color =
    pct > 85
      ? "bg-red-500"
      : pct > 60
        ? "bg-green-500"
        : "bg-oa-yellow-500";

  const label =
    pct > 85 ? "Clipping" : pct > 60 ? "Good" : pct > 20 ? "Low" : "Silent";

  return (
    <div className="rounded-[--radius-card] bg-oa-white border border-oa-stone-200 p-4 shadow-[--shadow-card] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-oa-black-700">
          Audio Level
        </span>
        <span className="text-xs tabular-nums text-oa-black-700">
          {pct > 0 ? `${Math.round(dB)} dB` : "—"}{" "}
          <span className="text-oa-stone-300">&middot;</span>{" "}
          <span
            className={
              pct > 85
                ? "text-red-500 font-medium"
                : pct > 60
                  ? "text-green-600 font-medium"
                  : "text-oa-stone-300"
            }
          >
            {label}
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-oa-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-75 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
