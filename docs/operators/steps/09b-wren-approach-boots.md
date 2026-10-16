# Step 09b - Wren: approach boots

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15). Run by the orchestrator's step loop (RULES.md
"Step loop", D18).

## Objective

Wren's light approach boots (D23: "Lighter approach boots"): a proper approach-shoe last, a sticky rubber rand, an
edging sole and low lugs. They replace the step 06 mid boot for Wren.

## Read (only these, plus the common files)

- ART-DIRECTION.md Section 9 (Boots row) and the render check; SPEC 3.1 (Approach boots), 5.1 (Hands and feet);
  DECISIONS D23, A18-A22, A38 (grep); LOG.md step 06 open items (grep "Step 06", the OPEN lines only: toe blunt,
  speed hooks, lug clusters, heel brake).
- The concept: `docs/operators/concepts/A2/A2-boot.webp` (a cut-down step 06 boot: the shape to move away from).
- Reuse:
  - `py/garments/boots.py`: `Frame`, `build_foot` (the upper rings, `rand_g`, `lace_path`, `eyestay_pt`, the sole
    `z_bottom`, `hull_perim`), `_orient_outward`, `_planar_uv`; its materials (suede, nylon, rubber with the `wear`
    attribute).
  - `py/fitted.py`: `level_slice`, `split_step`, `stitch_row`, `tube`, `ring` (eyelets), `push_out`, `smooth_field`.
  - `py/garments/mag_buckle.py` only if a closure needs it (laces are fine).
  - Scratch (reference only): `scripts/operators/py/trials/stealth/a2_part.py` `boots_a2` (the collar, rand rise and
    flattened lugs on the old last).

## Do

1. `py/garments/approach_boots.py` (FITTED item `approach_boots`, kit id `boots` kept, renamed "Approach boots"): a new
   approach-shoe last on Wren's foot: lower toe volume with a slight toe spring, a close heel cup, a padded collar about
   12-13 cm high with a heel pull loop, lacing that runs close to the toe through low-profile eyelets (no speed hooks),
   a bellows tongue.
2. Sole: a sticky rubber rand round the whole sole that rises over the toe box (and a little up the heel); a firm, thin
   midsole; a flat edging zone under the toes; low lugs (about 3 mm) with a distinct heel brake; the outsole pattern
   original (no copied tread).
3. The suit meets the boot (A38): the suit is built before the boots, so its bonded ankle cuff (about 9 cm) sits at
   least 25 mm inside the collar; the collar closes over the suit with no gap and no skin (D4). The step 06 trouser hem
   coupling (A22) no longer applies; nothing is rebuilt below the boots.
4. `GARMENTS.wren`: `approach_boots` replaces `boots` (`boots.py` stays for Moth). Rebuild from the boots on
   (`operators:build -- wren --from approach_boots`, in the background): headwear and later items are rebuilt over
   it unchanged. Update the kit text and tests. Views: the step 06 boot views plus a toe close-up (rand and edging), the
   sole from below, the collar with the suit cuff, and a side profile.

## Out of scope

Everything above the ankle; Moth's boots.

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`render_garment_test.py` views) and each is checked against the
  ART-DIRECTION.md render check (1-7) and SPEC 1's checklist; failures are fixed and re-rendered, or written into
  LOG.md as open with the reason.
- In the renders: it reads as an approach shoe with a mid collar, not a short combat boot (lower toe, rand rising over
  the toe, flat edging zone, low lugs, heel brake); collar height measured 11-14 cm; the suit cuff is inside the collar
  with no gap; the toe is not blunt at close range (step 06 open item).
- `npm run check` passes.

## Finish

As RULES.md "Step loop" (D18): the implementer drafts the LOG.md record and STATE.md (next: 10) and returns; the
orchestrator commits "operators: step 09b - Wren: approach boots".
