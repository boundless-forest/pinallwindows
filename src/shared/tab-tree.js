import { getTabUrl, isSyncWindow } from "./tab-utils.js";

function byTabIndex(a, b) {
    return (a.index || 0) - (b.index || 0);
}

function byCurrentWindowThenId(currentWindowId) {
    return (a, b) => {
        if (a.id === currentWindowId)
            return -1;
        if (b.id === currentWindowId)
            return 1;
        return (a.id || 0) - (b.id || 0);
    };
}

export function buildTabTreeModel(windows, currentWindowId) {
    const normalWindows = (Array.isArray(windows) ? windows : [])
        .filter(isSyncWindow)
        .filter((win) => typeof win.id === "number")
        .sort(byCurrentWindowThenId(currentWindowId));

    return normalWindows.map((win, index) => {
        const isCurrentWindow = win.id === currentWindowId;
        const tabs = (Array.isArray(win.tabs) ? win.tabs : [])
            .filter((tab) => typeof tab.id === "number")
            .sort(byTabIndex)
            .map((tab) => ({
                id: tab.id,
                windowId: win.id,
                windowLabel: isCurrentWindow ? "Current window" : `Window ${index + 1}`,
                title: tab.title || getTabUrl(tab) || "Untitled",
                url: getTabUrl(tab),
                favIconUrl: tab.favIconUrl || "",
                active: tab.active === true,
                pinned: tab.pinned === true,
                audible: tab.audible === true,
                muted: tab.mutedInfo?.muted === true,
                index: tab.index || 0,
                isCurrentWindow
            }));

        return {
            id: win.id,
            label: isCurrentWindow ? "Current window" : `Window ${index + 1}`,
            isCurrentWindow,
            focused: win.focused === true,
            tabs
        };
    });
}

export function flattenTabTreeTabs(tree) {
    const out = [];
    for (const win of Array.isArray(tree) ? tree : []) {
        for (const tab of win.tabs || []) {
            out.push(tab);
        }
    }
    return out;
}

export function getPinnedTabs(tree) {
    return flattenTabTreeTabs(tree).filter((tab) => tab.pinned);
}

export function getUnpinnedTabTree(tree) {
    return (Array.isArray(tree) ? tree : []).map((win) => ({
        ...win,
        tabs: (win.tabs || []).filter((tab) => !tab.pinned)
    }));
}

export function flattenVisibleTabTreeTabs(tree) {
    return [
        ...getPinnedTabs(tree),
        ...flattenTabTreeTabs(getUnpinnedTabTree(tree))
    ];
}

export function getMoveTargets(tree, sourceWindowId) {
    return (Array.isArray(tree) ? tree : [])
        .filter((win) => typeof win.id === "number" && win.id !== sourceWindowId)
        .map((win) => ({
            id: win.id,
            label: win.label,
            isCurrentWindow: win.isCurrentWindow,
            tabCount: (win.tabs || []).length
        }));
}
