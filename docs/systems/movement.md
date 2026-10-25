# Movement, camera and traversal
Owner: Player Build. Status: current.
Purpose: the operator's movement, camera, back-to-wall, door peek, traversal anchors and attached states.
Design authority: docs/DECISIONS.md (G1, G16-G39, G210, G227), then docs/design-bible.md (Sections 4 and 5.3).

Michael tunes movement himself as needed; movement slices and movement research are stopped (G227, replacing G150's
tune-until-sign-off). CT movement references are ignored (G210: "the ct movement is
getting worse. Can you ignore CT movement references."): analogue speed from the stick, LT held aims, three weapon
states, RT tap knocks out / hold kills, traversal auto-holsters (docs/archive/anim-rework/BRIEF.md). History of how the
code got here: docs/archive/ct-movement.md, docs/archive/locomotion/ and the git log.

## Decided direction
- Built (CT prototype F1a): G17, the shoulder swap only while aiming (`player/player.ts`); G18, back-to-wall on L3
  (input-and-loop.md, binding table).
- Removed (bible 6): sprint and the sprint-only moves (fast ladder climb, fast rappel descent, small gap hops, sprint
  door bash; G31), the quick 180 (G33), the planted pivot (G25) and the braking stop (G26).
- Not a build target; Michael tunes by hand (G210, G227): the rest of the CT footage values - G25's walking-circle turn,
  G26 / G27's mid-stride freeze and 1.7 s ease, G30's modern layer, G32's roll on held crouch, G33's 0.4 s flick turn,
  G35 / G36's 0.35 m/s wall shuffle and peek at once, and G28 / G29's camera framing and behaviour. The code below is
  what is built.

Still standing:
- Decided and built (G16): no aim assist on any input (the pad setting `gamepad.aimAssist` was removed, no-aim-assist).
- Decided (G38): one camera height for every operator (the shared body capsule).
- Decided and built (G62, CT prototype M1): no sprint; the `dash` action id stays for photo mode's fast pan
  (input-and-loop.md).
- Decided, not built yet (loco M20 Q1, G52): the lean-out aim and the SWAT turn are removed, with their network fields.
  Code: both still exist (Wall edge verbs below).
- Decided, not built yet (G97, G41): a CT door menu (open, stealth open, bash, optic cable); a door past about 15% open
  passes light, sound and sight. Code: the crack peek below.
- Decided, not built yet (G40): the two slowest standing and the three slowest crouched speeds are silent. Code:
  `NOISE_QUIET` makes standing gears 1-2 and crouched gears 1-3 silent (built, playtest 2: stand 1.65, crouch 1.9 m/s, with
  headroom for the stride swell).
- Decided (G34): wall entry by button only (built). G37: the CT back-to-wall is the only wall move. G109: every operator
  moves the same. G110: no prone crawl, no rope climb. G56: crawl spaces are crouch-walked.

## Speed and feel
- (anim-rework S1) No gears: the stick's deflection sets the speed continuously through `STICK_SPEED`
  (`config/movement.ts`; `stickSpeed` in `player/speedGears.ts`): the slowest creep 0.4 m/s at the dead-zone edge,
  then the five named speeds below at travel 0.15 / 0.45 / 0.8 / 0.9 / 0.97; the keyboard walks at the walk point, Left
  Shift held runs, Left Alt held creeps. `PlayerController.gears` is an internal cap only (5 = none; `?gear=N` for
  tests, `e2e-lib` adds `gear=4` unless a suite names one), kept through stance changes, reset on respawn. Aiming capped
  at 1.4 / 1.0. Detail: `docs/systems/input-and-loop.md`, "Analogue speed".

  | Named speed | creep | sneak | walk | jog | run |
  | --- | --- | --- | --- | --- | --- |
  | Standing (m/s) | 0.75 | 1.4 | 2.1 | 3.0 | 4.5 (G1; was 4.2) |
  | Crouched (m/s) | 0.85 | 1.3 | 1.7 | 2.15 | 2.6 |
  | `GAIT_REF` (pose reference), standing / crouched | 0.5 / 0.5 | 1.1 / 0.9 | 2.0 / 1.4 | 3.0 / 1.9 | 4.0 / 2.5 |

- Noise: `NOISE_QUIET` (crouched <= 1.9, standing <= 1.65 m/s silent). Effort curve (`anim/effort.ts` `effortSpeed`): a pace
  is posed at its place between the `GAIT_REF` caps (clip mix, duty, lift, arm swing); stride length and gait clock stay on
  the real pace.
- Momentum (`MotionInput.ct`, `CT` table + `CT_RANGES` in the debug Tune panel, `MotionDriver.stepCt`): the pace follows
  the stick through a critically damped spring (95% within `CT.startTime` 0.3 s, 98% gone within `CT.stopTime` 0.25 s,
  under `CT_REST` 0.1 m/s at rest; never overshoots); the travel direction swings toward the stick over `CT.turnTime`
  0.15 s; a reversal (cos < -0.7) over `pivotSpeed` 1.2 m/s brakes into a planted `pivot` (>= `pivotTime` 0.3 s). States
  `move` / `stop` / `pivot` / `idle`; `RigPose.restX` from `ctStopDistance()`. Aim, draw, strike, crouch and jump stay
  instant. `RigPose.quickStop` = `CT.stopBlend` 0.12 s (`FootPlanner.setDown`), then at most one closing step.
  `StickRelease` (`speedGears.ts`) keeps a springing-back stick's deflection so the stop is from the full pace. Facing
  turns at `CT.turnRate` 720 deg/s. Acceleration lean 0.012 rad per m/s^2, capped 0.09 rad. Remotes (D8):
  `anim/motionDerive.ts` derives acceleration and `move` / `stop` / `idle` from measured velocity (no wire field).
  Heel-to-toe roll: at <= 1.7 m/s (`HEEL_ROLL`, toe up 0.2 rad) a foot lands heel first and rolls flat over 0.1 s.
- Legs and gait against the CT footage (CT prototype G1, `docs/ct-prototype/G1-REPORT.md`, audit
  `docs/ct-prototype/audit/AUDIT-LOCOMOTION.md`): free movement (`stride: 'facing'`) turns the legs as one unit with the
  body: planted feet stay within `TURN_FOLLOW.twistFree` 0.25 rad of the root and inside a 0.055-0.14 m band either side
  of its midline (they scrub round with it, CT style; aiming, walls and cover keep world-locked feet), the pelvis follows
  them by at most `PELVIS_FOLLOW_MAX` 0.05 rad, a foot a turn left behind toes off early. Steps cap at
  `MOVEMENT.stepLenMax` 0.95 m (the run quickens to ~4.7 steps/s at 4.5 m/s; guards uncapped). A stop's set-down lands
  within `STOP_SPLIT` 0.3 m of the planted foot and the held stride straightens up over ~0.15 s (G26 / G27 timings kept).
  Crouched, a stop kneels at once (`KNEEL_STILL` 0.05 s, the stop hold lets go for it), on the trailing knee. The tense
  sneak (G160, `player/tenseSneak.ts`, `TENSE`): crouched at <= 1.4 m/s with an unaware guard within 5 m, 0.85 m steps,
  a high knee lift, the head up, one hand out for balance and the other over the knife; still there it holds the pose (no
  kneel). The remote copy asks the same guards (`setTenseSource`) and derives its landing from the snapshots.
  G1 fix round: the legs turn with the body only while the facing turns (`BAND_TURN_TIME` 0.25 s; straight travel and
  strafes stay world-locked), the band's scrub is capped at `TURN_FOLLOW.scrubSpeed` 1.8 m/s (3 cm a frame), a foot
  outside it steps back in; only guards at alert level 'unaware' set off the tense sneak; a start's gait clock counts
  the target pace for 0.5 s (`START_CLOCK`: the first step lands at ~0.28 s); a stop draws in only a trailing swing foot,
  and a lunge wider than `STOP_CLOSE` 0.45 m closes the rear foot in once after the freeze.
- (anim-rework S2, the real-world standard; `docs/archive/anim-rework/S2-REPORT.md`) Standing free movement: the run is
  4.0 m/s (M6, was 4.5); steps are `0.3 + 0.24 v` up to `stepLenMax` 1.3 m (the walk `WALK_STEP.k` 0.2 to 2.1 m/s;
  crouched keeps `CROUCH_STEP` 0.3 + 0.2 v, 0.95 m): 2.4 steps/s at 1.4 m/s, 2.9 at the jog, 3.2 at the run (was 4.7). A
  landing keeps `FREE_GAP` 0.85 of the stance width from the other foot (was a fixed 13 cm, which pushed the left foot
  out: the wide walk). Standing, a planted foot steps back into the band
  `TURN_FOLLOW.standMinLateral`..`standMaxLateral` 0.03-0.09 m and is never scrubbed through a turn or a direction
  change (the scrub runs only after `SPIN_SCRUB` 0.5 s of continuous fast turning; crouched keeps the G1 band and
  scrub); a clock swing waits while the other foot is still in the air from a rule step at a walk (no two-footed hop in
  a turn from a standstill); a planted heel rises at most `HEEL_RISE` 6 rad/s (a start's first frame no longer drags the
  ankle); standing holstered the pelvis trails the chest toward the planted feet by up to `PELVIS_FOLLOW_KEYED` 0.35 rad
  (the upper body turns first; crouched and drawn keep `PELVIS_FOLLOW_MAX` 0.05, blended by `RigTargets.keyHol`). The
  rest stance is hip width (`IDLE_STANCE` extra 0; standing holstered -0.015, lead 0.04).
- Forward roll: crouch tapped standing at gear >= `rollGear` 5 (or sprinting) while moving >= 1.5 m/s
  (`TraversalController.canForwardRoll`) = `startRoll(true)`: `ROLL` clip, `CT.rollTime` 0.7 s, `CT.rollLength` 3 m
  (shortened by a wall), comes up crouched; noise `CT.rollNoise` 2 m. HUD gear pips: `Hud.setGear` (`GEARS.pipsShow` 1.5 s).
- (anim-rework S3) The aimed glide's steps (`motion.ts` `GLIDE_STEP`, standing, a carrier aiming: `stepLength` /
  `gaitRate` `glide`, the driver's `aiming`, the graph's raise on a remote): a side-step of `lat0 + latK x speed` (a
  shuffle, each foot travelling two steps a cycle), back-steps 35 % shorter, every step at most `fwd0 + fwdK x speed`;
  the closing foot comes in to `GLIDE_GAP` 9 cm (`PlannerInput.glide`; `PLANNER.minGap` 13 cm elsewhere). The feet never
  cross; enemies, holstered and low ready keep the old steps. (anim-rework S4) Crouched aiming glides too (the same side
  step, the crouched landing gap).
