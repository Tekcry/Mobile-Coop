# Movement, camera and traversal
Purpose: the operator's movement, camera, back-to-wall, door peek, traversal anchors and attached states.
Design authority: docs/DECISIONS.md (G1, G25-G39), then docs/design-bible.md (Sections 4 and 5.3).

Every number in this file is a starting value, tuned after Michael plays the CT prototype (G4, G10). The CT research is
docs/locomotion/CT-RESEARCH.md; the prototype plan is docs/locomotion/PROTOTYPE-PLAN.md. History of how the code got here:
docs/archive/ct-movement.md and the git log.

## Decided direction (the CT prototype builds it)
The code below is the locomotion run's build. Where Michael has decided otherwise, the line says so:
- Decided, not built yet (loco M20 Q8, G62): no sprint. Code: gear 6 is a sprint on `dash` (L3 / Left Shift).
- Decided, not built yet (G18, G96): back-to-wall on L3 and the exact CT pad layout. Code: back-to-wall is on A.
- Decided, not built yet (G25): an on-the-spot turn is a tight walking circle; a run reversal is one smooth turn of about
  0.4 s; no planted pivot. Code: reversals over `pivotSpeed` brake into a planted `pivot`.
- Decided, not built yet (G26, G27): stops freeze mid-stride at every speed (from a run the body slides up to about 0.3 m);
  the frozen stride holds about 1.7 s, then eases to a feet-together idle.
- Decided, not built yet (G32): holding crouch while running rolls; a tap just crouches. Code: a crouch tap at gear >= 5.
- Decided, not built yet (G33): no special quick 180; a stick flick turns in about 0.4 s while walking.
- Decided, not built yet (G31): no fast ladder climb, fast rappel descent, small gap hops or sprint door bash. A bash is a
  door-menu choice only (G97).
- Decided, not built yet (G28, G29, G38): CT camera framing (about 1.8 m boom, the head at screen centre, legs partly out of
  frame), rigid follow, a gentle swing toward travel, no bob, no zoom when aiming, one camera height for every operator.
- Decided, not built yet (G17): the shoulder swap works only while aiming. Code: R3 / V swaps at any time.
- Decided, not built yet (G30): of the modern layer keep only start lean, head look-at, hands on doors and ledges, feet on
  stairs and faster vaults from a run.
- Decided, not built yet (G16): no aim assist on any input. Code: pad aim assist (`gamepad.aimAssist`, default standard).
- Decided, not built yet (G35, G36, loco M25 (3)-(4)): wall slide is the CT shuffle, about 0.35 m/s; peek as soon as the
  operator reaches the edge while pushing; only the button or aiming leaves the wall; flat back standing, sideways
  crouched. Code: 0.9 / 0.6 m/s, a 0.25 s push to peek, a held pull-away also leaves.
- Decided, not built yet (loco M20 Q1, G52): the lean-out aim and the SWAT turn are removed, with their network fields.
  Code: both still exist (Wall edge verbs below).
- Decided, not built yet (G97, G41): a CT door menu (open, stealth open, bash, optic cable); a door past about 15% open
  passes light, sound and sight. Code: the crack peek below.
- Decided, not built yet (G40): the two slowest standing and the three slowest crouched speeds are silent. Code:
  `NOISE_QUIET` makes standing gears 1-2 and crouched gears 1-4 silent.
- Decided (G34): wall entry by button only (built). G37: the CT back-to-wall is the only wall move. G109: every operator
  moves the same. G110: no prone crawl, no rope climb. G56: crawl spaces are crouch-walked.

