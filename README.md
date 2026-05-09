# DOTS — Derivatives Ops & Trading Surveillance

A multi-asset trading surveillance dashboard with a Databricks Genie
chat surface for natural-language analytics.

## The story

Industry surveys consistently put **60–70% of control-function analyst
time** on data preparation and ad-hoc data lookups — pulling positions,
reconciling venues, slicing PnL by trader, asset class, or order type.
Each ad-hoc request is a JIRA ticket to the data team and a 1–3 day round
trip. At a 120-analyst control function this works out to thousands of
hours per week; an FTE-equivalent loss measured in dozens.

DOTS pairs two ideas:

1. **Continuous, profile-based surveillance** — visualize traders by
   desk × region × asset class × venue × order type, build a per-trader
   behavioral baseline (the *synthetic profile*), and flag deviations.
2. **Ask Genie** — a chat surface backed by Databricks AI/BI Genie. Control
   managers ask in plain English ("show me volume by MOC orders"); Genie
   writes the SQL against the governed lakehouse, runs it, and returns the
   answer plus a chart. No ticket, no SQL, seconds instead of days.

The dashboard's synthetic dataset is fully deterministic — no external
data is required to run it. Genie answers fall back to a local
intent-aware mock when Databricks credentials are not configured, so the
demo always works.

## Stack

- Next.js 14 (App Router) + TypeScript + React 18
- Tailwind CSS 3
- Recharts 2 for charts (radar, line, reference bands)

Pure static site: synthetic data + anomaly detection are computed at build
time. All pages are SSG.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # produces an optimized static build
npm run typecheck
```

### Connecting to a real Databricks Genie space

The Genie chat works out of the box against a local mock. To wire it up to
a real Databricks AI/BI Genie space, set three env vars (in
`.env.local` or your deployment platform):

```
DATABRICKS_HOST=https://<workspace>.cloud.databricks.com
DATABRICKS_TOKEN=<PAT or service-principal token>
GENIE_SPACE_ID=<genie space id>
```

The token needs `CAN USE` on the Genie space and read access to the
underlying tables. The expected schema the prompts and mock are written
against:

```
dots.fact_trader_daily(
  trade_date    DATE,
  trader_id     STRING,
  asset_class   STRING,    -- EQ | FNO | CREDIT | FX | COMM | RATES
  venue         STRING,
  order_type    STRING,    -- MARKET | LIMIT | MOC | MOO | VWAP | TWAP | BLOCK | RFQ | AUCTION
  trades        BIGINT,
  notional_usd  DOUBLE,
  pnl_usd       DOUBLE,
  avg_hour_utc  DOUBLE
)
dots.dim_trader(trader_id, full_name, desk_id, region, seniority, started_at)
dots.dim_desk(desk_id, name, region)
dots.dim_venue(venue_code, name, region)
dots.dim_anomaly(detected_date, trader_id, kind, severity, z_score, message)
```

If a live Genie call fails for any reason, the API route transparently
falls back to the local mock so the UI still works.

## What it does

### Synthetic data
`lib/data.ts` deterministically generates:
- 13 desks across 3 regions, 19 venues, 44 traders
- 90 days of weekday daily trader–asset–venue activity (notional, trades,
  PnL, time-of-day)
- Each trader has stable per-asset and per-venue tendencies plus a seniority-
  weighted activity scale
- A subset of traders receive injected anomalies in the last 7 days
  (volume spike, off-hours, new venue, PnL tail, asset drift) so the
  detector has something to find

### Synthetic profile
`lib/anomaly.ts` rolls each trader's *baseline* window into per-day totals
and computes mean/σ for: trades, notional, PnL, average trading hour,
distinct venues. It also computes baseline asset and venue mixes.

### Anomaly detection (statistical)
For each day in the last 7 days, the detector flags:
- `VOLUME_SPIKE` / `VOLUME_DROP` — z-score on daily notional ≥ 2.5
- `TRADE_COUNT_SPIKE` — z on daily trade count
- `PNL_TAIL` — z on daily PnL ≤ −2.5 (loss tail)
- `OFF_HOURS` — z on weighted trading hour ≥ 3
- `NEW_VENUE` — venue traded today not seen in baseline
- `ASSET_DRIFT` — ≥15% of daily notional in an asset whose baseline share <5%

Severity buckets by |z|: low (≥2.5) · medium (≥2.5) · high (≥3.5) ·
critical (≥5).

### Pages
- `/` — story hero, KPIs, region split, anomaly counts, desk×asset
  notional heatmap, top anomalies
- `/genie` — natural-language chat: prompt → Genie SQL → answer + chart,
  with suggested questions and a session "hours saved" counter
- `/asset/[code]` — daily notional, top traders, venue mix, desks, anomalies
- `/desk/[id]` — desk KPIs, trend, asset mix, trader table with per-trader
  PnL/anomaly counts, anomaly list
- `/trader/[id]` — synthetic profile vs last-7d radar fingerprint, metric
  table with z-scores, notional/PnL series with ±2.5σ bands, baseline
  asset mix, anomalies

The top **anomaly ticker** scrolls on every page and links each entry to
the relevant trader.

### Mock-mode intents
Without Databricks credentials, the API route routes prompts through a
local intent matcher in `lib/genie/mock.ts`. Currently handled:

- `volume by <ORDER_TYPE>` (e.g. MOC, RFQ, BLOCK, VWAP)
- `breakdown / volume by order type`
- `top traders by anomaly count`
- `<asset class> volume / pnl [last week]`
- `off-hours trading`
- `new venues`

Anything outside these intents returns a helpful catalog of available
dimensions and a fresh batch of suggested prompts.

## Layout

```
app/
  layout.tsx            sidebar + ticker + page chrome
  page.tsx              overview (with story hero)
  genie/page.tsx        natural-language chat
  api/genie/route.ts    POST handler: real Genie or mock
  asset/[code]/page.tsx
  desk/[id]/page.tsx
  trader/[id]/page.tsx
