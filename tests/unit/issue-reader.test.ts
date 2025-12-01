import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
	formatMessage,
	getLatestMessage,
	getMessagesByAuthor,
	type ParsedIssue,
	parseIssueContent,
	readIssue,
} from '../../src/issue-reader.js';

// Test utilities
const tests: { name: string; fn: () => Promise<void> }[] = [];

function test(name: string, fn: () => Promise<void>) {
	tests.push({ name, fn });
}

// Test: Parse simple issue with single user message
test('parseIssueContent: single user message', async () => {
	const content = '@user: Hello world';
	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 1);
	assert.equal(result.messages[0]?.author, 'user');
	assert.equal(result.messages[0]?.content, 'Hello world');
	assert.equal(result.messages[0]?.index, 0);
	assert.equal(result.rawContent, content);
});

// Test: Parse issue with multiple messages
test('parseIssueContent: multiple messages with separator', async () => {
	const content = `@user: First message

---

@claude: Second message

---

@user: Third message`;

	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 3);
	assert.equal(result.messages[0]?.author, 'user');
	assert.equal(result.messages[0]?.content, 'First message');
	assert.equal(result.messages[0]?.index, 0);

	assert.equal(result.messages[1]?.author, 'claude');
	assert.equal(result.messages[1]?.content, 'Second message');
	assert.equal(result.messages[1]?.index, 1);

	assert.equal(result.messages[2]?.author, 'user');
	assert.equal(result.messages[2]?.content, 'Third message');
	assert.equal(result.messages[2]?.index, 2);
});

// Test: Parse issue with multiline content
test('parseIssueContent: multiline message content', async () => {
	const content = `@user: This is a message
with multiple lines
and more content

---

@claude: Response here
also multiline
with details`;

	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 2);
	assert.equal(
		result.messages[0]?.content,
		'This is a message\nwith multiple lines\nand more content',
	);
	assert.equal(result.messages[1]?.content, 'Response here\nalso multiline\nwith details');
});

// Test: Handle empty sections
test('parseIssueContent: empty sections are ignored', async () => {
	const content = `@user: First

---

---

@claude: Second

---`;

	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 2);
	assert.equal(result.messages[0]?.content, 'First');
	assert.equal(result.messages[1]?.content, 'Second');
});

// Test: Handle malformed sections
test('parseIssueContent: malformed sections are skipped', async () => {
	const content = `@user: Valid message

---

This is not a valid message format

---

@claude: Another valid message`;

	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 2);
	assert.equal(result.messages[0]?.author, 'user');
	assert.equal(result.messages[1]?.author, 'claude');
});

// Test: Empty content
test('parseIssueContent: empty content returns empty messages', async () => {
	const content = '';
	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 0);
	assert.equal(result.rawContent, '');
});

// Test: Whitespace handling
test('parseIssueContent: trims whitespace from content', async () => {
	const content = `@user:    Content with spaces

---

@claude:
  Indented content
  with multiple lines  `;

	const result = parseIssueContent(content);

	assert.equal(result.messages.length, 2);
	assert.equal(result.messages[0]?.content, 'Content with spaces');
	assert.equal(result.messages[1]?.content, 'Indented content\n  with multiple lines');
});

// Test: readIssue from file
test('readIssue: reads and parses file from disk', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bueller-test-'));
	const testFile = path.join(tempDir, 'test-issue.md');

	const content = `@user: Test issue

---

@claude: Test response`;

	await fs.writeFile(testFile, content);

	try {
		const result = await readIssue(testFile);

		assert.equal(result.messages.length, 2);
		assert.equal(result.messages[0]?.author, 'user');
		assert.equal(result.messages[0]?.content, 'Test issue');
		assert.equal(result.messages[1]?.author, 'claude');
		assert.equal(result.messages[1]?.content, 'Test response');
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
});

// Test: readIssue with non-existent file
test('readIssue: throws error for non-existent file', async () => {
	const nonExistentFile = '/tmp/non-existent-bueller-test-file-12345.md';

	await assert.rejects(
		async () => {
			await readIssue(nonExistentFile);
		},
		{
			message: /Failed to read issue file/,
		},
	);
});

// Test: getLatestMessage
test('getLatestMessage: returns last message', async () => {
	const issue: ParsedIssue = {
		messages: [
			{ index: 0, author: 'user', content: 'First' },
			{ index: 1, author: 'claude', content: 'Second' },
			{ index: 2, author: 'user', content: 'Third' },
		],
		rawContent: '',
	};

	const latest = getLatestMessage(issue);
	assert.equal(latest?.index, 2);
	assert.equal(latest?.content, 'Third');
});

// Test: getLatestMessage with empty issue
test('getLatestMessage: returns undefined for empty issue', async () => {
	const issue: ParsedIssue = {
		messages: [],
		rawContent: '',
	};

	const latest = getLatestMessage(issue);
	assert.equal(latest, undefined);
});

// Test: getMessagesByAuthor
test('getMessagesByAuthor: filters messages by author', async () => {
	const issue: ParsedIssue = {
		messages: [
			{ index: 0, author: 'user', content: 'User 1' },
			{ index: 1, author: 'claude', content: 'Claude 1' },
			{ index: 2, author: 'user', content: 'User 2' },
			{ index: 3, author: 'claude', content: 'Claude 2' },
		],
		rawContent: '',
	};

	const userMessages = getMessagesByAuthor(issue, 'user');
	assert.equal(userMessages.length, 2);
	assert.equal(userMessages[0]?.content, 'User 1');
	assert.equal(userMessages[1]?.content, 'User 2');

	const claudeMessages = getMessagesByAuthor(issue, 'claude');
	assert.equal(claudeMessages.length, 2);
	assert.equal(claudeMessages[0]?.content, 'Claude 1');
	assert.equal(claudeMessages[1]?.content, 'Claude 2');
});

// Test: formatMessage
test('formatMessage: formats user message', async () => {
	const formatted = formatMessage('user', 'Test content');
	assert.equal(formatted, '---\n\n@user: Test content');
});

// Test: formatMessage for claude
test('formatMessage: formats claude message', async () => {
	const formatted = formatMessage('claude', 'Test response');
	assert.equal(formatted, '---\n\n@claude: Test response');
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

	console.log(`Running ${tests.length} tests for issue-reader...\n`);

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

	console.log(`\n${colors.yellow}issue-reader results:${colors.reset}`);
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
