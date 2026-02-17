import test from "node:test";
import assert from "node:assert/strict";
import {
  GEMINI_HOST,
  getTabUrl,
  isSyncableUrl,
  normalizeUrl,
  canonicalKeyForUrl,
  isGeminiUrl,
  stableSortStrings,
  uniqueBy,
  computePinnedWindowPlan
} from "../core.js";

test("getTabUrl uses url then pendingUrl", () => {
  assert.equal(getTabUrl({ url: "https://a.com" }), "https://a.com");
  assert.equal(getTabUrl({ url: "", pendingUrl: "https://b.com" }), "https://b.com");
  assert.equal(getTabUrl({ pendingUrl: "https://c.com" }), "https://c.com");
  assert.equal(getTabUrl({}), "");
});

test("isSyncableUrl accepts http(s) only", () => {
  assert.equal(isSyncableUrl("https://example.com"), true);
  assert.equal(isSyncableUrl("http://example.com"), true);
  assert.equal(isSyncableUrl("chrome://extensions"), false);
  assert.equal(isSyncableUrl("about:blank"), false);
  assert.equal(isSyncableUrl(""), false);
  assert.equal(isSyncableUrl(null), false);
});

test("normalizeUrl drops hash but keeps search", () => {
  assert.equal(
    normalizeUrl("https://example.com/a?x=1#section"),
    "https://example.com/a?x=1"
  );
});

test("Gemini detection works", () => {
  assert.equal(isGeminiUrl(`https://${GEMINI_HOST}/u/2/gem/x/y`), true);
  assert.equal(isGeminiUrl("https://example.com/x"), false);
});

test("canonicalKeyForUrl uses origin-level key for Gemini", () => {
  assert.equal(
    canonicalKeyForUrl(`https://${GEMINI_HOST}/u/2/gem/a/b`),
    `origin:https://${GEMINI_HOST}`
  );
});

test("canonicalKeyForUrl uses normalized URL for non-Gemini", () => {
  assert.equal(
    canonicalKeyForUrl("https://example.com/a#x"),
    "https://example.com/a"
  );
});

test("stableSortStrings sorts lexicographically", () => {
  assert.deepEqual(stableSortStrings(["b", "a", "c"]), ["a", "b", "c"]);
});

test("uniqueBy keeps first occurrence", () => {
  const xs = [{ id: 1 }, { id: 2 }, { id: 1 }];
  assert.deepEqual(uniqueBy(xs, (x) => x.id), [{ id: 1 }, { id: 2 }]);
});

test("computePinnedWindowPlan updates origin-level (Gemini) to newest URL", () => {
  const canonical = new Map([
    // One gemini canonical item, targeting chat B
    [`origin:https://${GEMINI_HOST}`, `https://${GEMINI_HOST}/u/2/gem/x/bbbb`]
  ]);

  const pinnedTabs = [
    // Existing pinned gemini tab currently at chat A
    { id: 10, pinned: true, url: `https://${GEMINI_HOST}/u/2/gem/x/aaaa` }
  ];

  const plan = computePinnedWindowPlan(pinnedTabs, canonical);

  // No need to create (we already have one gemini pinned tab)
  assert.deepEqual(plan.create, []);

  // But we should update it to canonical URL (bbbb)
  assert.deepEqual(plan.update, [
    { tabId: 10, url: `https://${GEMINI_HOST}/u/2/gem/x/bbbb` }
  ]);

  // Nothing to remove
  assert.deepEqual(plan.removeTabIds, []);
});

test("computePinnedWindowPlan removes extra gemini pinned tabs (duplicates)", () => {
  const canonical = new Map([
    [`origin:https://${GEMINI_HOST}`, `https://${GEMINI_HOST}/u/2/gem/x/cccc`]
  ]);

  const pinnedTabs = [
    { id: 1, pinned: true, url: `https://${GEMINI_HOST}/u/2/gem/x/aaaa` },
    { id: 2, pinned: true, url: `https://${GEMINI_HOST}/u/2/gem/x/bbbb` }
  ];

  const plan = computePinnedWindowPlan(pinnedTabs, canonical);

  // Keep first, remove duplicate
  assert.deepEqual(new Set(plan.removeTabIds), new Set([2]));
});
