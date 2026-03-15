# Dev Capture Rules

paths:
  - "internal/capture/**"
  - ".testing/captures/**"
  - ".testing/logs/**"

## Capture Infrastructure

The `internal/capture/` package records I/O during development. It is activated by environment variable and has zero overhead when inactive.

### Activation

```bash
APP_CAPTURE=1 myapp run                          # capture everything
APP_CAPTURE_DIR=./my-captures myapp run          # custom capture directory
```

In `main.go`:
```go
if os.Getenv("APP_CAPTURE") == "1" {
    rec, _ := capture.NewSession(os.Getenv("APP_CAPTURE_DIR"))
    capture.Register(rec)
    defer rec.Close()
}
```

### Rules

1. **Capture from real execution only.** Never fabricate capture data. If the system can't run, captures can't be created.

2. **Captures are ephemeral.** They live in `.testing/captures/` (gitignored). They are raw observations, not verified test data.

3. **Golden files come from captures, not the other way around.** Promotion flow: capture → review → promote to `features/<feature>/golden/`. Use `/test-golden` to promote.

4. **Logs must be correlated.** Every `capture.RecordLog()` call is associated with the active session. When reviewing captures, logs provide the internal trace of what happened.

5. **Instrument at I/O boundaries.** Add `capture.Record()` calls where the system:
   - Reads/writes files
   - Makes network requests
   - Executes external commands
   - Accepts user input
   - Returns results to callers

6. **Zero production overhead.** When `capture.Active()` is false, all capture functions are no-ops. The recorder is nil-checked behind a read lock. Do not add capture code that allocates or computes when inactive.

7. **Session files are self-contained.** Each `.session.json` includes environment, git SHA, all operations, all logs. A session file alone should be enough to understand what happened.

### Capture → Golden Promotion

```
.testing/captures/                    # Raw (gitignored)
    session-123.session.json

        ↓ /test-golden (review + promote)

features/<feature>/golden/            # Verified (tracked)
    happy-path.json                   # + WHY_CORRECT annotation

features/<feature>/fixtures/inputs/   # Verified (tracked)
    happy-path-input.json
```

### Anti-Pattern: Synthetic Captures

Do NOT create `.session.json` files by hand. Do NOT copy-paste expected values into capture format. Captures must come from `capture.Record()` during real execution. If you need fixtures without running the system, you don't need captures — you need to fix your environment so the system can run.
