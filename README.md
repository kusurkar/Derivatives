# DOTS — Derivatives Ops & Trading Surveillance

A multi-asset trading dashboard. Visualizes traders organized by **desk**
and **region**, across asset classes (**EQ, F&O, Credit, FX, Commodities,
Rates**) and trading **venues**. Builds a synthetic *behavioral profile* per
trader from the last ~83 days of activity and flags anomalies in the most
recent 7 days when behavior deviates from baseline.

The dataset is fully synthetic and seed-deterministic — no external data is
required to run the app.

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
- `/` — overview: KPIs, region split, anomaly counts, desk×asset notional
  heatmap, top anomalies
- `/asset/[code]` — daily notional, top traders, venue mix, desks, anomalies
- `/desk/[id]` — desk KPIs, trend, asset mix, trader table with per-trader
  PnL/anomaly counts, anomaly list
- `/trader/[id]` — synthetic profile vs last-7d radar fingerprint, metric
  table with z-scores, notional/PnL series with ±2.5σ bands, baseline
  asset mix, anomalies

The top **anomaly ticker** scrolls on every page and links each entry to
the relevant trader.

## Layout

```
app/
  layout.tsx            sidebar + ticker + page chrome
  page.tsx              overview
  asset/[code]/page.tsx
  desk/[id]/page.tsx
  trader/[id]/page.tsx
components/
  Sidebar.tsx           regions / desks / asset class nav
  AnomalyTicker.tsx     top marquee, links to trader pages
  Heatmap.tsx           desk × asset notional heatmap
  TimeSeries.tsx        line chart with optional ±σ band
  TraderFingerprint.tsx radar of baseline vs recent
  AnomalyList.tsx
  StatCard.tsx
  SeverityBadge.tsx
lib/
  types.ts
  rng.ts                seeded mulberry32 PRNG
  data.ts               synthetic universe (traders/desks/venues/activity)
  anomaly.ts            profile builder + detector
  format.ts
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
