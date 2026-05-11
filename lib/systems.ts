import { makeRng } from "./rng";
import { ASSET_CLASSES, SYNTH_TODAY, WINDOW_DAYS, dateRange } from "./data";
import type { AssetClassCode, RegionCode, Severity } from "./types";

export type SystemCategory =
  | "OMS" // Order Management
  | "EMS" // Execution Management
  | "BOOKING" // Risk / Booking
  | "PRICING" // Pricing / Quoting
  | "SURVEILLANCE" // Trade & comms surveillance
  | "RECON"; // Confirmation & reconciliation

export const CATEGORY_LABEL: Record<SystemCategory, string> = {
  OMS: "Order Management",
  EMS: "Execution Management",
  BOOKING: "Booking & Risk",
  PRICING: "Pricing",
  SURVEILLANCE: "Surveillance",
  RECON: "Confirmation & Recon",
};

export const CATEGORY_COLOR: Record<SystemCategory, string> = {
  OMS: "#3b82f6",
  EMS: "#a855f7",
  BOOKING: "#f59e0b",
  PRICING: "#10b981",
  SURVEILLANCE: "#ec4899",
  RECON: "#06b6d4",
};

export interface TradingSystem {
  id: string;
  name: string;
  vendor: string;
  category: SystemCategory;
  region: RegionCode | "GLOBAL";
  assetClasses: AssetClassCode[]; // empty == all
  /** Owner / SRE team. */
  team: string;
  /** Typical baseline throughput (events/sec). */
  baselineThroughput: number;
  /** Typical baseline p99 latency in milliseconds. */
  baselineP99Ms: number;
  /** Typical baseline error rate (0..1). */
  baselineErrorRate: number;
}

