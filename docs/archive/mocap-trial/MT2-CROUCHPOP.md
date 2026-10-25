# mocap-trial-2, crouchpop: crouching / standing up / drawing while walking no longer pops a foot (switch ON)

Branch `feature/mt2-crouchpop`, cut from feature/mocap-trial-2 2bce4d96. MT2-CROUCH open item 3.

## The pop and why
As the crouch (or the drawn share) grows, the standing walk's mocap share falls under MOCAP_FEET.share (clip feet `on`
false: clip swings in the air finish under the clip, planted feet go to the planner) and then to 0 (`i.clipFeet` null:
the planner has every foot). Measured with `driveRig` (crouch ramped 0 -> 1 over 0.3 / 0.6 s, held 2 s, back 1 -> 0;
0.8 / 1.0 / 1.4 m/s; 4 gait phases), three hand-off snaps in `footPlanner.ts`:

1. **A clip swing in the air when the share reaches 0 while moving.** The clock's takeover set the planner's swing pitch
   (0 past s 0.3) under a 0.66 rad clip toe-off and moved the swing from the clip's progress 0.36 to 0.61 in a frame:
   ankle-toe 34.7 deg, knee-ankle 44-46 deg a frame (0.8 m/s, 0.3 s ramp; 1.4 m/s 46.3 vs OFF 15.4). The stop already
   eased this (pop2: `clipPitchT = 0` -> swingTo's pitch ease and offset fade); moving was left out by fix 1.
2. **A foot the clip planted, lifted by the planner.** `beginSwing` took `fromPitch = max(pitch, 0)`: the clip's heel
   strike toe-up (-0.30 rad) went to the planner's toe-off in a frame (32 deg). And a foot held planted on its raised heel
   (1.0 rad, the crouched HEEL_RAISE) while the other foot finished a rule step lifted late at s 0.30, past the toe-off
   ease: 1.0 rad -> 0 in one frame, ankle-toe 57.1 deg.
3. **The rule step that caused the wait.** The clip lands the feet on its narrow standing track; once clip feet are gone
   the crouched band (outOfBand, `turnOn && crouch > 0.5`) reads the foot just landed as out of band and steps it (in
   holdOrStep and in updateMoving's "steps in as the other lands" pass). The other foot then waits planted past its
   window (item 2), or the step outlasts its own window and the clock takes it over mid-air (the ankle 31 cm on in a
   frame, knee-ankle 36.8 deg).

## Fix (switch ON only)
- Block "clip feet gone": the pop2 hand-over (`clipPitchT = 0`, `clipPitchOff = pitch`, the planner's lift) now also while
  moving. `clipOwn` is only ever set by the clip (cleared on a switch off by the rig).
- `beginSwing`: a `clipPlant` foot lifted while moving with clip feet gone and the switch on starts the same ease
  (swingTo's CLIP_PITCH_EASE from its pitch, and the offset fade). Not with clip feet on hand (a start's toe-off: eased
  there mocapShortStart's 2.0 m/s start popped the knee 38.7 deg) and not with the switch off.
- `clipHeld` (new private): a `clipPlant` foot, clip feet gone, switch on, takes no rule step unless both stance windows
  outlast it (PLANNER.idleStepTime x 0.75, the fix-1 window rule extended): its own clock swing lands it on the planner's
  track. Used in holdOrStep's `rules` and the post-landing out-of-band pass.
- `PlannerInput.mocap?` (new, optional): the rig sets `pin.mocap = LOCO.mocap`, so the planner knows the switch without
  clip feet (a toe-up plant keeps `clipPlant` through a switch off mid-stop, fix 2: mocapFix2's two switch-off asserts).

No new allocation (one method call on numbers). OFF path unchanged.

## Numbers (ON | OFF, worst over 4 phases; ankle-toe / any bone deg a frame, slide cm, pelvis beyond pace x dt cm)
| case | base ON | after ON | OFF |
| --- | --- | --- | --- |
| 0.8 m/s, ramp 0.3 s | 34.7 / 44.0 | 15.0 / 41.1 (OFF 45.5 same frame) | 13.7 / 45.5 |
| 0.8 m/s, ramp 0.6 s | 57.1 / 57.1 | 14.8 / 14.8 | 12.9 / 45.6 |
| 1.0 m/s, ramp 0.3 s | 57.1 / 57.1 | 17.2 / 17.2 | 16.5 / 34.4 |
| 1.0 m/s, ramp 0.6 s | 52.7 / 52.7 | 17.2 / 33.6 (OFF 44.6 same case) | 15.2 / 45.2 |
| 1.4 m/s, ramp 0.3 s | 23.5 / 46.3 | 14.5 / 17.7 | 15.4 / 15.4 |
| 1.4 m/s, ramp 0.6 s | 53.7 / 53.7 (slide 1.67) | 14.5 / 20.5 | 15.1 / 15.6 |

- Slide after: 0.50 cm worst (1.0 m/s, 0.3 s, phase 0; OFF 0.00), else <= 0.01.
- Pelvis after: 0.6 s ramps 0.52-1.01 (OFF 0.64-1.14). 0.3 s ramps 1.71-2.33 against OFF 1.95-2.87; the worst frames
  are where the linear crouch ramp starts / stops (both switches), one case over OFF: 1.4 m/s phase 0.3, 2.11 vs 1.95
  (base ON 2.11 too).
- Draw while walking (armed for 2 s; 0.8 / 1.0 / 1.4 m/s, 4 phases): ON ankle-toe 7.5-10.4, bone 10.8-13.7, slide 0,
  pelvis 0.22-0.44 (OFF 8.8-9.8 / 8.8-9.8 / 0.02). Draw + 0.3 s crouch and stand: ON ankle-toe <= 17.2, bone <= 28.9
  (OFF <= 45.5; the holster's elbow-wrist 26-29 is the same both ways), slide <= 0.59, pelvis 1.67-2.32 (OFF 1.90-2.86).
- MT2-CROUCH item 3's figures (37.6 / 35.2 ankle-toe at 0.8 m/s) were the same hand-off: 0.8 m/s now 13.7-15.0 against
  OFF 11.9-13.7.

## Tests
- New `tests/mocapCrouchShift.test.ts` (2 tests, 5.6 s): the crouch sweep above (24 cases) and the draw (12 cases), ON
  ankle-toe and bone <= max(24, OFF + 2), slide < 2 cm, pelvis <= 2 cm (0.3 s ramps: <= max(2, OFF + 0.3)). Fails on
  2bce4d96 (ankle-toe 34.7 at 0.8 m/s, 0.3 s), passes after.
- Pass, one file at a time: mocapSwitch 13/13 (the known allocation assert passed in this run; this change is planner /
  rig only, the assert drives the graph), mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn 4/4,
  mocapCrouch 6/6, footPlanner 12/12, animSkeletonIdentity 1 (+1 skipped), animSkeletonGuardIdentity 1 (+1 skipped).
- `tsc --noEmit` clean; eslint clean on the three files.
- Switch OFF dump (scratch/mt-check/repro/dump.test.ts): md5 9ce3f3d1c70c299dca072d3a4f15f9ea, 31,065,812 B (identical).

## Files
`src/anim/footPlanner.ts`, `src/player/characterRig.ts` (one line), `tests/mocapCrouchShift.test.ts`, this report.

## Open
- Pre-existing, not the hand-off: a crouch held, then an instant (one-frame) stand-up together with a holster while
  walking slides a planted foot 6-13 cm ON (OFF 0.01) on 2bce4d96 and after; with a 0.3 s stand-up ramp it is 0.01.
- Pre-existing both ways: a crouch over 0.3 s turns the knee-ankle bone 34-46 deg in a frame at its ends (OFF too), and
  the pelvis reads 2-2.9 cm beyond the pace there.
- `driveRig` has no draw input: the test patches the rig's `animate` to set the pose's `armed`.

## Changelog (for the lead)
- Mocap locomotion (switch on): crouching, standing up or drawing while walking no longer snaps a foot as the clip's feet
  hand the steps to the planner (ankle-toe 57 -> 17 deg a frame at worst, OFF 16.5).
