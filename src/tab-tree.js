import { STORAGE_TAB_TREE_MODE_KEY } from "./background/constants.js";
import { buildTabTreeModel, flattenTabTreeTabs, getMoveTargets } from "./shared/tab-tree.js";

const MODE_BROWSE = "browse";
const MODE_MOVE = "move";
const MODE_MOVE_ACTIVE = "move-active";
const MODE_REQUEST_MAX_AGE_MS = 10000;

const state = {
    tree: [],
    tabs: [],
    currentWindowId: null,
    activeTabId: null,
    selectedTabId: null,
    selectedTargetIndex: 0,
    mode: MODE_BROWSE,
    requestedMode: MODE_BROWSE,
    movingTabId: null
};

const elements = {
    summary: document.getElementById("summary"),
    refresh: document.getElementById("refresh"),
    modeBar: document.getElementById("mode-bar"),
    status: document.getElementById("status"),
    tabList: document.getElementById("tab-list")
};

function runtimeError() {
    if (!chrome.runtime.lastError)
        return null;
    return new Error(chrome.runtime.lastError.message);
}

function assertElement(value, name) {
    if (!(value instanceof HTMLElement))
        throw new Error(`PinAllWindows tab tree is missing ${name}`);
    return value;
}

function queryTabs(queryInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(queryInfo, (tabs) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tabs);
        });
    });
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

function getLastFocusedNormalWindow() {
    return new Promise((resolve) => {
        chrome.windows.getLastFocused({ populate: false, windowTypes: ["normal"] }, (win) => {
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

function updateTab(tabId, updateInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.update(tabId, updateInfo, (tab) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tab);
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

function moveTab(tabId, moveInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.move(tabId, moveInfo, (tab) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tab);
        });
    });
}

function storageGet(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (items) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(items);
        });
    });
}

