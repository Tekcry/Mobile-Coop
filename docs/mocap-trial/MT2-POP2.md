# mocap-trial-2 - pop2: the stop pop (CHECK-2 required 2)

Branch `feature/mt2-pop2` (from feature/mocap-trial-2 20515978). Switch ON only; switch OFF byte-identical.

## The pop
At a stop (`!i.moving`) the planner clears `clipOwn`, so the clip swing in the air finishes as the planner's idle step
(`updateIdle` -> `swingTo`). Three things snapped in the first frame, not only the pitch:
- pitch: `swingTo`'s rule (0 mid-swing; `fromPitch` fades only for s < 0.3) replaced the clip's 0.86 rad toe-off; the
  rig's pitch cap (`MOCAP_FEET.pitchRate`) spread it over 3 frames: 0.86 -> 0.56 -> 0.26 -> 0, ankle-toe 35-41 deg;
- height: the clip swing has no planner lift (`stepLift` 0, the clip supplies it): the foot fell 12.7 cm -> 0 in a frame;
- place: `swingTo` lerps from the lift spot to the idle aim: a nearly planted foot jumped 21 cm back (walk 1.0, phase 0.97).
With only the suggested pitch fix the ankle-toe worst fell to 27.6-29.6 deg, still at the stop frame (the place / height
jump), and a late swing landing mid-ease left its toe up for the whole stand (see below), so the fix covers all three.

## What changed (src/anim/footPlanner.ts only)
1. The `!i.clipFeet || !i.moving` branch, per foot: a clip swing in the air at a stop (`clipOwn && !contact && !moving &&
   !quick`) starts a hand-over: `clipPitchT = 0`, `clipPitchOff = pitch` (absolute), `stepLift = liftH` (the planner's own
   swing lift). Planted feet and clip swings otherwise get `clipPitchT = -1` as before; a planner swing in the air keeps
   its running ease. Moving with the clip feet gone (a part mocap share) is untouched: easing it there raised the
   mocapSwitch walk 2.0 x 2.5 turn sweep's joint jerk 14.8 -> 29.7. A quick stop (`quickStop` > 0, the CT player's
   stop) is untouched too: `setDown` already restarts the swing from the foot and the quick pitch ease from its pitch.
