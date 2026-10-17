# Movement, camera and traversal
Purpose: the stealth operative's movement, the Chaos Theory movement phases, camera, traversal anchors and attached states, corners.
Design authority: docs/design-bible.md (Sections 4 and 5.3)

## Movement and camera (stealth operative)
- Chaos Theory movement (3.2.0, in progress): spec `docs/ct-movement.md`, status `docs/ct-movement-progress.md`.
- 3.2.0 phase 0 (player free movement only; traversal and enemies keep the rest of this section):
  speed gears (`player/speedGears.ts` pure, `GEARS` in `config/movement.ts`): 6 gears, spawn / respawn gear 3
  (`GameState` resets it when the player comes back alive; `?gear=N` for tests, `e2e-lib` adds `gear=4` = the 2.x jog
  unless a suite names a gear), kept through stance changes; `PlayerController.gears`, `speedUp` / `speedDown`
  (pad D-pad up / down, wheel + `=` / `-`, touch rocker). Target = gear cap x `stickCurve` (dead zone 0.05, linear); `targetSpeed(.., gear)` replaces the stick bands for the
  player; aiming capped at 1.4 / 1.0; the sprint is gear 6 standing.

  | Gear | 1 | 2 | 3 | 4 | 5 | 6 |
  | --- | --- | --- | --- | --- | --- | --- |
  | Standing (m/s) | 0.65 | 1.1 | 1.65 | 2.3 | 3.15 | 4.15 (sprint) |
  | Crouched (m/s) | 0.42 | 0.75 | 1.08 | 1.5 | 1.9 | 2.3 |
  | 3.2.0 (`GAIT_REF`), standing / crouched | 0.8 / 0.5 | 1.3 / 0.9 | 2.0 / 1.3 | 2.8 / 1.8 | 3.8 / 2.3 | 5.0 / 2.8 |

  Locomotion step 22 (M14 N6 "too arcadey and fast", A88): every cap ~17 % lower. `NOISE_QUIET` (crouched <= 1.7,
  standing <= 1.45 m/s silent: crouched gears 1-4, standing 1-2; standing gear 3 at full stick, the spawn maximum, is
  audible; the hearing radius formula is unchanged, so slower gears carry a little less far). D5.1 effort curve
  (`anim/effort.ts` `effortSpeed`): a pace is posed at its place between the `GAIT_REF` caps (clip mix, duty, lift,
  arm swing), while the stride length and gait clock stay on the real pace. Chaos Theory feel with moderate momentum
  (`MotionInput.ct`, set by `PlayerController` when no override drives the step; `CT` table + `CT_RANGES` in the
  Tune panel; `MotionDriver.stepCt`): the pace follows the stick through a critically damped spring (95% within
  `CT.startTime` 0.3 s, 98% gone within `CT.stopTime` 0.25 s, under `CT_REST` 0.1 m/s at rest; never overshoots;
  a sprint stops in <= 0.4 m), the travel direction swings toward the stick over `CT.turnTime` 0.15 s from
  `turnFullSpeed` 1.6 m/s (none under `turnSnapSpeed` 0.4), a reversal (cos < -0.7) over `pivotSpeed` 1.2 m/s brakes
  into a planted `pivot` (>= `pivotTime` 0.3 s, the PIVOT clip) and pushes off the new way. States `move` / `stop`
  (released, sliding) / `pivot` / `idle`; `RigPose.restX` from `ctStopDistance()`. Aim, draw, strike, crouch and
  jump stay instant. `RigPose.quickStop` = `CT.stopBlend` 0.12 s (`FootPlanner.setDown`: a foot in the air when the
  feet stop stepping, under 0.3 m/s in a stop, sets down within it); then at most one closing step squares the feet.
  The 3.2.0 stop hold (`PlayerController.stopHold` / `holdSpeed`) only fires on a move straight to idle, which the
  momentum stop no longer produces. `StickRelease` (`speedGears.ts`, pure; `CT.releaseRate` / `releaseFrom` /
  `releaseWindow`) keeps a springing-back stick's deflection so the stop is from the full pace. Travel facing turns at
  `CT.turnRate` 720 deg/s (sprint roll lean held to 0.05 rad so the bank stays <= 8 deg). D5.2 acceleration lean
  0.012 rad per m/s^2, capped 0.09 rad, on the critically damped spring. Remotes (D8): `anim/motionDerive.ts` derives
  the acceleration and `move` / `stop` / `idle` from the measured velocity in `CharacterRig.animate` (no wire field).
  Heel-to-toe roll (A79): at <= 1.7 m/s (`HEEL_ROLL`) a foot lands heel first, toe 0.12 rad up, and rolls flat over
  0.1 s (the rig lifts the ankle by the heel's 5 cm lever so the heel stays on the floor).
  Forward roll: crouch tapped standing at gear >= 5 (or sprinting) while moving >= 1.5 m/s
  (`TraversalController.canForwardRoll`, the `drop` alias of the press) = `startRoll(true)`: `kind 'roll'`, `ROLL`
  clip, `CT.rollTime` 0.7 s, `CT.rollLength` 3 m (shortened by a wall), comes up crouched (`setCrouchToggle`) at the
  gear's crouched pace; `forwardRolls` -> `GameState` noise `CT.rollNoise` 2 m. HUD: `Hud.setGear` (SPD pips in the
  tactical strip, `GEARS.pipsShow` 1.5 s after a change); touch rocker `speed` (`TOUCH_LAYOUT_VERSION` 4).
