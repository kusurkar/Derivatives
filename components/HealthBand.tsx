import Link from "next/link";
import { HealthRing } from "./HealthRing";
import { HeartbeatWaveform } from "./HeartbeatWaveform";
import { RhythmBars } from "./RhythmBars";
import { VitalTile } from "./VitalTile";
import { ZONE_COLOR, ZONE_LABEL, type TraderHealth } from "@/lib/health";

interface Props {
  health: TraderHealth;
  /** Display name for the entity (trader name or system name). */
  name: string;
  /** Optional href to a fullscreen "wall" variant. */
  wallHref?: string;
  /** Hide the surrounding panel chrome for the fullscreen page. */
  bare?: boolean;
  /** Override the title shown in the panel header. */
  title?: string;
  /** Override the in-rhythm summary text for non-trader entities. */
  summaryFn?: (h: TraderHealth) => string;
}

export function HealthBand({
  health,
  name,
  wallHref,
  bare = false,
  title = "Trader Health · last 14 days",
  summaryFn = defaultSummary,
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
              {summaryFn(health)}
            </div>
          </div>
          {wallHref ? (
            <Link
              href={wallHref}
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
        <ComponentBreakdown health={health} name={name} />
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
          <div className="panel-title">{title}</div>
        </div>
        <div className="text-[11px] text-ink-dim font-mono">
          {health.daysSinceAnomaly === Infinity
            ? "no events in window"
            : `${health.daysSinceAnomaly}d since last event`}
        </div>
      </div>
      <div className="p-6">{inner}</div>
    </section>
  );
}

function defaultSummary(health: TraderHealth): string {
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
  name: string;
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
