import Link from "next/link";
import { HealthRing } from "./HealthRing";
import { HeartbeatWaveform } from "./HeartbeatWaveform";
import { RhythmBars } from "./RhythmBars";
import { VitalTile } from "./VitalTile";
import { ZONE_COLOR, ZONE_LABEL, type TraderHealth } from "@/lib/health";

interface Props {
  health: TraderHealth;
  traderName: string;
  /** Show the link to the fullscreen view. */
  showFullscreenLink?: boolean;
  /** Hide the surrounding panel chrome for the fullscreen page. */
  bare?: boolean;
}

export function HealthBand({
  health,
  traderName,
  showFullscreenLink = true,
  bare = false,
}: Props) {
  const ringColor = ZONE_COLOR[health.zone];
  const inner = (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
      <div className="flex items-center justify-center">
        <HealthRing score={health.score} zone={health.zone} />
      </div>
      <div className="space-y-3 min-w-0">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: ringColor }}
            >
              Status · {ZONE_LABEL[health.zone]}
            </div>
            <div className="text-lg font-semibold mt-0.5">
              {summary(health)}
            </div>
          </div>
          {showFullscreenLink ? (
            <Link
              href={`/trader/${health.traderId}/health`}
              className="text-xs px-3 py-1.5 rounded border border-line hover:border-ink-muted text-ink-muted hover:text-ink"
            >
              Open wall view →
            </Link>
          ) : null}
        </div>
        <HeartbeatWaveform series={health.series} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {health.vitals.map((v) => (
            <VitalTile key={v.label} {...v} />
          ))}
        </div>
      </div>
    </div>
  );

  if (bare) {
    return (
      <div className="space-y-6">
        {inner}
        <RhythmBars series={health.series} />
        <ComponentBreakdown health={health} traderName={traderName} />
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse_dot"
            style={{ background: ringColor }}
          />
          <div className="panel-title">Trader Health · last 14 days</div>
        </div>
        <div className="text-[11px] text-ink-dim font-mono">
          {health.daysSinceAnomaly === Infinity
            ? "no anomalies in window"
            : `${health.daysSinceAnomaly}d since last anomaly`}
        </div>
      </div>
      <div className="p-6">{inner}</div>
    </section>
  );
}

function summary(health: TraderHealth): string {
  const anomCount = health.anomalies.length;
  if (anomCount === 0) {
    return "In rhythm — no anomalies in the surveillance window.";
  }
  const sevs = anomCount > 1 ? "events" : "event";
  return `${anomCount} ${sevs} this week — review the blips on the trace.`;
}

function ComponentBreakdown({
  health,
}: {
  health: TraderHealth;
  traderName: string;
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">Health components</div>
      </div>
      <ul className="divide-y divide-line">
        {health.components.map((c) => (
          <li key={c.key} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-xs text-ink-muted w-40 shrink-0">
                {c.label}
              </div>
              <div className="flex-1 h-2 bg-bg-subtle rounded">
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${c.score}%`,
                    background: ZONE_COLOR[zoneOf(c.score)],
                  }}
                />
              </div>
              <div className="font-mono tabular-nums text-sm w-12 text-right">
                {Math.round(c.score)}
              </div>
              <div className="text-[11px] font-mono text-ink-dim w-12 text-right">
                ×{c.weight.toFixed(2)}
              </div>
            </div>
            <div className="text-[11px] text-ink-dim ml-40 mt-1">{c.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function zoneOf(score: number) {
  return score >= 85
    ? "great"
    : score >= 70
    ? "good"
    : score >= 55
    ? "watch"
    : score >= 40
    ? "stressed"
    : ("critical" as const);
}
