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
./bueller.js --issues-dir ./my-issues --max-iterations 50
```

- `--issues-dir <path>`: Issues directory (default: `./issues`)
- `--max-iterations <number>`: Maximum iterations (default: `100`)

## Notes

- Each iteration is a fresh Claude Code session (no memory between iterations)
- The agent manages all file operations (moving issues, creating sub-issues)
- The wrapper just runs the loop and streams output
- Uses the same `ANTHROPIC_API_KEY` and setup as your Claude Code project

