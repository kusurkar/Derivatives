import type { Severity } from "@/lib/types";

const styles: Record<Severity, string> = {
  low: "bg-sev-low/15 text-sev-low border-sev-low/40",
  medium: "bg-sev-med/15 text-sev-med border-sev-med/40",
  high: "bg-sev-high/15 text-sev-high border-sev-high/40",
  critical: "bg-sev-crit/20 text-sev-crit border-sev-crit/50",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`chip border ${styles[severity]}`}
      aria-label={`${severity} severity`}
    >
      {severity}
    </span>
  );
}

export function severityDotColor(s: Severity): string {
  return {
    low: "#facc15",
    medium: "#fb923c",
    high: "#ef4444",
    critical: "#ec4899",
  }[s];
}
