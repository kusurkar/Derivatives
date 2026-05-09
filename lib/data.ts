import { makeRng, type Rng } from "./rng";
import type {
  AssetClass,
  AssetClassCode,
  DailyActivity,
  Desk,
  Region,
  Trader,
  Venue,
} from "./types";

export const ASSET_CLASSES: AssetClass[] = [
  { code: "EQ", name: "Equities", color: "#3b82f6" },
  { code: "FNO", name: "Futures & Options", color: "#a855f7" },
  { code: "CREDIT", name: "Credit", color: "#f59e0b" },
  { code: "FX", name: "FX", color: "#10b981" },
  { code: "COMM", name: "Commodities", color: "#f97316" },
  { code: "RATES", name: "Rates", color: "#06b6d4" },
];

export const REGIONS: Region[] = [
  { code: "APAC", name: "Asia Pacific" },
  { code: "EMEA", name: "Europe, Middle East & Africa" },
  { code: "AMRS", name: "Americas" },
];

export const VENUES: Venue[] = [
  { code: "NYSE", name: "New York Stock Exchange", assetClasses: ["EQ"], region: "AMRS" },
  { code: "NASDAQ", name: "Nasdaq", assetClasses: ["EQ"], region: "AMRS" },
  { code: "LSE", name: "London Stock Exchange", assetClasses: ["EQ"], region: "EMEA" },
  { code: "XETRA", name: "Deutsche Börse Xetra", assetClasses: ["EQ"], region: "EMEA" },
  { code: "TSE", name: "Tokyo Stock Exchange", assetClasses: ["EQ"], region: "APAC" },
  { code: "HKEX", name: "Hong Kong Exchange", assetClasses: ["EQ", "FNO"], region: "APAC" },
  { code: "SGX", name: "Singapore Exchange", assetClasses: ["EQ", "FNO", "COMM"], region: "APAC" },
  { code: "CME", name: "CME Group", assetClasses: ["FNO", "RATES", "COMM", "FX"], region: "AMRS" },
  { code: "ICE", name: "Intercontinental Exchange", assetClasses: ["FNO", "COMM", "CREDIT"], region: "AMRS" },
  { code: "EUREX", name: "Eurex", assetClasses: ["FNO", "RATES"], region: "EMEA" },
  { code: "MARKETAXS", name: "MarketAxess", assetClasses: ["CREDIT"], region: "AMRS" },
  { code: "TRADEWEB", name: "Tradeweb", assetClasses: ["CREDIT", "RATES"], region: "AMRS" },
  { code: "BLOOM", name: "Bloomberg BMTF", assetClasses: ["CREDIT", "RATES", "FX"], region: "EMEA" },
  { code: "EBS", name: "EBS", assetClasses: ["FX"], region: "EMEA" },
  { code: "REUTERS360T", name: "Refinitiv 360T", assetClasses: ["FX"], region: "EMEA" },
  { code: "HOTSPOT", name: "Cboe FX Hotspot", assetClasses: ["FX"], region: "AMRS" },
  { code: "LME", name: "London Metal Exchange", assetClasses: ["COMM"], region: "EMEA" },
  { code: "NYMEX", name: "NYMEX", assetClasses: ["COMM"], region: "AMRS" },
  { code: "OTC", name: "OTC Bilateral", assetClasses: ["CREDIT", "RATES", "FX", "COMM"], region: "EMEA" },
];

export const DESKS: Desk[] = [
  { id: "EQ-NY", name: "Cash Equities NY", region: "AMRS", assetClasses: ["EQ"] },
  { id: "EQ-LDN", name: "Cash Equities London", region: "EMEA", assetClasses: ["EQ"] },
  { id: "EQ-HK", name: "Cash Equities HK", region: "APAC", assetClasses: ["EQ"] },
  { id: "FNO-CHI", name: "Index & ETF Derivatives", region: "AMRS", assetClasses: ["FNO", "EQ"] },
  { id: "FNO-LDN", name: "Equity Derivatives London", region: "EMEA", assetClasses: ["FNO"] },
  { id: "CREDIT-NY", name: "IG & HY Credit", region: "AMRS", assetClasses: ["CREDIT"] },
  { id: "CREDIT-LDN", name: "European Credit", region: "EMEA", assetClasses: ["CREDIT"] },
  { id: "FX-LDN", name: "G10 FX Spot & Fwd", region: "EMEA", assetClasses: ["FX"] },
  { id: "FX-SG", name: "EM FX Asia", region: "APAC", assetClasses: ["FX"] },
  { id: "RATES-NY", name: "USD Rates", region: "AMRS", assetClasses: ["RATES"] },
  { id: "RATES-LDN", name: "EUR/GBP Rates", region: "EMEA", assetClasses: ["RATES"] },
  { id: "COMM-NY", name: "Energy & Metals", region: "AMRS", assetClasses: ["COMM"] },
  { id: "COMM-SG", name: "Asia Commodities", region: "APAC", assetClasses: ["COMM"] },
];

