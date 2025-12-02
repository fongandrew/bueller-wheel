import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { type IssueMessage, parseIssueContent } from './issue-reader.js';

/**
 * Represents the status of an issue based on its location
 */
export type IssueStatus = 'open' | 'review' | 'stuck';

/**
 * Represents a located issue file with its path and status
 */
export interface LocatedIssue {
	/** Absolute path to the issue file */
	filePath: string;
	/** Status of the issue */
	status: IssueStatus;
	/** Filename without path */
	filename: string;
}

/**
 * Result of summarizing an issue
 */
export interface IssueSummary {
	/** The located issue information */
	issue: LocatedIssue;
	/** Array of abbreviated messages */
	abbreviatedMessages: AbbreviatedMessage[];
	/** Total count of messages */
	messageCount: number;
}

/**
 * An abbreviated message for display
 */
export interface AbbreviatedMessage {
	/** Original message index */
	index: number;
	/** Author of the message */
	author: 'user' | 'claude';
	/** Abbreviated content */
	content: string;
	/** Whether this message was abbreviated */
	isAbbreviated: boolean;
	/** Full content (for expansion) */
	fullContent: string;
}

/**
 * Options for expanding messages
 */
export interface ExpandOptions {
	/** Single index or range to expand */
	indexSpec?: string;
}

/**
 * Searches for an issue file by filename across the issue directories
 *
 * @param filename - The issue filename (e.g., "p1-003-read-helper-002.md")
 * @param issuesDir - Base issues directory
 * @returns Located issue or null if not found
 */
export async function locateIssueFile(
	filename: string,
	issuesDir: string,
): Promise<LocatedIssue | null> {
	const directories: { dir: string; status: IssueStatus }[] = [
		{ dir: path.join(issuesDir, 'open'), status: 'open' },
		{ dir: path.join(issuesDir, 'review'), status: 'review' },
		{ dir: path.join(issuesDir, 'stuck'), status: 'stuck' },
	];

	for (const { dir, status } of directories) {
		const filePath = path.join(dir, filename);
		try {
			await fs.access(filePath);
			return {
				filePath,
				status,
				filename,
			};
		} catch {
			// File doesn't exist in this directory, continue searching
		}
	}

	return null;
}

/**
 * Resolves an issue reference (either a full path or filename) to a located issue
 *
 * @param reference - File path or filename
 * @param issuesDir - Base issues directory
 * @returns Located issue or null if not found
 */
export async function resolveIssueReference(
	reference: string,
	issuesDir: string,
): Promise<LocatedIssue | null> {
	// Check if it looks like a path (contains path separators)
	if (reference.includes('/') || reference.includes('\\')) {
		// Treat as a file path (absolute or relative)
		const absolutePath = path.isAbsolute(reference) ? reference : path.resolve(reference);
		try {
			await fs.access(absolutePath);
			// Determine status from path
			let status: IssueStatus = 'open';
			if (absolutePath.includes('/review/')) {
				status = 'review';
			} else if (absolutePath.includes('/stuck/')) {
				status = 'stuck';
			}
			return {
				filePath: absolutePath,
				status,
				filename: path.basename(absolutePath),
			};
		} catch {
			return null;
		}
	}

	// Otherwise, treat it as a filename and search for it
	return locateIssueFile(reference, issuesDir);
}

/**
 * Abbreviates a message based on its position in the conversation
 *
 * @param message - The message to abbreviate
 * @param _position - Position in conversation ('first', 'middle', or 'last')
 * @param maxLength - Maximum length for the abbreviated content
 * @returns Abbreviated message
 */
function abbreviateMessage(
	message: IssueMessage,
	_position: 'first' | 'middle' | 'last',
	maxLength: number,
): AbbreviatedMessage {
	const fullContent = message.content;
	let abbreviated = fullContent;
	let isAbbreviated = false;

	if (fullContent.length > maxLength) {
		abbreviated = fullContent.substring(0, maxLength).trimEnd() + '…';
		isAbbreviated = true;
	}

	return {
		index: message.index,
		author: message.author,
		content: abbreviated,
		isAbbreviated,
		fullContent,
	};
}

/**
 * Creates abbreviated messages from a parsed issue
 *
 * @param messages - Array of issue messages
 * @returns Array of abbreviated messages
 */
