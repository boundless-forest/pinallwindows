# PinAcross — Code Understanding Notes

## Overview
PinAcross is a Chrome MV3 extension that keeps all Chrome windows in the same profile aligned on the same set of pinned items.

In the current implementation, PinAcross syncs pinned items by app (origin), not by exact URL. This matters for apps like Gemini where URLs can vary (different chat IDs), but the user intent is to pin the app rather than a specific URL.

PinAcross maintains a canonical set of pinned apps in chrome.storage.local. It reacts to pin/unpin events and periodically reconciles each window to match the canonical state by creating missing pinned tabs and removing duplicates or non-canonical pinned tabs.

## Entrypoints

### manifest.json
File: manifest.json

- Execution model: Chrome MV3 service worker.
- Background entry:
  - background.service_worker: background.js
  - background.type: module
- Capabilities (permissions):
  - tabs: query/create/remove tabs, observe pin state
  - windows: enumerate windows
  - storage: persist canonical state

### background service worker
File: background.js

This is the functional entrypoint. It registers Chrome event listeners and orchestrates all sync behavior.

### options page
Files: options.html, options.js

Provides a manual button to send a message to the service worker to force reconciliation.

## Module map

### background.js (orchestrator)
Responsibilities:
- Persist canonical pinned apps mapping in storage.
- Listen to Chrome events (install/startup/window created/tab updates).
- Reconcile every window’s pinned tabs against canonical state.
- Prevent event feedback loops via a suppression window.

Key state:
- STORAGE_KEY: pinacross.canonical
- suppressEventsUntil: timestamp to ignore self-triggered events

### core.js (pure logic)
Responsibilities:
- Extract stable URL from a tab (url or pendingUrl).
- Normalize URLs (remove hash).
- Compute canonical key for URL (origin-based).
- Compute a reconciliation plan for a window: create/remove.

### options.js (UI trigger)
Responsibilities:
- Send PINACROSS_RECONCILE message.
- Display status.

## Main flows

### Flow 1: install/startup initialization
Trigger:
- chrome.runtime.onInstalled
- chrome.runtime.onStartup

Call chain:
- scheduleReconcile(0, reason)
- reconcileAllWindows(reason)
  - ensureCanonicalInitialized()
    - load canonical from storage
    - if empty, query currently pinned tabs and seed canonical
  - windows.getAll()
  - for each window: reconcileWindow(windowId, canonical)

Outputs/side effects:
- Reads/writes chrome.storage.local.
- Creates pinned tabs in windows missing a canonical app.
- Removes pinned tabs that are not canonical or are duplicates.

### Flow 2: user pin/unpin
Trigger:
- chrome.tabs.onUpdated with changeInfo.pinned === boolean

Call chain:
- onTabPinnedChanged(tab, pinned)
  - url = normalizeUrl(getTabUrl(tab))
  - key = canonicalKeyForUrl(url)  (origin-based)
  - canonical = ensureCanonicalInitialized()
  - if pinned: add key if missing (does not overwrite)
  - if unpinned: delete key
  - setCanonicalMap(canonical)
  - scheduleReconcile(150, reason)

Outputs/side effects:
- Updates storage to add/remove a pinned app.
- Reconciles all windows to converge on canonical.

Important behavior:
- Keep-existing policy: pinning a second tab from the same origin does not replace the canonical seed URL.

### Flow 3: new window created
Trigger:
- chrome.windows.onCreated

Call chain:
- scheduleReconcile(200, window_created)
- reconcileAllWindows()

Effect:
- New windows get missing pinned apps created.

### Flow 4: manual reconcile
Trigger:
- options page sends runtime message { type: PINACROSS_RECONCILE }

Call chain:
- runtime.onMessage listener in background.js
- reconcileAllWindows(manual)

## Key functions (mock I/O)

### core.js::getTabUrl(tab)
Purpose:
- Return a usable URL during tab creation/navigation.

Signature:
- Input: tab object
- Output: string

Mock input:
- { url: "", pendingUrl: "https://gemini.google.com/u/2/gem/..." }

Mock output:
- https://gemini.google.com/u/2/gem/...

Interactions:
- Used by both canonical seeding and per-window planning.

Pitfalls:
- If pendingUrl is ignored, reconcile may not recognize a newly-created pinned tab and may create duplicates.

### core.js::canonicalKeyForUrl(url)
Purpose:
- Compute the canonical identity of a pinned app.

Signature:
- Input: url string
- Output: key string

Mock input:
- https://gemini.google.com/u/2/gem/x/aaaa

Mock output:
- origin:https://gemini.google.com

Interactions:
- Used when updating canonical storage and when grouping pinned tabs per window.

### core.js::computePinnedWindowPlan(pinnedTabs, canonicalMap)
Purpose:
- Compute what a window should create/remove to match canonical state.

Signature:
- Input:
  - pinnedTabs: list of pinned tabs
  - canonicalMap: Map<key, seedUrl>
- Output:
  - { create: [{key,url}], update: [], removeTabIds: number[] }

Mock input:
- canonicalMap:
  - origin:https://gemini.google.com -> https://gemini.google.com/u/2/gem/x/aaaa
- pinnedTabs:
  - tab 1: https://gemini.google.com/u/2/gem/x/aaaa
  - tab 2: https://gemini.google.com/u/2/gem/x/bbbb

Mock output:
- create: []
- removeTabIds: [<tab2 id>]

Interactions:
- Called by background.js::reconcileWindow.

Pitfalls:
- "keep one" is based on the first encountered pinned tab; no ordering guarantees are enforced.

### background.js::ensureCanonicalInitialized()
Purpose:
- Seed canonical mapping from existing pinned tabs on first run.

Mock behavior:
- If you already pinned GitHub and Gemini, canonical becomes:
  - origin:https://github.com -> <first pinned github url>
  - origin:https://gemini.google.com -> <first pinned gemini url>

Pitfalls:
- If multiple pinned tabs exist for the same origin at first run, only the first becomes the seed.

## What to change safely

### If you want per-site special handling
Current design uses origin for all sites. To introduce per-site rules:
- Change core.js::canonicalKeyForUrl to map certain hosts to custom keys.
- Add unit tests in tests/core.test.js.
- Keep background reconciliation logic mostly unchanged.

### If you want "replace with newest" (global or per-site)
That would require:
- Overwriting canonical seed URL on pin.
- Introducing an update/navigation step in reconcile (tab.update(url)) so existing tabs can be retargeted.
- Tests that the plan includes updates.
