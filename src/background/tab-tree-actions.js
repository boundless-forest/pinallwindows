import { STORAGE_TAB_TREE_MODE_KEY } from "./constants.js";

function runtimeError() {
    if (!chrome.runtime.lastError)
        return null;
    return new Error(chrome.runtime.lastError.message);
}

function storageSet(values) {
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

function openActionPopup() {
    return new Promise((resolve, reject) => {
        if (!chrome.action?.openPopup) {
            reject(new Error("chrome.action.openPopup is unavailable"));
            return;
        }
        chrome.action.openPopup(() => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function createTabTreeWindow(mode) {
    return new Promise((resolve, reject) => {
        const url = chrome.runtime.getURL(`tab-tree.html?mode=${encodeURIComponent(mode)}`);
        chrome.windows.create({
            url,
            type: "popup",
            width: 480,
            height: 640,
            focused: true
        }, (win) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(win);
        });
    });
}

async function openTabTree(mode) {
    await storageSet({
        [STORAGE_TAB_TREE_MODE_KEY]: {
            mode,
            createdAt: Date.now()
        }
    });

    try {
        await openActionPopup();
    }
    catch {
        await createTabTreeWindow(mode);
    }
}

export function registerTabTreeCommandHandlers() {
    chrome.commands.onCommand.addListener((command) => {
        if (command !== "move-active-tab")
            return;
        openTabTree("move-active").catch((error) => {
            console.error("PinAllWindows: failed to open tab move picker", { error });
        });
    });
}
