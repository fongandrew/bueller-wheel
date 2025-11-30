@user: Apply some colors to the console logs and stdout in our script. The colors should not be excessive but just make it easier for a user to parse what's going on.

Do not install any new dependencies. Using hard-coded color patterns like those in `test-runner.ts` is fine.

---

@claude: I have successfully added colors to the console output in the Bueller script.

Here is a summary of the work I have done:
- Added color definitions to `src/index.ts` using the same ANSI escape code pattern from `test-runner.ts` (red, green, yellow, blue, cyan, reset)
- Applied cyan color to informational messages (header, loading prompt, no changes to commit)
- Applied yellow color to warnings and iteration headers (prompt file not found, max iterations reached, iteration numbers)
- Applied green color to success messages (git commit created, no more issues, done)
- Applied blue color to agent lifecycle events (starting/finishing agent)
- Applied red color to error messages (git commit failed, main error handler)
- Applied cyan color to tool names in `logToolUse` function (e.g., `[Read]`, `[Bash]`, `[TodoWrite]`)
- Applied green color to completed todo checkmarks (✓) and yellow color to in-progress todos (⧖)
- Verified the changes pass both `pnpm run lint:fix` and `pnpm run typecheck`

The colors are subtle and help distinguish different types of output without being excessive, making it easier for users to quickly parse what's happening during script execution.
