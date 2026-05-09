import Link from "next/link";

/**
 * Reframes DOTS as solving a quantifiable business problem: control-function
 * analysts spend the majority of their time wrangling data instead of doing
 * the actual review. Numbers below are illustrative defaults — replace with
 * your org's measured values from time-tracking or workflow surveys.
 */
const STAT_HEADCOUNT = 120; // analysts in scope
const HOURS_PER_REQ = 1.6; // typical bank ad-hoc data request
const REQS_PER_WEEK_PER_ANALYST = 6;
const PCT_TIME_ON_DATA_PREP = 0.66; // industry surveys, ~60–70%

const totalHoursPerWeek = STAT_HEADCOUNT * REQS_PER_WEEK_PER_ANALYST * HOURS_PER_REQ;
const annualisedHours = totalHoursPerWeek * 50;
const annualisedFte = (annualisedHours / 1800).toFixed(0); // ~1800 productive hrs / FTE

export function StoryHero() {
  return (
    <section className="panel overflow-hidden">
      <div className="grid md:grid-cols-[1.4fr_1fr]">
        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-line">
          <div className="text-[11px] font-mono uppercase tracking-widest text-asset-fx mb-2">
            Why DOTS
          </div>
          <h2 className="text-2xl font-semibold leading-tight mb-3">
            Control managers spend most of their week chasing data, not
            reviewing risk.
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-4">
            Industry surveys consistently put{" "}
            <span className="text-ink font-semibold">
              {Math.round(PCT_TIME_ON_DATA_PREP * 100)}% of analyst time
            </span>{" "}
            on data preparation and ad-hoc lookups — pulling positions,
            reconciling venues, slicing PnL by trader, asset, or order type.
            Each request is a JIRA ticket to the data team and a 1–3 day
            round-trip.
          </p>
          <p className="text-sm text-ink-muted leading-relaxed">
            DOTS pairs continuous, profile-based anomaly surveillance with a{" "}
            <Link href="/genie" className="text-asset-fx hover:underline">
              Databricks Genie
            </Link>{" "}
            chat surface. The dashboard surfaces what looks off; Genie answers
            the follow-up question — in English, not SQL — without queueing a
            data-team ticket.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/genie"
              className="px-4 py-2 rounded bg-asset-fx text-bg text-sm font-semibold"
            >
              Try Ask Genie →
            </Link>
            <span className="px-4 py-2 rounded border border-line text-xs text-ink-muted self-center">
              e.g. <span className="font-mono text-ink">"show me volume by MOC orders"</span>
            </span>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-bg-subtle/40">
          <div className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
            The Burden · illustrative
          </div>
          <ul className="space-y-4">
            <Stat
              label="Analysts in control function"
              value={STAT_HEADCOUNT.toLocaleString()}
            />
            <Stat
              label="Avg ad-hoc data requests / analyst / week"
              value={REQS_PER_WEEK_PER_ANALYST.toString()}
            />
            <Stat
              label="Hours per request (queue + back-and-forth)"
              value={`${HOURS_PER_REQ.toFixed(1)}h`}
            />
            <Stat
              label="Hours / week burned on data plumbing"
              value={`${totalHoursPerWeek.toLocaleString()}h`}
              tone="warn"
            />
            <Stat
              label="Annualised (~FTE-equivalent)"
              value={`${annualisedFte} FTE`}
              tone="warn"
            />
          </ul>
          <p className="text-[11px] text-ink-dim mt-5 leading-relaxed">
            Defaults are placeholders. Replace with your own time-tracking data
            in <code className="text-ink-dim">components/StoryHero.tsx</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <li>
      <div className="text-[11px] uppercase tracking-widest text-ink-dim">
        {label}
      </div>
      <div
        className={`text-xl font-mono tabular-nums ${
          tone === "warn" ? "text-sev-high" : "text-ink"
        }`}
      >
        {value}
      </div>
    </li>
  );
}
