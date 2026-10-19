# Game loop and input
Purpose: the fixed-step game loop, the action map and the gamepad and keyboard / mouse sources.
Design authority: docs/DECISIONS.md (G16-G24, G96), then docs/design-bible.md (Sections 4 and 8).

Desktop only: pad first, then keyboard and mouse (loco D1, G12). There is no touch input.

## Decided direction
- Decided, not built yet (G96): CT's default pad layout, copied button for button. The CT prototype rebinds the table
  below; until then it is the locomotion run's layout.
- Decided, not built yet (G18): back-to-wall on L3 (code: A, `cover`); A stays for doors and other actions.
- Built in the CT prototype M1 (loco M20 Q8): no sprint. The `dash` action id stays (photo mode's fast pan) but nothing in the
  game binds it: L3 is unbound until M3 puts back-to-wall there.
- Decided, not built yet (G19, G97): a CT pop-up list at doors (open, stealth open, bash, optic cable).
- Decided, not built yet (G23): the CT grab menu (grab first, then knock out, kill or interrogate); no stealth / kill
  selector. Code: `gameplay.grabToggle` decides tap / hold.
- Decided, not built yet (G22): remap capture cancels with Menu / Start or Esc; B stays bindable. Code: B held 1 s or Esc.
- Decided (G21, built): a mission starts holstered; a swap while holstered picks the gun the next aim draws; swap works
  while aiming; grenades and gadgets work holstered.
- Decided (G24, G98, built): emotes and the carried medkit are deleted; View held and the X hold (not aiming) do nothing.

## Game loop
`GameLoop` disables Babylon's automatic physics (`scene.physicsEnabled = false`) and steps Havok itself at a fixed 1/60 s
inside an accumulator (max 4 steps/frame, backlog dropped). Order per step:
`fixedUpdate(dt)` -> `onBeforePhysicsObservable` -> `physics._step` -> `onAfterPhysicsObservable`.
After the steps: `frameUpdate(dt, alpha)` then `scene.render()`.

## Input
- Actions (`input/actions.ts`) are the only thing game / UI code reads. Sources: `GamepadSource` (polled each frame,
  standard mapping in `gamepadMapping.ts`) and `KeyboardMouseSource` (pointer lock in a match, requested by
  `setGameplayActive(true)` on the click that starts / resumes, else any click on the game captures without firing; a
  "click to capture" hint while free; losing it mid-match taps `pause`; mouse buttons are pointer events because Babylon
  cancels canvas `pointerdown`, which suppresses `mousedown`).
- `InputState` merges sources per action (down if any source holds it), latches press edges until consumed, and
  `releaseAll()` blocks still-held buttons until released so state changes never cause phantom presses.
- Edges are consumed after each fixed step (gameplay) or by `ScreenManager.update` (menus open).
- `InputManager` owns the active mode (`InputMode` = `gamepad | kbm`; it starts in `kbm`, a pad disconnect falls back to
  `kbm`) and sets the `body.input-*` classes; CSS uses them for the focus ring and glyph prompts.
- `GamepadSource` scans for pads on every poll, not just on `gamepadconnected` (some browsers expose a pad only after its
  first button press).
- Pad (CT co-op layout, A3, G96): `GAME_BINDINGS` in `gamepadMapping.ts` (raw buttons). `GamepadSource` turns X tap / hold into
  reload / next weapon (`X_HOLD` 0.4 s; the hold swaps only while aiming) with `TapHold`; the other buttons are plain. In menus Y = `uiAlt`
  (`Screen.onAlt`, Loadout: customise); menu buttons are `UI_BINDINGS`.
- Keyboard (rebindable, D7): `input/keyBindings.ts` (pure): `BINDS` defaults, two inputs per action incl. Mouse 3/4/5,
  `settings.keys`; `assignBind` puts a key on a second action as a warned conflict (A71); `KeyboardMouseSource` rebuilds its
  map when the keys change, `captureNext` for the rebinding UI. Fixed: Esc / Enter / Backspace / arrows, Q / E menu tabs,
  1-7 gadgets, LMB fire, RMB aim, the mouse wheel (maximum gear). Mouse look uses raw input via `unadjustedMovement` where
  supported (`mouse.adsMultiplier`, default 0.3 since playtest 2; a saved old default 0.55 / 0.6 migrates, custom values stay;
  the pad uses the same `ADS_LOOK`).
- Prompts (`ui/prompts.ts` `promptHtml`) emit Xbox, PlayStation, Nintendo and key glyphs; the body classes
  (`input-gamepad`, `pad-ps`, `pad-nin`) show the pad glyph whenever a pad is the last device used, keys for KBM.
  `keyLabels` follow the bindings. Gamepad look: 30 ms smoothing (acceleration inside the smoothing).

### Binding table

`tests/input.test.ts` parses this table against `GAME_BINDINGS` and `BINDS`: a Pad name with no bracket is a raw
`GAME_BINDINGS` button for every action of the row (a bracket marks a tap / hold the source decides); each KBM
`` `bindId` (keys) `` is a `BINDS` entry with those default keys raising exactly the row's actions. Edit the table
and the code together.

| Verb | Actions | Pad (Xbox) | PlayStation / Nintendo | KBM | Notes |
|---|---|---|---|---|---|
| Move | `move` | Left stick | Left stick | `forward` (W) `back` (S) `left` (A) `right` (D) | Analog gears within the maximum gear |
| Look | `look` | Right stick | Right stick | Mouse | Free orbit |
| Draw / holster (the aim toggle) | `draw` | X | Square / Y | `draw` (X); RMB | F1a, CT: drawn = the aiming mode (camera over the shoulder, no hold); a climb, a dash or death holsters. Draw 0.5 s pistol / 0.3 s rifle, holster 0.15 s (CT prototype G2, footage) |
| Fire / lethal strike (holstered) | `fire` | RT | R2 / ZR | LMB | No hip fire. Holstered RT / LMB is the lethal palm strike (a kill; a co-op client's strike is a knockout on the host: stub) |
| Knockout / secondary fire | `altFire` | LT | L2 / ZL | `knockout` (Z) | Holstered: the knockout palm strike. Drawn: secondary fire (a stub: fires like RT, no secondary fire exists yet) |
| Reload | `reload` | A (drawn) | Cross / B (drawn) | `reload` (R) | The pad's A reloads instead of interacting while the weapon is drawn |
| Zoom | `zoom` | R3 | R3 / RS | `zoom` (B) | Aiming with a scoped weapon only; normal aim never zooms (G29) |
| Crouch | `crouch` | B | Circle / A | `crouch` (C, Left Ctrl) | Toggle by default; also `drop` |
| Jump / traverse | `jump` | Y | Triangle / X | `jump` (Space) | CT pad (A3, G96): team move > traversal; no longer shares a button with interact |
| Interact / context (doors, takedown) | `interact` | A | Cross / B | `interact` (E) | Takedown > interactable; at a closed door A opens the door menu (G19, G97) |
| Back to wall | `cover` | L3 | L3 / LS | `wall` (Left Shift) | G18, entry by button only (G34); not while aiming; the button again or aiming leaves |
| Max speed up | `speedUp` | D-pad up | D-pad up | `speedUp` (=); wheel up | F1a: the max-speed rocker (stick push and the mouse wheel also set it); gears 1-5 |
| Max speed down | `speedDown` | D-pad down | D-pad down | `speedDown` (-); wheel down | - |
| Switch weapon (next) | `swapNext` | - | - | `nextWeapon` (T) | LB / Tab tap switches weapon (the wheel opens on a hold); also through the wheel |
| Previous weapon | `swapPrev` | - | - | `prevWeapon` (Q) | No pad button |
| Quick-use selected gadget (hold aims, release throws) | `grenade` | D-pad right | D-pad right | `gadget` (G) | F1a: the gadget picked on the wheel; works holstered (G21) |
| Selection wheel (G181) | `gadgetWheel` | LB (hold) | L1 / L | `wheel` (Tab, hold) | Over the live game, no time slow: vision modes (stack at the top), guns with ammo, kit gadgets with counts; right stick / mouse picks, release selects |
| Co-op action | `coop` | RB | R1 / R | `coop` (F, PageDown) | CT's Black button; today the ping, the free moves come with the co-op slices |
| Vision on / off | `vision` | D-pad left | D-pad left | `goggles` (N) | F1a, G181: toggles the mode picked on the wheel (night first), never cycles between modes |
| Shoulder swap | `shoulderSwap` | L3 | L3 / LS | `shoulder` (V) | G17: only while aiming; L3 is the wall button when not aiming (F1a) |
| Mission device | `none` | View (not in yet) | Create / Minus | - | CT's Back button; no action yet |
| Pause | `pause` | Menu | Options / Plus | `pause` (P); Esc | - |

### Remapping and hold / toggle (step 18, D7; local only, D8)
- The table above is the default layout. Pad: `Settings.pad: PadBinds` (`input/padBinds.ts`, `PAD_BINDS`: 14 verbs (A3: ids renamed so an old save's binds are ignored and the CT defaults apply), at
  most 2 buttons each, defaults = `GAME_BINDINGS`); `GamepadSource` rebuilds the flat `padBindTable` only when
  `settings.pad` changes and `mapPad(p, t, table)` reads it. Sticks, the triggers' analog aim / fire and the menu buttons
  (`UI_BINDINGS`) are fixed; LT / RT can take a button verb. Keyboard: `Settings.keys` / `BINDS`.
- Shared-by-design verbs are one row: X = reload (tap) + next weapon (held while aiming), RT = fire / elbow strike.
  The tap / hold splits follow the button. A3 split the old shared Y (jump + interact) and A (context) into Y = jump, A = interact.
- Conflicts (`input/conflicts.ts`, `findConflicts(binds, groups)`): two verbs of one group on one input, once per pair;
  menu keys are their own group; no pair may share (A3 removed the Traverse + Use pair). A conflict is shared, warned on both
  rows and in a summary, and saved (A71).
- Capture: 5 s timeout; keyboard Esc cancels, Backspace clears; pad binds on release, B held `CAPTURE_CANCEL_HOLD` 1 s or
  Esc cancels (G22 changes this), Y on a slot clears. Reset per device with a confirm.
- Hold / toggle in `Settings.gameplay`: `adsToggle` (default hold), `crouchToggle` (default toggle), `sprintHold` (unused since the CT prototype M1: no sprint; default
  toggle), `wallToggle` (default toggle), `grabToggle` (default toggle; hold: letting go knocks out, A70). `access.holdToggle`
  (held interactions) is separate. Nothing in `src/net` reads bindings or these settings.
- In-game pad prompts read the bindings (`verbPromptHtml`, `padButtons` set by `App.applyKeyLabels`).
- (F7) Stored pad binds keep what was saved, so a settings save from an A3 build kept the speed on D-pad left / right
  (and vision on up, sharing it with speed up). `Settings.padV` (`PAD_LAYOUT_V` 2): an older save moves each of vision,
  gadget, speed down and speed up still on its exact A3 button (up / down / left / right) to today's default (left / right /
  down / up); a remapped verb is kept (`migrateA3Dpad`, `tests/settings.test.ts`).

### Analog speed and the maximum gear (step 17)
- The rocker (D-pad up / down since F1a; it was left / right in A3, = / -) and the mouse wheel set the maximum gear 1-5 (`GearState`, `MAX_ROCKER_GEAR`); there is no gear 6
  (the sprint is gone, CT prototype M1). The stick snaps within it (`AnalogGear`, `player/speedGears.ts`, pure): v = cap(max) x
  `stickCurve(mag)`; the gear is the highest g <= max whose up threshold v has passed, kept until v drops under its down
  threshold; speed = cap(g). Thresholds (`GEAR_UP` / `GEAR_DOWN`) are the midpoint of adjacent caps +- 15% of the gap,
  derived from `GEARS` and pinned in `tests/analogGear.test.ts`. Any tilt past the dead zone is gear 1. A keyboard or a
  full stick gives the maximum gear.
- `controller.gear` is the snapped gear while moving, else the maximum (noise, roll, carry caps and MoveState `g` read it);
  `controller.maxGear` is the rocker gear.
- The HUD gear pips are removed (CT prototype M1, G107): the speed rocker has no on-screen indicator.
- Raw stick 50% / 80% / 100% at maximum 5 gives gears 2 / 4 / 5 (pad radial dead zone 0.15).
- The speed numbers are starting values (G10): standing 0.75 / 1.4 / 2.1 / 3.0 / 4.2, crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6 m/s (`GEARS`;
  playtest 2 re-spaced them so the old speed 2 is the slowest). The stick reaches the D-pad speed from 0.9 of its travel
  (`GEARS.fullPush`).

### Rumble (step 17; local only, D8)
- `config/rumble.ts` `RUMBLE` `{strong, weak, ms}`: landing soft / roll / heavy, takedown done, elbow hit, shot suppressed /
  loud, heavy footfall (gear 6 or carrying a body, per foot plant), kill, hurt, explosion. Every rumble goes through
  `InputManager.haptic(kind)` -> `playRumble` (scaled by `gameplay.rumble` 0-1; remote players' events never rumble) ->
  `GamepadSource.rumble` (`gamepad.vibration`, `dual-rumble`). GameState hooks: `player.onLanding`, `player.onFootPlant`,
  the `takedown` / `strike` events, weapon shots, hits and explosions. e2e-pad's fake pad records every `playEffect`
  (`window.__pad.effects`).
- Decided (G67): one shared foot-touched-the-ground event drives footsteps and rumble.
