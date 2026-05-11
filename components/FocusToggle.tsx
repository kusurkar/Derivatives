import Link from "next/link";

export type Focus = "traders" | "systems";

interface Props {
  active: Focus;
  /** Optional counts to render on each tab. */
  traderCount?: number;
  systemCount?: number;
}

export function FocusToggle({ active, traderCount, systemCount }: Props) {
  return (
    <div className="inline-flex rounded-md border border-line bg-bg-panel p-1">
      <Tab
        href="/"
        active={active === "traders"}
        accent="#facc15"
        label="Traders"
        count={traderCount}
      />
      <Tab
        href="/?focus=systems"
        active={active === "systems"}
        accent="#0ea5e9"
        label="Systems"
        count={systemCount}
      />
    </div>
  );
}

function Tab({
  href,
  active,
  accent,
  label,
  count,
}: {
  href: string;
  active: boolean;
  accent: string;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={
        "px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest transition-colors " +
        (active
          ? "text-ink"
          : "text-ink-dim hover:text-ink-muted")
      }
      style={
        active
          ? {
              background: `${accent}1f`,
              boxShadow: `inset 0 0 0 1px ${accent}50`,
              color: accent,
            }
          : undefined
      }
    >
      <span className="inline-flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: accent }}
        />
        {label}
        {typeof count === "number" ? (
          <span className="text-ink-dim">({count})</span>
        ) : null}
      </span>
    </Link>
  );
}
