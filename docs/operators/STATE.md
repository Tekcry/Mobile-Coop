# Operators run - state (resume point)

**Now:** step 08a - Wren: stealth suit (`steps/08a-wren-stealth-suit.md`, Opus 5.5 High). Re-planned for D22-D24
(2026-10-16): Wren is concept A2, the premium stealth operative (`docs/operators/concepts/A2/A2.md`, ART-DIRECTION
Section 9, SPEC 3.1-3.3 and 5.1), built without the rifle and the pistol (D24). Then 08b, 09, 09b, 10, 11 (PLAN.md).
OPEN steps: 07 (earpiece cable route: fixed inside step 09), 08 (superseded, never retried).
**Run style:** unattended (D15), one orchestrator session like the locomotion run (D18): implementer, independent Opus
checker, up to 3 fix rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Start
and resume prompts: OWNER-NOTES.md ("Operators run: RESUME (local)"). Step 12 starts by asking Michael (D24).

**Key facts for step 08a**
- New layer order (A37): `GARMENTS.wren` = `suit`, `gloves`, `boots`, `headwear`, `head_kit` (`export-gltf.mjs`).
  The suit replaces the base layer, the combat shirt and the trousers (their modules stay for Moth and reuse); the
  carrier and belt (step 08) leave GARMENTS. Gloves and boots rebuild over the suit unchanged in code; the suit's
  ankle cuff (about 9 cm) sits inside the boot collar (A38), so 09b's new boots do not rebuild the suit.
- The suit is the base layer's top and leg blocks (`garments/base_layer.py` `draft`, `leggings_cut`;
  `garments/legwear.py`) joined at the waist, drawn on by `cling` (`build_garment.py`), its zones as seamed-in
  `inserts` (A16), taped seams (`fitted.boundary_chains` + `strip`) and no stitch rows. Scratch reference for the
  zones and materials: `scripts/operators/py/trials/stealth/a2_part.py` (`zones_a2`, `mat_shell`, `mat_vent`,
  `mat_grip`) and `stealth.py` (`chest_zip`).
- The head items read `combat_shirt` today: `headwear.py` (~125, ~289-310, ~481-530: collar tuck, `tuck_collar`) and
  `head_kit.py` (~83, ~501: `sh_tree`, the earpiece cable). Point them at the suit (its mock neck is the collar).
  The earpiece cable's route through the neck (07-fixes-r4 MUST) is step 09's job, but it must still build here.
- Step 05 OPEN items that now show on the outer layer: base-layer nipples (flatten or fair the suit over the bust),
  gusset tip crumple, thigh-back dents, lumbar dimple. Near-black materials render mid grey in close-ups (OPEN since 05).
- Pipeline: `npm run operators:build [-- wren] [--render] [--from <garment>]`, then `npm run operators:check [-- wren
  --only <item,item>]`; outputs in `build/operators/<id>/` (git-ignored). Garments build in `GARMENTS` order, each
  opening the previous blend (`--under`), drafted with `UNDER_LAYERS` girth allowances (body plus 3 mm, plus 4.1 mm per
  layer under it), pushed clear of the layers (`layer_push`); Blender cloth-on-cloth collision stays off (A11). A full
  rebuild takes about 50 min and the check 25-30 min: run them in the background.
- Fitted items (A18): `py/build_fitted.py` (`FITTED`), geometry in `py/fitted.py`; head geometry in
  `garments/head_common.py`; plates, rings, straps and `compress` (A33) in `garments/torso_common.py`; pouches in
  `garments/carrier.py` (`Pouch`), belt rings in `garments/belt.py`.
- Bodies are bound in A-pose on the game skeleton (D13); waist 0.93 of SPEC A4; the strong goggle glow stays (D13).
- Lab and sheets: `npm run operators:export`, `npm run operators`, `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet --
  wren`; sheets in `docs/operators/mockups/wren/`, test renders in `docs/operators/mockups/tests/`.
- Later steps, for orientation: 08b `armour` (plates, rib segments, back plate with the radio recess and the weapon
  mount frames, harness, `garments/mag_buckle.py`); 09 `chest_rig`, `waist_belt`, `leg_kit` and the earpiece cable
  fix; 09b `approach_boots` replaces `boots`. Game carry geometry: `src/weapons/carrySlots.ts`, `weaponModel.ts`
  (A36, A39-A41).

**Open questions for Michael:** Moth's direction (asked at step 12, D24). Integration items for locomotion step 25:
upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left-thigh sleeves (A41).