function storageRemove(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function normalizeMode(mode) {
    return mode === MODE_MOVE_ACTIVE ? MODE_MOVE_ACTIVE : MODE_BROWSE;
}

async function takeRequestedMode() {
    const queryMode = new URL(window.location.href).searchParams.get("mode");
    if (queryMode)
        return normalizeMode(queryMode);

    const items = await storageGet([STORAGE_TAB_TREE_MODE_KEY]);
    await storageRemove([STORAGE_TAB_TREE_MODE_KEY]);
    const request = items[STORAGE_TAB_TREE_MODE_KEY];
    if (!request || typeof request !== "object")
        return MODE_BROWSE;
    if (Date.now() - Number(request.createdAt || 0) > MODE_REQUEST_MAX_AGE_MS)
        return MODE_BROWSE;
    return normalizeMode(request.mode);
}

function tabIndexById(tabId) {
    return state.tabs.findIndex((tab) => tab.id === tabId);
}

function selectedTab() {
    return state.tabs.find((tab) => tab.id === state.selectedTabId) || null;
}

function movingTab() {
    return state.tabs.find((tab) => tab.id === state.movingTabId) || null;
}

function setStatus(text) {
    elements.status.textContent = text;
}

function hostFromUrl(url) {
    try {
        return new URL(url).host;
    }
    catch {
        return url || "No URL";
    }
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

function renderTabBadges(tab) {
    const node = document.createElement("span");
    node.className = "badges";
    if (tab.isCurrentWindow) {
        node.append(badge("CURRENT", "current"));
    }
    else {
        node.append(badge("OTHER", "other"));
    }
    if (tab.pinned)
        node.append(badge("PINNED", "pinned"));
    if (tab.audible)
        node.append(badge(tab.muted ? "MUTED" : "AUDIO", "audio"));
    return node;
}

function renderTabRow(tab) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `tab-row${tab.id === state.selectedTabId ? " selected" : ""}${tab.isCurrentWindow ? "" : " other-window"}`;
    row.dataset.tabId = String(tab.id);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", tab.id === state.selectedTabId ? "true" : "false");

    const copy = document.createElement("span");
    copy.className = "tab-copy";

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title;

    const url = document.createElement("span");
    url.className = "tab-url";
    url.textContent = hostFromUrl(tab.url);

    copy.append(title, url);
    row.append(iconForTab(tab), copy, renderTabBadges(tab));

    row.addEventListener("mouseenter", () => {
        state.selectedTabId = tab.id;
        render();
    });
    row.addEventListener("click", () => {
        state.selectedTabId = tab.id;
        activateSelectedTab().catch(showActionError);
    });

    return row;
}

function renderTargetRow(target, index) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `target-row${index === state.selectedTargetIndex ? " selected" : ""}`;

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
        state.selectedTargetIndex = index;
        render();
    });
    row.addEventListener("click", () => {
        state.selectedTargetIndex = index;
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

    for (const win of state.tree) {
        const heading = document.createElement("div");
        heading.className = "window-heading";

        const label = document.createElement("span");
        label.textContent = win.label;

        const count = document.createElement("span");
        count.className = "window-count";
        count.textContent = `${win.tabs.length} ${win.tabs.length === 1 ? "tab" : "tabs"}`;

        heading.append(label, count);
        fragment.append(heading);

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
    const windowCount = state.tree.length;
    const tabCount = state.tabs.length;
    elements.summary.textContent = `${tabCount} ${tabCount === 1 ? "tab" : "tabs"} across ${windowCount} ${windowCount === 1 ? "window" : "windows"}`;

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
    const normalWindowIds = new Set(windows.map((win) => win.id).filter((id) => typeof id === "number"));
    const activeTabs = await queryTabs({ active: true, lastFocusedWindow: true });
    const activeTab = activeTabs.find((tab) => {
        return typeof tab.id === "number" && normalWindowIds.has(tab.windowId);
    });
    if (activeTab) {
        return {
            currentWindowId: activeTab.windowId,
            activeTabId: activeTab.id
        };
    }

    const win = await getLastFocusedNormalWindow();
    const fallbackWindowId = normalWindowIds.has(win?.id) ? win.id : windows[0]?.id;
    return {
        currentWindowId: typeof fallbackWindowId === "number" ? fallbackWindowId : null,
        activeTabId: activeTabIdInWindow(windows, fallbackWindowId)
    };
}

async function refreshTree(options = {}) {
    const fallbackIndex = Number.isInteger(options.fallbackIndex) ? options.fallbackIndex : 0;
    const previousSelection = state.selectedTabId;
    const windows = await getAllNormalWindowsWithTabs();
    const context = await getCurrentContext(windows);

    state.currentWindowId = context.currentWindowId;
    state.activeTabId = context.activeTabId;
    state.tree = buildTabTreeModel(windows, context.currentWindowId);
    state.tabs = flattenTabTreeTabs(state.tree);

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

async function activateSelectedTab() {
    const tab = selectedTab();
    if (!tab)
        return;
    await updateWindow(tab.windowId, { focused: true });
    await updateTab(tab.id, { active: true });
    window.close();
}

async function closeSelectedTab() {
    const tab = selectedTab();
    if (!tab)
        return;
    const oldIndex = tabIndexById(tab.id);
    await removeTab(tab.id);
    await refreshTree({ fallbackIndex: oldIndex });
    setStatus("Closed tab.");
}

function startMove(tabId) {
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

    await moveTab(tab.id, { windowId: target.id, index: -1 });
    await updateWindow(target.id, { focused: true });
    await updateTab(tab.id, { active: true });

    state.mode = MODE_BROWSE;
    state.movingTabId = null;
    state.selectedTabId = tab.id;
    await refreshTree({ keepSelection: true });
    setStatus("Moved tab.");
    window.close();
}

function moveSelection(delta) {
    if (state.tabs.length === 0)
        return;
    const currentIndex = tabIndexById(state.selectedTabId);
    if (currentIndex === -1) {
        state.selectedTabId = state.tabs[delta > 0 ? 0 : state.tabs.length - 1].id;
        render();
        return;
    }
    const nextIndex = (currentIndex + delta + state.tabs.length) % state.tabs.length;
    state.selectedTabId = state.tabs[nextIndex].id;
    render();
}

function moveTargetSelection(delta) {
    const tab = movingTab();
    const targets = tab ? getMoveTargets(state.tree, tab.windowId) : [];
    if (targets.length === 0)
        return;
    state.selectedTargetIndex = (state.selectedTargetIndex + delta + targets.length) % targets.length;
    render();
}

function handleKeydown(event) {
    const key = event.key;
    const commandKey = event.ctrlKey || event.metaKey;

    if (state.mode === MODE_MOVE) {
        if (key === "ArrowDown" || key === "j") {
            event.preventDefault();
            moveTargetSelection(1);
            return;
        }
        if (key === "ArrowUp" || key === "k") {
            event.preventDefault();
            moveTargetSelection(-1);
            return;
        }
        if (key === "Enter") {
            event.preventDefault();
            confirmMove().catch(showActionError);
            return;
        }
        if (key === "Escape") {
            event.preventDefault();
            cancelMove();
        }
        return;
    }

    if (key === "ArrowDown" || key === "j") {
        event.preventDefault();
        moveSelection(1);
        return;
    }
    if (key === "ArrowUp" || key === "k") {
        event.preventDefault();
        moveSelection(-1);
        return;
    }
    if (key === "Enter") {
        event.preventDefault();
        activateSelectedTab().catch(showActionError);
        return;
    }
    if (key === "m" || key === "M") {
        event.preventDefault();
        startMove(state.selectedTabId);
        return;
    }
    if (key === "Delete" || key === "Backspace" || (commandKey && key.toLowerCase() === "w")) {
        event.preventDefault();
        closeSelectedTab().catch(showActionError);
        return;
    }
    if (key === "r" || key === "R") {
        event.preventDefault();
        refreshTree({ keepSelection: true }).catch(showActionError);
        return;
    }
    if (key === "Escape") {
        event.preventDefault();
        window.close();
    }
}

async function init() {
    elements.summary = assertElement(elements.summary, "summary");
    elements.refresh = assertElement(elements.refresh, "refresh button");
    elements.modeBar = assertElement(elements.modeBar, "mode bar");
    elements.status = assertElement(elements.status, "status");
    elements.tabList = assertElement(elements.tabList, "tab list");

    elements.refresh.addEventListener("click", () => {
        refreshTree({ keepSelection: true }).catch(showActionError);
    });
    document.addEventListener("keydown", handleKeydown);

    state.requestedMode = await takeRequestedMode();
    await refreshTree({ preferActive: true });

    if (state.requestedMode === MODE_MOVE_ACTIVE && state.activeTabId) {
        startMove(state.activeTabId);
    }

    elements.tabList.focus();
}

init().catch(showActionError);
