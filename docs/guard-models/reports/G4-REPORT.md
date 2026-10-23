# G4 report: guard LOD bake, atlas, KTX2, guard check

Branch `feature/gm-g4` (off feature/guard-models 480c6182, with G4b's budget check). Scripts and checks are done; the
desktop smoke did not run (see "Smoke"). The full stage is booked by the lead as a laptop alone request.

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
     - Each piece is decimated per LOD.
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
- `npx vitest run tests/guardLods.test.ts tests/guardBakePlan.test.ts tests/guardBudget.test.ts`: 3 files, 106 passed.
  This includes the `guard_lod_util.py` self-test under Blender's bundled Python: raster, dilate, resize, place,
  finger fold, `seam_pairs_mh`, `lod_bones_from_kit`.
- `npx tsc --noEmit -p .` is clean, and eslint is clean on `tests/guardLods.test.ts`.

## Smoke
SMOKE_SECTION

## Open items
- Before the laptop bake: merge G1 fix and G1h fix first. The bake needs bodies with `lodBones` and `_mh`, and heads
  in G1's body frame with `mh_index`. Heads baked before the G1h fix will fail the weld note (seam off the body).
- `guardBakePlan.mjs` `SHEET_FILES` names the sheet files (`guard-sheet.mjs`, `guardSheetPlan.mjs`,
  `src/operators/lab/guardSheet.ts`, `guards.html`), which the G4 sheet slice (Sonnet) has not written yet. The hash
  skips files that are absent.
- The riot shield is not smoked (no `gear/guard-shield_riot.blend` on the desktop).
- `scripts/operators/py/__pycache__/*.pyc` was left uncommitted (untrack in G9).
