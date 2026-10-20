# Slice 1 - controls: report

Implementer, 2026-10-20. Spec: `BRIEF.md` section 1 (Michael 13:30-13:40, M1-M5, A1-A3). Nothing committed (the job lead
commits). No wire change (PROTOCOL_VERSION 24). Every number is a starting value.

## Control table

### Pad (Xbox names)
| Input | Holstered | Low ready | Aiming | Holding a guard |
| --- | --- | --- | --- | --- |
| Left stick | Move; the deflection sets the speed (creep to run) | same | same (capped at the aim pace) | same (the hold's own cap) |
| LT (held) | Sling draw straight to the aim (slower, M2) | Aim | - (release: low ready) | Aim the pistol over his shoulder |
| RT | Tap: knockout strike; hold 0.35 s: kill (M3) | Nothing (A3) | Fire | Tap: knockout; hold: kill; aiming: fire |
| X | Press: draw to low ready (M1) | Tap: holster; hold 0.4 s: reload (A2; nothing to reload: holster) | Tap: holster; hold: reload | Nothing |
| A | Interact / context menu (hold) | same ("Interact always", Michael 14:55) | same | Context menu (Interrogate) |
| Y | Traverse | Traverse: the gun goes away, comes back after (M4) | same (the aim returns if LT is still held) | Nothing (can't let go) |
| B | Crouch | Crouch | Crouch | Nothing |
| L3 | Back to wall | Back to wall | Swap shoulder | - |
| R3 | - | - | Zoom (scoped) | - |
| LB | Wheel (hold) / switch weapon (tap) | same | same | - |
| RB | Co-op action | same | Rifle: co-op action; pistol: jammer (hold; Michael 14:55) | - |
| D-pad left / right | Vision / quick gadget | same | same | - |
| D-pad up / down | Free in play; step the held context menu's highlight | same | same | same |
| View / Menu | Mission device (stub) / pause | same | same | same |

### Keyboard and mouse
| Input | Does |
| --- | --- |
| W A S D | Walk (2.1 m/s standing, 1.7 crouched) |
| Left Shift (held) | Run (A1; was back to wall) |
| Left Alt (held) | Creep (A1) |
| RMB (held) | Aim (was the draw toggle) |
| LMB | Fire while aiming; holstered / holding a guard: click knockout, hold kill |
| X | Holster / draw (tap), reload (hold, gun out) |
| R | Reload (from holstered: draws to low ready first, A43) |
| Z | Knockout (holstered or holding a guard) |
| F / PgDn | Co-op action; held while aiming the pistol: the jammer (the same rule as RB) |
| Caps Lock | Back to wall (moved from Left Shift) |
| Mouse wheel | The held context menu's highlight only (no speed) |
| = / - | Unbound (were the speed gear) |
| C / Ctrl, Space, E, B, T, Q, G, Tab, V, N, F / PgDn, P, 1-7, Esc | Unchanged |

## What moved or was removed
- Removed: the speed gears for players (pad D-pad up / down, keys = / -, the mouse wheel); the pad's LT knockout /
  secondary fire (`altFire` has no pad button now); the RMB draw toggle; the Sprint row in Settings > Controls.
- Moved: KBM back to wall Left Shift -> Caps Lock (Left Shift is the run, A1). D-pad up / down and the wheel now only
  step the held context menu (new fixed actions `ctxUp` / `ctxDown`, replacing `speedUp` / `speedDown`).
- Kept where they were: shoulder swap (L3 aiming / V), zoom (R3 / B), the wheel (LB / Tab), vision (D-pad left / N),
  gadgets (D-pad right / G), co-op (RB / F). The grab from behind stays on the hold-A menu (GRAB CHARACTER, BACK TO GAME).
- Internal API kept for scripts and tools: `controller.gears` (`GearState`, now a speed cap only, spawn 5 = none),
  `?gear=N`, `controller.gear` (the nearest named speed), `controller.maxGear`, the `ads` action held (= LT),
  `Player.forceAds`, `InputState.tap('draw')` (a one-step X press).

## The speed curve (`config/movement.ts` `STICK_SPEED`, `player/speedGears.ts` `stickSpeed`)
Stick travel `u` past the dead zone (pad radial dead zone 0.15 / outer 0.98, then `GEARS.deadZone` 0.05), piecewise
linear:

| u | 0 (edge) | 0.15 | 0.45 | 0.8 | 0.9 | 0.97-1 |
| --- | --- | --- | --- | --- | --- | --- |
| Name | slowest creep | creep | sneak | walk | jog | run |
| Standing m/s | 0.4 | 0.75 | 1.4 | 2.1 | 3.0 | 4.5 |
| Crouched m/s | 0.4 | 0.85 | 1.3 | 1.7 | 2.15 | 2.6 |

Raw stick 50 / 80 / 100 % standing measured in e2e-pad: 1.22 / 2.02 / 4.43 m/s (x the weapon's handling). The five
speeds are the old gear caps, so noise bands (`NOISE_QUIET`), the roll (nearest named speed 5 = the run) and the fence
rattle keep their meaning. Noise and perception read the measured speed. `controller.wantSpeed` is the continuous asked
speed for the anim code (next to the measured `controller.speed`). The wire's `MoveState.g` is now the pace band (the
slowest named speed covering the pace), so the host's speed check (+15%) holds with no wire change. Aiming caps at
1.4 / 1.0 m/s as before.

## The weapon state machine (`player/weaponStance.ts`, pure, `tests/weaponStance.test.ts`)
- States: `holstered`, `lowReady`, `aiming`, `slingDraw` (`Player.weaponState`; `Player.drawWanted` = not holstered).
- `base` (holstered / lowReady) is what LT falls back to. X press from holstered: base = lowReady at once (so a held X
  also draws). X while drawn: release before 0.4 s = tap = holster (an aim in progress is blocked until LT is let go);
  reaching 0.4 s = `holdAsk` -> the weapons reload (or queue it, A43), or holster when nothing needs reloading.
- LT (`ads`) held: aim; from holstered it sets base = lowReady and `slingDraw` until the gun is out; the draw time is x
  1.6 (`STANCE.slingDrawMult`; rifle 0.3 -> 0.48 s, pistol 0.5 -> 0.8 s; the aim camera blend follows). Release: base.
  No toggle: LT is always held (Round 3, Michael 15:25 "Remove it").
- `suspended` (M4; GameState sets `Player.weaponSuspend`): attached (not the one-handed sidearm aim), a committed move,
  a vent start, a team move, a takedown (not the hold), a carry, a strike, or `pose.traverse`. The state reads holstered,
  the gun goes away, base is kept, X presses are ignored; afterwards the state returns (aim too, if LT is still held).
- `locked` (holding a guard): X ignored; LT = the pistol shield via the existing hostage draw.
- The trigger (`TriggerTapHold`, 0.35 s): armed at the press only when holstered (no aim) or holding a guard (no aim);
  tap -> knockout, hold -> kill (strike `lethal`, grab `menuPick`). An aimed press is a shot to its release.
- Fire: only while aiming (`PlayerWeapons` gate on `player.ads`; the carry's raise-to-fire only while aiming).
- The pistol jammer (CT prototype B3; Michael 14:55 "Another button - what makes sense? RF?", read as RB): the co-op
  button (pad RB, KBM F / PgDn, the `coop` action) held while aiming the drawn pistol (`GameState.pistolAim`) jams the
  camera or laser under the reticle, the charge per `JAMMER`; aiming alone never jams; team moves get no co-op press
  while aiming the pistol. KBM key: F, so pad and keyboard share one rule (Z stays the knockout).
- A always interacts (Michael 14:55 "Interact always"): the pad source no longer turns A into reload with the gun out
  (`InputManager.setDrawn` and `GamepadSource.drawnActive` removed); reload is X held (KBM R too).
- The host's forced holster also holsters the stance. Death resets.

## Settings migration (`core/settings.ts`, `tests/settings.test.ts` with literal old saves)
- `PAD_LAYOUT_V` 2 -> 3: the `gearUp` / `gearDown` verbs are dropped (stored entries ignored), X keeps id `draw`, LT is
  the fixed aim; a stored `gameplay.adsToggle` is dropped (Round 3: the toggle is removed). The A3 D-pad move
  stays gated at layout 2 (a layout-2 save is not moved again; a bug the new test caught and fixed).
- New `Settings.keysV` (`KEY_LAYOUT_V` 1): back to wall still on its old default Left Shift -> Caps Lock
  (`migrateKeysV1`); `run` / `creep` take Left Shift / Left Alt; the = / - entries are dropped. A remapped key is kept.
- Reported: `controlsMigrationNotes` names what moved and every binding that now clashes (e.g. "Keyboard: Creep (hold)
  and Crouch share Alt.", "Controller: Co-op action and Aim share LT.") in one toast at the first boot after the move;
  the migrated settings are saved then. The controls screen marks the same rows as conflicts.

## Files
- New: `src/player/weaponStance.ts`, `tests/weaponStance.test.ts`, this report.
- Code: `src/config/movement.ts` (GEARS doc, spawn 5, `STICK_SPEED`, `KBM_PACE`; `fullPush` gone),
  `src/player/speedGears.ts` (`stickSpeed`, `stickMagFor`, `AnalogGear` v / band), `src/player/movement.ts`
  (`paceSpeed`), `src/player/playerController.ts` (no gear stepping, `wantSpeed`, `paceBand`), `src/player/player.ts`
  (the stance), `src/weapons/playerWeapons.ts` (draw from `drawWanted`, sling draw time, X hold reload / holster, no fire
  unless aiming, forced holster), `src/game/gameState.ts` (RT tap / hold, strike and grab picks, jammer, weapon suspend /
  lock, `setDrawn`, `ctxUp` / `ctxDown`), `src/game/grabMenu.ts`, `src/game/localMoveState.ts`, `src/game/contextMenu.ts`,
  `src/input/actions.ts`, `gamepadMapping.ts` (LT `ads`, `CTX_BINDINGS`), `gamepadSource.ts`, `inputManager.ts`,
  `keyBindings.ts` (run, creep, Caps Lock wall, `KEY_LAYOUT_V`), `keyboardMouseSource.ts` (RMB held aim, run / creep
  magnitudes, wheel), `padBinds.ts` (layout 3), `src/core/settings.ts`, `src/core/app.ts` (key labels, the migration
  toast; nothing near the debug wiring), `src/core/flags.ts` (comment), `src/ui/prompts.ts`,
  `src/ui/screens/controlsScreen.ts` (fixed rows), `src/ui/screens/settingsScreen.ts` (Aim text, no Sprint row),
  `src/world/maps/ctcourse.ts` (station 3 / gate texts: "X draws", "aim ... (LT / RMB) to jam", "Holster first (X)"),
  `src/world/maps/courselab.ts` (the "speed gear" drill is now "pace").
- Docs: `docs/systems/input-and-loop.md` (input, a weapon states section, the binding table, context menu, remapping,
  the analogue speed), `docs/systems/movement.md`, `docs/systems/takedowns.md`, `docs/systems/testing-tools.md`,
  `docs/ct-prototype/CT-CONTROLS.md` (history pointer), `TESTING.md`, `CHANGELOG.md` ("Unreleased - anim-rework").

## Tests changed and why
- `tests/analogGear.test.ts`: rewritten for the continuous curve (Michael: "full speed control via the analogue stick");
  the threshold table and the hysteresis checks kept; new: curve points, continuity, raw stick bands, pace band covers
  the host check, the cap, the KBM paces, no allocation.
- `tests/speedGears.test.ts`: the spawn cap is 5 (no player gear control).
- `tests/input.test.ts`: D-pad up / down are `ctxUp` / `ctxDown`, LT is `ads`; the doc table parser knows Left Alt and
  Caps Lock.
- `tests/padBinds.test.ts`, `tests/keybinds.test.ts`: the new defaults (no speed verbs; LT `ads`; Shift / Alt run /
  creep; Caps Lock wall).
- `tests/grabMenu.test.ts`: RT tap knocks out, RT hold kills (M3).
- `tests/settings.test.ts`: the A3 layout test without the gear verbs (and a layout-2 save not moved again); two old-save
  tests expect `adsToggle` back to hold; a new block for layout 3 / keys 1 and the migration notes.
- `tests/ctcourse.test.ts`: the station texts name LT / RMB (not LT / Z) and "Holster first (X)".
- `tests/courselab.test.ts`: the drill name "pace".
- `tests/settingsCover.test.ts`: the old save's `adsToggle` back to hold (as above).
- e2e (each with the reason in a comment): `e2e-pad` (D-pad no speed; the weapon-state block: X low ready, A3, LT aim,
  X hold reload / holster, the sling draw; the analogue 50 / 80 / 100 %; LT held for the shoulder swap and the shot
  rumble; verb table LT `ads`, D-pad `ctxUp` / `ctxDown`; remap "R3 draws" reads `drawWanted`), `e2e-mouse` (RMB held aim,
  low ready, X holsters, wheel and = / - no speed, W / Shift / Alt paces, Caps Lock wall), `e2e-move` (spawn uncapped,
  every named speed at its stick point (x 0.98 outer dead zone), half stick, the cap through stances, an X tap after the
  aim test), `e2e-takedown` (RT held kills the held guard), `e2e-wall` (the analogue half stick is 0.5: 0.6 now asks for
  1.66 m/s, the walk side of gear 2 / 3), `e2e-course` (the drill name regex, not run: co-op).
- `scripts/e2e-anim.mjs`: not changed (the `ads` action it holds still aims).

## Verification
- `npx tsc --noEmit` clean; `npm run lint` 0 errors (41 warnings, none new); full `npm test`: 183 files, 1995 tests
  pass (2 skipped).
- `npm run build`, then e2e on port 4195 one at a time (`--serial`, under heavy.lock), all pass on the final build:
  smoke 26 s, e2e-pad 179 s, e2e-mouse 81 s, e2e-move 59 s, e2e-anim 10 s, e2e-takedown 14 s, e2e-ct 48 s,
  e2e-traverse 52 s, e2e-weapons-carry 20 s, e2e-stealth 26 s, plus e2e-wall 22 s (speed-adjacent). Fixed on the way:
  e2e-traverse's vent (the vent start now suspends the weapon state), e2e-move and e2e-wall stick values (above).
- Not run (co-op, for the laptop): `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-net-lib` users, and `e2e-course` (its
  regex changed). Their input paths were read and kept: `__pad` X held until drawn and held until holstered (X hold with
  a full magazine holsters), `forceAds`, the `ads` action from the split (suspended: no base change),
  `controller.gears.gear = 5`. **e2e-ctcourse's jammer steps hold only LT (pad 6) on the drawn pistol, so after
  Michael's 14:55 answer (no jam on aim, RB jams) stations 3 and 4 need RB held with LT** (see "Round 2" below).

## What Michael should try (/ct/ once pushed)
1. Push the stick slowly from the centre to the rim on open floor: a creep, a sneak, a walk across most of the travel,
   then the jog and the run in the last fifth; no steps. Crouched the same. Keyboard: W, Shift + W, Alt + W.
2. X: the gun out to low ready and back. Hold LT: the aim; let go: low ready. From holstered, hold LT: a slower draw
   straight to the aim. RT at low ready does nothing; aiming it fires.
3. Hold X with a part-empty magazine: reload. Hold X with a full one: holster.
4. Holstered behind a guard: RT tap knocks out, RT hold kills. Grab one (hold A, GRAB CHARACTER): RT tap knocks out,
   RT hold kills, LT aims the pistol over his shoulder.
5. Low ready or aiming at a low wall or ladder, Y: the gun goes away for the climb and comes back after.
6. Aim the pistol at the station 3 camera, hold RB (keyboard F): it blinds; let go of RB: it comes back. At low ready
   or aiming, A opens a door.

## Round 2 (Michael 2026-10-20 14:55)
- Jammer: "Another button - what makes sense? RF?" (read as RB). Built: hold the co-op button (pad RB, keyboard F /
  PgDn) while aiming the drawn pistol; aiming alone no longer jams; no team move starts while aiming the pistol. KBM F
  was picked over Z because it is the same verb as RB (one rule for both devices); Z is the knockout only.
- A: "Interact always". Built: A interacts in every weapon state; reload is X held (KBM R too). Gate radio g-s3 is
  "Door unlocked. Open it (A / E)." (no holster first); station 3 texts name "hold Co-op (RB / F)".
- No binding id or default changed, so no new settings migration (labels only).
- Tests: `tests/ctcourse.test.ts` (g-s3 text), `tests/settings.test.ts` (the Co-op label in the clash note);
  `scripts/e2e-pad.mjs` (A at low ready does not reload; the mid-reload holster starts the reload with X held).
- Checks: tsc, eslint, the vitest files (15 files, 183 tests), build, then e2e on 4195 one at a time: e2e-pad 155 s,
  e2e-mouse 78 s, e2e-ct 52 s, e2e-gadgets 11 s, e2e-takedown 13 s, all pass.
- Conflict, not resolved here: `scripts/e2e-ctcourse.mjs` jams with LT alone (`lt(P, on)`, stations 3 and 4), which
  Michael's answer removes, so it cannot pass unchanged. The smallest change (not applied; the job lead decides) holds RB
  once the aim is in and lets it go before LT:

  ```js
  const lt = async (P, on) => {
    if (!on) await P.evaluate(() => window.__pad.set(5, 0));
    await P.evaluate((on) => window.__pad.set(6, on ? 1 : 0), on);
    if (on) {
      await waitSim(300);
      await P.evaluate(() => window.__pad.set(5, 1));
    }
  };
  ```
  (Every call site already `await`s `lt`.)

## Round 3: the fix round (after the check, 088849a5; Michael 15:25)
- `scripts/e2e-combat.mjs`: A with the gun out does not reload; X held reloads (Michael 14:55 "Interact always").
- The team-move prompt hides while the pistol's aim is asked (RB is the jammer then).
- Stale comments fixed (`gamepadMapping.ts`, `padBinds.ts`, `ctDevices.ts`, `strikeController.ts`, e2e-pad's verb table
  (A = interact only), e2e-takedown's knockout lines).
- Blank input (a held context menu, the gadget wheel) is no X release: `StanceInput.blank` (`Player.inputBlank`, set by
  GameState) spends a press that runs into it (no tap, no hold).
- KBM R from holstered (A43): the state follows the gun, low ready, and it stays out after the reload
  (`WeaponStance.readyForReload`). Picked over "keep it holstered and do not draw" because A2 makes the reload a
  drawn-gun action and the gun has to be out for it; the state now says what the body shows. e2e-pad checks it.
- Co-op bug (laptop, e2e-ctcourse station 3, the client's jam), diagnosed on the desktop with a temporary copy of the
  suite (deleted): the jam path is unchanged and works (`ctDevices.localStep` -> `sendJam` -> the host's
  `onRemoteJam`; no wire change). At the failure the client is aiming the pistol, RB down, no team move, but its pick
  is empty: `aimAt(B)` points the camera while the client is at low ready (the explore camera, since X now draws to low
  ready), then LT blends to the over-the-shoulder aim camera, which sits elsewhere; 1.45 m from the device that leaves
  the reticle 0.255 rad off, outside the jammer's 0.16 rad cone. The host passes because it stands 5.5 m away. Re-aiming
  after LT (in the aim camera) jams at once and the host shows `jam[1] = 'cam-s3'`. Under the old controls X drew
  straight into the aim camera, so `aimAt` aimed with the camera that then stayed.
  Code: the defensive fix stays (the team gate reads the asked pistol aim, `adsWanted` or `ads` held this step, so a
  slow page that sees LT and RB in one poll never offers the partner throw and stows the pistol). A camera fix that
  re-points the aim camera at the surface under the reticle while it blends in was tried and dropped: it held in a solo
  probe but not in the co-op run, and it would change every aim entry.
  Test (drafted, not applied; the job lead decides): aim once the aim camera is in. In `station3` and `station4`:

  ```js
  await lt(B, true);        // LT, 300 ms, RB
  await aimAt(B, ...CAM);   // (anim-rework S1) re-aim in the aim camera: at low ready aimAt used the explore camera
  ```
  (and the same `lt` then `aimAt` order for the host's `lt(A, true)` calls, which pass today only because of the
  distance).
- The split / inverted-hang sidearm aim (LT while attached) no longer sets the free low ready: every attach suspends the
  weapon state (`Player.weaponSuspend`, `attachAim`). Before, the e2e-netmove split aim left the client at low ready, so
  the later `forceAds = false` "release holsters" step never reached drawPhase 0. With this fix that step should pass
  unchanged; if the job lead still wants the step on the new contract, the drafted change (not applied):

  ```js
  // after `st.player.forceAds = false;` inside the GB promise: (anim-rework S1) release drops to low ready, an X tap holsters
  if (st.player.stance.base === 'lowReady') window.__app.input.state.tap('draw');
  // and give the in-page wait a cap (2 s of sim) so a missed holster fails instead of hanging the suite:
  st.fixedUpdate = (dt) => {
    orig(dt);
    t.sim += dt;
    if (st.weapons.drawPhase === 0 || t.sim > 2) { t.dw0 = Date.now(); st.fixedUpdate = orig; res(); }
  };
  ```
  (Only from low ready: an X press from holstered would draw. `forceAds` never moves the base state.)
- Aim toggle (Michael 15:25 on "Toggle aim": "Remove it"): `gameplay.adsToggle`, its Settings > Controls row and the
  stance's toggle path are gone; LT / RMB is always held. Migration: the key is dropped by `sanitizeSettings` for every
  stored save (nothing to keep, so no version step); `tests/settings.test.ts` and `tests/settingsCover.test.ts` load
  literal old settings with `adsToggle: true` and see no key and a held aim; `tests/weaponStance.test.ts` checks that a
  quick LT press is no latch.
- e2e-netmove (approved, applied, only the "drawn state (step 09)" step): after `forceAds = false` an X tap (only from
  low ready: X from holstered would draw) and a 2 s sim cap on the in-page wait for drawPhase 0.
- Results on the final build, port 4195, one at a time: see the closing lines below.
- Final build, port 4195, one at a time: e2e-combat 18 s, e2e-pad 158 s, e2e-mouse 87 s, e2e-stealth 27 s, e2e-menus
  297 s, e2e-takedown 16 s, e2e-ct 55 s, e2e-traverse 53 s, e2e-netmove 259 s: all pass. e2e-pad (known flaky) and
  e2e-menus (the title fade timing) each failed once in a three-suite run and passed alone. tsc and eslint clean; full
  `npm test` 183 files, 2004 tests pass.
- e2e-ctcourse on 4195 (900 s cap): still fails at station 3, the client's jam, for the aim-camera reason above, until
  the drafted re-aim lines are applied.
