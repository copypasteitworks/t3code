---
description: No behavior mods, no speculative workarounds, traceability requirements
paths:
  - "**/src/**"
  - "**/lib/**"
---

# Implementation Rules During Testing

## Preserve Behavior Under Failure

When code fails a test, fix the root cause. These modifications are prohibited:

- Weakening a validation to make a test pass
- Swallowing an exception to silence a failure
- Removing a feature to reduce scope
- Replacing a real call with an unverified stub
- Downgrading an assertion (e.g., exact match to contains)
- Skipping, commenting out, or deleting a test to achieve green
- Adding error-swallowing try/except blocks

A passing test achieved by reducing scope is a regression disguised as progress.

## No Speculative Workarounds

When something breaks, diagnose the actual defect. These patterns are prohibited:

- Guess-and-patch try/except blocks not in the original design
- Fallback defaults that mask failures
- Conditional skips that bypass real execution
- Retry loops that hide intermittent failures

Each fix must address the actual defect, not suppress its symptom.

## Traceability

- Every assertion traces to an observed behavior or documented requirement.
- Every test traces to a feature in the RTM.
- An assertion based solely on reading source and assuming what it "should" do is a hallucinated oracle.
- An untraced test is unjustified. An untested feature is a known liability.

## Test-Driven Bugfixing

When fixing a bug in source code:

1. Reproduce the defect against real infrastructure first
2. Write a failing test before touching production code (Red)
3. The wrong output becomes a permanent anti-fixture
4. Fix the root cause with a minimal change (Green)
5. Run the full self-testing build to check for regressions
6. Update the RTM to close the coverage gap
