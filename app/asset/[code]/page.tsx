import Link from "next/link";
import { notFound } from "next/navigation";
import { AnomalyList } from "@/components/AnomalyList";
import { StatCard } from "@/components/StatCard";
import { TimeSeries } from "@/components/TimeSeries";
import { detectAll } from "@/lib/anomaly";
import {
  ACTIVITY,
  ASSET_CLASSES,
  DESKS,
  TRADERS,
  VENUES,
  activityForAsset,
  getAssetClass,
} from "@/lib/data";
import { fmtNum, fmtPnl, fmtUsd } from "@/lib/format";
import type { AssetClassCode } from "@/lib/types";

export function generateStaticParams() {
  return ASSET_CLASSES.map((a) => ({ code: a.code }));
}

export default function AssetPage({ params }: { params: { code: string } }) {
  const asset = getAssetClass(params.code.toUpperCase());
  if (!asset) notFound();
  const code = asset.code as AssetClassCode;
  const rows = activityForAsset(code);
  const totalNotional = rows.reduce((s, r) => s + r.notional, 0);
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);
  const trades = rows.reduce((s, r) => s + r.trades, 0);

  const desks = DESKS.filter((d) => d.assetClasses.includes(code));
  const traders = TRADERS.filter((t) =>
    desks.some((d) => d.id === t.deskId)
  );
  const venues = VENUES.filter((v) => v.assetClasses.includes(code));

  // Daily notional series.
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.notional);
  const series = Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Top traders for this asset class.
  const traderNotional = new Map<string, number>();
  for (const r of rows) {
    traderNotional.set(
      r.traderId,
      (traderNotional.get(r.traderId) ?? 0) + r.notional
    );
  }
  const top = Array.from(traderNotional.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, n]) => ({ trader: TRADERS.find((t) => t.id === id)!, n }));

  // Venue mix.
  const venueNotional = new Map<string, number>();
  for (const r of rows) {
    venueNotional.set(
      r.venue,
      (venueNotional.get(r.venue) ?? 0) + r.notional
    );
  }
  const venueRows = Array.from(venueNotional.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => ({ venue: VENUES.find((v) => v.code === code), n }));
  const venueMax = Math.max(1, ...Array.from(venueNotional.values()));

  // Asset-relevant anomalies.
  const allAnoms = detectAll();
  const traderIds = new Set(traders.map((t) => t.id));
  const assetAnoms = allAnoms.filter((a) => traderIds.has(a.traderId));

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-3">
        <span
          className="w-3 h-3 rounded-sm"
          style={{ background: asset.color }}
        />
        <h1 className="text-xl font-semibold">{asset.name}</h1>
        <span className="text-xs font-mono text-ink-dim">{asset.code}</span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Notional 90d" value={fmtUsd(totalNotional)} />
        <StatCard
          label="PnL 90d"
          value={fmtPnl(totalPnl)}
          tone={totalPnl >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Trades"
          value={fmtNum(trades)}
          sub={`${traders.length} traders · ${desks.length} desks`}
        />
        <StatCard
          label="Anomalies"
          value={fmtNum(assetAnoms.length)}
          tone={assetAnoms.length > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Daily Notional · 90d</div>
        </div>
        <div className="p-4">
          <TimeSeries points={series} color={asset.color} height={220} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Top Traders</div>
          </div>
          <ul className="divide-y divide-line">
            {top.map(({ trader, n }) => (
              <li key={trader.id} className="px-4 py-2 hover:bg-bg-hover">
                <Link
                  href={`/trader/${trader.id}`}
                  className="flex justify-between text-sm"
                >
                  <span>
                    <span className="text-ink">{trader.name}</span>
                    <span className="text-[11px] font-mono text-ink-dim ml-2">
                      {trader.deskId}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-ink-muted">
                    {fmtUsd(n)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Venues</div>
            <div className="text-[11px] text-ink-dim font-mono">
              {venues.length} eligible
            </div>
          </div>
          <ul className="p-4 space-y-2">
            {venueRows.map(({ venue, n }) =>
              venue ? (
                <li key={venue.code}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-ink-muted">
                      {venue.code}{" "}
                      <span className="text-ink-dim">— {venue.name}</span>
                    </span>
                    <span className="tabular-nums">{fmtUsd(n)}</span>
                  </div>
                  <div className="h-1.5 bg-bg-subtle rounded">
                    <div
                      className="h-1.5 rounded"
                      style={{
                        width: `${(n / venueMax) * 100}%`,
                        background: asset.color,
                      }}
                    />
                  </div>
                </li>
              ) : null
            )}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Desks Trading {asset.code}</div>
        </div>
        <ul className="divide-y divide-line">
          {desks.map((d) => {
            const deskNotional = ACTIVITY.filter(
              (a) =>
                a.assetClass === code &&
                TRADERS.some(
                  (t) => t.deskId === d.id && t.id === a.traderId
                )
            ).reduce((s, x) => s + x.notional, 0);
            return (
              <li key={d.id} className="px-4 py-2 hover:bg-bg-hover">
                <Link
                  href={`/desk/${d.id}`}
                  className="flex justify-between text-sm"
                >
                  <span>
                    <span className="font-mono text-[11px] text-ink-dim mr-2">
                      {d.region}
                    </span>
                    <span className="text-ink">{d.name}</span>
                    <span className="font-mono text-[11px] text-ink-dim ml-2">
                      {d.id}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-ink-muted">
                    {fmtUsd(deskNotional)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <AnomalyList
        anomalies={assetAnoms}
        title={`Anomalies — ${asset.code}`}
        empty="No anomalies for this asset class."
      />
    </div>
  );
}
