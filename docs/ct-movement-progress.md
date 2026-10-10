# CT movement - progress
Spec: docs/ct-movement.md | Branch: ct-movement (from dev) | Last updated: 2026-10-10
Status: done, shipped in 3.5.0. Review state: ASK.

## Status
| Phase | Status | Commit |
| --- | --- | --- |
| 0 Speed gears, instant stop, roll | done (waiting for review) | 0bce184 |
| 1 Networked movement state | done (waiting for review) | fa84b2b |
| 2 Split jump, wall jump, pipe legs-up / inverted | done (waiting for review) | see log |
| 3 Rappel, fences | done (waiting for review) | see log |
| 4 CT takedowns and grab | done (waiting for review) | see log |
| 5 Co-op team moves | done (waiting for review) | see log |
| Warehouse CT routes | done (waiting for review) | see log |

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

### Phases 2-5 (2026-10-07, overnight; one commit)
Phase 2 files: `src/player/splitJump.ts` (pure: `findSplitGaps`, `splitReach`, `wallJumpReach`, `PipeHang`),
`src/world/anchors.ts` (`SplitAnchor`, entry `wall`), `src/player/attach.ts` (`split`, pipe sub-poses, tumble pivot),
`src/player/attachController.ts` (split / wall jump probes, pipe states, sidearm aim, `onHit`),
`src/player/attachGrips.ts`, `src/anim/clips/traverse.ts` (`SPLIT_BRACE`, `WALL_KICK`, `PIPE_LEGS_UP`,
`PIPE_INVERTED`), `src/anim/animGraph.ts`, `src/player/characterRig.ts` (`tumble`, world aim), `src/player/player.ts`
(`attachAim`), `src/weapons/playerWeapons.ts` (`setAttachedStow`, `attachSpread`), `src/config/camera.ts` (presets),
`src/world/levelBuilder.ts`, `src/world/maps/provingGrounds.ts` (CT course), `scripts/e2e-ct.mjs`,
`tests/splitJump.test.ts`.
Phase 3 files: anchors `RappelPoint` / `Fence`, `ATTACH.rappel` / `fence`, `AttachController.rappelStep` /
`fenceStep`, `src/world/ropes.ts`, `src/physics/groups.ts` (`FENCE`), `src/ai/navBuild.ts`, `LevelBuilder.rappel` /
`fence` (`buildFences`), `RAPPEL_HANG` / `BRACE` clips, `tests/rappelFence.test.ts`, `tests/losParity.test.ts`.
Phase 4 files: `src/game/takedown.ts` (`drop`, `inverted`, `GRAB`), `src/game/takedownController.ts` (the grab),
`src/ai/enemy.ts` (shield hesitation, head aim, hostage pose, stagger), `src/ai/hitboxes.ts`, `src/game/damage.ts`,
`src/net/pvpVictim.ts` (new), `ptd` message, `src/game/training.ts`, `src/game/modes/trainingMode.ts`.
Phase 5 files: `src/game/teamMoves.ts` (pure), `src/game/teamController.ts`, `TEAM` in `config/movement.ts`,
`tmove` / `tstart` / `tdeny` / `tend`, `CoopHost.onTeamMove`, `CoopClient` handlers, MoveState `brace` / `boost` /
`stacked`, `tests/teamMoves.test.ts`, `scripts/e2e-netmove.mjs` (team section).

Decisions:
- Split gaps come from the cover faces (two high faces facing each other 1.2-1.95 m apart; 0.9-1.7 before the second playtest round), so any map gets them
  without placing anchors; maps can still steer them by geometry.
- Pipe inverted / legs up turn the rig about a pivot below the hips (`TUMBLE_PIVOT`); the upright-only pelvis drop and
  knee-floor rules are skipped while tumbled (they pushed the hips the wrong way).
- Fences are their own physics group (`G.FENCE`): only the player's capsule collides; bullets, sight and level probes
  pass; they are not level pieces (no cover, ledges, voxels).
