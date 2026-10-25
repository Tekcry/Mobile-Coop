# anim-natural N1 - REPORT-D: jog 180 first swing frames

2026-10-22 ~19:00, written by the job lead from the implementer's hand-back. Fix in the planner; no limit or metric
changed. Base 9a8bcb54.

## Cause
The clock swing's progress `s = (sinceStrike - i.duty) / (1 - i.duty)` read the live duty (footPlanner.ts ~717). In a
turn the graph raises the duty toward TURN_DUTY 0.52 (animGraph.ts:2023, :2212); as the turn ends it falls back to the
jog's 0.44, so a swing that lifted at the end of the turn jumped forward 0.09-0.1 a frame (about twice the clock's
rate); the swing is short there (cycle 0.4 s, ~0.19 s over 0.6-1.1 m), so by the third frame the foot reached 4.9-5.3
m/s. Not the turn step or the ball pivot (every fast frame was a clock swing: swBase 0, not early, not a turn step).
Headless repro at an e2e-like timing (0.4 s still, 1.0 s of jog, then the 180): 5.26 m/s vs 5.29 in-game, the same
metric (planner foot x / z, the first 3 swing frames after a plant, x 60). The harness rows (PRE 1.8 s) never reached
the failing phase, which is why footTurn.test passed.

## Fix (footPlanner.ts updateMoving ~753-765, fields ~379-380)
With the turn rules on, a swing whose window opened while the body turned (`turnT < BAND_TURN_TIME`) stores the duty at
that frame (`swDutyL` / `swDutyR`, -1 otherwise); its progress uses `d0 = max(live duty, duty at lift)`: a falling duty
no longer pushes the swing forward, a rising one reads live as before. turnRule 0 / turn rules off: bit-identical.

## Numbers (60 Hz, first swing frames m/s, before -> after)
| Row | Harness (PRE 1.8) | e2e-like window (0.97-1.10 s travel), max | Every phase (0.8-2.0 s): max, phases > 5 of 67 |
| --- | --- | --- | --- |
| jog 90 | 3.69 -> 3.69 | 7.80 -> 3.85 | 7.80, 11 -> 4.38, 0 |
| jog 180 | 3.85 -> 3.85 | 6.10 -> 3.58 | 6.10, 14 -> 5.62, 6 |
| run 90 | 3.68 -> 3.25 | 4.13 -> 4.13 | 6.14, 2 -> 4.83, 0 |
| run 180 | 3.74 -> 3.74 | 6.83 -> 4.97 | 8.05, 26 -> 5.82, 5 |
| jog 45 | 2.04 -> 1.96 | - | - |
| crouch jog 90 | 2.85 -> 2.65 | - | - |

At the e2e-like phase itself jog 180 5.26 -> 2.70. The rest of the turn feet block is unchanged in every harness row
(contact slide 0.0, twist at lift 14.3, plant while turning <= 0.22 s, cap 0). Four other harness rows move 0.1-0.9 cm
of gap, none failing (jog 90 L pelvis 7.8 -> 8.0 / body 8.5 -> 7.6; spin 4.2 pelvis 5.7 -> 5.5; run 90 body 7.7 -> 7.6;
jog sweep 3 at 120 Hz -29.1 -> -28.7, already open item 1).

## Tests
- Added to tests/footTurn.test.ts: "e2e-anim turn block timing": jog 90 / 180, run 90 / 180 over 9 phases (0.97-1.10 s
  of travel from a standstill): first swing frames <= 5 m/s, twist at lift <= 30 deg, plant while turning <= 0.25 s.
  Fails on the old planner (jog 90 5.30), passes now.
- Single files green: footTurn (13), footPlanner (11), turnFollow (48), tuneStep, animCrabMetrics, animSkeletonIdentity,
  animSkeletonGuardIdentity, animTuneBake, g1Locomotion, stepTwentyOneC, keyedWalk, keyedCrouch, animRig, rig, animAudit,
  animGear, animMoveRows, animSkeletonRows / Rig / Clip / Bake, animStudio, animTune, backDiagTravel, doorPeekParity,
  g7CloseQuarters, gaitEffort, guardTune, menuPoses, posture, posture-p1c, readyHands, wallStance, animJointsBase,
  animGoggle, operatorsRuntimeFigure, tuneHands, tuneJoints, tunerHands. tsc clean.
- Fixtures: no change (a first version applied to every swing moved partner:moves; hence the turn-only rule).

## Rejected (reverted)
Capping a lifting foot's speed (crossings in jog sweep 3, spin 4.2); rate-limiting the swing's bow round the planted
foot (body-frame crossings -23 to -45 cm); limiting the no-crossing push (jog 180 crossed -20 cm); easing the swing path
in turns (held spins crossed -60 cm); progress from the lift's duty when the duty rises too (spin 4.2 -21 cm, the pivot
slider test failed).

## Open
1. The in-game phase is not reproduced exactly (harness jog 90 at that timing read 5.30 vs e2e's 4.08): e2e-anim needed.
2. Outside the e2e-like window: jog 180 6 / 67 phases (max 5.62: `uncross` moves a foot lifting from the turn's narrow
   stance 8-9 cm in a frame, plus one early toe-off), run 180 5 phases (max 5.82). Pre-existing (were 14 / 26); every
   mitigation made the feet cross: needs a no-crossing rule fix first (polish list unless e2e hits it).
3. Pre-existing: run 180 after 1.0 s of travel crosses -11 cm in the body frame (was -11.5); e2e's gap check (>= 5 cm)
   could hit it if the in-game phase lands there.
4. Jog 90 at one e2e-like phase: body-frame gap 5.5 cm (was 7.6), still >= 5, thin margin.
