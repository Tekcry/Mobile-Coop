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
- Bindings (section 7 of 1.3.0): gamepad LS move, RS look, LT aim, RT fire, A `cover` (take / leave /
  cover-to-cover), B `crouch` (stand / crouch at high cover), Y `jump` + `interact` (contextual: an interactable
  in reach takes it, else traversal), X tap `reload` / hold (`SWAP_HOLD` 0.35 s) `swapNext`, L3 `dash` (= sprint),
  R3 shoulder, RB/LB weapons (RB `mark` while aiming), 3.2.0: D-pad up / down `speedUp` / `speedDown`, right
  `grenade` (the gadget: hold aims the arc, release throws), left held `gadgetWheel` (`WHEEL_HOLD`, `input/inputState.ts`)
  / tapped `ping` (co-op), View tapped `vision` (goggles) / held (`SWAP_HOLD`) `quick2` (emote 1) - tap / hold by
  `TapHold` (`gamepadMapping.ts`, pure) in `GamepadSource`, as X's reload / swap;
  Y also takedown / execute (contextual); in menus Y = `uiAlt` (`Screen.onAlt`, Loadout: customise). Keyboard (3.0:
  rebindable, `input/keyBindings.ts` pure: `BINDS` defaults, two inputs per action incl. Mouse 3/4/5, `assignBind`
  moves a key off its old action, `settings.keys`; `KeyboardMouseSource` rebuilds its map when the keys change,
  `captureNext` for the rebinding UI; fixed: Esc / Enter / Backspace / arrows, Q / E menu tabs, 1-8 gadgets, LMB fire,
  RMB aim, wheel speed gear (3.2.0)): Space cover, C / Ctrl crouch, Shift sprint, = / - speed gear, E traverse / interact / takedown, F use, R
  reload, Q / X weapons, N goggles, T mark, Y execute, G gadget, Tab wheel (hold), J / K / L emotes, Z ping, V
  shoulder, P pause; mouse look (raw input via `unadjustedMovement` where supported, `mouse.adsMultiplier`).
  In-game key prompts read `ui/prompts.ts` `keyLabels` (set from the bindings). Gamepad look: 30 ms smoothing (acceleration inside the
  smoothing, so releasing never steps the rate).
- Touch (`input/touchControls.ts`): pointer handlers only record state; `update(dt)` (per frame, from
  `InputManager.poll`) turns it into input. Floating move stick on the left half (flick-to-sprint optional, off by
  default); crouch toggle, sprint toggle; camera-only right stick (rate based: dead zone, response curve, 50 ms smoothing, acceleration when
  held at the rim; never fires); optional drag-look in the empty upper right; separate fire button (84 px; optional
  left fire; optional fire drag-look); ADS; goggles (`vision`); jump (3.2.0, `leap`); a contextual action button (`setAction(TouchAction)` from `GameState`:
  use an interactable, else - 3.2.0 - whatever the world prompts show (`ui/hud/worldPrompts.ts`: cover, vault / climb /
  grab / drop, cover-to-cover, corner), dimmed when idle; acts on release). The prompts are indicators only. Secondary buttons >= 56 px. Layout: `settings.touch.layout` (`TOUCH_CONTROL_IDS`, per-control `x, y,
  scale, alpha?`), presets `LAYOUT_PRESETS` (default / claw / lefty), `TOUCH_LAYOUT_VERSION` 3 (v1 layouts keep
  customised placements, the old fire stick and untouched controls take the new defaults; v2 -> v3 keeps every
  stored placement and adds the `takedown` button, shown only while a takedown is on offer, action `interact`; v3 -> v4
  (3.2.0) keeps every stored placement and adds the `speed` rocker: a tall pill (`controlBox`, `controlHtml`), the
  half pressed taps `speedUp` / `speedDown`, six pips from `TouchControls.setGear`). Layout editor: presets,
  size, opacity, thumb-reach overlay, preview.
- `InputState` merges sources per action (down if any source holds it), latches press edges until consumed,
  and `releaseAll()` blocks still-held buttons until released so state changes never cause phantom presses.
- Edges are consumed after each fixed step (gameplay) or by `ScreenManager.update` (menus open).
- `InputManager` owns the active mode (`touch|gamepad|kbm`), sets `body.input-*` classes; CSS uses them to
  show/hide the focus ring, glyph prompts, and the touch layer.
- iOS exposes a controller only after its first button press: `GamepadSource` scans on every poll, not just on
  `gamepadconnected`.
