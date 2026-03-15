---
name: test-capture
description: Run code with real inputs, capture raw I/O without writing tests
argument-hint: [feature-name or command to observe]
---

Testing rules:
!`cat .claude/rules/testing-core.md`

Target: $ARGUMENTS

## Instructions

You are capturing raw I/O from real execution. This is observation only — no tests, no assertions, no anti-fixtures, no RTM updates. Captures live in `.testing/captures/` (gitignored) and can be promoted to golden files later via `/test-golden`.

### 1. IDENTIFY TARGET

What to observe:
- Feature, endpoint, command, or function to execute
- What real inputs to use (not synthetic — use actual data, real configs, real requests)
- Which scenarios: happy path, edge cases, error paths

### 2. ENSURE ENVIRONMENT

Install all dependencies. Confirm services are reachable. If any dependency or service is unavailable — **STOP and report**. Do NOT fabricate output. Do NOT guess what the output would be.

### 3. EXECUTE AND RECORD

For each scenario:

1. **Run the code for real** with real inputs against real infrastructure
2. **Capture raw input** — save exactly what was provided:
   - CLI args, request body, config file, environment variables
   - Save to `.testing/captures/<feature>/<scenario>.input.json`
3. **Capture raw output** — save exactly what came back:
   - Return value, response body, stdout/stderr, files created/modified
   - Save to `.testing/captures/<feature>/<scenario>.output.json`
4. **Capture metadata** — context for reproducibility:
   - Save to `.testing/captures/<feature>/<scenario>.meta.json`
   - Include: command used, working directory, environment variables, timestamp, exit code, duration, git SHA, OS, language version
5. **Capture logs** — all structured log output during execution:
   - Save to `.testing/captures/<feature>/<scenario>.log.json`
   - Include: log level, message, timestamp, any structured fields

Do NOT alter, filter, or pretty-print captured output. Save it raw and verbatim.

### 4. ANNOTATE

For each captured output:
- Add a one-line `"NOTE"` field to the meta file: what happened in plain language
- Flag anything surprising, undocumented, or different from expectations
- Note any non-deterministic fields (timestamps, UUIDs, random values)

### 5. REPORT

List all captures with full paths:
```
.testing/captures/<feature>/
  happy-path.input.json
  happy-path.output.json
  happy-path.meta.json
  happy-path.log.json
  edge-case.input.json
  ...
```

State clearly:
- "These are raw captures from real execution, not test fixtures."
- "Run `/test-golden` to review and promote to `features/<feature>/golden/`."
- "Run `/test-feature` to build full test coverage using these captures."

Do NOT write tests. Do NOT create anti-fixtures. Do NOT update RTM. This skill is pure observation.
