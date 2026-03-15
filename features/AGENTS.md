# Testing Rules — Features Directory

Rules in this file apply when working within `features/`.

## RTM Maintenance

- Every user-facing feature, endpoint, and behavior gets a row in `RTM.md`.
- Every test pyramid layer gets a column.
- A cell is checked only when a passing, wired-in test exists at that layer.
- Blank cells are known gaps — document what is needed to close them.
- Update the RTM on every feature addition, change, and bug fix.
- No merge with blank cells unless the gap is explicitly acknowledged.
- A bug that reached a user proves the RTM had a gap. Close it with a regression test.

## Golden File Protocol

- Golden files come from real execution only. Synthesizing from source is prohibited.
- Capture at minimum: one happy path, one edge case, one error path per feature.
- Annotate each golden file with WHY_CORRECT rationale.
- Store fixtures as raw data (JSON, binary, text) — never as code literals in test files.
- Re-capture golden files on every feature change or dependency update.

## Anti-Fixture Requirements

- Every golden file requires at least one anti-fixture.
- Anti-fixture patterns: field value change, truncation, wrong ordering, null injection, type mismatch, stale version.
- Every test must PASS with golden file and FAIL with anti-fixture.
- A test that accepts both has no discriminating power — fix the assertion before proceeding.

## SPEC.md Structure

Each feature directory contains a SPEC.md documenting:
- Input contract: exact type, format, source
- Output contract: exact type, format, destination
- Error paths: invalid input, missing deps, timeouts, partial data
- Capture date: when golden files were last captured

## File Layout

```
<feature>/
  SPEC.md
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
```
