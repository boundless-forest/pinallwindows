import test from "node:test";
import assert from "node:assert/strict";
import { AsyncTaskQueue } from "../src/background/async-task-queue.js";
import { MutationLedger } from "../src/background/mutation-ledger.js";
import { PendingIntentRegistry } from "../src/background/pending-intents.js";
import { createSyncController } from "../src/background/sync-controller.js";
import {
  WINDOW_STATUS_AMBIGUOUS,
  WINDOW_STATUS_ELIGIBLE,
  WINDOW_STATUS_EXCLUDED,
  WindowEligibilityRegistry,
  classifyWindowSnapshot
} from "../src/background/window-eligibility.js";
import { tabToCanonicalEntry } from "../src/shared/tab-utils.js";

class FakeEvent {
  constructor() {
    this.listeners = [];
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  emit(...args) {
    for (const listener of this.listeners) {
      listener(...args);
    }
  }
}

function createFakeChrome() {
  return {
    runtime: {
      onInstalled: new FakeEvent(),
      onStartup: new FakeEvent(),
      onMessage: new FakeEvent()
    },
    windows: {
      onCreated: new FakeEvent(),
      onRemoved: new FakeEvent()
    },
    tabs: {
      onCreated: new FakeEvent(),
      onUpdated: new FakeEvent()
    }
  };
}

function clone(value) {
  return structuredClone(value);
}

class FakeCanonicalStore {
  constructor(origins) {
    this.map = new Map(origins.map((origin) => [`origin:${origin}`, `${origin}/`]));
    this.revision = 1;
    this.initialized = true;
    this.ensureCalls = 0;
    this.rebuildCalls = 0;
  }

  snapshot() {
    return {
      canonicalMap: new Map(this.map),
      initialized: this.initialized,
      revision: this.revision
    };
  }

  async loadSnapshot() {
    return this.snapshot();
  }

  async ensureInitializedSnapshot(tabs = []) {
    this.ensureCalls += 1;
    if (!this.initialized) {
      this.map = new Map();
      for (const tab of tabs) {
        const entry = tabToCanonicalEntry(tab);
        if (entry)
          this.map.set(entry.key, `${new URL(entry.url).origin}/`);
      }
      this.initialized = true;
      this.revision += 1;
    }
    return this.snapshot();
  }

  async save(map) {
    this.map = new Map(map);
    this.revision += 1;
    return this.snapshot();
  }

  async clear() {
    return this.save(new Map());
  }

  async rebuildFromPinnedTabs(tabs) {
    this.rebuildCalls += 1;
    const map = new Map();
    for (const tab of tabs) {
      const entry = tabToCanonicalEntry(tab);
      if (entry)
        map.set(entry.key, `${new URL(entry.url).origin}/`);
    }
    return this.save(map);
  }
}

function createFakeApi(initialWindows, { chrome, onCreate } = {}) {
  const windows = new Map(initialWindows.map((win) => [win.id, clone(win)]));
  const created = [];
  const removed = [];
  let nextTabId = 1000;

  return {
    windows,
    created,
    removed,
    api: {
      async getAllCandidateWindows() {
        return Array.from(windows.values()).map(({ tabs: _tabs, ...win }) => clone(win));
      },
      async getWindowWithTabs(windowId) {
        return windows.has(windowId) ? clone(windows.get(windowId)) : null;
      },
      async createPinnedTab(windowId, url) {
        const tab = {
          id: nextTabId++,
          windowId,
          url,
          pinned: true,
          active: false
        };
        windows.get(windowId).tabs.push(tab);
        created.push(clone(tab));
        chrome?.tabs.onCreated.emit(clone(tab));
        await onCreate?.({ tab, windows, chrome });
        return clone(tab);
      },
      async removeTabs(tabIds) {
        removed.push(...tabIds);
        for (const win of windows.values()) {
          win.tabs = win.tabs.filter((tab) => !tabIds.includes(tab.id));
        }
      },
      async getTab(tabId) {
        for (const win of windows.values()) {
          const tab = win.tabs.find((candidate) => candidate.id === tabId);
          if (tab)
            return clone(tab);
        }
        return null;
      }
    }
  };
}

function createRegistry(api, snapshots = null) {
  let snapshotIndex = 0;
  return new WindowEligibilityRegistry({
    getWindowWithTabs: snapshots
      ? async () => clone(snapshots[Math.min(snapshotIndex++, snapshots.length - 1)])
      : api.getWindowWithTabs,
    observationDelaysMs: [0, 0, 0],
    waitFor: async () => {}
  });
}

test("window eligibility keeps compact normal windows ambiguous", () => {
  assert.equal(classifyWindowSnapshot({
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 360,
    height: 240,
    tabs: [{ id: 10, pinned: false, url: "https://meet.google.com/abc" }]
  }), WINDOW_STATUS_AMBIGUOUS);
});

test("window eligibility stays ambiguous when an old build polluted compact PiP", () => {
  assert.equal(classifyWindowSnapshot({
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 640,
    height: 480,
    tabs: [
      { id: 10, pinned: false, url: "https://meet.google.com/abc" },
      { id: 11, pinned: true, url: "https://a.com/" },
      { id: 12, pinned: true, url: "https://b.com/" }
    ]
  }), WINDOW_STATUS_AMBIGUOUS);
});

test("window eligibility accepts stable tabbed windows and excludes always-on-top", async () => {
  const ordinary = {
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 1200,
    height: 800,
    tabs: [{ id: 10, pinned: false, url: "chrome://newtab" }]
  };
  const ordinaryRegistry = createRegistry(null, [ordinary, ordinary, ordinary]);
  assert.equal((await ordinaryRegistry.observe(1)).status, WINDOW_STATUS_ELIGIBLE);

  const pipRegistry = createRegistry(null, [
    ordinary,
    { ...ordinary, alwaysOnTop: true }
  ]);
  assert.equal((await pipRegistry.observe(1)).status, WINDOW_STATUS_EXCLUDED);
});

test("sync skips an ambiguous Meet-style window", async () => {
  const chrome = createFakeChrome();
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 360,
    height: 240,
    tabs: [{ id: 10, windowId: 1, pinned: false, url: "https://meet.google.com/abc" }]
  }], { chrome });
  const store = new FakeCanonicalStore(["https://a.com"]);
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    windowRegistry: createRegistry(fake.api)
  });

  await controller.runSync("test");

  assert.deepEqual(fake.created, []);
  assert.deepEqual(fake.removed, []);
});