components/
  Sidebar.tsx           tools / regions / desks / asset class nav
  AnomalyTicker.tsx     top marquee, links to trader pages
  StoryHero.tsx         data-burden narrative on overview
  GenieChat.tsx         chat UI w/ SQL drawer + chart + table
  Heatmap.tsx           desk × asset notional heatmap
  TimeSeries.tsx        line chart with optional ±σ band
  TraderFingerprint.tsx radar of baseline vs recent
  AnomalyList.tsx
  StatCard.tsx
  SeverityBadge.tsx
lib/
  types.ts
  rng.ts                seeded mulberry32 PRNG
  data.ts               synthetic universe (incl. order_type)
  anomaly.ts            profile builder + detector
  format.ts
  genie/
    types.ts            unified GenieAnswer shape
    databricks.ts       Genie REST client (start/poll/result)
    mock.ts             intent matcher → SQL + computed result
```

## Design notes / next steps

Deferred from v1:

- **Peer similarity**: cosine similarity over fingerprint vectors, "compare
  N traders" view, k-means trader archetypes
- **Real data ingestion**: swap `lib/data.ts` for a loader against a parquet
  / Postgres / kdb feed; everything downstream is structured so this is a
  drop-in replacement
- **ML detection layer**: Isolation Forest or one-class SVM in addition to
  z-score rules
- **Acknowledgement workflow**: mark anomalies reviewed/false-positive and
  persist
- **Alerting**: webhook/Slack when severity ≥ high
- **Time-of-day heatmap** per trader
- **Drill-down by venue** as a first-class entity

## Notes on seed stability

Synthetic "today" is fixed at `SYNTH_TODAY` in `lib/data.ts` and the PRNG
seed is fixed in the same file, so every build of the same code yields the
exact same dataset and anomaly list.
