# Step 08a - fix round 1 (checker, round 1)

Verdict: FAIL. `E2E_GPU=1 npm run operators:check -- wren` (full run, no --only): 5 items (suit, gloves, boots,
headwear, head_kit), all checks pass; `npm run check`: PASS (73 files, 762 tests, build). The check covers exactly the
GARMENTS items (check.mjs walks the `*-sim.json` files in build/operators/wren, and only the five GARMENTS outputs are
there). No check was weakened: check.mjs is unchanged, check_garment.py only gains 2 views, and the test edits swap the
removed ids for `suit` / `suitZip` / `thumbLoops` and assert the removed ids are gone. No forbidden files, brands or
external files. The failures are in the renders, against the step's Checks and ART-DIRECTION 9.1 / render check 4 and 6.

Ranked by impact on the look. Re-render the suit set and head_kit s1-s4 (and head_kit a / b / f) after the fixes.

1. **The suit reads as a top and leggings: a waistband line at the hips** (step Check "one piece with no waistband
   line"; LOG open 4). The lap's hem edge and its 10 mm tape make a full-girth step at 0.85-0.88 m with a ragged edge.
   Where: suit d and a (hips), b and j (two parallel lines across the seat, ragged at centre back), e (ragged edge,
   bottom third), s3 (left hip), head_kit a and b. Fix: undo A43. Draft the top's hem to the leggings' top run (or
   join the blocks into one) and sew the waist as a bonded seam, removing the lap and `lapSeal` for the suit. Done:
   there is no lap step and no ragged edge anywhere round the waist. Any waist seam left is a flush tape of the same
   weight as the side seams. In d, a and head_kit a the torso runs into the legs with no line at the hips that reads
   as a hem or waistband. Record the new decision in DECISIONS.md, replacing A43.
2. **The nape: crumpled collar tape under the hood skirt** (step Check "the hood skirt still laps the collar cleanly
   at the nape"; render check 6 "nothing lumpy"; LOG open 1). Where: s2 (730-1000, 500-570: a crumpled tape inside a
   kinked trapezoid outline) and head_kit f (800-1050, 1180-1260: crumpled, reads torn). Done: in s2 and head_kit f the
   hood skirt lies over a smooth mock neck. Any collar tape that shows is an even strip with no folds, kinks or
   trapezoid outline.
3. **The zip garage is not under the hood skirt, and the collar tapes wobble** (step Check "the zip runs diagonally
   to a garage under the hood skirt"; render check 6). Where: s1 (the puller at 1020-1060, 520-600 and the garage tapes
   at 940-960, 500-650 sit 2-4 cm below the skirt edge at y about 460, in plain view); c (the collar-top tape at
   920-1140, 320-340 is wavy, and the garage's side tapes are kinked). Done: in s1 the puller and garage are covered by
   the hood skirt (at most the top edge of the garage meets the skirt edge). The collar-top and garage tapes in c and
   s1 are straight and even, with no waves or kinks.
4. **Broken zone outlines; the shoulder yoke abrasion panels do not read** (step Check "every zone reads by material
   alone"; 9.1 "panel lines ... meet without kinks"; LOG open 2 and 3). Where: s2 (the rear-shoulder stretch outlines
   are hook / n shapes with loose stubs at 230-260, 880-895); c and s1 (the front yoke is two short tape stubs per
   shoulder; the shoulder tops show the shell emboss with no abrasion panel, unlike A2-chest's clear yoke panels); s3
   (orphan horizontal stubs on the left side at 230-330, 690-710 and 370-420, 820-835); f (a T-stub at 700-850, 1020).
   Done: every zone is a closed outline or meets a seam line cleanly, with no tape run under about 3 cm ending in mid
   panel and no hooks. The shoulder yoke shows on both shoulders in c, s1, s2 and b as a distinct abrasion-weave panel
   with a clean taped boundary, matching A2-chest's yoke.
5. **The abdomen shows through: rectus ridges and the navel** (render check 4 "not paint on the skin"; 9.1 "smooth
   tension"; LOG open 6, which is not faint). Where: e (horizontal ab ridges at 450-800 under the rake); a, d and
   head_kit a (the navel dimple and ab line read at full figure). Done: in e the abdomen is one smooth surface with no
   ridges and no navel dimple, and in a / d / head_kit a no abdominal detail reads. Fix it like A45's bust relax (relax
   the body over the abdomen and navel before the cling, inward only) or with a stronger bridge there.
6. **Centre-back pinch at the top of the leggings, and a lumbar groove** (step 05 OPEN carried as a check of this
   step; LOG open 5). Where: j (a tab or pinch at 1120-1170, 280-330 with a dark groove above it); b (650-670,
   700-780). It may go with item 1. Done: in j and b the centre-back seam runs smoothly down through the lumbar and
   waist, with no tab, pinch or dark groove.
7. **View f does not show the underarm vent.** The A-pose arm sits between the camera and the side panel, so f
   shows the underside of the sleeve (render_garment_test.py, the `f-closeup-underarm-vent` closeup). Done: f frames
   the underarm vent on the side panel (front and back inserts and the side seam) with its perforation readable and
   nothing in the way. Frame it from in front and below the arm, or from behind.

## Acceptable, logged follow-ups (not part of this round)
- F1. Near-black renders mid grey in the close-ups (OPEN since step 05). The measured albedo passes (0.021-0.035) and
  the cause is render exposure, not the material. Keep it open in LOG.md.
- F2. The earpiece cable ends in mid-chest with no PTT (s1, head_kit a). Step 09 builds it, as the step allows.
- F3. On the centre-front seam below the waist, the tape reads a little like a fly placket at full figure (a and d,
  590-605, 780-830). Check it again after item 1. Note only.
- F4. A serrated shadow-terminator line along the outer thigh seams under a strong rake (h, 120-140, 800-1100; j,
  820-950, 700-900). Note only, unless it shows in-game.
- F5. kitItems claims only `suit`; the zip and thumb loops are in the kit data but are not reported as patches. Add
  them to the sim report's claimed items if the Lab callouts should list them (step 10 or later).
