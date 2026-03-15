import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { Schema } from "effect";

import invalidAliasInput from "../../../features/claude-provider-health/fixtures/inputs/server-provider-status-invalid-alias.json";
import schemaAntiFixture from "../../../features/claude-provider-health/fixtures/anti-fixtures/server-provider-status-invalid-alias-silent.json";
import schemaGolden from "../../../features/claude-provider-health/golden/server-provider-status-invalid-alias-error.json";
import validServerConfigInput from "../../../features/claude-provider-health/fixtures/inputs/server-config-claude-unauthenticated.json";
import { ServerProviderStatus } from "./server";

const decodeServerProviderStatus = Schema.decodeUnknownSync(ServerProviderStatus);

describe("ServerProviderStatus", () => {
  it("rejects stale claude aliases instead of silently accepting them", () => {
    let message = "";

    try {
      decodeServerProviderStatus(invalidAliasInput);
      assert.fail("Expected stale claude alias to fail schema decode.");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    assert.strictEqual(schemaGolden.accepted, false);
    for (const expectedFragment of schemaGolden.messageIncludes) {
      assert.match(message, new RegExp(expectedFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.notStrictEqual(schemaAntiFixture.accepted, schemaGolden.accepted);
  });

  it("accepts canonical claudeCode provider payloads", () => {
    const claudeStatus = validServerConfigInput.providers.find(
      (status) => status.provider === "claudeCode",
    );
    assert.ok(claudeStatus);

    const parsed = decodeServerProviderStatus(claudeStatus);
    assert.strictEqual(parsed.provider, "claudeCode");
    assert.strictEqual(parsed.authStatus, "unauthenticated");
  });
});
