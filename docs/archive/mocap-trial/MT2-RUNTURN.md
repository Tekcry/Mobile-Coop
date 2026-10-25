# mocap-trial-2 - fast jog / run turns (runturn)

2026-10-23 ~01:50, implementer (Opus), branch `feature/mt2-runturn` off 20515978. Switch OFF byte-identical.

## Result
Done. Jog 2.8 and run 4.0 m/s x turn 2.5 / 3 / 3.5 / 4 rad/s at four turn-start offsets (32 cases): switch ON is now
under OFF in every case on ankle-toe step and bone step, by 11-45 deg, and every ON bone step is under the bible's 25 deg
(worst 21.7). Run 4.0 x 4: ankle-toe 81.1 -> 13.6 deg (OFF 58), bone step 81.1 -> 13.8-21.7. Better than the pre-merge
numbers (CHECK-2 "Decide 4") in every case: jog 2.8 x 4 31.8 -> 18.9 (same plan), run 4.0 x 4 47.9 -> 13.8. Walk ON is
unchanged (byte-for-byte the same sweep output), and pelvis and slide numbers did not change.

## Cause
In a fast jog or run turn the clip feet hand the steps to the planner (`MOCAP_FEET` turnMax: jog ~2.5, run ~3.6 rad/s).
The gait clock keeps the clip's stance window (fix 2), so the planner's swings are long: run duty 0.156 gives ~0.55 s in
the air, which is 126 deg of a 4 rad/s turn. `swingTo` moves the foot along the world straight line (the chord) from its
lift spot to its landing spot. Seen from the turning body, this chord runs up to 26 cm inside the body's path, and the
lift spot swings round, so the outside foot passed up to 70 cm across the planted foot (run 4 x 4: left foot at +69 cm,
right foot planted at +1 cm).

N1's body-frame no-crossing pass (`uncross`, turnOn) then pushed it back 78 cm in one frame as `along` entered its
window (ankle-toe 81 deg). With N1 also yawing the swing foot to its landing yaw by 0.7 of the swing, a long swing
pointed 50 deg into the turn mid-air. The knee pole then swung that knee across the planted one, and the rig's knee-knock
bow threw it back 10 cm a frame. The hip / knee rate limit carried the foot along with the knee (ankle-toe 31-34 deg,
the jog cases).

The swing bow (fix 1's fade vs N1's) was not the cause: running it on through the other foot's landing, together with an
`uncross` share by swing height, moved the jog by 0 and the run by at most 4 deg.

## What changed (`src/anim/footPlanner.ts` only)
A planner swing lifted with clip feet on hand at a flight gait runs in the body's frame (`CLIP_SWING`):
1. `beginSwing` records the body yaw and root at the lift (`liftYaw`, `liftX`, `liftZ`). It also records the share
   `liftW`, which is 1 at a clip duty of 0.35 or less and 0 at 0.45 or more, eased between: jog 0.21 and run 0.16 get
   it, the walk's 0.56 does not. It is 0 without clip feet, so OFF never gets it. `setDown` clears it. The share is
   taken at the lift and kept to the landing: a stop mid-swing (clip feet gone, duty 0.21 -> 0.60 in a frame) does not
   drop it in a frame.
2. `swingTo`, lift end: the lift spot's offset from the lifting root is turned by the body's turn since the lift. The
   root's travel since the lift is taken along its chord (the mid-turn frame). This is faded in over the first 0.15 of
   the swing, so the foot leaves the ground at rest. Straight on, it is exactly the lift spot.
3. `swingTo`, landing end: the landing spot's offset from where the root lands (on the turn's arc, as in `clockRoot`)
   is turned back by the turn still to come, with the root's travel there straightened onto the facing. This fades out
   over progress 0.55-0.85, so the foot sets down at rest on its spot (a clock swing lands from 0.9). Straight on, it is
   exactly the landing spot.
4. `swingTo`, yaw (the N1 `turnOn && moving` branch): such a swing turns in the body's frame too. It runs from its yaw
   off the body at the lift to its landing yaw off the body's yaw at landing, still within `SWING_YAW_BY` and
   `SWING_YAW_RATE`.

OFF: `liftW` is 0, so the path is the old expression exactly. The dump repro (`dump.test.ts`, 14 scenarios) on this tree
and on 20515978 is byte-identical: 31,065,812 B each, md5 9ce3f3d1c70c299dca072d3a4f15f9ea (the same as FIX-1's merge
note). No allocation: scalars only.

Tried and dropped (measured, no gain once 2-4 were in, so not kept, to keep the diff small and out of shared code):
- an `uncross` window faded over a further nearAlong;
- an `uncross` both-airborne share by swing height;
- the swing bow running on through the other foot's landing.
Before 3-4 they took run 4 x 4 from 56.7 to 37-41 deg.

