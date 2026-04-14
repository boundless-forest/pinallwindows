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

async function enableActionSidePanel() {
    if (!chrome.sidePanel?.setPanelBehavior)
        return;
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

export function registerTabTreeActionHandlers() {
    Promise.all([
        clearActionPopup(),
        enableActionSidePanel()
    ]).catch((error) => {
        console.warn("PinAllWindows: failed to enable side panel action", error?.message || error);
    });
}
