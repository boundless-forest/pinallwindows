export function getTabUrl(tab) {
    // During navigation/create, url can be empty while pendingUrl is populated.
    return tab?.url || tab?.pendingUrl || "";
}
export function isSyncableUrl(url) {
    if (!url)
        return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    catch {
        return false;
    }
}
export function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = "";
        return parsed.toString();
    }
    catch {
        return url;
    }
}
export function canonicalKeyForUrl(url) {
    const normalized = normalizeUrl(url);
    try {
        const parsed = new URL(normalized);
        return `origin:${parsed.origin}`;
    }
    catch {
        return normalized;
    }
}
export function seedUrlForCanonicalKey(key, fallbackUrl = "") {
    if (typeof key === "string" && key.startsWith("origin:")) {
        const origin = key.slice("origin:".length);
        try {
            // Canonical value format: always store origin root URL.
            return `${new URL(origin).origin}/`;
        }
        catch {
            // Fall through to fallback normalization below.
        }
    }
    return normalizeUrl(fallbackUrl);
}
export function tabToCanonicalEntry(tab) {
    const rawUrl = getTabUrl(tab);
    if (!isSyncableUrl(rawUrl))
        return null;
    // Normalize before keying so hash-only differences do not fork identities.
    const normalizedUrl = normalizeUrl(rawUrl);
    return {
        key: canonicalKeyForUrl(normalizedUrl),
        url: normalizedUrl
    };
}
export function isSyncWindow(win) {
    return Boolean(win && win.type === "normal" && win.alwaysOnTop !== true);
}
