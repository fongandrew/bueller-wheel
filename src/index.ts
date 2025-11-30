import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { type ToolUseBlockParam } from '@anthropic-ai/sdk/resources';
import { type BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta.mjs';

// Colors for output
const colors = {
	red: '\x1b[0;31m',
	green: '\x1b[0;32m',
	yellow: '\x1b[1;33m',
	blue: '\x1b[0;34m',
	cyan: '\x1b[0;36m',
	reset: '\x1b[0m',
};

const ISSUE_DIR_OPEN = 'open';
const ISSUE_DIR_REVIEW = 'review';
const ISSUE_DIR_STUCK = 'stuck';

interface Config {
	issuesDir: string;
	faqDir: string;
	maxIterations: number;
	gitCommit: boolean;
	promptFile: string;
	continueMode: boolean;
	continuePrompt: string;
}

interface RunAgentOptions {
	template: string;
	issuesDir: string;
	faqDir: string;
	issueFile: string;
	continueMode: boolean;
	continuePrompt: string;
}

function showHelp(): void {
	console.log(`
Bueller - Headless Claude Code Issue Processor

USAGE:
  bueller [OPTIONS]

OPTIONS:
  --help              Show this help message and exit
  --issues-dir DIR    Directory containing issue queue (default: ./issues)
  --faq-dir DIR       Directory containing FAQ/troubleshooting guides (default: ./faq)
  --max-iterations N  Maximum number of iterations to run (default: 25)
  --git, --git-commit Enable automatic git commits after each iteration
  --prompt FILE       Custom prompt template file (default: ./issues/prompt.md)
  --continue [PROMPT] Continue from previous session (default prompt: "continue")

DIRECTORY STRUCTURE:
  issues/
    open/       Issues to be processed
    review/     Completed issues
    stuck/      Issues requiring human intervention
    prompt.md   Custom prompt template (optional)
  faq/          FAQ and troubleshooting guides

ISSUE FILE FORMAT:
  Issues are markdown files named: p{priority}-{order}-{description}.md

  Priority levels:
    p0: Urgent/unexpected work
    p1: Normal feature work
    p2: Non-blocking follow-up

EXAMPLES:
  bueller
  bueller --issues-dir ./my-issues --faq-dir ./my-faq
  bueller --max-iterations 50 --git-commit
  bueller --prompt ./custom-prompt.md

For more information, visit: https://github.com/anthropics/bueller
`);
}

function parseArgs(): Config {
	const args = process.argv.slice(2);

	// Check for help flag first
	if (args.includes('--help') || args.includes('-h')) {
		showHelp();
		process.exit(0);
	}

	let issuesDir = './issues';
	let faqDir = './faq';
	let maxIterations = 25;
	let gitCommit = false;
	let promptFile = path.join('./issues', 'prompt.md');
	let continueMode = false;
	let continuePrompt = 'continue';

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--issues-dir' && i + 1 < args.length) {
			issuesDir = args[++i]!;
			// Update default prompt file location if issues-dir is changed
			if (!args.includes('--prompt')) {
				promptFile = path.join(issuesDir, 'prompt.md');
			}
		} else if (args[i] === '--faq-dir' && i + 1 < args.length) {
			faqDir = args[++i]!;
		} else if (args[i] === '--max-iterations' && i + 1 < args.length) {
			maxIterations = parseInt(args[++i]!, 10);
		} else if (args[i] === '--git' || args[i] === '--git-commit') {
			gitCommit = true;
		} else if (args[i] === '--prompt' && i + 1 < args.length) {
			promptFile = args[++i]!;
		} else if (args[i] === '--continue') {
			continueMode = true;
			// Check if next arg exists and doesn't start with --
			if (i + 1 < args.length && !args[i + 1]!.startsWith('--')) {
				continuePrompt = args[++i]!;
			}
		}
	}

	return {
		issuesDir,
		faqDir,
		maxIterations,
		gitCommit,
		promptFile,
		continueMode,
		continuePrompt,
	};
}

async function ensureDirectories(issuesDir: string, faqDir: string): Promise<void> {
	const dirs = [
		issuesDir,
		path.join(issuesDir, ISSUE_DIR_OPEN),
		path.join(issuesDir, ISSUE_DIR_REVIEW),
		path.join(issuesDir, ISSUE_DIR_STUCK),
		faqDir,
	];

	for (const dir of dirs) {
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}
	}
}

