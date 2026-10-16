# Step 09 - Wren: storage, holster and cables

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15). Run by the orchestrator's step loop (RULES.md
"Step loop", D18). Rewritten for D22-D24 (concept A2); the first plan (pistol, flat pack, IR strobe) is history.

## Objective

Wren's slimline storage mapped to the game loadout (ART-DIRECTION 9.2 table): the chest rig on the plate, the slim
waist belt and its pouches, the empty thigh holster, the left-thigh throwable sleeves, the drone pod and medkit, the
radio in the back plate with its cable to the PTT, and the fix of step 07's OPEN earpiece cable route.

## Read (only these, plus the common files)

- ART-DIRECTION.md Section 9 and the render check; SPEC 3.2 (Wren's belt and leg kit, Thigh holster, Pouches), 3.3
  (Comms), 5.1 (Chest rig, Comms, Belt, Legs); DECISIONS D24, A27, A29, A34, A36, A39-A42 (grep).
- `docs/operators/steps/07-fixes-r4.md` (the earpiece cable MUST item and its probe).
- The concept: `docs/operators/concepts/A2/A2.md`, `A2-chest.webp`, `A2-back.webp`, `A2-thigh-right.webp`,
  `A2-thigh-left.webp` (Read tool). The rifle, its belt cup and the pistol in them are not built (D24); the pod and
  medkit move (A39).
- Game data (read only): `src/game/gadgets.ts` (carry counts), `src/weapons/carrySlots.ts` (thigh and sling slots),
  `src/weapons/weaponModel.ts` lines 15-30 and 160-175 (thigh slot placement, `SLING_GAP`), `src/weapons/weaponDefs.ts`
  (the sidearms' dimensions: pistol, fiveseven, pistolSd).
- Reuse:
  - `py/garments/mag_buckle.py` (step 08b) for every closure; `py/garments/armour.py` (plate surfaces, the radio
    recess, the left shoulder strap's keepers).
  - `py/garments/carrier.py`: `Pouch` (open-top magazine pouches with shock cord and pull tabs, sag and tip), the
    radio and antenna code (two knobs, connector boss), `frame` / `pframe` on a plate.
  - `py/garments/belt.py`: the belt ring (`theta_at`), `hang` (pouches on a belt), `loft`; the step 08 pistol magazine
    pouch and knife geometry as starting shapes.
  - `py/garments/torso_common.py`: `Ring`, `band_slab`, `slab`, `fillet`, `compress` (A33), `box_uv`.
  - `py/garments/head_common.py`: `rbox`, `taper`, `knurl` (the frag caps), `pad`, `ray_in`, `cable_dir`;
    `py/garments/head_kit.py` lines ~495-515 (the earpiece cable route); `py/fitted.py`: `tube`, `strip`, `push_out`.
  - Scratch (reference only, `scripts/operators/py/trials/stealth/`): `a2_part.py` `mag_pouch`, `mag_buckle`,
    `holster_a2`, `thigh_sleeves` (the double sleeves and caps), `back_kit` (pod, medkit, radio, cable route);
    `stealth.py` `Frame` with a short `reach` for the thigh frames (inner-thigh rays must not find the other leg),
    `band`, `box_at`, `mag`.

## Do

1. Chest rig (FITTED item `chest_rig`, after `armour`): two rifle magazine pouches right of centre with their tops
   leaning toward the left hand (open top, shock cord, pull tabs; the magazines short and swept as in A2.md), the
   flapped gadget slot upper right with a magnetic tab (EMP 1 and noisemakers 2 as flat discs inside), the knife left
   of centre handle down (moulded sheath, gunmetal release, rubber handle, gunmetal guard and pommel), and the PTT on
   the left shoulder strap at the collarbone, where the step 07 earpiece plug ends.
2. Comms: the radio set flush into the back plate's recess (upper left) with a short stub antenna along the plate's top
   edge in a keeper; the radio cable from its top connector over the left shoulder along the strap edge, through the
   three keepers (no free span over 15 cm), to the PTT. Fix step 07's earpiece cable (steps/07-fixes-r4.md MUST 1):
   every cable point stays on the near (left front) side of the neck (limit each `ray_in` cast so it cannot pass the
   neck axis, or fall back to the nearest suit or skin point on that side); re-measure `earpieceCable.length` and its
   retention points in `kit.ts`; correct A27 and the stale A29 facts listed in 07-fixes-r4 "For the orchestrator";
   rebuild `head_kit` (and `headwear` if its cable ridge moves).
3. Waist belt (FITTED item `waist_belt`, after `chest_rig`): a slim laminate belt over the suit with a flush magnetic
   front closure; the double pistol magazine pouch at the left front; the flat cam / mine pouch at the left hip (2
   cams, 1 mine; flap with a magnetic tab); the rappel ring at the back centre in a low tunnel (a gunmetal D folded
   flat, only its bow showing); a flush quick-detach sling socket at the left hip (A41); the drone pod rear left and
   the medkit rear right, both outside the back-carry lane (A39): the pod a small hard shell with a rubber lid seal
   and a gunmetal latch, the medkit a flat tear-away pouch with a webbing pull handle at its bottom edge and a visible
   tear seam. No sit harness, leg loops or gear loops.
4. Leg kit (FITTED item `leg_kit`, after `waist_belt`): the empty thigh holster at the game's thigh slot on the right
   thigh (A40: a slim polymer shell whose cavity fits the largest thigh-slot sidearm in `weaponDefs.ts`, open at the
   muzzle end, retention hood with a gunmetal release shown closed, an empty frame `pistolHolster` in the sim report),
   on two elastic leg bands with magnetic buckles and a short hanger from the belt; on the left thigh three double
   sleeves on a laminate panel (frag 2, gas 2, flash 2, one type per sleeve; caps knurled ring / dome / two ridges; a
   shock-cord loop and pull tab over each cap) on two leg bands and a hanger from the belt. The bands bow slightly
   round the thigh and dent the suit (`compress`).
5. Kit data: add `ptt` (moved), `radio`, `radioCable`, `magPouches` (count 2), `gadgetSlot`, `knife`, `waistBelt`,
   `pistolMagPouch` (left front), `camMinePouch`, `rappelRing`, `slingSocket`, `dronePod`, `medPouch`, `thighHolster`
   (empty; contents named "the game's sidearm (not modelled)"), `holsterHanger`, `legBands`, `sleevePanel`,
   `throwableSleeves`, `sleeveHanger`; remove `adminPouch`, `radioPouch`, `belt`, `grenadePouches`, `dumpPouch`,
   `knifeSheath`, `dropHanger`, `legStraps`, `smgSling`. Every pouch's contents match `gadgets.ts` counts. Update the
   tests for the changed ids. `GARMENTS.wren` += `chest_rig`, `waist_belt`, `leg_kit` (FITTED). Views: chest rig
   close-up, back plate with the radio and cable, left shoulder with the PTT and both cables, belt front and back,
   right thigh, left thigh, and a rim-light silhouette.

## Out of scope

The approach boots (09b); bakes and LODs (10); any gun or sling (D24); Moth.

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`render_garment_test.py` views) and each is checked against the
  ART-DIRECTION.md render check (1-7) and SPEC 1's checklist (every item: anchors, contents, route, job); failures are
  fixed and re-rendered, or written into LOG.md as open with the reason.
- Step 07's cable MUST is met: the signed-distance probe of 07-fixes-r4 (cable ring centres against `wren-body`, the
  hood and the balaclava) finds no ring inside the body or outside the hood above the skirt hem; in the head back
  close-up no cord shows on the neck; the kit length matches the measured length within 1 cm.
- Every pouch stands no more than about 2.5 cm off the body (magazine pouches about 4 cm), measured and reported;
  nothing lies in the back-carry lane except the plate, the recessed radio, the mount point and the flush rappel ring
  (A39); the holster's `pistolHolster` frame matches the game's thigh slot within 1 cm.
- No hook-and-loop, no loose metal, no open loops or dangling tabs in any render.
- `npm run check` passes.

## Finish

As RULES.md "Step loop" (D18): the implementer drafts the LOG.md record (and notes step 07's cable item as fixed here
for the orchestrator) and STATE.md (next: 09b) and returns; the orchestrator commits "operators: step 09 - Wren:
storage, holster and cables".
