import { tabToCanonicalEntry } from "./tab-utils.js";
function sortedKeys(map) {
    return Array.from(map.keys()).sort();
}
function uniqueTabIds(ids) {
    return Array.from(new Set(ids.filter((id) => Number.isInteger(id))));
}
export function computeSyncPlan(pinnedTabs, canonicalMap) {
    // Build index of existing pinned tabs by canonical app key for one window.
    const existingByKey = new Map();
    for (const tab of pinnedTabs) {
        const entry = tabToCanonicalEntry(tab);
        if (!entry)
            continue;
        const entries = existingByKey.get(entry.key) || [];
        entries.push(tab.id);
        existingByKey.set(entry.key, entries);
    }
    const create = [];
    const removeTabIds = [];
    // For each canonical app:
    // - create if missing in this window
    // - keep one if present
    // - remove duplicates
    for (const key of sortedKeys(canonicalMap)) {
        const targetUrl = canonicalMap.get(key);
        if (!targetUrl)
            continue;
        const existingTabIds = existingByKey.get(key) || [];
        if (existingTabIds.length === 0) {
            create.push({ key, url: targetUrl });
            continue;
        }
        if (existingTabIds.length > 1) {
            removeTabIds.push(...existingTabIds.slice(1));
        }
        existingByKey.delete(key);
    }
    for (const remainingTabIds of existingByKey.values()) {
        // Remaining keys are pinned tabs not present in canonical state.
        removeTabIds.push(...remainingTabIds);
    }
    return {
        create,
        removeTabIds: uniqueTabIds(removeTabIds)
    };
}
