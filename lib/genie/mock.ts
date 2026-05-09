import {
  ACTIVITY,
  ASSET_CLASSES,
  DESKS,
  ORDER_TYPES,
  RECENT_DAYS,
  SYNTH_TODAY,
  TRADERS,
  VENUES,
  dateRange,
  getTrader,
} from "@/lib/data";
import type { AssetClassCode, OrderType } from "@/lib/types";
import { detectAll } from "@/lib/anomaly";
import type { GenieAnswer } from "./types";

/**
 * Intent-aware mock for Databricks Genie. Inspects the prompt for keywords
 * that map to a real query against the synthetic ACTIVITY table and returns
 * a result that *looks* like a Genie response (prose + SQL + tabular result).
 *
 * The hypothetical schema we narrate is:
 *
 *   dots.fact_trader_daily (
 *     trade_date            date,
 *     trader_id             string,
 *     asset_class           string,
 *     venue                 string,
 *     order_type            string,
 *     trades                int,
 *     notional_usd          double,
 *     pnl_usd               double,
 *     avg_hour_utc          double
 *   )
 */
const TABLE = "dots.fact_trader_daily";

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

interface Intent {
  match: (q: string) => boolean;
  handle: (q: string) => GenieAnswer;
}

function findOrderType(q: string): OrderType | null {
  const upper = q.toUpperCase();
  // explicit
  for (const ot of ORDER_TYPES) {
    if (upper.includes(ot)) return ot;
  }
  // synonyms
  if (/\bmarket on close\b/i.test(q)) return "MOC";
  if (/\bmarket on open\b/i.test(q)) return "MOO";
  if (/\bauction\b/i.test(q)) return "AUCTION";
  if (/\brequest for quote\b/i.test(q)) return "RFQ";
  if (/\bblock\s+trade/i.test(q)) return "BLOCK";
  return null;
}

function findAsset(q: string): AssetClassCode | null {
  const upper = q.toUpperCase();
  for (const a of ASSET_CLASSES) {
    if (upper.includes(a.code)) return a.code;
  }
  if (/\bequit/i.test(q)) return "EQ";
  if (/\bcredit\b/i.test(q)) return "CREDIT";
  if (/\bfx\b|\bforeign exchange\b/i.test(q)) return "FX";
  if (/\bfutures?\b|\boptions?\b|\bderivative/i.test(q)) return "FNO";
  if (/\bcommodit/i.test(q)) return "COMM";
  if (/\brates?\b|\bbond\b|\btreasur/i.test(q)) return "RATES";
  return null;
}

function isRecent(q: string): boolean {
  return /\b(last|past|this)\s*(week|7\s*d|7\s*days)\b|today|recent/i.test(q);
}

const recentSet = new Set(dateRange(SYNTH_TODAY, RECENT_DAYS));

