# ztab store artwork

## Positioning and visual direction

**Another excellent tab manager for Chrome.**

The artwork gives equal weight to ztab's three strengths: managing tabs across windows, keeping pinned tabs in sync across windows, and fast shortcuts with thoughtful interactions. The product name is always lowercase: **ztab**.

The established icon stays recognizable: two overlapping browser windows repeat the same coral, violet, and teal pinned tabs. Its dedicated 16 px source keeps the toolbar version legible. Promotional artwork uses deep indigo, restrained colored accents, and bundled Manrope typography.

The marquee pairs the positioning line with abstract browser windows and three equally sized benefit cards. The small tile keeps the same positioning with short Windows, Pins, and Shortcuts labels. These window motifs are SVG artwork, not product screenshots.

## Upload assets

| Asset | Size | Location |
| --- | ---: | --- |
| Store icon | 128×128 | `icons/icon128.png` |
| Small promo tile | 440×280 | `assets/final/promo-small-440x280.png` |
| Marquee promo tile | 1400×560 | `assets/final/promo-marquee-1400x560.png` |
| Product screenshots | 1280×800 each | `assets/final/screenshots/` |

Upload the screenshots in this order:

1. `screenshot-01-side-panel.png` — **All your tabs. One place.** Show the real side panel and its cross-window management controls.
2. `screenshot-02-pinned-tabs.png` — **Pin once. Ready in every window.** Show pinned copies from two windows in the actual side panel.
3. `screenshot-03-keyboard.png` — **Fast keys. Thoughtful details.** Show the real panel with its shortcut hints and a selected tab, alongside callouts for opening the panel, selecting with Up/Down, and switching with Enter.

## Rebuilding the artwork

Run `pnpm assets:store` to regenerate four extension icons, both promotional tiles, and all three screenshots. The renderer in `scripts/render-store-assets.mjs` embeds the checked-in fonts and exports the promotional tiles and screenshots without an alpha channel.

Keep privacy-safe, current product captures in `assets/source/screenshots/`:

- `side-panel-raw.png`
- `pinned-tabs-raw.png`
- `keyboard-raw.png`

The renderer reads each capture's actual dimensions. The first two screenshots fit the entire image into a 1224×556 product area without stretching or trimming it. Their current 1400×740 sources retain the native browser frame and page context. The keyboard screenshot crops the same native window format at `x=1030, y=84, width=370, height=656` to show the actual side panel at a more readable size, fitted within a 520×646 area. Its frame follows the crop's aspect ratio. Update that explicit crop when recapturing at different window or sidebar dimensions, keeping the native panel header, selected tab, and footer visible.

Captions and promotional artwork are rendered from code, so new captures can replace old ones without editing bitmap images. The old textless Tab Flow PNGs remain as historical source material and are no longer used by the renderer.

## Screenshot rules

- Use current, real ztab behavior. Do not fabricate controls or results.
- Keep personal URLs, account names, profile photos, bookmarks, and notifications out of the capture.
- Capture the assigned shortcut shown by Chrome; users can customize it. Up/Down and Enter operate while the tab list is focused.
- Put short captions in reserved space beside or above the product image, without covering useful UI.
- Export the final artwork at exact dimensions, with square outer corners and no transparency.
- Inspect the rendered files after every source or caption change; a successful render does not verify the product state or Store approval.

## Source provenance

The current screenshots were captured on 2026-09-06 in Chrome for Testing using an isolated persistent Playwright profile with the unpacked ztab extension, then normalized to RGB PNG. The native Chrome side panel was opened with its actual assigned shortcut, `Shift+Command+9`. The pages, tab titles, and localhost URLs are harmless sample content served locally for the capture; the extension UI and browser tab state are real. The pinned-tab capture shows Inbox and Team calendar copies from two actual browser windows in one native side panel. The keyboard capture shows the selection after actual ArrowDown navigation; its final artwork magnifies a crop of that native panel.

The active promotional window motifs, typography, and layouts are SVG composed by the repository renderer. The existing window-and-tabs icon is retained from the established visual system. Historical textless Tab Flow backgrounds were generated with OpenAI ImageGen but are not included in the current rendered assets.

Manrope is distributed under the SIL Open Font License 1.1. Its license is preserved alongside the checked-in font files in `source/fonts/`.
