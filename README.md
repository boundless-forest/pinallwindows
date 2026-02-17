# PinAcross

Sync pinned tabs across all open Chrome windows (same machine, same profile), using **app-level union mode**:

- Pin a tab in any window → that *app* (site/origin) becomes pinned in every window.
- Unpin a tab in any window → that app is unpinned/removed everywhere.

In other words: PinAcross syncs pinned items by origin (scheme + host), not by exact URL.

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:

   `/home/bear-wang/coding/pinacross`

## Behavior

- Union mode (app-level): pin anywhere → the same *app* appears pinned everywhere; unpin anywhere → removed everywhere.
- Only `http://` and `https://` tabs are synchronized.
- Canonical pinned apps:
  - Stored in `chrome.storage.local` as `origin:<origin> -> seedUrl`.
  - Initialized from existing pinned tabs on first run.
  - Updated only by pin/unpin events (not by navigation).
- One pinned tab per app per window:
  - If you pin multiple tabs from the same app (e.g. two Gemini chats), PinAcross will keep one and remove duplicates.

How to switch the pinned target for an app:
- Unpin the current pinned tab for that app.
- Then pin the new one you want.

Important: Closing a pinned tab in one window does not remove it globally; it may reappear due to reconciliation. Use unpin to remove globally.

## Testing

Unit tests (pure helpers only):

- `cd /home/bear-wang/coding/pinacross`
- `npm test`

Manual integration test:

Baseline sync:
- Load the extension via `chrome://extensions` → Load unpacked.
- Open two Chrome windows.
- Pin/unpin a few http(s) tabs and verify they propagate.

Gemini (origin-level, replace-with-newest):
- Open two Chrome windows.
- In window A, pin a Gemini URL like:
  - https://gemini.google.com/u/2/gem/.../de2122e1101613c9
- Verify window B has exactly one pinned Gemini tab.
- In window A, pin a different Gemini URL like:
  - https://gemini.google.com/u/2/gem/.../fe5a2df6a838c36c
- Verify every window still has exactly one pinned Gemini tab, and it navigates to the newest pinned Gemini URL.

## Notes / limitations

- Chrome does not provide an atomic "pin across all windows" primitive; this extension reconciles via events, so you may see brief delays.
- URL normalization is minimal (hash removed). If a site uses many distinct query strings for the same content, they will be treated as different pinned entries.

## License

MIT
