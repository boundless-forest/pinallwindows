import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MESSAGE_CLEAR_STORAGE,
  MESSAGE_GET_SYNC_DIAGNOSTICS,
  MESSAGE_REPAIR_PINNED_STORAGE,
  STORAGE_INITIALIZED_KEY,
  STORAGE_LEGACY_CANONICAL_KEY,
  STORAGE_ORIGINS_KEY,
  STORAGE_REVISION_KEY,
  STORAGE_SHOW_PINNED_TABS_KEY,
} from "../src/background/constants.js";

test("package metadata presents TabSpan as a cross-window tab manager", async () => {
  const manifestUrl = new URL("../manifest.json", import.meta.url);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

  assert.equal(manifest.name, "TabSpan: Cross-Window Tab Manager");
  assert.equal(
    manifest.description,
    "See, find, move, and manage tabs across every Chrome window from one unified side panel.",
  );
  assert.ok(manifest.name.length <= 75);
  assert.ok(manifest.description.length <= 132);
});

test("rebrand preserves installed extension state and message identifiers", () => {
  assert.deepEqual(
    [
      STORAGE_ORIGINS_KEY,
      STORAGE_INITIALIZED_KEY,
      STORAGE_REVISION_KEY,
      STORAGE_LEGACY_CANONICAL_KEY,
      STORAGE_SHOW_PINNED_TABS_KEY,
    ],
    [
      "pinallwindows.origins",
      "pinallwindows.initialized",
      "pinallwindows.revision",
      "pinallwindows.canonical",
      "pinallwindows.showPinnedTabs",
    ],
  );
  assert.deepEqual(
    [
      MESSAGE_CLEAR_STORAGE,
      MESSAGE_REPAIR_PINNED_STORAGE,
      MESSAGE_GET_SYNC_DIAGNOSTICS,
    ],
    [
      "PINALLWINDOWS_CLEAR_STORAGE",
      "PINALLWINDOWS_REPAIR_PINNED_STORAGE",
      "PINALLWINDOWS_GET_SYNC_DIAGNOSTICS",
    ],
  );
});

test("action shortcut uses the low-conflict numeric binding on every platform", async () => {
  const manifestUrl = new URL("../manifest.json", import.meta.url);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const suggestedKey = manifest.commands?._execute_action?.suggested_key;

  assert.equal(suggestedKey.default, "Ctrl+Shift+9");
  assert.equal(suggestedKey.mac, "Command+Shift+9");
});

test("side panel prioritizes shortcut help above tabs and moves counts below them", async () => {
  const panelUrl = new URL("../side-panel.html", import.meta.url);
  const panel = await readFile(panelUrl, "utf8");
  const shortcutHelpIndex = panel.indexOf('class="shortcut-help"');
  const tabListIndex = panel.indexOf('id="tab-list"');
  const summaryFooterIndex = panel.indexOf('class="summary-footer"');

  assert.ok(shortcutHelpIndex >= 0);
  assert.ok(shortcutHelpIndex < tabListIndex);
  assert.ok(tabListIndex < summaryFooterIndex);
  assert.equal(panel.includes("<h1>Tabs</h1>"), false);
});

test("initial keyboard selection does not outline the active tab", async () => {
  const stylesUrl = new URL("../src/tab-tree.css", import.meta.url);
  const styles = await readFile(stylesUrl, "utf8");
  const activeSelectionRule = styles.match(
    /\.tab-row\.active-row\.selected\s*\{([^}]*)\}/,
  );

  assert.ok(activeSelectionRule);
  assert.match(activeSelectionRule[1], /box-shadow:\s*none;/);
});

test("options page groups display, sync, and troubleshooting controls", async () => {
  const optionsUrl = new URL("../options.html", import.meta.url);
  const options = await readFile(optionsUrl, "utf8");

  assert.match(options, /id="show-pinned-tabs"/);
  assert.match(options, /Pinned tab syncing continues when hidden\./);
  assert.match(options, /Keep pinned tabs in sync/);
  assert.match(options, /id="repair-storage"[^>]*>Resync pinned tabs</);
  assert.match(options, /id="copy-diagnostics"/);
  assert.match(options, /id="clear-storage"[^>]*class="button danger"[^>]*>Reset synced pinned tabs</);
  assert.equal(options.includes("Union mode"), false);
  assert.equal(options.includes("pinned storage"), false);
  assert.equal(options.includes("empty sync state"), false);
});
