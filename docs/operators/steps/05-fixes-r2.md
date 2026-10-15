# Step 05 - fix list, round 2 (checker, Opus 5.5 High, 2026-10-16)

Verdict: FAIL. Re-run by the checker: `npm run operators:check` EXIT 0 ("3 item(s), all checks pass"; seam gaps base
layer 7.24, shirt 5.74, trousers 7.39 mm); `npm run check` EXIT 0 (73 files, 761 tests, build OK). The diff has no
forbidden-file edits, no loosened thresholds in check.mjs, check_garment.py or the tests (check_garment.py only adds
two sample views), no new external files, every item in GARMENTS and WREN_KIT. All 18 renders are newer than HEAD
(02:45-03:02 vs 00:57) and come from `render_garment_test.py` with OptiX forced (`render.py use_gpu`).

Round 1 items closed: 2 (knee pads on the kneecap, pockets at mid-thigh clear of the pads: `wren-trousers-d`,
`-c`, `-g`), 4 (no skin at the back waist: `wren-base_layer-b`), 6 (no pale ellipse at the crotch in `-c`, `-d`, `-g`),
9 (A11 rewritten), the leggings part of 3 (smooth shins: `wren-base_layer-d`, `-b`), and the exposure part of 5
(close-ups now judgeable). Still open from round 1: 1 (front waist), 3 (trousers surface), 5 (gusset not shown), 7, 8.

Renders are in `docs/operators/mockups/tests/`.

1. **Front waist: a sagging pocket under the band, ragged stitches (round 1 item 1 not met).**
   Where: `wren-trousers-e-closeup-waist` (below the band the front caves into a deep hollow with a horizontal lip
   across the fly at about image y 930; the fly stitch lines are sawtooth-ragged and the cloth left of the fly under
   the snap is crinkled, image x 600-800, y 560-1000); `wren-trousers-d-front-neutral` and `-a-front-stealth` (a dark
   recessed rectangle under the centre-front band); `wren-trousers-f-closeup-seat` (the lower edge of the back band is
   a ragged, frilled lip, image y 230-260). Fails SPEC 3.5 Waist (only small vertical belt-gather folds) and render
   check 4.
   Done: the front below the band lies flat over the belly into the fly with at most small vertical gathers; the fly
   placket and its stitch rows are straight, even lines; the band's lower edge front and back is a clean seam with no
   frill. The fixer found the gusset seam gap goes over 10 mm when the front `crotch_ease` drops below 0.01: fix the
   excess another way (e.g. the front rise / `centre_lift` of the front panel only, or pin the front panel's top
   rows with the band, or fair the front-centre region with the band's edge held) - never by loosening the check.
   Re-render `e`, `d`, `f`.

2. **Trousers legs still dented and crumpled (round 1 item 3, trousers part).**
   Where: `wren-trousers-b-back34-stealth` (dents and crumples over both thighs and calves), `-f-closeup-seat` (lumpy
   crumpled thighs under the seat), `-c-closeup-knee-cargo` (melted-looking dents on the shins and round the pads).
   Fails render check 4 and ART-DIRECTION 3 / SPEC 3.1 (soft-shell: broad soft folds).
   Done: the legs show broad soft folds and slight knee bagging (SPEC 3.5 Knee, straight leg); no small-scale dents or
   crumples in `b`, `c`, `f`. Re-render those views.

3. **Blurred dark dashed bars on the shirt front (new in this round).**
   Where: `wren-combat_shirt-a-front-stealth` (a soft dark dashed bar across the chest below the zip, image y 600, and
   a shorter one on the upper left chest, y 435), `wren-trousers-a-front-stealth` (same bar, y 515),
   `wren-combat_shirt-e-closeup-collar` (the upper-chest bar, image x 480-700, y 720). Not in the HEAD shirt render
   (`git show HEAD:docs/operators/mockups/tests/wren-combat_shirt-a-front-stealth.webp`). The checker's probe found
   no geometry floating in front of the chest and no base-layer vertex outside the shirt front (|x| < 0.10, z
   0.95-1.40), so it is likely a row of small dents in the shirt surface (the old bust-shelf line, or the shirt's
   `layer_push` over base-layer features). Breaks render check 4.
   Done: identified and removed; the shirt front reads as smooth knit in `a`, `d` and `e` of the shirt and in
   `wren-trousers-a`.

4. **The compression top shows the body's nipples.**
   Where: `wren-base_layer-d-front-neutral` (both nipples sharply modelled through the top; `SIM.cling` draws the knit
   onto every skin feature). A compression knit bridges small features and reads as a garment, not body paint (render
   check 4 and 5; ART-DIRECTION 3). Done: the top runs smooth over the bust apex (bust shape kept, no nipple detail),
   with no shelf under the bust and no new dents in the shirt over it (item 3). Re-render base layer `d` and `a`.

5. **Belt loops too short for a duty belt (round 1 item 7, not done).**
   Where: `trousers.py:161-167`; `wren-trousers-e-closeup-waist` shows small tabs inside the band. Done as in round 1:
   loops with a clear opening for a 4.5 cm belt (about 5.5-6 cm long, lapping above and below the band), stood off
   the band, a bar tack at each end, visible in the waist close-up. The fixer's blocker (a detail patch maps onto one
   panel only): a loop is a separate strip; it can be built as its own small mesh placed on the band surface and
   offset outward (like the zip or the cuff tabs), not a patch mapped across two panels.

