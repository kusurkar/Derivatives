import Link from "next/link";
import { notFound } from "next/navigation";
import { AnomalyList } from "@/components/AnomalyList";
import { HealthBand } from "@/components/HealthBand";
import { StatCard } from "@/components/StatCard";
import { TimeSeries } from "@/components/TimeSeries";
import {
  TraderFingerprint,
  type FingerprintAxis,
} from "@/components/TraderFingerprint";
import {
  buildProfile,
  detectForTrader,
  rollupTrader,
} from "@/lib/anomaly";
import {
  ASSET_CLASSES,
  TRADERS,
  activityForTrader,
  getDesk,
  getTrader,
} from "@/lib/data";
import { fmtNum, fmtPnl, fmtUsd, fmtZ } from "@/lib/format";
import { buildHealth } from "@/lib/health";

export function generateStaticParams() {
  return TRADERS.map((t) => ({ id: t.id }));
}

function meanOf(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export default function TraderPage({ params }: { params: { id: string } }) {
  const trader = getTrader(params.id);
  if (!trader) notFound();
  const desk = getDesk(trader.deskId)!;
  const health = buildHealth(trader.id)!;
  const profile = buildProfile(trader.id);
  const rollup = rollupTrader(trader.id);
  const anoms = detectForTrader(trader.id);
  const rows = activityForTrader(trader.id);

  const totalNotional = rows.reduce((s, r) => s + r.notional, 0);
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);
  const totalTrades = rows.reduce((s, r) => s + r.trades, 0);

  const notionalSeries = rollup.totals.map((t) => ({
    date: t.date,
    value: t.notional,
  }));
  const pnlSeries = rollup.totals.map((t) => ({
    date: t.date,
    value: t.pnl,
  }));

  // Build fingerprint: normalize each axis by max(baseline, recent).
  const recent = {
    trades: meanOf(rollup.recent.map((r) => r.trades)),
    notional: meanOf(rollup.recent.map((r) => r.notional)),
    pnl: meanOf(rollup.recent.map((r) => r.pnl)),
    avgHourUtc: meanOf(rollup.recent.map((r) => r.avgHourUtc)),
    distinctVenues: meanOf(rollup.recent.map((r) => r.distinctVenues)),
  };

  const fp: FingerprintAxis[] = [
    axis("Trades", profile.metrics.trades.mean, recent.trades),
    axis("Notional", profile.metrics.notional.mean, recent.notional),
    axis("Venues", profile.metrics.distinctVenues.mean, recent.distinctVenues),
    axis(
      "Hour-of-day",
      profile.metrics.avgHourUtc.mean,
      recent.avgHourUtc,
      24
    ),
    axis(
      "PnL",
      Math.max(0, profile.metrics.pnl.mean),
      Math.max(0, recent.pnl)
    ),
  ];

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
          <Link href={`/desk/${desk.id}`} className="hover:text-ink">
            {desk.region} · {desk.name}
          </Link>
        </div>
        <h1 className="text-xl font-semibold">{trader.name}</h1>
        <div className="text-xs font-mono text-ink-dim mt-1">
          {trader.id} · {trader.seniority} · started {trader.startedAt}
        </div>
      </header>

      <HealthBand health={health} traderName={trader.name} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Notional 90d" value={fmtUsd(totalNotional)} />
        <StatCard
          label="PnL 90d"
          value={fmtPnl(totalPnl)}
          tone={totalPnl >= 0 ? "up" : "down"}
        />
        <StatCard label="Trades 90d" value={fmtNum(totalTrades)} />
        <StatCard
          label="Open Anomalies"
          value={fmtNum(anoms.length)}
          tone={anoms.length > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Synthetic Profile vs Last 7d</div>
            <div className="text-[11px] text-ink-dim font-mono">
              cyan = baseline · pink = recent
            </div>
          </div>
          <div className="p-4">
            <TraderFingerprint data={fp} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Profile Metrics</div>
            <div className="text-[11px] text-ink-dim font-mono">
              {profile.windowDays} baseline days
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-ink-dim border-b border-line">
                <th className="px-4 py-2">Metric</th>
                <th className="px-4 py-2 text-right">Baseline µ</th>
                <th className="px-4 py-2 text-right">σ</th>
                <th className="px-4 py-2 text-right">Recent µ</th>
                <th className="px-4 py-2 text-right">z</th>
              </tr>
            </thead>
            <tbody>
              <Row
                label="Trades / day"
                base={profile.metrics.trades}
                recent={recent.trades}
                fmt={(v) => fmtNum(v, 1)}
              />
              <Row
                label="Notional / day"
                base={profile.metrics.notional}
                recent={recent.notional}
                fmt={fmtUsd}
              />
              <Row
                label="PnL / day"
                base={profile.metrics.pnl}
                recent={recent.pnl}
                fmt={fmtPnl}
              />
              <Row
                label="Avg hour UTC"
                base={profile.metrics.avgHourUtc}
                recent={recent.avgHourUtc}
                fmt={(v) => v.toFixed(1) + "h"}
              />
              <Row
                label="Distinct venues"
                base={profile.metrics.distinctVenues}
                recent={recent.distinctVenues}
                fmt={(v) => fmtNum(v, 1)}
              />
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Daily Notional · with ±2.5σ band</div>
        </div>
        <div className="p-4">
          <TimeSeries
            points={notionalSeries}
            color="#06b6d4"
            baselineMean={profile.metrics.notional.mean}
            baselineStd={profile.metrics.notional.std}
            height={220}
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Daily PnL · with ±2.5σ band</div>
        </div>
        <div className="p-4">
          <TimeSeries
            points={pnlSeries}
            color="#a855f7"
            baselineMean={profile.metrics.pnl.mean}
            baselineStd={profile.metrics.pnl.std}
            height={200}
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Asset Mix · Baseline</div>
        </div>
        <ul className="p-4 space-y-2">
          {ASSET_CLASSES.filter((a) => profile.assetMix[a.code] > 0.001).map(
            (a) => (
              <li key={a.code}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span style={{ color: a.color }}>{a.code}</span>
                  <span className="tabular-nums">
                    {(profile.assetMix[a.code] * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-bg-subtle rounded">
                  <div
                    className="h-1.5 rounded"
                    style={{
                      width: `${profile.assetMix[a.code] * 100}%`,
                      background: a.color,
                    }}
                  />
                </div>
              </li>
            )
          )}
        </ul>
      </div>

      <AnomalyList
        anomalies={anoms}
        title="Anomalies — last 7d"
        empty="No anomalies — trader is within profile bounds."
        showTrader={false}
      />
    </div>
  );
}

function axis(
  name: string,
  base: number,
  recent: number,
  fixedMax?: number
): FingerprintAxis {
  const max = fixedMax ?? Math.max(1e-6, base, recent);
  return {
    axis: name,
    baseline: Math.min(1, Math.max(0, base / max)),
    recent: Math.min(1, Math.max(0, recent / max)),
  };
}

function Row({
  label,
  base,
  recent,
  fmt,
}: {
  label: string;
  base: { mean: number; std: number };
  recent: number;
  fmt: (v: number) => string;
}) {
  const z = base.std > 0 ? (recent - base.mean) / base.std : 0;
  const isOut = Math.abs(z) >= 2.5;
  return (
    <tr className="border-b border-line">
      <td className="px-4 py-2 text-ink-muted">{label}</td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {fmt(base.mean)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-ink-dim">
        {fmt(base.std)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums">
        {fmt(recent)}
      </td>
      <td
        className={`px-4 py-2 text-right font-mono tabular-nums ${
          isOut ? "text-sev-high" : "text-ink-muted"
        }`}
      >
        {fmtZ(z)}
      </td>
    </tr>
  );
}
