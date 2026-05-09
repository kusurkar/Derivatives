export function fmtUsd(v: number, opts: { compact?: boolean } = {}): string {
  const compact = opts.compact ?? true;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (compact) {
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtPnl(v: number): string {
  return (v >= 0 ? "+" : "") + fmtUsd(v);
}

export function fmtNum(v: number, digits = 0): string {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}

export function fmtZ(z: number): string {
  return (z >= 0 ? "+" : "") + z.toFixed(2) + "σ";
}
