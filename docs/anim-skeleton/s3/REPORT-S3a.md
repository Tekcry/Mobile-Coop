# anim-skeleton S3a - runtime clip channels (2026-10-21)

## Built
- `src/anim/keyed.ts`: three optional channels in `KeyedClipDef` / `KeyedClip` / `KeyedPose`, handled by sample, mean,
  mix, mirror and `clearKeyedArms` like `wrist` and the T1a channels; a clip without one samples identity / 0 with its
  flag off. No animGraph edit needed (it only moves poses through sampleKeyed / mixKeyed / mirrorKeyed / clearKeyedArms).
  - `clav` (8): L then R clavicle quaternion (x, y, z, w), local to the chest.
  - `fing` (20): hand L then R, thumb .. little, [curl, spread] (the `fingers.ts` layout), added to the grip shape.
  - `leg` (22): 11 per side, L then R: hip quaternion (under the pelvis), knee flex rad (+ bends the shin back), ankle
    quaternion (under the knee), toe rad (the toe roll's sense), FK weight 0..1. The weight is interpolated between
    frames but never scaled by amp, so a slower gait cannot lift a planted foot's weight.
  - Mix: clavicles and fingers follow `edits` like the shoulder channel; legs always blend; when only one pose has legs
    its pose is kept and only its weight fades (a blend never bends toward a straight rest).
- Rig (`characterRig.ts` rig parts: `keyedUpper`, `keyedLegs`, `clavFrame`; `clavicle.ts` `clavCompose`): the clip's
  clavicle is a quaternion beside the Euler `rig.clavIn` (clavIn on top; free for S4's Joints row). Clavicle and
  fingers take the keyed arms' weight with free hands, else the drawn set's edit weight. Fingers write `fingerClip` only
  while the clip has the channel, then clear it once.
- FK leg blend: right after `ikStrengthLimbs(2)`, before the Joints offsets and the leg rate limits; each joint slerped
  from the IK result toward the clip by leg weight x keyed body weight. Weight 0 is bit-identical to the IK leg.
- clavFrame: `applyTargets` has no early return, so clavFrame and both arm solves always run together; documented, and a
  test shows readRig's un-carried shoulder with a clip shrug matches a no-shrug rig to 1e-9 (S2 polish note closed).
- `scripts/anim-keys/build.mjs`: exports `clipSource`; writes `clav:` / `fing:` / `leg:` only when the bake has them;
  the build runs only when the file is executed directly.

## Tests
`tests/animSkeletonClip.test.ts` (9): sampling, length errors, leg weight vs amp, mix, mirror (twice = identity), clear,
no allocation (heap growth), the emitter reproduces all 28 shipped modules byte for byte and adds lines only when
present; on the rig: shrug lifts the shoulder, curl changes rig.fingers, mirror swaps, no-channel clip resets, weight-1
leg takes the clip's joints, weight 0 = no-channel rig bit for bit, mirrored left kick.

## Results
`npm run check` pass (224 files, 2 444 tests); S2 identity test unchanged and passing; e2e (lock, E2E_JOBS=1, 4191)
e2e-studio, e2e-anim pass.

## Open
- key_clip.py (S3b) must write the channels in the rig's local frames (limbs hang along -Y at identity rest; body frame
  x right, y up, z forward): Blender bone frames need converting.
- Per-key edits of the new channels (keyOff) are S4 (tuneKeys).
- Leaving FK for IK lands a few mrad off a rig that never used FK (the leg rate limits remember the last frame).

## Check
Fresh checker PASS (13 test files, 141 pass; keyed.ts consistent in every function; mirror correct for the rig's
frames; FK blend placement, weight-0 exactness, no allocation; file areas clean; direct-run guard works on Windows).
Fixed: the build.mjs `--preview` ffmpeg label path (`C\:` had become `C\:` in the re-indent). Polish: an FK leg at
w > 0 skips the anatomy guards (reach, knee-floor lift, knee-gap bow, wall knee swing) and a planted foot at w > 0
slides from the planner's world foot (footsteps, noise): clip authors keep w at 0 on contact frames; the clavicle /
finger weight does not fade with reachL.w / reachR.w like keyedArm; FK -> IK lands a few mrad off; the direct-run guard
would fail through a symlinked path.
