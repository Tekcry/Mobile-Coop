# mocap-trial-2 - fix C: CHECK-3 items 4 and 6

2026-10-23, implementer (Opus), branch feature/mt2-fixC off feature/mocap-trial-2 e28f0b62.

## Result
- Item 4 (spot turns): done. Spot flick 180 and spot spin 6 planted slides 2.06 / 2.56 -> 0.01 / 0.01 cm (OFF 0.01).
- Item 6: all done.
  - (a) Crouch at 2.8: knee-ankle 25.4 -> 15.4 deg (OFF 17.0).
  - (b) 5.0 x 180 flick: slide 2.22 -> 0.00 cm.
  - (c) Sneak flicks: slide 2.06 -> 0.69 cm; ankle-toe 28.3 -> 20.0 deg (OFF 25.9).
  - (d) Stop from 5.0: elbow-wrist 30.2 -> 26.2 deg (OFF 28.0).
  - Stop-hold release at 1.4 (go 1.99): pelvis 2.05 -> 1.35 cm (OFF 1.54).
- tests/mocapPlayer.test.ts: items 4, 6b / 6c, 6d / 6e and 6a are un-skipped. Each fails on e28f0b62 and passes here.
  Item 5 (switch toggle) stays skipped. Its numbers are unchanged from fix B.
- Switch OFF is byte-identical. The dump repro gives 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea.
- Every required test file passes, run one at a time. tsc and eslint are clean.

## Causes and changes
All changes are switch ON only. Each is gated on `LOCO.mocap` plus one of these:
- the mocap share's pelvis-follow layer (`mocapLayerK(MOCAP_LAYERS.pelvisFollow, keyMocap) < 1`, called `poleM`);
- the captured gaits (`LOCO.set.run !== HAND_KEYED_SET.run`, or `crouchWalk !== null`);
- a running clip hand-off (`clipPitchT`, never set with the switch off).

Placeholder clips set every layer to 1. They stay bit-identical (mocapSwitch).

1. **Item 4** (characterRig.ts, the knee pole). The planner's feet were right. The rendered ankle missed a spot turn's
   landing by 2.1 cm for one frame. The cause:
   - On the mocap share the hips do not follow the feet (pelvisFollow layer 0).
   - At the landing the knee pole swapped from the swing share to the stance share in one frame.
   - The hip / knee rate limit held the leg, so the ankle landed short. It caught up the next frame, which reads as a slide.

   This is fix B's mechanism, but here clip feet are null (the turn-in-place slot). Fix B's `poleShare` ease (1 / POLE_SWAP
   a second) now also runs on `poleM`, until a swap under way has run out. fix2's `easeFrom` was not the cause and is
   unchanged.
2. **6b** (characterRig.ts, the leg rate limit). At a 5 m/s flick's landing the knee leaves the swing's bow and pole, so
   the leg turns about 22 deg. The limit held the landed ankle 2.2 cm off its plant for one frame. Under `poleM`, a planted
   leg on its landing frame (`plantT` 0) is unlimited, as fix B does during the toggle cross-fade. The step is then 22 deg,
   under the 24 deg line.
3. **6c** (characterRig.ts). At a crouched sneak flick's toe-off, the other foot landed and the limited leg turned the
   foot off the planner's yaw and pitch. The ball slid 2.06 cm. pop1's fix (a limited leg's foot keeps the planner's yaw
   and pitch) used to apply only with clip feet. It now also applies on `poleM` and in the crouched capture
   (`crouchWalk` set, crouch > 0).
4. **6d** (animGraph.ts). With the captured gaits, the stop hold's fade out of the stride uses tau 0.08 (`HOLD_TAU_CAPT`;
   0.05 otherwise). The 5 m/s stop's forearm went from 30.2 to 26.2 deg, and its pelvis from 4.27 to 3.21 cm.
5. **Hold release** (characterRig.ts). The cause is not the graph's `locoSpeed`. Easing it changed the pelvis by only
   0.01 cm, so that change was dropped. The real cause:
   - During the hold the hips settle over the feet (`restShift`, -7 cm on the mocap pose; +5 cm OFF).
   - At the release a foot lifts, so the settle lets go with tau 0.06: 1.7 cm in one frame.

   Under `poleM` the settle now moves at most `REST_SHIFT_RATE` (0.6 m/s, 1 cm a frame). Side effect: item 2's 2.8 m/s
   start / stop pelvis dropped from 3.19-3.93 to 1.47-1.55 cm.
