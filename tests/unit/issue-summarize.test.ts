import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
	expandMessages,
	formatIssueSummary,
	type IssueSummary,
	type LocatedIssue,
	locateIssueFile,
	parseIndexSpec,
	resolveIssueReference,
	summarizeIssue,
} from '../../src/issue-summarize.js';

// Test utilities
const tests: { name: string; fn: () => Promise<void> }[] = [];

function test(name: string, fn: () => Promise<void>) {
	tests.push({ name, fn });
}

// Test: locateIssueFile
test('locateIssueFile: finds file in open directory', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const issuesDir = path.join(tempDir, 'issues');

	await fs.mkdir(path.join(issuesDir, 'open'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'review'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'stuck'), { recursive: true });

	const testFile = 'p1-001-test.md';
	await fs.writeFile(path.join(issuesDir, 'open', testFile), '@user: Test');

	try {
		const result = await locateIssueFile(testFile, issuesDir);

		assert.notEqual(result, null);
		assert.equal(result?.status, 'open');
		assert.equal(result?.filename, testFile);
		assert.equal(result?.filePath, path.join(issuesDir, 'open', testFile));
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: locateIssueFile in review directory
test('locateIssueFile: finds file in review directory', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const issuesDir = path.join(tempDir, 'issues');

	await fs.mkdir(path.join(issuesDir, 'open'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'review'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'stuck'), { recursive: true });

	const testFile = 'p1-002-test.md';
	await fs.writeFile(path.join(issuesDir, 'review', testFile), '@user: Test');

	try {
		const result = await locateIssueFile(testFile, issuesDir);

		assert.notEqual(result, null);
		assert.equal(result?.status, 'review');
		assert.equal(result?.filename, testFile);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: locateIssueFile not found
test('locateIssueFile: returns null for non-existent file', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const issuesDir = path.join(tempDir, 'issues');

	await fs.mkdir(path.join(issuesDir, 'open'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'review'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'stuck'), { recursive: true });

	try {
		const result = await locateIssueFile('non-existent.md', issuesDir);
		assert.equal(result, null);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: resolveIssueReference with absolute path
test('resolveIssueReference: resolves absolute path', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const issuesDir = path.join(tempDir, 'issues');
	const openDir = path.join(issuesDir, 'open');

	await fs.mkdir(openDir, { recursive: true });

	const testFile = path.join(openDir, 'p1-003-test.md');
	await fs.writeFile(testFile, '@user: Test');

	try {
		const result = await resolveIssueReference(testFile, issuesDir);

		assert.notEqual(result, null);
		assert.equal(result?.status, 'open');
		assert.equal(result?.filePath, testFile);
		assert.equal(result?.filename, 'p1-003-test.md');
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: resolveIssueReference with filename
test('resolveIssueReference: resolves filename by searching', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const issuesDir = path.join(tempDir, 'issues');

	await fs.mkdir(path.join(issuesDir, 'open'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'review'), { recursive: true });
	await fs.mkdir(path.join(issuesDir, 'stuck'), { recursive: true });

	const testFile = 'p1-004-test.md';
	await fs.writeFile(path.join(issuesDir, 'stuck', testFile), '@user: Test');

	try {
		const result = await resolveIssueReference(testFile, issuesDir);

		assert.notEqual(result, null);
		assert.equal(result?.status, 'stuck');
		assert.equal(result?.filename, testFile);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: summarizeIssue with single message
test('summarizeIssue: single message (300 char limit)', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const testFile = path.join(tempDir, 'test.md');

	const shortContent = '@user: Short message';
	await fs.writeFile(testFile, shortContent);

	try {
		const located: LocatedIssue = {
			filePath: testFile,
			status: 'open',
			filename: 'test.md',
		};

		const summary = await summarizeIssue(located);

		assert.equal(summary.messageCount, 1);
		assert.equal(summary.abbreviatedMessages.length, 1);
		assert.equal(summary.abbreviatedMessages[0]?.content, 'Short message');
		assert.equal(summary.abbreviatedMessages[0]?.isAbbreviated, false);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: summarizeIssue with long single message (truncation at 300 chars)
test('summarizeIssue: single message truncated at 300 chars', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const testFile = path.join(tempDir, 'test.md');

	const longContent = 'A'.repeat(350);
	await fs.writeFile(testFile, `@user: ${longContent}`);

	try {
		const located: LocatedIssue = {
			filePath: testFile,
			status: 'open',
			filename: 'test.md',
		};

		const summary = await summarizeIssue(located);

		assert.equal(summary.messageCount, 1);
		assert.equal(summary.abbreviatedMessages[0]?.isAbbreviated, true);
		assert.equal(summary.abbreviatedMessages[0]?.content.length, 303); // 300 + '...'
		assert.equal(summary.abbreviatedMessages[0]?.fullContent.length, 350);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: summarizeIssue with multiple messages (first and last 300, middle 80)
test('summarizeIssue: multiple messages with correct truncation', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const testFile = path.join(tempDir, 'test.md');

	const firstMsg = 'A'.repeat(350);
	const middleMsg1 = 'B'.repeat(100);
	const middleMsg2 = 'C'.repeat(100);
	const lastMsg = 'D'.repeat(350);

	const content = `@user: ${firstMsg}

---

@claude: ${middleMsg1}

---

@user: ${middleMsg2}

---

@claude: ${lastMsg}`;

	await fs.writeFile(testFile, content);

	try {
		const located: LocatedIssue = {
			filePath: testFile,
			status: 'open',
			filename: 'test.md',
		};

		const summary = await summarizeIssue(located);

		assert.equal(summary.messageCount, 4);

		// First message: 300 char limit
		assert.equal(summary.abbreviatedMessages[0]?.isAbbreviated, true);
		assert.equal(summary.abbreviatedMessages[0]?.content.length, 303); // 300 + '...'
		assert.equal(summary.abbreviatedMessages[0]?.fullContent.length, 350);

		// Middle messages: 80 char limit
		assert.equal(summary.abbreviatedMessages[1]?.isAbbreviated, true);
		assert.equal(summary.abbreviatedMessages[1]?.content.length, 83); // 80 + '...'
		assert.equal(summary.abbreviatedMessages[1]?.fullContent.length, 100);

		assert.equal(summary.abbreviatedMessages[2]?.isAbbreviated, true);
		assert.equal(summary.abbreviatedMessages[2]?.content.length, 83); // 80 + '...'
		assert.equal(summary.abbreviatedMessages[2]?.fullContent.length, 100);

		// Last message: 300 char limit
		assert.equal(summary.abbreviatedMessages[3]?.isAbbreviated, true);
		assert.equal(summary.abbreviatedMessages[3]?.content.length, 303); // 300 + '...'
		assert.equal(summary.abbreviatedMessages[3]?.fullContent.length, 350);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: parseIndexSpec with single index
test('parseIndexSpec: parses single index', async () => {
	const result = parseIndexSpec('3');
	assert.deepEqual(result, [3]);
});

// Test: parseIndexSpec with range
test('parseIndexSpec: parses range', async () => {
	const result = parseIndexSpec('1,3');
	assert.deepEqual(result, [1, 2, 3]);
});

// Test: parseIndexSpec with invalid input
test('parseIndexSpec: returns null for invalid input', async () => {
	assert.equal(parseIndexSpec('invalid'), null);
	assert.equal(parseIndexSpec('-1'), null);
	assert.equal(parseIndexSpec('3,1'), null); // end < start
	assert.equal(parseIndexSpec('1,2,3'), null); // too many parts
});

// Test: expandMessages
test('expandMessages: expands single message', async () => {
	const summary: IssueSummary = {
		issue: { filePath: '', status: 'open', filename: 'test.md' },
		messageCount: 3,
		abbreviatedMessages: [
			{
				index: 0,
				author: 'user',
				content: 'Short...',
				isAbbreviated: true,
				fullContent: 'Short full content',
			},
			{
				index: 1,
				author: 'claude',
				content: 'Mid...',
				isAbbreviated: true,
				fullContent: 'Mid full content',
			},
			{
				index: 2,
				author: 'user',
				content: 'Last...',
				isAbbreviated: true,
				fullContent: 'Last full content',
			},
		],
	};

	const expanded = expandMessages(summary, '1');

	assert.equal(expanded.abbreviatedMessages[0]?.content, 'Short...');
	assert.equal(expanded.abbreviatedMessages[0]?.isAbbreviated, true);

	assert.equal(expanded.abbreviatedMessages[1]?.content, 'Mid full content');
	assert.equal(expanded.abbreviatedMessages[1]?.isAbbreviated, false);

	assert.equal(expanded.abbreviatedMessages[2]?.content, 'Last...');
	assert.equal(expanded.abbreviatedMessages[2]?.isAbbreviated, true);
});

// Test: expandMessages with range
test('expandMessages: expands range of messages', async () => {
	const summary: IssueSummary = {
		issue: { filePath: '', status: 'open', filename: 'test.md' },
		messageCount: 4,
		abbreviatedMessages: [
			{
				index: 0,
				author: 'user',
				content: 'A...',
				isAbbreviated: true,
				fullContent: 'A full',
			},
			{
				index: 1,
				author: 'claude',
				content: 'B...',
				isAbbreviated: true,
				fullContent: 'B full',
			},
			{
				index: 2,
				author: 'user',
				content: 'C...',
				isAbbreviated: true,
				fullContent: 'C full',
			},
			{
				index: 3,
				author: 'claude',
				content: 'D...',
				isAbbreviated: true,
				fullContent: 'D full',
			},
		],
	};

	const expanded = expandMessages(summary, '1,2');

	assert.equal(expanded.abbreviatedMessages[0]?.content, 'A...');
	assert.equal(expanded.abbreviatedMessages[0]?.isAbbreviated, true);

	assert.equal(expanded.abbreviatedMessages[1]?.content, 'B full');
	assert.equal(expanded.abbreviatedMessages[1]?.isAbbreviated, false);

	assert.equal(expanded.abbreviatedMessages[2]?.content, 'C full');
	assert.equal(expanded.abbreviatedMessages[2]?.isAbbreviated, false);

	assert.equal(expanded.abbreviatedMessages[3]?.content, 'D...');
	assert.equal(expanded.abbreviatedMessages[3]?.isAbbreviated, true);
});

// Test: formatIssueSummary
test('formatIssueSummary: formats summary correctly', async () => {
	const summary: IssueSummary = {
		issue: {
			filePath: '/path/to/p1-001-test.md',
			status: 'open',
			filename: 'p1-001-test.md',
		},
		messageCount: 2,
		abbreviatedMessages: [
			{
				index: 0,
				author: 'user',
				content: 'First message',
				isAbbreviated: false,
				fullContent: 'First message',
			},
			{
				index: 1,
				author: 'claude',
				content: 'Second...',
				isAbbreviated: true,
				fullContent: 'Second message full',
			},
		],
	};

	const formatted = formatIssueSummary(summary);

	assert.ok(formatted.includes('[OPEN]'));
	assert.ok(formatted.includes('p1-001-test.md'));
	assert.ok(formatted.includes('Messages: 2'));
	assert.ok(formatted.includes('[0] @User:'));
	assert.ok(formatted.includes('First message'));
	assert.ok(formatted.includes('[1] @Claude [abbreviated]:'));
	assert.ok(formatted.includes('Second...'));
});

// Test: formatIssueSummary with file path option
test('formatIssueSummary: includes file path when option enabled', async () => {
	const summary: IssueSummary = {
		issue: {
			filePath: '/path/to/p1-002-test.md',
			status: 'review',
			filename: 'p1-002-test.md',
		},
		messageCount: 1,
		abbreviatedMessages: [
			{
				index: 0,
				author: 'user',
				content: 'Test',
				isAbbreviated: false,
				fullContent: 'Test',
			},
		],
	};

	const formatted = formatIssueSummary(summary, { showFilePath: true });

	assert.ok(formatted.includes('Path: /path/to/p1-002-test.md'));
	assert.ok(formatted.includes('[REVIEW]'));
});

// Run all tests
async function runTests() {
	const colors = {
		green: '\x1b[0;32m',
		red: '\x1b[0;31m',
		yellow: '\x1b[1;33m',
		reset: '\x1b[0m',
	};

	let passed = 0;
	let failed = 0;

	console.log(`Running ${tests.length} tests for issue-summarize...\n`);

	for (const { name, fn } of tests) {
		try {
			await fn();
			passed++;
			console.log(`${colors.green}✓${colors.reset} ${name}`);
		} catch (error) {
			failed++;
			console.log(`${colors.red}✗${colors.reset} ${name}`);
			if (error instanceof Error) {
				console.log(`  ${colors.red}${error.message}${colors.reset}`);
				if (error.stack) {
					const stackLines = error.stack.split('\n').slice(1, 4);
					stackLines.forEach((line) => console.log(`  ${line}`));
				}
			}
		}
	}

	console.log(`\n${colors.yellow}issue-summarize results:${colors.reset}`);
	console.log(`  Total: ${tests.length}`);
	console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
	console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);

	if (failed > 0) {
		process.exit(1);
	}
}

runTests().catch((error) => {
	console.error('Test runner error:', error);
	process.exit(1);
});