- (anim-rework S4, `docs/archive/anim-rework/S4-REPORT.md`) Crouched free movement: the planner's landing gap follows
  the stance (`FREE_GAP`, as standing; the fixed 13 cm held the crouch 9-12.6 cm a foot), a planted foot steps back into
  the crouched band `CROUCH_BAND` 3.5-10 cm (the G1 band's 14 cm before; the turn scrub keeps the G1 band). A stance
  change (the crouch past half way either way) re-steps still feet into the new stance for `RESTEP.window` 1.2 s at a
  sideways error of `RESTEP.err` 2 cm (`PLANNER.idleErr` 7.5 cm otherwise). Crouched steps, speeds and stance times
  unchanged.
- `config/movement.ts` `MOVEMENT` (live-tunable in the Tune panel) keeps the older stick-band tuning (sneak 0.8 / crouch walk
  1.8 / crouch run 2.6, walk 1.4 / jog 2.8, sprint 5.0 m/s; strafe x0.5 (anim-rework S3, the glide: was 0.9) and backstep x0.75 while aiming; stance times
  crouch 0.25 s, kneel 0.3 s, stand 0.28 s); the player's speeds come from the gears. `ENEMY_MOTION` /
  `ENEMY_CALM_MOTION` keep the guards' own tuning as literals (`tests/motion.test.ts` pins them).
- `anim/motion.ts` `MotionDriver` (pure; player and enemies): capped acceleration / deceleration / jerk, a gait clock
  (`phase`) with a heel-strike dip, `faceTravel` (travel heading swings at `travelRate`, 540 deg/s slow down to 300 at a
  sprint), aiming <= 360 deg/s, `carry(vx, vz)` keeps traversal momentum. Enemies keep stepped turns. Frame-rate
  independent (60 vs 120 Hz parity tested).
  (rig-pose-fix S7, G17) The root modulation runs on `simPhase`, which never takes the mocap strafe's side-step
  (`mocapSide`, a per-machine setting): the sim velocity is the same with mocap on or off (`tests/mocapSimParity.test.ts`).
- `player/movement.ts` (pure): `targetSpeed`, `SprintGate` (toggle / hold, ends when the stick drops), `pickTraversal` (step
  <= 0.65 m, vault <= 1.25 m and thin, mantle <= 1.8 m, hop over gaps when sprinting), `noiseRadius`. `PlayerController.steps`
  is 'silent' while an override drives the step; footsteps only when grounded (`PF.silent` for co-op clients). Crouched
  targets are seen at 0.6x the distance. Footstep noise goes to `EnemyManager.hear`.
- `PlayerController.override` lets traversal drive a step (velocity, facing, turn rate, crouch, `glide`, `run`, or a
  kinematic feet path); `speedMul` / `speedCap` slow it.
- Floor settle: Havok holds a supported capsule within 0.14 m of the floor; `PlayerController.settleGap` sets it down on a
  grounded step when it hangs more than `SETTLE.tol` over its rest gap.
- (anim-weight) Momentum tuning: the tuner's Weight section scales the CT pace spring's start / stop times and turn caps
  and can let the stop overshoot and settle (`WEIGHT_MOVE`, read in `MotionDriver.stepCt` inside the local player's
  `weightSim` window; identity by default; `docs/archive/anim-tuner/WEIGHT.md`).

## Networked movement (MoveState)
- `player/moveState.ts` (pure; in `player/` because single player builds it and must never import `src/net`):
  `MoveState {m (MOVE_MODES index; new modes are appended), a anchor, s, sub (u16: ATTACH_SUB phase + face + exit pose),
  ph, tid, g gear, r raise, ay aim twist, rd ready, gp planted grips, c MoveCommit}`, `sanitizeMoveState`, `packMoveState`,
  `poseFromMoveState`, `moveChanged` (send at once). `game/localMoveState.ts` builds it from `GameState`.
- `player/attachGrips.ts` `AttachGrips` (hand / foot `GripStepper`s; shared by `AttachController.grips` and `RemoteAvatar`)
  and `player/traversePath.ts` `traversePath` (committed move paths; the remote replays a `MoveCommit`).
- Host checks: `validate.ts` `moveSpeedCap` (gear pace x `MOVE_TOLERANCE` 1.15) / `attachedClamp` (`ATTACH_SLACK` 0.5) in
  `RemotePlayer.accept`; (rig-pose-fix S1) the client's split hit volumes, perception points and wall head come from the
  sim body model (`player/playerVolumes.ts` `playerBody`, `wireBodyIn` of the accepted state), as the client's own
  (`localBodyIn`), never from the host's drawn copy; a partner's friendly-fire boxes (`Hitboxes.sync(feet, head, hips)`)
  take the model of the drawn copy's state (`RemoteAvatar.bodyIn`). Host `Hist` keeps the mode for `judge`. Co-op details:
  `docs/systems/coop.md`.

## Manual jump
- `LEAP` (`config/movement.ts`): the jump action (Y / E) leaps when traversal has nothing on offer
  (`TraversalController.leap`, `PlayerController.launch` up at `LEAP.vy`; `takeoffT` stops the support check pinning it).
  In the air `fallProbe` / `AttachController.leapProbe` grab drainpipes / ladders within `LEAP.climbReach` (after
  `LEAP.splitWait` over a split gap); a second press within `LEAP.doubleTap` over a split braces in it.

## Split jump, wall jump, pipes (3.2.0 phase 2)
- `player/splitJump.ts` (pure): `findSplitGaps(coverSegments)` (high opposed faces 1.2-1.95 m apart, both >= 2.6 m, same
  floor, overlap >= 0.8 m; `LevelBuilder.build` adds them as `SplitAnchor`s, `anchors.splits`), `splitReach`,
  `wallJumpReach` (lip 2.7-3.8 m), `PipeHang` (hands -> legsUp -> inverted), `SPLIT`, `WALL_JUMP`. `SPLIT.feetHeight` 2.5,
  `rootDrop` 0.37, `minHeight` 3.6. From a split, Y jumps to a lip / pipe / ladder ahead (`findJump`), else drop, drop
  attack or sidearm.
- `AttachController`: `splitProbe` / `wallJumpProbe`, the wall kick path, `pipe` (Y up / B down, `flipDrop`), `onHit`,
  `sidearmAim`, camera presets `split` / `pipeLegs` / `inverted`. Horizontal pipes face along the pipe; held back against
  the facing for `PIPE_TURN` 0.3 s the body turns round.
- Sidearm attached: `Player.attachAim` (aim band clamp; inverted: mirrored spine aim, `RigPose.aimWorldYaw` / `aimWorldPitch`),
  `PlayerWeapons.setAttachedStow(stowed, draw)` (`sidearmIndex`: the first pistol), `attachSpread`. `RigPose.tumble`.
  Clips `SPLIT_BRACE`, `WALL_KICK`, `PIPE_LEGS_UP`, `PIPE_INVERTED`. MoveState modes `split`, `wallJump`; pipe sub-state in
  `ATTACH_SUB` bits 6-9, exit pose `flip`.

## Rappel and fences (3.2.0 phase 3)
- Anchors `RappelPoint {top, nx, nz, length}` (`LevelBuilder.rappel`) and `Fence {a, b, height, t, n}` (`LevelBuilder.fence`:
  see-through chain-link panel, its own static body in `G.FENCE`: the player collides, bullets / sight / level probes do
  not; `navBuild` blocks it; never a level piece). `ATTACH.rappel` (vertical; `s` = rope out) and `ATTACH.fence` (climb
  height is `AttachController.u`). `RAPPEL` / `FENCE` tables. `rappelStep` (kick out, window vault through, unhook) and
  `fenceStep` (climb, shimmy, rattle noise above `FENCE.quietGear`, flip over). Ropes: `world/ropes.ts`. MoveState modes
  `rappel`, `fence`, field `u`, exit pose `fenceFlip`.

## Grab and drop takedowns (3.2.0 phase 4)
- `game/takedown.ts` kinds `drop` (from `hang` / `pipe` / `split` / `zipline` / `rappel`: 1.2-5 m below within 1 m of the
  landing) and `inverted` (a guard within 0.9 m beneath); `below` is the ledge pull. `GRAB` (gear 2, hold 0.42 m, spread
  x1.2, shove stagger 1 s, hesitate 1.5 s), `GRAB_KINDS` (`behind`). Grab flow and the hostage: `docs/systems/takedowns.md`.
- Net: MoveState mode `grab` (`tid`); `CoopHost` keeps a client's seized guard at their offset and `ref.shield`.

## Co-op team moves (3.2.0 phase 5)
- `TEAM` table, `game/teamMoves.ts` (pure: `checkTeamRequest` -> `TeamDenial`, `canBrace`, `boostPath`),
  `game/teamController.ts` `TeamController` (`GameState.team`; states none / brace / boost / assist / ladderUp / top /
  bottom; `offer` = a braced mate within `partnerReach` plus a boost target 1.15 m under `boostMax`: lips 3.75-4.5 m). Y:
  tap at a braced mate = boost, held `TEAM.braceHold` = human ladder, held with a mate within `mateRange` and a wall behind =
  brace; B ends brace / bottom / top. Y order in `GameState`: takedown > team > traversal > interact.
- Net: `tmove` (client -> host), `tstart` / `tdeny` / `tend`; `CoopHost.onTeamMove` checks both sides (`teamSide`: MoveState
  mode, 1 s rate) and starts it on both. MoveState modes `brace`, `boost`, `stacked`. A teleport drops a committed move.
- Decided (G57, G151, G180): team moves work anywhere with room, with a prompt naming the move (G151 replaced G81's
  marked spots); the built set is CT's (leg-up, ledge relay, partner throw, hang-down, rope; G52's brace and dual
  takedown went with G180); one co-op ledge band 4.3-4.5 m. The campaign's co-op traversal kit adds throw over a gap, hold a
  shutter or door, rope brace / descent and vent unlock for the partner, "plus any other creative coop ideas" (G293);
  every campaign section forces one with no solo bypass (G292).

