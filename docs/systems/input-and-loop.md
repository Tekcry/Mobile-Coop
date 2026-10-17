# Game loop and input
Purpose: the fixed-step game loop, the action map and the touch, gamepad and keyboard / mouse sources.
Design authority: docs/design-bible.md (Sections 4 and 8 (controls))

## Game loop
`GameLoop` disables Babylon's automatic physics (`scene.physicsEnabled = false`) and steps Havok itself at a
fixed 1/60 s inside an accumulator (max 4 steps/frame, backlog dropped). Order per step:
`fixedUpdate(dt)` -> `onBeforePhysicsObservable` -> `physics._step` -> `onAfterPhysicsObservable`.
After the steps: `frameUpdate(dt, alpha)` then `scene.render()`.

## Input
- Actions (`input/actions.ts`) are the only thing game/UI code reads. Sources: `GamepadSource` (polled each
  frame, standard mapping in `gamepadMapping.ts`), `TouchControls` (DOM virtual sticks/buttons, layout from
  settings), `KeyboardMouseSource` (PC browsers: pointer lock in a match - requested by
  `setGameplayActive(true)` on the click that starts / resumes, else any click on the game captures without firing;
  a "click to capture" hint while free; losing it mid-match taps `pause`; mouse buttons are pointer events because
  Babylon cancels canvas `pointerdown`, which suppresses `mousedown`).
- Touch (`input/touchControls.ts`): pointer handlers only record state; `update(dt)` (per frame, from
  `InputManager.poll`) turns it into input. Locomotion step 17 (D1) cut it to the basic scheme: floating move stick on
  the left half (flick-to-sprint optional, off by default; the stick spans gears 1-5, A66), camera-only look stick
  (rate based: dead zone, response curve, 50 ms smoothing, acceleration when held at the rim; never fires) and
  optional drag-look in the empty upper right, aim (ADS), fire (84 px; elbow strike while holstered; optional left
  fire; optional fire drag-look), crouch (toggle), jump (`leap`), vision (goggles), one contextual action button, plus
  reload and pause (A65). The action button (`setAction(TouchAction)` from `GameState`) carries, in order: a gadget
  feed's action, the takedown while one is on offer (tap knocks out, long press lethal; `takedown.touchPress`), the
  door peek, use an interactable, else whatever the world prompts show (`ui/hud/worldPrompts.ts`: vault / climb / grab
  / drop); dimmed when idle; acts on release. The swap, gadget, gadget wheel, sprint, shoulder, ping, speed rocker
  and takedown buttons are gone from the layout and the layout editor. The prompts are indicators only. Secondary
  buttons >= 56 px. Layout: `settings.touch.layout` (`TOUCH_CONTROL_IDS`, per-control `x, y, scale, alpha?`), presets
  `LAYOUT_PRESETS` (default / claw / lefty), `TOUCH_LAYOUT_VERSION` 7 (step 17: stored layouts reset to the defaults).
  Layout editor: presets, size, opacity, thumb-reach overlay, preview. Training: a step with no touch control (the
  gadget, `noTouch`) is skipped while playing by touch (A67).
- `InputState` merges sources per action (down if any source holds it), latches press edges until consumed,
  and `releaseAll()` blocks still-held buttons until released so state changes never cause phantom presses.
- Edges are consumed after each fixed step (gameplay) or by `ScreenManager.update` (menus open).
- `InputManager` owns the active mode (`touch|gamepad|kbm`), sets `body.input-*` classes; CSS uses them to
  show/hide the focus ring, glyph prompts, and the touch layer.
- iOS exposes a controller only after its first button press: `GamepadSource` scans on every poll, not just on
  `gamepadconnected`.

