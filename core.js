// Core utilities for PinAllWindows.
// Kept dependency-free so we can unit-test with Node.

// Philosophy (simple + predictable)
//
// PinAllWindows synchronizes *apps* (sites) rather than exact URLs.
// That means the sync identity is the tab's origin (scheme + host).
//
// Example:
// - Any https://gemini.google.com/... URL is treated as the same pinned app.
// - This avoids problems where a web app encodes session IDs in the URL.
//
// Policy: "keep existing" (requested)
// - When a pinned tab navigates within the same app, we do not change canonical state.
// - If the user pins a second tab from the same app, PinAllWindows will keep the existing
//   pinned app tab and remove duplicates.
// - To switch the pinned target for an app, unpin the existing pinned tab first,
//   then pin the new one.

export function getTabUrl(tab) {
  // In Chrome extension APIs, a tab may have:
  // - url: the current committed URL
  // - pendingUrl: the URL that will be committed after navigation completes
  //
  // During tab creation or navigation, `url` can be empty while `pendingUrl`
  // already contains the destination. For our sync logic, treating either as
  // the "tab URL" prevents duplicate creation loops.
  return tab?.url || tab?.pendingUrl || "";
}

export function isSyncableUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(url) {
  // Minimal normalization to reduce accidental duplicates.
  // Keep origin + pathname + search; drop hash.
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

export function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function canonicalKeyForUrl(url) {
  // App-level sync key.
  // We use the origin (scheme + host + optional port) as the key.
  const normalized = normalizeUrl(url);
  const u = parseUrl(normalized);
  if (!u) return normalized;
  return `origin:${u.origin}`;
}

export function stableSortStrings(xs) {
  return Array.from(xs).sort();
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

export function computePinnedWindowPlan(pinnedTabs, canonicalMap) {
  // Convert a window's pinned tabs into a plan.
  //
  // canonicalMap: Map<key, url>
  // - key is an app-level membership identity (origin:...)
  // - url is the initial URL used when creating the pinned app tab in new windows
  //
  // Plan output:
  // - create: array of { key, url }
  // - update: array of { tabId, url }   (unused in keep-existing mode; reserved)
  // - removeTabIds: pinned tab ids that should be removed (not canonical, or duplicates)

  const existingByKey = new Map(); // key -> [{id, url}]

  for (const t of pinnedTabs) {
    const rawUrl = getTabUrl(t);
    if (!isSyncableUrl(rawUrl)) continue;

    const normalized = normalizeUrl(rawUrl);
    const key = canonicalKeyForUrl(normalized);

    const list = existingByKey.get(key) || [];
    list.push({ id: t.id, url: normalized });
    existingByKey.set(key, list);
  }

  const desiredKeys = stableSortStrings(canonicalMap.keys());

  const create = [];
  const update = [];
  const removeTabIds = [];

  // Ensure each desired key exists once per window.
  for (const key of desiredKeys) {
    const targetUrl = canonicalMap.get(key);
    const existing = existingByKey.get(key) || [];

    if (existing.length === 0) {
      create.push({ key, url: targetUrl });
      continue;
    }

    // Keep the first one, remove duplicates.
    if (existing.length > 1) {
      removeTabIds.push(...existing.slice(1).map((x) => x.id));
    }

    // Keep-existing mode: do NOT navigate/update the kept tab.
  }

  // Remove pinned tabs that aren't part of canonical keys.
  for (const [key, list] of existingByKey.entries()) {
    if (canonicalMap.has(key)) continue;
    removeTabIds.push(...list.map((x) => x.id));
  }

  return { create, update, removeTabIds };
}
