"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface FingerprintAxis {
  axis: string;
  baseline: number; // 0..1 normalized
  recent: number; // 0..1 normalized
}

export function TraderFingerprint({ data }: { data: FingerprintAxis[] }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#222a44" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#8a93a6", fontSize: 11, fontFamily: "ui-monospace" }}
          />
          <PolarRadiusAxis
            domain={[0, 1]}
            tick={false}
            axisLine={false}
            stroke="#222a44"
          />
          <Radar
            name="Baseline"
            dataKey="baseline"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.18}
          />
          <Radar
            name="Recent (7d)"
            dataKey="recent"
            stroke="#ec4899"
            fill="#ec4899"
            fillOpacity={0.25}
          />
          <Tooltip
            contentStyle={{
              background: "#101526",
              border: "1px solid #222a44",
              fontSize: 12,
            }}
            formatter={(v: number) => v.toFixed(2)}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
