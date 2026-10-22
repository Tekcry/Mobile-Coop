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
