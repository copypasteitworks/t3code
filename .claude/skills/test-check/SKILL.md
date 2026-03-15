---
name: test-check
description: Compare current state vs plan, check fixture drift, RTM progress
argument-hint: ""
---

Testing rules:
!`cat .claude/rules/testing-planning.md`

## Instructions

You are checking test implementation progress. Compare current state against the plan and report status.

### 1. PLAN STATUS

Read the test plan if one exists. Search multiple locations:
- `features/*/TEST-PLAN.md` for feature-level plans
- `.plans/` for project-level plans
- `features/RTM.md` for coverage matrix
- `.testing/issues.json` for tracked issues

Compare current test coverage against planned coverage:
- List completed items (tests written, wired, passing)
- List remaining items
- Calculate completion percentage
- Report issue status: X open, X in-progress, X closed

### 2. BUILD STATUS

Run the self-testing build. Report:
- Total tests, passed, failed, skipped, errored
- Wall-clock time
- Any new failures since last check

### 3. FIXTURE DRIFT

Check golden file freshness:
- Compare golden file timestamps against source code and dependency timestamps
- Flag any golden files that are older than their associated feature's last change
- List fixtures that need re-capture

### 4. RTM PROGRESS

Compare current RTM against target:
- Cells that flipped from unchecked to checked since last check
- Remaining unchecked cells
- Any regressions (checked to unchecked)

### 5. DISCRIMINATING POWER SPOT-CHECK

Pick 2-3 tests at random:
- Verify each passes with its golden file
- Verify each fails with its anti-fixture
- Flag any that accept both

### 6. BLOCKERS

Identify anything preventing progress:
- Missing fixtures (feature not yet characterized)
- Unavailable services (cannot run real integration tests)
- Unclear requirements (cannot determine correct expected output)
- Dependency issues

### 7. PERSIST

Write the check report to disk:

- Write check report to `.testing/check-report.md` (overwrite previous)
- Write new blockers to `.testing/issues.json` (type: "blocker")
- Write new regressions to `.testing/issues.json` (type: "bug", detail noting it's a regression)
- Report issue summary: X open, X closed since last check, X new this session

## Output

All output is persisted to disk:
- Check report: `.testing/check-report.md`
- New issues: `.testing/issues.json`
- Summary: plan completion %, build status, stale fixtures list, RTM delta, spot-check results, blocker list
