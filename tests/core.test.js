import test from "node:test";
import assert from "node:assert/strict";
import {
  isSyncableUrl,
  normalizeUrl,
  stableSortUrls,
  uniqueBy
} from "../core.js";

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
