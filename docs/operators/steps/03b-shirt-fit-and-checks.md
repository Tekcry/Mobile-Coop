# Step 03b - Wren combat shirt fit, and the automatic checks

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Bring Wren's combat shirt to the art direction (Section 6: close fit, worn under armour) and add the automatic checks
every later step relies on.

## Read (only these, plus the common files)

- `docs/operators/ART-DIRECTION.md` (Sections 4-6 and the render check), SPEC 1.
- `scripts/operators/README.md`, `scripts/operators/py/build_garment.py`, `garments/combat_shirt.py`,
  `garment_details.py`, `materials.py`, `render_garment_test.py` (grep and line ranges).
- The four renders in `docs/operators/mockups/tests/`.

## Do

1. Write `scripts/operators/check.mjs` (`npm run operators:check`) and a Blender-side `py/check_garment.py`: the
   checks listed below, with a JSON report per item into `build/operators/<id>/`; non-zero exit on any failure.
2. Fix the shirt faults the step 3 renders show: fabric bunching above the hem, crumpled forearms (sleeve length and
   cap, ease, ripstop stiffness), the mock neck collar that does not stand (snug top edge without opening the zip
   seam, interfacing stiffness), residual horizontal banding on the knit.
3. Pockets and the elbow panel: build them as stiffer sewn layers (their own cloth or a smoothed offset of the sleeve
   surface) so they do not copy every sleeve wrinkle.
4. Re-render the four views (`npm run operators:build -- wren --render`) and check them.

## Out of scope

Any other garment or kit; Moth; the Lab.

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
- Start step 04 (lab-and-sheets) as RULES.md Chaining says.