const FIRST_NAMES = [
  "Aarav", "Mei", "Jordan", "Priya", "Liam", "Sofia", "Hiroshi", "Amelia",
  "Mateo", "Zara", "Noah", "Ananya", "Lucas", "Yuki", "Elena", "Diego",
  "Sana", "Ravi", "Chloe", "Ethan", "Wei", "Olivia", "Nia", "Marco",
  "Imani", "Tomás", "Hana", "Kofi", "Anya", "Felix", "Rina", "Adit",
];
const LAST_NAMES = [
  "Patel", "Kim", "Garcia", "Khan", "Müller", "Tanaka", "Okafor", "Chen",
  "Rossi", "Andersen", "Martin", "Sato", "Singh", "Dubois", "Fernandez",
  "Wong", "Silva", "Nguyen", "Cohen", "Ivanov", "Reddy", "Yamamoto",
  "Brown", "O'Neill", "Park", "Hassan", "Costa", "Zhang", "Lee", "Schmidt",
];

const SENIORITIES: Trader["seniority"][] = ["Junior", "Mid", "Senior", "Head"];

const TRADERS_PER_DESK: Record<string, number> = {
  "EQ-NY": 5, "EQ-LDN": 4, "EQ-HK": 3,
  "FNO-CHI": 4, "FNO-LDN": 3,
  "CREDIT-NY": 4, "CREDIT-LDN": 3,
  "FX-LDN": 4, "FX-SG": 3,
  "RATES-NY": 3, "RATES-LDN": 3,
  "COMM-NY": 3, "COMM-SG": 2,
};

const SEED = 0x10ad5;
export const WINDOW_DAYS = 90;
export const RECENT_DAYS = 7;
/** "Today" in the synthetic universe. Frozen so generated data is stable. */
export const SYNTH_TODAY = "2026-05-09";

function isoMinusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

export function dateRange(endIso: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(isoMinusDays(endIso, i));
  return out;
}

interface TraderTendency {
  scale: number; // multiplier on baseline activity
  pnlBias: number; // mean daily PnL skew
  pnlVol: number; // volatility of daily pnl
  hour: number; // typical trading hour UTC
  hourStd: number;
  assetMix: Record<AssetClassCode, number>;
  venueMix: Record<string, number>;
}

