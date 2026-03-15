import type {
  ProviderStartOptions,
  ProviderSession,
  ProviderSessionStartInput,
  ProviderTurnStartResult,
  RuntimeMode,
  ThreadId,
  TurnId,
} from "@t3tools/contracts";

export interface ClaudeCodeResumeCursor {
  readonly sessionId: string;
}

export interface ClaudeCodeSessionApprovalRule {
  readonly toolName: string;
}

export interface ClaudeCodeRuntimePayload {
  readonly cwd?: string;
  readonly providerOptions?: ProviderStartOptions;
  readonly sessionId: string;
  readonly sessionName?: string;
  readonly lastKnownModel?: string;
  readonly cliVersion?: string;
  readonly settingSources?: ReadonlyArray<"user" | "project" | "local">;
  readonly sessionApprovalRules?: ReadonlyArray<ClaudeCodeSessionApprovalRule>;
  readonly lastCompletedTurnAt?: string;
  readonly activeTurnId?: string | null;
}

export interface ClaudeCodeActiveTurnState {
  readonly turnId: TurnId;
  readonly startedAt: string;
  readonly settingsPath: string;
  readonly hookBridgePath: string;
}

export interface ClaudeCodeLogicalSessionState {
  readonly threadId: ThreadId;
  readonly createdAt: string;
  updatedAt: string;
  runtimeMode: RuntimeMode;
  cwd?: string;
  model?: string;
  providerOptions?: ProviderStartOptions;
  sessionId: string;
  cliVersion?: string;
  settingSources: ReadonlyArray<"user" | "project" | "local">;
  sessionApprovalRules: ReadonlyArray<ClaudeCodeSessionApprovalRule>;
  lastCompletedTurnAt?: string;
  lastError?: string;
  activeTurn?: ClaudeCodeActiveTurnState;
}

const INVALID_RESUME_CURSOR_VALUES = new Set(["", "new", "placeholder", "unknown", "session-id"]);

function normalizedNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidSessionId(value: string | undefined): value is string {
  if (!value) return false;
  return !INVALID_RESUME_CURSOR_VALUES.has(value.toLowerCase());
}

export function readClaudeCodeResumeCursor(value: unknown): ClaudeCodeResumeCursor | null {
  if (typeof value === "string") {
    return isValidSessionId(value) ? { sessionId: value } : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const sessionId =
    normalizedNonEmptyString(record.sessionId) ??
    normalizedNonEmptyString(record.providerSessionId) ??
    normalizedNonEmptyString(
      record.resumeCursor && typeof record.resumeCursor === "object"
        ? (record.resumeCursor as Record<string, unknown>).sessionId
        : undefined,
    );
  return isValidSessionId(sessionId) ? { sessionId } : null;
}

export function buildClaudeCodeResumeCursor(sessionId: string): ClaudeCodeResumeCursor {
  return { sessionId };
}

export function readClaudeCodeRuntimePayload(value: unknown): ClaudeCodeRuntimePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const sessionId = normalizedNonEmptyString(record.sessionId);
  if (!isValidSessionId(sessionId)) {
    return null;
  }
  const settingSources = Array.isArray(record.settingSources)
    ? record.settingSources.filter(
        (entry): entry is "user" | "project" | "local" =>
          entry === "user" || entry === "project" || entry === "local",
      )
    : [];
  const sessionApprovalRules = Array.isArray(record.sessionApprovalRules)
    ? record.sessionApprovalRules
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const toolName = normalizedNonEmptyString((entry as Record<string, unknown>).toolName);
          return toolName ? { toolName } : null;
        })
        .filter((entry): entry is ClaudeCodeSessionApprovalRule => entry !== null)
    : [];
  const payload: {
    sessionId: string;
    cwd?: string;
    providerOptions?: ProviderStartOptions;
    sessionName?: string;
    lastKnownModel?: string;
    cliVersion?: string;
    settingSources?: ReadonlyArray<"user" | "project" | "local">;
    sessionApprovalRules?: ReadonlyArray<ClaudeCodeSessionApprovalRule>;
    lastCompletedTurnAt?: string;
    activeTurnId?: string;
  } = { sessionId };
  const cwd = normalizedNonEmptyString(record.cwd);
  const sessionName = normalizedNonEmptyString(record.sessionName);
  const lastKnownModel = normalizedNonEmptyString(record.lastKnownModel);
  const cliVersion = normalizedNonEmptyString(record.cliVersion);
  const lastCompletedTurnAt = normalizedNonEmptyString(record.lastCompletedTurnAt);
  const activeTurnId = normalizedNonEmptyString(record.activeTurnId);
  if (cwd) payload.cwd = cwd;
  if (sessionName) payload.sessionName = sessionName;
  if (lastKnownModel) payload.lastKnownModel = lastKnownModel;
  if (cliVersion) payload.cliVersion = cliVersion;
  if (lastCompletedTurnAt) payload.lastCompletedTurnAt = lastCompletedTurnAt;
  if (activeTurnId) payload.activeTurnId = activeTurnId;
  if (settingSources.length > 0) payload.settingSources = settingSources;
  if (sessionApprovalRules.length > 0) payload.sessionApprovalRules = sessionApprovalRules;
  if (record.providerOptions && typeof record.providerOptions === "object") {
    payload.providerOptions = record.providerOptions as ProviderStartOptions;
  }
  return payload satisfies ClaudeCodeRuntimePayload;
}

