import {
    MESSAGE_CLEAR_STORAGE,
    MESSAGE_GET_SYNC_DIAGNOSTICS,
    MESSAGE_REPAIR_PINNED_STORAGE
} from "./background/constants.js";
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
    const copyDiagnosticsButton = document.getElementById("copy-diagnostics");
    if (!(statusEl instanceof HTMLElement) ||
        !(clearStorageButton instanceof HTMLButtonElement) ||
        !(repairStorageButton instanceof HTMLButtonElement) ||
        !(copyDiagnosticsButton instanceof HTMLButtonElement)) {
        throw new Error("PinAllWindows options page is missing required elements");
    }
    const statusNode = statusEl;
    const clearButtonNode = clearStorageButton;
    const repairButtonNode = repairStorageButton;
    const diagnosticsButtonNode = copyDiagnosticsButton;
    function setStatus(text) {
        statusNode.textContent = text;
    }
    function setButtonsDisabled(disabled) {
        repairButtonNode.disabled = disabled;
        clearButtonNode.disabled = disabled;
        diagnosticsButtonNode.disabled = disabled;
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
    diagnosticsButtonNode.addEventListener("click", async () => {
        setButtonsDisabled(true);
        setStatus("Copying...");
        const result = await sendRuntimeMessage(MESSAGE_GET_SYNC_DIAGNOSTICS);
        try {
            if (!result.ok)
                throw new Error(result.error || "unknown");
            await navigator.clipboard.writeText(JSON.stringify(result.entries || [], null, 2));
            setStatus("Diagnostics copied.");
        }
        catch (error) {
            setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        setButtonsDisabled(false);
        setTimeout(() => setStatus(""), 3000);
    });
}
initOptionsPage();
