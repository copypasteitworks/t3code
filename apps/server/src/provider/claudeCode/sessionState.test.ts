import { ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  createClaudeCodeLogicalSession,
  readClaudeCodeResumeCursor,
  readClaudeCodeRuntimePayload,
  toClaudeCodeProviderSession,
} from "./sessionState.ts";

describe("readClaudeCodeResumeCursor", () => {
  it("reads supported legacy cursor shapes", () => {
    expect(readClaudeCodeResumeCursor({ providerSessionId: "sess_legacy" })).toEqual({
      sessionId: "sess_legacy",
    });
    expect(readClaudeCodeResumeCursor({ resumeCursor: { sessionId: "sess_nested" } })).toEqual({
      sessionId: "sess_nested",
    });
  });

  it("rejects placeholder cursor values", () => {
    expect(readClaudeCodeResumeCursor("placeholder")).toBeNull();
    expect(readClaudeCodeResumeCursor({ sessionId: "unknown" })).toBeNull();
  });
});

describe("readClaudeCodeRuntimePayload", () => {
  it("parses persisted Claude runtime payloads", () => {
    expect(
      readClaudeCodeRuntimePayload({
        sessionId: "sess_123",
        cwd: "/tmp/project",
        lastKnownModel: "claude-sonnet-4-6",
        cliVersion: "1.2.3",
        settingSources: ["user", "project", "invalid"],
        sessionApprovalRules: [{ toolName: "Bash" }, { toolName: "" }],
        lastCompletedTurnAt: "2026-03-15T00:00:00.000Z",
        activeTurnId: "turn-123",
      }),
    ).toEqual({
      sessionId: "sess_123",
      cwd: "/tmp/project",
      lastKnownModel: "claude-sonnet-4-6",
      cliVersion: "1.2.3",
      settingSources: ["user", "project"],
      sessionApprovalRules: [{ toolName: "Bash" }],
      lastCompletedTurnAt: "2026-03-15T00:00:00.000Z",
      activeTurnId: "turn-123",
    });
  });
});

describe("Claude logical session state", () => {
  it("rehydrates persisted session metadata into a logical session", () => {
    const session = createClaudeCodeLogicalSession(
      {
        threadId: ThreadId.makeUnsafe("thread-claude"),
        runtimeMode: "approval-required",
        resumeCursor: undefined,
        cwd: undefined,
        model: undefined,
        providerOptions: {
          claudeCode: {
            settingSources: ["local"],
          },
        },
      },
      "sess_123",
      "2026-03-15T00:00:00.000Z",
      {
        sessionId: "sess_123",
        cwd: "/tmp/project",
        lastKnownModel: "claude-sonnet-4-6",
        cliVersion: "1.2.3",
        settingSources: ["user", "project"],
        sessionApprovalRules: [{ toolName: "Bash" }],
        lastCompletedTurnAt: "2026-03-15T00:10:00.000Z",
      },
    );

    expect(session).toMatchObject({
      threadId: "thread-claude",
      runtimeMode: "approval-required",
      sessionId: "sess_123",
      cwd: "/tmp/project",
      model: "claude-sonnet-4-6",
      cliVersion: "1.2.3",
      settingSources: ["user", "project"],
      sessionApprovalRules: [{ toolName: "Bash" }],
      lastCompletedTurnAt: "2026-03-15T00:10:00.000Z",
    });
  });

  it("projects a provider session with persisted runtime payload", () => {
    const providerSession = toClaudeCodeProviderSession({
      threadId: ThreadId.makeUnsafe("thread-claude"),
      createdAt: "2026-03-15T00:00:00.000Z",
      updatedAt: "2026-03-15T00:01:00.000Z",
      runtimeMode: "approval-required",
      cwd: "/tmp/project",
      model: "claude-sonnet-4-6",
      providerOptions: {
        claudeCode: {
          configDir: "/tmp/claude",
        },
      },
      sessionId: "sess_123",
      cliVersion: "1.2.3",
      settingSources: ["user"],
      sessionApprovalRules: [{ toolName: "Bash" }],
      lastCompletedTurnAt: "2026-03-15T00:10:00.000Z",
    });

    expect(providerSession).toMatchObject({
      provider: "claudeCode",
      status: "ready",
      threadId: "thread-claude",
      resumeCursor: { sessionId: "sess_123" },
      runtimePayload: {
        cwd: "/tmp/project",
        sessionId: "sess_123",
        lastKnownModel: "claude-sonnet-4-6",
        cliVersion: "1.2.3",
        settingSources: ["user"],
        sessionApprovalRules: [{ toolName: "Bash" }],
        lastCompletedTurnAt: "2026-03-15T00:10:00.000Z",
        activeTurnId: null,
      },
    });
  });
});
