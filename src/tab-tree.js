import {
    buildTabTreeModel,
    flattenTabTreeTabs,
    flattenVisibleTabTreeTabs,
    formatShortcut,
    getAdjacentTabId,
    getMoveTargets,
    getPinnedTabs,
    getUnpinnedTabTree
} from "./shared/tab-tree.js";
import { moveTabs, storageGet, updateTab } from "./background/chrome-api.js";
import { MESSAGE_MERGE_WINDOWS, STORAGE_SHOW_PINNED_TABS_KEY } from "./background/constants.js";
import { resolveShowPinnedTabs } from "./shared/preferences.js";

const MODE_BROWSE = "browse";
const MODE_MOVE = "move";
const AUTO_REFRESH_DELAY_MS = 150;

const state = {
    tree: [],
    tabs: [],
    currentWindowId: null,
    activeTabId: null,
    selectedTabId: null,
    selectedTargetIndex: 0,
    mode: MODE_BROWSE,
    movingTabId: null,
    mergingWindowId: null,
    showPinnedTabs: true
};

let refreshTimer = null;
let refreshGeneration = 0;

const elements = {
    summary: document.getElementById("summary"),
    refresh: document.getElementById("refresh"),
    modeBar: document.getElementById("mode-bar"),
    status: document.getElementById("status"),
    tabList: document.getElementById("tab-list"),
    openShortcutKeys: document.getElementById("open-shortcut-keys"),
    openShortcutLabel: document.getElementById("open-shortcut-label")
};

function runtimeError() {
    if (!chrome.runtime.lastError)
        return null;
    return new Error(chrome.runtime.lastError.message);
}

function assertElement(value, name) {
    if (!(value instanceof HTMLElement))
        throw new Error(`TabSpan tab tree is missing ${name}`);
    return value;
}

function getAllNormalWindowsWithTabs() {
    return new Promise((resolve, reject) => {
        chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }, (windows) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(windows);
        });
    });
}

function getCommands() {
    return new Promise((resolve, reject) => {
        chrome.commands.getAll((commands) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(commands);
        });
    });
}

function getPanelWindow() {
    return new Promise((resolve) => {
        chrome.windows.getCurrent({ populate: false }, (win) => {
            if (runtimeError()) {
                resolve(null);
                return;
            }
            resolve(win);
        });
    });
}

function updateWindow(windowId, updateInfo) {
    return new Promise((resolve, reject) => {
        chrome.windows.update(windowId, updateInfo, (win) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(win);
        });
    });
}

function removeTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.remove(tabId, () => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function requestWindowMerge(sourceWindowId, targetWindowId) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: MESSAGE_MERGE_WINDOWS,
            sourceWindowId,
            targetWindowId
        }, (response) => {
            const error = runtimeError() || (!response?.ok && new Error(response?.error || "Could not merge windows."));
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function tabIndexById(tabId) {
    return state.tabs.findIndex((tab) => tab.id === tabId);
}

function movingTab() {
    return state.tabs.find((tab) => tab.id === state.movingTabId) || null;
}

function setStatus(text) {
    elements.status.textContent = text;
}

async function renderOpenShortcut() {
    const commands = await getCommands();
    const shortcut = commands.find((command) => command.name === "_execute_action")?.shortcut || "";
    elements.openShortcutKeys.replaceChildren();

    if (!shortcut) {
        elements.openShortcutLabel.textContent = "Panel shortcut not assigned";
        return;
    }

    const key = document.createElement("kbd");
    key.textContent = formatShortcut(shortcut);
    elements.openShortcutKeys.append(key);
    elements.openShortcutLabel.textContent = "Open panel";
}

function focusTabList() {
    elements.tabList.focus({ preventScroll: true });
}

function updateSelectedTabDom(options = {}) {
    const rows = elements.tabList.querySelectorAll(".tab-row");
    let activeDescendantId = "";
    for (const row of rows) {
        const selected = Number(row.dataset.tabId) === state.selectedTabId;
        row.classList.toggle("selected", selected);
        row.setAttribute("aria-selected", selected ? "true" : "false");
        if (selected)
            activeDescendantId = row.id;
        if (selected && options.scroll) {
            row.scrollIntoView({ block: "nearest" });
        }
    }
    if (activeDescendantId) {
        elements.tabList.setAttribute("aria-activedescendant", activeDescendantId);
    }
    else {
        elements.tabList.removeAttribute("aria-activedescendant");
    }
}

function setSelectedTabId(tabId, options = {}) {
    if (!state.tabs.some((tab) => tab.id === tabId))
        return;
    state.selectedTabId = tabId;
    updateSelectedTabDom(options);
    if (options.focusList)
        focusTabList();
}

function updateSelectedTargetDom(options = {}) {
    const rows = elements.tabList.querySelectorAll(".target-row");
    rows.forEach((row, index) => {
        const selected = index === state.selectedTargetIndex;
        row.classList.toggle("selected", selected);
        row.setAttribute("aria-selected", selected ? "true" : "false");
        if (selected && options.scroll) {
            row.scrollIntoView({ block: "nearest" });
        }
    });
}

function setSelectedTargetIndex(index, options = {}) {
    const tab = movingTab();
    const targets = tab ? getMoveTargets(state.tree, tab.windowId) : [];
    if (targets.length === 0)
        return;
    state.selectedTargetIndex = Math.max(0, Math.min(index, targets.length - 1));
    updateSelectedTargetDom(options);
    if (options.focusList)
        focusTabList();
}

function hostFromUrl(url) {
    try {
        return new URL(url).host;
    }
    catch {
        return url || "No URL";
    }
}

function tabMetaText(tab) {
    const host = hostFromUrl(tab.url);
    const parts = tab.pinned ? [tab.windowLabel || "Window", host] : [host];
    if (tab.audible)
        parts.push(tab.muted ? "Muted" : "Audio");
    return parts.join(" · ");
}

function placeholderForTab(tab) {
    const node = document.createElement("span");
    node.className = "tab-placeholder";
    node.textContent = (tab.title || tab.url || "?").trim().charAt(0).toUpperCase() || "?";
    return node;
}

function iconForTab(tab) {
    if (!tab.favIconUrl)
        return placeholderForTab(tab);
    const img = document.createElement("img");
    img.className = "tab-icon";
    img.alt = "";
    img.src = tab.favIconUrl;
    img.addEventListener("error", () => {
        img.replaceWith(placeholderForTab(tab));
    }, { once: true });
    return img;
}

function badge(text, className = "") {
    const node = document.createElement("span");
    node.className = `badge ${className}`.trim();
    node.textContent = text;
    return node;
}

function actionButton(text, label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-action ${className}`;
    button.textContent = text;
    button.disabled = state.mergingWindowId !== null;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
    });
    button.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    return button;
}

function renderTabRow(tab) {
    const row = document.createElement("div");
    row.className = [
        "tab-row",
        tab.pinned ? "pinned-row" : "",
        tab.id === state.activeTabId ? "active-row" : "",
        tab.id === state.selectedTabId ? "selected" : ""
    ].filter(Boolean).join(" ");
    row.id = `tab-${tab.id}`;
    row.dataset.tabId = String(tab.id);
    row.setAttribute("role", "option");
    row.setAttribute("tabindex", "-1");
    row.setAttribute("aria-selected", tab.id === state.selectedTabId ? "true" : "false");
    if (tab.id === state.activeTabId)
        row.setAttribute("aria-current", "page");

    const copy = document.createElement("span");
    copy.className = "tab-copy";

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title;

    const url = document.createElement("span");
    url.className = "tab-url";
    url.textContent = tabMetaText(tab);

    copy.append(title, url);
    if (!tab.pinned) {
        const actions = document.createElement("span");
        actions.className = "tab-actions";
        actions.append(
            actionButton("Move", `Move ${tab.title}`, "move-action", () => {
                setSelectedTabId(tab.id);
                startMove(tab.id);
            }),
            actionButton("Close", `Close ${tab.title}`, "close-action", () => {
                setSelectedTabId(tab.id);
                closeTab(tab.id).catch(showActionError);
            })
        );
        row.append(iconForTab(tab), copy, actions);
    }
    else {
        row.append(iconForTab(tab), copy);
    }

    row.addEventListener("mouseenter", () => {
        setSelectedTabId(tab.id);
    });
    row.addEventListener("click", () => {
        setSelectedTabId(tab.id, { focusList: true });
    });
    row.addEventListener("dblclick", () => {
        setSelectedTabId(tab.id);
        activateTab(tab.id).catch(showActionError);
    });

    return row;
}

function renderWindowHeading(labelText, countValue, countLabel, variant, win = null) {
    const heading = document.createElement("div");
    heading.className = `window-heading ${variant}`;

    const label = document.createElement("span");
    label.className = "window-label";
    label.textContent = labelText;

    const count = document.createElement("span");
    count.className = "window-count";
    count.textContent = `${countValue} ${countValue === 1 ? countLabel : `${countLabel}s`}`;

    const actions = document.createElement("span");
    actions.className = "window-heading-actions";
    actions.append(count);
    if (win && !win.isCurrentWindow && state.currentWindowId !== null) {
        const current = state.tree.find((item) => item.isCurrentWindow);
        const mergeLabel = `Merge all tabs from ${win.label} into Current window`;
        const merge = actionButton(
            state.mergingWindowId === win.id ? "Merging…" : "Merge here",
            mergeLabel,
            "merge-action",
            () => mergeWindow(win.id).catch(showActionError)
        );
        const canMerge = win.mergeEligible && current?.mergeEligible && win.incognito === current.incognito;
        merge.disabled = !canMerge || state.mergingWindowId !== null;
        merge.title = canMerge ? mergeLabel : "Merge is available between regular windows of the same browsing mode. Expand compact windows to merge them.";
        actions.append(merge);
    }
    heading.append(label, actions);
    return heading;
}

function renderTargetRow(target, index) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `target-row${index === state.selectedTargetIndex ? " selected" : ""}`;
    row.setAttribute("aria-selected", index === state.selectedTargetIndex ? "true" : "false");

    const copy = document.createElement("span");
    copy.className = "target-copy";

    const title = document.createElement("span");
    title.className = "target-title";
    title.textContent = target.isCurrentWindow ? "Current window" : target.label;

    const meta = document.createElement("span");
    meta.className = "target-meta";
    meta.textContent = `${target.tabCount} ${target.tabCount === 1 ? "tab" : "tabs"}`;

    copy.append(title, meta);
    row.append(copy, badge("MOVE HERE", "current"));
    row.addEventListener("mouseenter", () => {
        setSelectedTargetIndex(index);
    });
    row.addEventListener("click", () => {
        setSelectedTargetIndex(index, { focusList: true });
        confirmMove().catch(showActionError);
    });

    return row;
}

function renderBrowseList() {
    const fragment = document.createDocumentFragment();
    if (state.tree.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No normal Chrome windows found.";
        fragment.append(empty);
        return fragment;
    }

    const pinnedTabs = getPinnedTabs(state.tree);
    if (state.showPinnedTabs && pinnedTabs.length > 0) {
        fragment.append(renderWindowHeading("Pinned tabs", pinnedTabs.length, "tab", "pinned-heading"));
        for (const tab of pinnedTabs) {
            fragment.append(renderTabRow(tab));
        }
    }

    for (const win of getUnpinnedTabTree(state.tree)) {
        const variant = win.isCurrentWindow ? "current-heading" : "other-heading";
        fragment.append(renderWindowHeading(win.label, win.tabs.length, "tab", variant, win));

        for (const tab of win.tabs) {
            fragment.append(renderTabRow(tab));
        }
    }

    return fragment;
}

function renderMoveList() {
    const fragment = document.createDocumentFragment();
    const tab = movingTab();
    const targets = tab ? getMoveTargets(state.tree, tab.windowId) : [];

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel-move-button";
    cancel.textContent = "Back to tabs";
    cancel.addEventListener("click", () => {
        cancelMove();
    });
    fragment.append(cancel);

    if (!tab || targets.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Open another normal Chrome window to move this tab.";
        fragment.append(empty);
        return fragment;
    }

    state.selectedTargetIndex = Math.max(0, Math.min(state.selectedTargetIndex, targets.length - 1));
    for (let index = 0; index < targets.length; index += 1) {
        fragment.append(renderTargetRow(targets[index], index));
    }
    return fragment;
}

function render() {
    elements.refresh.disabled = state.mergingWindowId !== null;
    elements.tabList.setAttribute("aria-busy", state.mergingWindowId !== null ? "true" : "false");
    const windowCount = state.tree.length;
    const tabCount = flattenTabTreeTabs(state.tree).length;
    const pinnedTabCount = getPinnedTabs(state.tree).length;
    const hiddenPinnedSummary = !state.showPinnedTabs && pinnedTabCount > 0
        ? ` · ${pinnedTabCount} pinned hidden`
        : "";
    elements.summary.textContent = `${tabCount} ${tabCount === 1 ? "tab" : "tabs"} · ${windowCount} ${windowCount === 1 ? "window" : "windows"}${hiddenPinnedSummary}`;

    const tab = movingTab();
    if (state.mode === MODE_MOVE && tab) {
        elements.modeBar.hidden = false;
        elements.modeBar.textContent = `Move "${tab.title}" to another window`;
    }
    else {
        elements.modeBar.hidden = true;
        elements.modeBar.textContent = "";
    }

    elements.tabList.replaceChildren(state.mode === MODE_MOVE ? renderMoveList() : renderBrowseList());
    if (state.mode === MODE_MOVE) {
        updateSelectedTargetDom();
    }
    else {
        updateSelectedTabDom();
    }
}

function scheduleRefresh() {
    if (state.mergingWindowId !== null)
        return;
    if (refreshTimer)
        clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        refreshTree({ keepSelection: true }).catch(showActionError);
    }, AUTO_REFRESH_DELAY_MS);
}

function registerAutoRefreshHandlers() {
    chrome.tabs.onCreated.addListener(scheduleRefresh);
    chrome.tabs.onRemoved.addListener(scheduleRefresh);
    chrome.tabs.onMoved.addListener(scheduleRefresh);
    chrome.tabs.onAttached.addListener(scheduleRefresh);
    chrome.tabs.onDetached.addListener(scheduleRefresh);
    chrome.tabs.onActivated.addListener(scheduleRefresh);
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
        if (changeInfo.title !== undefined
            || changeInfo.url !== undefined
            || changeInfo.favIconUrl !== undefined
            || changeInfo.pinned !== undefined
            || changeInfo.audible !== undefined
            || changeInfo.mutedInfo !== undefined
            || changeInfo.status === "complete") {
            scheduleRefresh();
        }
    });
    chrome.windows.onCreated.addListener(scheduleRefresh);
    chrome.windows.onRemoved.addListener(scheduleRefresh);
    chrome.windows.onFocusChanged.addListener(scheduleRefresh);
}

function registerPreferenceChangeHandler() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes[STORAGE_SHOW_PINNED_TABS_KEY])
            return;
        state.showPinnedTabs = resolveShowPinnedTabs(changes[STORAGE_SHOW_PINNED_TABS_KEY].newValue);
        refreshTree({ keepSelection: true }).catch(showActionError);
    });
}

function showActionError(error) {
    console.error(error);
    setStatus(`Failed: ${error?.message || error || "unknown error"}`);
}

function activeTabIdInWindow(windows, windowId) {
    const win = windows.find((item) => item.id === windowId);
    const tab = win?.tabs?.find((item) => item.active && typeof item.id === "number");
    return tab?.id || null;
}

async function getCurrentContext(windows) {
    // "Here" always means the window hosting this panel, even when another
    // window receives focus while Chrome moves tabs or the user switches apps.
    const win = await getPanelWindow();
    const currentWindowId = windows.some((item) => item.id === win?.id) ? win.id : null;
    return {
        currentWindowId,
        activeTabId: activeTabIdInWindow(windows, currentWindowId)
    };
}

async function refreshTree(options = {}) {
    const generation = ++refreshGeneration;
    const fallbackIndex = Number.isInteger(options.fallbackIndex) ? options.fallbackIndex : 0;
    const previousSelection = state.selectedTabId;
    const windows = await getAllNormalWindowsWithTabs();
    const context = await getCurrentContext(windows);
    if (state.mergingWindowId !== null || generation !== refreshGeneration)
        return;

    state.currentWindowId = context.currentWindowId;
    state.activeTabId = context.activeTabId;
    state.tree = buildTabTreeModel(windows, context.currentWindowId);
    state.tabs = flattenVisibleTabTreeTabs(state.tree, {
        includePinnedTabs: state.showPinnedTabs
    });

    let nextTabId = options.preferActive ? context.activeTabId : previousSelection;
    if (!state.tabs.some((tab) => tab.id === nextTabId)) {
        const fallbackTab = state.tabs[Math.min(fallbackIndex, Math.max(0, state.tabs.length - 1))];
        nextTabId = fallbackTab?.id || null;
    }
    state.selectedTabId = nextTabId;

    if (state.mode === MODE_MOVE && !movingTab()) {
        state.mode = MODE_BROWSE;
        state.movingTabId = null;
    }

    render();
}

async function activateTab(tabId) {
    if (state.mergingWindowId !== null)
        return;
    const tab = state.tabs.find((item) => item.id === tabId);
    if (!tab)
        return;
    await updateTab(tab.id, { active: true });
    await updateWindow(tab.windowId, { focused: true });
}

function handleTabListKeydown(event) {
    if (state.mode !== MODE_BROWSE || event.target !== elements.tabList)
        return;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const offset = event.key === "ArrowUp" ? -1 : 1;
        const nextTabId = getAdjacentTabId(state.tabs, state.selectedTabId, offset);
        if (nextTabId !== null)
            setSelectedTabId(nextTabId, { scroll: true });
        return;
    }

    if (event.key === "Enter" && state.selectedTabId !== null) {
        event.preventDefault();
        activateTab(state.selectedTabId).catch(showActionError);
    }
}

async function closeTab(tabId) {
    if (state.mergingWindowId !== null)
        return;
    const tab = state.tabs.find((item) => item.id === tabId);
    if (!tab)
        return;
    const oldIndex = tabIndexById(tab.id);
    await removeTab(tab.id);
    await refreshTree({ fallbackIndex: oldIndex });
    setStatus("Closed tab.");
}

function startMove(tabId) {
    if (state.mergingWindowId !== null)
        return;
    const tab = state.tabs.find((item) => item.id === tabId);
    if (!tab) {
        setStatus("No tab selected.");
        return;
    }
    state.mode = MODE_MOVE;
    state.movingTabId = tab.id;
    state.selectedTargetIndex = 0;
    setStatus("");
    render();
}

function cancelMove() {
    state.mode = MODE_BROWSE;
    state.movingTabId = null;
    state.selectedTargetIndex = 0;
    setStatus("");
    render();
}

async function confirmMove() {
    const tab = movingTab();
    if (!tab)
        return;
    const targets = getMoveTargets(state.tree, tab.windowId);
    const target = targets[state.selectedTargetIndex];
    if (!target) {
        setStatus("Open another normal Chrome window to move this tab.");
        return;
    }

    await moveTabs(tab.id, { windowId: target.id, index: -1 });
    await updateTab(tab.id, { active: true });
    await updateWindow(target.id, { focused: true });

    state.mode = MODE_BROWSE;
    state.movingTabId = null;
    state.selectedTabId = tab.id;
    await refreshTree({ keepSelection: true });
    setStatus("Moved tab.");
}

async function mergeWindow(sourceWindowId) {
    if (state.mergingWindowId !== null || state.currentWindowId === null)
        return;
    const targetWindowId = state.currentWindowId;
    state.mergingWindowId = sourceWindowId;
    refreshGeneration += 1;
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
    setStatus("");
    render();
    try {
        await requestWindowMerge(sourceWindowId, targetWindowId);
    }
    finally {
        state.mergingWindowId = null;
        render();
        await refreshTree({ keepSelection: true });
        focusTabList();
    }
}

async function init() {
    elements.summary = assertElement(elements.summary, "summary");
    elements.refresh = assertElement(elements.refresh, "refresh button");
    elements.modeBar = assertElement(elements.modeBar, "mode bar");
    elements.status = assertElement(elements.status, "status");
    elements.tabList = assertElement(elements.tabList, "tab list");
    elements.openShortcutKeys = assertElement(elements.openShortcutKeys, "open shortcut keys");
    elements.openShortcutLabel = assertElement(elements.openShortcutLabel, "open shortcut label");

    const storedPreferences = await storageGet([STORAGE_SHOW_PINNED_TABS_KEY]);
    state.showPinnedTabs = resolveShowPinnedTabs(storedPreferences[STORAGE_SHOW_PINNED_TABS_KEY]);

    elements.refresh.addEventListener("click", () => {
        refreshTree({ keepSelection: true }).catch(showActionError);
    });
    elements.tabList.addEventListener("keydown", handleTabListKeydown);
    registerAutoRefreshHandlers();
    registerPreferenceChangeHandler();

    await Promise.all([
        refreshTree({ preferActive: true }),
        renderOpenShortcut().catch(() => {
            elements.openShortcutLabel.textContent = "Panel shortcut unavailable";
        })
    ]);
    focusTabList();
}

init().catch(showActionError);
