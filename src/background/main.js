import { CanonicalStore } from "./canonical-store.js";
import { createSyncController } from "./sync-controller.js";
export function startBackground() {
    const store = new CanonicalStore();
    const controller = createSyncController(store);
    controller.registerEventHandlers();
}
