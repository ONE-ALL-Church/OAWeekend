"use client";

interface AudioLevelMeterProps {
  level: number; // 0 to 1 (RMS)
}

export function AudioLevelMeter({ level }: AudioLevelMeterProps) {
  // Convert RMS to a more visual-friendly scale (logarithmic)
  const db = level > 0 ? 20 * Math.log10(level) : -100;
  const normalized = Math.max(0, Math.min(1, (db + 60) / 60)); // -60dB to 0dB range
  const percentage = Math.round(normalized * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-500 w-12">Level</span>
      <div className="flex-1 h-3 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-75 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              percentage > 85
                ? "#ef4444" // red - clipping
                : percentage > 60
                  ? "#22c55e" // green - good
                  : "#eab308", // yellow - low
          }}
        />
      </div>
      <span className="text-xs text-neutral-500 w-10 text-right">
        {percentage > 0 ? `${Math.round(db)}dB` : "--"}
      </span>
    </div>
  );
}
