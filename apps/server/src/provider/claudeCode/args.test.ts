import { describe, expect, it } from "vitest";

import {
  buildClaudeCodeSettingsFile,
  buildClaudeCodeTurnArgs,
  buildClaudeCodeTurnEnv,
} from "./args.ts";

describe("buildClaudeCodeTurnArgs", () => {
  it("builds first-turn args with required stream-json flags", () => {
    expect(
      buildClaudeCodeTurnArgs({
        sessionId: "session-1",
        runtimeMode: "full-access",
        interactionMode: "default",
        settingsPath: "/tmp/t3-claude/settings.json",
        resumeSession: false,
      }),
    ).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--input-format",
      "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--settings",
      "/tmp/t3-claude/settings.json",
      "--permission-mode",
      "bypassPermissions",
      "--session-id",
      "session-1",
    ]);
  });

  it("builds resumed fork-turn args with model and effort", () => {
    expect(
      buildClaudeCodeTurnArgs({
        sessionId: "session-2",
        model: "claude-sonnet-4-6",
        modelOptions: {
          claudeCode: {
            effort: "max",
          },
        },
        runtimeMode: "approval-required",
        interactionMode: "plan",
        settingsPath: "/tmp/t3-claude/settings.json",
        resumeSession: true,
        forkSession: true,
      }),
    ).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--input-format",
      "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--settings",
      "/tmp/t3-claude/settings.json",
      "--permission-mode",
      "plan",
      "--resume",
      "session-2",
      "--fork-session",
      "--model",
      "claude-sonnet-4-6",
      "--effort",
      "max",
    ]);
  });
});

describe("buildClaudeCodeTurnEnv", () => {
  it("maps provider overrides into Claude env vars", () => {
    expect(
      buildClaudeCodeTurnEnv({
        claudeCode: {
          configDir: "/tmp/claude-config",
          mcpConfigPath: "/tmp/mcp.json",
          strictMcpConfig: true,
          settingSources: ["user", "local"],
        },
      }),
    ).toMatchObject({
      CLAUDE_CONFIG_DIR: "/tmp/claude-config",
      CLAUDE_CODE_MCP_CONFIG_PATH: "/tmp/mcp.json",
      CLAUDE_CODE_STRICT_MCP_CONFIG: "1",
      CLAUDE_CODE_SETTING_SOURCES: "user,local",
    });
  });
});

describe("buildClaudeCodeSettingsFile", () => {
  it("creates hook entries for all T3-managed Claude hooks", () => {
    const parsed = JSON.parse(
      buildClaudeCodeSettingsFile({
        hookBridgePath: "/tmp/t3-claude/hook-bridge.cjs",
        hookBaseUrl: "http://127.0.0.1:43123/turn/token",
      }),
    ) as {
      hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>>;
    };

    expect(Object.keys(parsed.hooks)).toEqual([
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "Notification",
      "Stop",
      "Elicitation",
      "ElicitationResult",
    ]);
    expect(parsed.hooks.PreToolUse?.[0]?.hooks?.[0]).toMatchObject({
      type: "command",
    });
    expect(parsed.hooks.PreToolUse?.[0]?.hooks?.[0]?.command).toContain(
      "http://127.0.0.1:43123/turn/token/PreToolUse",
    );
  });
});
