@user: Do not automatically kick off the agent loop if no commands are passed. Rather, require one of these forms:

- `pnpm run dev --run`: Explicitly starts the loop with defaults
- `pnpm run dev --git`: Implicitly starts the loop
- `pnpm run dev --max 50`: Starts the loop with a specified max iterations (rename the current `--max-iterations` flag to just `max` for brevity)
- `pnpm run dev --continue`: Continues the loop with default prompt
- `pnpm run dev --continue "do this"`: Continues the loop with given prompt

Update the README.

Update tests. Make sure `pnpm test` passes.


---

@claude: I have successfully implemented the required changes to require explicit run flags for the CLI.

Here is a summary of the work I have done:
- Updated CLI argument parsing to require explicit run flags (`--run`, `--git`, `--max`, or `--continue`)
- Renamed `--max-iterations` flag to `--max` for brevity
- Updated the `parseArgs()` function to check for run flags and exit with error if none are provided
- Modified help text to clearly show the new usage patterns
- Updated README.md with new CLI usage examples and documentation
- Updated test utilities (`verify-utils.ts`) to add `--run` flag by default, with logic to avoid duplicates when `--git`, `--continue`, or `--max` are in additionalArgs
- Updated git-commit test to use `--git` instead of `--git-commit`
- Verified all checks pass: `pnpm run lint:fix`, `pnpm run typecheck`, and `pnpm test` all succeed
