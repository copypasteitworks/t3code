import { RuntimeItemId } from "@t3tools/contracts";
import { assert, describe, it } from "@effect/vitest";

import {
  consumeActiveToolCall,
  isExpectedClaudeCodeExit,
  removeActiveToolCall,
} from "./turnRuntime.ts";

describe("claudeCode/turnRuntime", () => {
  it("consumes the matching active tool call by tool name", () => {
    const activeToolCalls = [
      { itemId: RuntimeItemId.makeUnsafe("item-1"), toolName: "Read" },
      { itemId: RuntimeItemId.makeUnsafe("item-2"), toolName: "Bash" },
      { itemId: RuntimeItemId.makeUnsafe("item-3"), toolName: "Edit" },
    ];

    const match = consumeActiveToolCall(activeToolCalls, "Bash");

    assert.deepStrictEqual(match, {
      itemId: RuntimeItemId.makeUnsafe("item-2"),
      toolName: "Bash",
    });
    assert.deepStrictEqual(activeToolCalls, [
      { itemId: RuntimeItemId.makeUnsafe("item-1"), toolName: "Read" },
      { itemId: RuntimeItemId.makeUnsafe("item-3"), toolName: "Edit" },
    ]);
  });

  it("removes a tracked tool call by item id", () => {
    const activeToolCalls = [
      { itemId: RuntimeItemId.makeUnsafe("item-1"), toolName: "Read" },
      { itemId: RuntimeItemId.makeUnsafe("item-2"), toolName: "Bash" },
    ];

    removeActiveToolCall(activeToolCalls, RuntimeItemId.makeUnsafe("item-1"));

    assert.deepStrictEqual(activeToolCalls, [
      { itemId: RuntimeItemId.makeUnsafe("item-2"), toolName: "Bash" },
    ]);
  });

  it("treats interrupt exits as expected for signal and code based shutdowns", () => {
    assert.equal(isExpectedClaudeCodeExit("interrupt", null, "SIGINT"), true);
    assert.equal(isExpectedClaudeCodeExit("interrupt", 130, null), true);
    assert.equal(isExpectedClaudeCodeExit("interrupt", 1, null), false);
  });

  it("treats stop exits as expected for signal and code based shutdowns", () => {
    assert.equal(isExpectedClaudeCodeExit("stop", null, "SIGTERM"), true);
    assert.equal(isExpectedClaudeCodeExit("stop", 143, null), true);
    assert.equal(isExpectedClaudeCodeExit("stop", 2, null), false);
  });
});
