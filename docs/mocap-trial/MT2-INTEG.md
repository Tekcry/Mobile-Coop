# mocap-trial-2 - integ: the merged tree's start jerk (pop1 x pop3)

2026-10-23, implementer (Opus), branch `feature/mt2-integ` off feature/mocap-trial-2 9b1879d5 (pop1, pop2, runturn and
pop3 merged). Switch ON only; switch OFF byte-identical.

## Result
Done. tests/mocapSwitch.test.ts "no pops ..." passes again: "starts and stops" joint jerk ON 14.6 -> 7.8 cm/frame2
(OFF 9.0, limit OFF + 0.5 = 9.5). The whole file is 12 / 13: only the known "no allocation per frame" assert fails
(fix2's; 2512.2 vs <= 2487.7 B here, base 2525 vs ~2500: not worse, this change adds no allocation).

## Where (traced on the merged tree)
Plan "starts and stops" (stand 1.5 s, walk 1.4 m/s 2.5 s, repeat), the FIRST start only (t 1.5 s from spawn); the later
starts were already fine (worst 6.5-7.8). Two frames over the limit, both in that start:
- k116-117 (t 1.93), kneeL 12.7: the left foot froze for one frame mid-swing (z 0.211 -> 0.211);
- k150 (t 2.50), kneeR 14.6: the next clip swing of the right foot was pushed out 4.3 cm in one frame.

## Cause
In a start, pop3's left-behind rule (`clipFoot`, CLIP_TAKE_BEHIND) toes off the trailing planted foot. While the other
foot is still in the air it waits planted for it to land (no two feet in the air at a walk). pop1's change to
`holdOrStep`'s `flight` gate (clip feet on hand, the other swing past CLIP_TOE_OFF_SWING 0.75, reach need > 1 cm) let the
planner's start toe-off (`startOff`) lift that foot anyway, 2 frames before the other foot landed (k112, other swing at
0.93, reach need 1.4 cm).
1. That early swing was aimed for the clock (`aimClock`) from an earlier lift. The clock took it over at its window
   (k117, fix 21-2's offset fade from offBase 0), and the foot stood still for that frame: kneeL 12.7.
2. It landed on the planner's narrow walking spot (x -0.030, the clip's left is -0.044). The right foot's next clip swing
   then entered the no-crossing window (`uncross`, minGapAny 0.08 within nearAlong 0.25) 4.3 cm inside the gap and was
   pushed out at once: kneeR 14.6. Steady clip walking meets this push at 1-3 cm a step (2.9-4.3 cm/frame2 jerk, the
   planner's shared rule, as pop2's report notes).

Each branch alone passed: pop1 has no left-behind wait, and pop3 has no early flight. The tree before pop3 (c543c093) had
no CLIP_TAKE_BEHIND toe-off to race with.

## What changed (src/anim/footPlanner.ts, one condition)
pop1's extra `flight` opening also needs `this.moveT >= START_TOE_OFF` (1.2 s): in a start's first 1.2 s the trailing
foot follows pop3's start rules (wait for the other foot, then toe off) as on pop3's own branch. Mid-gait (fast walk
turns, pop1's case) nothing changes. Gated on `i.clipFeet` as before (null with the switch off).

Confirmed first with a test toggle (the same gate behind an env flag): the plan's worst jerk 14.6 -> 7.77, both frames
gone, no other frame over 7.8.

## Numbers
| | before (9b1879d5) | after |
| --- | --- | --- |
| mocapSwitch "starts and stops" joint jerk ON / OFF (cm/frame2) | 14.6 / 9.0 | 7.8 / 9.0 |
| zzstarts (Course Ready's, 1.0 / 1.4 / 2.0 m/s x stands 0.3-2.0 s x 10 phases x 3 starts) worst bone step ON | 17.2 / 18.8 / 22.1, 0 / 450 over 24 | identical row for row |
| mocapSwitch "no allocation per frame" (known, fix2's) | 2525 B (base, per the agents) | 2512.2 B vs <= 2487.7 |
| Switch OFF dump repro (dump.test.ts, 14 scenarios) | 31,065,812 B, md5 9ce3f3d1 | 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea |

The other agents' numbers hold: their test files pass unchanged (below). pop1's walk-turn plans start their turns at
t >= 2 s, after the start window, so the gate never touches them.

## Tests (each file run alone)
- mocapSwitch 12 / 13 (only the known allocation assert), including the full walk-turn sweep, "starts and stops" and
  "starts, the first clip swing";
- mocapStopPitch 1 / 1, mocapShortStart 1 / 1, mocapRunTurn 4 / 4, mocapFix2 6 / 6, footPlanner 12 / 12;
- animSkeletonIdentity and animSkeletonGuardIdentity pass (1 skipped each, as at the base);
- `npx tsc --noEmit -p .` clean, `npx eslint src/anim/footPlanner.ts` clean.
- No test added or changed. The repro copies (zz probes, zzstarts, dump) are deleted (not committed).

## Open
- A fast walk turn begun in a walk's first 1.2 s loses pop1's early toe-off (the pelvis-sink fix) for that window; pop3's
  start toe-off covers the trailing foot there. Not in any sweep (the turns all start at t >= 2 s).
- The `uncross` push of a clip swing (1-3 cm entering the window at once each step in steady clip walking) is the
  planner's shared rule; a narrower planner landing (as here) makes it larger. Not changed.

## Changelog (for the lead)
- Mocap locomotion (switch on): the first steps of a walk no longer pop the knees (the fast-turn early toe-off waits
  until the start's own toe-off rules are done; jerk 14.6 -> 7.8 cm/frame2, OFF 9.0).
