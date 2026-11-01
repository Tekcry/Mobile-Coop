# Slice F report (playtest-2 walk, 2026-10-19)

Brief: `F-BRIEF.md`. Source: `WALK-2026-10-19.md`. Prototype pass: every number a starting value (G10). No wire change
(PROTOCOL_VERSION stays 24). The "hold until footage" items were not touched.

## F1 Shoulder rule (done)
- Holstered, the follow camera is always over the right shoulder. A left swap (L3 while aiming) lasts only while the
  weapon is drawn: the draw's falling edge (X, a climb, death) calls `ShoulderCamera.resetShoulder()`, so the camera
  returns to the right and the next draw is on the right (`rig.openLeft` and the co-op left-shoulder bit follow
  `cam.shoulder`). A hard landing's brief lowering keeps the draw wanted, so it keeps the side.
- Slice A's saved default shoulder is gone: every mission starts on the right; `gameplay.defaultShoulder` is no longer
  read or written (the field stays, unused: no settings shape change for it).
- Back to wall (CT): drawing to aim takes you off the wall (`docs/research/ct-movement/ct-walls-doors.md`, CT-CONTROLS; our wall core
  already leaves on aim), so there is no "on the wall and aiming" case. The wall never sets the shoulder now; slice A's
  camera-frame wall side (`cam.wallSide`) is removed. The edge view is F4's slide instead.
- Files: `src/player/shoulderCamera.ts`, `src/player/player.ts`, `src/game/gameState.ts`. Tests: `tests/cameraRigid.test.ts`
  (holstered wall camera stays right; a left swap while aiming, holster: back on the right).

## F2 Crouched ADS camera height (done)
- `framing()`: the pivot follows the body down crouched, aiming or not (`pivotStand + (pivotCrouch - pivotStand) * crouch
  - aimEyeDrop * ads`; B+C had faded the crouch share out with the aim). Boom 0.35, shoulder 0.42 and eye drop 0.24 are the
  same standing and crouched, so the framing relative to the body is unchanged; crouched it sits 0.6 m lower
  (1.75 -> 1.15 capsule) holstered, and `aimCrouchShare` 0.68 of that (0.41 m) aiming: from the kneel the aiming upper
  body is upright (head ~0.41 m below standing on `shots/f/aimcrouch-side`); the full drop put the camera behind her
  shoulder (first render). The ceiling casts and low-space framing still clamp it.
- Files: `src/config/camera.ts`. Tests: `tests/tactical.test.ts` (same boom / shoulder, aimed pivot lower by the share of the crouch drop).

## F3 Crouch idle kneels (done)
- `POSTURE.kneel` back on (P1c had turned it off): crouched and still for `KNEEL_STILL` 0.25 s, the KNEEL clip blends in
  over 0.3 s (right knee down, left foot planted forward). The crouch's forward lean gives way to the kneel's upright back
  (`crouchLean * (1 - kneel) + kneelLean * kneel`): torso about 10 deg kneeling (was 35-45 in the squat). Moving blends
  out over the stand time; aiming from the kneel stays a kneel (the controller's kneel ignores the aim).
- Co-op: remotes kneel too (`RemoteAvatar`: crouched, on the ground and still for `KNEEL_STILL`), no wire change.
- Files: `src/anim/animGraph.ts`, `src/player/playerController.ts`, `src/net/remoteAvatar.ts`. Tests: `posture-p1c`
  (kneel: right knee < 0.15 m, torso 0-20 deg; without the kneel the squat as before), `posture` (kneeling torso 0-20),
  `anim` (kneel stance offsets).

## F4 Corner lean and camera slide (done)
- The flip: slice A read the wall shoulder side in the camera's frame (`cam.wallSide`), so the camera crossed sides as
  it swung; the body's stance side came from the slide direction, and the stick is camera-relative. Now the body's wall
  side at an edge is the edge's open side (`wallFacing(edge, dir)`; remotes decode the same from the edge bits in
  `poseFromMoveState`), never the camera; the lean was already edge-based (`rigLean`).
