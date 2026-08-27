# Store artwork direction

## Creative concept

**Every tab. Across every window.**

The visual system uses orderly tab lanes to connect several browser windows with one unified side-panel view. The source windows remain visually secondary, while the side panel becomes the clear destination and communicates cross-window tab management at a glance. Deep indigo conveys focus and reliability; coral, violet, teal, and blue tab markers echo the extension icon.

The redesigned icon combines two overlapping browser windows with the same coral, violet, and teal pinned tabs in each window. Repeated colors communicate that the pinned workspace stays consistent across windows without relying on a separate pin symbol. The 16 px source simplifies the window outlines and enlarges the colored tabs for Chrome's toolbar.

Promotional copy uses the bundled Manrope family. The headline is deliberately limited to two lines, with more relaxed tracking and a blue second line to keep the cross-window promise readable at both Web Store sizes. The small tile uses a dedicated, simplified background rather than cropping the marquee artwork.

## Upload assets

| Asset | Size | Purpose |
| --- | ---: | --- |
| Store icon | 128×128 | Upload-ready in `icons/` |
| Small promo tile | 440×280 | Upload-ready in `assets/final/` |
| Marquee promo tile | 1400×560 | Upload-ready in `assets/final/`; optional placement |
| Screenshots | 1280×800 | Capture manually before the next Web Store submission |

The generated promo artwork is textless at source. Product name and headline are composed by the SVG renderer in `scripts/render-store-assets.mjs` so every character remains crisp and reproducible.

Run `pnpm assets:store` to rebuild the four extension icons and both promotional tiles. The renderer embeds the checked-in fonts and removes the alpha channel from Web Store promotional PNG files.

The promo images communicate the product concept, but they do not replace product screenshots. Chrome's screenshot slots should show the real extension and real browser behavior.

## Planned screenshot sequence

Fresh product screenshots are intentionally not checked in yet. Capture and review them manually before the next Chrome Web Store submission, then place the approved files in `assets/final/screenshots/` using the names below.

Upload the screenshots in this order:

1. `screenshot-03-tab-actions.jpg` — lead with cross-window jump, move, and close actions.
2. `screenshot-01-pin-once.jpg` — introduce pinned-app synchronization in one window.
3. `screenshot-02-every-window.jpg` — show the same pinned apps appearing in another window.

The screenshots must show the current extension UI with privacy-safe sample content.

## Screenshot rules

- Use 1280×800 PNG or JPEG with square corners and no transparency.
- Show actual TabSpan behavior; do not fabricate controls or results.
- Remove bookmarks, profile photos, notifications, account names, and personal URLs.
- Use large, short captions in a reserved outer band rather than covering relevant UI.
- Keep captions to one promise plus one supporting sentence.
- Export full bleed without extra borders or rounded outer corners.

## Source asset provenance

The textless Tab Flow artwork was generated with OpenAI ImageGen for this repository. The marquee prompt was:

> Deeply refine the Tab Flow direction into a premium 1400x560 Chrome Web Store marquee background. Keep three compact source browser windows stacked vertically, three orderly tab-data lanes, and one tall unified side-panel view at the far right. Reduce floating cards, use crisp and consistent geometry, and leave the left 55% completely calm for typography. Use near-black navy, deep indigo, periwinkle outlines, and restrained coral, violet, teal, and blue tab accents. Background artwork only: no text, logo, people, real browser branding, readable UI, map pins, watermark, clutter, crossing lanes, or bright objects in the copy zone.

The final marquee placement refinement was:

> Uniformly scale the three source windows, three connecting tab lanes, and unified right-side panel down by approximately 12%, then move the entire grouped system to the right so no visible object begins before 58% of the canvas width. Preserve the exact background, illustration style, colors, geometry, hierarchy, lane paths, shadows, and sharpness. Keep generous right padding and do not crop or distort the side panel. Add no text, logo, new objects, glow, map pins, or watermark.

The small-tile prompt was:

> Create a compact 440x280 companion to the Tab Flow direction. Show two abstract browser windows in the lower-left and lower-center feeding two clean connection lanes into one simplified vertical side-panel card at the lower-right. Keep the top 58% calm for typography and place the complete visual story in the bottom 42%. Use fewer, larger shapes, consistent rounded geometry, deep navy and indigo surfaces, periwinkle outlines, and coral, violet, teal, and blue tab accents. Background artwork only: no text, logo, people, browser branding, readable UI, map pins, watermark, tiny cards, dense dashboards, or bright detail behind the copy zone.

Manrope is distributed under the SIL Open Font License 1.1. The font license is preserved alongside the checked-in font files.
