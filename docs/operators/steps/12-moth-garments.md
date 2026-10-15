# Step 12 - Moth: shirt with rolled sleeves, base layer, trousers

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Moth's garments: combat shirt variant with rolled sleeves over a knit base layer (no skin, D4), base layer and
trousers.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 2-6; SPEC 4.4 (Moth), 5.2; the Wren garment modules (reuse them with Moth's measurements).

## Do

1. Reuse the shirt, base layer and trouser generators on Moth's body; Moth's differences: rolled sleeves (a folded
   cuff band simulated or built as a rolled tube) showing the knit base sleeve, a lean loose stance read.
2. Leg loops of the climbing harness come in step 14; leave room (no pockets under them).
3. Renders and checks.

## Out of scope

Head, hands, feet, kit.

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
- Start step 13 (moth-hands-feet-head) as RULES.md Chaining says.
