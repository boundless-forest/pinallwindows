import { createPinnedTab, getAllNormalWindows, getTab, getWindow, queryTabsInWindow, removeTabs } from "./chrome-api.js";
import { MESSAGE_CLEAR_STORAGE, MUTATION_SUPPRESS_MS, SYNC_DELAY_DEFAULT_MS, SYNC_DELAY_FAST_MS, SYNC_DELAY_ON_PINNED_TAB_CREATED_MS, SYNC_DELAY_ON_WINDOW_CREATED_MS, UNPIN_CONFIRM_DELAY_MS } from "./constants.js";
import { computeSyncPlan } from "../shared/sync-plan.js";
import { isSyncWindow, seedUrlForCanonicalKey, tabToCanonicalEntry } from "../shared/tab-utils.js";
// Sync controller responsibilities:
// - listen to Chrome events (startup/window/tab/message)
// - keep canonical pinned app state in storage
// - fan out canonical state to every normal browser window
// - prevent event feedback loops caused by our own tab create/remove mutations
function nowMs() {
    return Date.now();
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getMessageType(msg) {
    if (!msg || typeof msg !== "object")
        return null;
    const { type } = msg;
    return typeof type === "string" ? type : null;
}
export function createSyncController(canonicalStore) {
    // Debounce timer for "sync soon" scheduling.
    let syncTimer = null;
    // Timestamp boundary while extension-caused tab mutations are ignored.
    let suppressEventsUntil = 0;
    // Single-flight guard: never run two full sync passes at once.
    let syncInFlight = false;
    // If events happen during a pass, run one follow-up pass afterwards.
    let syncPending = false;
    function suppressEvents() {
        suppressEventsUntil = nowMs() + MUTATION_SUPPRESS_MS;
    }
    function eventsSuppressed() {
        return nowMs() < suppressEventsUntil;
    }
    // Sync one window to canonical state:
    // - create missing pinned apps
    // - remove duplicates and non-canonical pinned tabs
    async function syncWindow(windowId, canonicalMap) {
        // Defensive check: window may have closed, or may be a popup/devtools window.
        const win = await getWindow(windowId);
        if (!isSyncWindow(win))
            return;
        const tabs = await queryTabsInWindow(windowId);
        const pinnedTabs = tabs.filter((tab) => tab.pinned);
        const plan = computeSyncPlan(pinnedTabs, canonicalMap);
        for (const item of plan.create) {
            try {
                suppressEvents();
                await createPinnedTab(windowId, item.url);
            }
            catch (error) {
                console.warn("PinAllWindows: failed to create pinned tab", {
                    windowId,
                    key: item.key,
                    url: item.url,
                    error
                });
            }
        }
        if (plan.removeTabIds.length === 0)
            return;
        try {
            suppressEvents();
            await removeTabs(plan.removeTabIds);
        }
        catch (error) {
            console.warn("PinAllWindows: failed to remove pinned tabs", {
                windowId,
                removeTabIds: plan.removeTabIds,
                error
            });
        }
    }
    async function runSync(reason = "unspecified") {
        // Coalesce concurrent triggers into at most one active pass + one pending pass.
        if (syncInFlight) {
            syncPending = true;
            return;
        }
        syncInFlight = true;
        try {
            const canonicalMap = await canonicalStore.ensureInitialized();
            // Popup/extension windows are excluded at API layer.
            const windows = await getAllNormalWindows();
            for (const win of windows) {
                if (typeof win.id !== "number")
                    continue;
                await syncWindow(win.id, canonicalMap);
            }
        }
        catch (error) {
            console.error("PinAllWindows: sync failed", { reason, error });
        }
        finally {
            syncInFlight = false;
            if (syncPending) {
                syncPending = false;
                // Fire-and-forget follow-up pass to absorb queued changes.
                runSync("pending");
            }
        }
    }
    // Debounced entrypoint used by event handlers.
    function scheduleSync(delayMs = SYNC_DELAY_DEFAULT_MS, reason = "scheduled") {
        if (syncTimer)
            clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncTimer = null;
            runSync(reason);
        }, delayMs);
    }
    async function clearPinnedStorage() {
        // Clear canonical state and immediately propagate "empty pinned set".
        await canonicalStore.clear();
        await runSync("clear_storage");
    }
    async function handlePinnedStateChange(tab, pinned) {
        // Ignore tab events triggered by our own create/remove operations.
        if (eventsSuppressed())
            return;
        const entry = tabToCanonicalEntry(tab);
        if (!entry)
            return;
        if (pinned) {
            // Union behavior: pin anywhere adds this app key globally.
            const canonicalMap = await canonicalStore.ensureInitialized();
            if (!canonicalMap.has(entry.key)) {
                canonicalMap.set(entry.key, seedUrlForCanonicalKey(entry.key, entry.url));
                await canonicalStore.save(canonicalMap);
            }
            scheduleSync(SYNC_DELAY_FAST_MS, "user_pin");
            return;
        }
        if (typeof tab.id !== "number")
            return;
        // Unpin events can appear during teardown (window close).
        // Wait briefly, then re-read tab state before mutating canonical storage.
        await wait(UNPIN_CONFIRM_DELAY_MS);
        const latestTab = await getTab(tab.id);
        // Tab is gone: likely teardown from closing window/tab, not explicit unpin intent.
        if (!latestTab)
            return;
        if (latestTab.pinned)
            return;
        const latestEntry = tabToCanonicalEntry(latestTab);
        if (!latestEntry)
            return;
        const canonicalMap = await canonicalStore.ensureInitialized();
        if (!canonicalMap.has(latestEntry.key))
            return;
        // Explicit unpin removes this app key globally.
        canonicalMap.delete(latestEntry.key);
        await canonicalStore.save(canonicalMap);
        scheduleSync(SYNC_DELAY_FAST_MS, "user_unpin");
    }
    function registerEventHandlers() {
        // Install/startup: force an initial sync so all windows converge.
        chrome.runtime.onInstalled.addListener(() => {
            scheduleSync(0, "installed");
        });
        chrome.runtime.onStartup.addListener(() => {
            scheduleSync(0, "startup");
        });
        chrome.windows.onCreated.addListener((win) => {
            if (!isSyncWindow(win))
                return;
            // New normal window should receive canonical pinned apps quickly.
            scheduleSync(SYNC_DELAY_ON_WINDOW_CREATED_MS, "window_created");
        });
        chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
            if (typeof changeInfo.pinned !== "boolean")
                return;
            handlePinnedStateChange(tab, changeInfo.pinned).catch((error) => {
                console.error("PinAllWindows: failed to handle pin update", { error });
            });
        });
        chrome.tabs.onCreated.addListener((tab) => {
            if (!tab.pinned || eventsSuppressed())
                return;
            // Covers cases like session restore creating pinned tabs.
            scheduleSync(SYNC_DELAY_ON_PINNED_TAB_CREATED_MS, "pinned_created");
        });
        chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
            const type = getMessageType(msg);
            if (type !== MESSAGE_CLEAR_STORAGE)
                return;
            // Async response path: return true so sendResponse stays alive.
            clearPinnedStorage()
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: String(error) }));
            return true;
        });
    }
    return {
        registerEventHandlers,
        runSync,
        scheduleSync,
        clearPinnedStorage
    };
}
