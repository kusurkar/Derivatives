import Link from "next/link";
import { HealthRing } from "./HealthRing";
import { ZONE_COLOR, ZONE_LABEL } from "@/lib/health";
import { CATEGORY_COLOR, type TradingSystem } from "@/lib/systems";
import { buildSystemHealth } from "@/lib/systemHealth";

export function SystemCard({ system }: { system: TradingSystem }) {
  const health = buildSystemHealth(system.id);
  if (!health) return null;
  const zoneColor = ZONE_COLOR[health.zone];
  return (
    <Link
      href={`/system/${system.id}`}
      className="panel p-4 flex items-center gap-4 hover:border-ink-muted transition-colors"
    >
      <HealthRing
        score={health.score}
        zone={health.zone}
        size={88}
        thickness={8}
        caption=""
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-1.5 h-1.5 rounded-sm"
            style={{ background: CATEGORY_COLOR[system.category] }}
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-ink-dim">
            {system.category}
          </span>
          <span
            className="ml-auto text-[10px] font-mono uppercase tracking-widest"
            style={{ color: zoneColor }}
          >
            {ZONE_LABEL[health.zone]}
          </span>
        </div>
        <div className="font-semibold text-sm text-ink truncate">
          {system.name}
        </div>
        <div className="text-[11px] font-mono text-ink-dim truncate">
          {system.vendor} · {system.region}
        </div>
        <div className="text-[11px] text-ink-muted mt-1">
          {health.anomalies.length === 0
            ? "no incidents this week"
            : `${health.anomalies.length} incident${
                health.anomalies.length === 1 ? "" : "s"
              } this week`}
        </div>
      </div>
    </Link>
  );
}
