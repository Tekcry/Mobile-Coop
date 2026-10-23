# AF2 - run carriage and steady hands (Michael P1: "hands randomly moving around when running, weird pose when running")

Branch `feature/afp-af2` (off feature/anim-fix-pass 69662cf2, AF0 merged at dba5b6a9). Opus implementer, 2026-10-23.

## What changed and why
All on the mocap share of the standing holstered gait, eased in past a jog (rig pace 2.0 -> 3.0 m/s; the walk, its turns,
starts and stops are untouched). OFF (`?mocap=0`, the hand-keyed set) is byte-identical (mocapSwitch identity fixture).
- Pelvis height (cause 1): the clip's absolute pelvis height (run mean -6.9 cm, sprint -12.5 cm) was added onto the
  procedural one, so the run sat over 76 deg knees. Now the capture's height rides about its own followed mean (two-stage
  follower, `tau` 0.25 s), and from 3.0 -> 4.0 m/s its stance dip is scaled by `bob` 0.35 and the whole lifted by `lift`
  5 cm (1.75 m units). At the jog a lift overreached the trailing leg at toe-off (pelvisDrop jerked 3 cm a frame), so the
  lift starts at the run band.
- Trunk (cause 2): after keyedTrunk, the capture's followed mean pelvis roll / yaw is taken off the hips, its chest mean
  roll / yaw off and the chest's mean pitch replaced by the CT carriage target (15 deg at 4 m/s -> 18 deg at 5 m/s, spine
  carries it); the graph's pelvis / spine roll (the BANK turn bank, followed over 60 ms) goes back over the capture (the
  pelvis its roll, the chest 0.6 of it plus the spine's, as the procedural chain).
- Arms (cause 3): the keyed elbow / wrist points (chest frame) go through a critically damped follower (`armTau` 0.08 s)
  with the points' own rate fed forward by 0.7 (~2 frames late, ~10 % smaller swing; plain smoothing was 5 frames late
  and 30 % smaller); keepElbowOut's 15 deg swivel steps are eased in and out at <= 4 rad/s on the share.
