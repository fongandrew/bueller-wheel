@user: Let's make it easy to customize the prompt for repeated use. The script should accept a `--prompt` that points to a prompt file (by default, `issues/prompt.md`). If there is no prompt there, the script writes our default one.

The prompt markdown file should be a TEMPLATE. Replace current template literal replacements with hard-coded strings (maybe wrapped with brackets). Document template variables in README.md.

---

@claude: I have successfully implemented the custom prompt template system.

Here is a summary of the work I have done:
- Added a `--prompt` CLI option to the `parseArgs` function that defaults to `<issues-dir>/prompt.md`
- Created a `getDefaultPromptTemplate()` function that returns the default prompt template with bracketed template variables
- Created a `loadOrCreatePromptTemplate()` function that loads an existing prompt file or creates the default one if it doesn't exist
- Updated `buildSystemPrompt()` to accept a template parameter and replace template variables with actual values using bracket notation (e.g., `[ISSUES_DIR]`, `[ISSUE_FILE_PATH]`)
- Modified the `main()` function to load the prompt template once at startup and pass it to `runAgent()`
- Updated `runAgent()` to accept and use the template parameter
- Documented the new `--prompt` CLI option in README.md
- Added a comprehensive "Custom Prompt Templates" section to README.md that explains:
  - How the template system works
  - All available template variables (`[ISSUES_DIR]`, `[ISSUE_DIR_OPEN]`, `[ISSUE_DIR_REVIEW]`, `[ISSUE_DIR_STUCK]`, `[ISSUE_FILE_PATH]`, `[ISSUE_FILE]`)
  - Example usage showing before/after template variable replacement
  - Instructions for creating custom prompts

The system now supports:
- Custom prompt files that can be edited for repeated use
- Automatic creation of the default prompt template on first run
- Template variables in bracket notation for dynamic value substitution
- Full backward compatibility (the default behavior produces the same prompt as before)
