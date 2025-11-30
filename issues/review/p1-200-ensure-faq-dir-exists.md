@user: The bueller script should ensure the FAQ directory exists the same way it does for issue directories.

---

@claude: The FAQ directory is already being ensured to exist in the same way as the issue directories.

Here is a summary of the work I have done:
- Examined the `ensureDirectories` function in `src/bueller.ts` (lines 98-114)
- Confirmed that `faqDir` is already included in the list of directories to create (line 104)
- Verified that it uses the same pattern as issue directories: checking with `fs.access()` and creating with `fs.mkdir()` with `recursive: true`
- Ran `pnpm run lint:fix` - passed ✓
- Ran `pnpm run typecheck` - passed ✓

The implementation is already complete. No code changes were needed.
