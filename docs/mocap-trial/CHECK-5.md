# mocap-trial-2 - check 5 (fresh checker, Opus, on feature/mocap-trial-2 ebe98def)

2026-10-23. Verdict: **PASS**. CHECK-4 required 1 is fixed (fix D, src/anim/footPlanner.ts:913-916): the CT start after a 0.3 s
or 0.5 s stand passes at 1.4 / 2.8 / 4.0 / 5.0 m/s, every go phase. No new regression: zzplayer flags only A8 and the
CHECK-4 note; switch OFF byte-identical. No required items.

## Checks
- tests/mocapPlayer.test.ts: 7 passed, 1 skipped (item 5, A8).
- zzA (zzplayer group A, stand 0.5 s, 1.4 / 2.8 / 4.0 / 5.0 x 5 go phases, c5out/zzA05.txt): 20 / 20 no flags. Worst ON:
  bone 23.9 (2.8 go 1.60 hip-knee), pel 3.22 cm at 5.0 (OFF 11.82), slide <= 0.03 cm.
- zzplayer full (188 plans, c5out/zzplayer.txt): 8 flagged = CHECK-4's 10 minus its required 1 (2.8 x 0.3 go 1.73 now
  20.1 deg; 4.0 x 0.3 go 1.99 now 22.0 deg / 2.01 cm). 6 G run / sprint toggles (A8), 2 E crouch 2.76 vs 2.71 (note).
  Row diff vs c4out: worse only 1.4 x 2 s go 1.86 / 1.99 ankle-toe 14.6 -> 17.2 deg and 2.8 x 2 s go 1.73 pel 1.05 -> 1.18
  cm (under the lines); 5.0 x 0.3 all 5 go phases ON pel 3.10-3.22 (OFF 11.82-12.99), bone 23.7.
- repro2 zzstarts (450 starts): ON worst 19.9 deg (2.0 x 0.5 hip-knee), 0 over 24 in all 15 rows. repro2 zzstops: ON worst
  20.3 deg (2.2 m/s) vs OFF 33.7-38.0.
- Repo tests, one file at a time: mocapSwitch 13/13, mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn
  4/4, mocapCrouch 6/6, mocapCrouchShift 2/2, mocapSprint 10/10, mocapQuickStop 7/7, mocapPlayer 7 + 1 skipped (A8),
  footPlanner 12/12, animSkeletonIdentity / GuardIdentity 1 + 1 skipped each. tsc --noEmit clean (zz copies excluded);
  eslint src/anim/footPlanner.ts exit 0.
- Switch OFF: repro dump 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea (identical).
- Code read, footPlanner.ts:916: `fresh` for a clipIdle-marked step in the air (swBase < 0) only with `i.clipFeet`; the
  bit is cleared on contact or a clock swing (footPlanner.ts:1407) and on a stop (623), so it cannot go stale.

## Notes
- repro2's zzstops has no ankle-toe column (CHECK-4 used c3out's); zzplayer covers ankle-toe (worst ON stop / start 17.2).
- GPU suites, e2e, zzalloc2 and zztrace not run.

## Ran (scratch/mt2/check5 = git archive ebe98def; outputs scratch/mt2/c5out, script c5out/run.sh)
- mocapPlayer; zzA (zzplayer copy, STANDS env, GROUP=A STANDS=0.5); zzplayer (all groups); repro2 zzstarts / zzstops; the
  repro dump; the 12 repo files; tsc; eslint footPlanner.ts. Row diff c4out/zzplayer.txt vs c5out/zzplayer.txt.
