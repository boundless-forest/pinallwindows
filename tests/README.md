Tests are run with Node's built-in test runner:

- `pnpm test`

The tests cover:

- pure shared logic in `src/shared/` (URL parsing + sync planning);
- window eligibility, compact-window safety, and picture-in-picture ambiguity;
- mutation and pending-user-intent tracking;
- controller-level synchronization with a fake Chrome API.

Real Chrome window metadata and UI behavior are still validated manually by loading the extension in `chrome://extensions`.
