import { execSync } from 'node:child_process';

import { pass } from '../../verify-utils.js';

const issuesDir = './issues';

// Helper function to run bueller issue command
// Uses the compiled index.js that is copied to the test temp directory
function runIssueCommand(args: string[]): string {
	const cmd = `node ./index.js issue ${args.join(' ')} --issues-dir ${issuesDir}`;
	return execSync(cmd, { encoding: 'utf-8' });
}

// Test 1: Short single message (not truncated)
console.log('Test 1: Short single message should not be truncated');
const shortOutput = runIssueCommand(['p1-001-short.md']);
if (!shortOutput.includes('This is a short message that should not be truncated')) {
	throw new Error('FAIL: Short message was truncated or not found');
}
if (shortOutput.includes('…')) {
	throw new Error('FAIL: Short message shows truncation indicator');
}
console.log('✓ Short message test passed\n');

// Test 2: Long single message (truncated at 300 chars)
console.log('Test 2: Long single message should be truncated at 300 chars');
const longOutput = runIssueCommand(['p1-002-long-single.md']);
if (!longOutput.includes('…')) {
	throw new Error('FAIL: Long single message was not truncated');
}
// The truncation should include the ellipsis, so the visible part should be around 300 chars
const match = longOutput.match(/@user:\s+([\s\S]+?)(?:\n\n|\n$|$)/);
if (!match || !match[1]) {
	throw new Error('FAIL: Could not extract message content');
}
const messageContent = match[1].trim();
// Should be around 300 chars + '…' = 301 chars
if (messageContent.length > 320) {
	throw new Error(
		`FAIL: Truncated message is too long (${messageContent.length} chars, expected ~303)`,
	);
}
console.log('✓ Long single message truncation test passed\n');

// Test 3: Multiple messages (first/last at 300, middle at 80)
console.log('Test 3: Multiple messages with different truncation limits');
const multiOutput = runIssueCommand(['p1-003-multi-messages.md']);

// Extract messages by parsing each line that starts with [N] @
const lines = multiOutput.split('\n');
const messageLines = lines.filter((line) => /^\[\d+\] @/.test(line));

if (messageLines.length !== 4) {
	throw new Error(`FAIL: Expected 4 messages, found ${messageLines.length}`);
}

// Parse each message
function parseMessage(line: string): { index: number; author: string; content: string } {
	const match = line.match(/^\[(\d+)\] @(\w+):\s+(.+)$/);
	if (!match) {
		throw new Error(`FAIL: Could not parse message: ${line}`);
	}
	return {
		index: parseInt(match[1]!, 10),
		author: match[2]!,
		content: match[3]!,
	};
}

const msg0 = parseMessage(messageLines[0]!);
const msg1 = parseMessage(messageLines[1]!);
const msg2 = parseMessage(messageLines[2]!);
const msg3 = parseMessage(messageLines[3]!);

// First message should be truncated around 300 chars
if (msg0.content.length > 320) {
	throw new Error(`FAIL: First message too long (${msg0.content.length} chars, expected ~303)`);
}
if (!msg0.content.includes('…')) {
	throw new Error('FAIL: First message should be truncated');
}

// Middle message 1 should be truncated around 80 chars
if (msg1.content.length > 100) {
	throw new Error(`FAIL: Middle message 1 too long (${msg1.content.length} chars, expected ~83)`);
}
if (!msg1.content.includes('…')) {
	throw new Error('FAIL: Middle message 1 should be truncated');
}

// Middle message 2 should be truncated around 80 chars
if (msg2.content.length > 100) {
	throw new Error(`FAIL: Middle message 2 too long (${msg2.content.length} chars, expected ~83)`);
}
if (!msg2.content.includes('…')) {
	throw new Error('FAIL: Middle message 2 should be truncated');
}

// Last message should be truncated around 300 chars
if (msg3.content.length > 320) {
	throw new Error(`FAIL: Last message too long (${msg3.content.length} chars, expected ~303)`);
}
if (!msg3.content.includes('…')) {
	throw new Error('FAIL: Last message should be truncated');
}

console.log('✓ Multiple messages truncation test passed\n');

// Test 4: File lookup in review directory
console.log('Test 4: File lookup across directories - review');
const reviewOutput = runIssueCommand(['p1-004-in-review.md']);
if (!reviewOutput.includes('review/')) {
	throw new Error('FAIL: Issue in review directory not showing review/ prefix');
}
if (!reviewOutput.includes('This issue is in the review directory')) {
	throw new Error('FAIL: Review issue content not found');
}
console.log('✓ Review directory lookup test passed\n');

