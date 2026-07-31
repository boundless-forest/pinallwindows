import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalKeyForUrl,
  getTabUrl,
  isSyncWindow,
  isSyncableUrl,
  normalizeUrl,
  seedUrlForCanonicalKey,
  tabToCanonicalEntry
} from "../src/shared/tab-utils.js";
import { computeSyncPlan } from "../src/shared/sync-plan.js";
import {
  buildTabTreeModel,
  flattenTabTreeTabs,
  flattenVisibleTabTreeTabs,
  formatShortcut,
  getAdjacentTabId,
  getMoveTargets,
  getPinnedTabs,
  getUnpinnedTabTree
} from "../src/shared/tab-tree.js";

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

test("seedUrlForCanonicalKey stores origin root URL", () => {
  assert.equal(
    seedUrlForCanonicalKey("origin:https://x.com", "https://x.com/home?foo=1"),
    "https://x.com/"
  );
});

test("tabToCanonicalEntry returns null for non-syncable URLs", () => {
  assert.equal(tabToCanonicalEntry({ url: "chrome://extensions" }), null);
  assert.deepEqual(tabToCanonicalEntry({ pendingUrl: "https://example.com/a#b" }), {
    key: "origin:https://example.com",
    url: "https://example.com/a"
  });
});

test("isSyncWindow allows only syncable normal browser windows", () => {
  assert.equal(isSyncWindow({ type: "normal" }), true);
  assert.equal(isSyncWindow({ type: "normal", alwaysOnTop: false }), true);
  assert.equal(isSyncWindow({ type: "normal", alwaysOnTop: true }), false);
  assert.equal(isSyncWindow({ type: "popup" }), false);
  assert.equal(isSyncWindow(null), false);
});

