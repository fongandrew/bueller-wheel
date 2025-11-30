import * as fs from 'node:fs';

import { pass, runBueller } from '../../verify-utils.js';

// Run Bueller with empty queue
const result = await runBueller({
	issuesDir: './issues',
	maxIterations: 10,
	timeoutMs: 60000,
});

if (result.timedOut) {
	throw new Error('FAIL: Test timed out after 60 seconds');
}

// Verify that open directory is empty
const openDir = 'issues/open';
const openFiles = fs.readdirSync(openDir);
const issueFiles = openFiles.filter((f) => f.endsWith('.md'));

if (issueFiles.length !== 0) {
	throw new Error(`FAIL: Expected empty open directory, found ${issueFiles.length} issue(s)`);
}

// Should exit cleanly with code 0
if (result.exitCode !== 0) {
	throw new Error(`FAIL: Expected exit code 0, got ${result.exitCode}`);
}

pass('Empty queue handled correctly');
