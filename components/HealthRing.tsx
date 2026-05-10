import { ZONE_COLOR, ZONE_LABEL, type HealthZone } from "@/lib/health";

interface Props {
  score: number;
  zone: HealthZone;
  size?: number;
  thickness?: number;
  caption?: string;
}

export function HealthRing({
  score,
  zone,
  size = 192,
  thickness = 14,
  caption = "Trader Health",
}: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = ZONE_COLOR[zone];
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1e2540"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${color}66)`,
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color }}
        >
          {ZONE_LABEL[zone]}
        </div>
        <div className="text-5xl font-mono tabular-nums leading-none mt-1">
          {Math.round(score)}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-ink-dim mt-1">
          {caption}
        </div>
      </div>
    </div>
  );
}
