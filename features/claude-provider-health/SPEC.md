# Claude Provider Health

## Contract

- Input
  - Server health probe input: Claude CLI subprocess results from `claude --version` and `claude auth status`.
  - API input: `ProviderHealth.getStatuses` values consumed by `server.getConfig`.
  - UI input: `server.getConfig().providers` plus the active thread session provider in ChatView.
- Output
  - Server health output: one canonical `ServerProviderStatus` object for `claudeCode`.
  - API output: `server.getConfig` response containing the Claude status entry in `providers`.
  - UI output: a visible provider health banner for the active Claude thread and a disabled `Claude Code` beta entry in the provider picker when Claude is unavailable.
- Error paths
  - Missing CLI binary returns `status: "error"` and `available: false`.
  - Auth failure returns `status: "error"`, `authStatus: "unauthenticated"`, and a remediation message.
  - Malformed provider payloads, including stale `provider: "claude"`, are rejected by the shared server schema rather than silently coerced.
  - Dynamic fields are normalized in tests where needed: `checkedAt` is frozen, and `keybindingsConfigPath` is normalized to `<STATE_DIR>/keybindings.json`.

## Characterization

- Happy path
  - `claude --version` succeeds and `claude auth status` reports `{"authenticated":true}`.
  - Output is a ready, available `claudeCode` provider status.
- Edge path
  - `server.getConfig` includes an unavailable Claude entry caused by unauthenticated CLI state.
  - ChatView renders the remediation banner and still shows Claude as a disabled beta option.
- Error path
  - A malformed `ServerProviderStatus` payload using stale `provider: "claude"` is rejected by schema decode with a provider-specific parse error.