export const SYSTEMS: TradingSystem[] = [
  {
    id: "FIDESSA-NY",
    name: "Fidessa Cash OMS",
    vendor: "Fidessa",
    category: "OMS",
    region: "AMRS",
    assetClasses: ["EQ"],
    team: "Equities Tech NY",
    baselineThroughput: 180,
    baselineP99Ms: 28,
    baselineErrorRate: 0.002,
  },
  {
    id: "CHRLSRVR-LDN",
    name: "Charles River IMS",
    vendor: "Charles River",
    category: "OMS",
    region: "EMEA",
    assetClasses: ["EQ", "FNO"],
    team: "Equities Tech London",
    baselineThroughput: 140,
    baselineP99Ms: 35,
    baselineErrorRate: 0.003,
  },
  {
    id: "BBG-AIM-APAC",
    name: "Bloomberg AIM",
    vendor: "Bloomberg",
    category: "OMS",
    region: "APAC",
    assetClasses: ["EQ"],
    team: "Equities Tech HK",
    baselineThroughput: 95,
    baselineP99Ms: 42,
    baselineErrorRate: 0.004,
  },
  {
    id: "TT-FUT",
    name: "Trading Technologies",
    vendor: "TT",
    category: "EMS",
    region: "GLOBAL",
    assetClasses: ["FNO", "COMM"],
    team: "Derivatives Tech",
    baselineThroughput: 420,
    baselineP99Ms: 9,
    baselineErrorRate: 0.001,
  },
  {
    id: "FLXTRADE-EQ",
    name: "FlexTrade FlexNOW",
    vendor: "FlexTrade",
    category: "EMS",
    region: "GLOBAL",
    assetClasses: ["EQ"],
    team: "Equities Tech NY",
    baselineThroughput: 360,
    baselineP99Ms: 12,
    baselineErrorRate: 0.002,
  },
  {
    id: "EMSX-FX",
    name: "Bloomberg EMSX FX",
    vendor: "Bloomberg",
    category: "EMS",
    region: "GLOBAL",
    assetClasses: ["FX"],
    team: "FX Tech",
    baselineThroughput: 510,
    baselineP99Ms: 7,
    baselineErrorRate: 0.0015,
  },
  {
    id: "CALYPSO-RATES",
    name: "Calypso Rates Booking",
    vendor: "Calypso",
    category: "BOOKING",
    region: "EMEA",
    assetClasses: ["RATES"],
    team: "Rates Tech",
    baselineThroughput: 22,
    baselineP99Ms: 380,
    baselineErrorRate: 0.005,
  },
  {
    id: "MUREX-FNO",
    name: "Murex MX.3",
    vendor: "Murex",
    category: "BOOKING",
    region: "GLOBAL",
    assetClasses: ["FNO", "RATES", "FX"],
    team: "Cross-Asset Tech",
    baselineThroughput: 38,
    baselineP99Ms: 290,
    baselineErrorRate: 0.004,
  },
  {
    id: "SUMMIT-CREDIT",
    name: "Summit Credit Booking",
    vendor: "Misys / Finastra",
    category: "BOOKING",
    region: "GLOBAL",
    assetClasses: ["CREDIT"],
    team: "Credit Tech",
    baselineThroughput: 14,
    baselineP99Ms: 510,
    baselineErrorRate: 0.006,
  },
  {
    id: "NUMERIX-PRICE",
    name: "Numerix CrossAsset",
    vendor: "Numerix",
    category: "PRICING",
    region: "GLOBAL",
    assetClasses: ["FNO", "RATES"],
    team: "Quant Tech",
    baselineThroughput: 2400,
    baselineP99Ms: 4,
    baselineErrorRate: 0.0008,
  },
  {
    id: "SMARTS-SRV",
    name: "Nasdaq SMARTS",
    vendor: "Nasdaq",
    category: "SURVEILLANCE",
    region: "GLOBAL",
    assetClasses: [],
    team: "Surveillance Tech",
    baselineThroughput: 175,
    baselineP99Ms: 60,
    baselineErrorRate: 0.003,
  },
  {
    id: "ACTIMIZE-AML",
    name: "NICE Actimize AML",
    vendor: "NICE Actimize",
    category: "SURVEILLANCE",
    region: "GLOBAL",
    assetClasses: [],
    team: "Compliance Tech",
    baselineThroughput: 88,
    baselineP99Ms: 110,
    baselineErrorRate: 0.005,
  },
  {
    id: "MARKITWIRE-CONF",
    name: "MarkitWire",
    vendor: "IHS Markit",
    category: "RECON",
    region: "EMEA",
    assetClasses: ["CREDIT", "RATES"],
    team: "Post-Trade Tech",
    baselineThroughput: 18,
    baselineP99Ms: 220,
    baselineErrorRate: 0.008,
  },
  {
    id: "TRAIANA-RECON",
    name: "Traiana Harmony",
    vendor: "OSTTRA",
    category: "RECON",
    region: "GLOBAL",
    assetClasses: [],
    team: "Post-Trade Tech",
    baselineThroughput: 32,
    baselineP99Ms: 145,
    baselineErrorRate: 0.007,
  },
];

export interface SystemMetricDay {
  date: string;
  systemId: string;
  /** Events / orders processed per second (daily mean). */
  throughput: number;
  /** p50 latency, ms. */
  p50Ms: number;
  /** p99 latency, ms. */
  p99Ms: number;
  /** Error rate, 0..1. */
  errorRate: number;
  /** Uptime as a fraction, 0..1. */
  uptime: number;
}

export type IncidentKind =
  | "LATENCY_SPIKE"
  | "ERROR_BURST"
  | "OUTAGE"
  | "THROUGHPUT_DROP"
  | "BATCH_LATE";

export interface SystemIncident {
  id: string;
  date: string;
  systemId: string;
  kind: IncidentKind;
  severity: Severity;
  message: string;
  metric: string;
  observed: number;
  baseline?: number;
}

const SEED = 0x59755; // "SYS"
const RECENT_DAYS = 7;

interface InjectedIncident {
  systemId: string;
  date: string;
  kind: IncidentKind;
}

function isoMinusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

