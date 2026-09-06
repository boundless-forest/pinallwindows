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
export function getAllCandidateWindows() {
    return new Promise((resolve, reject) => {
        // Chromium currently reports picture-in-picture as "normal". Return the
        // raw candidates so the eligibility registry can classify them safely.
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
export function getWindowWithTabs(windowId) {
    return new Promise((resolve) => {
        chrome.windows.get(windowId, { populate: true }, (win) => {
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
        }, (tab) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tab || null);
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
export function moveTabs(tabIds, moveInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.move(tabIds, moveInfo, (tabs) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(tabs);
        });
    });
}
export function moveTabGroup(groupId, moveInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabGroups.move(groupId, moveInfo, (group) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(group);
        });
    });
}
export function getTabGroup(groupId) {
    return new Promise((resolve) => {
        chrome.tabGroups.get(groupId, (group) => {
            resolve(runtimeError() ? null : group);
        });
    });
}
export function updateTabGroup(groupId, updateInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabGroups.update(groupId, updateInfo, (group) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(group);
        });
    });
}
export function updateTab(tabId, updateInfo) {
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
