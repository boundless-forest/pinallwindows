// PinAcross (MV3)
//
// Goal
// - Keep all open Chrome windows in the same profile with the same *set* of pinned items.
// - Tab order/position is not important; we do not reorder existing pinned tabs.
//
// Canonical model
// - We maintain a canonical mapping in chrome.storage.local: key -> url.
// - Pinning/unpinning updates the canonical mapping.
// - Reconcile makes each window match the canonical mapping.
//
// Site-specific rule (keep it simple)
// - Gemini (gemini.google.com) is origin-level:
//   - There can be at most one Gemini pinned tab per window.
//   - When the user pins a new Gemini page, we *replace* the canonical Gemini URL.
//     This causes the pinned Gemini tab in every window to navigate to the new page.
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
  isGeminiUrl,
  computePinnedWindowPlan
} from "./core.js";

const STORAGE_KEY = "pinacross.canonical";

// Debounce reconcile to avoid event storms.
let reconcileTimer = null;
let reconcileInFlight = false;

// When we create/remove/update tabs during reconcile, Chrome will fire events.
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
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return mapFromRecord(res[STORAGE_KEY]);
}

async function setCanonicalMap(map) {
  await chrome.storage.local.set({ [STORAGE_KEY]: recordFromMap(map) });
}

async function ensureCanonicalInitialized() {
  // If canonical map is empty, initialize it from currently pinned tabs.
  // This makes "first install" behave intuitively: existing pinned tabs become the baseline.
  const map = await getCanonicalMap();
  if (map.size > 0) return map;

  const pinned = await chrome.tabs.query({ pinned: true });
  for (const t of pinned) {
    const raw = getTabUrl(t);
    if (!isSyncableUrl(raw)) continue;

    const url = normalizeUrl(raw);
    const key = canonicalKeyForUrl(url);

    // For Gemini origin keys, keep the first seen as baseline.
    if (!map.has(key)) map.set(key, url);
  }

  await setCanonicalMap(map);
  return map;
}

async function reconcileWindow(windowId, canonicalMap) {
  const tabs = await chrome.tabs.query({ windowId });
  const pinnedTabs = tabs.filter((t) => t.pinned);

  const plan = computePinnedWindowPlan(pinnedTabs, canonicalMap);

  // Create missing pinned tabs.
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
      console.warn("PinAcross: failed to create pinned tab", {
        windowId,
        key: item.key,
        url: item.url,
        e
      });
    }
  }

  // Update pinned tabs (navigate) when canonical URL differs.
  for (const u of plan.update) {
    try {
      suppressEvents();
      await chrome.tabs.update(u.tabId, { url: u.url, active: false });
    } catch (e) {
      console.warn("PinAcross: failed to update pinned tab", { windowId, ...u, e });
    }
  }

  // Remove pinned tabs not in canonical set (and duplicates).
  if (plan.removeTabIds.length > 0) {
    try {
      suppressEvents();
      await chrome.tabs.remove(plan.removeTabIds);
    } catch (e) {
      console.warn("PinAcross: failed to remove pinned tabs", {
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
    console.error("PinAcross: reconcile error", { reason, e });
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
  // Update canonical set based on a user pin/unpin action.
  // If we are in the middle of reconcile mutations, ignore.
  if (eventsSuppressed()) return;

  const raw = getTabUrl(tab);
  if (!isSyncableUrl(raw)) return;

  const url = normalizeUrl(raw);
  const key = canonicalKeyForUrl(url);

  const canonical = await ensureCanonicalInitialized();

  if (pinned) {
    // "Replace with newest" behavior for Gemini origin-level key.
    // For normal keys, this is simply add/overwrite.
    canonical.set(key, url);
  } else {
    // Unpin removes that pinned item globally.
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
  // New windows should be brought into sync quickly.
  scheduleReconcile(200, "window_created");
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // Pin/unpin events.
  if (typeof changeInfo.pinned === "boolean") {
    onTabPinnedChanged(tab, changeInfo.pinned).catch((e) =>
      console.error("PinAcross: onTabPinnedChanged error", e)
    );
    return;
  }

  // If a pinned tab navigates and it is a Gemini tab, treat that as a "replace" event.
  // This makes Gemini switching feel natural: navigating the pinned Gemini tab to a new
  // session and re-pinning is not required; a pin event is still the primary driver.
  // We keep it conservative: only schedule a reconcile to dedupe if needed.
  if (typeof changeInfo.url === "string" && tab?.pinned) {
    const url = normalizeUrl(getTabUrl(tab));
    if (isGeminiUrl(url) && !eventsSuppressed()) {
      // Optional: we could auto-update canonical on navigation, but that would be surprising.
      // For simplicity, do not change canonical here. Just reconcile to keep windows clean.
      scheduleReconcile(600, "pinned_gemini_navigated");
    }
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  // If some flow creates a pinned tab directly, reconcile.
  if (tab?.pinned && !eventsSuppressed()) scheduleReconcile(300, "pinned_created");
});

// Manual trigger from the options page.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "PINACROSS_RECONCILE") {
    reconcileAllWindows("manual").then(() => sendResponse({ ok: true }));
    return true;
  }
});
