# Test Check Report

Generated: 2026-03-15

## 1. Plan Status

- Feature-level test plans: none found under `features/*/TEST-PLAN.md`
- Project-level plans: `.plans/` exists, but no single active test plan is wired to current Claude adapter verification
- RTM: [features/RTM.md](/Users/mm/.t3/worktrees/T3Code/t3code-6184fb68/features/RTM.md)
- Prior issues ledger: none found under `.testing/issues.json`

Current tracked RTM scope:

- Features tracked: 1
- Features fully green: 1
- Completion against tracked RTM scope: 100%

Completed items:

- `claude-provider-health` has all 11 RTM cells marked `✅`
- Fixture-backed tests exist and pass for schema, component, integration, and provider-health runtime checks
- `bun run build`, `bun lint`, and `bun typecheck` pass

Remaining items:

- RTM scope is too narrow; only `claude-provider-health` is tracked
- No feature-level `TEST-PLAN.md` exists for broader Claude adapter behavior
- Golden files for `claude-provider-health` appear stale relative to newer source/test changes
- Full self-testing build is red/hung in `apps/server`

Issue status before this check:

- Open: 0
- In progress: 0
- Closed: 0

## 2. Build Status

Self-testing build commands:

- `bun run build` -> PASS (`real 9.28s`)
- `bun lint` -> PASS (`real 0.16s`)
- `bun typecheck` -> PASS (`real 5.24s`)
- `bun run test` -> FAIL / HUNG in `apps/server` after more than 2m27s; terminated after failures were already surfaced

Observed package test summaries from the current and prior logged runs:

- `@t3tools/desktop`: 26 passed
- `@t3tools/scripts`: 18 passed
- `@t3tools/contracts`: 53 passed
- `@t3tools/shared`: 19 passed
- `@t3tools/web`: 413 passed
- `apps/server`: multiple suites passed, but the run failed before clean completion

Observed monorepo totals before hang:

- Passed: at least 888
- Failed: at least 5
- Skipped: at least 2
- Errored: at least 1
- Wall-clock: > 2m27s before termination

Known failing / errored suites:

- `apps/server/integration/orchestrationEngine.integration.test.ts`
  - 7 tests | 3 failed | 1 skipped
  - Failing:
    - `runs a single turn end-to-end and persists checkpoint state in sqlite + git`
    - `runs multi-turn file edits and persists checkpoint diffs`
    - `reverts to an earlier checkpoint and trims checkpoint projections + git refs`
- `apps/server/src/orchestration/Layers/CheckpointReactor.test.ts`
  - 10 tests | 2 failed
  - Failing:
    - `captures pre-turn baseline on turn.started and post-turn checkpoint on turn.completed`
    - `processes consecutive revert requests with deterministic rollback sequencing`
- `apps/server/src/git/Layers/GitCore.test.ts`
  - Fresh regression surfaced during this check
  - Error:
    - `refreshes upstream behind count after checkout when remote branch advanced`
    - `Timed out in waitFor!`

New failures since last check:

- `apps/server/src/git/Layers/GitCore.test.ts` timeout surfaced during the fresh logged rerun

## 3. Fixture Drift

Golden freshness check compared the four JSON goldens under `features/claude-provider-health/golden/` against the latest mtime among:

- `features/claude-provider-health/SPEC.md`
- `apps/server/src/provider/Layers/ProviderHealth.test.ts`
- `packages/contracts/src/server.test.ts`
- `apps/web/src/components/chat/ProviderHealthBanner.test.tsx`
- `apps/server/src/wsServer.test.ts`
- `apps/web/src/components/ChatView.browser.tsx`
- `apps/web/src/components/chat/ProviderHealthBanner.tsx`

Stale goldens needing re-capture:

- `features/claude-provider-health/golden/provider-health-banner-unauthenticated.json`
- `features/claude-provider-health/golden/provider-status-authenticated.json`
- `features/claude-provider-health/golden/server-get-config-claude-unauthenticated.json`
- `features/claude-provider-health/golden/server-provider-status-invalid-alias-error.json`

## 4. RTM Progress

Current RTM snapshot:

- Rows: 1
- Fully green rows: 1
- Remaining unchecked cells: 0 within the tracked row

Delta since last check:

- No previous `.testing` baseline exists, so checked-to-checked deltas cannot be computed reliably
- No checked-to-unchecked regressions are visible in the current RTM snapshot

RTM gap:

- The matrix currently tracks only `claude-provider-health`, so broader Claude adapter coverage is not represented

## 5. Discriminating Power Spot-Check

Spot-checked tests:

- `packages/contracts/src/server.test.ts`
  - Passes under package-local Vitest
  - Uses golden `server-provider-status-invalid-alias-error.json`
  - Explicitly rejects anti-fixture `server-provider-status-invalid-alias-silent.json` via `assert.notStrictEqual(...)`
- `apps/web/src/components/chat/ProviderHealthBanner.test.tsx`
  - Passes under package-local Vitest
  - Uses golden `provider-health-banner-unauthenticated.json`
  - Explicitly rejects anti-fixture `provider-health-banner-unauthenticated-silent.json` via `!renderedText.includes(...)`
- `apps/server/src/provider/Layers/ProviderHealth.test.ts`
  - Passes under package-local Vitest
  - Uses golden `provider-status-authenticated.json`
  - Explicitly rejects anti-fixture `provider-status-authenticated-wrong-availability.json` by asserting JSON mismatch

Spot-check verdict:

- All 3 selected tests passed with their goldens
- All 3 include explicit anti-fixture rejection logic
- No sampled test accepted both the golden and anti-fixture

## 6. Blockers

- Full self-testing build is not green; `bun run test` fails in `apps/server`
- Fresh regression surfaced in `apps/server/src/git/Layers/GitCore.test.ts`
- `claude-provider-health` golden files appear stale and should be re-captured
- RTM scope is incomplete for the broader Claude adapter and related features
- No dedicated Claude adapter `TEST-PLAN.md` exists to compare exhaustive verification progress against

## 7. Persist Summary

- Check report written to `.testing/check-report.md`
- Issues ledger written to `.testing/issues.json`

Issue summary after this check:

- Open: 5
- Closed since last check: 0
- New this session: 5