- Bindings: the table below (locomotion step 17, D1: pad first, then keyboard and mouse; touch is the basic
  scheme). Pad: `GAME_BINDINGS` in `gamepadMapping.ts` (raw buttons; `GamepadSource` turns X tap / hold into reload /
  medkit / swap, `MEDKIT_HOLD` 0.4 s, A55; D-pad left tap / hold into ping / wheel and View tap / hold into goggles /
  emote 1 with `TapHold`). In menus Y = `uiAlt` (`Screen.onAlt`, Loadout: customise). Keyboard (rebindable, D7:
  `input/keyBindings.ts` pure: `BINDS` defaults, two inputs per action incl. Mouse 3/4/5, `assignBind` moves a key off
  its old action, `settings.keys`; `KeyboardMouseSource` rebuilds its map when the keys change, `captureNext` for the
  rebinding UI). Fixed: Esc / Enter / Backspace / arrows, Q / E menu tabs, 1-8 gadgets, LMB fire, RMB aim, the wheel
  (maximum gear). Mouse look uses raw input via `unadjustedMovement` where supported (`mouse.adsMultiplier`).
  In-game prompts (`ui/prompts.ts` `promptHtml`) emit Xbox, PlayStation, Nintendo and key glyphs; the body classes
  (`input-gamepad`, `pad-ps`, `pad-nin`) show the pad glyph whenever a pad is the last device used, keys for KBM.
  `keyLabels` follow the bindings. Gamepad look: 30 ms smoothing (acceleration inside the smoothing).

### Binding table

`tests/input.test.ts` parses this table against `GAME_BINDINGS` and `BINDS`: a Pad name with no bracket is a raw
`GAME_BINDINGS` button for every action of the row (a bracket marks a tap / hold the source decides); each KBM
`` `bindId` (keys) `` is a `BINDS` entry with those default keys raising exactly the row's actions. Edit the table
and the code together.

| Verb | Actions | Pad (Xbox) | PlayStation / Nintendo | KBM | Touch (basic scheme) |
|---|---|---|---|---|---|
| Move | `move` | Left stick | Left stick | `forward` (W) `back` (S) `left` (A) `right` (D) | Floating move stick |
| Look | `look` | Right stick | Right stick | Mouse | Look stick / drag in the upper right |
| Aim (draws) | `ads` | LT | L2 / ZL | RMB | Aim button |
| Fire / elbow strike (holstered) | `fire` | RT | R2 / ZR | LMB | Fire button (elbow while holstered) |
| Reload | `reload` | X (tap) | Square / Y | `reload` (R) | Reload button (A65) |
| Crouch | `crouch` | B | Circle / A | `crouch` (C, Left Ctrl) | Crouch button (toggle) |
| Jump / interact / takedown | `jump` `interact` | Y | Triangle / X | `traverse` (E) | Jump button; takedown and use on the context button |
| Use | `interact` | Y | Triangle / X | `use` (F) | Context button |
| Context (back-to-wall, door peek, SWAT) | `cover` | A | Cross / B | `cover` (Space) | Context button |
| Sprint (gear 6) | `dash` | L3 | L3 / LS | `sprint` (Left Shift) | - (flick-to-sprint, optional) |
| Maximum gear up | `speedUp` | D-pad up | D-pad up | `speedUp` (=); wheel up | - (the stick spans gears 1-5, A66) |
| Maximum gear down | `speedDown` | D-pad down | D-pad down | `speedDown` (-); wheel down | - |
| Next weapon | `swapNext` | RB; X (held while aiming, A55) | R1 / R | `nextWeapon` (X) | - |
| Previous weapon | `swapPrev` | LB | L1 / L | `prevWeapon` (Q) | - |
| Gadget (hold aims, release throws) | `grenade` | D-pad right | D-pad right | `gadget` (G) | - |
| Gadget wheel | `gadgetWheel` | D-pad left (hold) | D-pad left | `wheel` (Tab, hold) | - |
| Ping (co-op) | `ping` | D-pad left (tap) | D-pad left | `ping` (Z) | - |
| Vision (goggles) | `vision` | View (tap) | Create / Minus | `goggles` (N) | Vision button |
| Shoulder swap | `shoulderSwap` | R3 | R3 / RS | `shoulder` (V) | - |
| Pause | `pause` | Menu | Options / Plus | `pause` (P); Esc | Pause button |

### Remapping and hold / toggle (step 18, D7; local only, D8)
- The table above is the default layout. Pad: `Settings.pad: PadBinds` (`input/padBinds.ts`, `PAD_BINDS`: 14 verbs,
  at most 2 buttons each, defaults = `GAME_BINDINGS`); `GamepadSource` rebuilds the flat `padBindTable` only when
  `settings.pad` changes and `mapPad(p, t, table)` reads it. Sticks, the triggers' analog aim / fire and the menu
  buttons (`UI_BINDINGS`) are fixed; LT / RT can take a button verb. Keyboard: `Settings.keys` / `BINDS` (unchanged ids).