## Speed gears and feel
- Gears (`player/speedGears.ts` pure, `GEARS` in `config/movement.ts`): 6 gears, spawn / respawn gear 3 (`GameState` resets
  it on respawn; `?gear=N` for tests, `e2e-lib` adds `gear=4` unless a suite names one), kept through stance changes;
  `PlayerController.gears`, `speedUp` / `speedDown` (pad D-pad up / down, keys `=` / `-`, mouse wheel). Target = gear cap
  x `stickCurve` (dead zone 0.05, linear). Aiming capped at 1.4 / 1.0. Gear 6 standing is the sprint. Analog snapping
  within the maximum gear: `docs/systems/input-and-loop.md`.

  | Gear | 1 | 2 | 3 | 4 | 5 | 6 |
  | --- | --- | --- | --- | --- | --- | --- |
  | Standing (m/s) | 0.65 | 1.1 | 1.65 | 2.3 | 3.15 | 4.15 (sprint) |
  | Crouched (m/s) | 0.42 | 0.75 | 1.08 | 1.5 | 1.9 | 2.3 |
  | `GAIT_REF` (pose reference), standing / crouched | 0.8 / 0.5 | 1.3 / 0.9 | 2.0 / 1.3 | 2.8 / 1.8 | 3.8 / 2.3 | 5.0 / 2.8 |

- Noise: `NOISE_QUIET` (crouched <= 1.7, standing <= 1.45 m/s silent). Effort curve (`anim/effort.ts` `effortSpeed`): a pace
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
  Heel-to-toe roll: at <= 1.7 m/s (`HEEL_ROLL`) a foot lands heel first and rolls flat over 0.1 s.
- Forward roll: crouch tapped standing at gear >= `rollGear` 5 (or sprinting) while moving >= 1.5 m/s
  (`TraversalController.canForwardRoll`) = `startRoll(true)`: `ROLL` clip, `CT.rollTime` 0.7 s, `CT.rollLength` 3 m
  (shortened by a wall), comes up crouched; noise `CT.rollNoise` 2 m. HUD gear pips: `Hud.setGear` (`GEARS.pipsShow` 1.5 s).
- `config/movement.ts` `MOVEMENT` (live-tunable in the Tune panel) keeps the older stick-band tuning (sneak 0.8 / crouch walk
  1.8 / crouch run 2.6, walk 1.4 / jog 2.8, sprint 5.0 m/s; strafe x0.9 and backstep x0.75 while aiming; stance times
  crouch 0.25 s, kneel 0.3 s, stand 0.28 s); the player's speeds come from the gears. `ENEMY_MOTION` /
  `ENEMY_CALM_MOTION` keep the guards' own tuning as literals (`tests/motion.test.ts` pins them).
- `anim/motion.ts` `MotionDriver` (pure; player and enemies): capped acceleration / deceleration / jerk, a gait clock
  (`phase`) with a heel-strike dip, `faceTravel` (travel heading swings at `travelRate`, 540 deg/s slow down to 300 at a
  sprint), aiming <= 360 deg/s, `carry(vx, vz)` keeps traversal momentum. Enemies keep stepped turns. Frame-rate
  independent (60 vs 120 Hz parity tested).
- `player/movement.ts` (pure): `targetSpeed`, `SprintGate` (toggle / hold, ends when the stick drops), `pickTraversal` (step
  <= 0.65 m, vault <= 1.25 m and thin, mantle <= 1.8 m, hop over gaps when sprinting), `noiseRadius`. `PlayerController.steps`
  is 'silent' while an override drives the step; footsteps only when grounded (`PF.silent` for co-op clients). Crouched
  targets are seen at 0.6x the distance. Footstep noise goes to `EnemyManager.hear`.
- `PlayerController.override` lets traversal drive a step (velocity, facing, turn rate, crouch, `glide`, `run`, or a
  kinematic feet path); `speedMul` / `speedCap` slow it.
- Floor settle: Havok holds a supported capsule within 0.14 m of the floor; `PlayerController.settleGap` sets it down on a
  grounded step when it hangs more than `SETTLE.tol` over its rest gap.

## Networked movement (MoveState)
- `player/moveState.ts` (pure; in `player/` because single player builds it and must never import `src/net`):
  `MoveState {m (MOVE_MODES index; new modes are appended), a anchor, s, sub (u16: ATTACH_SUB phase + face + exit pose),
  ph, tid, g gear, r raise, ay aim twist, rd ready, gp planted grips, c MoveCommit}`, `sanitizeMoveState`, `packMoveState`,
  `poseFromMoveState`, `moveChanged` (send at once). `game/localMoveState.ts` builds it from `GameState`.
