# CT movement - progress
Spec: docs/ct-movement.md | Branch: ct-movement (from dev) | Last updated: 2026-10-07

## Status
| Phase | Status | Commit |
| --- | --- | --- |
| 0 Speed gears, instant stop, roll | done (waiting for review) | 0bce184 |
| 1 Networked movement state | done (waiting for review) | see log |
| 2 Split jump, wall jump, pipe legs-up / inverted | in progress | |
| 3 Rappel, fences | not started | |
| 4 CT takedowns and grab | not started | |
| 5 Co-op team moves | not started | |

## Next step
Michael (2026-10-07, before going to bed): proceed with all remaining phases and a Warehouse update for the new moves;
testing and investigation later. Phases run back to back; each is logged below.

## Phase log
(per phase: files changed, decisions, tests run and results, open issues)

### Phase 0 - speed gears, instant stop, roll (2026-10-07)
Files changed:
- `src/config/movement.ts` - `ENEMY_MOTION` / `ENEMY_CALM_MOTION` standalone literals; `GEARS`, `CT`, `CT_RANGES`, `NOISE_QUIET`.
- `src/player/speedGears.ts` (new) - `GearState`, `gearCap`, `stickCurve`, `gearSpeed`, `clampGear`.
- `src/player/movement.ts` - `targetSpeed(.., gear)` (gear caps replace the stick bands for the player), `noiseRadius` thresholds.
- `src/anim/motion.ts` - `MotionInput.ct`, `stepCt` (instant stop, `ctTau` start, no pivots), `CT.turnRate` travel turns.
- `src/player/playerController.ts` - `gears`, `ct`, gear stepping, `setCrouchToggle`, `maxAcceleration` 600 under CT.
- `src/player/traversal.ts` - forward roll (`canForwardRoll`, `startRoll(true)`, `forwardRolls`).
- `src/anim/footPlanner.ts`, `src/anim/animGraph.ts`, `src/player/characterRig.ts`, `src/player/player.ts` - `quickStop` (swing sets down within 0.12 s, locomotion blends out over it), CT sprint roll lean clamp, gear input.
- `src/input/actions.ts`, `gamepadMapping.ts` (`TapHold`), `gamepadSource.ts`, `inputState.ts` (`WHEEL_HOLD`), `keyBindings.ts`, `keyboardMouseSource.ts` - new controls.
- `src/input/touchControls.ts`, `src/core/settings.ts`, `src/ui/screens/layoutEditor.ts`, `src/styles.css` - speed rocker, layout v4.
- `src/ui/hud/hud.ts` - `setGear` (SPD pips); `src/ui/prompts.ts`, `src/core/app.ts` - key labels; `src/ui/screens/controlsScreen.ts`, `loadoutScreen.ts` (emote slot labels), `src/game/training.ts` (pad hints), `src/ui/debugOverlay.ts` (Tune table).
- `src/game/gameState.ts` - roll noise, gear reset on respawn, HUD / rocker wiring; `src/game/gadgetSystem.ts` - `WHEEL_HOLD` re-export; `src/core/flags.ts` - `?gear=`.
- Tests: `tests/speedGears.test.ts` (new), `tests/motion.test.ts` (CT timing 60 / 90 / 120 Hz, parity, enemy pin), `tests/footPlanner.test.ts`, `tests/input.test.ts`, `tests/ui.test.ts`, `tests/keybinds.test.ts`.
- e2e: `e2e-lib` (`gear=4` default), `e2e-move`, `e2e-anim`, `e2e-mouse`, `e2e-touch`, `e2e-pad`, `e2e-combat`, `e2e-cosmetics`, `e2e-weapons-carry`.
- Docs: `CHANGELOG.md`, `TESTING.md`, `CLAUDE.md`.

