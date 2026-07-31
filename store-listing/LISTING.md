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

• Open the tab tree from the toolbar or with Ctrl+Shift+9 (Command+Shift+9 on Mac)
• Select tabs with the Arrow keys and open them with Enter
• Jump to a tab in any window with a double-click
• Move or close regular tabs without hunting through windows  
• See updates automatically as tabs and windows change  

LOCAL BY DESIGN

PinAllWindows requires no account and uses no external server. It stores only the pinned site origins needed for synchronization in Chrome's local extension storage. Your tab titles and full browsing URLs are not uploaded anywhere.

GOOD TO KNOW

Pinned apps are identified by site origin, so different pages on the same site count as one app. To remove an app everywhere, unpin it; simply closing one pinned copy does not change the shared pinned set.

## Release notes — 0.8.0

PinAllWindows 0.8.0 makes the side panel faster to navigate and easier to read without changing its permissions:

• Adds Up/Down Arrow selection and Enter-to-open keyboard navigation
• Changes the default panel shortcut to Ctrl+Shift+9, or Command+Shift+9 on Mac, and shows the assigned shortcut in the panel
• Moves tab and window counts to the footer so keyboard guidance stays visible at the top
• Introduces a clearer natural color system for active tabs, selection, window groups, and tab actions
• Keeps Move and Close visible on every regular tab while reducing repetitive status labels

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
