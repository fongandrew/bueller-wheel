@user Log the output of the Grep tool call.

The json for a call looks like this:

```
{"parentUuid":"1305b86c-f288-4a1b-b499-3a32d02c3f77","isSidechain":false,"userType":"external","cwd":"/Users/afong/repos/slip-switch","sessionId":"fca7fb86-7f35-415e-872e-1241ce25db86","version":"2.0.55","gitBranch":"main","slug":"jaunty-percolating-treasure","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01WUAY5Pa2MgcPn4b7KETCZD","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_012Mfnb3T98sPFqzeEyqoL5U","name":"Grep","input":{"pattern":"keydown.*markdown|markdown.*key","glob":"src/renderer/**/*.ts","output_mode":"files_with_matches"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":0,"cache_creation_input_tokens":411,"cache_read_input_tokens":124860,"cache_creation":{"ephemeral_5m_input_tokens":411,"ephemeral_1h_input_tokens":0},"output_tokens":472,"service_tier":"standard"}},"requestId":"req_011CVaioYJH5f3i8ZX7qFyS9","type":"assistant","uuid":"0a6fd9f7-c39f-40e0-926b-ad7ee95d40bd","timestamp":"2025-11-28T17:58:52.194Z"}
```

We want to log the `input.pattern` (`keydown.*markdown|markdown.*key`) and the `input.glob` (`src/renderer/**/*.ts`) if applicable. Should handle the absence of these variables gracefully.

---

@claude: I have implemented logging for the Grep tool calls.

Here is a summary of the work I have done:
- Added a new case for 'grep' in the `logToolUse` function in `src/index.ts`
- The implementation logs the `pattern` parameter when present
- It also logs the `glob` parameter in parentheses when present (e.g., "pattern (glob)")
- The code handles the absence of these variables gracefully using conditional checks
- Verified that `pnpm run lint:fix` passes
- Verified that `pnpm run typecheck` passes
