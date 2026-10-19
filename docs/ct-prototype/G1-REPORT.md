# G1 report: legs and gait (2026-10-20)

Slice G1 of the CT prototype job. Michael: "check review all animations against the videos and fine tune as necessary
to more accurately replicate the movement system. This system is one of the highlights of the game"; "It should feel
the exact same when i play it. I expect prototype animations for all of it, with no clipping and must be believable";
(00:55) "over exaggerated sneak and holding hand near knife when near guard".

Source: `docs/ct-prototype/audit/AUDIT-LOCOMOTION.md` (final, 85 lines, rows 1-38), CT frames in
`pc/ct-work/frames/locomotion/`. Every number is a starting value. Nothing committed (the job lead commits). No wire change
(PROTOCOL_VERSION 24). `animGraph` `READY_HANDS.xCrouch` / `zCrouch` / `flexCrouch` were not changed.

## Measured before -> after (real rig on a NullEngine, driven as player.ts drives it, 60 Hz)

| Case | Before | After |
| --- | --- | --- |
| Standing idle, knee bend | 29 deg | 11 deg |
| Walk 1.4 m/s, mid-stance knee (max) / head travel | 62 deg / 4.9 cm | 28 deg / 4.9 cm |
| Walk 2.1 m/s | 64 deg / 5.5 cm | 38 deg / 4.8 cm |
| Jog 3.0 / run 4.2, mid-stance knee | 69 / 74 deg | 48 / 52 deg |
| 90 deg walk turn 1.4 m/s: planted foot off the midline / head travel / pelvis drop | 0.23 m / 20 cm / 0.225 m | 0.12 m / 6.3 cm / 0.062 m |
| Zig-zag walk 1.4 m/s: lateral / head travel | 0.34 m / 13.3 cm | 0.14 m / 6.7 cm |
| Spin 0.75 m/s, planted lateral | 0.27 m | 0.14 m |
| Crouched 90 deg turn: lateral / knee centre min | 0.31 m / 0.05 m | 0.105 m / 0.117 m |
| Jog stop: feet split / pelvis in the hold | 0.76 m / 0.44 m (deep lunge) | 0.35 m / 0.91 m (upright in ~0.15 s) |
| Crouched stop to kneel | 1.70 s | 0.20 s after the release |
| Crouch run 2.6 m/s, rear knee centre min | 0.108 m | 0.170 m |
| Crouch walk 1.7 / sneak 0.85, knee centre min | not measured | 0.119 / 0.118 m |
| Run cadence at the top gear | 3.7 steps/s (4.2 m/s) | 4.7 steps/s (4.5 m/s) |
| Bank, 4 m/s at 3 rad/s / cap | 0.08 rad cap | ~0.17 rad / 0.55 rad |

## Per audit row

