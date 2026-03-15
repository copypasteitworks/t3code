import {
  ProviderInteractionMode,
  type ProviderModelOptions,
  type ProviderStartOptions,
  type RuntimeMode,
} from "@t3tools/contracts";

import { getClaudeCodeProviderOptions } from "./sessionState.ts";

export interface BuildClaudeCodeTurnArgsInput {
  readonly sessionId: string;
  readonly model?: string;
  readonly modelOptions?: ProviderModelOptions;
  readonly providerOptions?: ProviderStartOptions;
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: ProviderInteractionMode;
  readonly settingsPath: string;
  readonly resumeSession: boolean;
  readonly forkSession?: boolean;
}

function quoteForShell(value: string): string {
  if (process.platform === "win32") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildClaudeCodeHookBridgeScript() {
  return `#!/usr/bin/env node
const fs = require("node:fs");
async function main() {
  const url = process.argv[2];
  const input = fs.readFileSync(0, "utf8");
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: input.length > 0 ? input : "{}",
  });
  const payload = await response.json();
  if (payload.stdout) process.stdout.write(String(payload.stdout));
  if (payload.stderr) process.stderr.write(String(payload.stderr));
  process.exit(typeof payload.exitCode === "number" ? payload.exitCode : 0);
}
main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
`;
}

export function buildClaudeCodeSettingsFile(input: {
  readonly hookBridgePath: string;
  readonly hookBaseUrl: string;
}) {
  const events = [
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "Notification",
    "Stop",
    "Elicitation",
    "ElicitationResult",
  ] as const;
  const hookCommand = (eventName: (typeof events)[number]) =>
    `${quoteForShell(process.execPath)} ${quoteForShell(input.hookBridgePath)} ${quoteForShell(`${input.hookBaseUrl}/${eventName}`)}`;
  return JSON.stringify(
    {
      hooks: Object.fromEntries(
        events.map((eventName) => [
          eventName,
          [{ matcher: "*", hooks: [{ type: "command", command: hookCommand(eventName) }] }],
        ]),
      ),
    },
    null,
    2,
  );
}

export function buildClaudeCodeTurnArgs(
  input: BuildClaudeCodeTurnArgsInput,
): ReadonlyArray<string> {
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--input-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--settings",
    input.settingsPath,
  ];
  const permissionMode =
    input.interactionMode === "plan"
      ? "plan"
      : input.runtimeMode === "full-access"
        ? "bypassPermissions"
        : "default";
  args.push("--permission-mode", permissionMode);
  if (input.resumeSession) {
    args.push("--resume", input.sessionId);
    if (input.forkSession) {
      args.push("--fork-session");
    }
  } else {
    args.push("--session-id", input.sessionId);
  }
  if (input.model) {
    args.push("--model", input.model);
  }
  const effort = input.modelOptions?.claudeCode?.effort;
  if (effort) {
    args.push("--effort", effort);
  }
  return args;
}

export function buildClaudeCodeTurnEnv(
  providerOptions: ProviderStartOptions | undefined,
): NodeJS.ProcessEnv {
  const claudeCode = getClaudeCodeProviderOptions(providerOptions);
  return {
    ...process.env,
    ...(claudeCode?.configDir ? { CLAUDE_CONFIG_DIR: claudeCode.configDir } : {}),
    ...(claudeCode?.mcpConfigPath ? { CLAUDE_CODE_MCP_CONFIG_PATH: claudeCode.mcpConfigPath } : {}),
    ...(claudeCode?.strictMcpConfig ? { CLAUDE_CODE_STRICT_MCP_CONFIG: "1" } : {}),
    ...(claudeCode?.settingSources
      ? { CLAUDE_CODE_SETTING_SOURCES: claudeCode.settingSources.join(",") }
      : {}),
  };
}
