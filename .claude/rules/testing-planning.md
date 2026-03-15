---
description: Fixture-first planning protocol and RTM maintenance rules
paths:
  - "**/.plans/**"
  - "**/SPEC.md"
  - "**/RTM.md"
---

# Fixture-First Planning Protocol

Characterize before planning. Plan around observations, not assumptions.

## Planning Sequence

1. **Run the feature/system against real infrastructure.** Observe actual behavior before planning any tests.
2. **Capture actual inputs and outputs** as fixture files. These are the empirical basis for the plan.
3. **Identify gaps** between observed behavior and documented requirements.
4. **Plan test coverage** around captured reality. Specify which pyramid layers apply to each behavior.
5. **Create anti-fixtures** before writing any assertions.

## RTM Maintenance

The Requirements Traceability Matrix is the single source of truth for coverage scope.

### Format

```
| ID | Feature | Golden | Unit | Schema | Component | Integration | E2E |
```

### Rules

1. Every user-facing feature, endpoint, and behavior gets a row.
2. Every test pyramid layer gets a column.
3. A cell is checked only when a passing, wired-in test exists at that layer.
4. Blank cells are known gaps — document what is needed to close them.
5. Update the RTM on every feature addition, change, and bug fix.
6. No merge with blank cells unless the gap is explicitly acknowledged.
7. A bug that reached a user proves the RTM had a gap. Close it with a regression test.

### RTM Audit Checklist

- Every feature has a row
- Every row for changed/added features has no blank cells
- No rows regressed from checked to unchecked
- New regression tests are linked to features and issue IDs

## SPEC.md Structure

Each feature's SPEC.md documents:
- **Input contract:** Exact input type, format, source
- **Output contract:** Exact output type, format, destination
- **Error paths:** What happens on invalid input, missing deps, timeouts, partial data
- **Capture date:** When golden files were last captured from real execution
