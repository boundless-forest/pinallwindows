// Core utilities for PinAcross.
// Kept dependency-free so we can unit-test with Node.

// Site-specific behavior notes
//
// Some web apps (e.g. Gemini) encode "which session" in the path.
// Others may store session state in cookies/localStorage and use many URLs.
//
// For simplicity, PinAcross supports a small built-in rule:
// - For gemini.google.com: treat the entire site as a single pinned item
//   (origin-level sync), and *replace* the pinned URL globally when the user
//   pins a new Gemini page.

export const GEMINI_HOST = "gemini.google.com";

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

export function isGeminiUrl(url) {
  const u = parseUrl(url);
  return !!u && u.hostname === GEMINI_HOST;
}

export function canonicalKeyForUrl(url) {
  // Compute a stable identity key for sync membership.
  //
  // Default: use normalized URL without hash.
  // Gemini special-case: origin-level key so only one Gemini pinned item exists.
  const normalized = normalizeUrl(url);
  const u = parseUrl(normalized);
  if (!u) return normalized;

  if (u.hostname === GEMINI_HOST) {
    return `origin:${u.origin}`;
  }

  return normalized;
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
  // - key is a membership identity (usually normalized URL, or origin:...)
  // - url is the target URL that should exist for that key
  //
  // Plan output:
  // - create: array of { key, url }
  // - update: array of { tabId, url }   (navigate an existing pinned tab)
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

  // Ensure each desired key exists once.
  for (const key of desiredKeys) {
    const targetUrl = canonicalMap.get(key);
    const existing = existingByKey.get(key) || [];

    if (existing.length === 0) {
      create.push({ key, url: targetUrl });
      continue;
    }

    // Keep the first one, remove duplicates.
    const keep = existing[0];
    if (existing.length > 1) {
      removeTabIds.push(...existing.slice(1).map((x) => x.id));
    }

    // If the kept tab has a different URL than the canonical URL, update it.
    // This is essential for Gemini origin-level sync in "replace with newest" mode.
    if (typeof targetUrl === "string" && keep.url !== targetUrl) {
      update.push({ tabId: keep.id, url: targetUrl });
    }
  }

  // Remove pinned tabs that aren't part of canonical keys.
  for (const [key, list] of existingByKey.entries()) {
    if (canonicalMap.has(key)) continue;
    removeTabIds.push(...list.map((x) => x.id));
  }

  return { create, update, removeTabIds };
}
