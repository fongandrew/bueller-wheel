# Bueller Wheel

> Life moves pretty fast. If you don't stop and look around once in a while, you could miss it.

This is a headless Claude Code issue processor that runs in a loop and resolves issues or ticket files written in markdown.

## Quick Start

```bash
# Create an issue
mkdir -p issues/open
echo "@user: Please create a test file with 'Hello World'" > issues/open/p0-100-my-task.md

# Run bueller-wheel to complete the task
npx bueller-wheel --run
```

## Why?

You want Claude Code to autonomously work on a large pile of issues while you go on a day trip into the city. Bueller Wheel helps tackle several issues you might encounter:

- **Claude stops processing after a few issues**: Claude Code tends to stop processing after completing a few tasks. Bueller Wheel keeps prompting Claude Code to work until all of the issues have been resolved.
- **Claude forgets what it's doing**: As Claude Code uses up its context window, it tends to forget what it was working on. Bueller Wheel runs Claude Code with a fresh context window and prompt for each issue.
- **You forget what Claude was doing**: If you successfully get Claude Code to work on a large number of tasks, you end up with a pile of code to review. Bueller Wheel structures each issue as a discrete reviewable chunk of work, in a format amenable to multiple iterations of feedback between you and Claude.
- **Claude keeps making the same mistakes**: An agent that forgets its history is doomed to repeat it. Bueller Wheel sets up an FAQ directory for Claude to speed up resolution of frequent pitfalls.

