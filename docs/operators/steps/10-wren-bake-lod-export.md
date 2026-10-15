# Step 10 - Wren: baked maps, LODs, glTF and costs

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren as game assets: baked maps, hero / in-game LOD0-2 / phone LODs, glTF and KTX2, measured costs.

## Read (only these, plus the common files)

- SPEC 6.3 (maps, LODs, output), 6.4 (budgets); `docs/systems/performance.md` budget lines only.

## Do

1. UV atlas per material group, bake procedural materials and hero normal detail to texture sets (albedo, normal,
   packed occlusion / roughness / metal).
2. LODs from the same generators plus decimation, same silhouette; skinned to the game joints (hero adds fingers).
3. glTF per LOD; KTX2 (ask before installing basisu or toktx). Phones load only the phone LOD.
4. Measure per LOD: triangles, draws, materials, texture MB desktop / phone / hero, bones; write them into
   `docs/operators/mockups/wren/DESIGN.md`. Compare with SPEC 6.4 and flag overruns.

## Out of scope

Moth.

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`render_garment_test.py` views, or `operator-sheet` once step 4 exists) and
  each is checked against the ART-DIRECTION.md render check and SPEC 1's checklist; failures are fixed and re-rendered,
  or written into LOG.md as open with the reason.
- `npm run check` passes.

## Finish

- LOG.md: what was built, numbers, open items. STATE.md: the next step (keep it short).
- Commit and push `feature/operators`.
- Progress for Michael (D16): send this step's renders (screenshots for tooling steps) with SendUserFile (status
  proactive, display render) and a three-line note: what was built, what passed, what is open.
- Start step 11 (wren-final) as RULES.md Chaining says.
