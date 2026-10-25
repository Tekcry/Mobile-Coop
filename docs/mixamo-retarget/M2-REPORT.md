# mixamo-retarget M2 - report
Owner: Player Build (M2 builder, Opus). Status: done (2026-10-25). Branch `feature/mixamo-retarget-m2`. Plan: `PLAN.md` M2.

## Built
- `scripts/mocap/mixamoMap.mjs` (pure): `MIXAMO_MAP` (slot -> rotation bone, end bone, parent slot, kind), `MIXAMO_TO_SLOT`,
  `MIXAMO_FPS` 30, the bone lists, `resolveMixamoBones` (prefix check, missing / duplicate / re-parented bone errors,
  missing fingers and end bones listed) and `mixamoSlots` (the slots a file supports, with fallbacks).
- `scripts/mocap/mixamoTake.mjs`: `loadMixamoTake(slug, { dir, rig, floor })` reading `build/mocap/mixamo/raw/<slug>.json`
  (dir injectable), `takeFromDump(dump, opts)`, `mixamoLoader(opts)` for injection, `MIXAMO_LICENCE`, `IN_PLACE_M` 0.05,
  and a CLI (`node scripts/mocap/mixamoTake.mjs [slug ...]`: selfCheck + report per dump, with Wren's numbers).
  Returns the `loadTake` shape (`take`, `subject`, `skel`, `frames`, `fps` 120, `pos`, `quat`, `dead`, `zeros`, `bytes`)
  plus `source: 'mixamo'`, `inPlace`, `travel`, `facing`, `report`.
- `scripts/mocap/retarget.mjs`: `retargetTake(rig, take, { load })`; `buildSlot(rig, pick, choice, suffix, takeInfo,
  { load, licence, inPlace })`; `export` on `SEG_END`; `CMU_LICENCE` constant (the old literal). `inPlace`: the root is
  fixed at the first frame's pelvis ground point and heading for every frame (loops and one-shots), so speed and
  cycle distance are 0; the intermediate gains `inPlace: true` and one note line only when the option is on.
- `scripts/mocap/analyze.mjs`: `analyzeTake(entry, { load })` only.

## Decisions
- **Slots are CMU-style bones.** Each slot starts at its parent slot's tip and ends at the HEAD of a named child bone
  (never a tail). Where a Mixamo child head is not the parent slot's tip, a rigid `offset` slot carries the hop in the
  parent bone's frame, as CMU's `lhipjoint`: `spinejoint` (Hips -> Spine head), `l/rhipjoint`, `l/rclavjoint` (Spine2 ->
  Shoulder head), `l/r<finger>0` (Hand -> finger 1 head). Zero-length `hub` slots `lowerneck` and `l/rwrist` exist because
  analyze.mjs reads those CMU names. `l/rfingers` and `l/rthumb` are aliases of the middle finger and thumb first
  joints. Every name retarget.mjs and analyze.mjs read is present, so neither needed more than the loader injection.
- **Spine (A6)** as the plan: `upperback` = Spine1, `thorax` = Spine2, `lowerback` = Spine (chain only).
- **Required bones:** the 22 non-end bones of Mixamo's no-finger skeleton. Fingers are optional per finger (dropped,
  listed in `report.missingFingers`; `lfingers` / `lthumb` become hubs). End bones are optional with fallbacks along
  the parent segment (`extend`: toe 0.6 x the foot, head 1.7 x the neck, distal finger 1 x the middle phalanx, hand 0.4
  x the forearm when the middle finger is missing), listed in `report.fallbacks`. An end bone whose parent is not the
  slot's rotation bone is an error (the rigid offset would be wrong).
- **Positions are rebuilt by FK** from the hips head and the converted rotations with the rest offsets measured from
  the child heads. Bone lengths are then exact (selfCheck's 0.1 mm drift test), and slerp-resampled rotations and the
  positions agree at every 120 fps frame (resampling raw heads would shorten fast segments between source frames by
  up to ~3 mm). `report.fkErrMm` / `fkErrSlot` is the largest gap between the FK tips and the dump's own posed heads
  over every source frame: a dump check (near 0 unless a non-hips bone has translation or scale keys).
- **Frame change:** basis M = [right; up; forward] from the rest pose; right = hip line, forward = up x right, averaged
  with the toe direction when within 45 deg (`report.facing`: `turnDeg` from Blender -Y, `hipToeDeg`, `from`).
  det M = -1; rotations convert as `M R M^T` by matrices. `skel.bones.dir` is stored in the ASF file convention (x
  mirrored), since retarget.mjs and asfamc `restPose` convert it with `-x`; `metres` 1, identity axes.
- **Resample:** quaternions slerp; the hips path Catmull-Rom with linearly extrapolated end neighbours (a clamped end
  bent a steady path at the first and last frames). Output frames `floor((n - 1) x 120 / fps) + 1`.
- **Floor:** the 5th percentile of the lowest of the toe base / toe tip points per 120 fps frame (exactly selfCheck's
  measure, so selfCheck reads 0), moved to y = 0. `floor: 'zero'` keeps Blender's z = 0 instead (for clips whose feet
  never touch: the hangs; `report.floorCm` is given either way).
- **In place (A4):** first-to-last horizontal hips travel < 5 cm (`report.travelCm`, plus `excursionCm`). The take only
  reports it; `buildSlot`'s `inPlace` is the caller's choice (M3 / M4 recipe), so a defaulted CMU call never changes.
- **`dead` is empty, `zeros` empty:** every Mixamo channel is keyed (CMU `dead` means missing data). Bones that never
  turn are listed in `report.still` instead.
