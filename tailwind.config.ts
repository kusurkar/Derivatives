import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0e1a",
          panel: "#101526",
          subtle: "#161c2e",
          hover: "#1e2540",
        },
        line: "#222a44",
        ink: {
          DEFAULT: "#e6edf7",
          muted: "#8a93a6",
          dim: "#5b6478",
        },
        asset: {
          eq: "#3b82f6",
          fno: "#a855f7",
          credit: "#f59e0b",
          fx: "#10b981",
          comm: "#f97316",
          rates: "#06b6d4",
        },
        sev: {
          low: "#facc15",
          med: "#fb923c",
          high: "#ef4444",
          crit: "#ec4899",
        },
        up: "#22c55e",
        down: "#ef4444",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      animation: {
        marquee: "marquee 60s linear infinite",
        pulse_dot: "pulse_dot 1.4s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulse_dot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
