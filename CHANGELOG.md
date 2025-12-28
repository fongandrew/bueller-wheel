# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0]

### Added
- `bueller-wheel` now accepts a `--model` param to change the Claude model used. It also inspects `~/.claude.json` to default to the same model used when invoking `claude` via the CLI.

## [0.3.2]

### Fixed
- Optimize issue summarization for 80 char lines

## [0.3.1]

### Fixed
- `dist/` was missing files

## [0.3.0]

### Added
- `bueller-wheel issue <path-to-issue>` presents a condensed summary of the issue. Default prompt has been updated to reference `bueller-wheel issue`.
- New default prompt instruction to add to FAQs

### Changed
- Main loop does not run by default. Call `bueller-wheel run` to start.
- Git auto-commit is on by default. Passing `--no-git` to disable.
- `--max-iterations` is now just `--max`

### Fixed
- Grep tool usage logs file paths, not just globs
- Fixed infinite continuation bug with `--continue`

## [0.2.0] - 2025-11-30

### Added
- Colors in output for better readability

### Fixed
- Grep tool usage calls not being logged properly

## [0.1.0] - 2025-11-30

### Added
- Initial release
- Headless Claude Code issue processor
- Directory-based issue queue (open/review/stuck)
- FAQ system for common issues
- Customizable prompt templates
- Git auto-commit support
- Continue mode for resuming sessions
- Priority-based issue ordering