6. **No stretch panels behind the knees (round 1 item 8, not done).**
   SPEC 3.1 and ART-DIRECTION 5. Done as in round 1: an inserted stretch-knit panel at the back of each knee (its own
   seamed pattern panel or a seamed insert in a knit material, not a patch on top), visible in a re-rendered back
   3/4 view (`b`) or a back-of-knee close-up.

7. **The gusset is not visible in its own close-up (round 1 item 5, part).**
   Where: `wren-trousers-g-closeup-gusset` shows the fly, the crotch bar tack and the cargo pockets; the diamond
   gusset between the thighs is in shadow and its seams cannot be found. Done: a view (re-aimed `g`, or from below
   and behind) in which the gusset panel and its four seams read; the knit gusset distinguishable from the soft-shell.

8. **Seat reinforcement reads as jeans back pockets, in the wrong cloth.**
   Where: `wren-trousers-f-closeup-seat` (two rounded rectangles either side of the centre seam);
   `trousers.py:149-155` (`'material': 'softshell'`). ART-DIRECTION 5 (heavy Cordura reinforcements) and SPEC 1
   (reinforced patch at the seat); the knee panels are already `cordura`. Done: the seat reinforcement in `cordura`,
   shaped as a seat panel (one panel over the seat crossing the centre back seam, or two panels running into the
   crotch and the side seam), not two pocket-like rectangles; re-render `f`.

9. **Comments still say the earlier layers are colliders.**
   Where: `scripts/operators/build.mjs:5-6` ("each sewn by cloth simulation over the body and every earlier garment
   (colliders)") and `scripts/operators/export-gltf.mjs:8-9` ("each is simulated over the body and every earlier
   one"). A11 now says layers are resolved after the simulation (`layer_push`). Done: both comments match A11.

Notes (not fails):
- `wren-trousers-c-closeup-knee-cargo` is now judgeable; the big cast shadows of the arms and hands across the legs
  make the forms hard to read. Aiming the rake so the hands do not shadow the thigh would help.
- The fixer's helper `one.mjs` is in the session scratchpad
  (`C:\Users\Micha\AppData\Local\Temp\claude\C--NightShift-Mobile-Coop-operators\ee17d8dc-...\scratchpad\one.mjs`),
  not the repo. Use `npm run operators:build -- wren --render`, then `npm run operators:export` and
  `npm run operators:check`; rebuild in layer order base_layer, combat_shirt, trousers.