- `player/attachGrips.ts` `AttachGrips` (hand / foot `GripStepper`s; shared by `AttachController.grips` and `RemoteAvatar`)
  and `player/traversePath.ts` `traversePath` (committed move paths; the remote replays a `MoveCommit`).
- Host checks: `validate.ts` `moveSpeedCap` (gear pace x `MOVE_TOLERANCE` 1.15) / `attachedClamp` (`ATTACH_SLACK` 0.5) in
  `RemotePlayer.accept`; `RemotePlayer.followPose` and `Hitboxes.sync(feet, head, hips)` lay the capsules along hips ->
  head; host `Hist` keeps the posed head / hips and the mode for `judge`. Co-op details: `docs/systems/coop.md`.

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
- Decided (G52, G57, G81): the four team moves that exist (brace, boost, human ladder, dual takedown) are the set until the
  co-op phase; one co-op ledge band 4.3-4.5 m; boosts only at marked spots (not built yet).

## Weapon carry
- `weapons/weaponCarry.ts` (pure): ready position from context (`pickReady`: compressed near walls, doorways, sprinting,
  reloading; high in tight corridors / traversal; else low), raised only to aim or fire (raise ~170 ms, lower ~300 ms;
  `CARRY.raiseTime` x weapon `weight`), the trigger live at `fireThreshold`, held `holdAfterFire`. `PlayerWeapons` gates
  on `carry.canFire`. Draw and holster timing: `docs/systems/combat.md`.
- Raised = a cheek weld, never hip fire: `SIGHT_RAISE` lifts the gun so its sight line is level with the eye (`sightToEye`),
  the neck flexes onto the stock (`NECK_WELD`), the shoulders lift (`SHOULDER_WELD`). Ready poses (`READY_POSES`): low,
  compressed, high; back to a wall `WALL_READY` (muzzle down along the wall; `AnimInput.wall`, `WALL_STANCE`, the support
  hand on the wall via `RigTargets.offWall` -> `CharacterRig.wallHand`).

## Camera
- `config/camera.ts` `CAMERA` + `framing()`: free orbit; lowered, looking around only turns the head
  (`RigPose.lookYaw/lookPitch`); spine, arms and gun follow the camera only once raised. Framing: the operator in the left
  third (boom 2.2 / ADS 1.5, shoulder 0.62 / 0.58, pivot 1.62 / crouched 1.18); back to a wall pulls back `coverBoom`. FOV
  is horizontal at 16:9 (`video.fovH`, default 75), Hor+. Springs per render frame: follow 80-150 ms with look-ahead, aim
  framing 150-250 ms, shoulder swap ~250 ms on an arc, optional auto-recentre (`gameplay.autoRecentre`), handheld drift
  (<= 0.15 deg), micro-bob (<= 1 cm), dash FOV and boom. G28 / G29 replace this framing (Decided direction above).
- Wall and low-space safety (CAM): sphere casts head -> pivot -> shoulder -> camera, up / down probes, low-space framing,
  near plane only while close (`player/shoulderCamera.ts`, `player/cameraBounds.ts`). Tight spaces: the boom pulls in fast
  and eases out slowly, then `applyBodyFade` hides the head / body.
- Shake roll is `rotation.z`; the camera sets `updateUpVectorFromRotation` (Babylon otherwise freezes a tilted horizon).
- Aim assist (`weapons/aimAssist.ts`, pad only): friction fades across the cone edge, magnetism fades at the centre. To be
  removed (G16).
- Cinematic post (`vfx/cinematicPost.ts`): vignette, optional film grain and letterbox; `GameState.slowBeat()` (0.25 s at
  0.6x, `gameplay.slowBeat`) and `letterbox(seconds)`.

