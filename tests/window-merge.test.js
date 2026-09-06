import test from "node:test";
import assert from "node:assert/strict";
import { AsyncTaskQueue } from "../src/background/async-task-queue.js";
import { MutationLedger } from "../src/background/mutation-ledger.js";
import { createSyncController } from "../src/background/sync-controller.js";
import { mergeWindowTabs } from "../src/background/window-merge.js";
import { buildTabTreeModel, getUnpinnedTabTree } from "../src/shared/tab-tree.js";

function tab(id, overrides = {}) {
  return { id, pinned: false, active: false, groupId: -1, url: `https://example.com/${id}`, ...overrides };
}

function win(id, tabs, overrides = {}) {
  return {
    id, type: "normal", width: 1200, height: 800, incognito: false,
    tabs: tabs.map((item, index) => ({ ...item, windowId: id, index })),
    ...overrides
  };
}

function fakeBrowser(initialWindows, { beforeMove, afterMove } = {}) {
  const windows = new Map(initialWindows.map((item) => [item.id, structuredClone(item)]));
  const calls = [];
  const removed = [];
  const groups = new Map();
  for (const window of windows.values()) {
    for (const item of window.tabs.filter((tab) => tab.groupId >= 0))
      groups.set(item.groupId, { id: item.groupId, windowId: window.id, title: "Research", color: "blue", collapsed: true });
  }

  function reindex(window) {
    window.tabs.forEach((item, index) => { item.index = index; });
  }

  async function move(ids, info, groupId) {
    calls.push({ ids, info, groupId });
    await beforeMove?.({ windows, ids, calls });
    const target = windows.get(info.windowId);
    if (!target)
      throw new Error("No destination window.");
    const moving = ids.map((id) => {
      const source = [...windows.values()].find((item) => item.tabs.some((tab) => tab.id === id));
      if (!source)
        throw new Error("No tab.");
      const movingTab = source.tabs.find((item) => item.id === id);
      source.tabs = source.tabs.filter((item) => item.id !== id);
      reindex(source);
      if (source.tabs.length === 0)
        windows.delete(source.id);
      return { ...movingTab, windowId: target.id, active: false, pinned: false };
    });
    target.tabs.splice(info.index === -1 ? target.tabs.length : info.index, 0, ...moving);
    reindex(target);
    if (groupId !== undefined)
      Object.assign(groups.get(groupId), { windowId: target.id, collapsed: false });
    await afterMove?.({ windows, moving, calls });
    return structuredClone(moving);
  }

  const api = {
    async getWindowWithTabs(id) {
      return structuredClone(windows.get(id) || null);
    },
    async moveTabs(ids, info) {
      return move(ids, info);
    },
    async moveTabGroup(groupId, info) {
      const source = [...windows.values()].find((item) => item.tabs.some((tab) => tab.groupId === groupId));
      return move(source.tabs.filter((item) => item.groupId === groupId).map((item) => item.id), info, groupId);
    },
    async getTabGroup(groupId) {
      return structuredClone(groups.get(groupId) || null);
    },
    async updateTabGroup(groupId, changes) {
      Object.assign(groups.get(groupId), changes);
    },
    async removeTabs(ids) {
      removed.push(...ids);
      for (const window of windows.values()) {
        window.tabs = window.tabs.filter((item) => !ids.includes(item.id));
        reindex(window);
      }
    },
    async updateTab(id, changes) {
      const window = [...windows.values()].find((item) => item.tabs.some((tab) => tab.id === id));
      if (changes.active)
        window.tabs.forEach((item) => { item.active = item.id === id; });
      Object.assign(window.tabs.find((item) => item.id === id), changes);
    }
  };
  return { api, windows, calls, removed, groups };
}

test("merge appends actual tabs in order, including duplicate URLs and Chrome pages", async () => {
  const fake = fakeBrowser([
    win(1, [tab(10, { active: true })]),
    win(2, [tab(20), tab(21, { url: "https://example.com/20" }), tab(22, { url: "chrome://settings" })])
  ]);
  await mergeWindowTabs(2, 1, fake.api);
  assert.deepEqual(fake.windows.get(1).tabs.map((item) => item.id), [10, 20, 21, 22]);
  assert.equal(fake.windows.get(1).tabs.find((item) => item.active).id, 10);
  assert.equal(fake.windows.has(2), false);
  assert.deepEqual(fake.removed, []);
});

