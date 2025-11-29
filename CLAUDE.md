# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bueller is a headless Claude Code issue processor that runs Claude Code in a loop to process issues from a directory queue. It's a wrapper around the `@anthropic-ai/claude-agent-sdk` that automates task execution based on markdown issue files.

## Code Style

- ESLint with TypeScript support
- Prettier for formatting
- Import sorting enforced (simple-import-sort plugin)
- Consistent type imports preferred (`type` keyword)
- Unused imports automatically removed
- Comma-dangle: always-multiline
- No circular dependencies allowed