- Camera slide: `WallCore.peekView` = `wallPeekView(push toward the edge, look . edge direction)` (0..1; the look counts
  from 0.2 and is full at `peekLook` 0.85), at the end only. The camera pivot slides up to 0.75 m past the body toward
  the open side by that amount, the shoulder offset turns to the open side (edge direction . camera right: continuous,
  no flip; 0 when looking straight past the edge) and the boom comes in to 1.4 m (`WALL_CAMERA.peek.boom`, CT measured
  1.0-1.5 m). The 18 deg view turn and the head peek are unchanged. The slide eases over 0.55 s (`WALL_CAMERA.peek.blend`,
  was 0.3: moving pivot, boom and shoulder together over 0.3 s stepped the camera 9.6 cm a frame in e2e-wall, limit 6).
- Files: `src/player/wallController.ts`, `src/player/shoulderCamera.ts`, `src/config/camera.ts`, `src/game/gameState.ts`,
  `src/player/moveState.ts`. Tests: `wallController.test.ts` (`wallFacing`, `wallPeekView`), `moveState.test.ts` (edge
  bits win), `cameraRigid.test.ts` (the slide goes toward the open side for three camera yaws).

## F5 Ledge climb-up: knees, then stand (done)
- `CLIMB_UP_TIME` 1.1 -> 1.3 s. The pull-up and knee keep their seconds (old k x 0.846: root path `k1` 0.34, `k2` 0.59,
  `fwd0` 0.51, `fwdSpan` 0.34, `outK` 0.55; feet off a drainpipe by 0.34). The knee is planted (shin flat) by k 0.56; the
  hands hold at weight 1 until 0.6 and are off by 0.74 (`CLIMB_UP_HANDS`, was released 0.5 - 0.75, mostly gone before the
  knee). The right foot steps up 0.6 - 0.74; the stand from the knee is one monotone rise, pelvis -0.5 -> 0 over k 0.72 - 1
  (0.36 s; was -0.5 -> -0.15 in 0.13 s, the "jump"). The root never passes the top's height (smoothstep). Team climb-ups
  keep `CLIMB_UP_TEAM`.
- Files: `src/player/attachController.ts`, `src/player/moveState.ts`, `src/anim/clips/traverse.ts`,
  `scripts/e2e-traverse.mjs` (the two climb-up waits 1.3 -> 1.6 s). Tests: `moveState.test.ts` (hands at 1 through the
  plant, 0 by 0.74; the stand rises monotonically, never above standing, under 2.5 m/s).

## F6 Rifle draw: no low-ready dip (done)
- Cause: the whole swap / draw blocked the carry raise (`ci.reloading` included `swapT >= 0`), so the rifle travelled to
  the low / compressed ready pocket and only then raised over 0.45 s; the swap clip also pitched the gun 0.45 rad
  muzzle-down at 0.75.
