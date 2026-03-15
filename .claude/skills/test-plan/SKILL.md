---
name: test-plan
description: Characterize a feature, capture fixtures, plan test coverage around observed reality
argument-hint: [feature-name-or-scope]
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-fixtures.md`
!`cat .claude/rules/testing-planning.md`

Feature/scope to plan: $ARGUMENTS

## Instructions

You are planning test coverage. Characterize before planning — plan around observations, not assumptions.

### 0. DISCOVER PROJECT DOCUMENTATION

Before characterizing, find existing specs, requirements, and behavioral documentation:
- Search for: README.md, SPEC.md, docs/, api/, openapi.yaml, swagger.json, ARCHITECTURE.md, DESIGN.md, CONTRIBUTING.md, any *.md describing features or behavior
- Check for: inline doc comments, CLI --help output, man pages, generated docs
- Check for: existing test plans in `features/*/TEST-PLAN.md` or `.plans/`
- Check for: existing issues in `.testing/issues.json`
- Record what you find — these are the "requirements" for gap analysis in step 5
- Do NOT assume `features/<feature>/SPEC.md` is the only source of truth

### 1. CHARACTERIZE

Run the feature/system against real infrastructure. Do not read source and guess. Observe actual behavior.

### 2. INVENTORY

List every behavior, endpoint, and code path observed during characterization. Note any behavior that differs from documentation or expectations.

### 3. FIXTURE CAPTURE

For each observed behavior:
- Save input verbatim to `features/<feature>/fixtures/inputs/`
- Save output verbatim to `features/<feature>/golden/`
- Annotate each golden file: `# WHY_CORRECT: <one-line rationale>`

Minimum per feature: 1 happy path, 1 edge case, 1 error path.

### 4. ANTI-FIXTURES

For each golden file, create at least one plausible-but-wrong output:
- Field value change, truncation, wrong ordering, null injection, type mismatch

Save to `features/<feature>/fixtures/anti-fixtures/`.

### 5. GAP ANALYSIS

Compare observed behavior against requirements (SPEC.md if it exists, documentation, user expectations). Identify:
- Behaviors observed but not documented
- Requirements documented but not observed
- Error paths not yet characterized

### 6. TEST PLAN

For each behavior, specify:
- Which pyramid layers apply (Unit / Schema / Component / Integration / E2E)
- What assertions to write at each layer
- Which golden files and anti-fixtures to use
- Dependencies that need verified fakes

### 7. RTM DRAFT

Create or update `features/RTM.md` rows for every behavior identified. All cells start unchecked.

### 8. PERSIST

All findings must be written to disk — nothing is delivered only as conversation output.

- Write the test plan to `features/<feature>/TEST-PLAN.md`
- Write discovered bugs to `.testing/issues.json` (type: "bug")
- Write identified coverage gaps to `.testing/issues.json` (type: "gap")
- If `.testing/issues.json` exists, read it first — append new issues, do not duplicate existing ones
- Each issue needs: id, type, severity, status ("open"), title, detail, found_by ("/test-plan"), found_date, rtm_ref (if applicable)
- Auto-increment IDs: scan existing IDs by prefix (B for bugs, G for gaps) and use next number

## Output

All output is persisted to disk:
- Fixtures: `features/<feature>/fixtures/inputs/` and `features/<feature>/golden/`
- Anti-fixtures: `features/<feature>/fixtures/anti-fixtures/`
- Test plan: `features/<feature>/TEST-PLAN.md`
- Issues found: `.testing/issues.json`
- RTM draft: `features/RTM.md`
