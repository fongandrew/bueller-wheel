@user: Add a `--help` command or something similar that outputs how to use bueller without actually kicking off the loop.

---

@claude: I have implemented the `--help` command for Bueller.

Here is a summary of the work I have done:
- Added a `showHelp()` function that displays comprehensive usage information
- Modified `parseArgs()` to check for `--help` or `-h` flags before parsing other arguments
- When help is requested, the function displays the help message and exits with code 0, preventing the main loop from starting
- The help message includes:
  - Usage syntax
  - All available command-line options with descriptions and defaults
  - Directory structure explanation
  - Issue file format and priority levels
  - Example commands
- Verified the implementation works with both `--help` and `-h` flags
- Verified that `pnpm run lint:fix` passes
- Verified that `pnpm run typecheck` passes
