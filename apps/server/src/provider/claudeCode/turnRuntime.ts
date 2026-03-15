import type { RuntimeItemId } from "@t3tools/contracts";

export interface ClaudeCodeActiveToolCall {
  readonly itemId: RuntimeItemId;
  readonly toolName?: string;
}

export type ClaudeCodeExpectedExit = "interrupt" | "stop";

export function consumeActiveToolCall(
  activeToolCalls: Array<ClaudeCodeActiveToolCall>,
  toolName?: string,
): ClaudeCodeActiveToolCall | undefined {
  const matchIndex =
    typeof toolName === "string" && toolName.length > 0
      ? activeToolCalls.findIndex((entry) => entry.toolName === toolName)
      : 0;
  if (matchIndex < 0 || matchIndex >= activeToolCalls.length) {
    return undefined;
  }
  const [match] = activeToolCalls.splice(matchIndex, 1);
  return match;
}

export function removeActiveToolCall(
  activeToolCalls: Array<ClaudeCodeActiveToolCall>,
  itemId: RuntimeItemId,
): void {
  const matchIndex = activeToolCalls.findIndex((entry) => entry.itemId === itemId);
  if (matchIndex >= 0) {
    activeToolCalls.splice(matchIndex, 1);
  }
}

export function isExpectedClaudeCodeExit(
  expectedExit: ClaudeCodeExpectedExit | undefined,
  code: number | null,
  signal: NodeJS.Signals | null,
): boolean {
  if (expectedExit === "interrupt") {
    return signal === "SIGINT" || code === 130 || code === 0;
  }
  if (expectedExit === "stop") {
    return signal === "SIGTERM" || code === 143 || code === 0;
  }
  return false;
}