## Back-to-wall (locomotion step 11, bible 5.3)
- `player/wallController.ts`: pure `WallCore` (off / entering / on / leaving) on the level's `CoverSegment`s (also used by
  the AI) and an adapter (`wallOverride`) to `MoveOverride` (`noise: 'crouched'`). `GameState.wallStep` runs it each fixed
  step after traversal.
- Enter: the `cover` context action with a face within `WALL.reach` 0.9 m of the body line and within 100 deg of the move
  or look direction (settle 0.2 s + 0.3 s per metre, at most 0.45 s; no snap from afar). Walking into a wall never sticks
  (`WALL.stickEntry` false; `WallCore.stickEnter` keeps the old rule for tests). A stick held through a traversal, attach,
  fall or other blocking state does not count until released once (`stickArmed`). High faces (>= `HIGH_MIN` 1.6 m) keep the
  stance; crouch works on any high wall; low faces are always crouched. Body line = `COVER_STANDOFF` 0.35 m from the face.
- Slide: `wallSlideSpeed`: 0 inside `WALL.slideDead` 0.2, then linear to `slideStand` 0.9 / `slideCrouch` 0.6 m/s at full
  stick, never over the gear's cap; braked into an end. Joined ends within 0.1 m (`buildWallLinks`): an inside corner wraps,
  a flat join carries on, an outside end stops the body at `EDGE_MARGIN` (WALL_SUB edgeL / edgeR).
- Leave: the context press again (`gameplay.wallToggle`), the stick pulled away > 0.7 held 0.3 s, jump, sprint, takedown,
  traversal, a team move, death.
- Facing and pose: the body faces out; `pose.wall` (`WALL_STANCE`), the head turned along the slide (`WALL_LOOK`), the rig
  pushed onto the face so the back sits <= 3 cm off it (`wallRootPush`), the off hand on the wall. Camera preset `wall`
  (boom 2.6, the open-side shoulder), local only; the shoulder swap on the wall eases at `WALL_CAMERA.side` 5 1/s; e2e-wall
  bounds the camera to <= 6 cm per frame and checks it never sits behind geometry.
- Stacking (D8): `stackClamp` keeps capsule centres >= 0.62 m apart along one segment (remotes' `wall` MoveStates via
  `NetHooks.wallOthers`).
- Takedown attacker state: `wall` (high) / `wallLow` (low; maps to `overCover`); a guard round the edge gives `corner`.
- Known pose faults (anim audit wall rows): entry-turn joint rate, shank crossing, forearm clips, the exit pelvis jump and
  the remote `wallClip` in the settle.

## Wall edge verbs (locomotion steps 12 / 12b)
- Edge: on the wall within `WALL.edgeReach` 0.35 m of an outside end. A doorway side is an edge whose coplanar neighbour
  starts 0.8-2.0 m beyond it (`buildWallLinks` `gapA` / `gapB`).
- Peek: stopped on the end, the stick toward the edge (over `peekPush` 0.6) or the look past it held `peekHold` 0.25 s, not
  while aiming; holds while the push stays over `peekKeep` 0.35; the head and near shoulder lean out (head <=
  `WALL.peekOut` 0.25 m); the camera turns the view up to 25 deg toward the edge (local only).
- Lean-out (removed by decision, loco M20 Q1): aim at the end of a high wall steps the capsule `WALL.leanOut` 0.35 m past
  the end (MoveState `lk` 1); aim on a low wall rises over the top (`lk` 2). At a left edge the weapon goes to the left hand
  (`wallLeftHand`, `CharacterRig.openLeft`, `EDGE_HAND_TIME` 0.25 s). Low wall at an end: `lowAimKind` picks the side lean
  or the rise; `wallHeadCap` keeps the head under the top (`LOW_HEAD_CLEAR` 0.14 m).
- SWAT turn (removed by decision, loco M20 Q1): at a doorway edge, the context press with the stick toward the gap: a
  crouched committed move to the far wall (`swatDuration`, MoveState `swat`, host check `swatCommitOk`).
