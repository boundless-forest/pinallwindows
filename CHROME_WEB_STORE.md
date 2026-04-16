# Chrome Web Store publishing pack (PinAllWindows)

This repo is a Chrome extension. The Chrome Web Store submission is mostly documentation and assets.

## Checklist

Before uploading:
- Verify extension name and description:
  - Name: PinAllWindows
  - Version: 0.6.2
- Verify `manifest.json` has correct version.
- Verify icons exist and are referenced by the manifest.
- Verify the extension works in a clean Chrome profile.
- Prepare at least 1–2 screenshots.
- Prepare a privacy policy URL or text.

## Store listing draft

Suggested title
- PinAllWindows

Short description
- Sync pinned apps and navigate tabs across all Chrome windows.

Long description
PinAllWindows keeps your pinned apps consistent across every normal Chrome window and gives you a side-panel tab tree for fast navigation.

What it does:
- Pin a site in any normal Chrome window and PinAllWindows pins that app in every normal window.
- Unpin a site in any normal Chrome window and PinAllWindows removes that pinned app everywhere.
- Treats each app by origin, so different pages under the same domain are kept as one pinned app.
- Removes duplicate pinned tabs for the same origin inside a window.
- Opens a side-panel tab tree from the toolbar icon or Alt+Shift+P.
- Lets you double-click to jump to tabs, move regular tabs between windows, and close regular tabs from the tree.
- Includes an options-page repair action that rebuilds pinned storage from current pinned tabs and re-syncs every normal window.

Privacy:
- No sign-in.
- No external servers.
- No browsing data is collected or sold.
- Pinned app origins are stored locally in chrome.storage.local on your device.

Best for:
- People who use multiple Chrome windows and want the same pinned apps everywhere.
- People who want pinned tabs managed by site/app instead of by exact page URL.
- People who want a lightweight cross-window tab tree without cloud sync.

Category
- Productivity

Permissions justification
- tabs: read pinned tab URLs; create/remove pinned tabs to keep windows consistent
- windows: enumerate windows to apply the same pinned apps to each window
- storage: persist the canonical pinned-app set
- sidePanel: open the tab tree in Chrome's side panel from the extension action/shortcut

Release notes for 0.6.2
- Added a Repair pinned tabs option that rebuilds pinned storage and removes same-origin duplicates.
- Refreshed options-page actions for manual recovery.
- Includes the newer side-panel tab tree for navigating, moving, and closing regular tabs across windows.

## Packaging instructions

Chrome Web Store requires a zip file containing the extension source.

Option A: zip the repo folder (recommended)

This avoids manual copying and reduces future maintenance.

1) Bump version
- Edit `manifest.json` and increment `version`.
- If you tag releases, also bump `package.json` version.

2) Create the zip
From the repo root:

- `cd /Users/bear-wang/Working/pinallwindows`
- `pnpm install`
- `rm -f pinallwindows.zip`
- `zip -r pinallwindows.zip . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x "dist-store/*" \
  -x "pinallwindows.zip"`

3) Upload
- Open the Chrome Web Store Developer Dashboard:
  - https://chrome.google.com/webstore/devconsole
- Upload `pinallwindows.zip`.

Option B: staged dist folder

If you prefer a minimal upload, create a clean staging folder:

- `rm -rf dist-store && mkdir -p dist-store/icons`
- `pnpm install`
- `cp manifest.json options.html side-panel.html LICENSE PRIVACY_POLICY.md CHROME_WEB_STORE.md -t dist-store/`
- `cp -r src dist-store/`
- `cp icons/*.png dist-store/icons/`
- `cd dist-store && zip -r ../pinallwindows.zip .`

## Notes

- Do not include dev-only files in the upload (tests, node_modules, worktree metadata).
- If you change permissions, Chrome may require users to re-approve.
