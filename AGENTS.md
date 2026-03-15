# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Project Snapshot

T3 Code is a minimal web GUI for using code agents like Codex and Claude Code (coming soon).

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there are shared logic that can be extracted to a separate module. Duplicate logic across mulitple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Package Roles

- `apps/server`: Node.js WebSocket server. Wraps Codex app-server (JSON-RPC over stdio), serves the React web app, and manages provider sessions.
- `apps/web`: React/Vite UI. Owns session UX, conversation/event rendering, and client-side state. Connects to the server via WebSocket.
- `packages/contracts`: Shared effect/Schema schemas and TypeScript contracts for provider events, WebSocket protocol, and model/session types. Keep this package schema-only — no runtime logic.
- `packages/shared`: Shared runtime utilities consumed by both server and web. Uses explicit subpath exports (e.g. `@t3tools/shared/git`) — no barrel index.

## Codex App Server (Important)

T3 Code is currently Codex-first. The server starts `codex app-server` (JSON-RPC over stdio) per provider session, then streams structured events to the browser through WebSocket push messages.

How we use it in this codebase:

- Session startup/resume and turn lifecycle are brokered in `apps/server/src/codexAppServerManager.ts`.
- Provider dispatch and thread event logging are coordinated in `apps/server/src/providerManager.ts`.
- WebSocket server routes NativeApi methods in `apps/server/src/wsServer.ts`.
- Web app consumes orchestration domain events via WebSocket push on channel `orchestration.domainEvent` (provider runtime activity is projected into orchestration events server-side).

Docs:

- Codex App Server docs: https://developers.openai.com/codex/sdk/#app-server

## Reference Repos

- Open-source Codex repo: https://github.com/openai/codex
- Codex-Monitor (Tauri, feature-complete, strong reference implementation): https://github.com/Dimillian/CodexMonitor

Use these as implementation references when designing protocol handling, UX flows, and operational safeguards.

# Testing Rules

A test that does not exercise real behavior against real data is a liability, not an asset.

## Task Completion Requirements

- The self-testing build passes end-to-end from clean state before any task is declared complete.
- Every new test is wired into the build immediately. Unwired test files are dead code.
- The RTM is current. Blank cells are known gaps — no merge until addressed.

## Testing Approach

1. **Characterize before asserting.** Run code with real inputs. Observe real output. Record as golden file. Only then write assertions.
2. **Install dependencies first.** Resolve the full dependency tree before the first line executes.
3. **Real data, real services, real infrastructure.** Every test exercises the actual runtime path.
4. **Verified fakes only.** Mocks/stubs permitted only for dependencies whose real behavior you observed and captured this session.
5. **Every golden file gets an anti-fixture.** Plausible-but-wrong output. Test PASSES with golden, FAILS with anti-fixture.
6. **Fail first.** Confirm every test can fail. A test never seen failing has never proven it detects faults.
7. **Preserve behavior under failure.** Fix root causes. No weakening validations, swallowing exceptions, or downgrading assertions.
8. **Every assertion traces to observed behavior.** Ground truth comes from execution, not from reading source.
9. **One command runs everything.** Single top-level command installs, builds, and runs every test.
10. **Maintain the RTM.** Every feature has a row, every test layer has a column. Blank cell = known gap.

## Planning Protocol

Characterize before planning. Plan around observations, not assumptions.

1. Run the feature/system against real infrastructure
2. Capture actual inputs and outputs as fixture files
3. Identify gaps between observed behavior and requirements
4. Plan test coverage around the captured reality
5. Create anti-fixtures before writing assertions

## Implementation Protocol

1. Start implementation in an isolated worktree when available
2. Verify baseline fixtures pass before making changes
3. Check progress against plan at natural milestones
4. Run the self-testing build before declaring any step complete

## Test Pyramid

Execute in order. Failure at any layer halts the pipeline.

| Layer | Scope | Key Assertion |
|-------|-------|---------------|
| Unit | Single function, isolated logic | Output matches golden file, rejects anti-fixture |
| Schema | Input validation, parsing, format handling | Valid input parses; invalid input produces specific error |
| Component | Feature end-to-end, real deps, isolated from app stack | Real input produces output matching golden file |
| Integration | Through actual API layer, real HTTP/auth/DB | Status + headers + body match golden file; contracts verified |
| E2E | Through actual UI/CLI, real browser, real backend | Visible output matches golden file |

## File Structure

