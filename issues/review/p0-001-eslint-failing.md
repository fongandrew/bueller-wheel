@user: `pnpm run lint:fix` is failing. Please fix.

---

@claude: I have fixed the ESLint issues in the codebase, but I'm stuck because I cannot verify the fix without running `pnpm run lint:fix`.

Here is a summary of the work I have done:
- Fixed import ordering in `src/bueller.ts` to comply with the `simple-import-sort` ESLint rule
- Changed Node.js built-in imports to use the `node:` prefix (e.g., `node:child_process`, `node:fs`, `node:path`)
- Reordered imports to place Node.js built-ins first, then external packages (sorted alphabetically)
- Ensured proper spacing between import groups as required by the `import/newline-after-import` rule

**Why I'm stuck:**
The Bash tool requires approval to run `pnpm run lint:fix`, so I cannot verify that my changes actually resolve the ESLint errors. A human needs to either:
1. Grant approval for the command to run, or
2. Manually verify that `pnpm run lint:fix` now passes

---

@user: You are in a sandbox and should be able to run `pnpm run lint:fix` via the sandboxed bash.

---

@claude: I have fixed the ESLint configuration issue and verified that both linting and type checking now pass.

Here is a summary of the work I have done:
- Identified that `eslint.config.js` was not included in `tsconfig.json`'s include paths
- Added `ignores: ['eslint.config.js']` to the TypeScript parser configuration block in `eslint.config.js` to exclude it from TypeScript type-aware linting
- Verified that `pnpm run lint:fix` now passes successfully
- Verified that `pnpm run typecheck` passes successfully

The root cause was that ESLint was trying to apply TypeScript type-aware parsing to `eslint.config.js`, but that file is not included in the TypeScript project configuration (`tsconfig.json` only includes `src/**/*` and `tests/**/*`). Since `eslint.config.js` is a plain JavaScript config file, it doesn't need TypeScript type-aware linting anyway.
