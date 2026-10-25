# I3 report: stand-to-crouch and crouch-to-stand on Wren
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i3).

## What changed
- `src/anim/mixamo.ts`: imports (:36-38); `MIXAMO_ON` rows `stand_to_crouch` / `crouch_to_stand` (:85-92, both off,
  below); `resolveMixamoStance()` called as one line at the end of `resolveMixamo` (:147); the I3 block (:204-229):
  `WREN_STANCE` (the same object always), `STANCE_SHOT { edge: 0.15, flip: 0.08 }`, `resolveMixamoStance` (flag and row
  only, A2). The block sits above the load-time `setMixamo` line (`WREN_STANCE` must exist when it first resolves).
- `src/anim/animGraph.ts:57` own import line; `:942-954` the member group (`snDir`, `snOld`, `snPrev`, `snFlip`, `snK`,
  `snW`, `snDt`, poses `kSn` / `kSn2`); `:2013-2021` the call after `keyedSet` (Wren with a shot only, else skipped);
  `:2247-2299` `stanceShot`. None of I1's or I2's lines touched.
- `tests/mixamoStance.test.ts` (new, 9 tests), `changes/feature-mixamo-i3.md`.

## How it plays
- By progress on the game's stance blend: down `p = crouchK`, up `p = 1 - crouchK` (the graph's clamped, eased
  `i.crouch`). The stance clock is the controller's; the keyed pelvis height is bit-identical on and off every frame.
- `p` maps to the phase `p x (N - 1) / N`: `sampleKeyed` wraps phase 1 to frame 0 (a 1 - 1e-6 clamp would land 99.99%
  of the way back to the first frame), so p 1 is the take's last frame exactly.
- Weight: `smoothstep(min(k, 1 - k) / edge) x still share x (1 - drawn) x (1 - wall) x (1 - smoothstep(kneelW))`; skipped
  under 1e-4. A reversal cross-fades the old direction's sample into the new over 0.08 s; a direction whose row is off
  fades by the same flip instead of cutting. Mixed with `edits` false (the takes key pelvis, trunk, arms and head only).

## A8 readings (headless Wren rig, standstill holstered, tests/mixamoStance.test.ts (d))
Player stance times: `MOVEMENT.crouchTime` 0.22 s, `standTime` 0.22 s (the brief's 0.25 / 0.3 are `ENEMY_MOTION`).

| Clip | Measure | Mixamo | Hand-made blend | Limit |
| --- | --- | --- | --- | --- |
| stand_to_crouch (2.58 s into 0.22 s, 12x) | largest bone step a frame | 18.5 deg (neck-head) | 25.8 deg (elbowL-wristL) | 25 |
| | stand <-> crouch velocity pop (e2e-anim) | **20.16 cm** | 6.48 cm | 7.5 |
| | knees x hips | 0.61-0.76 | 0.67-0.76 | 0.5-1.25 |
| | knee outside ankle | 5.56 cm | 4.23 cm | 3 |
| | elbow outside shoulder | **12.61 cm** | 7.21 cm | 6 |
| | planted slide | 0.00 cm | 0.00 cm | 1 |
| crouch_to_stand (2.17 s into 0.22 s, 10x) | largest bone step a frame | 24.3 deg (elbowR-wristR) | 14.3 deg | 25 |
| | stand <-> crouch velocity pop (e2e-anim) | **11.33 cm** | 6.35 cm | 7.5 |
| | knees x hips | 0.85-1.02 | 0.85-1.02 | 0.5-1.25 |
| | knee outside ankle | 2.36 cm | 1.76 cm | 3 |
| | elbow outside shoulder | 7.82 cm | 6.75 cm | 6 |
| | planted slide | 0.00 cm | 0.00 cm | 1 |
| reversal at crouchK 0.5 (both rows forced on) | largest bone step a frame | 18.5 deg | 13.1 deg | 25 |
| | stand <-> crouch velocity pop | 29.00 cm | 13.91 cm | 7.5 |
| | elbow outside shoulder | 15.05 cm | 7.21 cm | 6 |

`MIXAMO_ON`: `stand_to_crouch` false, `crouch_to_stand` false (Studio only, A8). Rule as I1: within the limit where the
hand-made blend is, else no worse than it (tolerances 1 deg / 2 mm). Both fail the velocity pop (the take's whole motion
squeezed 10-12x into the game's change); stand-to-crouch also its elbows. A wider edge fade (0.5) does not rescue them:
pop 20.1 / 15.5 cm, stand-to-crouch bone step 27.0 deg.

## Tests
- `tests/mixamoStance.test.ts` 9/9: (a) off identity after on / off, and on with both rows off; (b) the table by row;
  the keyed pose moves mid-change and equals off settled; moving and drawn equal off; (c) pelvis height identical every
  frame, 14 frames each way (0.22 s), progress equals the blend and the shot ends the frame it reaches 1, p 1 samples
  the last frame; (d) A8 above (asserted equal to the shipped rows), no pop on a full change or a reversal; (e) guard and
  non-Wren carrier identical with the flag on; bytes a frame through stance changes 930.0 on, 919.3 off (+10.7, under
  one boxed double: the graph passes doubles to `sampleKeyed` / `mixKeyed` as its other keyed sets do).
- Run: `npm run typecheck:fast` clean; eslint on the three files clean; the brief's 10 vitest files (mixamoStance,
  mixamoSwitch, mixamoTraverse, mocapSwitch, mocapCrouch, crouchPops, crouchEntryRig, mocapGuards, animSkeletonIdentity,
  changesFragments): 64 passed, 1 skipped (after the 1f1ad42b merge).
- Pending laptop run: `affected-e2e` for `src/anim`, `e2e-anim`, `e2e-move`, `e2e-stealth`, `anim-audit`; no look video
  while both rows are off.

## Deviations
- Member names `kSn` / `sn*` (the brief's `kSt` / `stShare` exist: the mocap strafe's).
- The kneel gate is `1 - smoothstep(kneelW)` (the graph's own kneel weight), not "0 when `i.kneel`": `i.kneel` goes true
  0.05 s (`KNEEL_STILL`) into every still crouch, which would cut the shot 3 frames in, and the holstered squat never
  kneels (`wantKneel` false).
- The shot is mixed right after `keyedSet` (before the drawn set), so the drawn set mixes over it by its share.
- Added the e2e-anim stand <-> crouch velocity pop (`CROUCH_POP`) to the A8 measures: it is the e2e check these
  changes face, and the one both captures fail.
- Merged origin/feature/mixamo-i2 28566cd0 (I2's fix round: crawl row off) and 1f1ad42b (traverse inertializer, docs; STATE.md
  conflict only), I1's rows kept (one conflict in
  `MIXAMO_ON`).

## Open
- A capture that could pass needs the stance change itself retimed (a slower game stance is Michael's call, not this
  slice's) or a take trimmed to its core 0.3-0.5 s (M3 / Studio work). The hand-made down change already steps a
  forearm 25.8 deg in one frame (limit 25), measured here.