```
features/
  RTM.md
  <feature>/
    SPEC.md
    golden/
    fixtures/
      inputs/
      anti-fixtures/
contracts/
  <provider>/
```

## Always

- Capture golden files from real execution before writing assertions
- Install full dependency tree before first test run
- Wire every new test into the self-testing build immediately
- Create anti-fixtures for every golden file
- Update the RTM after every change
- Prove discriminating power: test passes golden, fails anti-fixture

## Ask First

- Replacing real service calls with fakes (requires verified-fake justification)
- Skipping a pyramid layer for a feature (requires documented reason)
- Merging with RTM gaps (requires gap acknowledgment)
- Modifying golden files captured in a previous session

## Never

- Synthesize fixtures from reading source code
- Weaken assertions to make tests pass
- Stub code you have not run for real this session
- Add speculative try/except or fallback defaults not in original design
- Skip, comment out, or delete tests to achieve green
- Declare done before the self-testing build passes from clean state

## Actions

### test-plan

Characterize a feature, capture fixtures, plan test coverage around observed reality.

```
You are planning test coverage for: {{SCOPE}}

1. CHARACTERIZE: Run the feature/system against real infrastructure. Capture actual inputs and outputs.
2. INVENTORY: List every behavior, endpoint, and code path observed during characterization.
3. FIXTURE CAPTURE: Save inputs to fixtures/inputs/, outputs to golden/. Annotate each with WHY_CORRECT.
4. ANTI-FIXTURES: Create plausible-but-wrong outputs for each golden file. Save to fixtures/anti-fixtures/.
5. GAP ANALYSIS: Compare observed behavior against requirements. Identify untested paths.
6. PLAN: For each behavior, specify which pyramid layers apply and what assertions to write. Plan around captured reality, not assumptions.
7. RTM DRAFT: Create or update RTM rows for every behavior identified.

Output: fixture inventory, gap analysis, test plan with layer assignments, RTM draft.
```

### test-implement

Start implementation with worktree isolation and baseline fixture verification.

```
You are beginning test implementation.

1. WORKTREE: Create an isolated worktree for this work if available.
2. BASELINE: Run the self-testing build. Confirm all existing tests pass. Record baseline state.
3. FIXTURE VERIFY: Confirm all golden files are current. Re-run characterization for any stale fixtures.
4. IMPLEMENT: Follow the test plan. Write tests layer by layer (Unit → Schema → Component → Integration → E2E).
5. DISCRIMINATING POWER: After each test, verify it PASSES with golden file and FAILS with anti-fixture.
6. WIRE: Add each test to the self-testing build immediately after writing.
7. PROGRESS: Track completion against the plan. Report which layers and features are done.

Output: tests written per layer, discriminating power verified, build status, plan progress.
```

### test-check

Compare current state against plan and check for fixture drift.

```
You are checking test implementation progress.

1. PLAN STATUS: Compare current test coverage against the test plan. List completed vs remaining items.
2. BUILD STATUS: Run the self-testing build. Report pass/fail/skip counts.
3. FIXTURE DRIFT: Check if any golden files are stale (dependencies or features changed since capture). Flag for re-capture.
4. RTM PROGRESS: Compare current RTM against target. List cells that flipped to green and remaining gaps.
5. DISCRIMINATING POWER: Spot-check 2-3 tests — verify they reject their anti-fixtures.
6. BLOCKERS: Identify anything preventing progress. Missing fixtures, unavailable services, unclear requirements.

Output: plan completion %, build status, stale fixtures, RTM delta, blockers.
```

### test-bootstrap

Set up test infrastructure from scratch.

```
You are bootstrapping test infrastructure. Work autonomously. Do not declare done until the self-testing build passes from clean state.

1. INVENTORY: Read project structure. Identify language, framework, package manager, build system, existing tests, CI config. List every user-facing feature, endpoint, and CLI command.
2. ENVIRONMENT: Install all production + dev dependencies. Download required assets. Verify zero-error build.
3. SELF-TESTING BUILD: Create or verify a single top-level test command that runs in order: install, build, lint, unit, schema, component, integration, E2E. Exits 0 on pass, non-zero on failure. Create empty test directories for layers without tests yet.
4. RTM SCAFFOLD: Create features/RTM.md. One row per feature. All cells start with unchecked status. Flip to checked only when a passing, wired-in test exists.
5. FIRST FEATURE: Pick the most critical feature. Run it with real input against real infrastructure. Save input as fixture, output as golden file. Create one anti-fixture. Write first test: assert golden match, verify anti-fixture rejection. Wire in. Update RTM.
6. VERIFY: Run self-testing build from clean state. Passes. Introduce a mutation — test fails. Revert — passes.
7. REPORT: Self-testing build command, features inventoried, RTM created, first feature characterized, golden files captured, anti-fixtures created, mutation check result, remaining features to characterize.
```

