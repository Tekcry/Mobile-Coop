# mocap-trial-2 - fix D: CHECK-4 required 1

2026-10-23, implementer (Opus), branch feature/mt2-fixD off feature/mocap-trial-2 5d40ae25.

## Result
Done. A CT start after a 0.3 s stand passes the rules at every go phase (1.60 / 1.73 / 1.86 / 1.99 / 2.12) at 1.4, 2.8
and 4.0 m/s, fix A's `firstMove` clipIdle mark kept. Switch OFF byte-identical (below).

## Cause and change (src/anim/footPlanner.ts, gated on `i.clipFeet`)
- Fix A's `firstMove` mark speeds up a start's leftover idle step (`clipIdle`). Still in the air at 0.66-0.74 when its
  swing window opened, the clock took it over (`takeover`: `swBase` = its progress, its target moved to the clock's
  landing a run stride on). The foot jumped 37-49 cm in a frame, then crawled the last 0.26 of the swing over the whole
  window while the body ran on (4.0 m/s: the pelvis 48 cm down).
- Now, clip feet on, a clipIdle-marked step in the air as its swing window opens counts as `fresh`: the clock's swing
  starts afresh from where the foot is (`beginSwing`: from its spot and height, progress 0, the full window to cover
  the stride). It is never retargeted mid-swing. (>= 0.9 it still lands where it is, fix A.)
- Tried first: (a) let it finish on its own target, the clip's lifts waiting: 2.8 passed, 4.0 failed worse (go 1.6
  slide 15.6 cm, go 1.86 bone 108.7 deg: the foot set down behind a body at run pace). (b) fix 21-2's takeover fade on
  this path (the offset fades over the swing left): 2.8 passed, 4.0 go 1.99 pelvis 14.25 cm (the swing still crawls
  0.26 over the window).

## Numbers (ON before 5d40ae25 -> after; OFF; pelvis cm / bone deg)
| Plan | before | after | OFF |
| --- | --- | --- | --- |
| 4.0 x 0.3 go 1.99 | 8.96 / 47.4 knee-ankle (fail) | 2.01 / 22.0 | 4.94 / 36.0 |
| 2.8 x 0.3 go 1.73 | 1.63 / 35.8 knee-ankle (fail) | 1.63 / 20.1 | 4.82 / 30.8 |
| 2.8 x 0.3 go 1.60 / 1.86 / 2.12 (item 2) | pass | pass, unchanged | |
| 4.0 x 0.3 go 1.60 / 1.73 / 1.86 / 2.12 | 2.28-2.31 / 22.0-24.4 | unchanged | |
| 1.4 x 0.3, all 5 | pass | unchanged | |

## Test: tests/mocapPlayer.test.ts item 2
All 5 go phases at 1.4 / 2.8 / 4.0 m/s after a 0.3 s stand (15 plans) plus the 4.0 x 2 s and 1.4 x 2 s controls. On
5d40ae25 it fails on exactly 2.8 go 1.73 and 4.0 go 1.99; here 7 passed, 1 skipped (item 5, A8).

## Checks
- One file at a time: mocapPlayer 7 passed / 1 skipped; mocapSwitch 13/13 (allocation included); mocapFix2 11/11,
  mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn 4/4, mocapCrouch 6/6, mocapCrouchShift 2/2, mocapSprint 10/10,
  mocapQuickStop 7/7, footPlanner 12/12, animSkeletonIdentity / GuardIdentity 1 passed + 1 skipped each.
- Switch OFF: the repro dump (scratch/mt-check/repro/dump.test.ts) is 31,065,812 B, md5
  9ce3f3d1c70c299dca072d3a4f15f9ea, byte-identical.
- `npx tsc --noEmit -p .` clean; eslint on both files exit 0.
- Not run: zzplayer (the full 188 plans), zzstops / zzstarts, zztrace.

## Files
- src/anim/footPlanner.ts (`fresh` in the clock's swing window, one line + comment)
- tests/mocapPlayer.test.ts (item 2)

## Changelog (for the lead)
- Mocap: a run start after a short stand no longer pops the first step's foot forward (knee 47 deg, hips 48 cm down at
  4 m/s): the start's leftover idle step restarts the clock's swing from where it is instead of being retargeted mid-air.
