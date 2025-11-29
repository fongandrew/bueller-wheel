import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { type ToolUseBlockParam } from '@anthropic-ai/sdk/resources';
import { type BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta.mjs';
import * as fs from 'fs';
import * as path from 'path';

const ISSUE_DIR_OPEN = 'open';
const ISSUE_DIR_REVIEW = 'review';
const ISSUE_DIR_STUCK = 'stuck';

interface Config {
	issuesDir: string;
	maxIterations: number;
}

function parseArgs(): Config {
	const args = process.argv.slice(2);
	let issuesDir = './issues';
	let maxIterations = 100;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--issues-dir' && i + 1 < args.length) {
			issuesDir = args[++i]!;
		} else if (args[i] === '--max-iterations' && i + 1 < args.length) {
			maxIterations = parseInt(args[++i]!, 10);
		}
	}

	return { issuesDir, maxIterations };
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

function buildSystemPrompt(issuesDir: string, issueFile: string): string {
	const issueFilePath = path.join(issuesDir, ISSUE_DIR_OPEN, issueFile);

	return `You are a task automation agent processing issues from a queue.

## Your Environment

Issues directory: ${issuesDir}
- ${issuesDir}/${ISSUE_DIR_OPEN}/     - Issues to be processed
- ${issuesDir}/${ISSUE_DIR_REVIEW}/   - Completed issues
- ${issuesDir}/${ISSUE_DIR_STUCK}/    - Issues requiring human intervention

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

Your issue file: ${issueFilePath}

1. **Read the issue**: Parse the conversation history in ${issueFilePath} to understand the task
2. **Work on the task**: Do what the issue requests
3. **Append your response**: Add your summary to ${issueFilePath} using this format:
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
      - Leave the issue in \`${issuesDir}/${ISSUE_DIR_OPEN}/\` for the next iteration
      - Use this when you need multiple iterations to complete a complex task

   b. **COMPLETE** - The task is fully finished
      - Move the issue to \`${issuesDir}/${ISSUE_DIR_REVIEW}/\` using: \`mv "${issueFilePath}" "${issuesDir}/${ISSUE_DIR_REVIEW}/${issueFile}"\`

   c. **DECOMPOSE** - The task is too large and should be broken into smaller sub-tasks
      - Create child issues in \`${issuesDir}/${ISSUE_DIR_OPEN}/\` with \`-001.md\`, \`-002.md\` suffixes
      - Each child issue should start with: \`@user: [clear, actionable task description]\`
      - Example: If parent is \`p1-050-add-auth.md\`, create:
        - \`p1-050-add-auth-001.md\` for subtask 1
        - \`p1-050-add-auth-002.md\` for subtask 2
      - Move the parent issue to \`${issuesDir}/${ISSUE_DIR_REVIEW}/\`

   d. **STUCK** - You cannot proceed without human intervention
      - Explain clearly why you're stuck in your summary
      - Move the issue to \`${issuesDir}/${ISSUE_DIR_STUCK}/\` using: \`mv "${issueFilePath}" "${issuesDir}/${ISSUE_DIR_STUCK}/${issueFile}"\`

## Important Notes

- Each invocation of this script is a separate session - you won't remember previous iterations
- Always read the full conversation history in the issue file to understand context
- Be thoughtful about when to CONTINUE vs COMPLETE - don't leave trivial tasks incomplete
- When creating child issues, make each one focused and actionable
- Use bash commands (mv, cat, echo) to manage files - you have full filesystem access

Now, please process the issue at ${issueFilePath}.`;
}

function logToolUse(block: BetaToolUseBlock | ToolUseBlockParam): void {
	process.stdout.write('\n');
	process.stdout.write(`[${block.name}] `);
	switch (block.name.toLowerCase()) {
		case 'read':
		case 'write':
			process.stdout.write(`${(block.input as any)?.file_path}`);
			break;
		case 'bash':
			process.stdout.write(`${(block.input as any)?.command}`);
			break;
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

async function runAgent(issuesDir: string, issueFile: string): Promise<void> {
	const systemPrompt = buildSystemPrompt(issuesDir, issueFile);

	console.log('\n--- Starting agent ---');

	const stream = query({
		prompt: systemPrompt,
		options: {
			settingSources: ['project'],
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

	ensureDirectories(config.issuesDir);

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

		await runAgent(config.issuesDir, openIssues[0]!);
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
