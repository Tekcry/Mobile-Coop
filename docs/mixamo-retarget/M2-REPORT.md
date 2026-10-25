# mixamo-retarget M2 - report
Owner: Player Build (M2 builder, Opus). Status: done, fix round done (2026-10-25). Branch `feature/mixamo-retarget-m2`. Plan: `PLAN.md` M2.

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
- **Spine (A6), corrected in the fix round:** matched by rest height. Wren `spine` (spine -> chest joint) = Mixamo `Spine`
  (`upperback`: Spine head -> Spine1 head); Wren `chest` (chest -> neck joint) = Spine1 + Spine2 (`thorax`, a blend slot:
  Spine1 head -> Neck head); `lowerback` a hub; neck as the plan (`upperneck` = Neck -> Head head). The plan's
  Spine1 / Spine2 split was one bone high (see "Fix round").
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
- (Original round; the fix-round results are under "Fix round".) `npx vitest run tests/mixamoMap.test.ts tests/mixamoTake.test.ts`: 17 passed, 1 skipped (the CMU regression, no raw
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
- **Real files:** run over all 21 dumps in the fix round (table under "Fix round"): selfCheck OK, `fkErrMm` <= 0.04,
  `hipToeDeg` 1.6, `leg.scale` 0.993, every Wren segment within 0.01 deg of the Mixamo heads.
- **`retargetDirErrDeg` is not the A6 gate.** retarget.mjs compares Wren against the take's own slot tips (the same
  data), so it reads ~0 whatever the map. The gate is `mixamoDirCheck` (`node scripts/mocap/mixamoTake.mjs`); M3
  should put its numbers in CLIPS.md's direction error column.
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

## Fix round (2026-10-25, checker FIX on 55b45b82)
Checker item: the spine was one bone off (Wren spine on Spine1, chest on Spine2, Spine folded into the pelvis), and the A6
direction gate compared a thing with itself, so it never caught it. Commits: `ea5f6965` (the cut-off builder's WIP),
`be16ce8e` (code + tests), this report.

**Map (mixamoMap.mjs).** Rest heights above the hips / pelvis (standing_idle; Wren bind): Mixamo Spine 0.096, Spine1 0.208,
Spine2 0.336, Neck 0.480 m; Wren spine 0.130, chest 0.255, neck 0.543 m. So Wren spine = `Spine` (`upperback`, Spine ->
Spine1 heads) and Wren chest = Spine1 -> Neck heads (`thorax`). Two bones bend inside the chest, so `thorax` is a
**blend slot**: it turns with the Spine1 / Spine2 slerp at 0.5 (the twist), swung by the smallest arc so its rest span
lands on the posed Spine1 -> Neck span: its direction is exact at every frame. A rigid slot cannot follow a span that
bends, so its tip misses the real Neck head by the change in span length (`report.stretchMm`, worst 16.4 mm on
lifting_heavy_object); the shoulder slots hang off that tip, so the take's shoulder points carry up to that much. Wren's
retarget uses rotations only (and the hip joints, off the root), so Wren is not affected.
The WIP had also moved Wren's neck onto Neck + a third of the Head bone and dropped the toes from the facing; both are
outside the checker's item and the plan, so both were put back (neck = Neck -> Head head, facing from hips + toes).

**Direction check (mixamoTake.mjs `mixamoDirCheck(rig, dump)`).** The take goes through `retargetTake` (the real path
onto Wren); at every source frame (the 120 fps frame on it), each of Wren's 15 driven segments (joint -> SEG_END child,
its world rotation on its bind segment) is measured against the Mixamo segment `WREN_SPANS` names: child head minus
head from the dump's own `pos`, in the game frame. Only the frame change is shared with the slots. Limit 8 deg
(`DIR_LIMIT_DEG`); the CLI prints it per clip and exits 1 over it. To prove it can fail, the same check was run with
the old map patched in (the old column; it reproduces the checker's 40 deg on lifting_heavy_object).

| Clip | Max, all 15 segments (deg) | Spine | Chest | Neck | Old map: spine / chest (deg) | Blend stretch (mm) |
| --- | --- | --- | --- | --- | --- | --- |
| braced_hang_shimmy_left | 0.01 | 0.01 | 0.00 | 0.01 | 16.85 / 7.93 | 2.9 |
| braced_hang_shimmy_right | 0.01 | 0.01 | 0.00 | 0.01 | 16.75 / 7.88 | 2.9 |
| braced_hang_to_crouch | 0.01 | 0.01 | 0.00 | 0.01 | 17.36 / 8.16 | 3.1 |
| carry_body_idle | 0.01 | 0.01 | 0.00 | 0.01 | 2.61 / 1.23 | 0.1 |
| carry_body_walking | 0.01 | 0.01 | 0.00 | 0.01 | 3.93 / 1.85 | 0.2 |
| climbing_ladder | 0.01 | 0.01 | 0.00 | 0.01 | 12.53 / 5.89 | 1.6 |
| climbing_ladder_to_standing | 0.01 | 0.01 | 0.00 | 0.01 | 22.36 / 10.51 | 5.2 |
| crawling_hands_and_knees | 0.01 | 0.01 | 0.00 | 0.01 | 12.09 / 5.68 | 1.5 |
| crawling_prone | 0.01 | 0.01 | 0.00 | 0.01 | 10.63 / 5.29 | 1.3 |
| cross_punch | 0.01 | 0.01 | 0.00 | 0.01 | 4.38 / 2.04 | 0.2 |
| crouched_walking | 0.01 | 0.01 | 0.00 | 0.01 | 4.12 / 1.96 | 0.2 |
| crouch_to_stand | 0.01 | 0.01 | 0.00 | 0.01 | 16.66 / 7.83 | 2.9 |
| elbow_strike | 0.01 | 0.01 | 0.00 | 0.01 | 7.54 / 3.50 | 0.6 |
| freehang_climb | 0.01 | 0.01 | 0.00 | 0.01 | 23.78 / 11.18 | 5.8 |
| hanging_idle | 0.01 | 0.01 | 0.00 | 0.01 | 0.43 / 0.21 | 0.0 |
| kneeling_pull_up | 0.01 | 0.01 | 0.00 | 0.01 | 17.46 / 8.99 | 3.8 |
| kneel_down | 0.01 | 0.01 | 0.00 | 0.01 | 28.55 / 13.42 | 8.4 |
| lifting_heavy_object | 0.01 | 0.01 | 0.00 | 0.01 | 40.04 / 18.79 | 16.4 |
| pulling_up_to_a_ledge | 0.01 | 0.01 | 0.00 | 0.01 | 8.60 / 3.99 | 0.7 |
| standing_idle | 0.01 | 0.01 | 0.00 | 0.01 | 4.00 / 1.88 | 0.2 |
| stand_to_crouch | 0.01 | 0.01 | 0.00 | 0.01 | 34.19 / 16.06 | 12.0 |

The 0.01 deg left is the dump's 5-decimal rounding. Arms and legs were 0.01 deg under both maps (they never used the
spine slots). All 21: selfCheck OK, `fkErrMm` 0.02-0.04, facing -0.8 deg (hips + toes, `hipToeDeg` 1.6), leg scale 0.993.

