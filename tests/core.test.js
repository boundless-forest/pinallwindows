import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalKeyForUrl,
  getTabUrl,
  isSyncWindow,
  isSyncableUrl,
  normalizeUrl,
  tabToCanonicalEntry
} from "../src/shared/tab-utils.js";
import { computeSyncPlan } from "../src/shared/sync-plan.js";

test("getTabUrl prefers url then pendingUrl", () => {
  assert.equal(getTabUrl({ url: "https://a.com" }), "https://a.com");
  assert.equal(getTabUrl({ url: "", pendingUrl: "https://b.com" }), "https://b.com");
  assert.equal(getTabUrl({ pendingUrl: "https://c.com" }), "https://c.com");
  assert.equal(getTabUrl({}), "");
});

test("isSyncableUrl accepts only http(s)", () => {
  assert.equal(isSyncableUrl("https://example.com"), true);
  assert.equal(isSyncableUrl("http://example.com"), true);
  assert.equal(isSyncableUrl("chrome-extension://id/page.html"), false);
  assert.equal(isSyncableUrl("about:blank"), false);
});

test("normalizeUrl removes hash", () => {
  assert.equal(normalizeUrl("https://example.com/x?a=1#hash"), "https://example.com/x?a=1");
});

test("canonicalKeyForUrl uses origin", () => {
  assert.equal(canonicalKeyForUrl("https://example.com/a"), "origin:https://example.com");
  assert.equal(
    canonicalKeyForUrl("https://gemini.google.com/u/2/gem/x/abc"),
    "origin:https://gemini.google.com"
  );
});

test("tabToCanonicalEntry returns null for non-syncable URLs", () => {
  assert.equal(tabToCanonicalEntry({ url: "chrome://extensions" }), null);
  assert.deepEqual(tabToCanonicalEntry({ pendingUrl: "https://example.com/a#b" }), {
    key: "origin:https://example.com",
    url: "https://example.com/a"
  });
});

test("isSyncWindow allows only normal windows", () => {
  assert.equal(isSyncWindow({ type: "normal" }), true);
  assert.equal(isSyncWindow({ type: "popup" }), false);
  assert.equal(isSyncWindow(null), false);
});

test("computeSyncPlan creates missing tabs and removes duplicates", () => {
  const canonical = new Map([
    ["origin:https://a.com", "https://a.com/home"],
    ["origin:https://b.com", "https://b.com/start"]
  ]);

  const pinnedTabs = [
    { id: 1, pinned: true, url: "https://a.com/chat/1" },
    { id: 2, pinned: true, url: "https://a.com/chat/2" },
    { id: 3, pinned: true, url: "https://c.com/other" }
  ];

  const plan = computeSyncPlan(pinnedTabs, canonical);

  assert.deepEqual(plan.create, [{ key: "origin:https://b.com", url: "https://b.com/start" }]);
  assert.deepEqual(new Set(plan.removeTabIds), new Set([2, 3]));
});