## Weapon carry
- `weapons/weaponCarry.ts` (pure): ready position from context (`pickReady`: compressed near walls, doorways, sprinting,
  reloading; high in tight corridors / traversal; else low), raised only to aim or fire (raise ~170 ms, lower ~300 ms;
  `CARRY.raiseTime` x weapon `weight`), the trigger live at `fireThreshold`, held `holdAfterFire`. `PlayerWeapons` gates
  on `carry.canFire`. Draw and holster timing: `docs/systems/combat.md`.
- Raised = a cheek weld, never hip fire: `SIGHT_RAISE` lifts the gun so its sight line is level with the eye (`sightToEye`),
  the neck flexes onto the stock (`NECK_WELD`), the shoulders lift (`SHOULDER_WELD`). Ready poses (`READY_POSES`): low,
  compressed, high; back to a wall `WALL_READY` (muzzle down along the wall; `AnimInput.wall`, `WALL_STANCE`, the support
  hand on the wall via `RigTargets.offWall` -> `CharacterRig.wallHand`).
- Draw / holster travel (anim-cleanup): the outgoing gun leaves the aim pocket at `TRAVEL_OUT` of the swap and reaches its
  slot at `SWAP_HOLSTER`; the next leaves its slot at `TRAVEL_IN` and is in the pocket at `SWAP_HOLD`. `WeaponModel.travel`
  moves the grip along a cubic curve through `TRAVEL_VIA` (back: over the right shoulder; thigh: out by the hip) to Wren's
  mounts (`WREN_BACK_MOUNT`, `WREN_HOLSTER`). A swap or holster cancels a running reload (`cancelReload`). Playtest 2: the
  trigger hand stays on the gun for the whole travel (`CharacterRig.weaponTravel` holds the grip at weight 1; a draw waits
  in the slot until the wrist is within 0.13 m), and the rifle's back waypoint is out at the shoulder (`TRAVEL_VIA.back`
  [0.36, 0.15, 0.18]), not head height. Remotes still holster by the instant hand-off.
