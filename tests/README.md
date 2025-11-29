# End-to-End Tests

This directory contains end-to-end tests for the Bueller issue processor.

## Test Structure

```
tests/
├── specs/             # Test case definitions
│   ├── simple-task/
│   │   ├── issues/    # Initial issues directory structure
│   │   └── run.ts     # Test script (runs Bueller + verification)
│   └── ...
├── test-runner.ts     # Test runner that executes all specs
├── verify-utils.ts    # Shared utilities for test scripts
└── README.md          # This file
```

## How Tests Work

1. Each test case is a directory under `specs/` containing:
   - `issues/` - A complete issues directory with pre-made markdown files
   - `run.ts` - A TypeScript script that runs Bueller and verifies the outcome

2. The test runner (`tests/test-runner.ts`):
   - Builds the bueller script (`pnpm run build`)
   - For each test case:
     - Creates a temporary directory in `.test-tmp/` (git-ignored, inside the repo for node_modules access)
     - Copies the built script into it
     - Copies the test fixture (issues directory)
     - Executes the `run.ts` script using `tsx`
     - Reports success/failure

3. Test scripts (`run.ts`) should:
   - Import utilities from `../../verify-utils.js`
   - Call `runBueller()` to execute Bueller with specific CLI args
   - Check that issues moved to expected directories
   - Verify file contents if needed
   - Throw `VerificationError` for failures
   - Call `pass()` for success

## Running Tests

```bash
# Run all tests
pnpm test

# Run a specific test
pnpm test simple-task
```

## Creating a New Test Case

1. Create a new directory under `specs/`:
   ```bash
   mkdir -p tests/specs/my-test/issues/open
   mkdir -p tests/specs/my-test/issues/review
   mkdir -p tests/specs/my-test/issues/stuck
   ```

2. Add issue files to `issues/open/`:
   ```bash
   echo "@user: Do something" > tests/specs/my-test/issues/open/p1-001-test.md
   ```

3. Create a test script `run.ts`:
   ```typescript
   import {
     assertFileExists,
     assertFileNotExists,
     assertFileContains,
     pass,
     runBueller,
   } from '../../verify-utils.js';

   // Run Bueller with custom options
   const result = await runBueller({
     issuesDir: './issues',
     maxIterations: 10,
     timeoutMs: 60000,
   });

   if (result.timedOut) {
     throw new Error('FAIL: Test timed out');
   }

   // Check that the issue was moved to review
   assertFileExists(
     'issues/review/p1-001-test.md',
     'FAIL: Issue not moved to review'
   );

   // Check that it's not in open anymore
   assertFileNotExists(
     'issues/open/p1-001-test.md',
     'FAIL: Issue still in open directory'
   );

   pass('Issue correctly processed');
   ```

## Available Verification Utilities

The `verify-utils.ts` module provides:

### Running Bueller
- `runBueller(options?)` - Runs Bueller with specified options
  - `options.issuesDir` - Issues directory (default: `./issues`)
  - `options.maxIterations` - Max iterations (default: 10)
  - `options.timeoutMs` - Timeout in ms (default: 60000)
  - `options.additionalArgs` - Additional CLI args (default: [])
  - Returns: `{ exitCode, output, timedOut }`

### Assertions
- `assertFileExists(path, message?)` - Assert a file exists
- `assertFileNotExists(path, message?)` - Assert a file does not exist
- `assertFileContains(path, search, message?)` - Assert a file contains a string
- `assertFileMatches(path, pattern, message?)` - Assert a file matches a regex
- `countInFile(path, search)` - Count occurrences of a string
- `assertCount(actual, expected, message?)` - Assert a count equals expected
- `assertCountAtLeast(actual, minimum, message?)` - Assert a count is at least minimum
- `pass(message)` - Print success message and exit

All assert functions throw `VerificationError` on failure.

## Example Test Cases

- `simple-task` - Basic task that should complete in one iteration
- `multi-iteration` - Task that requires multiple iterations
- `decompose-task` - Task that should be decomposed into sub-tasks
- `stuck-task` - Task that should fail and move to stuck
