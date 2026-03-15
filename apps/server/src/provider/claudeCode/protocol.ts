export interface ClaudeCodeStreamJsonLine {
  readonly raw: Record<string, unknown>;
  readonly kind:
    | "assistant-delta"
    | "assistant-message"
    | "result"
    | "warning"
    | "error"
    | "session"
    | "plan"
    | "unknown";
  readonly textDelta?: string;
  readonly message?: string;
  readonly sessionId?: string;
  readonly model?: string;
  readonly usage?: unknown;
  readonly stopReason?: string | null;
  readonly plan?: ReadonlyArray<{ step: string; status: "pending" | "inProgress" | "completed" }>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): ReadonlyArray<unknown> | undefined {
  return Array.isArray(value) ? value : undefined;
}

function extractTextDelta(raw: Record<string, unknown>): string | undefined {
  const messageContent = asArray(asObject(raw.message)?.content);
  const firstMessageText = messageContent
    ?.map((entry) => asObject(entry))
    .map((entry) => asString(entry?.text))
    .find((entry) => entry !== undefined);
  const nestedEvent = asObject(raw.event);
  const nestedDelta = asObject(nestedEvent?.delta);
  const nestedContentBlock = asObject(nestedEvent?.content_block);
  return (
    asString(raw.delta) ??
    asString(raw.text) ??
    asString(raw.content) ??
    asString(asObject(raw.message)?.delta) ??
    asString(asObject(raw.message)?.text) ??
    firstMessageText ??
    asString(asObject(raw.content_block)?.text) ??
    asString(asObject(raw.contentBlock)?.text) ??
    asString(nestedDelta?.text) ??
    asString(nestedContentBlock?.text)
  );
}

function extractPlan(
  raw: Record<string, unknown>,
): ReadonlyArray<{ step: string; status: "pending" | "inProgress" | "completed" }> | undefined {
  const plan = raw.plan;
  if (!Array.isArray(plan)) return undefined;
  const parsed = plan
    .map((entry) => {
      const record = asObject(entry);
      const step = asString(record?.step);
      if (!step) return null;
      const status: "pending" | "inProgress" | "completed" =
        record?.status === "completed" || record?.status === "inProgress"
          ? record.status
          : "pending";
      return { step, status };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  return parsed.length > 0 ? parsed : undefined;
}

export function parseClaudeCodeStreamJsonLine(line: string): ClaudeCodeStreamJsonLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const raw = JSON.parse(trimmed) as Record<string, unknown>;
    const type = asString(raw.type)?.toLowerCase();
    const subtype = asString(raw.subtype)?.toLowerCase();
    const event = asObject(raw.event);
    const eventType = asString(event?.type)?.toLowerCase();
    const textDelta = extractTextDelta(raw);
    const plan = extractPlan(raw);

    if (plan) {
      return { raw, kind: "plan", plan };
    }
    if (type === "error" || raw.error !== undefined) {
      return {
        raw,
        kind: "error",
        message: asString(asObject(raw.error)?.message) ?? asString(raw.message) ?? "Claude error",
      };
    }
    if (type === "warning") {
      return { raw, kind: "warning", message: asString(raw.message) ?? "Claude warning" };
    }
    if (type === "stream_event" && eventType === "content_block_delta" && textDelta) {
      return {
        raw,
        kind: "assistant-delta",
        textDelta,
      };
    }
    if (type === "result" || subtype === "result" || raw.stop_reason !== undefined) {
      return {
        raw,
        kind: "result",
        ...(asString(raw.model) ? { model: asString(raw.model)! } : {}),
        ...(raw.usage !== undefined ? { usage: raw.usage } : {}),
        stopReason: asString(raw.stop_reason) ?? asString(raw.stopReason) ?? null,
      };
    }
    const sessionId = asString(raw.session_id) ?? asString(raw.sessionId);
    if (sessionId) {
      return {
        raw,
        kind: "session",
        sessionId,
      };
    }
    if (textDelta) {
      return {
        raw,
        kind:
          type === "message" || type === "assistant" || eventType === "message_start"
            ? "assistant-message"
            : "assistant-delta",
        textDelta,
      };
    }
    return { raw, kind: "unknown" };
  } catch {
    return null;
  }
}

export interface ClaudeCodeHookRequest {
  readonly toolName?: string;
  readonly input?: Record<string, unknown>;
  readonly prompt?: string;
  readonly schema?: unknown;
  readonly message?: string;
  readonly title?: string;
  readonly url?: string;
  readonly [key: string]: unknown;
}

export function parseClaudeCodeHookPayload(value: unknown): ClaudeCodeHookRequest {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ClaudeCodeHookRequest)
    : {};
}
