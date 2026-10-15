# Step 14 - Moth: climbing harness, chest rig, hardware, pack, comms

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Moth's climbing harness and hardware, chest rig, pack and comms.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 2-5; SPEC 3.4, 5.2; `src/operators/kit.ts`.

## Do

1. Climbing harness: waist belt pulling the trouser waistband down at the front (re-settle the trousers), leg
   loops on the trousers, belay loop with abrasion, gear loops; carabiners and descender as parametric hardware.
2. Chest rig instead of a carrier; H-straps; radio, cables and earpiece routes per the kit data; pack low on the back.
3. Chalk dust wear. `validateKit` passes; renders and checks.

## Out of scope

Bakes.

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
- Start step 15 (moth-bake-lod-export) as RULES.md Chaining says.
