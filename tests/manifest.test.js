import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
