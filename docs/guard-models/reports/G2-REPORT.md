# G2 report: uniform garments (laptop bake)

Branch `feature/gm-g2` (off feature/guard-models 92292b90). Builder: Opus. Slice G2 of PLAN section 3; outfits per SPEC
sections 3, 4 and 8.

## What
The 16 garment jobs of `guard-bake.mjs --stage garments` (GB contract: `garments/<module>.py --stage garments --job
garments-<base>-<part> --base <b> --garment <part> [--variant rolled|work] --seed --kit --out`) now run G2's scripts
unchanged. Each part's script, run as the main script, hands the job to a new runner, `py/guard_garment.py`, which runs
Wren's cloth stages as they are (`build_garment.py` sew + `garment_details.py`, or `build_fitted.py` for boots and gloves)
on the G1 body of the base, with the part's module configured for the guard bake.

| Base | Parts (jobs) | Outfits |
| --- | --- | --- |
| average | shirt, trousers, boots, gloves, jacket | uniform (grunt, droneOp), uniform_jacket (officer) |
| lean | shirt_rolled, trousers, boots, gloves, work_jacket, work_trousers, work_gloves | uniform_rolled (sniper), work (runner) |
| broad | shirt, trousers, boots, gloves | uniform (heavy, enforcer) |

Designs (original, generic, no text or insignia; SPEC 11):
- `shirt` (combat_shirt.py guard mode): Wren's block (raglan sleeves with the articulated elbow, knit underarm gussets,
  stand collar with the quarter zip, cuff tabs) re-cut as a woven field shirt worn on the skin: ripstop torso +8 % girth,
  no length stretch, topstitched side seams, sleeves +12 %; two chest pockets with plain flaps; no elbow pads, arm
  pockets or loop panels. Tucked into the trousers (Wren's `tuck`).
- `shirt_rolled` (`--variant rolled`): the same shirt simulated with full sleeves (the identical cloth), then every
  sleeve face below a line 7 cm above the elbow is cut from the welded mesh (forearms show the body's skin slot), and a
  soft roll (a tube, the sleeve's fabric) is laid round each cut edge (`<part>-roll`). No cuffs or cuff tabs.
- `trousers` (trousers.py guard mode): Wren's cut and leg block on bare legs, cargo pockets with flaps and drain
  grommets (square to the leg, outer edge 1.5 cm inside the outseam), fly, snap, belt loops, ankle tabs, tapered to seal
  over the boot; no knee pads, seat panels or knee inserts; no seat bridging (it spans the leggings Wren wears).
- `work_trousers` (`--variant work`): plain, a straight leg over the boot (hem 1.45 x the boot top girth), two back
  patch pockets, fly, snap, belt loops; no cargo pockets or ankle tabs.
- `boots` (boots.py guard mode): Wren's laced boot lofted from the guard's foot, shaft 2 cm taller (0.175 x s). One job
  per base serves every outfit there (lean: uniform_rolled and work; P1 re-check polish item 6).
- `gloves` (gloves.py guard mode): Wren's shrink-fitted glove. The guards have one bone per finger (SPEC 6), so the build
  reads three segments split from each bone (phalanx shares 0.47 / 0.29 / 0.24, thumb 0.40 / 0.33 / 0.27, the last
  bent 7 degrees to the palm to give the hand frame its palm side) and each finger vertex gets the segment it lies along.
- `work_gloves` (`--variant work`): no knuckle panel, cuff 7.5 cm (5.5), 2.6 mm thick (2.2), tan leather.
- `jacket` (new field_jacket.py): the officer's short field jacket on the combat shirt block: ripstop, +10 % girth over
  the shirt, sleeves +15 % and 1 cm longer, 5 cm stand collar, full-length front zip, two lower patch pockets with plain
  flaps, plain shoulder straps on the raglan tops, cuff tabs, twin-needle side seams, hem hangs free over the trousers.
- `work_jacket` (`--variant work`): the runner's zip-front work jacket (A11): soft-shell canvas, 3.5 cm collar, full
  zip, two slanted hip pockets without flaps, cuff tabs; worn on the skin over the work trousers' waist.

## Layers (the main decision)
The stage's jobs run in parallel and each needs only its body (GB contract), but the trousers go over the tucked shirt
and the boot shaft, and the jackets over the shirt and the trousers. So a job whose part is worn over others rebuilds
the parts under it first, in its own work folder, with the same scripts, seed and settings as their own jobs, and sews
its part over them exactly as Wren's garments are sewn over hers (`--under`: drafted with a layer allowance, pushed
clear of them after the simulation). Only the part's own objects ship. The chains (`py/guard_garments.json`, checked
against the kit by the test):

| Base | Part | Rebuilt under it |
| --- | --- | --- |
| average | trousers | shirt, boots |
| average | jacket | shirt, boots, trousers |
| lean | trousers | shirt_rolled, boots |
| lean | work_trousers | boots |
| lean | work_jacket | boots, work_trousers |
| broad | trousers | shirt, boots |

Each sewn chain part is built over exactly its own job's chain (the test checks the prefix rule), so its copy matches
its own job's output as far as Blender's cloth solver is deterministic for the same inputs; the outer layer clears it
by Wren's layer step (4.1 mm; 6.1 mm under the jackets, whose cloth gap is 3.5 mm so the shirt's chest pockets and the
trousers' belt loops stay under them). Cost: the trousers jobs run 2 cloth simulations, the jacket 3, the work jacket 2;
wall time is the longest job (the jacket), not their sum. The trousers count a layer under them only where one is: above
the shirt's measured hem (the copy's lowest torso point) and below the boot top + 1 cm.

