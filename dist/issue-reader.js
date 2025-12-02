import * as fs from 'node:fs/promises';
/**
 * Parses an issue markdown file and extracts the conversation history
 *
 * @param filePath - Absolute path to the issue file
 * @returns Parsed issue with message history
 * @throws Error if file cannot be read or if the format is invalid
 */
export async function readIssue(filePath) {
    let rawContent;
    try {
        rawContent = await fs.readFile(filePath, 'utf-8');
    }
    catch (error) {
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
export function parseIssueContent(content) {
    const messages = [];
    // Split by the separator (---)
    const sections = content.split(/\n---\n/);
    let messageIndex = 0;
    for (const section of sections) {
        const trimmedSection = section.trim();
        // Skip empty sections
        if (!trimmedSection) {
            continue;
        }
        messages.push({
            index: messageIndex++,
            content: trimmedSection,
        });
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
export function getLatestMessage(issue) {
    if (issue.messages.length === 0) {
        return undefined;
    }
    return issue.messages[issue.messages.length - 1];
}
//# sourceMappingURL=issue-reader.js.map