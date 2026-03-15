---
name: test-feature
description: Add full pyramid test coverage for a feature
argument-hint: [feature-name-or-id]
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-pyramid.md`
!`cat .claude/rules/testing-fixtures.md`

Feature to test: $ARGUMENTS

## Instructions

You are adding full test coverage for this feature. Follow every step. Do not declare done until the self-testing build passes and RTM row is fully green.

### 0. PLAN CHECK + EXISTING WORK

Before starting, check for existing work and documentation:
- Read `features/<feature>/TEST-PLAN.md` and `features/RTM.md` if they exist
- Read `.testing/issues.json` for open gaps related to this feature (match by rtm_ref or title)
- Search for existing documentation about this feature: README.md, SPEC.md, docs/, API specs, any .md mentioning the feature name
- Check `.testing/captures/<feature>/` for raw captures from `/test-capture` or `/test-live`
- If a test plan exists, follow it. Do not duplicate work already done.
- If captures exist, use them as the basis for golden files instead of re-running characterization
- If no plan or captures exist, proceed with characterization below.

### 1. CONTRACT

Define what goes in and what comes out:
- **Input:** Exact type, format, source (request body, file, user action, event)
- **Output:** Exact type, format, destination (response, file, rendered UI, side effect)
- **Error paths:** Invalid input, missing deps, timeouts, partial data

Write to `features/<feature>/SPEC.md`.

### 2. CHARACTERIZE

Run the feature for real. Do not read source and guess. Capture:
- At least 1 happy path input/output pair
- At least 1 edge case input/output pair
- At least 1 error path input/output pair

Save inputs to `fixtures/inputs/`, outputs to `golden/`. Annotate each golden file with WHY_CORRECT.

Capture protocol:
- Write a characterization test that runs the code and prints JSON output
- Pipe or redirect the output directly to golden files — do not manually transcribe
- Re-run the characterization test to verify golden files match

### 3. ANTI-FIXTURES

For each golden file, create at least one plausible-but-wrong output:

| Golden File | Anti-Fixture | What's Wrong |
|-------------|-------------|-------------|
| happy-path.json | happy-path-wrong-id.json | ID field value changed |
| happy-path.json | happy-path-truncated.json | Response body truncated |
| error-path.json | error-path-silent.json | Error swallowed, 200 returned |

Save in `features/<feature>/fixtures/anti-fixtures/`.

### 4. WRITE TESTS AT EVERY LAYER

- **Unit:** Core logic function in isolation. Input: fixture. Expected: golden file. Verified fakes only.
- **Schema:** Valid input parses correctly. Malformed input produces specific error, not silent fallback.
- **Component:** Feature end-to-end with real deps, isolated from app stack. Assert output matches golden file.
- **Integration:** Real HTTP through API layer. Assert status, headers, body match golden file. Contract tests if consumers exist.
- **E2E:** Through real UI/CLI. Assert visible output matches golden file.

### 5. PROVE DISCRIMINATING POWER

For every test: PASSES with golden file, FAILS with each anti-fixture. If any test accepts both, strengthen the assertion.

Write explicit discriminating tests that:
- **Load anti-fixture data from disk files** (`fixtures/anti-fixtures/` directory)
- Assert the test rejects the anti-fixture data
- These tests are permanent — they prove the assertions have teeth
- If the anti-fixture files are deleted, the discriminating tests MUST fail (missing file = test failure)
- Do NOT hardcode anti-fixture values inline in test code — always read from the fixture files on disk

### 6. WIRE & VERIFY

All tests in self-testing build. Run from clean state — passes.

Mutation verification (proving tests are not hollow):
- Write a test helper that programmatically alters one expected value and confirms the assertion fails
- Or: copy the source file to a temp location, mutate the copy, compile/run tests against it, then discard the copy
- The anti-fixtures from Step 3 are the permanent mutation defense — they encode the proof that assertions have teeth

**NEVER do this:**
- Do NOT use `sed` or manual edits on production source code
- Do NOT use global search-replace that could corrupt multiple locations
- Do NOT leave mutations in production code and "revert later"
- The test itself must encode the proof of discriminating power — it should be runnable by anyone at any time without manual steps

### 7. UPDATE RTM & CLOSE ISSUES

- Feature row fully green in RTM. Document any remaining gaps.
- Close related gap issues in `.testing/issues.json` (status: "closed", closed_by: "/test-feature")
- List other features in the project that still lack coverage.