- Now a draw to a back slot raises once the gun leaves the slot (`DRAW_RAISE.from` 0.5 of the swap) over
  `DRAW_RAISE.time` 0.45 s, so the travel (~0.22 s) ends well up and still rising (raise ~0.58), shouldered about 0.6 s
  into the draw (G103: rifle about 0.75 s; the first cut, 0.18 s, made it ~0.45 s and failed e2e-anim's raise window).
  The swap clip's wpPitch is level from the slot (0.38) for back slots (a drop near 0.5 overlapped the raise: a 0.2 rad
  one-frame pop in e2e-anim's draw continuity). The pistol (thigh) draw is unchanged.
- Files: `src/weapons/weaponCarry.ts` (`raiseTime` input), `src/player/player.ts`, `src/anim/clips/actions.ts`. Tests:
  `tactical.test.ts` (raise > 0.5 at 0.22 s and > 0.9 at 0.5 s with the draw raise, < 0.7 at 0.22 s without).

## F7 Speeds on the D-pad (done)
- Answer for Michael: "Your saved controller settings were from the A3 build, which had speed on D-pad left / right; F1a
  moved speed to up / down for new settings but kept saved ones. This build moves them: speed is D-pad up / down (and the
  stick), vision left, gadget right."
- Cause: A3 (24ce039a) put the gear on D-pad left / right, vision up, gadget down; F1a (32dac793) moved the defaults but
  `sanitizePadBinds` keeps stored binds, so any settings save from an A3 build kept speed on left / right (and vision on
  up, sharing it with speed up). Fix: `Settings.padV` (`PAD_LAYOUT_V` 2); an older save moves each of those four verbs still
  on its exact A3 button to today's default; a remapped verb is kept (`migrateA3Dpad`). Test with a literal A3 save in
  `tests/settings.test.ts`.
- Prompts / panels checked: the bindings table (`padBinds.ts`, `gamepadMapping.ts`), the selection wheel hint
  (gameState: "D-pad left toggles the vision, D-pad right uses the gadget"), `docs/systems/input-and-loop.md` (fixed: it
  still said left / right). No in-game prompt or Marlow Yard panel names a speed button.
- For Menu Notes (not edited, `src/ui/screens/`): `settingsScreen.ts:155` still shows the "Default shoulder" row (now does
  nothing: remove it); `controlsScreen.ts:23` fixed row "LT / RT: Aim / fire" is stale since F1a (X draws / aims; LT is the
  knockout / secondary fire).

## Status (2026-10-19 23:40: verified, on /ct/)
- Commits: 980a9695 (F1-F7 WIP), 637d41d5 (e2e fixes: peek blend, draw raise, clip pitch), then the crouched-aim share,
  sheets and docs (this commit).
- `npm run check` green (1798 unit tests + build) on the WIP; rerun before the push (below).
- e2e (desktop, port 4193, solo unless noted): e2e-wall, e2e-anim (both failed first, fixed in 637d41d5), e2e-clip,
  e2e-traverse, e2e-weapons-carry, e2e-move pass; e2e-pad only its KNOWN FLAKY "stick 50 / 80 / 100%" assert. The quick
  set on 637d41d5 (two at a time, minus the long co-op suites): 22 pass; e2e-stealth failed under load, passed solo;
  e2e-camera-bounds level U fails (a known master failure, docs/backlog.md, legacy); anim-audit report only. After the
  crouched-aim share: e2e-move, e2e-stealth, e2e-wall, e2e-anim pass.
- Laptop runner (Character Build) on 637d41d5: e2e-ctcourse 260 s, e2e-coop 96 s, e2e-netmove 118 s, all pass.
- Sheets (E2E_GPU=1, `shots/f/`): crouch-side / -front (one knee down from about 0.5 s, back upright), aim / aimcrouch /
  aimpistol / aimcrouchpistol -ots and aim / aimcrouch -side (re-rendered after the share), walledgelook /
  walledgeleftlook -ots (camera swung each way: the body holds its stance, no flip; the -back views show nothing useful
  at a wall), draw-side / -front (back to chest, level, to the shoulder by ~0.6 s, no dip), traverse/hang-climb-dense
  0.6-1.7 s + report.json (grip 1 to 1.3 s, released by 1.4; knee on top at 1.3, then the stand).
- Independent Opus check: PASS, no blockers. Its polish list is in POLISH.md (slice F).

## What Michael should try on /ct/
- Aim, swap to the left shoulder (L3), holster (X): the camera goes back over the right shoulder; draw again: right.
- Crouch and aim: the camera drops with the body.
- Crouch and stop: she kneels on one knee, back upright; walk off and stop again.
- Back to a wall, shuffle to an edge, swing the camera both ways: she leans only to the open side; look or push toward
  the edge: the camera slides past the corner.
- Hang from a ledge and climb up: hands stay on the lip until the knee is on the top, then a slow stand, no hop.
- Draw the rifle: from the back straight to the shoulder.
- D-pad up / down change the speed; left toggles the vision, right uses the gadget.
