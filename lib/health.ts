import {
  ASSET_CLASSES,
  RECENT_DAYS,
  SYNTH_TODAY,
  activityForTrader,
  dateRange,
  getTrader,
} from "./data";
import {
  buildProfile,
  detectForTrader,
  rollupTrader,
} from "./anomaly";
import type { Anomaly, AssetClassCode, Severity } from "./types";

export type HealthZone = "great" | "good" | "watch" | "stressed" | "critical";

export interface HealthComponent {
  key:
    | "volumeStability"
    | "pnlStability"
    | "rhythmConsistency"
    | "venueFocus"
    | "assetFocus"
    | "anomalyDrag";
  label: string;
  score: number; // 0..100
  detail: string;
  weight: number;
}

export interface TraderHealth {
  traderId: string;
  score: number; // 0..100
  zone: HealthZone;
  components: HealthComponent[];
  /** Per-day samples used to draw the heartbeat waveform. */
  series: HealthDay[];
  /** Anomalies in the surveillance window, attached to series indices. */
  anomalies: Anomaly[];
  /** Days since the most recent anomaly (∞ if none). */
  daysSinceAnomaly: number;
  /** Vital tiles for the hero band. */
  vitals: Vital[];
}

export interface HealthDay {
  date: string;
  /** 0..1, "activity intensity" — drives ECG amplitude on quiet days. */
  intensity: number;
  /** Max |z|-score on this day across tracked metrics, used for "stress". */
  stress: number;
  /** Anomalies firing on this day. */
  anomalies: Anomaly[];
  /** Severity color, if any. */
  blipColor?: string;
  /** Whether this is a weekend / no-trade day. */
  rest: boolean;
}

export interface Vital {
  label: string;
  value: string;
  sub: string;
  zone: HealthZone;
}

const ZONE_BREAKS: Array<[number, HealthZone]> = [
  [85, "great"],
  [70, "good"],
  [55, "watch"],
  [40, "stressed"],
  [0, "critical"],
];

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#facc15",
  medium: "#fb923c",
  high: "#ef4444",
  critical: "#ec4899",
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 12,
  medium: 22,
  high: 38,
  critical: 60,
};

export function zoneFor(score: number): HealthZone {
  for (const [min, zone] of ZONE_BREAKS) {
    if (score >= min) return zone;
  }
  return "critical";
}

export const ZONE_COLOR: Record<HealthZone, string> = {
  great: "#22c55e",
  good: "#84cc16",
  watch: "#facc15",
  stressed: "#fb923c",
  critical: "#ef4444",
};

export const ZONE_LABEL: Record<HealthZone, string> = {
  great: "Healthy",
  good: "Good",
  watch: "Watch",
  stressed: "Stressed",
  critical: "Critical",
};

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function meanAbsZ(values: number[], mean: number, std: number): number {
  if (std <= 0 || values.length === 0) return 0;
  const zs = values.map((v) => Math.abs((v - mean) / std));
  return zs.reduce((a, b) => a + b, 0) / zs.length;
}

function tvDistance(
  recent: Record<string, number>,
  baseline: Record<string, number>
): number {
  const keys = new Set([...Object.keys(recent), ...Object.keys(baseline)]);
  let s = 0;
  for (const k of keys) {
    s += Math.abs((recent[k] ?? 0) - (baseline[k] ?? 0));
  }
  return s / 2; // total variation distance, 0..1
}

