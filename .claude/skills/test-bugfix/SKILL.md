---
name: test-bugfix
description: Red-Green-Refactor TDD for a bug
argument-hint: [bug-description-or-issue-id]
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-implementation.md`

Bug to fix: $ARGUMENTS

## Instructions

You are fixing a bug using Red-Green-Refactor. Do not touch production code until a failing test exists.

### 0. SELECT BUG

If `$ARGUMENTS` is an issue ID (e.g., "B1"):
- Read `.testing/issues.json` and find the issue by ID
- Use its title, detail, file, and rtm_ref as context

If `$ARGUMENTS` is a description:
- Search `.testing/issues.json` for matching open bugs
- If a match exists, use it (to avoid duplicate tracking)
- If no match, proceed with the description as-is

If no argument given:
- Read `.testing/issues.json`, list open bugs sorted by severity
- Pick the highest-severity open bug

### 1. REPRODUCE & CAPTURE

Follow repro steps against real infrastructure. Observe the defect. Capture:
- **Triggering input** — the exact request, file, action, or payload
- **Wrong output** — what the system currently produces
- **Correct output** — what it should produce (from SPEC, golden files, or user expectation)

Save:
- Input -> `features/<feature>/fixtures/inputs/bug-<id>`
- Correct output -> `features/<feature>/golden/bug-<id>`
- Wrong output -> `features/<feature>/fixtures/anti-fixtures/bug-<id>-actual`

### 2. RED

Write a test at the lowest applicable pyramid layer. Assert: given the triggering input, the system produces the correct expected output.

Run it. **It must fail.** This is the Red phase.

If the test passes: the bug is not reproduced or the assertion is too weak. Fix the test, not the code.

The wrong output is now a permanent anti-fixture. Even after the fix, the test must reject it forever.

### 3. GREEN

Fix the root cause. Minimal change.
- Do NOT weaken assertions
- Do NOT add workaround try/except
- Do NOT stub dependencies
- Do NOT change the test to match broken behavior

Run the new test. It must pass.

### 4. REGRESSION CHECK

Run the full self-testing build. All existing tests must still pass. If any break, the fix introduced a regression — diagnose the root cause. Do not disable broken tests.

### 5. MUTATION VERIFY

1. Revert the fix -> test fails (confirms non-hollow)
2. Re-apply fix -> test passes
3. Introduce a related mutation near the fix site -> at least one test catches it
4. Revert all mutations

### 6. WIRE & TRACE

Confirm the new test is wired into the self-testing build. Update `features/RTM.md`:
- Link regression test to the feature row
- Add the issue ID
- Mark previously blank coverage cells

### 7. PERSIST & REPORT

All work is written to disk:

- Update `.testing/issues.json`: set the bug's status to "closed", closed_by to "/test-bugfix", closed_date to today, fix_commit to the commit hash
- If the bug was not in issues.json (ad-hoc fix), add it as a closed issue for traceability
- Fixtures: `features/<feature>/fixtures/inputs/bug-<id>`, `features/<feature>/golden/bug-<id>`, `features/<feature>/fixtures/anti-fixtures/bug-<id>-actual`
- Update `features/RTM.md` with coverage cells and issue ID
