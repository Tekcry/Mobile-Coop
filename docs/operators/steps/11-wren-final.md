# Step 11 - Wren: full render set and self-review pass

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren complete: the full render set and one self-review fix pass against the art direction.

## Read (only these, plus the common files)

- ART-DIRECTION.md (all), SPEC 1, BRIEF Stage 2.2 sheet list.

## Do

1. Render every Wren sheet with `scripts/operator-sheet.mjs` into `docs/operators/mockups/wren/` (WebP).
2. Self-review each close-up against the SPEC 1 checklist (every item: anchors, contents, route, job) and the
   ART-DIRECTION render check; fix what fails, re-render, and list anything left open in LOG.md.
3. `docs/operators/mockups/wren/DESIGN.md`: design notes, kit callouts, costs.

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
- Start step 12 (moth-garments) as RULES.md Chaining says.
