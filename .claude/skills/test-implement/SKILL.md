---
name: test-implement
description: Start implementation with worktree isolation and baseline fixture verification
argument-hint: [plan-reference]
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-pyramid.md`

Plan reference (optional): $ARGUMENTS

## Instructions

You are beginning test implementation. Follow the test plan if one exists. If not, start with `/test-plan` first.

### 1. WORKTREE

Create an isolated worktree for this work if the tool supports it. This protects the main branch from incomplete work.

### 2. BASELINE

Run the self-testing build. Confirm all existing tests pass. Record:
- Total tests, passed, failed, skipped
- Build command used
- Any pre-existing failures (these are blockers — do not proceed until resolved)

### 3. FIXTURE VERIFY

Confirm all golden files are current:
- Re-run characterization for any feature whose dependencies or code changed since last capture
- Verify anti-fixtures exist for every golden file
- Flag stale fixtures for re-capture

### 4. IMPLEMENT

Write tests layer by layer, in pyramid order:
1. Unit tests — core logic against golden files
2. Schema tests — valid input parses, invalid input produces specific errors
3. Component tests — feature end-to-end with real deps
4. Integration tests — through real API layer
5. E2E tests — through real UI/CLI

### 5. DISCRIMINATING POWER

After writing each test:
- Run with golden file — must PASS
- Run with anti-fixture — must FAIL
- If it passes both, strengthen the assertion before moving on

### 6. WIRE

Add each test to the self-testing build immediately after writing. Run the build after wiring to confirm it discovers and executes the new test.

### 7. PROGRESS

Track completion against the plan:
- Which features and layers are done
- Which remain
- Any blockers encountered

## Output

Deliver: tests written per layer, discriminating power verification results, build status, plan progress report.
