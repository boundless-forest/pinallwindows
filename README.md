# PinAllWindows

Sync pinned apps across all open Chrome windows (same machine, same profile), using app-level union mode.

- Pin a tab in any window → that app (site/origin) becomes pinned in every window.
- Unpin a tab in any window → that app is unpinned/removed everywhere.

In other words: PinAllWindows syncs pinned items by origin (scheme + host), not by exact URL.

## Install (developer mode)

1. Install dependencies:
   - `cd /home/bear-wang/coding/pinallwindows`
   - `pnpm install`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Click Load unpacked
5. Select this folder:

   `/home/bear-wang/coding/pinallwindows`

## Behavior

- Union mode (app-level): pin anywhere → the same *app* appears pinned everywhere; unpin anywhere → removed everywhere.
- Only `http://` and `https://` tabs are synchronized.
- Canonical pinned apps:
  - Stored in `chrome.storage.local` as `origin:<origin> -> seedUrl`.
  - Initialized from existing pinned tabs on first run.
  - Updated only by pin/unpin events (not by navigation).
- One pinned tab per app per window:
  - If you pin multiple tabs from the same app (e.g. two Gemini chats), PinAllWindows will keep one and remove duplicates.
- Options action:
  - `Clear pinned storage` clears the saved pinned set and syncs that empty state to all normal windows.

How to switch the pinned target for an app:
- Unpin the current pinned tab for that app.
- Then pin the new one you want.

Important: Closing a pinned tab in one window does not remove it globally; it may reappear during sync. Use unpin to remove globally.

## Testing

Unit tests (pure helpers only):

- `cd /home/bear-wang/coding/pinallwindows`
- `pnpm test`

Manual integration test:

Baseline sync:
- Load the extension via `chrome://extensions` → Load unpacked.
- Open two Chrome windows.
- Pin/unpin a few http(s) tabs and verify they propagate.

App-level behavior (origin-based):
- In window A, open two different pages under the same origin (example: two different Gemini chats).
- Pin both of them.
- Verify each window ends up with exactly one pinned tab for that origin (duplicates removed).

Switching the pinned target for an app:
- Unpin the existing pinned tab for that origin.
- Pin the new page you want.
- Verify all windows converge to the new pinned app tab.

## Chrome Web Store

This folder can be uploaded to the Chrome Web Store as a zip.

Packaging steps

Option A: zip the repo folder (recommended for low friction)

This method avoids manual copying. It creates a zip from the repo root and excludes dev-only files.

1. Bump version
- Update `manifest.json` version.

2. Create the zip
From the repo root:

- `cd /home/bear-wang/coding/pinallwindows`
- `rm -f pinallwindows.zip`
- `zip -r pinallwindows.zip . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x "dist-store/*" \
  -x "pinallwindows.zip"`

3. Upload
- Open the Chrome Web Store Developer Dashboard:
  - https://chrome.google.com/webstore/devconsole
- Upload `pinallwindows.zip`.

Option B: staged dist folder

If you prefer a minimal upload, use the staged folder method described in `CHROME_WEB_STORE.md`.

Other store materials
- Listing copy and a longer checklist are in `CHROME_WEB_STORE.md`.
- Privacy policy is in `PRIVACY_POLICY.md`.
- You still need to prepare screenshots.

## Notes / limitations

- Chrome does not provide an atomic "pin across all windows" primitive; this extension syncs via events, so you may see brief delays.
- Identity is origin-based (scheme + host). Different pages under the same origin are treated as the same app.

## License

MIT