const intents: Intent[] = [
  // Volume by a specific order type (the demo prompt: MOC).
  {
    match: (q) => /\bvolume\b/i.test(q) && !!findOrderType(q),
    handle: (q) => {
      const ot = findOrderType(q)!;
      const recent = isRecent(q);
      const rows = ACTIVITY.filter(
        (a) => a.orderType === ot && (!recent || recentSet.has(a.date))
      );
      const byAsset = new Map<string, { notional: number; trades: number }>();
      for (const r of rows) {
        const cur = byAsset.get(r.assetClass) ?? { notional: 0, trades: 0 };
        cur.notional += r.notional;
        cur.trades += r.trades;
        byAsset.set(r.assetClass, cur);
      }
      const out = Array.from(byAsset.entries())
        .map(([asset, v]) => [
          asset,
          v.trades,
          Math.round(v.notional),
        ])
        .sort((a, b) => (b[2] as number) - (a[2] as number));
      const total = rows.reduce((s, r) => s + r.notional, 0);
      const window = recent ? `last ${RECENT_DAYS} days` : "last 90 days";
      return {
        text:
          `Across the ${window}, ${ot} orders generated ${fmtMoney(total)} of ` +
          `notional on ${rows.length.toLocaleString()} trader-days. ` +
          `Equities account for the bulk of ${ot} flow as expected — closing ` +
          `auction participation concentrates there.`,
        sql:
          `SELECT asset_class,\n` +
          `       SUM(trades)        AS trades,\n` +
          `       SUM(notional_usd)  AS notional_usd\n` +
          `FROM   ${TABLE}\n` +
          `WHERE  order_type = '${ot}'\n` +
          (recent ? `       AND trade_date >= current_date() - INTERVAL ${RECENT_DAYS} DAYS\n` : "") +
          `GROUP  BY asset_class\n` +
          `ORDER  BY notional_usd DESC;`,
        columns: ["asset_class", "trades", "notional_usd"],
        rows: out,
        chart: "bar",
        mocked: true,
        estHoursSaved: 0.75,
      };
    },
  },
  // Breakdown of all order types.
  {
    match: (q) =>
      /\border\s*type/i.test(q) ||
      /\bbreakdown\b.*\border/i.test(q) ||
      /\bvolume\s+by\s+order\b/i.test(q),
    handle: () => {
      const byType = new Map<string, number>();
      for (const r of ACTIVITY) {
        byType.set(r.orderType, (byType.get(r.orderType) ?? 0) + r.notional);
      }
      const out = Array.from(byType.entries())
        .map(([ot, n]) => [ot, Math.round(n)])
        .sort((a, b) => (b[1] as number) - (a[1] as number));
      return {
        text: `Order-type mix across all desks for the last 90 days. RFQ and MARKET dominate by notional, with MOC concentrated in cash equities.`,
        sql:
          `SELECT order_type,\n` +
          `       SUM(notional_usd) AS notional_usd\n` +
          `FROM   ${TABLE}\n` +
          `GROUP  BY order_type\n` +
          `ORDER  BY notional_usd DESC;`,
        columns: ["order_type", "notional_usd"],
        rows: out,
        chart: "bar",
        mocked: true,
        estHoursSaved: 0.5,
      };
    },
  },
  // Top traders by recent anomaly count.
  {
    match: (q) =>
      /\btop\b.*\b(trader|deviation|anomal)/i.test(q) ||
      /\bbiggest\b.*\banomal/i.test(q),
    handle: () => {
      const counts = new Map<string, number>();
      for (const a of detectAll()) {
        counts.set(a.traderId, (counts.get(a.traderId) ?? 0) + 1);
      }
      const out = Array.from(counts.entries())
        .map(([id, c]) => {
          const t = getTrader(id)!;
          return [t.name, t.deskId, c];
        })
        .sort((a, b) => (b[2] as number) - (a[2] as number))
        .slice(0, 10);
      return {
        text: `Top 10 traders by anomaly count over the last ${RECENT_DAYS} days. These are the traders whose recent behavior deviates most from their synthetic baseline profile.`,
        sql:
          `WITH recent AS (\n` +
          `  SELECT * FROM dots.dim_anomaly\n` +
          `  WHERE detected_date >= current_date() - INTERVAL ${RECENT_DAYS} DAYS\n` +
          `)\n` +
          `SELECT t.full_name, t.desk_id, COUNT(*) AS anomalies\n` +
          `FROM   recent r\n` +
          `JOIN   dots.dim_trader t ON t.trader_id = r.trader_id\n` +
          `GROUP  BY t.full_name, t.desk_id\n` +
          `ORDER  BY anomalies DESC\n` +
          `LIMIT  10;`,
        columns: ["trader", "desk", "anomalies"],
        rows: out,
        chart: "bar",
        mocked: true,
        estHoursSaved: 1.0,
      };
    },
  },
  // Volume / pnl for a specific asset class.
  {
    match: (q) => !!findAsset(q) && /\bvolume|notional|pnl|p&l/i.test(q),
    handle: (q) => {
      const asset = findAsset(q)!;
      const recent = isRecent(q);
      const rows = ACTIVITY.filter(
        (a) => a.assetClass === asset && (!recent || recentSet.has(a.date))
      );
      const byDate = new Map<string, { notional: number; pnl: number }>();
      for (const r of rows) {
        const cur = byDate.get(r.date) ?? { notional: 0, pnl: 0 };
        cur.notional += r.notional;
        cur.pnl += r.pnl;
        byDate.set(r.date, cur);
      }
      const out = Array.from(byDate.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, v]) => [date, Math.round(v.notional), Math.round(v.pnl)]);
      const totalN = rows.reduce((s, r) => s + r.notional, 0);
      const totalP = rows.reduce((s, r) => s + r.pnl, 0);
      const window = recent ? `last ${RECENT_DAYS} days` : "last 90 days";
      return {
        text: `${asset} flow over the ${window}: ${fmtMoney(totalN)} notional with ${fmtMoney(totalP)} PnL across ${rows.length.toLocaleString()} trader-days.`,
        sql:
          `SELECT trade_date,\n` +
          `       SUM(notional_usd) AS notional_usd,\n` +
          `       SUM(pnl_usd)      AS pnl_usd\n` +
          `FROM   ${TABLE}\n` +
          `WHERE  asset_class = '${asset}'\n` +
          (recent ? `       AND trade_date >= current_date() - INTERVAL ${RECENT_DAYS} DAYS\n` : "") +
          `GROUP  BY trade_date\n` +
          `ORDER  BY trade_date;`,
        columns: ["trade_date", "notional_usd", "pnl_usd"],
        rows: out,
        chart: "line",
        mocked: true,
        estHoursSaved: 0.5,
      };
    },
  },
  // Off-hours trading.
  {
    match: (q) => /\boff[\s-]?hours?\b|\bunusual hours?\b/i.test(q),
    handle: () => {
      const offs = detectAll().filter((a) => a.kind === "OFF_HOURS");
      const rows = offs.map((a) => {
        const t = getTrader(a.traderId)!;
        return [a.date, t.name, t.deskId, a.message];
      });
      return {
        text: `${offs.length} off-hours trading anomalies detected in the last ${RECENT_DAYS} days. These are days where a trader's volume-weighted average trading hour deviated >3σ from their personal baseline.`,
        sql:
          `SELECT a.detected_date, t.full_name, t.desk_id, a.message\n` +
          `FROM   dots.dim_anomaly a\n` +
          `JOIN   dots.dim_trader  t USING (trader_id)\n` +
          `WHERE  a.kind = 'OFF_HOURS'\n` +
          `       AND a.detected_date >= current_date() - INTERVAL ${RECENT_DAYS} DAYS\n` +
          `ORDER  BY a.detected_date DESC;`,
        columns: ["date", "trader", "desk", "detail"],
        rows,
        chart: "table",
        mocked: true,
        estHoursSaved: 1.5,
      };
    },
  },
  // New venues this week.
  {
    match: (q) => /\bnew\s+venue/i.test(q),
    handle: () => {
      const news = detectAll().filter((a) => a.kind === "NEW_VENUE");
      const rows = news.map((a) => {
        const t = getTrader(a.traderId)!;
        return [a.date, t.name, t.deskId, a.message];
      });
      return {
        text: `${news.length} traders touched a venue in the last ${RECENT_DAYS} days that did not appear anywhere in their 83-day baseline.`,
        sql:
          `SELECT a.detected_date, t.full_name, t.desk_id, a.message\n` +
          `FROM   dots.dim_anomaly a\n` +
          `JOIN   dots.dim_trader  t USING (trader_id)\n` +
          `WHERE  a.kind = 'NEW_VENUE'\n` +
          `       AND a.detected_date >= current_date() - INTERVAL ${RECENT_DAYS} DAYS;`,
        columns: ["date", "trader", "desk", "detail"],
        rows,
        chart: "table",
        mocked: true,
        estHoursSaved: 1.0,
      };
    },
  },
];