export function getClaudeCodeProviderOptions(
  providerOptions: ProviderStartOptions | undefined,
): ProviderStartOptions["claudeCode"] | undefined {
  return providerOptions?.claudeCode;
}

export function createClaudeCodeLogicalSession(
  input: ProviderSessionStartInput,
  sessionId: string,
  now: string,
  runtimePayload?: ClaudeCodeRuntimePayload | null,
): ClaudeCodeLogicalSessionState {
  const persistedProviderOptions = runtimePayload?.providerOptions;
  const providerOptions = input.providerOptions ?? persistedProviderOptions;
  const persistedSettingSources = runtimePayload?.settingSources;
  const session: ClaudeCodeLogicalSessionState = {
    threadId: input.threadId,
    createdAt: now,
    updatedAt: now,
    runtimeMode: input.runtimeMode,
    sessionId,
    settingSources:
      persistedSettingSources ??
      getClaudeCodeProviderOptions(providerOptions)?.settingSources ??
      [],
    sessionApprovalRules: runtimePayload?.sessionApprovalRules ?? [],
  };
  const resolvedCwd = input.cwd ?? runtimePayload?.cwd;
  if (resolvedCwd) {
    session.cwd = resolvedCwd;
  }
  const resolvedModel = input.model ?? runtimePayload?.lastKnownModel;
  if (resolvedModel) {
    session.model = resolvedModel;
  }
  if (providerOptions) {
    session.providerOptions = providerOptions;
  }
  if (runtimePayload?.cliVersion) {
    session.cliVersion = runtimePayload.cliVersion;
  }
  if (runtimePayload?.lastCompletedTurnAt) {
    session.lastCompletedTurnAt = runtimePayload.lastCompletedTurnAt;
  }
  return session;
}

export function toClaudeCodeRuntimePayload(
  session: ClaudeCodeLogicalSessionState,
): ClaudeCodeRuntimePayload {
  return {
    ...(session.cwd ? { cwd: session.cwd } : {}),
    ...(session.providerOptions ? { providerOptions: session.providerOptions } : {}),
    sessionId: session.sessionId,
    ...(session.model ? { lastKnownModel: session.model } : {}),
    ...(session.cliVersion ? { cliVersion: session.cliVersion } : {}),
    ...(session.settingSources.length > 0 ? { settingSources: session.settingSources } : {}),
    ...(session.sessionApprovalRules.length > 0
      ? { sessionApprovalRules: session.sessionApprovalRules }
      : {}),
    ...(session.lastCompletedTurnAt ? { lastCompletedTurnAt: session.lastCompletedTurnAt } : {}),
    activeTurnId: session.activeTurn?.turnId ?? null,
  };
}

export function toClaudeCodeProviderSession(
  session: ClaudeCodeLogicalSessionState,
): ProviderSession {
  return {
    provider: "claudeCode",
    status: session.activeTurn ? "running" : "ready",
    runtimeMode: session.runtimeMode,
    ...(session.cwd ? { cwd: session.cwd } : {}),
    ...(session.model ? { model: session.model } : {}),
    runtimePayload: toClaudeCodeRuntimePayload(session),
    threadId: session.threadId,
    resumeCursor: buildClaudeCodeResumeCursor(session.sessionId),
    ...(session.activeTurn ? { activeTurnId: session.activeTurn.turnId } : {}),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    ...(session.lastError ? { lastError: session.lastError } : {}),
  };
}

export function toClaudeCodeTurnStartResult(
  threadId: ThreadId,
  turnId: TurnId,
  sessionId: string,
): ProviderTurnStartResult {
  return {
    threadId,
    turnId,
    resumeCursor: buildClaudeCodeResumeCursor(sessionId),
  };
}

export function hasSessionApprovalRule(
  session: ClaudeCodeLogicalSessionState,
  toolName: string,
): boolean {
  return session.sessionApprovalRules.some((rule) => rule.toolName === toolName);
}
