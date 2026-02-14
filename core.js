// Core utilities for PinAcross.
// Kept dependency-free so we can unit-test with Node.

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

export function stableSortUrls(urls) {
  return Array.from(urls).sort();
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

export function computePinnedWindowPlan(pinnedTabs, canonicalSet) {
  // Convert a window's pinned tabs into a plan:
  // - desiredUrls: stable list of canonical URLs
  // - existingByUrl: map url -> [tabId]
  // - createMissingUrls: urls that should be created as pinned tabs
  // - removeTabIds: pinned tab ids that should be removed (not canonical, or duplicates)
  const existingByUrl = new Map();

  for (const t of pinnedTabs) {
    const url = normalizeUrl(getTabUrl(t));
    if (!isSyncableUrl(url)) continue;
    const list = existingByUrl.get(url) || [];
    list.push(t.id);
    existingByUrl.set(url, list);
  }

  const desiredUrls = stableSortUrls(canonicalSet);

  const createMissingUrls = [];
  for (const url of desiredUrls) {
    const list = existingByUrl.get(url);
    if (!list || list.length === 0) createMissingUrls.push(url);
  }

  const removeTabIds = [];
  const kept = new Set();

  for (const [url, ids] of existingByUrl.entries()) {
    if (!canonicalSet.has(url)) {
      removeTabIds.push(...ids);
      continue;
    }
    // Keep one, remove the rest.
    if (ids.length > 1) removeTabIds.push(...ids.slice(1));
    kept.add(url);
  }

  return { desiredUrls, existingByUrl, createMissingUrls, removeTabIds };
}