- Shared-by-design verbs are one row: Y = traverse + use + takedown, X = reload (tap) + medkit (hold, A55), A = the
  context action (back-to-wall, door peek, SWAT), RT = fire / elbow strike. The tap / hold splits follow the button.
- Conflicts (`input/conflicts.ts`, `findConflicts(binds, groups)`): two verbs of one group on one input, once per pair;
  menu keys are their own group; keyboard Traverse + Use may share (both interact). A conflict is shared, warned on
  both rows and in a summary, and saved (A71).
- Capture: 5 s timeout; keyboard Esc cancels, Backspace clears; pad binds on release, B held 1 s or Esc cancels, Y on
  a slot clears (A69). Reset per device with a confirm.
- Hold / toggle in `Settings.gameplay`: `adsToggle` (default hold, `HoldToggle`), `crouchToggle` (default toggle,
  `crouchWanted` / `crouchToggleNext`), `sprintHold` (default toggle, `sprintEdge`), `wallToggle` (default toggle,
  `WallInput.toggle`), `grabToggle` (default toggle = the 3.2.0 grab; hold: letting go knocks out, A70, `grabDecides`).
  `access.holdToggle` (held interactions) is separate. Nothing in `src/net` reads bindings or these settings.
- In-game pad prompts read the bindings (`verbPromptHtml`, `padButtons` set by `App.applyKeyLabels`).

### Analog speed and the maximum gear (step 17, D5.12)
- The rocker (D-pad up / down, = / -) and the mouse wheel set the maximum gear 1-5 (`GearState`, `MAX_ROCKER_GEAR`);
  gear 6 is the sprint only. The stick snaps within it (`AnalogGear`, `player/speedGears.ts`, pure):
  v = cap(max) x `stickCurve(mag)`; the gear is the highest g <= max whose up threshold v has passed, kept until v
  drops under its down threshold; speed = cap(g). Thresholds (`GEAR_UP` / `GEAR_DOWN`) are the midpoint of adjacent
  caps +- 15% of the gap, derived from `GEARS` (`config/movement.ts`) and pinned in `tests/analogGear.test.ts`. Any
  tilt past the dead zone is gear 1. A keyboard or a full stick gives the maximum gear.
- `controller.gear` is the snapped gear while moving, else the maximum (A64: noise, roll, carry caps and MoveState `g`
  read it; no new net field); `controller.maxGear` is the rocker gear. Touch has no rocker: the game sets
  the maximum gear to 5 (`gears.set(5)`) on real touch-stick input, so the touch stick spans gears 1-5 (A66); later gear sets win.
- HUD gear pips (`hud.setGear`): the current gear lit, up to the maximum dim, shown for 1.5 s after a change.
- Raw stick 50% / 80% / 100% at maximum 5 gives gears 2 / 4 / 5 (pad radial dead zone 0.15; A63).

### Rumble (step 17, D5.12; local only, D8)
- `config/rumble.ts` `RUMBLE` `{strong, weak, ms}`: landing soft / roll / heavy, takedown done, elbow hit, shot
  suppressed / loud, heavy footfall (gear 6 or carrying a body, per foot plant), kill, hurt, explosion. Every game
  rumble goes through `InputManager.haptic(kind)` -> `playRumble` (scaled by `gameplay.rumble` 0-1; remote players'
  events never rumble) -> `GamepadSource.rumble` (`gamepad.vibration` on; `dual-rumble`) or a short
  `navigator.vibrate` on touch. GameState hooks: `player.onLanding` (`landingRumble`), `player.onFootPlant`, the
  `takedown` / `strike` events, weapon shots, hits and explosions. e2e-pad's fake pad records every `playEffect`
  (`window.__pad.effects`).

## Medkit binding (locomotion step 15)

- Action `medkit`. Pad: X held 0.4 s (`MEDKIT_HOLD`) while not aiming; a tap stays reload; held while aiming it is still the next-weapon swap (A55). KBM: H (`BINDS` id `medkit`, remappable). Touch: none (D1 basic scheme). In the binding table above (step 17).
