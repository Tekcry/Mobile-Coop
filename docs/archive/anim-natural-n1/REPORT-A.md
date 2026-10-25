# anim-natural N1 - implementer A (diagnosis) report

2026-10-22 ~11:00, written by the job lead from implementer A's hand-back (no game code changed).

## Harness
- `tests/footTurnHarness.ts`: pure, Babylon-free, 60 Hz sim time, fed as `CharacterRig.animateFrame` feeds the local
  player: MotionDriver (CT free movement, real turn rates and pace spring) -> AnimGraph -> FootPlanner -> pelvisFollow.
  Copies the rig's inputs (smoothed yaw rate tau 0.05, driver phase and state, `quickStop = CT.stopBlend`, `reach`,
  follow cap by `keyHol`). Heel and toe as the rig poses them (ankle at the planner spot, foot turned by planner yaw +
  pitch about the ankle), measured as `audit.mjs` does (slide = min of heel / toe travel per plant; wind = foot vs
  pelvis). Exports `runFootTurn`, `FOOT_TURN_SCENARIOS` (25), `footTurnTable`.
- `tests/footTurn.test.ts`: loose sanity checks for now; prints the table.
  Run: `npx vitest run tests/footTurn.test.ts --silent=false`.

## Measured on master 4.49.1
Columns: twist = planted foot vs body (deg); @lift = twist the frame before lift; wind(p) = vs pelvis; plantTurn =
longest plant while turning > 1 rad/s (s); plantYaw = body yaw over one plant (deg); ankle / render / flat = slide (cm:
ankle, audit heel-toe with / without foot pitch); cap = twistCap rotation of planted feet (deg); band = band scrub (cm);
snap = ankle speed (m/s) and yaw rate (deg/s) in the first 3 swing frames; gap / gapB = min feet gap (cm, pelvis / body
frame); rule = lifts outside the clock's swing.

```
scenario        v    yaw90 twist @lift wind  plantTurn plantYaw ankle render flat cap  band snap snapYaw gap  gapB steps rule
jog 45          3.0  0.10  14.3  14.3  14.6  0.13      40       0.0   5.0    3.6  31   0    2.08 18      8.7  9.2  3     3
jog 90          3.0  0.20  14.3  14.3  14.6  0.15      60       0.0   7.5    5.8  50   0    3.62 158     8.4  9.0  4     3
jog 180         3.0  0.37  14.3  14.3  18.7  0.20      82       0.0   8.2    6.7  110  0    5.28 478     8.1  7.0  4     2
run 45          4.0  0.12  11.7  4.4   10.5  0.13      16       0.0   2.3    0.0  0    0    1.98 4       7.1  8.0  4     3
run 90          4.0  0.22  14.3  14.3  14.9  0.20      59       0.0   5.4    4.0  34   0    3.75 27      7.4  7.6  4     3
run 180         4.0  0.38  14.3  14.3  19.3  0.20      82       0.0   8.6    6.7  92   0    4.96 306     7.1  7.2  5     2
jog sweep 1.2   3.0  -     10.1  8.0   16.6  0.23      15       1.1   2.4    1.1  0    4.8  1.52 9       -8.7 -8.9 4     5
jog sweep 3     3.0  -     14.3  14.3  20.6  0.25      40       5.3   4.2    3.7  48   14.9 1.54 17      8.2  9.2  4     4
jog sweep 7     3.0  -     14.3  14.3  21.8  0.25      95       12.6  6.5    8.2  301  52.5 3.08 261     7.2  7.8  6     6
run sweep 3     4.0  -     14.3  14.3  19.4  0.18      29       4.7   4.9    4.7  6    16.7 1.98 17      8.7  9.5  5     4
run sweep 7     4.0  -     14.3  14.3  21.1  0.20      72       6.9   6.3    7.4  225  29.2 3.25 54      7.2  8.8  6     5
walk(a) 90      1.45 0.20  14.3  14.3  16.5  0.17      52       0.0   6.6    4.9  44   0    3.11 179     8.3  6.0  4     0
walk 90         2.1  0.20  14.3  14.3  14.2  0.17      67       0.0   8.4    6.5  58   0    3.00 153     4.2  5.1  4     2
walk 180        2.1  0.37  14.3  14.3  22.4  0.22      90       0.0   8.7    7.0  121  0    5.39 559     7.9  6.9  5     2
crouch(a) 90    1.45 0.20  14.3  14.3  15.6  0.17      52       6.5   5.9    3.8  44   6.8  2.06 179     8.3  8.3  4     0
crouch 180      1.45 0.37  14.3  14.3  15.7  0.20      82       5.0   8.2    6.6  103  5.2  2.63 456     9.1  8.6  4     0
crouch jog 90   2.15 0.20  14.3  14.3  11.3  0.15      60       1.2   6.4    4.5  50   4.6  2.87 163     8.0  8.1  4     1
stand turn 180  0    0.37  14.3  14.3  16.1  0.28      90       0.0   10.9   8.7  134  0    1.44 428     9.3  8.3  3     1
aim spot 90     0    0.28  51.6  51.6  51.6  0.35      89       0.0   4.4    4.4  38   0    0.17 62      13.9 13.9 2     1
aim spot 180    0    0.50  51.6  51.6  51.6  0.33      97       0.0   5.3    5.3  77   0    0.57 245     10.1 10.1 3     1
start jog       0    -     0     0     7.6   0         0        0.0   3.0    0.0  0    0    2.72 0       9.7  9.3  3     2
stop jog        3.0  -     0     0     2.8   0         0        0.0   0.3    0.0  0    0    0.00 0       9.4  9.2  2     0
stop run        4.0  -     0     0     3.0   0         0        0.0   1.7    0.0  0    0    1.98 0       -    -    2     0
straight jog    3.0  -     0     0     7.6   0         0        0.0   2.8    0.0  0    0    1.56 0       9.1  9.2  3     4
aim strafe      1.4  -     0     0     1.2   0         0        0.0   0.0    0.0  0    0    4.60 0       9.0  9.0  13    0
```
The drag is 0 cm everywhere. "(a)" rows use the audit's stick values (0.5 standing, 0.6 crouched = 1.45 m/s).

