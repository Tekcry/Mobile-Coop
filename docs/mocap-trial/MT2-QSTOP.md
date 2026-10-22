# mocap-trial-2 - qstop: quick stops from a jog, run or sprint (implementer report, slug qstop)

Branch `feature/mt2-qstop` (from feature/mocap-trial-2 a7147e26). Switch ON only; switch OFF byte-identical.

## The pop (measured, driveRig, ON)
- **One-frame stop** (asked pace 5 -> 0 in a frame), the stop frame: the hips rose 8.7-10.3 cm. Channels (cm, that frame):
  the procedural stand's pelvis height (graph `out.pelvis.y`) -7.10 -> -0.36 (+6.7), the keyed (mocap set) offset
  `keyed.pel[1]` -9.5 -> -4.0 (+5.5; the rig's KEY_PEL_RATE limiter passed +2.0 of it, then +2.0 a frame after), the
  mocap share 1 -> 0.81. Both poses read the pace of the frame: `locomotion()` picks its speed nodes and `speedSet` its
  walk / jog / run / sprint mix from the current effort pace, so at a one-frame stop the run is replaced by the slowest
  walk at once (only the moving share `moveW` eased, tau 0.08 s). OFF has the same procedural +6.7 cm; its hand-keyed
  run's offset fell (-2.0, limited) and its pelvis drop rose, so it read 2.5-8.9 cm. The arms (elbow-wrist 34-47 deg) are
  the same blend. Not the feet, the stop slot (braking from over `walkMax` never arms it) or the rig's pelvis follow.
- **Braked stop** (0.25 s at 20 m/s^2): at 2.2 m/s mid-brake the speed set crosses the walk / jog band (2.1-2.6 m/s,
  smoothstep) in under two frames: keyed pelvis +3.1 cm up, +2.9 forward, 1.6 sideways in a frame (y / z limited to 2 by
  KEY_PEL_RATE, x not), 3.0-3.2 cm beyond pace x dt.

## What changed
`src/anim/animGraph.ts`, `src/anim/mocap.ts` (`MOCAP_SLOT.paceFall`):
1. A new pace `mPace` for the standing pose: switch on with the captured gaits, a pace falling from over a walk
   (`MOCAP_SLOT.walkMax`, 2.2 m/s) eases it down at most `MOCAP_SLOT.paceFall` (4 m/s^2) until it meets the pace
   (`mEase`); rising, and a walking stop, it is the frame's pace (walk stops and starts as before). It poses the
   procedural stand's speed nodes (`locomotion`, the standing pose only; crouched as before) and the mocap speed set
   (`keyedSet`).
2. The moving share's fade to the idle at a stop (`moveW`, tau 0.08 s) is slower from over a walk, by the pose's pace:
   tau 0.08 x max(1, mPace / walkMax) (0.18 s from 5 m/s; walks unchanged). The run's pelvis sits ~14 cm under the idle's;
   at 0.08 s 0.19 of it moved in the first frame. Quick stops (`quickStop`) and the CT hold keep their own taus.
Gate: `LOCO.mocap && LOCO.set.run !== HAND_KEYED_SET.run` (the mocapSwitch placeholders, the hand-keyed clips in the
mocap set, stay bit-identical to OFF; a MOCAP_LAYERS entry would have changed mocapSwitch's asserted layer table). Gate
off, `mPace` is the effort pace and the fade 0.08 s: the OFF path computes the same values as before.
Tried first: the crouched set's exponential ease (`KEYED_CROUCH.paceTau / moveW`) on the pace: an exponential still crosses
the bands at the brake's own rate (braked pelvis 3.3-3.4 cm) and left 3.4-5.1 cm planted slides; a pace fall of 6 / 10
m/s^2 left the braked stop from 4 m/s at 2.9 / 2.5 cm. Easing walking stops too (no walkMax rule) put mocapStopPitch's stop
from 2.0 m/s at 2.1 cm (its walk at its own pace fading out); letting the pace snap once under walkMax put the braked stop
from 2.8 m/s at 3.6 cm (the jog-mixed pose to the slow walk in a frame), hence the latch.

## Numbers (worst of six gait phases; ON / OFF; pelvis = cm beyond pace x dt a frame, bone / toe = deg a frame, slide cm)
| Case | ON before (a7147e26) pel / bone / toe / slide | ON after | OFF |
| --- | --- | --- | --- |
| one-frame 1.4 | 1.3 / 11.9 / 11.3 / 0.01 | 1.3 / 11.9 / 11.3 / 0.01 | 1.8 / 29.7 / 15.0 / 0.00 |
| one-frame 2.8 | 7.7 / 31.4 / 11.0 / 5.32 | 1.8 / 15.6 / 11.0 / 0.01 | 5.7 / 43.3 / 24.2 / 0.00 |
| one-frame 4.0 | 8.9 / 39.2 / 12.6 / 0.01 | 1.6 / 14.3 / 12.6 / 0.01 | 5.8 / 40.3 / 40.3 / 7.79 |
| one-frame 5.0 | 10.5 / 47.2 / 17.2 / 2.21 | 2.1 / 17.2 / 17.2 / 0.01 | 8.9 / 41.0 / 41.0 / 2.55 |
| braked 2.8 | 1.6 / 29.7 / 17.2 / 0.01 | 1.3 / 18.9 / 12.1 / 0.01 | 1.6 / 32.1 / 32.1 / 0.00 |
| braked 4.0 | 3.0 / 28.0 / 17.2 / 0.01 | 1.8 / 12.6 / 12.6 / 0.01 | 1.7 / 40.8 / 26.1 / 0.00 |
| braked 5.0 | 3.2 / 30.9 / 17.2 / 0.01 | 1.9 / 17.2 / 17.2 / 0.01 | 13.8 / 103.1 / 103.1 / 9.68 |

The 17.2 deg ankle-toe / bone at 5 m/s is the steady sprint's own (recorded from 2 s, before the stop). One-frame from
5.0: 2.1 cm, under OFF's 8.9 but over the 2 cm line (the fade's first frame).
OFF: the switch-off dump (scratch repro `dump.test.ts`) is byte-identical: md5 9ce3f3d1c70c299dca072d3a4f15f9ea,
31,065,812 B.

## Tests
- New `tests/mocapQuickStop.test.ts` (~5 s): one-frame stops from 1.4 / 2.8 / 4.0 / 5.0 m/s and 0.25 s braked stops from
  2.8 / 4.0 / 5.0, six phases each, ON against OFF: pelvis <= max(2 cm, OFF), bone and ankle-toe <= OFF + 2 deg (or both
  under 24), planted slide < 1 cm. On a7147e26 it fails 4 of 7 (one-frame 2.8 / 4.0 / 5.0, braked 4.0); passes now.
- `tests/mocapSprint.test.ts`: the braked stop's pelvis allowance 3.5 -> 2 cm (measured 1.9).
- Ran one file at a time, all pass: mocapQuickStop 7/7, mocapSwitch 13/13 (its "no allocation per frame" passes too:
  no new allocation, scalars only), mocapFix2 11/11, mocapStopPitch, mocapShortStart, mocapRunTurn 4/4, mocapCrouch 6/6,
  mocapCrouchShift 2/2, mocapSprint 10/10, footPlanner 12/12, animSkeletonIdentity, animSkeletonGuardIdentity.
  `tsc --noEmit -p .` and eslint on the four files clean.

## Open
- The CT player's own instant stop holds the stride (`holdSpeed`, moving share fading at 0.05 s) or blends out over
  `quickStop`; driveRig drives neither, and this change leaves both taus as they were. A held stop from a run with the
  switch on fades the run's lower pelvis to the idle in the same 0.05 s: not measured here.
- One-frame stop from 5 m/s: 2.1 cm beyond pace (OFF 8.9).

## Changelog (for the lead)
- Mocap locomotion (switch on): a sudden stop from a jog, run or sprint no longer pops the body: the standing pose's pace
  falls at most 4 m/s^2 and the fade to the idle is slower from a run (pelvis 7.7-10.5 -> 1.6-2.1 cm a frame, arms
  47 -> 17 deg; a braked stop's 3.2 -> 1.9 cm).
