# Step 08 - fix list, round 1 (checker: Opus 5.5 High, 2026-10-16)

Verdict: FAIL. Ranked by impact on the look. Items 1-2 are MUST, items 3-4 SHOULD (fix in this round if the time
allows; otherwise log them OPEN with the reason). The rest is accepted and logged as follow-ups. Re-render the changed
items on the GPU (E2E_GPU=1, `operators:build -- wren --from carrier --render`), then run the full
`npm run operators:check -- wren` (no `--only`) and `npm run check`.

Checker's re-runs: `npm run check` exit 0 (0 lint errors, 38 warnings; 73 files, 762 tests; build OK).
`E2E_GPU=1 npm run operators:check -- wren`: see the result line at the end of this file.

The new `--only <item,item>` filter (scripts/operators/check.mjs) is accepted: it only filters the list of built items;
every check, threshold and view is unchanged, and the full check still runs without it.

## MUST

1. **The front plate bag stands off the upper chest like a board (ART-DIRECTION 2 "kit sits tight", 3 "slick
   low-profile plate carrier").**
   - Wrong: the rigid front slab rests on the bust and its top stands up to 58 mm off the chest (sim report
     `frontPlate.gapMaxMm` 58.4, mean 24.5). In profile the gap is the strongest flaw of the step:
     `wren-carrier-g-closeup-cummerbund-left` and `-h-closeup-cummerbund-right` show a wide air wedge behind the bag's
     upper half, and the shoulder strap drops steeply into it instead of lying on the chest. `fit()` in
     `scripts/operators/py/garments/carrier.py:169-217` minimises the mean gap with only fabric compressibility, so the
     plate never pulls in at the top.
   - Done: `frontPlate.gapMaxMm` 35 or less and the gap at the bag's top edge on the centre line 25 mm or less (add
     both numbers to the sim report). In g and h the bag's upper edge reads as resting on the upper chest, and the
     shoulder strap runs onto the bag's top with no visible air wedge under it. The fixer chooses the method and
     records it as an A-decision, for example: weight the fit toward the top edge (a tightened carrier hangs from the
     straps with the plate top on the sternum; the lower edge may then stand off a little more, closed by the
     cummerbund and flap), and/or let the bust's soft tissue give under the plate (body, base layer and shirt pressed
     together, a stated maximum, beyond A33's fabric-only press). The earpiece plug clearance (`plugClearM`) and hood
     clearance stay positive.

2. **The fabric does not visibly compress or pillow under the straps and cummerbund (SPEC 1 Physical "fabric drapes and
   compresses under straps"; SPEC 3.5 "the fabric pillows out between straps and dents under them"; step 08 Do 2).**
   - Wrong: the A33 press (at most 2.5 mm, eased over 10 mm) does not read: in `wren-carrier-e-closeup-shoulder` the
     strap lies on the shirt with no dent line or pillow at its edges; in `-g` and `-h` the cummerbund's edges show only
     a shadow line, the knit does not roll up against them.
   - Done: in the e, g and h raking views a soft pillow of the shirt reads along both edges of each shoulder strap and
     along the cummerbund's top and bottom edges (about 1.5-3 mm proud, falling off over about 10-15 mm), and the
     dent under the part stays within A33's limits. No new seam tears or spikes (`operators:check` still passes). Note
     the numbers in the LOG.

## SHOULD

3. **The inner belt sits up to 8.3 mm inside the trousers (clipping).**
   - Wrong: belt sim report `trouserPress.maxIntoFabricMm` 8.25 at 675 capped vertices, "not located" (LOG step 08).
     Hidden in the stills, but it will show in the Lab and in motion.
   - Done: located and fixed; `trouserPress.maxIntoFabricMm` 3 mm or less (same bar as the parts' own SINK plus the
     A33 press), or the residual vertices named (where, why) in the LOG with the belt-c / belt-e views showing no
     poke-through.

4. **Cummerbund ripple where its rows switch from the ribs to a bag's face.**
   - Wrong: a pinch across the band's middle in `wren-carrier-h-closeup-cummerbund-right` (centre right of the band)
     and fainter in `-g`.
   - Done: the band reads as one smooth tensioned surface in g and h at the same camera; no crease that is not caused by
     a pouch or an edge.

## Accepted, logged as follow-ups (not part of this round)

- Near-black materials render mid grey in every view (open since step 05; project-wide render exposure / albedo
  issue, not step 08's). The SPEC 5.1 wear (scuffed carrier bottom edge, worn webbing tails) cannot be judged until it
  is fixed: recheck then.
- The front plate top at 1.358 m sits about 2 cm under the sternal notch, below SPEC 3.2's "base of the throat"
  (A34: clears the step 07 earpiece plug). Acceptable; revisit when step 07's cable route is retried.
- Grenade pouch flaps read like stiff box lids standing proud of the pouch bodies (`wren-belt-c`); taste, consider
  softening the flap's lower edge when the belt is next touched.
- The knife grip's end sits slightly proud of the right hip line in `wren-belt-b-back34-stealth`; recheck with the
  holster in step 09.
- Drop-leg hanger, radio cable and PTT are step 09 (A35).
- `--only` silently skips a misspelt item name when another name matches; a warning for unknown names would help.
  Tooling nicety, not a check change.
- 337 shirt vertices sit up to 4.6 mm under the bags' tucked cummerbund ends (`shirtPress.maxIntoFabricMm`): hidden
  and physically plausible under a tightened bag; accepted.

## Checker's operators check result

`E2E_GPU=1 npm run operators:check -- wren` (checker, 2026-10-16): "operators check: 9 item(s), all checks pass"
(base_layer, gloves, boots, combat_shirt, trousers, headwear, head_kit, carrier, belt all PASS), exit 0. The automatic
checks pass; the FAIL is on the render judgement (items 1-2).