// Test 5: File lookup in stuck directory
console.log('Test 5: File lookup across directories - stuck');
const stuckOutput = runIssueCommand(['p1-005-stuck.md']);
if (!stuckOutput.includes('stuck/')) {
	throw new Error('FAIL: Issue in stuck directory not showing stuck/ prefix');
}
if (!stuckOutput.includes('This issue is in the stuck directory')) {
	throw new Error('FAIL: Stuck issue content not found');
}
console.log('✓ Stuck directory lookup test passed\n');

// Test 6: --index expansion (single index)
console.log('Test 6: --index expansion with single index');
const indexOutput = runIssueCommand(['p1-003-multi-messages.md', '--index', '1']);

// With --index 1, only message [1] should be shown
const indexLines = indexOutput.split('\n');
const indexMessageLines = indexLines.filter((line) => /^\[\d+\] @/.test(line));

// Should only show message [1]
if (indexMessageLines.length !== 1) {
	throw new Error(`FAIL: Expected 1 message with --index 1, found ${indexMessageLines.length}`);
}

const msg1Expanded = parseMessage(indexMessageLines[0]!);

// The message should be index 1
if (msg1Expanded.index !== 1) {
	throw new Error(`FAIL: Expected message [1], got [${msg1Expanded.index}]`);
}

// The message should show the full content (more than 80 chars, no truncation)
if (msg1Expanded.content.length < 100) {
	throw new Error(
		`FAIL: Expanded message [1] is still truncated (${msg1Expanded.content.length} chars)`,
	);
}

// Should not have truncation indicator
if (msg1Expanded.content.includes('…')) {
	throw new Error('FAIL: Expanded message [1] still has truncation indicator');
}

console.log('✓ Single index expansion test passed\n');

// Test 7: --index expansion (range)
console.log('Test 7: --index expansion with range');
const rangeOutput = runIssueCommand(['p1-003-multi-messages.md', '--index', '1,2']);

// With --index 1,2, messages 1 and 2 should be shown expanded
const rangeLines = rangeOutput.split('\n');
const rangeMessageLines = rangeLines.filter((line) => /^\[\d+\] @/.test(line));

// Should show messages [1] and [2]
if (rangeMessageLines.length !== 2) {
	throw new Error(
		`FAIL: Expected 2 messages with --index 1,2, found ${rangeMessageLines.length}`,
	);
}

const msg1Range = parseMessage(rangeMessageLines[0]!);
const msg2Range = parseMessage(rangeMessageLines[1]!);

// Check correct indices
if (msg1Range.index !== 1) {
	throw new Error(`FAIL: Expected first message to be [1], got [${msg1Range.index}]`);
}
if (msg2Range.index !== 2) {
	throw new Error(`FAIL: Expected second message to be [2], got [${msg2Range.index}]`);
}

// Both should be fully expanded (no truncation)
if (msg1Range.content.length < 100) {
	throw new Error(
		`FAIL: Message [1] in range is still truncated (${msg1Range.content.length} chars)`,
	);
}
if (msg2Range.content.length < 100) {
	throw new Error(
		`FAIL: Message [2] in range is still truncated (${msg2Range.content.length} chars)`,
	);
}

// Should not have truncation indicators
if (msg1Range.content.includes('…')) {
	throw new Error('FAIL: Message [1] in range still has truncation indicator');
}
if (msg2Range.content.includes('…')) {
	throw new Error('FAIL: Message [2] in range still has truncation indicator');
}

console.log('✓ Range expansion test passed\n');

// Test 8: Multiple issues at once
console.log('Test 8: Multiple issues in one command');
const multiIssueOutput = runIssueCommand([
	'p1-001-short.md',
	'p1-004-in-review.md',
	'p1-005-stuck.md',
]);

if (!multiIssueOutput.includes('p1-001-short.md')) {
	throw new Error('FAIL: First issue not found in multi-issue output');
}
if (!multiIssueOutput.includes('p1-004-in-review.md')) {
	throw new Error('FAIL: Second issue not found in multi-issue output');
}
if (!multiIssueOutput.includes('p1-005-stuck.md')) {
	throw new Error('FAIL: Third issue not found in multi-issue output');
}
if (!multiIssueOutput.includes('open/')) {
	throw new Error('FAIL: open/ prefix not found in multi-issue output');
}
if (!multiIssueOutput.includes('review/')) {
	throw new Error('FAIL: review/ prefix not found in multi-issue output');
}
if (!multiIssueOutput.includes('stuck/')) {
	throw new Error('FAIL: stuck/ prefix not found in multi-issue output');
}

console.log('✓ Multiple issues test passed\n');

pass('All issue summarization tests passed');
