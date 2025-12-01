import { execSync } from 'node:child_process';

import {
	assertFileContains,
	assertFileExists,
	assertFileNotExists,
	pass,
	runBueller,
} from '../../verify-utils.js';

// Initialize a git repository in the current directory
// This ensures git commands don't affect the parent repo
try {
	execSync('git init', { stdio: 'ignore' });
	execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
	execSync('git config user.name "Test User"', { stdio: 'ignore' });
} catch (error) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	throw new Error(`FAIL: Failed to initialize git repository: ${errorMessage}`);
}

// Run Bueller (git is now on by default)
const result = await runBueller({
	issuesDir: './issues',
	maxIterations: 10,
	timeoutMs: 300000,
	additionalArgs: [],
});

if (result.timedOut) {
	throw new Error('FAIL: Test timed out after 300 seconds');
}

// Check that the issue was moved to review
await assertFileExists('issues/review/p1-001-git-commit.md', 'FAIL: Issue not moved to review');

// Check that the issue is not in open anymore
await assertFileNotExists(
	'issues/open/p1-001-git-commit.md',
	'FAIL: Issue still in open directory',
);

// Check that test.txt was created
await assertFileExists('test.txt', 'FAIL: test.txt was not created');

// Check that test.txt has the correct content
await assertFileContains(
	'test.txt',
	'Cheeseballs',
	"FAIL: test.txt does not contain 'Cheeseballs'",
);

// Check that the issue file has a @claude response
await assertFileContains(
	'issues/review/p1-001-git-commit.md',
	'@claude:',
	'FAIL: Issue does not have a @claude response',
);

// Verify that a git commit was made
try {
	const commitLog = execSync('git log --oneline', { encoding: 'utf-8' });
	if (!commitLog.includes('p1-001-git-commit done')) {
		throw new Error(
			`FAIL: Git log does not contain expected commit message. Log: ${commitLog}`,
		);
	}
} catch (error) {
	if (error instanceof Error && error.message.startsWith('FAIL:')) {
		throw error;
	}
	const errorMessage = error instanceof Error ? error.message : String(error);
	throw new Error(`FAIL: Failed to verify git commit: ${errorMessage}`);
}

// Verify that test.txt is in the git history
try {
	const filesList = execSync('git ls-files', { encoding: 'utf-8' });
	if (!filesList.includes('test.txt')) {
		throw new Error(`FAIL: test.txt is not tracked by git. Files: ${filesList}`);
	}
} catch (error) {
	if (error instanceof Error && error.message.startsWith('FAIL:')) {
		throw error;
	}
	const errorMessage = error instanceof Error ? error.message : String(error);
	throw new Error(`FAIL: Failed to verify git tracked files: ${errorMessage}`);
}

pass('All checks passed - file created and committed to git');
