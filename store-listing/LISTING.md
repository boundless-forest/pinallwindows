# PinAllWindows store listing

This document contains the English copy to paste into the Chrome Web Store Developer Dashboard. The copy leads with the user outcome instead of implementation details.

## Product name

PinAllWindows

## Summary

Keep pinned apps consistent across Chrome windows and navigate every tab from one side panel.

Character count: 93 of 132.

## Category

Productivity

## Detailed description

Your pinned workspace should follow you—not multiply every time you open a Chrome window.

PinAllWindows keeps one consistent set of pinned apps across your normal Chrome windows. Pin a site once and it appears in every eligible window. Unpin it once and it is removed everywhere.

ONE PINNED WORKSPACE

• Keep the same pinned apps in every normal Chrome window  
• Treat pages from the same site as one pinned app  
• Remove duplicate pinned tabs automatically  
• Avoid syncing into picture-in-picture and other ambiguous compact windows  

ALL YOUR TABS, ONE SIDE PANEL

• Open the tab tree from the toolbar or with Alt+Shift+P  
• Jump to a tab in any window with a double-click  
• Move or close regular tabs without hunting through windows  
• See updates automatically as tabs and windows change  

LOCAL BY DESIGN

PinAllWindows requires no account and uses no external server. It stores only the pinned site origins needed for synchronization in Chrome's local extension storage. Your tab titles and full browsing URLs are not uploaded anywhere.

GOOD TO KNOW

Pinned apps are identified by site origin, so different pages on the same site count as one app. To remove an app everywhere, unpin it; simply closing one pinned copy does not change the shared pinned set.

## Release notes — 0.7.1

PinAllWindows 0.7.1 refreshes the extension's visual identity without changing its permissions or core behavior:

• Introduces a clearer icon showing matching colored pinned tabs across two browser windows
• Improves Chrome Web Store promotional artwork with sharper typography and a simpler message
• Adds a reproducible asset-generation command for consistent extension icons and store images
• Retains the safer pinned-tab synchronization introduced in version 0.7.0

## Permission justifications

### tabs

Reads pinned-tab state and site origins, creates missing pinned tabs, removes duplicates, and powers tab-tree navigation. No tab data is sent to an external server.

### windows

Finds normal Chrome windows so the same pinned workspace can be applied to each eligible window and tabs can be focused or moved between them.

### storage

Stores the canonical pinned-site origin list and migration metadata locally in Chrome.

### sidePanel

Displays the cross-window tab tree when the toolbar button or keyboard shortcut is used.

## Privacy fields

- Single purpose: Keep pinned apps consistent across eligible Chrome windows and provide a cross-window tab navigator.
- Personally identifiable information: Not collected.
- Authentication information: Not collected.
- Personal communications: Not collected.
- Location: Not collected.
- Web history: Tab URLs are processed locally only to identify pinned site origins and display the tab tree; they are not transmitted or sold.
- Website content: Not collected or transmitted.
- Remote code: Not used.

Review these declarations against the current Developer Dashboard wording before submission; the dashboard categories may change.
