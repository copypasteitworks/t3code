import { type ServerProviderStatus } from "@t3tools/contracts";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";

import bannerGolden from "../../../../../features/claude-provider-health/golden/provider-health-banner-unauthenticated.json";
import bannerAntiFixture from "../../../../../features/claude-provider-health/fixtures/anti-fixtures/provider-health-banner-unauthenticated-silent.json";
import serverConfigInput from "../../../../../features/claude-provider-health/fixtures/inputs/server-config-claude-unauthenticated.json";
import { ProviderHealthBanner } from "./ProviderHealthBanner";

function extractText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("ProviderHealthBanner", () => {
  it("renders the Claude health banner copy from the captured golden fixture", () => {
    const claudeStatus = serverConfigInput.providers.find(
      (status) => status.provider === "claudeCode",
    ) as ServerProviderStatus | undefined;
    assert.ok(claudeStatus);

    const renderedText = extractText(
      renderToStaticMarkup(<ProviderHealthBanner status={claudeStatus} />),
    );

    assert.match(
      renderedText,
      new RegExp(bannerGolden.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.match(
      renderedText,
      new RegExp(bannerGolden.message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.ok(!renderedText.includes(bannerAntiFixture.message));
  });

  it("renders nothing for ready statuses", () => {
    const rendered = renderToStaticMarkup(
      <ProviderHealthBanner
        status={{
          provider: "claudeCode",
          status: "ready",
          available: true,
          authStatus: "authenticated",
          checkedAt: "2026-03-15T00:00:00.000Z",
        }}
      />,
    );

    assert.strictEqual(rendered, "");
  });
});
