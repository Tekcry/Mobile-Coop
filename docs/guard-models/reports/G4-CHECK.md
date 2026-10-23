# G4 check: guard LOD bake, atlas, KTX2, guard check

Checker: fresh Opus, 2026-10-24. Branch `feature/gm-g4` at bd0d8e3a (integration 22c8a236 merged in 8181e7fb). Read: the
agent preamble, gm-common / gm-blender briefs, PLAN G4 and section 5, SPEC 4-9, G4-REPORT, G4b-REPORT, G7-REPORT, the
diff against origin/feature/guard-models, and the downstream code on the branch (`guardFigure.ts`, `gearMask.ts`,
`guardAssets.ts`, `guardTints.ts`, `guardShield.ts`, `lab/glb.ts`, `tests/guardAssets.test.ts`). Smoke outputs in
`C:/NightShift/scratch/guard-bake-g4smoke` read and measured per piece with a small node script (no Blender).

## Verdict: FAIL (1 blocker, small fix)

## Blockers

### B1. The bake never writes `guard-<base>.json`, which G7's loader and G9's bundled test need
- G7 `src/operators/guards/guardAssets.ts:5-8, 24, 58-70` resolves a base from `guard-<base>-lod0/1/2.glb` plus
  `guard-<base>.json` (`GuardFileData { pieces, tintSlots: number, refHeight }`). Without the JSON the base falls back
  to Wren's stand-in with "guard-<base>.json missing". `tests/guardAssets.test.ts:306-321` reads the same file.
  G7-REPORT "Decisions" 2 named this shape for G4.
- G4 only puts the manifest inside `lods/guard-<base>.report.json` (`guardLodReport.mjs:91`, key `manifest`, with extra
  `id` / `base` / `tintSlotNames`) and in `extras.guard`. `guard-lods.mjs:116` writes no `guard-<base>.json`. The job's
  outputs (`guardBakePlan.mjs:329`) do not list one, and `SHIPPABLE` (`guardBakePlan.mjs:469`, glb / ktx2 / png /
  `*.report.json`) would not push one to `bake/guard-models`. The lead's copy step would have to write the file by hand.
