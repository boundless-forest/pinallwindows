import { MESSAGE_CLEAR_STORAGE } from "./background/constants.js";
function sendClearStorageMessage() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: MESSAGE_CLEAR_STORAGE }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { ok: false, error: "unknown" });
        });
    });
}
function initOptionsPage() {
    const statusEl = document.getElementById("status");
    const clearStorageButton = document.getElementById("clear-storage");
    if (!(statusEl instanceof HTMLElement) || !(clearStorageButton instanceof HTMLButtonElement)) {
        throw new Error("PinAllWindows options page is missing required elements");
    }
    const statusNode = statusEl;
    const clearButtonNode = clearStorageButton;
    function setStatus(text) {
        statusNode.textContent = text;
    }
    clearButtonNode.addEventListener("click", async () => {
        setStatus("Clearing...");
        const result = await sendClearStorageMessage();
        if (result.ok) {
            setStatus("Cleared pinned storage.");
        }
        else {
            setStatus(`Failed: ${result.error || "unknown"}`);
        }
        setTimeout(() => setStatus(""), 3000);
    });
}
initOptionsPage();
