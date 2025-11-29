import * as fs from 'node:fs';

import {
	assertCountAtLeast,
	assertFileExists,
	assertFileMatches,
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

// Check that the parent issue was moved to review
assertFileExists(
	'issues/review/p1-001-complex.md',
	'FAIL: Parent issue not moved to review',
);

// Check that child issues were created (they might be in open or review)
let childCount = 0;
const suffixes = ['-001', '-002', '-003'];

for (const suffix of suffixes) {
	const openPath = `issues/open/p1-001-complex${suffix}.md`;
	const reviewPath = `issues/review/p1-001-complex${suffix}.md`;

	if (fs.existsSync(openPath) || fs.existsSync(reviewPath)) {
		childCount++;
	}
}

assertCountAtLeast(
	childCount,
	3,
	`FAIL: Expected 3 child issues, found ${childCount}`,
);

// Check that the parent issue has a @claude response mentioning decomposition
assertFileMatches(
	'issues/review/p1-001-complex.md',
	/decompos/i,
	'FAIL: Parent issue does not mention decomposition',
);

pass(`Task successfully decomposed into ${childCount} child issues`);
