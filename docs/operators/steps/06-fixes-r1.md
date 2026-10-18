# Step 06 - fix list, round 1 (checker)

Checker verdict: FAIL. Automated checks pass: `E2E_GPU=1 npm run operators:check -- wren` all 5 items PASS
(base_layer, gloves seam 0 / edge 23.3 mm, boots seam 0 / edge 28.8 mm, combat_shirt, trousers seam 6.0 mm; every
material in band); `npm run check` exit 0 (761 tests, 0 lint errors / 38 warnings). No forbidden files, no loosened
thresholds, no new external files, gloves and boots are in GARMENTS and the kit data. The fails are visual, from the
GPU renders in `docs/operators/mockups/tests/`.

Rebuild what changes (gloves or boots, then the shirt and trousers), re-render with `--render`, re-run both checks,
and update the LOG.md "Step 06" draft (close or re-word OPEN 1, 2, 4, 5).

1. **The trouser hem does not seal over the boot top (step 06 Do 2; ART-DIRECTION 3 "tapered ankles sealing over the
   boots").** Where: `wren-trousers-h-closeup-hem-boot` - the hem stops above the boot collar with a dark gap band
   between them, and the hem is a wide straight tube. Cause in data: `garments/trousers.py:79` drafts `hem_circ` for a
   34 cm boot top, but the boot top girth is 24.0 cm (LOG "Step 06" numbers), and `z_hem` (`trousers.py:71`) ends
   above `boots.py:74` `z_top` (15.5 cm) once settled. Done: the hem drafted from the measured boot-top girth plus
   layer ease, cut long enough that after the simulation it laps at least 2-3 cm down over the boot shaft with no
   gap, and the ankle tab cinches it; seam gap still under 10 mm; `h-closeup-hem-boot` shows the hem over the collar.

2. **The boot toe is a square duck-bill and its toe-cap / rand overlays are torn and faceted (SPEC 1 "materials read
   correctly at close range"; preamble: clipping, generic silhouettes).** Where: `wren-boots-c-closeup-boot-side`
   (square, flat toe; ragged paper-like panel fragments across the toe cap at about x 400-650, y 820-900),
   `wren-boots-e-closeup-boot-laces` (faceted triangles along the toe-cap edge at about y 940-1000),
   `wren-trousers-h-closeup-hem-boot` (same square toe). Code: the toe box in `boots.py` around lines 129-137
   (`TOE_ROOM`, `gw`), the panel snapping (Newton steps, around lines 259-302). Done: a rounded, slightly tapered toe
   in plan and side view (a low-profile tactical boot, not a box), toe height falling toward the tip; the toe cap and
   rand edges are clean continuous curves with stitch rows, no loose triangles, tears or faceting in c, e and h.

3. **Torn eyestay edges on the boot.** Where: `wren-boots-c-closeup-boot-side` (spiky ragged outer edge of the near
   boot's eyestay at about x 980-1000, y 480-560), `wren-boots-f-closeup-boot-sole` (the same jagged edge on the right
   boot at about x 1450-1480, y 680-830). Done: the eyestay boundary is a clean bound or folded edge with its twin
   stitch rows, no spikes, in c and f.

4. **Speed hooks do not read; the near-side lacing shows no hardware (SPEC 3.1 Boots: "laced through eyelets, then
   speed hooks at the top").** Where: `wren-boots-e-closeup-boot-laces` - the right-side eyelets read, but the top two
   stations are indistinguishable from eyelets and the left-side stations show the lace turning at the eyestay edge
   with no visible ring or hook. Code: `boots.py` lacing around lines 388-440. Done: two open speed hooks a side with
   a visible hook shape (raised, open toward the top) above four eyelet rings a side; every lace station on both
   sides shows its hardware in e.

5. **The glove knuckle panel does not read, and its edge is ragged (SPEC 3.1 Gloves: "a knuckle panel of thin padded
   fabric"; LOG says two flex channels).** Where: `wren-gloves-c-closeup-glove-back` - across the knuckles there is
   only a seam band with a crumpled, wavy lower edge (about x 700-1000, y 760-860); no padding thickness or flex
   channels are visible. The same ragged edge shows in `wren-combat_shirt-f-closeup-cuff` (about x 800-1070,
   y 1060-1110). Code: `gloves.py` lines 138-166 (`LIFT['knuckle']`, the flex channels). Done: a distinct padded panel
   standing proud of the knit back with a clean stitched outline and two readable flex channels across it in c and in
   the shirt's f view.

6. **Fingertip patches read as flat cut-off ends or holes.** Where: `wren-gloves-c-closeup-glove-back` - the index,
   middle and ring tips end in flat ellipses with a dark rim (about x 450-500 / 570-620 / 700-760, y 880-1080), which
   read as open fingertips. Code: `gloves.py` tip patches (`LIFT['tip']`, around line 30 and the tip overlay). Done:
   the tips are closed and rounded; the patch wraps the tip as a sewn leather cap with a stitched edge, no visible
   hole or flat facet in c and e.

7. **A floating fragment under the trouser hem.** Where: `wren-trousers-h-closeup-hem-boot`, a small dark piece
   hanging below the hem at about x 940, y 675. Done: no detached geometry below the hem (re-check after item 1).

Notes (not fails; record in LOG.md if not addressed):
- In `wren-boots-a-front-stealth` the boots read much lighter than the leggings above them. The measured albedo is in
  band (suede 0.034); check whether suede `Sheen Weight` 0.6 with tint 0.6 (`materials.py:337`, the highest of any
  material) breaks "near-black" and "matte" in the stealth read; confirm in the Lab or the operator sheet.
- The sole lugs in `wren-boots-f-closeup-boot-sole` are blocky rectangular bricks in clusters with large lug-free
  areas at the edges; a fuller low-lug pattern would read more like a real quiet sole.
- OPEN 3 (close-ups expose near-black as mid grey) stands; judge materials on the operator sheet.
