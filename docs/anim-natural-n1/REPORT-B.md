# anim-natural N1 - implementer B (build) report

2026-10-22 ~12:40, written by the job lead from implementer B's hand-back. Not yet run: full vitest / check, e2e,
GPU sheets, the checker.

## Built (steps of the brief to B)
1. One `aimClock(f, i, side, toLand)` for the clock swing, the reach / turnLeft toe-off and the turn step (cause 5);
   under the turn rules an early swing re-aims at the time to its clock strike, so the takeover keeps its target. The
   landing yaw uses `LAND_TURN` (clamped to faceGoal) instead of `twistFree`. The swing yaw reaches its target by 0.7
   of the swing, rate-limited to `SWING_YAW_RATE` 12 rad/s (no 16-27 deg one-frame yaw jumps when the target moves).
2. The turn step (`turnOver` / `turnStep`, a `pick` pre-pass in `updateMoving`): |yawRate| > kRate and predicted twist at
   lift minus the pivot budget left > kTwist; the larger overrun, tie: the inside foot; lands on its clock strike, at
   most `maxAir` 0.45 s up, at least `minPlant` 0.06 s down; never two feet up at a walk; at jog / run not while the other
   swing foot is passing (swingNear; without it the no-crossing pass jittered up to 17 m/s). With pivot max 1.2 the pivot
   carries most turns; turn steps fire when its budget runs out (or the pivot slider is 0).
3. The ball pivot (`pivotFeet`): the heel rises at HEEL_RISE to kHeel; the yaw follows the body down to twistFree at up
   to 12 rad/s (eased in with the heel), at most kPivot per plant, about the ball. Anchor state `ballX`, `ballZ`,
   `pivot`, `heelP`, `ancP`, `ancYaw`; `shift()` and the drag move it. New pure `src/anim/footGeom.ts` (HEEL_BACK,
   HEEL_DOWN, TOE_BALL, `ankleToBall(p)`, `heelLift`), imported by `characterRig.ts`. The ankle cap is a counted backstop
   at `TURN_CAP` 1.35 x kTwist (about the ball once anchored): 0 in every row but aim spot 180 (11 deg).
4. No band scrub under the turn rules, crouched included (`band()` only with turnRule 0); SPIN_SCRUB replaced by turn
   steps and the pivot; per-gait thresholds; the aimed spot turn (stride 'velocity' under 0.3 m/s) reads the idle row
   (`stepSelect` gets `moving && !spot`); `PlannerInput.turnRule` / `RigPose.turnRule` (default 1). Rule steps (crossed /
   band / turned) aim at the predicted root and yaw (crouched spins landed a foot 100 deg off the body); the pelvis-frame
   gap check runs after the band clamp (landings crossed then jumped 10 cm at touchdown); the swingTo bow fades in (was a
   5-14 cm jump). Cause 10 was mid-swing (L at s 0.57, R planted, 24.8 cm fore / aft): now gap +7.4 cm.
   NOT done: inside foot first from a standstill (the gait clock always lifts R first; a phase flip against the keyed
   legs). Stand turn L gap 8.6 cm, no crossing.
5. Sliders in `tuneStep.ts`: turnTwist 10, turnRate 11, pivot 12, pivotHeel 13, landTurn 14 (STEP_N 10 -> 15), identity 1;
   bake rules per gait (`TURN_STEP.twist[i]`, `.rate[i]`, `TURN_PIVOT.max[i]`, `.heel[i]`, `LAND_TURN[i]`, STEP_GAITS
   order); idle landTurn manual (no effect); the lock rule also covers step.idle; BAKE.md "Stepping"; a bake coverage
   sample; `tests/tuneStep.test.ts`'s unhooked-identity transform keeps imports as file URLs (bit-identical).
6. Harness limits in `tests/footTurn.test.ts`; an e2e-anim "turn feet" block (asserts: contact slide < 1.5 cm, twist at
   lift <= 30 deg, gap >= 2 cm; report-only: plant while turning <= 0.12 s, snap <= 2x straight); `contactSlide` /
   `footSlide` in `src/anim/audit/metrics.ts` with unit tests.
7. Cause 6 behind `HOLD_CONTACT` true: under the turn rules every planted foot keeps its contact (the heel in a
   heel-first roll, the ball while the heel rises or lowers); the ankle moves by design (~6.6 cm at a 0.6 rad heel raise,
   ~12 cm crouched).

