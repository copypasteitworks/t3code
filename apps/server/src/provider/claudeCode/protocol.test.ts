import { describe, expect, it } from "vitest";

import { parseClaudeCodeHookPayload, parseClaudeCodeStreamJsonLine } from "./protocol.ts";

describe("parseClaudeCodeStreamJsonLine", () => {
  it("parses assistant deltas", () => {
    expect(parseClaudeCodeStreamJsonLine('{"type":"assistant","delta":"hello"}')).toMatchObject({
      kind: "assistant-message",
      textDelta: "hello",
    });
  });

  it("parses assistant messages from Claude's content array", () => {
    expect(
      parseClaudeCodeStreamJsonLine(
        '{"type":"assistant","message":{"content":[{"type":"text","text":"CLAUDE_OK"}]}}',
      ),
    ).toMatchObject({
      kind: "assistant-message",
      textDelta: "CLAUDE_OK",
    });
  });

  it("parses nested stream-event text deltas", () => {
    expect(
      parseClaudeCodeStreamJsonLine(
        '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"CLAUDE_OK"}}}',
      ),
    ).toMatchObject({
      kind: "assistant-delta",
      textDelta: "CLAUDE_OK",
    });
  });

  it("parses session updates", () => {
    expect(parseClaudeCodeStreamJsonLine('{"session_id":"sess_123"}')).toMatchObject({
      kind: "session",
      sessionId: "sess_123",
    });
  });

  it("parses result payloads", () => {
    expect(
      parseClaudeCodeStreamJsonLine(
        '{"type":"result","model":"claude-sonnet-4-6","stop_reason":"end_turn","usage":{"input_tokens":1}}',
      ),
    ).toMatchObject({
      kind: "result",
      model: "claude-sonnet-4-6",
      stopReason: "end_turn",
      usage: { input_tokens: 1 },
    });
  });

  it("parses plan updates", () => {
    expect(
      parseClaudeCodeStreamJsonLine(
        '{"plan":[{"step":"Inspect code","status":"completed"},{"step":"Wire hooks","status":"inProgress"}]}',
      ),
    ).toMatchObject({
      kind: "plan",
      plan: [
        { step: "Inspect code", status: "completed" },
        { step: "Wire hooks", status: "inProgress" },
      ],
    });
  });

  it("returns null for malformed JSON", () => {
    expect(parseClaudeCodeStreamJsonLine("{not-json")).toBeNull();
  });
});

describe("parseClaudeCodeHookPayload", () => {
  it("returns an empty object for non-object payloads", () => {
    expect(parseClaudeCodeHookPayload("invalid")).toEqual({});
  });

  it("passes object payloads through", () => {
    expect(parseClaudeCodeHookPayload({ toolName: "Bash", input: { command: "pwd" } })).toEqual({
      toolName: "Bash",
      input: { command: "pwd" },
    });
  });
});
