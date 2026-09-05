# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server on http://localhost:3000
- `npm run build` — production build (SSGs every dynamic route; currently ~140 pages)
- `npm run start` — serve a built app
- `npm run typecheck` — `tsc --noEmit`; run this after any lib/type change instead of a full build
- `npm run lint` — Next.js ESLint

No test framework is set up. Verification is done by typecheck + `next build` + spot-checking rendered pages with `curl` against `next dev`.

## Route architecture

Two route groups sit under `app/`:

- **`app/(dashboard)/`** — everything that renders with the sidebar + top anomaly ticker. Its `layout.tsx` provides that chrome. All the "normal" pages live here (`/`, `/asset/[code]`, `/desk/[id]`, `/trader/[id]`, `/system/[id]`, `/systems`, `/genie`).
- **`app/trader/[id]/health/`** and **`app/system/[id]/health/`** — fullscreen "wall display" variants that live *outside* the `(dashboard)` group so they inherit only the minimal root layout (no sidebar, no ticker). Designed for TVs on the control floor.

Adding a page that needs the sidebar → put it under `(dashboard)/`. Adding a fullscreen page → put it at the app root (or in a new `(fullscreen)` group if that grows).

The overview page (`app/(dashboard)/page.tsx`) is URL-driven via `?focus=systems`; the two focuses (`traders` / `systems`) render completely different bodies but share the same header and story hero.

## Entity health as a shared shape

`TraderHealth` in `lib/health.ts` is the canonical shape: `{ score, zone, components, series, anomalies, daysSinceAnomaly, vitals, traderId }`. Because TypeScript is structural, three separate builders all produce this same shape and therefore feed the same rendering components:

- `buildHealth(traderId)` in `lib/health.ts`
- `buildSystemHealth(systemId)` in `lib/systemHealth.ts` — vitals reframed as throughput / p99 / error rate / uptime; `traderId` field carries the system id
- `buildDeskHealth(deskId)` in `lib/deskHealth.ts` — aggregates trader healths on a desk (mean composite score, mean components, per-day intensity mean + max stress, union anomalies); adds bonus fields `zoneCounts` and `worstTrader`

The visual components (`HealthRing`, `HeartbeatWaveform`, `VitalTile`, `RhythmBars`, `HealthBand`) accept this shape and don't know or care which entity produced it. When adding a new entity type with the health metaphor, produce a `TraderHealth` and pass it into `HealthBand` with an appropriate `name`, `wallHref`, `title`, and `summaryFn`.

The ECG waveform (`components/HeartbeatWaveform.tsx`) is pure SVG paths built on the server — no client JS, no chart library. Baseline days are a quiet sinusoid whose amplitude scales with that day's activity intensity; anomaly days interpolate through a QRS-complex spike whose height and color reflect severity.

## Synthetic data model

All data is seed-deterministic and computed once per Node process at module load. Two independent generators, both keyed off a fixed `SYNTH_TODAY`:

- `lib/data.ts` — desks, regions, venues, 44 traders, 90 weekdays of `DailyActivity` per trader × asset × venue × orderType, with per-trader tendencies (asset mix, venue mix, client share, cancel rate) and injected trader-level anomalies in the last 7 days
- `lib/systems.ts` — 16 real-vendor-named systems across 7 categories including ADS (Authoritative Data Store) and staged via `STAGE_FOR_CATEGORY` into the pipeline `Origination → Booking/Pricing → ADS → Downstream`, with 90 days of `SystemMetricDay` (throughput, p50/p99, error rate, uptime) and injected system incidents

Detection (`lib/anomaly.ts`, `detectSystemIncidents` in `lib/systemHealth.ts`) uses z-scores of recent vs baseline plus hard rules (uptime < 99%, error ≥ 2%, new venue not in baseline, asset drift, off-hours). Baseline window excludes the most recent 7 days.

When adding a new dimension to `DailyActivity`, update the three activity `push()` sites in `lib/data.ts` (the normal loop, and both injected-anomaly branches `new_venue` and `asset_drift`) or the seed will fail to typecheck.

## Genie integration

`/api/genie` (route in `app/api/genie/route.ts`) handles natural-language questions with two backends behind one interface:

- **Live**: `lib/genie/databricks.ts` — full Databricks AI/BI Genie flow (start-conversation → poll message → fetch query-result) when `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `GENIE_SPACE_ID` are set. Live errors fall back transparently to the mock so the UI always works.
- **Mock**: `lib/genie/mock.ts` — an intent matcher against the synthetic dataset. Adding a new demo intent = a new entry in the `intents` array with a `match` predicate and `handle` returning a `GenieAnswer` (prose + SQL + tabular result); the SQL is narrated against a hypothetical `dots.fact_trader_daily` schema.

## Sidebar navigation

`components/Sidebar.tsx` is the only place navigation is declared. It groups: Tools (Ask Genie, Systems Health), Asset Classes, Desks by Region. Systems are intentionally *not* enumerated in the sidebar — `/systems` and the Systems focus on the overview are the entry points.
