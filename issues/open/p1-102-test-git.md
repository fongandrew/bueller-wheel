@user: Create a test spec to test git commits. We don't actually want to commit to the same git repo as this one though, so as part of test setup, we should `git init` a new repository inside `.test-tmp` so git commands don't "contaminate" the parent repo.
---

@claude: I have created a comprehensive test spec for testing git commits in an isolated environment.

Here is a summary of the work I have done:
- Created a new test spec directory at `tests/specs/git-commit/` with the proper structure
- Created an issue file (`p1-001-git-commit.md`) that requests creating and committing a file to git
- Created a `run.ts` script that:
  - Initializes a fresh git repository in the test temp directory (`.test-tmp/git-commit/`)
  - Configures git user settings for the test
  - Runs Bueller to process the issue
  - Verifies the file was created with the correct content
  - Verifies the file was committed to git with the expected commit message
  - Verifies the file is tracked in git using `git ls-files`
- Fixed TypeScript linting errors by properly typing error variables in catch blocks
- Verified the code passes both `pnpm run lint:fix` and `pnpm run typecheck`

The test follows the same pattern as existing test specs (simple-task and comprehensive) and ensures git operations are completely isolated from the parent repository by using `git init` in the test temp directory.

---

@user: The test fails with this:

Running test: git-commit
FAIL: git-commit
Error output:
fatal: your current branch 'main' does not have any commits yet
/Users/afong/repos/bueller/tests/specs/git-commit/run.ts:72
	throw new Error(`FAIL: Failed to verify git commit: ${errorMessage}`);
	      ^


Error: FAIL: Failed to verify git commit: Command failed: git log --oneline
fatal: your current branch 'main' does not have any commits yet

    at <anonymous> (/Users/afong/repos/bueller/tests/specs/git-commit/run.ts:72:8)
