import { NextResponse } from "next/server";
import { askGenie, genieConfigured } from "@/lib/genie/databricks";
import { answerFromMock } from "@/lib/genie/mock";
import type { GenieAnswer, GenieRequest } from "@/lib/genie/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: GenieRequest;
  try {
    body = (await req.json()) as GenieRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  let answer: GenieAnswer;
  if (genieConfigured()) {
    answer = await askGenie(message, body.conversationId);
    // If the live call errored, transparently fall back to the mock so the
    // UI still demonstrates the experience.
    if (answer.error) {
      const mock = answerFromMock(message);
      mock.text =
        `(live Genie unreachable: ${answer.error}; showing local mock)\n\n` +
        mock.text;
      answer = mock;
    }
  } else {
    answer = answerFromMock(message);
  }
  return NextResponse.json(answer);
}

export async function GET() {
  return NextResponse.json({
    configured: genieConfigured(),
    suggestions: (await import("@/lib/genie/mock")).SUGGESTED_PROMPTS,
  });
}