function softmax(weights: number[]): number[] {
  const max = Math.max(...weights);
  const exps = weights.map((w) => Math.exp(w - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function buildTraderTendency(
  trader: Trader,
  desk: Desk,
  rng: Rng
): TraderTendency {
  const assets = desk.assetClasses;
  const assetWeights = assets.map(() => rng.normal(0, 1));
  const assetProbs = softmax(assetWeights);
  const assetMix = Object.fromEntries(
    ASSET_CLASSES.map((a) => [a.code, 0])
  ) as Record<AssetClassCode, number>;
  assets.forEach((a, i) => (assetMix[a] = assetProbs[i]));

  const venuesForDesk = VENUES.filter((v) =>
    v.assetClasses.some((a) => assets.includes(a))
  );
  const venueWeights = venuesForDesk.map(() => rng.normal(0, 1.5));
  const venueProbs = softmax(venueWeights);
  const venueMix: Record<string, number> = {};
  venuesForDesk.forEach((v, i) => (venueMix[v.code] = venueProbs[i]));

  const seniorityScale = { Junior: 0.6, Mid: 1.0, Senior: 1.6, Head: 2.2 }[
    trader.seniority
  ];
  const scale = Math.max(0.2, rng.normal(seniorityScale, 0.3));

  const regionHour: Record<string, number> = { APAC: 4, EMEA: 11, AMRS: 16 };
  const hour = Math.max(
    0,
    Math.min(23, regionHour[desk.region] + rng.normal(0, 0.7))
  );

  return {
    scale,
    pnlBias: rng.normal(0, 0.2),
    pnlVol: Math.max(0.4, rng.normal(1.0, 0.3)),
    hour,
    hourStd: Math.max(0.3, rng.normal(0.8, 0.2)),
    assetMix,
    venueMix,
  };
}

interface InjectedAnomaly {
  traderId: string;
  date: string;
  kind: "spike" | "off_hours" | "new_venue" | "pnl_tail" | "asset_drift";
  detail?: string;
}

function generate(): {
  traders: Trader[];
  activity: DailyActivity[];
  injected: InjectedAnomaly[];
} {
  const rng = makeRng(SEED);
  const traders: Trader[] = [];
  const tendencies = new Map<string, TraderTendency>();

  for (const desk of DESKS) {
    const n = TRADERS_PER_DESK[desk.id];
    for (let i = 0; i < n; i++) {
      const id = `${desk.id}-T${(i + 1).toString().padStart(2, "0")}`;
      const seniority =
        i === 0 ? "Head" : SENIORITIES[Math.min(3, rng.int(0, 2))];
      const trader: Trader = {
        id,
        name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
        deskId: desk.id,
        region: desk.region,
        seniority,
        startedAt: isoMinusDays(SYNTH_TODAY, rng.int(180, 365 * 8)),
      };
      traders.push(trader);
      tendencies.set(id, buildTraderTendency(trader, desk, rng));
    }
  }

  const dates = dateRange(SYNTH_TODAY, WINDOW_DAYS);
  const activity: DailyActivity[] = [];

  // Pick a subset of traders to receive injected anomalies in the last 7 days.
  const anomalyTargets = new Map<string, InjectedAnomaly[]>();
  const anomalyKinds: InjectedAnomaly["kind"][] = [
    "spike",
    "off_hours",
    "new_venue",
    "pnl_tail",
    "asset_drift",
  ];
  for (const t of traders) {
    if (rng.next() < 0.32) {
      const k = rng.pick(anomalyKinds);
      const dayOffset = rng.int(0, RECENT_DAYS - 1);
      const d = isoMinusDays(SYNTH_TODAY, dayOffset);
      anomalyTargets.set(t.id, [{ traderId: t.id, date: d, kind: k }]);
    }
  }

  for (const trader of traders) {
    const t = tendencies.get(trader.id)!;
    const desk = DESKS.find((d) => d.id === trader.deskId)!;
    const baseTrades = 12 * t.scale;
    const baseNotionalPerTrade = 1_500_000 * t.scale;

    for (const date of dates) {
      const dow = dayOfWeek(date);
      if (dow === 0 || dow === 6) continue; // skip weekends

      // Per-day total trade count.
      const totalTrades = Math.max(0, rng.poisson(baseTrades));
      if (totalTrades === 0) continue;

      // Allocate trades to (asset, venue) buckets per the trader's mix.
      const buckets: Record<string, number> = {};
      const venuesForDesk = VENUES.filter((v) =>
        v.assetClasses.some((a) => desk.assetClasses.includes(a))
      );

      for (let n = 0; n < totalTrades; n++) {
        // Pick asset by mix.
        let r = rng.next();
        let chosenAsset: AssetClassCode = desk.assetClasses[0];
        for (const a of desk.assetClasses) {
          r -= t.assetMix[a];
          if (r <= 0) {
            chosenAsset = a;
            break;
          }
        }
        // Pick venue by mix among venues that support this asset.
        const eligible = venuesForDesk.filter((v) =>
          v.assetClasses.includes(chosenAsset)
        );
        const weights = eligible.map((v) => t.venueMix[v.code] ?? 0.001);
        const sumW = weights.reduce((a, b) => a + b, 0);
        let r2 = rng.next() * sumW;
        let chosenVenue = eligible[0].code;
        for (let i = 0; i < eligible.length; i++) {
          r2 -= weights[i];
          if (r2 <= 0) {
            chosenVenue = eligible[i].code;
            break;
          }
        }
        const key = `${chosenAsset}|${chosenVenue}`;
        buckets[key] = (buckets[key] ?? 0) + 1;
      }

      const injected = anomalyTargets.get(trader.id)?.find((x) => x.date === date);

      for (const [key, trades] of Object.entries(buckets)) {
        const [assetClass, venue] = key.split("|") as [AssetClassCode, string];
        let dayTrades = trades;
        let avgHour = t.hour + rng.normal(0, t.hourStd);
        let notional =
          baseNotionalPerTrade *
          dayTrades *
          Math.exp(rng.normal(0, 0.25));
        let pnl =
          notional * (t.pnlBias + rng.normal(0, t.pnlVol)) * 0.0008;

        // Apply injected anomaly on this row if it matches.
        if (injected) {
          if (injected.kind === "spike") {
            dayTrades = Math.round(dayTrades * 4.5);
            notional *= 4.5;
          } else if (injected.kind === "off_hours") {
            avgHour = (avgHour + 12) % 24;
          } else if (injected.kind === "pnl_tail") {
            pnl = -Math.abs(notional) * 0.012;
          }
          // new_venue / asset_drift handled below as a separate row injection
        }

        activity.push({
          date,
          traderId: trader.id,
          assetClass,
          venue,
          trades: dayTrades,
          notional,
          pnl,
          avgHourUtc: Math.max(0, Math.min(23.99, avgHour)),
        });
      }

      if (injected?.kind === "new_venue") {
        // Pick a venue this trader has never used in window so far.
        const usedVenues = new Set(
          activity
            .filter((a) => a.traderId === trader.id)
            .map((a) => a.venue)
        );
        const candidates = VENUES.filter(
          (v) =>
            !usedVenues.has(v.code) &&
            v.assetClasses.some((a) => desk.assetClasses.includes(a))
        );
        if (candidates.length > 0) {
          const v = rng.pick(candidates);
          const a = v.assetClasses.find((x) =>
            desk.assetClasses.includes(x)
          )!;
          activity.push({
            date,
            traderId: trader.id,
            assetClass: a,
            venue: v.code,
            trades: rng.int(3, 9),
            notional: baseNotionalPerTrade * rng.int(3, 9),
            pnl: -Math.abs(rng.normal(0, baseNotionalPerTrade * 0.005)),
            avgHourUtc: t.hour,
          });
          injected.detail = v.code;
        }
      }

      if (injected?.kind === "asset_drift") {
        // Add trades in an asset class the trader's desk doesn't normally cover.
        const otherAssets = ASSET_CLASSES.filter(
          (a) => !desk.assetClasses.includes(a.code)
        );
        const a = rng.pick(otherAssets).code;
        const venue =
          VENUES.find((v) => v.assetClasses.includes(a))?.code ?? "OTC";
        activity.push({
          date,
          traderId: trader.id,
          assetClass: a,
          venue,
          trades: rng.int(2, 6),
          notional: baseNotionalPerTrade * rng.int(2, 6),
          pnl: rng.normal(0, baseNotionalPerTrade * 0.005),
          avgHourUtc: t.hour,
        });
        injected.detail = a;
      }
    }
  }

  const injected: InjectedAnomaly[] = [];
  for (const arr of anomalyTargets.values()) injected.push(...arr);

  return { traders, activity, injected };
}

// Compute once per process and reuse. Next.js will share this across requests
// in the same server process.
const _generated = generate();
export const TRADERS = _generated.traders;
export const ACTIVITY = _generated.activity;

export function getDesk(id: string): Desk | undefined {
  return DESKS.find((d) => d.id === id);
}
export function getTrader(id: string): Trader | undefined {
  return TRADERS.find((t) => t.id === id);
}
export function getAssetClass(code: string): AssetClass | undefined {
  return ASSET_CLASSES.find((a) => a.code === code);
}
export function tradersForDesk(deskId: string): Trader[] {
  return TRADERS.filter((t) => t.deskId === deskId);
}
export function activityForTrader(traderId: string): DailyActivity[] {
  return ACTIVITY.filter((a) => a.traderId === traderId);
}
export function activityForDesk(deskId: string): DailyActivity[] {
  const ids = new Set(tradersForDesk(deskId).map((t) => t.id));
  return ACTIVITY.filter((a) => ids.has(a.traderId));
}
export function activityForAsset(code: string): DailyActivity[] {
  return ACTIVITY.filter((a) => a.assetClass === code);
}
