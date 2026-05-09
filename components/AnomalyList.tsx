import Link from "next/link";
import { getDesk, getTrader } from "@/lib/data";
import { fmtDate, fmtZ } from "@/lib/format";
import type { Anomaly } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";

interface Props {
  anomalies: Anomaly[];
  title?: string;
  empty?: string;
  showTrader?: boolean;
}

export function AnomalyList({
  anomalies,
  title = "Anomalies",
  empty = "No anomalies detected.",
  showTrader = true,
}: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">{title}</div>
        <div className="text-[11px] text-ink-dim font-mono">
          {anomalies.length} detected
        </div>
      </div>
      {anomalies.length === 0 ? (
        <div className="p-6 text-center text-ink-dim text-sm">{empty}</div>
      ) : (
        <ul className="divide-y divide-line">
          {anomalies.map((a) => {
            const trader = getTrader(a.traderId);
            const desk = getDesk(a.deskId);
            return (
              <li key={a.id} className="px-4 py-3 hover:bg-bg-hover">
                <Link href={`/trader/${a.traderId}`} className="block">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-[11px] text-ink-dim w-14 shrink-0">
                      {fmtDate(a.date)}
                    </span>
                    <SeverityBadge severity={a.severity} />
                    <span className="chip border border-line text-ink-muted">
                      {a.kind.replace(/_/g, " ")}
                    </span>
                    {showTrader && trader ? (
                      <span className="text-sm text-ink">{trader.name}</span>
                    ) : null}
                    {desk ? (
                      <span className="text-[11px] text-ink-dim font-mono">
                        {desk.id}
                      </span>
                    ) : null}
                    {typeof a.zScore === "number" ? (
                      <span className="text-[11px] font-mono text-ink-muted ml-auto">
                        {fmtZ(a.zScore)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-ink-muted">{a.message}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
