# Step 05 - Wren: base layer and trousers

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren's base layer (compression top and leggings, seen only at collar and cuffs) and trousers, sewn by the same
method.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 3-5; SPEC 3.1 (trousers), 3.5, 5.1.
- `garments/combat_shirt.py` as the pattern example; `build_garment.py`, `garment_details.py`.

## Do

1. `garments/base_layer.py`: a thin compression top and leggings drafted at negative ease; simulated first, the
   shirt and trousers then collide with it (multi-layer simulation: the body plus earlier layers are colliders).
2. `garments/trousers.py`: articulated knees (darts), internal knee pad pockets with reinforced outer panels, gusseted
   crotch, reinforced seat, flat flapped cargo pockets angled forward with drain grommets, belt loops with bar tacks,
   tapered ankles that seal over the boots. The shirt hem tucks in (simulate the shirt over the trousers' waist or
   pin the hem inside the waistband).
3. Stitches, hems, bar tacks and materials as on the shirt. Renders and checks.

## Out of scope

Gloves, boots, head, kit; Moth.

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
- Start step 06 (wren-hands-feet) as RULES.md Chaining says.