## Numbers
12 s each, turning right / left for 1.2 s in every 2.5 s from 2 s + offset (offsets 0 / 0.37 / 0.71 / 1.1 s). Ankle-toe
and bone step (deg, the worst frame, in the root's heading frame); ranges are over the four offsets.

| v m/s x yr rad/s | OFF ankle-toe / bone | ON before ankle-toe = bone | ON after ankle-toe / bone | pre-merge ON (offset 0) |
| --- | --- | --- | --- | --- |
| 2.8 x 2.5 | 30.2-30.7 / 30.3-30.7 | 31.3 / 31.8 / 33.7 / 36.7 | 10.8-13.6 / 18.9-19.0 | 26.0 / 24.2 |
| 2.8 x 3 | 34.6-38.3 / same | 45.5 / 40.6 / 44.1 / 42.1 | 15.0-16.1 / 17.5-19.0 | - |
| 2.8 x 3.5 | 46.6-47.5 / same | 42.4 / 46.6 / 48.9 / 45.3 | 11.1-18.7 / 18.0-19.1 | - |
| 2.8 x 4 | 48.4-48.9 / same | 44.8 / 51.0 / 53.8 / 50.8 | 11.1-21.2 / 18.9-21.2 | 32.6 / 31.8 |
| 4.0 x 2.5 / 3 / 3.5 | 37.2-59.0 / same | 13.6 (clip feet on) | 13.6 / 13.6 (unchanged) | 13.6 |
| 4.0 x 4 | 56.8-59.3 / same | 81.1 / 78.9 / 79.7 / 81.1 | 13.6 / 13.8-21.7 | 47.9 / 47.9 |

Pelvis beyond pace x dt (cm), unchanged by this round:
- jog: ON 0.89, OFF 0.69-0.73. ON is at recording frame 3 or 85 (not a turn); all under 2.
- run: ON 0.67, OFF 1.66-1.77.

Planted-foot slide (cm), unchanged by this round:
- e2e-anim measure (`plantSlide`): ON 0.00-0.01 in every case; OFF 0.01-2.83.
- ankle measure (`plantedSlide`): jog ON 3.6-4.1 vs OFF 6.5-7.1; run x 4 ON 2.1-2.5 vs OFF 5.2-6.0. These are N1's
  anchored heel / ball pivots, which hold by the e2e measure.

Other checks:
- Walk 1.0 / 1.4 / 2.0 m/s x 0 / 1.5 / 2.5 / 3 / 4 rad/s x three offsets: ON and OFF byte-identical to 20515978's
  sweep output.
- Also measured, ON before -> after (OFF):
  - run ramped turn end 4 rad/s: 81.1 -> 13.8 (62.1);
  - jog ramped turn end: 60.4 -> 20.1 (48.9);
  - pace 2.8 <-> 4 turning 4 rad/s: 81.6 -> 33.3, now an elbow-wrist frame (55.4);
  - jog / run steady, starts and stops: unchanged.

## Tests
- New `tests/mocapRunTurn.test.ts` (4 cases, ~8 s): jog 2.8 x 3 (offset 0), jog 2.8 x 4 (offset 0.71), run 4.0 x 4
  (offsets 0, 0.37), 10 s each. It asserts:
  - the turn hands the steps to the planner and back;
  - ON ankle-toe and ON bone step <= OFF + 2 deg (`POP_MARGIN`: the same turn's worst frame moves 1-2 deg with the
    start offset alone, OFF jog 30.2-30.7, run 56.8-59.3; ON sits 20-44 deg under OFF in these cases);
  - ON bone step < 25 deg (POP_DEG);
  - pelvis beyond pace x dt <= 2 cm;
  - planted slide (e2e measure) < 1 cm.

  It fails on 20515978 in all 4 cases (ON 81.1 / 78.9 vs OFF 57.8 / 56.8; jog bone 35.6 / 41.7 over 25) and passes here.
- Run alone, each file:
  - mocapRunTurn 4 / 4;
  - mocapFix2 6 / 6;
  - footPlanner 12 / 12;
  - animSkeletonIdentity and animSkeletonGuardIdentity pass (1 skipped each, as at the base);
  - mocapSwitch 12 / 13: only the known "no allocation per frame" fails, 2523.8 vs <= 2499.4 B (known at the base
    2525). Run alone (`-t "toggled every frame"`) it passes on both 20515978 and this branch, so this round does not
    make it worse.
- `npx tsc --noEmit -p .` clean; eslint clean on footPlanner.ts and the new test. The zz repro copies are deleted
  (not committed).

## Open, for the lead (not this round's area)
- Stop inside a fast turn: the swing foot's yaw snaps up to 58 deg in the stop frame, plus its pitch.
  - Measured: jog stop-in-turn ON 58.3 (before 50.9, OFF 66.4); run 64.8 (before 81.9, OFF 76.7).
  - Mechanism: in `swingTo`, the yaw leaves the rate-limited `turnOn && i.moving` branch for the plain lerp when
    `moving` ends. The pitch moves at the same time.
  - The jog's +7 vs before is that same snap with the leg placed slightly differently; this round moves no yaw or
    pitch at a stop.
  - This sits with the stop pitch agent (stop branch / swingTo).
- Jog / run starts ON 48.8 / 32-36 vs OFF 35.7 / 30-45 deg (ankle-toe at the first steps), unchanged by this round:
  the start agents' area.
- Pace change 1.4 <-> 4.0 m/s while turning: elbow-wrist 74.1 ON vs 64.9 OFF (arms; unchanged).
- Walk turns: the same body-frame swing, tried on the walk, took walk 1.0 x 4 from 36.9 to 17.2 deg (OFF 35.0), but
  made other walk turns worse (1.4 x 3 offset 0: 16.5 -> 23.6; walk 2.0 x 4 pelvis 1.73 -> 1.91 cm). So it is gated off
  at the walk's duty (`CLIP_SWING.full / none`) for the walk-turn agent to judge. It could cover walk 1.0 x 4, still
  ON > OFF at the base.
- What the remaining jog pops (18-21 deg) run through: the rig's knee-knock bow plus `limitJoint` on the hip and knee
  (a clamped knee carries the foot's world rotation with it; characterRig, not touched).

## Changelog (for the lead)
- Mocap trial: fast jog / run turns no longer pop with the switch on. The planner's steps in the clip's long swing
  window swing in the body's frame (lift spot, landing spot and foot yaw turn with the body) instead of crossing the
  planted foot; run 4 m/s x 4 rad/s ankle-toe 81 -> 14 deg (OFF 58), every jog / run turn under 25 deg. Switch off
  unchanged.
