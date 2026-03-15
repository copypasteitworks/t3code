---
name: test-contracts
description: Set up consumer-driven contract tests
argument-hint: ""
---

Testing rules:
!`cat .claude/rules/testing-api.md`
!`cat .claude/rules/testing-core.md`

## Instructions

You are setting up contract tests. These ensure API providers and consumers agree on formats and detect breaking changes.

### 1. MAP BOUNDARIES

List every external service this project calls (consumer role) and every API it exposes (provider role).

Document per boundary:
- Endpoint / message queue / event
- Request format (method, headers, body schema)
- Expected response format (status, headers, body schema)
- Error responses

### 2. CONSUMER SIDE

For each consumed service:
1. Run the actual consumer code against the real provider
2. Record the request sent and the response received
3. Save as contract fixtures:
   - `contracts/<provider>/request-<scenario>.json`
   - `contracts/<provider>/expected-response-<scenario>.json`
4. Write a consumer contract test: mock the provider with the recorded response (verified fake), assert consumer handles it correctly

### 3. PROVIDER SIDE

For each exposed API:
1. Collect all consumer contracts
2. Replay each consumer's recorded request against the real provider
3. Assert the real response satisfies consumer expectations
4. Changed response = breaking change — flag before deploy

### 4. NEGATIVE CONTRACTS

For each contract, add negative scenarios:
- Missing required fields in response -> consumer detects and handles gracefully
- Wrong data types -> consumer rejects, does not silently coerce
- Extra unexpected fields -> consumer ignores (forward compatibility)
- Provider returns error status -> consumer handles with correct fallback

### 5. WIRE IN

- Consumer contract tests run at the Integration layer of the pyramid
- Provider verification runs in the provider's own build
- Both are gated: contract failure = build failure = no deploy

### 6. STALENESS

- Re-verify contracts on every dependency update, sprint boundary, or provider version bump
- Timestamp all contract fixtures
- Flag fixtures older than the staleness threshold
- Update contracts when real provider response changes, propagate to all consumers

### 7. UPDATE RTM

Mark Integration column as checked only when contract tests exist and pass. Note provider name and contract fixture path.

### 8. REPORT

Deliver: service boundaries mapped, consumer contracts captured, provider contracts verified, negative contract tests, wired status, stale contracts, RTM updated.