Decisions:
- CT feel values live in their own `CT` table with `CT_RANGES` (a second table in the Tune panel): `MOVEMENT_RANGES` is keyed to `MOVEMENT`, and adding keys there would also force them into the enemies' literal.
- The CT feel covers all free movement (aiming and sprinting too) and is off whenever an override drives the step (cover glide / moves, cover-to-cover run, traversal, takedowns): cover stays as it is.
- The sprint also turns at 720 deg/s (the spec's travel turn rate has no sprint exception). To keep the 8 deg bank bar, the CT sprint's roll lean is clamped to 0.05 rad (player only).
- Havok's character controller caps velocity change at 80 m/s^2 (two or three steps to stop from a jog); under CT it is 600, so the stop lands on the release step.
- Roll: the crouch press (its `drop` alias) is read in `TraversalController` before the controller crouches; it needs >= 1.5 m/s, the stick pushed and not aiming; a wall shortens it (under 0.6 m of room: a plain crouch). It comes out in stride at the gear's crouched pace. With hold-to-crouch, it stays crouched only while crouch is held.
- "Pips near the stance indicator": there is no stance indicator in the HUD; the SPD pips sit in the tactical strip beside the light meter. The touch rocker carries its own six pips (always shown).
- Rocker default spot x 0.445 y 0.67 (just right of the move stick's 42% zone, clear of the gadget / execute / swap buttons); Claw inherits it, Left-handed mirrors it.
- Wheel up = gear up. View tap (goggles) and D-pad left tap (ping) now act on release (tap / hold), like X.
- Emote slots in the Loadout read "View hold · J", "K", "L" (the d-pad no longer plays emotes).
- The gear resets whenever the player comes back alive (respawn, revive, co-op), and can be stepped anywhere (in cover, attached); it only changes free movement.
- e2e suites written for the 2.x jog start in gear 4 (= 2.8 m/s) through `e2e-lib` unless they name a gear; `e2e-move` checks the real spawn gear (3). The `e2e-anim` responsiveness bars are the CT ones now (95% within 0.08 s, stop on the release step, no pivot, 720 deg/s).

Tests run (this session):
- `npm run lint` clean; `npm test` 52 files, 518 tests passed; `npm run build` ok.
- Baseline on clean `dev` (all 29 e2e suites): all passed except `e2e-coop` (timed out at "client sees the dual takedown").
- New build, all 29 suites: passed, after the fixes listed above. `e2e-pad`, `e2e-cosmetics` and `e2e-weapons-carry` were fixed and re-run alone. `e2e-clear` and `e2e-feedback` failed once while other suites ran in parallel, then passed when run alone. `e2e-coop` passed.
- `perf.mjs --budget`: draws 42 (<= 55), triangles 0.14 M, allocations 11.1 MB/s; animation per character 0.048-0.062 ms against the baseline build's 0.052-0.059 ms in the same session (VM noise; no regression).
- `perf.mjs --preset=ultra --mobile --budget`: draws 232-248 (<= 250; the baseline read 258 in the same session), triangles 0.69 M; the CPU lines are noisy (2.19-2.27 machine factor runs pass, a 1.24 run read sim 2.5 vs 2.49).

Open issues:
- A slow crouch walk (~1 m/s, now the default crouched gear 3) lets the thigh pistol touch the right elbow pad (`e2e-weapons-carry` box test). The same happens on clean `dev` at that pace (checked), so it is not new; the suite runs at gear 4. Needs a carry / pose fix.
- Co-op / PvP: gears, the instant stop and the roll are local (host and clients alike). Remotes still see position-interpolated movement (no roll pose), and the host does not hear a client's roll, until Phase 1's MoveState. The host's footstep noise for remotes uses the new quiet thresholds.
- Gear speeds measure ~3% under the caps in the running game (Havok's controller, as 2.x's paces did).

### Phase 1 - networked movement state (2026-10-07)
Files changed:
- `src/player/moveState.ts` (new, pure) - `MoveState`, `MOVE_MODES` (wire index), `COVER_SUB`, `ATTACH_SUB`, `sanitizeMoveState`, `packMoveState`, `poseFromMoveState`, `moveChanged`, `footOffsets` / `footPoints`.
- `src/game/localMoveState.ts` (new) - the local player's state from `GameState` (host and client).
- `src/player/attachGrips.ts` (new) - hand / foot steppers and rig targets moved out of `AttachController` (shared with remotes), `planted` / `settleTo`.
- `src/player/traversePath.ts` (new) - committed move paths moved out of `TraversalController` (remotes replay them); `TraversalController.committed`, move counter.
- `src/player/gripStepper.ts` - `settleTo`.
- `src/anim/footPlanner.ts` - foot pins (`pinLX..`, `PIN_TOL`); `src/player/characterRig.ts` - `footPins`, `curlHold`, `liftHold`.
- `src/net/protocol.ts` - `PlayerState.mv`, `wirePlayerState`, `PF.driven`; `src/net/netShared.ts` - the flag.
- `src/net/coopClient.ts` / `coopHost.ts` - send `mv` (at once on a change); host history keeps the posed head / hips and the mode, `judge` uses them; `RemotePlayer.followPose` each frame.
- `src/net/remoteAvatar.ts` - poses from `mv` (cover, attached grips, committed replay, takedown, carry, look glance, owner's speed).
- `src/net/validate.ts` - `moveSpeedCap`, `attachedClamp`; `src/net/remotePlayer.ts` - uses them, capsule along hips -> head.
- `src/ai/hitboxes.ts` - `sync(feet, head, hips)`; `src/net/pvpTarget.ts` - passes the hips.
- Tests: `tests/moveState.test.ts` (new), `tests/net.test.ts`; e2e: `scripts/e2e-netmove.mjs` (new), in `run-e2e.mjs`.

Decisions:
- `MoveState` lives in `src/player/` (not `src/net/` as the spec says): single player builds it every step and the hard
  rule forbids static imports of `src/net`.
- Extra fields beyond the spec's list, all needed to hit the 10 cm bar: `r` / `ay` (raise, aim twist), `rd` (ready
  position), cover `cu` / `lf` (the rig's hiding curl and lift: history dependent integrators), `fp` (feet when still
  in cover: each rig's foot planner otherwise plants where its own path took it), attached `gp` (planted grips when
  still), `COVER_SUB.leftHand` (the weapon hand at a left edge). `sub` is a u16.
- The remote's gait speed is the owner's reported speed (interpolation jitter otherwise reads as walking).
- Hit capsules (host `RemotePlayer`, PvP `Hitboxes`) lie along the posed hips -> head line, so a hanging / crawling /
  leaning body is hit where it is drawn; a hanging player's body capsule no longer covers the head.

Tests run:
- `npm run lint` clean; `npm test` 54 files, 547 tests passed; `npm run build` ok.
- All 30 e2e suites on the Phase 1 build: passed, except one `e2e-netmove` ladder check that hit a grip-settling race
  (fixed: grips are sent / settled only fully planted); `e2e-netmove` then passed twice in a row.

Open issues:
- `e2e-netmove` compares cover poses only for head and hands (feet in cover are pinned when still; while moving each
  rig's planner steps on its own).

## Preview
`ct-movement` builds to its own site at `/<repo>/ct/` (approved by Michael 2026-10-07; `dev` keeps `/preview/`).
Saves there are separate (`shoulder-strike-ct`). Every push to `ct-movement` rebuilds it after the Preview check.

## Spec change requests
(problem, proposed change, waiting for Michael / approved / rejected)
- Phase 0 stop pose (2026-10-07, approved by Michael): the spec had the pose blend from the frozen stride to idle over
  `CT.stopBlend`; on the phone that read as the operator resetting to a crouched idle (feet pulled together, a
  settling step). Now: the stop holds the exact stride it stopped in until the next input (stick, aim, stance change,
  cover / traversal / takedown, leaving the ground); a foot in the air sets straight down where it is within
  `CT.stopBlend`; crouched stops hold the crouched stride too (no automatic kneel). Applied as a Phase 0 fix.
- Phase 0 stop hold, second pass (2026-10-07, from Michael's phone test: "only sometimes worked"): the hold needed
  more than 0.3 m/s at the stop (slow gears / crouched / a part-pushed stick never held), a sprint still active for
  0.15 s after the release cancelled it, and a pad stick springing back slowed the operator through 0.6 / 0.25 / 0.08
  before the stop. Now: any stop from > 0.02 m/s holds; the hold lets go only when the stick moves the operator again
  (target > 0.05 m/s), aiming, a stance change, an override or leaving the ground; `StickRelease` keeps the stick's
  deflection while it springs back (faster than `CT.releaseRate`, up to `CT.releaseWindow`), so the stop comes from the
  full pace.
- Cover strafe follows the speed gear (2026-10-07, approved by Michael; the spec said cover stays as it is):
  `coverPace(gear, crouched)` = the gear's pace capped at `GEARS.coverMax` (standing 2.8, crouched 1.8 m/s; gear 3 is
  about the 2.x pace 2.3 / 1.25). Cover-to-cover runs, glides and the edge stop are unchanged.
- Branches (2026-10-07, Michael): keep `ct-movement` separate from `dev` for now - do not merge `dev` in at the start
  of a phase until he says so.