- **Report** (`take.report`): file, sha256, prefix, fps / frames in and out, facing, floor, travel, in place, FK error,
  unknown / missing bones, fallbacks, still bones, per Wren segment the file's rest length against Wren's bind length and
  the ratio, and the leg (thigh + shin) against Wren's with the leg scale (`retargetTake`'s `scaleLeg`). Wren's numbers
  fill in when `rig` is passed (`loadMixamoTake(slug, { rig: wrenRig() })`, or `addWren(report, rig)`).

## Files
New: `scripts/mocap/mixamoMap.mjs`, `scripts/mocap/mixamoTake.mjs`, `tests/mixamoMap.test.ts`, `tests/mixamoTake.test.ts`,
this report. Edited: `scripts/mocap/retarget.mjs` (+26 / -8 lines), `scripts/mocap/analyze.mjs` (+3 / -2).

## Commits
- `6e445bf41` bone map + `tests/mixamoMap.test.ts`
- `251e6b6d7` take adapter, loader injection, in-place option + `tests/mixamoTake.test.ts`
- this report (head after it is in the final message)

## Tests and results
- `npx vitest run tests/mixamoMap.test.ts tests/mixamoTake.test.ts`: 17 passed, 1 skipped (the CMU regression, no raw
  CMU take on this machine; every `.mocap-cache` in `C:/NightShift` is empty).
  - Map (7): 65-bone coverage; every Wren joint the retarget drives mapped to the plan's bone (A6 split); every segment
    ends at the plan's child head; every CMU name retarget / analyze read exists, parents first; prefixes `mixamorig:`,
    `mixamorig1:`, `mixamorig2:`, `mixamorig12:`, none; errors for mixed prefixes, duplicates, missing bones,
    a re-parented bone; missing fingers / end bones fall back with the chain whole.
  - Take (10 + 1): synthetic dumps built in the test through a real armature chain (FBX armature space, Y up, cm; object
    matrix = move x turn about Z x the importer's X 90 deg x 0.01 scale; rotations `W R W^-1`, 5 decimals): T-pose
    (segments from child heads in the game frame, 30 -> 120 fps, floor, facing 30 deg measured, selfCheck); a walk under
    two armature turns / moves / prefixes gives the same game data; the converted rotations rebuild the dump's own heads
    (FK error < 0.2 mm) and map each rest segment onto the canonical posed one; a turn to the character's left reads as a
    left turn (handedness); slerp resample (constant-rate bend linear in angle, steady hips path linear, 60 fps input);
    idle in place (A4) read from an injected dir, missing file / wrong slug / short channel errors; the report against
    Wren's bind; `retargetTake` direction error < 0.5 deg; `buildSlot { inPlace }` loop and one-shot roots all zero with
    the Mixamo source line; `analyzeTake` through the loader (selfCheck true).
- `npm run typecheck:fast`: clean. `npx eslint` on the two test files: clean.
- Existing tests covering retarget / analyze: none (`grep tests/` finds no import of retarget.mjs or analyze.mjs), so
  nothing else to run.
- **CMU byte check (manual, old vs new):** with no raw CMU take on the machine, a synthetic CMU-format take (ASF with
  31 bones incl. non-zero axes, 600-frame AMC walk) was written into the worktree's `.mocap-cache` (gitignored, deleted
  after). The origin/master `retarget.mjs` / `analyze.mjs` were run beside the new ones: `buildSlot` (a loop, a
  segment with takeInfo and suffix, a whole-take segment), `retargetTake` and `analyzeTake` (loop, turn, stop, pivot)
  were byte-identical (JSON). The vitest regression also ran green against that take before it was deleted.

## Open items
- **Real files:** nothing here has seen an M1 dump yet (Blender capped). First run: `node scripts/mocap/mixamoTake.mjs`
  over all 21 dumps; check `fkErrMm` (expect < 0.5 mm), `facing.hipToeDeg`, `leg.scale` (A5: near 1), the segment
  ratios, and `retargetDirErrDeg` < 8 deg on the spine (A6; else the slice's fallback to aiming at joint positions).
- **Hang clips:** the feet floor puts dangling feet at y = 0; M4 should load the hangs and climbs with `floor: 'zero'`
  (or ignore the height) and decide its clock from the grips.
- **`inPlace` is opt-in:** M3 / M4 recipes pass `inPlace: take.inPlace` (or force it per clip). Mixamo loops repeat
  frame 0 as the last frame; the adapter keeps it (M3 drops it before seaming, as planned).
- The root heading for `inPlace` is the first frame's pelvis facing; an idle that starts mid-sway is turned by that
  sway (a few degrees). If it shows, M3 can pass the mean facing instead (one line in `buildSlot`).

## What M1's dump format should change (or keep)
- Keep leaf bones (the FBX importer's "Ignore Leaf Bones" off): `*_End`, `HeadTop_End` and the finger `4` bones are the
  segment end points. Fallbacks exist but are guesses.
- Write `pos` and `rot` for every bone in `bones` (the adapter checks the lengths and refuses a short channel).
- `fps` must be the rate the keys were sampled at: check after import that the scene fps is the file's 30 (the importer
  should set it; if it stays at Blender's 24 the clip plays at the wrong speed). `frameStart` / `frameEnd` from the
  action's range, not the scene default.
- `world` and `scale` are not used by M2 (heads and rotations are already world), but keep them for checks.
- Nothing else: names with any `mixamorig<N>:` prefix, Z up, 5 decimals and sign-continuous `w, x, y, z` all fit.
