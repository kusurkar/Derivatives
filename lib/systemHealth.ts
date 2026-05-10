import {
  SYNTH_TODAY,
  WINDOW_DAYS,
  dateRange,
} from "./data";
import {
  SYSTEM_RECENT_DAYS,
  getSystem,
  metricsForSystem,
  type SystemIncident,
  type SystemMetricDay,
} from "./systems";
import {
  ZONE_COLOR,
  zoneFor,
  type HealthDay,
  type HealthComponent,
  type TraderHealth,
  type Vital,
} from "./health";
import type { Severity } from "./types";

/** Same shape as TraderHealth so all health components reuse cleanly. */
export type SystemHealth = TraderHealth;

const Z_THRESH = 2.5;

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];
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

function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
    Math.max(1, xs.length - 1);
  return { mean, std: Math.sqrt(variance) };
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function severityFromZ(z: number): Severity {
  const a = Math.abs(z);
  if (a >= 5) return "critical";
  if (a >= 3.5) return "high";
  if (a >= 2.5) return "medium";
  return "low";
}

function maxSev(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

interface SystemRollup {
  totals: SystemMetricDay[];
  baseline: SystemMetricDay[];
  recent: SystemMetricDay[];
}

function rollupSystem(systemId: string): SystemRollup {
  const totals = metricsForSystem(systemId).slice().sort((a, b) =>
    a.date < b.date ? -1 : 1
  );
  const all = dateRange(SYNTH_TODAY, WINDOW_DAYS);
  const cutDate = all[all.length - SYSTEM_RECENT_DAYS];
  const baseline = totals.filter((t) => t.date < cutDate);
  const recent = totals.filter((t) => t.date >= cutDate);
  return { totals, baseline, recent };
}

export function detectSystemIncidents(systemId: string): SystemIncident[] {
  const system = getSystem(systemId);
  if (!system) return [];
  const r = rollupSystem(systemId);
  if (r.baseline.length === 0) return [];

  const tpStats = meanStd(r.baseline.map((d) => d.throughput));
  const p99Stats = meanStd(r.baseline.map((d) => d.p99Ms));
  const errStats = meanStd(r.baseline.map((d) => d.errorRate));
  const upStats = meanStd(r.baseline.map((d) => d.uptime));

  const out: SystemIncident[] = [];
  const push = (i: Omit<SystemIncident, "id">) =>
    out.push({ ...i, id: `${i.systemId}-${i.date}-${i.kind}` });

  for (const day of r.recent) {
    if (p99Stats.std > 0) {
      const z = (day.p99Ms - p99Stats.mean) / p99Stats.std;
      if (z >= Z_THRESH) {
        push({
          date: day.date,
          systemId,
          kind: "LATENCY_SPIKE",
          severity: severityFromZ(z),
          message: `p99 latency ${(day.p99Ms / p99Stats.mean).toFixed(1)}× baseline (${day.p99Ms.toFixed(0)}ms vs ${p99Stats.mean.toFixed(0)}ms)`,
          metric: "p99Ms",
          observed: day.p99Ms,
          baseline: p99Stats.mean,
        });
      }
    }
    if (errStats.std > 0) {
      const z = (day.errorRate - errStats.mean) / errStats.std;
      if (z >= Z_THRESH || day.errorRate >= 0.02) {
        push({
          date: day.date,
          systemId,
          kind: "ERROR_BURST",
          severity:
            day.errorRate >= 0.05
              ? "critical"
              : day.errorRate >= 0.02
              ? "high"
              : severityFromZ(z),
          message: `Error rate ${(day.errorRate * 100).toFixed(2)}% (baseline ${(errStats.mean * 100).toFixed(2)}%)`,
          metric: "errorRate",
          observed: day.errorRate,
          baseline: errStats.mean,
        });
      }
    }
    if (tpStats.std > 0) {
      const z = (day.throughput - tpStats.mean) / tpStats.std;
      if (z <= -Z_THRESH && tpStats.mean > 0 && day.throughput < tpStats.mean * 0.6) {
        push({
          date: day.date,
          systemId,
          kind: "THROUGHPUT_DROP",
          severity: severityFromZ(z),
          message: `Throughput ${(day.throughput / tpStats.mean * 100).toFixed(0)}% of baseline (${day.throughput.toFixed(0)}/s vs ${tpStats.mean.toFixed(0)}/s)`,
          metric: "throughput",
          observed: day.throughput,
          baseline: tpStats.mean,
        });
      }
    }
    if (day.uptime < 0.99) {
      const sev: Severity =
        day.uptime < 0.95
          ? "critical"
          : day.uptime < 0.98
          ? "high"
          : "medium";
      push({
        date: day.date,
        systemId,
        kind: "OUTAGE",
        severity: sev,
        message: `Uptime ${(day.uptime * 100).toFixed(2)}%`,
        metric: "uptime",
        observed: day.uptime,
        baseline: upStats.mean,
      });
    }
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtRate(r: number): string {
  if (r >= 100) return `${r.toFixed(0)}/s`;
  if (r >= 10) return `${r.toFixed(1)}/s`;
  return `${r.toFixed(2)}/s`;
}

function fmtPct(v: number, digits = 2): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function buildSystemHealth(systemId: string): SystemHealth | null {
  const system = getSystem(systemId);
  if (!system) return null;
  const r = rollupSystem(systemId);
  if (r.baseline.length === 0) return null;
  const incidents = detectSystemIncidents(systemId);

  const tpBase = meanStd(r.baseline.map((d) => d.throughput));
  const p99Base = meanStd(r.baseline.map((d) => d.p99Ms));
  const errBase = meanStd(r.baseline.map((d) => d.errorRate));
  const upBase = meanStd(r.baseline.map((d) => d.uptime));

  const meanAbsZ = (vals: number[], stats: { mean: number; std: number }) => {
    if (stats.std <= 0 || vals.length === 0) return 0;
    return (
      vals.map((v) => Math.abs((v - stats.mean) / stats.std)).reduce((a, b) => a + b, 0) /
      vals.length
    );
  };

  const tpZ = meanAbsZ(r.recent.map((d) => d.throughput), tpBase);
  const p99Z = meanAbsZ(r.recent.map((d) => d.p99Ms), p99Base);
  const errZ = meanAbsZ(r.recent.map((d) => d.errorRate), errBase);
  const recentMeanUp =
    r.recent.reduce((s, d) => s + d.uptime, 0) / Math.max(1, r.recent.length);

  const throughputStability = clamp(100 - tpZ * 28);
  const latencyStability = clamp(100 - p99Z * 28);
  const errorStability = clamp(100 - errZ * 22);
  const availability = clamp(100 - (1 - recentMeanUp) * 5000); // 99.5% → 75
  const drag = incidents.reduce(
    (s, i) => s + SEVERITY_WEIGHT[i.severity],
    0
  );
  const incidentLoad = clamp(100 - drag, 0, 100);

  const components: HealthComponent[] = [
    {
      key: "volumeStability",
      label: "Throughput stability",
      score: throughputStability,
      detail: `mean |z| ${tpZ.toFixed(2)} on daily throughput`,
      weight: 0.18,
    },
    {
      key: "pnlStability",
      label: "Latency stability",
      score: latencyStability,
      detail: `mean |z| ${p99Z.toFixed(2)} on p99 latency`,
      weight: 0.22,
    },
    {
      key: "rhythmConsistency",
      label: "Error stability",
      score: errorStability,
      detail: `mean |z| ${errZ.toFixed(2)} on error rate`,
      weight: 0.15,
    },
    {
      key: "venueFocus",
      label: "Availability",
      score: availability,
      detail: `recent mean uptime ${fmtPct(recentMeanUp, 3)}`,
      weight: 0.20,
    },
    {
      key: "assetFocus",
      label: "Resource headroom",
      score: clamp(100 - (tpBase.std / Math.max(1, tpBase.mean)) * 100),
      detail: `throughput CV ${(tpBase.std / Math.max(1, tpBase.mean)).toFixed(2)}`,
      weight: 0.05,
    },
    {
      key: "anomalyDrag",
      label: "Incident load",
      score: incidentLoad,
      detail:
        incidents.length === 0
          ? "no incidents in window"
          : `${incidents.length} incidents, weighted ${drag.toFixed(0)}`,
      weight: 0.20,
    },
  ];

  const score = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0)
  );
  const zone = zoneFor(score);

  // ── Build the 14-day series for ECG ────────────────────────────────────
  const windowDates = dateRange(SYNTH_TODAY, SYSTEM_RECENT_DAYS * 2);
  const recentDates = new Set(dateRange(SYNTH_TODAY, SYSTEM_RECENT_DAYS));
  const byDate = new Map<string, SystemMetricDay>();
  for (const m of r.totals) byDate.set(m.date, m);
  const maxThroughput = Math.max(1, ...r.totals.map((m) => m.throughput));

  const series: HealthDay[] = windowDates.map((date) => {
    const row = byDate.get(date);
    const intensity = row ? row.throughput / maxThroughput : 0;
    const z =
      row && p99Base.std > 0
        ? Math.abs((row.p99Ms - p99Base.mean) / p99Base.std)
        : 0;
    const dayIncidents = incidents.filter(
      (i) => i.date === date && recentDates.has(date)
    );
    const sev = dayIncidents.reduce<Severity | null>(
      (acc, i) => (acc ? maxSev(acc, i.severity) : i.severity),
      null
    );
    return {
      date,
      intensity,
      stress: z,
      anomalies: dayIncidents.map((i) => ({
        id: i.id,
        date: i.date,
        traderId: i.systemId,
        deskId: system.id,
        kind: i.kind as unknown as never,
        severity: i.severity,
        message: i.message,
        metric: i.metric,
        observed: i.observed,
        baseline: i.baseline,
      })),
      blipColor: sev ? SEVERITY_COLOR[sev] : undefined,
      rest: !row,
    };
  });

  const daysSinceIncident = (() => {
    if (incidents.length === 0) return Infinity;
    const latest = incidents.map((i) => i.date).sort().slice(-1)[0];
    const today = new Date(SYNTH_TODAY + "T00:00:00Z").getTime();
    const t = new Date(latest + "T00:00:00Z").getTime();
    return Math.round((today - t) / 86_400_000);
  })();

  const recentMeanTp =
    r.recent.reduce((s, d) => s + d.throughput, 0) /
    Math.max(1, r.recent.length);
  const recentMeanP99 =
    r.recent.reduce((s, d) => s + d.p99Ms, 0) / Math.max(1, r.recent.length);
  const recentMeanErr =
    r.recent.reduce((s, d) => s + d.errorRate, 0) /
    Math.max(1, r.recent.length);

  const vitals: Vital[] = [
    {
      label: "Throughput",
      value: fmtRate(recentMeanTp),
      sub: `baseline ${fmtRate(tpBase.mean)}`,
      zone: zoneFor(throughputStability),
    },
    {
      label: "p99 latency",
      value: fmtMs(recentMeanP99),
      sub: `baseline ${fmtMs(p99Base.mean)}`,
      zone: zoneFor(latencyStability),
    },
    {
      label: "Error rate",
      value: fmtPct(recentMeanErr, 2),
      sub: `baseline ${fmtPct(errBase.mean, 2)}`,
      zone: zoneFor(errorStability),
    },
    {
      label: "Uptime",
      value: fmtPct(recentMeanUp, 3),
      sub:
        daysSinceIncident === Infinity
          ? "no incidents in window"
          : `${daysSinceIncident}d since last incident`,
      zone: zoneFor(availability),
    },
  ];

  return {
    traderId: system.id, // entity id; reused field name
    score,
    zone,
    components,
    series,
    anomalies: series.flatMap((d) => d.anomalies),
    daysSinceAnomaly: daysSinceIncident,
    vitals,
  };
}

void ZONE_COLOR;
