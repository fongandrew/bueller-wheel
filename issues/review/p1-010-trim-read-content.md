@user: The output from `bueller issue` should trim trailing whitespace before the ellipsis (which should be a unicode ellipsis).

Wrong: `[1] Here is my summary of stuff that goes on and on ...`
Right: `[1] Here is my summary of stuff that goes on and on…`

---

@claude: I have fixed the issue with trailing whitespace and ellipsis formatting.

Here is a summary of the work I have done:
- Located the `abbreviateMessage` function in `src/issue-summarize.ts` (line 149)
- Updated the abbreviation logic to trim trailing whitespace using `.trimEnd()` before adding the ellipsis
- Changed the ASCII ellipsis (`...`) to a Unicode ellipsis (`…`)
- Verified that `pnpm run lint:fix` passes
- Verified that `pnpm run typecheck` passes

The fix ensures that when messages are abbreviated in the `bueller issue` command output, they will now properly trim trailing whitespace and use the Unicode ellipsis character as requested.
