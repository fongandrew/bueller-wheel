import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { type ToolUseBlockParam } from '@anthropic-ai/sdk/resources';
import { type BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta.mjs';

const ISSUE_DIR_OPEN = 'open';
const ISSUE_DIR_REVIEW = 'review';
const ISSUE_DIR_STUCK = 'stuck';

interface Config {
	issuesDir: string;
	maxIterations: number;
	gitCommit: boolean;
	promptFile: string;
}

function parseArgs(): Config {
	const args = process.argv.slice(2);
	let issuesDir = './issues';
	let maxIterations = 100;
	let gitCommit = false;
	let promptFile = path.join('./issues', 'prompt.md');

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--issues-dir' && i + 1 < args.length) {
			issuesDir = args[++i]!;
			// Update default prompt file location if issues-dir is changed
			if (!args.includes('--prompt')) {
				promptFile = path.join(issuesDir, 'prompt.md');
			}
		} else if (args[i] === '--max-iterations' && i + 1 < args.length) {
			maxIterations = parseInt(args[++i]!, 10);
		} else if (args[i] === '--git-commit') {
			gitCommit = true;
		} else if (args[i] === '--prompt' && i + 1 < args.length) {
			promptFile = args[++i]!;
		}
	}

	return { issuesDir, maxIterations, gitCommit, promptFile };
}

function ensureDirectories(issuesDir: string): void {
	const dirs = [
		issuesDir,
		path.join(issuesDir, ISSUE_DIR_OPEN),
		path.join(issuesDir, ISSUE_DIR_REVIEW),
		path.join(issuesDir, ISSUE_DIR_STUCK),
	];

	for (const dir of dirs) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}
}

function getOpenIssues(issuesDir: string): string[] {
	const openDir = path.join(issuesDir, ISSUE_DIR_OPEN);
	return fs
		.readdirSync(openDir)
		.filter((f) => f.endsWith('.md'))
		.sort();
}

function extractIssueId(issueFile: string): string {
	// Extract ID from filename like "p0-002-git.md" -> "p0-002"
	const match = issueFile.match(/^(p\d+-\d+)/);
	return match ? match[1]! : issueFile.replace('.md', '');
}

function gitCommit(issueFile: string): void {
	const issueId = extractIssueId(issueFile);

	try {
		// Check if there are any changes to commit
		try {
			execSync('git diff --quiet && git diff --cached --quiet');
			console.log('No changes to commit');
			return;
		} catch {
			// There are changes, proceed with commit
		}

		// Stage all changes
		execSync('git add -A', { stdio: 'inherit' });

		// Create commit with issue ID in the message
		const commitMessage = `[${issueId}] Auto-commit`;

		execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
			stdio: 'inherit',
		});

		console.log(`\nGit commit created for issue ${issueId}`);
	} catch (error) {
		console.error(`Failed to create git commit: ${String(error)}`);
	}
}

