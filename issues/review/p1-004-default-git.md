@user Default git support to on. Make it so we have to explicitly pass a flag to turn git off. Update tests accordingly.

---

@claude: I have successfully defaulted git support to on and added a `--no-git` flag to disable it.

Here is a summary of the work I have done:
- Changed the default value of `gitCommit` from `false` to `true` in `src/index.ts`
- Added `--no-git` flag to the recognized flags list
- Implemented handling for the `--no-git` flag in the argument parser to set `gitCommit = false`
- Updated the help text to reflect the new behavior:
  - Changed usage example from `--git` to `--no-git`
  - Updated `--git` option description to indicate it's "on by default"
  - Added `--no-git` option description to "Disable automatic git commits"
  - Updated error message to mention `--no-git` instead of `--git`
- Updated the git-commit test to remove the `--git` flag since it's now enabled by default
- Verified both `pnpm run lint:fix` and `pnpm run typecheck` pass successfully
