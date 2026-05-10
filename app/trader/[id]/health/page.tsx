import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthBand } from "@/components/HealthBand";
import { TRADERS, getDesk, getTrader } from "@/lib/data";
import { buildHealth, ZONE_COLOR, ZONE_LABEL } from "@/lib/health";

export function generateStaticParams() {
  return TRADERS.map((t) => ({ id: t.id }));
}

/**
 * Fullscreen wall-display variant of the trader health view. No sidebar,
 * no ticker, no chrome — designed for a TV on the control floor.
 */
export default function TraderHealthWallPage({
  params,
}: {
  params: { id: string };
}) {
  const trader = getTrader(params.id);
  if (!trader) notFound();
  const desk = getDesk(trader.deskId)!;
  const health = buildHealth(trader.id)!;
  const color = ZONE_COLOR[health.zone];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-line">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
            DOTS · Trader Wall Display
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="text-2xl font-semibold">{trader.name}</h1>
            <span className="text-sm font-mono text-ink-muted">{trader.id}</span>
            <span className="text-sm text-ink-muted">·</span>
            <span className="text-sm text-ink-muted">{desk.name}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink-dim">
              {desk.region}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ borderColor: `${color}80`, background: `${color}14` }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse_dot"
              style={{ background: color }}
            />
            <span
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color }}
            >
              {ZONE_LABEL[health.zone]}
            </span>
          </div>
          <Link
            href={`/trader/${trader.id}`}
            className="text-xs px-3 py-1.5 rounded border border-line hover:border-ink-muted text-ink-muted hover:text-ink"
          >
            ← Back to detail
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-6">
        <HealthBand
          health={health}
          traderName={trader.name}
          showFullscreenLink={false}
          bare
        />
      </main>

      <footer className="px-8 py-3 border-t border-line text-[10px] text-ink-dim font-mono flex items-center justify-between">
        <span>
          synthetic data · profile baseline excludes most recent 7 days
        </span>
        <span>
          {health.anomalies.length} anomalies · {health.daysSinceAnomaly === Infinity ? "—" : `${health.daysSinceAnomaly}d`} since last event
        </span>
      </footer>
    </div>
  );
}
