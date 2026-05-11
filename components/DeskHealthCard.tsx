import Link from "next/link";
import { HealthRing } from "./HealthRing";
import { ZONE_COLOR, ZONE_LABEL, type HealthZone } from "@/lib/health";
import type { Desk } from "@/lib/types";
import { buildDeskHealth } from "@/lib/deskHealth";

const ZONES_IN_ORDER: HealthZone[] = [
  "great",
  "good",
  "watch",
  "stressed",
  "critical",
];

export function DeskHealthCard({ desk }: { desk: Desk }) {
  const health = buildDeskHealth(desk.id);
  if (!health) return null;
  const zoneColor = ZONE_COLOR[health.zone];

  return (
    <Link
      href={`/desk/${desk.id}`}
      className="panel p-4 flex items-center gap-4 hover:border-ink-muted transition-colors"
    >
      <HealthRing
        score={health.score}
        zone={health.zone}
        size={88}
        thickness={8}
        caption=""
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-ink-dim">
            {desk.region}
          </span>
          <span
            className="ml-auto text-[10px] font-mono uppercase tracking-widest"
            style={{ color: zoneColor }}
          >
            {ZONE_LABEL[health.zone]}
          </span>
        </div>
        <div className="font-semibold text-sm text-ink truncate">
          {desk.name}
        </div>
        <div className="text-[11px] font-mono text-ink-dim truncate">
          {desk.id} · {desk.assetClasses.join(", ")}
        </div>

        {/* Trader-zone breakdown bar */}
        <div className="h-1.5 rounded overflow-hidden bg-bg-subtle flex mt-2">
          {ZONES_IN_ORDER.map((z) => {
            const n = health.zoneCounts[z];
            if (n === 0) return null;
            const width = (n / health.traderCount) * 100;
            return (
              <div
                key={z}
                style={{ width: `${width}%`, background: ZONE_COLOR[z] }}
                title={`${n} ${z}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-ink-dim mt-1">
          <span>
            {health.traderCount} traders ·{" "}
            <span className="text-ink-muted">
              {health.anomalies.length} anomalies
            </span>
          </span>
          {health.worstTrader ? (
            <span title="lowest score on desk">
              ↘ {health.worstTrader.name.split(" ")[0]}{" "}
              <span
                style={{
                  color:
                    ZONE_COLOR[
                      health.worstTrader.score >= 70
                        ? "good"
                        : health.worstTrader.score >= 55
                        ? "watch"
                        : health.worstTrader.score >= 40
                        ? "stressed"
                        : "critical"
                    ],
                }}
              >
                {health.worstTrader.score}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