**Note**: Bueller Wheel is not a full-fledged task management system. It has no concept of assignment or dependency apart from linear file ordering. The sweet spot for this tool is **solo developers working on a single branch**. That said, you can make [parallel branches and agents](#working-with-multiple-branches) work.

## How It Works

**The Processing Loop**

1. Bueller Wheel finds the next issue in `issues/open/` (sorted alphabetically by filename)
2. Claude Code reads the issue and works on the task
3. Claude appends its work summary to the issue file
4. Claude decides the outcome:
   - **CONTINUE**: Keep working (stays in `open/`)
   - **COMPLETE**: Done (moves to `review/`)
   - **DECOMPOSE**: Split into sub-tasks (creates child issues, moves parent to `review/`)
   - **STUCK**: Needs help (moves to `stuck/`)

**Managing the "kanban" board:**

- Create issue markdown in `open/` for each task you want Claude to work on. Name files alphabetically in the order you want them processed. By default, the prompt used tells our agent to name files with something like `p1-101-name-of-task.md` (`p1` is a priority between 0 to 2, and `101` is just an arbitrary number for ordering).
- Move issues from `review/` or `stuck/` back to `open/` if more work is required
- Delete issues from `review/` when done reviewing, or archive them however you want

**Each iteration is a fresh Claude Code session** - no memory between iterations, which keeps context focused.

**Inherits your project's Claude Code setup** - `bueller-wheel` uses the Anthropic API credential from whichever user you're logged in as. It inherits the same `.claude/settings.json` or `.claude/settings.local.json` as the Claude Code project it's used in. Whatever permissions apply to your regular `claude` CLI should also apply to `bueller-wheel`, with the exception that `bueller-wheel` starts in "accept edits" mode.

## Issue Structure

**Directory Layout**
```
issues/
  open/      - Issues to be processed
  review/    - Completed issues ready for human review
  stuck/     - Issues blocked, requiring human intervention
  prompt.md  - Custom prompt template (optional)
```

**Filename Format:** `p{priority}-{order}-{description}.md`

Examples:
- `p0-100-fix-critical-bug.md` (urgent work)
- `p1-050-add-feature.md` (normal feature work)
- `p2-020-refactor-code.md` (non-blocking follow-up)

Files are processed alphabetically (p0 before p1, lower order numbers first).

**Issue Content: A Conversation**

Issues are markdown files with a simple conversation structure:

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

Because it's just markdown, you can:
- Append new instructions at any time
- Edit previous messages to clarify intent
- Delete irrelevant parts of the conversation
- Copy successful patterns to new issues

## FAQ System

The `faq/` directory contains markdown files with solutions to common problems. When Claude encounters issues, it's instructed to check this directory for relevant guidance.

**Why this helps:**
- Document a fix once, reference it forever
- Keep Claude on track with project-specific conventions
- Reduce repeated mistakes without cluttering every issue prompt

**Example FAQ structure:**
```
faq/
  testing-guidelines.md
  code-style.md
  common-errors.md
```

Configure the location with `--faq-dir` (default: `./faq`)

## Working with Multiple Branches

The `open/` directory acts as an inbox for the agent on the current branch. The agent will attempt to burn through all issues in that directory (or until it hits `--max-iterations`).

**If you want to divide work across multiple branches or run multiple agents in parallel:**

1. **Track issues outside `open/`** - Use an external issue tracker or create an `issues/backlog/` directory. Bueller Wheel doesn't process anything except in the `open/` directory.

2. **One branch per agent** - Create a separate branch (or checkout/worktree) for each agent working in parallel.

3. **Move issues into `open/` as tasks for a single agent** - Only move issues from your backlog into `open/` that you want the current agent to work on. Think of it as dividing work into reviewable chunks that are easier to merge.

## CLI Options

```bash
# Start the agent loop with various options
npx bueller-wheel --run
npx bueller-wheel --git
npx bueller-wheel --max 50
npx bueller-wheel --continue "fix the bug"

# Summarize issues
npx bueller-wheel --summarize p1-003-task.md
npx bueller-wheel --summarize p1-003.md p2-005.md --index 1

# Combine with other options
npx bueller-wheel --run --issues-dir ./my-issues --faq-dir ./my-faq
npx bueller-wheel --max 50 --git --prompt ./my-prompt.md

# Or if installed globally
bueller-wheel --run
bueller-wheel --git
```

**Run Commands** (one required):
- `--run`: Explicitly start the agent loop with defaults
- `--git`: Enable automatic git commits and start the loop
- `--max <number>`: Start with maximum N iterations (default: `25`)
- `--continue [prompt]`: Continue from previous session. Optional prompt defaults to "continue" if not provided
- `--summarize <issue...>`: Display abbreviated summaries of issue conversation history

**Configuration Options**:
- `--issues-dir <path>`: Issues directory (default: `./issues`)
- `--faq-dir <path>`: FAQ directory (default: `./faq`)
- `--prompt <path>`: Path to custom prompt template file (default: `<issues-dir>/prompt.md`)
- `--index <N>` or `--index <M,N>`: Expand specific messages when using `--summarize` (see below)

### Custom Prompt Templates

Bueller Wheel uses a customizable prompt template system that allows you to tailor the agent's behavior.

#### How It Works

1. **Default Template**: On first run, Bueller Wheel creates a default prompt template at `<issues-dir>/prompt.md`
2. **Custom Template**: You can edit this file or specify a different template with `--prompt`
3. **Template Variables**: The template uses bracketed variables that are replaced at runtime

#### Template Variables

The following variables are available in your prompt template:

- `[ISSUES_DIR]` - The issues directory path (e.g., `./issues`)
- `[FAQ_DIR]` - The FAQ directory path (e.g., `./faq`)
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

### Continue Mode

The `--continue` flag continues from the last Claude session with a custom prompt. You can use this to interrupt a live loop that's going sideways and nudge it back on track.

```bash
# Continue with default "continue" prompt
npx bueller-wheel --continue

# Continue with custom instructions
npx bueller-wheel --continue "no use foo instead of bar"
```

Note that only the immediate prior iteration is continued. The next iteration will start with a fresh context and the original prompt.

### Git Auto-Commit

When `--git` is enabled, Bueller Wheel will automatically create a git commit after each iteration where work was done on an issue.

The commit message format includes the issue ID (the filename minus the `.md`) and status:
```
p0-002-git done
p0-002-git in progress
p0-002-git stuck
p0-002-git unknown
```

### Issue Summarization

The `--summarize` command provides a quick way to review issue conversation history without opening files. This is especially useful for:
- Quickly understanding what happened in an issue
- Reviewing multiple issues at once
- Checking the status and progress of work

**Basic Usage:**

```bash
# Summarize a single issue (by filename - searches across open/, review/, stuck/)
npx bueller-wheel --summarize p1-003-task.md

# Summarize by partial filename
npx bueller-wheel --summarize p1-003.md

# Summarize with full path
npx bueller-wheel --summarize /path/to/issues/open/p1-003-task.md

# Summarize multiple issues
npx bueller-wheel --summarize p1-003.md p1-004.md p2-001.md
```

**Summary Format:**

By default, summaries show:
- Issue filename and status (open/review/stuck)
- First message: up to 300 characters
- Middle messages: up to 80 characters each (abbreviated)
- Last message: up to 300 characters

**Expanding Messages:**

Use `--index` to expand specific messages to their full content:

```bash
# Expand a single message at index 2
npx bueller-wheel --summarize p1-003.md --index 2

# Expand a range of messages (indices 1 through 3)
npx bueller-wheel --summarize p1-003.md --index 1,3

# Works with multiple issues (expands same indices for all)
npx bueller-wheel --summarize p1-003.md p1-004.md --index 0,2
```

**Note:** Message indices are 0-based (first message is index 0).

## Development

`pnpm run dev` will execute the current `src/index.ts` script file with whatever args you pass to it. For example:

```bash
pnpm run dev -- --run
pnpm run dev -- --git
pnpm run dev -- --max 10
```

## End-to-End Testing

**These tests use your actual live instance of Claude Code!**

```bash
# Run all tests
pnpm test

# Run a specific test
./tests/run-test.sh simple-task
```

Tests are located in `tests/fixtures/` and consist of:
- Pre-configured issue directories with markdown files
- Verification scripts to check outcomes

See [tests/README.md](tests/README.md) for more details on creating new test cases.