- Shoulder swap: on the left shoulder (`rig.openLeft`) the gun changes hands once `weapons.handSwitchOk` (settled, no reload,
  no travel); co-op carries it as ground `MoveState.sub` bit 128 (`SHOULDER_LEFT_SUB`). (Slice F) Holstered, the camera is
  always over the right shoulder: a swap lasts only while drawn and holstering resets it (`ShoulderCamera.resetShoulder`
  on the draw's falling edge); every mission starts on the right (`gameplay.defaultShoulder` is no longer read or
  written; the field stays, unused); the wall never sets the shoulder (CT aims off the wall). Playtest 2: the sight raise
  rides the hand swap's tuck (no flick, +4 cm) and the camera swap arc is 0.3 m (G3: 0.4 m, CT 111908). The chest carries the aim (`AIM_CHEST`:
  0.75 of the pitch) with the elbows tucked (`AIM_ELBOW_TUCK`).

## Camera
- `config/camera.ts` `CAMERA` + `framing(ads, crouch, C, open)`: free orbit, rigid follow (no lag, no lead, no recentre,
  G159); lowered, looking around only turns the head (`RigPose.lookYaw/lookPitch`); spine, arms and gun follow the camera
  only once raised. (CT prototype G3, `docs/ct-prototype/audit/AUDIT-CAMERA.md`, the footage wins over F1a) Explore:
  boom 2.8 m in an open space (crouched 2.2; the audit's 3.3 m framed Wren at 0.43 of the height in game, CT 0.50), 1.8 m in a tight one (both postures); shoulder 0.15 m (Michael "Match CT
  (0.15 m)"); pivot at the operators' head top 1.68 m (crouched 1.08). Open or tight comes from the map's camera spaces
  (`MapLayout.camSpaces` / `camSize`, `world/camSpaces.ts`; Marlow Yard: the yard and the annex roof open, the airlocks
  and the roofed annex tight), else from probes from the head (back clear past 3.5 m and both sides past 2.0 m, with
  hysteresis); the weight eases on its own spring (`toTight` 6, `toOpen` 4 1/s). In the open the look-at point drops
  `openDrop` 0.25 m under the head (holstered): head top at 0.41 of the height, feet at 0.92 (CT 0.42 / 0.92). Aim: boom
  0.40 m, shoulder 0.30 m (job lead; the head centre at x 0.27-0.30, the reticle clear), the pivot 0.16 m under the head
  top (camera at 1.52 m), in over the weapon's time
  (0.35 s at most off a wall, `adsInWall`), fast out; crouched aim follows `aimCrouchShare` 0.68 of the crouch drop.
  Start pitch 12 deg down (the horizon at 0.30 of the height). FOV is horizontal at 16:9 (`video.fovH`, default 86 =
  CT's 55.7 deg vertical; Michael "Match CT (86)"; `camV` 1 moves a saved 75 to 86 and the pad's vertical look 0.8 to
  1.0), Hor+. Passing through an open doorway (within 1 m of its plane and inside its width, moving across it at 0.3 m/s
  or more: `world/camSpaces.ts` `doorPassing`) the boom pushes in to 0.8 m over 0.4 s and returns over 0.7 s once
  through or stopped (CT 110818, prototype).
- (tuner-camera) Live camera tuning per camera state: the animation tuner's Camera section (`docs/archive/anim-tuner/CAMERA.md`);
  identity at default, the collision still applies; gameplay reads `ShoulderCamera.gamePos`.
- Wall and low-space safety (CAM): sphere casts head -> pivot -> shoulder -> camera, up / down probes, low-space framing,
  near plane only while close (`player/shoulderCamera.ts`, `player/cameraBounds.ts`). Tight spaces: the boom pulls in
  (`boomIn` 16 1/s; the cast still clamps it the same frame) and eases out slowly (`boomOut` 4, about 1.2 s; G3, CT
  053437), then `applyBodyFade` hides the head / body.
- Shake roll is `rotation.z`; the camera sets `updateUpVectorFromRotation` (Babylon otherwise freezes a tilted horizon).
- Cinematic post (`vfx/cinematicPost.ts`): vignette, optional film grain and letterbox; `GameState.slowBeat()` (0.25 s at
  0.6x, `gameplay.slowBeat`) and `letterbox(seconds)`.

## Back-to-wall (locomotion step 11, bible 5.3)
- `player/wallController.ts`: pure `WallCore` (off / entering / on / leaving) on the level's `CoverSegment`s (also used by
  the AI) and an adapter (`wallOverride`) to `MoveOverride` (`noise: 'crouched'`). `GameState.wallStep` runs it each fixed
  step after traversal.
