# PinAcross

Sync pinned tabs across all open Chrome windows (same machine, same profile), using **union mode**:

- Pin a tab in any window → that URL is pinned in every window.
- Unpin a tab in any window → that URL is unpinned/removed everywhere.

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:

   `/home/bear-wang/coding/pinacross`

## Behavior

- Union mode: pin anywhere → appears everywhere; unpin anywhere → removed everywhere.
- Only `http://` and `https://` tabs are synchronized.
- The canonical pinned set is derived from the currently pinned tabs.
- The extension periodically reconciles all windows when pin/unpin events happen.

## Testing

Unit tests (pure helpers only):

- `cd /home/bear-wang/coding/pinacross`
- `npm test`

Manual integration test:

- Load the extension via `chrome://extensions` → Load unpacked.
- Open two Chrome windows.
- Pin/unpin a few http(s) tabs and verify they propagate.

## Notes / limitations

- Chrome does not provide an atomic "pin across all windows" primitive; this extension reconciles via events, so you may see brief delays.
- URL normalization is minimal (hash removed). If a site uses many distinct query strings for the same content, they will be treated as different pinned entries.

## License

MIT