Against the N0 audit: the turn timing (0.20 / 0.37 s vs 0.18 / 0.37), slides (jog / run 90 / 180, walk, crouch, curve,
stop run) and the 12-19 deg wind match. The run 90 wind (audit 25, harness 15) and the run pelvis range (audit 50,
harness 22) do not: the rig slerps the hips onto the keyed pelvis by keyW (`characterRig.ts` keyedTrunk ~2544-2550), and
IK / bank are not modelled. That extra run pelvis lag is rig-side, not the planner.

## Causes (footPlanner.ts unless named)
Only the clock (`:469`), the reach / turnLeft toe-off (`:772`), the band step (`:738`) and idle steps (`:698`) ever call
`beginSwing`; the turn rules at `:721` / `:730` never fire.
1. twistCap scrubs the planted foot round about the ankle (`:370-385`, `twistFree` 0.25 rad at `:159` / `:378`, while
   `turnT < BAND_TURN_TIME` `:228`): 31-134 deg of floor rotation per turn; about the ankle the heel (6.75 cm behind)
   and toe (11.6 cm ahead) move: the 3.6-8.7 cm slide. The wind-up is the 14.3 deg cap.
2. No turn-step trigger: `holdOrStep`'s `turned` test (`:711`, `:720`, turnStep 0.9) cannot fire in free movement (the
   cap keeps the foot within 0.25 rad), so a foot stays down its whole clock stance (0.15-0.28 s, the body turning 52-90 deg).
3. The gait clock is rigid: `gaitRate` max(linear, angular) (`motion.ts:157-160`, `animGraph.ts:1988-1993`), strict
   alternation (`:440-445`); a rule step landing before the clock's strike re-lifts at once (comment at `:709`).
4. The landing-yaw prediction is capped to `twistFree` (`:525-528`): a fresh foot is ~33 deg behind by mid-stance at
   7.85 rad/s; the swing makes up 90-180 deg in the air (`swingTo` `:1033-1039`): snapYaw 150-560 deg/s.
5. The reach toe-off aims at `root + vel*stepDur` with `i.yaw` (`:769-774`); at the clock takeover (`:476-483`) the
   target jumps: first-frame ankle speed 3-5.4 m/s in turns vs 1.56 straight.
6. The heel raise pivots about the ankle, not the ball (HEEL_RAISE `:599-611`; the rig's `heelLift`
   `characterRig.ts:206-214` only raises the ankle): the ball moves back ~6 cm at 0.6 rad; 2.8 cm render slide in a
   straight jog, 1.7 cm in a run stop. e2e-anim's foot lock measures the ankle (`scripts/e2e-anim.mjs:337-345`): blind.
7. Crouched band scrub (`:399` exempts only standing): crouched turns slide 5-6.5 cm; standing after SPIN_SCRUB 0.5 s
   (`:224`) the band scrubs 15-52 cm in a sweep.
8. Aim spot turn: stride 'velocity' uses twistMax 0.9 (`:378`): wind to 52 deg then scrub 38-77 deg; the idle yaw
   stepping never runs (the clock counts turning as moving, `animGraph.ts:1990`, TURN_GAIT_MIN).
9. The cap measures from the body yaw (`:373`), the audit's wind from the rendered pelvis (`characterRig.ts:1809`,
   PELVIS_FOLLOW_KEYED 0.35 `turnFollow.ts:23`, plus the keyed pelvis).
10. Possible crossing in a gentle curve: jog sweep 1.2 shows the feet 8.7-8.9 cm crossed (both frames) within 25 cm
    fore / aft; mid-swing or both planted not yet checked.

