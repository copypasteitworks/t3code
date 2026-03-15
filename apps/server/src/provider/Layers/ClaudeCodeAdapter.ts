import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import {
  EventId,
  ProviderApprovalDecision,
  type RuntimeItemId,
  ThreadId,
  TurnId,
  type ProviderRuntimeEvent,
} from "@t3tools/contracts";
import { Effect, Layer, PubSub, Stream } from "effect";

import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
  type ProviderAdapterError,
} from "../Errors.ts";
import { ClaudeCodeAdapter, type ClaudeCodeAdapterShape } from "../Services/ClaudeCodeAdapter.ts";
import {
  buildClaudeCodeHookBridgeScript,
  buildClaudeCodeSettingsFile,
  buildClaudeCodeTurnArgs,
  buildClaudeCodeTurnEnv,
  buildClaudeCodeTurnInputLine,
} from "../claudeCode/args.ts";
import {
  createClaudeCodeApprovalOpenedEvent,
  createClaudeCodeApprovalResolvedEvents,
  createClaudeCodeToolCompletedEvents,
  createClaudeCodeTurnStartedEvent,
  createClaudeCodeUserInputRequestedEvent,
  createClaudeCodeUserInputResolvedEvent,
  mapClaudeCodeStdoutEvent,
} from "../claudeCode/eventMapper.ts";
import { createClaudeCodeHookGateway } from "../claudeCode/hookGateway.ts";
import {
  parseClaudeCodeHookPayload,
  parseClaudeCodeStreamJsonLine,
} from "../claudeCode/protocol.ts";
import {
  createClaudeCodeLogicalSession,
  getClaudeCodeProviderOptions,
  hasSessionApprovalRule,
  readClaudeCodeResumeCursor,
  readClaudeCodeRuntimePayload,
  toClaudeCodeProviderSession,
  toClaudeCodeTurnStartResult,
  type ClaudeCodeLogicalSessionState,
} from "../claudeCode/sessionState.ts";

type PendingApprovalRequest = {
  readonly toolName?: string;
  readonly itemId: RuntimeItemId;
  readonly resolve: (decision: ProviderApprovalDecision) => void;
};

type PendingUserInputRequest = {
  readonly resolve: (answers: Record<string, unknown>) => void;
};

interface TurnRuntimeState {
  readonly child: ChildProcess;
  readonly cleanup: () => Promise<void>;
  readonly pendingApprovalRequests: Map<string, PendingApprovalRequest>;
  readonly pendingUserInputRequests: Map<string, PendingUserInputRequest>;
  interrupted: boolean;
}

export interface ClaudeCodeAdapterLiveOptions {
  readonly hookGateway?: Awaited<ReturnType<typeof createClaudeCodeHookGateway>>;
}

function nowIso() {
  return new Date().toISOString();
}

function makeValidationError(operation: string, issue: string): ProviderAdapterValidationError {
  return new ProviderAdapterValidationError({
    provider: "claudeCode",
    operation,
    issue,
  });
}

function makeSessionNotFound(threadId: ThreadId) {
  return new ProviderAdapterSessionNotFoundError({
    provider: "claudeCode",
    threadId,
  });
}

function makeRequestError(method: string, detail: string, cause?: unknown) {
  return new ProviderAdapterRequestError({
    provider: "claudeCode",
    method,
    detail,
    ...(cause !== undefined ? { cause } : {}),
  });
}

function makeProcessError(threadId: ThreadId, detail: string, cause?: unknown) {
  return new ProviderAdapterProcessError({
    provider: "claudeCode",
    threadId,
    detail,
    ...(cause !== undefined ? { cause } : {}),
  });
}

async function ensureTurnTempFiles(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly hookBaseUrl: string;
}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `t3-claude-${input.threadId}-`));
  const hookBridgePath = path.join(tempDir, "hook-bridge.cjs");
  const settingsPath = path.join(tempDir, "settings.json");
  await fs.writeFile(hookBridgePath, buildClaudeCodeHookBridgeScript(), "utf8");
  await fs.writeFile(
    settingsPath,
    buildClaudeCodeSettingsFile({
      hookBridgePath,
      hookBaseUrl: input.hookBaseUrl,
    }),
    "utf8",
  );
  return {
    hookBridgePath,
    settingsPath,
    cleanup: () => fs.rm(tempDir, { recursive: true, force: true }),
  };
}

