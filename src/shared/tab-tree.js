import { getTabUrl, isSyncWindow } from "./tab-utils.js";
import { classifyWindowSnapshot, WINDOW_STATUS_ELIGIBLE } from "../background/window-eligibility.js";

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
            incognito: win.incognito === true,
            mergeEligible: classifyWindowSnapshot(win) === WINDOW_STATUS_ELIGIBLE,
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

export function flattenVisibleTabTreeTabs(tree, options = {}) {
    const includePinnedTabs = options.includePinnedTabs !== false;
    const pinnedTabs = includePinnedTabs ? getPinnedTabs(tree) : [];
    return [
        ...pinnedTabs,
        ...flattenTabTreeTabs(getUnpinnedTabTree(tree))
    ];
}

export function getAdjacentTabId(tabs, selectedTabId, offset) {
    if (tabs.length === 0)
        return null;
    const selectedIndex = tabs.findIndex((tab) => tab.id === selectedTabId);
    if (selectedIndex === -1)
        return tabs[0].id;
    const nextIndex = Math.max(0, Math.min(selectedIndex + offset, tabs.length - 1));
    return tabs[nextIndex].id;
}

export function formatShortcut(shortcut) {
    const parts = shortcut.split("+");
    const isMacShortcut = parts.includes("Command") || parts.includes("MacCtrl");
    if (!isMacShortcut)
        return shortcut;
    const macSymbols = {
        Command: "⌘",
        MacCtrl: "⌃",
        Alt: "⌥",
        Shift: "⇧"
    };
    return parts.map((part) => macSymbols[part] || part).join("");
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