function getDefaultPromptTemplate(): string {
	return `You are a task automation agent processing issues from a queue.

## Your Environment

Issues directory:
- [ISSUES_DIR]/[ISSUE_DIR_OPEN]/     - Issues to be processed
- [ISSUES_DIR]/[ISSUE_DIR_REVIEW]/   - Completed issues
- [ISSUES_DIR]/[ISSUE_DIR_STUCK]/    - Issues requiring human intervention

## Issue File Format

Issues are markdown files named: \`p{priority}-{order}-{description}.md\`

Examples:
- \`p0-100-fix-critical-bug.md\` (priority 0, order 100)
- \`p1-050-add-feature.md\` (priority 1, order 50)

Priority scheme:
- p0: Urgent/unexpected work
- p1: Normal feature work
- p2: Non-blocking follow-up
- p3: "Do next" - promote to p1 when higher priority work is done

Issue files contain a conversation in this format:

\`\`\`
@user: Please build the widget factory.

---

@claude: I have built the widget factory.

Here is a summary of the work I have done:
- Item 1
- Item 2

---

@user: Here is feedback on your work.

---

@claude: I have implemented your feedback.
\`\`\`

## Your Task for This Iteration

Your issue file: [ISSUE_FILE_PATH]

1. **Read the issue**: Parse the conversation history in [ISSUE_FILE_PATH] to understand the task
2. **Work on the task**: Do what the issue requests
3. **Append your response**: Add your summary to [ISSUE_FILE_PATH] using this format:
   \`\`\`
   ---

   @claude: [Your summary here]

   Here is a summary of the work I have done:
   - Item 1
   - Item 2
   - Item 3
   \`\`\`

4. **Decide the outcome**: Choose ONE of the following actions:

   a. **CONTINUE** - You made progress but the task isn't complete yet
      - Leave the issue in \`[ISSUES_DIR]/[ISSUE_DIR_OPEN]/\` for the next iteration
      - Use this when you need multiple iterations to complete a complex task

   b. **COMPLETE** - The task is fully finished
      - Move the issue to \`[ISSUES_DIR]/[ISSUE_DIR_REVIEW]/\` using: \`mv "[ISSUE_FILE_PATH]" "[ISSUES_DIR]/[ISSUE_DIR_REVIEW]/[ISSUE_FILE]"\`

   c. **DECOMPOSE** - The task is too large and should be broken into smaller sub-tasks
      - Create child issues in \`[ISSUES_DIR]/[ISSUE_DIR_OPEN]/\` with \`-001.md\`, \`-002.md\` suffixes
      - Each child issue should start with: \`@user: [clear, actionable task description]\`
      - Example: If parent is \`p1-050-add-auth.md\`, create:
        - \`p1-050-add-auth-001.md\` for subtask 1
        - \`p1-050-add-auth-002.md\` for subtask 2
      - Move the parent issue to \`[ISSUES_DIR]/[ISSUE_DIR_REVIEW]/\`

   d. **STUCK** - You cannot proceed without human intervention
      - Explain clearly why you're stuck in your summary
      - Move the issue to \`[ISSUES_DIR]/[ISSUE_DIR_STUCK]/\` using: \`mv "[ISSUE_FILE_PATH]" "[ISSUES_DIR]/[ISSUE_DIR_STUCK]/[ISSUE_FILE]"\`

## Important Notes

- Each invocation of this script is a separate session - you won't remember previous iterations
- Always read the full conversation history in the issue file to understand context
- Be thoughtful about when to CONTINUE vs COMPLETE - don't leave trivial tasks incomplete
- When creating child issues, make each one focused and actionable
- Use bash commands (mv, cat, echo) to manage files - you have full filesystem access

Now, please process the issue at [ISSUE_FILE_PATH].`;
}

function loadOrCreatePromptTemplate(promptFile: string): string {
	// If prompt file exists, load it
	if (fs.existsSync(promptFile)) {
		console.log(`Loading prompt template from: ${promptFile}`);
		return fs.readFileSync(promptFile, 'utf-8');
	}

	// Otherwise, create the default prompt template
	console.log(`Prompt file not found. Creating default template at: ${promptFile}`);
	const defaultTemplate = getDefaultPromptTemplate();

	// Ensure the directory exists
	const promptDir = path.dirname(promptFile);
	if (!fs.existsSync(promptDir)) {
		fs.mkdirSync(promptDir, { recursive: true });
	}

	// Write the default template
	fs.writeFileSync(promptFile, defaultTemplate, 'utf-8');

	return defaultTemplate;
}

function buildSystemPrompt(template: string, issuesDir: string, issueFile: string): string {
	const issueFilePath = path.join(issuesDir, ISSUE_DIR_OPEN, issueFile);

	// Replace template variables with actual values
	return template
		.replace(/\[ISSUES_DIR\]/g, issuesDir)
		.replace(/\[ISSUE_DIR_OPEN\]/g, ISSUE_DIR_OPEN)
		.replace(/\[ISSUE_DIR_REVIEW\]/g, ISSUE_DIR_REVIEW)
		.replace(/\[ISSUE_DIR_STUCK\]/g, ISSUE_DIR_STUCK)
		.replace(/\[ISSUE_FILE_PATH\]/g, issueFilePath)
		.replace(/\[ISSUE_FILE\]/g, issueFile);
}

