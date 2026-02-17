import test from "node:test";
import assert from "node:assert/strict";
import {
  getTabUrl,
  isSyncableUrl,
  normalizeUrl,
  canonicalKeyForUrl,
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
});

test("normalizeUrl drops hash but keeps search", () => {
  assert.equal(
    normalizeUrl("https://example.com/a?x=1#section"),
    "https://example.com/a?x=1"
  );
});

test("canonicalKeyForUrl is origin-level for all sites", () => {
  assert.equal(canonicalKeyForUrl("https://example.com/a"), "origin:https://example.com");
  assert.equal(
    canonicalKeyForUrl("https://gemini.google.com/u/2/gem/x/de2122"),
    "origin:https://gemini.google.com"
  );
});

test("stableSortStrings sorts lexicographically", () => {
  assert.deepEqual(stableSortStrings(["b", "a", "c"]), ["a", "b", "c"]);
});

test("uniqueBy keeps first occurrence", () => {
  const xs = [{ id: 1 }, { id: 2 }, { id: 1 }];
  assert.deepEqual(uniqueBy(xs, (x) => x.id), [{ id: 1 }, { id: 2 }]);
});

test("computePinnedWindowPlan keeps one pinned tab per origin and removes duplicates", () => {
  const canonical = new Map([
    ["origin:https://gemini.google.com", "https://gemini.google.com/"]
  ]);

  const pinnedTabs = [
    { id: 1, pinned: true, url: "https://gemini.google.com/u/2/gem/x/aaaa" },
    { id: 2, pinned: true, url: "https://gemini.google.com/u/2/gem/x/bbbb" }
  ];

  const plan = computePinnedWindowPlan(pinnedTabs, canonical);

  // We already have the app pinned, so no create.
  assert.deepEqual(plan.create, []);

  // Duplicate should be removed.
  assert.deepEqual(new Set(plan.removeTabIds), new Set([2]));
});
