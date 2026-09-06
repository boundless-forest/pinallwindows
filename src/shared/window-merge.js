import { tabToCanonicalEntry } from "./tab-utils.js";

export function buildWindowMergeSteps(tabs) {
    const orderedTabs = [...tabs].sort((a, b) => a.index - b.index);
    const steps = [];
    const groups = new Map();
    for (const tab of orderedTabs.filter((item) => !item.pinned)) {
        if (Number.isInteger(tab.groupId) && tab.groupId >= 0) {
            let group = groups.get(tab.groupId);
            if (!group) {
                group = { groupId: tab.groupId, tabIds: [], pinned: false };
                groups.set(tab.groupId, group);
                steps.push(group);
            }
            group.tabIds.push(tab.id);
        }
        else {
            steps.push({ tabIds: [tab.id], pinned: false });
        }
    }
    // Move pins last so regular tabs reach their destination before any shared
    // pinned copies are removed. Their insertion index stays in the pinned area.
    for (const tab of orderedTabs.filter((item) => item.pinned)) {
        steps.push({ tabIds: [tab.id], pinned: true });
    }
    return steps;
}

export function getMergedPinnedDuplicates(tabs, movedTabIds) {
    const seen = new Set();
    const duplicates = [];
    for (const tab of [...tabs].sort((a, b) => a.index - b.index)) {
        if (!tab.pinned)
            continue;
        const entry = tabToCanonicalEntry(tab);
        if (!entry)
            continue;
        if (seen.has(entry.key) && movedTabIds.has(tab.id))
            duplicates.push(tab.id);
        seen.add(entry.key);
    }
    return duplicates;
}
