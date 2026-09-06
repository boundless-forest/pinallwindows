# Privacy Policy (ztab)

ztab, previously named TabSpan, runs entirely on your device.

## Data collection

- ztab does not collect, transmit, or sell personal data.
- ztab does not send browsing data to external servers or use analytics.
- The websites you open retain their own privacy policies.

## Local data storage

- ztab stores the pinned-site origin list, synchronization metadata, and the **Show pinned tabs** preference in `chrome.storage.local`.
- This data stays in your local Chrome profile and supports pinned tabs across windows on the same computer.
- Existing local storage is retained when the same installed extension is updated from TabSpan to ztab.
- Tab titles and full browsing URLs are processed locally to show and manage tabs; ztab does not upload or persist them.

## Permissions

| Permission | Purpose |
| --- | --- |
| `tabs` | Display open tabs; focus, move, or close tabs when requested; and read, create, or remove pinned tabs during synchronization. |
| `windows` | Enumerate and focus normal Chrome windows, move tabs between them, and apply the shared pinned set to eligible windows. |
| `storage` | Persist the pinned-site origin set, synchronization metadata, and panel preference locally. |
| `sidePanel` | Show the cross-window tab manager inside Chrome's side panel. |
| `tabGroups` | Preserve existing tab groups and their names, colors, and collapsed state when merging windows. |

## Diagnostics

Recent synchronization diagnostics are kept in memory. Selecting **Copy diagnostics** in the options page copies them to your clipboard. They can include window and tab IDs, site origins, and window geometry, but not tab titles or full browsing URLs. Nothing is sent automatically; you choose whether to share the copied diagnostics in a support request.

## Contact

For questions, open an issue in the [project repository](https://github.com/boundless-forest/ztab/issues).
