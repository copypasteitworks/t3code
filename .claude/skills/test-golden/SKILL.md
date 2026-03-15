---
name: test-golden
description: Capture or refresh golden files and fixtures
argument-hint: [scope: all | feature-id | stale]
---

Testing rules:
!`cat .claude/rules/testing-fixtures.md`

Scope: $ARGUMENTS

## Instructions

You are capturing golden files. Golden files come from real execution only — never invented.

### 1. IDENTIFY TARGETS

Read RTM (`features/RTM.md`). List features where:
- Golden column is unchecked (no golden files yet)
- Golden files are stale (older than last dependency or feature change)
- Only happy-path coverage exists (missing edge/error paths)

Prioritize: no golden files -> stale -> happy-path-only.

### 2. ENVIRONMENT

Install all deps. Confirm external services are reachable. If any dependency or service is unavailable — **stop and report**. Do NOT fabricate fixtures.

### 3. CAPTURE LOOP

For each target feature:

**Happy path:** Run with real-world representative input against real infrastructure. Record input + output verbatim. Annotate: `# WHY_CORRECT: <reason>`.

**Edge cases:** Boundary values, large inputs, unicode, empty collections, max limits. Record each pair.

**Error paths:** Invalid input, missing auth, timeout, resource not found. Record triggering input and error output.

**Anti-fixtures:** For each golden file, create at least one:
- Field value change, truncation, wrong ordering, null injection, type mismatch, stale version

Save golden files to `features/<feature>/golden/`, inputs to `fixtures/inputs/`, anti-fixtures to `fixtures/anti-fixtures/`.

### 4. VALIDATE

For each fixture pair:
- Re-run the feature with captured input — output must match golden file
- Document non-deterministic fields (timestamps, UUIDs) and exclusion rationale
- Verify at least one test uses this golden file and rejects its anti-fixture

### 5. UPDATE RTM

Flip Golden column to checked for each captured feature. Record capture date in SPEC.md or metadata file.

### 6. STALENESS

Verify CI check flags golden files older than dependency update cadence. Stale golden files must be re-captured before merge.

### 7. REPORT

Deliver: features targeted, golden files captured (happy/edge/error counts), anti-fixtures created, re-captures, non-deterministic fields documented, RTM cells updated, staleness check status.
