import Link from "next/link";
import { ASSET_CLASSES, DESKS } from "@/lib/data";
import { fmtUsd } from "@/lib/format";
import { deskAssetMatrix } from "@/lib/anomaly";
import type { AssetClassCode } from "@/lib/types";

function hexFor(value: number, max: number, baseHex: string): string {
  if (max <= 0 || value <= 0) return "transparent";
  const t = Math.min(1, value / max);
  const alpha = 0.08 + 0.82 * t;
  const r = parseInt(baseHex.slice(1, 3), 16);
  const g = parseInt(baseHex.slice(3, 5), 16);
  const b = parseInt(baseHex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

export function DeskAssetHeatmap() {
  const { notional } = deskAssetMatrix();
  let max = 0;
  for (const desk of DESKS) {
    for (const a of ASSET_CLASSES) {
      max = Math.max(max, notional[desk.id]?.[a.code] ?? 0);
    }
  }
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">Notional · Desk × Asset (90d)</div>
        <div className="text-[11px] text-ink-dim font-mono">color intensity = notional</div>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 font-mono text-ink-dim w-40">Desk</th>
              {ASSET_CLASSES.map((a) => (
                <th
                  key={a.code}
                  className="py-2 px-2 font-mono text-ink-dim text-center"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className="w-2 h-2 rounded-sm mb-1"
                      style={{ background: a.color }}
                    />
                    {a.code}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DESKS.map((desk) => (
              <tr key={desk.id} className="border-t border-line">
                <td className="py-1.5 pr-3">
                  <Link
                    href={`/desk/${desk.id}`}
                    className="block hover:text-ink"
                  >
                    <div className="font-mono text-[11px] text-ink-dim">
                      {desk.region}
                    </div>
                    <div className="text-ink-muted">{desk.name}</div>
                  </Link>
                </td>
                {ASSET_CLASSES.map((a) => {
                  const v = notional[desk.id]?.[a.code] ?? 0;
                  const supports = desk.assetClasses.includes(
                    a.code as AssetClassCode
                  );
                  return (
                    <td
                      key={a.code}
                      className="py-1 px-1 text-center"
                      style={{
                        background: supports ? hexFor(v, max, a.color) : "transparent",
                      }}
                    >
                      <span
                        className={`font-mono tabular-nums ${
                          v > 0 ? "text-ink" : "text-ink-dim"
                        }`}
                      >
                        {v > 0 ? fmtUsd(v) : "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
