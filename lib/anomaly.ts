import {
  ACTIVITY,
  ASSET_CLASSES,
  RECENT_DAYS,
  SYNTH_TODAY,
  TRADERS,
  WINDOW_DAYS,
  activityForTrader,
  dateRange,
  getTrader,
} from "./data";
import type {
  Anomaly,
  AssetClassCode,
  DailyActivity,
  Severity,
  TraderProfile,
} from "./types";

function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, xs.length - 1);
  return { mean, std: Math.sqrt(variance) };
}

function severityFromZ(z: number): Severity {
  const a = Math.abs(z);
  if (a >= 5) return "critical";
  if (a >= 3.5) return "high";
  if (a >= 2.5) return "medium";
  return "low";
}

interface TraderDailyTotals {
  date: string;
  trades: number;
  notional: number;
  pnl: number;
  avgHourUtc: number;
  distinctVenues: number;
  byAsset: Record<AssetClassCode, number>; // notional share
  venues: Set<string>;
}

function rollupByDay(rows: DailyActivity[]): TraderDailyTotals[] {
  const byDate = new Map<string, DailyActivity[]>();
  for (const r of rows) {
    const arr = byDate.get(r.date) ?? [];
    arr.push(r);
    byDate.set(r.date, arr);
  }
  const out: TraderDailyTotals[] = [];
  for (const [date, items] of byDate) {
    const trades = items.reduce((s, x) => s + x.trades, 0);
    const notional = items.reduce((s, x) => s + x.notional, 0);
    const pnl = items.reduce((s, x) => s + x.pnl, 0);
    const weightedHour =
      items.reduce((s, x) => s + x.avgHourUtc * x.trades, 0) /
      Math.max(1, trades);
    const venues = new Set(items.map((x) => x.venue));
    const byAsset = Object.fromEntries(
      ASSET_CLASSES.map((a) => [a.code, 0])
    ) as Record<AssetClassCode, number>;
    for (const it of items) byAsset[it.assetClass] += it.notional;
    out.push({
      date,
      trades,
      notional,
      pnl,
      avgHourUtc: weightedHour,
      distinctVenues: venues.size,
      byAsset,
      venues,
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

export interface TraderRollup {
  totals: TraderDailyTotals[];
  baseline: TraderDailyTotals[];
  recent: TraderDailyTotals[];
  baselineVenues: Set<string>;
  baselineAssetMix: Record<AssetClassCode, number>;
}

export function rollupTrader(traderId: string): TraderRollup {
  const totals = rollupByDay(activityForTrader(traderId));
  const all = dateRange(SYNTH_TODAY, WINDOW_DAYS);
  const cutIdx = all.length - RECENT_DAYS;
  const cutDate = all[cutIdx];
  const baseline = totals.filter((t) => t.date < cutDate);
  const recent = totals.filter((t) => t.date >= cutDate);
  const baselineVenues = new Set<string>();
  for (const b of baseline) for (const v of b.venues) baselineVenues.add(v);
  const assetMixSum = Object.fromEntries(
    ASSET_CLASSES.map((a) => [a.code, 0])
  ) as Record<AssetClassCode, number>;
  let totalNotional = 0;
  for (const b of baseline) {
    for (const a of ASSET_CLASSES) {
      assetMixSum[a.code] += b.byAsset[a.code];
      totalNotional += b.byAsset[a.code];
    }
  }
  const baselineAssetMix = Object.fromEntries(
    ASSET_CLASSES.map((a) => [
      a.code,
      totalNotional > 0 ? assetMixSum[a.code] / totalNotional : 0,
    ])
  ) as Record<AssetClassCode, number>;
  return { totals, baseline, recent, baselineVenues, baselineAssetMix };
}

export function buildProfile(traderId: string): TraderProfile {
  const r = rollupTrader(traderId);
  const trades = r.baseline.map((b) => b.trades);
  const notional = r.baseline.map((b) => b.notional);
  const pnl = r.baseline.map((b) => b.pnl);
  const hour = r.baseline.map((b) => b.avgHourUtc);
  const venues = r.baseline.map((b) => b.distinctVenues);
  return {
    traderId,
    windowDays: r.baseline.length,
    metrics: {
      trades: meanStd(trades),
      notional: meanStd(notional),
      pnl: meanStd(pnl),
      avgHourUtc: meanStd(hour),
      distinctVenues: meanStd(venues),
    },
    assetMix: r.baselineAssetMix,
    venueMix: {}, // not used in v1 UI
  };
}

function pushAnomaly(out: Anomaly[], a: Omit<Anomaly, "id">) {
  out.push({ ...a, id: `${a.traderId}-${a.date}-${a.kind}-${a.metric}` });
}

const Z_THRESH = 2.5;

export function detectForTrader(traderId: string): Anomaly[] {
  const trader = getTrader(traderId);
  if (!trader) return [];
  const r = rollupTrader(traderId);
  const profile = buildProfile(traderId);
  const out: Anomaly[] = [];

  for (const day of r.recent) {
    // Volume spike / drop on notional.
    {
      const { mean, std } = profile.metrics.notional;
      if (std > 0) {
        const z = (day.notional - mean) / std;
        if (z >= Z_THRESH) {
          pushAnomaly(out, {
            date: day.date,
            traderId,
            deskId: trader.deskId,
            kind: "VOLUME_SPIKE",
            severity: severityFromZ(z),
            zScore: z,
            metric: "notional",
            observed: day.notional,
            baseline: mean,
            message: `Notional ${(day.notional / mean).toFixed(1)}× baseline`,
          });
        } else if (z <= -Z_THRESH && mean > 0 && day.notional < mean * 0.4) {
          pushAnomaly(out, {
            date: day.date,
            traderId,
            deskId: trader.deskId,
            kind: "VOLUME_DROP",
            severity: severityFromZ(z),
            zScore: z,
            metric: "notional",
            observed: day.notional,
            baseline: mean,
            message: `Notional ${((day.notional / mean) * 100).toFixed(0)}% of baseline`,
          });
        }
      }
    }
    // Trade count spike (Poisson-ish).
    {
      const { mean, std } = profile.metrics.trades;
      if (std > 0) {
        const z = (day.trades - mean) / std;
        if (z >= Z_THRESH) {
          pushAnomaly(out, {
            date: day.date,
            traderId,
            deskId: trader.deskId,
            kind: "TRADE_COUNT_SPIKE",
            severity: severityFromZ(z),
            zScore: z,
            metric: "trades",
            observed: day.trades,
            baseline: mean,
            message: `Trade count ${day.trades} vs baseline ${mean.toFixed(0)}`,
          });
        }
      }
    }
    // PnL tail via simple IQR-ish rule using std.
    {
      const { mean, std } = profile.metrics.pnl;
      if (std > 0) {
        const z = (day.pnl - mean) / std;
        if (z <= -Z_THRESH) {
          pushAnomaly(out, {
            date: day.date,
            traderId,
            deskId: trader.deskId,
            kind: "PNL_TAIL",
            severity: severityFromZ(z),
            zScore: z,
            metric: "pnl",
            observed: day.pnl,
            baseline: mean,
            message: `PnL tail loss ${(day.pnl / 1e6).toFixed(2)}M (${z.toFixed(1)}σ)`,
          });
        }
      }
    }
    // Off-hours: average trading hour deviates from baseline.
    {
      const { mean, std } = profile.metrics.avgHourUtc;
      if (std > 0.2) {
        const z = (day.avgHourUtc - mean) / std;
        if (Math.abs(z) >= 3) {
          pushAnomaly(out, {
            date: day.date,
            traderId,
            deskId: trader.deskId,
            kind: "OFF_HOURS",
            severity: severityFromZ(z),
            zScore: z,
            metric: "avgHourUtc",
            observed: day.avgHourUtc,
            baseline: mean,
            message: `Avg trading hour ${day.avgHourUtc.toFixed(1)}h UTC vs ${mean.toFixed(1)}h baseline`,
          });
        }
      }
    }
    // New venue not seen in baseline.
    {
      const newVenues: string[] = [];
      for (const v of day.venues) {
        if (!r.baselineVenues.has(v)) newVenues.push(v);
      }
      if (newVenues.length > 0) {
        pushAnomaly(out, {
          date: day.date,
          traderId,
          deskId: trader.deskId,
          kind: "NEW_VENUE",
          severity: "medium",
          metric: "venue",
          observed: newVenues.length,
          message: `Trading on new venue: ${newVenues.join(", ")}`,
        });
      }
    }
    // Asset drift: notional in an asset whose baseline share is < 5%.
    {
      const dayTotal = Object.values(day.byAsset).reduce((a, b) => a + b, 0);
      if (dayTotal > 0) {
        for (const a of ASSET_CLASSES) {
          const dayShare = day.byAsset[a.code] / dayTotal;
          const baseShare = profile.assetMix[a.code] ?? 0;
          if (dayShare > 0.15 && baseShare < 0.05) {
            pushAnomaly(out, {
              date: day.date,
              traderId,
              deskId: trader.deskId,
              kind: "ASSET_DRIFT",
              severity: "medium",
              metric: "assetMix",
              observed: dayShare,
              baseline: baseShare,
              message: `${(dayShare * 100).toFixed(0)}% of notional in ${a.code} (baseline ${(baseShare * 100).toFixed(0)}%)`,
            });
          }
        }
      }
    }
  }

  // Dedup by id (keep highest severity).
  const sevOrder: Severity[] = ["low", "medium", "high", "critical"];
  const map = new Map<string, Anomaly>();
  for (const a of out) {
    const prev = map.get(a.id);
    if (!prev || sevOrder.indexOf(a.severity) > sevOrder.indexOf(prev.severity)) {
      map.set(a.id, a);
    }
  }
  return Array.from(map.values()).sort((x, y) =>
    x.date < y.date ? 1 : x.date > y.date ? -1 : 0
  );
}

let _allCache: Anomaly[] | null = null;
export function detectAll(): Anomaly[] {
  if (_allCache) return _allCache;
  const all: Anomaly[] = [];
  for (const t of TRADERS) all.push(...detectForTrader(t.id));
  // Sort: most severe first, then most recent.
  const sevOrder: Severity[] = ["low", "medium", "high", "critical"];
  all.sort((a, b) => {
    const s = sevOrder.indexOf(b.severity) - sevOrder.indexOf(a.severity);
    if (s !== 0) return s;
    return a.date < b.date ? 1 : -1;
  });
  _allCache = all;
  return all;
}

/** Sum trader-day totals across the whole window for the overview heatmap. */
export function deskAssetMatrix(): {
  notional: Record<string, Record<AssetClassCode, number>>;
  pnl: Record<string, Record<AssetClassCode, number>>;
} {
  const notional: Record<string, Record<AssetClassCode, number>> = {};
  const pnl: Record<string, Record<AssetClassCode, number>> = {};
  for (const a of ACTIVITY) {
    const trader = getTrader(a.traderId);
    if (!trader) continue;
    const desk = trader.deskId;
    if (!notional[desk]) {
      notional[desk] = Object.fromEntries(
        ASSET_CLASSES.map((x) => [x.code, 0])
      ) as Record<AssetClassCode, number>;
      pnl[desk] = Object.fromEntries(
        ASSET_CLASSES.map((x) => [x.code, 0])
      ) as Record<AssetClassCode, number>;
    }
    notional[desk][a.assetClass] += a.notional;
    pnl[desk][a.assetClass] += a.pnl;
  }
  return { notional, pnl };
}
