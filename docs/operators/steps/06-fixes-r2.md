# Step 06 - fix list, round 2 (checker)

Checker verdict: FAIL. Automated checks pass: `E2E_GPU=1 npm run operators:check -- wren` "5 item(s), all checks
pass" (seam gap: base_layer 7.24, gloves 0, boots 0, combat_shirt 5.06, trousers 4.53 mm; edge length: gloves 23.3,
boots 29.37 mm - 0.6 mm under the 30 mm limit, so item 1 or 3 must not add longer edges); `npm run check` exit 0 (761
tests, 0 lint errors / 38 warnings).

No forbidden files, no loosened thresholds (`check_garment.py` only adds the hand and foot views), no new external
files, gloves and boots are in GARMENTS. Renders are GPU (newer than HEAD, 10:28-10:34). The fails are visual, from
`docs/operators/mockups/tests/`.

Ranked by what matters most to the look. **MUST** = round 3 fixes it. **FOLLOW-UP OK** = if round 3 runs out, log it
in LOG.md "Step 06" as OPEN with the cause and the next step; it does not block the commit.

1. **MUST - The boot panels still look torn: every overlay edge is a ragged paper-tear (r1 items 2 and 3, still
   open).** Where: `wren-boots-c-closeup-boot-side` (toe cap, quarter, heel counter, eyestay: sawtooth edges at x
   400-700 y 560-900 and x 990-1140 y 580-760), `wren-trousers-h-closeup-hem-boot` (toe cap and counter, x 330-1110
   y 680-1000), `wren-boots-e-closeup-boot-laces` (toe-cap edge y 930-1000), `wren-boots-f-closeup-boot-sole` (heel
   counter x 800-960 y 480-640). Cause: `garments/boots.py:288-350` labels panels per face on the one loft mesh (84
   verts a ring), then nudges boundary vertices with at most 6 x 2 mm Newton steps and skips many; the lift is
   averaged per vertex (`boots.py:338-345`), so boundary vertices sit half-lifted and the stair steps stay. More
   snapping will not fix it. Done: cut the shell along each panel field's zero contour before labelling (split every
   face the field changes sign across, inserting the vertex at the interpolated zero, as a level-set slice), so each
   panel edge is an exact smooth curve; give overlays a real step (duplicate the panel faces, or lift only interior
   vertices, so the edge reads as a turned leather edge with its stitch row). c, e, f and h show clean continuous
   curves on toe cap, rand, counter and eyestays, no tears or spikes.

2. **MUST - The trouser hem ends above the boot; the leggings show between them (r1 item 1, now worse).** Where:
   `wren-trousers-h-closeup-hem-boot` - a dark band of leggings between hem and collar on the near leg (x 830-1110,
   y 610-690). Cause: the 26.5 cm hem (`trousers.py:79-82`) settles higher; `z_hem` (`trousers.py:71`) was not
   lengthened. Done: `z_hem` lowered (the fixer's estimate is about 4 cm) so after simulation the hem laps 2-3 cm
   down over the boot shaft all round, no leggings visible in h from either leg; trouser seam gap still under 10 mm.

3. **MUST - The boot toe is still a broad square box (r1 item 2, shape part).** Where: `wren-boots-c-closeup-boot-side`
   (near toe x 370-560 y 760-900: flat front with square corners), `wren-trousers-h-closeup-hem-boot` (x 290-560,
   y 990-1110: the sole and toe are as wide at the tip as at the ball), `wren-boots-a-front-stealth` (both toes
   blunt). Code: `boots.py:27-28` `TOE_ROOM`, the toe box and nose rings around `boots.py:129-200`, and the sole
   outline. Done: in plan the toe tapers from the ball to a rounded, slightly off-centre point (width at 2 cm behind
   the tip about 60-70 % of the ball width), the sole follows it, and the toe height falls to the tip; reads as a
   low-profile tactical boot in a, c and h.

4. **MUST - The boots read near-white in the stealth view (r1 note, now a fail of ART-DIRECTION render check 1-2).**
   Where: `wren-boots-a-front-stealth` - both toe caps and vamps glow almost white against the dark leggings (x
   440-520 and 670-740, y 1300-1370); the boots are the brightest thing in the frame. Suspect: suede `Sheen Weight`
   0.6 / tint 0.6 (`materials.py`, suede) and the wear lightening the toe. Done: the boots sit in the same value
   range as the trousers and leggings in a (a modest edge highlight is fine); measured albedo and roughness still in
   band.

5. **MUST - Fingertips show a dark dot or flat end (r1 item 6).** Where: `wren-gloves-c-closeup-glove-back` - index
   tip dark dot (x 595, y 1040), middle and ring tips flat ellipses with a dark rim (x 450-500 y 900-940, x 700-760
   y 1060-1090). The fixer found no hole, so look at the tip pole (all ring vertices meeting at one point gives a
   shading dimple) and the cap edge lift. Done: fill the tip with a dome of quads (or a ring of shrinking rings, no
   single pole), normals smooth over it; c and e show closed rounded tips, no dot or flat facet.

6. **FOLLOW-UP OK - Speed hooks do not read as hooks (r1 item 4).** Where: `wren-boots-e-closeup-boot-laces` - the
   top stations (x 820-1010, y 480-520) look like the eyelets below; no open hook shape is visible at 0.42 m.
   Code: `boots.py:425-470`. Done: the hook lip clearly open toward the top in e (larger, about 8 mm proud and 6 mm
   long, lace wrapped round it).

7. **FOLLOW-UP OK - Small dark piece under the far-leg hem (r1 item 7).** Where:
   `wren-trousers-h-closeup-hem-boot` x 205-220, y 550-575. Identify it (ankle tab end, a grommet, or a stray island)
   and remove or reattach it. If item 2 lowers the hem, re-check it.

8. **FOLLOW-UP OK - Knuckle panel outline wavy in the shirt view (r1 item 5, mostly done).** The panel now reads in
   `wren-gloves-c-closeup-glove-back` (stitched rounded rectangle, x 670-960 y 690-860), but its upper edge is wavy
   in `wren-combat_shirt-f-closeup-cuff` (x 760-930, y 980-1010) and the flex channels are faint. Fixed by the same
   contour cut as item 1 if applied to `gloves.py`.

Notes (not fails, log if not addressed):
- `wren-boots-f-closeup-boot-sole`: lugs are rectangular bricks in two clusters with large bare margins; a fuller
  low-lug pattern to the edge would read more like a quiet tactical sole.
- OPEN 3 (close-ups expose near-black as mid grey) stands.
