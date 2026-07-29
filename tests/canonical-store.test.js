import test from "node:test";
import assert from "node:assert/strict";
import { CanonicalStore } from "../src/background/canonical-store.js";
import {
  STORAGE_INITIALIZED_KEY,
  STORAGE_ORIGINS_KEY,
  STORAGE_REVISION_KEY
} from "../src/background/constants.js";

function installFakeChromeStorage(initialState) {
  const state = structuredClone(initialState);
  globalThis.chrome = {
    runtime: {
      lastError: null
    },
    storage: {
      local: {
        get(keys, callback) {
          const result = {};
          for (const key of keys) {
            if (Object.hasOwn(state, key))
              result[key] = structuredClone(state[key]);
          }
          callback(result);
        },
        set(values, callback) {
          Object.assign(state, structuredClone(values));
          callback();
        },
        remove(keys, callback) {
          for (const key of keys)
            delete state[key];
          callback();
        }
      }
    }
  };
  return state;
}

test("canonical store migrates missing revisions and increments on save", async () => {
  const state = installFakeChromeStorage({
    [STORAGE_ORIGINS_KEY]: ["https://a.com"],
    [STORAGE_INITIALIZED_KEY]: true
  });
  const store = new CanonicalStore();
  const initial = await store.loadSnapshot();

  assert.equal(initial.revision, 0);
  assert.equal(initial.canonicalMap.has("origin:https://a.com"), true);

  initial.canonicalMap.set("origin:https://b.com", "https://b.com/");
  const saved = await store.save(initial.canonicalMap);

  assert.equal(saved.revision, 1);
  assert.equal(state[STORAGE_REVISION_KEY], 1);
  assert.deepEqual(state[STORAGE_ORIGINS_KEY], [
    "https://a.com",
    "https://b.com"
  ]);
});

test("canonical repair uses the supplied eligible-window tabs", async () => {
  const state = installFakeChromeStorage({
    [STORAGE_ORIGINS_KEY]: ["https://old.example"],
    [STORAGE_INITIALIZED_KEY]: true,
    [STORAGE_REVISION_KEY]: 4
  });
  const store = new CanonicalStore();

  await store.rebuildFromPinnedTabs([
    { pinned: true, url: "https://a.com/one" },
    { pinned: true, url: "https://a.com/two" },
    { pinned: true, url: "https://b.com/start" }
  ]);

  assert.equal(state[STORAGE_REVISION_KEY], 5);
  assert.deepEqual(state[STORAGE_ORIGINS_KEY], [
    "https://a.com",
    "https://b.com"
  ]);
});

test("canonical initialization requires eligibility-reviewed tabs", async () => {
  installFakeChromeStorage({});
  const store = new CanonicalStore();

  await assert.rejects(
    store.ensureInitializedSnapshot(),
    /Eligible-window tabs are required/
  );
});
