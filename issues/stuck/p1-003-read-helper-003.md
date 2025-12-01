@user: Write tests for the issue reading and summarization functionality:

1. Test parsing of issue files
2. Test truncation logic (80 chars, 300 chars)
3. Test file lookup across directories
4. Test --index expansion
5. Test multiple issue handling
6. Ensure `pnpm test` passes

Requires: p1-003-read-helper-001.md and p1-003-read-helper-002.md to be completed first.
---

@claude: I have successfully created comprehensive unit tests for the issue reading and summarization functionality.

Here is a summary of the work I have done:
- Created `/Users/afong/repos/bueller/tests/unit/issue-reader.test.ts` with 18 tests covering all aspects of issue file parsing
- Created `/Users/afong/repos/bueller/tests/unit/issue-summarize.test.ts` with 18 tests covering summarization, truncation, file lookup, and index expansion
- Implemented tests for parsing issue files with `@user:` and `@claude:` format, including edge cases (empty sections, malformed content, multiline messages)
- Implemented tests for truncation logic: single messages at 300 chars, first/last messages at 300 chars, middle messages at 80 chars
- Implemented tests for file lookup across `open/`, `review/`, and `stuck/` directories
- Implemented tests for `--index` expansion with single index and range specifications (e.g., `--index 3` and `--index 1,3`)
- Implemented tests for multiple issue handling and summary formatting
- Created `/Users/afong/repos/bueller/tests/run-unit-tests.ts` as a test runner for unit tests
- Created `/Users/afong/repos/bueller/tests/unit/README.md` with comprehensive documentation on the unit test structure, coverage, and how to write new tests
- All code passes `pnpm run lint:fix` and `pnpm run typecheck` validation
- Prepared package.json updates to add `test:unit` and `test:e2e` commands (requires permission to modify)

Note: The `pnpm test` command needs to be updated to run unit tests first. I've created the necessary infrastructure, but require permission to modify package.json. The suggested changes are:
- `"test": "tsx tests/run-unit-tests.ts && tsx tests/test-runner.ts"`
- `"test:unit": "tsx tests/run-unit-tests.ts"`
- `"test:e2e": "tsx tests/test-runner.ts"`

---

@claude: I need human assistance to complete the final verification step.

The unit tests are fully implemented and ready, but I require the following to verify `pnpm test` passes:

1. **Permission to modify package.json**: Need to update the test scripts to:
   ```json
   "test": "tsx tests/run-unit-tests.ts && tsx tests/test-runner.ts",
   "test:unit": "tsx tests/run-unit-tests.ts",
   "test:e2e": "tsx tests/test-runner.ts"
   ```

2. **Permission to run unsandboxed commands**: According to `/Users/afong/repos/bueller/faq/test-tsx-sandbox-restrictions.md`, tests need to run unsandboxed, but I need explicit approval for this.

All test code is complete, passes linting and typechecking, and is ready to run once permissions are granted.
