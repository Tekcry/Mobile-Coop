# Step 09b - fix round 1 (checker, round 1)

Verdict: FAIL. Ranked by impact on the look. Items 1-4 must be fixed; items 5-7 are logged follow-ups (no work this
round beyond keeping them OPEN in LOG.md).

Checker's evidence (scratchpad renders, not deliverables): the left boot from the medial back with the suit given a red
emissive material shows a large wedge of suit through the boot; with the suit hidden the boot is whole, so the suit is
poking through, not a hole in the boot. The same wedge is in the pre-split blend (`.blend1`) and the post-split blend.

## Must fix

1. **The pressed suit pokes through the left boot's medial-back quarter (A68).** `press_suit_hem`
   (approach_boots.py:732-820) only moves suit vertices down in z; the band it pulls down from 13-14 cm keeps its wider
   radius and ends up outside the narrower shaft lower down. Measured in `wren-approach_boots.blend`: on the left boot
   230 `wren-suit-hero` and 47 `wren-suit-tape` vertices at z 0.077-0.115 m, angle about 100-140 degrees from lateral
   (back-medial), sit 0.4-3.9 mm outside the boot surface with a clear line of sight to open air; on the right boot 54
   hero vertices at z 0.097-0.123 m (a sliver beside the heel tab). No step view looks at the medial back, so the
   renders miss it. A68's "nothing visible moves" is wrong as written.
   Done when: the press also pulls each pressed vertex radially inward so it stays at least 1.5 mm inside the boot's
   inner (lining) surface below the collar top. `approach_boots` measurements in `-sim.json` gain a poke-through probe:
   0 suit vertices below the collar top that are outside the boot hero or that can see open air, for both feet. A new
   view `m-boot-medial-back` for each boot, from the medial back at about 0.35 m, shows no suit through the quarter,
   counter or collar band. A68 and the LOG.md draft are corrected.

2. **The collar is over the step's limit and the heel tab reads as a high-top sneaker.** The step Checks say "collar
   height measured 11-14 cm"; the top edge is 15.0 cm at the back and 13.9-14.1 cm at the lateral side (12-13 cm in
   ART-DIRECTION 9 / SPEC 3.1). In `l-boot-profile` and `c-closeup-boot-side` the top line runs flat at about 12.6 cm,
   then ramps sharply into a tall flat-topped tab: a stepped basketball-shoe heel, not the low, close collar of a light
   approach shoe. The front and toe (g, e, s4) do read as an approach shoe.
   Done when: the collar's top edge is at most 14.0 cm everywhere (the tab included) and the top line rises smoothly
   from front to heel with no stepped ramp in l and c, the cuff still 25 mm or more inside it all round (A38) and no
   skin. The way to get there is to extend the A68 press so it also lowers the suit's settled back hem (to about
   12.9 cm or lower) by stretching the suit band above it a little, the way the armour presses the suit (A53), and then
   drop `HEM_COVER` / `BACK_RISE`. Record it in A68. If a visible stretch or texture distortion of the suit shows in k,
   l or b, do not ship that. Keep the 15.0 cm tab, log it OPEN with the measurements against the step 08a retry, and
   say so in the return.

3. **The rubber sole bottom has a lump and cloth-like creases (h, f; SPEC 1 Physical: rubber soles read correctly
   under raking light).** In `h-boot-sole-below` there is a raised smooth blob on the edging zone near the toe tip of
   both boots (upper boot at about x 570-610, y 520-550; lower-left boot at about x 120-150, y 1240-1260). Beside it,
   and across the arch (about x 900-1000, y 330-660 of the upper boot), there are fold-like crease streaks that read
   as fabric, not molded rubber. This is the "radial shading streaks" open item 4; it is geometry or shading, not taste.
   Done when: h and f show a flat, smooth edging zone and arch with no lump, no crease and no fan streaks under the
   rake light, on both boots.

4. **Shading bands on the nylon quarter and the collar band (g, k, f).** In `g-closeup-boot-toe` the lateral quarter
   shows strong vertical light/dark stripes (about x 1250-1450, y 330-560 of the full frame). In `k-boot-collar-cuff`
   the collar band shows diagonal light bands and weave hatching that changes direction across the panel (about
   x 800-1050, y 600-800). In `f-closeup-boot-sole` the back of the left collar shows horizontal faceted bands. These are
   faceting / normal or UV stretch artefacts ("stretched or swimming textures").
   Done when: re-rendered g, k and f show a smooth quarter and collar band under the rake light, the weave runs one
   direction per panel, and there are no stripes or facet bands.

## Logged follow-ups (acceptable; keep OPEN in LOG.md, no fix this round)

5. Lugs read as separate sharp-edged bricks on a flat slab (h, f), related to step 06's "lug clusters". A molded look
   (root fillets, chamfered faces, a denser field) would look more expensive (ART-DIRECTION 9 check 6). Taste beyond
   the Checks: low lugs, heel brake, edging zone and an original pattern are all present.
6. The small dark slit under the collar band where it meets the counter and quarter on the lateral side (k, c) reads
   as an overlap shadow at normal range. Same junction as the step 06 boot.
7. Near-black renders mid grey in close-ups (OPEN since step 05).

## Confirmed, no action

- The A68 hidden-edge split does not loosen a check. `check_garment.py` LIMITS are unchanged (edgeM 0.03), and
  check.mjs and the tests have no threshold edits. The worst edge is now the boot sole (29.02 mm), not the suit.
- The split changed nothing visible. Comparing `.blend1` (the render build) with `.blend`: only `wren-suit-tape`
  changed, 35007 -> 35032 vertices (25 new, z 0.090-0.122 m), with 0.0 mm movement of the original vertices. 11 tape
  vertices changed normal by more than 1 degree, all below the nearby collar top (z 0.078-0.135 m against 0.1395 m).
  They sit in the left boot's medial-back region, inside item 1's poke-through area. Renders of that region before and
  after the split are identical. Every other suit and boot object is unchanged.
- No forbidden files edited, no brands or Splinter Cell shapes, no new external files. GARMENTS / FITTED and the kit
  text and tests are updated, and the LOG.md draft exists.
