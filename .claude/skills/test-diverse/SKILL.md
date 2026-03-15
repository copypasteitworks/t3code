---
name: test-diverse
description: Generate diverse inputs, run them all for real, capture results
argument-hint: [feature-name]
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-fixtures.md`

Feature: $ARGUMENTS

## Instructions

You are generating diverse, complex, realistic inputs and running them ALL against real infrastructure. The goal is coverage breadth — find behaviors the happy path misses.

### 1. ANALYZE THE CONTRACT

Read the feature contract:
- `features/<feature>/SPEC.md` if it exists
- Or observe the feature's real behavior by running it once
- Identify: input types, accepted formats, value ranges, required fields, optional fields

### 2. GENERATE DIVERSE INPUTS

Create inputs across these categories:

**Boundary values:**
- Zero, one, maximum, maximum+1, negative
- Empty string, single character, maximum length string
- Empty collection, single item, large collection

**Type variations:**
- Unicode: accented characters, CJK, Arabic/RTL, emoji, zero-width chars
- Numbers: integers, floats, scientific notation, infinity, NaN
- Strings with special characters: quotes, backslashes, newlines, tabs, null bytes

**Structural variations:**
- Missing optional fields
- Extra unexpected fields
- Nested structures at unusual depth
- Circular references (if applicable)

**Adversarial inputs:**
- SQL injection patterns
- Shell injection patterns
- Path traversal (`../../../etc/passwd`)
- Extremely large inputs (stress test)
- Malformed encoding (invalid UTF-8)

**Combination inputs:**
- Cross-feature interactions (multiple features exercised in one input)
- Conflicting settings (e.g., profile=minimal but commit_signing=true)
- Rapid succession (same input repeated immediately)

Save all generated inputs to `.testing/captures/<feature>/diverse/`

### 3. RUN EVERY INPUT FOR REAL

Execute each input against real infrastructure. For EVERY input:
- Record the input
- Record the raw output (success or failure)
- Record timing and resource usage
- Record any logs or side effects

Do NOT skip inputs that you "know" will fail. Run them anyway and capture the actual failure.

### 4. CATEGORIZE RESULTS

Sort each input/output pair into:

| Category | Meaning | Action |
|----------|---------|--------|
| **Expected success** | Output matches contract | Candidate golden file |
| **Expected error** | Known error path, handled correctly | Candidate error golden file |
| **Unexpected success** | Should have failed but didn't | Potential security/validation bug |
| **Unexpected error** | Should have succeeded but failed | Potential bug |
| **Crash** | Unhandled exception, panic, segfault | Critical bug |
| **Hang** | No response within timeout | Resource/deadlock bug |

### 5. PERSIST & REPORT

Write all results to disk:

- Save capture summary to `.testing/captures/<feature>/diverse/SUMMARY.md`
- For each unexpected result (unexpected success, unexpected error, crash, hang):
  - Write to `.testing/issues.json` as type "bug", severity based on category:
    - Crash/Hang → "high"
    - Unexpected error → "medium"
    - Unexpected success → "medium"
  - Include the triggering input path and actual output path in detail
- Read `.testing/issues.json` first — do not duplicate existing issues

```
Inputs generated: X
  Boundary:    X
  Unicode:     X
  Adversarial: X
  Structural:  X
  Combination: X

Results:
  Expected success:    X  → candidate golden files
  Expected error:      X  → candidate error fixtures
  Unexpected success:  X  → INVESTIGATE (filed as issues)
  Unexpected error:    X  → INVESTIGATE (filed as issues)
  Crash:               X  → CRITICAL (filed as issues)
  Hang:                X  → CRITICAL (filed as issues)

Captures: .testing/captures/<feature>/diverse/
Issues filed: .testing/issues.json
```

- "Run `/test-golden` to promote expected results to golden files"
- "Run `/test-bugfix B<id>` for each unexpected result" (reference the issue IDs just created)
- "Run `/test-feature` to build coverage using promoted captures"
