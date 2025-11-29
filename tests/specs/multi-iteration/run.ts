import {
	assertCountAtLeast,
	assertFileContains,
	assertFileExists,
	countInFile,
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
	'issues/review/p1-001-counting.md',
	'FAIL: Issue not moved to review',
);

// Check that all three files were created
for (let i = 1; i <= 3; i++) {
	const filename = `count${i}.txt`;
	assertFileExists(filename, `FAIL: ${filename} was not created`);
	assertFileContains(
		filename,
		`${i}`,
		`FAIL: ${filename} does not contain '${i}'`,
	);
}

// Check that there are multiple @claude responses (multi-iteration)
const claudeCount = countInFile('issues/review/p1-001-counting.md', '@claude:');
assertCountAtLeast(
	claudeCount,
	2,
	`FAIL: Expected multiple @claude responses (found ${claudeCount})`,
);

pass(`All checks passed (multi-iteration test with ${claudeCount} responses)`);
