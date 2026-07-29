import {
    STORAGE_INITIALIZED_KEY,
    STORAGE_LEGACY_CANONICAL_KEY,
    STORAGE_ORIGINS_KEY,
    STORAGE_REVISION_KEY
} from "./constants.js";
import { storageGet, storageRemove, storageSet } from "./chrome-api.js";
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
        const snapshot = await this.loadSnapshot();
        return this.persist(map, true, snapshot.revision + 1);
    }
    async clear() {
        // Keep initialized=true so we do not auto-seed again after explicit clear.
        const snapshot = await this.loadSnapshot();
        return this.persist(new Map(), true, snapshot.revision + 1);
    }
    async rebuildFromPinnedTabs(tabs) {
        const snapshot = await this.loadSnapshot();
        const rebuilt = await this.seedFromPinnedTabs(tabs);
        await this.persist(rebuilt, true, snapshot.revision + 1);
        return rebuilt;
    }
    async ensureInitializedSnapshot(tabs) {
        const snapshot = await this.loadSnapshot();
        if (snapshot.initialized)
            return snapshot;
        const seeded = await this.seedFromPinnedTabs(tabs);
        return this.persist(seeded, true, snapshot.revision + 1);
    }
    async loadSnapshot() {
        const raw = await storageGet([
            STORAGE_ORIGINS_KEY,
            STORAGE_INITIALIZED_KEY,
            STORAGE_REVISION_KEY,
            STORAGE_LEGACY_CANONICAL_KEY
        ]);
        const origins = originListFromRaw(raw[STORAGE_ORIGINS_KEY]);
        const canonicalMap = canonicalMapFromOriginList(origins);
        const initializedFlag = raw[STORAGE_INITIALIZED_KEY] === true;
        const initialized = initializedFlag || raw[STORAGE_ORIGINS_KEY] !== undefined;
        const revision = Number.isInteger(raw[STORAGE_REVISION_KEY])
            ? raw[STORAGE_REVISION_KEY]
            : 0;
        // Explicitly remove old map-based storage shape.
        if (raw[STORAGE_LEGACY_CANONICAL_KEY] !== undefined) {
            await storageRemove([STORAGE_LEGACY_CANONICAL_KEY]);
        }
        return {
            canonicalMap,
            initialized,
            revision
        };
    }
    async persist(map, initialized, revision) {
        await storageSet({
            [STORAGE_ORIGINS_KEY]: originListFromCanonicalMap(map),
            [STORAGE_INITIALIZED_KEY]: initialized,
            [STORAGE_REVISION_KEY]: revision
        });
        return {
            canonicalMap: new Map(map),
            initialized,
            revision
        };
    }
    async seedFromPinnedTabs(providedTabs) {
        if (!Array.isArray(providedTabs)) {
            throw new Error("Eligible-window tabs are required to initialize pinned state");
        }
        const tabs = providedTabs;
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