- 3.2.0 phase 1 networked movement: `player/moveState.ts` (pure; in `player/` because single player builds it and
  must never import `src/net`): `MoveState {m (MOVE_MODES index on the wire, later phases append), a anchor, s, sub
  (u16: `ATTACH_SUB` phase + face + exit pose), ph, tid, g gear, r raise, ay aim twist, rd ready, attached: gp
  planted grips (still), c MoveCommit}`; slot 1 is `wall` (back-to-wall, reserved until step 11; it was `cover`,
  A2; `PROTOCOL_VERSION` 3), `sanitizeMoveState`, `packMoveState`, `poseFromMoveState` (pose families for player and remotes),
  `moveChanged` (send at once). `game/localMoveState.ts` builds it from `GameState`. `player/attachGrips.ts`
  `AttachGrips` (hand / foot `GripStepper`s and rig targets; `AttachController.grips` and `RemoteAvatar` share it;
  `settleTo` onto the owner's planted grips) and `player/traversePath.ts` `traversePath` (committed move paths; the
  remote replays a `MoveCommit`). `PlayerState.mv` (`wirePlayerState`), `PF.driven`; `RemoteAvatar` poses from it
  (`rig.footPins` -> `FootPlanner` pins); `validate.ts` `moveSpeedCap` (gear pace x
  `MOVE_TOLERANCE` 1.15) / `attachedClamp` (`ATTACH_SLACK` 0.5) in `RemotePlayer.accept`; `RemotePlayer.followPose`
  and `Hitboxes.sync(feet, head, hips)` lay the capsules along hips -> head; host `Hist` keeps the posed head / hips
  and the mode, `judge` uses them.
