# nv-pass slice 3: vision carousel in the selection wheel

Michael: "press A or something to have it cycle through like a carousel."

## What changed
- With the wheel open (LB / Tab held) and the vision slot lit, A (pad) / E (keyboard) steps the mode
  night -> thermal -> electro -> night (G100 / G181 stack order, `VISION_WHEEL`). The stack lights the current mode and
  the label names it (no DOM restyle). Releasing LB / Tab selects it. A off the vision slot does nothing.
- The wheel opens on the currently selected mode (`begin(vision.selected)`), not always night.
- The cursor-length pick is gone (`VISION_STEPS`, `visionAt` removed); the duplicate `WHEEL_VISION` is removed (one list:
  `VISION_WHEEL` in `vision.ts`).
- The press is the wheel's: `gadgetSystem.fixedUpdate` clears `interact.pressed` after a cycle. The context menu already
  stands aside while the wheel is open (`aside` includes `wheelOpen`, no rows, opens only on a press) and the rest of
  the step gets the blank input, so A reaches neither the menu nor any other A reader.
- Hint text (gameState `updateGadgetHud`) mentions A / [E] on the vision slot.

## Bindings (confirmed in `src/input`)
- Pad A = `interact` in every weapon state since anim-rework S1 ("Interact always"; reload is X held), so only
  `interact` is read. Keyboard E = `interact` (`keyBindings.ts`). No allocation added (index step on a const list).

## Files
`src/game/selectionWheel.ts` (`nextVision`, `SelectionWheel.cycle`, `begin(mode)`), `src/game/gadgetSystem.ts`,
`src/ui/hud/gadgetWheel.ts` (import + comments), `src/game/gameState.ts` (hint), `tests/selectionWheel.test.ts`,
`scripts/e2e-pad.mjs`, `scripts/e2e-gadgets.mjs`.

## Tests changed
- `selectionWheel.test.ts`: length-pick test replaced by the carousel order and a cycle / begin test; the pick test no
  longer expects electro at the rim.
- `e2e-pad`: LB held, stick up, A x2 -> electro; asserts the wheel opens on night, no active context menu, release
  picks electro (the D-pad toggle check after it still expects electro).
- `e2e-gadgets`: kbm, Tab held, E steps from the selected mode to the next; no active context menu; release selects it.

## Results
- `tsc --noEmit` clean; eslint on touched src / tests clean (scripts are lint-ignored; `node --check` passes);
  vitest `tests/selectionWheel.test.ts` 8 / 8.
- SKIPPED (CT Core holds the desktop lock; the coordinator routes them to the laptop runner): `npm run check`, `npm run
  build`, e2e `smoke e2e-pad e2e-gadgets e2e-mouse` on port 4191.
- Not done: CHANGELOG entry (no "Unreleased - nv-pass" section yet; the job lead's call).

## What Michael should try
Hold LB, push the right stick up onto the vision slot, tap A: the lit tile and label step night -> thermal -> electro
-> night. Let go of LB, then D-pad left: that mode comes on. Reopen the wheel: it starts on that mode. Keyboard: Tab +
mouse up + E.
