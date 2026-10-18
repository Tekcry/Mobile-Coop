# Step 09 - fix list, round 2 (checker: Opus 5.5 High, 2026-10-17)

Verdict: FAIL on one item. Round 1's seven items are met (below), the holster's 4.62 cm is accepted as measurement
noise, and step 07's earpiece cable is intact. One new defect breaks ART-DIRECTION render check 6 ("clean panel
lines, nothing improvised") and the checker's clipping rule: the holster hanger's end cuts through the holster
platform's face and shows as a triangular sliver in both holster close-ups. A small, local fix: rebuild `leg_kit`
only and re-render its views.

No forbidden files touched (git diff HEAD: docs/operators, scripts/operators/py, scripts/operators/export-gltf.mjs,
src/operators/kit.ts, tests/operators.test.ts). check.mjs, check_garment.py and covered.py unchanged; the test edit
only swaps kit ids. No new external files. chest_rig, waist_belt, leg_kit in GARMENTS.wren (FITTED). LOG.md
"Fix round 1" draft present. Renders 03:02-03:07 (HEAD fdaee6f 01:24), GPU per the fixer.

## MUST

1. **Holster hanger end pierces the holster platform (triangular sliver above the hood).**
   - Wrong: `wren-leg_kit-f-closeup-holster-top` (x 890-970, y 650-690) and `wren-leg_kit-c-closeup-thigh-right`
     (x 905-955, y 435-465): a lit triangle with a dark lower edge on the platform face, 1-2 cm above the hood. Probe
     (headless Blender on `build/operators/wren/wren-leg_kit.blend`, `wren-leg_kit-lam` split into mesh islands,
     measured along the holster's outward normal from the slot): the platform island's front face is at -21.8 mm; the
     hanger island (u 142.6-338.8 mm up the holster axis) reaches -20.0 mm where it overlaps the platform (u
     142.6-158.3). The hanger ends inside the platform and its corner comes out through the face.
   - Cause: `scripts/operators/py/garments/leg_kit.py` ~317 sets the right hanger's end `bot` at
     `face - n_h * (STRAP_T * 0.5 + 0.0003)` (behind the platform's front plane, inside the platform), and ~361 gives
     the right strap the radial normal `d_` rather than the platform's `n_h`, so the strap's end section is twisted
     against the platform face; `push` (~331) only clears the suit and the belt, not the platform.
   - Done when (pick one and keep it clean):
     - (a) Bonded on the face: the last 2-3 cm of the right hanger lie on the platform's outer face, normal `n_h`,
       its back within 0.5 mm of the face and no hanger vertex more than 0.3 mm inside the platform; the end finished
       as on the other bonded straps (a bar tack or moulded end), not a cut edge standing off; or
     - (b) Behind it: the hanger runs behind the platform (between the platform and the suit) and stops short, with no
       hanger vertex at or in front of the platform's front plane.
     - Either way: the same island probe finds no hanger vertex past the platform front, and in re-rendered f and c
       the platform face above the hood is clean (no sliver, no shadowed notch). `holsterHanger` run standoff stays
       at or under 0.012 m and the hanger still reads as a strap from the belt to the holster in c.
     - Rebuild `leg_kit`, re-render leg_kit c, f, a, i on the GPU, re-run both checks.

## Holster standoff (judgement asked for): accepted, not a fail
`standoffFromSuitM.thighHolster` 0.0462 against round 1's <= 0.046. `KC.standoff` (kit_common.py:248) is the largest
nearest-point distance over every third vertex, so a 0.2 mm overshoot (0.4 %) is inside its sampling error (the
highest points are on the hood's crowned cap and arm, 0.4 mm gaps and a 2.5 mm crown). The 0.046 figure was round
1's own estimate of what the 1 cm slot tolerance allows, not a step or ART-DIRECTION threshold: A62 already records
the holster as the one exception to the 2.5 / 4 cm rule, and the frame uses the tolerance (`offsetFromSlotMm` 9.76,
limit 10). The real fix is the logged integration item (A62: move the game's thigh slot in about 9 mm, locomotion
step 25). Do not chase the 0.2 mm by shrinking the hood or the arm.

## Met (round 1 items)
1. Holster (`wren-leg_kit-f`, `-c`): a moulded cap closed over the whole mouth, no cavity showing from above; its arm
   down the outer face to a gunmetal pivot and the gunmetal thumb release at the rear edge; the trigger-guard step
   reads in c, the outer face tapers toward the open muzzle; cavity 31.6 mm (five-seven 31 mm); offset 9.76 mm, tilt
   3.25 deg; platform 6.8-18.9 mm.
2. Rappel ring (`wren-waist_belt-e`, crop x 800-1000, y 560-720): a flat gunmetal D under a low tunnel, only the bow
   showing, ending on the belt's lower edge (0.5 mm above it); standoff 0.0150 (limit 0.0158); no gap behind the bow
   (the dark inside the D is the tunnel's shadow on the belt).
3. Radio (`wren-chest_rig-e`, crop x 700-1160, y 560-860): face near level with the plate, rounded edges,
   `proudOfPlateMm` 1.3, standoff 0.0126; the keeper bridge reads over the stub antenna (0.9 mm arch).
4. Medkit (`wren-waist_belt-e`, crop x 1130-1300, y 560-760): the dashed moulded tear line reads across the outer
   face; the pull strap lies flat along the bottom edge, no wave or free corner. 0.0195.
5. Sleeves (`wren-leg_kit-e`): oval sleeves and caps, touch codes kept, 0.0248 (<= 0.028); A63 updated.
6. A62 records the locomotion step 25 thigh-slot item with the numbers.
7. Sleeve hanger (`wren-leg_kit-e`): reads as a flat strap on the suit, run standoff 0.0060 (<= 6 mm).

## Step 07 earpiece cable: intact
Probe on `wren-leg_kit.blend` and `wren-head_kit.blend` (evaluated): `wren-head_kit-cable` 58 rings of 8, 0 inside
`wren-body`, min 0.27 mm out, x 0.0326-0.0861 (all on the near side), same in both files. head_kit.py and its blend
are unchanged since round 1's check (02:02 / 02:06); `wren-chest_rig-h` shows both cables on the PTT's top.

## Logged follow-ups (not fails)
- A62's first paragraph still says the holster's outer face "stands about 5 cm off the suit": now 4.6 cm; update the
  wording when the step is committed.
- armour.py's own antenna keeper (`pframe(sm_bk, ANT_X, ANT_Z, T_BK)`) sits inside the plate (0.7 mm proud) under
  chest_rig's bridge: dead geometry; remove it in armour.py at the next armour rebuild.
- `sleeve_rr` in leg_kit.py is unused: remove at the next leg_kit edit (item 1's rebuild is a good time).
- The stub antenna's keeper bridge reads a little tall in `wren-chest_rig-e` from this angle (arch 0.9 mm over the
  antenna): taste, no snag.
- The holster platform runs 3 cm above the hood as a flat board (the hanger's anchor): taste; consider ending it
  nearer the hood if item 1 goes with option (b).
- From round 1, still open: near-black renders mid grey in close-ups; the radio cable crosses about 2 cm of the plate
  face flush (A65, accepted); the suit's wavy centre-front and centre-back seams below the belt (`wren-leg_kit-e`,
  `wren-waist_belt-e` x 840-900, y 680-880) belong to step 08a's suit; the sleeves' cord loops read as thin hoops.

## Checker's runs
- `E2E_GPU=1 npm run operators:check -- wren`: "operators check: 9 item(s), all checks pass" (exit 0).
- `npm run check`: first run exit 1: 3 unrelated tests timed out at 5 s under load (detailPass, pvp, voxel); re-run exit 0, lint 0 errors (38 warnings), 73 files / 762 tests pass, build ok.
- Probes: headless Blender 5.2.2 (island split of the leg_kit laminate along the holster frame; cable rings vs
  `wren-body`); crops of f, c, belt e and chest_rig e. Port 4191 freed.
