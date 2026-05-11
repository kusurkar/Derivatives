import Link from "next/link";
import { notFound } from "next/navigation";
import { AnomalyList } from "@/components/AnomalyList";
import { HealthBand } from "@/components/HealthBand";
import { StatCard } from "@/components/StatCard";
import { TimeSeries } from "@/components/TimeSeries";
import { detectAll } from "@/lib/anomaly";
import {
  ASSET_CLASSES,
  DESKS,
  activityForDesk,
  getAssetClass,
  getDesk,
  tradersForDesk,
} from "@/lib/data";
import { buildDeskHealth } from "@/lib/deskHealth";
import { fmtNum, fmtPnl, fmtUsd } from "@/lib/format";
import type { AssetClassCode } from "@/lib/types";

export function generateStaticParams() {
  return DESKS.map((d) => ({ id: d.id }));
}

export default function DeskPage({ params }: { params: { id: string } }) {
  const desk = getDesk(params.id);
  if (!desk) notFound();
  const traders = tradersForDesk(desk.id);
  const rows = activityForDesk(desk.id);
  const totalNotional = rows.reduce((s, r) => s + r.notional, 0);
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);

  // Per-trader rollup.
  const perTrader = new Map<string, { notional: number; pnl: number; trades: number }>();
  for (const r of rows) {
    const cur = perTrader.get(r.traderId) ?? { notional: 0, pnl: 0, trades: 0 };
    cur.notional += r.notional;
    cur.pnl += r.pnl;
    cur.trades += r.trades;
    perTrader.set(r.traderId, cur);
  }

  // Daily notional series (desk total).
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.notional);
  const series = Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Asset mix.
  const byAsset: Record<string, number> = {};
  for (const r of rows) {
    byAsset[r.assetClass] = (byAsset[r.assetClass] ?? 0) + r.notional;
  }
  const assetMax = Math.max(1, ...Object.values(byAsset));

  const traderIds = new Set(traders.map((t) => t.id));
  const anoms = detectAll().filter((a) => traderIds.has(a.traderId));
  const deskHealth = buildDeskHealth(desk.id);

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
          {desk.region} · Desk
        </div>
        <h1 className="text-xl font-semibold">{desk.name}</h1>
        <div className="text-xs font-mono text-ink-dim mt-1">
          {desk.id} ·{" "}
          {desk.assetClasses.map((a, i) => (
            <span key={a}>
              {i > 0 ? ", " : ""}
              <Link
                href={`/asset/${a}`}
                style={{ color: getAssetClass(a)?.color }}
                className="hover:underline"
              >
                {a}
              </Link>
            </span>
          ))}
        </div>
      </header>

      {deskHealth ? (
        <HealthBand
          health={deskHealth}
          name={desk.name}
          title="Desk Health · rollup of trader health"
          summaryFn={(h) => {
            const cnts = (deskHealth.zoneCounts ?? {}) as Record<string, number>;
            const stressed = (cnts.stressed ?? 0) + (cnts.critical ?? 0);
            const healthy = (cnts.great ?? 0) + (cnts.good ?? 0);
            if (h.anomalies.length === 0) {
              return `Desk in rhythm — ${healthy}/${deskHealth.traderCount} traders healthy.`;
            }
            return stressed > 0
              ? `${stressed} trader${stressed === 1 ? "" : "s"} stressed · ${h.anomalies.length} anomalies this week`
              : `${h.anomalies.length} anomalies this week across the desk`;
          }}
        />
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Notional 90d" value={fmtUsd(totalNotional)} />
        <StatCard
          label="PnL 90d"
          value={fmtPnl(totalPnl)}
          tone={totalPnl >= 0 ? "up" : "down"}
        />
        <StatCard label="Traders" value={fmtNum(traders.length)} />
        <StatCard
          label="Anomalies"
          value={fmtNum(anoms.length)}
          tone={anoms.length > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel lg:col-span-2">
          <div className="panel-header">
            <div className="panel-title">Daily Notional · 90d</div>
          </div>
          <div className="p-4">
            <TimeSeries points={series} color="#06b6d4" height={220} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Asset Mix</div>
          </div>
          <ul className="p-4 space-y-2">
            {ASSET_CLASSES.filter((a) =>
              desk.assetClasses.includes(a.code)
            ).map((a) => {
              const v = byAsset[a.code] ?? 0;
              return (
                <li key={a.code}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span style={{ color: a.color }}>{a.code}</span>
                    <span className="tabular-nums">{fmtUsd(v)}</span>
                  </div>
                  <div className="h-2 bg-bg-subtle rounded">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(v / assetMax) * 100}%`,
                        background: a.color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Traders on Desk</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-ink-dim border-b border-line">
              <th className="px-4 py-2">Trader</th>
              <th className="px-4 py-2">Seniority</th>
              <th className="px-4 py-2 text-right">Trades</th>
              <th className="px-4 py-2 text-right">Notional</th>
              <th className="px-4 py-2 text-right">PnL</th>
              <th className="px-4 py-2 text-right">Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {traders.map((t) => {
              const stats = perTrader.get(t.id) ?? { notional: 0, pnl: 0, trades: 0 };
              const tAnoms = anoms.filter((a) => a.traderId === t.id);
              return (
                <tr
                  key={t.id}
                  className="border-b border-line hover:bg-bg-hover"
                >
                  <td className="px-4 py-2">
                    <Link href={`/trader/${t.id}`} className="block">
                      <div className="text-ink">{t.name}</div>
                      <div className="text-[11px] font-mono text-ink-dim">
                        {t.id}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-muted">{t.seniority}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {fmtNum(stats.trades)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {fmtUsd(stats.notional)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono tabular-nums ${
                      stats.pnl >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {fmtPnl(stats.pnl)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {tAnoms.length > 0 ? (
                      <span className="text-sev-high">{tAnoms.length}</span>
                    ) : (
                      <span className="text-ink-dim">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnomalyList
        anomalies={anoms}
        title={`Anomalies — ${desk.id}`}
        empty="No anomalies on this desk."
      />
    </div>
  );
}
