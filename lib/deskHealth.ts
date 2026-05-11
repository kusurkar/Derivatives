import { buildHealth } from "./health";
import {
  ZONE_COLOR,
  zoneFor,
  type HealthDay,
  type HealthComponent,
  type HealthZone,
  type TraderHealth,
  type Vital,
} from "./health";
import { getDesk, tradersForDesk } from "./data";
import type { Anomaly, Severity } from "./types";

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];
const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#facc15",
  medium: "#fb923c",
  high: "#ef4444",
  critical: "#ec4899",
};

/** Aggregate trader healths on a desk into a single rollup with the same
 *  shape as a TraderHealth so the existing health components render it. */
export type DeskHealth = TraderHealth & {
  /** Count of traders in each zone, used by DeskHealthCard. */
  zoneCounts: Record<HealthZone, number>;
  /** Worst-performing trader for "needs attention" surfacing. */
  worstTrader: { id: string; name: string; score: number } | null;
  traderCount: number;
};

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function maxSev(a: Severity | null, b: Severity): Severity {
  if (!a) return b;
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

export function buildDeskHealth(deskId: string): DeskHealth | null {
  const desk = getDesk(deskId);
  if (!desk) return null;
  const traders = tradersForDesk(deskId);
  const traderHealths = traders
    .map((t) => ({ trader: t, health: buildHealth(t.id) }))
    .filter((x): x is { trader: typeof x.trader; health: TraderHealth } => !!x.health);
  if (traderHealths.length === 0) return null;

  // Composite score = mean across the desk's traders.
  const score = Math.round(mean(traderHealths.map((x) => x.health.score)));
  const zone = zoneFor(score);

  // Zone breakdown across traders.
  const zoneCounts: Record<HealthZone, number> = {
    great: 0,
    good: 0,
    watch: 0,
    stressed: 0,
    critical: 0,
  };
  for (const x of traderHealths) zoneCounts[x.health.zone]++;

  // Components: mean each component score across traders, keep first label/detail.
  const componentKeys = traderHealths[0].health.components.map((c) => c.key);
  const components: HealthComponent[] = componentKeys.map((key) => {
    const samples = traderHealths
      .map((x) => x.health.components.find((c) => c.key === key))
      .filter(Boolean) as HealthComponent[];
    return {
      key,
      label: samples[0].label,
      score: mean(samples.map((s) => s.score)),
      detail: `mean across ${samples.length} traders`,
      weight: samples[0].weight,
    };
  });

  // Series: per-date aggregate intensity (mean) and stress (max),
  // anomalies = union of trader anomalies on that date.
  const dates = traderHealths[0].health.series.map((d) => d.date);
  const series: HealthDay[] = dates.map((date) => {
    const dayRows = traderHealths
      .map((x) => x.health.series.find((d) => d.date === date))
      .filter((d): d is HealthDay => !!d);
    const intensity = mean(dayRows.map((d) => d.intensity));
    const stress = Math.max(0, ...dayRows.map((d) => d.stress));
    const anomalies: Anomaly[] = dayRows.flatMap((d) => d.anomalies);
    const sev = anomalies.reduce<Severity | null>(
      (acc, a) => maxSev(acc, a.severity),
      null
    );
    const rest = dayRows.every((d) => d.rest);
    return {
      date,
      intensity,
      stress,
      anomalies,
      blipColor: sev ? SEVERITY_COLOR[sev] : undefined,
      rest,
    };
  });

  // Anomalies — flatten across the desk's traders.
  const anomalies: Anomaly[] = traderHealths.flatMap((x) => x.health.anomalies);

  const daysSinceAnomaly = (() => {
    const recents = traderHealths
      .map((x) => x.health.daysSinceAnomaly)
      .filter((d) => Number.isFinite(d)) as number[];
    if (recents.length === 0) return Infinity;
    return Math.min(...recents);
  })();

  const stressedCount = zoneCounts.stressed + zoneCounts.critical;
  const healthyCount = zoneCounts.great + zoneCounts.good;

  // Vitals reframed at desk level.
  const vitals: Vital[] = [
    {
      label: "Traders",
      value: traderHealths.length.toString(),
      sub: `${desk.region} · ${desk.name}`,
      zone: "good",
    },
    {
      label: "Healthy",
      value: `${healthyCount} / ${traderHealths.length}`,
      sub: `${zoneCounts.watch} watch · ${stressedCount} stressed`,
      zone:
        stressedCount === 0 && zoneCounts.watch === 0
          ? "great"
          : stressedCount === 0
          ? "good"
          : stressedCount <= 1
          ? "watch"
          : stressedCount <= 2
          ? "stressed"
          : "critical",
    },
    {
      label: "Anomalies 7d",
      value: anomalies.length.toString(),
      sub: `${anomalies.filter((a) => a.severity === "critical" || a.severity === "high").length} high+`,
      zone: anomalies.length === 0 ? "great" : anomalies.length <= 3 ? "good" : anomalies.length <= 8 ? "watch" : "stressed",
    },
    {
      label: "Recovery",
      value:
        daysSinceAnomaly === Infinity ? "—" : `${daysSinceAnomaly}d`,
      sub:
        daysSinceAnomaly === Infinity
          ? "no anomalies in window"
          : "since most recent",
      zone:
        daysSinceAnomaly === Infinity
          ? "great"
          : daysSinceAnomaly < 1
          ? "critical"
          : daysSinceAnomaly < 3
          ? "stressed"
          : "good",
    },
  ];

  // Worst trader on the desk for "who to look at first".
  const worst = traderHealths
    .slice()
    .sort((a, b) => a.health.score - b.health.score)[0];
  const worstTrader = worst
    ? {
        id: worst.trader.id,
        name: worst.trader.name,
        score: worst.health.score,
      }
    : null;

  return {
    traderId: deskId,
    score,
    zone,
    components,
    series,
    anomalies,
    daysSinceAnomaly,
    vitals,
    zoneCounts,
    worstTrader,
    traderCount: traderHealths.length,
  };
}

void ZONE_COLOR;
