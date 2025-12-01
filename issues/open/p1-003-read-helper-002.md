@user: Create a CLI command for issue summarization that:

1. Accepts issue file paths or filenames as arguments
2. For filenames only, searches across open/, review/, and stuck/ directories
3. Displays abbreviated summaries:
   - First message: up to 300 characters
   - Middle messages: up to 80 characters
   - Last message: up to 300 characters
4. Shows the issue status (open/review/stuck)
5. Supports multiple issues in one command
6. Supports `--index N` to expand a single message
7. Supports `--index M,N` to expand a range of messages

Requires: p1-003-read-helper-001.md to be completed first.
