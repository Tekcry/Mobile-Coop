# Step 06 - fix list, round 3 (checker, last round)

Checker verdict: FAIL (one MUST left). Automated checks: `E2E_GPU=1 npm run operators:check -- wren` "5 item(s), all checks pass" (seam gap: base_layer 7.24, gloves 0, boots 0, shirt 5.14, trousers 5.01 mm; edge length: gloves 23.29, boots / shirt / trousers 29.5 mm - 0.5 mm under the limit, so do not add longer edges);
`npm run check` exit 0 (761 tests, 0 lint errors / 38 warnings).

No forbidden files, no loosened thresholds (`check.mjs` untouched; `check_garment.py` only adds the hand and foot
views), no new external files, gloves and boots in GARMENTS, LOG.md draft present. Renders are GPU (11:05-11:11,
newer than HEAD). Views from `docs/operators/mockups/tests/`.

Round 2 results: item 1 (torn boot panels) DONE - clean curved panel edges with a turned edge and stitch row in
`wren-boots-c`, `-e`, `-f`, `wren-trousers-h`. Item 2 (hem) DONE - both hems lap the boot collar in `h`, no leggings
show. Item 4 (bright boots in `a`) ACCEPTED by measurement, not a material fault: in `wren-boots-a` the shafts read
0.07 against the leggings' 0.06-0.08 (mean display value); only the upward-facing toe caps are bright (0.23-0.24
mean), and they are darker than the floor right beside them (0.49) whose albedo is 0.012 against the suede's 0.027.
The bare clay feet in `wren-gloves-a` light the same way. It is the stealth key hitting up-facing surfaces; log it
as closed with these numbers.

Ranked by what matters most to the look. **MUST** = round 3 fixes it. **FOLLOW-UP OK** = if the round runs out, log
it in LOG.md "Step 06" as OPEN with the cause and the next step; it does not block the commit.

1. **MUST - Fingertips still show a dark dot or a flat disc with a dark rim (r1 item 6, r2 item 5).** Where:
   `wren-gloves-c-closeup-glove-back` - thumb tip dark dot (x 545, y 545), finger tips at x 470 y 910 and x 730
   y 1075 (flat ellipse with a dark rim), x 595 y 1040 (dark dot). Re-forming the dome did not change it, so the
   cause is something else. The check reports gloves `deepestInsideSkinMm` 0, so body poke-through is unlikely: start with test (b). Two cheap tests (quick loop, 64 spp, view c only): (a) render with the body
   hidden - if the dot and rim vanish, the body's fingertip pokes through: pull the body hand in under the glove
   (or mask the body faces the glove covers, as the export would) and re-check; (b) render with the tip patch
   disabled (`LIFT['tip']` 0, no tip stitch row) - the rimmed ellipse sits where the 6 mm nail-side edge of the
   fingertip patch (`gloves.py:167-190`, `cap_len`) would circle the tip seen end-on, and the dot where its stitch
   row or the slice converges at the tip pole; if so, end the patch's nail-side edge as a smooth U over the nail
   (not a ring round the tip), with no stitch at the extreme point. Done: c and e show closed, rounded fingertips with
   no dot, disc or dark ring; gloves edge length and seam checks still pass.

2. **FOLLOW-UP OK - The toe still reads blunt and box-like at close range (r2 item 3).** The plan taper now meets
   the number (61 % at 2 cm behind the tip), so this is not blocking. Where: `wren-boots-c-closeup-boot-side` (near
   toe x 350-600 y 740-900: flat top, square front corner), `wren-trousers-h-closeup-hem-boot` (x 290-600, y
   1150-1300: the stacked rand and midsole wrap the toe as a thick bumper). Likely levers: less sole flare and a
   thinner rand round the toe, more toe spring, the toe-cap top falling to the tip. Done: c and h read as a
   low-profile tactical toe.

3. **FOLLOW-UP OK - Trouser ankle at the boot (h).** The near-leg ankle tab balloons into a puffy pillow (x 940-1060,
   y 470-610) and the hem bunches over the tongue top (x 860-920, y 600-640); the small dark piece under the far-leg
   hem is still there (x 205-220, y 555-575, r2 item 7). Done: flat sewn tab, hem lies over the tongue, piece
   identified and removed or reattached.

4. **FOLLOW-UP OK - Speed hooks still read as eyelets (r2 item 6).** `wren-boots-e-closeup-boot-laces` top stations
   (x 820-1010, y 490-525). Done as r2 item 6.

5. **FOLLOW-UP OK - Knuckle panel upper edge wavy in the shirt cuff view (r2 item 8).** `wren-combat_shirt-f-closeup-cuff`
   (x 760-930, y 980-1010). `fitted.level_slice` on `g_knuckle` / `gt` in `gloves.py` should fix it (and may fix
   item 1 if the tip patch edge is the cause).

Notes (log, not fails): sole lugs in `wren-boots-f` are two brick clusters with bare margins; OPEN 3 (close-ups show
near-black as mid grey) stands.
