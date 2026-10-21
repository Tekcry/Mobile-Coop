# anim-skeleton S3b - clip bake and the test clip (2026-10-22)

## Built
- key_clip.py (scripts/anim-keys/py): opt-in channels behind key-file flags `clav`, `fingers`, `legs` (absent: output
  unchanged). Per key: armX.clav {pitch, yaw, roll} deg (Babylon YawPitchRoll in the chest frame, right as written,
  left mirrored: roll + shrugs, yaw - pushes forward); handX.{thumb..little}.{curl, spread} (curl fingers.ts units,
  spread deg / 30); legX.toe (deg, + up) and legX.w (FK weight). mirror_key swaps the hands; fk() reads `toe`.
- Leg frames (`leg_rig`): from the evaluated armature; the hip is twisted about the thigh by psi = atan2(s.x, s.z)
  (folded into +-90 deg, 0 below 1e-8) so the shin lies in the hip's YZ plane; knee = atan2(-v.z, -v.y); ankle =
  (H rx(knee))^-1 Wpel^-1 W_an; toe = the toe's X angle (- = up, the toe roll's sense). Thigh, shin and foot are exact.
- `checkFrames`: a `check` block (pelvis-frame leg positions, chest-frame shoulder carry and lever) that build.mjs
  writes to tests/fixtures/keyed-check-<name>.json; never in the clip module.
- skeleton_test (18 keys, 48 frames, studio entry cycle 2 s, in place): shrug 20 (f5), right shoulder forward 25
  (f14-16), fingers curl in turn (f12-24), fist to f27, open and spread at f31-34; left FK kick, w 0 -> 1 (f24-28),
  chamber f31 (hip 60, knee 70, ankle -20, toe +20), extension f36 (70 / 15), recoil f42, w 0 by f48; right leg w 0.
- tuneKeysMeta.ts regenerated (one line); keyed.ts toe-sign doc fixed; studio.ts one import (32) and one entry (184).
- Track A lines (key_clip.py): flags and helpers 108-160, mirror_key 176-178, fk toe 240-242, per-frame sampling and
  check 388-425, frame keys 463-465, output `check` 482.

## Tests
tests/animSkeletonBake.test.ts: channels and samples; ANIM_BASE guard; FK leg at f31 / 36 / 42 under 0.01 cm,
shoulders at most 0.26 cm (1.5 cm limit; shrug lifts both 5.3 cm, the push moves the right 6.7 cm forward); the keyed
fist closes all 15 right-hand segments along the hero's grip morph (open vs f24 fist in the wrist frame; the first
version compared skeleton-space motion at the rig's rest with bind-frame morph deltas, which the arm hang turns: a test
bug, not an axis bug); each spread + moves away from its neighbour, one finger at a time. animSkeletonClip.test.ts: 29
modules. animSkeletonIdentity.test.ts checks every captured scenario still runs (clips added after the capture are not
in the fixture).

## Results
Code review checker PASS (before the bake). npm run check pass (228 files, 2 484 tests); e2e-studio (100 s) and
e2e-anim (38 s) pass (E2E_JOBS=1, 4191); `git diff bc811528 -- src/anim/clips/keyed scripts/anim-keys/keys` shows only
the two skeleton_test files; rebakes of walk and crouch_idle match the baseline key_clip.py exactly (both differ from the
shipped modules by 1e-5 in a few values, already the case at bc811528); hold_knife identical. GPU:
skeleton-test-studio.webp (LOD0, stage light, 58 KB, `scripts/anim-skeleton/gpushot-s3.mjs`).

## Open
- e2e-studio does not play skeleton_test (lists it only); the GPU script does.
- The fingers need a close camera to judge by eye.
- Key edits on the new channels (KEY_FIELDS) are S4.
