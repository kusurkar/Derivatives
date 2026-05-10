"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GenieAnswer } from "@/lib/genie/types";

interface ChatTurn {
  id: string;
  role: "user" | "genie";
  content: string;
  answer?: GenieAnswer;
}

interface Props {
  configured: boolean;
  suggestions: string[];
}

export function GenieChat({ configured, suggestions }: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [hoursSaved, setHoursSaved] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  async function ask(message: string) {
    if (!message.trim() || busy) return;
    const userTurn: ChatTurn = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setTurns((t) => [...t, userTurn]);
    setDraft("");
    setBusy(true);
    try {
      const r = await fetch("/api/genie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const a = (await r.json()) as GenieAnswer;
      if (a.conversationId) setConversationId(a.conversationId);
      if (a.estHoursSaved) setHoursSaved((h) => h + a.estHoursSaved!);
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          role: "genie",
          content: a.text ?? "",
          answer: a,
        },
      ]);
    } catch (e) {
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          role: "genie",
          content: e instanceof Error ? e.message : String(e),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 h-full">
      <div className="panel flex flex-col min-h-0">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                configured ? "bg-up animate-pulse_dot" : "bg-sev-low"
              }`}
            />
            <div className="panel-title">Ask Genie</div>
            <span className="text-[10px] font-mono text-ink-dim">
              {configured ? "live · Databricks" : "demo · local mock"}
            </span>
          </div>
          <div className="text-[11px] text-ink-dim font-mono">
            est. hours saved this session: {hoursSaved.toFixed(1)}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[480px]"
        >
          {turns.length === 0 ? (
            <Welcome onPick={ask} suggestions={suggestions} />
          ) : (
            turns.map((t) => <Turn key={t.id} turn={t} />)
          )}
          {busy ? (
            <div className="flex items-center gap-2 text-ink-dim text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-asset-fx animate-pulse_dot" />
              Genie is thinking…
            </div>
          ) : null}
        </div>

        <form
          className="border-t border-line p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask in plain English — e.g. 'show me volume by MOC orders'"
            className="flex-1 bg-bg-subtle border border-line rounded px-3 py-2 text-sm focus:outline-none focus:border-asset-fx"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="px-4 py-2 rounded bg-asset-fx text-bg text-sm font-semibold disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Suggested Questions</div>
          </div>
          <ul className="p-2 space-y-1">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  onClick={() => ask(s)}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-hover text-ink-muted hover:text-ink"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-4 text-xs text-ink-muted leading-relaxed">
          <div className="panel-title mb-2">How this works</div>
          {configured ? (
            <p>
              Your prompt is forwarded to a Databricks AI/BI Genie space. Genie
              translates the question into SQL against your governed lakehouse
              and returns the answer plus the SQL it ran.
            </p>
          ) : (
            <p>
              This instance has no Databricks credentials configured, so
              questions are answered by a local intent-aware mock that runs SQL
              shapes against the synthetic dataset. Set{" "}
              <code className="text-ink-dim">DATABRICKS_HOST</code>,{" "}
              <code className="text-ink-dim">DATABRICKS_TOKEN</code>, and{" "}
              <code className="text-ink-dim">GENIE_SPACE_ID</code> to connect to
              a real Genie space.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Welcome({
  onPick,
  suggestions,
}: {
  onPick: (q: string) => void;
  suggestions: string[];
}) {
  return (
    <div className="text-center py-8">
      <div className="text-2xl font-semibold mb-2">Ask anything in plain English.</div>
      <p className="text-sm text-ink-muted max-w-lg mx-auto mb-6">
        No SQL, no JIRA ticket to the data team. Get the answer, the SQL, and a
        chart — in seconds, not days.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-line text-ink-muted hover:text-ink hover:border-ink-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Turn({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-asset-fx/15 border border-asset-fx/40 rounded px-3 py-2 max-w-2xl text-sm">
          {turn.content}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-sm whitespace-pre-wrap text-ink">{turn.content}</div>
      {turn.answer?.sql ? (
        <details className="rounded border border-line bg-bg-subtle">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            SQL Genie ran
          </summary>
          <pre className="px-3 py-2 text-[11px] font-mono text-ink overflow-x-auto whitespace-pre">
            {turn.answer.sql}
          </pre>
        </details>
      ) : null}
      {turn.answer?.rows && turn.answer.rows.length > 0 ? (
        <Result answer={turn.answer} />
      ) : null}
    </div>
  );
}

function Result({ answer }: { answer: GenieAnswer }) {
  const cols = answer.columns ?? [];
  const rows = answer.rows ?? [];
  const showChart =
    answer.chart === "bar" || answer.chart === "line" ? answer.chart : null;
  return (
    <div className="rounded border border-line bg-bg-subtle">
      {showChart ? (
        <div className="p-3 h-56">
          <ChartView cols={cols} rows={rows} kind={showChart} />
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-ink-dim border-b border-line">
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 font-mono">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 25).map((r, i) => (
              <tr key={i} className="border-b border-line/60">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-1.5 font-mono tabular-nums ${
                      typeof cell === "number" ? "text-right" : ""
                    }`}
                  >
                    {typeof cell === "number"
                      ? cell.toLocaleString()
                      : String(cell ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 25 ? (
        <div className="px-3 py-1.5 text-[11px] text-ink-dim border-t border-line">
          showing 25 of {rows.length.toLocaleString()} rows
        </div>
      ) : null}
    </div>
  );
}

function ChartView({
  cols,
  rows,
  kind,
}: {
  cols: string[];
  rows: Array<Array<string | number | null>>;
  kind: "bar" | "line";
}) {
  // Identify a label column (first non-numeric) and a numeric value column.
  const labelIdx = cols.findIndex(
    (_, i) => typeof rows[0]?.[i] !== "number"
  );
  const valueIdx = cols.findIndex(
    (_, i) => typeof rows[0]?.[i] === "number"
  );
  if (labelIdx < 0 || valueIdx < 0) return null;
  const data = rows.map((r) => ({
    label: String(r[labelIdx]),
    value: Number(r[valueIdx] ?? 0),
  }));
  if (kind === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#222a44" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a93a6", fontSize: 10, fontFamily: "ui-monospace" }}
            stroke="#222a44"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#8a93a6", fontSize: 10, fontFamily: "ui-monospace" }}
            stroke="#222a44"
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: "#101526",
              border: "1px solid #222a44",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            dot={false}
            strokeWidth={1.6}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#222a44" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#8a93a6", fontSize: 10, fontFamily: "ui-monospace" }}
          stroke="#222a44"
        />
        <YAxis
          tick={{ fill: "#8a93a6", fontSize: 10, fontFamily: "ui-monospace" }}
          stroke="#222a44"
          width={60}
        />
        <Tooltip
          contentStyle={{
            background: "#101526",
            border: "1px solid #222a44",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
