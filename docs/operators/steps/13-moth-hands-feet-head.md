# Step 13 - Moth: gloves, boots, hood and round optic

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Moth's gloves, boots, hood and the original round amber twin-lens optic on short barrels.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 1, 3, 4; SPEC 2, 3.3, 5.2 (head); DECISIONS D4, D13.

## Do

1. Gloves (rope-hand wear) and boots from the step 6 generators sized to Moth.
2. Balaclava and hood; the round twin lenses on short barrels (original), amber glow (D13), mount and cable per the
   kit data; earpiece and boom mic.
3. Renders (darkness glow view) and checks.

## Out of scope

Climbing kit.

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
- Start step 14 (moth-climbing-kit) as RULES.md Chaining says.