## Outputs (per job, under `--out`)
- `garments/guard-<base>-<part>.blend`: only the part's objects, all named `guard-<base>-<part>[-...]`: the hero mesh
  (`-hero`, solidified), its details (stitches, binding, zip, slider, hardware, roll, and the patches, which garment_details
  names after their spec: G2 prefixes them), and the welded cloth shell `guard-<base>-<part>` (hidden). No body, no rig:
  G4 skins from `bodies/guard-<base>-body` (nearest body vertex, as Wren's export does).
- `garments/guard-<base>-<part>.json`: part, module, variant, method, outfits, layer, tint slot (`uniform` for shirts,
  trousers, jackets; `none` for boots and gloves, SPEC 8), chain, per-step timings, objects with faces and evaluated
  triangles, shown triangles, seam gap before the weld, the sim summary, the drafted measurements, the body's measured /
  target dimensions, panels, seams, the detail report.
- The work folder `garments/work/<base>-<part>/` is deleted after a success, kept after a failure (`--keep-work` keeps it).

## Files
- New: `scripts/operators/py/guard_garment.py` (the job runner), `scripts/operators/py/guard_garments.json` (parts,
  outfits, layer order, chains, tint), `scripts/operators/py/garments/field_jacket.py`, `tests/guardGarments.test.ts`.
- Changed (guard mode only, behind `configure()` and the `__main__` job entry): `garments/combat_shirt.py`,
  `garments/trousers.py`, `garments/boots.py`, `garments/gloves.py`.
- Not touched: torso_common.py, kit_common.py, rigid_skin.py, build_gear.py, py/gear/**, build_guard_body.py,
  guard_body.py, build_head.py, build_garment.py, garment_details.py, build_fitted.py, guardBakePlan.mjs.

## Wren unchanged
Nothing new runs on Wren's path: the guard code sits behind `configure()` (never called by Wren's build) and the
`if __name__ == '__main__'` job entry (Wren's stages import the modules). Checked outside Blender with Blender 5.2's
bundled Python and stubbed `mathutils` / `bpy` (scratch harness, not committed): `combat_shirt.draft`, `trousers.cut`,
`trousers.draft` (with and without boots), and through them `base_layer.draft` and `suit.draft` (Wren's suit) give
identical panels, seams, details and info, bit for bit, to the 92292b90 copies. boots.py (`Z_TOP * sc` with Z_TOP =
0.155, the same product) and gloves.py (`NAME = 'gloves'`, `KNUCKLE = True`, `LEATHER = None` give the same names,
loops and material call) are identical by reading; they need bpy to run.
The same harness drafted all six guard sewn parts on G1's average body joints: every patch inside its panel (Wren's own
zip garages and belt loops overhang by design), names unique and prefixed, flap and grommet references resolve, panel
and patch materials known to garment_details, every seam's corners exist.

## Smoke run
SMOKE_PLACEHOLDER

## Tests
TESTS_PLACEHOLDER

## Decisions I assumed (each undoable)
- Layer chains rebuilt per job (above), not a garment-to-garment dependency in the bake graph (the GB contract has
  garments needing only bodies; changing that is guardBakePlan.mjs, not mine). Undo: add `needs` on the under parts
  and let `--under` open their outputs; the runner's chain loop then becomes a copy.
- Rolled sleeves are cut after the simulation, not drafted short: build_garment arranges a sleeve along the whole arm
  in proportion to its pattern length, so a short sleeve would start stretched 2:1 along the arm.
- The cut-off head (`guard-<base>-headref`) is joined unweighted into the work copy of the body so the collar has a
  head to collide with; it never ships.
- Officer's shirt under the jacket ships whole (it is the shared `average` shirt). Where its folds come through the
  jacket, G4 / G5 can hide the covered shirt faces for `uniform_jacket` (a piece split by a ray test from the jacket).
- Materials are Wren's procedural ones (dark, baked colours). The `uniform` tint slot wants a neutral fabric (SPEC 8:
  tintNeutral 0.4); that is G4's bake (atlas + `_TINT`), the part's `tint` is in its report.
- Boots shaft raised 2 cm for a field boot; gloves for the uniform keep Wren's knuckle panel, tip patches and wrist tab
  ("plain gloves" read as plain at 8 m).

## Open items
- LIBS (guardBakePlan.mjs, not mine; for the lead): a garment job's hash covers its own script and the stage's LIBS
  only, so a change to the runner, its data or a chain part's script would not rebake the jobs that use them. Add to
  `LIBS.garments`: `guard_garment.py`, `guard_garments.json`, `build_fitted.py`, `garments/legwear.py`,
  `garments/combat_shirt.py`, `garments/trousers.py`, `garments/boots.py`, `garments/field_jacket.py` (gloves.py is in
  no chain). Not needed for the first bake (nothing is cached yet).
- GB-REPORT's job contract table could add `[--variant rolled|work]` on the garments row (P1 re-check polish item 4).
- Not run in Blender: rolled cut + roll, gloves on the one-bone fingers, work variants, trousers alone, the lean and
  broad bases. The lead's laptop stage after G1 lands is their first run.
- Determinism of the chain copies is assumed (same machine, same inputs); the layer step gives a 4-6 mm margin.
- The jacket hem over the trousers' belt loops and the shirt pockets under the jacket front: watch on G4's sheet (G10).
