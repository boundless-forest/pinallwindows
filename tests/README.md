Tests are run with Node's built-in test runner:

- `npm test`

These tests cover only the pure helper functions in `core.js` (URL filtering/normalization and small utilities).
The Chrome APIs are integration-tested manually by loading the extension in `chrome://extensions`.
