# Menu UI - slice 2 (settings, controls and input parity)

Branch `feature/menu`, 2026-10-18. Prototype first (G87): working and visible, not polished. Desktop only (G12: no
touch, MD16 void). Covers the desktop parts of steps 03 (input parity) and 05 (settings and remap); the step files
stay the full plan.

## Built
- **Menu bindings (step 03 item 1, SPEC 4.2, MD11)**: new actions `uiX` (pad X, key R) and `uiStart` (pad Menu /
  Start). Pad Start is no longer a second Back; it resumes in the pause menu (`PauseScreen.onStart`). `uiAlt` moved
  from E to F (E is tab next only). Space confirms. WASD navigate menus (`MENU_NAV_KEYS` / `menuNavTap` in
  `keyBindings.ts`; not during live play, not in a text field: the source already skips keys typed into inputs).
  Mouse button 4 (`button 3`) is Back while the game does not hold the mouse.
- **Routing (item 2)**: `ScreenManager` routes `uiX` / `uiStart` to `Screen.onX` / `onStart`; the legend's X and
  Start items run the same handlers (`MenuScreen.runLegend`). Legend keyboard glyphs: Esc, Enter, R, F, Q, E.
- **Hover (item 3)**: `FocusNav` focuses the `[data-focus]` under a mouse `pointermove` with real movement (a scroll
  under a still cursor or a pointer-locked mouse never moves focus). A click focuses, then confirms (as before).
- **Cyclers and sliders (item 5)**: `choice` arrows are ◀ ▶ (clickable); a click on the row or a confirm steps to
  the next value; left / right, A / D adjust. Toggles flip on all of these. Holding left / right on a slider steps x5
  after 1.0 s of chained repeats (`adjustHold`, pure, tested; pad repeats from `NavRepeater`, keys from OS repeat).
- **Wrap (item 6)**: up / down wrap only inside the item's own `data-wrap` list (candidates outside it are ignored);
  left / right never wrap; lists without `data-wrap` (grids) never wrap.
- **Tab focus memory (item 7)**: `TabView` remembers the last focused element per tab (`focused` getter, `recall()`)
  and restores it on return.
- **Locked items (item 8)**: `button({ blocked })` sets `data-locked`, the reason in the context panel, a 5 px shake
  and `uiHooks.blocked` (toast + denied sound) on confirm; `lockedRow()` is the row form.
- **Keys (item 9)**: `button()` and the row helpers set `data-key` (from the label slug, or `opts.key`).
- **GAME / SETTINGS (step 05, SPEC 7.11, MD9)** on the `MenuScreen` template: a horizontal tab strip (`TabView`
  `menu: true`: headers clickable but not in the focus order, LB / RB glyphs at both ends, clickable) with Controls,
  Gameplay, Graphics, Audio, Accessibility, Feedback, Data. Rows with section labels (`grp`, not focusable), value
  cyclers, sliders and toggles in the template look; every focusable row has a description in the context panel
  (British spelling, at most two sentences). Controls merges the old Controller and Mouse & Keyboard tabs: Remap
  controls, HOLD OR TOGGLE (Aim, Crouch, Back to wall, Sprint, Grab), CONTROLLER (status line, look H / V, aim,
  curve, three dead zones, invert, aim assist, vibration, rumble strength, test), MOUSE (sensitivity, aim, invert, raw).
  The key list moved to Remap. Legend: Back, Select, LB / RB Category, X Defaults.
- **Defaults per tab (item 4)**: X / R / the legend opens "Reset <tab> to defaults?" with Cancel first and focused;
  it resets that tab only (Controls: gamepad, mouse and the hold / toggle and rumble fields; Gameplay: its four
  fields; Graphics, Audio, Accessibility: their sections). Feedback and Data have no Defaults (nothing to reset).
- **Dialogs (MD18)**: `Dialog` buttons take `safe: true`; a dialog with a safe option opens on it. Cancel is safe in
  Defaults, remap Reset all, Data Import and Reset progress, Feedback Delete all and Delete note.
