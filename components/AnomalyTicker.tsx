import Link from "next/link";
import { detectAll } from "@/lib/anomaly";
import { getTrader } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { severityDotColor } from "./SeverityBadge";

export function AnomalyTicker() {
  const anomalies = detectAll().slice(0, 40);
  if (anomalies.length === 0) {
    return (
      <div className="bg-bg-panel border-y border-line py-2 text-center text-ink-muted text-xs">
        No anomalies in the last {7} days.
      </div>
    );
  }
  // Duplicate items so the marquee loops seamlessly when translating -50%.
  const items = [...anomalies, ...anomalies];
  return (
    <div className="bg-bg-panel border-y border-line overflow-hidden relative">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-3 py-2 bg-sev-high/10 border-r border-line">
          <span className="w-2 h-2 rounded-full bg-sev-high animate-pulse_dot" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-sev-high font-semibold">
            Live Anomalies
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {items.map((a, i) => {
              const trader = getTrader(a.traderId);
              return (
                <Link
                  key={`${a.id}-${i}`}
                  href={`/trader/${a.traderId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono hover:bg-bg-hover border-r border-line"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: severityDotColor(a.severity) }}
                  />
                  <span className="text-ink-dim">{fmtDate(a.date)}</span>
                  <span className="text-ink-muted">{a.kind.replace("_", " ")}</span>
                  <span className="text-ink">{trader?.name ?? a.traderId}</span>
                  <span className="text-ink-muted">·</span>
                  <span className="text-ink-dim">{a.message}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
