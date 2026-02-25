# Chrome Web Store publishing pack (PinAllWindows)

This repo is a Chrome extension. The Chrome Web Store submission is mostly documentation and assets.

## Checklist

Before uploading:
- Decide the final extension name and description.
- Verify `manifest.json` has correct version.
- Verify icons exist and are referenced by the manifest.
- Verify the extension works in a clean Chrome profile.
- Prepare at least 1–2 screenshots.
- Prepare a privacy policy URL or text.

## Store listing draft

Suggested title
- PinAllWindows

Short description
- Sync pinned apps across all Chrome windows.

Long description
- PinAllWindows keeps your pinned apps consistent across every Chrome window.
- When you pin a tab, PinAllWindows treats its origin (scheme + host) as the app identity and ensures each window has exactly one pinned tab for that app.
- If duplicates exist (multiple pinned tabs from the same app), it keeps one and removes the rest.
- No sign-in. No network calls. All data stays on your device.

Category
- Productivity

Permissions justification
- tabs: read pinned tab URLs; create/remove pinned tabs to keep windows consistent
- windows: enumerate windows to apply the same pinned apps to each window
- storage: persist the canonical pinned-app set

## Packaging instructions

Chrome Web Store requires a zip file containing the extension source.

1) Bump version
- Edit `manifest.json` and increment `version`.
- If you tag releases, also bump `package.json` version.

2) Create a clean build folder
From the repo root:

- Create a staging directory:

  `mkdir -p dist-store`

- Copy only what Chrome needs:

  `cp manifest.json background.js core.js options.html options.js LICENSE PRIVACY_POLICY.md -t dist-store/`
  `mkdir -p dist-store/icons && cp icons/*.png dist-store/icons/`

3) Create the zip

- `cd dist-store`
- `zip -r ../pinallwindows.zip .`

4) Upload
- Upload `pinallwindows.zip` to the Chrome Web Store dashboard.

## Notes

- Do not include dev-only files in the upload (tests, node_modules, worktree metadata).
- The extension does not require a build step.
- If you change permissions, Chrome may require users to re-approve.
