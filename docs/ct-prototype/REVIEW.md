# CT core feel - code review (read-only, 2026-10-18)

Branch feature/ct-prototype at c112cf6 (M1 included). Method: read FEEL-BRIEF, M1, M1-FEEDBACK, DECISIONS G16-G43 / G96-G110,
PROTOTYPE-PLAN P1-P4, then the code with grep and line ranges. Nothing was run (no tests, no builds). Line counts are `wc -l`.
Targets quoted below are the plan's footage numbers (starting values, G10).

## Summary table

| # | Area | Call | Effort | Top reason |
|---|------|------|--------|-----------|
| 1 | Body (controller, speeds, driver, planner) | ADJUST | small-medium | M1 already rewrote the CT path in `MotionDriver.stepCt` as a clean branch; what is left is posture, tiptoe, first stride |
| 2 | Animation graph / posture / Wren | ADJUST | medium | Wren is a render-only skin on the existing rig (rig stays pose authority), so no retarget rewrite; posture is new layers and clip values |
| 3 | Camera and aim | REWRITE CLEAN (the framing and follow core of `shoulderCamera.update`, plus the aim timing); KEEP the cast and bounds helpers | medium | The camera still has legacy framing (2.2 m boom, 0.62 m shoulder), spring follow, look-ahead, pace boom, drift, dash and ADS FOV zoom, and `player.ts` still auto-recentres |
| 4 | Back-to-wall, doors, pad layout | ADJUST wall and doors; REWRITE the pad and key tables (small) | large (wall), small (binds) | Wall core is 1003 lines with SWAT, lean-out and over-the-top woven through it, but the structure (segments, links, phases) is the right one |
| 5 | Strike, grab, takedowns | ADJUST | medium | Elbow strike (0.9 s, hit at 0.5 s) and tap/hold grab are legacy-era; the controllers' structure and co-op commit path are sound |
| 6 | Goggles | ADJUST | small-medium | Three modes, post shader and render-only isolation exist; needs CT order, no flip, CT ramps and grain |
| 7 | Co-op wire | ADJUST | small per area | `MoveState` is extensible and tested; add fields as areas land, bump `PROTOCOL_VERSION` each time |

**Blocker / dependency:** Wren is not merged. `origin/feature/operators` is at "step 11e (checkpoint)", self-described as
"Not yet passing: e2e-traverse ladder grips, e2e-coop offline state; full e2e and perf baseline to run". A read-only
`git merge-tree` of it into this branch reports no conflicts (clean tree hash) today, but it edits `player.ts`,
`shoulderCamera.ts`, `remoteAvatar.ts`, `remotePlayer.ts`, `gameState.ts`, the same files the feel job will change, so every
day of divergence raises the conflict cost. Posture and tiptoe work can be written now (they are rig clip values) but cannot be judged by eye until Wren renders on it. Details in section 2.

---

## 1. Body

**Files (lines):** `player/playerController.ts` 689, `player/movement.ts` 153, `player/speedGears.ts` 178, `player/moveState.ts` 410,
`player/player.ts` 421, `anim/motion.ts` 467, `anim/footPlanner.ts` 682, `config/movement.ts` 423, `player/traversal.ts` 555.

**Structure.** `PlayerController` wraps a Havok character controller capsule. Each fixed step it reads the stick through
`StickRelease` (release latch), `AnalogGear` (snaps the stick to one of five gears within a D-pad-set max gear), builds a wish
vector and hands it to `MotionDriver.step`. `step()` dispatches on `i.ct`: the CT branch is `stepCt` (about 55 lines): a single
critically damped pace spring (start 0.45 s, stop 0.2 s), travel-facing turn at 8.8 rad/s with a pace dip, backwards walk at
gear 1, stop state `stopHold` / `stopEase`. The legacy `step()` branch (pivot, brake, plant, startShift) is still used for guards
and for cover / glide overrides (`COVER_MOTION`, `GLIDE_MOTION`). `FootPlanner` places feet in world space from the gait the
graph outputs; M1 removed `closeStep`.

**CT target vs now.**
- Five speeds, no sprint, silent bands, start 0.45 s, stop slide 0.29 m, 1.7 s hold then 0.35 s ease, 504 deg/s flick turn, roll on held crouch: DONE in M1 (unit-tested).
- Gaps: first step a full stride (not modelled); bank about 10 deg into running turns (not done); spin on the spot is "a tight walking circle" via the facing turn, but the radius is `speed/turnRate` and was never measured against the <= 0.2 m target; aimed movement still uses the old `targetSpeed` strafe/back multipliers (`strafeMult`, `backMult`, `adsSpeed`) which are not CT measured values.
- Michael's new ask (tense tiptoe crouch near enemies) is not started. It needs a trigger the body can read: nearest guard distance and awareness. Gameplay-side that is `GameState` knowledge (`registry.hostiles`), not the controller's. Plan a pure function `tiptoeWanted(speedGear, crouched, nearestGuardDist, aware)` in `player/` fed from `GameState` once per fixed step, same pattern as `speedCap`.

