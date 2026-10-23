# G4 report: guard LOD bake, atlas, KTX2, guard check

Branch `feature/gm-g4` (off feature/guard-models 480c6182, with G4b's budget check). Merged with origin/feature/guard-models 22c8a236.
Scripts and checks are done, and a partial desktop smoke ran on post-fix inputs (see "Smoke"). The full stage is booked by the lead as a laptop alone request.

## What
- `lods` stage: one node job per base and one per own-GLB piece (`riot shield`), run by `guard-bake.mjs`:
  1. `guardAtlas.mjs` (pure) writes the layout `lods/guard-<id>.layout.json`. It holds the `_PIECE` order (body,
     heads, caps, outfits, then kit order) and the garment parts per outfit with their triangle budgets. The atlas is
     4096 x 2048: the left 2048 square is skyline-packed (body, garment parts, caps, the eye block, every gear,
     headwear, eyewear and kit piece), and the right square holds the four 1024 face tiles in `faceTiles` order.
     LOD1 is the same layout at 1/2 and LOD2 at 1/8. Normal and ORM are half size.
  2. Blender `bake_lods.py --guard` (handed to `bake_guard.py`; Wren's path is unchanged) builds one skinned mesh
     with one material per LOD. Visible body:
     - It keeps the body faces some outfit leaves uncovered, plus one ring of faces round them and the neck seam ring.
     - Each piece is decimated per LOD. Garment and gear LOD meshes first drop loose islands under 20 mm (G2's
       stitches, rivets: a collapse decimate floors each island at a few triangles, so a stale jacket stayed at 26,139
       tris at every LOD), then the smallest islands while still over budget; the full source still bakes them in.
     - Procedural pieces are baked selected-to-active one at a time on the GPU into their rect: normal, AO, albedo and
       roughness / metal.
     - G1h's face, cap and eye tiles are resized into their rects.
     - The albedo alpha is the tint mask, and every vertex carries `_PIECE` and `_TINT`.
  3. `guard-lods.mjs`:
     - stores `_PIECE` / `_TINT` as uint8 and writes `extras.guard`;
     - encodes the textures as KTX2 (UASTC + Zstd, mips) and repacks the GLB with KHR_texture_basisu;
     - writes the report `lods/guard-<id>.report.json` in G4b's shape, measured from the finished files.
- `check` stage: `guard-check.mjs` rebuilds the report from the GLBs and runs G4b's `checkGuardReport` on it, plus these
  rules:
  - the written report matches the files (no drift);
  - `_PIECE` is uint8, and no triangle spans two pieces;
  - the file's piece list is the layout's, and every piece has LOD0 triangles;
  - the body seam ring is kept and every head is welded to it;
  - any bake note counts as a problem.
- This round finished the previous builder's cut-off edit and applied the lead rulings:
  - Garment objects hidden from render in G2's files (the shell) stay out of the bake. The `hide_render` from the file
    is kept, and export clears it on the final mesh.
  - The bake writes into the `atlas` UV (`uv_layer='atlas'`).
  - The outfit cover trees are built from world-space polygons (no bmesh).
  - Neck weld (X2): each head seam vertex pairs with the body seam vertex that has the same hm08 index (`mh_index` on
    G1h's heads, `_mh` / `neckSeam.mhVerts` on G1's body), with no transform. The pair takes the body vertex's exact
    position and skin weights. Eye faces never pair. When decimation leaves an index on two vertices, the nearer one
    wins. The bake JSON records `seamSnapMm` per head and LOD. A head whose seam sits more than 2 mm off the body seam
    becomes a bake note, so the check fails it. A mesh without the index falls back to pairing by position.
  - The skin albedo is used as baked, with no divide (0.69 is scalp shadow).
  - Fingers fold per `lodBones` at LOD1 and LOD2. A body report without `lodBones` (bodies baked before G1 wrote it)
    gets the same lists from the kit's `bones` (`lodBonesFrom` in the report). The clavicle weights are G1's,
    unchanged.
  - Pieces are separate islands: each piece is its own object until the final join, so seam vertices are never
    shared. The check counts `mixedTris`.

## Files
- `scripts/operators/py/bake_guard.py` (guard mode), `scripts/operators/py/guard_lod_util.py` (numpy helpers, with a
  self-test), `scripts/operators/py/bake_lods.py` (`--guard` hand-off only).
- `scripts/operators/guard-lods.mjs`, `guard-check.mjs`, `guardAtlas.mjs`, `guardGlb.mjs`, `guardLodReport.mjs`.
- `scripts/operators/guardBakePlan.mjs`: lods and check are node jobs. The shield also needs `bodies-broad`. The hash
  covers the base's kit slice.
- `tests/guardLods.test.ts`, `tests/guardBakePlan.test.ts`.

## Decisions assumed
- Missing upstream (garment parts, gear pieces or heads not built yet) is left out of the bake and written as a bake
  note, so a partial bake runs but fails the check until everything is built.
- Garment part budgets split each outfit's kit budget by rough surface share (`PART_SHARE`). A part two outfits share
  (lean boots) takes the smaller budget and the larger texel area.
- The shield counts at its kit budget in the base's shown totals, so the result does not depend on which parallel job
  finishes first. Its own file is checked against that budget by `check-shield_riot`.
- G1 fix finger names (`finger<S>_<f>_1`, origin/feature/gm-g1fix, not merged here): the bake reads bone names from
  the body report (`lodBones`), so it is name-agnostic. The check compares the GLB's bones with the kit's `bones`,
  so the kit and the bodies must come from the same G1 commit.

## Tests
- `npx vitest run tests/guardLods.test.ts tests/guardBakePlan.test.ts tests/guardBudget.test.ts`: 3 files, 106 passed
  (after the merge: 17 + 38 + 55 = 110 passed, run one at a time). This includes the `guard_lod_util.py` self-test under Blender's bundled Python: raster, dilate, resize, place,
  finger fold, `seam_pairs_mh`, `lod_bones_from_kit`, and the island labels / mask.
- `npx tsc --noEmit -p .` is clean, and eslint is clean on `tests/guardLods.test.ts`.

## Smoke
Desktop, 2026-10-24 00:28-00:41, one job at a time under `C:/NightShift/heavy.lock` (taken after the laptop-queue
holder released it, freed when each Blender run ended), driver only (`--only <id> --par 1`, `-b`, BelowNormal), out dir
`C:/NightShift/scratch/guard-bake-g4smoke`.

Inputs (post-fix only):
- prep, joints, `bodies/guard-average-body` (G1 fix, has `lodBones` and `_mh`) and `garments/guard-average-trousers`
  + `guard-average-gloves` (G2, post body fix; the trousers job's own rebuilt boots) copied from `guard-bake-g2`. The
  stale boots / jacket there were not used.
- `heads-average-1`: the one extra producing job, built here with the merged G1h fix code (22 s): heads in G1's body
  frame, 42 seam vertices with `mh_index`, seam lock 0 mm.
- Left out (their outputs on disk predate the fixes, or do not exist): heads average-2..4, the hair caps and eye tiles,
  shirt, boots, jacket and all 12 gear pieces of the average layout. Each is a bake note, as designed. Stub `.hash` files stand in for those
  upstream jobs so the driver runs.

Run 1 (`lods-average`, 226 s) found a G4 bug: G2's garments are a 0.9M-triangle sewn hero plus thousands of stitch
islands. A collapse decimate floors each island at a few triangles and then stalls on the hero, so the trousers stayed
at 3,463 tris at every LOD (LOD2 buffer 7,997, over 5,000). Fix (`bake_guard.py` `decimate_piece`,
`guard_lod_util.island_mask`): drop loose islands under 20 mm, decimate, and when the collapse stalls cluster the
vertices (weld from half the target's mean edge, x1.5 a step) and collapse again. As a last resort, drop the smallest
islands. Run 2 (the one rerun) used the same inputs:

| | LOD0 | LOD1 | LOD2 |
| --- | --- | --- | --- |
| Shown tris (grunt / droneOp / officer) | 6,360 (<= 20,000) | 2,193 (<= 7,000) | 784 (<= 2,800) |
| Buffer tris | 7,078 (<= 45,000) | 2,791 (<= 14,000) | 1,021 (<= 5,000) |
| Body / head average-1 / eyes | 1,194 / 4,000 (<= 4,000) / 448 (<= 2 x 250) | 397 / 1,198 (<= 1,200) / - | 149 / 398 (<= 400) / - |
| Trousers / gloves | 457 (target 1,625) / 263 (451) | 457 (525) / 141 (145) | ~198 (200) / 40 (55) |
| Bones / influences | 33 / 4 | 23 / 4 | 23 / 2 |
| Albedo, normal, ORM (KTX2 UASTC + Zstd) | 4096x2048 802 KB, 2048x1024 357 KB, 311 KB | 2048x1024 273 KB, 106 KB, 90 KB | 512x256 28 KB, 10 KB, 10 KB |
| GLB | 1.96 MB | 0.73 MB | 0.17 MB |

- Buffer and shown counts are low because 20 of 24 pieces are missing. They are not the full-figure numbers.
- Atlas: the layout reserves 70.3% of the left 2048 square for all 24 pieces (28 regions). The right square is the four
  1024 face tiles, and only tile 0 is filled. Bake coverage of the rects that were built: body 0.87 / 0.88 / 0.96,
  trousers 0.56 / 0.69 / 0.89, gloves 0.58 / 0.88 / 0.93 (LOD0 / 1 / 2). Selected-to-active took 36.9 s for 9 rects on
  OPTIX (GTX 1080 Ti).
- Weld: `seamSnapMm` for average-1 is 0 at every LOD. The weld is by hm08 index, 42 of 42 seam vertices on body and
  head. There is no weld note. The pre-fix head (an earlier run, 2026-10-23) was 28.4 mm off.
- `mixedTris` is 0, `_PIECE` is uint8 at every LOD, and there is no report drift.
- Wall time: 444 s for run 2 (226 s for run 1). About 400 s of it falls between the garment decimation and the start of
  the bake: the unwrap of the 9 LOD meshes, with the 1M-tri sources in the scene. It has no timer yet (open item).
- Guard check (`guard-bake.mjs --stage check --only average`): FAIL with 57 problems, all from missing upstream:
  - 20 pieces with no LOD0 triangles;
  - 37 bake notes: 3 heads, the hair caps, 3 garments, 12 gear pieces, 18 cap and eye tile PNGs (corrected in the fix round).

  There are no budget, bone, texture, KTX2, seam, `mixedTris`, uint8 or drift problems. The full bake passes only
  once every upstream job is built post-fix.

## Open items
- Merged: origin/feature/guard-models 22c8a236 (G1 fix, G1h fix, G7, G7b, G9, G2) is in this branch.
  - The one conflict was `tests/guardAssets.test.ts` (add/add). G9's version is kept. G4b's GLB-vs-bake-report checks
    move to `tests/guardAssetsReport.test.ts`, and both skip until bundled GLBs exist.
  - `guardBakePlan.mjs` auto-merged (both sides kept).
- Before the laptop bake, every upstream must be rebuilt post-fix: the G1h fix heads (all 9) and hair caps / eye tiles
  (`haircaps-<base>`), the G2 garments after the boots fix, and the G3 gear on the G1 fix bodies. The desktop has only
  the average body, trousers, gloves and head average-1 post-fix.
- Garment LODs land well under their part budget after clustering (trousers LOD0 457 of 1,625). A smaller first weld
  distance (0.25 instead of 0.5 x the mean edge) or a bisection would keep more shape. This is not smoked; it is polish.
- About 400 s of untimed work sits before the bake in run 2: likely the unwrap (smart project + pack) of the clustered
  LOD meshes. Add timers on the laptop run and look there if the full bake is slow.
- `guardBakePlan.mjs` `SHEET_FILES` names the sheet files (`guard-sheet.mjs`, `guardSheetPlan.mjs`,
  `src/operators/lab/guardSheet.ts`, `guards.html`), which the G4 sheet slice (Sonnet) has not written yet. The hash
  skips files that are absent.
- The riot shield is not smoked: there is no post-fix `gear/guard-shield_riot.blend` on the desktop.
- `scripts/operators/py/__pycache__/*.pyc` is tracked and is left uncommitted (untrack it in G9).

## Fix round
Opus, 2026-10-24, on G4-CHECK (FAIL, B1). P1, P5, P6 and P7 stay on the polish list.

- B1, `guard-<base>.json` (the runtime's `GuardFileData`, G7 `src/operators/guards/guardAssets.ts:17-22, 58-70`):
  - `guardLodReport.mjs:14-24`: `fileDataFile(base)` = `lods/guard-<base>.json` and `guardFileData(layout)` =
    `{ pieces, tintSlots: <count>, refHeight }`, the loader's shape (read from `guardAssets.ts`, not guessed). The report
    `manifest` (`:102`) now spreads the same object, so the JSON, the manifest and `extras.guard` cannot disagree.
  - `guard-lods.mjs:91-93, 120`: a base job deletes the stale file before Blender and writes the JSON after the report.
    The shield job writes none (the loader reads its three GLBs only).
  - `guardBakePlan.mjs:329`: `lods/guard-<b>.json` is a base lods job output. `:472` `SHIPPABLE` adds
    `^lods/guard-[a-z]+\.json$`, so the push ships it and still skips `.layout.json` / `.bake.json`. `:382` the check hash
    covers `gearMask.ts`.
  - `guard-check.mjs:48-60` `checkFileData`, called for every base (`:93`): the file exists, has the loader's shape,
    equals the layout's pieces / tint count / refHeight and the written report's manifest, and passes the runtime's own
    `validateGuardManifest` (imported from `gearMask.ts` like `guardBudget.ts`, `:25`). `main` reads it (`:117-119`).
  - Shipping: the lead copies `guard-<base>-lod0/1/2.glb` and `guard-<base>.json` per base (and
    `guard-shield_riot-lod0/1/2.glb`) into `src/operators/assets/guards/`. Not `lods/textures/*`: the GLBs embed their
    KTX2, and G9's 75 MB download test also sums loose `.ktx2` files in that folder.
- P3, `guard-check.mjs:77-85`: a piece with LOD0 triangles but none at LOD1 or LOD2 is a problem ("decimated away?").
  Hair caps are skipped where the kit gives them 0 (LOD2).
- P4, `guard_lod_util.py:242-250` `island_mask`: the largest island overall and the largest island on each side of
  x = 0 (bounding-box centre; X is lateral in G1's frame, `wrL` at x = -0.19) are never dropped, in the tiny pass or the
  last-resort pass, so a glove or boot pair keeps both members (the mask may then stay over target).
  `bake_guard.py:229-231` docstring only; no other Blender path changed, so no rerun.
- P2: the smoke notes are 12 gear pieces and 18 tile PNGs (Smoke section above, corrected).

Tests (one at a time):
- `tests/guardLods.test.ts`: 20 passed (17 + 3 new: LOD1 / LOD2 empty pieces with the cap exception; the JSON's shape,
  the manifest's values, G7's `resolveGuardAsset` taking it for every base, SHIPPABLE; `checkFileData` on a malformed
  file, a wrong value, a manifest mismatch and a manifest the runtime refuses). The clean-base case now passes the JSON
  and fails without it. The `guard_lod_util.py` self-test (run here under Blender's Python) gains two pair cases.
- `tests/guardBakePlan.test.ts`: 38 passed (the lods output and the SHIPPABLE lists extended).
- `tests/guardBudget.test.ts` 55 passed; `tests/guardAssets.test.ts` 4 passed, 3 skipped; `tests/guardAssetsReport.test.ts`
  1 passed, 1 skipped.
- `npx tsc --noEmit -p .` clean; eslint clean on both test files; `guard-check.mjs` imports under `ts-resolve.mjs` in node.