const fallbackPrompts = [
  "Show me volume by MOC orders",
  "Breakdown by order type for last 7 days",
  "Top traders by anomaly count this week",
  "EQ notional last 7 days",
  "Off-hours trading flagged this week",
  "New venues this week",
];

export function answerFromMock(question: string): GenieAnswer {
  for (const intent of intents) {
    if (intent.match(question)) return intent.handle(question);
  }
  return {
    text:
      `I couldn't map that question to one of the intents I currently know. ` +
      `In demo (mock) mode I can answer questions about volume by order type, ` +
      `volume / PnL by asset class, top traders by anomaly count, off-hours ` +
      `trading, and new venues. Try one of the suggestions below.\n\n` +
      `Tables I have visibility into in this space:\n` +
      `  • ${TABLE} — daily trader × asset × venue × order_type aggregates\n` +
      `  • dots.dim_trader, dots.dim_desk, dots.dim_venue\n` +
      `  • dots.dim_anomaly — detected behavioral anomalies`,
    mocked: true,
    chart: "table",
    estHoursSaved: 0,
  };
}

export const SUGGESTED_PROMPTS = fallbackPrompts;

// Light reference to suppress unused-import warnings if a downstream lint
// flags imports we keep around for type/runtime parity.
void TRADERS;
void DESKS;
void VENUES;