export function buildHealth(traderId: string): TraderHealth | null {
  const trader = getTrader(traderId);
  if (!trader) return null;
  const profile = buildProfile(traderId);
  const rollup = rollupTrader(traderId);
  const anomalies = detectForTrader(traderId);
  const rows = activityForTrader(traderId);

  // ── Component scores ───────────────────────────────────────────────────
  const recentVolumes = rollup.recent.map((r) => r.notional);
  const volZ = meanAbsZ(
    recentVolumes,
    profile.metrics.notional.mean,
    profile.metrics.notional.std
  );
  const volumeStability = clamp(100 - volZ * 28);

  const recentPnl = rollup.recent.map((r) => r.pnl);
  const pnlZ = meanAbsZ(
    recentPnl,
    profile.metrics.pnl.mean,
    profile.metrics.pnl.std
  );
  const pnlStability = clamp(100 - pnlZ * 28);

  const recentHours = rollup.recent.map((r) => r.avgHourUtc);
  const hourZ = meanAbsZ(
    recentHours,
    profile.metrics.avgHourUtc.mean,
    profile.metrics.avgHourUtc.std
  );
  const rhythmConsistency = clamp(100 - hourZ * 30);

  // Venue focus: TV distance between recent and baseline venue mix.
  const recentVenueNotional = new Map<string, number>();
  for (const r of rows.filter((x) =>
    rollup.recent.some((d) => d.date === x.date)
  )) {
    recentVenueNotional.set(
      r.venue,
      (recentVenueNotional.get(r.venue) ?? 0) + r.notional
    );
  }
  const totalRecent = Array.from(recentVenueNotional.values()).reduce(
    (a, b) => a + b,
    0
  );
  const recentVenueMix: Record<string, number> = {};
  for (const [v, n] of recentVenueNotional) {
    recentVenueMix[v] = totalRecent > 0 ? n / totalRecent : 0;
  }
  const baselineVenueNotional = new Map<string, number>();
  for (const r of rows.filter((x) => x.date < rollup.recent[0]?.date)) {
    baselineVenueNotional.set(
      r.venue,
      (baselineVenueNotional.get(r.venue) ?? 0) + r.notional
    );
  }
  const totalBaseline = Array.from(baselineVenueNotional.values()).reduce(
    (a, b) => a + b,
    0
  );
  const baselineVenueMix: Record<string, number> = {};
  for (const [v, n] of baselineVenueNotional) {
    baselineVenueMix[v] = totalBaseline > 0 ? n / totalBaseline : 0;
  }
  const venueTv = tvDistance(recentVenueMix, baselineVenueMix);
  const venueFocus = clamp(100 - venueTv * 180);

  // Asset focus: TV distance recent vs baseline asset mix.
  const recentAssetNotional: Record<string, number> = {};
  for (const r of rows.filter((x) =>
    rollup.recent.some((d) => d.date === x.date)
  )) {
    recentAssetNotional[r.assetClass] =
      (recentAssetNotional[r.assetClass] ?? 0) + r.notional;
  }
  const totalRecentAsset = Object.values(recentAssetNotional).reduce(
    (a, b) => a + b,
    0
  );
  const recentAssetMix: Record<string, number> = {};
  for (const [k, v] of Object.entries(recentAssetNotional)) {
    recentAssetMix[k] = totalRecentAsset > 0 ? v / totalRecentAsset : 0;
  }
  const assetTv = tvDistance(recentAssetMix, profile.assetMix);
  const assetFocus = clamp(100 - assetTv * 180);

  // Anomaly drag.
  const drag = anomalies.reduce(
    (s, a) => s + SEVERITY_WEIGHT[a.severity],
    0
  );
  const anomalyDrag = clamp(drag, 0, 100);
  const anomalyScore = 100 - anomalyDrag;

  const components: HealthComponent[] = [
    {
      key: "volumeStability",
      label: "Volume stability",
      score: volumeStability,
      detail: `mean |z| ${volZ.toFixed(2)} on daily notional`,
      weight: 0.2,
    },
    {
      key: "pnlStability",
      label: "PnL stability",
      score: pnlStability,
      detail: `mean |z| ${pnlZ.toFixed(2)} on daily PnL`,
      weight: 0.2,
    },
    {
      key: "rhythmConsistency",
      label: "Rhythm consistency",
      score: rhythmConsistency,
      detail: `mean |z| ${hourZ.toFixed(2)} on trading hour`,
      weight: 0.15,
    },
    {
      key: "venueFocus",
      label: "Venue focus",
      score: venueFocus,
      detail: `TV distance ${venueTv.toFixed(2)} vs baseline mix`,
      weight: 0.15,
    },
    {
      key: "assetFocus",
      label: "Asset focus",
      score: assetFocus,
      detail: `TV distance ${assetTv.toFixed(2)} vs baseline mix`,
      weight: 0.1,
    },
    {
      key: "anomalyDrag",
      label: "Anomaly load",
      score: anomalyScore,
      detail:
        anomalies.length === 0
          ? "no anomalies in window"
          : `${anomalies.length} anomalies, weighted ${drag.toFixed(0)}`,
      weight: 0.2,
    },
  ];

  const weightedSum = components.reduce(
    (s, c) => s + c.score * c.weight,
    0
  );
  const score = Math.round(weightedSum);
  const zone = zoneFor(score);

  // ── Time series for ECG ────────────────────────────────────────────────
  // Use the surveillance window (RECENT_DAYS) plus a small bit of baseline
  // so the waveform has resting context before any blips.
  const windowDays = RECENT_DAYS * 2; // 14 days total
  const seriesDates = dateRange(SYNTH_TODAY, windowDays);
  const recentDates = new Set(dateRange(SYNTH_TODAY, RECENT_DAYS));
  const totalByDate = new Map<string, (typeof rollup.totals)[number]>();
  for (const t of rollup.totals) totalByDate.set(t.date, t);
  const maxNotional = Math.max(
    1,
    ...rollup.totals.map((t) => t.notional)
  );

  const series: HealthDay[] = seriesDates.map((date) => {
    const row = totalByDate.get(date);
    const intensity = row ? row.notional / maxNotional : 0;
    const z =
      row && profile.metrics.notional.std > 0
        ? Math.abs((row.notional - profile.metrics.notional.mean) /
            profile.metrics.notional.std)
        : 0;
    const dayAnoms = anomalies.filter(
      (a) => a.date === date && recentDates.has(date)
    );
    const maxSev = dayAnoms.reduce<Severity | null>((acc, a) => {
      const order = ["low", "medium", "high", "critical"];
      if (!acc) return a.severity;
      return order.indexOf(a.severity) > order.indexOf(acc) ? a.severity : acc;
    }, null);
    return {
      date,
      intensity,
      stress: z,
      anomalies: dayAnoms,
      blipColor: maxSev ? SEVERITY_COLOR[maxSev] : undefined,
      rest: !row,
    };
  });

  // ── Vitals ─────────────────────────────────────────────────────────────
  const daysSinceAnomaly = (() => {
    if (anomalies.length === 0) return Infinity;
    const latest = anomalies
      .map((a) => a.date)
      .sort()
      .slice(-1)[0];
    const today = new Date(SYNTH_TODAY + "T00:00:00Z").getTime();
    const t = new Date(latest + "T00:00:00Z").getTime();
    return Math.round((today - t) / 86_400_000);
  })();

  const restingVolume = profile.metrics.notional.mean;
  const recentMeanVolume =
    recentVolumes.reduce((a, b) => a + b, 0) /
    Math.max(1, recentVolumes.length);
  const cvPnl =
    profile.metrics.pnl.std > 0
      ? Math.abs(profile.metrics.pnl.std / Math.max(1, profile.metrics.pnl.mean))
      : 0;

  const vitals: Vital[] = [
    {
      label: "Resting volume",
      value: fmtUsd(restingVolume) + "/d",
      sub: `today ${fmtUsd(recentMeanVolume)} (${ratio(
        recentMeanVolume,
        restingVolume
      )})`,
      zone: zoneFor(volumeStability),
    },
    {
      label: "Rhythm (HRV)",
      value: hourZ.toFixed(2) + "σ",
      sub: "weighted hour drift from baseline",
      zone: zoneFor(rhythmConsistency),
    },
    {
      label: "Variability",
      value: cvPnl < 10 ? cvPnl.toFixed(2) : "high",
      sub: "PnL coefficient of variation",
      zone: zoneFor(pnlStability),
    },
    {
      label: "Recovery",
      value:
        daysSinceAnomaly === Infinity
          ? "—"
          : `${daysSinceAnomaly}d`,
      sub:
        daysSinceAnomaly === Infinity
          ? "no anomalies in window"
          : "since last anomaly",
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

  return {
    traderId,
    score,
    zone,
    components,
    series,
    anomalies,
    daysSinceAnomaly,
    vitals,
  };
}

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function ratio(a: number, b: number): string {
  if (b <= 0) return "—";
  const r = a / b;
  return r >= 1 ? `+${((r - 1) * 100).toFixed(0)}%` : `${((r - 1) * 100).toFixed(0)}%`;
}

// Suppress unused import warnings if any.
void ASSET_CLASSES;
export type AssetMixKey = AssetClassCode;