2. `swingTo`: on the hand-over frame (`clipPitchT === 0`) the gap between where the clip had the foot and the planner's
   swing is taken into the existing taken-over-toe-off offset (`offX/Y/Z`, `offBase = 0`), which fades over OFF_FADE
   (0.15 s); a landing before then lands where the foot is (`land`'s existing rule). After the pitch rule the pitch
   blends from `clipPitchOff` onto the planner's over CLIP_PITCH_EASE (0.15 s), then `clipPitchT = -1`.
3. `land`: a hand-over swing still easing its pitch (`clipPitchT >= 0 && !clipOwn`) keeps its pitch, no heel roll, and
   is flagged `clipPlant`, so `updateIdle` flattens it either way (its existing clipPlant rule). Without this the land's
   0 was capped by the rig, which writes the capped pitch back into the planner, and nothing flattens a negative pitch on
   a non-clip plant: the toe stayed at -0.27 rad all stand (2.3 cm planted ankle slide). A clip swing's own landing
   through `land` (clipOwn) is as before.

OFF: `clipOwn` is never set and `clipPitchT` stays -1 with the switch off, so every new branch is dead; the added
locals in `swingTo` change no value. animSkeletonIdentity / GuardIdentity pass; the OFF columns of every sweep below are
identical before / after. A per-frame dump of the mocapSwitch walk 2.0 x 2.5 turn sweep (ON) is identical to the base.

## Numbers (headless rig, stop = speed to 0 in one frame, 10 gait phases, walk 1.6-2.41 s then stand 1 s)
Worst from 20 frames before the stop on. Ankle-toe step / any bone step (deg), pelvis beyond pace x dt after the stop
frame (cm). Base = 20515978.

| pace | OFF toe / bone / pelvis | ON base toe / bone / pelvis | ON fix toe / bone / pelvis |
| --- | --- | --- | --- |
| 1.0 | 16.8 / 29.2 / 1.29 | 40.9 / 40.9 / 0.74 | 12.4 / 13.1 / 1.81 |
| 1.4 | 12.7 / 32.9 / 1.39 | 39.9 / 39.9 / 1.03 | 12.8 / 12.8 / 1.21 |
| 2.0 | 17.4 / 35.9 / 1.42 | 40.9 / 40.9 / 1.67 | 13.5 / 14.1 / 1.67 |
| 2.2 | 17.2 / 36.7 / 1.22 | 40.3 / 40.3 / 1.70 | 11.6 / 13.8 / 1.70 |

- Planted ankle slide (plantSlide, 1 cm) ON 0.01 cm everywhere; planner slide 0.
- The stop frame itself: the pelvis carries on 2.3-3.4 cm OFF and 3.9-4.9 cm ON (the mocap walk's lower pelvis rising as
  the share fades in a frame, the pose blend), identical before and after this fix: not the feet.
- Quick stops (`quickStop` 0.12 and 0.35, the CT player's path): ON before = after on every number (toe 8.6-11.8, bone
  11.9-14.8).
- Course Ready's zzstops (5 paces x 3 stands x 10 phases, stops and the starts after): worst bone step ON 39.7-40.9 ->
  16.8-29.7 deg, OFF 29.2-38.0 on this base. The stand-0.4 rows (25.6-29.7) are the short-stand start, required 3 (another
  agent's).
- Allocation (mocapSwitch "no allocation per frame"): 2524.9-2525.4 B before and after (the known base failure, fix2's).

Open: the pelvis after the stop at 1.0 m/s, 0.74 -> 1.81 cm (one phase of ten; 1.4: 1.03 -> 1.21), under the 2 cm
bible limit. A late hand-over swing (phase 0.86) now lands where the clip put it (a stride ahead, on the clip's narrow
track) instead of jumping back to the idle spot, so the rear foot closes with an idle step, and that idle step's landing
moves 2.5 cm sideways in a frame: the airborne foot is pushed out by `uncross` (minGapAny) while `aim`'s stance band pulls
its target in, a planner trait the quick-stop path shows ON before this fix too (1.88 / 1.97 cm). Not fixed here: the
uncross / aim rules are the planner's shared code (another agent's area).

## Tests
- New `tests/mocapStopPitch.test.ts` (~15 s): stops from 1.0 / 1.4 / 2.0 / 2.2 m/s at six phases (each pace's worst
  before the fix, and the late swing that left the toe up): ankle-toe step under POP_DEG and within 2 deg of the larger of
  master's stop and the mocap walk's own step; bone step no more than master's own stop + 0.5; pelvis beyond pace from the
  frame after the stop <= 2 cm; planted ankle slide < 1 cm; planner slide 0; both feet flat (|pitch| < 0.01) after the
  stand. Fails on the base (ankle-toe 40.9 deg) and without the landing rule (planted ankle slide 2.3 cm).
  Measured: ankle-toe ON 11.3 / 10.6 / 13.1 / 11.6 vs OFF 10.0 / 10.7 / 13.2 / 13.5; bone ON 13.1-14.1 vs OFF 23.9-34.4;
  pelvis 0.74-1.67 cm.
- Ran: mocapStopPitch, mocapFix2 (6/6), footPlanner (12/12), animSkeletonIdentity, animSkeletonGuardIdentity pass;
  mocapSwitch 12/13 (only the known allocation assert, 2525.4 vs 2499.6); `tsc --noEmit` and eslint on the two files clean.

## Changelog (for the lead)
- Mocap locomotion (switch on): a stop no longer pops the swinging foot: the clip's step in the air eases its pitch, height
  and place onto the planner's (ankle-toe 40 -> 12-13.5 deg a frame, under master's own stop), and a landing mid-ease no
  longer leaves the toe up.
