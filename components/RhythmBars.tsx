import { ZONE_COLOR, zoneFor, type HealthDay } from "@/lib/health";
import { fmtDate } from "@/lib/format";

interface Props {
  series: HealthDay[];
}

/**
 * Fitbit-style daily rhythm bars: one bar per day, height = activity
 * intensity, color = derived health zone for that day (low stress = green,
 * high stress = red). Rest days dimmed.
 */
export function RhythmBars({ series }: Props) {
  return (
    <div className="panel p-4">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted mb-3">
        14-day rhythm
      </div>
      <div className="flex items-end gap-1 h-24">
        {series.map((day) => {
          // Score the day: high stress drops the zone.
          const dayScore = Math.max(0, 100 - day.stress * 30) -
            (day.anomalies.length > 0 ? 30 : 0);
          const zone = day.rest ? "good" : zoneFor(dayScore);
          const color = day.rest ? "#1e2540" : ZONE_COLOR[zone];
          const height = day.rest
            ? 8
            : Math.max(8, Math.min(96, 12 + day.intensity * 84));
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end gap-1"
              title={`${day.date} · intensity ${(day.intensity * 100).toFixed(0)}% · stress ${day.stress.toFixed(2)}σ`}
            >
              <div
                className="w-full rounded-sm"
                style={{
                  height,
                  background: color,
                  opacity: day.rest ? 0.35 : 1,
                  boxShadow:
                    !day.rest && day.anomalies.length > 0
                      ? `0 0 6px ${color}`
                      : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-1 mt-1">
        {series.map((day) => (
          <div
            key={day.date}
            className={`flex-1 text-center text-[9px] font-mono ${
              day.rest ? "text-ink-dim" : "text-ink-muted"
            }`}
          >
            {fmtDate(day.date).split(" ")[1]}
          </div>
        ))}
      </div>
    </div>
  );
}
