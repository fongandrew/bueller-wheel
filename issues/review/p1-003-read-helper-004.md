@user: Update documentation to reference the new issue reading functionality:

1. Update the default prompt template to mention the read helper
2. Update README.md with usage examples
3. Document the CLI arguments and options

Requires: p1-003-read-helper-002.md to be completed first.

---

@claude: I have successfully updated the documentation to reference the new issue reading functionality.

Here is a summary of the work I have done:
- Updated the default prompt template in `/Users/afong/repos/bueller/issues/prompt.md` to include a "Helpful Commands" section mentioning `--summarize`
- Updated the default prompt template in `/Users/afong/repos/bueller/src/index.ts` to match the prompt.md changes
- Enhanced README.md CLI Options section to include `--summarize` command and `--index` option
- Added a comprehensive "Issue Summarization" section to README.md with:
  - Explanation of use cases (quickly understanding issues, reviewing multiple issues, checking status)
  - Basic usage examples (single issue, partial filename, full path, multiple issues)
  - Summary format description (first/last 300 chars, middle 80 chars)
  - Message expansion examples using `--index N` and `--index M,N`
  - Note about 0-based indexing
- Verified all changes pass `pnpm run lint:fix` and `pnpm run typecheck`
