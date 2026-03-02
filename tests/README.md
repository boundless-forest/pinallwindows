Tests are run with Node's built-in test runner:

- `pnpm test`

These tests cover pure shared logic in `src/shared/` (URL parsing + sync planning).
Chrome API behavior is still validated manually by loading the extension in `chrome://extensions`.
