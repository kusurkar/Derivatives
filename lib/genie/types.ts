/**
 * Unified response shape for a Genie answer, regardless of whether it came
 * from a real Databricks Genie space or the local mock.
 */
export interface GenieAnswer {
  /** Free-form prose summary Genie produced. */
  text: string;
  /** SQL Genie wrote (if any). */
  sql?: string;
  /** Tabular result (if any). */
  columns?: string[];
  rows?: Array<Array<string | number | null>>;
  /** Suggested viz hint. */
  chart?: "table" | "bar" | "line";
  /** Conversation id for follow-up turns. */
  conversationId?: string;
  /** True if served from the mock. */
  mocked: boolean;
  /** Approximate time saved by not having an analyst do this manually, hours. */
  estHoursSaved?: number;
  /** Error string if the call failed. */
  error?: string;
}

export interface GenieRequest {
  message: string;
  conversationId?: string;
}
