import {
	assertFileContains,
	assertFileExists,
	assertFileNotExists,
	pass,
	runBueller,
} from '../../verify-utils.js';

// Run Bueller
const result = await runBueller({
	issuesDir: './issues',
	maxIterations: 10,
	timeoutMs: 60000,
});

if (result.timedOut) {
	throw new Error('FAIL: Test timed out after 60 seconds');
}

// Check that the issue was moved to review
assertFileExists(
	'issues/review/p1-001-hello.md',
	'FAIL: Issue not moved to review',
);

// Check that the issue is not in open anymore
assertFileNotExists(
	'issues/open/p1-001-hello.md',
	'FAIL: Issue still in open directory',
);

// Check that hello.txt was created
assertFileExists('hello.txt', 'FAIL: hello.txt was not created');

// Check that hello.txt has the correct content
assertFileContains(
	'hello.txt',
	'Hello, World!',
	"FAIL: hello.txt does not contain 'Hello, World!'",
);

// Check that the issue file has a @claude response
assertFileContains(
	'issues/review/p1-001-hello.md',
	'@claude:',
	'FAIL: Issue does not have a @claude response',
);

pass('All checks passed');
