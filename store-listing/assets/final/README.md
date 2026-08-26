# Upload-ready promotional assets

- `promo-small-440x280.png`: required small promotional tile.
- `promo-marquee-1400x560.png`: optional marquee promotional tile.
- `screenshots/screenshot-03-tab-actions.jpg`: lead with cross-window jump, move, and close actions.
- `screenshots/screenshot-01-pin-once.jpg`: introduce TabSpan's pinned-app synchronization in one window.
- `screenshots/screenshot-02-every-window.jpg`: show the same pinned apps in another window.

Use `icons/icon128.png` as the store icon. Matching colored tabs in two overlapping browser windows communicate one connected workspace across windows.

All three product screenshots show the real extension, are exported as 1280×800 JPEG files, and contain no alpha channel.

The two promotional PNG files use bundled Manrope typography, have exact Chrome Web Store dimensions, and contain no alpha channel. Rebuild them with `pnpm assets:store`.