- Enter: the `cover` context action with a face within `WALL.reach` 0.5 m of the body line and within 100 deg of the move
  or look direction (settle 0.14 s + 0.2 s per metre, at most 0.24 s; no snap from afar). Walking into a wall never sticks
  (`WALL.stickEntry` false; `WallCore.stickEnter` keeps the old rule for tests). A stick held through a traversal, attach,
  fall or other blocking state does not count until released once (`stickArmed`). High faces (>= `HIGH_MIN` 1.6 m) keep the
  stance; crouch works on any high wall; low faces are always crouched. Body line = `COVER_STANDOFF` 0.35 m from the face.
- Slide: `wallSlideSpeed`: 0 inside `WALL.slideDead` 0.2, then linear to `slideStand` 0.39 / `slideCrouch` 0.55 m/s at
  full stick at gear 4 (0.35 / 0.5 at the spawn gear 3: G6, AUDIT-WALLS row 2, 051917; the crouched side-on crouch-walk is
  faster than the standing shuffle), `slideGear1` 0.7 of it at gear 1; braked into an end. Joined ends within 0.1 m (`buildWallLinks`): an inside corner wraps,
  a flat join carries on, an outside end stops the body at `EDGE_MARGIN` (WALL_SUB edgeL / edgeR).
- Leave: the context press again (`gameplay.wallToggle`), the stick pulled away > 0.7 held 0.3 s, jump, sprint, takedown,
  traversal, a team move, death.
