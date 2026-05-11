import { ACTIVITY, RECENT_DAYS, SYNTH_TODAY, dateRange } from "@/lib/data";
import { fmtDate, fmtNum, fmtPct, fmtPnl, fmtUsd } from "@/lib/format";

interface Props {
  traderId: string;
}

const RECENT = new Set(dateRange(SYNTH_TODAY, RECENT_DAYS));

export function OrderFlowPanel({ traderId }: Props) {
  const all = ACTIVITY.filter((a) => a.traderId === traderId);
  const recent = all.filter((a) => RECENT.has(a.date));

  const trades = all.reduce((s, a) => s + a.trades, 0);
  const clientTrades = all.reduce((s, a) => s + a.clientTrades, 0);
  const houseTrades = trades - clientTrades;
  const cancels = all.reduce((s, a) => s + a.cancelledTrades, 0);

  const notional = all.reduce((s, a) => s + a.notional, 0);
  const pnl = all.reduce((s, a) => s + a.pnl, 0);
  const clientNotional = all.reduce(
    (s, a) => s + a.notional * (a.trades > 0 ? a.clientTrades / a.trades : 0),
    0
  );
  const houseNotional = notional - clientNotional;

  const blockTrades = all
    .filter((a) => a.orderType === "BLOCK")
    .reduce((s, a) => s + a.trades, 0);

  // Recent (7d) figures.
  const trades7 = recent.reduce((s, a) => s + a.trades, 0);
  const clientTrades7 = recent.reduce((s, a) => s + a.clientTrades, 0);
  const houseTrades7 = trades7 - clientTrades7;
  const cancels7 = recent.reduce((s, a) => s + a.cancelledTrades, 0);

  // Largest trading day (by notional).
  const byDate = new Map<string, number>();
  for (const a of all) byDate.set(a.date, (byDate.get(a.date) ?? 0) + a.notional);
  let largestDate = "";
  let largestVal = 0;
  for (const [d, v] of byDate) {
    if (v > largestVal) {
      largestVal = v;
      largestDate = d;
    }
  }

  // Distinct venues last 7d.
  const venues7 = new Set(recent.map((a) => a.venue));
  const venuesAll = new Set(all.map((a) => a.venue));

  // Avg trade size.
  const avgTradeSize = trades > 0 ? notional / trades : 0;

  // Client share for the stacked bar.
  const clientShare = trades > 0 ? clientTrades / trades : 0;
  const clientNotionalShare =
    notional > 0 ? clientNotional / notional : 0;

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title">Order Flow</div>
        <div className="text-[11px] text-ink-dim font-mono">
          90d totals · last-7d in subtitles
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stat tiles — 2 rows of 4 on desktop, 4x2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile
            label="Notional 90d"
            value={fmtUsd(notional)}
            sub={`${fmtNum(trades)} trades · ${fmtUsd(avgTradeSize)} avg`}
          />
          <Tile
            label="PnL 90d"
            value={fmtPnl(pnl)}
            sub="across the book"
            accent={pnl >= 0 ? "#22c55e" : "#ef4444"}
          />
          <Tile
            label="Cancellations"
            value={fmtNum(cancels)}
            sub={`${fmtPct(trades > 0 ? cancels / trades : 0, 1)} rate · ${fmtNum(cancels7)} 7d`}
            accent={
              trades > 0 && cancels / trades > 0.2 ? "#ef4444" : undefined
            }
          />
          <Tile
            label="Block trades"
            value={fmtNum(blockTrades)}
            sub={`${fmtPct(trades > 0 ? blockTrades / trades : 0, 1)} of count`}
          />

          <Tile
            label="Client orders"
            value={fmtNum(clientTrades)}
            sub={`${fmtPct(clientShare, 0)} of total · ${fmtNum(clientTrades7)} 7d`}
            accent="#3b82f6"
          />
          <Tile
            label="House orders"
            value={fmtNum(houseTrades)}
            sub={`${fmtPct(1 - clientShare, 0)} of total · ${fmtNum(houseTrades7)} 7d`}
            accent="#a855f7"
          />
          <Tile
            label="Client notional"
            value={fmtUsd(clientNotional)}
            sub={`${fmtPct(clientNotionalShare, 0)} of book`}
            accent="#3b82f6"
          />
          <Tile
            label="House notional"
            value={fmtUsd(houseNotional)}
            sub={`${fmtPct(1 - clientNotionalShare, 0)} of book`}
            accent="#a855f7"
          />
        </div>

        {/* Thin context strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-mono text-ink-dim">
          <span>
            largest day:{" "}
            <span className="text-ink-muted">
              {fmtUsd(largestVal)} on {largestDate ? fmtDate(largestDate) : "—"}
            </span>
          </span>
          <span>
            venues touched:{" "}
            <span className="text-ink-muted">
              {venuesAll.size} 90d · {venues7.size} 7d
            </span>
          </span>
        </div>

        {/* Client / house stacked bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-muted font-mono">
            <span>Client vs House — by notional (90d)</span>
            <span className="text-ink-dim">
              {fmtUsd(clientNotional)} client · {fmtUsd(houseNotional)} house
            </span>
          </div>
          <div className="h-3 rounded overflow-hidden bg-bg-subtle flex">
            <div
              className="h-full"
              style={{
                width: `${clientNotionalShare * 100}%`,
                background: "#3b82f6",
              }}
              title={`Client ${fmtPct(clientNotionalShare, 1)}`}
            />
            <div
              className="h-full"
              style={{
                width: `${(1 - clientNotionalShare) * 100}%`,
                background: "#a855f7",
              }}
              title={`House ${fmtPct(1 - clientNotionalShare, 1)}`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-ink-dim">
            <span>Client {fmtPct(clientNotionalShare, 0)}</span>
            <span>House {fmtPct(1 - clientNotionalShare, 0)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      className="p-3 rounded border border-line bg-bg-subtle/40"
      style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink-dim">
        {label}
      </div>
      <div className="text-lg font-mono tabular-nums mt-1 text-ink">
        {value}
      </div>
      <div className="text-[10px] font-mono text-ink-dim mt-0.5 truncate">
        {sub}
      </div>
    </div>
  );
}