- **Resolution (item 5)**: the keep dialog lists Revert first and focused; `RES_CONFIRM_S` is 10 s (was 15).
- **Accessibility (item 6)**: Subtitles is a locked row "Always on" (reason "Subtitles carry the story, so they are
  always on."; the setting is forced on); the Controls reference button is gone (MD19).
- **Feedback and Data tabs (item 9)**: restyled as rows with descriptions; the notes list keeps its empty state;
  destructive actions confirm with Cancel first.
- **CONTROLS / REMAP (item 7, SPEC 7.12, MD13)** on the template: tabs Controller / Keyboard and mouse (current
  device first), rows with two binding slots, a capture overlay band (action name, a 5 s countdown, a clickable
  Cancel). Capture cancels with pad Menu / Start (G22, `CAPTURE_CANCEL_BTN`; the old hold-B-1-s cancel is gone, B
  binds), Esc, the Cancel click or the timeout. Conflicts: ⚠ on both rows, the summary line, saved anyway (A30,
  `findConflicts` unchanged). X clears the focused slot, Y Reset all (confirm, Cancel first). Mouse buttons capture on
  the Keyboard and mouse tab as before. Legend: Back, Change, LB / RB Device, X Clear, Y Reset all.
- **e2e-menus (new, REQUIRED, in the `src/ui/` and `src/input/` quick maps)**: main menu and settings by keyboard
  (arrows, WASD, Space, Enter, Esc, Backspace), mouse (hover, click, button 4, every legend item: Back, Select, X,
  LB, the RB glyph, a tab header) and fake pad (A, B, X, LB / RB, Start not Back, hold right accelerates); wrap;
  focus memory per tab; every row has a description; a cycler by ←/→, D, Enter, Space, the ▶ click and a row click;
  Defaults with Cancel focused, Esc safe, Reset; a locked row toasts; remap capture cancelled by Start (pad) and Esc
  (keyboard); glyph switch keyboard <-> pad moves no element (bounding boxes within 0.5 px) on the main menu,
  settings and remap.
- **Shots**: `scripts/menu-shots.mjs` adds `docs/menu-ui/shots/slice2-settings-controls.png`,
  `slice2-settings-row-desc.png` (Look sensitivity focused, its description), `slice2-settings-video.png`,
  `slice2-settings-access.png`, `slice2-settings-data.png`, `slice2-remap-kbm.png`, `slice2-remap-pad.png`,
  `slice2-remap-capture.png` (1920 x 1080, software GL, layout only).

## Files
- New: `scripts/e2e-menus.mjs`, `docs/menu-ui/SLICE2.md`, `docs/menu-ui/shots/slice2-*.png`.
- Input: `src/input/actions.ts` (`uiX`, `uiStart`), `gamepadMapping.ts` (`UI_BINDINGS`), `gamepadSource.ts` (Start
  cancels a capture, B binds), `keyBindings.ts` (`FIXED_KEYS`, `MENU_NAV_KEYS`, `menuNavTap`),
  `keyboardMouseSource.ts` (WASD, mouse button 4).
- UI: `src/ui/screen.ts` (`onX`, `onStart`, routing), `focusNav.ts` (hover, wrap, `adjustHold`), `widgets.ts`
  (`slug`, `ctxHtml`, `describe`, `lockedRow`, keys, shake, slider x5, ◀ ▶, `Dialog` safe, `TabView` menu mode and
  focus memory), `menuScreen.ts` (legend X / Start, key glyphs), `screens/settingsScreen.ts` (rewritten),
  `screens/controlsScreen.ts` (template, overlay, X / Y), `screens/resolutionPicker.ts`, `screens/dataTab.ts`,
  `screens/feedbackScreen.ts` (feedback tab rows), `screens/pauseScreen.ts` (`onStart`), `src/core/display.ts`
  (`RES_CONFIRM_S` 10), `src/styles.css` (a "Menu UI (menu-ui slice 2)" block).
- Tests: `tests/input.test.ts` (menu bindings, WASD, Start), `tests/ui.test.ts` (adjust hold, wrap, slugs),
  `tests/keybinds.test.ts` (Space, E, R, F); `scripts/e2e-pad.mjs` (settings tabs, locked row, remap entry, X clears,
  Start cancels a capture, A then B binds B, Y Reset all with Cancel focused), `scripts/e2e-mouse.mjs` (remap entry),
  `scripts/e2e-desktop.mjs` (Controls first, keys on Remap, 10 s keep), `scripts/run-e2e.mjs` (REQUIRED, COVERS),
  `scripts/menu-shots.mjs`.

## Skipped
- Touch (G12): the Touch tab, tap rules, the layout editor toolbar restyle and its parity mark (step 03 item 4,
  step 05 items 1 and 10); e2e-touch not touched.
- Menu text size, high contrast, reduced motion (no settings exist yet; step 01 items 6-8).
- Player name row and the on-screen keyboard (no name setting exists; step 06). `uiStart` on Enter in text entry.
- Esc as `uiStart` in pause: Esc stays Back there, which resumes too (same effect).
- Status line with the controller's name (it says connected / not detected).
- The dialog band restyle (SPEC 7.23) and the resolution picker in a dialog band: the old dialog look stays.
- Docs the step files list for the commit (LOG, STATE, CHANGELOG, TESTING, `docs/systems/ui.md`,
  `input-and-loop.md`): left to the orchestrator.

## Open items
- Michael: look at the slice 2 shots; the settings rows' widths and the tab strip are first-pass values.
- GPU check on the PC (`E2E_GPU=1`) of settings and remap: pending PC run.
- KBM: R (`uiX`) and F (`uiAlt`) in menus (SPEC open question 1 / MD11) as built; confirm.
- Focus memory uses element references per tab; a tab rebuilt by Defaults falls back to its first row.

## Results (2026-10-18, software GL)
- `npm run check`: lint 0 errors (41 old warnings), 129 test files / 1471 tests pass, build ok.
- e2e on port 4191 (2 at a time): smoke, e2e-menus (new, 49 s), e2e-park, e2e-mouse, e2e-feedback pass. e2e-pad failed
  once on an in-game goggles step (View x3, KNOWN FLAKY, unrelated to menus) and e2e-desktop once on a 60 s match-load
  timeout in part 2 (a 21:9 warehouse load under parallel load); both pass rerun alone (one at a time), including
  every new settings and remap check in e2e-pad and part 1 of e2e-desktop (Remap rebinding, Graphics, the 10 s keep).
- Shots saved (above); the shot script's slice 1 check still reports no box moves on a device switch.