test("merge moves groups together at their original position among regular tabs", async () => {
  const fake = fakeBrowser([
    win(1, [tab(10, { active: true })]),
    win(2, [tab(20), tab(21, { groupId: 7 }), tab(22, { groupId: 7 }), tab(23)])
  ]);
  await mergeWindowTabs(2, 1, fake.api);
  assert.deepEqual(fake.windows.get(1).tabs.map((item) => [item.id, item.groupId]), [
    [10, -1], [20, -1], [21, 7], [22, 7], [23, -1]
  ]);
  assert.deepEqual(fake.calls.filter((call) => call.groupId !== undefined).map((call) => call.ids), [[21, 22]]);
  assert.equal(fake.groups.get(7).collapsed, true);
});

test("merge retains target pins, deduplicates shared sites, and moves unique and special pins", async () => {
  const fake = fakeBrowser([
    win(1, [tab(10, { pinned: true, url: "https://mail.example.com/inbox", active: true }), tab(11)]),
    win(2, [
      tab(20, { pinned: true, url: "https://mail.example.com/message/42" }),
      tab(21, { pinned: true, url: "https://calendar.example.com/" }),
      tab(22, { pinned: true, url: "chrome://settings" }),
      tab(23, { pinned: true, url: "chrome://settings" }),
      tab(24)
    ])
  ]);
  await mergeWindowTabs(2, 1, fake.api);
  assert.deepEqual(fake.windows.get(1).tabs.map((item) => [item.id, item.pinned]), [
    [10, true], [21, true], [22, true], [23, true], [11, false], [24, false]
  ]);
  assert.deepEqual(fake.removed, [20]);
  assert.deepEqual(fake.calls.slice(1).map((call) => call.info.index), [1, 2, 3, 4]);
  assert.equal(fake.windows.has(2), false);
});

test("a window containing only shared pins can also be fully merged", async () => {
  const fake = fakeBrowser([
    win(1, [tab(10, { active: true, pinned: true })]),
    win(2, [tab(20, { pinned: true })])
  ]);
  await mergeWindowTabs(2, 1, fake.api);
  assert.equal(fake.windows.has(2), false);
  assert.deepEqual(fake.windows.get(1).tabs.map((item) => item.id), [10]);
});

test("partial failure keeps the remaining window and does not delete any tabs", async () => {
  const fake = fakeBrowser([
    win(1, [tab(10, { active: true, pinned: true })]),
    win(2, [tab(20, { pinned: true }), tab(21), tab(22)])
  ], {
    beforeMove({ calls }) {
      if (calls.length === 2)
        throw new Error("Tabs cannot be edited right now.");
    }
  });
  await assert.rejects(mergeWindowTabs(2, 1, fake.api), /cannot be edited/);
  assert.deepEqual(fake.windows.get(1).tabs.map((item) => item.id), [10, 21]);
  assert.deepEqual(fake.windows.get(2).tabs.map((item) => item.id), [20, 22]);
  assert.deepEqual(fake.removed, []);
});

test("a tab created during merging stays open in the source window", async () => {
  const fake = fakeBrowser([win(1, [tab(10)]), win(2, [tab(20), tab(21)])], {
    afterMove({ windows, calls }) {
      if (calls.length === 1)
        windows.get(2).tabs.push({ ...tab(29), windowId: 2, index: 1 });
    }
  });
  await assert.rejects(mergeWindowTabs(2, 1, fake.api), /New tabs appeared/);
  assert.deepEqual(fake.windows.get(2).tabs.map((item) => item.id), [29]);
  assert.deepEqual(fake.removed, []);
});

test("a tab pinned during a merge is left for a fresh operation", async () => {
  const fake = fakeBrowser([win(1, [tab(10)]), win(2, [tab(20), tab(21)])], {
    afterMove({ windows, calls }) {
      if (calls.length === 1)
        windows.get(2).tabs[0].pinned = true;
    }
  });
  await assert.rejects(mergeWindowTabs(2, 1, fake.api), /Tabs changed/);
  assert.equal(fake.windows.get(2).tabs[0].id, 21);
  assert.equal(fake.windows.get(2).tabs[0].pinned, true);
});

test("changed group membership is not silently moved with a stale plan", async () => {
  const fake = fakeBrowser([win(1, [tab(10)]), win(2, [tab(20), tab(21, { groupId: 7 })])], {
    afterMove({ windows, calls }) {
      if (calls.length === 1)
        windows.get(2).tabs.push({ ...tab(22, { groupId: 7 }), windowId: 2, index: 1 });
    }
  });
  await assert.rejects(mergeWindowTabs(2, 1, fake.api), /group changed/);
  assert.deepEqual(fake.windows.get(2).tabs.map((item) => item.id), [21, 22]);
});

test("an API move that does not transfer the tab is not reported as successful", async () => {
  const fake = fakeBrowser([win(1, [tab(10)]), win(2, [tab(20)])]);
  fake.api.moveTabs = async () => {};
  await assert.rejects(mergeWindowTabs(2, 1, fake.api), /could not be moved/);
  assert.equal(fake.windows.has(2), true);
  assert.deepEqual(fake.removed, []);
});