async function getOpenIssues(issuesDir: string): Promise<string[]> {
	const openDir = path.join(issuesDir, ISSUE_DIR_OPEN);
	const files = await fs.readdir(openDir);
	return files.filter((f) => f.endsWith('.md')).sort();
}

function extractIssueId(issueFile: string): string {
	// Extract ID from filename like "p0-002-git.md" -> "p0-002-git"
	return issueFile.replace('.md', '');
}

function gitCommit(issueFile: string, status: string): void {
	const issueId = extractIssueId(issueFile);

	try {
		// Check if there are any changes to commit
		try {
			execSync('git diff --quiet && git diff --cached --quiet');
			// Also check for untracked files
			const untrackedFiles = execSync('git ls-files --others --exclude-standard', {
				encoding: 'utf-8',
			}).trim();
			if (!untrackedFiles) {
				console.log(`${colors.cyan}No changes to commit${colors.reset}`);
				return;
			}
		} catch {
			// There are changes, proceed with commit
		}

		// Stage all changes
		execSync('git add -A', { stdio: 'inherit' });

		// Create commit with issue ID and status
		const commitMessage = `${issueId} ${status}`;

		execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
			stdio: 'inherit',
		});

		console.log(`${colors.green}\nGit commit created: ${commitMessage}${colors.reset}`);
	} catch (error) {
		console.error(`${colors.red}Failed to create git commit: ${String(error)}${colors.reset}`);
	}
}

function getDefaultPromptTemplate(): string {
	return `You are a task automation agent processing issues from a queue.

## Your Environment

- [ISSUES_DIR]/[ISSUE_DIR_OPEN]/     - Issues to be processed
- [ISSUES_DIR]/[ISSUE_DIR_REVIEW]/   - Completed issues
- [ISSUES_DIR]/[ISSUE_DIR_STUCK]/    - Issues requiring human intervention
- [FAQ_DIR]/                         - Troubleshooting

## Issue File Format

Issues are markdown files named: \`p{priority}-{order}-{description}.md\`

Examples:
- \`p0-100-fix-critical-bug.md\` (priority 0, order 100)
- \`p1-050-add-feature.md\` (priority 1, order 50)

Priority scheme:
- p0: Urgent/unexpected work
- p1: Normal feature work
- p2: Non-blocking follow-up

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
2. **Work on the task**: Do what the issue requests. When encountering issues, always check for a relevant guide in [FAQ_DIR]/ first.
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

**Critical:** ALWAYS check the FAQ directory ([FAQ_DIR]/) to see if there is a guide when you encounter a problem.

Now, please process the issue at [ISSUE_FILE_PATH].`;
}

async function loadOrCreatePromptTemplate(promptFile: string): Promise<string> {
	// If prompt file exists, load it
	try {
		await fs.access(promptFile);
		console.log(`${colors.cyan}Loading prompt template from: ${promptFile}${colors.reset}`);
		return await fs.readFile(promptFile, 'utf-8');
	} catch {
		// Otherwise, create the default prompt template
		console.log(
			`${colors.yellow}Prompt file not found. Creating default template at: ${promptFile}${colors.reset}`,
		);
		const defaultTemplate = getDefaultPromptTemplate();

		// Ensure the directory exists
		const promptDir = path.dirname(promptFile);
		await fs.mkdir(promptDir, { recursive: true });

		// Write the default template
		await fs.writeFile(promptFile, defaultTemplate, 'utf-8');

		return defaultTemplate;
	}
}

function buildSystemPrompt(
	template: string,
	issuesDir: string,
	faqDir: string,
	issueFile: string,
): string {
	const issueFilePath = path.join(issuesDir, ISSUE_DIR_OPEN, issueFile);

	// Convert all paths to absolute paths for clarity in the prompt
	const absoluteIssuesDir = path.resolve(issuesDir);
	const absoluteFaqDir = path.resolve(faqDir);
	const absoluteIssueFilePath = path.resolve(issueFilePath);

	// Replace template variables with actual values
	return template
		.replace(/\[ISSUES_DIR\]/g, absoluteIssuesDir)
		.replace(/\[FAQ_DIR\]/g, absoluteFaqDir)
		.replace(/\[ISSUE_DIR_OPEN\]/g, ISSUE_DIR_OPEN)
		.replace(/\[ISSUE_DIR_REVIEW\]/g, ISSUE_DIR_REVIEW)
		.replace(/\[ISSUE_DIR_STUCK\]/g, ISSUE_DIR_STUCK)
		.replace(/\[ISSUE_FILE_PATH\]/g, absoluteIssueFilePath)
		.replace(/\[ISSUE_FILE\]/g, issueFile);
}

