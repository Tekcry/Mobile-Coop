# Step 08a - Wren: stealth suit

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15). Run by the orchestrator's step loop (RULES.md
"Step loop", D18).

## Objective

Wren's premium one-piece stealth suit (D22-D24, concept A2), sewn on the body like the step 05 base layer, with its
zones, bonded taped seams, diagonal chest zip, thumb loops, vents, micro-texture and grip panels. It replaces the
base layer, the combat shirt and the trousers in GARMENTS (A37); the gloves, boots and head items are rebuilt over it.

## Read (only these, plus the common files)

- ART-DIRECTION.md Section 9 (all) and the render check; SPEC 3.1 (Stealth suit), 3.5, 5.1 (Suit, Head); DECISIONS
  D22-D24 and A37, A38 (grep).
- The concept: `docs/operators/concepts/A2/A2.md`, `A2-sheet.png`, `A2-chest.webp`, `A2-back.webp`,
  `A2-thigh-left.webp` (Read tool).
- Reuse, in this order:
  - `py/garments/base_layer.py` (`draft`, `leggings_cut`, its `SIM` with `cling`) and `py/garments/legwear.py` (the leg
    block: rise, gusset, `crotch_ease`): the suit is these two blocks joined at the waist.
  - `py/build_garment.py`: `cling()` (SIM `cling`), `inserts` (seamed-in panels, A16: the zone panels), `fair`,
    `layer_push`, `pin`; `py/garment_details.py` (inserts, hems; the suit has no stitch rows).
  - `py/fitted.py`: `boundary_chains` and `strip` (seam tape along the zone and panel boundaries), `smooth_field`,
    `push_out`, `tube`, `level_slice`.
  - `py/materials.py` graph helpers (softshell, elastic, rubber).
  - Scratch (reference only, `scripts/operators/py/trials/stealth/`): `a2_part.py` `mat_shell` (micro-emboss with a
    near fade), `mat_vent` (perforation), `mat_grip` (micro-pebble), `zones_a2` and `apply_suit_a2` (zone outlines and
    tape); `stealth.py` `Frame`, `zone`, `outline_rr`, `ellipse`, `chest_zip` (zip line from the left of the collar to
    the right ribs).
- To re-point the head items: `py/garments/headwear.py` (lines ~120-160, ~285-310, ~480-530: `combat_shirt`, `bl_tree`,
  `tuck_collar`) and `py/garments/head_kit.py` (lines ~80-90 and ~495-510: `sh_tree`, `layers['combat_shirt']`);
  `scripts/operators/export-gltf.mjs` (`GARMENTS`, `FITTED`); `py/render_garment_test.py`, `py/check_garment.py`
  (views per garment); `src/operators/kit.ts` (Wren) and `tests/operators.test.ts`.

## Do

1. `py/garments/suit.py` (kit `suit`): the base layer's top and leg blocks joined into one piece at a waist seam (no
   waistband; if the pattern cannot sew the two blocks, lap them as the base layer does and seal the lap under a
   bonded waist tape: record which). Drafted at the base layer's negative ease and drawn on by `cling`, so it reads
   wetsuit-fitted. Panel seams at the shoulder yokes, side panels, sleeves, knees and seat; the zones of ART-DIRECTION
   9.1 as seamed-in `inserts`: grip (forearms, knees), abrasion (shoulder yokes, elbows, seat), stretch (inner elbows,
   rear shoulders), vents (underarm side panels, backs of the knees).
2. Bonded construction: every seam and insert outline carries a tonal tape strip (about 6-12 mm wide, under 1 mm
   proud, rounded edges) and no stitch rows (no stitch layer). Diagonal chest zip from the left of the collar down to
   the right ribs (coil, slider, puller and a zip garage at the collar). A close mock neck (about 5-6 cm). Thumb loops
   at the sleeve ends (under the glove cuffs). Ankle cuffs bonded about 9 cm above the ground, so they sit at least
   25 mm inside both the step 06 boot collar and the step 09b approach boot collar (A38).
3. Bust and chest: the suit holds the bust as one smooth compression form with no anatomical detail (step 05 OPEN 1:
   scale-aware fairing of the suit over the chest, or flatten the body there before the cling). Carry the step 05
   OPEN items that apply to the suit (gusset tip crumple, thigh-back dents, lumbar dimple) as checks of this step.
4. Materials in `materials.py`: suit shell (tonal diamond micro-emboss about 1.6 mm, faded with distance), stretch
   knit, abrasion weave, grip (rubberised micro-pebble), vent (1.4 mm perforation on a 3.2 mm pitch over a darker
   mesh), seam tape, zip. Values by material, not colour (ART-DIRECTION 4); classify each honestly (fabric or hard).
5. Layers (A37): `GARMENTS.wren` = `suit`, `gloves`, `boots`, `headwear`, `head_kit` (base_layer, combat_shirt,
   trousers, carrier and belt leave GARMENTS; their modules stay for Moth and for reuse). Rebuild the gloves and boots
   over the suit unchanged in code (the glove cuff over the thumb loop, the boot collar over the ankle cuff).
   `headwear.py` and `head_kit.py` read the suit as the collar layer: the hood skirt laps over the suit's mock neck
   (`tuck_collar` and the A25 neck draw-in act on the suit). The earpiece cable keeps its step 07 route here (step 09
   fixes it), but it must build and its collar clip sits on the suit collar.
6. Kit data: Wren's `suit` (and kit ids for the zip and thumb loops if they are built as details); remove `baseLayer`,
   `combatShirt`, `elbowPockets`, `armPocketL`, `armPocketR`, `softShell`, `buttPatch`, `trousers`, `kneePads`,
   `cargoL`, `cargoR`; fix the hood and earpiece text (SPEC 5.1 Head). The carrier and belt items stay until 08b and
   09 replace them. Update `tests/operators.test.ts` for the removed ids (never loosen a check).
7. Views: `render_garment_test.py` frames for `suit` (full a / b / d, plus close-ups: collar, zip garage and hood skirt;
   underarm vent; forearm grip and glove cuff; knee grip and back-of-knee vent; seat abrasion; ankle into the boot; a
   rim-light silhouette) and `check_garment.py` views that sample every suit material. Full rebuild `npm run
   operators:build -- wren --render` in the background (about 50 min).

## Out of scope

Plates, harness, storage, holster, cables (08b, 09), the approach boots (09b); Moth.

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`render_garment_test.py` views) and each is checked against the
  ART-DIRECTION.md render check (1-7) and SPEC 1's checklist; failures are fixed and re-rendered, or written into
  LOG.md as open with the reason.
- In the renders: the suit is one piece with no waistband line; every zone reads by material alone; the seams are
  taped with no stitching; the zip runs diagonally to a garage under the hood skirt; no nipples or other anatomical
  detail on the chest; no gusset crumple; no skin anywhere (D4: thumb loops and cuffs under the gloves, ankle cuffs
  inside the boots, the hood skirt over the mock neck); the micro-texture reads at 0.3-1 m and not at full figure.
- The gloves, boots, headwear and head_kit build over the suit and pass their checks; the hood skirt still laps the
  collar cleanly at the nape (the step 07 round 3 nape check).
- `npm run check` passes.

## Finish

As RULES.md "Step loop" (D18): the implementer drafts the LOG.md record and STATE.md (next: 08b) and returns; the
orchestrator commits "operators: step 08a - Wren: stealth suit".
