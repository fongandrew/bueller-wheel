@user: An issue markdown file can get pretty long. Update our script to accept args to output an issue ID and report an abbreviated summary. The purpose of this is make it easier for agents to manage context for very long conversations with a lot of junk. The summary output should look like this:

```
> pnpm run dev issues/open/p0-123-do-the-thing.md

p0-123-do-the-thing.md (open):
0. @user: Here is a description of the issue. It is a single line. The original may have newlines but we've removed it for this description. It gets truncated after a certain length. Let's say 300 characters. Pretend this goes on for more characters and ends like this with an ellips...
1. @claude: Here is a one-liner of a message after that. These get truncated after 80 chars...
2. @user: Another message.
3. @claude: More message.
4. @user: The last message should be extended. Allow for this to go up to 300 characters.

Run with `--index N` to expand a single note or `--index M,N` to get a range.
```

We should also allow for just the filename (no path), in which case Bueller Wheel tries to search each of its directories for the file:

```
> pnpm run dev p0-123-do-the-thing

p0-123-do-the-thing.md (closed):
0. ...
1. ...
2. ...
```

We should also support multiple issues in the same command

```
> pnpm run dev p0-123-do-the-thing p0-456-do-the-other-thing

p0-123-do-the-thing.md (closed):
0. ...
1. ...
2. ...

p0-456-do-the-other-thing.md (open):
0. ...
1. ...
2. ...
```

Decompose this task into smaller tasks if needed.

Write a simple test for this. Make sure `pnpm test` passes after this. The test doesn't have to test the main rain loop, just the issue summarization and finding.

Update the default prompt and README to referenec this new functionality.

---

@claude: I have decomposed this task into four focused sub-tasks.

Here is a summary of the work I have done:
- Created `p1-003-read-helper-001.md` to build the core issue parser utility
- Created `p1-003-read-helper-002.md` to implement the CLI command with all requested features (truncation, --index, multi-file support, directory search)
- Created `p1-003-read-helper-003.md` to write comprehensive tests for the functionality
- Created `p1-003-read-helper-004.md` to update documentation (prompt template and README)

Each child issue has clear requirements and dependencies noted where applicable.