function generate(): {
  metrics: SystemMetricDay[];
  injected: InjectedIncident[];
} {
  const rng = makeRng(SEED);
  const metrics: SystemMetricDay[] = [];
  const dates = dateRange(SYNTH_TODAY, WINDOW_DAYS);
  const injected: InjectedIncident[] = [];

  // Pick which systems get incidents in the recent window.
  const incidentMap = new Map<string, InjectedIncident[]>();
  const incidentKinds: IncidentKind[] = [
    "LATENCY_SPIKE",
    "ERROR_BURST",
    "OUTAGE",
    "THROUGHPUT_DROP",
    "BATCH_LATE",
  ];
  for (const sys of SYSTEMS) {
    if (rng.next() < 0.45) {
      const k = incidentKinds[rng.int(0, incidentKinds.length - 1)];
      const dayOffset = rng.int(0, RECENT_DAYS - 1);
      const d = isoMinusDays(SYNTH_TODAY, dayOffset);
      const inc: InjectedIncident = { systemId: sys.id, date: d, kind: k };
      incidentMap.set(sys.id, [inc]);
      injected.push(inc);
    }
  }

  for (const sys of SYSTEMS) {
    for (const date of dates) {
      const dow = dayOfWeek(date);
      const isWeekend = dow === 0 || dow === 6;
      // Most systems run 7 days; surveillance & batch run continuously,
      // booking systems quiet on weekends.
      if (isWeekend && (sys.category === "BOOKING" || sys.category === "OMS")) {
        // Skip weekend (no rows produced — health view will treat as rest).
        continue;
      }

      // Baseline + noise.
      const tp =
        sys.baselineThroughput * Math.exp(rng.normal(0, 0.08));
      const p50 =
        (sys.baselineP99Ms / 4) * Math.exp(rng.normal(0, 0.10));
      let p99 = sys.baselineP99Ms * Math.exp(rng.normal(0, 0.12));
      let err = sys.baselineErrorRate * Math.exp(rng.normal(0, 0.20));
      let uptime = Math.min(1, 0.9995 - Math.abs(rng.normal(0, 0.0006)));
      let throughput = tp;

      // Apply injected incident, if any, on this date.
      const incs = incidentMap.get(sys.id) ?? [];
      const inc = incs.find((x) => x.date === date);
      if (inc) {
        switch (inc.kind) {
          case "LATENCY_SPIKE":
            p99 = sys.baselineP99Ms * (5 + rng.next() * 5);
            break;
          case "ERROR_BURST":
            err = 0.04 + rng.next() * 0.06;
            break;
          case "OUTAGE":
            uptime = 0.92 + rng.next() * 0.05;
            throughput = tp * (0.2 + rng.next() * 0.2);
            break;
          case "THROUGHPUT_DROP":
            throughput = tp * (0.3 + rng.next() * 0.2);
            break;
          case "BATCH_LATE":
            // Latency for batch jobs balloons.
            p99 = sys.baselineP99Ms * (3 + rng.next() * 3);
            break;
        }
      }

      metrics.push({
        date,
        systemId: sys.id,
        throughput,
        p50Ms: p50,
        p99Ms: p99,
        errorRate: err,
        uptime,
      });
    }
  }

  return { metrics, injected };
}

const _generated = generate();
export const SYSTEM_METRICS: SystemMetricDay[] = _generated.metrics;

export function getSystem(id: string): TradingSystem | undefined {
  return SYSTEMS.find((s) => s.id === id);
}

export function metricsForSystem(id: string): SystemMetricDay[] {
  return SYSTEM_METRICS.filter((m) => m.systemId === id);
}

export function systemsByCategory(): Record<SystemCategory, TradingSystem[]> {
  const out = Object.fromEntries(
    Object.keys(CATEGORY_LABEL).map((k) => [k, [] as TradingSystem[]])
  ) as Record<SystemCategory, TradingSystem[]>;
  for (const s of SYSTEMS) out[s.category].push(s);
  return out;
}

export const SYSTEM_RECENT_DAYS = RECENT_DAYS;

// Re-exported for convenience.
void ASSET_CLASSES;
