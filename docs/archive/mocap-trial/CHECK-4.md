# mocap-trial-2 - check 4 (fresh checker, Opus, on feature/mocap-trial-2 d952d723)

2026-10-23. Verdict: **FIX**. CHECK-3 items 1, 3, 4 and 6 pass on every zzplayer plan; item 5 is inside A8; switch OFF is
byte-identical, allocation passes, every repo test, zzstops, zzstarts, tsc and eslint pass. But fix A's `firstMove`
clipIdle mark (the item 2 fix) breaks two other phases of the same CT start after a 0.3 s stand that passed on
da86e8e7, one with a 47 deg knee pop and the hips falling 48 cm: a player sees it on a common stop-start.

## Required
1. **CT start after a 0.3 s stand at 4.0 m/s and 2.8 m/s: the first planner step's ankle jumps 37-49 cm in a frame; at
   4.0 the pelvis then falls 48 cm in 0.2 s.** zzplayer group A (CT stop / start springs, quickStop 0.12, the hold):
   - `A v 4 stand 0.3 go 1.99`: knee-ankle 47.4 deg, pelvis 8.96 cm beyond pace (OFF 36.0 elbow / 4.94). Frames 175 /
     179. CHECK-3's tree da86e8e7: ON 22.0 / 3.99, a pass. Regression in this batch.
   - `A v 2.8 stand 0.3 go 1.73`: knee-ankle 35.8 deg (OFF 30.8, line 32.8). Frame 159. da86e8e7: 20.1, a pass.
     Regression. (mocapPlayer item 2 runs go 1.60 / 1.86 / 2.12 only; these two phases are not in it.)
   - Trace 4.0 (zztrace CASE=start40, c4out/tr40.txt; same case on da86e8e7: tr40-c3.txt): the start lifts L at t 3.30
     (first moving frame); it swings fast (0.12 a frame: the `firstMove` clipIdle speed-up, footPlanner.ts:1402, new in
     fix A). The duty gap (animGraph.ts:2520, fix A) holds the clip feet off until t 3.40; the planner swing is then at
     0.74. At t 3.417 the L ankle goes z 7.497 -> 7.987 (49 cm) in a frame, the swing then crawls 0.74 -> 0.87 over 12
     frames while its target is a run stride ahead; the rig's drop for the reaching leg climbs to its 0.40 cap
     (characterRig.ts:2489-2494): hips 82.5 -> 34.1 cm by t 3.60. On da86e8e7 the clip feet came on at 3.317 with L at
     0.05, it swung slowly and the hips stayed at 74-83 cm.
   - Trace 2.8 (CASE=start28b, tr28b.txt): L lifts at t 3.033 (first moving frame), swings 0.12 a frame, at t 3.150 at
     0.66 it goes z 4.480 -> 4.855 (37.5 cm) in a frame; then the pelvis drops 7 cm over 0.13 s.
   - Both: a fast (clipIdle) start step still at 0.66-0.74 when it is retargeted (the clock's swing window takeover,
     footPlanner.ts:940-972, or the clip feet coming on) jumps to the new target instead of fading to it. Fix A's
     land-where-it-is rule (footPlanner.ts:907) needs >= 0.9.
   - Bisect (c4out/zzA-nofm.txt): with the `firstMove` term removed from footPlanner.ts:1402, go 1.73 (20.1) and 4.0 go
     1.99 (22.0 / 2.01) pass again, but item 2's 2.8 go 1.60 / 1.86 / 2.12 fail again (35.7-48.2 deg, slide 5.3-6.4 cm).
     So the mark is right; the step it speeds up is what jumps.
   - Suggested fix (gated on `i.clipFeet`): a clipIdle-marked step (a short idle step) is never retargeted: it lands
     where it is when the clock's swing window opens, at any progress (or keep its own target and stepDur to its
     landing, the clip's lifts waiting as pop3 already does). Check that fix 21-2's takeover fade (offX / offZ from
     where the foot is) actually applies on this path. Add `4.0 x 0.3 go 1.99` and `2.8 x 0.3 go 1.73` (better: all 5
     phases at 1.4 / 2.8 / 4.0 / 5.0) to mocapPlayer item 2.

