# Game loop and input
Owner: Player Build. Status: current.
Purpose: the fixed-step game loop, the action map and the gamepad and keyboard / mouse sources.
Design authority: docs/DECISIONS.md (G16-G24, G96, G210, G227), then docs/design-bible.md (Sections 4 and 8).

Desktop only: pad first, then keyboard and mouse (loco D1, G12). No touch movement or combat (M21).

Game touch (marlow-bays item 29, Michael's scope "Menus + camera"; menu taps and touch look are a recorded exception to
desktop only, G395; `input/touchLook.ts` pure, wired in
`InputManager`; e2e: `e2e-menus` "game touch"):
- Every menu and the pause menu take a tap (FocusNav items are buttons: a tap is a click), the Back legend too.
- In play one finger dragged on the game view looks around (`TouchLook`, `TOUCH_LOOK_RAD_PER_PX` x the mouse
  sensitivity and invert). Camera only: a touch never moves, fires or aims, and never changes the input mode (the hint
  glyphs stay). Not while the tuner has the pointer (its own touch camera).
- An on-screen pause button (`.touch-pause`, top centre) shows in play only while the last input was a touch (body
  class `touch-play`; a mouse press, a key or the pad hides it); a tap pauses. Hidden in the Anim Studio.

## Decided direction
- Built (CT prototype F1a): G18, back-to-wall on L3, and G17, the shoulder swap only while aiming (binding table). G96's
  CT pad layout is the base of the table; the anim-rework (S1, below) set aim, holster and strike. Michael tunes the
  rest by hand (G227); the binding table below is what is built.
