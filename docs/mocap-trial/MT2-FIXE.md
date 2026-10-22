# MT2 fix E - e2e-anim "turn feet: jog 90" with mocap ON (NOT FIXED: diagnosis + repro)

Base: feature/mocap-trial-2 b597053c (mocap ON by default). Failure (desktop GPU e2e-anim): jog 90 contact slide 2.7 cm
(heel 1.2, ball 2.7) in 4 plants (< 1), twist at lift 30.9 deg (<= 30).

## Result
No src change on the branch (footPlanner.ts is byte-identical to b597053c; OFF dump unchanged by construction). Added a
headless repro: `turnFeet()` in tests/helpers/mocapPlayer.ts (CT jog / run 90 / 180 direction change through `ctRun`,
e2e-anim's measures: metrics.ts `contactSlide` on the rendered heel / ball of planner-planted feet, and the planted foot's
twist from `pin.yaw` at lift) and two gated cases in tests/mocapPlayer.test.ts (`MOCAP_FIXE=1` twist rows,
`MOCAP_FIXE_SLIDE=1` slide rows; both fail on the base, skipped by default).

## Cause
1. Slide: a clip-planted foot (`clipPlant`, clip feet on hand) has its ankle pinned while the clip's own pitch rolls the
   foot (heel strike to heel-off), so the rendered heel and ball move. It is not a turn effect: a straight CT jog at
   2.93 m/s reads heel 1.18 / ball 2.55 cm headless, the same numbers e2e-anim reports for jog 90 (1.2 / 2.7) - its
   1.2 s window after the turn holds straight clip plants. The e2e "foot locking" rows do not see it: they run armed
   (mocap share 0, no clip feet; all plants "read at the contact"). The turn adds the twist-cap scrub about the ankle
   (N1 anchor / ball pivot / cap anchor skipped for clip-planted feet): headless jog 90 ball 6-10 cm.
2. Twist at lift 30.9 deg: the same skip leaves a clip-planted foot to `twistCap`'s backstop (max(twistFree x lock,
   kTwist x TURN_CAP)) instead of `pivotFeet`, so it lifts at the cap. OFF lifts at 14.3 deg.

## What was tried (all ON-only gates on `f.clipPlant && i.clipFeet`)
| Variant | Headless turn rows (jog/run 90/180, 8 offsets x 2 sides) | Repo tests |
| --- | --- | --- |
| Base b597053c | slide 1.9-11.1 cm, lift 30.9 deg | all pass |
| A: anchorFeet for clip plants (contact held) | slide <= 2.2 cm (3 rows), lift 30.9 | mocapSwitch walk 1.4 ankle slide 6.2 cm, walk 90 turns 5.5 cm; mocapPlayer 2 / 3 (walk flick slide 4-6.6 cm) |
| B: A + pivotFeet + cap anchor for clip plants | slide <= 0.38 cm, lift 14.3 deg (meets e2e) | same as A + mocapPlayer flick 90 at 2 m/s slide 7.4 cm, pelvis 3.2 cm; crouchShift slide 2.02 cm (< 2) |
| C: B only while turning (turnT < BAND_TURN_TIME) or once anchored | slide up to 9.3 cm, lift 14.3 deg | mocapPlayer 3 (walk flick), mocapSwitch starts / stops jerk 12.9 vs <= 9.5, crouchShift 2.02 cm |

Why A / B regress: holding the contact makes the ankle travel with the clip's pitch roll (6 cm in a walk stance), which
mocapSwitch's straight gait slide reads at the ankle (the N1-merge decision: clip plants measured at the ankle); and the
planner's heel raise (pivotFeet / twistCap set `pitch` / `heelP`) fights clipFoot's per-frame clip pitch, which slides
walk-flick plants for real.

## Decision needed (lead)
The two measures disagree on clip plants: e2e-anim turn feet holds the rendered heel / ball (< 1 cm), mocapSwitch /
the N1 merge holds the ankle (< 1 cm), and the clip's pitch roll cannot satisfy both. Options: (a) clip plants hold the
contact (variant B) with clipFoot's pitch and the planner's heel raise reconciled (the walk-flick regressions) and the
mocapSwitch straight measure moved to the contact as e2e-anim reads it; (b) flatten the clip's stance pitch on a pinned
foot (look change); (c) turn feet rows run with mocap off / count clip plants at the ankle (an e2e change - not done).

## Numbers
- Base ON headless: straight jog 2.93 m/s heel 1.18 / ball 2.55 cm; jog 90 slide 3.96-10.0 cm, lift 30.0-30.9 deg; OFF
  jog 90 slide 0.00-0.37 cm, lift 14.3 deg.
- Tests on the committed branch (no src change): mocapPlayer 7 passed / 3 skipped; tsc, eslint clean. mocapSwitch
  allocation number unchanged (no src change).

## Changelog line (lead)
- mocap-trial-2 fix E: headless repro of e2e-anim's turn feet rows with mocap on (tests/helpers/mocapPlayer `turnFeet`,
  gated cases in mocapPlayer.test.ts); cause found (clip-planted feet pin the ankle while the clip's pitch rolls, and skip
  N1's pivot), fix pending a measure decision.
