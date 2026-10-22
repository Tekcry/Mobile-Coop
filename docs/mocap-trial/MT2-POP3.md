# mocap-trial-2 - pop3: starts after a short stand (CHECK-2 required 3)

2026-10-23, implementer (Opus), branch feature/mt2-pop3 off feature/mocap-trial-2 20515978.

## Result
Done. Switch ON, starts after stands of 0.3 / 0.5 / 0.8 / 1.5 / 3 s at 1.0 / 1.4 / 2.0 m/s over ten walk lengths (the
gait phase at the stop), 3 starts each: every start's worst bone step is now 22.1 deg or less (was up to 36.6), the
pelvis step beyond pace x dt 1.62 cm or less (was up to 11.0), the lowest pelvis 62 cm or higher (was 21 cm), the
planner drags no foot, and long-stand starts are unchanged (1.0 / 1.4 m/s) or better (2.0 m/s). Switch OFF
byte-identical: the dump repro on this tree and on 20515978 is 31,065,812 B each, md5 9ce3f3d1 (as FIX-1's merge).

## Cause (traces, zzdet-style)
After a short stand one foot is still in its idle stop step (the planner's, slow: 0.34 s) when the move starts. The gait
phase did not move during the stand, so the clock often has the other foot well into its swing window. The planner held
that foot planted (no two feet in the air at a walk) for the first 2-3 frames; then the clip feet came on and the clip
lifted it at 0.89-0.98 of its swing window: its swing fades the gap to the clip's target by smooth(u), so the foot went
0.3-0.4 m to its landing in one frame (knee-ankle / ankle-toe 26-37 deg) and landed the next. Found while fixing it:
a start's first step that comes late (the planner's late clock swing, as in long-stand starts at 2.0 m/s) lands the foot
near the root, and the clip then pinned it for its whole stance window, 0.8 m behind at the end: the pelvis sank from
82 to 19-27 cm (pelvis step 7.9 cm; this was already there at 2.0 m/s after any stand).

## What changed (src/anim/footPlanner.ts, all inside `clipFoot`, i.e. only with clip feet on the input)
1. The leftover idle step (`clipIdle`, marked on the first moving frame): where the clock wants that foot down it lands
   within `CLIP_IDLE_LAND` 0.05 s, at most 2.5x its idle pace (`CLIP_IDLE_RATE` 0.4: faster moved a young idle step
   18 cm in a frame). The clip lifts no foot while the other is still in it.
2. In a start (`moveT < START_TOE_OFF`), a clip lift further than `CLIP_LIFT_LATE` 0.1 into its swing window goes to the
   planner (`clipWait`): it waits for the other foot or starts its own late clock swing, as with the switch off (and as
   a long-stand start already did in its first frames). The clip takes the foot again from its landing or its stance.
3. In a start, a planted foot the clip would take over from the planner while it stands more than `CLIP_TAKE_BEHIND`
   0.2 m behind the clip's own foot toes off now (the planner's start toe-off, A80: same duration and aim) when the other
   foot is planted, else stays the planner's until it is. Left to the planner's own toe-off (reach 0.82) it was dragged
   up to 3.6 cm once the clip lifted the other foot.
4. `clipWait` / `clipIdle` (two small int fields) clear when still and on `reset`. No allocation.
Not touched: the stop branch / swingTo, the turn reach and swing timing, the uncross / swing bow, fix-2 / characterRig.

