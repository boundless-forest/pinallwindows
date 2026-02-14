// PinAcross (MV3)
//
// Goal
// - Keep all open Chrome windows in the same profile with the same *set* of pinned tabs.
// - Tab order/position is not important; we do not reorder existing pinned tabs.
//
// Canonical model
// - We maintain a canonical set of pinned URLs in chrome.storage.local.
// - Pinning a tab adds its URL to the canonical set.
// - Unpinning a tab removes its URL from the canonical set.
// - Reconcile makes each window match the canonical set.
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
  computePinnedWindowPlan
} from "./core.js";

const STORAGE_KEY = "pinacross.pinnedUrls";

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

async function getCanonicalSet() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const arr = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
  return new Set(arr);
}

async function setCanonicalSet(set) {
  await chrome.storage.local.set({ [STORAGE_KEY]: Array.from(set) });
}

async function ensureCanonicalInitialized() {
  // If canonical set is empty, initialize it from currently pinned tabs.
  // This makes "first install" behave intuitively: existing pinned tabs become the baseline.
  const set = await getCanonicalSet();
  if (set.size > 0) return set;

  const pinned = await chrome.tabs.query({ pinned: true });
  for (const t of pinned) {
    const url = normalizeUrl(getTabUrl(t));
    if (isSyncableUrl(url)) set.add(url);
  }
  await setCanonicalSet(set);
  return set;
}

async function reconcileWindow(windowId, canonicalSet) {
  const tabs = await chrome.tabs.query({ windowId });
  const pinnedTabs = tabs.filter((t) => t.pinned);

  const plan = computePinnedWindowPlan(pinnedTabs, canonicalSet);

  // Create missing pinned tabs.
  // We create at the end of the pinned region by using index equal to current pinned count.
  // This keeps user-chosen order intact and avoids fighting user rearrangements.
  for (const url of plan.createMissingUrls) {
    try {
      suppressEvents();
      await chrome.tabs.create({
        windowId,
        url,
        pinned: true,
        active: false
      });
    } catch (e) {
      console.warn("PinAcross: failed to create pinned tab", { windowId, url, e });
    }
  }

  // Remove extra pinned tabs not in canonical set (and duplicates).
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
    const canonicalSet = await ensureCanonicalInitialized();

    const wins = await chrome.windows.getAll({ populate: false });
    for (const w of wins) {
      if (!w.id) continue;
      await reconcileWindow(w.id, canonicalSet);
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

  const url = normalizeUrl(getTabUrl(tab));
  if (!isSyncableUrl(url)) return;

  const canonical = await ensureCanonicalInitialized();

  if (pinned) {
    canonical.add(url);
  } else {
    canonical.delete(url);
  }

  await setCanonicalSet(canonical);
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
    // tab in this callback should contain the latest pinned state.
    onTabPinnedChanged(tab, changeInfo.pinned).catch((e) =>
      console.error("PinAcross: onTabPinnedChanged error", e)
    );
    return;
  }

  // If a pinned tab navigates, we might need to recognize it earlier via pendingUrl.
  // We don't treat navigation as a canonical change, but a reconcile can help dedupe.
  if (typeof changeInfo.url === "string" && tab?.pinned) {
    if (!eventsSuppressed()) scheduleReconcile(500, "pinned_url_changed");
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
