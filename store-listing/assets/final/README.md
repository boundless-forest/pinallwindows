# Upload-ready promotional assets

- `promo-small-440x280.png`: required small promotional tile.
- `promo-marquee-1400x560.png`: optional marquee promotional tile.

Use `icons/icon128.png` as the store icon. Matching colored tabs in two overlapping browser windows communicate one connected workspace across windows.

The two upload-ready screenshots are in `screenshots/`. They lead with the unified cross-window side panel, then show pinned apps synchronized across windows. Follow `store-listing/ARTWORK.md` for the upload order and source-image rules.

The promotional artwork and screenshots use bundled Manrope typography, have exact Chrome Web Store dimensions, and contain no alpha channel. Rebuild them with `pnpm assets:store`.