## Numbers (start windows: the 0.8 s from each start; ON before -> after; OFF; 30 starts per row)
| m/s, stand | bone step deg | over 24 | pelvis beyond pace cm | lowest hips cm | plant slide cm |
| --- | --- | --- | --- | --- | --- |
| 1.0, 0.3 | 27.4 -> 17.2 (OFF 15.9) | 2 -> 0 | 1.37 -> 1.37 (1.19) | 68.1 -> 74.0 (74.1) | 0.01 -> 0.01 |
| 1.0, 0.5 | 26.1 -> 17.2 (15.6) | 1 -> 0 | 1.24 -> 0.90 (1.25) | 68.5 -> 74.5 (78.8) | 0.01 -> 0.01 |
| 1.0, 0.8 / 1.5 / 3 | 17.2 -> 17.2 (15.0-15.6) | 0 | 1.24 -> 0.90 (1.25) | 68.5 -> 74.3 (78.8) | 0.01 -> 0.01 |
| 1.4, 0.3 | 31.0 -> 18.4 (23.7) | 4 -> 0 | 2.97 -> 1.57 (2.55) | 56.8 -> 71.6 (61.3) | 0.01 -> 0.01 (3.89) |
| 1.4, 0.5 | 27.8 -> 17.2 (16.9) | 3 -> 0 | 2.87 -> 1.31 (1.17) | 57.4 -> 69.6 (72.1) | 0.01 -> 0.01 |
| 1.4, 0.8 / 1.5 / 3 | 17.2 -> 17.2 (16.9) | 0 | 2.87 -> 1.06-1.33 (1.10-1.20) | 57.4 -> 69.6 (72.1) | 0.01 -> 0.01 |
| 2.0, 0.3 | 36.6 -> 20.5 (23.8) | 9 -> 0 | 11.01 -> 1.62 (8.74) | 21.0 -> 62.2 (46.4) | 7.08 -> 2.41 (44.1) |
| 2.0, 0.5 | 28.8 -> 22.1 (20.4) | 6 -> 0 | 7.86 -> 1.47 (2.66) | 26.6 -> 62.1 (56.3) | 3.45 -> 2.46 (0.01) |
| 2.0, 0.8 / 1.5 / 3 | 21.2 -> 20.8 (19.7) | 0 | 7.86 -> 1.47 (2.66) | 26.6 -> 62.0 (56.3) | 3.45 -> 2.46 (0.01) |

Planner slide (its counted drag) 0 everywhere before and after. Course Ready's zzstarts on this tree (stands 0.3 / 0.5 /
0.8 / 1.2 / 2.0): ON worst 17.2 / 18.4 / 22.1 deg at 1.0 / 1.4 / 2.0 m/s, 0 / 450 starts over 24 (CHECK-2: 27.6 / 31.2 /
36.3, 8 / 30 over at 2.0 x 0.3). The OFF column differs from CHECK-2's r-starts (36.0 at 2.0) because the base is now
4.61.0 merged.

## Tests
- New `tests/mocapShortStart.test.ts` (10 s): the 12 cases above (stands 0.3 / 0.5 / 0.8 / 1.5 s x 1.0 / 1.4 / 2.0 m/s x
  10 walk lengths x 3 starts, switch ON): bone step <= 24 deg, pelvis beyond pace x dt <= 2 cm, lowest pelvis > 55 cm,
  planner slide 0, planted ankle slide < 3 cm. It fails on 20515978 (1.0 m/s after 0.3 s: 27.4 deg).
- mocapSwitch 12 / 13: "no allocation per frame" fails as at the base (known, the fix2 agent's): 2524.95 B after vs
  2525 B before (<= 2499.3). mocapFix2 6 / 6, footPlanner 12 / 12, animSkeletonIdentity and animSkeletonGuardIdentity
  pass. `tsc --noEmit` clean, eslint clean on footPlanner.ts and the new test. Repro copies (zz*) deleted.

## Open
- 2.0 m/s: a clip landing's first planted frame moves the rendered ankle 2.0-2.5 cm (heel-strike pitch -0.51 rad on a
  clip-landed foot, then pinned); was 3.5-7.1 cm before this fix in the same starts, 0.01 at 1.0 / 1.4 m/s and OFF. Not
  in the start hand-over; the stop-pitch / landing owners may want to look (`plantSlide` on zzsweep2's 2.0 starts).
- The lowest pelvis ON at 1.0 / 1.4 m/s is 74 / 70 cm vs OFF 79 / 72 (the capture's own bob, M1).
- A stand shorter than START_STILL (0.25 s) is not a new start for the planner (moveT runs on): those starts keep the
  old path. Not in the brief's range.

## Changelog (for the lead)
- Mocap locomotion: walking off after a short stand no longer pops the feet (the leftover idle step lands first, a late
  first lift goes to the foot planner) and a late first step at 2 m/s no longer sinks the pelvis.