- The grab replaces the instant takedown from behind only (dogs excepted); front / side / corner / over cover keep the
  strike. A head shot from a guard kills the hostage (any guard dies to one head shot): he drops and the grab ends.
- PvP takedowns: only drop / ledge pull / inverted on opponents (host-checked `ptd`); no grabs (no human shields of
  players), Execute stays off.
- Team moves: the host decides; a host's own request goes through the same check. The braced bottom sends mode
  `brace`; the climber `boost` / `stacked`. No prompt for bracing itself (it needs a ray every frame); the boost / ladder
  prompt shows over a braced mate in reach.
- Teleports (respawn, insertion, tests) now cancel a committed traversal move and never count as a fall: a landing
  roll after a teleport used to drag the player back along its path.
- Training: the Mark guards are two spawns that see each other (the CT course walls off the old pair on Proving).

Tests run:
- `npm run lint` clean; `npm test` 56 files, 564 tests passed; `npm run build` ok.
- Full e2e on the Phase 2+3 build: all 31 suites passed except takedown / training (their scripts already expected the
  Phase 4 grab). On the Phase 4+5 build: e2e-takedown, e2e-training, e2e-coop, e2e-enemies, e2e-ct, e2e-anchors,
  e2e-traverse, e2e-move, e2e-netmove passed (e2e-coop failed once at the infiltration objective sync, then passed).
- Perf (Phase 2+3): within VM noise of the Phase 1 numbers (mobile Ultra draws 233-260 across runs).

Open issues:
- Bracing has no prompt; the human ladder by touch needs the prompt held (tap = boost).
- The fence's chain-link is a flat textured panel (no voxels): it looks thin from the side.
- Rappel / fence / team moves have no dedicated clips beyond `RAPPEL_HANG` / `BRACE` (the climb clips stand in).

### Warehouse - Chaos Theory routes (2026-10-07, overnight)
Files: `src/world/maps/warehouse.ts` (roof walkway, drainpipe, pump house, rappel, cabinet bank, deck pipe, press 3.3 m,
yard fence, corridor patrol), `src/game/teamController.ts` (boost search origin), `scripts/e2e-ct-warehouse.mjs`
(new, in `run-e2e.mjs`), `scripts/e2e-anchors.mjs` (pipes approached where the floor puts them in reach),
`scripts/e2e-netmove.mjs` (partner walks off mid-request), `tests/net.test.ts` (team messages).

Routes (west to east, ground to roof):
- Yard -> roof: drainpipe (solo, west yard) or the pump house (co-op boost / human ladder, east lot) and a climb.
- Roof (6.3 m, moonlit, metal = loud): rappel over the dispatch window (kick through), hang off the skylight edge over
  the workshop patrol (drop attack), walk the length of the building.
- Ground floor: corridor split at the cabinet bank over the new corridor patrol; the press perch (wall jump); the
  mezzanine deck pipe over the floor patrol; the rack tops (2.8 m: wall jump or the three ladders) over the aisles.
- Yard: the fence splits the dark lane from the east lot (climb quietly or walk round through the lit gap).

Decisions:
- The roof is the only real height in a 6 m building, so it became the new layer: one solid strip (the south one) with
  lips on every edge; the other strips stay visual. Its south lip is the rappel's edge; its north lip is the skylight.
- The boost wall is a solid pump house (a canopy left the climber hanging in the air with nothing under the feet).
- Boost targets are lips 3.75-4.5 m up (lower ones are a wall jump alone); the search origin was too low before (a
  4.2 m lip sat on the 1.2 m jump limit, so the Proving test passed by a hair).
- Spec deviations for the team messages: `tmove` / `tstart` / `tdeny` / `tend` (the name `team` is the lobby's side
  change); a start plays at once on receipt (both sides within one network delay) rather than from `t0` by `ClockSync`;
  the top of the human ladder is free to aim with no pitch clamp.
- One more guard (corridor patrol): the split and the corridor needed someone to drop on.
- The gatehouse moved 2.3 m south: it sealed a pocket against the facade (an unreachable accidental split gap) and
  would have let a solo player step up to the pump house.

