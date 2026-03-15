---
description: Contract testing rules, consumer/provider verification
paths:
  - "**/api/**"
  - "**/routes/**"
  - "**/contracts/**"
---

# Contract Testing Rules

Contract tests ensure API providers and consumers agree on request/response formats and detect breaking changes before deployment.

## Consumer Side

1. Run consumer code against the real provider. Record the request sent and the response received.
2. Save as contract fixtures: `contracts/<provider>/request-<scenario>.json` and `contracts/<provider>/expected-response-<scenario>.json`.
3. Write a consumer contract test: mock the provider with the recorded response (verified fake). Assert the consumer handles it correctly.
4. The mock is a verified fake — its behavior was captured from real execution.

## Provider Side

1. Collect all consumer contracts.
2. Replay each consumer's recorded request against the real provider.
3. Assert the real provider's response satisfies consumer expectations.
4. Changed response = breaking change. Flag before deploy.

## Negative Contracts

For each contract, test:
- Missing required fields in response — consumer detects and handles gracefully
- Wrong data types — consumer rejects, does not silently coerce
- Extra unexpected fields — consumer ignores (forward compatibility)
- Provider returns error status — consumer handles with correct fallback

## Wiring

- Consumer contract tests run at the Integration layer of the pyramid.
- Provider verification runs in the provider's own build.
- Both are gated: contract failure = build failure = no deploy.

## Staleness

- Re-verify contracts on every dependency update, sprint boundary, or provider version bump.
- Timestamp all contract fixtures.
- Flag fixtures older than the staleness threshold.
- Update contracts when the real provider response changes. Propagate to all consumers.

## RTM Integration

Mark the Integration column as checked only when contract tests exist and pass. Note the provider name and contract fixture path in the RTM.
