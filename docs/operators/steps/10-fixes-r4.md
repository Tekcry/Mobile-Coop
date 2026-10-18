# Step 10 - fix list, round 4 (checker: FAIL; no fix rounds remain - the step is OPEN)

Re-run by the checker: `E2E_GPU=1 npm run operators:check -- wren` exit 1, "1 failed check(s)": `wren lod1 FAIL
bakeDiff: ["chest: 36 px at 404,347 > 24"]`; the 9 items PASS (suit, gloves, approach_boots, headwear, head_kit,
armour, chest_rig, waist_belt, leg_kit); every other LOD check PASS (tangents, anchors, gameJoints, triangles, draws,
bones, backFaces incl. holster, openEdges, bakeDiff LOD0 / LOD2 / phone); one FLAG (hero bones 63). Renders and GLBs
10:06-10:07 today, newer than HEAD (06:18), Cycles OptiX on the RTX 4090; no view stale.

## Verdicts on round 3

- **A77 (rigid polymer pieces separate below LOD0; LOD2 5,200 -> 5,600, measured 5,557): accepted.** Inside SPEC 6.4
  (LOD2 4-6 k); draws unchanged (LOD1 3 = 2 + glow, LOD2 / phone 2 = 1 + glow, A75); openEdges 0.32 / 0.64 m against
  the hero's 35.12 m; backFaces 0-20 px. The holster face is flat with strap and hood like the hero's in every level
  (`wren-lods-d-closeup-holster.webp`, `wren-holster-lod2.png`, `wren-side-lod1.png`); bakeDiff holster 0 / 4 / 3,
  side 0 / 7 / 7. Round-3 item 1 closed.
- **Tightened bakeDiff: accepted.** Shells 24 px in every view (`SHELL_DARK_LIMIT`, `darkPatchLimit`), per-view limits
  LOD0 only (all 24 except boot 404, named in A76), `holster` view in renders / backFaces / bakeDiff, "stale" FAIL on
  renders older than the GLB, "not measured" FAILs. Checker re-measured renders-r2 with the current code: every LOD
  FAILs (LOD0 back 129 / chest 157 / head 128; LOD1 front 78, side 40, back 53, chest 64, head 80; LOD2 front 212,
  back 151; phone front 208, back 146; holster "not measured"). Round-3 item 2 closed.
- Round-3 item 3: LOD2 / phone closed (chest 18 px, sheath whole); LOD1 OPEN (item 1 below).
- Round-3 item 4: front, back, chest, head closed at LOD0 (24 px); boot OPEN (item 2 below).

## Remaining (ranked)

1. **LOD1 chest notch (FAIL).** `build/operators/wren/export/renders/wren-chest-lod1.png` 404,347, 36 px > 24: a dark
   hooked notch where the plate's lower band meets the cummerbund on the wearer's left (the hero has a clean strap end
   and buckle there, `wren-chest-hero.png`). Same spot 18 px at LOD2 / phone. The 2 cm cage did not change it, so it
   is shell geometry (a step in the remeshed band edge near (0.12, -0.13, 1.17) m). Routes: protect that band edge in
   the LOD1 decimation (vertex-group weight), or keep the band / cummerbund end separate like the A77 pieces. Done:
   `operators:check` LOD1 bakeDiff chest <= 24 px with nothing else worse, the band edge clean by eye in
   `wren-chest-lod1.png` and sheet b, LOD1 still 12-15 k triangles.
2. **LOD0 toe streaks (the one loose limit).** `wren-boot-lod0.png` 189,373, 367 px (limit 404); plain to see as dark
   torn streaks and blotches on the toe cap and rand in `docs/operators/mockups/tests/wren-lods-c-closeup-boot.webp`
   (LOD0 column), and LOD0 is the closest gameplay LOD (< 8 m). The A76 split made it worse (491 px). Routes: bake the
   boots from a cage that follows the rand / toe-cap walls, or keep the sole / rand as a separate piece at LOD0. Done:
   boot bakeDiff <= 24 px at LOD0, `DARK_PATCH_LIMIT.boot` back to 24 (all LOD0 limits 24), the toe reads like the
   hero's.

## Notes (not fails; carry to the follow-up list)

- LOD1 / LOD2 / phone boots: laces gone (sheet c), toe light specks at LOD2.
- LOD1 / LOD2 chest: the suit's front seam reads as a dashed dark line from the collar to the plate
  (`wren-chest-lod1.png`, `-lod2.png` about 270,40-190); under the measure.
- LOD2 / phone: the knife clip under the sheath ends about 30 px higher than the hero's (`wren-chest-lod2.png`
  290,355 against the hero's 385).
- Unchanged from round 3: LOD2 / phone head shell and hood-edge smears (step 18 menu framing), the LOD2 / phone radio
  blotch, hero bones 63, six unweighted helper joints, shadow normalBias per LOD (step 18), the phone never fetching
  `*-hero*` (step 18).
- KTX2: step 11's first task (step 10 Do 3 carry-over, A73 open).
