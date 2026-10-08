# Movement, camera and traversal
Purpose: the stealth operative's movement, the Chaos Theory movement phases, camera, traversal anchors and attached states, corners.
Design authority: docs/design-bible.md (Sections 4 and 5.3)

## Movement and camera (stealth operative)
- Chaos Theory movement (3.2.0, in progress): spec `docs/ct-movement.md`, status `docs/ct-movement-progress.md`.
- 3.2.0 phase 0 (player free movement only; cover, traversal and enemies keep the rest of this section):
  speed gears (`player/speedGears.ts` pure, `GEARS` in `config/movement.ts`): 6 gears, spawn / respawn gear 3
  (`GameState` resets it when the player comes back alive; `?gear=N` for tests, `e2e-lib` adds `gear=4` = the 2.x jog
  unless a suite names a gear), kept through stance changes; `PlayerController.gears`, `speedUp` / `speedDown`
  (pad D-pad up / down, wheel + `=` / `-`, touch rocker). Target = gear cap (crouched 0.5 / 0.9 / 1.3 / 1.8 / 2.3 /
  2.8, standing 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0) x `stickCurve` (dead zone 0.05, linear); `targetSpeed(.., gear)`
  replaces the stick bands for the player; aiming capped at 1.4 / 1.0; the sprint is gear 6 standing.
  `NOISE_QUIET` (crouched <= 1.9, standing <= 1.45 m/s silent: crouched gears 1-4, standing 1-2). Chaos Theory feel
  (`MotionInput.ct`, set by `PlayerController` when no override drives the step; `CT` table + `CT_RANGES` in the
  Tune panel): stick released = zero velocity on that step (the controller's `maxAcceleration` is 600 then so Havok
  follows in one step), gait clock frozen, `RigPose.quickStop` = `CT.stopBlend` 0.12 s (`FootPlanner.setDown`: a foot
  in the air sets straight down where it is within it, planted feet locked). Stop hold (approved spec change):
  `PlayerController.stopHold` / `holdSpeed` from any stop (> 0.02 m/s) until the next input (a stick that moves the
  operator again, aim, stance change, an override, leaving the ground; teleport clears it; no kneel while held);
  `StickRelease` (`speedGears.ts`, pure; `CT.releaseRate` / `releaseFrom` / `releaseWindow`) keeps a springing-back
  stick's deflection so the stop is from the full pace. Cover strafe = `coverPace(gear, crouched)` (`GEARS.coverMax`
  2.8 / 1.8; `CoverController`) -> `RigPose.holdSpeed`: the graph keeps
  the locomotion pose at the frozen gait clock for that pace (`locoSpeed`; released, it blends out over `quickStop`),
  the planner `hold` takes no settling / idle steps (`anim-sheet` `crouchstop` / `walkstop`); starts
  reach 95% within `CT.startTime` 0.08 s (`ctTau` = startTime / 4), direction / gear changes re-target at once, no
  pivots, travel turns at `CT.turnRate` 720 deg/s (sprint roll lean held to 0.05 rad so the bank stays <= 8 deg).
  Forward roll: crouch tapped standing at gear >= 5 (or sprinting) while moving >= 1.5 m/s
  (`TraversalController.canForwardRoll`, the `drop` alias of the press) = `startRoll(true)`: `kind 'roll'`, `ROLL`
  clip, `CT.rollTime` 0.7 s, `CT.rollLength` 3 m (shortened by a wall), comes up crouched (`setCrouchToggle`) at the
  gear's crouched pace; `forwardRolls` -> `GameState` noise `CT.rollNoise` 2 m. HUD: `Hud.setGear` (SPD pips in the
  tactical strip, `GEARS.pipsShow` 1.5 s after a change); touch rocker `speed` (`TOUCH_LAYOUT_VERSION` 4).
