import test from "node:test";
import assert from "node:assert/strict";
import { resolveShowPinnedTabs } from "../src/shared/preferences.js";

test("show pinned tabs defaults on and only an explicit false hides the section", () => {
  assert.equal(resolveShowPinnedTabs(undefined), true);
  assert.equal(resolveShowPinnedTabs(null), true);
  assert.equal(resolveShowPinnedTabs(true), true);
  assert.equal(resolveShowPinnedTabs(false), false);
});