export const makeClaudeCodeAdapterLive = (options?: ClaudeCodeAdapterLiveOptions) =>
  Layer.effect(
    ClaudeCodeAdapter,
    Effect.gen(function* () {
      const eventPubSub = yield* PubSub.unbounded<ProviderRuntimeEvent>();
      const gateway =
        options?.hookGateway ?? (yield* Effect.promise(() => createClaudeCodeHookGateway()));
      const sessions = new Map<ThreadId, ClaudeCodeLogicalSessionState>();
      const turnStateByThreadId = new Map<ThreadId, TurnRuntimeState>();

      const emit = (...events: ReadonlyArray<ProviderRuntimeEvent>) =>
        Effect.forEach(events, (event) => PubSub.publish(eventPubSub, event), {
          discard: true,
        }).pipe(Effect.asVoid);

      const updateSessionTimestamp = (session: ClaudeCodeLogicalSessionState) => {
        session.updatedAt = nowIso();
      };

      const startSession: ClaudeCodeAdapterShape["startSession"] = (input) =>
        Effect.sync(() => {
          const now = nowIso();
          const resumeCursor = readClaudeCodeResumeCursor(input.resumeCursor);
          const runtimePayload = readClaudeCodeRuntimePayload(input.resumeCursor);
          const sessionId = resumeCursor?.sessionId ?? runtimePayload?.sessionId ?? randomUUID();
          const existing = sessions.get(input.threadId);
          const session =
            existing ?? createClaudeCodeLogicalSession(input, sessionId, now, runtimePayload);
          session.runtimeMode = input.runtimeMode;
          session.updatedAt = now;
          session.sessionId = sessionId;
          if (input.cwd) {
            session.cwd = input.cwd;
          }
          if (input.model) {
            session.model = input.model;
          }
          if (input.providerOptions) {
            session.providerOptions = input.providerOptions;
          }
          if (runtimePayload?.sessionApprovalRules) {
            session.sessionApprovalRules = runtimePayload.sessionApprovalRules;
          }
          session.settingSources =
            runtimePayload?.settingSources ??
            getClaudeCodeProviderOptions(session.providerOptions)?.settingSources ??
            session.settingSources;
          sessions.set(input.threadId, session);
          return toClaudeCodeProviderSession(session);
        });

      const sendTurn: ClaudeCodeAdapterShape["sendTurn"] = (input) =>
        Effect.tryPromise({
          try: async () => {
            const session = sessions.get(input.threadId);
            if (!session) {
              throw makeSessionNotFound(input.threadId);
            }
            if (turnStateByThreadId.has(input.threadId) || session.activeTurn) {
              throw makeValidationError(
                "ClaudeCodeAdapter.sendTurn",
                "A Claude Code turn is already active for this thread.",
              );
            }
            const turnId = TurnId.makeUnsafe(`turn-claude-${randomUUID()}`);
            const turnRegistration = gateway.registerTurn({
              onEvent: async (eventName, payload) => {
                const turnState = turnStateByThreadId.get(input.threadId);
                if (!turnState) {
                  return { exitCode: 1, stderr: "Claude turn is no longer active." };
                }
                const hookPayload = parseClaudeCodeHookPayload(payload);
                if (eventName === "PreToolUse") {
                  const opened = createClaudeCodeApprovalOpenedEvent({
                    threadId: input.threadId,
                    turnId,
                    ...(typeof hookPayload.toolName === "string"
                      ? { toolName: hookPayload.toolName }
                      : {}),
                    payload: hookPayload,
                  });
                  await Effect.runPromise(emit(...opened.events));
                  const toolName =
                    typeof hookPayload.toolName === "string" ? hookPayload.toolName : "";
                  if (
                    session.runtimeMode === "full-access" ||
                    (toolName && hasSessionApprovalRule(session, toolName))
                  ) {
                    await Effect.runPromise(
                      emit(
                        ...createClaudeCodeApprovalResolvedEvents({
                          threadId: input.threadId,
                          turnId,
                          requestId: opened.requestId,
                          itemId: opened.itemId,
                          toolName,
                          decision: "accept",
                        }),
                      ),
                    );
                    return {
                      exitCode: 0,
                      stdout: JSON.stringify({ permissionDecision: "allow" }),
                    };
                  }
                  const decision = await new Promise<ProviderApprovalDecision>((resolve) => {
                    turnState.pendingApprovalRequests.set(opened.requestId, {
                      toolName,
                      itemId: opened.itemId,
                      resolve,
                    });
                  });
                  if (decision === "acceptForSession" && toolName) {
                    session.sessionApprovalRules = [...session.sessionApprovalRules, { toolName }];
                    updateSessionTimestamp(session);
                  }
                  await Effect.runPromise(
                    emit(
                      ...createClaudeCodeApprovalResolvedEvents({
                        threadId: input.threadId,
                        turnId,
                        requestId: opened.requestId,
                        itemId: opened.itemId,
                        toolName,
                        decision,
                      }),
                    ),
                  );
                  return {
                    exitCode: 0,
                    stdout: JSON.stringify({
                      permissionDecision:
                        decision === "accept" || decision === "acceptForSession" ? "allow" : "deny",
                    }),
                  };
                }
                if (eventName === "PostToolUse" || eventName === "PostToolUseFailure") {
                  const latestRequest = [...turnState.pendingApprovalRequests.values()].at(-1);
                  if (latestRequest) {
                    await Effect.runPromise(
                      emit(
                        ...createClaudeCodeToolCompletedEvents({
                          threadId: input.threadId,
                          turnId,
                          itemId: latestRequest.itemId,
                          ...(latestRequest.toolName ? { toolName: latestRequest.toolName } : {}),
                          succeeded: eventName === "PostToolUse",
                          payload: hookPayload,
                        }),
                      ),
                    );
                  }
                  return { exitCode: 0 };
                }
                if (eventName === "Elicitation") {
                  const request =
                    typeof hookPayload.url === "string"
                      ? ({
                          kind: "url",
                          url: hookPayload.url,
                          ...(typeof hookPayload.title === "string"
                            ? { title: hookPayload.title }
                            : {}),
                          ...(typeof hookPayload.message === "string"
                            ? { description: hookPayload.message }
                            : {}),
                        } as const)
                      : ({
                          kind: "form",
                          ...(typeof hookPayload.title === "string"
                            ? { title: hookPayload.title }
                            : {}),
                          ...(typeof hookPayload.message === "string"
                            ? { description: hookPayload.message }
                            : {}),
                          fields: [
                            {
                              id: "response",
                              label: "Response",
                              input: "text" as const,
                              required: true,
                            },
                          ],
                        } as const);
                  const opened = createClaudeCodeUserInputRequestedEvent({
                    threadId: input.threadId,
                    turnId,
                    request,
                  });
                  await Effect.runPromise(emit(...opened.events));
                  const answers = await new Promise<Record<string, unknown>>((resolve) => {
                    turnState.pendingUserInputRequests.set(opened.requestId, { resolve });
                  });
                  await Effect.runPromise(
                    emit(
                      createClaudeCodeUserInputResolvedEvent({
                        threadId: input.threadId,
                        turnId,
                        requestId: opened.requestId,
                        answers,
                      }),
                    ),
                  );
                  return {
                    exitCode: 0,
                    stdout: JSON.stringify({ answers }),
                  };
                }
                return { exitCode: 0 };
              },
            });
            const tempFiles = await ensureTurnTempFiles({
              threadId: input.threadId,
              turnId,
              hookBaseUrl: turnRegistration.baseUrl,
            });
            const args = buildClaudeCodeTurnArgs({
              sessionId: session.sessionId,
              ...((input.model ?? session.model) ? { model: input.model ?? session.model } : {}),
              ...(input.modelOptions ? { modelOptions: input.modelOptions } : {}),
              ...(session.providerOptions ? { providerOptions: session.providerOptions } : {}),
              runtimeMode: session.runtimeMode,
              interactionMode: input.interactionMode ?? "default",
              settingsPath: tempFiles.settingsPath,
              resumeSession: Boolean(session.lastCompletedTurnAt),
            });
            const child = spawn(
              getClaudeCodeProviderOptions(session.providerOptions)?.binaryPath ?? "claude",
              args,
              {
                cwd: session.cwd,
                env: buildClaudeCodeTurnEnv(session.providerOptions),
                stdio: ["pipe", "pipe", "pipe"],
                shell: process.platform === "win32",
              },
            );
            const pendingApprovalRequests = new Map<string, PendingApprovalRequest>();
            const pendingUserInputRequests = new Map<string, PendingUserInputRequest>();
            session.activeTurn = {
              turnId,
              startedAt: nowIso(),
              settingsPath: tempFiles.settingsPath,
              hookBridgePath: tempFiles.hookBridgePath,
            };
            updateSessionTimestamp(session);
            turnStateByThreadId.set(input.threadId, {
              child,
              cleanup: async () => {
                turnRegistration.dispose();
                await tempFiles.cleanup();
              },
              pendingApprovalRequests,
              pendingUserInputRequests,
              interrupted: false,
            });
            await Effect.runPromise(
              emit(
                createClaudeCodeTurnStartedEvent({
                  threadId: input.threadId,
                  turnId,
                  ...((input.model ?? session.model)
                    ? { model: input.model ?? session.model }
                    : {}),
                  ...(input.modelOptions?.claudeCode?.effort
                    ? { effort: input.modelOptions.claudeCode.effort }
                    : {}),
                }),
              ),
            );
            let stdoutBuffer = "";
            const handleStdoutLine = (line: string) => {
              const parsed = parseClaudeCodeStreamJsonLine(line);
              if (!parsed) return;
              if (parsed.kind === "session" && parsed.sessionId) {
                session.sessionId = parsed.sessionId;
                updateSessionTimestamp(session);
                return;
              }
              if (parsed.kind === "result") {
                session.lastCompletedTurnAt = nowIso();
                if (parsed.model) {
                  session.model = parsed.model;
                }
              }
              void Effect.runPromise(
                emit(...mapClaudeCodeStdoutEvent({ threadId: input.threadId, turnId, parsed })),
              );
            };
            child.stdout.on("data", (chunk) => {
              stdoutBuffer += chunk.toString("utf8");
              const lines = stdoutBuffer.split("\n");
              stdoutBuffer = lines.pop() ?? "";
              for (const line of lines) {
                handleStdoutLine(line);
              }
            });
            child.stderr.on("data", (chunk) => {
              const message = chunk.toString("utf8").trim();
              if (!message) return;
              void Effect.runPromise(
                emit({
                  type: "runtime.warning",
                  eventId: EventId.makeUnsafe(`evt-claude-stderr-${randomUUID()}`),
                  provider: "claudeCode",
                  threadId: input.threadId,
                  turnId,
                  createdAt: nowIso(),
                  payload: {
                    message,
                  },
                }),
              );
            });
            child.on("close", async (code, signal) => {
              if (stdoutBuffer.trim().length > 0) {
                handleStdoutLine(stdoutBuffer);
                stdoutBuffer = "";
              }
              delete session.activeTurn;
              session.updatedAt = nowIso();
              const turnState = turnStateByThreadId.get(input.threadId);
              turnStateByThreadId.delete(input.threadId);
              await turnState?.cleanup();
              if (code !== 0 && !(turnState?.interrupted && signal === "SIGINT")) {
                session.lastError = `Claude Code exited with code ${code ?? "null"}${signal ? ` (${signal})` : ""}.`;
                await Effect.runPromise(
                  emit({
                    type: "runtime.error",
                    eventId: EventId.makeUnsafe(`evt-claude-close-${randomUUID()}`),
                    provider: "claudeCode",
                    threadId: input.threadId,
                    turnId,
                    createdAt: nowIso(),
                    payload: {
                      message: session.lastError,
                    },
                  }),
                );
              }
            });
            const stdinPayload = buildClaudeCodeTurnInputLine({
              text: input.input ?? "",
            });
            child.stdin.write(`${stdinPayload}\n`);
            child.stdin.end();
            return toClaudeCodeTurnStartResult(input.threadId, turnId, session.sessionId);
          },
          catch: (cause) =>
            cause instanceof Error && "provider" in cause
              ? (cause as ProviderAdapterError)
              : makeProcessError(input.threadId, "Failed to start Claude Code turn.", cause),
        });

      const interruptTurn: ClaudeCodeAdapterShape["interruptTurn"] = (threadId) =>
        Effect.try({
          try: () => {
            const turnState = turnStateByThreadId.get(threadId);
            if (!turnState) {
              throw makeSessionNotFound(threadId);
            }
            turnState.interrupted = true;
            turnState.child.kill("SIGINT");
          },
          catch: (cause) =>
            cause instanceof Error && "provider" in cause
              ? (cause as ProviderAdapterError)
              : makeRequestError("interruptTurn", "Failed to interrupt Claude turn.", cause),
        });

      const respondToRequest: ClaudeCodeAdapterShape["respondToRequest"] = (
        threadId,
        requestId,
        decision,
      ) =>
        Effect.try({
          try: () => {
            const turnState = turnStateByThreadId.get(threadId);
            const pending = turnState?.pendingApprovalRequests.get(requestId);
            if (!turnState || !pending) {
              throw makeRequestError(
                "respondToRequest",
                `Unknown Claude approval request '${requestId}'.`,
              );
            }
            turnState.pendingApprovalRequests.delete(requestId);
            pending.resolve(decision);
          },
          catch: (cause) =>
            cause instanceof Error && "provider" in cause
              ? (cause as ProviderAdapterError)
              : makeRequestError("respondToRequest", "Failed to resolve Claude approval.", cause),
        });

      const respondToUserInput: ClaudeCodeAdapterShape["respondToUserInput"] = (
        threadId,
        requestId,
        answers,
      ) =>
        Effect.try({
          try: () => {
            const turnState = turnStateByThreadId.get(threadId);
            const pending = turnState?.pendingUserInputRequests.get(requestId);
            if (!turnState || !pending) {
              throw makeRequestError(
                "respondToUserInput",
                `Unknown Claude user-input request '${requestId}'.`,
              );
            }
            turnState.pendingUserInputRequests.delete(requestId);
            pending.resolve(answers);
          },
          catch: (cause) =>
            cause instanceof Error && "provider" in cause
              ? (cause as ProviderAdapterError)
              : makeRequestError(
                  "respondToUserInput",
                  "Failed to resolve Claude user input.",
                  cause,
                ),
        });

      const stopSession: ClaudeCodeAdapterShape["stopSession"] = (threadId) =>
        Effect.tryPromise({
          try: async () => {
            const turnState = turnStateByThreadId.get(threadId);
            if (turnState) {
              turnState.child.kill("SIGTERM");
              turnStateByThreadId.delete(threadId);
              await turnState.cleanup();
            }
            sessions.delete(threadId);
          },
          catch: (cause) => makeProcessError(threadId, "Failed to stop Claude session.", cause),
        });

      const listSessions: ClaudeCodeAdapterShape["listSessions"] = () =>
        Effect.sync(() => [...sessions.values()].map(toClaudeCodeProviderSession));

      const hasSession: ClaudeCodeAdapterShape["hasSession"] = (threadId) =>
        Effect.succeed(sessions.has(threadId));

      const readThread: ClaudeCodeAdapterShape["readThread"] = (threadId) =>
        Effect.succeed({
          threadId,
          turns: [],
        });

      const rollbackThread: ClaudeCodeAdapterShape["rollbackThread"] = (threadId) =>
        Effect.fail(
          new ProviderAdapterValidationError({
            provider: "claudeCode",
            operation: "rollbackThread",
            issue: `Claude Code conversation rollback is unsupported for thread '${threadId}'.`,
          }),
        );

      const stopAll: ClaudeCodeAdapterShape["stopAll"] = () =>
        Effect.tryPromise({
          try: async () => {
            await Promise.all(
              [...turnStateByThreadId.values()].map(async (turnState) => {
                turnState.child.kill("SIGTERM");
                await turnState.cleanup();
              }),
            );
            turnStateByThreadId.clear();
            sessions.clear();
            await gateway.close();
          },
          catch: (cause) =>
            makeProcessError(ThreadId.makeUnsafe("all"), "Failed to stop Claude adapter.", cause),
        });

      return {
        provider: "claudeCode",
        capabilities: {
          sessionModelSwitch: "in-session",
          conversationRollback: "unsupported",
        },
        startSession,
        sendTurn,
        interruptTurn,
        respondToRequest,
        respondToUserInput,
        stopSession,
        listSessions,
        hasSession,
        readThread,
        rollbackThread,
        stopAll,
        streamEvents: Stream.fromPubSub(eventPubSub),
      } satisfies ClaudeCodeAdapterShape;
    }),
  );
