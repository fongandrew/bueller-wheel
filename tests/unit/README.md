# Unit Tests

This directory contains unit tests for individual modules in the Bueller codebase.

## Structure

- `issue-reader.test.ts` - Tests for the issue file parsing functionality
- `issue-summarize.test.ts` - Tests for issue summarization, file lookup, and truncation logic

## Running Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run all tests (unit + e2e)
pnpm test

# Run a specific test file directly
tsx tests/unit/issue-reader.test.ts
```

## Test Coverage

### issue-reader.test.ts

Tests the core issue reading and parsing functionality:

- ✓ Parsing issue files with `@user:` and `@claude:` format
- ✓ Extracting messages as separate entries
- ✓ Handling multiline content
- ✓ Handling empty sections and malformed content
- ✓ Reading files from disk
- ✓ Utility functions: `getLatestMessage()`, `getMessagesByAuthor()`, `formatMessage()`

### issue-summarize.test.ts

Tests the issue summarization and CLI functionality:

- ✓ File lookup across `open/`, `review/`, and `stuck/` directories
- ✓ Resolving absolute paths and filenames
- ✓ Truncation logic:
  - Single message: 300 character limit
  - First message: 300 character limit
  - Middle messages: 80 character limit
  - Last message: 300 character limit
- ✓ Index specification parsing (`--index N` and `--index M,N`)
- ✓ Expanding abbreviated messages
- ✓ Formatting summaries for console output
- ✓ Multiple issue handling

## Writing New Tests

The test files use Node.js's built-in `assert/strict` module for assertions. Each test file is self-contained and runs independently.

Basic test structure:

```typescript
import assert from 'node:assert/strict';

const tests: { name: string; fn: () => Promise<void> }[] = [];

function test(name: string, fn: () => Promise<void>) {
  tests.push({ name, fn });
}

// Define your tests
test('description of what is being tested', async () => {
  const result = someFunction();
  assert.equal(result, expectedValue);
});

// Test runner at the end
async function runTests() {
  // ... test runner implementation
}

runTests();
```

### Available Assertions

- `assert.equal(actual, expected)` - Strict equality
- `assert.deepEqual(actual, expected)` - Deep equality for objects/arrays
- `assert.ok(value)` - Truthy assertion
- `assert.notEqual(actual, expected)` - Inequality
- `assert.rejects(fn, error)` - Async function rejection

## Test Philosophy

These unit tests focus on:

1. **Fast execution** - Tests run in milliseconds using in-memory data or temporary files
2. **Isolation** - Each test is independent and doesn't affect others
3. **Clarity** - Test names clearly describe what is being tested
4. **Coverage** - Tests cover both happy paths and edge cases

For integration testing, see the e2e tests in `tests/specs/`.
