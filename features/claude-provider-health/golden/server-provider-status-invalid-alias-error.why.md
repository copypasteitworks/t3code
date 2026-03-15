# WHY_CORRECT

`ServerProviderStatus.provider` is defined by the shared `ProviderKind` schema, which accepts only `codex` and `claudeCode`. A stale alias payload using `claude` must fail schema decode instead of silently passing.
