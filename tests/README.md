# ztab verification

Tests are run with Node's built-in test runner:

- `pnpm test`

The tests cover:

- pure shared logic in `src/shared/` (URL parsing + sync planning);
- window eligibility, compact-window safety, and picture-in-picture ambiguity;
- mutation and pending-user-intent tracking;
- controller-level synchronization with a fake Chrome API.
- window merging: ordering, groups, pinned duplicates, current-page selection,
  partial failures, changing tabs, window eligibility, and sync serialization.

Real Chrome window metadata and UI behavior are still validated manually by loading the extension in `chrome://extensions`.

## Rebrand and upgrade checks in Chrome

These are checks to perform before publishing 1.1.0; the historical window-merge result below does not verify the rebrand.

Verified on 2026-09-06 with Chrome for Testing 153.0.8010.12 on macOS in an isolated profile: the same-ID upgrade retained the hidden-pins preference; ztab branding and settings links appeared correctly; changing the assigned shortcut refreshed its hint after returning; the native shortcut opened the real side panel; ArrowDown and Enter selected and activated a tab in another window; ordinary pin/unpin synchronization and Move worked. The panel document also fit a 320px viewport without horizontal overflow. Store screenshots use the actual native side panel with local sample content.

This smoke check does not verify store-delivered upgrades, Windows/Linux bindings, or a fresh manual Merge here run. Disable Playwright focus emulation before checking native focus and tab reactivation. Local review artifacts are in `output/playwright/`, including `verification.md`, `ztab-options.png`, and `ztab-320.png`; these are excluded from Git and the extension package.

1. Load the prepared package in an isolated profile. Check that Chrome's extension list shows **ztab: Tab Manager**, the toolbar action says **Open ztab**, and the panel and options page use lowercase **ztab**.
2. In a separate upgrade test, load the prior version at a fixed unpacked-extension path, pin sample sites, and turn off **Show pinned tabs**. Record the extension ID and local storage, replace the runtime files at the same path with 1.1.0, and reload. Verify that the ID, shared pinned set, and hidden-pins preference survive. Keep the existing `pinallwindows.*` storage keys.
3. Confirm that normal pin/unpin behavior still works in two eligible windows and newly created pinned copies open the site's root URL. Open a new normal window and verify the same pinned set appears. Closing a pinned copy may restore it; unpinning must remove it from the shared set.
4. Review the generated listing images and actual UI for old displayed names. Historical migration names, existing GitHub URLs, and internal compatibility identifiers are intentional exceptions.
5. After the approved store update is published, separately verify an installed copy updates through the existing store item without losing its data. An unpacked-extension check does not verify store delivery.

## Keyboard and interaction checks in Chrome

1. Open the panel from the toolbar and with `Ctrl+Shift+9` on Windows/Linux or `Command+Shift+9` on macOS. If Chrome assigns a different shortcut or none, the displayed hint must reflect that assignment.
2. Click the shortcut hint in the panel and **Customize shortcut** in settings. Both should open Chrome's extension shortcut settings. Change the assigned shortcut and return to each ztab page; verify that the displayed value refreshes.
3. Focus the tab list. Press `↑` and `↓` to change the selected tab, then `Enter` to activate it and focus its window. Double-clicking a row should also activate it.
4. Use `Tab` and `Shift+Tab` to reach controls, then activate buttons using the keyboard. Verify **Move**, **Close**, **Merge here**, **Refresh**, and the panel's **Settings** link remain reachable with visible focus.
5. Open settings from the panel. Check the keyboard help and the **Show pinned tabs** preference at a narrow panel width; hiding pinned rows must leave synchronization running.

## Window-merge checks in Chrome

1. Open two normal windows, open the panel in the destination, and click **Merge here** on the other window's heading. Verify source tab order, destination selection, and automatic source-window closure.
2. Include named/colored/collapsed groups, shared pinned sites, unique pins, and identical regular URLs. Check that groups and unique pins survive, only shared pinned copies disappear, and regular duplicates stay open.
3. Hide pinned tabs and merge a window containing only pinned tabs. Verify that its heading still offers the merge action.
4. Switch focus between windows with the panel open. **Current window** must still refer to the panel's host. Check the layout at 320px width and keyboard activation of the merge button.
5. During a merge, double-click the action or try another action in the panel. Check that a second operation is prevented. If a tab/window changes or Chrome refuses a move, remaining tabs must stay open and an error must be shown.
6. Verify that popup/floating windows are excluded and merge is unavailable for ambiguous compact windows or across normal/incognito browsing modes. Successful merges show no notice or undo action.

Verified with Chrome for Testing 153.0.8010.12 in an isolated profile on 2026-09-05: actual tab IDs and ordering, current-page selection, shared and special pins, group names/colors/collapse state (including a group-only window), hidden-pins-only windows, keyboard activation, duplicate-click prevention, and the layout at 320px. Chrome unpins tabs during cross-window moves and may expand an active group; the merge restores both states explicitly.
