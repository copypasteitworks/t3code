import {
  EventId,
  RuntimeItemId,
  RuntimeRequestId,
  type CanonicalItemType,
  type CanonicalRequestType,
  type ProviderRuntimeEvent,
  type ProviderUserInputRequest,
  type ThreadId,
  type TurnId,
} from "@t3tools/contracts";
import { randomUUID } from "node:crypto";

import type { ClaudeCodeHookRequest, ClaudeCodeStreamJsonLine } from "./protocol.ts";

function nowIso() {
  return new Date().toISOString();
}

function eventId() {
  return EventId.makeUnsafe(`evt-claude-${randomUUID()}`);
}

function itemId() {
  return RuntimeItemId.makeUnsafe(`item-claude-${randomUUID()}`);
}

function requestId() {
  return RuntimeRequestId.makeUnsafe(`req-claude-${randomUUID()}`);
}

function classifyTool(toolName: string | undefined): {
  readonly itemType: CanonicalItemType;
  readonly requestType: CanonicalRequestType;
  readonly title: string;
} {
  switch (toolName) {
    case "Bash":
      return {
        itemType: "command_execution",
        requestType: "command_execution_approval",
        title: "Run command",
      };
    case "Read":
    case "Grep":
    case "Glob":
      return {
        itemType: "file_change",
        requestType: "file_read_approval",
        title: "Read files",
      };
    case "Edit":
    case "Write":
    case "MultiEdit":
      return {
        itemType: "file_change",
        requestType: "file_change_approval",
        title: "Edit files",
      };
    default:
      return {
        itemType: "dynamic_tool_call",
        requestType: "dynamic_tool_call",
        title: toolName ?? "Tool call",
      };
  }
}

export function createClaudeCodeTurnStartedEvent(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly model?: string;
  readonly effort?: string;
}): ProviderRuntimeEvent {
  return {
    type: "turn.started",
    eventId: eventId(),
    provider: "claudeCode",
    threadId: input.threadId,
    turnId: input.turnId,
    createdAt: nowIso(),
    payload: {
      ...(input.model ? { model: input.model } : {}),
      ...(input.effort ? { effort: input.effort } : {}),
    },
  };
}

export function mapClaudeCodeStdoutEvent(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly parsed: ClaudeCodeStreamJsonLine;
}): ReadonlyArray<ProviderRuntimeEvent> {
  switch (input.parsed.kind) {
    case "assistant-delta":
    case "assistant-message":
      return input.parsed.textDelta
        ? [
            {
              type: "content.delta",
              eventId: eventId(),
              provider: "claudeCode",
              threadId: input.threadId,
              turnId: input.turnId,
              createdAt: nowIso(),
              payload: {
                streamKind: "assistant_text",
                delta: input.parsed.textDelta,
              },
            },
          ]
        : [];
    case "plan":
      return input.parsed.plan
        ? [
            {
              type: "turn.plan.updated",
              eventId: eventId(),
              provider: "claudeCode",
              threadId: input.threadId,
              turnId: input.turnId,
              createdAt: nowIso(),
              payload: {
                plan: input.parsed.plan,
              },
            },
          ]
        : [];
    case "warning":
      return input.parsed.message
        ? [
            {
              type: "runtime.warning",
              eventId: eventId(),
              provider: "claudeCode",
              threadId: input.threadId,
              turnId: input.turnId,
              createdAt: nowIso(),
              payload: {
                message: input.parsed.message,
              },
            },
          ]
        : [];
    case "error":
      return [
        {
          type: "runtime.error",
          eventId: eventId(),
          provider: "claudeCode",
          threadId: input.threadId,
          turnId: input.turnId,
          createdAt: nowIso(),
          payload: {
            message: input.parsed.message ?? "Claude Code runtime error",
          },
        },
      ];
    case "result":
      return [
        {
          type: "turn.completed",
          eventId: eventId(),
          provider: "claudeCode",
          threadId: input.threadId,
          turnId: input.turnId,
          createdAt: nowIso(),
          payload: {
            state: "completed",
            ...(input.parsed.stopReason !== undefined
              ? { stopReason: input.parsed.stopReason }
              : {}),
            ...(input.parsed.usage !== undefined ? { usage: input.parsed.usage } : {}),
          },
        },
      ];
    default:
      return [];
  }
}

