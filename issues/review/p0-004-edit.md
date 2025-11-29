@user: Log some sort of sensible content for the Edit tool use invocations. Other than just the tool names.


---

@claude: I have added sensible logging for the Edit tool invocations.

Here is a summary of the work I have done:
- Updated the `logToolUse` function in `src/bueller.ts` to include meaningful logging for the `Edit` tool
- The Edit logging now displays the file path being edited (e.g., `[Edit] src/bueller.ts`)
- This matches the existing pattern used for Read and Write tools
