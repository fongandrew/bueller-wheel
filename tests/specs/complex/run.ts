import * as fs from 'node:fs';

import {
	assertCountAtLeast,
	assertFileExists,
	assertFileMatches,
	pass,
	runBueller,
} from '../../verify-utils.js';

// Run Bueller with max 3 iterations
// Iteration 1: Process parent, decompose into 3 children
// Iteration 2: Process first child (should complete)
// Iteration 3: Process second child (should get stuck)
// After iteration 3: Third child should still be open
const result = await runBueller({
	issuesDir: './issues',
	maxIterations: 3,
	timeoutMs: 300000,
	additionalArgs: ['--no-git'],
});

if (result.timedOut) {
	throw new Error('FAIL: Test timed out after 300 seconds');
}

// Check that the parent issue was moved to review (decomposition)
await assertFileExists('issues/review/p1-001-parent.md', 'FAIL: Parent issue not moved to review');

// Check that the parent issue mentions decomposition
await assertFileMatches(
	'issues/review/p1-001-parent.md',
	/decompos/i,
	'FAIL: Parent issue does not mention decomposition',
);

// Check that child issues were created
let childCount = 0;
const suffixes = ['-001', '-002', '-003'];

for (const suffix of suffixes) {
	const openPath = `issues/open/p1-001-parent${suffix}.md`;
	const reviewPath = `issues/review/p1-001-parent${suffix}.md`;
	const stuckPath = `issues/stuck/p1-001-parent${suffix}.md`;

	if (fs.existsSync(openPath) || fs.existsSync(reviewPath) || fs.existsSync(stuckPath)) {
		childCount++;
	}
}

assertCountAtLeast(childCount, 3, `FAIL: Expected 3 child issues, found ${childCount}`);

// Count how many are in each state
let openCount = 0;
let reviewCount = 0;
let stuckCount = 0;

for (const suffix of suffixes) {
	if (fs.existsSync(`issues/open/p1-001-parent${suffix}.md`)) openCount++;
	if (fs.existsSync(`issues/review/p1-001-parent${suffix}.md`)) reviewCount++;
	if (fs.existsSync(`issues/stuck/p1-001-parent${suffix}.md`)) stuckCount++;
}

// Verify results:
// - At least one child should still be open (the third one that wasn't processed)
assertCountAtLeast(openCount, 1, `FAIL: Expected at least 1 child in open, found ${openCount}`);

// At least one task should be stuck (the impossible one)
assertCountAtLeast(stuckCount, 1, `FAIL: Expected at least 1 child in stuck, found ${stuckCount}`);

// Verify the stuck task has appropriate messaging
for (const suffix of suffixes) {
	const stuckPath = `issues/stuck/p1-001-parent${suffix}.md`;
	if (fs.existsSync(stuckPath)) {
		await assertFileMatches(
			stuckPath,
			/(stuck|cannot|unable|impossible|does not exist|no such file)/i,
			`FAIL: Stuck issue ${stuckPath} does not explain why it's stuck`,
		);
	}
}

pass(
	`Comprehensive test passed: ${childCount} children created, ${openCount} open, ${reviewCount} completed, ${stuckCount} stuck`,
);
