# Requirements Traceability Matrix

| Feature                  | Contract | Happy Golden | Edge Golden | Error Golden | Anti-fixtures | Unit | Schema | Component | Integration | E2E | Mutation | Notes                                                                                                                                      |
| ------------------------ | -------- | ------------ | ----------- | ------------ | ------------- | ---- | ------ | --------- | ----------- | --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `claude-provider-health` | ✅       | ✅           | ✅          | ✅           | ✅            | ✅   | ✅     | ✅        | ✅          | ✅  | ✅       | Claude provider health is surfaced from CLI probe output through `server.getConfig` into ChatView banner and provider availability gating. |