- Fix:
  1. `guard-lods.mjs`, after line 116, for `--base` only: write `lods/guard-<base>.json` =
     `{ pieces: layout.pieces, tintSlots: layout.tintSlots.length, refHeight: layout.refHeight }`.
  2. `guardBakePlan.mjs:329`: add `lods/guard-${b.id}.json` to the base lods job outputs.
  3. `guardBakePlan.mjs:469`: ship it, for example `/\.(glb|ktx2|png)$|\.report\.json$|^lods\/guard-[a-z]+\.json$/`.
     Keep `.layout.json` and `.bake.json` out.
  4. `guard-check.mjs` `checkGuardFiles`: one rule that the JSON exists, equals the layout's
     `pieces` / `tintSlots` count / `refHeight`, and passes `validateGuardManifest` (import `gearMask.ts` the same way as
     `guardBudget.ts`).
  5. One Vitest case in `tests/guardLods.test.ts` (the JSON shape from a layout; SHIPPABLE takes it and skips
     `.layout.json` / `.bake.json`).
  6. Note in G4-REPORT that the lead copies `guard-<base>.json` with the GLBs. The GLBs embed their KTX2, so the lead
     does not copy `lods/textures/*` (G9's 75 MB download test also sums loose `.ktx2` files in the folder).

## The points asked

1. **Decimation fix: polish, not broken.**
   - The 20 mm drop cannot remove a whole piece. `guard_lod_util.island_mask` always keeps the largest island
     (`drop[big] = False`). Each garment part and gear piece is decimated as one object (`bake_guard.py:712, 726,
     1165`), so each keeps at least its main island.
   - Bodies, heads, eyes and caps never go through `decimate_piece`. The eyes come from G1h and are not touched.
   - If clustering ever ate a whole piece at LOD0, the check flags it ("has no triangles"), so it cannot pass silently.
   - Measured smoke `uniform` (trousers + gloves): bounding box the same at all LODs. Area 2.25 / 2.23 / 1.85 m2 at
     LOD0 / 1 / 2, so there are no holes at LOD0. 73 boundary edges at LOD0, which fits the waist, cuffs and glove
     openings. 60 non-manifold edges from the weld, which do not show in a render.
   - Trousers at 457 tris where LOD0 allows 1,625 is coarse folds at < 8 m. The normals still come from the hero
     bake. Polish P1.
2. **Guard check: confirmed, G4 logic does not block a full bake.**
   - All 57 problems in `check/guard-average.check.report.json` are "has no triangles" (20) or "bake note" (37). There
     are no budget, bone, texture, KTX2, seam, mixedTris, uint8 or drift problems.
   - `tests/guardLods.test.ts` "a base at its kit budgets passes G4b's check" covers all three bases through
     `baseReport` + `checkGuardReport`. "passes a clean base" covers `checkGuardFiles` (broad).
   - Every per-piece target is at or under the kit budget: garment parts are split per outfit, a part shared by two
     outfits takes the smaller budget, and gear takes the PLAN 5 caps. So measured totals stay inside the kit's
     worst-case numbers.
   - Upstream names match G1h `build_head.py`: `guard-<h>-head-lod<n>`, `guard-<h>-eye<L|R>-lod0`,
     `guard-<b>-cap-<c>-lod0/1`, the `face` UV, `mh_index`, and the cap / eye / face PNG names. They also match the
     GB stage outputs for garments (`garments/guard-<b>-<part>.blend`) and gear (`gear/guard-<b>-<id>.blend`).
   - The 37 notes are 3 heads + 1 haircaps + 3 garments + 12 gear + 18 tile PNGs. The report says 14 gear and 16
     tiles (P2).
3. **Neck weld, lodBones, budgets, KTX2: OK.**
   - The weld pairs by `_mh` / `mh_index` (`seam_pairs_mh`) and takes the body vertex's exact position and weights.
     Eye faces are excluded. Smoke: 42 / 42 at every LOD, 0 mm.
   - lodBones: the body report's lists, falling back to `lod_bones_from_kit` (rig + fingers, fingers fold to
     `fingerParent`). This matches `guards.json` `bones`.
   - Budgets: PLAN 5 is enforced through G4b `checkGuardReport` on numbers measured from the files: shown / buffer per
     LOD, head / eyes / caps, piece caps, bones, influences 4 / 4 / 2, atlas sizes, KTX2 only, `_PIECE` / `_TINT`. The
     75 MB download is G9's test.
   - KTX2: toktx / `ktx validate` via `execFileSync` with `windowsHide`, the same `KTX_BIN` default as `ktx2.mjs`.
     Blender is `-b --factory-startup`, BelowNormal. The smoke GLBs carry `extensionsRequired: KHR_texture_basisu`,
     one mesh / primitive / material, uint8 `_PIECE` / `_TINT`, 33 / 23 / 23 joints and `TEXCOORD_0` = the atlas.
     All of this matches `lab/glb.ts`, `validateGuardModel` and G9's checks. Tint indices follow `guards.json`
     `tintSlots`, as `guardTints.ts` does.
4. **Test conflict: nothing lost.** `tests/guardAssets.test.ts` is identical to integration (G9). The new
   `tests/guardAssetsReport.test.ts` is byte-identical to G4b's pre-merge `guardAssets.test.ts` (8181e7fb^1) except one
   `describe` title.
5. **Runs (one at a time):**
   - `tests/guardLods.test.ts`: 17 passed.
   - `tests/guardBakePlan.test.ts`: 38 passed.
   - `tests/guardBudget.test.ts`: 55 passed.
   - `tests/guardAssets.test.ts`: 4 passed, 3 skipped (no bundled files yet).
   - `tests/guardAssetsReport.test.ts`: 1 passed, 1 skipped.
   - `npx tsc --noEmit -p .`: clean.

## Polish
- P1. `decimate_piece` (`bake_guard.py:246-272`): the first cluster overshoots (trousers LOD0 457 for 1,625, the same
  mesh as LOD1). Start the weld at 0.25 x the mean edge, or bisect `d` between 0 and the first distance that fits.
- P2. G4-REPORT smoke counts: the notes are 12 gear and 18 tile PNGs, not 14 and 16.
- P3. The check only requires LOD0 triangles per piece. Also flag a piece (other than caps at LOD2) with 0 triangles
  at LOD1 / LOD2: a cluster at a large `d` can delete a small gear piece's lower LODs silently.
- P4. The last-resort `drop_islands(obj, target)` protects only the largest island, so it could drop one glove or
  boot of a pair. It is effectively unreachable after clustering up to 0.25 m, but it would be safer to drop by size
  only under `ISLAND_MIN * k`, or note it.
- P5. About 400 s of untimed work before the bake (the unwrap with 1M-tri sources in the scene). Add timers on the
  laptop run. The outfit cover test is also a per-polygon Python ray loop.
- P6. The riot shield path (`run_piece`, `lod_rig` with only `elL` / `wrL`) is not smoked. Look at its check on the
  laptop run.
- P7. `scripts/operators/py/__pycache__/*.pyc` is tracked (untrack in G9).