function logToolUse(block: BetaToolUseBlock | ToolUseBlockParam): void {
	process.stdout.write('\n');
	process.stdout.write(`[${block.name}] `);
	switch (block.name.toLowerCase()) {
		case 'read':
		case 'write':
		case 'edit':
			process.stdout.write(`${(block.input as any)?.file_path}`);
			break;
		case 'bash':
			process.stdout.write(`${(block.input as any)?.command}`);
			break;
		case 'glob':
			process.stdout.write(`${(block.input as any)?.pattern}`);
			break;
		case 'todowrite': {
			for (const todo of (block.input as any)?.todos ?? []) {
				process.stdout.write('\n');
				switch (todo.status) {
					case 'in_progress':
						process.stdout.write('⧖');
						break;
					case 'pending':
						process.stdout.write('☐');
						break;
					case 'completed':
						process.stdout.write('✓');
						break;
					default:
						process.stdout.write(todo.status);
						break;
				}
				process.stdout.write(' ');
				process.stdout.write(String(todo.content));
			}
			break;
		}
		default:
			break;
	}
	process.stdout.write('\n');
}

function logSDKMessage(item: SDKMessage): void {
	switch (item.type) {
		case 'assistant':
		case 'user':
			for (const chunk of item.message.content) {
				if (typeof chunk === 'string') {
					process.stdout.write('\n');
					process.stdout.write(chunk);
					process.stdout.write('\n');
					continue;
				}
				switch (chunk.type) {
					case 'text':
						process.stdout.write('\n');
						process.stdout.write(chunk.text);
						process.stdout.write('\n');
						break;
					case 'tool_use':
						logToolUse(chunk);
						break;
					default:
						break;
				}
			}
			break;
		default:
			break;
	}
}

async function runAgent(template: string, issuesDir: string, issueFile: string): Promise<void> {
	const systemPrompt = buildSystemPrompt(template, issuesDir, issueFile);

	console.log('\n--- Starting agent ---');

	const stream = query({
		prompt: systemPrompt,
		options: {
			settingSources: ['local', 'project', 'user'],
			permissionMode: 'acceptEdits',
		},
	});

	for await (const item of stream) {
		logSDKMessage(item);
	}

	console.log('\n--- Agent finished ---');
}

async function main(): Promise<void> {
	const config = parseArgs();

	console.log('Bueller? Bueller?');
	console.log('-----------------');
	console.log(`Issues directory: ${config.issuesDir}`);
	console.log(`Max iterations: ${config.maxIterations}`);
	console.log(`Git auto-commit: ${config.gitCommit ? 'enabled' : 'disabled'}`);
	console.log(`Prompt file: ${config.promptFile}`);

	ensureDirectories(config.issuesDir);

	// Load or create the prompt template
	const promptTemplate = loadOrCreatePromptTemplate(config.promptFile);

	let iteration = 0;

	while (iteration < config.maxIterations) {
		iteration++;
		console.log(`\n### Iteration ${iteration} ###\n`);

		const openIssues = getOpenIssues(config.issuesDir);

		if (openIssues.length === 0) {
			console.log('No more issues in open/. Exiting.');
			break;
		}

		console.log(`Found ${openIssues.length} open issue(s)`);
		console.log(`Next issue: ${openIssues[0]}`);

		const currentIssue = openIssues[0]!;
		const wasInOpen = fs.existsSync(path.join(config.issuesDir, ISSUE_DIR_OPEN, currentIssue));

		await runAgent(promptTemplate, config.issuesDir, currentIssue);

		// Check if issue was moved
		const isNowInReview = fs.existsSync(
			path.join(config.issuesDir, ISSUE_DIR_REVIEW, currentIssue),
		);
		const isNowInStuck = fs.existsSync(
			path.join(config.issuesDir, ISSUE_DIR_STUCK, currentIssue),
		);
		const isStillInOpen = fs.existsSync(
			path.join(config.issuesDir, ISSUE_DIR_OPEN, currentIssue),
		);

		// Auto-commit if enabled and work was done
		if (config.gitCommit) {
			if (wasInOpen && !isStillInOpen && isNowInReview) {
				console.log('\nIssue completed - creating git commit...');
				gitCommit(currentIssue);
			} else if (wasInOpen && !isStillInOpen && isNowInStuck) {
				console.log('\nIssue moved to stuck - creating git commit...');
				gitCommit(currentIssue);
			} else if (isStillInOpen) {
				// Issue is still in open, but may have been modified
				console.log('\nIssue still in progress - creating git commit...');
				gitCommit(currentIssue);
			}
		}
	}

	if (iteration >= config.maxIterations) {
		console.log(`\nReached maximum iterations (${config.maxIterations}). Exiting.`);
	}

	console.log('\nDone!');
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
