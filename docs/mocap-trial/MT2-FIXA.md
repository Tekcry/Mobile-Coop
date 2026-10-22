# mocap-trial-2 - fix A: CHECK-3 required 1 and 2

2026-10-23, implementer (Opus), branch feature/mt2-fixA off feature/mocap-trial-2 c43dbeac.

## Result
Done. CHECK-3 required 1 (pace changes through CT's spring, with and without a turn) and required 2 (CT starts after a
stand) pass the rules on the CT-driven plans. Switch OFF byte-identical: the dump repro is 31,065,812 B, md5
9ce3f3d1c70c299dca072d3a4f15f9ea (as c43dbeac / f4b5b7c1). Every repo mocap test passes one file at a time.

## Test: tests/mocapPlayer.test.ts (new, ~4 s; 7 s with the skipped items)
- `tests/helpers/mocapPlayer.ts`: CHECK-3's zzplayer driver (`ctRun`: CT springs, quickStop 0.12 / 0.35, the stop
  hold's holdSpeed, the eased crouch, toggles), its measures (`measurePlayer`: pelvis step beyond pace x dt, bone step,
  ankle-toe step, planted slide) and the rules (`playerFails`: bone / ankle-toe <= OFF + 2 or <= 24 deg, slide < 2 cm,
  pelvis <= max(2 cm, OFF)). Each plan runs OFF and ON.
- Item 1: 5.0 turning 3 rad/s <-> 1.4; 1.4 <-> 5.0 and 1.0 <-> 4.0 every 1.1 s; controls 2.8 <-> 5.0 and the 0.55 s ladder.
- Item 2: start / stop 1.4 x 0.3 s stand (go 2.12), 2.8 x 0.3 (go 1.60 / 1.86 / 2.12), 4.0 x 2 s (go 2.12); control 1.4
  x 2 s.
- Items 3-6: `it.skip` (other rounds own them; `MOCAP_PLAYER_ALL=1` runs them, `MOCAP_PLAYER_LOG=<file>` appends rows).
- Items 1 and 2 fail on c43dbeac (the numbers below), pass here.
- 1.4 x 0.3 s stand, go 1.99 (pelvis 2.05 cm, OFF 1.54) is in item 6's skipped list, not item 2's. CHECK-3 counted it
  outside item 2. The trace: the stop hold ends as the stick moves again. The graph's `locoSpeed` drops from holdSpeed
  0.80 to the pace 0.03 in a frame (animGraph.ts ~1011), and the hips move 2.1 cm forward (OFF 1.1 back) before the
  planner moves.

## Cause and change
1. **Required 1** (src/anim/animGraph.ts `clipFeet`): the clip feet came on while the gait duty was still easing from
   the walk's (0.5 x dPh a frame) under a run pose. The clip then pinned a planted foot for a walk-length stance at run
   pace. Now `CF.on` stays false while the eased duty is more than `MOCAP_DUTY_GAP` 0.15 from the clip's. The planner
   keeps the steps, as in a turn hand-off; a clip swing in the air finishes under the clip.
   - 0.05 / 0.1 also fixed the pelvis, but left the accelerating 3 rad/s turn to the planner under the run pose: an
     anchored landing slid 7.7-7.9 cm.
   - Backstop (footPlanner.ts `clipFoot`): a clip-pinned foot whose reach need (`reachNeedL/R`) passes `CLIP_PIN_NEED`
     0.1 m toes off like pop3's `CLIP_TAKE_BEHIND`. On its own (gap off) it took the turn case 13.85 -> 4.18 cm only.
     0.03-0.06 toed off a steady walk's own late stance (mocapSwitch walk 1.5 track / knees, the start / stop jerk).
2. **Required 2** (footPlanner.ts, all gated on `i.clipFeet`):
   - The leftover idle step was in the air before the move (the trace: lifted 4 frames before the planner moves). It was
     sped up by `clipIdle` and went 0.88 -> 1.00 in a frame without landing. The clock's swing window then took it over
     with `swBase` 1.00 and it rode with the root (the ankle 40 cm in a frame).
     - Now, in the stance window's in-air branch, it lands as its new progress reaches 0.9.
     - A planner swing at >= 0.9 when the swing window opens lands where it is, instead of a takeover from 0.9-1.0.
   - At 2.8 m/s the stand is shorter than `START_STILL` for the planner (the stop spring), so `moveT` runs on and pop3's
     `clipIdle` never marked the idle step. The clock took it over at 0.59 at idle pace: 47 cm in a frame, and the clip
     pinned the other foot behind (slide 5.6-6.6 cm).
     - `clipIdle` now also marks on the first moving frame after a still one (`firstMove`), not only when the start
       window restarts.
   - The checker's "mark clipIdle only for a swing in the air before the move" was not needed. In the traces the marked
     step was always lifted before the planner moved.
   - The 4.0 x 2 s case (slide 3.14 cm): the same pinned-at-walk-duty cause as required 1. The duty gap fixes it.

