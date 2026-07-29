import {
    createPinnedTab,
    getAllCandidateWindows,
    getTab,
    getWindowWithTabs,
    removeTabs
} from "./chrome-api.js";
import {
    MESSAGE_CLEAR_STORAGE,
    MESSAGE_GET_SYNC_DIAGNOSTICS,
    MESSAGE_REPAIR_PINNED_STORAGE,
    SYNC_DELAY_DEFAULT_MS,
    SYNC_DELAY_FAST_MS,
    SYNC_DELAY_ON_PINNED_TAB_CREATED_MS,
    SYNC_DELAY_ON_WINDOW_CREATED_MS,
    UNPIN_CONFIRM_DELAY_MS
} from "./constants.js";
import { AsyncTaskQueue } from "./async-task-queue.js";
import { MutationLedger } from "./mutation-ledger.js";
import { PendingIntentRegistry } from "./pending-intents.js";
import { SyncDiagnostics } from "./sync-diagnostics.js";
import {
    WINDOW_STATUS_ELIGIBLE,
    WindowEligibilityRegistry
} from "./window-eligibility.js";
import { computeSyncPlan } from "../shared/sync-plan.js";
import { seedUrlForCanonicalKey, tabToCanonicalEntry } from "../shared/tab-utils.js";

// The controller serializes user intent and reconciliation. Window
// classification, mutation attribution, and pending user intent stay separate
// so a transient Chrome event cannot directly trigger destructive tab writes.
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMessageType(msg) {
    if (!msg || typeof msg !== "object")
        return null;
    const { type } = msg;
    return typeof type === "string" ? type : null;
}

function pinnedTabsFromRecords(records) {
    return records.flatMap((record) => {
        const tabs = Array.isArray(record.window?.tabs) ? record.window.tabs : [];
        return tabs.filter((tab) => tab.pinned);
    });
}

