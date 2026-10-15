# Step 08 - Wren: plate carrier, harness and belt

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren's slick low-profile plate carrier, slim harness and narrow battle belt (ART-DIRECTION 3), all from the kit
data.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 2-5, 8; SPEC 3.2, 3.5, 5.1 (torso); `src/operators/kit.ts`.

## Do

1. Plate carrier cut high: slim plates, padded shoulder straps, elastic cummerbund under a front flap, laser-cut
   webbing, quick-release cable at the front, rounded edges; three flat magazine pouches, admin pouch, radio pouch per
   the kit list; strap ends rolled and banded.
2. Harness and belt: slim straps and a low-profile buckle; straps are swept profiles between named anchors with
   tension; the fabric under them compresses (re-settle the shirt with the carrier as a collider).
3. Hard parts (buckles, clips, cable) as bevelled parametric models: matte polymer and coated metal.
4. `validateKit` passes; renders and checks (the silhouette against a rim light: shoulder line, straps).

## Out of scope

Holster, pack, comms; Moth.

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
- Start step 09 (wren-holster-pack-comms) as RULES.md Chaining says.
