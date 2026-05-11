import Link from "next/link";
import { AnomalyList } from "@/components/AnomalyList";
import { DeskAssetHeatmap } from "@/components/Heatmap";
import { DeskHealthCard } from "@/components/DeskHealthCard";
import { FocusToggle, type Focus } from "@/components/FocusToggle";
import { StatCard } from "@/components/StatCard";
import { StoryHero } from "@/components/StoryHero";
import { SystemCard } from "@/components/SystemCard";
import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";
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
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  SYSTEMS,
  systemsByCategory,
  type SystemCategory,
} from "@/lib/systems";
import { buildSystemHealth, detectSystemIncidents } from "@/lib/systemHealth";

interface PageProps {
  searchParams: { focus?: string };
}

export default function OverviewPage({ searchParams }: PageProps) {
  const focus: Focus =
    searchParams.focus === "systems" ? "systems" : "traders";
  const traderAnomalies = detectAll();
  const systemIncidents = SYSTEMS.flatMap((s) =>
    detectSystemIncidents(s.id)
  );

  return (
    <div className="p-6 space-y-6">
      <StoryHero />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-xs text-ink-dim font-mono">
            {SYNTH_TODAY} · 90-day window · {RECENT_DAYS}-day surveillance
          </p>
        </div>
        <FocusToggle
          active={focus}
          traderCount={traderAnomalies.length}
          systemCount={systemIncidents.length}
        />
      </div>

      {focus === "traders" ? (
        <TradersFocus />
      ) : (
        <SystemsFocus />
      )}
    </div>
  );
}

// ── Traders focus ────────────────────────────────────────────────────────

function TradersFocus() {
  const anomalies = detectAll();
  const recentDates = new Set(dateRange(SYNTH_TODAY, RECENT_DAYS));
  const recentAct = ACTIVITY.filter((a) => recentDates.has(a.date));
  const totalNotional = ACTIVITY.reduce((s, a) => s + a.notional, 0);
  const totalPnl = ACTIVITY.reduce((s, a) => s + a.pnl, 0);
  const recentPnl = recentAct.reduce((s, a) => s + a.pnl, 0);

  const byRegion: Record<string, number> = {};
  for (const a of ACTIVITY) {
    const t = TRADERS.find((x) => x.id === a.traderId);
    if (!t) continue;
    byRegion[t.region] = (byRegion[t.region] ?? 0) + a.notional;
  }

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
    <>
      <div className="flex flex-wrap gap-2 text-xs">
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

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Desks Health
          </h2>
          <span className="text-[11px] font-mono text-ink-dim">
            rollup of trader health per desk · click to drill in
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {DESKS.map((d) => (
            <DeskHealthCard key={d.id} desk={d} />
          ))}
        </div>
      </section>

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
        title="Top Trader Anomalies (last 7d)"
      />
    </>
  );
}

// ── Systems focus ────────────────────────────────────────────────────────

function SystemsFocus() {
  const incidents = SYSTEMS.flatMap((s) => detectSystemIncidents(s.id));
  const sevOrder = ["low", "medium", "high", "critical"] as const;
  incidents.sort((a, b) => {
    const s = sevOrder.indexOf(b.severity) - sevOrder.indexOf(a.severity);
    if (s !== 0) return s;
    return a.date < b.date ? 1 : -1;
  });
  const grouped = systemsByCategory();

  const allHealth = SYSTEMS.map((s) => ({
    system: s,
    health: buildSystemHealth(s.id)!,
  }));
  const healthy = allHealth.filter(
    (x) => x.health.zone === "great" || x.health.zone === "good"
  ).length;
  const watch = allHealth.filter((x) => x.health.zone === "watch").length;
  const stressed = allHealth.filter(
    (x) => x.health.zone === "stressed" || x.health.zone === "critical"
  ).length;

  const avgUptime =
    allHealth.reduce((s, x) => {
      const v = x.health.vitals.find((v) => v.label === "Uptime");
      const pct = v ? parseFloat(v.value) / 100 : 1;
      return s + pct;
    }, 0) / Math.max(1, allHealth.length);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Systems tracked" value={fmtNum(SYSTEMS.length)} />
        <StatCard
          label="Healthy"
          value={fmtNum(healthy)}
          tone="up"
          sub={`${watch} watch · ${stressed} stressed/critical`}
        />
        <StatCard
          label="Open incidents"
          value={fmtNum(incidents.length)}
          tone={incidents.length > 0 ? "warn" : "neutral"}
          sub={`${incidents.filter((i) => i.severity === "critical" || i.severity === "high").length} high+`}
        />
        <StatCard
          label="Avg uptime"
          value={`${(avgUptime * 100).toFixed(2)}%`}
          tone={avgUptime >= 0.999 ? "up" : "warn"}
        />
      </div>

      <SystemFlowDiagram />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Systems by Category
          </h2>
          <Link
            href="/systems"
            className="text-xs text-ink-muted hover:text-ink"
          >
            Full grid →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(Object.keys(CATEGORY_LABEL) as SystemCategory[]).flatMap((cat) =>
            grouped[cat].slice(0, 2).map((s) => (
              <SystemCard key={s.id} system={s} />
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">Top System Incidents (last 7d)</div>
          <div className="text-[11px] text-ink-dim font-mono">
            {incidents.length} total
          </div>
        </div>
        {incidents.length === 0 ? (
          <div className="p-6 text-center text-ink-dim text-sm">
            All systems quiet.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {incidents.slice(0, 20).map((i) => {
              const s = SYSTEMS.find((x) => x.id === i.systemId)!;
              const sevColor =
                i.severity === "critical"
                  ? "#ec4899"
                  : i.severity === "high"
                  ? "#ef4444"
                  : i.severity === "medium"
                  ? "#fb923c"
                  : "#facc15";
              return (
                <li key={i.id} className="px-4 py-3 hover:bg-bg-hover">
                  <Link href={`/system/${s.id}`} className="block">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[11px] text-ink-dim w-14">
                        {i.date.slice(5)}
                      </span>
                      <span
                        className="chip border"
                        style={{
                          borderColor: `${sevColor}80`,
                          color: sevColor,
                          background: `${sevColor}14`,
                        }}
                      >
                        {i.severity}
                      </span>
                      <span
                        className="chip border"
                        style={{
                          borderColor: `${CATEGORY_COLOR[s.category]}60`,
                          color: CATEGORY_COLOR[s.category],
                          background: `${CATEGORY_COLOR[s.category]}14`,
                        }}
                      >
                        {s.category}
                      </span>
                      <span className="chip border border-line text-ink-muted">
                        {i.kind.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-ink">{s.name}</span>
                    </div>
                    <div className="mt-1 text-sm text-ink-muted">
                      {i.message}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