## Numbers (ON before -> after; OFF; pelvis / bone / toe in cm / deg, slide cm)
| Plan | before | after | OFF |
| --- | --- | --- | --- |
| 5.0 turning 3 <-> 1.4 | pel 13.85, slide 1.75 | pel 1.13, slide 0.00 | 2.36, 1.59 |
| 1.4 <-> 5.0 / 1.1 s | pel 7.84, slide 2.38 | 2.04, 0.00 | 2.30, 0.01 |
| 1.0 <-> 4.0 / 1.1 s | pel 4.11, slide 4.53 | 1.02, 0.03 | 2.54, 0.01 |
| 2.8 <-> 5.0, ladder 0.55 s | 1.06 / 1.03 | 1.06 / 1.03 | 3.15 / 3.09 |
| 1.4 x 0.3, go 2.12 | pel 6.66, knee-ankle 41.4 | pel 1.75, bone 17.2 | 1.55, 17.2 |
| 2.8 x 0.3, go 1.60 / 1.86 / 2.12 | pel 6.67-7.59, bone 34.1-48.2, slide 5.62-6.55 | pel 3.19-3.93, bone 20.5-23.3, slide 0.01 | 4.67-5.39, 30.1-30.6, 0.01 |
| 4.0 x 2 s, go 2.12 | slide 3.14 | slide 0.00, pel 3.29 | 0.01, 4.94 |
| 1.4 x 2 s (control) | pel 2.62 | 2.62 | 3.72 |

Items 3-6 after this change, against CHECK-3's numbers:
- 3: same. Walk / jog flicks pelvis 2.79-2.96 cm; 2.0 x 90 / 180 ankle-toe 25.2 / 31.7 / 36.1.
- 4: same. Spot 180 flick slide 2.06, spin 6 slide 2.56.
- 5 (offset 0 only): mostly the same.
  - Same: walk 1.4 (2.35 cm / 30.8), jog 2.8 (12.38 / 47.2), run 4.0 (14.53 / 60.8 / slide 5.41), sneak 0.8 (3.69).
  - Sprint 5.0: pelvis better (8.83 -> 2.38), elbow-wrist 61.9 same.
- 6: mostly the same; three numbers better.
  - Same: (a) crouch at 2.8, knee-ankle 25.4; (b) 5.0 x 180, slide 2.09; (c) sneak flicks, slide 2.06 / ankle-toe 28.3;
    (d) 5.0 stop, elbow-wrist 30.2.
  - Better: (d) pelvis 7.14 -> 4.27 (OFF 11.82); (e) draw at 4.0, knee-ankle 24.2 -> 21.7 (now passes).
  - The 1.4 x 0.3 go 1.99 hold release (above): 2.05, same.

## Checks
- Repo mocap tests, one file at a time, all pass: mocapPlayer 2 + 4 skipped, mocapSwitch 13/13 (the allocation assert
  included), mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn 4/4, mocapCrouch 6/6, mocapCrouchShift
  2/2, mocapSprint 10/10, mocapQuickStop 7/7, footPlanner 12/12, animSkeletonIdentity / animSkeletonGuardIdentity 1 + 1
  skipped each.
- `tsc --noEmit -p .` clean, eslint clean on the four files. OFF dump identical (above). zz copies deleted.
- Not run: zzsweep2 / zzstops / zzstarts, e2e, GPU.

## Files
src/anim/animGraph.ts (`MOCAP_DUTY_GAP`, `clipFeet`), src/anim/footPlanner.ts (`firstMove`, `CLIP_PIN_NEED`, the
in-air landing at 0.9, the >= 0.9 takeover landing), tests/helpers/mocapPlayer.ts, tests/mocapPlayer.test.ts.

## Open
- Items 3-6 (other rounds), plus the 1.4 x 0.3 go 1.99 hold release (2.05 cm, animGraph `locoSpeed` at the hold's
  end).
- Margins: 1.4 <-> 5.0 pelvis 2.04 (rule max(2, OFF 2.30)).

## Changelog (for the lead)
- Mocap locomotion: speeding up or slowing down through the walk / run bands, also while turning, no longer pins a
  foot for a walk-length stance (the pelvis dropped up to 46 cm). A CT start after a short stand no longer skims a foot
  along unplanted.
