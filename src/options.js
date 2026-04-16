import { MESSAGE_CLEAR_STORAGE, MESSAGE_REPAIR_PINNED_STORAGE } from "./background/constants.js";
function sendRuntimeMessage(type) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type }, (response) => {
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
    const repairStorageButton = document.getElementById("repair-storage");
    if (!(statusEl instanceof HTMLElement) ||
        !(clearStorageButton instanceof HTMLButtonElement) ||
        !(repairStorageButton instanceof HTMLButtonElement)) {
        throw new Error("PinAllWindows options page is missing required elements");
    }
    const statusNode = statusEl;
    const clearButtonNode = clearStorageButton;
    const repairButtonNode = repairStorageButton;
    function setStatus(text) {
        statusNode.textContent = text;
    }
    function setButtonsDisabled(disabled) {
        repairButtonNode.disabled = disabled;
        clearButtonNode.disabled = disabled;
    }
    async function runAction(inProgressText, successText, messageType) {
        setButtonsDisabled(true);
        setStatus(inProgressText);
        const result = await sendRuntimeMessage(messageType);
        if (result.ok) {
            setStatus(successText);
        }
        else {
            setStatus(`Failed: ${result.error || "unknown"}`);
        }
        setButtonsDisabled(false);
        setTimeout(() => setStatus(""), 3000);
    }
    repairButtonNode.addEventListener("click", async () => {
        await runAction("Repairing...", "Pinned tabs repaired.", MESSAGE_REPAIR_PINNED_STORAGE);
    });
    clearButtonNode.addEventListener("click", async () => {
        await runAction("Clearing...", "Cleared pinned storage.", MESSAGE_CLEAR_STORAGE);
    });
}
initOptionsPage();
