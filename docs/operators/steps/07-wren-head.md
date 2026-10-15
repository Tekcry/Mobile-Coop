# Step 07 - Wren: hood, optic, mount and comms head kit

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren's head: fitted balaclava and close hood, the original square multi-mode optic on a low-profile flip mount,
head harness, battery and cable, slim earpiece with boom mic. No visible face or skin (D4).

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 1, 3, 4 (lens glow exception, D13); SPEC 2, 3.3, 5.1 (head); DECISIONS D4, D5, D13.

## Do

1. Balaclava (flatlock seams, one eye port sealed by the eyecups) and the close hood with the rear shock-cord
   adjuster and cord lock, sewn and simulated on the head.
2. The optic: an original square single-shroud housing over two optics (no three-lens cluster, no real product
   shapes), rubber eyecups, dovetail into a flip mount on the harness front plate with fore-aft and height knobs;
   lenses with a clear green glow in the dark (D13); tiny muted status emitter. Up and down positions.
3. Head harness (crown strap, side straps, rear cradle, chin strap with side release), battery pack with retention
   strap, the goggle cable on its clips with strain reliefs (kit data routes), earpiece and boom mic with the cable
   under the balaclava edge. Renders (include a darkness view with the glow only) and checks.

## Out of scope

Torso kit; Moth.

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
- Start step 08 (wren-carrier-harness) as RULES.md Chaining says.
