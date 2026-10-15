# Step 06 - Wren: gloves and boots

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren's gloves and boots: thin suede-palm gloves with stretch backs, low-profile tactical boots with quiet soles.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 3-5; SPEC 3.1 (gloves, boots).
- The hero finger and toe bones in `build_body.py`.

## Do

1. Gloves: sewn or shrink-fitted panels on the hand (palm, back, fourchettes, knuckle panel, wrist tab), skinned to
   the hero finger bones; suede palm with a CC0 scan only if a shader cannot reach it (ask first), stretch knit back.
2. Boots: parametric hard modelling (sole with quiet low lugs and heel brake, rand, heel counter, suede and nylon
   upper, eyelets and speed hooks, laces, lace garage, pull loop); sized from the body's foot; the trouser hem seals
   over the boot top.
3. Wear: scuffed toe rand, dust in the lugs, darker trigger finger and palm heel. Renders and checks.

## Out of scope

Head and kit; Moth.

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
- Start step 07 (wren-head) as RULES.md Chaining says.