test("first sync defers initialization when no window is eligible", async () => {
  const chrome = createFakeChrome();
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 360,
    height: 240,
    tabs: [{ id: 10, windowId: 1, pinned: true, url: "https://a.com/inbox" }]
  }], { chrome });
  const store = new FakeCanonicalStore([]);
  store.initialized = false;
  store.revision = 0;
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    windowRegistry: createRegistry(fake.api)
  });

  await controller.runSync("test");

  assert.equal(store.initialized, false);
  assert.equal(store.ensureCalls, 0);
  assert.deepEqual(fake.removed, []);
});

test("repair refuses to clear state when no window is eligible", async () => {
  const chrome = createFakeChrome();
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 360,
    height: 240,
    tabs: [{ id: 10, windowId: 1, pinned: false, url: "https://meet.google.com/abc" }]
  }], { chrome });
  const store = new FakeCanonicalStore(["https://a.com"]);
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    queue: new AsyncTaskQueue(() => {}),
    windowRegistry: createRegistry(fake.api)
  });

  await assert.rejects(
    controller.repairPinnedStorage(),
    /No eligible browser window/
  );

  assert.equal(store.rebuildCalls, 0);
  assert.equal(store.map.has("origin:https://a.com"), true);
});

test("sync fills a stable ordinary window", async () => {
  const chrome = createFakeChrome();
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 1200,
    height: 800,
    tabs: [{ id: 10, windowId: 1, pinned: true, url: "https://a.com/inbox" }]
  }], { chrome });
  const store = new FakeCanonicalStore(["https://a.com", "https://b.com"]);
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    windowRegistry: createRegistry(fake.api)
  });

  await controller.runSync("test");

  assert.deepEqual(fake.created.map((tab) => tab.url), ["https://b.com/"]);
  assert.deepEqual(fake.removed, []);
});

test("a real user pin arriving during sync is protected and persisted", async () => {
  const chrome = createFakeChrome();
  const queue = new AsyncTaskQueue(() => {});
  const userTab = {
    id: 30,
    windowId: 1,
    pinned: false,
    url: "https://c.com/work"
  };
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 1200,
    height: 800,
    tabs: [
      { id: 10, windowId: 1, pinned: true, url: "https://a.com/inbox" },
      userTab
    ]
  }], {
    chrome,
    onCreate({ windows }) {
      const liveUserTab = windows.get(1).tabs.find((tab) => tab.id === userTab.id);
      liveUserTab.pinned = true;
      chrome.tabs.onUpdated.emit(
        userTab.id,
        { pinned: true },
        clone(liveUserTab)
      );
    }
  });
  const store = new FakeCanonicalStore(["https://a.com", "https://b.com"]);
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    queue,
    windowRegistry: createRegistry(fake.api),
    setTimer: () => 1,
    clearTimer: () => {}
  });
  controller.registerEventHandlers();

  await controller.runSync("test");
  await queue.whenIdle();

  assert.equal(store.map.has("origin:https://c.com"), true);
  assert.equal(fake.removed.includes(userTab.id), false);
});

