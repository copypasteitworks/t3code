---
name: test-bootstrap
description: Set up test infrastructure from scratch
argument-hint: ""
---

Testing rules:
!`cat .claude/rules/testing-core.md`
!`cat .claude/rules/testing-pyramid.md`
!`cat .claude/rules/testing-planning.md`

## Instructions

You are bootstrapping test infrastructure. Work autonomously. Do not declare done until the self-testing build passes from clean state.

### 1. INVENTORY

Read the entire project structure. Identify:
- Language, framework, package manager, build system
- Existing test files (if any) and their quality
- CI configuration (if any)
- Every user-facing feature, API endpoint, CLI command, and documented behavior

Output this inventory before proceeding.

### 2. ENVIRONMENT

Install all production and dev dependencies. Download required assets (models, datasets, binaries). Verify the project builds with zero errors. Fix failures before proceeding.

### 3. SELF-TESTING BUILD

Create or verify a single top-level command that executes:
1. Install/verify dependencies
2. Build the project
3. Run linter/type checks
4. Run unit tests
5. Run schema/validation tests
6. Run component tests
7. Run integration tests
8. Run E2E tests

Exits 0 on full pass, non-zero on any failure. Create empty test directories for layers without tests yet so tests can be added without rewiring.

### 4. RTM SCAFFOLD

Create `features/RTM.md` with one row per feature from Step 1:

```
| ID | Feature | Golden | Unit | Schema | Component | Integration | E2E |
```

All cells start unchecked. Flip only when a passing, wired-in test exists.

### 5. FIRST FEATURE

Pick the most critical feature. Execute the characterization workflow:
1. Run with real input against real infrastructure
2. Save input as fixture, output as golden file
3. Create at least one anti-fixture
4. Write first test: assert golden match, verify anti-fixture rejection
5. Wire into self-testing build
6. Update RTM

### 6. VERIFY

Run self-testing build from clean state. Confirm it passes. Introduce a mutation in the first feature's code — test must fail. Revert — must pass.

### 7. REPORT

Deliver: self-testing build command, features inventoried, RTM created, first feature characterized, golden files captured, anti-fixtures created, mutation check result, remaining features to characterize.
