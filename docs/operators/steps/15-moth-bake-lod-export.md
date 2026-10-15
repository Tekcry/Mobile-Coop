# Step 15 - Moth: baked maps, LODs, glTF and costs

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Moth as game assets: baked maps, LODs, glTF and KTX2, measured costs (as step 10).

## Read (only these, plus the common files)

- SPEC 6.3, 6.4; the step 10 scripts.

## Do

1. Run the step 10 bake / LOD / export stages for Moth; fix anything Moth-specific.
2. Costs into `docs/operators/mockups/moth/DESIGN.md`; flag overruns.

## Out of scope

Renders.

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
- Start step 16 (moth-final) as RULES.md Chaining says.
