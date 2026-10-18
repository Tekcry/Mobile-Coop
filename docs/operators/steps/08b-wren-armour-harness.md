# Step 08b - Wren: composite armour and harness

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15). Run by the orchestrator's step loop (RULES.md
"Step loop", D18).

## Objective

Wren's composite chest plate with three rib segments, the slim back plate with the radio recess and the weapon mount
point, the low harness (shoulder and side straps) and the magnetic quick-release buckle as a reusable part (D24,
concept A2).

## Read (only these, plus the common files)

- ART-DIRECTION.md Section 9.1-9.2 and the render check; SPEC 3.2 (Composite plates and harness, Weapon mount point),
  3.5, 5.1 (Armour and harness, Comms); DECISIONS D24, A32-A34, A36, A39, A40 (grep).
- The concept: `docs/operators/concepts/A2/A2.md`, `A2-chest.webp`, `A2-back.webp`, `A2-side.webp` (Read tool). The
  rifle in A2-back is not built (D24).
- Game carry geometry (read only): `src/weapons/carrySlots.ts`, `src/weapons/weaponModel.ts` lines 15-30 and 136-160
  (`BACK_X`, `BACK_BUTT_Y`, `BACK_SPLAY`, `CARRY_GAP`, `rig.backGear`).
- Reuse:
  - `py/garments/torso_common.py`: `Plate`, `slab`, `fillet`, `densify_closed`, `Ring`, `band_slab`, `padded_strap`,
    `compress` (A33: the suit pressed under the parts), `rbox_edge`, `box_uv`, `resample`, `tangents`.
  - `py/garments/carrier.py`: `fit` (the plate search; here a conformal moulded shell, see Do 1), the shoulder strap
    on the shoulder's convex hull, `outline`, `frame`, `pframe`, `Parts`, `_merge`, the `plugClearM` / `hoodClearM`
    measures (A34).
  - `py/garments/belt.py`: strap rings and `loft`; `py/garments/head_common.py`: `rbox`, `pad`, `strap_mesh`;
    `py/fitted.py`: `strip`, `push_out`, `add_mesh`.
  - Scratch (reference only, `scripts/operators/py/trials/stealth/`): `a2_part.py` `concept_A2` (plate, segment and
    strap layout), `mag_buckle`, `mat_comp` (composite with a faint fibre texture); `stealth.py` `PlateMap`, `plate`,
    `band`, `outline_rr`.

## Do

1. `py/garments/armour.py` (FITTED item `armour`, after `head_kit`): a composite chest plate with a neck scoop and
   three overlapping rib segments below it (each lapping the one below, on an internal elastic web), and a slim back
   plate ending at the ribs. Moulded, not slab: each plate is a conformal shell offset from a faired copy of the
   suit's surface (it follows the bust and torso and bridges only the sternum hollow). Chamfered edges with a rubber
   trim, one corner-radius family, matte composite with a faint fibre texture. The scoop clears the earpiece plug and
   the future PTT at the left collarbone (measure as A34 did).
2. Back plate: a recess in the upper left for the radio (built in step 09) with its antenna keeper on the top edge,
   and the weapon mount point on the spine: a flush gunmetal receiver plate (A40) with three named frames
   `weaponMount.backL`, `.backC`, `.backR` matching the game's back slots (upright, muzzle up, splay 0.08 rad, 7 cm
   either side; A36). Store the frames in the blend and the sim report. Keep the back-carry lane (A39: about |x| <=
   0.10 m from the belt line to the shoulders) flat apart from the plate; report the plate's standoff behind the
   suit (`backGearM`, for `rig.backGear` at integration).
3. Harness: slim shoulder straps (chest plate top to back plate top, the left one with keepers ready for the radio
   cable) and 22 mm side straps under the arms (plate side to plate side), laid on the suit's convex hull and tensioned
   as in step 08; strap ends bonded flush (no loose tails). The suit is pressed in under the plates and straps
   (`compress`, A33).
4. `py/garments/mag_buckle.py` (kit `magBuckle`): the flush gunmetal magnetic quick-release, two halves with a split
   line on a rubber-edged base, parametric (strap width 20-40 mm), with wear on the edges. Every strap closure here
   uses it; steps 09 and 09b reuse it. (A separate module name, so it does not clash with the hardware helper's
   `py/hardware/` package.)
5. Materials: composite, edge rubber, gunmetal (satin-matte anodised, one finish for every metal part).
6. Kit data: Wren's `chestPlate`, `ribSegments` (count 3), `backPlate`, `harnessShoulders`, `torsoSideStraps`
   (anchors on the plates; the head harness already uses `sideStraps`), `magBuckle`, `weaponMount`; remove `carrier`,
   `carrierShoulders`, `cummerbund`, `backPanel`, `rifleBungee`, `carrierRelease`. `GARMENTS.wren` += `armour` (FITTED). Views: front, back, side, a chest close-up,
   a back close-up with the recess and the mount point, a rib-segment close-up and a rim-light silhouette.

## Out of scope

The chest rig, radio and cables, belt, holster, sleeves, pod, medkit (09); boots (09b); any gun (D24); Moth.

## Checks (all must pass before the commit)

- `npm run operators:check` passes for every built item (seam gaps under 10 mm before weld, no simulation divergence,
  no render-mesh edge over 3 cm and no solidify spikes, fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, every kit item in the kit data with a passing `validateKit`).
- The step's renders exist on the GPU (`render_garment_test.py` views) and each is checked against the
  ART-DIRECTION.md render check (1-7) and SPEC 1's checklist; failures are fixed and re-rendered, or written into
  LOG.md as open with the reason.
- Plate fit measured and in the sim report (`plateGap`): chest plate mean gap to the suit under 6 mm, max under 15 mm
  (only over the sternum hollow); back plate mean under 6 mm. No plate or strap inside the suit beyond the pressed
  depth. The rib segments overlap everywhere (no gap seen from front or side).
- In the renders: the plates read moulded and expensive (one radius family, clean chamfers, rubber trims), the straps
  are flat and tensioned with flush buckles, nothing rattles or dangles (no hook-and-loop, ladder locks or side-release
  buckles); the scoop clears the plug (`plugClearM` reported); the mount point reads as a deliberate flush receiver,
  not a greeble, and its three frames are in the sim report.
- `npm run check` passes.

## Finish

As RULES.md "Step loop" (D18): the implementer drafts the LOG.md record and STATE.md (next: 09) and returns; the
orchestrator commits "operators: step 08b - Wren: composite armour and harness".
