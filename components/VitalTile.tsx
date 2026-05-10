import { ZONE_COLOR, type HealthZone } from "@/lib/health";

interface Props {
  label: string;
  value: string;
  sub: string;
  zone: HealthZone;
}

export function VitalTile({ label, value, sub, zone }: Props) {
  const color = ZONE_COLOR[zone];
  return (
    <div
      className="panel p-4 relative overflow-hidden"
      style={{
        boxShadow: `inset 4px 0 0 ${color}`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">
        {label}
      </div>
      <div
        className="text-2xl font-mono tabular-nums mt-1"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-ink-dim font-mono mt-1">{sub}</div>
    </div>
  );
}