6. **6a** (footPlanner.ts). As the crouch takes the jog's mocap share, a clip swing is handed to the planner at s 0.90
   (`clipPitchT` 0). swingTo's hand-off keeps the foot where it is and fades the whole 23 cm gap. The clock's late-start
   branch (`FRESH_LATE`) then overwrote that offset with an 8 mm residual, so the foot jumped 23 cm the next frame
   (knee-ankle 25.4). The late-start branch is now skipped on a hand-off frame.

No new allocation. Every change is plain arithmetic on fields, plus one more `poleWant` call. mocapSwitch's
"no allocation per frame" passes before and after.

## Numbers (ON before (e28f0b62) -> after; OFF; pelvis cm / worst bone deg / ankle-toe deg / slide cm)
| Plan | before | after | OFF |
| --- | --- | --- | --- |
| 4: spot flick 180 | slide 2.06 | slide 0.01, bone 17.9 | 0.01, 17.5 |
| 4: spot spin 6 | slide 2.56 | slide 0.01, bone 20.1 | 0.01, 20.1 |
| 6a: crouch at 2.8 | knee-ankle 25.4 | bone 15.4 | 17.0 |
| 6b: 5.0 x 180 @0.83 | slide 2.22, bone 21.4 | slide 0.00, bone 21.4 | 0.01, 60.9 |
| 6c: sneak 1.0 x 90 @0 | slide 2.06 | slide 0.69 | 1.23 |
| 6c: sneak 1.0 x 90 @0.5 | toe 28.3, slide 15.28 | toe 20.0, slide 13.67 | 25.9, 16.87 |
| 6d: stop from 5.0 | elbow-wrist 30.2, pel 4.27 | 26.2, pel 3.21 | 28.0, 11.82 |
| 1.4 x 0.3 stand, go 1.99 | pel 2.05 | 1.35 | 1.54 |
| 6e: draw at 4.0 | knee 21.7 (passing) | 21.7 | 20.8 |
| item 2: 2.8 x 0.3, go 1.60 / 1.86 / 2.12 | pel 3.19-3.93 | 1.47-1.55 | 4.67-5.39 |

Items 1-3 still pass. Item 5 is the same as in fix B: run 4.0 and sprint 5.0 at both offsets, and jog 2.8 at offset
0.37, still fail.

## Test changes
- tests/mocapPlayer.test.ts:
  - `4` un-skipped.
  - New `6b / 6c` (5.0 x 180; sneak flicks at offsets 0 and 0.5).
  - New `6d / 6e` (stop from 5.0; the 1.4 hold release; draw at 4.0).
  - New `6a` (crouch at 2.8).
  - `sneakFlick` moved to module scope. Item 5 stays `itOther`.
- tests/helpers/mocapPlayer.ts, `playerFails`: a slide fails only past 2 cm **and** past OFF's. This is needed for the
  sneak flick at offset 0.5: OFF slides 16.87 cm (the crouched band) and ON 13.67. CHECK-3 counted only its ankle-toe
  there. Every other plan's OFF slide is under 2 cm, so the rule is unchanged for them.

## Checks
- One file at a time, all pass: mocapPlayer (7 + 1 skipped), mocapSwitch 13 (allocation included), mocapFix2 11,
  mocapStopPitch 1, mocapShortStart 1, mocapRunTurn 4, mocapCrouch 6, mocapCrouchShift 2, mocapSprint 10,
  mocapQuickStop 7, footPlanner 12, animSkeletonIdentity, animSkeletonGuardIdentity.
- `npx tsc --noEmit -p .` and `npx eslint` on the changed files are clean.
- The OFF dump repro is byte-identical (above).

## Files
- src/player/characterRig.ts: `poleM` pole-share ease, the landing-frame unlimited planted leg, the pop1 foot-keep
  extended, `REST_SHIFT_RATE`.
- src/anim/animGraph.ts: `HOLD_TAU_CAPT`.
- src/anim/footPlanner.ts: `handNow` skips the late start on a clip hand-off frame.
- tests/mocapPlayer.test.ts, tests/helpers/mocapPlayer.ts.

## Open
- Item 5 (switch toggle), out of scope: run / sprint pelvis, and leg bones at jog @0.37 and run (MT2-FIXB "what is left").
- 6c's crouched sneak flick: the 45-52 deg knee-ankle / ankle-toe steps and the 13-17 cm slide at offset 0.5 are the
  same OFF (pre-existing, not the switch).

## Changelog (for the lead)
- Mocap locomotion: spot turns, sprint and crouched sneak flicks keep the planted foot on its spot. Crouching mid-jog no
  longer snaps the swing leg. A CT stop's hold fades out more softly and no longer jolts the hips when you move again.
