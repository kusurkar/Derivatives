import type { GenieAnswer } from "./types";

/**
 * Minimal client for the Databricks AI/BI Genie conversations REST API.
 *
 * Requires three env vars:
 *   DATABRICKS_HOST        e.g. https://<workspace>.cloud.databricks.com
 *   DATABRICKS_TOKEN       a PAT or service-principal token (Bearer)
 *   GENIE_SPACE_ID         the Genie space id to query
 */
export function genieConfigured(): boolean {
  return !!(
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_TOKEN &&
    process.env.GENIE_SPACE_ID
  );
}

interface AttachmentText {
  attachment_id: string;
  text?: { content: string };
}
interface AttachmentQuery {
  attachment_id: string;
  query?: { query: string; description?: string };
}
type Attachment = AttachmentText & AttachmentQuery;

interface MessagePoll {
  status: string;
  attachments?: Attachment[];
  content?: string;
  error?: { error?: string };
}

const TERMINAL = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "EXECUTING_QUERY_FAILED",
  "ERROR",
]);

async function dbxFetch(path: string, init?: RequestInit): Promise<Response> {
  const host = process.env.DATABRICKS_HOST!.replace(/\/$/, "");
  const r = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return r;
}

async function startOrContinue(
  message: string,
  conversationId?: string
): Promise<{ conversationId: string; messageId: string }> {
  const space = process.env.GENIE_SPACE_ID!;
  const path = conversationId
    ? `/api/2.0/genie/spaces/${space}/conversations/${conversationId}/messages`
    : `/api/2.0/genie/spaces/${space}/start-conversation`;
  const r = await dbxFetch(path, {
    method: "POST",
    body: JSON.stringify({ content: message }),
  });
  if (!r.ok) {
    throw new Error(`Genie ${r.status}: ${await r.text()}`);
  }
  const j = (await r.json()) as {
    conversation_id?: string;
    message_id?: string;
    message?: { id?: string };
  };
  const cid = j.conversation_id ?? conversationId!;
  const mid = j.message_id ?? j.message?.id;
  if (!cid || !mid) throw new Error("Genie response missing ids");
  return { conversationId: cid, messageId: mid };
}

async function pollMessage(
  conversationId: string,
  messageId: string,
  maxMs = 90_000
): Promise<MessagePoll> {
  const space = process.env.GENIE_SPACE_ID!;
  const start = Date.now();
  let last: MessagePoll = { status: "PENDING" };
  while (Date.now() - start < maxMs) {
    const r = await dbxFetch(
      `/api/2.0/genie/spaces/${space}/conversations/${conversationId}/messages/${messageId}`
    );
    if (!r.ok) throw new Error(`Genie poll ${r.status}: ${await r.text()}`);
    last = (await r.json()) as MessagePoll;
    if (TERMINAL.has(last.status)) return last;
    await new Promise((res) => setTimeout(res, 1500));
  }
  return last;
}

interface QueryResultPayload {
  statement_response?: {
    result?: { data_array?: Array<Array<string | number | null>> };
    manifest?: {
      schema?: { columns?: Array<{ name: string }> };
    };
  };
}

async function fetchQueryResult(
  conversationId: string,
  messageId: string,
  attachmentId: string
): Promise<{ columns: string[]; rows: Array<Array<string | number | null>> }> {
  const space = process.env.GENIE_SPACE_ID!;
  const r = await dbxFetch(
    `/api/2.0/genie/spaces/${space}/conversations/${conversationId}/messages/${messageId}/query-result/${attachmentId}`
  );
  if (!r.ok) throw new Error(`Genie result ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as QueryResultPayload;
  const columns =
    j.statement_response?.manifest?.schema?.columns?.map((c) => c.name) ?? [];
  const rows = j.statement_response?.result?.data_array ?? [];
  return { columns, rows };
}

export async function askGenie(
  message: string,
  conversationId?: string
): Promise<GenieAnswer> {
  try {
    const { conversationId: cid, messageId } = await startOrContinue(
      message,
      conversationId
    );
    const polled = await pollMessage(cid, messageId);
    if (polled.status !== "COMPLETED") {
      return {
        text:
          polled.error?.error ??
          `Genie returned status ${polled.status} without completing.`,
        mocked: false,
        conversationId: cid,
        error: polled.status,
      };
    }
    const text =
      (polled.attachments ?? [])
        .map((a) => a.text?.content)
        .filter(Boolean)
        .join("\n\n") ||
      polled.content ||
      "";
    const queryAttachment = (polled.attachments ?? []).find((a) => a.query);
    let sql: string | undefined;
    let columns: string[] | undefined;
    let rows: Array<Array<string | number | null>> | undefined;
    if (queryAttachment) {
      sql = queryAttachment.query?.query;
      try {
        const qr = await fetchQueryResult(
          cid,
          messageId,
          queryAttachment.attachment_id
        );
        columns = qr.columns;
        rows = qr.rows;
      } catch (e) {
        // Result fetch failed — still return the SQL and prose.
      }
    }
    return {
      text,
      sql,
      columns,
      rows,
      chart: rows && rows.length > 1 ? "bar" : "table",
      conversationId: cid,
      mocked: false,
      estHoursSaved: 0.5,
    };
  } catch (e: unknown) {
    return {
      text: e instanceof Error ? e.message : String(e),
      mocked: false,
      error: "request_failed",
    };
  }
}
