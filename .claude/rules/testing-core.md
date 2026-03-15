---
description: Core testing axiom and rules — always loaded
---

# Testing Axiom

A test that does not exercise real behavior against real data is a liability, not an asset. Passing suites built on unverified stubs, synthetic fixtures, or hollow assertions produce false confidence.

# Core Rules

1. **Characterize before asserting.** Run code with real inputs. Observe real output. Record as golden file. Only then write assertions. A test whose expected value was never empirically observed is a hallucinated oracle.

2. **Golden files come from execution, never from source reading.** Fixtures are captured from real runs — real API responses, real model outputs, real file transformations. Synthesizing a fixture by reading the implementation and guessing what it should return is prohibited.

3. **Install and resolve the full dependency tree first.** All packages, model weights, and services must be ready before the first line executes. Discovering a missing dependency from a stack trace and patching around it is prohibited.

4. **Use real data, real services, real infrastructure.** Every test exercises the actual runtime path. If execution requires an API call, a download, a database, or a paid resource — pay the cost.

5. **Verified fakes only.** Mocks, stubs, and fakes are permitted only for dependencies whose real behavior you have observed and captured in this session. Stubbing a function you have not yet successfully run is an unverified claim.

6. **Every assertion traces to observed behavior or documented requirement.** Ground truth comes from observation, not from reading source and assuming what it "should" do.

7. **One command runs everything.** Single top-level command (e.g. `make test`, `npm test`) installs, builds, and runs every test. A test not wired into this command does not exist.

8. **The self-testing build is "done."** No task complete until the single command passes end-to-end from clean state.