- Remote yaw: the host's copy of a settled wall body eases toward the face normal at `WALL_TURN_RATE` 12 rad/s.
- Light parity (bible 5.1): the light meter samples the chest and the head at its real place (`LightField.bodyLevel`): the
  local body's peek offset; a remote's from its MoveState (`wallPeekOffset`, conservative). On the wall the meter's head
  sample and perception's exposure points are the posed rig's head and chest (`CharacterRig.posedHead` / `posedChest`), the
  same joints the hit volumes follow. Guards see the body, never the camera.

## Door peek (locomotion step 13, A25 / A52)
To be replaced by the CT door menu (G97); this is the current build.
- Core: `world/doorPeek.ts` (pure, `DoorPeekCore`, `DOOR_PEEK`, `DOOR_CRACK`). Eligible (`doorPeekEligible`) at a closed,
  unlocked, uncracked door whose leaf is within 1.0 m and faced within 60 deg, grounded and in no other state.
- Context press (`cover`: pad A, KBM Space): a 0.25 s settle onto the frame (hinge at one shoulder, the hand on the handle),
  then the leaf cracks to 0.12 over 0.6 s, quiet.
- View (local only): `ShoulderCamera.doorPeek` eases the eye to the crack; FOV x0.85; the look is clamped to +-35 deg
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
- `player/attach.ts` (pure): `AttachMachine` (none -> enter -> on -> exit) with `ATTACH` specs per kind (axis, speed,
  enter / exit times, camera preset, `allow` sidearm / takedown / drop / traverse / gadgets, `holster`); `axisInput`,
  `attachPose`, `attachRange`, `update` (reports `edge`). Gameplay calls pass `GAMEPLAY_HEIGHT` (1.75, G139), never the
  drawn body's height; `attachLift` is the visual offset of a body of another height (grips and the rig root only). Ladder 3 rungs/s (`LADDER_RUNG_RATE`); sprint held
  `LADDER_SPRINT_RATE` 5, drainpipe x`PIPE_SPRINT` (to be removed, G31); slide `LADDER_SLIDE`; zipline to `ZIP_SPEED` 6 m/s.
- `TraversalController.attach`: `attachTo(anchor, s, entry)`, `detach(reason)`; drives `override.kinematic`, sets
  `pose.traverse` (`hang` / `climb` / `crawl`), stows the weapon (`PlayerWeapons.setStowed`) and sets `cam.attach`
  (`ATTACH_FRAMING`). While attached the graph skips the swap clip.
- `player/attachController.ts`: from the ground the probe asks `probe` (5 Hz); traverse attaches when no step / vault /
  mantle is offered; at a hangable edge the drop control held `LOWER_HOLD` lowers in. Attached: drop lets go, traverse
  jumps (`findJumpTarget`: <= 2.5 m along the stick) or climbs up (`canClimb`); a lip's end continues round the corner;
  `sidePush` swings onto a lip beside a ladder / drainpipe; `passClimber`. Hands and feet step with `GripStepper` per render
  frame. Prompts (`GameState.anchorPrompts`): vault (Climb / Grab / Climb up), jumpTo, drop (Drop / Slide / Hang).
- Landings (`player/movement.ts` `LANDING` / `landingKind` / `landingNoise`): a roll is a committed traversal, heavy =
  `landT` recovery; GameState makes landing / glass / kick noise. Falling past a lip: `fallProbe` (Y grabs). Windows:
  `windowProbe` -> a vault through, breaking the glass. Ducts: `AttachController.vent` (tap kick / hold unscrew), crawl,
  `ductEnd`. `Breakables` (`world/breakables.ts`): glass / grate panels. `anchorFirst`: ladder / drainpipe / duct / zipline
  hints beat geometric moves.
- `BoxPiece.overhead` (`LevelBuilder.mark`): ceiling slabs / ducts that never block the floor's nav cells.
- Rig world targets: `reachL/R` (palm points) override the weapon / clip hands; `plantL/R` (sole points) override the feet.
- Input: `drop` is raised with `crouch` (alias), `interactHold` after `INTERACT_HOLD` 0.3 s; `heldTime` / `holdProgress`.