**Tests.** `tests/mixamoMap.test.ts`: spine / chest / neck slots and end heads; `WREN_SPANS` covers every driven segment
(a bone and its descendant, the same two heads as the slot); a blend slot's chain is checked (a re-parented Neck or
Spine2 is an error). `tests/mixamoTake.test.ts`: the T-pose and walk segment checks now on Spine -> Spine1 and
Spine1 -> Neck; new **bent-spine test** (a synthetic lift: Spine, Spine1, Spine2 each bent by a different amount with a
side lean and a twist, under a turned armature): `mixamoDirCheck` < 0.5 deg on every segment; with the old map patched
in, spine > 30 deg and chest > 8 deg (both flagged), limbs still < 0.5 deg; the walk and a 60 fps dump < 0.5 deg.
Results: `npx vitest run tests/mixamoMap.test.ts tests/mixamoTake.test.ts` 19 passed, 1 skipped (the CMU regression: no
raw CMU take in `.mocap-cache` on this machine); `npm run typecheck:fast` clean; `node scripts/mocap/mixamoTake.mjs`
exit 0 on all 21.

**CMU output.** `retarget.mjs` and `analyze.mjs` are unchanged since the checked head 55b45b82 (`git diff` empty), and the
CMU path imports nothing from the Mixamo files, so CMU output stays byte-identical (the original round's old-vs-new byte
check still holds).

**Open.**
- Neck proportions: Wren's neck segment is 15 cm, Mixamo's Neck bone 7 cm, so Wren's head joint sits about 8 cm further
  up the neck line than Mixamo's Head joint. Wren's neck follows the Neck bone's direction (A6 met), so on a strong nod
  Wren's head pivots a little low. If it shows in Studio, the WIP's Neck + Head blend (Neck -> a third up the Head
  bone, in `ea5f6965`) is the fix.
- The blend stretch (shoulder points up to 16 mm off on the deepest lift) matters only if M3's `clav` channel reads
  shoulder positions; from rotations it does not.
