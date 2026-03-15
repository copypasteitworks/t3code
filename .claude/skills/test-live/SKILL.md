---
name: test-live
description: Execute as a real user would, capture full session
argument-hint: [scenario description or user journey]
---

Testing rules:
!`cat .claude/rules/testing-core.md`

Scenario: $ARGUMENTS

## Instructions

You are running the system exactly as a real user would — through the actual interface (CLI, API, UI). Capture the complete session for reproducibility and future test creation.

### 1. DEFINE THE USER JOURNEY

Write out step-by-step what a real user would do:
- What commands they'd run (CLI) / requests they'd send (API) / actions they'd take (UI)
- What they'd expect to see at each step
- What side effects should occur (files created, DB changes, emails sent, etc.)

### 2. SET UP REAL ENVIRONMENT

- Install all dependencies
- Configure as a real user would (not with test-specific shortcuts)
- Use real data, real services, real infrastructure
- If something is unavailable — **STOP and report**. Do NOT mock it.

### 3. EXECUTE THE FULL JOURNEY

Run each step through the **actual user interface**:
- **CLI:** Run real commands with real arguments in a real shell
- **API:** Send real HTTP requests with real headers and bodies
- **UI:** Interact through real browser/renderer if applicable

Do NOT call internal functions directly. Do NOT skip setup steps. Do NOT use test harnesses. Execute exactly as a user would.

### 4. CAPTURE THE COMPLETE SESSION

Record everything:

**Inputs** (what the user did):
- Commands typed, requests sent, buttons clicked
- Arguments, headers, form data
- Timing between steps

**Outputs** (what the system showed):
- stdout/stderr for CLI, response bodies for API, rendered content for UI
- Status codes, headers, error messages
- Timing and duration of each response

**Side effects** (what changed):
- Files created, modified, or deleted (with before/after content)
- Database state changes
- Network calls made (to external services)
- Processes spawned or stopped

**Logs** (what happened internally):
- All log output with timestamps
- Correlated with which user action triggered them

Save the complete session:
→ `.testing/captures/<feature>/live-<scenario>.session.json`

### 5. VERIFY REPRODUCIBILITY

Re-run the same inputs in the same order. Compare outputs:
- **Deterministic fields:** Must match exactly
- **Non-deterministic fields:** Document them (timestamps, UUIDs, session tokens)
- **Side effects:** Must produce equivalent state

If the session is not reproducible, document why and which steps are non-deterministic.

### 6. IDENTIFY TEST CANDIDATES

From the session, identify:
- Which steps exercise distinct code paths (candidates for component/integration tests)
- Which outputs are deterministic enough for golden files
- Which error scenarios were encountered (candidates for error-path fixtures)
- Which steps a regression could break (candidates for E2E tests)

### 7. REPORT

Deliver:
- Session file path
- Number of steps executed
- Duration of full journey
- Reproducibility status (fully reproducible / partially / non-deterministic)
- List of test candidates with recommended pyramid layer
- "Run `/test-golden` to promote session outputs to golden files"
- "Run `/test-feature` to build test coverage from this session"
