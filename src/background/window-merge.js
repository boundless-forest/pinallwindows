import { buildWindowMergeSteps, getMergedPinnedDuplicates } from "../shared/window-merge.js";
import { classifyWindowSnapshot, WINDOW_STATUS_ELIGIBLE } from "./window-eligibility.js";
import { MutationLedger } from "./mutation-ledger.js";

function assertMergeWindows(source, target) {
    if (!source || !target)
        throw new Error("A window is no longer available. Refresh and try again.");
    if (source.id === target.id)
        throw new Error("Choose a different window to merge.");
    if ([source, target].some((win) => classifyWindowSnapshot(win) !== WINDOW_STATUS_ELIGIBLE))
        throw new Error("Only regular browser windows can be merged. Expand compact windows and try again.");
    if (Boolean(source.incognito) !== Boolean(target.incognito))
        throw new Error("Regular and incognito windows cannot be merged.");
}

function assertStepUnchanged(step, source) {
    const tabs = source.tabs.filter((tab) => step.tabIds.includes(tab.id));
    if (tabs.length !== step.tabIds.length || tabs.some((tab) => tab.pinned !== step.pinned))
        throw new Error("Tabs changed while merging. Refresh and merge the remaining window again.");
    if (step.groupId !== undefined) {
        const groupTabs = source.tabs.filter((tab) => tab.groupId === step.groupId);
        if (groupTabs.length !== tabs.length || tabs.some((tab) => tab.groupId !== step.groupId))
            throw new Error("A tab group changed while merging. Try again.");
    }
    else if (tabs.some((tab) => Number.isInteger(tab.groupId) && tab.groupId >= 0)) {
        throw new Error("A tab was grouped while merging. Try again.");
    }
}

export async function mergeWindowTabs(sourceWindowId, targetWindowId, api, ledger = new MutationLedger()) {
    const [source, target] = await Promise.all([
        api.getWindowWithTabs(sourceWindowId),
        api.getWindowWithTabs(targetWindowId)
    ]);
    assertMergeWindows(source, target);
    const steps = buildWindowMergeSteps(source.tabs);
    const originalActiveTabId = target.tabs.find((tab) => tab.active)?.id;
    const movedTabIds = new Set();
    const movedGroups = [];

    try {
        for (const step of steps) {
            const [currentSource, currentTarget] = await Promise.all([
                api.getWindowWithTabs(sourceWindowId),
                api.getWindowWithTabs(targetWindowId)
            ]);
            assertMergeWindows(currentSource, currentTarget);
            assertStepUnchanged(step, currentSource);
            const moveInfo = {
                windowId: targetWindowId,
                index: step.pinned ? currentTarget.tabs.filter((tab) => tab.pinned).length : -1
            };
            const originalGroup = step.groupId !== undefined ? await api.getTabGroup(step.groupId) : null;
            if (step.groupId !== undefined && !originalGroup)
                throw new Error("A tab group is no longer available. Try again.");
            if (step.pinned) {
                const operation = ledger.beginPinnedMove(step.tabIds[0]);
                try {
                    await api.moveTabs(step.tabIds, moveInfo);
                    // Chrome clears pinned when a tab crosses windows, even
                    // when it is inserted at the destination's pinned boundary.
                    await api.updateTab(step.tabIds[0], { pinned: true });
                }
                finally {
                    ledger.finishPinnedMove(operation);
                }
            }
            else if (step.groupId !== undefined)
                await api.moveTabGroup(step.groupId, moveInfo);
            else
                await api.moveTabs(step.tabIds, moveInfo);

            const destination = await api.getWindowWithTabs(targetWindowId);
            if (!destination || step.tabIds.some((id) => !destination.tabs.some((tab) => tab.id === id && tab.pinned === step.pinned)))
                throw new Error("Some tabs could not be moved. Merge the remaining window again.");
            for (const id of step.tabIds)
                movedTabIds.add(id);
            if (originalGroup) {
                movedGroups.push({
                    id: destination.tabs.find((tab) => tab.id === step.tabIds[0]).groupId,
                    collapsed: originalGroup.collapsed
                });
            }
        }

        // Moving the last tab lets Chrome close the empty source window. Never
        // remove the window itself: a newly opened tab there must not be lost.
        const remaining = await api.getWindowWithTabs(sourceWindowId);
        if (remaining?.tabs.length)
            throw new Error("New tabs appeared in the source window. Merge that window again to include them.");

        const destination = await api.getWindowWithTabs(targetWindowId);
        if (!destination)
            throw new Error("The destination window was closed while merging.");
        const duplicates = getMergedPinnedDuplicates(destination.tabs, movedTabIds);
        // Keep the existing per-origin pinned workspace; ordinary tabs, special
        // URLs and unique pins retain their actual tab instances and page state.
        for (const tabId of duplicates) {
            const latest = await api.getWindowWithTabs(targetWindowId);
            if (latest && getMergedPinnedDuplicates(latest.tabs, movedTabIds).includes(tabId))
                await api.removeTabs([tabId]);
        }
    }
    finally {
        const latest = await api.getWindowWithTabs(targetWindowId);
        const activeTab = latest?.tabs.find((tab) => tab.active);
        // A group move can select an incoming tab. Restore the original page,
        // but leave alone a different destination tab selected by the user.
        if (movedTabIds.has(activeTab?.id) && latest.tabs.some((tab) => tab.id === originalActiveTabId))
            await api.updateTab(originalActiveTabId, { active: true });
        // Chrome can expand the source's active group during a cross-window
        // move. Restore its state after restoring the destination's active tab.
        for (const group of movedGroups) {
            const current = await api.getTabGroup(group.id);
            if (current?.windowId === targetWindowId && current.collapsed !== group.collapsed)
                await api.updateTabGroup(group.id, { collapsed: group.collapsed });
        }
    }
}