test("a real user unpin arriving during sync is not immediately recreated", async () => {
  const chrome = createFakeChrome();
  const queue = new AsyncTaskQueue(() => {});
  const unpinnedTabId = 20;
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 1200,
    height: 800,
    tabs: [
      { id: 10, windowId: 1, pinned: true, url: "https://a.com/inbox" },
      { id: unpinnedTabId, windowId: 1, pinned: true, url: "https://b.com/work" }
    ]
  }], {
    chrome,
    onCreate({ windows }) {
      const liveTab = windows.get(1).tabs.find((tab) => tab.id === unpinnedTabId);
      liveTab.pinned = false;
      chrome.tabs.onUpdated.emit(
        unpinnedTabId,
        { pinned: false },
        clone(liveTab)
      );
    }
  });
  const store = new FakeCanonicalStore([
    "https://a.com",
    "https://b.com",
    "https://c.com"
  ]);
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    queue,
    waitFor: async () => {},
    windowRegistry: createRegistry(fake.api),
    setTimer: () => 1,
    clearTimer: () => {}
  });
  controller.registerEventHandlers();

  await controller.runSync("test");
  await queue.whenIdle();

  assert.deepEqual(fake.created.map((tab) => tab.url), ["https://c.com/"]);
  assert.equal(store.map.has("origin:https://b.com"), false);
});

test("sync abandons a stale plan when canonical revision changes", async () => {
  const chrome = createFakeChrome();
  const store = new FakeCanonicalStore([
    "https://a.com",
    "https://b.com",
    "https://c.com"
  ]);
  let changedRevision = false;
  const scheduledReasons = [];
  const fake = createFakeApi([{
    id: 1,
    type: "normal",
    alwaysOnTop: false,
    width: 1200,
    height: 800,
    tabs: [{ id: 10, windowId: 1, pinned: true, url: "https://a.com/inbox" }]
  }], {
    chrome,
    async onCreate() {
      if (changedRevision)
        return;
      changedRevision = true;
      await store.save(store.map);
    }
  });
  const controller = createSyncController(store, {
    api: fake.api,
    chrome,
    windowRegistry: createRegistry(fake.api),
    setTimer(_callback, _delay) {
      scheduledReasons.push("scheduled");
      return 1;
    },
    clearTimer: () => {}
  });

  await controller.runSync("test");

  assert.equal(fake.created.length, 1);
  assert.equal(scheduledReasons.length, 1);
});

test("mutation ledger matches only the concrete internal tab after creation", () => {
  let now = 100;
  const ledger = new MutationLedger({ now: () => now, ttlMs: 1000 });
  const operation = ledger.beginCreate(1, "origin:https://a.com");

  assert.equal(ledger.matchesInternalTabEvent(
    { id: 10, windowId: 1, pinned: true },
    "origin:https://a.com"
  ), true);

  ledger.attachCreatedTab(operation, 20);

  assert.equal(ledger.matchesInternalTabEvent(
    { id: 20, windowId: 1, pinned: true },
    "origin:https://a.com"
  ), true);
  assert.equal(ledger.matchesInternalTabEvent(
    { id: 21, windowId: 1 },
    "origin:https://a.com"
  ), false);
  assert.equal(ledger.matchesInternalTabEvent(
    { id: 20, windowId: 1, pinned: false },
    "origin:https://a.com",
    false
  ), false);

  now = 1200;
  assert.equal(ledger.matchesInternalTabEvent(
    { id: 20, windowId: 1 },
    "origin:https://a.com"
  ), false);
});

test("pending intents protect conflicting create and remove actions", () => {
  const intents = new PendingIntentRegistry();
  intents.begin({ id: 10, windowId: 1 }, "origin:https://a.com", true);
  intents.begin({ id: 20, windowId: 1 }, "origin:https://b.com", false);

  assert.deepEqual(intents.protectPlan(1, {
    create: [
      { key: "origin:https://b.com", url: "https://b.com/" },
      { key: "origin:https://c.com", url: "https://c.com/" }
    ],
    removeTabIds: [10, 11]
  }), {
    create: [{ key: "origin:https://c.com", url: "https://c.com/" }],
    removeTabIds: [11]
  });
});
