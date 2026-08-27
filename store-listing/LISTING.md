# TabSpan store listing

This document contains the English copy to paste into the Chrome Web Store Developer Dashboard. The copy positions TabSpan as a live cross-window tab manager while preserving pinned-tab synchronization as its distinctive built-in capability.

## Product name

TabSpan: Cross-Window Tab Manager

## Summary

See, find, move, and manage tabs across every Chrome window from one unified side panel.

Character count: 88 of 132.

## Category

Productivity

## Detailed description

Every tab. Across every window.

TabSpan brings every normal Chrome window into one live side panel. See where each tab belongs, jump directly to it, move regular tabs between windows, or close tabs without bringing every window forward first.

ALL WINDOWS, ONE LIVE VIEW

• See tabs from every normal Chrome window in one side panel
• Jump directly to a tab in any window
• Move regular tabs between windows without dragging across screens
• Close regular tabs without switching windows first
• Open the panel from the toolbar or with Ctrl+Shift+9 (Command+Shift+9 on Mac)
• Navigate with the Arrow keys and open the selected tab with Enter
• See updates automatically as tabs and windows change

PINNED APPS, READY EVERYWHERE

• Keep the same pinned apps in every normal Chrome window
• Pin in one window and let TabSpan add the app to the others
• Unpin once to remove the app from every eligible window
• Treat pages from the same site as one pinned app
• Remove duplicate pinned tabs automatically
• Avoid syncing into picture-in-picture and other ambiguous compact windows

LOCAL BY DESIGN

TabSpan requires no account and uses no external server. It stores only the pinned site origins needed for synchronization in Chrome's local extension storage. Your tab titles and full browsing URLs are not uploaded anywhere.

GOOD TO KNOW

Regular tabs remain in their existing windows; TabSpan gives you one place to view and manage them. Only pinned apps are synchronized across windows. Pinned apps are identified by site origin, so different pages on the same site count as one app.

## Release notes — 1.0.0

TabSpan 1.0.0 introduces a new identity centered on cross-window tab management while keeping the extension's existing behavior and permissions unchanged:

• Renames PinAllWindows to TabSpan
• Repositions the extension as a cross-window tab manager
• Updates product metadata, documentation, and store artwork for the new brand
• Preserves existing pinned-tab data and synchronization behavior

## Permission justifications

### tabs

Reads pinned-tab state and site origins, creates missing pinned tabs, removes duplicates, and powers cross-window tab navigation. No tab data is sent to an external server.

### windows

Finds normal Chrome windows so tabs can be displayed, focused, or moved across windows and the same pinned workspace can be applied to each eligible window.

### storage

Stores the canonical pinned-site origin list, the side-panel preference, and migration metadata locally in Chrome.

### sidePanel

Displays the live cross-window tab manager when the toolbar button or keyboard shortcut is used.

## Privacy fields

- Single purpose: Provide one live view for managing tabs across Chrome windows and keep pinned apps consistent across eligible windows.
- Personally identifiable information: Not collected.
- Authentication information: Not collected.
- Personal communications: Not collected.
- Location: Not collected.
- Web history: Tab URLs are processed locally only to display open tabs and identify pinned site origins; they are not transmitted or sold.
- Website content: Not collected or transmitted.
- Remote code: Not used.

Review these declarations against the current Developer Dashboard wording before submission; the dashboard categories may change.