test("merge restores the current page when Chrome selects an incoming group", async () => {
  const fake = fakeBrowser([win(1, [tab(10, { active: true })]), win(2, [tab(20, { groupId: 7 })])], {
    afterMove({ windows, moving }) {
      windows.get(1).tabs.forEach((item) => { item.active = item.id === moving[0].id; });
    }
  });
  await mergeWindowTabs(2, 1, fake.api);
  assert.equal(fake.windows.get(1).tabs.find((item) => item.active).id, 10);
});

test("merge does not override another destination page selected during the operation", async () => {
  const fake = fakeBrowser([win(1, [tab(10, { active: true }), tab(11)]), win(2, [tab(20)])], {
    afterMove({ windows }) {
      windows.get(1).tabs.forEach((item) => { item.active = item.id === 11; });
    }
  });
  await mergeWindowTabs(2, 1, fake.api);
  assert.equal(fake.windows.get(1).tabs.find((item) => item.active).id, 11);
});

for (const [label, source] of [
  ["closed", null],
  ["popup", win(2, [tab(20)], { type: "popup" })],
  ["floating", win(2, [tab(20)], { alwaysOnTop: true })],
  ["compact", win(2, [tab(20)], { width: 360, height: 240 })],
  ["incognito mismatch", win(2, [tab(20)], { incognito: true })]
]) {
  test(`merge rejects a ${label} source before changing tabs`, async () => {
    const fake = fakeBrowser([win(1, [tab(10)]), ...(source ? [source] : [])]);
    await assert.rejects(mergeWindowTabs(2, 1, fake.api));
    assert.deepEqual(fake.calls, []);
    assert.deepEqual(fake.removed, []);
  });
}

test("merge rejects the same source and target", async () => {
  const fake = fakeBrowser([win(1, [tab(10)])]);
  await assert.rejects(mergeWindowTabs(1, 1, fake.api), /different window/);
  assert.deepEqual(fake.calls, []);
});

test("a destination that disappears between steps leaves remaining tabs untouched", async () => {
  const fake = fakeBrowser([win(1, [tab(10)]), win(2, [tab(20), tab(21)])], {
    afterMove({ windows }) { windows.delete(1); }
  });
  await assert.rejects(mergeWindowTabs(2, 1, fake.api), /could not be moved/);
  assert.deepEqual(fake.windows.get(2).tabs.map((item) => item.id), [21]);
  assert.deepEqual(fake.removed, []);
});

test("window merging waits for existing work on the pinned sync queue", async () => {
  const queue = new AsyncTaskQueue(() => {});
  let releaseSync;
  queue.enqueue("sync", () => new Promise((resolve) => { releaseSync = resolve; }));
  const fake = fakeBrowser([win(1, [tab(10)]), win(2, [tab(20)])]);
  const controller = createSyncController({}, { api: fake.api, chrome: {}, queue });
  const merging = controller.mergeWindows(2, 1);
  await Promise.resolve();
  assert.deepEqual(fake.calls, []);
  releaseSync();
  await merging;
  assert.equal(fake.windows.has(2), false);
  await assert.rejects(controller.mergeWindows("2", 1), /two available/);
});

test("window headings retain merge availability even when all their pins are hidden", () => {
  const tree = getUnpinnedTabTree(buildTabTreeModel([
    win(1, [tab(10)]), win(2, [tab(20, { pinned: true })]),
    win(3, [tab(30)], { width: 360, height: 240 }),
    win(4, [tab(40)], { incognito: true })
  ], 1));
  assert.equal(tree[1].tabs.length, 0);
  assert.equal(tree[1].mergeEligible, true);
  assert.equal(tree[2].mergeEligible, false);
  assert.equal(tree[3].incognito, true);
});

test("pin-transfer mutations are attributed only while the concrete tab is being moved", async () => {
  const ledger = new MutationLedger();
  const fake = fakeBrowser([
    win(1, [tab(10, { pinned: true })]),
    win(2, [tab(20, { pinned: true })])
  ], {
    afterMove({ moving }) {
      assert.equal(moving[0].pinned, false);
      assert.equal(ledger.matchesInternalTabEvent(moving[0]), true);
      assert.equal(ledger.matchesInternalTabEvent({ ...moving[0], id: 99 }), false);
    }
  });
  const updateTab = fake.api.updateTab;
  fake.api.updateTab = async (id, changes) => {
    assert.equal(ledger.matchesInternalTabEvent({ id, pinned: changes.pinned }), true);
    await updateTab(id, changes);
  };
  await mergeWindowTabs(2, 1, fake.api, ledger);
  assert.equal(ledger.matchesInternalTabEvent({ id: 20, pinned: false }), false);
});
