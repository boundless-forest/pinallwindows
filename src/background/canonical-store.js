import { STORAGE_INITIALIZED_KEY, STORAGE_LEGACY_CANONICAL_KEY, STORAGE_ORIGINS_KEY } from "./constants.js";
import { queryPinnedTabs, storageGet, storageRemove, storageSet } from "./chrome-api.js";
import { seedUrlForCanonicalKey, tabToCanonicalEntry } from "../shared/tab-utils.js";
// Canonical store persists only a list of origins in chrome.storage.local.
// Runtime sync logic still consumes a Map<originKey, seedUrl>, which we derive
// from the stored list.
function originListFromRaw(rawOrigins) {
    if (!Array.isArray(rawOrigins))
        return [];
    const out = [];
    for (const item of rawOrigins) {
        if (typeof item !== "string")
            continue;
        try {
            const parsed = new URL(item);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
                continue;
            out.push(parsed.origin);
        }
        catch {
            continue;
        }
    }
    return Array.from(new Set(out)).sort();
}
function canonicalMapFromOriginList(origins) {
    const out = new Map();
    for (const origin of origins) {
        const key = `origin:${origin}`;
        out.set(key, seedUrlForCanonicalKey(key, `${origin}/`));
    }
    return out;
}
function originFromCanonicalKey(key) {
    if (typeof key !== "string" || !key.startsWith("origin:"))
        return null;
    const raw = key.slice("origin:".length);
    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return null;
        return parsed.origin;
    }
    catch {
        return null;
    }
}
function originListFromCanonicalMap(map) {
    const out = [];
    for (const key of map.keys()) {
        const origin = originFromCanonicalKey(key);
        if (!origin)
            continue;
        out.push(origin);
    }
    return Array.from(new Set(out)).sort();
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
        const raw = await storageGet([
            STORAGE_ORIGINS_KEY,
            STORAGE_INITIALIZED_KEY,
            STORAGE_LEGACY_CANONICAL_KEY
        ]);
        const origins = originListFromRaw(raw[STORAGE_ORIGINS_KEY]);
        const canonicalMap = canonicalMapFromOriginList(origins);
        const initializedFlag = raw[STORAGE_INITIALIZED_KEY] === true;
        const initialized = initializedFlag || raw[STORAGE_ORIGINS_KEY] !== undefined;
        // Explicitly remove old map-based storage shape.
        if (raw[STORAGE_LEGACY_CANONICAL_KEY] !== undefined) {
            await storageRemove([STORAGE_LEGACY_CANONICAL_KEY]);
        }
        return {
            canonicalMap,
            initialized
        };
    }
    async persist(map, initialized) {
        await storageSet({
            [STORAGE_ORIGINS_KEY]: originListFromCanonicalMap(map),
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
                canonical.set(entry.key, seedUrlForCanonicalKey(entry.key, entry.url));
        }
        return canonical;
    }
}
