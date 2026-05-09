import Link from "next/link";
import { AnomalyList } from "@/components/AnomalyList";
import { DeskAssetHeatmap } from "@/components/Heatmap";
import { StatCard } from "@/components/StatCard";
import { detectAll } from "@/lib/anomaly";
import {
  ACTIVITY,
  ASSET_CLASSES,
  DESKS,
  REGIONS,
  TRADERS,
  RECENT_DAYS,
  SYNTH_TODAY,
  dateRange,
} from "@/lib/data";
import { fmtPnl, fmtUsd, fmtNum } from "@/lib/format";

export default function OverviewPage() {
  const anomalies = detectAll();
  const recentDates = new Set(dateRange(SYNTH_TODAY, RECENT_DAYS));
  const recentAct = ACTIVITY.filter((a) => recentDates.has(a.date));
  const totalNotional = ACTIVITY.reduce((s, a) => s + a.notional, 0);
  const totalPnl = ACTIVITY.reduce((s, a) => s + a.pnl, 0);
  const recentPnl = recentAct.reduce((s, a) => s + a.pnl, 0);

  // Notional by region (90d).
  const byRegion: Record<string, number> = {};
  for (const a of ACTIVITY) {
    const t = TRADERS.find((x) => x.id === a.traderId);
    if (!t) continue;
    byRegion[t.region] = (byRegion[t.region] ?? 0) + a.notional;
  }

  // Anomalies per asset class.
  const anomByAsset: Record<string, number> = {};
  for (const a of anomalies) {
    const trader = TRADERS.find((t) => t.id === a.traderId);
    if (!trader) continue;
    const desk = DESKS.find((d) => d.id === trader.deskId);
    if (!desk) continue;
    for (const ac of desk.assetClasses) {
      anomByAsset[ac] = (anomByAsset[ac] ?? 0) + 1;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-xs text-ink-dim font-mono">
            {SYNTH_TODAY} · 90-day window · {RECENT_DAYS}-day surveillance
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          {ASSET_CLASSES.map((a) => (
            <Link
              key={a.code}
              href={`/asset/${a.code}`}
              className="chip border border-line hover:border-ink-muted"
              style={{ color: a.color }}
            >
              {a.code}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Notional 90d"
          value={fmtUsd(totalNotional)}
          sub={`${fmtNum(ACTIVITY.length)} trader-days`}
        />
        <StatCard
          label="PnL 90d"
          value={fmtPnl(totalPnl)}
          tone={totalPnl >= 0 ? "up" : "down"}
          sub={`Last 7d: ${fmtPnl(recentPnl)}`}
        />
        <StatCard
          label="Active Traders"
          value={fmtNum(TRADERS.length)}
          sub={`${DESKS.length} desks · ${REGIONS.length} regions`}
        />
        <StatCard
          label="Open Anomalies"
          value={fmtNum(anomalies.length)}
          tone={anomalies.length > 0 ? "warn" : "neutral"}
          sub={`${anomalies.filter((a) => a.severity === "critical" || a.severity === "high").length} high+`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Notional by Region</div>
          </div>
          <ul className="p-4 space-y-3">
            {REGIONS.map((r) => {
              const v = byRegion[r.code] ?? 0;
              const max = Math.max(1, ...Object.values(byRegion));
              return (
                <li key={r.code}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-ink-muted">{r.code}</span>
                    <span className="tabular-nums">{fmtUsd(v)}</span>
                  </div>
                  <div className="h-2 bg-bg-subtle rounded">
                    <div
                      className="h-2 bg-asset-fx rounded"
                      style={{ width: `${(v / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Anomalies by Asset Class</div>
          </div>
          <ul className="p-4 space-y-3">
            {ASSET_CLASSES.map((a) => {
              const v = anomByAsset[a.code] ?? 0;
              const max = Math.max(1, ...Object.values(anomByAsset));
              return (
                <li key={a.code}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <Link
                      href={`/asset/${a.code}`}
                      className="text-ink-muted hover:text-ink"
                      style={{ color: a.color }}
                    >
                      {a.code}
                    </Link>
                    <span className="tabular-nums">{v}</span>
                  </div>
                  <div className="h-2 bg-bg-subtle rounded">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(v / max) * 100}%`,
                        background: a.color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Severity Breakdown</div>
          </div>
          <ul className="p-4 space-y-3">
            {(["critical", "high", "medium", "low"] as const).map((s) => {
              const v = anomalies.filter((a) => a.severity === s).length;
              const max = Math.max(1, anomalies.length);
              const colors = {
                critical: "#ec4899",
                high: "#ef4444",
                medium: "#fb923c",
                low: "#facc15",
              };
              return (
                <li key={s}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span style={{ color: colors[s] }}>{s.toUpperCase()}</span>
                    <span className="tabular-nums">{v}</span>
                  </div>
                  <div className="h-2 bg-bg-subtle rounded">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(v / max) * 100}%`,
                        background: colors[s],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <DeskAssetHeatmap />

      <AnomalyList
        anomalies={anomalies.slice(0, 25)}
        title="Top Anomalies (last 7d)"
      />
    </div>
  );
}
