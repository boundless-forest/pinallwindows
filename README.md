# TabSpan

**Every tab. Across every window.**

[Install TabSpan from the Chrome Web Store](https://chromewebstore.google.com/detail/fakbifeeblnopdhicpmhhmcdhmefphjp)

Chrome spreads tabs across separate windows, making it difficult to see where everything is or move a tab without interrupting your work. TabSpan brings every normal Chrome window into one live side panel.

See which tabs belong to each window, jump directly to any tab, move regular tabs between windows, and close tabs without bringing each window forward first. TabSpan also keeps one consistent set of pinned apps across your windows, so essential sites stay ready wherever you work.

## Every window in one side panel

Click the TabSpan toolbar icon to open a live tree of tabs from every normal Chrome window.

From the side panel, you can:

- See which tabs belong to each window.
- Jump directly to a tab in any window.
- Move regular tabs between windows.
- Close regular tabs without switching windows first.
- Hide the pinned-tabs section when you want a more compact view.
- Navigate with the Up and Down Arrow keys, then press Enter to open the selected tab.
- See updates automatically as tabs and windows change.

You can also open TabSpan with `Ctrl+Shift+9` on Windows and Linux or `Command+Shift+9` on macOS. Chrome lets you change this shortcut, and TabSpan displays the shortcut currently assigned in the side panel.

## One pinned workspace in every window

- Keep the same pinned apps across all normal Chrome windows.
- Pin or unpin from any window and let the others update automatically.
- Treat different pages from the same site as one pinned app.
- Remove duplicate pinned tabs automatically.
- Avoid modifying picture-in-picture and other ambiguous compact windows.

TabSpan is especially useful if you work with separate Chrome windows across multiple monitors but want Gmail, Calendar, Slack, ChatGPT, or other everyday web apps available in each one.

To hide pinned tabs from the side panel without changing synchronization, open the extension options and turn off **Show pinned tabs**. The preference is stored locally for the current Chrome profile.

## How to use TabSpan

### Manage tabs across windows

1. Open TabSpan from the toolbar or keyboard shortcut.
2. Find the window and tab you need in the side panel.
3. Double-click a tab to open it, or use **Move** or **Close** for a regular tab.

### Keep an app pinned everywhere

1. Open the site you want in any normal Chrome window.
2. Right-click its tab and choose **Pin**.
3. TabSpan adds that pinned app to your other normal Chrome windows.

### Remove a pinned app everywhere

Right-click the pinned tab in any window and choose **Unpin**. TabSpan removes that app from the shared pinned set and updates the other windows.

Closing a pinned tab does not remove it globally, so it may return during synchronization. Use **Unpin** when you want to remove it everywhere.

### Switch which page represents an app

TabSpan identifies a pinned app by its site origin, such as `https://mail.google.com`, rather than by its complete page URL.

To switch to another page on the same site:

1. Unpin the current tab for that site.
2. Open the page you prefer.
3. Pin the new tab.

### Resync the pinned workspace

If your pinned tabs ever become inconsistent, open the extension options and select **Resync pinned tabs**. TabSpan rebuilds the shared set from your currently pinned tabs, removes duplicates, and synchronizes your normal windows again.

## Frequently asked questions

### Does TabSpan sync between computers?

No. TabSpan manages and synchronizes tabs between Chrome windows on the same computer and in the same Chrome profile. It does not provide cross-device or cloud synchronization.

### Does it sync every open tab?

No. Regular tabs remain in their existing windows. The side panel lets you view and manage them, while only pinned apps are synchronized across windows.

### Why are different pages from one site treated as the same pinned app?

TabSpan uses each site's origin so that several Gmail messages, Google Docs, or ChatGPT conversations do not become duplicate pinned apps in every window. Each site keeps one pinned representative per window.

### Does it work with picture-in-picture windows?

TabSpan is deliberately conservative around picture-in-picture and other compact windows that Chrome may not identify reliably. Ambiguous windows are left unchanged to avoid copying pinned tabs into temporary floating windows.

### Which pages can be synchronized?

Only regular `http://` and `https://` pages are synchronized. Chrome internal pages and other special URLs are not included.

## Private and local by design

TabSpan requires no account and uses no external server.

- Your pinned-site list is stored in Chrome's local extension storage.
- Your tab titles and full browsing URLs are not uploaded.
- Your browsing data is not sold or used for advertising.

Read the full [privacy policy](PRIVACY_POLICY.md).

## Support

If something is not working as expected, open a [GitHub issue](https://github.com/boundless-forest/tabspan/issues). Include the steps that caused the problem and, when relevant, diagnostics copied from the extension options page. Diagnostics may contain window and tab IDs, site origins, and window geometry, but not tab titles or full URLs.

## License

TabSpan is open-source software released under the [MIT License](LICENSE).
