# Step 11 block-end retry - fix list round 1 (checker, Opus 5.5)

Verdict: FAIL, narrow (callout data only; no asset, pipeline or render-quality fault).

Re-run by the checker: `npm run check` exit 0 (lint 0 errors / 38 warnings, 76 files, 805 tests, build OK).
operators:check not re-run: `git diff HEAD` touches only LOG.md, STATE.md, DESIGN.md, the 33 sheets,
`src/operators/kit.ts` (sideStraps attach text), `src/operators/lab/labData.ts` (CLOSEUPS lists) and
`tests/operatorLab.test.ts`; no script, pipeline or build file changed, so the step 10 retry's run stands.

Confirmed:
- All 33 `wren-sheet-*.webp` are newer than HEAD (12:56-13:08 vs 12:53); labData.ts (13:04) predates the close-up
  re-render (13:07-13:08); every caption names ANGLE D3D11 on the RTX 4090. The 7 `wren-pose-*` files are step 11b's.
- No loosened test or limit: the hipL exact list grew, the round 3 `thighR not knife` line was removed and the knife is
  really on thighR (`wren-sheet-closeup-thighR.webp`: the capped handle, guard band and sheath with the release tab
  behind the right thigh at the front edge, the same shape as on thighL). 22 new assertions, one per close-up, plus the
  brow-rivet text.
- DESIGN.md numbers match `build/operators/wren/export/report.json`: triangles 229,391 / 39,809 / 13,578 / 5,964;
  PNG 43.5 / 16.6 / 4.5 / 2.3; KTX2 35.05 / 13.69 / 3.63 / 1.83; GLB 25.22->52.9, 6.5->17.5, 2.0->4.84, 0.96->2.37;
  lowest PSNR 35.49 / 37.06 / 36.77 / 38.39; VRAM 96 / 32 / 8 / 4; skin 63/57, 23/17; IoU, open edges (34.55 / 35.89 /
  0.64 / 0.67), back-face maxima (17, 54), source 2,522,132, backGearM 0.0103. Anchors recomputed from the LOD0 GLB
  node chain: backL (0.0727, 0.0744, 1.1725), backC (0, 0.0794, 1.1747), backR (-0.0726, 0.0744, 1.1725), holster
  (-0.2083, 0.0005, 0.5936), socket (0.1349, 0.0690, 0.9274) - exact. Loadout table matches D28 (9 o'clock pistol
  mags, socket 8 o'clock, outer-left-thigh sleeves, 190 mm knife handle up, rifle mags low on the plate, cam pouch
  front left) and A88 (pod rear right, medkit right side); no phone rows (D29).
- Render check 1-7 on every non-close-up sheet: PASS as the LOG records (turnaround, rim-silhouette, menu, context,
  compare, colourblind, goggle, lods, wireframe, ktx2-compare 0.10-0.12 / 255, lods-closeups with the logged LOD1 /
  LOD2 hip streak as a step 18 note).
- Close-ups head, chestFront, shoulder, belt, knee, boots, collar, ribsSide, backPlate, ptt, underarm, hipL, beltBack,
  thighR, thighL, buckle: callouts match what is visible.

## Fix list

1. **Thumb loops are called out where they cannot be seen (the earpiece rule, 11-fixes-r3 item 2: an item that is
   never visible is not called out).** `thumbLoops` (kit.ts line 84, "sleeve ends, under the glove cuffs"; LOG step
   08a: elastic 0.3 mm off the skin under the 2.2 mm glove) is listed as "Thumb loops x2" on
   `wren-sheet-closeup-handPalm.webp`, `wren-sheet-closeup-handBack.webp` and `wren-sheet-closeup-forearm.webp`; in all
   three the glove cuff covers the wrist and nothing of the loop shows.
   Done: `thumbLoops` added to `exclude` of handPalm, handBack and forearm in `src/operators/lab/labData.ts`
   (forearm's `match: 'thumb'` may go instead); one test assertion per close-up that it is not called out; DESIGN.md's
   callout block names the thumb loops beside the earpiece as never visible.

2. **Identifiable items at frame edges still have no callout (SPEC 1 render checklist; 11-fixes-r4 item 1's rule).**
   - `wren-sheet-closeup-forearm.webp`, bottom left of the +2 EV panel (sheet pixels, 2440 wide: about x 0-200, y 1950-2150): the slim waist belt running
     under the called-out pistol pouch, the sleeve panel hanger's magnetic buckle (two stacked gunmetal halves, the same
     shape as on beltFront) and the hanger strap running down from it are clear in both panels. Not called out:
     `waistBelt`, `sleeveHanger`, `magBuckle`.
   - `wren-sheet-closeup-neckRear.webp`, left edge of the +2 EV panel (sheet pixels about x 620-720, y 1500-1800): the square goggle
     housing's side with its lug, where the called-out goggle band and goggle cable end. Not called out: `goggle`.
   - `wren-sheet-closeup-beltFront.webp`, bottom right of the +2 EV panel (sheet pixels about x 1330-1500, y 2120-2250): the sleeve panel's top edge,
     a flat laminate face under the called-out hanger, beside the called-out sleeve caps. Not called out: `sleevePanel`.
   Done: these ids added to the three close-ups' `include` lists, one test assertion per close-up, the three close-ups
   re-rendered on the GPU (`SHEET_CLOSEUPS=forearm,neckRear,beltFront`, `--only closeups`), each checked by eye, LOG.md
   updated. If the side panel overflows, shorten callout text, not the list.

Re-render for items 1 and 2: `SHEET_CLOSEUPS=handPalm,handBack,forearm,neckRear,beltFront` (one run).

## Notes (not fails)
- `wren-sheet-closeup-chestRear.webp`, bottom right edge: the top of the drone pod with its latch is cut by the frame;
  leaving it out is within the rule. Add `dronePod` there only if the fixer judges it identifiable.
- `wren-sheet-wireframe.webp` labels the source "2,628,557 triangles" (the Lab's count of the source export) while
  DESIGN.md / report.json give 2,522,132 render triangles; two different counts, not an error, but a one-line note in
  DESIGN.md would stop the question.
- Asset follow-ups for step 18 as logged: LOD1 / LOD2 zigzag streak at the right-hip hanger and LOD1 thigh slash
  (`lods-closeups` torso bent), hero confetti at +2 EV on glove fingertips and rib faces.
- Port 4191 free at hand-back.
