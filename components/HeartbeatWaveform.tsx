import type { HealthDay } from "@/lib/health";
import { fmtDate } from "@/lib/format";

interface Props {
  series: HealthDay[];
  height?: number;
  /** Width is responsive; SVG uses a viewBox. */
  baselineColor?: string;
}

/**
 * Renders an ECG-style waveform across the trader's surveillance window.
 *
 * - On normal days the trace runs as a quiet sinusoid with small P-wave bumps,
 *   amplitude scaled to that day's notional intensity. Quiet = healthy.
 * - On anomaly days the trace runs through a sharp QRS-complex spike
 *   (P → Q dip → R spike → S dip → T bump). Spike height scales with severity;
 *   color is the severity color (yellow → orange → red → pink).
 *
 * The path is pure SVG, server-rendered.
 */
export function HeartbeatWaveform({
  series,
  height = 120,
  baselineColor = "#10b981",
}: Props) {
  if (series.length === 0) return null;

  const PX_PER_DAY = 120;
  const W = series.length * PX_PER_DAY;
  const H = height;
  const midY = H / 2;
  const STEP = 2; // px per sample

  // Build the segments. Each day produces a SegPath. We'll join them all.
  type Segment = { d: string; stroke: string; key: string };
  const segments: Segment[] = [];

  series.forEach((day, di) => {
    const x0 = di * PX_PER_DAY;
    const x1 = x0 + PX_PER_DAY;
    const hasBlip = (day.anomalies?.length ?? 0) > 0 && day.blipColor;
    if (hasBlip) {
      // Quiet lead-in then a QRS complex centered in this day.
      const lead = quietPath(x0, x0 + PX_PER_DAY * 0.35, midY, day.intensity, STEP);
      const sevHeight = severityHeight(day);
      const qrs = qrsPath(
        x0 + PX_PER_DAY * 0.35,
        x0 + PX_PER_DAY * 0.7,
        midY,
        sevHeight
      );
      const tail = quietPath(x0 + PX_PER_DAY * 0.7, x1, midY, day.intensity, STEP);
      // Render the quiet portions in baseline color and the QRS in severity.
      segments.push({
        d: lead,
        stroke: baselineColor,
        key: `${day.date}-lead`,
      });
      segments.push({
        d: qrs,
        stroke: day.blipColor!,
        key: `${day.date}-qrs`,
      });
      segments.push({
        d: tail,
        stroke: baselineColor,
        key: `${day.date}-tail`,
      });
    } else {
      const d = quietPath(x0, x1, midY, day.intensity, STEP);
      segments.push({
        d,
        stroke: baselineColor,
        key: `${day.date}-quiet`,
      });
    }
  });

  // Day axis (subtle vertical guides + labels).
  const guides = series.map((day, di) => {
    const x = di * PX_PER_DAY + PX_PER_DAY / 2;
    const isRest = day.rest;
    return (
      <g key={`g-${day.date}`}>
        {isRest ? (
          <rect
            x={di * PX_PER_DAY}
            y={0}
            width={PX_PER_DAY}
            height={H}
            fill="#0a0e1a"
            opacity={0.6}
          />
        ) : null}
        <line
          x1={di * PX_PER_DAY}
          x2={di * PX_PER_DAY}
          y1={0}
          y2={H}
          stroke="#1e2540"
          strokeWidth={0.5}
          strokeDasharray="2 4"
        />
        <text
          x={x}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="ui-monospace"
          fill={isRest ? "#5b6478" : "#8a93a6"}
        >
          {fmtDate(day.date)}
        </text>
      </g>
    );
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ background: "#0a0e1a" }}
      >
        {/* horizontal isoelectric guide */}
        <line
          x1={0}
          x2={W}
          y1={midY}
          y2={midY}
          stroke="#1e2540"
          strokeWidth={0.5}
        />
        {guides}
        {segments.map((s) => (
          <path
            key={s.key}
            d={s.d}
            fill="none"
            stroke={s.stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${s.stroke}66)` }}
          />
        ))}
      </svg>
    </div>
  );
}

/** Generate a quiet sinusoidal trace with small P-wave bumps. */
function quietPath(
  x0: number,
  x1: number,
  midY: number,
  intensity: number,
  step: number
): string {
  const amp = 2 + 8 * intensity; // small wobble
  const pBumpAmp = 1 + 4 * intensity;
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += step) {
    const t = (x - x0) / (x1 - x0);
    // base sine + intermittent P-wave near each pseudo-cycle
    const base = amp * Math.sin(t * Math.PI * 6);
    const pwave = pBumpAmp * Math.exp(-Math.pow((t - 0.5) * 6, 2));
    const y = midY - (base * 0.4 + pwave);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  if (pts.length === 0) return "";
  return "M " + pts.join(" L ");
}

/** Generate a QRS-complex stroke between x0..x1 with the given height. */
function qrsPath(
  x0: number,
  x1: number,
  midY: number,
  height: number
): string {
  const dx = x1 - x0;
  // Key points (relative t in 0..1):
  //   0.00 isoelectric
  //   0.20 P-wave bump (-h*0.12)
  //   0.35 Q-dip       (+h*0.18)
  //   0.45 R-spike     (-h*1.00)
  //   0.55 S-dip       (+h*0.35)
  //   0.75 T-wave bump (-h*0.20)
  //   1.00 isoelectric
  const ax = (t: number) => x0 + dx * t;
  const ay = (rel: number) => midY - height * rel;
  const pts: Array<[number, number]> = [
    [ax(0.0), ay(0)],
    [ax(0.18), ay(0)],
    [ax(0.22), ay(0.12)],
    [ax(0.28), ay(0)],
    [ax(0.34), ay(-0.18)],
    [ax(0.4), ay(0)],
    [ax(0.45), ay(1.0)],
    [ax(0.5), ay(0)],
    [ax(0.55), ay(-0.35)],
    [ax(0.62), ay(0)],
    [ax(0.72), ay(0.18)],
    [ax(0.78), ay(0.22)],
    [ax(0.84), ay(0)],
    [ax(1.0), ay(0)],
  ];
  return (
    "M " +
    pts
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" L ")
  );
}

function severityHeight(day: HealthDay): number {
  const sev = day.anomalies[0]?.severity;
  // base by severity
  const base =
    sev === "critical"
      ? 48
      : sev === "high"
      ? 38
      : sev === "medium"
      ? 28
      : 20;
  // amplified by stress |z|
  return base + Math.min(20, day.stress * 4);
}
