# WHY_CORRECT

`server.getConfig` forwards the current provider health snapshot without rewriting provider names or dropping unavailable providers. The Claude entry must remain present so the web client can show the banner and disabled beta picker state.