**Leftover non-CT code.**
- `MOVEMENT` still carries legacy-era tuning: `sprintSpeed`, `sprintAccel`, `turnSprint`, `pivotTime`, `pivotMinSpeed`, `turnChunk*`, `twistMax`, `startShift`, `rootDip`. The player no longer uses most of them, guards still do (`ENEMY_MOTION` is a standalone literal, so removing player keys is safe only after checking `MotionTuning = typeof MOVEMENT`; it is the type for both).
- `MotionInput.sprinting` is now reused to mean "cover run override" (`mi.sprinting = !!ov?.run`). Misleading name, small entanglement.
- `PlayerInput.gearUp/gearDown`, `speedCap`, `maxGear`, `GearState` HUD memory ("remembers when it last changed (HUD pips)") - HUD pips are gone (G107), the timestamp is dead.
- `noiseRadius(speed, crouched, _sprinting)` keeps a dead third parameter for `src/editor`.
- `sprintHold` setting and the Settings "Sprint hold / toggle" row (menu job's file) remain.
- Roll: `crouchPend` is a small state machine inside the controller; works, but the roll itself lives in `traversal.ts`.
- Touch / phone: no touch input source exists in `src/input` any more. The only "touch" hits in player/anim are English prose. No phone paths to remove in this area.

**Tests.** Unit: `motion.test.ts` 540 (CT block: speed change, reversal <= 0.45 s, spin, flick, backwards, stop slide <= 0.3 m), `speedGears.test.ts` 124, `analogGear.test.ts`, `footPlanner.test.ts` 232, `moveState.test.ts` 218, `anim.test.ts` 245, `animAudit.test.ts` 488. E2E asserting numbers: `e2e-move`, `e2e-anim`, `e2e-pad`, `e2e-mouse`, `e2e-netmove`, `e2e-foley`. M1 left e2e-pad, e2e-mouse, e2e-netmove unverified (first failures before the changed steps). The movement e2e is the weakest link: verify those three on an idle machine before building on them.

**Risks.**
- `MotionTuning = typeof MOVEMENT` ties player and guard tuning in type only; cleaning player keys can break guards silently if a key is shared. The `motion.test.ts` pin on `ENEMY_MOTION` helps.
- `CT_MAX_ACCEL = 600` on the Havok controller: stops land inside one step; watch for wall and corner sticking at that value.
- Hot path: `stepAssist` allocates (`this.wish.clone()`, `new Vector3` in a loop) every fixed step while moving. Violates the "no allocation" rule; fix while in here.

**Recommendation: ADJUST (small-medium).** Reasons: (1) the CT body path is already a separate, small, tested branch, so a rewrite would redo M1; (2) the legacy driver branch is shared with guards and cover, so deleting it is a different, riskier job than the body; (3) the remaining work (tiptoe trigger, first stride, bank, aimed speeds, dead-key cleanup) is additive. Do the dead-key cleanup last, with the guard pin test.

---

## 2. Animation graph, posture, Wren

**Files (lines):** `anim/animGraph.ts` 1163, `anim/clips/locomotion.ts` + `actions.ts` + `traverse.ts` 911 total, `anim/footPlanner.ts` 682,
`anim/pose.ts` 154 (Inertializer, channel list `CH`), `anim/clip.ts` 120, `anim/rigMath.ts` 140, `anim/effort.ts`, `anim/motionDerive.ts`,
`anim/audit/limits.ts` + `metrics.ts`, `player/characterRig.ts` 1893 (the rig itself: 19 joints, IK, sockets, hit volumes, light-meter samples).

**Structure.** A code-authored layered graph, not mocap and not a state machine. Lower body: a speed x direction blend space over
keyed gait cycles (`FORWARD_NODES`, `CROUCH_NODES`), stand and crouch both evaluated and lerped by `crouchK`; kneel, start, stop
settle and pivot overlays; wall stance additive; traverse and air; upper body weapon ready poses, raise, reload, swap, grenade, melee
overlays; look-at, breathing, hit flinch, accel lean. Everything is an additive channel set (`CH.pelY`, `spPitch`, `hdPitch`, ...)
through an `Inertializer`. The rig's `FootPlanner` pins feet to the world from graph outputs, then `CharacterRig` runs IK (legs, arms to gun).

**Posture vs target (P1 item 5).** Standing: target spine +3-5 deg, head down 5-10 deg, arms at the sides. Now: `HUNCH` (spine 0.5 rad = 28.6 deg, head 0.34, pelvis 0.1, drop 0.07) is applied when carrying a weapon, which is the plan's "remove the HUNCH carriage" item. Clip carriage values (`pelPitch` 0.07 idle, crouch `pelPitch` 0.28, `pelY -0.36`) are legacy-era. Crouch target: hips 0.48 of height, head 0.62, spine 35-45 deg with level gaze: not measured against the current clip. Idle breathing 3 s cycle < 1 cm, no weight shifts: current `IDLE` has pelvis weight shifts (`pelX`) and a 4.8 s cycle, `BREATH` kicks in after 2 s still. All of this is value work inside `HUNCH`, `IDLE`, `CROUCH_IDLE`, `CROUCH_WALK`, `SNEAK` and `animGraph.update`'s posture blend, no new mechanism needed.

**Tiptoe variant (new).** Needs: a `tense` weight into the graph (new `AnimInput` field), a clip overlay or a dedicated `TIPTOE` locomotion pair at crouch gears 1-2 (heel lift via ankle pitch and toe-roll in the planner; `HEEL_ROLL` exists in `footPlanner.ts` with `maxSpeed 1.7` for a heel-roll pitch), arms out and torso sway as additive `shRoll` / `spRoll` / `elL/R` channels with a slow oscillator (the graph already has `Spring` and sway helpers). The rig has no toe joint (19 joints: root, body, pelvis, spine, chest, neck, head, 2x shoulder/elbow/wrist, 2x hip/knee/ankle), so "on the toes" is ankle plantar-flex plus a raised pelvis; fine for the camera distance. Remote: derive from data both ends have (speed gear `g`, `PF.crouch`) plus one new MoveState bit for "guard near" (host can also compute it, but the bit is cheaper and exact). Footage clips and trigger distance must be measured first (catalogue `ct-footage-catalogue.md`).

**Wren retarget difficulty (read-only look at origin/feature/operators).** Low, because it is already done and is render-only:
- `src/operators/runtime/pose.ts` (234) maps the 19 rig joints to Wren's skeleton every frame on flat typed arrays; `playerFigure.ts` builds the player `CharacterRig` at Wren's height (1.68 m, G74) and sits an `OperatorFigure` on it. The rig "stays the pose authority" (animation, IK, sockets, light-meter samples, hit volumes); its own meshes are disabled.
- Consequence: all posture and tiptoe work stays in the existing graph and clips. Wren's different proportions are handled by FK over her bind offsets plus the `Proportions` scale (clips are authored in metres at 1.75 m and scaled by `k = height / 1.75`).
- Diff touches `player.ts` (+18), `shoulderCamera.ts` (+5, a `headVisible` getter), `remoteAvatar.ts`, `remotePlayer.ts`, `gameState.ts`, `playerTarget.ts`, `menuScene.ts`, `photoMode.ts`, `weaponCarry` pouches; it does NOT touch `src/anim`, `characterRig.ts` or the controller. Merge-tree: no conflicts.
- Risk: the rig has no fingers or toes; Wren's fingers and toes inherit from the nearest mapped joint ("fingers, toes, hands"). Hands on doors and the strike/grab hand shapes will look stiff until finger driving exists. Not a blocker for feel.
- Not ready: checkpoint 11e, failing e2e-traverse ladder grips and e2e-coop offline state, perf baseline not run, 55 MB hero GLB and 18 MB LOD0 committed (`?gfx=min` avoids them in logic tests).

**Leftover non-CT code in the graph.** `DASH`, `JOG` clips and `dash` / `slide` inputs (`AnimInput.dash`, `slide`), `PIVOT` clip and `i.motion === 'pivot'` branch (guards only now), `CRAWL` / prone-adjacent clips (G110: no prone crawl), `RAPPEL_HANG`, `PIPE_*`, `SPLIT_BRACE`, `WALL_KICK` (traverse set; see section 7 for which survive), melee elbow overlay (`meleeHandW`), lean (`AnimInput.lean`, hips planted), cover `WALL_READY`. Entanglement: moderate. They are `if (i.x)` branches inside the single 560-line `update()`, so removing one is a local edit but each removal needs the anim audit baseline (`animAudit.test.ts`) updated. The FEEL-BRIEF says no audit polish rounds: treat the audit as a gate only.

**Tests.** `anim.test.ts`, `animAudit.test.ts` (488, bible 5.12.2 limits: joint deg/frame, pelvis jump, foot slide < 1 cm, blend 0.1-0.25 s; `pelvisJumpByGear` reads `GEARS`, so speed changes feed in), `footPlanner.test.ts`, `e2e-anim`, `e2e-clip` (contact sheets, GPU). `limits.ts` still has "gear 1..6" comment text.

**Risks.** The audit's 25 deg/frame and pelvis-jump limits will fight a tiptoe sway if the oscillator is fast; exempt or tune. Inertializer cuts at state switches (kneel/crouch/tiptoe) need the same 0.1-0.25 s window.

**Recommendation: ADJUST (medium).** Reasons: (1) the graph already supports additive layers and inertialized switches, which is exactly what posture and tiptoe need; (2) the rig (IK, sockets, hit volumes, light samples, 1893 lines) is the pose authority for Wren, so replacing the graph does not shorten the Wren path and would break the operators branch's assumption; (3) a clean rewrite buys nothing until the dead layers hurt, and they are branch-local. Do the dead-layer prune after Michael signs off posture, so the audit baseline is regenerated once.

---

## 3. Camera and aim

**Files (lines):** `player/shoulderCamera.ts` 455, `config/camera.ts` 142, `player/cameraBounds.ts` 63, `world/doorPeek.ts` 319 (camera-facing part), `player/player.ts` (`recentre`, `frameUpdate`, `applyFov`), `weapons/weaponCarry.ts` 126, `weapons/drawState.ts` 68, `weapons/aimAssist.ts` 104, `game/gameState.ts` (aim assist apply at ~1285-1310), `config/movement.ts` (`camFollow`, `camShoulder`, `camAds`, `recentre*`).

**Structure.** `ShoulderCamera` is a spring-based over-the-shoulder rig: look targets `yaw` / `pitch` are written by input (`addLook`), the rendered view equals the aim (no look lag; good). The position side is a pile of critically damped `Spring`s (15 of them) for pivot height, follow (`camFollow` 16), look-ahead, pace, ADS, lean, dash, cover, shoulder side, boom, low space. Collision is good: sphere casts head -> pivot -> shoulder -> camera, low-space probes, near-plane control (`cameraBounds.ts` pure, 93-line test `cameraBounds.test.ts`, `e2e-camera-bounds`).

**What Michael ruled vs what the code does (concrete list).**
1. Auto recentre: EXISTS. `Player.recentre()` (`player.ts` ~397-414) eases `cam.yaw` toward the travel heading after `recentreDelay` 1.5 s of no look input while moving; gated by `settings.gameplay.autoRecentre` (default on) and the settings screen row. Delete the method, the two `MOVEMENT` keys, the setting and its row (menu job owns the screen file; coordinate), `tests/settings*.test.ts`, `motion.test.ts` references. Easy.
2. Swing toward travel / lead room: no yaw swing exists, but a POSITIONAL look-ahead exists: `lx, lz = spring(clamp(v * 0.14, +-0.3 m), 5/s)` added to the pivot (`shoulderCamera.ts` ~233-240, 329). That is a lead on the camera and must go (G29 original text "gentle swing toward travel" is superseded by Michael's M1 note).
3. Rigid follow: NOT rigid. `fx/fz` follow springs at `camFollow` 16 (about 125 ms lag), `sFootY` at 14. CT target is no lag, no settle, no bob. The `bob` spring (`impact()`) and handheld drift (`drift` 0.0018 rad plus trauma shake) also contradict "no bob" for exploring. Keep impact/trauma shake only if Michael wants it; drift off.
4. Framing: boom 2.2 m, shoulder offset 0.62 m, pivot at spine top, camera at shoulder height - the legacy "operative small in left third" framing. CT target (G28, P2): ~1.8 m from the head, ~2.3 m high, pitched ~17 deg down, aimed at head, lateral offset only 0.1-0.2 m. Different geometry, different parametrisation (the legacy one is pivot + boom behind along view; CT is a fixed head-relative offset with pitch bias). Numbers in `CAMERA` change wholesale.
5. Pace-dependent framing: `paceS` boom change `(paceS - 0.45) * 0.16`, dash boom 0.3 and FOV +4 deg: not CT. Remove.
6. Aim: `adsZoom` 0.75 FOV multiply (target: NO zoom, G104 except marksman scope). `camAds` spring 19 /s is about 0.2 s, target raise 0.6 s pistol / 0.75 s rifle with the camera moving before the gun. `weaponCarry.raiseTime` 0.16, `lowerTime` 0.3 (target lower 0.5-0.6 s, half the motion in the first 0.1 s); `drawState` `DRAW_TIME_SIDEARM` 0.3 / `PRIMARY` 0.4 (G103: 0.6 / 0.75). Aim-camera position: target ~0.4 m from head, 0.35-0.45 behind, 0.16 m to weapon side, eye height; now `boomAds` 1.5, `shoulderAds` 0.58.
7. Shoulder swap: exists (`swapShoulder`, `side` spring, `arc = 0.2 * (1 - side^2)` pull back). G17 says swap works only while aiming; code swaps any time (`player.ts` ~183). Timing target 0.40 / 0.42-0.45 s; spring rate 15.5 gives roughly 0.25 s and the arc is 0.2 m not the 0.85 m pull-back to the spine. The aim side is NOT on the wire (P2 item 3 says MoveState carries it), so the partner's gun hand cannot mirror: `RigPose`'s `weaponHand` is local only.
8. Aim assist: EXISTS (G16 says none). `weapons/aimAssist.ts` 104 lines, `gameState.ts` ~1285-1310 (applies to pad, `settings.gamepad.aimAssist` default 'standard'), settings and settings screen, tests in `weapons.test.ts`, `settings.test.ts`, `ui.test.ts`, e2e-combat / e2e-stealth / e2e-weapon-audio. Straight deletion, moderate test fallout.
9. Wall peek / lean camera (`wallPeek`, `wallLean`, `peekW`, `leanW`, `WALL_CAMERA`): keep peek (target: head-and-shoulder lean out 0.15-0.25 m, camera to 1.0-1.5 m past the corner, 0.3-0.4 s), delete lean (`wallLean`, `lean`, `leanS`, `leanShift`).
10. Door peek eye (`doorPeek`, `doorEye`, FOV 0.85 mul): partly useful for the stealth-open "close camera at the crack"; FOV change is not CT-confirmed, drop unless footage shows it.

**Leftover non-CT code.** Dash (`dash`, `sDash`, `dashBoom`, FOV), lean (`lean`, `leanShift`), pace boom, drift, bob, look-ahead, ADS zoom, cover boom (partly CT wall camera), `ATTACH_FRAMING` presets for 12 attach kinds (some will die with traversal pruning). Entanglement: all inside `ShoulderCamera.update()` (about 200 lines) and read by `Player.frameUpdate` (sets `cam.lean`, `cam.cover`, `cam.steady`, `cam.pace`, `cam.dash`). Gameplay never reads camera state except `yaw` / `pitch` and `forward` (aim), which keeps the rewrite local.

**Tests.** `cameraBounds.test.ts` 93, `e2e-camera-bounds.mjs` (uses `CAMERA.padding`), `doorPeek.test.ts` 202, `weapons.test.ts` (aim assist), `settings*.test.ts`. No test asserts the framing numbers (boom, shoulder, FOV), so reframing breaks little. GPU look needed for the framing itself.

**Risks.** Rigid follow shows every capsule step and stair hop; CT hides this with a stable follow, so a rewrite should low-pass vertical only (stairs) and keep XZ rigid, or stairs will shake the view. The head-relative camera needs the head position from the rig (`posedHead`) or the capsule plus fixed height; use the capsule (G38: same camera height for every operator). Wren's camera-fade (`applyBodyFade`, `headVisible`) must survive the merge.

**Recommendation: REWRITE CLEAN the framing/follow core (medium).** Reasons: (1) every CT camera rule (rigid, no lead, head-relative offset, no zoom, fixed raise timing) contradicts the spring-per-concept structure, so adjusting means turning 15 springs to zero and leaving dead state; (2) the part worth keeping is separable and tested: casts, pivot safety, low-space, near plane (`cameraBounds.ts`, `cast()`, `probeY()`), plus `addLook`, `kick`, `shake`, `snap`, the door eye; (3) no test pins the old framing, so the rewrite is cheap to verify by eye. Scope the rewrite to `update()` and `config/camera.ts`; keep the class API (`yaw`, `pitch`, `adsTarget`, `swapShoulder`, `attach`, `wallSide`, `wallPeek`, `doorPeek`) so `Player` and `GameState` barely change. Aim timing (`weaponCarry`, `drawState`) is ADJUST (constants plus the "camera moves before the gun" offset). Deleting auto-recentre and aim assist is a first, small, certain commit.

---

## 4. Back-to-wall, doors, pad layout

**Files (lines):** `player/wallController.ts` 1003, `cover/coverData.ts` 237, `cover/corners.ts` 133, `world/doors.ts` 283, `world/doorPeek.ts` 319, `input/padBinds.ts` 122, `input/gamepadMapping.ts` 171, `input/keyBindings.ts` 189, `input/gamepadSource.ts` 246, `input/keyboardMouseSource.ts` 265, `input/actions.ts` 60.

**Wall structure.** `WallCore` (pure state machine, `WallPhase = off | entering | on | leaving | swat`) over `buildWallLinks(segs)` (cover segments from the level, per-end links, gap detection), entry by context press, slide along a segment with stack clamping for co-op partners, edges, peek, lean. `wallOverride` turns it into a `MoveOverride` for the controller. Remote avatars reproduce it from `mv.m === 'wall'`, `a` (segment), `s` (metres along), `sub` bits (`WALL_SUB`: crouch, faceRight, edgeL/R, peek, lean, low, leftHand), `lk` lean kind. Well factored, 773-line `wallController.test.ts`, `e2e-wall`.

**Leftover non-CT code.**
- SWAT turn: `WALL.swat*`, `swatDuration`, `SWAT_MAX_PACE`, `WallPhase 'swat'`, `swatN/T/Dur/Gap/From/To/Seg` state, `MoveMode 'swat'` and its COMMITTED entry, `validate.moveSpeedCap` branch, `AnimGraph`/rig handling. 18 `'swat'` occurrences across src. Entangled in link building (`buildWallLinks` swat targets), phases, wire, anti-cheat. Medium-sized removal.
- Lean-out and over-the-top: `lowAimKind`, `leanPastEdge`, `leanBodyTurn`, `LEAN_KIND`, `WALL_SUB.lean/low`, `LOW_AIM`, `LOW_HEAD_CLEAR`, `wallHeadCap`, `posedHeadSample`, `remoteWallHeadCap`, `peekLean/leanOut/leanLean` constants, camera `wallLean`. Plan P3 item 1 removes all of it, and the low-wall rise (P3 item 6: low cover = crouch beside it). The `low` flag also feeds `AttackerState 'wallLow'` in takedowns.
- Slide speed uses the old `WALL_GEAR_CAPS` (M1 left it): target ~0.35 m/s standing, 0.25-0.35 crouched, 1.1 s shuffle (G35). `wallSlideSpeed(along, crouch, gearCap)` is the hook.
- Wall entry: target 180 deg in-place spin in 0.3-0.45 s with no glide; code has `WALL_TURN_RATE = 12` rad/s (about 0.26 s for 180, close) plus the `wallRootPush`, `entering` glide into the standoff.
- Aiming at the wall: target LEAVES the wall (view in 0.27 s, rifle 0.4 s). Not checked in detail; the code supports shooting while `on` (carry `coverRaise`, `WALL_READY`).
- "Snap cover" proper (the old `cover` driver, glides) is already replaced by this core; `COVER_MOTION` / `GLIDE_MOTION` in the controller are its leftovers.
- Stance: P3 item 3 flat back standing and sideways crouched. `AnimGraph` has `WALL_STANCE`, `WALL_BACK`, `WALL_WIDTH`, one blended wall stance with a crouch weight; flat-back standing vs sideways crouched is a different pose pair, posture work (Wren).

**Doors.** `Doors` (open/close, `how: quiet | bash | enemy`, body added/removed, `ajar` crack) and `doorPeek` core (a press cracks the leaf 0.12 of the swing in 0.6 s, view at the crack). Target (G97, P3 item 7): CT door list (open, stealth open, bash, optic cable), stealth open = leaf angle follows the stick (12-18 deg/s slow, up to 200 deg/s fast), operator steps to the latch side first, palm on the door to ~65 deg, passes light/sound/sight past 15 % open, host-owned angle in co-op. Now: a fixed 12 % crack with a timer, not analog. Needs a new analog `angle` per door (host-authoritative `dcr` field exists on the snapshot: widen it), the pop-up list UI (G19) is a UI piece (menu job territory: check boundary), light/sight gating at 15 % (`DOOR_CRACK`, `Doors.blocksLight`-style hooks). Guards closing doors (G41) is AI work. `doorBash` run-push rule exists in `traversal.ts` (M1 changed to "standing, top speed, > 3.5 m/s") and must become a menu-only bash (G97).

**Pad layout (G96).** `padBinds.ts` / `gamepadMapping.ts` are the legacy layout: A context (wall/door/SWAT), B crouch, Y traverse/use/takedown, X reload (hold = next weapon while aiming), RB/LB weapon swap, R3 shoulder swap, D-pad up/down speed gears, right gadget, left ping/wheel, View goggles, L3 unbound (M1). CT's real layout is not yet in the repo as a table the code can consume; G96 says "copied button for button". Layout is data: `PAD_BINDS` table + `GAME_BINDINGS` + `keyBindings.ts` defaults + the controls screen text + `padBinds.test.ts` 59 / `keybinds.test.ts` 50 / e2e-pad. Contextual verbs share one button via `ButtonAction` and `gamepadSource` hold/tap logic (tap vs hold on X, View, D-pad left): CT uses hold and context heavily, so expect the "source turns a hold into X" logic to need a small generic tap/hold mechanism instead of the three hardcoded special cases. Resolve the CT layout from the measured doc first (ct-walls-doors-combat-vision.md); I did not find it listed as a table in the research.

**Tests.** `wallController.test.ts` 773, `doorPeek.test.ts` 202, `doors.test.ts` 60, `padBinds.test.ts`, `keybinds.test.ts`, `input.test.ts`, `moveState.test.ts`; e2e-wall, e2e-pad, e2e-mouse (key remap), e2e-netmove (wall in co-op).

**Risks.** Deleting SWAT and lean touches the wire, anti-cheat (`validate.ts`), and takedown attacker states in one go; do it as one slice with a protocol bump. Wall stack clamping (`stackClamp`, `others` array) is co-op-critical and well tested: do not touch. Pad rewrite changes the controls screen (menu job's file): coordinate through a data-only change in `padBinds.ts`.

**Recommendation: ADJUST the wall core and doors (large for wall prune plus peek camera plus stance; medium for analog door); REWRITE the pad/key tables (small).** Reasons for ADJUST: (1) the segment/link/phase/override structure and the wire fields match what CT needs and are heavily tested; (2) what must go (SWAT, lean, low-wall rise) is cleanly named and removable by deletion; (3) a rewrite would re-derive the stack clamping and edge detection for no feel gain. The door crack core is the closest thing to a rewrite here: replace the fixed crack with an analog angle, keep `Doors` and the host-authoritative `dcr`.

---

## 5. Strike, grab, takedowns

**Files (lines):** `game/takedownController.ts` 440, `game/takedown.ts` 297, `game/strikeController.ts` 234, `game/elbowStrike.ts` 87, `game/committedMoves.ts` (co-op approval), `ai/archetypes.ts` (`grabRule`).

**Structure.** Two controllers. `StrikeController` is the holstered `fire` press: a committed move (client predicts, host approves and resolves at t0 + 0.5 s via `cmove` / `cstart` / `cdeny`). `TakedownController` offers a takedown by geometry (`pickTakedown`: behind, front, side, overCover, corner, above, below, window, drop, inverted), plays an eased approach then a strike, tap = non-lethal, hold = lethal; for a guard on two legs from behind it runs a GRAB (hold hostage in front, move at gear <= 2, sidearm over the shoulder, fresh press to decide, shove).

**CT target.**
- Palm strike (P4 item 1): offered only with a guard within ~0.8-1.0 m in front; 0.10-0.15 s wind-up to contact, 0.3-0.5 m lunge, one-hit knockout from any side (G42: every human guard, no dogs; heavies per G49), guard down 1.2-1.4 s, operator free ~1.4 s after contact. Now: `STRIKE`: reach 1.2, cone 90 deg, `hitAt` 0.5 s, `anticipation` 0.15, `recover` 0.4, whole move 0.9 s, `lunge` 0.3, stagger-then-KO (a struck aware guard staggers, second hit knocks out) - the stagger rule contradicts G42 one-hit KO; `resolveStrike` has the `heavy` flag. The structure fits; the numbers and result table change. Prompt rule "no strike without a target" is not in (a whiff plays the full move today).
- Grab (G23, G43): grab first, then CT's grab menu (knock out, kill, interrogate), no tap/hold selector. Now: tap/hold decides lethality (`lethalHold` 0.3 s, `grabToggle` setting), plus a SHOVE (not in CT) and a hostage-with-gun mechanic. The phase structure (approach, hold, decide, finish) is reusable; the decision UI is a CT-style menu (HUD/UI work, menu-adjacent).
- Other takedown kinds (side, overCover, corner, above, below, window, inverted, drop): G43 keeps drop/ledge/window/pipe as tap/hold; the rest are legacy-era (`overCover` with `wallLow`, `corner`, `side`) and need an audit against CT footage before keeping. Not a feel-job priority.
- Palm strike on the wall: `AttackerState 'wall' | 'wallLow'` couples takedowns to the wall core; low-wall removal changes this.

**Leftover non-CT code.** Stagger-then-KO, shove, hostage aim/hesitation (`GRAB.hesitate`, `spreadMul`), lethal-hold tap/hold, `grabToggle`, `handsMul` (suit gloves, progression), elbow naming (it is the old elbow strike). Entanglement: moderate; GameState owns an instance of each and `committedMoves.ts` is the shared co-op rail (client predict, host resolve), which is good and should be kept.

**Tests.** `elbowStrike.test.ts` 61, `takedown.test.ts` 109, `committedMoves.test.ts`, `e2e-takedown.mjs`, `e2e-stealth*.mjs`, `e2e-netmove` (strike in co-op).

**Risks.** Hit timing on a client is predicted; shrinking contact from 0.5 s to ~0.12 s makes the host's lag slack (`STRIKE.lagSlack` 0.6 m, `replyTimeout` 0.4 s) the dominant error source: a client sees its strike land before the host approves. Keep the animation anticipation on the press and the resolve on the host; tune `lagSlack`.

**Recommendation: ADJUST (medium).** Reasons: (1) the committed-move rail and takedown geometry are correct and co-op-aware; (2) the strike is a table change plus removing the stagger branch and adding the in-front prompt rule; (3) the grab needs the CT menu, which is the one real build, but it sits on the existing grab phases. Do not touch the takedown kinds beyond what G43 states until the feel job reaches them.

---

## 6. Goggles / vision modes

**Files (lines):** `game/vision.ts` 99, `vfx/visionLook.ts` 140, `vfx/cinematicPost.ts` 288 (shader `vk` branch), `vfx/nightVision.ts` 202, `vfx/nightAutoGain.ts`, `vfx/nightBloom.ts`, `player/goggleGlow.ts` 44, `vfx/silhouettes.ts` 135, hooks in `game/gameState.ts` (`~1683` goggles per render frame) and the pad/keyboard sources.

**Structure.** `VisionState` holds the chosen `mode` (off, night, thermal, electro), the shown mode and a goggle flip timer; one button cycles. Thermal and electro are branches of the cinematic post shader (`vk` 1 / 2) plus render-only emissive flags on warm bodies and devices (`PatternPlugin` `pattern.w`); night vision is a gain plus intensifier grain and bloom. Gameplay never reads it (`visionIsolation.test.ts` with a snapshot, D8). This isolation is exactly what CT parity needs (a render-only layer) and is a strength.

**CT target.** G99 three modes: yes. G100 instant switch in CT order (thermal, electro, night, off): now cycle is off -> night -> thermal -> electro and a 0.2 s flip with the image switching at its middle (`VISION.flip`), so change the order and delete the flip (post `setFlip`, flip uniform, housing overlay). G101 CT grain: heavy grain only on warm areas in thermal, ~1 % in night, none in electro; now grain is luminance-weighted and strongest in the dark for night (`SENSOR_GRAIN` night/litNight), tinted green for electro; thermal grain is applied on lit areas, closer to the plan but with different weights. G102 thermal: CT colour ramp (indigo background, blue rim, cyan, green, yellow, red core), room nearly invisible at any range, people full brightness at 15 m no fade, soft bodies with blue glow, dim blue silhouette through closed doors. Now: `THERMAL` is a cold blue-grey to white-hot ramp (3 colours), scene luma-driven, the whole lit scene still shows (cold stays below `hotFrom`, "shapes readable"), no door silhouette. So the thermal look is a rewrite of `thermalColor` / `THERMAL` (ramp, suppress cold luma harder) and a new door-silhouette pass (`silhouettes.ts` exists for an unrelated feature; check). Electro: flat navy no grain, devices white blobs - close: dark desaturated green now (change tint to navy) and grain off. Night: green-grey, ~1 % grain, bloom on lights: `nightVision`/`nightBloom` exist; check values.

**Leftover non-CT code.** Camera-feed mode is already gone from the cycle (G99); `feed` uniform in the post shader still exists (remote camera views: gadgets, security). Goggle HUD labels (`visionLabel` 'NV', 'THERMAL'); icons (`ui/icons.ts`). Co-op: the partner's goggle mode is not sent (G73), so the remote shows nothing; matches "partner sees the same moves", fine.

**Tests.** `vision.test.ts` 134, `visionIsolation.test.ts` (snapshot), `nightVision.test.ts`, `e2e-darkness.mjs`, `e2e-pad`/`e2e-mouse` (the goggle tap step that already fails in e2e-pad: the plan's "tap goggles" vs "hold does nothing" source logic). Visual check is GPU only (Michael's PC).

**Risks.** Door silhouette (thermal) needs a render-only mask of guards behind closed doors without leaking position to perception; follow the D8 isolation pattern and keep it in `vfx`. The existing e2e-pad goggles step flakes: understand it before changing the button logic.

**Recommendation: ADJUST (small-medium).** Reasons: (1) mode set, post structure and the render-only guarantee already exist; (2) the work is data (order, ramps, grain weights) plus deleting the flip; (3) the only new pass is the door silhouette. Do it last (build order), after the camera.

---

## 7. Co-op wire

**Files (lines):** `net/protocol.ts` 667 (`PROTOCOL_VERSION` 14, `PF` flags, `PlayerState`), `player/moveState.ts` 410 (modes, `MoveState`, `sanitizeMoveState`, `packMoveState`, `poseFromMoveState`), `game/localMoveState.ts` 161 (builds the sender's state), `net/remotePlayer.ts` 284 (host-side record), `net/remoteAvatar.ts` 422 (poses a partner from state), `net/validate.ts` 253 (speed caps, attach clamp), `net/coopHost.ts` 1090.

**Structure.** `PlayerState` per tick: position, yaw, pitch, speed, flag bits `f` (`PF`), weapon, hp, optional `mv: MoveState`. `MoveState` = mode (index into `MOVE_MODES`, "later phases append, never reorder"), anchor `a`, position along it `s`, `sub` bits, blend `ph`, takedown target `tid`, gear `g` 1-5, raise `r`, aim twist `ay`, draw phase `dw`, optional `u`, `rd`, `lk`, `gp`, committed-move start `c`. The sender builds it from local systems; `sanitizeMoveState` clamps untrusted input; the remote runs the same `poseFromMoveState` as the local player; `moveChanged` triggers an immediate send on mode/sub change. Remotes interpolate and the host validates speed against `gearCap`. The structure is good and already follows "same code poses local and remote".

**Gaps for the CT job.**
- Frozen stop stance is not on the wire (M1: remotes square their feet on a stop; the 1.7 s freeze is invisible to the partner). Cheapest honest fix: a derived rule on both ends (a remote that went from speed > 0 to 0 holds its last stride for `CT.stopHoldTime`); needs a held-gait state in `remoteAvatar`, no new bits.
- Tiptoe: one new bit (sub bit on `ground`, or a `PF` flag; `PF` has 128 `quiet`, 256 `silent` free-ish; add `PF.tense = 2048`).
- Aim side (shoulder swap): not sent; add `PF.shoulderL` or an `ay`-adjacent field. The swap animation (0.40 s) also needs a phase if the partner is to see it mid-swap (cheap: `ph` while aiming).
- Doors: analog angle must ride the host-authoritative snapshot (`dcr` exists, 0..crack range): widen the range and quantise.
- Modes to delete with their features: `swat` (wire index stays, mark unused), `strike` kept (palm), `grab` kept, `takedown` kept, `wallJump`/`split`/`rappel`/`fence`/`pipeH` depend on the traversal prune (G110 removes rope climb; the others are CT moves, keep unless Michael says otherwise), `brace`/`boost`/`stacked` are team moves (co-op feature, G111 two-player: probably keep). Because indices must never reorder, "delete" means stop emitting and keep the string in `MOVE_MODES`, or bump `PROTOCOL_VERSION` and allow a reorder (cheap while there is no live deployment and the protocol is version-gated; recommend a version bump and clean reorder at the end, one commit).
- `validate.moveSpeedCap` has a `swat` branch and still caps by gears; after the speed work, the cap should read from `GEARS` plus roll and CT bursts, tested by `net.test.ts`.
- `PF.crouch` and `quiet/silent` are computed on the sender from local noise; with G40 CT silent bands, the host's `noiseRadius(r.ref.speed, ...)` (coopHost ~907) must stay consistent with the local formula (it calls the same function; good).

**Tests.** `moveState.test.ts` 218, `net.test.ts` 833, `netSim.test.ts`, `committedMoves.test.ts`, `teamMoves.test.ts`; e2e-coop, e2e-netmove (M1: failed twice at "zipline ends", unverified roll section), e2e-net-lib. Wire tests are strong; the e2e coop path is the shaky one.

**Risks.** Every wire change must bump `PROTOCOL_VERSION` and update the literal-shape tests. Two-tab parity checking (FEEL-BRIEF step 4) is manual and GPU-light: schedule it per area.

**Recommendation: ADJUST (small per area, spread over the job).** Reasons: (1) `MoveState` plus `sanitize/pack/poseFromMoveState` is already the right pattern and has tests; (2) each CT area adds at most one or two fields; (3) a wire rewrite would only be worth doing once, at the end, to delete dead modes and reorder.

---

## Cross-cutting findings

1. **Do first, certain and cheap:** delete auto-recentre and aim assist (both contradict recorded decisions and Michael's M1 ruling), remove the camera look-ahead, fix `stepAssist` allocations, and fix the three unverified e2e suites (e2e-netmove zipline, e2e-pad load/goggles, e2e-mouse match start) on an idle machine. These unblock everything and need no design.
2. **Camera before wall and doors** (build order is right): the wall peek camera and door-crack camera both sit inside the rewritten framing core.
3. **Wire bumps:** batch them per area, one `PROTOCOL_VERSION` bump per slice.
4. **Docs drift:** G17 says "the exploring camera swings by itself" and G29 says "a gentle swing toward travel"; both are superseded by Michael's M1-FEEDBACK note and must get a G entry at merge (the brief already says so). `limits.ts` and several comments still say "gear 1..6".
5. **Menu job overlap:** the settings rows for auto recentre, aim assist, sprint hold, the controls screen layout and the door pop-up list are `src/ui/screens` files owned by feature/menu. Make the data side (settings keys, padBinds table) change here and hand the screen edits over, or the two branches will conflict.
6. **Legacy driver kept:** the old `MotionDriver.step()` branch and `ENEMY_MOTION` are shared by guards; the feel job should not prune them.
7. **Guard check:** this review used the abbreviation CT and described mechanics only; no franchise names beyond that.