Fixes found by the runs:
- A grab whose hostage was shot dead never ended (`setSolid` on the dead guard's disposed hit volumes threw before the
  grab cleared).
- The takedown offer tried only the nearest guard; from a split / pipe the nearest can be behind a wall. It now tries
  the three nearest (one ray each).
- Tests: e2e-clear knows the corridor room and sweeps guards that hold no room (alarm reinforcements); e2e-netmove
  holds Y until the host page (in the background, slow pad polling) sees it.

Tests run:
- `npm run lint` clean; `npm test` 56 files, 566 tests passed; `npm run build` ok.
- Full e2e (32 suites) on the Warehouse build: all passed but e2e-takedown (the dead-hostage grab) and e2e-netmove (the
  tap timing); both fixed and re-run alone: pass. After the gatehouse move: e2e-takedown, e2e-ct-warehouse,
  e2e-anchors, e2e-missions, e2e-clear (after the test fix), e2e-levels, e2e-stealth-ai, e2e-coop, e2e-enemies,
  e2e-gadgets, e2e-tactics, e2e-netmove: pass.
- Perf against the Phase 1 build on the same VM (interleaved): test path draws 42 / 42, animation per character
  0.043-0.059 ms vs 0.055-0.065 ms (VM noise both sides; single readings sometimes over the scaled 0.04 budget, as on
  the baseline); mobile Ultra draws 231 (<= 250), 0.63 M triangles; desktop draws 474 vs 481, 1.32 M vs 1.45 M
  triangles, sim p95 2.4 vs 3.15 ms, allocations 10.5 vs 10.4 MB/s.

Open issues:
- e2e-netmove "ladder after a climb" once read a 35 cm ankle error (the grip settle race from Phase 1); it passed on
  the next runs.

### Playtest changes (2026-10-08, from Michael's phone test)
Asked: a manual jump that grabs what is near (lips, drainpipes, pipes), split by a double tap of jump and higher; the
mezzanine pipe hard to use; pipes faced along (also hanging down), not side-on; a touch action button for cover /
vault / climb with the prompts kept as indicators.

Files: `src/config/movement.ts` (`LEAP`, `SPLIT.feetHeight` 2.5 / `minHeight` 3.6), `src/player/traversal.ts` (`leap`,
air grabs, double tap, `splitNow`), `src/player/attachController.ts` (`split` hint, `leapProbe`, `pipeFace`, `PIPE_TURN`,
pipe in `anchorFirst`, split `gripCentre`), `src/player/attach.ts` / `attachGrips.ts` (pipe facing along, hands,
inverted straddle), `src/player/playerController.ts` (`takeoffT`), `src/input/actions.ts` (`leap`),
`src/input/touchControls.ts` (`jump` control, `TouchAction.press / down / up`), `src/core/settings.ts` (layout v5),
`src/game/gameState.ts` (`promptAction`, split prompt, leap wiring), `src/styles.css` (prompts not tappable),
`src/net/remoteAvatar.ts` (re-grip on a turn), `src/ui/screens/controlsScreen.ts`, `src/world/maps/warehouse.ts`
(corridor split section 4 m, deck pipe from z 13.3), tests (`attach`, `splitJump`, `ui`), e2e (`ct`, `ct-warehouse`,
`touch`, `cover`, `traverse`).

Decisions:
- Controller / keyboard have no spare button for a jump: Y / E jump when traversal has nothing on offer (a vault,
  ladder or grab still wins). Touch gets its own Jump button, which always jumps (the hands grab in the air).
- The split is no longer a single Y: one press jumps, a second within 0.4 s braces (with grabs held back 0.22 s so a
  wall top in reach does not take the jump first). The touch action button at the split prompt jumps straight in.
- Jump height ~0.8 m: grabs lips up to ~3.1 m. The airborne controller falls at about 2 g (gravity is applied twice;
  the landing bands are tuned to it), so `LEAP.vy` is 5.6.