| # | Status | Old -> new | Files |
| --- | --- | --- | --- |
| 1 Legs in turns | done | free movement (`stride: 'facing'`): planted twist cap 0.9 -> `TURN_FOLLOW.twistFree` 0.25 rad (feet scrub round with the root, counted in `scrubPos`); `PELVIS_FOLLOW_MAX` 0.35 -> 0.05; landing yaw lead capped at 0.25; landings inside the stance band; a foot a turn left behind toes off early (`TURN_LEFT_TIME` 0.6 s, 0.85 of the reach); a rule step nearly done when the clock's swing opens lands first (it jumped ~0.5 m in a frame in a crouched turn). Walls, aiming, cover keep the world lock | `footPlanner.ts`, `turnFollow.ts` |
| 2 Stance width | done | new band `TURN_FOLLOW.minLateral` 0.055 / `maxLateral` 0.14 m in the root frame for planted feet and landings | `footPlanner.ts` |
| 3 Kneel timing | done | `KNEEL_STILL` 0.25 -> 0.05; crouched, the stop hold lets go for the kneel (CT: kneel on the stop). `KNEEL_FADE` kept 0.22 (bible 5.12.2 bound 0.1-0.25, `tests/anim.test.ts`); the pose ramp is `kneelTime` 0.3 | `playerController.ts` |
| 4 Kneel pose | done | the kneel starts with the crouch (gate crouch > 0.5 -> > 0.05: no wide squat first); keeps the lead foot planted (new mirrored `KNEEL_M`, picked from the planner's lead foot); `KNEEL_HANDS` forearm on the front thigh, other hand by the rear thigh; `POSTURE.kneelLean` 0.1 -> 0.18 | `animGraph.ts`, `clips/locomotion.ts`, `characterRig.ts` |
| 5 Upright standing walk | partial | `SOFT_KNEE_STAND` 0.97 -> 0.997 (standing reach before the pelvis drops), `PELVIS_HOLD` 0.7 -> 0.06, `HEEL_RAISE` (heel up onto the toes late in stance, 0.45 / 0.55 / 1.0 rad walk / run / crouched; rig `TOE_BALL` 0.12 m; the pelvis need counts the heel lift), `LAND_AHEAD` 0.5 -> 0.45, even foot tracks moving (the 8 cm support-foot lead only standing), clips IDLE pelY -0.01 -> +0.004, CREEP -0.06 -> -0.006, WALK -0.045 -> -0.004, BRISK -0.05 -> -0.015, duty CREEP 0.7 -> 0.62, WALK 0.63 -> 0.58. Idle 11 deg (target <= 10), walk mid-stance 28 deg max (target <= 10): see below | `characterRig.ts`, `footPlanner.ts`, `clips/locomotion.ts`, `animGraph.ts` |
| 6 Bob spikes | partial | spikes gone with rows 1-2 (turn 20 -> 6.3 cm, zig-zag 13.3 -> 6.7 cm). The 0.03 m hard pelvis-drop cap was not applied: at walk and run the stride itself needs 4-6 cm, a cap would overstretch the legs and lift the planted feet off the floor (a clip) | `footPlanner.ts`, `characterRig.ts` |
| 7 Run cadence | done | new `MOVEMENT.stepLenMax` 0.95 m (guards: `ENEMY_MOTION.stepLenMax` 9, unchanged) | `config/movement.ts`, `motion.ts` |
| 8 Run posture | done | `POSTURE.runFrom` / `runTo` 2.0 / 4.2 -> 1.6 / 3.0; the ready-hands pump (elbows ~86 deg, `RH.pump` drive) eased in with the run lean (CT has no sprint button); `READY_HANDS.pumpPhase` 0.35 -> 0 (the pump keeps to the legs again) | `animGraph.ts` |
| 9 Stop pose | done | new `STOP_SPLIT` 0.3 m: a foot in the air at the stop sets down within it of the planted foot (with a small lift if it travels); holding the stop, `moveW` eases to 0 over ~0.15 s (knees straighten, upright). `stopTime` / `stopHoldTime` kept (G26 / G27). Both feet planted at the stop (a walk's double support) stay where they are (G26 freeze) | `footPlanner.ts`, `animGraph.ts` |
| 10 Turn rate | none (matches) | - | - |
| 11 Run reversal (remove PIVOT) | not done | feel 1, left for the anim clean-up | - |
| 12 Bank | done | new `BANK`: roll = min(0.55, 0.0012 x (speed x yaw rate)^2), from 2.5 to 3.0 m/s, 40 % pelvis / the rest spine. The audit's formula 0.35 x atan(a / g) gives 18 deg for its own 10 deg swept turn, so the quadratic keeps both measured ends (~10 deg at 12 m/s^2, the 31 deg cap in a run spin). Same on a remote copy (speed and yaw rate, no accel field) | `animGraph.ts` |
| 13 Start | partial | `intentLean` gain 0.1 -> 0.2; a start's trailing foot toes off at 0.82 of the reach (was 0.92). Run start: first stride 0.86 m (steady 0.86), first landing 0.40 s after the push (CT <= 0.25 s). Walk start first step 0.75 m (steady 0.61) | `animGraph.ts`, `footPlanner.ts` |
| 14 Standing speeds | done | `GEARS.stand[4]` 4.2 -> 4.5, `CT.turnSlowTo` 4.2 -> 4.5 | `config/movement.ts` |
| 15, 17, 19 | none (match) | - | - |
| 16 Crouch run | done | `KNEE_FLOOR_MOVING` 0.12 m moving crouched (eased hip lift, `KNEE_LIFT_TAU` 0.4 s; the kneel still reaches the floor), `CROUCH_RUN` pelY -0.38 -> -0.31, `POSTURE.crouchRunLean` 0.95 over the top crouched gear, crouched duty CROUCH_WALK 0.68 -> 0.58, SNEAK 0.74 -> 0.62, CROUCH_RUN 0.52 -> 0.46, CROUCH_WALK pelY -0.42 -> -0.39. Crouch run knee 0.17 m. Hands at knee height: not changed (anim-cleanup's crouched hands) | `characterRig.ts`, `clips/locomotion.ts`, `animGraph.ts` |
| 18 Drop landing | done (one part partial) | new `LAND_DEEP` (0.4 m dip at 0.1 s, back over ~0.6 s), weighted by the fall (`landing` 0.6 -> 0.85: ~0.6 m -> ~1.1 m), `LAND_ARMS` arms out 0.3 m for 0.3 s; crouched it adds a quarter (already deep). "If crouch held, end in crouch": the stance stays whatever the player holds, not forced. Remote copies now play landings too (derived from the snapshot fall, no wire change) | `clips/actions.ts`, `animGraph.ts`, `net/remoteAvatar.ts` |
| 20 Standing idle | partial | `BREATH.rate` 1.6 -> 2.1 (3.0 s). Idle feet stay ~0.2 m apart (CT 0.3-0.4): not changed | `animGraph.ts` |
| 21 Walk gait | partial | as row 5; arms already within CT (swing ~0.07 m, elbow ~15-17 deg) | - |
| 22 Brisk / jog | done | `JOG` duty 0.48 -> 0.45 (flight), liftH 0.12 -> 0.18, pelY -0.07 -> -0.045; lean and arms as row 8 | `clips/locomotion.ts` |
| 23 Run gait | done | `DASH` duty 0.42 -> 0.38, liftH 0.16 -> 0.3 (heel kick), pelY -0.13 -> -0.08; cadence row 7. Swing knee peak not measured | `clips/locomotion.ts` |
| 24 Crouched rest | partial | the kneel on the stop (row 3). Hand-to-floor idle gesture not done (the shoulder cannot reach the floor without a forward lean channel) | - |
| 25 Creep step length | not done | feel 1 | - |
| 26 Tense sneak near guards (G160) | done (prototype) | new: `player/tenseSneak.ts` (`setTenseSource`, `unawareGuardNear`, GameState registers the takedown victims: host guards or a client's puppets), `TENSE` (radius 5 m, a guess; <= 1.4 m/s; step 0.85 m; tau 0.1 s), `TENSE_SNEAK` clip (duty 0.5, lift 0.22, pelY -0.42, head up 0.3, knees wide 1.5), `POSTURE.tenseLean` 0.6, `TENSE_HANDS` (right hand out ahead of the hip for balance, left hand over the knife on Wren's left thigh, closing on the handle on a ~3 s cycle), gait clock on both driver and graph (`stepLength(..., tense)`), no kneel while tense; remote copies ask the same guards | `tenseSneak.ts`, `config/movement.ts`, `motion.ts`, `animGraph.ts`, `clips/locomotion.ts`, `playerController.ts`, `player.ts`, `characterRig.ts`, `game/gameState.ts`, `net/remoteAvatar.ts` |
| 27 Normal sneak | partial | knee off the floor (0.118 m). Wrist height >= 0.45 m: not changed (anim-cleanup's `xCrouch` / `zCrouch` untouched) | `characterRig.ts` |
| 28 Crouch walk | none (row 27) | - | - |
| 29 Crouched turn on the spot | done | row 1, plus `PLANNER.idleStepCrouch` 0.45 s (crouched idle steps; was 0.34) | `footPlanner.ts` |
| 30 Spin at run | done (row 12) | - | - |
| 31 Strafe re-render | not done | feel 1 | - |
| 32-36, 38 | none | - | - |
| 37 Bob per gait | done (rows 1, 2, 6) | - | - |

## Tests changed and why
- `tests/turnFollow.test.ts`: the CT contract replaces the world-locked one: planted twist <= `twistFree` (was <= 0.9,
  scrub < 0.8 rad), planted feet inside the lateral band, world-lock drag < 2 cm and the band's per-frame scrub <= 4 / 7 cm
  at 120 / 60 Hz (was "no slide < 2 cm": CT's feet pivot with the hips); the pelvis follow values use the new cap; the
  remote copy also checks the band. `tests/turnHarness.ts` records the band, drag and scrub and passes the crouch.
- `tests/footPlanner.test.ts`: the stop's set-down lands where the foot was, pulled to `STOP_SPLIT` of the planted foot.
- `tests/gaitEffort.test.ts`: after the heel roll no toe-up; the heel now rises in late stance (asserted 0.2-0.55 rad).
- `tests/motion.test.ts`: the run stop uses the top gear (4.5 m/s, slide <= 0.35 m: audit row 33, CT 0.25-0.35 m); the
  pinned guard tuning gains `stepLenMax` 9 (guards unchanged).
- `tests/speedGears.test.ts`, `tests/analogGear.test.ts` (top threshold 3.78 / 3.42 -> 3.975 / 3.525), `tests/animAudit.test.ts`
  (pelvis jump limit 9 -> 9.5 cm): the 4.5 m/s gear.
- `tests/readyHands.test.ts`: the jog's elbows 70-95 deg (CT 80-90; was 8-30).
- `scripts/e2e-move.mjs`: the gear table and the top speed window (4.2-5.0 m/s, was 3.9-4.7).
- New `tests/g1Locomotion.test.ts`: the step cap, the tense trigger and step, the bank, the hold straightening, the kneel
  start and side, the deep landing, and the real rig (idle / walk knee and bob, turn band, crouched knee clearance, stop
  split, kneel timing).
- `scripts/anim-sheet.mjs`: new `drop` and `tense` scenarios (`PlayerController.tenseForce` test hook).

Checks: `npx tsc --noEmit` clean, eslint clean on the changed files, `npm test` 1823 passed / 1 skipped (the one failure
it found, the anim-audit gear cap, is updated above). e2e not run (job lead). GPU contact sheets (2 rounds):
`docs/ct-prototype/shots/g1/` (walk side / front, jog, sprint, turn side / front, stop, crouchstop, crouch front,
crouchrun, drop side / front, tense side / front, sneak).

## What still differs from CT
- Walk: mid-stance knee up to ~28 deg (CT near straight) and ~5 cm of head travel (CT ~2-3 cm by eye). With these step
  lengths a straight leg at mid-stance and a steadier head pull against each other; the heel raise keeps the dip down.
  Michael's feel call: steadier (more knee) or straighter (more bob).
- Turns still add ~1.5 cm of bob over the straight walk (6.3 vs 4.9 cm).
- Crouched gaits: the knee clears the floor (0.12-0.17 m) but at the sneak and crouch walk the rear shin runs nearly flat
  just above it (CT: rear leg longer and straighter behind); crouched hands still low (anim-cleanup's).
- Run start: the first landing at 0.40 s (CT a full stride by 0.25 s).
- Tense sneak: start radius 5 m is a guess; the knife hand sits on Wren's left thigh (her sheath), CT's reached the chest.
- Idle feet ~0.2 m apart (CT 0.3-0.4); no crouched hand-to-floor gesture.
- anim-audit (report only) will read the CT foot scrub in turns as foot slide.

## What Michael should try on /ct/
1. Walk a zig-zag and a 90 / 180 turn at every speed, standing and crouched: the feet should stay under the hips and turn
   with the body, no splay, no bob spikes.
2. Walk straight at speeds 1-3: upright, near-straight legs, heels rising at push-off.
3. Run at speed 5 (now 4.5 m/s): quicker steps, the lean and arm pump from speed 4, a flight phase, and a hard bank in
   fast turns.
4. Stop from a jog and from a run: a small split, standing up straight at once; then crouched stops: she kneels on the
   stop on the back knee, forearm on the front thigh.
5. Crouch from standing still: straight down into the kneel.
6. Crouch run and sneak: knees off the floor.
7. Drop off a ledge of a metre or more: a deep landing with the arms out.
8. Sneak crouched at speed 1-2 within 5 m of an unaware guard: the tense sneak (long high-kneed steps, head up, a hand over
   the knife); stop there and she holds it instead of kneeling.
