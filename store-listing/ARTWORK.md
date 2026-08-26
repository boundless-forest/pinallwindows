# Store artwork direction

## Creative concept

**Every tab. Across every window.**

The visual system uses three connected browser windows to communicate one live view across a multi-window Chrome workspace. Repeated pinned-app tiles preserve the extension's distinctive synchronization capability without making it the entire product story. Deep indigo conveys focus and reliability; electric blue carries the connection across windows; coral adds a distinct focal point.

The redesigned icon combines two overlapping browser windows with the same coral, violet, and teal pinned tabs in each window. Repeated colors communicate that the pinned workspace stays consistent across windows without relying on a separate pin symbol. The 16 px source simplifies the window outlines and enlarges the colored tabs for Chrome's toolbar.

Promotional copy uses the bundled Manrope family. The headline is deliberately limited to two lines, with more relaxed tracking and a blue second line to keep the cross-window promise readable at both Web Store sizes.

## Upload assets

| Asset | Size | Purpose |
| --- | ---: | --- |
| Store icon | 128×128 | Upload-ready in `icons/` |
| Small promo tile | 440×280 | Upload-ready in `assets/final/` |
| Marquee promo tile | 1400×560 | Upload-ready in `assets/final/`; optional placement |
| Screenshots | 1280×800 | Three upload-ready JPEG files in `assets/final/screenshots/` |

The generated promo artwork is textless at source. Product name and headline are composed from editable SVG and HTML/CSS sources so every character remains crisp and reproducible.

Run `pnpm assets:store` to rebuild the four extension icons and both promotional tiles. The renderer embeds the checked-in fonts and removes the alpha channel from Web Store promotional PNG files.

The promo images communicate the product concept, but they do not replace product screenshots. Chrome's screenshot slots should show the real extension and real browser behavior.

## Screenshot sequence

Upload the screenshots in this order:

1. `screenshot-03-tab-actions.jpg` — lead with cross-window jump, move, and close actions.
2. `screenshot-01-pin-once.jpg` — introduce pinned-app synchronization in one window.
3. `screenshot-02-every-window.jpg` — show the same pinned apps appearing in another window.

The screenshots show the real extension UI with privacy-safe sample content.

## Screenshot rules

- Use 1280×800 PNG or JPEG with square corners and no transparency.
- Show actual TabSpan behavior; do not fabricate controls or results.
- Remove bookmarks, profile photos, notifications, account names, and personal URLs.
- Use large, short captions in a reserved outer band rather than covering relevant UI.
- Keep captions to one promise plus one supporting sentence.
- Export full bleed without extra borders or rounded outer corners.

## Source asset provenance

The textless connected-window artwork was generated with OpenAI ImageGen for this repository. Prompt:

> Create a premium textless key visual for a Chrome Web Store productivity extension named TabSpan. Wide advertising composition, designed to be cropped to both 1400x560 and 440x280. Show three simplified, elegant browser-window cards arranged in depth, connected as one coherent multi-window workspace. Each window may share the same small row of colorful pinned-tab dots or compact app tiles along the upper-left edge. A subtle glowing path connects the windows, communicating “every tab across every window.” Deep navy-to-indigo full-bleed background, electric blue and violet highlights, one restrained coral accent, soft glass panels, crisp modern editorial 3D/flat hybrid, premium and trustworthy, high contrast, uncluttered. Keep the important connected-window motif centered and safe within the middle 60% of the canvas. No people. No readable text. No letters. No logos. No Google or Chrome branding. No real company icons. No watermark. No fake detailed UI, just abstract browser frames and tab symbols. Avoid excessive glow, gradients that reduce contrast, tiny details, and visual clutter.

Manrope is distributed under the SIL Open Font License 1.1. The font license is preserved alongside the checked-in font files.