- Built in the CT prototype M1 (loco M20 Q8): no sprint. The `dash` action id stays (photo mode's fast pan) but nothing in the
  game binds it.
- Built (G19, G97, G23; one menu since CT prototype G5, Michael 2026-10-19: "identical"): the CT context action menu.
  See "The context action menu (G5)" below.
- Decided, not built yet (G22): remap capture cancels with Menu / Start or Esc; B stays bindable. Code: B held 1 s or Esc.
- Decided (G21, built): a mission starts holstered; a swap while holstered picks the gun the next aim draws; swap works
  while aiming; grenades and gadgets work holstered.
- Decided (G24, G98, built): emotes and the carried medkit are deleted; View held does nothing.
- Built (anim-rework S1, Michael 2026-10-20, M1-M4, A1-A3; `docs/archive/anim-rework/BRIEF.md` section 1): the analogue
  speed (no gears), the three weapon states (holstered / low ready / aiming), LT held aims, X tap holsters / draws and X
  held reloads, RT tap knockout / hold kill, traversal holsters and returns the state. This replaces the F1a draw toggle
  and the step 17 speed gears; `docs/ct-prototype/CT-CONTROLS.md` is history.
- No aim assist on any input (G16, built: no-aim-assist 2026-10-21). The pad settings have no `aimAssist` field; an old
  stored value is dropped by `sanitizeSettings` (no save change: settings are not in the save schema).

## Game loop
`GameLoop` disables Babylon's automatic physics (`scene.physicsEnabled = false`) and steps Havok itself at a fixed 1/60 s
inside an accumulator (max 4 steps/frame, backlog dropped). Order per step:
`fixedUpdate(dt)` -> `onBeforePhysicsObservable` -> `physics._step` -> `onAfterPhysicsObservable`.
After the steps: `frameUpdate(dt, alpha)` then `scene.render()`.
Pause and resume (havok-stall): a frame's real time is capped (250 ms between ticks, 0.1 s fed in), `timeScale` 0 (the
tuner's freeze) adds nothing to the accumulator, so releasing it after any real time runs at most 4 steps and physics
always gets exactly 1/60 s. A NaN or negative interval or time scale counts as 0 (it once could poison the accumulator
and stop the sim for good). `tests/havokStall.test.ts`.
Hidden-page tick (coop-fix): a live co-op session (any transport; not in automated browsers, `navigator.webdriver`, whose e2e pumps step hidden pages themselves) holds `loop.holdBackgroundTicks()` (counted,
released at its dispose). While `document.hidden` (rAF stopped: another window over it, minimised), a bundled worker
(`core/bgTickWorker.ts`, 30 Hz) runs the same steps and frame updates for the elapsed time (capped 0.1 s,
`core/bgTick.ts`) without rendering. rAF and the ticks share `lastT`, so time is consumed once; a `stepHeadless`
call in the last second, or manual mode, stands the tick down. Single player never starts the worker.

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
- Pad (anim-rework S1, `docs/archive/anim-rework/BRIEF.md` section 1): `GAME_BINDINGS` in `gamepadMapping.ts` (raw
  buttons). LT is the held aim (`ads`, analog), RT `fire`. X is the plain `draw` button: the player reads its tap / hold
  (`player/weaponStance.ts`). A is always interact (Michael 2026-10-20 14:55: "Interact always"; it no longer
  reloads with the gun out). D-pad up / down are free in play; they step the held context menu (`CTX_BINDINGS`,
  `ctxUp` / `ctxDown`, fixed). In menus Y = `uiAlt` (`Screen.onAlt`, Loadout: customise); menu buttons are `UI_BINDINGS`.
- Keyboard (rebindable, D7): `input/keyBindings.ts` (pure): `BINDS` defaults, two inputs per action incl. Mouse 3/4/5,
  `settings.keys`; `assignBind` puts a key on a second action as a warned conflict (A71); `KeyboardMouseSource` rebuilds its
  map when the keys change, `captureNext` for the rebinding UI. Fixed: Esc / Enter / Backspace / arrows, Q / E menu tabs,
  1-7 gadgets, LMB fire, RMB the held aim, the mouse wheel (the held context menu's highlight). (A1) WASD walk; the
  `run` (Left Shift) and `creep` (Left Alt) binds held set the move's magnitude (`KBM_PACE`: the run, the creep), no
  action. Mouse look uses raw input via `unadjustedMovement` where
  supported (`mouse.adsMultiplier`, default 0.3 since playtest 2; a saved old default 0.55 / 0.6 migrates, custom values stay;
  the pad uses the same `ADS_LOOK`).
- Prompts (`ui/prompts.ts` `promptHtml`) emit Xbox, PlayStation, Nintendo and key glyphs; the body classes
  (`input-gamepad`, `pad-ps`, `pad-nin`) show the pad glyph whenever a pad is the last device used, keys for KBM.
  `keyLabels` follow the bindings. Gamepad look: 30 ms smoothing (acceleration inside the smoothing).

### Weapon states (anim-rework S1, M1-M4, A2, A3; `player/weaponStance.ts`)
Michael 2026-10-20: "i want to make LT the aim, held, not toggled. There should be 3 character states. Holstered, low
ready, aiming." Every number is a starting value.

| State | How you get there | Camera | RT / LMB |
|---|---|---|---|
| Holstered | X tap from low ready (or while aiming); a match start, a death | Explore | Tap: knockout (palm strike); hold 0.35 s: kill (M3) |
| Low ready | X tap from holstered (the draw starts on the press); LT let go | Explore | Nothing (A3) |
| Aiming | LT / RMB held (release: low ready); never a toggle (Michael 15:25 "Remove it") | Over the shoulder | Fire |
| Sling draw | LT from holstered: straight to the aim, the draw x `STANCE.slingDrawMult` 1.6 (M2; the existing draw path slowed until slice 3's clip) | Over the shoulder (slower blend) | Fire once drawn and in |

- X held `STANCE.xHold` 0.4 s while the gun is out reloads (A2, Michael 14:55: X hold only, A no longer reloads); with
  nothing to reload the hold holsters. KBM R reloads too (from holstered it draws to low ready first, A43).
- A interacts in every state ("Interact always"): doors, items and the context menu at low ready and aiming too.
- Holding a guard: X does nothing; RT tap the knockout, RT hold the kill, KBM Z the knockout; LT aims the pistol over
  his shoulder (the human shield; RT then fires). The grab itself stays on the context menu (GRAB CHARACTER, BACK TO GAME).
- (M4) A traversal (Y), an attach (ladder, pipe, hang; except the one-handed sidearm aim), a team move, a takedown, a
  carry or a strike holds the state: the gun goes away for it (`Player.weaponSuspend`) and the state it had comes back
  when it ends (low ready, or the aim while LT is still held). An X press during it is ignored.
- The host's forced holster (D8) holsters the state too. Death resets to holstered.
- The pistol jammer (CT prototype B3; Michael 14:55 "Another button - what makes sense? RF?", read as RB): the co-op
  button (pad RB, KBM F / PageDown) held while aiming the drawn pistol jams the camera or laser under the reticle (the
  charge drains while held, `game/jammer.ts` `JAMMER`). Aiming alone never jams. Not aiming the pistol, RB / F is the
  co-op action as before; aiming the pistol, no team move starts. KBM: F (the co-op key) so one rule covers both devices.
- `Player.weaponState` ('holstered' / 'lowReady' / 'aiming' / 'slingDraw') and `Player.drawWanted` are what the anim code
  reads; the wire is unchanged (the remote poses from `MoveState.dw` and `r`; PROTOCOL_VERSION 24).

### Binding table

`tests/input.test.ts` parses this table against `GAME_BINDINGS` and `BINDS`: a Pad name with no bracket is a raw
`GAME_BINDINGS` button for every action of the row (a bracket marks a tap / hold or a context the source or the game
decides); each KBM `` `bindId` (keys) `` is a `BINDS` entry with those default keys raising exactly the row's actions.
Edit the table and the code together.

| Verb | Actions | Pad (Xbox) | PlayStation / Nintendo | KBM | Notes |
|---|---|---|---|---|---|
| Move | `move` | Left stick | Left stick | `forward` (W) `back` (S) `left` (A) `right` (D) | anim-rework S1: the deflection sets the speed continuously (no gears); WASD walk |
| Run (held) | `move` | Left stick (the last fifth) | Left stick | `run` (Left Shift) | A1; the move's magnitude, no action |
| Creep (held) | `move` | Left stick (a slight tilt) | Left stick | `creep` (Left Alt) | A1; the move's magnitude, no action |
| Look | `look` | Right stick | Right stick | Mouse | Free orbit |
| Aim (held) | `ads` | LT | L2 / ZL | RMB | Release: low ready. From holstered: the sling draw (slower, M2). No toggle option |
| Holster / draw; reload (held) | `draw` | X (tap / hold) | Square / Y | `draw` (X) | M1: tap holstered <-> low ready (aiming: holsters); A2: held 0.4 s with the gun out reloads (nothing to reload: holsters) |
| Fire / strike | `fire` | RT | R2 / ZR | LMB | A3: fires only while aiming. Holstered or holding a guard (M3): tap knockout, hold 0.35 s kill |
| Knockout (keyboard) | `altFire` | - | - | `knockout` (Z) | Holstered or holding a guard: the knockout. No pad button |
| Reload | `reload` | X (hold, gun out) | Square / Y (hold) | `reload` (R) | A2 (Michael 14:55): X held only on the pad; A always interacts |
| Zoom | `zoom` | R3 | R3 / RS | `zoom` (B) | Aiming with a scoped weapon only; normal aim never zooms (G29). R3 is shared with Ping by context (optic-coop M2): aiming a scoped weapon R3 is Zoom only |
| Crouch | `crouch` | B | Circle / A | `crouch` (C, Left Ctrl) | Toggle by default; also `drop` |
| Jump / traverse | `jump` | Y | Triangle / X | `jump` (Space) | Team move > traversal. M4: a gun out goes away for the move and comes back after. A closed vent: the press starts it, a tap kicks, a hold unscrews (vent-kick, M1, pad and keyboard alike: Y / Space held is no kick and carries into A / E, so Y / Space held, or Y / Space then A / E held, unscrews; A / E let go mid-way stops) |
| Interact / context (doors, takedown) | `interact` | A | Cross / B | `interact` (E) | G5: the context action menu (hold = the list, release = run the highlighted row; below). Every weapon state ("Interact always") |
| Back to wall | `cover` | L3 | L3 / LS | `wall` (Caps Lock) | G18, entry by button only (G34); not while aiming; the button again or aiming leaves. KBM moved off Left Shift (the run, A1) |
| Context menu highlight | `ctxUp` `ctxDown` | D-pad up (menu held); D-pad down (menu held) | D-pad up / down | Mouse wheel | Fixed. In play D-pad up / down and = / - are unbound (no speed gears) |
| Switch weapon (next) | `swapNext` | - | - | `nextWeapon` (T) | LB / Tab tap switches weapon (the wheel opens on a hold); also through the wheel |
| Previous weapon | `swapPrev` | - | - | `prevWeapon` (Q) | No pad button |
| Quick-use selected gadget (hold aims, release throws) | `grenade` | D-pad right | D-pad right | `gadget` (G) | F1a: the gadget picked on the wheel; works holstered (G21) |
| Selection wheel (G181) | `gadgetWheel` | LB (hold) | L1 / L | `wheel` (Tab, hold) | Over the live game, no time slow: vision modes (stack at the top; A / E on the slot cycles them), guns with ammo, kit gadgets with counts; right stick / mouse picks, release selects. Opens on the vision slot (A / E cycles with no stick); the stick let go (mouse back in the centre) returns to it, sector-fixes W |
| Co-op action; jammer (aiming the pistol) | `coop` | RB | R1 / R | `coop` (F, PageDown) | CT's Black button: team moves; held while aiming the drawn pistol, the jammer (Michael 14:55) |
| Vision on / off | `vision` | D-pad left | D-pad left | `goggles` (N) | F1a, G181: toggles the mode picked on the wheel (night first), never cycles between modes |
| Shoulder swap | `shoulderSwap` | L3 | L3 / LS | `shoulder` (V) | G17: only while aiming; L3 is the wall button when not aiming (F1a) |
| Mission device | `none` | View (not in yet) | Create / Minus | - | CT's Back button. Decided, not built yet (G343, G351; owner bible 5.10): a tap on View / Select or O (keyboard) shows the current objective, what and where, for about 5 s (ui.md, HUD) |
| Ping (co-op) | `ping` | R3 | R3 / RS | `ping` (Middle mouse) | optic-coop M2 (Michael 2026-10-24: "Bind ping: middle mouse on keyboard, R3 on pad; it works from the optic view too"): marks the spot or guard under the crosshair for the team; in the optic view it casts from the tip from the view's first step (`OpticSystem.tipRay`). R3 is also Zoom, by context (Michael 2026-10-24 ~14:55: "contextual: R3 pings normally and zooms only while aiming a scoped weapon (no ping while scoped). Keyboard: middle mouse pings."): aiming a scoped weapon R3 zooms and does not ping, otherwise it pings and does not zoom (`contextPing` / `contextZoom`, `input/conflicts.ts`); an allowed pair, no conflict. Middle mouse pings in any state |
| Pause | `pause` | Menu | Options / Plus | `pause` (P); Esc | - |

### The context action menu (CT prototype G5, `game/contextMenu.ts`, AUDIT-ACTIONMENU)
- One list for everything in reach, refilled every fixed step (`GameState.contextMenuStep`, first in the step) by
  providers in CT order: while a guard is held only INTERROGATE, for a guard with information (none have any yet, so no
  menu), and no BACK TO GAME (Michael 2026-10-20 08:10 / 08:25; `grabMenu.ts`); else the takedown on offer (GRAB
  CHARACTER from behind; one named row, a knockout, for the other takedowns; none where only a lethal one is allowed),
  the door set of the closed, unlocked door faced (OPEN DOOR, OPEN DOOR
  STEALTH when the peek is on offer, BASH DOOR, OPTIC CABLE; `doorMenu.ts`), else (optic-coop M1) the set of the optic
  gap in reach (a hatch, ceiling panel, grille or shaft top within 1.6 m, in front unless at the feet: OPEN TRAP only
  where a closed panel covers it (`OpticPoint.trap`), then OPTIC CABLE; `gapMenu.ts`; refusals "Too far" / "No gap" as
  at a door), then the item in reach or the carry target (its label; a door's own item reads OPEN DOOR / CLOSE DOOR).
- States: none (nothing in reach); passive (the list shows, header INTERACT, no highlight, walking free); active (A
  held: header BACK TO GAME, row 1 highlighted in the press step, the operator stands still, the camera is free). The
  highlight moves one row per step, no wrap: D-pad up / down and the mouse wheel (`ctxUp` / `ctxDown`) always; the stick, W / S and the arrows once the
  stick has been back under 0.25 since A went down (`CtxNav`; the pad's own stick repeat). BACK TO GAME is a row above
  row 1. Releasing A runs the highlighted row; on BACK TO GAME nothing. A quick tap runs row 1. B closes the held list
  with no action. Holding a guard (Michael 08:10 / 08:20; anim-rework S1, M3): RT tap knocks out, RT hold kills (not
  aiming; KBM LMB tap / hold, Z the knockout), LT / RMB aims the pistol over his shoulder (the human shield), nothing
  lets him go (B, Y, back do nothing). A row with a hold time (a hack, a medkit station, an alarm
  panel) fills while A stays on it and runs once full (a fill line on the row); let go early and nothing happens.
- A belongs to the menu while a list is up or its press is still held (`ctxOwnsA`): the door peek, traversal's held use
  (vents) and the takedown press see it up. The menu stands aside (no list, A goes where it went before G5) while down,
  in a team move (the hanging partner's panel at Marlow Yard station 5 is still a direct press), a door peek, a remote
  view or the wheel, and while a takedown, a finisher or a lift runs.
- Rows run through the same calls as before (`takedown.start`, `takedown.menuPick`, `doorMenuPick`, the item's
  `onUse`), so co-op is unchanged (no wire change).
- Scripted taps (`InputState.tap('interact')`: pressed with no down) keep the pre-G5 one-press controls for tests and
  tools: on a door set the tap opens the list latched and the next tap runs the highlight; elsewhere it runs row 1.
  `g.grabMenu.sel = i` arms that held-guard pick (`GRAB_OPTS` index: knock out, kill, carry, device, interrogate) and the
  next A press runs it; `g.doorMenu.open` / `.opts` and `g.grabMenu.open` /
  `.labels()` read the list.
- Not built: `access.holdToggle` does not latch the menu (it still works on the team-move direct path); locked doors
  list nothing (no PICK LOCK / BREAK LOCK yet); no traversal rows (rope, climb: Y does those).

### Remapping and hold / toggle (step 18, D7; local only, D8)
- The table above is the default layout. Pad: `Settings.pad: PadBinds` (`input/padBinds.ts`, `PAD_BINDS`: 12 verbs (A3: ids renamed so an old save's binds are ignored and the CT defaults apply; anim-rework S1 removed the two speed verbs), at
  most 2 buttons each, defaults = `GAME_BINDINGS`); `GamepadSource` rebuilds the flat `padBindTable` only when
  `settings.pad` changes and `mapPad(p, t, table)` reads it. Sticks, the triggers' analog aim / fire and the menu buttons
  (`UI_BINDINGS`) are fixed; LT / RT can take a button verb. Keyboard: `Settings.keys` / `BINDS`.
- (sector-fixes W) `PadFrame.stick` / `InputState.stick`: the right stick's position after the radial dead zone, no curve
  or invert (x right, y up, 0 when let go or the pad is gone / taken by a hook): the selection wheel's absolute cursor
  under the pad (`docs/systems/gadgets.md`, Wheel). The look rate still comes from `look`.
- Shared-by-design verbs are one row: X = holster / draw (tap) + reload (held, gun out), RT = fire (aiming) / the
  strike's tap knockout and hold kill (holstered). The tap / hold splits follow the button. A3 split the old shared Y (jump + interact) and A (context) into Y = jump, A = interact.
- Conflicts (`input/conflicts.ts`, `findConflicts(binds, groups)`): two verbs of one group on one input, once per pair
  (the defaults have none; middle mouse was free for Ping); menu keys are their own group. `ALLOWED_PAIRS` holds the
  pairs that may share an input: only Zoom + Ping (optic-coop M2, Michael "contextual": one press is Zoom while aiming a
  scoped weapon, else Ping, `contextPing`; the controls screen's pad note says so); A3 removed the Traverse + Use pair.
  Any other verb on their input (a player's remap) is still a conflict with each. A conflict is shared, warned on both
  rows and in a summary, and saved (A71).
- Capture: 5 s timeout; keyboard Esc cancels, Backspace clears; pad binds on release, B held `CAPTURE_CANCEL_HOLD` 1 s or
  Esc cancels (G22 changes this), Y on a slot clears. Reset per device with a confirm.
- Hold / toggle (G398, "Plain holds only"): every plain hold action gets a hold or toggle setting; a button whose tap
  and hold do different things, and the aim (G214), get none. In `Settings.gameplay`: `crouchToggle` (default toggle), `sprintHold` (unused since the CT prototype M1: no sprint; no
  row since anim-rework S1), `wallToggle` (default toggle), `grabToggle` (default toggle; hold: letting go knocks out, A70). `access.holdToggle`
  (held interactions) is separate. Nothing in `src/net` reads bindings or these settings.
- In-game pad prompts read the bindings (`verbPromptHtml`, `padButtons` set by `App.applyKeyLabels`).
- (F7) Stored pad binds keep what was saved, so a settings save from an A3 build kept the speed on D-pad left / right
  (and vision on up, sharing it with speed up). `Settings.padV` (`PAD_LAYOUT_V` 2): an older save moves each of vision,
  gadget, speed down and speed up still on its exact A3 button (up / down / left / right) to today's default (left / right /
  down / up); a remapped verb is kept (`migrateA3Dpad`, `tests/settings.test.ts`).
- (anim-rework S1) `PAD_LAYOUT_V` 3: the speed verbs are dropped (D-pad up / down free), X keeps its id (`draw`) with
  the new meaning, LT is the fixed aim; a stored `gameplay.adsToggle` is dropped (the aim is always held:
  Michael 15:25 on the toggle option, "Remove it"; the Aim row is gone). `Settings.keysV` (`KEY_LAYOUT_V` 1): back to wall still on its old default Left Shift moves to Caps Lock
  (`migrateKeysV1`), the `run` / `creep` binds take their defaults, = / - entries are dropped. A remapped binding is
  kept; one that now clashes (a verb on LT / RT, a key on Left Shift / Left Alt) shows as a conflict on the controls
  screen, and `controlsMigrationNotes` names what moved and every clash in one toast at the first boot after the move
  (the migrated settings are saved then). Tests: `tests/settings.test.ts` (literal old saves).

### Analogue speed (anim-rework S1; replaces the step 17 gears)
Michael 2026-10-20: "remove the speed toggle, and allow full speed control via the analogue stick depending on how far
you push the stick". No gears, no D-pad speed buttons, no mouse-wheel speed.
- `player/speedGears.ts` `stickSpeed(u, crouched)` (pure): `u` = the stick's travel past the dead zone (`stickCurve`; the
  pad's radial dead zone 0.15 first, then `GEARS.deadZone` 0.05), piecewise linear through `STICK_SPEED.at`
  [0, 0.15, 0.45, 0.8, 0.9, 0.97] to [0.4, 0.75, 1.4, 2.1, 3.0, 4.0] m/s standing (anim-rework S2, M6: the run was 4.5) and [0.4, 0.85, 1.3, 1.7, 2.15, 2.6]
  crouched (the slowest creep, then creep / sneak / walk / jog / run). Most of the travel (to 0.8) is the stealth range;
  the last fifth is the jog and the run. Raw stick 50 / 80 / 90 / 100 % standing (the default radial dead zone 0.15, outer 0.98): ~1.3 / ~2.0 / ~3.0 / 4.5 m/s.
- Keyboard (A1): WASD at the walk point (2.1 / 1.7 m/s), Left Shift held the run, Left Alt held the creep (`KBM_PACE`).
- Aiming caps the pace at `adsSpeed` / `adsCrouchSpeed` with the strafe / backstep penalties (`paceSpeed`).
- `AnalogGear` (allocation-free): `v` the asked speed (continuous; `controller.wantSpeed`), `gear` the nearest named
  speed 1-5 with hysteresis (`GEAR_UP` / `GEAR_DOWN`, pinned in `tests/analogGear.test.ts`; the roll, the fence rattle,
  the wall slide read it), `band` the slowest gear whose speed covers `v` (`controller.paceBand` -> `MoveState.g`, which
  the host's speed check allows + 15%; no wire change).
- `GearState` (`controller.gears`) is an internal cap only (5 = none; no player control): tests and tools cap it with
  `?gear=N` (e2e-lib starts suites at 4 unless they name one).
- Noise and perception read the measured `controller.speed`, so they follow the actual pace; the light meter is the
  light on the body.

### Rumble (step 17; local only, D8)
- `config/rumble.ts` `RUMBLE` `{strong, weak, ms}`: landing soft / roll / heavy, takedown done, elbow hit, shot suppressed /
  loud, heavy footfall (gear 6 or carrying a body, per foot plant), kill, hurt, explosion. Every rumble goes through
  `InputManager.haptic(kind)` -> `playRumble` (scaled by `gameplay.rumble` 0-1; remote players' events never rumble) ->
  `GamepadSource.rumble` (`gamepad.vibration`, `dual-rumble`). GameState hooks: `player.onLanding`, `player.onFootPlant`,
  the `takedown` / `strike` events, weapon shots, hits and explosions. e2e-pad's fake pad records every `playEffect`
  (`window.__pad.effects`).
- Decided (G67): one shared foot-touched-the-ground event drives footsteps and rumble.
