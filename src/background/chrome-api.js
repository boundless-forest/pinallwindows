// Chrome extension APIs are callback-based and report failures through
// chrome.runtime.lastError instead of throwing. These helpers normalize that
// behavior into Promise-based calls used by the controller/store layers.
function runtimeError() {
    if (!chrome.runtime.lastError)
        return null;
    return new Error(chrome.runtime.lastError.message);
}
export function storageGet(keys) {
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
export function storageSet(values) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(values, () => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
export function storageRemove(keys) {
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
export function queryPinnedTabs() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ pinned: true }, (tabs) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tabs);
        });
    });
}
export function queryTabsInWindow(windowId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ windowId }, (tabs) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tabs);
        });
    });
}
export function getAllNormalWindows() {
    return new Promise((resolve, reject) => {
        // Restrict scope to standard browser windows; skip popup/devtools/app windows.
        chrome.windows.getAll({ populate: false, windowTypes: ["normal"] }, (windows) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(windows);
        });
    });
}
export function getWindow(windowId) {
    return new Promise((resolve) => {
        chrome.windows.get(windowId, (win) => {
            // Window may disappear between scheduling and execution.
            // Resolve null instead of rejecting so caller can safely ignore it.
            if (runtimeError()) {
                resolve(null);
                return;
            }
            resolve(win);
        });
    });
}
export function createPinnedTab(windowId, url) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({
            windowId,
            url,
            pinned: true,
            active: false
        }, () => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
export function removeTabs(tabIds) {
    // Avoid unnecessary API calls and noisy errors for empty batches.
    if (tabIds.length === 0)
        return Promise.resolve();
    return new Promise((resolve, reject) => {
        chrome.tabs.remove(tabIds, () => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
export function getTab(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            // Tab can vanish during close/teardown races; treat as null.
            if (runtimeError()) {
                resolve(null);
                return;
            }
            resolve(tab);
        });
    });
}
