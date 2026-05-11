import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthBand } from "@/components/HealthBand";
import {
  CATEGORY_LABEL,
  SYSTEMS,
  getSystem,
} from "@/lib/systems";
import { buildSystemHealth } from "@/lib/systemHealth";
import { ZONE_COLOR, ZONE_LABEL } from "@/lib/health";

export function generateStaticParams() {
  return SYSTEMS.map((s) => ({ id: s.id }));
}

export default function SystemHealthWallPage({
  params,
}: {
  params: { id: string };
}) {
  const system = getSystem(params.id);
  if (!system) notFound();
  const health = buildSystemHealth(system.id)!;
  const color = ZONE_COLOR[health.zone];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-line">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
            DOTS · System Wall Display
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="text-2xl font-semibold">{system.name}</h1>
            <span className="text-sm font-mono text-ink-muted">{system.id}</span>
            <span className="text-sm text-ink-muted">·</span>
            <span className="text-sm text-ink-muted">{system.vendor}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink-dim">
              {CATEGORY_LABEL[system.category]} · {system.region}
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
            href={`/system/${system.id}`}
            className="text-xs px-3 py-1.5 rounded border border-line hover:border-ink-muted text-ink-muted hover:text-ink"
          >
            ← Back to detail
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-6">
        <HealthBand
          health={health}
          name={system.name}
          bare
          summaryFn={(h) =>
            h.anomalies.length === 0
              ? "All clear — system within baseline thresholds."
              : `${h.anomalies.length} incident${h.anomalies.length === 1 ? "" : "s"} this week — review the spikes on the trace.`
          }
        />
      </main>

      <footer className="px-8 py-3 border-t border-line text-[10px] text-ink-dim font-mono flex items-center justify-between">
        <span>
          synthetic data · health baseline excludes most recent 7 days
        </span>
        <span>
          {health.anomalies.length} incidents · {health.daysSinceAnomaly === Infinity ? "—" : `${health.daysSinceAnomaly}d`} since last incident
        </span>
      </footer>
    </div>
  );
}
