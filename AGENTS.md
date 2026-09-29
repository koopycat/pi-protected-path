# AGENTS.md — pi-protected-path

Standalone [Pi coding agent](https://github.com/earendil-works/pi) extension that guards sensitive
project paths with `.agentignore` patterns. Extracted from `pi_extensions`; this repository is the
single source of truth.

## Commands

```bash
pnpm install        # Install dependencies (pnpm only, never npm/yarn)
pnpm check          # Prettier + zero-warning ESLint + typecheck + tests
pnpm test           # Run Vitest once
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint with zero warnings
pnpm format         # Prettier write
pnpm format:check   # Prettier dry run
```

## Package layout

- `index.ts` — Pi extension entry point and confirmation policy.
- `lib.ts` — pattern loading, matching, and shell-token path extraction.
- `lib.test.ts` — unit tests.
- `index.test.ts` — extension event tests for interactive and headless behavior.

## Invariants

- `.env` and `.env.*` are always protected at every depth inside the project.
- Project patterns come from `<project>/.agentignore`; global patterns come from `~/.pi/.agentignore`.
- Paths outside the project are out of scope; use a path-jail extension for that boundary.
- Headless access to a protected path fails closed.
- Interactive access requires explicit approval; session approval is scoped to the exact tool/path pair.
- The shell parser is deliberately conservative but cannot fully interpret arbitrary shell programs.
- Pi packages remain peer dependencies and runtime code must have no third-party dependencies.

## Release

1. Bump `version` in `package.json`.
2. Run `pnpm check`.
3. Use a single-line commit message, tag `vX.Y.Z`, and push the commit and tag.
