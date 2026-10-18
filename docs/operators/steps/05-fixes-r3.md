# Step 05 - fix list, round 3 (checker, Opus 5.5 High, 2026-10-16)

Verdict: FAIL, narrowly: two blockers, both on the trousers' hero close-ups. Everything else is either closed or
accepted as a logged follow-up (below). Re-run by the checker: `npm run operators:check` EXIT 0 ("3 item(s), all
checks pass"; seam gaps base layer 7.24, shirt 5.17, trousers 5.21 mm); `npm run check` EXIT 0 (73 files, 761 tests,
build OK, lint 0 errors / 38 warnings).
The diff has no forbidden-file edits, no loosened thresholds (check.mjs untouched; check_garment.py only adds two sample
views), no new external files; every item is in GARMENTS and WREN_KIT; the LOG.md draft is current. All 18 renders are
newer than HEAD (05:45-06:06 vs 00:57) and come from `render_garment_test.py` on OptiX (`render.py use_gpu`).

Round 2 items closed: 3 (shirt front smooth, no bar: `wren-combat_shirt-a`, `-d`, `-e`, `wren-trousers-a`), 5 (belt
loops lap below the band with a stand-off: `wren-trousers-e`, `-f`), 6 (knee stretch inserts, A16), 8 (Cordura seat
panels from the centre back seam to the side seam: `-f`), 9 (comments match A11), and item 1 except the crinkle below.

Renders are in `docs/operators/mockups/tests/`.

## Blockers (ranked by how much they hurt the look)

1. **Torn-looking crinkle in the waistband at the centre-front join (round 2 item 1, the part left).**
   Where: `wren-trousers-e-closeup-waist`, image x 740-900, y 440-620: jagged, spiky crumples on the band either side
   of the centre-front join round the snap, top edge and lower edge both; it reads as torn cloth in the hero waist
   close-up (render check 4). Done: the band runs smooth through the centre-front join and round the snap, both edges
   straight; re-render `e` (and `d`). Hint: the band is pinned on its drafted ring (`SIM.pin`), so the crumple is
   likely the two band ends overlapping or bunching at the join after `layer_push` / `fair`: fair the band panel along
   its length with the join held (or weld / trim the overlap at the join), never by loosening a check.

2. **The trousers' back waist and seat are shrink-wrapped to the body (round 2 item 2, the seat part).**
   Where: `wren-trousers-f-closeup-seat`: above the Cordura seat panels the cloth shows the body's lower-back anatomy -
   lumps either side of the centre back seam and a dark sacral-dimple hollow at image x 960-1010, y 410-460 - and the
   centre back seam follows the gluteal cleft down between the seat panels (y 480-700). `-b-back34-stealth` shows the
   same cleft. Soft-shell trousers bridge the cleft and run smooth from the band over the seat (SPEC 3.5, ART-DIRECTION
   3, render check 4: sewn, not sculpted). Done: from the band's lower edge down over the seat the back reads as one
   smooth cloth surface, the centre back seam a clean line that bridges the cleft (no hollow, no dimple, no lumps); the
   Cordura seat panels lie on that surface. Re-render `f` and `b`. Hint: the same per-edge fairing limit the fixer found
   for the nipples (dense body mesh); fair the back panels' upper part toward a bridged (convex-hull or heavily
   smoothed) seat surface, or add a little back-rise / seat ease to the back panel, keeping the gusset seam gap under
   10 mm.

## Accepted as logged follow-ups (not step blockers; write each into LOG.md as OPEN with its reason)

- **Base-layer nipples** (round 2 item 4): still read in `wren-base_layer-d-front-neutral` and `-a`. The base layer is
  seen only at the collar and cuffs once dressed, and the shirt over it is now smooth (`wren-combat_shirt-a`, `-d`).
  Next: scale-aware skin fairing (weights 1 / edge length) or flatten the nipples on the body under the base layer,
  then rebuild all three garments (the shirt's seam gap depends on the base layer).
- **Broad dents on the back of the thighs and round the knee pads** (round 2 item 2, legs): much improved in `b`, `c`;
  some soft dents remain below the right knee pad in `-c` (image x 450-560, y 1000-1090) and behind the left knee in
  `-b`. Revisit when the leg drape is re-simulated with the boots (step 06) or in the in-pose pass.
- **Gusset close-up** (round 2 item 7): `-g` from below shows the knit gusset and its seams, crumpled at the front tip.
  Also: the zig-zag stitch row bottom left of `-g` renders as large sawtooth triangles at that range.
- **Small notes (taste):** a short horizontal dent across the shirt's lower back in `wren-combat_shirt-b` (image x
  600-690, y 790-810); the leggings' centre back seam puckers at the top in `wren-base_layer-b` (x 655, y 760); the `c`
  rake still lets the hands shadow the thigh.