test("isSyncWindow excludes Google Meet automatic picture-in-picture windows", () => {
  assert.equal(isSyncWindow({
    type: "normal",
    alwaysOnTop: true,
    width: 360,
    height: 240,
    tabs: [
      {
        id: 1,
        title: "Google Meet",
        url: "https://meet.google.com/abc-defg-hij"
      }
    ]
  }), false);
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

test("buildTabTreeModel filters popup windows and marks current-window tabs", () => {
  const tree = buildTabTreeModel([
    {
      id: 2,
      type: "normal",
      tabs: [
        { id: 21, index: 1, title: "Later", url: "https://b.com/later" },
        { id: 20, index: 0, title: "Now", url: "https://b.com/now", active: true }
      ]
    },
    {
      id: 1,
      type: "normal",
      tabs: [{ id: 10, index: 0, title: "Other", url: "https://a.com" }]
    },
    {
      id: 3,
      type: "popup",
      tabs: [{ id: 30, index: 0, title: "Popup", url: "https://popup.com" }]
    },
    {
      id: 4,
      type: "normal",
      alwaysOnTop: true,
      tabs: [{ id: 40, index: 0, title: "Meet PiP", url: "https://meet.google.com/abc-defg-hij" }]
    }
  ], 2);

  assert.equal(tree.length, 2);
  assert.equal(tree[0].id, 2);
  assert.equal(tree[0].label, "Current window");
  assert.equal(tree[0].tabs[0].id, 20);
  assert.equal(tree[0].tabs[0].active, true);
  assert.equal(tree[0].tabs[0].isCurrentWindow, true);
  assert.equal(tree[0].tabs[0].windowLabel, "Current window");
  assert.equal(tree[0].tabs[1].active, false);
  assert.equal(tree[1].tabs[0].isCurrentWindow, false);
  assert.equal(tree[1].tabs[0].windowLabel, "Window 2");
});

test("flattenTabTreeTabs and getMoveTargets support tab move picker", () => {
  const tree = buildTabTreeModel([
    { id: 10, type: "normal", tabs: [{ id: 1, index: 0, title: "A", url: "https://a.com" }] },
    { id: 20, type: "normal", tabs: [{ id: 2, index: 0, title: "B", url: "https://b.com" }] }
  ], 10);

  assert.deepEqual(flattenTabTreeTabs(tree).map((tab) => tab.id), [1, 2]);
  assert.deepEqual(getMoveTargets(tree, 10), [
    {
      id: 20,
      label: "Window 2",
      isCurrentWindow: false,
      tabCount: 1
    }
  ]);
});

test("tab tree exposes every pinned tab by window and hides pinned tabs from window sections", () => {
  const tree = buildTabTreeModel([
    {
      id: 10,
      type: "normal",
      tabs: [
        { id: 1, index: 0, pinned: true, title: "Pinned A", url: "https://a.com/one" },
        { id: 2, index: 1, title: "Regular A", url: "https://regular-a.com" }
      ]
    },
    {
      id: 20,
      type: "normal",
      tabs: [
        { id: 3, index: 0, pinned: true, title: "Pinned A copy", url: "https://a.com/two" },
        { id: 4, index: 1, title: "Regular B", url: "https://regular-b.com" }
      ]
    }
  ], 20);

  assert.deepEqual(getPinnedTabs(tree).map((tab) => tab.id), [3, 1]);
  assert.deepEqual(getPinnedTabs(tree).map((tab) => tab.windowLabel), ["Current window", "Window 2"]);
  assert.deepEqual(getUnpinnedTabTree(tree).flatMap((win) => win.tabs.map((tab) => tab.id)), [4, 2]);
  assert.deepEqual(flattenVisibleTabTreeTabs(tree).map((tab) => tab.id), [3, 1, 4, 2]);
});

test("tab tree keeps pinned copies from each window in visible order", () => {
  const tree = buildTabTreeModel([
    {
      id: 10,
      type: "normal",
      tabs: [
        { id: 1, index: 0, pinned: true, title: "Pinned A", url: "https://a.com/one" },
        { id: 2, index: 1, pinned: true, title: "Pinned B", url: "https://b.com/one" }
      ]
    },
    {
      id: 20,
      type: "normal",
      tabs: [
        { id: 3, index: 0, pinned: true, title: "Pinned A copy", url: "https://a.com/two" },
        { id: 4, index: 1, pinned: true, title: "Pinned C", url: "https://c.com/one" }
      ]
    }
  ], 10);

  assert.deepEqual(getPinnedTabs(tree).map((tab) => tab.id), [1, 2, 3, 4]);
});

test("tab tree treats non-http pinned tabs as distinct exact URLs", () => {
  const tree = buildTabTreeModel([
    {
      id: 10,
      type: "normal",
      tabs: [
        { id: 1, index: 0, pinned: true, title: "Extensions", url: "chrome://extensions" },
        { id: 2, index: 1, pinned: true, title: "Settings", url: "chrome://settings" }
      ]
    }
  ], 10);

  assert.deepEqual(getPinnedTabs(tree).map((tab) => tab.id), [1, 2]);
});

test("getAdjacentTabId moves selection and stops at list boundaries", () => {
  const tabs = [{ id: 10 }, { id: 20 }, { id: 30 }];

  assert.equal(getAdjacentTabId(tabs, 20, -1), 10);
  assert.equal(getAdjacentTabId(tabs, 20, 1), 30);
  assert.equal(getAdjacentTabId(tabs, 10, -1), 10);
  assert.equal(getAdjacentTabId(tabs, 30, 1), 30);
  assert.equal(getAdjacentTabId(tabs, null, 1), 10);
  assert.equal(getAdjacentTabId([], null, 1), null);
});

test("formatShortcut uses compact macOS symbols without obscuring other platforms", () => {
  assert.equal(formatShortcut("Command+Shift+9"), "⌘⇧9");
  assert.equal(formatShortcut("Shift+Command+9"), "⇧⌘9");
  assert.equal(formatShortcut("MacCtrl+Alt+P"), "⌃⌥P");
  assert.equal(formatShortcut("Ctrl+Shift+9"), "Ctrl+Shift+9");
});
