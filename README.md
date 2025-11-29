# Bueller - Headless Claude Code Issue Processor

A simple wrapper that runs Claude Code in a headless loop to process issues from a directory queue.

## Quick Start

1. Install `@anthropic-ai/claude-agent-sdk` using `npm` or your package manager of choice.
2. Copy [dist/bueller.js](dist/bueller.js) to the root directory of rour repo. Make it executable if you need to.
3. **Create an issue**:
   ```bash
   mkdir -p issues/open
   echo "@user: Please create a test file with 'Hello World'" > issues/open/p0-100-my-task.md
   ```
4. Run `bueller.js`.

## Issue Format

Issues are markdown files in the `issues/` directory with this structure:

### Directories
- `issues/open/` - Issues to be processed
- `issues/review/` - Completed issues
- `issues/stuck/` - Issues requiring human intervention

### Filename Format
`p{priority}-{order}-{description}.md`

Examples:
- `p0-100-fix-critical-bug.md` (priority 0, order 100)
- `p1-050-add-feature.md` (priority 1, order 50)
- `p2-020-refactor-code.md` (priority 2, order 20)

**Priority scheme**:
- `p0`: Urgent/unexpected work
- `p1`: Normal feature work
- `p2`: Non-blocking follow-up

Files are processed alphabetically (p0 before p1, lower numbers before higher).

### File Content Format

Issues contain a conversation between user and Claude:

```markdown
@user: Please build the widget factory.

---

@claude: I have built the widget factory.

Here is a summary of the work I have done:
- Created WidgetFactory class
- Added unit tests
- Updated documentation

---

@user: Please add error handling.

---

@claude: I have added error handling.

Here is a summary of the work I have done:
- Added try-catch blocks
- Added custom error types
- Updated tests
```

## How It Works

1. **Main Loop**: Checks `issues/open/` for markdown files
2. **Agent Processing**: Invokes Claude Code with a system prompt that:
   - Reads the next issue (alphabetically lowest)
   - Works on the task
   - Appends a summary to the issue file
   - Decides what to do next
3. **Outcomes**: The agent can:
   - **CONTINUE**: Leave in `open/` for another iteration
   - **COMPLETE**: Move to `review/`
   - **DECOMPOSE**: Create child issues (`-001.md`, `-002.md`) in `open/`, move parent to `review/`
   - **STUCK**: Move to `stuck/`

## CLI Options

```bash
./bueller.js --issues-dir ./my-issues --max-iterations 50 --git-commit --prompt ./my-prompt.md
```

- `--issues-dir <path>`: Issues directory (default: `./issues`)
- `--max-iterations <number>`: Maximum iterations (default: `100`)
- `--git-commit`: Enable automatic git commits after each iteration (default: disabled)
- `--prompt <path>`: Path to custom prompt template file (default: `<issues-dir>/prompt.md`)

### Custom Prompt Templates

Bueller uses a customizable prompt template system that allows you to tailor the agent's behavior.

#### How It Works

1. **Default Template**: On first run, Bueller creates a default prompt template at `<issues-dir>/prompt.md`
2. **Custom Template**: You can edit this file or specify a different template with `--prompt`
3. **Template Variables**: The template uses bracketed variables that are replaced at runtime

#### Template Variables

The following variables are available in your prompt template:

- `[ISSUES_DIR]` - The issues directory path (e.g., `./issues`)
- `[ISSUE_DIR_OPEN]` - The open subdirectory name (always `open`)
- `[ISSUE_DIR_REVIEW]` - The review subdirectory name (always `review`)
- `[ISSUE_DIR_STUCK]` - The stuck subdirectory name (always `stuck`)
- `[ISSUE_FILE_PATH]` - Full path to the current issue file (e.g., `./issues/open/p0-100-task.md`)
- `[ISSUE_FILE]` - Just the issue filename (e.g., `p0-100-task.md`)

#### Example Usage

```markdown
Your task is to process: [ISSUE_FILE_PATH]

When complete, move it to: [ISSUES_DIR]/[ISSUE_DIR_REVIEW]/[ISSUE_FILE]
```

This will be rendered as:

```
Your task is to process: ./issues/open/p0-100-task.md

When complete, move it to: ./issues/review/p0-100-task.md
```

#### Creating a Custom Prompt

1. Copy the default template from `issues/prompt.md`
2. Modify the instructions while keeping the template variables
3. Optionally save it to a different location and use `--prompt` to specify it

### Git Auto-Commit

When `--git-commit` is enabled, Bueller will automatically create a git commit after each iteration where work was done on an issue.

The commit message format includes the full issue ID and status:
```
p0-002-git done
p0-002-git in progress
p0-002-git stuck
p0-002-git unknown
```

The issue ID is extracted from the filename (e.g., `p0-002-git.md` → `p0-002-git`) and the status reflects what happened during the iteration:
- `done` - Issue completed (moved from `open/` to `review/`)
- `in progress` - Issue still being worked on (remains in `open/`)
- `stuck` - Issue blocked (moved from `open/` to `stuck/`)
- `unknown` - Issue not found in any expected location

**Notes:**
- Automatically stages all changes (`git add -A`)
- Skips commit if there are no changes to commit
- Each iteration gets its own commit for easy tracking of progress

## Testing

Bueller includes an end-to-end test framework to verify behavior:

```bash
# Run all tests
npm test

# Run a specific test
./tests/run-test.sh simple-task
```

Tests are located in `tests/fixtures/` and consist of:
- Pre-configured issue directories with markdown files
- Verification scripts to check outcomes

See [tests/README.md](tests/README.md) for more details on creating new test cases.

## Notes

- Each iteration is a fresh Claude Code session (no memory between iterations)
- The agent manages all file operations (moving issues, creating sub-issues)
- The wrapper just runs the loop and streams output
- Uses the same `ANTHROPIC_API_KEY` and setup as your Claude Code project