- 3.2.0 phase 2: `player/splitJump.ts` (pure): `findSplitGaps(coverSegments)` (high faces, normals opposed, 1.2-1.95 m,
  both >= 2.6 m, same floor, overlap >= 0.8 m; `LevelBuilder.build` adds them last as `SplitAnchor`s, kind `split`,
  `anchors.splits`), `splitReach` (between the walls facing within 40 deg of the axis), `wallJumpReach` (lip 2.7-3.8 m,
  facing its wall within 1 m, or an inside corner: side-on within 1.4 m), `PipeHang` (hands -> legsUp -> inverted,
  `PIPE` times / speeds / aim band), `SPLIT`, `WALL_JUMP`. `ATTACH.split` (axis `none`, sidearm), `attachPose(.., pipe)`
  (`PIPE_HIPS`, `PIPE_TUMBLE`, `TUMBLE_PIVOT` / `TUMBLE_REST`: the rig tumbles about its body pivot, below the hips),
  `AttachEntry 'wall'`. `AttachController`: `splitProbe` / `wallJumpProbe` after the regular anchors, the wall kick
  path (`kickPt`), `pipe` (Y up / B down, `flipDrop`), `onHit` (GameState's damage hook), `sidearmAim`, camera presets
  `split` / `pipeLegs` / `inverted`. `AttachGrips`: split plants / braces, `setPipe` + blended pipe targets, `aimFree`.
  Sidearm attached: `Player.attachAim` (aim band clamp, ads allowed; inverted: mirrored spine aim + `RigPose.aimWorldYaw`
  / `aimWorldPitch` so the gun aims in world space), `PlayerWeapons.setAttachedStow(stowed, draw)` (`sidearmIndex`: the
  first pistol), `attachSpread`. `RigPose.tumble` (`PlayerPose.tumble`) -> graph; the rig skips the upright-only
  pelvis drop / knee floor when turned over. Clips `SPLIT_BRACE`, `WALL_KICK`, `PIPE_LEGS_UP`, `PIPE_INVERTED`
  (TraverseKind `split`, `wallKick`, `pipeLegs`, `pipeInv`). MoveState modes `split`, `wallJump`; pipe sub-state in
  `ATTACH_SUB` bits 6-9 (`ph` = the change's progress), exit pose `flip`.
- 3.2.0 phase 3: anchors `RappelPoint {top, nx, nz, length}` (`LevelBuilder.rappel`) and `Fence {a, b, height, t, n}`
  (`LevelBuilder.fence`: visual posts / rail, a see-through chain-link `DynamicTexture` panel, its own static body in
  `G.FENCE` - the player collides, bullets / sight / level probes do not; `navBuild` blocks it; never a level piece:
  no cover, ledges or voxels). `ATTACH.rappel` (vertical; `s` = rope out) and `ATTACH.fence` (along; the climb height
  is the controller's second axis `AttachController.u`, also the rope's sideways offset). `RAPPEL` / `FENCE` tables in
  `config/movement.ts`. `AttachController.rappelStep` (speeds, `swingT` kick out + `latFrom/latTo`, `ropeWindow` ->
  `onKickThrough` -> `TraversalController` window vault, unhook, top / bottom) and `fenceStep` (climb, shimmy,
  `fenceMoving` -> GameState rattle noise above `FENCE.quietGear`, flip over exit); `attachPose(.., u)`. Ropes:
  `world/ropes.ts` `Ropes` (thin-instanced, `World.ropes`; GameState `drawRope`, `RemoteAvatar` per remote). Clip
  `RAPPEL_HANG` (TraverseKind `rappel`). MoveState modes `rappel`, `fence`, field `u`, exit pose `fenceFlip`.
- 3.2.0 phase 4: `game/takedown.ts` kinds `drop` (from `hang` / `pipe` / `split` / `zipline` / `rappel`: 1.2-5 m below
  within 1 m of the landing; `approach` = the fall time) and `inverted` (a guard within 0.9 m beneath); `below` is the
  ledge pull. `GRAB` (gear 2, hold 0.42 m, spread x1.2, shove stagger 1 s, hesitate 1.5 s), `GRAB_KINDS` (`behind`).
  `TakedownController`: attacker states from the attach kinds; a grab (`active.grab`: approach, `hold` - no override,
  `speedCap` at gear 2, the hostage `holdAt` in front, `setSolid(false)`, `holdAsHostage` pose; a fresh press
  (`pressedNow`) decides tap / hold -> `GRAB_STRIKE`; `shovePressed` -> `releaseTakedown(GRAB.shoveStagger)`),
  `hostage`, `grabs` counters, `grabAllowed` (off in PvP). GameState: sidearm draw / `attachSpread` while holding,
  `localRef.shield` (PlayerRef) -> `Enemy.tryFire` hesitates, aims at the head, rays include `G.ENEMY_HITBOX` and a hit
  on the hostage is `HitInfo.shieldHit`. Net: MoveState mode `grab` (`tid`); `CoopHost` keeps a client's seized guard
  at their offset and `ref.shield`. PvP: `net/pvpVictim.ts` `PvpVictim` (opponents as victims; only `drop` / `below` /
  `inverted`), message `ptd` -> `CoopHost.onPvpTakedown` (`PTD_REACH` 2.5, `PTD_HEIGHT` 5.5).
- 3.2.0 phase 5 (co-op team moves): `TEAM` table (`config/movement.ts`), `game/teamMoves.ts` (pure: `checkTeamRequest`
  -> `TeamDenial`, `canBrace`, `boostPath`), `game/teamController.ts` `TeamController` (`GameState.team`; states none /
  brace / boost / assist / ladderUp / top / bottom; `offer` = a braced mate within `partnerReach` + the boost target
  from `findJumpTarget` 1.15 m under `boostMax`: lips 3.75-4.5 m, beyond a wall jump). Y: tap at a braced mate = boost, held `TEAM.braceHold` = ladder, held with
  a mate within `mateRange` and a wall behind (`wallBehind`, one ray) = brace; B ends brace / bottom / top. Y order in
  `GameState`: takedown > team > traversal (CT moves included) > interact; traversal skips while a team move
  runs. NetAttachment `teamMates` / `teamRequest` / `teamEnd`; messages `tmove` (client -> host), `tstart` / `tdeny` /
  `tend` (host -> all); `CoopHost.onTeamMove` checks both sides (`teamSide`: MoveState mode, team in PvP, 1 s rate)
  and starts it on both (host included); `teamPairs` for the ladder's end. MoveState modes `brace`, `boost`, `stacked`
  (`sub` 1 top / 2 bottom). `PlayerController.teleports`: a teleport drops a committed traversal move and resets the
  fall's top (no landing where it lands).
- 3.2.0 playtest changes: the manual jump (`LEAP` in `config/movement.ts`; action `leap`: touch `jump` button, layout v5;
  Y / E jump when traversal has nothing on offer): `TraversalController.leap` (`PlayerController.launch` up at `LEAP.vy`
  - the controller's take-off window `takeoffT` stops the support check pinning it down; the air branch falls at ~2 g),
  in the air `fallProbe` / `AttachController.leapProbe` (drainpipes / ladders within `LEAP.climbReach`) grab at once
  (after `LEAP.splitWait` when a split gap is under the jump); a second press within `LEAP.doubleTap` over the split
  (`AttachController.split`, no longer a traverse hint; prompt `splitDouble`; `TraversalController.splitNow` for the
  touch button) braces in it. `SPLIT.feetHeight` 2.5, `rootDrop` 0.37 (the root under the feet line: legs
  near level), `minHeight` 3.6 (`gripCentre` of a split = the braced hands); `findJump` from a split jumps up to a lip / pipe /
  ladder ahead over it (Y, reach from the feet line + 1.05 m; re-enabled 2026-10-08), else drop, drop attack or sidearm; the double tap sets the split's `face` from the jump's travel (else the body's yaw).
  Horizontal pipes face along the pipe in every sub-state (`attachPose` pipeH yaw along `face`; `pipeFace(a, camYaw)`
  in `attachTo`; hands one ahead of the other, `pipeHands` either side of the top; inverted: legs straddle it, ankles
  crossed over the top); held back against the facing for `PIPE_TURN` 0.3 s it turns round (`backT`); `anchorFirst`
  includes a pipe overhead. Touch action button (`GameState.promptAction`): the world prompt on offer (attached: vault / jumpTo /
  drop; else vault, jumpTo, drop), `TouchAction.press` / `down` / `up` = the prompt's tap / hold handlers;
  always shown, `tc-idle` when nothing is on offer; world prompts are indicators only (no pointer events).
- All feel constants live in `config/movement.ts` (`MOVEMENT`, live-tunable in the debug overlay's Tune panel):
  crouched sneak 0.8 / crouch walk 1.8 / crouch run 2.6, standing walk 1.4 / jog 2.8, sprint 5.0 m/s (toggle or
  hold `gameplay.sprintHold`, no stamina, stands you up, weapon lowered at the low ready; aiming ends it via
  `cancelSprint`), aiming 1.4 / 1.0 crouched; strafe x0.9
  and backstep x0.75 only while aiming; analog by stick bands (`sneakBand`, `walkBand`, `crouchWalkBand`). Stance times: crouch 0.25 s, kneel 0.3 s, stand 0.28 s.
  `ENEMY_MOTION` / `ENEMY_CALM_MOTION` keep the enemies' slower, weighted tuning as standalone literals (3.2.0;
  `tests/motion.test.ts` pins them, so `MOVEMENT` changes never reach the guards).
- `anim/motion.ts` `MotionDriver` (pure; player and enemies): first-frame response, 90% speed in 0.2-0.35 s
  (sprint <= 0.45), stops in 0.2-0.35 s (`brakeGain`), capped acceleration / deceleration / jerk (never carrying
  more acceleration than the active tuning allows), a gait clock (`phase`) with a heel-strike dip. `faceTravel`
  (not aiming): the body faces the travel heading, which swings at `travelRate` (540 deg/s at a sneak down to 300
  at a sprint) and no tighter than the grip allows; still, it holds its facing (the camera orbits freely). Aiming:
  <= 360 deg/s. Reversals over 135 deg at speed are a 0.3 s planted pivot. `carry(vx, vz)` keeps traversal
  momentum. Enemies keep stepped turns (explicit facing). Frame-rate independent (60 vs 120 Hz parity tested).
- `player/movement.ts` (pure): `targetSpeed(mag, stance, localX, localZ)`, `SprintGate` (toggle / hold, ends
  when the stick drops), `pickTraversal` (step <= 0.65 m, vault <= 1.25 m and thin, mantle <= 1.8 m, hop over gaps
  when sprinting), `noiseRadius(speed, crouched, sprinting)` (2.3: sneak, crouch walk and a slow walk 0; crouch
  run ~2 m, jog ~3.4 m, sprint 9 m). `PlayerController.steps`: 'silent' while an override drives the step
  (climbing, vaults, attached); footsteps only
  when grounded (`PF.silent` carries it for co-op clients). Crouched targets are seen at 0.6x the distance.
- Kneel = crouched and still. There is no free jump: `TraversalController` (`player/traversal.ts`) probes ahead
  (5 Hz, for the HUD prompt) and on traverse plays a committed step / vault / mantle / drop / hop, timed by speed
  and carrying momentum out (in stride). Footstep noise goes to `EnemyManager.hear` (investigate).
- `PlayerController.override` lets traversal drive a step (velocity + facing + turn rate + crouch, `glide`
  for an eased path, `run`, or a kinematic feet path); `speedMul` (weapon handling) / `speedCap` slow it.
- Weapon carry (`weapons/weaponCarry.ts`, pure): ready position from context (`pickReady`: compressed near walls,
  doorways, sprinting, reloading; high in tight corridors/traversal; else low), raised only to aim or
  fire (raise ~170 ms, lower ~300 ms; `CARRY.raiseTime` x weapon `weight`), the trigger is live at
  `fireThreshold`, held `holdAfterFire` after the last shot. `PlayerWeapons` gates on `carry.canFire`.
  Raised = a cheek weld, never hip fire: `SIGHT_RAISE` (anim graph) lifts the gun so its sight line is level with
  the eye beside the head (stock high, elbows up) and the rig closes the loop on the posed head
  (`sightToEye`, any stance, hunch or lean), the neck flexes the head onto the stock (`out.weld` -> `NECK_WELD`) and the shoulders lift
  into it (`SHOULDER_WELD`). Ready poses (`READY_POSES`): low (stock in the shoulder, muzzle ~45 deg down across),
  compressed (tight to the chest, muzzle forward-down, never swung across into a wall), high; back to a wall
  `WALL_READY` (muzzle down along the wall, turned away from it; coming up toward level as the body leans out;
  `AnimInput.wall`, lower state `wall`: the flat-back high stance `WALL_STANCE` and the support hand on the wall,
  `RigTargets.offWall` -> `CharacterRig.wallHand`; kept for back-to-wall, A6). Stepping to the wall the carry is
  compressed until the tuck takes over; crouched in the open the lowered muzzle lifts with the crouch.
- Camera (`config/camera.ts` `CAMERA` + `framing()`): free orbit - look input applies the same frame and nothing
  holds the view back (no twist clamp, no look cap); lowered, looking around only turns the head
  (`RigPose.lookYaw/lookPitch`): spine, arms and gun move with the camera only once raised (`aimYaw/aimPitch` x
  raise); Splinter Cell: Blacklist framing - the operative small in
  the left third (boom 2.2 / ADS 1.5, shoulder 0.62 / 0.58, pivot 1.62 / crouched 1.18, height -0.08; crouched
  low in the lower left), a sneak frames a touch tighter, back to a wall pulls back `coverBoom` to show the room. FOV is horizontal at 16:9 (`video.fovH`, default 75), Hor+. Springs
  updated every render frame: follow 80-150 ms with look-ahead, aim framing 150-250 ms, shoulder swap ~250 ms on
  an arc, auto shoulder at peeks, optional auto-recentre after 1.5 s of no look input
  while moving (`gameplay.autoRecentre`), handheld drift (<= 0.15 deg), micro-bob (<= 1 cm), sprint FOV +4 deg.
  Tight spaces: the boom pulls in fast and eases out slowly, then `applyBodyFade` hides the head / body.
  Shake roll is `rotation.z`; the camera sets `updateUpVectorFromRotation` (Babylon otherwise rebuilds the up
  vector, pitch included, only when `rotation.z` changes, freezing a tilted horizon when a shake ends).
- Aim assist (`weapons/aimAssist.ts`): friction fades across the cone edge (and over ~60 ms in `GameState`),
  magnetism fades at the centre, so sweeping across a target never jolts the view.
- Cinematic post (`vfx/cinematicPost.ts`): one pass for vignette, optional film grain and letterbox (stingers);
  `GameState.slowBeat()` (0.25 s at 0.6x, setting `gameplay.slowBeat`) and `letterbox(seconds)`.

## Back-to-wall (locomotion step 11, bible 5.3)
- `player/wallController.ts`: pure `WallCore` (off / entering / on / leaving) on the level's `CoverSegment`s (kept for the AI) and a thin adapter (`wallOverride`) to the controller's `MoveOverride` (`noise: 'crouched'`: crouch-band footsteps). `GameState.wallStep` runs it each fixed step after traversal.
- Enter: the `cover` context action with a face within `WALL.reach` 0.9 m of the body line and within 100 deg of the move or look direction (an eased settle of 0.2 s + 0.3 s per metre of approach, at most 0.45 s, A46; no snap from afar). (21w, A83) The stick held into a high face no longer enters on its own (`WALL.stickEntry` false; `WallCore.stickEnter` turns the old 0.35 s rule back on for tests): walking into a wall never sticks to it. When on, a stick held through a traversal, an attach, a fall or another blocking state does not count until it is released once (`stickArmed`, A48), so walking off a ladder top or a roof with the stick forward never lands into a wall entry. High faces (>= HIGH_MIN 1.6 m) keep the stance; crouch works on any high wall (21w, M14: a press toggles it, hold-to-crouch follows the held button; the body stays on the wall and WALL_SUB.crouch carries it to remotes), low faces (LOW_MIN..LOW_MAX) are always crouched. Body line = `COVER_STANDOFF` (0.35 m) from the face.
- Slide (21w, M14): a slow shuffle, `wallSlideSpeed`: 0 inside `WALL.slideDead` 0.2 of the along-wall stick, then linear to 0.9 m/s standing / 0.6 crouched at full stick, never over the gear's own cap (gear <= 4); paced from the body's own position along the wall and braked into an end (5 m/s^2) so it stops on it. Joined ends within 0.1 m (`buildWallLinks`): an inside corner wraps (the held stick keeps its sense until released), a flat join carries on, an outside end (a wall end or an outside corner) stops the body at `EDGE_MARGIN` and keeps it on the wall however long the stick pushes on (WALL_SUB edgeL / edgeR; pushing on peeks, aim leans out).
- Leave: the context press again (`gameplay.wallToggle` true; hold mode releases, step 18 ships the UI), the stick pulled away from the wall > 0.7 held 0.3 s (a brush never leaves; 21w), jump, sprint, takedown, traversal, a team move, death.
- Facing: the body faces out (yaw from the normal); the character's right is the face's -t, so WALL_SUB.faceRight is set sliding towards a. Pose: `pose.wall` (WALL_STANCE), the head turned along the slide (`WALL_LOOK`), the rig root pushed from the capsule onto the face so the back sits <= 3 cm off it (`wallRootPush`, A45), the off hand on the wall (`rig.wallHand`). Camera preset `wall` (boom 2.6, the open-side shoulder, blend 0.25 s), local only. (21w) The shoulder swap on the wall (the slide reversing, an edge) and for 0.8 s after leaving eases at `WALL_CAMERA.side` 5 1/s (the free camera's 15.5 whipped 10 cm per frame); e2e-wall bounds the camera to <= 6 cm per frame over the slide, edge stop and peek and checks it never sits behind geometry from the head.
- Stacking (D8): `stackClamp(s, dir, others, n)` keeps capsule centres >= 0.62 m apart along one segment; the others come from the remotes' `wall` MoveStates (`NetHooks.wallOthers`, host and client).
- Takedown attacker state on a wall: `wall` (high) / `wallLow` (low, crouched; maps to `overCover`); a guard round the edge gives `corner` (step 12).
- Pose polish is carried to step 27, the dedicated back-to-wall clip (A47): step 11 fixes overshoot, feet behind the face, the back gap, the upper arm through the torso and foot skate; the entry-turn joint rate (~45 deg per frame), shank crossing, forearm clips, the exit pelvis jump and the remote `wallClip` in the settle still fail the audit's wall rows (baseline rows, fixed in step 27).

## Wall edge verbs (locomotion step 12, bible 5.3 / 5.4, A24, A34, A50)
- Edge: on the wall within `WALL.edgeReach` 0.35 m of an outside end (no inside corner or flat join); WALL_SUB edgeL (the end at b, +t, the body's left) / edgeR. A doorway side is an edge whose coplanar neighbour (same facing, line and height class) starts 0.8-2.0 m beyond it (`buildWallLinks` `gA` / `gB`, `gapA` / `gapB`).
- Peek: stopped on the end, the stick toward the edge (over `peekPush` 0.6, round the corner too) or the look past it (look . edge > 0.85) held `peekHold` 0.25 s, not while aiming; once on it holds while the push stays over `peekKeep` 0.35 (`wallPeekWanted`, 21w: stick noise never flickers it); the camera swing eases over 0.45 s (`WALL_CAMERA.peek.blend`): the head and near shoulder lean out (rig lean 0.45, head <= `WALL.peekOut` 0.25 m, eased over 0.2 s; WALL_SUB.peek). The camera turns the view (not the aim) up to 25 deg toward the edge (`wall.peek` preset; local only, never sent).
- Lean-out: aim at the end of a high wall steps the capsule `WALL.leanOut` 0.35 m past the end over 0.3 s (the step 09 draw), the body turning with the aim, and back in 0.25 s on release; WALL_SUB.lean, MoveState `lk` 1 (`s` carries the body's place past the end). Fire only once drawn. Camera `wall.lean`, shoulder to the open side. Aim on a low wall anywhere rises over the top, standing (`lk` 2). Left-edge weapon mirroring (D9) and the low-wall side lean (D10): step 12b, below.
- SWAT turn: at a doorway edge, the context press (toggle mode) with the stick toward the gap: a crouched, quiet committed move to the far wall, duration clamp(gap / 2.4 x 1.15, 0.5, 0.8) s (`swatDuration`), MoveState `swat` (index 26, a `MoveCommit` from / to / dur, client-owned; the host checks it with `swatCommitOk`), ends `on` the far segment.
- Remote yaw (step 12 r1): the host's copy of a settled wall body eases toward the face normal (or, leaning, the owner's yaw) at the owner's wall turn rate `WALL_TURN_RATE` 12 rad/s, never a one-frame snap when the lean bit drops.
- Step round: removed in step 21w (M14). At an end the body stops and stays on the wall; the stick toward the edge, into the wall or not, peeks; only the held pull-away or the context press leaves.
- Light parity (bible 5.1): the light meter samples the chest over the feet and the head at its real place (`LightField.bodyLevel(..., hx, hz)`): the local body's blended peek offset (`exX` / `exZ`); a remote's from its MoveState (`wallPeekOffset`: WALL_SUB peek + edge, the segment tangent, `peekOut`, eased in by the owner's 0.2 s smoothstep from the receiver's time since the peek bit came on; the bit stays set through the owner's ease-out, so a remote reads up to the full offset for that 0.2 s - deliberately conservative), so the host's light and its guards' head sample (`RemotePlayer.headPoint`) match the client's own pose with no extra bandwidth. Guards see the body (the posed hit volumes), never the camera.

## Open-side weapon and low-wall side lean (locomotion step 12b, D9 / D10, A51)
- Open side (`openSide(sub)`): edgeL (the b end, the body's left) is the left, edgeR the right; mid-wall aim stays on the right. Peek and lean-out always use it; the camera shoulder follows (step 12's `wall.lean` rule, local only).
- Left edge (`wallLeftHand(sub, lk)`, `WallCore.leftHand`): peeking or leaning out (`lk` 1) at edgeL puts the weapon in the left hand - the pistol in a mirrored two-handed grip, the rifle on the left shoulder - through the rig's mirror (`CharacterRig.openLeft`: grip / support arms swap, aim pocket, yaw and roll mirrored), eased over `EDGE_HAND_TIME` 0.25 s with the graph's `hands` clip entered through the Inertializer. The lean waits for the switch (`animGraph` holds `leanIn` at 0 while `handSwap` runs), so at a left edge the head is out about 0.6 s after the push (0.2 s hold + 0.25 s switch + the lean) instead of about 0.35 s at a right edge. Rising over a low wall (`lk` 2) and mid-wall aim keep the right hand. Muzzle, tracer and shot origin come from the held weapon; fire stays gated on drawn (step 09).
- Low wall at an end (`lowAimKind(edge, atEnd, toward, up, lookToward)`, no allocation): aim with the stick toward the end (>= 0.5 and >= its up part) or, stick idle, the look toward the end (look . edge > 0.7) leans out crouched past the end (`lk` 1, the same 0.35 m step, D9 included); the stick up (raw forward > 0.5, `WallInput.moveUp`) or away, or any aim mid-wall, rises over the top (`lk` 2). A kind holds until the lean is back in. The crouched peek round a low end works as on a high wall.
- Head under the top (`wallHeadCap(y, height)` = top - `LOW_HEAD_CLEAR` 0.14 m, `RigPose.headCap`): the side lean sinks the pelvis (eased, at most 0.3 m) so the head centre stays under the cap. Height limit (A51): the head stays under walls from about 1.07 m up; on lower walls (0.75-1.07 m) it can show by the remainder (a kneel / prone lean is step 27).
- Light parity: on the wall the light meter's head sample and perception's head / chest exposure points (`exposurePointsPosed`) are the posed rig's head and chest (`CharacterRig.posedHead` / `posedChest`), the same joints the hit volumes follow, so the mirrored lean and the low side lean expose exactly what is drawn. Remotes keep the MoveState peek offset (step 12) and pose the same head cap.

## Door peek (locomotion step 13, bible 5.3 Doors, A25 / A52)
- Core: `world/doorPeek.ts` (pure, Babylon-free, `DoorPeekCore`, `DOOR_PEEK`, `DOOR_CRACK`; `tests/doorPeek.test.ts`). Eligible (`doorPeekEligible`) at a closed (target 0), unlocked, uncracked door whose leaf is within 1.0 m and faced within 60 deg (the camera's yaw), grounded and in no other state.
- Context press (`cover`: pad A, KBM Space, the touch context button, which offers "Peek" at an eligible door and "Close" while peeking, ahead of the door's own "Use"): a 0.25 s settle onto the frame (`doorFrame`: 0.42 m off the leaf, 0.3 m in from the free edge, the hinge at one shoulder, the hand away from the hinge on the handle through the rig's world reach, following the leaf as it cracks), then the leaf cracks to 0.12 over 0.6 s, quiet (no guard noise; the quiet-open sound at 30%).
- View (local only, never sent): `ShoulderCamera.doorPeek` eases the eye to the crack (3 cm in from the free edge, 0.16 m off the leaf, 0.27 m when the leaf swings toward the body), cast from the head so it is never inside the leaf or the jamb; FOV x0.85; the look is clamped to +-35 deg around the door's normal (`clampPeekYaw`), stick or mouse.
- Exits: the context press again or the stick held back 0.2 s closes the crack (0.4 s, quiet); the stick pushed in or `interact` opens the door quietly (`open(d, 'quiet')`, the door's own interactable on a client); damage, aim, jump or sprint ends the peek (the door stays cracked until closed); a door opened fully by anyone ends it. KBM `E` (traverse and interact) opens, it does not end the peek.
- MoveState `doorPeek` (index 27): `a` door index, `sub` bit 1 the hinge on the right, `ph` the crack; remotes pose at the frame with the handle hand (`RemoteAvatar`, `crackedHandle`). Co-op details: coop.md.
- Tests: `tests/doorPeek.test.ts`, `tests/doors.test.ts`; e2e-pad, e2e-mouse, e2e-touch (the Proving shed door), e2e-netmove `doorPeek`, e2e-coop (three pages); anim-audit `doorpeek` (local 60 / 120 Hz, remote 60 Hz: `doorHand` palm to handle <= 2 cm, `doorClip` no joint past the cracked leaf's face).

## Traversal anchors and attached states (2.0 phase 1)
- `world/anchors.ts` (pure): `Ladder {base, top, facing, rung, width}`, `PipeVertical {base, top, side}`,
  `PipeHorizontal {a, b, hangHeight}`, `Ledge {a, b, top, n, t, len, drop, canHang, canClimbUp, nextA/B}`,
  `Duct {path, entry, exit, grates}`, `WindowAnchor`, `Door`, `Zipline {a, b}` in a `TraversalAnchors` (ids index
  `all`; co-op sends them). `generateLedges(boxes)` makes lips from box tops (`LEDGE.minDrop` 1.9 m, cut by pieces on
  or against them, broad-phase by bounding circles, `noLedge` pieces skipped); `LevelBuilder` places the rest
  (`ladder/pipeV/pipeH/zipline/duct/windowAt/door/ledge/noLedge`; their visuals never collide) and `build` adds the
  generated ledges (lips outside the bounds disabled) to `BuiltLevel.anchors`. Helpers: `closestOn`, `reach` (entry:
  bottom / top / below / above / side), `nearestInReach`, `anchorsNear`, `hangPoint` (`HANG.drop` 1.9 m under the
  lip at 1.75 m, `HANG.out` 0.22 m off the face), `lipGrips`, `nearestRung`, `ductPoint`, `ledgeContinuation`,
  `findJumpTarget`. Climbers stand `CLIMB_STANDOFF` 0.28 m off the rungs / pipe.
- `player/attach.ts` (pure): `AttachMachine` (none -> enter -> on -> exit) with `ATTACH` specs per kind (axis:
  vertical / along / path / auto; speed + accel with a first-frame response; enter / exit times; `camera` preset;
  `allow` sidearm / takedown / drop / traverse / gadgets; `holster`). `axisInput` maps the stick (camera relative
  along tangents), `attachPose` gives the feet + facing on the anchor, `attachRange` the travel range, `update`
  reports pushing past an end (`edge`). Ladder 3 rungs/s (`LADDER_RUNG_RATE`; sprint held `LADDER_SPRINT_RATE` 5, drainpipe x`PIPE_SPRINT`), slide `LADDER_SLIDE`; zipline
  builds to `ZIP_SPEED` 6 m/s.
- `TraversalController.attach` runs it: `attachTo(anchor, s, entry)`, `detach(reason)`; `input` (move, camera yaw,
  drop) is filled by `GameState` each step. While attached it drives `override.kinematic`, sets `pose.traverse`
  to the pose family (`hang` / `climb` / `crawl`, clips in `anim/clips/traverse.ts`; `traverseT` = climb cadence) and
  the rig's world targets; `GameState` stows the weapon (`PlayerWeapons.setStowed`: the swap's holster half, held)
  and sets `cam.attach` (framing preset `ATTACH_FRAMING` in `config/camera.ts`, blended by `blend`).
- Run time (`player/attachController.ts`, owned by `TraversalController.attachCtl`): from the ground the traversal
  probe also asks `probe` (anchors in reach, 5 Hz); traverse attaches when no step / vault / mantle is offered
  (ladder bottom / top, drainpipe, pipe and lip from below); at a hangable edge traverse still drops down and the
  drop control held `LOWER_HOLD` (a fresh press) or the "Hang" prompt (`lowerRequest`) lowers in. Attached: drop
  lets go (a ladder slides to the bottom, latched), traverse jumps to `jump` (`findJumpTarget`: <= 2.5 m from the
  grip centre along the camera-relative stick, into the wall = up, same-facing lips preferred) or climbs up
  (`canClimb`: room on top); pushing past a lip's end continues round the corner (`ledgeContinuation`) unless a
  jump target is under the stick; a drainpipe's top waits: traverse climbs up off it (`pipeLip` with room), a sideways push (`sidePush`) swings onto a lip beside a ladder / drainpipe (`stepOffSideways`); shimmying past a climber crossing the lip swings onto it (`passClimber`; `transferT` stops ping-pong); placed climbers outscore lips in `nearestInReach`. Entries from above / a ladder top turn
  round and step out before dropping to the hands. Hands and feet step with `GripStepper` (pure: locked contacts,
  the worse-off limb swings to a new grip, the next may start half way through, optional rung grid) driven per
  render frame (`TraversalController.frameUpdate`, interpolated body parameter); the climb clip phase follows
  the hand swings. Prompts (`GameState.anchorPrompts`): 'vault' (Climb / Grab / Climb up), 'jumpTo', 'drop'
  (Drop / Slide / Hang).
- Floor settle (3.2.0): Havok holds a supported capsule anywhere within 0.14 m of the floor (`keepDistance` +
  `keepContactTolerance`); `PlayerController.settleGap` (a ray under the centre, four round the rim) sets it down onto
  the floor on a grounded step when it hangs more than `SETTLE.tol` over its rest gap (`settles`).
- 2b: landings (`player/movement.ts` `LANDING` / `landingKind` / `landingNoise`; `PlayerController` tracks the fall's
  top, `lastLanding`, `landings`, `landVX/Z`, `registerLanding` for committed falls, `launch(v)` to fly off an
  anchor): a roll is a committed traversal (`kind 'roll'`, `ROLL` clip + `rollTumble` -> graph `tumble`; the rig
  turns the feet over with it), heavy = `landT` recovery; GameState makes landing / glass / kick noise
  (`eventNoise`, held on the meter). Falling past a lip: `AttachController.fallProbe` (Y grabs). Zipline: auto axis,
  `finish` launches along the cable. Windows: `TraversalController.windowProbe` (reach rule in `anchors.reach`)
  -> a vault through, breaking the glass (`hintWindow`). Ducts: `AttachController.vent` (tap kick / hold unscrew
  via `useHeld/useHeldT`), crawl with hands planted on the floor, `ductEnd` (wall vent: crawl out; ceiling vent:
  committed drop, `exitDur`, registered as a landing). `Breakables` (`world/breakables.ts`): glass / grate panels as
  their own static bodies + thin instances, `open(key, how)`, `onOpen`. `anchorFirst`: ladder / drainpipe / duct /
  zipline hints beat geometric moves. Lowering into a hang is `AttachController.lower` (separate from `hint`).
- 2c: maps place anchors for alternate routes (Warehouse windows, rack ladders, mezzanine ladder / zipline, a duct
  into the manager's office; Dust Depot windows and wall-top routes). `REACH.grabMax` 2.7, `LEDGE.climbDepth` 0.38.
  `BoxPiece.overhead` (`LevelBuilder.mark`): ceiling slabs / ducts that are never nav blockers for the floor under
  them (the layered grid keeps both surfaces). Clean poses: quick stow (`STOW_RATE`), outside-corner transfers curve through `via`, jumps need
  `lineClear`, `CLIMB_UP` / `VENT_DROP` / `WINDOW_VAULT` clips, `PIPE_STANDOFF`, `plantFade`; the camera clamps the
  orbit to the preset's `cone` around `cam.attachYaw`.
  While attached the graph skips the swap clip (the stowed weapon goes straight to its slot).
- Rig world targets: `reachL/R` (palm points, weight; the wrist sits behind the palm along the reach) override the
  weapon / clip hands; `plantL/R` (sole points) override the feet while off the ground planner.
- Input: `drop` is raised with `crouch` by `InputState` (alias), `interactHold` after `INTERACT_HOLD` 0.3 s;
  `heldTime` / `holdProgress` for rings (`InputState.tick` from `InputManager.poll`).