## Checks from the brief
1. CHECK-3 items, zzplayer (188 CT-driven plans, OFF vs ON; c4out/zzplayer.txt): 10 flagged. 2 are required 1 above;
   6 are item 5 (A8); 2 are a note (below).
   - Item 1 passes: 5.0 turning 3 <-> 1.4, 1.4 <-> 5.0, 1.0 <-> 4.0, both ladders: no flags (rule max(2, OFF)).
   - Item 2: 1.4 x 0.3 all 5 phases, 2.8 x 0.3 go 1.60 / 1.86 / 1.99 / 2.12 and 4.0 x 2 s pass; 2.8 go 1.73 and 4.0 x 0.3
     go 1.99 fail (required 1).
   - Item 3 (group B, 30 flicks), item 4 (group C), item 6a-e (groups A / E / F): no flags.
   - Item 5 (group G): walk, walk-turning, jog, sneak, spot spin, stop / start pass at all 3 offsets. Run 4.0 and sprint
     5.0 flag at all 3 offsets: pelvis 2.11-2.62 cm (OFF 1.50 / 1.66), bones 23.6-33.8 deg (ankle-toe 33.8 at 0.2 s after
     an ON -> OFF). Inside A8's 2.1-2.6 cm / ~33 deg. Two edges of A8's window, notes not fails: sprint @0.31 pelvis 2.55
     at 1.26 s after the switch-off (A8 says 0.5-0.7 s); run @0.67 hip-knee 24.2 deg 0.06 s after a switch ON (line 24 /
     OFF + 2 = 23.2).
   - tests/mocapPlayer.test.ts: 7 passed, 1 skipped (item 5, A8).
   - fix C's helper rule (tests/helpers/mocapPlayer.ts:64, slide fails at >= 2 cm and > OFF): fair. It is CHECK-3's own
     zzplayer rule, and for OFF < 2 cm it is the plain < 2 cm line. Only the crouched sneak flick @0.5 uses it (ON 13.7 vs
     OFF 16.9, the planner's crouched band, pre-existing).
2. Regressions: mocapSwitch 13/13 (allocation included), mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1,
   mocapRunTurn 4/4, mocapCrouch 6/6, mocapCrouchShift 2/2, mocapSprint 10/10, mocapQuickStop 7/7, footPlanner 12/12,
   animSkeletonIdentity / GuardIdentity 1 + 1 skipped each. zzstops (with ankle-toe, 150 stops): ON bone 17.2-20.3 vs OFF
   29.2-38.0, ankle-toe ON 17.0-17.2. zzstarts (450 starts): ON worst 17.2 / 17.2 / 19.9 deg at 1.0 / 1.4 / 2.0, 0 over 24.
3. Switch OFF: repro dump on this tree 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea (= #159 f4b5b7c1).
4. Allocation (zzalloc2, min per frame): ON 13.5 / 10.1 kB vs OFF 19.2 / 12.8 kB. ON <= OFF. Code read: fix B's
   cross-fade buffers are made once (characterRig.ts:3905-3910), module scratch otherwise.
5. tsc clean (its only error is in my zz copy); eslint src/anim src/player/characterRig.ts exit 0.

## Notes
- E crouch at 1.4 (and crouch + draw) at 2.51: pelvis 2.76 vs OFF 2.71 at the same frame (64): the crouch's own drop,
  shared with OFF, 0.05 cm over. Same as CHECK-3 (not listed there). Not a fail.
- fix B's `switchFade` records the posed nodes every frame with the switch off too (reads only; the dump is identical):
  a small per-frame cost on the OFF path.
- GPU suites and e2e not run.

## Ran (scratch/mt2/check4 = git archive d952d723; outputs scratch/mt2/c4out)
- c4out/run.sh: mocapPlayer, zzplayer (all groups), dump, zzalloc2, zzstops (c3out's, with ankle-toe), zzstarts
  (repro2), the 12 repo files one at a time, tsc, eslint.
- zztrace (c3out's plus cases start40 / start28b) on this tree, and start40 on da86e8e7 (scratch/mt2/check3).
- zzplayer GROUP=A with the `firstMove` term removed (footPlanner.ts restored, cmp-checked).
