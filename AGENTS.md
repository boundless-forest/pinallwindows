# Repository Guidelines

## Product identity

- Product name: **ztab** (always lowercase); Chrome Web Store name: **ztab: Tab Manager**.
- Positioning: **Another excellent tab manager for Chrome.**
- Give equal weight to three capabilities: managing tabs across windows, keeping pinned tabs across windows, and keyboard shortcuts with thoughtful interactions.
- Describe implemented behavior. Do not imply cross-device sync, saved sessions, or shortcuts that the product does not provide.
- The former names TabSpan and PinAllWindows may remain in migration history and compatibility identifiers. Keep existing storage keys and runtime message values unless a separate migration is explicitly planned.
- Use `https://github.com/boundless-forest/ztab` for repository and support links. See `CHROME_WEB_STORE.md` for the remaining store rollout.

## Project Structure & Module Organization

This repository is a Manifest V3 Chrome extension written in native JavaScript ES modules.

- `manifest.json`: extension identity, permissions, shortcut, and entry points.
- `side-panel.html` and `src/tab-tree.js`: cross-window tab list and interactions.
- `options.html` and `src/options.js`: preferences, keyboard help, pinned-tab recovery, and diagnostics.
- `src/background.js`: service worker entry.
- `src/background/`: synchronization controller, canonical store, Chrome API wrappers, window eligibility, and window merging.
- `src/shared/`: pure utilities used by the background logic and panel.
- `tests/`: unit and controller tests using a fake Chrome API.
- `icons/`: extension icons.
- `scripts/`: store-asset rendering and release packaging.
- `store-listing/`: listing copy, artwork sources, and final store images.

Keep orchestration in the background controllers, pure logic in `src/shared/`, and Chrome API boundaries in `chrome-api.js`.

## Build, Test, and Development Commands

Use `pnpm` for all package operations.

- `pnpm install`: install dependencies.
- `pnpm test`: run the Node test runner (`node --test`).
- `pnpm assets:store`: regenerate extension icons and store images.
- `pnpm package`: run tests, validate runtime files, and create `dist-store/` plus `ztab-<version>.zip`.
- Load locally in Chrome: open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the repository root or packaged `dist-store/` directory.

The extension needs no compilation step. Repackage after changes when practical so the prepared release reflects the latest source.

## Coding Style & Naming Conventions

- Use modern JavaScript ES modules (`import`/`export`).
- Follow existing formatting, semicolons, guard clauses, and small functions.
- Use kebab-case filenames, camelCase functions and variables, and UPPER_SNAKE_CASE constants and messages.
- Keep comments concise and intent-focused; explain non-obvious behavior and compatibility choices.

## Testing Guidelines

- Use Node's built-in test runner; name test files `*.test.js` under `tests/`.
- Prefer unit tests for pure logic and meaningful failure-path coverage for Chrome actions.
- Run `pnpm test` and `git diff --check` before finishing.
- Use `tests/README.md` for real-Chrome verification of shortcuts, window merging, pin/unpin flows, and compact-window safety.
- UI or store-copy changes need visual review of the affected pages and images.

## Commit & Pull Request Guidelines

Keep one commit per complete logical change. Commit messages use `(type): (subject paragraph)`, with one lowercase type from `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, or `ci`. Write a single 15–30 word paragraph in present tense that explains what changed and why, without a trailing period, filenames, code, or emojis.

PR titles are at most 50 characters, begin with a capitalized word, and use lowercase afterward except for technical terms. Keep the ztab brand lowercase wherever it appears. Do not add a type prefix or final punctuation.

Start the PR description with a concise problem and solution paragraph, followed by **Main changes:** and **Reviewer notes:**. Include concrete changes, test evidence, relevant manual checks, and screenshots for UI changes. State unverified Chrome behavior or pending external rollout steps clearly.

## Security & Configuration Notes

- Do not add new permissions in `manifest.json` unless strictly required.
- Keep pinned-tab synchronization limited to eligible normal windows and HTTP(S) sites.
- Preserve window-merge eligibility checks and browsing-mode boundaries.
- Avoid logging sensitive tab URLs beyond debugging needs.
- Keep `manifest.json` and `package.json` versions aligned.
- Treat local preparation, GitHub renaming, store submission, and publication as separate steps. Follow the user's authorization for external changes.
