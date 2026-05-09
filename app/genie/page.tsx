import { GenieChat } from "@/components/GenieChat";
import { genieConfigured } from "@/lib/genie/databricks";
import { SUGGESTED_PROMPTS } from "@/lib/genie/mock";

export const dynamic = "force-dynamic";

export default function GeniePage() {
  const configured = genieConfigured();
  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <header>
        <div className="text-[11px] font-mono uppercase tracking-widest text-ink-dim">
          Natural-language analytics · powered by Databricks AI/BI Genie
        </div>
        <h1 className="text-xl font-semibold">Ask Genie</h1>
        <p className="text-sm text-ink-muted max-w-2xl mt-1">
          Control managers, ops, and risk reviewers can ask questions in plain
          English instead of opening tickets to the data team. Genie writes the
          SQL against the governed lakehouse, runs it, and returns the answer
          with a chart.
        </p>
      </header>
      <div className="flex-1 min-h-[640px]">
        <GenieChat configured={configured} suggestions={SUGGESTED_PROMPTS} />
      </div>
    </div>
  );
}
