# anim-natural N2 - step 3 (arms) report

2026-10-22 ~19:30, written by the job lead from the implementer's hand-back. Branch feature/anim-natural-n2-s3 from
4028d386 (pre-rebake; merged into N2 after the check).

## Built
- `src/anim/bodyMotion.ts`: table `KEY_MOTION` (rows walk, jog, run, sneak, crouchWalk, crouchRun; fields
  `{ armGain, armSpeed }`, bake-friendly literals, `KEY_MOTION_ROWS` / `KEY_MOTION_FIELDS`); `ARM_SPEED_MAX = 100` = cap
  off; `scaleKeyedArms(arm, mean, g)` returns at g === 1; output `BodyMotion.armSpeed` (KEY_MOTION armSpeed blended by the
  layer's pace shares / the gate; Infinity with the gate closed).
- Defaults (armGain / armSpeed m/s): walk 1.3 / 6, jog 1.0 / 6, run 1.0 / 18, sneak / crouchWalk / crouchRun 1.0 / 6.
  Deviations from PLAN: jog gain 1.0 not 1.6 (Michael's Body base #103 already sets jog armSwingMul 1.7: the jog reads
  34.3 cm, 36.8 with the trunk layer, the ~35 target; 1.6 on top would give ~58); run cap 18 not 6 (at 6 the cap engages
  on 34 of 180 run frames and the hand trails his retimed back-to-front swing by up to 18.5 cm; at 18 the 4 m/s run is
  untouched, the 5 m/s sprint moves 1.9 cm on 3 frames).
- `src/anim/animGraph.ts` (`speedSet` / `crouchSet`, not N3's hunks): each gait clip's arm points scaled about the clip
  mean after `sampleKeyed` (private `armGain(clip)`); the drawn set clears these arms, so drawn arms are never touched.
- `src/player/characterRig.ts` (inside `keyedArm`): preallocated per-rig `armCapP` / `armCapO` / `armCapTick`, method
  `armCap()`: caps where the arm will pose the elbow and wrist in the chest frame (capping the targets alone left the
  posed wrist at 7.3 m/s through the IK); elbow and wrist by the same share; under the cap the keyed points pass through
  exactly; no allocation. Step / tick set in N2's own `motionTrunk` line in `applyTargets`; the keyedArm call site (N3's
  range) untouched. `scripts/e2e-anim.mjs` unchanged (no wrist-speed asserts; elbow-wing limits checked below).

## Numbers (headless 60 Hz; wrist forward range cm root frame; peak m/s root (chest))
| Row | Before (4028d386) | After |
| --- | --- | --- |
| walk 1.4 | 25.0, 0.94 | 31.1, 1.17 |
| walk arms only (no trunk layer) | 23.0 | 29.1 |
| jog 3.0 | 36.8, 7.21 (6.89) | 36.8, 6.80 (6.02) |
| run 4.0 | 75.6, 17.57 (17.29) | unchanged |
| sprint 5.0 | 75.6, 20.2 (19.86) | 75.6, 18.92 (18.56) |
| crouch walk / crouch run / sneak | 18.2, 0.8 / 23.6, 1.49 / 7.2 | unchanged |
| turn 180 jog | 14.24 (14.76) | 6.90 (7.28) |
| strafe start | 9.79 (9.42) | 6.81 (6.28) |
| curve jog | 7.23 | 6.81 |
| turn 90 walk | 1.8 | 2.26 |
| turn 90 / 180 run | 17.57 / 16.05 | unchanged |

- Turn / strafe land at 6.8-6.9 (PLAN target < 6): about the straight jog's own 6.8 (trunk vs root and the jog keys).
- Run turns peak at the run keys' own 16-17.6 (the straight run reads the same). The run's chest-frame 17.3 peak is the
  back-to-front swing at the clip's half wrap: the right wrist jumps 22 cm in one clip frame (run clip frames 16 -> 17),
  likely a key pop like A1's trunk; left as Michael's key shape (KEY_MOTION.run.armSpeed would soften it).
- Low ready rows (PASS2 item 7): bit-identical (walk / jog / run 0.6 / 1.8 / 6.5 cm, 0.13 / 1.6 / 3.32 m/s; the low
  ready 180 too); A13's head unchanged (1.08 / 2.45 / 3.79 deg).
- Crouch run (PASS2 item 9): not reproduced: play uses the keyed crouch_run clip (23.6 cm, 1.5 m/s), not the jog's arms;
  the audit's 21.8 only coincided with the jog's 21.5. Own row added (crouchRun armGain 1.0).
- AUDIT fix 35: not reproduced after A1 + A13: low ready run pelvis 25.8 deg p2p (~+-13), max step 3.1 deg / frame, as
  the holstered run (layer off 20.0 / 2.6). The audit's +-25 / 20 deg snaps were A1's run key pop.
- Elbow wing (crabFacing, all pass): walk 7.38 -> 7.37 (e2e 8.3), jog 7.30 -> 7.32 (8.0), low ready 4.89 / 5.69 same.
- Crouch pop (headless CROUCH_POP emulation): walking 1.70 -> 1.72 cm / frame, jogging 8.06 -> 7.27.

## Identity
Carrier-rig hash harness on the original code (git archive mirror), 15 scenarios: KEY_MOTION at identity = bit-identical
on all 15; with the change walk, jog, run, sprint and the turn / strafe rows move; idle, crouch and every low ready row
stay bit-identical. Wren identity fixture: passes unchanged (no free-hand keyed gait on a player rig there: studio clips
go through the drive, partner:moves is armed): 0 rows move. Guard and layer-off fixtures unchanged
(`withBodyMotionOff` now also sets KEY_MOTION to identity).

## Tests
- tests/helpers/bodyMotionMeasure.ts: wrist metrics `wristFwdCm`, `wristPeak`, `wristPeakChest`, `pelvisStep`; scenarios
  lowReadyJog, lowReadyRun, sprint; `measureTurns` (the player's MotionDriver drives the turn / strafe rows); switches
  `withKeyMotionOff`, `withTrunkMotionOff`.
- tests/bodyMotion.test.ts: KEY_MOTION literals; armSpeed blend (continuous across band edges, each row's value, gate
  easing, Infinity closed); measured arms (every number above, AUDIT 35, drawn / crouch / still rows equal with KEY_MOTION
  off); walk wrist range at 120 / 240 Hz.
- Single files green: bodyMotion 12 / 12 (alloc check flaky once, solo 3 / 3: CHECK-3 should-fix 1), keyedWalk,
  runKeyContinuity, animAudit, both identity tests, crabFacing, animJointsBase, animMoveRows, animRig, animStudio,
  animTune, posture, posture-p1c, readyHands, tuneHands, tuneJoints, keyedCrouch, keyedDrawn, animGuard,
  keyedExactPreview, marlowT1a, g1Locomotion; tsc and eslint clean. No e2e / check / build.

## Open
- No e2e-anim arm asserts added. The studio's keyed loops do not show the arm gain (the drive bypasses the speed set).
- Step 5's sliders bake into `KEY_MOTION.<row>.armGain` / `.armSpeed`.

## For Michael
Walk arms swing wider (wrist range 23 -> ~30 cm); turns and the strafe start no longer whip the hands (jog 180 turn 14
-> 7 m/s); his jog and run arm keys kept as tuned. His call: the run's back-to-front arm snap at the half wrap (22 cm in
one clip frame) looks like a key pop to retime.

## Run arm pop fix (2026-10-22 ~19:50, after the step 3 check)
The step 3 table above is the step's own measure; these rows supersede its run and sprint lines.
- Cause: Michael's 2026-10-22 tune (dbd466c7) moved the run keys from phases 0 / 6 / 12 / 18 (of 48) to 0 / 1 / 3 / 13;
  the arm values stayed as keyed for the old spacing, so each arm left its back extreme (flex -7, elbow 66) for flex 5,
  elbow 92 in 1/48 of a cycle (and the front reversal 53 -> 42 likewise): wrist 23.5 cm and elbow 9.2 cm in one clip
  frame (left at frames 0 -> 1, the mirrored right at 16 -> 17). Not an interpolation overshoot.
- Fix (`scripts/anim-keys/keys/run.json`, arms only; trunk, legs, half, duty, liftH untouched), old -> new:
  key 1 armL flex 5 -> -5, elbow 92 -> 68, inward 16 -> 3, twist 37 -> -2 (a one-frame palm flick between 0 and -7);
  key 2 armL flex 23 -> 3, elbow 80 -> 74, inward 16 -> 7; key 3 armL flex 42 -> 34; key 1 armR flex 42 -> 51.5; key 2
  armR flex 23 -> 44. Extremes (key 0), range (flex -7..53, abd 19) and armR key 3 unchanged; the hand passes mid-swing
  ~3/48 later than in the tune and eases out of both extremes. Rebaked headless (Blender -b, under the desktop lock,
  19:49-19:50): only the arm / fore lines of `src/anim/clips/keyed/run.ts` moved.
- Before -> after: max step per clip frame wrist 23.5 -> 6.5 cm, elbow 9.2 -> 3.4 cm; run 4 m/s wrist peak root 17.57 ->
  5.53 m/s (chest 17.29 -> 4.75); sprint 5 m/s 18.92 -> 6.66 (chest 18.56 -> 5.70); wrist fore-aft range root 75.6 ->
  75.0 cm, clip chest 25.4 -> 24.7; elbow bend 61.4..93.4 -> 61.6..93.5 deg; elbow wing 9.6 -> 9.4 cm. Trunk, pelvis,
  shoulders, knees identical.
- Pinned: tests/runKeyContinuity.test.ts "the arms swing without a pop" (no elbow / wrist step over 8 cm per clip frame).
- Identity: both Wren fixtures and the guard fixture pass unchanged (studio clips go through the drive; partner:moves is
  armed), so no re-capture.
- KEY_MOTION.run.armSpeed 18 no longer engages at 4 or 5 m/s (kept: a safety net for Michael's later key edits).
- Open (polish): the right forearm twist at the front reversal rolls -161 -> -109.5 over 3/48 (hand only; Michael's).

## CHECK-4 should-fixes (2026-10-22 ~19:45, 15921223)
1. `armCap(si, cont)` reads its targets from `armCapO`: per-frame new_space 3588.16 -> 3380.16 B (the no-cap baseline
   3396.16), poses bit-identical on the checker's 20-scenario hash harness.
2. No arm speed cap while the studio drive plays (`AnimGraph.bodyMotion`): keyed:run / hold_knife / hold_choke loops
   equal the cap-off rig at 0.0 cm (were 7.74 / 27.49 / 1.95 cm); test "the studio loop player is never capped".
3. (CHECK-3 should-fix 1) bodyMotion's allocation test on #128's `allocPerCall` helper: 0.00 B per call (limit 8 B), 7
   runs.

## For Michael (added)
The run arms no longer snap back-to-front at each foot strike: they ease out of each extreme (his range and elbow bend
kept; the mid-swing comes about 3/48 of a cycle later than his tune).

## #138 fix round (2026-10-22 ~22:00): train 8's two failures, both N1's planner (fail at 08023227 alone)
- e2e-anim run 90 "feet never cross" (-17.4 cm): N1's no-crossing push (`uncross`) measured only in the pelvis frame
  with a hard 25 cm fore-aft window; in a run turn the swinging foot hovers at the window edge, the push flickers on and
  off every other frame (20-23 cm sideways jumps) and e2e-anim (body frame) catches the unpushed frames. N2 never reaches
  the planner (every layer / key / trunk switch reads the same). Fix (`uncross` / `uncrossIn`): with the turn rules on,
  the same push in the body frame too (yaw via a field, no boxing); turnRule 0 bit-identical. e2e turn plans, 219 runs
  each, least gap before -> after: jog 90 3.2 -> 8.0, jog 180 5.7 -> 8.0, run 90 -15.6 -> 8.0, run 180 5.9 -> 8.0, jog
  sweep 3 -30.6 -> 8.0, crouch 90 1.9 -> 8.0 cm; first swing, plant time and twist at lift unchanged.
- e2e-clip crouched holstered (-3.2 cm): the crouch-entry re-step out of the narrow standing stance; with the left foot
  first the right wrist goes into the loaded right thigh (-2.83 headless). N1's tie rule picked the foot by arrival.
  Fix (`updateIdle`): with the turn rules on, crouching down re-steps the right foot first; standing up keeps the
  planted-longer rule. Headless: squat -2.83 -> -2.4, sequence -2.83 -> -2.62, 8 arrival facings -2.42 to -2.56 cm.
- Tests: tests/turnCrossRig.test.ts (fails before at -15.6), tests/crouchEntryRig.test.ts (fails before at -2.84),
  footPlanner's tie test split (crouching down: right first; standing up: planted longer). Fixtures: partner:moves only.
- Open: crouch 90's first swing reads 10.73 m/s headless at the e2e timing (limit 5; N1 CHECK-3 risk a), likely next to
  fail in e2e-anim (it never ran: run 90 threw first): the stance clamp beats the no-crossing rule at landing; needs
  the landing rules reworked. Clip margin in-game expected ~-2.9 (master -2.7).

## #138 fix round 2 (2026-10-22 ~22:45): e2e-anim run 180 planted contact 14 cm
- Cause (not the body-frame push: with it off the slide is the same): the keyed run clip's pelvis sits ~19 cm higher and
  ~10 cm further forward than the jog's; a run 180 brakes at ~22 m/s^2 across most of the run / jog band (3.2-3.8 m/s)
  in one frame, so the keyed pelvis offset fell 14 cm (y) / 7 cm (z) in a frame; the planted knee needed +44 deg at once,
  its joint rate limit (25 rad/s) held it and dragged the planted ankle 13 cm, then 4 cm. Hidden in train 8 (run 90 threw
  first). run 90 at 0.98 of the pace showed the same (2.63 cm).
- Fix (`src/player/characterRig.ts`): `KEY_PEL_RATE` 1.2 m/s, the keyed pelvis height / forward offsets change at most
  that fast (a clip's own bob is ~0.6 m/s, so it bites only on a band crossing); untouched below the rate (guards bit-
  identical). Headless: run 180 16.45 -> 0.01 cm, run 90 x0.98 2.63 -> 0.01; every turn plan least gap 8.0 cm; first
  swing unchanged. tests/turnCrossRig.test.ts pins the rendered contact slide (< 1 cm) and adds a crouch 90 row.
- e2e-studio "Arm swing greyed": master 4.58.1-4.58.2's tuner-panel refresh fixes (the merge below), not changed here.
- Watch on the GPU run: crouched holstered (the crouch depth rides the same pelvis channel), crouch 90's first swing
  (10.73 m/s headless, known).