- Facing and pose: the capsule faces out (gameplay, camera, AI); the posed body (visual yaw, local and remote alike):
  - standing (G6, AUDIT-WALLS row 3, 051917 @ 14-18): square to the wall in a semi-crouch (`WALL_STANCE.pelYStand` -0.08 m),
    sliding the chest turns toward the travel (`spYawSlide` 0.6 rad by the pace) and the head 0.55 -> 1.3 rad toward it,
    dropped 0.3 rad (`wallHeadYaw`, `WALL_LOOK_SLIDE`, `WALL_LOOK_PITCH`); hands hang (`WALL_ARMS`, following the pelvis);
  - crouched (G6, rows 1 / 18, 051917 @ 29-34, Michael 00:55 "holds knee when up against wall"): SIDE-ON, turned
    `WALL_SIDE.yaw` 1.45 rad (83 deg) toward the travel (`wallYawOffset`), the free crouch-walk carriage plus
    `WALL_SIDE_POSE.spine` (trunk about 45 deg over the knees), the slide is a crouch-walk forward (the graph's local move in
    the posed frame); the open-side hand on its knee (`RigTargets.kneeHand`, `KNEE_HAND` in the rig: on the posed knee,
    held through the slide), the wall-side hand low by its shin; the side-on share (`AnimInput.wallTurn`) passes through
    square-on, so a reversal turns through the flat-back stance in about 0.45 s and swaps the hands; low faces too (row 23:
    CT shows a side-on crouch-walk beside low cover, never a flat-back pose);
  - the rig's root comes onto the face by a turned-box reach (`wallRootPush`: half depth x |cos| + shoulder + `WALL_SIDE.arm`
    x |sin|, from the larger of the body's and the shoulders' turn): the back <= 3 cm off it square, the wall-side shoulder
    about 3-5 cm off it side-on;
  - turns (`wallTurnRate`, `WALL_TURN`): the entry front-loaded (22 rad/s for the first 90 deg, then 8: 180 deg in about
    0.27 s, row 15), the settled side-on reversal 6.4 rad/s (0.45 s), the rise to standing about 0.23 s (row 16), the turn
    out of the wall 8 rad/s (AUDIT-EXTRA-OLD row 17; `WALL.leaveTime` 0.28 s). Camera preset `wall`
  (G3: boom 2.0, shoulder 0.15, the whole body; was 2.6 / 0.55), local only; the shoulder swap on the wall eases at `WALL_CAMERA.side` 5 1/s; e2e-wall
  bounds the camera to <= 6 cm per frame and checks it never sits behind geometry.
- Stacking (D8): `stackClamp` keeps capsule centres >= 0.62 m apart along one segment (remotes' `wall` MoveStates via
  `NetHooks.wallOthers`).
- Takedown attacker state: `wall` (high) / `wallLow` (low; maps to `overCover`); a guard round the edge gives `corner`.
- Known pose faults (anim audit wall rows): entry-turn joint rate, shank crossing, forearm clips, the exit pelvis jump and
  the remote `wallClip` in the settle.

## Wall edge verbs (locomotion steps 12 / 12b)
- Edge: on the wall within `WALL.edgeReach` 0.35 m of an outside end. A doorway side is an edge whose coplanar neighbour
  starts 0.8-2.0 m beyond it (`buildWallLinks` `gapA` / `gapB`).
