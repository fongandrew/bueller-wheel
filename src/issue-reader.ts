import * as fs from 'node:fs/promises';

/**
 * Represents a single message in the issue conversation history
 */
export interface IssueMessage {
	/** Zero-based index of the message in the conversation */
	index: number;
	/** Content of the message including @author prefix (trimmed) */
	content: string;
}

/**
 * Represents the parsed issue file
 */
export interface ParsedIssue {
	/** Array of messages in chronological order */
	messages: IssueMessage[];
	/** Original raw content of the file */
	rawContent: string;
}

/**
 * Parses an issue markdown file and extracts the conversation history
 *
 * @param filePath - Absolute path to the issue file
 * @returns Parsed issue with message history
 * @throws Error if file cannot be read or if the format is invalid
 */
export async function readIssue(filePath: string): Promise<ParsedIssue> {
	let rawContent: string;

	try {
		rawContent = await fs.readFile(filePath, 'utf-8');
	} catch (error) {
		throw new Error(`Failed to read issue file at ${filePath}: ${String(error)}`);
	}

	return parseIssueContent(rawContent);
}

/**
 * Parses issue content and extracts the conversation history
 *
 * @param content - Raw markdown content of the issue file
 * @returns Parsed issue with message history
 */
export function parseIssueContent(content: string): ParsedIssue {
	const messages: IssueMessage[] = [];

	// Split by the separator (---)
	const sections = content.split(/\n---\n/);

	let messageIndex = 0;

	for (const section of sections) {
		const trimmedSection = section.trim();

		// Skip empty sections
		if (!trimmedSection) {
			continue;
		}

		// Check if this section starts with @user: or @claude:
		if (trimmedSection.startsWith('@user:') || trimmedSection.startsWith('@claude:')) {
			messages.push({
				index: messageIndex++,
				content: trimmedSection,
			});
		}
		// If no match, skip this section (handles malformed sections)
	}

	return {
		messages,
		rawContent: content,
	};
}

/**
 * Gets the latest message from an issue
 *
 * @param issue - Parsed issue object
 * @returns The most recent message, or undefined if no messages exist
 */
export function getLatestMessage(issue: ParsedIssue): IssueMessage | undefined {
	if (issue.messages.length === 0) {
		return undefined;
	}
	return issue.messages[issue.messages.length - 1];
}

