---
description: Test pyramid layers, assertion standards, and wiring requirements
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "tests/**"
---

# Test Pyramid

Execute layers in order. Failure at any layer halts the pipeline.

## Layer 1: Unit Tests
- **Scope:** Single function or method, isolated logic.
- **Data:** Golden files from characterization.
- **Test doubles:** Verified fakes only — for dependencies whose real behavior has been captured.
- **Assertion:** Output matches golden file exactly. Fails against anti-fixture.

## Layer 2: Schema / Input Validation Tests
- **Scope:** Input parsing, deserialization, schema enforcement, format handling.
- **Data:** Real captured valid inputs + deliberately malformed inputs (invalid schemas, corrupt files, missing fields, wrong encoding).
- **Assertion:** Valid input parses correctly. Invalid input produces a specific, documented error — not a silent fallback, not a crash.

## Layer 3: Component Tests
- **Scope:** Feature running end-to-end in isolation with real dependencies (real DB, real filesystem, real model) but without the rest of the application stack.
- **Data:** Golden file fixture pairs.
- **Assertion:** Given real input, produces output matching golden file.

## Layer 4: Integration / API Tests
- **Scope:** Feature exercised through the actual API layer. Real HTTP requests, real middleware, real auth, real database.
- **Data:** Golden file inputs sent as actual API requests.
- **Assertion:** Response matches golden file. Status codes, headers, and body all verified. Error paths return correct codes and messages.
- **Contracts:** If this service has consumers, verify contracts at this layer.

## Layer 5: End-to-End Tests
- **Scope:** Feature exercised through actual UI/CLI. Real browser/renderer, real user interactions, real API calls to real backend.
- **Data:** Golden file inputs entered through the UI.
- **Assertion:** UI renders correct output. User-visible state matches golden file. Error states display correctly.

## Wiring

All five layers execute inside the self-testing build command in order: Unit -> Schema -> Component -> Integration -> E2E.

Every new test is wired into the build immediately after creation. A test file not executed by the build command does not exist.
