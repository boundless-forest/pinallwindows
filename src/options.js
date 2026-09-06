import {
    MESSAGE_CLEAR_STORAGE,
    MESSAGE_GET_SYNC_DIAGNOSTICS,
    MESSAGE_REPAIR_PINNED_STORAGE,
    STORAGE_SHOW_PINNED_TABS_KEY
} from "./background/constants.js";
import { getCommands, openShortcutSettings, storageGet, storageSet } from "./background/chrome-api.js";
import { resolveShowPinnedTabs } from "./shared/preferences.js";
import { formatShortcut } from "./shared/tab-tree.js";

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
    const actionStatusEl = document.getElementById("action-status");
    const preferenceStatusEl = document.getElementById("preference-status");
    const showPinnedTabsInput = document.getElementById("show-pinned-tabs");
    const clearStorageButton = document.getElementById("clear-storage");
    const repairStorageButton = document.getElementById("repair-storage");
    const copyDiagnosticsButton = document.getElementById("copy-diagnostics");
    const panelShortcutEl = document.getElementById("panel-shortcut");
    const customizeShortcutButton = document.getElementById("customize-shortcut");

    if (!(actionStatusEl instanceof HTMLElement)
        || !(preferenceStatusEl instanceof HTMLElement)
        || !(showPinnedTabsInput instanceof HTMLInputElement)
        || !(clearStorageButton instanceof HTMLButtonElement)
        || !(repairStorageButton instanceof HTMLButtonElement)
        || !(copyDiagnosticsButton instanceof HTMLButtonElement)
        || !(panelShortcutEl instanceof HTMLElement)
        || !(customizeShortcutButton instanceof HTMLButtonElement)) {
        throw new Error("ztab options page is missing required elements");
    }

    let actionStatusTimer = null;
    let preferenceStatusTimer = null;

    function setTemporaryStatus(element, text, timerName) {
        element.textContent = text;
        const currentTimer = timerName === "action" ? actionStatusTimer : preferenceStatusTimer;
        if (currentTimer)
            clearTimeout(currentTimer);
        const nextTimer = setTimeout(() => {
            element.textContent = "";
        }, 3000);
        if (timerName === "action")
            actionStatusTimer = nextTimer;
        else
            preferenceStatusTimer = nextTimer;
    }

    function setActionButtonsDisabled(disabled) {
        repairStorageButton.disabled = disabled;
        clearStorageButton.disabled = disabled;
        copyDiagnosticsButton.disabled = disabled;
    }

    async function runAction(inProgressText, successText, messageType) {
        setActionButtonsDisabled(true);
        actionStatusEl.textContent = inProgressText;
        const result = await sendRuntimeMessage(messageType);
        setActionButtonsDisabled(false);
        if (result.ok) {
            setTemporaryStatus(actionStatusEl, successText, "action");
        }
        else {
            setTemporaryStatus(actionStatusEl, `Failed: ${result.error || "unknown"}`, "action");
        }
    }

    async function loadPreferences() {
        const stored = await storageGet([STORAGE_SHOW_PINNED_TABS_KEY]);
        showPinnedTabsInput.checked = resolveShowPinnedTabs(stored[STORAGE_SHOW_PINNED_TABS_KEY]);
        showPinnedTabsInput.disabled = false;
    }

    async function loadPanelShortcut() {
        try {
            const commands = await getCommands();
            const shortcut = commands.find((command) => command.name === "_execute_action")?.shortcut;
            panelShortcutEl.replaceChildren();
            if (shortcut) {
                const key = document.createElement("kbd");
                key.textContent = formatShortcut(shortcut);
                panelShortcutEl.append(key);
            }
            else {
                panelShortcutEl.textContent = "Not assigned";
            }
        }
        catch {
            panelShortcutEl.textContent = "Shortcut unavailable";
        }
    }

    customizeShortcutButton.addEventListener("click", () => {
        openShortcutSettings().catch((error) => {
            setTemporaryStatus(actionStatusEl, `Failed: ${error.message}`, "action");
        });
    });
    window.addEventListener("focus", loadPanelShortcut);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible")
            loadPanelShortcut();
    });
    loadPanelShortcut();

    showPinnedTabsInput.disabled = true;
    showPinnedTabsInput.addEventListener("change", async () => {
        const previousValue = !showPinnedTabsInput.checked;
        showPinnedTabsInput.disabled = true;
        preferenceStatusEl.textContent = "Saving...";
        try {
            await storageSet({
                [STORAGE_SHOW_PINNED_TABS_KEY]: showPinnedTabsInput.checked
            });
            setTemporaryStatus(preferenceStatusEl, "Preference saved.", "preference");
        }
        catch (error) {
            showPinnedTabsInput.checked = previousValue;
            setTemporaryStatus(
                preferenceStatusEl,
                `Failed: ${error instanceof Error ? error.message : String(error)}`,
                "preference"
            );
        }
        showPinnedTabsInput.disabled = false;
    });

    repairStorageButton.addEventListener("click", async () => {
        await runAction("Resyncing pinned tabs...", "Pinned tabs resynced.", MESSAGE_REPAIR_PINNED_STORAGE);
    });

    clearStorageButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
            "Reset the shared pinned set and unpin its tabs from normal Chrome windows?"
        );
        if (!confirmed)
            return;
        await runAction("Resetting synced pinned tabs...", "Synced pinned tabs reset.", MESSAGE_CLEAR_STORAGE);
    });

    copyDiagnosticsButton.addEventListener("click", async () => {
        setActionButtonsDisabled(true);
        actionStatusEl.textContent = "Copying diagnostics...";
        const result = await sendRuntimeMessage(MESSAGE_GET_SYNC_DIAGNOSTICS);
        try {
            if (!result.ok)
                throw new Error(result.error || "unknown");
            await navigator.clipboard.writeText(JSON.stringify(result.entries || [], null, 2));
            setTemporaryStatus(actionStatusEl, "Diagnostics copied.", "action");
        }
        catch (error) {
            setTemporaryStatus(
                actionStatusEl,
                `Failed: ${error instanceof Error ? error.message : String(error)}`,
                "action"
            );
        }
        setActionButtonsDisabled(false);
    });

    loadPreferences().catch((error) => {
        showPinnedTabsInput.disabled = true;
        setTemporaryStatus(
            preferenceStatusEl,
            `Failed: ${error instanceof Error ? error.message : String(error)}`,
            "preference"
        );
    });
}

initOptionsPage();
