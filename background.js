// PinAllWindows (MV3)
//
// Goal
// - Keep all open Chrome windows in the same profile with the same set of pinned *apps*.
// - An "app" is identified by origin (scheme + host [+port]).
// - Tab order/position is not important; we do not reorder existing pinned tabs.
//
// Canonical model
// - We maintain a canonical mapping in chrome.storage.local: key -> url.
// - key is `origin:<origin>`.
// - url is the initial URL used when creating the pinned app tab in new windows.
//
// Keep-existing policy
// - Navigating a pinned tab within an app does not change canonical state.
// - If the user pins multiple tabs for the same app, we keep one and remove duplicates.
// - To switch the pinned target for an app, unpin the existing pinned tab first,
//   then pin the new one.
//
// Why this avoids the "tab keeps spawning" bug
// - Tab objects often have url="" while navigation is in-flight, but pendingUrl is set.
// - If we ignore pendingUrl, we may not recognize the tab we just created and we would
//   create another one on the next reconcile (event loop).
// - We therefore treat (url || pendingUrl) as the tab URL.

import {
  getTabUrl,
  isSyncableUrl,
  normalizeUrl,
  canonicalKeyForUrl,
  computePinnedWindowPlan
} from "./core.js";

// Storage key migration
// - Old builds used: pinacross.canonical
// - New builds use: pinallwindows.canonical
// We migrate forward so existing testers don't lose their canonical pinned-app set.
const STORAGE_KEY = "pinallwindows.canonical";
const STORAGE_KEY_OLD = "pinacross.canonical";

// Debounce reconcile to avoid event storms.
let reconcileTimer = null;
let reconcileInFlight = false;

// When we create/remove tabs during reconcile, Chrome will fire events.
// We ignore events for a short window to prevent feedback loops.
const MUTATION_SUPPRESS_MS = 1500;
let suppressEventsUntil = 0;

function nowMs() {
  return Date.now();
}

function eventsSuppressed() {
  return nowMs() < suppressEventsUntil;
}

function suppressEvents() {
  suppressEventsUntil = nowMs() + MUTATION_SUPPRESS_MS;
}

function mapFromRecord(obj) {
  const m = new Map();
  if (!obj || typeof obj !== "object") return m;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") m.set(k, v);
  }
  return m;
}

function recordFromMap(map) {
  const obj = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  return obj;
}

async function getCanonicalMap() {
  const res = await chrome.storage.local.get([STORAGE_KEY, STORAGE_KEY_OLD]);

  const current = mapFromRecord(res[STORAGE_KEY]);
  if (current.size > 0) return current;

  // Migration path: if the new key is empty but the old key exists, copy it forward.
  const legacy = mapFromRecord(res[STORAGE_KEY_OLD]);
  if (legacy.size > 0) {
    await setCanonicalMap(legacy);
    return legacy;
  }

  return current;
}

async function setCanonicalMap(map) {
  await chrome.storage.local.set({ [STORAGE_KEY]: recordFromMap(map) });
}

async function ensureCanonicalInitialized() {
  // If canonical map is empty, initialize it from currently pinned tabs.
  // This makes "first install" behave intuitively: existing pinned apps become the baseline.
  const map = await getCanonicalMap();
  if (map.size > 0) return map;

  const pinned = await chrome.tabs.query({ pinned: true });
  for (const t of pinned) {
    const raw = getTabUrl(t);
    if (!isSyncableUrl(raw)) continue;

    const url = normalizeUrl(raw);
    const key = canonicalKeyForUrl(url);

    // Keep the first seen URL as the "seed" for new-window creation.
    if (!map.has(key)) map.set(key, url);
  }

  await setCanonicalMap(map);
  return map;
}

async function reconcileWindow(windowId, canonicalMap) {
  const tabs = await chrome.tabs.query({ windowId });
  const pinnedTabs = tabs.filter((t) => t.pinned);

  const plan = computePinnedWindowPlan(pinnedTabs, canonicalMap);

  // Create missing pinned app tabs.
  for (const item of plan.create) {
    try {
      suppressEvents();
      await chrome.tabs.create({
        windowId,
        url: item.url,
        pinned: true,
        active: false
      });
    } catch (e) {
      console.warn("PinAllWindows: failed to create pinned tab", {
        windowId,
        key: item.key,
        url: item.url,
        e
      });
    }
  }

  // Keep-existing policy: we do not navigate/update tabs.

  // Remove pinned tabs not in canonical set (and duplicates).
  if (plan.removeTabIds.length > 0) {
    try {
      suppressEvents();
      await chrome.tabs.remove(plan.removeTabIds);
    } catch (e) {
      console.warn("PinAllWindows: failed to remove pinned tabs", {
        windowId,
        remove: plan.removeTabIds,
        e
      });
    }
  }
}

async function reconcileAllWindows(reason = "unspecified") {
  if (reconcileInFlight) return;
  reconcileInFlight = true;
  try {
    const canonicalMap = await ensureCanonicalInitialized();

    const wins = await chrome.windows.getAll({ populate: false });
    for (const w of wins) {
      if (!w.id) continue;
      await reconcileWindow(w.id, canonicalMap);
    }
  } catch (e) {
    console.error("PinAllWindows: reconcile error", { reason, e });
  } finally {
    reconcileInFlight = false;
  }
}

function scheduleReconcile(delayMs = 400, reason = "scheduled") {
  if (reconcileTimer) clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    reconcileAllWindows(reason);
  }, delayMs);
}

async function onTabPinnedChanged(tab, pinned) {
  // Update canonical mapping based on a user pin/unpin action.
  // If we are in the middle of reconcile mutations, ignore.
  if (eventsSuppressed()) return;

  const raw = getTabUrl(tab);
  if (!isSyncableUrl(raw)) return;

  const url = normalizeUrl(raw);
  const key = canonicalKeyForUrl(url);

  const canonical = await ensureCanonicalInitialized();

  if (pinned) {
    // Add the app if missing.
    // Keep-existing policy: do not overwrite existing seed URL.
    if (!canonical.has(key)) canonical.set(key, url);
  } else {
    // Unpin removes that app globally.
    canonical.delete(key);
  }

  await setCanonicalMap(canonical);
  scheduleReconcile(150, pinned ? "user_pin" : "user_unpin");
}

// Event hooks
chrome.runtime.onInstalled.addListener(() => {
  scheduleReconcile(0, "installed");
});

chrome.runtime.onStartup.addListener(() => {
  scheduleReconcile(0, "startup");
});

chrome.windows.onCreated.addListener(() => {
  scheduleReconcile(200, "window_created");
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (typeof changeInfo.pinned === "boolean") {
    onTabPinnedChanged(tab, changeInfo.pinned).catch((e) =>
      console.error("PinAllWindows: onTabPinnedChanged error", e)
    );
  }
  // Keep-existing: ignore URL changes.
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab?.pinned && !eventsSuppressed()) scheduleReconcile(300, "pinned_created");
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && (msg.type === "PINALLWINDOWS_RECONCILE" || msg.type === "PINACROSS_RECONCILE")) {
    reconcileAllWindows("manual").then(() => sendResponse({ ok: true }));
    return true;
  }
});
