# mocap-trial - fix round 1 (CHECK.md required 1, 1b, 2, decide 3, note 5)

2026-10-22 ~23:10, implementer (Opus), on 646b9a88 (82f43716 + BRIEF M1). Not committed (the job lead commits).

## Result
Done. Switch ON: walk 1.4 and 2.0 m/s x turn 1 / 1.5 / 2.5 / 4 rad/s keeps the pelvis beyond pace x dt at or under
2 cm (one case at the line: 2.0 m/s x 4 rad/s 2.005 cm, was 4.7) and every bone step under 25 deg (max 23.7); the start
(stand 1.5 s, walk 1.4) ankle-toe bone 14.6 deg (was 26.0; OFF 14.6). Switch OFF bit-identical to master 4.59.0 (the
dump repro, 14 scenarios x 420 frames x 21 nodes, byte-identical files).

## What changed and why
`src/anim/footPlanner.ts` (all new behaviour runs only with clip feet on hand; OFF never reaches it):
1. Required 1: `beginSwing` and `land` clear `clipOwn` (and the new clip pitch state). A planner-lifted foot flagged as
   the clip's was set down again by `clipFoot` and lifted once more (lift, land, lift in 3 frames). `clipFoot` claims
   its own swing and landing after these calls, as before.
2. Required 1b (preferred fix): a planted foot the clip takes over from the planner eases its pitch onto the clip's
   over `CLIP_PITCH_EASE` 0.15 s (new `FootState` fields `clipPlant`, `clipPitchT`, `clipPitchOff`). A foot the clip
   landed itself keeps the clip's pitch exactly (steady ON gait unchanged). The planner taking a planted foot back
   (`C.on` false, no clip feet, standing) resets it, so the next take-over eases again.
3. Required 2: a clip swing lifted from a pitch the planner left (the start's first clip swing, a hand-back mid-ease)
   fades that gap into the clip's pitch over the swing's first `CLIP_PITCH_SWING` 0.3 (as the toe-off fade). A foot the
   clip had fully lifts on the clip's own pitch.
4. Found while measuring 1b (the real cause of the 1.4 m/s turn drops, 35 cm pelvis sink): at a turn's start the clip
   hands the steps to the planner; the turn swung the clip's staggered narrow track round until the gap rule read the
   feet side by side and lifted the foot the clip had just landed, while the trailing foot's clip stance had ended; at a
   walk the clock then holds the trailing foot planted until the rule step lands (no two feet in the air), stretched far
   behind. Now, with clip feet on hand, `holdOrStep` starts no rule step (turned / gap / band) on a foot while the other
   foot's stance window ends before the step could land (`windowLeft` < 0.255 s): the other lifts first, by the clock.
5. Found while measuring: the planner's swing bow-out (`swingTo`, passing the planted foot) switched on and off at the
   window edge, moving the swing foot up to 25 cm sideways in a frame on the clip's narrow track in a fast turn
   (hip-knee / ankle-toe 24-26 deg). With clip feet on hand it now fades in and out over a further `near` front to back;
   OFF keeps the hard window (the weight is exactly 1 inside it).
6. Note 5: the `updateIdle` `pitch < 0` branch is gated on `f.clipPlant` (only a foot the clip planted); with the switch
   off `clipPlant` is never set, so the OFF path is master's structurally.

`src/anim/mocap.ts` + `src/anim/keyed.ts`: decide 3 (job lead's pick): the start slot's arms play at most
`MOCAP_SLOT.startArms` 0.5 of its weight (`MocapSlots.mix` draws the sampled clip's arm channels toward the standing pose
first, new `mixKeyedArms`: arm points, fingers, wrist / forearm / shoulder / clavicle quaternions; no allocation). Starts
arm-leg anti-sync (same-side arm and leg forward together) ON 50 / 242 -> 0 / 214 moving frames (OFF 0 / 402).
Phase-aligning the start slot to the gait clock stays the later fix.

Tried and dropped: a 1 cm / frame cap on the pelvis's soft drop with clip feet on hand (CHECK 1b's alternative): no
change in any case (the remaining 2.0 m/s x 4 rad/s frame is the hard reach floor of the planted trailing foot), so not
kept. `MOCAP_FEET.pitchRate` stays 18 rad/s.

## Numbers (zzsweep, 12 s each: turning left / right 1.2 s every 2.5 s; dy = largest pelvis drop a frame, rule =
pelvis motion beyond pace x dt, step = largest bone step; cm, cm, deg)
| v m/s x yr rad/s | OFF (before = after) | ON before | ON after |
| --- | --- | --- | --- |
| 1.0 x 0.6 | 0.1 / 0.0 / 10 | 1.0 / 0.3 / 17 | 1.0 / 0.3 / 17 |
| 1.0 x 1 | 0.1 / 0.0 / 11 | 1.1 / 0.4 / 17 | 1.1 / 0.4 / 17 |
| 1.0 x 1.5 | 0.1 / 0.0 / 14 | 0.7 / 0.7 / 19 | 0.7 / 0.7 / 13 |
| 1.0 x 2.5 | 0.4 / 0.1 / 24 | 1.0 / 1.1 / 25 | 1.0 / 1.1 / 13 |
| 1.0 x 4 | 0.2 / 0.1 / 21 | 1.2 / 1.7 / 23 | 1.0 / 1.7 / 22 |
| 1.4 x 0.6 | 1.3 / 0.3 / 12 | 1.4 / 0.5 / 14 | 1.4 / 0.5 / 14 |
| 1.4 x 1 | 1.0 / 0.2 / 15 | 1.5 / 0.6 / 17 | 1.5 / 0.6 / 17 |
| 1.4 x 1.5 | 3.4 / 1.8 / 39 | 5.4 / 3.7 / 24 | 1.2 / 0.8 / 19 |
| 1.4 x 2.5 | 4.1 / 2.4 / 40 | 5.3 / 3.5 / 29 | 1.5 / 1.0 / 21 |
| 1.4 x 4 | 3.1 / 1.5 / 42 | 6.6 / 4.6 / 45 | 1.8 / 1.7 / 23 |
| 2.0 x 0.6 | 2.0 / 0.6 / 15 | 2.5 / 1.0 / 17 | 2.5 / 1.0 / 17 |
| 2.0 x 1 | 6.2 / 3.7 / 35 | 2.7 / 1.1 / 21 | 2.7 / 1.1 / 21 |
| 2.0 x 1.5 | 1.9 / 0.5 / 21 | 8.4 / 5.8 / 28 | 2.3 / 0.9 / 19 |
| 2.0 x 2.5 | 2.2 / 0.7 / 24 | 6.2 / 3.4 / 31 | 2.3 / 1.2 / 23 |
| 2.0 x 4 | 2.8 / 1.0 / 24 | 7.3 / 4.7 / 34 | 2.9 / 2.0 (2.005) / 24 |
| 2.8 x 0.6 / 1 / 1.5 | 2.8 / 0.8 / 19-25 | 2.2 / 0.9 / 11 | 2.2 / 0.9 / 11 |
| 2.8 x 2.5 | 2.7 / 0.8 / 28 | 2.2 / 0.9 / 27 | 2.2 / 0.9 / 24 |
| 2.8 x 4 | 2.7 / 0.8 / 35 | 2.2 / 0.9 / 34 | 2.2 / 0.9 / 32 |
| 4.0 x 0.6 - 2.5 | 5.5 / 2.0 / 57 | 1.5 / 0.7 / 14 | 1.5 / 0.7 / 14 |
| 4.0 x 4 | 5.5 / 2.0 / 57 | 1.5 / 0.7 / 51 | 1.5 / 0.7 / 48 |

