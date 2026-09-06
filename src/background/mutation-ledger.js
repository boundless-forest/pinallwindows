import { MUTATION_LEDGER_TTL_MS } from "./constants.js";

function mutationKey(windowId, canonicalKey) {
    return `${windowId}:${canonicalKey}`;
}

export class MutationLedger {
    constructor({ now = Date.now, ttlMs = MUTATION_LEDGER_TTL_MS } = {}) {
        this.now = now;
        this.ttlMs = ttlMs;
        this.nextOperationId = 1;
        this.createsByKey = new Map();
        this.operationsByTabId = new Map();
    }

    cleanup() {
        const now = this.now();
        for (const [key, operation] of this.createsByKey) {
            if (operation.expiresAt <= now)
                this.createsByKey.delete(key);
        }
        for (const [tabId, operation] of this.operationsByTabId) {
            if (operation.expiresAt <= now)
                this.operationsByTabId.delete(tabId);
        }
    }

    beginCreate(windowId, canonicalKey) {
        this.cleanup();
        const key = mutationKey(windowId, canonicalKey);
        const existing = this.createsByKey.get(key);
        if (existing)
            return existing;
        const operation = {
            id: this.nextOperationId++,
            kind: "create",
            windowId,
            canonicalKey,
            expiresAt: this.now() + this.ttlMs
        };
        this.createsByKey.set(key, operation);
        return operation;
    }

    attachCreatedTab(operation, tabId) {
        if (!operation || !Number.isInteger(tabId))
            return;
        operation.tabId = tabId;
        operation.expiresAt = this.now() + this.ttlMs;
        this.operationsByTabId.set(tabId, operation);
        // Once Chrome returns the concrete tab id, stop broad matching by
        // window+origin so a real user action for the same origin is not hidden.
        this.createsByKey.delete(mutationKey(operation.windowId, operation.canonicalKey));
    }

    finishCreate(operation, { keepForEvents = true } = {}) {
        if (!operation)
            return;
        if (!keepForEvents) {
            this.createsByKey.delete(mutationKey(operation.windowId, operation.canonicalKey));
        }
        if (!keepForEvents && Number.isInteger(operation.tabId))
            this.operationsByTabId.delete(operation.tabId);
    }

    hasPendingCreate(windowId, canonicalKey) {
        this.cleanup();
        return this.createsByKey.has(mutationKey(windowId, canonicalKey));
    }

    beginRemove(tabIds) {
        this.cleanup();
        const operations = [];
        for (const tabId of tabIds) {
            if (!Number.isInteger(tabId))
                continue;
            const operation = {
                id: this.nextOperationId++,
                kind: "remove",
                tabId,
                expiresAt: this.now() + this.ttlMs
            };
            this.operationsByTabId.set(tabId, operation);
            operations.push(operation);
        }
        return operations;
    }

    finishRemove(operations, { keepForEvents = true } = {}) {
        if (keepForEvents)
            return;
        for (const operation of operations || []) {
            this.operationsByTabId.delete(operation.tabId);
        }
    }

    beginPinnedMove(tabId) {
        const operation = {
            id: this.nextOperationId++,
            kind: "move_pinned",
            tabId,
            expiresAt: this.now() + this.ttlMs
        };
        this.operationsByTabId.set(tabId, operation);
        return operation;
    }

    finishPinnedMove(operation) {
        // Stop matching as soon as the transfer ends, so a subsequent user
        // unpin of this same tab is immediately visible to synchronization.
        if (this.operationsByTabId.get(operation.tabId) === operation)
            this.operationsByTabId.delete(operation.tabId);
    }

    matchesInternalTabEvent(tab, canonicalKey = null, pinned = tab?.pinned) {
        this.cleanup();
        if (Number.isInteger(tab?.id)) {
            const operation = this.operationsByTabId.get(tab.id);
            if (operation?.kind === "move_pinned")
                return true;
            if (operation?.kind === "create" && pinned === true)
                return true;
            if (operation?.kind === "remove" && pinned !== true)
                return true;
        }
        if (typeof tab?.windowId !== "number" || !canonicalKey)
            return false;
        return pinned === true &&
            this.createsByKey.has(mutationKey(tab.windowId, canonicalKey));
    }
}
