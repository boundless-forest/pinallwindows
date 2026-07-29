# Store artwork direction

## Creative concept

**One pinned workspace, in every window.**

The visual system uses three connected browser windows with the same row of pinned-app tiles. Repetition makes the product behavior understandable before the viewer reads the copy. Deep indigo conveys focus and reliability; electric blue carries the synchronization path; coral pin markers add a distinct focal point.

## Upload assets

| Asset | Size | Purpose |
| --- | ---: | --- |
| Store icon | 128×128 | Reuse `icons/icon128.png` for 0.7.0 |
| Small promo tile | 440×280 | Upload-ready in `assets/final/` |
| Marquee promo tile | 1400×560 | Upload-ready in `assets/final/`; optional placement |
| Screenshots | 1280×800 | Three upload-ready JPEG files in `assets/final/screenshots/` |

The generated promo artwork is textless at source. Product name and headline are added in HTML/CSS so every character remains crisp and editable.

The promo images communicate the product concept, but they do not replace product screenshots. Chrome's screenshot slots should show the real extension and real browser behavior.

## Screenshot sequence

Upload the screenshots in this order:

1. `screenshot-01-pin-once.jpg` — pin essential apps in one window.
2. `screenshot-02-every-window.jpg` — show the same pinned apps appearing in another window.
3. `screenshot-03-tab-actions.jpg` — show cross-window jump, move, and close actions.

The screenshots show the real extension UI with privacy-safe sample content.

## Screenshot rules

- Use 1280×800 PNG or JPEG with square corners and no transparency.
- Show actual PinAllWindows behavior; do not fabricate controls or results.
- Remove bookmarks, profile photos, notifications, account names, and personal URLs.
- Use large, short captions in a reserved outer band rather than covering relevant UI.
- Keep captions to one promise plus one supporting sentence.
- Export full bleed without extra borders or rounded outer corners.

## Source asset provenance

The textless connected-window artwork was generated with OpenAI ImageGen for this repository. Prompt:

> Create a premium textless key visual for a Chrome Web Store productivity extension named PinAllWindows. Wide advertising composition, designed to be cropped to both 1400x560 and 440x280. Show three simplified, elegant browser-window cards arranged in depth, each clearly sharing the same small row of colorful pinned-tab dots or compact app tiles along the upper-left edge. A subtle glowing path or pin-shaped visual rhythm connects the repeated pinned items across the windows, communicating “one pinned workspace across every window.” Deep navy-to-indigo full-bleed background, electric blue and violet highlights, one restrained coral accent, soft glass panels, crisp modern editorial 3D/flat hybrid, premium and trustworthy, high contrast, uncluttered. Keep the important connected-window motif centered and safe within the middle 60% of the canvas. No people. No readable text. No letters. No logos. No Google or Chrome branding. No real company icons. No watermark. No fake detailed UI, just abstract browser frames and pinned-item symbols. Avoid excessive glow, gradients that reduce contrast, tiny details, and visual clutter.