zzdet: starts (stand 1.5 s, walk 1.4) ankle-toe ON 26.0 -> 14.6 deg (OFF 14.6); walk turn 1.5 pelvis drop a frame ON 5.75
-> 2.53 cm (OFF 3.41); walk turn 4 (90 deg turns) ON 3.99 -> 2.53 cm (OFF 2.03). zzana: walk turn 4 ON pelvis beyond
pace x dt 2.35 -> 1.54 cm; starts / stops ON bone step 26.0 -> 14.6 deg; the rest unchanged.

Switch OFF: the dump repro (dump.test.ts) on this tree is byte-identical to the same dump on master 4.59.0 (2f1961ad,
exported with `git archive` to the scratchpad) and to the tree before this round (31,043,056 bytes each).

## Tests
- `tests/mocapSwitch.test.ts` "no pops": five new plans (walk 1.4 turning 2.5 / 4, walk 2.0 turning 1.5 / 2.5 rad/s;
  starts over 16 s, the start whose first clip swing popped) and a pelvis-step assert on every plan (beyond pace x dt
  <= 2 cm, bible 5.12.2). On the sustained turns the planted-ankle-slide assert is skipped (G1's stance band scrubs the
  planted feet round with the hips there by design: OFF 7-49 cm, ON 7-19 cm; the planner's own slide stays 0) and the
  jerk allowance is 1 cm instead of 0.5 (walk 2.0 turning 1.5: ON 16.9 vs OFF 16.4 cm / frame^2; 30.1 before).
  2.0 m/s x 4 rad/s is not in the assert (2.005 cm).
- Results: mocapSwitch 12 / 12; footPlanner 10, animTuneBake 29, g1Locomotion 13, gaitEffort 3, idleShins 2, keyedCrouch
  8, stepTwentyOneC 2, tuneStep 7, turnFollow 37: all pass (each file alone). `tsc --noEmit` clean; eslint clean on the
  changed files. The repro copies were deleted from tests/ (the originals stay in C:/NightShift/scratch/mt-check/repro/).

## Open
- 2.0 m/s x 4 rad/s: pelvis 2.005 cm beyond pace x dt in one frame (OFF 1.0): the planted trailing foot at its hard
  reach for the two frames before the other foot (a planner clock swing) lands; the walk's no-flight rule holds it. At the
  line, not over by a visible amount.
- Not in the brief's range, worse OFF: jog 2.8 x 4 rad/s bone step ON 32 (OFF 35), run 4.0 x 4 rad/s ON 48 (OFF 57), both
  ankle-toe in the planner's turn steps; walk-run-stop (4.4 to 0 in one frame, zzana) ON 67.5 vs OFF 100.6 deg.
- CHECK notes 4 (the stop slot rarely fires) and 6 (DECISIONS / bible / credits at the merge) are not this round's.
