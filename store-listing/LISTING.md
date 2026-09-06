# ztab store listing

Prepared English copy for the existing Chrome Web Store item. The three product pillars are cross-window tab management, shared pinned tabs, and keyboard shortcuts with thoughtful interactions. This document does not indicate that the listing has been submitted or published.

## Product name

ztab: Tab Manager

## Positioning

Another excellent tab manager for Chrome.

## Summary

Manage tabs across Chrome windows, keep pinned tabs in sync, and move faster with keyboard shortcuts.

Character count: 101 of 132.

## Category

Productivity

## Detailed description

Another excellent tab manager for Chrome.

ztab brings your Chrome windows together in one live side panel. Manage tabs across windows, keep your essential apps pinned in each one, and navigate comfortably with keys and clicks.

MANAGE TABS ACROSS WINDOWS

• See tabs grouped by their Chrome window in one side panel
• Jump directly to a tab in any normal window
• Move or close regular tabs without bringing each window forward
• Use Merge here to bring another window into the current one
• Keep tab order, groups, and pinned state when merging
• See updates automatically as tabs and windows change

KEEP PINNED TABS ACROSS WINDOWS

• Pin an app in one window and let ztab add it to the others
• Unpin once to remove the app from the shared pinned set
• Keep one pinned app per site in each eligible window
• Remove duplicate pinned copies automatically
• Hide pinned tabs in the panel while synchronization continues
• Leave picture-in-picture and ambiguous compact windows unchanged

SHORTCUTS AND THOUGHTFUL INTERACTIONS

• Open the panel with Ctrl+Shift+9, or Command+Shift+9 on Mac
• Click the shortcut hint or Customize shortcut in settings to change the opening shortcut
• See the currently assigned shortcut and navigation hints in the panel
• Select a tab with the Up and Down Arrow keys, then press Enter to open it
• Move between controls with Tab and Shift+Tab
• Double-click a row to jump to that tab
• Find Move, Close, and Merge here beside the tabs and windows they affect

LOCAL BY DESIGN

ztab requires no account and uses no external server. Pinned site origins, synchronization metadata, and the panel preference stay in Chrome's local extension storage. Your tab titles and full browsing URLs are not uploaded anywhere.

GOOD TO KNOW

ztab works between windows on the same computer and in the same Chrome profile. Regular tabs stay in their windows until you move or merge them. Only pinned apps are synchronized automatically; different pages on one site count as one pinned app. Existing pins keep their current page, while newly created pinned copies open the site's root URL. Use Unpin to remove a pinned app everywhere, because closing a pinned copy may cause it to return during synchronization.

Merge here works between eligible normal windows in the same browsing mode. Chrome closes a source window when its last tab moves. Shared pinned copies are deduplicated; identical regular tabs stay open. There is no merge undo action.

## Release notes — 1.1.0

ztab is the new name for TabSpan, with a focus on three everyday capabilities: managing tabs across windows, keeping pinned apps ready across windows, and moving comfortably with shortcuts and clear interactions.

• Introduces the ztab name, positioning, and store artwork
• Includes Merge here to combine another window with the current one while preserving tab order, groups, and pinned state
• Keeps existing pinned-site data and panel preferences when the installed extension updates
• Adds direct access to settings and shortcut customization, with keyboard help in the panel and options page

## Permission justifications

### tabs

Reads open tabs and pinned state, displays the live tab list, focuses tabs, moves or closes tabs on request, creates missing pinned tabs, and removes duplicate pinned copies. No tab data is sent to an external server.

### windows

Finds normal Chrome windows so tabs can be displayed, focused, moved, or merged and the shared pinned set can be applied to each eligible window.

### storage

Stores the canonical pinned-site origin list, synchronization metadata, and panel preference locally in Chrome.

### sidePanel

Displays the cross-window tab manager when the toolbar button or opening shortcut is used.

### tabGroups

Reads and restores existing tab groups, including their names, colors, and collapsed state, when Merge here moves tabs to another window.

## Privacy fields

- Single purpose: Manage tabs across Chrome windows through one live side panel, with shared pinned tabs and keyboard navigation.
- Personally identifiable information: Not collected.
- Authentication information: Not collected.
- Personal communications: Not collected.
- Location: Not collected.
- Web history: Tab URLs are processed locally to display and manage open tabs and identify pinned site origins; they are not transmitted or sold.
- Website content: Not collected or transmitted.
- Remote code: Not used.

Review these declarations against the current Developer Dashboard wording before submission; the dashboard categories may change.
