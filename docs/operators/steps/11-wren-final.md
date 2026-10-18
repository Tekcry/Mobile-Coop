# Step 11 - Wren: full render set and self-review pass

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15). Run by the orchestrator's step loop (RULES.md
"Step loop", D18).

## Objective

Wren complete as the A2 stealth operative (D22-D24): the full render set and one self-review fix pass against the art
direction.

## Read (only these, plus the common files)

- ART-DIRECTION.md (all; Section 9 is Wren's standard), SPEC 1, SPEC 5.1, BRIEF Stage 2.2 sheet list.
- The concept for comparison: `docs/operators/concepts/A2/A2-sheet.png` (Read tool).

## Do

1. Render every Wren sheet with `scripts/operator-sheet.mjs` into `docs/operators/mockups/wren/` (WebP), including
   the close-ups this design needs: collar, zip garage and hood skirt; chest rig; rib segments from the side; back plate
   with the radio, cable and mount point; left shoulder with the PTT and both cables; belt front and back (rappel ring,
   pod, medkit); right thigh (empty holster); left thigh (sleeves and caps); forearm and knee grip; underarm vent;
   approach boot; a rim-light silhouette; and the goggle in use and stowed.
2. Self-review each close-up against the SPEC 1 checklist (every item: anchors, contents, route, job) and the
   ART-DIRECTION render check 1-7; check the loadout against the ART-DIRECTION 9.2 table (every game item has its
   place and nothing else is carried); fix what fails, re-render, and list anything left open in LOG.md.
3. `docs/operators/mockups/wren/DESIGN.md`: design notes, kit callouts (with the loadout table), the not-modelled
   weapons and their anchors (D24, A36, A40, A41), costs.
4. Block end (RULES.md): step 08 is superseded and is not retried. Step 07's OPEN item (the earpiece cable) was fixed
   in step 09: if step 09's checker confirmed it, mark step 07 closed in LOG.md; otherwise it is retried as RULES says.

## Out of scope

Moth.

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`operator-sheet`) and each is checked against the ART-DIRECTION.md render check
  (1-7) and SPEC 1's checklist; failures are fixed and re-rendered, or written into LOG.md as open with the reason.
- `npm run check` passes.

## Finish

As RULES.md "Step loop" (D18): the implementer drafts the LOG.md record and STATE.md and returns; the orchestrator
commits "operators: step 11 - Wren: full render set and self-review pass". Step 12 starts by asking Michael Moth's
direction (D24), see PLAN.md.
