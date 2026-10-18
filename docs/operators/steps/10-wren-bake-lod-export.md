# Step 10 - Wren: baked maps, LODs, glTF and costs

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15). Run by the orchestrator's step loop (RULES.md
"Step loop", D18).

## Objective

Wren (the A2 stealth operative, D22-D24) as game assets: baked maps, hero / in-game LOD0-2 / phone LODs, glTF and
KTX2, the integration anchors, measured costs.

## Read (only these, plus the common files)

- SPEC 6.3 (maps, LODs, output), 6.4 (budgets); ART-DIRECTION 9.2 (the item list); DECISIONS D21, A36, A39-A41
  (grep); `docs/systems/performance.md` budget lines only.
- `scripts/operators/export-gltf.mjs` and `py/export_gltf.py`; the sim reports of `armour`, `waist_belt`, `leg_kit`
  (the anchor frames).

## Do

1. The items: `GARMENTS.wren` = `suit`, `gloves`, `approach_boots`, `headwear`, `head_kit`, `armour`, `chest_rig`,
   `waist_belt`, `leg_kit`. UV atlas per material group: cloth (the suit's shell, stretch, abrasion, grip and vent
   zones, seam tape, the hood and balaclava, gloves), kit (composite, edge rubber, laminate, elastic, polymer, boot
   materials), hardware and glow (gunmetal, the goggle lens). Bake the procedural materials and the hero normal detail
   (micro-emboss, perforation, grip pebble, tape edges) to texture sets (albedo, normal, packed occlusion / roughness /
   metal).
2. LODs from the same generators plus decimation, same silhouette; skinned to the game joints (hero adds fingers). The
   micro-emboss and vents live only in the maps from LOD0 down; LOD2 keeps the plate, strap, holster and sleeve
   silhouettes. The rib segments stay separate pieces down to LOD1 (they must not gap when the torso bends).
3. glTF per LOD; KTX2 (ask before installing basisu or toktx). Phones load only the phone LOD. Every LOD carries the
   integration anchors as empties: `weaponMount.backL`, `.backC`, `.backR` (A36, A40), `pistolHolster` (A40),
   `slingSocket` (A41), parented to the chest / hip joints that carry them; write the back-plate standoff (`backGearM`)
   into the export report for `rig.backGear`.
4. Measure per LOD: triangles, draws, materials, texture MB desktop / phone / hero, bones; write them into
   `docs/operators/mockups/wren/DESIGN.md`. Compare with SPEC 6.4 and flag overruns.

## Out of scope

Moth; the game integration itself (step 18 plans it).

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`render_garment_test.py` views, or `operator-sheet`) and each is checked
  against the ART-DIRECTION.md render check (1-7) and SPEC 1's checklist; failures are fixed and re-rendered, or
  written into LOG.md as open with the reason.
- Every LOD glTF holds the anchors above (listed in the export report); hero and LOD0 renders side by side keep the
  same silhouette.
- `npm run check` passes.

## Finish

As RULES.md "Step loop" (D18): the implementer drafts the LOG.md record and STATE.md (next: 11) and returns; the
orchestrator commits "operators: step 10 - Wren: baked maps, LODs, glTF and costs".
