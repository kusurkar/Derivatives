import Link from "next/link";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_FOR_CATEGORY,
  SYSTEMS,
  type FlowStage,
  type SystemCategory,
  type TradingSystem,
} from "@/lib/systems";
import { buildSystemHealth } from "@/lib/systemHealth";
import { ZONE_COLOR, type HealthZone } from "@/lib/health";

/**
 * Left-to-right pipeline of trading systems:
 *
 *   Origination (OMS, EMS)
 *      → Booking & Pricing (BOOKING, PRICING)
 *         → ADS (Authoritative Data Store)
 *            → Downstream (SURVEILLANCE, RECON)
 *
 * Each node is a small card colored by its current health zone. Hovering /
 * clicking jumps to the system detail page. The arrows between stages turn
 * amber/red if any node in the upstream stage is in an unhealthy zone — a
 * visual hint that the downstream stage may be receiving degraded data.
 */
export function SystemFlowDiagram() {
  const systemsByStage: Record<FlowStage, TradingSystem[]> = {
    ORIGINATION: [],
    BOOKING: [],
    ADS: [],
    DOWNSTREAM: [],
  };
  for (const s of SYSTEMS) systemsByStage[STAGE_FOR_CATEGORY[s.category]].push(s);

  const nodes = SYSTEMS.map((s) => ({
    system: s,
    health: buildSystemHealth(s.id)!,
  }));
  const byId = new Map(nodes.map((n) => [n.system.id, n]));

  const stageHealth = (stage: FlowStage): HealthZone => {
    const items = systemsByStage[stage]
      .map((s) => byId.get(s.id)!)
      .filter(Boolean);
    if (items.length === 0) return "great";
    // Stage health = worst node's zone.
    const order: HealthZone[] = ["great", "good", "watch", "stressed", "critical"];
    return items.reduce<HealthZone>(
      (acc, n) =>
        order.indexOf(n.health.zone) > order.indexOf(acc) ? n.health.zone : acc,
      "great"
    );
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title">Trade Data Flow · Origination → ADS → Downstream</div>
        <div className="text-[11px] text-ink-dim font-mono">
          {SYSTEMS.length} systems · color = current health zone
        </div>
      </div>
      <div className="p-6 overflow-x-auto">
        <div className="flex items-stretch min-w-[940px] gap-2">
          {STAGE_ORDER.map((stage, i) => {
            const stageZone = stageHealth(stage);
            const nextZone =
              i < STAGE_ORDER.length - 1
                ? stageHealth(STAGE_ORDER[i + 1])
                : null;
            // Arrow color reflects the WORSE of (this stage, next stage) — if
            // either is unhealthy, the arrow flags it.
            const arrowZoneOrder: HealthZone[] = [
              "great",
              "good",
              "watch",
              "stressed",
              "critical",
            ];
            const arrowZone =
              nextZone &&
              arrowZoneOrder.indexOf(nextZone) > arrowZoneOrder.indexOf(stageZone)
                ? nextZone
                : stageZone;
            return (
              <FlowStageColumn
                key={stage}
                stage={stage}
                systems={systemsByStage[stage]}
                byId={byId}
                isLast={i === STAGE_ORDER.length - 1}
                arrowColor={arrowZone ? ZONE_COLOR[arrowZone] : undefined}
              />
            );
          })}
        </div>
        <Legend />
      </div>
    </section>
  );
}

type FlowNode = {
  system: TradingSystem;
  health: NonNullable<ReturnType<typeof buildSystemHealth>>;
};

function FlowStageColumn({
  stage,
  systems,
  byId,
  isLast,
  arrowColor,
}: {
  stage: FlowStage;
  systems: TradingSystem[];
  byId: Map<string, FlowNode>;
  isLast: boolean;
  arrowColor?: string;
}) {
  const grouped: Record<string, TradingSystem[]> = {};
  for (const s of systems) {
    grouped[s.category] = grouped[s.category] ?? [];
    grouped[s.category].push(s);
  }
  return (
    <>
      <div className="flex-1 min-w-[180px] rounded-md border border-line bg-bg-subtle/40 p-3">
        <div className="text-[10px] uppercase tracking-widest text-ink-dim font-mono mb-3">
          {STAGE_LABEL[stage]}
        </div>
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-sm"
                  style={{ background: CATEGORY_COLOR[cat as SystemCategory] }}
                />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                  {cat}
                </span>
                <span className="text-[10px] font-mono text-ink-dim">
                  ({list.length})
                </span>
              </div>
              {list.map((s) => {
                const node = byId.get(s.id);
                if (!node) return null;
                const color = ZONE_COLOR[node.health.zone];
                const incidents = node.health.anomalies.length;
                return (
                  <Link
                    key={s.id}
                    href={`/system/${s.id}`}
                    className="block rounded border border-line bg-bg-panel px-2 py-1.5 hover:border-ink-muted transition-colors"
                    style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                    title={`${s.name} · ${node.health.score}/100`}
                  >
                    <div className="text-xs text-ink truncate font-medium">
                      {s.name}
                    </div>
                    <div className="text-[10px] font-mono text-ink-dim flex justify-between mt-0.5">
                      <span className="truncate">{s.vendor}</span>
                      <span
                        className="tabular-nums"
                        style={{ color }}
                      >
                        {node.health.score}
                        {incidents > 0 ? (
                          <span className="ml-1 text-sev-high">·{incidents}</span>
                        ) : null}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {!isLast ? (
        <FlowArrow color={arrowColor ?? "#5b6478"} />
      ) : null}
    </>
  );
}

function FlowArrow({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center w-10 shrink-0">
      <svg
        viewBox="0 0 40 20"
        width="40"
        height="20"
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      >
        <defs>
          <marker
            id={`arrow-${color.slice(1)}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L6,3 z" fill={color} />
          </marker>
        </defs>
        <line
          x1="2"
          y1="10"
          x2="34"
          y2="10"
          stroke={color}
          strokeWidth="2"
          markerEnd={`url(#arrow-${color.slice(1)})`}
        />
      </svg>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-5 text-[10px] font-mono text-ink-dim">
      <span className="uppercase tracking-widest">Health zones:</span>
      {(["great", "good", "watch", "stressed", "critical"] as const).map((z) => (
        <span key={z} className="inline-flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ background: ZONE_COLOR[z] }}
          />
          {z}
        </span>
      ))}
      <span className="ml-auto text-ink-dim">
        Click any node to open its system detail.
      </span>
    </div>
  );
}