- Not done here: the arm phase alignment across the gait blend (it needs animGraph speedSet, AF1's file this group);
  measured, the blends' jerk is not out-of-phase arms but the pelvis drop below.
Undo (BRIEF A2): MOCAP_LAYERS `pelHeight`, `trunkMean`, `bankWipe`, `armSmooth` back to 1 (1 = as captured, the code
before AF2 exactly; `AFP_BEFORE=1` in tests/mocapRunPose.test.ts runs that). Note the BRIEF's "zero the new entries"
is the other way round: these layers follow the table's convention (1 = the layer as is, 0 = off on the share).

## Files
- src/anim/mocap.ts: MOCAP_LAYERS `pelHeight`, `trunkMean`, `bankWipe`, `armSmooth` (all 0); `MOCAP_RUN_POSE` (new const).
- src/player/characterRig.ts: import line 17; pel y block (kpy); new `mocapRunPose` / `mocapRunTrunk` (+ fields) before
  keyedTrunk and its call at keyedTrunk's end; `mocapRunArm` (+ fields) called in keyedArm before armCap; keepElbowOut
  swivel rate. No allocation (scratch quaternions / typed arrays; mocapSwitch's bytes-per-call test passes).
- tests/mocapRunPose.test.ts (new); tests/mocapSwitch.test.ts:164 (the MOCAP_LAYERS literal gains the four keys: the
  only line outside the AF2 row, needed because it asserts the table exactly).
- docs/anim-fix-pass/after-af2/numbers.md (AF0's table after AF2), changes/feature-afp-af2.md.

## Numbers (headless, CT-driven, 60 Hz; before = AF2 layers at 1 = 69662cf2's code)
| measure | bar | before | after | pass |
| --- | --- | --- | --- | --- |
| pelvis run 4.0 vs hand-keyed run (cm) | within 5 | -6.9 | +4.4 | yes |
| pelvis sprint 5.0 vs hand-keyed (cm) | within 8 | -13.1 | +3.2 | yes |
| pelvis below standing idle, run / sprint (cm, AF0) | - | 11.6 / 18.4 | 0.4 / 2.1 | - |
| stance knee flex at mid-stance, run (deg) | <= 35 | 76.2 | 33.2 | yes |
| stance knee flex, sprint (deg) | (<= 35 if read for the sprint) | 91.5 | 45.0 | no (see open 2) |
| trunk pitch run (deg) | 10-20 | 15.0 | 14.8 | yes |
| trunk pitch sprint (deg) | <= 25 | 31.9 | 22.5 | yes |
| pelvis roll mean, run / sprint / jog straight (deg) | abs <= 1 | -4.64 / -3.57 / -0.9 | -0.07 / 0.29 / -0.1 | yes |
| bank into a 2.5 rad/s turn, run R / L (deg) | >= 3 both | 0.0 / 0.0 (constant roll only) | 6.3 / 5.5 | yes |
| bank, sprint R / L (deg) | >= 3 both | 0.0 / 0.0 | 7.4 / 9.2 | yes |
| wrist jerk run (cm / frame^2) | <= 1.0 | 2.06 | 1.44 | no |
| wrist jerk sprint | <= 1.0 | 3.54 | 2.37 | no |
| wrist jerk jog / run turns | <= 1.0 | 1.70 / 2.06 | 1.28 / 1.45 | no |
| wrist jerk blend 2.0-2.6 (ramp 1.8 -> 2.8) | <= 1.0 | 1.68 | 1.73 | no |
| wrist jerk blend 4.2-5.0 (ramp 4.0 -> 5.2) | <= 1.0 | 3.68 | 2.45 | no |
| keepElbowOut state changes (/ s) | <= 2 | 0.00 | 0.00 | yes |
| worst bone step, any row (deg) | <= max(25, OFF + 1) | 18.3 (sprint 17.2) | 24.8 sprint hipL-kneeL (OFF 23.4) | yes |
AF0 gait rows otherwise unchanged by AF2: planted track, passing gap, plant time, slide, ownership flips and every walk
row are the same to the 0.1 (after-af2/numbers.md vs before/numbers.md).

## Tests
- tests/mocapRunPose.test.ts 4/4; mocapSwitch 13/13; mocapPlayer 10 (1 skipped); mocapSprint 10/10; posture 9/9;
  mocapRunTurn 4/4; footTurn 14/14; footPlanner 12/12; mocapCrouch 6/6; mocapStrafe 12/12; animSkeletonIdentity 1 (1
  skipped); bodyMotion 13 (1 skipped); animFixPass 1/1. `npx tsc --noEmit -p .` clean; eslint clean on the touched files.
- e2e (desktop lane 2, `E2E_GPU=1`, port 4192, `npm run build` fresh at 8798ba63 src): e2e-anim pass 317 ok, 35 s ("leans
  into turns, <= 8 deg": jog 6.54 in, sprint max 6.55); e2e-clip pass, 15 s.
- After sheets (before/README.md commands, port 4189, same lane): after-af2/on-{walkturn,jog,run,run-back,sprint}.png.
  on-run vs before/on-run: the stance leg is near straight under the hips with a light forward trunk (was hips low over
  bent knees, upright trunk); arms compact. The sheet `sprint` scenario moves at ~2.9 m/s (the jog band, below the AF2
  lift band), so it does not show the 5 m/s sprint; the walk-turn sheet is unchanged in character (AF2 is off below 2 m/s).

## Open items
1. Wrist jerk bar (<= 1.0) not met: improved 30-35 % at the run / sprint, flat in the walk -> jog blend (1.68 -> 1.73). What is left:
   (a) the pelvis drop's reach catch at toe-off (characterRig pelvisDrop, `approachTo(.., 0.012)`: the trailing leg
   overreaches and the hips drop 2-6 cm within 2-3 frames; the hips alone jerk 2.6-3.0 cm / frame^2 at 2.3 m/s, before
   and after) - outside AF2's ranges, and tied to the clip / planner feet (AF1); (b) the capture's own swing (at the run
   a 1.0 bar means ~30 % less swing or a ~5-frame arm lag, both visible). Suggest: re-measure after AF1 lands, then a
   follow-up on the pelvis drop's onset rate.
2. Knee bar read for the run (PLAN lists it with the run's pelvis). The sprint's stance knee is 45 deg (was 91); 35 deg
   there needs the hips another ~4 cm up, which straightens the trailing leg at toe-off (knee at the 5 deg cap) and
   raises the sprint's thigh step; running biomechanics put mid-stance knee flex at ~40-45 deg anyway.
3. The run now carries its hips near standing height (0.4 cm below the idle; the hand-keyed run 5 cm below): set by the
   35 deg knee bar. If the after sheets read tall / stiff, `lift` 0.04 and `bob` 0.4 give a 38 deg knee, 1.5 cm lower.
4. keepElbowOut never fires in the headless gait runs (AF0's note too): the swivel rate limit is in place for the game's
   cases (a held tune, a slung weapon) but not measured firing; a game-side probe is still open.
5. The Joints `jog` row (upperArm +-4 deg, animBase.ts) with no `run` row eases out over 3.7 m/s: small, Michael's row,
   not edited (animBase.ts is out of this pass).

## Changelog line
- Mocap run / sprint carriage (P1): hips no longer sit low over bent knees, the capture's sideways pelvis tilt is gone,
  the chest keeps the CT run lean, the body banks into fast turns again, and the arms swing steadier.