export function createSyncController(canonicalStore, dependencies = {}) {
    const api = {
        createPinnedTab,
        getAllCandidateWindows,
        getTab,
        getWindowWithTabs,
        removeTabs,
        ...dependencies.api
    };
    const chromeEvents = dependencies.chrome || chrome;
    const waitFor = dependencies.waitFor || wait;
    const queue = dependencies.queue || new AsyncTaskQueue();
    const ledger = dependencies.ledger || new MutationLedger();
    const pendingIntents = dependencies.pendingIntents || new PendingIntentRegistry();
    const diagnostics = dependencies.diagnostics || new SyncDiagnostics();
    const windowRegistry = dependencies.windowRegistry || new WindowEligibilityRegistry({
        getWindowWithTabs: api.getWindowWithTabs,
        waitFor
    });
    const setTimer = dependencies.setTimer || setTimeout;
    const clearTimer = dependencies.clearTimer || clearTimeout;
    let syncTimer = null;

    async function collectEligibleRecords() {
        const windows = await api.getAllCandidateWindows();
        const records = await Promise.all(windows
            .filter((win) => typeof win.id === "number")
            .map((win) => {
                windowRegistry.markCandidate(win.id);
                return windowRegistry.observe(win.id);
            }));
        for (const record of records) {
            const win = record.window;
            diagnostics.record("window_classified", {
                windowId: record.windowId,
                status: record.status,
                windowType: win?.type || null,
                alwaysOnTop: win?.alwaysOnTop === true,
                width: win?.width ?? null,
                height: win?.height ?? null,
                tabCount: Array.isArray(win?.tabs) ? win.tabs.length : 0
            });
        }
        return records.filter((record) => record.status === WINDOW_STATUS_ELIGIBLE);
    }

    async function canonicalRevisionIsCurrent(revision) {
        const latest = await canonicalStore.loadSnapshot();
        return latest.initialized && latest.revision === revision;
    }

    async function getInitializedCanonicalSnapshot() {
        const snapshot = await canonicalStore.loadSnapshot();
        if (snapshot.initialized)
            return snapshot;
        const eligibleRecords = await collectEligibleRecords();
        if (eligibleRecords.length === 0)
            throw new Error("No eligible browser window is available to initialize pinned state");
        return canonicalStore.ensureInitializedSnapshot(pinnedTabsFromRecords(eligibleRecords));
    }

    async function getCurrentPlan(windowId, canonicalSnapshot) {
        if (!(await canonicalRevisionIsCurrent(canonicalSnapshot.revision)))
            return null;
        const record = await windowRegistry.revalidate(windowId);
        if (record.status !== WINDOW_STATUS_ELIGIBLE)
            return null;
        const tabs = Array.isArray(record.window?.tabs) ? record.window.tabs : [];
        const plan = computeSyncPlan(
            tabs.filter((tab) => tab.pinned),
            canonicalSnapshot.canonicalMap
        );
        return {
            plan: pendingIntents.protectPlan(windowId, plan)
        };
    }

    async function createMissingTabs(windowId, canonicalSnapshot, initialPlan) {
        for (const requested of initialPlan.create) {
            if (ledger.hasPendingCreate(windowId, requested.key))
                continue;
            const current = await getCurrentPlan(windowId, canonicalSnapshot);
            if (!current)
                return false;
            const item = current.plan.create.find((candidate) => candidate.key === requested.key);
            if (!item)
                continue;
            const operation = ledger.beginCreate(windowId, item.key);
            diagnostics.record("create_started", {
                operationId: operation.id,
                windowId,
                canonicalKey: item.key,
                canonicalRevision: canonicalSnapshot.revision
            });
            try {
                const createdTab = await api.createPinnedTab(windowId, item.url);
                ledger.attachCreatedTab(operation, createdTab?.id);
                ledger.finishCreate(operation);
                diagnostics.record("create_finished", {
                    operationId: operation.id,
                    windowId,
                    tabId: createdTab?.id ?? null,
                    canonicalKey: item.key
                });
            }
            catch (error) {
                ledger.finishCreate(operation, { keepForEvents: false });
                console.warn("PinAllWindows: failed to create pinned tab", {
                    windowId,
                    key: item.key,
                    error
                });
            }
        }
        return true;
    }

    async function removeExtraTabs(windowId, canonicalSnapshot) {
        const current = await getCurrentPlan(windowId, canonicalSnapshot);
        if (!current)
            return false;
        if (current.plan.removeTabIds.length === 0)
            return true;
        const operations = ledger.beginRemove(current.plan.removeTabIds);
        diagnostics.record("remove_started", {
            windowId,
            tabIds: [...current.plan.removeTabIds],
            canonicalRevision: canonicalSnapshot.revision
        });
        try {
            await api.removeTabs(current.plan.removeTabIds);
            ledger.finishRemove(operations);
            diagnostics.record("remove_finished", {
                windowId,
                tabIds: [...current.plan.removeTabIds]
            });
        }
        catch (error) {
            ledger.finishRemove(operations, { keepForEvents: false });
            console.warn("PinAllWindows: failed to remove pinned tabs", {
                windowId,
                removeTabIds: current.plan.removeTabIds,
                error
            });
        }
        return true;
    }

    async function syncWindow(windowId, canonicalSnapshot) {
        const current = await getCurrentPlan(windowId, canonicalSnapshot);
        if (!current)
            return false;
        if (!(await createMissingTabs(windowId, canonicalSnapshot, current.plan)))
            return false;
        return removeExtraTabs(windowId, canonicalSnapshot);
    }

    async function runSyncNow(reason = "unspecified") {
        diagnostics.record("sync_started", { reason });
        try {
            const eligibleRecords = await collectEligibleRecords();
            const storedSnapshot = await canonicalStore.loadSnapshot();
            if (!storedSnapshot.initialized && eligibleRecords.length === 0) {
                diagnostics.record("sync_deferred", {
                    reason,
                    cause: "no_eligible_window_for_initialization"
                });
                return;
            }
            const canonicalSnapshot = storedSnapshot.initialized
                ? storedSnapshot
                : await canonicalStore.ensureInitializedSnapshot(
                    pinnedTabsFromRecords(eligibleRecords)
                );
            for (const record of eligibleRecords) {
                if (!(await syncWindow(record.windowId, canonicalSnapshot))) {
                    scheduleSync(SYNC_DELAY_FAST_MS, "stale_snapshot");
                    break;
                }
            }
            diagnostics.record("sync_finished", {
                reason,
                eligibleWindowCount: eligibleRecords.length,
                canonicalRevision: canonicalSnapshot.revision
            });
        }
        catch (error) {
            console.error("PinAllWindows: sync failed", { reason, error });
        }
    }

    function runSync(reason = "unspecified") {
        return queue.enqueue(`sync:${reason}`, () => runSyncNow(reason));
    }

    function scheduleSync(delayMs = SYNC_DELAY_DEFAULT_MS, reason = "scheduled") {
        if (syncTimer)
            clearTimer(syncTimer);
        syncTimer = setTimer(() => {
            syncTimer = null;
            runSync(reason);
        }, delayMs);
    }

    function clearPinnedStorage() {
        return queue.enqueue("clear_storage", async () => {
            await canonicalStore.clear();
            await runSyncNow("clear_storage");
        });
    }

    function repairPinnedStorage() {
        return queue.enqueue("repair_storage", async () => {
            const eligibleRecords = await collectEligibleRecords();
            if (eligibleRecords.length === 0)
                throw new Error("No eligible browser window is available for repair");
            await canonicalStore.rebuildFromPinnedTabs(pinnedTabsFromRecords(eligibleRecords));
            await runSyncNow("repair_storage");
        });
    }

    async function isEligibleTabWindow(tab) {
        if (!tab || typeof tab.windowId !== "number")
            return false;
        const record = await windowRegistry.revalidate(tab.windowId);
        return record.status === WINDOW_STATUS_ELIGIBLE;
    }

    async function handlePinnedStateChange(tab, pinned) {
        const initialEntry = tabToCanonicalEntry(tab);
        if (!initialEntry)
            return;
        if (ledger.matchesInternalTabEvent(tab, initialEntry.key))
            return;
        if (!(await isEligibleTabWindow(tab)))
            return;
        if (pinned) {
            const canonicalSnapshot = await getInitializedCanonicalSnapshot();
            if (!canonicalSnapshot.canonicalMap.has(initialEntry.key)) {
                canonicalSnapshot.canonicalMap.set(
                    initialEntry.key,
                    seedUrlForCanonicalKey(initialEntry.key, initialEntry.url)
                );
                await canonicalStore.save(canonicalSnapshot.canonicalMap);
                diagnostics.record("canonical_added", {
                    tabId: tab.id ?? null,
                    windowId: tab.windowId,
                    canonicalKey: initialEntry.key
                });
            }
            scheduleSync(SYNC_DELAY_FAST_MS, "user_pin");
            return;
        }
        if (typeof tab.id !== "number")
            return;
        await waitFor(UNPIN_CONFIRM_DELAY_MS);
        const latestTab = await api.getTab(tab.id);
        if (!latestTab || latestTab.pinned)
            return;
        const latestEntry = tabToCanonicalEntry(latestTab);
        if (!latestEntry || ledger.matchesInternalTabEvent(latestTab, latestEntry.key))
            return;
        if (!(await isEligibleTabWindow(latestTab)))
            return;
        const canonicalSnapshot = await getInitializedCanonicalSnapshot();
        if (!canonicalSnapshot.canonicalMap.has(latestEntry.key))
            return;
        canonicalSnapshot.canonicalMap.delete(latestEntry.key);
        await canonicalStore.save(canonicalSnapshot.canonicalMap);
        diagnostics.record("canonical_removed", {
            tabId: latestTab.id,
            windowId: latestTab.windowId,
            canonicalKey: latestEntry.key
        });
        scheduleSync(SYNC_DELAY_FAST_MS, "user_unpin");
    }

    function registerEventHandlers() {
        chromeEvents.runtime.onInstalled.addListener(() => {
            scheduleSync(0, "installed");
        });
        chromeEvents.runtime.onStartup.addListener(() => {
            scheduleSync(0, "startup");
        });
        chromeEvents.windows.onCreated.addListener((win) => {
            if (win?.type !== "normal" || typeof win.id !== "number")
                return;
            windowRegistry.markCandidate(win.id);
            scheduleSync(SYNC_DELAY_ON_WINDOW_CREATED_MS, "window_created");
        });
        chromeEvents.windows.onRemoved.addListener((windowId) => {
            windowRegistry.forget(windowId);
        });
        chromeEvents.windows.onBoundsChanged?.addListener((win) => {
            if (win?.type !== "normal" || typeof win.id !== "number")
                return;
            windowRegistry.markCandidate(win.id);
            scheduleSync(SYNC_DELAY_DEFAULT_MS, "window_bounds_changed");
        });
        chromeEvents.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
            if (typeof changeInfo.pinned !== "boolean")
                return;
            const entry = tabToCanonicalEntry(tab);
            if (!entry || ledger.matchesInternalTabEvent(tab, entry.key, changeInfo.pinned))
                return;
            pendingIntents.begin(tab, entry.key, changeInfo.pinned);
            queue.enqueue("pinned_state_changed", async () => {
                try {
                    await handlePinnedStateChange(tab, changeInfo.pinned);
                }
                finally {
                    pendingIntents.finish(tab, entry.key, changeInfo.pinned);
                }
            });
        });
        chromeEvents.tabs.onCreated.addListener((tab) => {
            if (!tab?.pinned)
                return;
            const entry = tabToCanonicalEntry(tab);
            if (entry && ledger.matchesInternalTabEvent(tab, entry.key, true))
                return;
            queue.enqueue("pinned_tab_created", async () => {
                if (await isEligibleTabWindow(tab))
                    scheduleSync(SYNC_DELAY_ON_PINNED_TAB_CREATED_MS, "pinned_created");
            });
        });
        chromeEvents.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
            const type = getMessageType(msg);
            if (type === MESSAGE_GET_SYNC_DIAGNOSTICS) {
                sendResponse({ ok: true, entries: diagnostics.getEntries() });
                return;
            }
            if (type !== MESSAGE_CLEAR_STORAGE && type !== MESSAGE_REPAIR_PINNED_STORAGE)
                return;
            const action = type === MESSAGE_CLEAR_STORAGE ? clearPinnedStorage : repairPinnedStorage;
            action()
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: String(error) }));
            return true;
        });
    }

    return {
        registerEventHandlers,
        runSync,
        scheduleSync,
        clearPinnedStorage,
        repairPinnedStorage
    };
}
