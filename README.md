# ztab

**Another excellent tab manager for Chrome.**

[Get the extension from the Chrome Web Store](https://chromewebstore.google.com/detail/fakbifeeblnopdhicpmhhmcdhmefphjp)

ztab brings your Chrome windows together with three everyday capabilities:

- **Manage tabs across windows.** View, open, move, and close tabs from one live side panel, or merge another window into the current one.
- **Keep pinned tabs across windows.** Pin an app once to keep it ready in every eligible Chrome window.
- **Work comfortably with keys and clicks.** Open the panel with a shortcut, navigate with the keyboard, and use actions beside the tabs and windows they affect.

ztab is the new name for TabSpan. Version 1.1.0 is prepared in this repository; the store listing may still show the previous name until the update is published. See the [release guide](CHROME_WEB_STORE.md) for the remaining rollout steps.

## Every window in one side panel

Click the ztab toolbar icon to open a live tree of tabs from every normal Chrome window.

From the side panel, you can:

- See which tabs belong to each window.
- Jump directly to a tab in any window.
- Move regular tabs between windows.
- Merge another window into your current window with one click.
- Close regular tabs without switching windows first.
- Hide the pinned-tabs section when you want a more compact view.
- See updates automatically as tabs and windows change.

## One pinned workspace in every window

- Keep the same pinned apps across all normal Chrome windows.
- Pin or unpin from any window and let the others update automatically.
- Treat different pages from the same site as one pinned app.
- Remove duplicate pinned tabs automatically.
- Avoid modifying picture-in-picture and other ambiguous compact windows.

ztab is especially useful if you work with separate Chrome windows across multiple monitors but want Gmail, Calendar, Slack, ChatGPT, or other everyday web apps available in each one.

To hide pinned tabs from the side panel without changing synchronization, open the extension options and turn off **Show pinned tabs**. The preference is stored locally for the current Chrome profile.

## Shortcuts and thoughtful interactions

| Action | Shortcut or interaction |
| --- | --- |
| Open the side panel | `Ctrl+Shift+9` on Windows/Linux; `Command+Shift+9` on macOS |
| Select a tab in the focused list | `↑` / `↓` |
| Open the selected tab | `Enter` |
| Move focus between controls | `Tab` / `Shift+Tab` |
| Open a tab with the pointer | Double-click its row |
| Move or close a regular tab | Use **Move** or **Close** beside that tab |
| Bring another window here | Use **Merge here** beside its heading |

Click the opening shortcut in the panel or choose **Customize shortcut** in settings to open Chrome's extension shortcut settings. ztab displays the currently assigned shortcut in the panel and settings, with navigation hints beside it. A **Settings** link in the panel gives you direct access to keyboard help and preferences. The list updates as your tabs and windows change, and the pinned-tabs section can be hidden to keep the panel compact.

## How to use ztab

### Manage tabs across windows

1. Open ztab from the toolbar or keyboard shortcut.
2. Find the window and tab you need in the side panel.
3. Double-click a tab to open it, or use **Move** or **Close** for a regular tab.

Select **Merge here** beside another window's heading to bring its tabs into the window hosting the side panel. Regular tabs are appended in their original order, tab groups stay together, and your current page stays selected. Existing pinned apps are kept, shared pinned copies are deduplicated by site, and unique pinned tabs are moved with their pinned state intact.

Chrome closes the source window once its last tab has moved. Regular tabs are not deduplicated. If tabs change or a move fails, the panel refreshes and shows an error so you can retry the remaining window. There is no confirmation dialog, success notice, or undo action.

Merging is available between regular windows in the same browsing mode. Compact or floating windows are excluded. The `tabGroups` permission lets ztab move existing groups without losing their names, colors, or collapsed state.

### Keep an app pinned everywhere

1. Open the site you want in any normal Chrome window.
2. Right-click its tab and choose **Pin**.
3. ztab adds that pinned app to your other normal Chrome windows.

### Remove a pinned app everywhere

Right-click the pinned tab in any window and choose **Unpin**. ztab removes that app from the shared pinned set and updates the other windows.

Closing a pinned tab does not remove it globally, so it may return during synchronization. Use **Unpin** when you want to remove it everywhere.

### How pinned apps are identified

ztab identifies a pinned app by its site origin, such as `https://mail.google.com`, rather than by its complete page URL.

An existing pinned tab keeps its current page. When ztab creates a missing pinned copy in another window, it opens the site's root URL. It does not copy a particular message, document, or conversation URL across windows.

### Resync the pinned workspace

If your pinned tabs ever become inconsistent, open the extension options and select **Resync pinned tabs**. ztab rebuilds the shared set from your currently pinned tabs, removes duplicates, and synchronizes your normal windows again.

## Frequently asked questions

### Does ztab sync between computers?

No. ztab manages and synchronizes tabs between Chrome windows on the same computer and in the same Chrome profile. It does not provide cross-device or cloud synchronization.

### Does it sync every open tab?

No. Regular tabs remain in their existing windows. The side panel lets you view and manage them, while only pinned apps are synchronized across windows.

### Why are different pages from one site treated as the same pinned app?

ztab uses each site's origin so that several Gmail messages, Google Docs, or ChatGPT conversations do not become duplicate pinned apps in every window. Each site keeps one pinned representative per window.

### Does it work with picture-in-picture windows?

ztab is deliberately conservative around picture-in-picture and other compact windows that Chrome may not identify reliably. Ambiguous windows are left unchanged to avoid copying pinned tabs into temporary floating windows.

### Which pages can be synchronized?

Only regular `http://` and `https://` pages are synchronized. Chrome internal pages and other special URLs are not included.

## Private and local by design

ztab requires no account and uses no external server.

- Your pinned-site list, synchronization metadata, and panel preference are stored in Chrome's local extension storage.
- Your tab titles and full browsing URLs are not uploaded.
- Your browsing data is not sold or used for advertising.

Read the full [privacy policy](PRIVACY_POLICY.md).

## Support

If something is not working as expected, open a [GitHub issue](https://github.com/boundless-forest/ztab/issues). Include the steps that caused the problem and, when relevant, diagnostics copied from the extension options page. Diagnostics may contain window and tab IDs, site origins, and window geometry, but not tab titles or full URLs.

## License

ztab is open-source software released under the [MIT License](LICENSE).
