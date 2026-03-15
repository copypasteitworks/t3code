---
description: Golden file rules, anti-fixture patterns, staleness, and capture protocol
paths:
  - "**/fixtures/**"
  - "**/golden/**"
  - "**/anti-fixtures/**"
---

# Golden File Protocol

Golden files are the empirical source of truth — recorded from real execution, never invented.

## Capture Rules

1. Run the feature against real infrastructure before creating any fixture.
2. Record input verbatim as a fixture file. Record output verbatim as a golden file.
3. Annotate each golden file with a one-line WHY_CORRECT rationale.
4. Capture at minimum: one happy path, one edge case, one error path per feature.
5. Store fixtures as raw data (JSON, binary, text) — never as code literals embedded in test files.
6. For external services, capture the real response with a timestamp. This becomes the baseline for contract tests.

## Anti-Fixture Rules

Every golden file requires at least one anti-fixture: a plausible-but-wrong output.

| Mutation Type | How to Create |
|---------------|---------------|
| Field value change | Copy golden file, alter one meaningful field |
| Truncation | Copy golden file, remove the last 20% of content |
| Wrong ordering | Copy golden file, shuffle array/list elements |
| Null injection | Copy golden file, replace a required value with null |
| Type mismatch | Copy golden file, change a number to a string |
| Stale version | Use a golden file from a previous feature version |

## Discriminating Power Proof

Every test must:
1. **PASS** with the golden file
2. **FAIL** with each anti-fixture

If a test accepts both real and mutant output, the assertion is too weak. Fix the assertion before proceeding.

## Staleness

- Re-capture golden files on every feature change.
- Re-capture on every dependency update that affects the feature.
- Flag golden files older than the project's staleness threshold.
- Stale golden files block merge.

## Non-Deterministic Fields

Document any fields excluded from comparison (timestamps, UUIDs, request IDs) and explain why. Use a `.meta` sidecar file or inline annotation.

## File Layout

```
features/<feature>/
  golden/
    happy-path.json
    edge-case.json
    error-path.json
  fixtures/
    inputs/
      happy-path.json
      edge-case.json
      error-trigger.json
    anti-fixtures/
      happy-path-wrong-id.json
      happy-path-truncated.json
      error-path-silent.json
```
