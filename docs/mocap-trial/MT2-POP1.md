# mocap-trial-2 - pop1: fast walk turns, the pelvis sink (CHECK-2 required 1)

2026-10-23, implementer (Opus), branch feature/mt2-pop1 off feature/mocap-trial-2 20515978.

## Result
Done. Switch ON, walk 1.4 / 2.0 m/s x turn 1-4 rad/s at turn-start offsets 0 / 0.37 / 0.71 and with ramped turn ends
(zzsweep2 A + B, 58 plans): pelvis beyond pace x dt max 1.75 cm (was 2.25; 4 plans over 2 cm, now none), bone step max
23.1 deg (was 24.5). Stops unchanged, starts and jog / run turns better (below). Switch OFF byte-identical (the dump repro,
31,065,812 B, md5 9ce3f3d1 before and after; zzsweep2's OFF columns identical).

## What changed and why
Cause (zzdet2-style trace at 20515978, walk 2.0 x 4 ramped end): in the fast turn the clip feet are handed to the planner;
the trailing planted foot (stance window to phase 0.56) is held planted until the other foot's clock swing lands at 0.50
(a walk never has both feet in the air: `holdOrStep`'s `flight` gate), while the turn slot fades out (wT 0.95 -> 0.34)
and moves the hips forward: its leg's reach need goes 0 -> 9.2 cm in 5 frames and the pelvis follows (2.25 cm a frame
beyond pace x dt). OFF has the same hold but no slot fade, so its drop builds slowly.

1. `src/anim/footPlanner.ts` (CHECK's second option, it measured better than shortening the other swing: a clock swing
   landed early is re-lifted by its own window the next frame). With clip feet on hand, `holdOrStep`'s `flight` gate also
   opens when the other foot's swing is past `CLIP_TOE_OFF_SWING` 0.75 and the rig already drops the pelvis more than
   `CLIP_TOE_OFF_NEED` 1 cm for this leg: the existing toe-off rules (`turnLeft`, `startOff`) then lift the trailing foot
   as an early clock swing (N1's aimClock, taken over by the clock as before), a 2-4 frame double flight instead of the
   sink. The need comes from the rig (new optional `PlannerInput.reachNeedL` / `reachNeedR`, last frame's): it is a frame
   late and grows 2-3 cm a frame there, hence 1 cm (3 cm left 2.0 x 3.5 at offset 0.37 at 2.04). Tried: swing 0.8 with no
   need gate (2.0 x 3.5 offset 0.37 stayed 2.04), a distance gate 0.85 x reach (works, but fires on 1.4 m/s feet the rig
   has no need for).
2. `src/player/characterRig.ts`, the reach drop: `pin.reachNeedL / R = this.liftL / R` (each planted leg's need, already
   computed there).
3. `src/player/characterRig.ts`, the legs' rate limit (found while measuring; needed for the "bone steps < 25 deg" line):
   with clip feet on hand, a hip / knee the rate limit clamped carried the foot round with it for that frame (the ankle is
   their child; the knee pole's swing / stance share swaps at a landing). In walk 1.4 x 4 offset 0.37 the landed foot's
   world yaw read -0.08 vs the planner's 0.40 for one frame (ankle-toe 23.9 deg at the base, 25.1 with change 1). Now the
   foot keeps the planner's yaw and pitch (its pitch already capped at MOCAP_FEET.pitchRate), its Joints offset re-applied,
   only on a limited frame and not with keyed legs or the tuner's IK strength. Note for the lead: this also takes the
   ankle-toe pops out of the jog / run turns (other agents' area; jog 2.8 x 4 44.8 -> 25.9 deg, run 4.0 x 4 81.1 ->
   28.8 deg, the remaining step is the knee / shin, not the foot). It is separable: drop that block and change 1 still
   meets the pelvis line (bone 25.1 on one plan).

Every change is gated on clip feet on the input (`i.clipFeet` / `pin.clipFeet`, null with the switch off). No allocation
(two number fields, quaternion scratch reuse).

## Numbers (zzsweep2, ON: pelvis beyond pace x dt cm / bone step deg; OFF unchanged)
| Plan | ON before | ON after | OFF |
| --- | --- | --- | --- |
| walk 2.0 x 4, ramped end 0.25 / 0.5 s | 2.25 / 23.9 | 1.71-1.75 / 21.1 | 0.14 / 29.5 |
| walk 2.0 x 4, offset 0.37 | 2.06 / 23.8 | 1.72 / 19.7 | 0.14 / 26.5 |
| walk 2.0 x 4, offset 0 / 0.71 | 1.73-1.75 / 21.6-23.1 | 1.73-1.75 / 21.6-23.1 | 0.14-0.39 / 31.9 |
| walk 2.0 x 3.5, offset 0.37 | 2.04 / 23.8 | 1.60 / 18.4 | 2.98 / 35.3 |
| walk 2.0 x 3, offset 0.37 | 1.72 / 24.0 | 1.59 / 18.0 | 3.22 / 34.8 |
| walk 1.4 x 4, offset 0 / 0.37 / 0.71 | 1.69-1.76 / 14.9-23.9 | 1.69-1.74 / 17.2-19.7 | 0.17-2.34 / 28.8-35.1 |
| walk 1.4 x 4, ramped end 0.25 / 0.5 s | 1.78 / 18.4-18.7 | 1.69 / 16.5 | 0.36-1.27 / 34-35 |
| all walk turns (A + B, 58 plans) max | 2.25 / 24.5 | 1.75 / 23.1 | 4.20 / 39.3 |
| jog 2.8 x 2.5 / 4 | 0.89 / 31.3 / 44.8 | 0.89 / 24.2 / 25.9 | 0.73 / 30.6 / 48.9 |
| run 4.0 x 4 | 0.67 / 81.1 | 0.67 / 28.8 | 1.69 / 57.8 |
| start, stand 0.5 s, 1.4 | 1.66 / 28.6 | 1.66 / 20.8 | 0.66 / 15.1 |
| starts 2.0 m/s, stops, steady, spot | as before | as before | |

Planted ankle slide (zzsweep2's contact measure, the turns' by-design scrub) down or equal on every plan (2.0 x 4: 14.1 ->
12.4 cm); the planner's own slide 0 throughout.

zzstops (150 stops): identical. zzstarts (150 starts): no row worse; 1.0 m/s 0.5 s stand 26.1 -> 21.4 deg (1 -> 0 over
24 deg), 1.4 0.5 s 27.8 -> 20.9 (3 -> 0), 2.0 0.3 s 9 -> 4 of 30 over 24 (worst 36.6 unchanged), 2.0 0.5 s 28.8 -> 21.2
(6 -> 0). zzalloc: ON <= OFF (ON median 9.9-20.2 kB vs OFF 11.4-38.5 kB, noisy). mocapSwitch "no allocation per frame":
2523.96 B (base 2525, known failure, owned by the fix-2 agent; not worse).

## Tests
- `tests/mocapSwitch.test.ts` "no pops ...": `sweepTurn` takes a turn-start offset (offset 0 unchanged), new `rampTurn`;
  17 new plans: walk 2.0 x 4 rad/s; 1.4 x 2.5 / 4 and 2.0 x 2.5 / 4 at offsets 0.37 and 0.71, 2.0 x 3 at 0.37, 2.0 x
  3.5 at 0.37 / 0.71; ramped ends 1.4 x 4 (0.25 / 0.5 s), 2.0 x 3 (0.25 s), 2.0 x 4 (0.25 / 0.5 s). Same asserts as the
  existing turn plans (pelvis <= 2 cm, bone step < 25 or OFF + 0.5, jerk, planner slide 0). Before the fix 2.0 x 4
  offset 0.37 (2.06), the ramped ends (2.25) and 2.0 x 3.5 offset 0.37 (2.04) fail the pelvis line; now max 1.75.
- Results: mocapSwitch 12 / 13 (only the known allocation case, 2523.96 B), mocapFix2 6 / 6, footPlanner 12 / 12,
  animSkeletonIdentity and animSkeletonGuardIdentity pass; `tsc --noEmit` clean; eslint clean on the changed files.
- Repro copies (zzsweep2, zzstops, zzstarts, zzalloc, dump, a scratch trace) deleted before committing.

## Open
- The remaining ~1.7 cm on walk 2.0 x 4 is the turn slot's pelvis pose fading in / out (wT), not the reach.
- Starts at 2.0 m/s after a 0.3-3 s stand: pelvis 4.0 cm ON vs 2.4 OFF, ankle-toe 34.8 deg (the short-stand start /
  stop agents' area; unchanged here).

## Changelog (for the lead)
- Mocap locomotion (switch on): fast walking turns no longer sink the hips when the turn clip fades out - the trailing
  foot steps off as the other lands; a leg the joint-speed limit holds back no longer flicks the foot round with it
  (also the jog / run turn foot pops).