- Peek: stopped on the end, the stick toward the edge (over `peekPush` 0.4) or the look past it, at once (A3), not while
  aiming; holds while the push stays over `peekKeep` 0.25. (G6, AUDIT-WALLS row 9, 052021 @ 3.4-4.6) a small torso lean
  `WALL.peekLean` 0.2 rad (CT 10-15 deg) with the hips onto the outer foot (`PEEK_HIP` 0.7 m per rad) and the rig's root
  `peekStep` 0.2 m toward the edge (visual; the capsule stays), the head turned to the opening (`WALL_LOOK_PEEK` 1.45):
  the head ends `WALL.peekOut` 0.36 m along the wall from the capsule, 0.14 m past the 0.22 m end stop (CT 0.15-0.25; the
  old 0.45 rad lean put it 6 cm short), eased over `peekBlend` 0.3 s; side-on (crouched) the lean goes forward past the
  edge; the camera turns the view up to 25 deg toward the edge (local only). (Slice F) The body's side at
  an edge is the edge's open side (`wallFacing`; remotes from the edge bits), never the camera; the camera slides past the
  edge by `WallCore.peekView` (`wallPeekView`: the stick's push toward the edge or the look past it, from `viewLook`
  0.2 to `peekLook`): the pivot up to `WALL_CAMERA.peek.offset`, the shoulder offset turning to the open side (edge
  direction . camera right, continuous) and the boom in to `peek.boom` 1.4 m, eased (soft-linear `peekEase`) in over
  `peek.blend` 0.35 s and back over `peek.out` 0.3 s, the open-side offset growing to `peek.shoulder` 0.55 (G3; CT 0.2 /
  0.17 s; slice F had 0.55 s both ways; faster needs e2e-wall's 6 cm per-frame cap revisited).
- Lean-out (removed by decision, loco M20 Q1): aim at the end of a high wall steps the capsule `WALL.leanOut` 0.35 m past
  the end (MoveState `lk` 1); aim on a low wall rises over the top (`lk` 2). At a left edge the weapon goes to the left hand
  (`wallLeftHand`, `CharacterRig.openLeft`, `EDGE_HAND_TIME` 0.25 s). Low wall at an end: `lowAimKind` picks the side lean
  or the rise; `wallHeadCap` keeps the head under the top (`LOW_HEAD_CLEAR` 0.14 m).
- SWAT turn (removed by decision, loco M20 Q1): at a doorway edge, the context press with the stick toward the gap: a
  crouched committed move to the far wall (`swatDuration`, MoveState `swat`, host check `swatCommitOk`).
- Remote yaw: the host's copy of a wall body eases toward the face normal plus the side-on offset at the owner's
  `wallTurnRate` (the side from WALL_SUB: `wallSideFromSub`), and steps toward the edge with the peek bit as the owner.
- Aiming at a wall (G6, AUDIT-WALLS row 12, 051917 @ 10.9-12.3): one ray from the shoulder along the aim (`player/wallBlock.ts`
  `muzzleBlock`; the local player each fixed step, the remote copy each frame while raised); (anim-n3b, replaces the G6
  muzzle-up swing) blocked from an amount of 0.35 (about 0.58 m), clear under 0.1, the weapon comes off the eye and tips
  about 66 deg below the aim line about the butt, pulled in (`WALL_BLOCK`, `AnimInput.wallBlock`), one eased 0.4 s move
  each way. Pose only: firing is not blocked yet.
- Light parity (bible 5.1): the light meter samples the chest and the head at its real place (`LightField.bodyLevel`): the
  local body's peek offset; a remote's from its MoveState (`wallPeekOffset`, conservative). On the wall the meter's head
  sample and perception's exposure points (and the HUD exposure) are the sim body's head and chest (rig-pose-fix S4, A2
  supersedes A51: `playerBody` of the wall state, side, crouch and the peek's share, fitted to the rig within 2-5 cm), the
  same model the hit volumes follow, on the owner and the host alike. Guards see the body, never the camera.

## Door open (CT prototype G6, AUDIT-WALLS row 4)
- The door menu's Open is a short committed move (`world/doorOpen.ts`, pure `DoorOpenCore`, `DOOR_OPEN`; `GameState.doorOpenStep`):
  the body steps over `step` 0.5 s to a spot beside the latch (`doorOpenSpot`: 0.55 m off the leaf, 0.25 m in from the
  latch edge, turned 35 deg toward the hinge; a leaf that swings toward the body: 0.3 m past the latch edge, out of its
  sweep), the near hand rises onto the leaf (a push: the hinge-side hand, palm 0.22 m in from the latch edge; a pull: the
  latch-side hand on the handle) and follows it, the door opens through its own call (the host's in co-op) `leafAt` 0.8 s
  after the pick (052349: pick 5.15, leaf 5.95), the hand lets go at 65 deg (35 on a pull), the body is free about 1.6 s
  after the pick. Damage, a takedown, an attach or death ends it.
- Swing (`world/doors.ts`): `DOOR.openAngle` 1.53 rad (88 deg; was 1.75); a quiet open eases out (`quietShape`: 0.89 of the
  swing over `quietTime` 0.75 s, CT 45 deg at 0.25 s and 78 at the swing end), then a drawn drift to the full angle over
  `quietDrift` 2 s; `open` (doorway, light, sight) is 1 from the swing's end. A close starts from the drawn leaf
  (`leafFraction`, `visMax`). A guard pushes a door open in `enemyTime` 0.4 s and a guard-opened door shuts in
  `autoCloseTime` 0.35 s (AUDIT-EXTRA-OLD row 6, 052832); the player's close stays `closeTime` 0.8 s (row 17). When it
  shuts is still `stealthSystems.ts` `DOOR_GUARD_CLOSE` 1.5 s after the doorway is clear (CT about 1.0 s; G7's file).
- Remotes see the step (positions); the hand on the leaf is local only (no wire change).
- Tests: `tests/doorOpen.test.ts`, `tests/doors.test.ts`; e2e-stealth-ai `doors`; anim-sheet `dooropen`, `dooropenpull`.

## Door peek (locomotion step 13, A25 / A52)
The door menu's Stealth open starts it (A3).
- Core: `world/doorPeek.ts` (pure, `DoorPeekCore`, `DOOR_PEEK`, `DOOR_CRACK`). Eligible (`doorPeekEligible`) at a closed,
  unlocked, uncracked door whose leaf is within 1.0 m and faced within 60 deg, grounded and in no other state.
- (G6, AUDIT-WALLS row 14, 052349 @ 13.6-18.6: picked 14.1, the step and the hand up 14.4-14.8, the camera in at about
  15.0, the leaf at about 15.6) a `DOOR_PEEK.settle` 0.5 s settle onto the frame (hinge at one shoulder, the hand on the
  handle), `crackDelay` 0.7 s holding the handle while the view moves in (phase `ready`), then the leaf cracks to 0.12 over
  0.6 s, quiet: the leaf moves 1.2 s after the pick (CT 1.5; kept shorter for the co-op suites' waits). The stick then
  drives it at `DRIVE_RATE` 0.15 of the swing per second (13 deg/s; CT 12-18; was 0.2).
- View (local only): `ShoulderCamera.doorPeek` eases the eye to the crack; no zoom (G3: `fovMul` 1, was 0.85); the look is clamped to +-35 deg
  around the door's normal (`clampPeekYaw`).
- Exits: the context press again or the stick held back 0.2 s closes the crack (0.4 s, quiet); the stick pushed in or
  `interact` opens the door quietly; damage, aim, jump or sprint ends the peek (the door stays cracked); a door opened fully
  by anyone ends it.
- MoveState `doorPeek`: `a` door index, `sub` bit 1 hinge on the right, `ph` the crack; remotes pose at the frame.
- Tests: `tests/doorPeek.test.ts`, `tests/doors.test.ts`; e2e-pad, e2e-mouse, e2e-netmove `doorPeek`, e2e-coop; anim-audit
  `doorpeek`.

## Traversal anchors and attached states
- `world/anchors.ts` (pure): `Ladder`, `PipeVertical`, `PipeHorizontal`, `Ledge`, `Duct`, `WindowAnchor`, `Door`,
  `Zipline` in a `TraversalAnchors` (ids index `all`; co-op sends them). `generateLedges(boxes)` makes lips from box tops
  (`LEDGE.minDrop` 1.9 m; `noLedge` pieces skipped); `LevelBuilder` places the rest and adds the generated ledges to
  `BuiltLevel.anchors`. Helpers: `closestOn`, `reach`, `nearestInReach`, `anchorsNear`, `hangPoint` (`HANG.drop` 1.9 m,
  `HANG.out` 0.22 m), `lipGrips`, `nearestRung`, `ductPoint`, `ledgeContinuation`, `findJumpTarget`. Climbers stand
  `CLIMB_STANDOFF` 0.28 m off the rungs / pipe. `REACH.grabMax` 2.7, `LEDGE.climbDepth` 0.38.
- World grips (anim-cleanup): `AttachGrips.gripAxes` gives each hand target the real geometry's axis, radius and a point on
  it (rung, pipe, ledge lip, zipline cable, rappel rope, fence rail); `CharacterRig.solveWorldGrip` puts the palm on the
  surface (`PALM_DEPTH` 0.014) with the fingers wrapped, reach capped at 96 %. Rungs and fence wires use a fixed overhand
  grip. Reach writers that are not grips (takedowns, stealth, remote avatars) clear the axis.
- `player/attach.ts` (pure): `AttachMachine` (none -> enter -> on -> exit) with `ATTACH` specs per kind (axis, speed,
  enter / exit times, camera preset, `allow` sidearm / takedown / drop / traverse / gadgets, `holster`); `axisInput`,
  `attachPose`, `attachRange`, `update` (reports `edge`). Gameplay calls pass `GAMEPLAY_HEIGHT` (1.75, G176), never the
  drawn body's height; `attachLift` is the visual offset of a body of another height (grips and the rig root only). Ladder 1.7 rungs/s up
  (`LADDER_RUNG_RATE`, ct-prototype G4 from CT 112102; was 3), 1.3x that down (`LADDER_DOWN_RATE`); sprint held
  `LADDER_SPRINT_RATE` 3, drainpipe x`PIPE_SPRINT` (to be removed, G31); slide `LADDER_SLIDE`; zipline to `ZIP_SPEED` 6 m/s.
- `TraversalController.attach`: `attachTo(anchor, s, entry)`, `detach(reason)`; drives `override.kinematic`, sets
  `pose.traverse` (`hang` / `climb` / `pipeClimb` / `crawl` / `crawlOut`), stows the weapon (`PlayerWeapons.setStowed`) and sets `cam.attach`
  (`ATTACH_FRAMING`; G3 from the CT footage: hang / shimmy boom 3.5 centred at the body's middle, ladder centred,
  drainpipe 2.8 centred, rappel 3.0 centred, duct 0.45 m just behind the head (blend 0.4 s), the wall 2.0; the presets'
  `pitch` field is not read by the camera). While attached the graph skips the swap clip.
- `player/attachController.ts`: from the ground the probe asks `probe` (5 Hz); traverse attaches when no step / vault /
  mantle is offered; at a hangable edge the drop control held `LOWER_HOLD` lowers in. Attached: drop lets go, traverse
  jumps (`findJumpTarget`: <= 2.5 m along the stick) or climbs up (`canClimb`); a lip's end continues round the corner;
  `sidePush` swings onto a lip beside a ladder / drainpipe; `passClimber`. Hands and feet step with `GripStepper` per render
  frame. (G4, matched to the CT footage, `docs/ct-prototype/G4-REPORT.md`) The hang shimmy is 0.5 m/s (`ATTACH.ledge.speed`;
  D2b's 0.7, was 1.2) with the hands reaching one at a time, back to back (`alternate`, `leadTime` 0.6 s; ledges only;
  offsets +-0.25, 0.32 s reach, 9 cm lift, 8 cm arc). Hanging from a lip the lower body swings sideways as a pendulum
  (`AttachGrips.hangSwing`, `HANG_SWING`): the hips trail the hands' midpoint while shimmying and sway slowly at rest; the
  swing reaches the looping HANG clip as `traverseT` (`AttachGrips.cadence`, remotes alike). Drainpipe: one reach per hand
  about every second (slack 0.5, swing `CLIMB_HAND_SWING` 0.3 s) and one pair of feet that steps together after each hand
  lands (`PIPE_FEET`), posed by `PIPE_CLIMB` (`pipeClimb`) from how drawn up the feet are. Ladder: each hand and foot moves
  2 rungs a reach (slack 1.9 rungs), 0.3 s swings; mounting from the top `LADDER_TOP_TIME` 1.2 s (turned round first, then
  lowered); over the top `LADDER_TOPOUT_TIME` 0.85 s with the climb-up's knee, ending crouched 0.4 m in; the drop control
  lets go below `LADDER_DROP_MAX` 1.2 m (slides above it). The ledge climb-up is `CLIMB_UP_TIME` 0.85 s to a crouch on top
  (the knee on at 0.47 s, the chest pitched low over the lip so the palms stay on it until the right foot is on the top at
  k 0.474, then let go over `CLIMB_UP_HANDS` 0.475 - 0.643 of the 1.3 s clip while the trunk rises into the crouch; a lip
  grip's hand pivots over the edge continuously as the shoulder leaves its reach) and ends crouched unless
  the stick is held there (then `CLIMB_UP_STAND` 0.45 s more); team boost / relay / rope-top climb-ups keep the old
  one-rise clip (`CLIMB_UP_TEAM`). A drop from a lip / pipe lands crouched. A lip grabbed from the ground takes
  `jumpGrabTime` (0.3 s low, 0.55 s at 2.4 m). Out of a wall vent `DUCT_CRAWL_OUT` 2.5 s (crawl out, rise to the crouch,
  `CRAWL_OUT`). Rappel: hook on `RAPPEL.hookTime` 1.8 s, down 0.6 m/s. Drainpipe and ladder knees bend up, forward and out
  (`CLIMB_KNEE_UP`, `CLIMB_KNEE_OUT`), the planted foot's lift is capped (`CLIMB_FOOT_BELOW`). Vaults and mantles at speed
  take at least `MIN_TIME` 0.6 / 0.9 s; a vault onto a floor 0.3 m+ lower lands crouched. Prompts
  (`GameState.anchorPrompts`): vault (Climb / Grab / Climb up), jumpTo, drop (Drop / Slide / Hang).
- Landings (`player/movement.ts` `LANDING` / `landingKind` / `landingNoise`): a roll is a committed traversal, heavy =
  `landT` recovery; GameState makes landing / glass / kick noise. Falling past a lip: `fallProbe` (Y grabs). Windows:
  `windowProbe` -> a vault through, breaking the glass. Ducts: `AttachController.vent` (tap kick / hold unscrew; the pure classifier
  `player/ventOpen.ts`: Y / Space starts it, A / E held unscrews; vent-kick, M1, pad and keyboard alike: jump still held
  (any source, `inp.down('jump')`) is no kick and its hold carries on into A / E, so a Y / Space tap kicks and Y / Space
  held, or Y / Space then A / E held, unscrews; a scripted `tap('jump')` holds nothing, so A must be down by the second
  step after it, else it kicks), crawl, `ductEnd`. `Breakables` (`world/breakables.ts`): glass / grate panels. `anchorFirst`: ladder / drainpipe / duct / zipline
  hints beat geometric moves.
- `BoxPiece.overhead` (`LevelBuilder.mark`): ceiling slabs / ducts that never block the floor's nav cells.
- Rig world targets: `reachL/R` (palm points) override the weapon / clip hands; `plantL/R` (sole points) override the feet.
- Input: `drop` is raised with `crouch` (alias), `interactHold` after `INTERACT_HOLD` 0.3 s; `heldTime` / `holdProgress`.
