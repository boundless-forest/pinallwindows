# PinAllWindows

Sync pinned apps across all open Chrome windows (same machine, same profile), using app-level union mode.

- Pin a tab in any window → that app (site/origin) becomes pinned in every window.
- Unpin a tab in any window → that app is unpinned/removed everywhere.
- Click the extension icon or use the action shortcut to open a keyboard-friendly tab tree across all normal windows.

In other words: PinAllWindows syncs pinned items by origin (scheme + host), not by exact URL.

## Install (developer mode)

1. Install dependencies:
   - `cd /Users/bear-wang/coding/pinallwindows`
   - `pnpm install`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Click Load unpacked
5. Select this folder:

   `/Users/bear-wang/coding/pinallwindows`

## Behavior

- Union mode (app-level): pin anywhere → the same *app* appears pinned everywhere; unpin anywhere → removed everywhere.
- Only `http://` and `https://` tabs are synchronized.
- Canonical pinned apps:
  - Stored in `chrome.storage.local` as `pinallwindows.origins: string[]` (origin list).
  - Initialized from existing pinned tabs on first run.
  - Updated only by pin/unpin events (not by navigation).
- One pinned tab per app per window:
  - If you pin multiple tabs from the same app (e.g. two Gemini chats), PinAllWindows will keep one and remove duplicates.
- Window eligibility:
  - New normal windows are observed until their Chrome window state is stable before pinned tabs are written.
  - Popup, always-on-top, and compact windows that may be picture-in-picture are excluded or left ambiguous.
  - Ambiguous windows are not modified. This favors delayed sync over copying pinned tabs into transient/PiP windows.
- Options action:
  - `Repair pinned tabs` rebuilds the saved pinned set from currently pinned tabs, dedupes by origin, and syncs all normal windows.
  - `Clear pinned storage` clears the saved pinned set and syncs that empty state to all normal windows.
  - `Copy diagnostics` copies the latest in-memory sync decisions. Diagnostics include window/tab IDs, origins, and window geometry, but not tab titles or full URLs.
- Tab tree:
  - Click the PinAllWindows toolbar icon, or use `Ctrl+Shift+9` (`Command+Shift+9` on macOS).
  - The tree opens in Chrome side panel and stays there until the user closes the side panel.
  - The header shows the currently assigned action shortcut, including user customizations.
  - Tab and window counts appear in the footer.
  - Use the Up/Down Arrow keys to select a tab, then press Enter to open it.
  - Double-click switches to a tab in its window.
  - Pinned rows are listed once per window so users can jump to a pinned tab in a specific window.
  - Pinned rows do not show `Move` or `Close`; regular tabs can use both row actions.
  - The list auto-updates on tab/window changes; `Refresh` remains as a forced refresh.

How to switch the pinned target for an app:
- Unpin the current pinned tab for that app.
- Then pin the new one you want.

Important: Closing a pinned tab in one window does not remove it globally; it may reappear during sync. Use unpin to remove globally.

## Testing

Unit tests:

- `cd /Users/bear-wang/coding/pinallwindows`
- `pnpm test`

The suite covers pure sync planning plus controller-level Chrome event simulations, including picture-in-picture classification, internal mutation feedback, and user actions that race with synchronization.

Manual integration test:

Baseline sync:
- Load the extension via `chrome://extensions` → Load unpacked.
- Open two Chrome windows.
- Pin/unpin a few http(s) tabs and verify they propagate.

Picture-in-picture safety:
- Join a Google Meet call and trigger automatic picture-in-picture.
- Verify the PiP window does not receive copies of pinned tabs.
- Open a regular Chrome window and verify it still receives the canonical pinned set after the short eligibility observation period.
- If behavior is unexpected, open the options page and use `Copy diagnostics` before reloading the extension.

App-level behavior (origin-based):
- In window A, open two different pages under the same origin (example: two different Gemini chats).
- Pin both of them.
- Verify each window ends up with exactly one pinned tab for that origin (duplicates removed).

Repair action:
- Create or keep two pinned tabs from the same origin in one normal window.
- Open the extension options page and click `Repair pinned tabs`.
- Verify every normal window has one pinned tab for that origin and the same pinned-origin set.

Switching the pinned target for an app:
- Unpin the existing pinned tab for that origin.
- Pin the new page you want.
- Verify all windows converge to the new pinned app tab.

Tab tree:
- Click the extension icon and verify the Chrome side panel opens with tabs from all normal windows.
- Use `Ctrl+Shift+9` (`Command+Shift+9` on macOS) and verify the Chrome side panel opens.
- Verify the header shows the action shortcut currently assigned by Chrome.
- Verify the footer shows the current tab and window counts.
- Use the Up/Down Arrow keys to change the selected row, then press Enter and verify the selected tab opens.
- Verify tabs are grouped under `Current window` and the numbered window headings without repeated location badges.
- Verify the active tab uses the amber row state while keyboard selection uses the blue highlighted row state.
- Verify pinned tabs appear per window and do not show `Move` or `Close`.
- Verify every regular tab keeps `Move` and `Close` visible without hovering.
- Double-click a tab under `Current window` and verify it activates that tab.
- Double-click a tab under another window and verify Chrome focuses that window and activates the tab.
- Reopen the tab tree, click `Close`, and verify the tab closes.
- Reopen the tab tree, click `Move`, choose a destination window, and verify the tab moves and focuses.
- Start a move, click `Back to tabs`, and verify the tree list returns without moving the tab.
- Open or close a tab while the tree is open and verify the list updates without pressing `Refresh`.

## Chrome Web Store

Create a tested, minimal upload archive:

```sh
pnpm package
```

The command creates `PinAllWindows-<version>.zip` and prints its SHA-256 checksum. It also leaves the exact packaged contents in `dist-store/` so they can be loaded in developer mode for final verification.

See `CHROME_WEB_STORE.md` for the release checklist and `store-listing/LISTING.md` for ready-to-copy listing text and artwork guidance.

## Notes / limitations

- Chrome does not provide an atomic "pin across all windows" primitive or a reliable extension-facing PiP window type. This extension observes new windows conservatively and syncs via events, so you may see brief delays.
- Identity is origin-based (scheme + host). Different pages under the same origin are treated as the same app.
- Pinned sync is intentionally limited to normal Chrome windows. Popup/devtools/app windows are ignored when seeding and handling pin/unpin events.

## License

MIT