## Constants (footPlanner.ts)
`TURN_STEP` { rate [1.5 x6], twist [0.35, 0.4 x5], minPlant 0.06, maxAir 0.45 }; `TURN_PIVOT` { from 0.12, heel
[0.35 x6], rate 12, max [1.2 x6] } (REPORT-A's ~0.7 hit the cap at 31 deg in walk / standstill turns); `LAND_TURN`
[0.45 x6] (0.6 pushed twist / wind higher); `TURN_CAP` 1.35, `SPOT_SPEED` 0.3, `SWING_YAW_BY` 0.7, `SWING_YAW_RATE` 12,
`HOLD_CONTACT` true. Arrays in STEP_GAITS order (idle = the aimed spot turn).

## Harness (60 Hz; "contact" = decision 1's contact slide; master = turnRule 0, reproduces REPORT-A digit for digit)
Master's contact column: jog 45 / 90 / 180 7.1 / 9.5 / 12.6, run 3.8 / 7.4 / 10.3, sweeps 4.2-8.3, walk 9.2-13.0, crouch
14.7-14.8, stand turn 12.4, aim spot 7.9 / 9.5, start jog 6.5, stop run 2.6, straight jog 5.3 cm.

N1:
```
scenario         yaw   twist @lift wind(p) plantTurn plantYaw ankle render flat contact cap band snap snapYaw gap  gapB steps rule
jog 45            45   14.3  14.3  14.6    0.13      40       7.5   0.0    6.1  0.0     0   0.0  2.04 36      8.1  8.0  3     3
jog 90            90   14.3  14.3  14.6    0.15      60       9.5   0.0    6.4  0.0     0   0.0  3.69 297     8.0  7.8  4     3
jog 180           180  25.6  14.3  27.1    0.20      82       11.2  0.8    9.1  0.0     0   0.0  3.86 688     8.0  7.5  4     1
run 45            45   14.3  1.7   8.7     0.13      16       4.8   0.0    4.8  0.0     0   0.0  2.43 31      7.4  8.0  4     3
run 90            90   15.3  14.3  14.7    0.20      59       6.6   0.0    5.3  0.0     0   0.0  3.68 52      7.2  7.7  4     3
run 180           180  14.3  14.3  23.7    0.20      82       9.0   0.0    5.9  0.0     0   0.0  3.74 576     8.4  7.9  5     2
jog sweep 1.2     102  10.1  8.0   16.6    0.25      16       4.2   0.0    4.2  0.0     0   0.0  1.94 51      7.4  7.4  4     4
jog sweep 3       255  18.8  14.3  24.8    0.25      40       5.2   0.0    5.1  0.0     0   0.0  1.94 130     7.0  7.5  4     4
jog sweep 7       593  18.7  14.3  26.8    0.25      92       9.7   0.0    6.0  0.0     0   0.0  4.08 549     7.5  7.9  6     6
run sweep 3       255  14.3  14.3  21.0    0.18      29       2.2   0.0    2.2  0.0     0   0.0  2.48 131     6.8  7.4  5     4
run sweep 7       550  18.1  14.3  25.9    0.22      76       7.7   0.0    4.5  0.0     0   0.0  3.95 684     7.2  8.5  6     5
walk(a) 90        90   21.0  14.3  26.5    0.17      52       9.2   0.8    9.2  0.0     0   0.0  1.95 338     9.5  9.3  4     0
walk 90           90   17.8  14.3  15.6    0.15      60       9.4   0.8    9.2  0.0     0   0.0  2.51 220     8.0  7.4  4     2
walk 180          180  24.3  14.3  26.6    0.22      90       12.0  0.8    9.2  0.0     0   0.0  4.17 688     7.9  7.0  5     2
crouch(a) 90      90   21.0  14.3  25.7    0.17      52       14.8  0.8    14.8 0.0     0   0.0  1.92 338     10.0 9.8  4     0
crouch 180        180  24.9  14.3  25.7    0.20      82       14.8  0.8    14.8 0.0     0   0.0  1.89 688     8.0  8.2  4     1
crouch jog 90     90   17.8  14.3  17.2    0.15      60       14.7  0.8    14.7 0.0     0   0.0  2.98 305     8.0  7.2  4     0
stand turn 180    180  26.0  26.0  27.5    0.22      90       11.4  0.8    8.6  0.0     0   0.0  1.49 688     8.0  7.9  3     2
stand turn L      -180 26.0  26.0  22.6    0.27      90       11.4  0.8    9.1  0.0     0   0.0  0.94 688     8.6  7.4  3     2
jog 90 L          -90  14.3  14.3  24.0    0.15      60       9.5   0.0    6.4  0.0     0   0.0  4.89 297     7.8  8.5  4     3
aim spot 90       90   21.2  21.2  21.2    0.35      89       13.4  0.0    3.5  0.0     0   0.0  0.30 86      18.0 18.0 2     1
aim spot 180      180  27.1  27.1  27.1    0.33      97       14.8  0.8    5.6  0.0     11  0.0  0.87 321     8.0  8.0  4     2
start jog         0    0.0   0.0   7.6     0.00      0        6.5   0.0    6.5  0.0     0   0.0  2.62 0       9.4  9.3  3     2
stop jog          0    0.0   0.0   2.8     0.00      0        0.3   0.0    0.3  0.0     0   0.0  0.00 0       9.4  9.4  2     0
stop run          0    0.0   0.0   3.0     0.00      0        2.6   0.1    2.6  0.0     0   0.0  2.00 0       9.2  9.2  3     1
straight jog      0    0.0   0.0   7.6     0.00      0        6.2   0.0    6.2  0.0     0   0.0  1.41 0       9.2  9.2  3     4
aim strafe        0    0.0   0.0   1.2     0.00      0        0.0   0.0    0.0  0.0     0   0.0  4.60 0       9.0  9.0  13    0
```
The "ankle" and "flat" columns now read the ankle rolling round the held contact (by design); "render" is the audit's
heel / ball min.

Reached: contact slide 0.0 everywhere (master 3.8-14.8); twist at lift max 26 deg (<= 30); gap min 6.8 cm (the sweep 1.2
crossing gone); cap 0 but aim spot 180 (11); band scrub 0; drag 0; snapYaw <= 300 at jog / run 45 / 90.
Not reached: plantTurn <= 0.12 s at jog / run (0.13-0.25: the landing foot supports while the turn decelerates; it pivots,
no wind; asserted no worse than master, <= 0.25); snapYaw <= 300 on 180s, sweeps, walk / crouch 90 (305-688, capped by
SWING_YAW_RATE; asserted <= 700); snap <= 2x straight (jog 90 3.69, jog 90 L 4.89, walk 180 4.17 vs 1.41: long turn
swings; asserted <= 5 m/s). wind(p) max rises in some rows (walk(a) 90 16.5 -> 26.5): landings lead into the turn by
LAND_TURN (lead, not wind-up).

## Metrics changed (old -> new definition; limits unchanged) - for the PR body (decision 1)
- e2e-anim foot locking (walk, jog, sneak, crouch run): a plant the planner anchors reads the contact point (the ball's
  spot); was the ankle's travel. Aim strafe / aim back (not anchored) still read the ankle. Limit 1 cm.
- e2e-anim crabRow slide: the same per-plant rule via `M.footSlide` (was `plantedSlide` on the ankle); wall rows (no
  heel / ball recorded) fall back to the ankle.
- anim-audit.mjs footSlide: the same rule; new `L/R.held` column, footGeom points along the SOLE axes.
- Unit tests (behaviour of the old scrub; the checker reviews these):
  - `tests/turnFollow.test.ts`: planted twist bound twistFree 0.25 -> TURN_CAP x max twist (0.54 rad), plus band scrub
    = 0; crouched planted lateral CROUCH_BAND.max + 0.05 -> + 0.09 (measured 0.178: no crouched scrub, the foot steps
    back in); the remote-parity twist bound the same way.
  - `tests/tuneStep.test.ts` "feet stuck while running", crouched: `worstBehind > thr - 0.03` -> `<= thr` (the crouched
    trailing foot is no longer stuck at the stretch limit).

## Guards and fixtures
turnRule 0: both identity fixtures bit for bit. Rules on, re-captured: Wren 2 of 39 (`state:aimRifle`,
`partner:moves`; the new `keyed:skeleton_test` capture dropped to keep the key set); guards 24 of 64 (every kind's walk,
dash, aimWalk). Guards on turnRule 1 (GPU rows not measured); opt-out: `rp.turnRule = 0` in `enemy.ts`.

## Tests run by B
Single files only (full suite for the job lead under the lock): footPlanner, footTurn (9), tuneStep, turnFollow,
g1Locomotion, stepTwentyOneC, animCrabMetrics, animAudit, animTuneBake, tuneBakedReset, tuneV2Sections, both skeleton
identity, keyedWalk, keyedCrouch, animStudio / 2, animRig, rig, readyHands, posture, posture-p1c, animMoveRows,
g7CloseQuarters, doorPeekParity, backDiagTravel, wallStance, gaitEffort, animGear, animGoggle, animJointsBase,
animSkeletonBake / Clip / Rows, animTune, menuPoses, operatorsRuntimeFigure, tuneHands, tuneJoints, tunerHands,
visionIsolation: all pass. Lint 0 errors; tsc clean.

## Open
- Inside foot first from a standstill (phase flip).
- plantTurn / snapYaw / snap targets not reached (above).
- `TURN_STEP` in footPlanner.ts clashes with `motion.ts` `TURN_STEP` (turnFollow.test imports it aliased): rename.
- The unit-test bounds above need the checker's review.
- GPU sheets to look at: jog / run 90 / 180, sweeps, crouch 90, standstill and aimed spot turns: the heel rising and
  turning on the ball, landings leading (LAND_TURN 0.45), the swing foot lagging early (yaw rate cap), the ankle under
  a raised heel (crouched ~12 cm, with IK and knee pole), double flight in jog / run turn steps.