function createAbbreviatedMessages(messages: IssueMessage[]): AbbreviatedMessage[] {
	if (messages.length === 0) {
		return [];
	}

	if (messages.length === 1) {
		// Single message - use 230 char limit
		return [abbreviateMessage(messages[0]!, 'first', 230)];
	}

	const result: AbbreviatedMessage[] = [];

	// First message - 230 chars
	result.push(abbreviateMessage(messages[0]!, 'first', 230));

	// Middle messages - 70 chars
	for (let i = 1; i < messages.length - 1; i++) {
		result.push(abbreviateMessage(messages[i]!, 'middle', 70));
	}

	// Last message - 230 chars
	result.push(abbreviateMessage(messages[messages.length - 1]!, 'last', 230));

	return result;
}

/**
 * Summarizes an issue file with abbreviated messages
 *
 * @param locatedIssue - Located issue information
 * @returns Issue summary
 */
export async function summarizeIssue(locatedIssue: LocatedIssue): Promise<IssueSummary> {
	const content = await fs.readFile(locatedIssue.filePath, 'utf-8');
	const parsed = parseIssueContent(content);

	const abbreviatedMessages = createAbbreviatedMessages(parsed.messages);

	return {
		issue: locatedIssue,
		abbreviatedMessages,
		messageCount: parsed.messages.length,
	};
}

/**
 * Parses index specification (e.g., "3" or "1,3")
 *
 * @param indexSpec - Index specification string
 * @returns Object with indices array and whether it's a single index, or null if invalid
 */
export function parseIndexSpec(
	indexSpec: string,
): { indices: number[]; isSingleIndex: boolean } | null {
	const parts = indexSpec.split(',').map((s) => s.trim());

	if (parts.length === 1) {
		// Single index
		const index = parseInt(parts[0]!, 10);
		if (isNaN(index) || index < 0) {
			return null;
		}
		return { indices: [index], isSingleIndex: true };
	}

	if (parts.length === 2) {
		// Range
		const start = parseInt(parts[0]!, 10);
		const end = parseInt(parts[1]!, 10);
		if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
			return null;
		}
		const indices: number[] = [];
		for (let i = start; i <= end; i++) {
			indices.push(i);
		}
		return { indices, isSingleIndex: false };
	}

	return null;
}

/**
 * Expands specific messages in a summary based on index specification
 *
 * @param summary - Issue summary
 * @param indexSpec - Index specification (e.g., "3" or "1,3")
 * @returns New summary with expanded messages and filter info
 */
export function expandMessages(
	summary: IssueSummary,
	indexSpec: string,
): IssueSummary & { filterToIndices?: number[]; isSingleIndex?: boolean } {
	const parsed = parseIndexSpec(indexSpec);
	if (!parsed) {
		return summary;
	}

	const { indices, isSingleIndex } = parsed;

	const expandedMessages = summary.abbreviatedMessages.map((msg) => {
		if (indices.includes(msg.index)) {
			return {
				...msg,
				content: msg.fullContent,
				isAbbreviated: false,
			};
		}
		return msg;
	});

	return {
		...summary,
		abbreviatedMessages: expandedMessages,
		filterToIndices: indices,
		isSingleIndex,
	};
}

/**
 * Condenses text by trimming lines and replacing newlines with single spaces
 *
 * @param text - Text to condense
 * @returns Condensed text
 */
function condenseText(text: string): string {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join(' ');
}

/**
 * Formats an issue summary for console output
 *
 * @param summary - Issue summary (may include filterToIndices and isSingleIndex)
 * @param indexSpec - Optional index specification for filtering display
 * @returns Formatted string
 */
export function formatIssueSummary(
	summary: IssueSummary & { filterToIndices?: number[]; isSingleIndex?: boolean },
	indexSpec?: string,
): string {
	const lines: string[] = [];

	// Header
	const directory = `${summary.issue.status}/`;
	const filename = summary.issue.filename;
	lines.push(`${directory}${filename}`);

	// Determine which messages to show
	const messagesToShow = summary.filterToIndices
		? summary.abbreviatedMessages.filter((msg) => summary.filterToIndices!.includes(msg.index))
		: summary.abbreviatedMessages;

	// Messages
	for (const msg of messagesToShow) {
		const content = msg.isAbbreviated ? condenseText(msg.content) : msg.content;
		lines.push(`[${msg.index}] @${msg.author}: ${content}`);
	}

	// Add follow-up action hint if not showing specific indices
	if (!indexSpec || !summary.isSingleIndex) {
		lines.push('');
		lines.push('Pass `--index N` or `--index M,N` to see more.');
	}

	return lines.join('\n');
}
