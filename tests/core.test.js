import test from "node:test";
import assert from "node:assert/strict";
import {
  getTabUrl,
  isSyncableUrl,
  normalizeUrl,
  stableSortUrls,
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

test("stableSortUrls sorts lexicographically", () => {
  assert.deepEqual(stableSortUrls(["b", "a", "c"]), ["a", "b", "c"]);
});

test("uniqueBy keeps first occurrence", () => {
  const xs = [{ id: 1 }, { id: 2 }, { id: 1 }];
  assert.deepEqual(uniqueBy(xs, (x) => x.id), [{ id: 1 }, { id: 2 }]);
});

test("computePinnedWindowPlan plans creates/removes and dedupes", () => {
  const canonical = new Set([
    "https://example.com/a",
    "https://example.com/b"
  ]);

  const pinnedTabs = [
    { id: 1, pinned: true, url: "https://example.com/a" },
    // duplicate A
    { id: 2, pinned: true, url: "https://example.com/a" },
    // extra C (not canonical)
    { id: 3, pinned: true, url: "https://example.com/c" },
    // pending URL should count
    { id: 4, pinned: true, url: "", pendingUrl: "https://example.com/b" }
  ];

  const plan = computePinnedWindowPlan(pinnedTabs, canonical);

  // Nothing missing because A and B exist (B via pendingUrl)
  assert.deepEqual(plan.createMissingUrls, []);

  // Remove duplicate A (id 2) and extra C (id 3)
  assert.deepEqual(new Set(plan.removeTabIds), new Set([2, 3]));
});
