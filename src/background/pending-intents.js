function intentKey(windowId, canonicalKey) {
    return `${windowId}:${canonicalKey}`;
}

export class PendingIntentRegistry {
    constructor() {
        this.pinnedTabIds = new Set();
        this.unpinnedKeys = new Set();
    }

    begin(tab, canonicalKey, pinned) {
        if (pinned && Number.isInteger(tab?.id)) {
            this.pinnedTabIds.add(tab.id);
            return;
        }
        if (!pinned && typeof tab?.windowId === "number" && canonicalKey) {
            this.unpinnedKeys.add(intentKey(tab.windowId, canonicalKey));
        }
    }

    finish(tab, canonicalKey, pinned) {
        if (pinned && Number.isInteger(tab?.id)) {
            this.pinnedTabIds.delete(tab.id);
            return;
        }
        if (!pinned && typeof tab?.windowId === "number" && canonicalKey) {
            this.unpinnedKeys.delete(intentKey(tab.windowId, canonicalKey));
        }
    }

    protectPlan(windowId, plan) {
        return {
            create: plan.create.filter((item) =>
                !this.unpinnedKeys.has(intentKey(windowId, item.key))
            ),
            removeTabIds: plan.removeTabIds.filter((tabId) =>
                !this.pinnedTabIds.has(tabId)
            )
        };
    }
}
