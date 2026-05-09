interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "up" | "down" | "warn";
}

export function StatCard({ label, value, sub, tone = "neutral" }: StatCardProps) {
  const toneClass =
    tone === "up"
      ? "text-up"
      : tone === "down"
      ? "text-down"
      : tone === "warn"
      ? "text-sev-high"
      : "text-ink";
  return (
    <div className="panel p-4">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted mb-2">
        {label}
      </div>
      <div className={`text-2xl font-mono tabular-nums ${toneClass}`}>{value}</div>
      {sub ? (
        <div className="text-[11px] text-ink-dim font-mono mt-1">{sub}</div>
      ) : null}
    </div>
  );
}
