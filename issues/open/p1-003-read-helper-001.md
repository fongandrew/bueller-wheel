@user: Create a core issue reader utility that can parse issue markdown files and extract the conversation history. This utility should:

1. Parse issue files with the `@user:` and `@claude:` format
2. Extract each message as a separate entry
3. Return structured data with message metadata (index, author, content)
4. Handle edge cases (empty messages, malformed files, etc.)

This will be the foundation for the issue summarization tool.
