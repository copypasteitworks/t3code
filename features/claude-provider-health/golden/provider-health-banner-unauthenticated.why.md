# WHY_CORRECT

When the active thread uses `claudeCode` and the server reports Claude as unauthenticated, ChatView passes that status into `ProviderHealthBanner`, which renders the human-readable provider label and the remediation message verbatim.
