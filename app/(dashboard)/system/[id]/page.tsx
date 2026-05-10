import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthBand } from "@/components/HealthBand";
import { StatCard } from "@/components/StatCard";
import { TimeSeries } from "@/components/TimeSeries";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  SYSTEMS,
  getSystem,
  metricsForSystem,
} from "@/lib/systems";
import {
  buildSystemHealth,
  detectSystemIncidents,
} from "@/lib/systemHealth";
import { fmtNum } from "@/lib/format";
import { ASSET_CLASSES } from "@/lib/data";

export function generateStaticParams() {
  return SYSTEMS.map((s) => ({ id: s.id }));
}

export default function SystemPage({ params }: { params: { id: string } }) {
  const system = getSystem(params.id);
  if (!system) notFound();
  const health = buildSystemHealth(system.id)!;
  const metrics = metricsForSystem(system.id);
  const incidents = detectSystemIncidents(system.id);

  const tpSeries = metrics.map((m) => ({
    date: m.date,
    value: Math.round(m.throughput),
  }));
  const p99Series = metrics.map((m) => ({
    date: m.date,
    value: Math.round(m.p99Ms * 10) / 10,
  }));
  const errSeries = metrics.map((m) => ({
    date: m.date,
    value: Math.round(m.errorRate * 10000) / 100, // %
  }));

  const meanUp =
    metrics.reduce((s, m) => s + m.uptime, 0) / Math.max(1, metrics.length);

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
          <Link href="/systems" className="hover:text-ink">
            Systems
          </Link>
          {" · "}
          <span style={{ color: CATEGORY_COLOR[system.category] }}>
            {CATEGORY_LABEL[system.category]}
          </span>
        </div>
        <h1 className="text-xl font-semibold">{system.name}</h1>
        <div className="text-xs font-mono text-ink-dim mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>{system.id}</span>
          <span>·</span>
          <span>vendor: {system.vendor}</span>
          <span>·</span>
          <span>region: {system.region}</span>
          <span>·</span>
          <span>team: {system.team}</span>
          {system.assetClasses.length > 0 ? (
            <>
              <span>·</span>
              <span>
                assets:{" "}
                {system.assetClasses.map((a, i) => (
                  <span
                    key={a}
                    style={{
                      color: ASSET_CLASSES.find((x) => x.code === a)?.color,
                    }}
                  >
                    {i > 0 ? ", " : ""}
                    {a}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <>
              <span>·</span>
              <span>cross-asset</span>
            </>
          )}
        </div>
      </header>

      <HealthBand
        health={health}
        name={system.name}
        wallHref={`/system/${system.id}/health`}
        title="System Health · last 14 days"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg uptime 90d"
          value={`${(meanUp * 100).toFixed(2)}%`}
          tone={meanUp >= 0.999 ? "up" : "warn"}
        />
        <StatCard
          label="Baseline throughput"
          value={`${system.baselineThroughput}/s`}
        />
        <StatCard
          label="Baseline p99"
          value={`${system.baselineP99Ms}ms`}
        />
        <StatCard
          label="Incidents 7d"
          value={fmtNum(incidents.length)}
          tone={incidents.length > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Throughput · 90d</div>
          </div>
          <div className="p-4">
            <TimeSeries
              points={tpSeries}
              color="#10b981"
              baselineMean={system.baselineThroughput}
              baselineStd={system.baselineThroughput * 0.08}
              height={200}
              yLabel="events/sec"
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">p99 latency · 90d</div>
          </div>
          <div className="p-4">
            <TimeSeries
              points={p99Series}
              color="#a855f7"
              baselineMean={system.baselineP99Ms}
              baselineStd={system.baselineP99Ms * 0.12}
              height={200}
              yLabel="ms"
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Error rate · 90d</div>
        </div>
        <div className="p-4">
          <TimeSeries
            points={errSeries}
            color="#ef4444"
            baselineMean={system.baselineErrorRate * 100}
            baselineStd={system.baselineErrorRate * 100 * 0.2}
            height={180}
            yLabel="%"
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Recent Incidents</div>
          <div className="text-[11px] text-ink-dim font-mono">
            {incidents.length} detected
          </div>
        </div>
        {incidents.length === 0 ? (
          <div className="p-6 text-center text-ink-dim text-sm">
            No incidents detected — system within baseline thresholds.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {incidents.map((i) => {
              const sevColor =
                i.severity === "critical"
                  ? "#ec4899"
                  : i.severity === "high"
                  ? "#ef4444"
                  : i.severity === "medium"
                  ? "#fb923c"
                  : "#facc15";
              return (
                <li key={i.id} className="px-4 py-3">
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
                  </div>
                  <div className="mt-1 text-sm text-ink-muted">{i.message}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