function logToolUse(block: BetaToolUseBlock | ToolUseBlockParam): void {
	process.stdout.write('\n');
	process.stdout.write(`${colors.cyan}[${block.name}]${colors.reset} `);
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
						process.stdout.write(`${colors.yellow}⧖${colors.reset}`);
						break;
					case 'pending':
						process.stdout.write('☐');
						break;
					case 'completed':
						process.stdout.write(`${colors.green}✓${colors.reset}`);
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

async function runAgent(options: RunAgentOptions): Promise<void> {
	const { template, issuesDir, faqDir, issueFile, continueMode, continuePrompt } = options;

	const systemPrompt = buildSystemPrompt(template, issuesDir, faqDir, issueFile);

	console.log(`${colors.blue}\n--- Starting agent ---${colors.reset}`);

	const stream = query({
		prompt: continueMode ? continuePrompt : systemPrompt,
		options: {
			settingSources: ['local', 'project', 'user'],
			permissionMode: 'acceptEdits',
			continue: continueMode,
		},
	});

	for await (const item of stream) {
		logSDKMessage(item);
	}

	console.log(`${colors.blue}\n--- Agent finished ---${colors.reset}`);
}

async function main(): Promise<void> {
	const config = parseArgs();

	console.log(`${colors.cyan}Bueller? Bueller?${colors.reset}`);
	console.log(`${colors.cyan}-----------------${colors.reset}`);
	console.log(`Issues directory: ${config.issuesDir}`);
	console.log(`FAQ directory: ${config.faqDir}`);
	console.log(`Max iterations: ${config.maxIterations}`);
	console.log(`Git auto-commit: ${config.gitCommit ? 'enabled' : 'disabled'}`);
	console.log(`Prompt file: ${config.promptFile}`);
	if (config.continueMode) {
		console.log(`Continue mode: enabled (prompt: "${config.continuePrompt}")`);
	}

	await ensureDirectories(config.issuesDir, config.faqDir);

	// Load or create the prompt template
	const promptTemplate = await loadOrCreatePromptTemplate(config.promptFile);

	let iteration = 0;

	while (iteration < config.maxIterations) {
		iteration++;
		console.log(`${colors.yellow}\n### Iteration ${iteration} ###${colors.reset}\n`);

		const openIssues = await getOpenIssues(config.issuesDir);

		if (openIssues.length === 0) {
			console.log(`${colors.green}No more issues in open/. Exiting.${colors.reset}`);
			break;
		}

		console.log(`Found ${openIssues.length} open issue(s)`);
		console.log(`Next issue: ${openIssues[0]}`);

		const currentIssue = openIssues[0]!;

		await runAgent({
			template: promptTemplate,
			issuesDir: config.issuesDir,
			faqDir: config.faqDir,
			issueFile: currentIssue,
			continueMode: config.continueMode,
			continuePrompt: config.continuePrompt,
		});

		// Auto-commit if enabled and there's a current issue
		if (config.gitCommit && currentIssue) {
			// Determine the status based on where the issue ended up
			let isNowInReview = false;
			let isNowInStuck = false;
			let isStillInOpen = false;

			try {
				await fs.access(path.join(config.issuesDir, ISSUE_DIR_REVIEW, currentIssue));
				isNowInReview = true;
			} catch {
				// File doesn't exist in review
			}

			try {
				await fs.access(path.join(config.issuesDir, ISSUE_DIR_STUCK, currentIssue));
				isNowInStuck = true;
			} catch {
				// File doesn't exist in stuck
			}

			try {
				await fs.access(path.join(config.issuesDir, ISSUE_DIR_OPEN, currentIssue));
				isStillInOpen = true;
			} catch {
				// File doesn't exist in open
			}

			let status = 'unknown';
			if (isNowInReview) {
				status = 'done';
			} else if (isNowInStuck) {
				status = 'stuck';
			} else if (isStillInOpen) {
				status = 'in progress';
			}

			gitCommit(currentIssue, status);
		}
	}

	if (iteration >= config.maxIterations) {
		console.log(
			`${colors.yellow}\nReached maximum iterations (${config.maxIterations}). Exiting.${colors.reset}`,
		);
	}

	console.log(`${colors.green}\nDone!${colors.reset}`);
}

main().catch((error) => {
	console.error(`${colors.red}Error:${colors.reset}`, error);
	process.exit(1);
});
