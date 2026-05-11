import { StatCard } from "@/components/StatCard";
import { SystemCard } from "@/components/SystemCard";
import { fmtNum } from "@/lib/format";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  SYSTEMS,
  systemsByCategory,
  type SystemCategory,
} from "@/lib/systems";
import { buildSystemHealth, detectSystemIncidents } from "@/lib/systemHealth";
import Link from "next/link";

export default function SystemsOverview() {
  const grouped = systemsByCategory();
  const allHealth = SYSTEMS.map((s) => ({
    system: s,
    health: buildSystemHealth(s.id)!,
  }));
  const healthy = allHealth.filter((x) => x.health.zone === "great" || x.health.zone === "good").length;
  const watch = allHealth.filter((x) => x.health.zone === "watch").length;
  const stressed = allHealth.filter(
    (x) => x.health.zone === "stressed" || x.health.zone === "critical"
  ).length;

  const allIncidents = SYSTEMS.flatMap((s) => detectSystemIncidents(s.id));
  const sevOrder = ["low", "medium", "high", "critical"] as const;
  allIncidents.sort((a, b) => {
    const s =
      sevOrder.indexOf(b.severity) - sevOrder.indexOf(a.severity);
    if (s !== 0) return s;
    return a.date < b.date ? 1 : -1;
  });

  const avgUptime =
    allHealth.reduce((s, x) => {
      const v = x.health.vitals.find((v) => v.label === "Uptime");
      const pct = v ? parseFloat(v.value) / 100 : 1;
      return s + pct;
    }, 0) / Math.max(1, allHealth.length);

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
          Systems · last 7 days
        </div>
        <h1 className="text-xl font-semibold">Trading Systems Health</h1>
        <p className="text-sm text-ink-muted max-w-2xl mt-1">
          Order management, execution, booking, pricing, surveillance, and
          post-trade systems that the desks depend on. The same Fitbit-style
          health score is computed against throughput, latency, error rate,
          uptime, and incident load.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Systems tracked" value={fmtNum(SYSTEMS.length)} />
        <StatCard
          label="Healthy"
          value={fmtNum(healthy)}
          tone="up"
          sub={`${watch} watch · ${stressed} stressed/critical`}
        />
        <StatCard
          label="Open incidents"
          value={fmtNum(allIncidents.length)}
          tone={allIncidents.length > 0 ? "warn" : "neutral"}
          sub={`${allIncidents.filter((i) => i.severity === "critical" || i.severity === "high").length} high+`}
        />
        <StatCard
          label="Avg uptime"
          value={`${(avgUptime * 100).toFixed(2)}%`}
          tone={avgUptime >= 0.999 ? "up" : "warn"}
        />
      </div>

      {(Object.keys(CATEGORY_LABEL) as SystemCategory[]).map((cat) => {
        const systems = grouped[cat];
        if (systems.length === 0) return null;
        return (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: CATEGORY_COLOR[cat] }}
              />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
                {CATEGORY_LABEL[cat]}
              </h2>
              <span className="text-[10px] font-mono text-ink-dim">
                {systems.length} systems
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {systems.map((s) => (
                <SystemCard key={s.id} system={s} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">Recent Incidents</div>
          <div className="text-[11px] text-ink-dim font-mono">
            {allIncidents.length} total
          </div>
        </div>
        {allIncidents.length === 0 ? (
          <div className="p-6 text-center text-ink-dim text-sm">
            All systems quiet — no incidents detected in the surveillance window.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {allIncidents.slice(0, 30).map((i) => {
              const s = SYSTEMS.find((x) => x.id === i.systemId)!;
              const sevColor =
                i.severity === "critical"
                  ? "#ec4899"
                  : i.severity === "high"
                  ? "#ef4444"
                  : i.severity === "medium"
                  ? "#fb923c"
                  : "#facc15";
              return (
                <li key={i.id} className="px-4 py-3 hover:bg-bg-hover">
                  <Link href={`/system/${s.id}`} className="block">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[11px] text-ink-dim w-14">
                        {i.date.slice(5)}
                      </span>
                      <span
                        className="chip border"
                        style={{
                          borderColor: `${sevColor}80`,
                          color: sevColor,
                          background: `${sevColor}14`,
                        }}
                      >
                        {i.severity}
                      </span>
                      <span className="chip border border-line text-ink-muted">
                        {i.kind.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-ink">{s.name}</span>
                      <span className="text-[11px] text-ink-dim font-mono">
                        {s.id}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-ink-muted">
                      {i.message}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
