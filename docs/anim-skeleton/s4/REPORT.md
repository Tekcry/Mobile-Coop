# anim-skeleton S4 - tuner rows (2026-10-22)

## Built
- Joints: `clavicleL` / `clavicleR` appended to JOINTS (B's `tuneJoints.ts`, indices unchanged). The rig applies them in
  `clavFrame` with `jointApply(q, J.clavicleX, true)`: base + delta, eased, chest frame, on top of `clavIn` and the clip.
  Raw chest-frame angles; with the mirror lock, one + roll shrugs both. Old exports load as 0.
- Keys fields on every keyed clip (A's KEY_FIELDS, appended): `armX.clav.{pitch,yaw,roll}`,
  `handX.<finger>.{curl,spread}`, `legX.d.{hipPitch,hipYaw,hipRoll,knee,anklePitch,ankleRoll,toe}` (anatomical degrees;
  `LEGD_SIGN` converts them to the rig frame), `legX.w`. Hands and legs swap in the mirror. Live edits go through the
  KeyedOffsets clav / fing / legd / legW tables (`buildSkeleton` in tuneKeys).
- `legd` channel (keyed.ts, `KD`, 14 floats a frame): sample, mean, mix, mirror (yaw and roll negated), kept by
  clearKeyedArms.
- Rig `keyedLegDeltas`, after the S3a FK blend: raw on the swing leg. On a planted leg it re-solves onto the plant
  (`plantKnee` in the pure `src/anim/legDelta.ts` on the side of the raw leg turned onto the plant line, the thigh
  hinge-aligned, the shin back on the plant, the foot's planted rotation x the ankle delta), blended by `legdContactW`
  over the ends of the swing so nothing pops.
- `rig.footSlide {l, r}`: cm the ankle is off the plan during the current contact (0 when not planted). Course Ready
  shows it in the studio (tuner v3).
- Bake: applyKeyEdits already writes the nested `handX.<finger>` and `legX.d` objects (tuneBake.ts untouched).
  key_clip.py opts a clip in automatically on non-zero clav / finger / delta values and writes `legd`; build.mjs emits it.

## Edits in other tracks' files (for the PR body)
- B: `src/anim/tuneJoints.ts:53-56` (two JOINTS entries).
- A: `src/anim/tuneKeysFile.ts:9-12, 36-42, 48-58, 69, 91-119, 163-165, 191-196, 273-274, 491-500` (fields,
  `mirrorDelta`, `mirrorKey` swaps the hands, `addDeltas` starts finger and `d` objects empty); `src/anim/tuneKeys.ts:21,
  24, 114-120, 532-598, 685-697`; `src/anim/tuneKeysMeta.ts` (regenerated: `legs?`); `scripts/anim-keys/py/key_clip.py:
  119-128, 421-424, 480`.
- Ours: `scripts/anim-keys/build.mjs:34-36`; rig parts of `src/player/characterRig.ts` (17-18, 267-281, 544-567,
  1824-1826, 2240-2245, 2580-2710).

## Results
`npm run check` pass (232 files, 2 538 tests); e2e-studio (136 s) and e2e-anim (38 s) pass (E2E_JOBS=1, 4191).
`tests/animSkeletonRows.test.ts` (11): on jog key 0 with knee +25, hip pitch +15, hip yaw +20 the planted foot error is
0.00 cm (float32; limit 0.5 cm), the knee moves 1.17 cm, footSlide 1e-5 cm; with the re-solve bypassed the foot moves
4.61 cm and footSlide reads 4.01 cm (not vacuous). Moving jog with 6 deltas: footSlide max 0 (bypassed: 18 cm).
`tests/tuneJoints.test.ts`: joint count 21 -> 23. A Blender probe bake of a temporary jog copy (deleted) auto-opted in
with no flags; `legd` matches the key lerp within 4e-6 rad, trunk unchanged. No clip module or key file changed. GPU
shot `jog-s4-rows.webp` (LOD0, 41 KB, `scripts/anim-skeleton/gpushot-s4.mjs`).

## Open
- `legX_w` shows on every clip (A's panel can hide it with `KEY_CLIPS[].legs`).
- The clavicle rows are labelled "Whole body" in `src/ui/tunerTarget.ts` (A's file).
- footSlide does not count rate limits or Joints offsets applied after the leg stage.
- e2e-studio does not assert the new rows.

## Check (2026-10-22)
Fresh checker: one fix. The rig-level allocation test compared tuned jog with plain walk under a 150 KB margin while
the whole rig's heap already grows 5-12 MB per 3000 frames before S4 (plain walk and jog alike): noise, not a leak in
the leg stage (none found by reading `keyedLegDeltas`). Fixed by the job lead: the test now measures the pure per-frame
pieces (`plantKnee`, `legdContactW`) over 100 000 iterations with a typed accumulator (a captured `let` boxed a 16-byte
number per iteration, the whole first failure); 3 / 3 runs pass. `npm run check` re-run under the lock: pass (232
files, 2 538 tests, 0 lint errors). Polish: a symmetric clamp `a >= -lt` in plantKnee (cannot trigger today).
