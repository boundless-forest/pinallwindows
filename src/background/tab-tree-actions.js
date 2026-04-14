function runtimeError() {
    if (!chrome.runtime.lastError)
        return null;
    return new Error(chrome.runtime.lastError.message);
}

function clearActionPopup() {
    return new Promise((resolve, reject) => {
        chrome.action.setPopup({ popup: "" }, () => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function getLastFocusedWindow() {
    return new Promise((resolve, reject) => {
        chrome.windows.getLastFocused({ windowTypes: ["normal"] }, (win) => {
            const error = runtimeError();
            if (error) {
                reject(error);
                return;
            }
            resolve(win);
        });
    });
}

async function enableActionSidePanel() {
    if (!chrome.sidePanel?.setPanelBehavior)
        return;
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

async function openSidePanel() {
    if (!chrome.sidePanel?.open)
        throw new Error("chrome.sidePanel.open is unavailable");
    const win = await getLastFocusedWindow();
    if (typeof win?.id !== "number")
        throw new Error("No normal Chrome window is available");
    await chrome.sidePanel.open({ windowId: win.id });
}

export function registerTabTreeActionHandlers() {
    Promise.all([
        clearActionPopup(),
        enableActionSidePanel()
    ]).catch((error) => {
        console.error("PinAllWindows: failed to enable side panel action", { error });
    });

    chrome.commands.onCommand.addListener((command) => {
        if (command !== "open-tab-tree")
            return;
        openSidePanel().catch((error) => {
            console.error("PinAllWindows: failed to open tab tree side panel", { error });
        });
    });
}