export function createClaudeCodeApprovalOpenedEvent(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly requestId?: ReturnType<typeof requestId>;
  readonly toolName?: string;
  readonly payload: ClaudeCodeHookRequest;
}): {
  readonly requestId: ReturnType<typeof requestId>;
  readonly itemId: ReturnType<typeof itemId>;
  readonly events: ReadonlyArray<ProviderRuntimeEvent>;
} {
  const ids = {
    requestId: input.requestId ?? requestId(),
    itemId: itemId(),
  };
  const classification = classifyTool(input.toolName);
  return {
    ...ids,
    events: [
      {
        type: "item.started",
        eventId: eventId(),
        provider: "claudeCode",
        threadId: input.threadId,
        turnId: input.turnId,
        itemId: ids.itemId,
        createdAt: nowIso(),
        payload: {
          itemType: classification.itemType,
          title: classification.title,
          ...(input.toolName ? { detail: input.toolName } : {}),
          data: input.payload,
        },
      },
      {
        type: "request.opened",
        eventId: eventId(),
        provider: "claudeCode",
        threadId: input.threadId,
        turnId: input.turnId,
        requestId: ids.requestId,
        itemId: ids.itemId,
        createdAt: nowIso(),
        payload: {
          requestType: classification.requestType,
          ...(input.toolName ? { detail: input.toolName } : {}),
          args: input.payload,
        },
      },
    ],
  };
}

export function createClaudeCodeApprovalResolvedEvents(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly requestId: ReturnType<typeof requestId>;
  readonly itemId: ReturnType<typeof itemId>;
  readonly toolName?: string;
  readonly decision: string;
}): ReadonlyArray<ProviderRuntimeEvent> {
  const classification = classifyTool(input.toolName);
  return [
    {
      type: "request.resolved",
      eventId: eventId(),
      provider: "claudeCode",
      threadId: input.threadId,
      turnId: input.turnId,
      requestId: input.requestId,
      itemId: input.itemId,
      createdAt: nowIso(),
      payload: {
        requestType: classification.requestType,
        decision: input.decision,
      },
    },
  ];
}

export function createClaudeCodeToolCompletedEvents(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly itemId: ReturnType<typeof itemId>;
  readonly toolName?: string;
  readonly succeeded: boolean;
  readonly payload: ClaudeCodeHookRequest;
}): ReadonlyArray<ProviderRuntimeEvent> {
  const classification = classifyTool(input.toolName);
  return [
    {
      type: "item.completed",
      eventId: eventId(),
      provider: "claudeCode",
      threadId: input.threadId,
      turnId: input.turnId,
      itemId: input.itemId,
      createdAt: nowIso(),
      payload: {
        itemType: classification.itemType,
        status: input.succeeded ? "completed" : "failed",
        title: classification.title,
        data: input.payload,
      },
    },
  ];
}

export function createClaudeCodeUserInputRequestedEvent(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly request: ProviderUserInputRequest;
}): {
  readonly requestId: ReturnType<typeof requestId>;
  readonly events: ReadonlyArray<ProviderRuntimeEvent>;
} {
  const id = requestId();
  return {
    requestId: id,
    events: [
      {
        type: "user-input.requested",
        eventId: eventId(),
        provider: "claudeCode",
        threadId: input.threadId,
        turnId: input.turnId,
        requestId: id,
        createdAt: nowIso(),
        payload: {
          request: input.request,
        },
      },
    ],
  };
}

export function createClaudeCodeUserInputResolvedEvent(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly requestId: ReturnType<typeof requestId>;
  readonly answers: Record<string, unknown>;
}): ProviderRuntimeEvent {
  return {
    type: "user-input.resolved",
    eventId: eventId(),
    provider: "claudeCode",
    threadId: input.threadId,
    turnId: input.turnId,
    requestId: input.requestId,
    createdAt: nowIso(),
    payload: {
      answers: input.answers,
    },
  };
}
