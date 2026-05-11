export type AssetClassCode = "EQ" | "FNO" | "CREDIT" | "FX" | "COMM" | "RATES";
export type RegionCode = "APAC" | "EMEA" | "AMRS";

export type OrderType =
  | "MARKET"
  | "LIMIT"
  | "MOC" // market on close
  | "MOO" // market on open
  | "VWAP"
  | "TWAP"
  | "BLOCK"
  | "RFQ"
  | "AUCTION";

export interface AssetClass {
  code: AssetClassCode;
  name: string;
  color: string;
}

export interface Region {
  code: RegionCode;
  name: string;
}

export interface Venue {
  code: string;
  name: string;
  assetClasses: AssetClassCode[];
  region: RegionCode;
}

export interface Desk {
  id: string;
  name: string;
  region: RegionCode;
  assetClasses: AssetClassCode[];
}

export interface Trader {
  id: string;
  name: string;
  deskId: string;
  region: RegionCode;
  seniority: "Junior" | "Mid" | "Senior" | "Head";
  startedAt: string; // ISO date
}

/** A daily aggregate of one trader's activity in a single (asset, venue, orderType) bucket. */
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  traderId: string;
  assetClass: AssetClassCode;
  venue: string;
  orderType: OrderType;
  trades: number;
  /** Subset of `trades` that were client orders (rest are house / proprietary). */
  clientTrades: number;
  /** Subset of `trades` that were cancelled before fill (counted in trades). */
  cancelledTrades: number;
  notional: number; // USD
  pnl: number; // USD
  avgHourUtc: number; // 0..23, time-of-day mean
}

/** Vector summarizing a trader's typical behavior (the "synthetic profile"). */
export interface TraderProfile {
  traderId: string;
  windowDays: number;
  metrics: {
    trades: { mean: number; std: number };
    notional: { mean: number; std: number };
    pnl: { mean: number; std: number };
    avgHourUtc: { mean: number; std: number };
    distinctVenues: { mean: number; std: number };
  };
  assetMix: Record<AssetClassCode, number>; // proportions, sum to 1
  venueMix: Record<string, number>;
}

export type AnomalyKind =
  | "VOLUME_SPIKE"
  | "VOLUME_DROP"
  | "PNL_TAIL"
  | "OFF_HOURS"
  | "NEW_VENUE"
  | "ASSET_DRIFT"
  | "TRADE_COUNT_SPIKE";

export type Severity = "low" | "medium" | "high" | "critical";

export interface Anomaly {
  id: string;
  date: string;
  traderId: string;
  deskId: string;
  kind: AnomalyKind;
  severity: Severity;
  zScore?: number;
  message: string;
  metric: string;
  observed: number;
  baseline?: number;
}
