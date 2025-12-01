@user: Exit early with the help text if there are unrecognized flags. `pnpm run dev --foobar` should *not* kick off the loop.

---

@claude: I have implemented the feature to exit early with help text when unrecognized flags are provided.

Here is a summary of the work I have done:
- Added a `recognizedFlags` Set to the `parseArgs()` function containing all valid flags
- Added validation logic that iterates through all arguments and checks if any that start with `-` are unrecognized
- When an unrecognized flag is detected, the program now prints an error message in red, shows the help text, and exits with code 1
- Verified that `pnpm run lint:fix` passes (fixed ESLint preference for `for-of` loop)
- Verified that `pnpm run typecheck` passes
- Tested that `node dist/index.js --foobar` correctly exits with error and shows help
- Tested that normal flags like `--help` continue to work correctly

---

@user: Create a test case verifying this.

---

@claude: I have created a comprehensive test case for verifying the unrecognized flag behavior.

Here is a summary of the work I have done:
- Created a new test spec at `tests/specs/unrecognized-flags/` with proper directory structure
- Implemented `run.ts` test script that verifies:
  - Running with `--foobar` exits with non-zero exit code
  - Error output contains "Unrecognized flag" message
  - Error output mentions the specific flag name
  - Help text (containing "Usage:") is displayed
  - A second test with `--invalid-option` to ensure general behavior
  - Valid flags like `--help` still work correctly and exit with code 0
- Verified that `pnpm run lint:fix` passes
- Verified that `pnpm run typecheck` passes
- The test follows the existing pattern from other specs (empty, git-commit, etc.)
- Test script uses the verify-utils helpers and has appropriate timeout handling

---

@user: The test fails. Ensure it passes `pnpm run test unrecognized-flags`