### test-feature

Add full pyramid test coverage for one feature.

```
You are adding full test coverage for feature: {{FEATURE}}. Follow every step. Do not declare done until the self-testing build passes and RTM row is fully green.

1. CONTRACT: Define what goes in (type, format, source), what comes out (type, format, destination), error paths. Write to features/<feature>/SPEC.md.
2. CHARACTERIZE: Run the feature for real. Capture: >=1 happy path, >=1 edge case, >=1 error path. Save inputs to fixtures/inputs/, outputs to golden/.
3. ANTI-FIXTURES: For each golden file, create >=1 plausible-but-wrong output. Save to fixtures/anti-fixtures/.
4. WRITE TESTS AT EVERY LAYER:
   - Unit: core logic, golden file assertion, verified fakes only
   - Schema: valid input parses; malformed input produces specific error
   - Component: feature end-to-end, real deps, isolated from stack
   - Integration: real HTTP through API layer, status + headers + body verified
   - E2E: through real UI/CLI, visible output matches golden file
5. PROVE DISCRIMINATING POWER: Every test PASSES with golden, FAILS with anti-fixture.
6. WIRE & VERIFY: All tests in self-testing build. Clean-state run passes. Introduce one code mutation — test fails. Revert — passes.
7. UPDATE RTM: Feature row fully checked. Document any gaps with what's needed to close them.
```

### test-bugfix

Red-Green-Refactor TDD for a bug.

```
You are fixing a bug: {{BUG_DESCRIPTION}}. Do not touch production code until a failing test exists.

1. REPRODUCE & CAPTURE: Follow repro steps against real infrastructure. Capture exact triggering input, actual wrong output, and correct expected output. Save: input to fixtures/inputs/bug-<id>, correct output to golden/bug-<id>, wrong output to fixtures/anti-fixtures/bug-<id>-actual.
2. RED: Write a test at the lowest applicable pyramid layer. Assert triggering input produces correct expected output. Run it. IT MUST FAIL. If it passes, the bug is not reproduced or the assertion is too weak — fix the test, not the code.
3. GREEN: Fix the root cause. Minimal change. Do NOT weaken assertions, add workaround try/except, stub deps, or change test to match broken behavior. New test passes.
4. REGRESSION CHECK: Run full self-testing build. All existing tests still pass. If any break, the fix introduced a regression — diagnose root cause.
5. MUTATION VERIFY: Revert fix — test fails. Re-apply — passes. Introduce related mutation near fix site — test catches it. Revert all mutations.
6. WIRE & TRACE: Test wired into build. Update RTM: link regression test to feature, add issue ID, mark previously blank coverage cells.
7. REPORT: Bug, root cause, fix (file:line), regression test path, anti-fixture path, build status, RTM updated.
```

### test-golden

Capture or refresh golden files and fixtures.

```
You are capturing golden files. Scope: {{SCOPE}}. Golden files come from real execution only — never invented.

1. IDENTIFY TARGETS: Read RTM. List features where Golden status is unchecked or golden files are stale.
2. ENVIRONMENT: Install all deps. Confirm external services reachable. If unavailable — stop and report. Do NOT fabricate fixtures.
3. CAPTURE LOOP per feature:
   - Happy path: real input, real execution, record input + output verbatim. Annotate WHY_CORRECT.
   - Edge cases: boundary values, large inputs, unicode, empty collections, max limits.
   - Error paths: invalid input, missing auth, timeout, resource not found.
   - Anti-fixtures per golden file: field value change, truncation, wrong ordering, null injection, type mismatch, stale version.
4. VALIDATE: Re-run each feature with captured input — output must match golden file.
5. UPDATE RTM: Flip Golden column to checked. Record capture date.
6. STALENESS: Verify CI check flags golden files older than dependency update cadence.
7. REPORT: Features targeted, golden files captured (happy/edge/error), anti-fixtures created, RTM cells updated, staleness check status.
```

### test-audit

Audit entire test suite for quality and completeness.

