# Step 03 - input-parity (Block A)
One focus model for keyboard, mouse, pad and touch (SPEC 4, MD10, MD11, MD16, MD18) and the `e2e-menus` parity suite.
Deps: 02. Model: Opus 5.5 / Opus 5.5. Local only (co-op lobby navigation must still pass e2e-coop).

## Read
- SPEC.md 4 (all), 9; DECISIONS MD10, MD11, MD13, MD16, MD18; prototype keyboard / pointer / `padPoll` handlers.
- `src/input/actions.ts` (UI actions), `src/input/gamepadMapping.ts` (`UI_BINDINGS`, `NavRepeater`),
  `src/input/keyBindings.ts` (`FIXED_KEYS`, `UI_TAPS`, `captureNext`), `src/input/inputManager.ts` (mode switching).
- `src/ui/focusNav.ts` (all), `src/ui/spatial.ts`, `src/ui/screen.ts` `ScreenManager.update`, `src/ui/widgets.ts`
  (`toggle`, `slider`, `choice`, `button` blocked), `src/ui/screens/loadoutScreen.ts` touch double-tap rule (grep 350).

## Task
1. Actions: add `uiX` (pad X, key R) and `uiStart` (pad Menu; key Enter only on typing screens, Esc only in pause);
   `uiAlt` moves from E to F; WASD map to uiUp/Down/Left/Right except while a typing screen or text field is active;
   Space = uiConfirm; mouse button 4 (`auxclick` button 3) = uiBack. Pad Menu stops being uiBack except in pause.
2. ScreenManager routes `uiX`, `uiStart` to `onX`, `onStart`; legend clicks use the same router.
3. Hover: `pointermove` with `pointerType === 'mouse'` and non-zero movement focuses the `[data-focus]` under it (inside
   the active root). A click confirms the clicked item (focus first). Wheel never moves focus.
4. Touch: tap = focus + confirm everywhere (remove the loadout's 350 ms first-tap preview rule).
5. Cyclers (`choice`): confirm = next value; clicking the row = next; arrows ◀ ▶ clickable; left/right adjust.
   Toggles behave as two-value cyclers. Sliders: hold left/right accelerates (x5 step after 1.0 s) for pad and keys.
6. Wrap: up/down wraps within the item's list column (`data-wrap` on lists); grids (`data-grid`) never wrap; left/right
   never wraps.
7. Focus memory per tab: `TabView` stores the last `data-key` per tab and restores it on return.
8. Locked: `button(..., { locked: reason })` stays focusable, gets `data-locked`, shows the reason in the context
   panel, and on confirm shakes and calls `uiHooks.blocked(reason)`.
9. Every focusable gets a stable `data-key` (helpers take a key; default from the label slug).
10. e2e harness `scripts/e2e-menus.mjs`: helpers `drive(device)` for keyboard, mouse (move + click), pad (fake
    Gamepad with `addInitScript`, as e2e-pad does); per screen asserts default focus, moves, confirm, Back target,
    every legend item by click, glyph switch with no bounding-box change. Start with the demo screen and the main menu;
    each later step adds its screens. Add to REQUIRED and to the `src/ui/` and `src/input/` quick maps.

## Tests
- `tests/input.test.ts`: new bindings, WASD suppressed while typing, Menu not Back outside pause.
- `tests/ui.test.ts`: wrap rules, grid no-wrap, tab focus memory.
- e2e-menus as above; e2e-pad, e2e-mouse, e2e-touch, e2e-desktop updated for the changed keys and tap rule.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-pad e2e-mouse
  e2e-touch e2e-desktop e2e-coop e2e-feedback`.
- Grep proof: no `mouseenter`/`mouseover`-only content (`grep -rn "title=" src/ui` shows no tooltip-only text).

## Commit
"menu-ui 03: one focus model for keys, mouse, pad and touch; e2e-menus parity suite"
Then LOG, STATE, CHANGELOG, TESTING, docs/systems/input-and-loop.md (menu bindings table = SPEC 4.2), ui.md.
