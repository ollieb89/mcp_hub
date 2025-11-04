# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the runtime hub; `server.js` wires the Express API, while `utils/` provides reusable services (SSE manager, router, tool filtering, workspace cache, logging) and `mcp/` bridges MCP clients.
- `marketplace.js` manages catalog ingestion; keep marketplace updates coordinated with `scripts/update-data.js`.
- Tests mirror source under `tests/`; load profiles sit in `tests/load/`, fixtures and helpers in `tests/fixtures/` and `tests/helpers/`.
- Generated artifacts reside in `dist/`; documentation, playbooks, and examples live in `docs/`, `claudedocs/`, `examples/`, and static UI assets in `public/`.
- Ship configurable defaults in `mcp-servers.json` alongside the sanitized `mcp-servers.example.json`.

## Build, Test, and Development Commands
- `bun install` keeps dependencies aligned with the Bun (1.1+) runtime that powers builds and tests.
- `bun run build` executes `scripts/build.js`, regenerating `dist/cli.js`; run before publishing.
- `bun run start` (or `bun ./src/utils/cli.js --port 7000 --config ./mcp-servers.json`) launches a local hub; append `--watch` for automatic restarts during development.
- `bun run test` executes the Vitest suite; use `bun run test:watch` while iterating and `bun run test:coverage` to confirm thresholds.
- `bun scripts/update-data.js` refreshes marketplace metadata before committing catalog changes.

## Coding Style & Naming Conventions
- Stick to modern ESM with 2-space indentation and trailing commas where it improves diffs; mirror existing import/export patterns.
- Class-centric modules stay PascalCase (`MCPHub.js`, `MCPConnection.js`); helper utilities use kebab-case filenames (`tool-filtering-service.js`), with lowerCamelCase symbols.
- Run `bunx eslint .` using `eslint.config.js` before submitting; lint errors must be resolved rather than silenced.
- Avoid committing generated `dist/` diffs unless the build output is the intended change.

## Testing Guidelines
- Vitest drives the unit and integration suites (`tests/**/*.test.js`); maintain ≥70% coverage on core hub modules as enforced by `vitest.config.js`.
- Mirror new logic with specs in `tests/`, keeping AAA comments for clarity; derive shared stubs from `tests/helpers/`.
- Exercise load scenarios with `bun run test:load` (k6) when altering transports or concurrency, and surface findings in PR notes.

## Commit & Pull Request Guidelines
- Follow conventional commits (`fix:`, `chore:`, `docs:`) as seen in recent history; bundle logically related changes per commit.
- Update `CHANGELOG.md`, `README.md`, or other docs when behavior, configuration, or APIs shift.
- PRs should include a concise summary, testing checklist (unit, coverage, load as applicable), linked issues, and screenshots or logs for UI/SSE changes.
- Confirm `bun run build`, lint, and test commands succeed before requesting review to keep CI green.

## Configuration & Security Notes
- Feed secrets via environment variables—`src/utils/env-resolver.js` honors `${env:VAR}` syntax throughout JSON5 configs.
- Never commit live credentials; scrub `mcp-servers.json` before pushing and document overrides in `docs/` or internal runbooks.
- Capture new transport or provider requirements in `SECURITY.md` and add migration guidance for operators when configuration schemas change.
