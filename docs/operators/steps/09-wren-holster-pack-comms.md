# Step 09 - Wren: thigh holster, pack, cables and strobe

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

Wren's drop-leg thigh holster with the pistol, the compact low back pack, comms (PTT, radio cable, antenna) and the
IR strobe.

## Read (only these, plus the common files)

- ART-DIRECTION.md Sections 2-5; SPEC 5.1 (holster, back, comms); `src/operators/kit.ts`.

## Do

1. Holster platform with leg straps (bowing slightly round the thigh), retention hood; the pistol shape original
   (its camera jammer is part of the pistol).
2. Compact flat pack low on the back (rope, tools, spare gear inside; nothing tied outside), straps to the harness.
3. Cables routed under straps from source to device, retention every 15 cm or less (kit data), PTT on the chest or
   shoulder, IR strobe with a tiny muted emitter.
4. `validateKit` passes; renders and checks.

## Out of scope

Bakes and LODs; Moth.

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
- Start step 10 (wren-bake-lod-export) as RULES.md Chaining says.
