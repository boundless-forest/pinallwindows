// Core utilities for PinAcross.
// Kept dependency-free so we can unit-test with Node.

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
