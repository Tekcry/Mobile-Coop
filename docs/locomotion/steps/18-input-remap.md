# Step 18 - input-remap (Block C)

Full pad and KBM remapping with conflict warnings and reset; hold / toggle for aim, crouch, back-to-wall, sprint and
grab; persisted in Settings (D7, A3). Deps: 17. Model: implementer opus; checker opus. Local only (D8). (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A and steps 09-17 (verbs and the binding table in docs/systems/input-and-loop.md). Line numbers
verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- DECISIONS.md D7, A3; docs/systems/input-and-loop.md Input section (the step 17 table)
- src/input/gamepadMapping.ts 25-130 (PadTuning :31, GAME_BINDINGS :58-75, TapHold :81, UI_BINDINGS :107, `mapPad`
  :122-130); src/input/gamepadSource.ts 110-140
- src/input/keyBindings.ts 1-213 (BindId :9, BINDS :44, FIXED_KEYS :76, MOUSE_CODES :87, `defaultBinds` :89,
  `sanitizeBinds`)
- src/ui/screens/controlsScreen.ts (all, 116 lines); src/ui/screens/settingsScreen.ts 235-250 (held actions)
- src/core/settings.ts 85-95 (`keys`), 140-160 (`gameplay`, `access.holdToggle` :159), 260-270 (defaults),
  365-480 (`sanitizeSettings`), 486-510 (SettingsStore)
- src/game/takedown.ts 53-66 (GRAB); src/game/takedownController.ts 113-147 (press / hold); src/player/wallController.ts
  (step 11, `wallToggle`); src/player/movement.ts 113-166 (SprintGate); src/player/playerController.ts 405-435 (crouch)

## Task
1. Pad remap: `Settings.pad: PadBinds` (action -> button indices, at most 2 per action), defaults from today's
   GAME_BINDINGS; `mapPad` reads the active table (no allocation per frame: rebuild a flat array on change).
   Sticks and the triggers' analog aim stay fixed; LT / RT as buttons can be remapped.
2. KBM remap: keep `Settings.keys` and BINDS; add every verb from steps 09-17 (medkit, context, vision cycle) to BINDS.
3. Contextual pairs that share one input by design are allowed (Y = jump + interact + takedown, the context action
   carrying back-to-wall / door peek / SWAT, X tap reload + X hold medkit, fire = shot or elbow strike).
4. Pure `findConflicts(binds, groups)`: two gameplay actions on the same input outside the allowed pairs = conflict;
   UI actions are a separate group. The controls screen shows a warning on both rows and a summary line; saving is
   allowed (warning, not a block).
5. Reset to defaults per device (pad, KBM) with a confirm.
6. Controls screen (controlsScreen.ts): a Pad tab and a Keyboard and mouse tab; "press a button" capture with a 5 s
   timeout and Esc / B to cancel; fully usable by pad (FocusNav) and mouse.
7. Hold / toggle settings in `gameplay`: `adsToggle` (aim), `crouchToggle`, `sprintHold` (kept: true = hold),
   new `wallToggle` (default true, toggle) and `grabToggle` (default = today's grab behaviour; the other choice is the
   opposite). Each verb reads its setting; `access.holdToggle` (held interactions) stays separate.
8. Persistence (A3): Settings in IndexedDB `kv/settings` through src/save/db.ts; `sanitizeSettings` fills a missing
   `pad`, `wallToggle`, `grabToggle` with defaults and drops unknown buttons; no SAVE_VERSION change. Never localStorage.
9. Remapped prompts: in-game prompts and the binding table glyphs read the active bindings.
10. Nothing in src/net reads bindings or hold / toggle; remote players behave the same whatever their settings.

## Tests
- tests/padBinds.test.ts: defaults equal the old GAME_BINDINGS; remap, reset, two-input cap; `mapPad` uses the table.
- tests/conflicts.test.ts: allowed pairs pass; a real clash is reported once per pair, both devices.
- tests/settings.test.ts: a literal pre-step settings object (no `pad`, no `wallToggle` / `grabToggle`) sanitizes to
  defaults; garbage button indices dropped; round trip through `SettingsStore` with fake-indexeddb.
- tests/holdToggle.test.ts: each of the five verbs in hold and toggle mode (pure input sequences).
- e2e-pad: remap reload from X to a free button, play: the new button reloads, X does not; remap it onto crouch (B):
  the conflict warning shows; reset restores; wall and crouch in hold and toggle mode.
- e2e-mouse: remap crouch to another key, play; reset; sprint hold vs toggle.
- e2e-touch stays green (touch has no remap).

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-pad e2e-mouse e2e-touch
  e2e-feedback`
- Grep proofs: `grep -rn "localStorage" src/input src/core/settings.ts src/ui/screens/controlsScreen.ts` empty;
  `grep -rn "pad\b\|wallToggle\|grabToggle\|adsToggle" src/net` empty; `grep -n "SAVE_VERSION" src/save/schema.ts`
  unchanged from Block A.

## Commit
"locomotion 18: pad and KBM remapping with conflicts and reset, hold / toggle options"
Then LOG, STATE, AUDIT (V07), CHANGELOG, TESTING, docs/systems/input-and-loop.md, ui.md.
