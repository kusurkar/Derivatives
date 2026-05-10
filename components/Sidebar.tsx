import Link from "next/link";
import { ASSET_CLASSES, DESKS, REGIONS } from "@/lib/data";

export function Sidebar() {
  const desksByRegion = REGIONS.map((r) => ({
    region: r,
    desks: DESKS.filter((d) => d.region === r.code),
  }));
  return (
    <aside className="w-64 shrink-0 border-r border-line bg-bg-panel/60 flex flex-col">
      <Link
        href="/"
        className="px-4 py-4 border-b border-line block hover:bg-bg-hover"
      >
        <div className="font-mono text-lg font-bold tracking-widest">DOTS</div>
        <div className="text-[10px] uppercase tracking-widest text-ink-dim">
          Derivatives Ops & Trading Surveillance
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-2 text-sm">
        <Section title="Tools">
          <Link
            href="/genie"
            className="flex items-center gap-2 px-4 py-1.5 hover:bg-bg-hover"
          >
            <span className="w-2 h-2 rounded-full bg-up animate-pulse_dot" />
            <span className="text-ink">Ask Genie</span>
            <span className="ml-auto text-[10px] font-mono text-ink-dim">NL → SQL</span>
          </Link>
        </Section>

        <Section title="Asset Classes">
          {ASSET_CLASSES.map((a) => (
            <Link
              key={a.code}
              href={`/asset/${a.code}`}
              className="flex items-center gap-2 px-4 py-1.5 hover:bg-bg-hover"
            >
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: a.color }}
              />
              <span className="font-mono text-xs text-ink-dim w-14">{a.code}</span>
              <span className="text-ink-muted">{a.name}</span>
            </Link>
          ))}
        </Section>

        <Section title="Desks by Region">
          {desksByRegion.map(({ region, desks }) => (
            <div key={region.code} className="mb-2">
              <div className="px-4 py-1 text-[10px] uppercase tracking-widest text-ink-dim font-mono">
                {region.code}
              </div>
              {desks.map((d) => (
                <Link
                  key={d.id}
                  href={`/desk/${d.id}`}
                  className="flex items-center gap-2 px-6 py-1 hover:bg-bg-hover"
                >
                  <span className="font-mono text-[11px] text-ink-dim w-20 truncate">
                    {d.id}
                  </span>
                  <span className="text-xs text-ink-muted truncate">{d.name}</span>
                </Link>
              ))}
            </div>
          ))}
        </Section>
      </nav>

      <div className="px-4 py-3 border-t border-line text-[10px] text-ink-dim font-mono">
        synthetic data · seed-stable
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-ink-muted font-semibold">
        {title}
      </div>
      {children}
    </div>
  );
}
