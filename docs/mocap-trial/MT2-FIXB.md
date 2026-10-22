# mocap-trial-2 - fix B: CHECK-3 items 3 and 5

2026-10-23, implementer (Opus), branch feature/mt2-fixB off feature/mocap-trial-2 2b9e96cb.

## Result
- Item 3 (walking flicks at CT's 7.85 rad/s): done. All 9 plans pass. tests/mocapPlayer.test.ts item 3 is un-skipped:
  it fails on 2b9e96cb and passes here.
- Item 5 (the switch toggled mid-move): partly done. 5 of the 10 plans pass: walk 1.4 and sneak 0.8 at both offsets,
  jog 2.8 at offset 0. The other 5 are much better but still fail (below). Item 5 stays `itOther` (skipped) with the
  0 / 0.37 offsets added. `MOCAP_PLAYER_ALL=1` runs it.
- Switch OFF is byte-identical. The dump repro gives 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea.
- Every required test file passes, run one at a time. tsc and eslint are clean.

## Item 3: cause and change
The checker named the turn slot's one-frame cut. The traces showed that cut is not the main cause. Four things add up:
1. **The pelvis lurch (2.8-3.0 cm)** (src/anim/mocap.ts). The turn clip runs at the game's turn speed. At 7.85 rad/s
   its pelvis swing (5 cm out and back) and its last-25% fade-out both happen within about 4 frames. The keyed pelvis
   side offset moved 2.5 cm in a frame.
   - A turn on the move faster than `MOCAP_SLOT.turnPlay` 4 rad/s now plays at 4 / (the pass's fastest rate) of its
     weight. 4 rad/s is the rate the sweeps already pass at.
   - As the brief asked, a turn on the move that is cut off (yaw rate under half `turnRate`, or past `walkMax`) eases
     out over `turnOut` 0.2 s with a smoothstep from its weight, not by `tau`.
   - Turns on the spot are unchanged (fix 2's spin rules: reverse, slow spin, walk-off). mocapFix2 passes 11/11.
   - Also tried and dropped: capping the clip's play rate. It kept the slot on longer and planted slides grew to 3-5 cm.
     A KEY_PEL_RATE limit on the pelvis side offset was never reached once the weight was scaled.
2. **Ankle-toe 25-36 deg at 2 m/s** (src/anim/footPlanner.ts, gated on `i.clipFeet`). There were two landing snaps:
   - A clip step set down as the turn took the feet was lifted again the next frame by the clock (window 0.95 done) and
     set down 0.45 rad round. Now a foot planted under 0.05 s ago stays down when its swing window is >= 0.9 done. This
     applies only in a flick (`FLICK_RATE` 5 rad/s). Applied always, it pushed mocapSwitch's walk turn at 4 rad/s and
     mocapShortStart's 2 m/s start to 2.03 / 2.11 cm pelvis.
   - A turn swing's window shrank under it (0.46 -> 0.18 s). The yaw, limited to `SWING_YAW_RATE`, lagged 33 deg and
     snapped at landing. Now the rate is at least what lands the foot on its landing yaw, spread over the frames left.
3. **The 1.4 x 180 planted slides 2.1-2.5 cm** (src/player/characterRig.ts, clip feet on hand only). At a landing the
   knee pole's swing / stance share swapped from 0.15 to 0.5 in a frame. The knee swung round, the hip / knee rate
   limit held it, and the landed ankle missed its plant by 2.4 cm. The share now moves at most 1 / `POLE_SWAP`
   (0.25 s) a second.

## Item 5: cause and change
Toggling swaps the clip set, the clip feet, the slots and the rig's mocap layers in one frame. On the way off, the
planner also took a clip swing in the air onto its own clock swing (a 60 cm jump in a frame at a jog).
1. **Planner** (footPlanner.ts; `mocapOff` is true only on the frame `i.mocap` goes false). A clip swing taken over the
   frame the switch goes off keeps where it is. The difference fades over the swing that is left (`offDur`, at least
   `OFF_FADE`), so the foot lands on its target, not short of it.
2. **Rig cross-fade** (`switchFade`, `xfPlant`; it starts only on a toggle of a rig that has already posed 2 frames).
   Every frame records the shown skeleton's local rotations, the hips, the ankles and the knees. This only reads, so
   a rig that is never toggled poses exactly as before.
   - On a toggle, each node's offset from where it was heading (last frame carried on by its last step) to the new
     pose is taken. For `SWITCH_HOLD` 0.05 s it is taken again each frame. Then it eases out over `SWITCH_FADE` 0.25 s.
   - While the fade runs:
     - Each node turns at most `SWITCH_STEP` 0.35 rad a frame.
     - The hips move at most `SWITCH_HIPS` (1.5 / 3 / 1 cm side / height / forward) a frame. The fade runs on, with
       the limits opening up, until nothing is held back.
     - A planted leg is re-solved onto the new pose's plant from the faded hips, with the knee side taken from last
       frame. Its rate limit is off during the fade, because the limit held a planted ankle 3.6 cm off its plant. The
       hips come down if the leg cannot reach.
     - A swinging ankle runs out its share by its landing and moves at most `SWITCH_FOOT` 16 cm a frame (root frame),
       then is IK-solved.
   - fix 2's switch-off clean-up (`clipFootOff` / `mocapWas`) and the graph's clip-duty edges are unchanged.
     mocapFix2 passes 11/11.

## Numbers (ON before -> after; OFF; pelvis cm / worst bone deg / ankle-toe deg / slide cm)
Item 3, every plan passes:

| Plan | before | after | OFF |
| --- | --- | --- | --- |
| 1.4 x 90 | pel 2.86 | 1.24, toe 19.6 | 0.99 |
| 1.4 x 180 @0.41 / @0.83 | pel 2.86 / 2.94, slide 1.35 / 2.06 | 1.61 / 1.83, slide 1.14 / 0.56 | 0.22 / 1.40 |
| 2.0 x 90 | pel 2.87, toe 25.2 | 1.80, toe 18.1 | 0.24, 15.4 |
| 2.0 x 180 @0 / @0.41 | pel 2.86 / 2.96, toe 31.7 / 36.1 | 1.57 / 1.73, toe 16.8 / 19.8 | 0.45 / 3.64, 29.2 / 30.5 |
| 2.8 x 180 @0 / .41 / .83 | pel 2.79-2.95 | 1.79-1.89 | 0.67-0.74 |

Item 5 (offset 0 / 0.37):

| Move | before | after | OFF | |
| --- | --- | --- | --- | --- |
| walk 1.4 | pel 2.35 / 2.10, bone 30.8 / 38.3 | 0.44 / 0.45, 18.1 / 20.3 | 0.03, 8.9 | pass |
| jog 2.8 | pel 12.38 / 5.91, bone 47.2 / 54.4 | 0.87 / 0.87, bone 22.3 / 28.0 | 0.74, 17.0 | @0.37 fails: hip-knee 28.0 |
| run 4.0 | pel 14.53 / 5.23, bone 60.8 / 68.2, slide 5.41 | 2.62 / 2.43, 33.8 / 32.9, slide 0.01 | 1.66, 21.2 | fails |
| sprint 5.0 | pel 2.38 / 2.45, bone 61.9 / 53.6, slide 0 / 2.00 | 2.11 / 2.35, 23.6 / 25.4, slide 0 | 1.50, 23.4, toe 19.7 | fails: pelvis; @0.37 toe 25.4 |
| sneak 0.8 | pel 3.69 / 3.24 | 1.14 / 1.51 | 0.03 | pass |

Items 4 and 6 after this change are the same as on 2b9e96cb (both run here), with one exception: (b) the 5.0 x 180
flick's planted slide is 2.09 -> 2.22 cm (bone 23.3 -> 21.4).
- 4: spot flick 180, slide 2.06; spot spin 6, slide 2.56.
- 6:
  - (a) crouch at 2.8, knee-ankle 25.4.
  - (c) sneak flicks: slide 2.06; at offset 0.5, toe 28.3 and slide 15.28 (OFF 16.87).
  - (d) 5.0 stop: elbow-wrist 30.2, pelvis 4.27.
  - 1.4 x 0.3 s stand, go 1.99: pelvis 2.05.
  - (e) draw at 4.0 passes.

## Item 5: what is left
- **Run / sprint pelvis.** The failing steps (2.1-2.6 cm) mostly come after the fade, 0.5-0.7 s after an ON -> OFF
  toggle. The OFF gait starts from the mocap gait's stance and stride: one planted foot is far back, the pelvis drops
  34 cm for it and lets go at toe-off (6.4 cm in a frame). That is the planner's hand-off of the stride, not the pose.
- **Leg bones at run and jog @0.37 (28-34 deg).** The new pose's legs keep changing for some frames after the toggle
  (unlimited planted legs, the planner's offset fades), and the swing leg's IK follows.
- **Next:** hand the stride over, not only the swing: carry the clip's stance / swing timing into the planner's clock
  for one cycle at switch-off (as the turn hand-off does with `CF.on` false), and the reverse at switch-on.

## Checks
- These pass, one file at a time:
  - mocapPlayer 3 passed + 3 skipped
  - mocapSwitch 13/13; allocation "bytes per frame: off 1431.3, on 1441.5, filled 1503.7, toggled 1473.9". That test
    drives the graph only, and the graph allocates nothing new.
  - mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn 4/4, mocapCrouch 6/6, mocapCrouchShift 2/2
  - mocapSprint 10/10, mocapQuickStop 7/7, footPlanner 12/12
  - animSkeletonIdentity and animSkeletonGuardIdentity: 1 passed + 1 skipped each
- tsc and eslint (the 4 files) are clean. The OFF dump is identical (above). The zz probes are deleted.
- No allocation per frame: the node list and buffers are made once on the first frame. Everything else is
  Float64Array or module scratch.
- Not run: e2e, GPU, the repro2 sweeps.

## Files
- src/anim/mocap.ts: `turnPlay`, `turnOut`, `turnPeak`, `outT` / `outW`.
- src/anim/footPlanner.ts: `FLICK_RATE` stay-down, the landing-yaw catch-up, `mocapOff` takeover, `offDur`.
- src/player/characterRig.ts: `POLE_SWAP` / `poleShare` / `poleWant`, `switchFade` / `xfPlant`, `SWITCH_*`, and the
  planted legs unlimited during the fade.
- tests/mocapPlayer.test.ts: item 3 un-skipped; item 5 gets offsets 0 / 0.37.

## Changelog (for the lead)
- Mocap locomotion: walking flick turns at full turn speed no longer jolt the hips or snap the ankle as the flick ends.
- Mocap locomotion: turning the mocap switch off or on mid-move now cross-fades over about a quarter second, instead
  of popping the pose. Running and sprinting still show a small hip dip after switching.
