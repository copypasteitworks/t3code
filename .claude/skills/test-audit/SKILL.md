---
name: test-audit
description: Audit entire test suite for quality and completeness
argument-hint: ""
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-pyramid.md`
!`cat .claude/rules/testing-fixtures.md`

## Instructions

You are a test auditor. Ruthlessly verify the test suite is real, complete, and trustworthy. Do not stop until all phases complete and verdict rendered.

### 1. ENVIRONMENT

Read project structure (language, framework, package manager, build system). Install ALL deps from scratch. Download required assets. Zero-error build. Failures = critical finding.

### 2. SELF-TESTING BUILD

Locate single test command. If none exists — CRITICAL FAILURE, create one (build -> lint -> unit -> schema -> component -> integration -> E2E). If exists — verify every test file is discovered and executed. List orphaned/dead tests.

### 3. CLEAN-STATE RUN

Clear all caches/artifacts. Run build. Record: total, passed, failed, skipped, errored, wall-clock time. Skipped tests = dormant lies. Fix or delete each.

### 4. RTM RECONSTRUCTION

If RTM exists, audit it. If not, build one from observation:
- Search the entire project for behavioral documentation: README.md, SPEC.md, docs/, API specs, CLI help, ARCHITECTURE.md, DESIGN.md, any .md files describing features
- Enumerate every feature, endpoint, and documented behavior from ALL sources found
- Map to tests at each pyramid layer
- Blank cells = critical gaps

### 5. FIXTURE AUDIT

For each test, evaluate:
- **Empirical oracle?** Expected output from real execution, or invented from code?
- **Real execution path?** Calls real impl, or mocks system-under-test?
- **Verified fakes?** Evidence real dep was run and captured?
- **Meaningful assertion?** Actual outcome, or just "no error" / assert True / status 200?
- **Wired in?** Executed by the self-testing build?

Classify: **REAL** | **HOLLOW** | **DEAD**

### 6. MUTATION CHECK

Select 3-5 critical tests. For each:
1. Create anti-fixture (change one field, swap ordering, truncate)
2. Test must FAIL with anti-fixture
3. Introduce code mutation (off-by-one, wrong key, swapped args)
4. Build must catch it with diagnostic failure
5. Revert all mutations

### 7. CONTRACT & DEPENDENCY

- Contract tests exist if APIs consumed/provided?
- Verify against real providers
- Flag stale fixtures (>30 days without re-capture)
- All pinned deps resolve

### 8. VERDICT

```
Self-testing build: PASS/FAIL
Total tests: X | REAL: X | HOLLOW: X | DEAD: X
RTM coverage: X/Y features with full pyramid
Golden file quality: empirical X, synthetic X, stale X
Mutation results: [table]
Contract status: [summary]
Critical issues: [list every HOLLOW, DEAD, gap, unverified fake]
VERDICT: PASS or FAIL
```

Do NOT declare PASS to be helpful. A false PASS is the worst outcome.

### 9. PERSIST

Write all findings to disk — the verdict is not just conversation output.

- Write the full verdict to `.testing/audit.md` (overwrite previous)
- Write each critical issue to `.testing/issues.json`:
  - HOLLOW tests → type: "hollow", with test name and file path
  - Coverage gaps → type: "gap", with package/feature and missing layer
  - Dead tests → type: "gap", severity: "low"
- Read `.testing/issues.json` first — do not duplicate existing issues (match by title + file)
- Close issues that are no longer found (status: "closed", closed_by: "/test-audit")
