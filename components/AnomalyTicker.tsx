import Link from "next/link";
import { detectAll } from "@/lib/anomaly";
import { getTrader } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { severityDotColor } from "./SeverityBadge";
import {
  CATEGORY_COLOR,
  SYSTEMS,
  getSystem,
} from "@/lib/systems";
import { detectSystemIncidents } from "@/lib/systemHealth";
import type { Severity } from "@/lib/types";

type TickerKind = "trader" | "system";

interface TickerEntry {
  id: string;
  date: string;
  severity: Severity;
  kind: string;
  message: string;
  entityKind: TickerKind;
  /** Display name. */
  entityName: string;
  /** Link target. */
  href: string;
  /** Optional accent color (category color for systems). */
  accent?: string;
}

function buildEntries(): TickerEntry[] {
  const out: TickerEntry[] = [];
  for (const a of detectAll().slice(0, 30)) {
    const t = getTrader(a.traderId);
    out.push({
      id: a.id,
      date: a.date,
      severity: a.severity,
      kind: a.kind.replace(/_/g, " "),
      message: a.message,
      entityKind: "trader",
      entityName: t?.name ?? a.traderId,
      href: `/trader/${a.traderId}`,
    });
  }
  for (const sys of SYSTEMS) {
    for (const i of detectSystemIncidents(sys.id)) {
      const s = getSystem(i.systemId)!;
      out.push({
        id: i.id,
        date: i.date,
        severity: i.severity,
        kind: i.kind.replace(/_/g, " "),
        message: i.message,
        entityKind: "system",
        entityName: s.name,
        href: `/system/${s.id}`,
        accent: CATEGORY_COLOR[s.category],
      });
    }
  }
  // Sort: severity (desc), then date (desc).
  const sevOrder: Severity[] = ["low", "medium", "high", "critical"];
  out.sort((a, b) => {
    const s = sevOrder.indexOf(b.severity) - sevOrder.indexOf(a.severity);
    if (s !== 0) return s;
    return a.date < b.date ? 1 : -1;
  });
  return out;
}

export function AnomalyTicker() {
  const entries = buildEntries();
  if (entries.length === 0) {
    return (
      <div className="bg-bg-panel border-y border-line py-2 text-center text-ink-muted text-xs">
        All quiet — no anomalies or system incidents in the last 7 days.
      </div>
    );
  }
  const traderCount = entries.filter((e) => e.entityKind === "trader").length;
  const systemCount = entries.filter((e) => e.entityKind === "system").length;
  // Duplicate items so the marquee loops seamlessly when translating -50%.
  const items = [...entries, ...entries];
  return (
    <div className="bg-bg-panel border-y border-line overflow-hidden relative">
      <div className="flex items-center">
        <div className="flex items-center gap-3 px-3 py-2 bg-sev-high/10 border-r border-line">
          <span className="w-2 h-2 rounded-full bg-sev-high animate-pulse_dot" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-sev-high font-semibold">
            Live Feed
          </span>
          <span className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest">
            <span className="text-ink-muted">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                style={{ background: "#facc15" }}
              />
              {traderCount} trader
            </span>
            <span className="text-ink-muted">
              <span
                className="inline-block w-1.5 h-1.5 rounded-sm mr-1 align-middle"
                style={{ background: "#0ea5e9" }}
              />
              {systemCount} system
            </span>
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {items.map((e, i) => (
              <Link
                key={`${e.id}-${i}`}
                href={e.href}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono hover:bg-bg-hover border-r border-line"
              >
                <EntityBadge entry={e} />
                <span className="text-ink-dim">{fmtDate(e.date)}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: severityDotColor(e.severity) }}
                />
                <span className="text-ink-muted">{e.kind}</span>
                <span className="text-ink">{e.entityName}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-dim">{e.message}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityBadge({ entry }: { entry: TickerEntry }) {
  if (entry.entityKind === "system") {
    return (
      <span
        className="text-[9px] font-mono uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-sm border"
        style={{
          background: `${entry.accent ?? "#0ea5e9"}1a`,
          borderColor: `${entry.accent ?? "#0ea5e9"}60`,
          color: entry.accent ?? "#0ea5e9",
        }}
      >
        SYS
      </span>
    );
  }
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-sm border"
      style={{
        background: "#facc1514",
        borderColor: "#facc1560",
        color: "#facc15",
      }}
    >
      TRD
    </span>
  );
}
