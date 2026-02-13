// PinAcross (MV3)
// Union-mode pinned tab sync across all windows in the same Chrome profile.
//
// Canonical set = all URLs that are currently pinned anywhere.
// - Pin a tab: URL added to set; tab should appear pinned in all windows.
// - Unpin a tab: URL removed from set; pinned instances removed everywhere.
//
// Notes:
// - We only sync http(s) URLs by default.
// - chrome:// and extension pages are ignored.

const STORAGE_KEY = "pinacross.pinnedUrls";

// Debounce reconcile to avoid event storms.
let reconcileTimer = null;
let reconcileInFlight = false;

function isSyncableUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  // Minimal normalization to reduce accidental duplicates.
  // Keep origin + pathname + search; drop hash.
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

async function getPinnedSet() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const arr = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
  return new Set(arr);
}

async function setPinnedSet(set) {
  await chrome.storage.local.set({ [STORAGE_KEY]: Array.from(set) });
}

async function computePinnedSetFromBrowser() {
  const tabs = await chrome.tabs.query({ pinned: true });
  const set = new Set();
  for (const t of tabs) {
    if (isSyncableUrl(t.url)) set.add(normalizeUrl(t.url));
  }
  return set;
}

async function ensurePinnedTabsInWindow(windowId, pinnedSet) {
  const tabs = await chrome.tabs.query({ windowId });
  const pinnedTabs = tabs.filter((t) => t.pinned);

  const existingPinnedByUrl = new Map();
  for (const t of pinnedTabs) {
    if (!isSyncableUrl(t.url)) continue;
    const u = normalizeUrl(t.url);
    if (!existingPinnedByUrl.has(u)) existingPinnedByUrl.set(u, []);
    existingPinnedByUrl.get(u).push(t);
  }

  // 1) Create missing pinned tabs in this window.
  // We create them at index 0 in a stable order.
  // Stable order: sorted URLs. (Simple + deterministic)
  const desired = Array.from(pinnedSet).sort();

  for (let i = 0; i < desired.length; i++) {
    const url = desired[i];
    const list = existingPinnedByUrl.get(url);
    if (list && list.length > 0) continue;

    try {
      await chrome.tabs.create({
        windowId,
        url,
        pinned: true,
        active: false,
        index: i
      });
    } catch (e) {
      // Ignore per-window creation failures.
      console.warn("PinAcross: failed to create pinned tab", { windowId, url, e });
    }
  }

  // 2) Remove pinned tabs that are not in the canonical set.
  // Also remove duplicates (keep one).
  const toRemove = [];
  const keepCount = new Map();

  for (const t of pinnedTabs) {
    if (!isSyncableUrl(t.url)) continue;
    const url = normalizeUrl(t.url);

    if (!pinnedSet.has(url)) {
      toRemove.push(t.id);
      continue;
    }

    const c = keepCount.get(url) || 0;
    if (c >= 1) {
      // Duplicate
      toRemove.push(t.id);
    } else {
      keepCount.set(url, 1);
    }
  }

  if (toRemove.length > 0) {
    try {
      await chrome.tabs.remove(toRemove);
    } catch (e) {
      console.warn("PinAcross: failed to remove tabs", { toRemove, e });
    }
  }
}

async function reconcileAllWindows() {
  if (reconcileInFlight) return;
  reconcileInFlight = true;
  try {
    // Canonical pinned set should reflect reality + storage.
    // In union mode, reality is source of truth; we recompute it.
    const pinnedSet = await computePinnedSetFromBrowser();
    await setPinnedSet(pinnedSet);

    const wins = await chrome.windows.getAll({ populate: false });
    for (const w of wins) {
      if (!w.id) continue;
      await ensurePinnedTabsInWindow(w.id, pinnedSet);
    }
  } finally {
    reconcileInFlight = false;
  }
}

function scheduleReconcile(delayMs = 400) {
  if (reconcileTimer) clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    reconcileAllWindows().catch((e) => console.error("PinAcross: reconcile error", e));
  }, delayMs);
}

// Event hooks
chrome.runtime.onInstalled.addListener(() => {
  scheduleReconcile(0);
});

chrome.runtime.onStartup.addListener(() => {
  scheduleReconcile(0);
});

chrome.windows.onCreated.addListener(() => {
  scheduleReconcile(300);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Pin/unpin changes show up here.
  if (typeof changeInfo.pinned === "boolean") {
    scheduleReconcile(200);
    return;
  }

  // URL changes can matter if a pinned tab navigates.
  if (typeof changeInfo.url === "string" && tab && tab.pinned) {
    scheduleReconcile(400);
  }
});

chrome.tabs.onRemoved.addListener(() => {
  // If a pinned tab is closed, union set may shrink.
  scheduleReconcile(500);
});

chrome.tabs.onCreated.addListener((tab) => {
  // Some flows create pinned tabs directly.
  if (tab && tab.pinned) scheduleReconcile(300);
});

// Manual trigger from the options page.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "PINACROSS_RECONCILE") {
    reconcileAllWindows()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});