- 3.2.0 phase 1 networked movement: `player/moveState.ts` (pure; in `player/` because single player builds it and
  must never import `src/net`): `MoveState {m (MOVE_MODES index on the wire, later phases append), a anchor, s, sub
  (u16: `COVER_SUB` incl. `leftHand` / `ATTACH_SUB` phase + face + exit pose), ph, tid, g gear, r raise, ay aim
  twist, rd ready, cover: cu curl / lf lift / fp feet (body frame, still), attached: gp planted grips (still), c
  MoveCommit}`, `sanitizeMoveState`, `packMoveState`, `poseFromMoveState` (pose families for player and remotes),
  `moveChanged` (send at once). `game/localMoveState.ts` builds it from `GameState`. `player/attachGrips.ts`
  `AttachGrips` (hand / foot `GripStepper`s and rig targets; `AttachController.grips` and `RemoteAvatar` share it;
  `settleTo` onto the owner's planted grips) and `player/traversePath.ts` `traversePath` (committed move paths; the
  remote replays a `MoveCommit`). `PlayerState.mv` (`wirePlayerState`), `PF.driven`; `RemoteAvatar` poses from it
  (`rig.curlHold` / `liftHold` / `footPins` -> `FootPlanner` pins); `validate.ts` `moveSpeedCap` (gear pace x
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
  `GameState`: takedown > team > traversal (CT moves included) > interact; cover / traversal skip while a team move
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
  includes a pipe overhead. Touch action button (`GameState.promptAction`): the world prompt on offer (order: in cover
  corner / move / vault else leave cover; attached vault / jumpTo / drop; out of cover moving or stick pushed: vault,
  cover, jumpTo, drop - still: cover first), `TouchAction.press` / `down` / `up` = the prompt's tap / hold handlers;
  always shown, `tc-idle` when nothing is on offer; world prompts are indicators only (no pointer events).
- All feel constants live in `config/movement.ts` (`MOVEMENT`, live-tunable in the debug overlay's Tune panel):
  crouched sneak 0.8 / crouch walk 1.8 / crouch run 2.6, standing walk 1.4 / jog 2.8, sprint 5.0 m/s (toggle or
  hold `gameplay.sprintHold`, no stamina, stands you up, weapon lowered at the low ready; aiming ends it via
  `cancelSprint`), aiming 1.4 / 1.0 crouched; strafe x0.9
  and backstep x0.75 only while aiming; analog by stick bands (`sneakBand`, `walkBand`, `crouchWalkBand`); cover
  2.3 / 1.25 crouched (a jog along the wall; `COVER_MOTION` never pivots), cover-to-cover run 3.6. Stance times: crouch 0.25 s, kneel 0.3 s, stand 0.28 s.
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
  run ~2 m, jog ~3.4 m, sprint 9 m). `PlayerController.steps`: 'silent' while an override drives the step (cover
  glides and moves along cover, climbing, vaults, attached), 'crouched' for a cover-to-cover run; footsteps only
  when grounded (`PF.silent` carries it for co-op clients). Crouched targets are seen at 0.6x the distance.
- Kneel = crouched and still. There is no free jump: `TraversalController` (`player/traversal.ts`) probes ahead
  (5 Hz, for the HUD prompt) and on traverse plays a committed step / vault / mantle / drop / hop, timed by speed
  and carrying momentum out (in stride). Footstep noise goes to `EnemyManager.hear` (investigate).
- `PlayerController.override` lets cover/traversal drive a step (velocity + facing + turn rate + crouch, `glide`
  for an eased path, `run` for cover-to-cover, or a kinematic feet path); `steer` is a gentle velocity bias
  (slicing the pie); `stanceMul` / `speedCap` slow (leaning).
- Weapon carry (`weapons/weaponCarry.ts`, pure): ready position from context (`pickReady`: compressed near walls,
  doorways, cover edges, sprinting, reloading; high in tight corridors/traversal; else low), raised only to aim or
  fire (raise ~170 ms, lower ~300 ms; `CARRY.raiseTime` x weapon `weight`), the trigger is live at
  `fireThreshold`, held `holdAfterFire` after the last shot. `PlayerWeapons` gates on `carry.canFire`.
  Raised = a cheek weld, never hip fire: `SIGHT_RAISE` (anim graph) lifts the gun so its sight line is level with
  the eye beside the head (stock high, elbows up) and the rig closes the loop on the posed head
  (`sightToEye`, any stance, hunch or lean), the neck flexes the head onto the stock (`out.weld` -> `NECK_WELD`) and the shoulders lift
  into it (`SHOULDER_WELD`). Ready poses (`READY_POSES`): low (stock in the shoulder, muzzle ~45 deg down across),
  compressed (tight to the chest, muzzle forward-down, never swung across into a wall), high; in cover
  `COVER_READY` (muzzle down along the wall, turned away from it, relative to the hand holding it;
  `COVER_READY_CROUCH`: flatter, higher and further out, clear of the knees; coming up toward level as the body
  leans out; carried flatter moving crouched). Gliding into cover the carry is compressed until the tuck takes
  over; turning round at high cover (turn-and-swap, corner) it goes to the high ready, at low cover the tucked
  muzzle comes up; crouched in the open the lowered muzzle lifts with the crouch.
- Camera (`config/camera.ts` `CAMERA` + `framing()`): free orbit - look input applies the same frame and nothing
  holds the view back (no twist clamp, no look cap); lowered, looking around only turns the head
  (`RigPose.lookYaw/lookPitch`): spine, arms and gun move with the camera only once raised (`aimYaw/aimPitch` x
  raise); Splinter Cell: Blacklist framing - the operative small in
  the left third (boom 2.2 / ADS 1.5, shoulder 0.62 / 0.58, pivot 1.62 / crouched 1.18, height -0.08; crouched
  low in the lower left), a sneak frames a touch tighter, cover pulls back `coverBoom` to show the room. FOV is horizontal at 16:9 (`video.fovH`, default 75), Hor+. Springs
  updated every render frame: follow 80-150 ms with look-ahead, aim framing 150-250 ms, shoulder swap ~250 ms on
  an arc, auto shoulder in cover / at peeks, optional auto-recentre after 1.5 s of no look input
  while moving (`gameplay.autoRecentre`), handheld drift (<= 0.15 deg), micro-bob (<= 1 cm), sprint FOV +4 deg.
  Tight spaces: the boom pulls in fast and eases out slowly, then `applyBodyFade` hides the head / body.
  Shake roll is `rotation.z`; the camera sets `updateUpVectorFromRotation` (Babylon otherwise rebuilds the up
  vector, pitch included, only when `rotation.z` changes, freezing a tilted horizon when a shake ends).
- Aim assist (`weapons/aimAssist.ts`): friction fades across the cone edge (and over ~60 ms in `GameState`),
  magnetism fades at the centre, so sweeping across a target never jolts the view.
- Cinematic post (`vfx/cinematicPost.ts`): one pass for vignette, optional film grain and letterbox (stingers);
  `GameState.slowBeat()` (0.25 s at 0.6x, setting `gameplay.slowBeat`) and `letterbox(seconds)`.

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
  drop) is filled by `GameState` each step. While attached it drives `override.kinematic`, sets `coverPose.traverse`
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

## Corners and doorways
- `cover/corners.ts` (pure): `findDoorways` (0.7-1.8 m gaps between collinear high faces), `outsideCorners`,
  `sliceSteer` (ease out to a ~1 m standoff approaching a corner), `doorSide`, `pickLean`.
- `CornerController` (runs when not in cover/traversal): slice-the-pie steer + compressed ready near corners,
  doorway compressed ready + check sweep on crossing, contextual lean while aiming with the aim line blocked
  (probes centre/left/right; shoulder swap and restore; hips planted via `stanceMul`).
