---
name: test-pre-merge
description: 8-gate pre-merge verification checklist
argument-hint: ""
---

Testing rules:
!`cat .claude/rules/testing-core.md`

## Instructions

Run this checklist before merge. Every gate must pass. Single failure = BLOCK.

### GATE 0 — OPEN ISSUES

Read `.testing/issues.json`:
- [ ] No open issues with severity "high"
- [ ] All bugs found by `/test-audit` or `/test-plan` are closed or acknowledged
- [ ] List any open medium/low issues (informational, does not block)

If high-severity issues are open, stop. Fix them first.

### GATE 1 — BUILD

Run self-testing build from clean state (clear caches, remove artifacts).
- [ ] Command exits with code 0
- [ ] Zero skipped tests
- [ ] Zero warnings treated as errors

If the build fails, stop. Fix it. Do not proceed.

### GATE 2 — RTM

- [ ] `features/RTM.md` has a row for every feature in the project
- [ ] Changed/added feature rows have no blank cells
- [ ] No pre-existing rows regressed from checked to unchecked

### GATE 3 — GOLDEN FILES

- [ ] Every golden file used in tests was captured from real execution
- [ ] Golden files for changed features were re-captured this session
- [ ] No golden files are stale (older than last dependency or feature change)
- [ ] Non-deterministic fields documented and excluded from comparison

### GATE 4 — ANTI-FIXTURES

- [ ] Every golden file has at least one corresponding anti-fixture
- [ ] Every test PASSES with its golden file
- [ ] Every test FAILS with its anti-fixture(s)

### GATE 5 — MUTATION SPOT-CHECK

Pick at least one test covering changed code:
- [ ] Introduce a small code mutation (off-by-one, wrong key, swapped args)
- [ ] At least one test fails with a diagnostic message
- [ ] Revert mutation — build passes again

### GATE 6 — DEPENDENCY HEALTH

- [ ] All dependencies install from lock file without errors
- [ ] No new dependency added without being used
- [ ] No removed dependency still imported

### GATE 7 — NO BEHAVIOR MODIFICATIONS

Review the diff. Confirm:
- [ ] No assertion weakened, removed, or made more permissive
- [ ] No try/except or error-swallowing added to silence failure
- [ ] No feature removed or scope reduced to make tests pass
- [ ] No real call replaced with stub without verified-fake justification
- [ ] No test skipped, commented out, or deleted for green

### GATE 8 — BUGFIX REGRESSION (if applicable)

- [ ] Regression test exists that fails without the fix
- [ ] Wrong output saved as permanent anti-fixture
- [ ] Regression test wired into self-testing build
- [ ] RTM links test to feature and issue ID

---

All 8 pass -> **MERGE**. Any fail -> **BLOCK**. Fix the failure, re-run from Gate 1.
