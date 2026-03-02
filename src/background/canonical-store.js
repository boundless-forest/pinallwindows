import { STORAGE_INITIALIZED_KEY, STORAGE_KEY } from "./constants.js";
import { queryPinnedTabs, storageGet, storageSet } from "./chrome-api.js";
import { tabToCanonicalEntry } from "../shared/tab-utils.js";
// Canonical store keeps the authoritative pinned-app set:
// key:   origin:<scheme+host(+port)>
// value: seed URL used when creating missing pinned tabs in other windows.
function mapFromRecord(record) {
    const out = new Map();
    if (!record || typeof record !== "object")
        return out;
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === "string")
            out.set(key, value);
    }
    return out;
}
function recordFromMap(map) {
    const out = {};
    for (const [key, value] of map.entries()) {
        out[key] = value;
    }
    return out;
}
export class CanonicalStore {
    async load() {
        const snapshot = await this.loadSnapshot();
        return snapshot.canonicalMap;
    }
    async save(map) {
        await this.persist(map, true);
    }
    async clear() {
        // Keep initialized=true so we do not auto-seed again after explicit clear.
        await this.persist(new Map(), true);
    }
    async ensureInitialized() {
        const snapshot = await this.loadSnapshot();
        if (snapshot.initialized)
            return snapshot.canonicalMap;
        const seeded = await this.seedFromPinnedTabs();
        await this.persist(seeded, true);
        return seeded;
    }
    async loadSnapshot() {
        const raw = await storageGet([STORAGE_KEY, STORAGE_INITIALIZED_KEY]);
        const canonicalMap = mapFromRecord(raw[STORAGE_KEY]);
        const initializedFlag = raw[STORAGE_INITIALIZED_KEY] === true;
        // Existing installs may have the canonical map without an initialized marker.
        const initialized = initializedFlag || raw[STORAGE_KEY] !== undefined;
        return {
            canonicalMap,
            initialized
        };
    }
    async persist(map, initialized) {
        await storageSet({
            [STORAGE_KEY]: recordFromMap(map),
            [STORAGE_INITIALIZED_KEY]: initialized
        });
    }
    async seedFromPinnedTabs() {
        // First-run behavior: use currently pinned tabs as baseline.
        const tabs = await queryPinnedTabs();
        const canonical = new Map();
        for (const tab of tabs) {
            const entry = tabToCanonicalEntry(tab);
            if (!entry)
                continue;
            if (!canonical.has(entry.key))
                canonical.set(entry.key, entry.url);
        }
        return canonical;
    }
}
