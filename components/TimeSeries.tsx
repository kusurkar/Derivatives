"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

interface Point {
  date: string;
  value: number;
}

interface Props {
  points: Point[];
  color?: string;
  baselineMean?: number;
  baselineStd?: number;
  height?: number;
  yLabel?: string;
}

export function TimeSeries({
  points,
  color = "#06b6d4",
  baselineMean,
  baselineStd,
  height = 200,
  yLabel,
}: Props) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#222a44" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8a93a6", fontSize: 10, fontFamily: "ui-monospace" }}
            tickFormatter={(d: string) => d.slice(5)}
            stroke="#222a44"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#8a93a6", fontSize: 10, fontFamily: "ui-monospace" }}
            stroke="#222a44"
            width={60}
            label={
              yLabel
                ? {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#5b6478",
                    fontSize: 10,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              background: "#101526",
              border: "1px solid #222a44",
              fontSize: 12,
            }}
            labelStyle={{ color: "#8a93a6" }}
          />
          {typeof baselineMean === "number" ? (
            <ReferenceLine
              y={baselineMean}
              stroke="#5b6478"
              strokeDasharray="4 4"
            />
          ) : null}
          {typeof baselineMean === "number" && typeof baselineStd === "number" ? (
            <>
              <ReferenceLine
                y={baselineMean + 2.5 * baselineStd}
                stroke="#ef4444"
                strokeDasharray="2 4"
                opacity={0.5}
              />
              <ReferenceLine
                y={baselineMean - 2.5 * baselineStd}
                stroke="#ef4444"
                strokeDasharray="2 4"
                opacity={0.5}
              />
            </>
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