## Proposed rule (A's proposal; the job lead's decisions below)
A. Turn step in `holdOrStep` (free movement and the aimed spot turn): a planted foot lifts when |yawRate| >
`TURN_STEP.rate` (~1.5 rad/s, smoothed) and its pivot budget is used or its predicted twist at lift
(`twist - yawRate * remainingStance`) exceeds allowance + budget left; down at least `TURN_STEP.minPlant` (~0.06 s).
The foot with the larger predicted overrun, tie: the inside foot. Timing: an early start of its own clock swing that
lands exactly on its clock strike (stepDur = remaining stance + (1 - duty) * cycleTime; no offset at the takeover); if
that is over `TURN_STEP.maxAir` (~0.45 s) keep pivoting. Never two feet up at a walk. Spot and yaw: one `aimClock(f, i,
side, toLand)` shared by the clock, the turn step and the reach toe-off (fixes 5); the landing stance share `twistFree`
-> `LAND_TURN` (~0.6 rad), clamped to faceGoal; the swing yaw eases early (`smooth(min(1, s / 0.7))`).
B. Ball pivot replaces twistCap's ankle rotation while turning: past `TURN_PIVOT.from` (~0.12 rad) the heel rises toward
`TURN_PIVOT.heel` (~0.35 rad); the yaw follows the body down to the allowance, rate-limited (`TURN_PIVOT.rate` ~12
rad/s), bounded per plant (`TURN_PIVOT.max` ~0.7 rad), about the ball `B = ankle + b(p) * fwd`, `b(p) = TOE_BALL cos p -
HEEL_DOWN sin p`. State `ballX`, `ballZ`, `pivot`; `shift()` moves the anchor; TOE_BALL / HEEL_DOWN / HEEL_BACK move from
`characterRig.ts:200-204` into a pure module. The old cap stays as a counted backstop (should read ~0).
C. Crouch: no crouched band scrub (`:399`; the band only steps back in). Spins: turn steps replace SPIN_SCRUB. Walk and
crouch walk: same rule, per-gait thresholds. From a standstill: the inside-foot turn step first. Aim spot turn:
`TURN_STEP.twistAim` (~0.35 rad) + pivot, twistMax the backstop. Strafe unchanged. Guards (stride 'facing' walking
forward, `ai/enemy.ts:1770`, turns 300-540 deg/s) get it, with `PlannerInput.turnRule` (default 1) to opt out. Remotes
(`net/remoteAvatar.ts:501`, 20 Hz yaw rate): twist-based trigger, the rate only arms it; no wire change.

Sliders (`tuneStep.ts` SP / STEP_PARAMS, STEP_N 10 -> 15 with the decisions below), identity 1: `turnTwist` 0.4-2.5
(TURN_STEP.twist / lift), `turnRate` 0.5-3, `pivot` 0-2 (TURN_PIVOT.max; 0 = locked), `pivotHeel` 0-2, `landTurn` 0-2.
Bake: per-gait arrays (`TURN_STEP.twist[g]`, by `stepGaitNow`), one `tuneBakeTable.ts` rule per gait with index paths;
BAKE.md "Stepping", the bake coverage tests, `tests/tuneStep.test.ts`.

e2e-anim: a "turn feet" block on Proving, holstered: gear 4 / 5 at 90 / 180, a sweep, crouch 90, a standstill turn, an
aimed spot 90; heel / toe from the ankle matrix as the audit; limits slide < 1.5 cm (target 1), twist at lift <= 30,
plant while turning <= 0.12 s jog / run, snap <= 2x straight. The harness checks become limits (render slide < 1, @lift
<= 30, plantTurn <= 0.12, snapYaw <= 300, gap >= 2).

Risks: the ball pivot moves the ankle on a ~12 cm circle, so ankle-based slide metrics (CRAB slide `metrics.ts:376-417`,
turn states, e2e-anim foot lock `:315-355`) would read it as slide; the clock re-sync; the studio (`studioFeet`,
`shift()`); co-op remotes (e2e-netmove); guards share STEP and the planner (anim-audit guard rows); knee pole on landings
with toes up to 35 deg ahead (`kneePoleYaw`, KNEE_POLE_MAX 0.6).

## Job lead decisions (2026-10-22 ~11:05)
1. Contact-point slide: the new turn metrics measure the contact point (min of heel / ball travel, the audit's
   definition). The existing ankle foot-lock and CRAB slide checks stay as they are on straight gaits (no pivot there)
   and keep their limits; where the ball pivot moves the ankle in a turn state, that metric reads the contact point,
   marked `(anim-natural-n1)` with the old definition. Not a loosening: the contact point is what slides on the floor.
   (Orchestrator told.)
2. The straight-gait heel-raise ball slip (cause 6) is in N1, as the last step, only with the contact-point foot lock
   in place for those rows; if it moves an ankle metric it is listed in the PR.
3. The run pelvis lag (keyed trunk) is N2's (the body layer).
4. Guards: the rule on by default, `turnRule` available; implementer B runs the guard rows (anim-audit / the guard
   identity fixture) and opts them out only if they get worse.
5. The gentle-curve crossing: B checks it (mid-swing or planted) and fixes it if both feet are planted.
6. No remote harness mode first; B runs e2e-netmove.
7. Also a `turnMinPlant` slider is not added (5 sliders as proposed). Aim spot turn twist uses `turnTwist` on the idle row.