```
You are a test auditor. Ruthlessly verify the test suite is real, complete, and trustworthy. Do not stop until all phases complete and verdict rendered.

1. ENVIRONMENT: Read project structure. Install ALL deps from scratch. Zero-error build.
2. SELF-TESTING BUILD: Locate single test command. If none exists, create one. If exists, verify every test file is discovered and executed. List orphaned/dead tests.
3. CLEAN-STATE RUN: Clear all caches/artifacts. Run build. Record: total, passed, failed, skipped, errored, wall-clock time. Skipped tests = dormant lies.
4. RTM RECONSTRUCTION: If RTM exists, audit it. If not, build one. Enumerate every feature/endpoint/behavior. Map to tests at each pyramid layer. Blank cells = critical gaps.
5. FIXTURE AUDIT per test:
   - Empirical oracle? (from real execution or invented from code?)
   - Real execution path? (calls real impl or mocks system-under-test?)
   - Verified fakes? (evidence real dep was run and captured?)
   - Meaningful assertion? (actual outcome or just "no error"/assert True/status 200?)
   - Wired in?
   Classify: REAL | HOLLOW | DEAD
6. MUTATION CHECK: Select 3-5 critical tests. Create anti-fixture. Test must FAIL with anti-fixture. Introduce code mutation. Build must catch it. Revert all.
7. CONTRACT & DEPENDENCY: Contract tests exist if APIs consumed/provided? Verify against real providers. Flag stale fixtures (>30 days). All pinned deps resolve.
8. VERDICT: Self-testing build status, total REAL/HOLLOW/DEAD, RTM coverage, golden file quality, mutation results, contract status, critical issues list. VERDICT: PASS or FAIL. Do NOT declare PASS to be helpful. A false PASS is the worst outcome.
```

### test-pre-merge

8-gate pre-merge verification checklist.

```
Run this checklist before merge. Every gate must pass. Single failure = BLOCK.

GATE 1 — BUILD: Run self-testing build from clean state. Exit 0. Zero skipped. Zero warnings-as-errors.
GATE 2 — RTM: Row exists for every feature. Changed/added feature has no blank cells. No rows regressed.
GATE 3 — GOLDEN FILES: All from real execution. Changed features re-captured this session. None stale.
GATE 4 — ANTI-FIXTURES: Every golden file has >=1 anti-fixture. Every test PASSES golden, FAILS anti-fixture.
GATE 5 — MUTATION SPOT-CHECK: Pick >=1 test covering changed code. Introduce mutation — test fails. Revert — passes.
GATE 6 — DEPENDENCY HEALTH: Lock file installs clean. No unused new deps. No removed deps still imported.
GATE 7 — NO BEHAVIOR MODS: No assertions weakened/removed. No error-swallowing added. No features removed for green. No real calls replaced with unverified stubs. No tests skipped/deleted for green.
GATE 8 — BUGFIX REGRESSION (if applicable): Failing test exists without fix. Wrong output saved as permanent anti-fixture. Test wired in. RTM links test to feature + issue ID.

All 8 pass = MERGE. Any fail = BLOCK. Fix and re-run from Gate 1.
```

### test-contracts

Set up consumer-driven contract tests.

```
You are setting up contract tests. These ensure API providers and consumers agree on formats and detect breaking changes.

1. MAP BOUNDARIES: List every external service consumed (consumer role) and every API exposed (provider role). Document per boundary: endpoint, request format, expected response format, error responses.
2. CONSUMER SIDE: For each consumed service — run consumer code against real provider. Record request sent + response expected. Save to contracts/<provider>/. Write consumer contract test: mock provider with recorded response (verified fake), assert consumer handles correctly.
3. PROVIDER SIDE: For each exposed API — collect consumer contracts. Replay each consumer's request against real provider. Assert response satisfies consumer expectations.
4. NEGATIVE CONTRACTS: Per contract — missing required fields (consumer detects), wrong types (consumer rejects), extra fields (consumer ignores), error status (consumer handles gracefully).
5. WIRE IN: Consumer contracts run at Integration layer. Provider verification in provider's build. Both gated.
6. STALENESS: Re-verify on every dependency update, sprint boundary, or provider version bump. Timestamp all fixtures.
7. UPDATE RTM: Integration column checked only if contract tests exist and pass. Note provider name and fixture path.
8. REPORT: Boundaries mapped, consumer contracts captured, provider contracts verified, negative tests, wired status, stale contracts, RTM updated.
```