- Pipes: hands one ahead of the other (a shuffle), facing the way the camera looks along the pipe at the grab; held
  back 0.3 s turns round. Inverted keeps the along-the-pipe plane with the legs straddling it.
- Action button priorities: with a cover face and an obstacle both prompted, the stick pushed (or moving) picks the
  obstacle, still picks cover. In cover with nothing else: Leave cover.

Tests: `npm test` 56 files, 567 passed; lint clean. Full e2e (32 suites) on the new build: all passed but e2e-anchors
and e2e-netmove, whose split checks still used a single Y; updated to the double jump, both pass.

### Playtest changes, second round (2026-10-08)
Asked: legs almost horizontal in the split so hallways can be wider; the Warehouse corridor with no cabinet, only the
two walls the right width apart; no jumping out of a split (drop, drop attack, pistol only); the split faces down the
hallway the way the jump went.

Files: `src/config/movement.ts` (`SPLIT.minWidth` 1.2 / `maxWidth` 1.95, `rootDrop` 0.37), `src/player/attach.ts`
(split root lowered), `src/player/attachGrips.ts` (hands on the walls just under the shoulders),
`src/player/attachController.ts` (`findJump` null in a split, `gripCentre`), `src/player/traversal.ts` (face from the
jump's travel), `src/world/maps/warehouse.ts` (cabinet bank + fire wall replaced by both corridor walls at 4 m over
x 6.5..11.5), `src/world/maps/provingGrounds.ts` (split corridor 1.8 m), tests (`splitJump`), e2e (`ct`,
`ct-warehouse`).

Decisions:
- Feet stay at 2.5 m; the body drops 0.37 m (at 1.75 m) so the hips sit ~8 cm over the feet line. At 1.86 m the legs
  reach the walls nearly straight; the arms reach just under the shoulders.
- Facing: the jump's horizontal velocity along the corridor axis (> 0.5 m/s), else the body's yaw.
- Found while testing, then fixed: after a fall the capsule could rest 4-14 cm over the floor (open ground, any drop
  height, crouched or standing). Havok counts a floor as support up to `keepDistance` + `keepContactTolerance`
  (0.14 m) under the capsule and its solver never closes that gap (`integrate` also drops the velocity into a
  supporting surface, so the stick force did nothing). `PlayerController.settleGap` (one ray under the centre, four
  round the rim so a step's edge stops it) moves the capsule down onto the floor on a grounded step when it hangs
  more than `SETTLE.tol` over its rest gap (`settles` counts them). e2e-ct: falls of 0.75-2.5 m crouched and standing
  rest within 3 cm of the rest height; the split drop check is back to that too.
- The settle shifted e2e-clip's knee gap at the high-cover peek (10.1 -> 7.0 cm): the poses there depended on what
  earlier scenarios left behind (the 0.9 m teleports between them never reset the feet or the gait clock). Now
  `PlayerController.teleport` restarts the gait clock and `Player` resets the foot planner on a teleport (respawns,
  insertion, co-op), so each scenario starts from a stance; with that, crouched high cover showed a swing brushing the
  planted foot (5.1 cm), fixed in `FootPlanner.swingTo` (`PLANNER.swingGap` 0.1 sideways within `swingNear` 0.18 m
  along). e2e-clip: every scenario now gives the same margins alone or in sequence.

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
- Jumping out of a split re-enabled (2026-10-08, Michael; reverses the second playtest round's "no jumping out"): as
  the Phase 2 spec had it, Y braced jumps up to a lip / pipe / ladder over the split ahead of the body
  (`findJumpTarget`, up). The reach is measured from the feet line + 1.05 m (the hands sit lower since `rootDrop`), so
  lips up to ~4.75 m over the floor are in reach. e2e-ct checks the jump to the 4.3 m lip again.
- Branches (2026-10-07, Michael): keep `ct-movement` separate from `dev` for now - do not merge `dev` in at the start
  of a phase until he says so.
