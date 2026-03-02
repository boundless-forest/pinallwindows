# Repository Guidelines

## Project Structure & Module Organization
This repository is a Manifest V3 Chrome extension.

- `manifest.json`: extension entry configuration.
- `options.html`: options UI shell.
- `src/background.js`: service worker entry.
- `src/background/`: sync engine modules (`sync-controller.js`, storage, Chrome API wrappers, constants).
- `src/shared/`: pure utilities used by background logic (`tab-utils.js`, `sync-plan.js`).
- `src/options.js`: options page behavior (clear pinned storage action).
- `tests/core.test.js`: unit tests for pure shared logic.
- `icons/`: extension icons.

Keep logic modular: orchestration in `sync-controller.js`, pure logic in `src/shared/`, API boundaries in `chrome-api.js`.

## Build, Test, and Development Commands
Use `pnpm` for all package operations.

- `pnpm install`: install dependencies.
- `pnpm test`: run Node test runner (`node --test`).
- Load locally in Chrome: open `chrome://extensions` → enable Developer mode → **Load unpacked** → choose repo root.

There is no build step currently; source is native JavaScript ES modules.

## Coding Style & Naming Conventions
- Language: modern JavaScript (ES modules, `import`/`export`).
- Formatting: follow existing style (semicolon usage, clear guard clauses, small functions).
- Naming:
  - files: kebab-case (e.g., `sync-controller.js`)
  - functions/variables: camelCase
  - constants/messages: UPPER_SNAKE_CASE
- Keep comments concise and intent-focused (why, not obvious what).

## Testing Guidelines
- Framework: Node built-in test runner.
- Place tests under `tests/` and name files `*.test.js`.
- Prefer unit tests for pure logic in `src/shared/`.
- For Chrome event behavior, include manual verification notes in PRs (window creation, pin/unpin flow, popup-window edge cases).

## Commit & Pull Request Guidelines
Git history uses Conventional Commit style; follow it:
- `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`/

PRs should include:
- concise problem + solution summary,
- impacted files/modules,
- test evidence (`pnpm test` output),
- manual test steps for extension behavior,
- screenshots only when UI/options text changes.

## Security & Configuration Notes
- Do not add new permissions in `manifest.json` unless strictly required.
- Keep sync limited to normal windows and HTTP(S) tabs.
- Avoid logging sensitive tab URLs beyond debugging needs.
