# Step 08a - fix round 3 (checker, round 3; the last fix round)

Verdict: FAIL. The full `E2E_GPU=1 npm run operators:check -- wren` fails 2 checks: headwear and head_kit
`covered:gunmetal` 773 (0 required). This matches the fixer's report. Passing: suit `seamGap` 9.76, every `edgeLength`
(at most 29.5), `covered:suit thumb loop elastic` 0 from gloves on, and every `ownCheck:`. `npm run check` passes (73
files, 762 tests, build; lint 0 errors, 38 warnings).

The A52 covered rule is sound. It adds `ownCheck:` and `covered:` (0 px), it covers only the two COVERED entries, from
the covering item on, and it changes no LIMIT. check.mjs and the tests are unchanged. It has one hole (item 5).

Renders: suit a-k at 22:39 and the stacks at 22:42-22:44, all newer than HEAD (20:14), GPU build. Crops are in
scratchpad `ck-r3/` (crotch.png, s1z.png).

This is the last round. Do the items in order. Anything not done goes into LOG.md as OPEN with the reason. Re-render
the suit set, headwear c and head_kit a / s1-s4, then run the full `operators:check`.

1. **Crotch: still reads as male anatomy (worst problem on the figure).**
   - Where: suit d (crop: two stacked lumps on the centre front seam, between the waist seam and the gusset, with a
     pinch between them), suit a (590-615, 760-830: a lit bulge with a dark cast shadow on its left), head_kit a
     (575-610, 770-830), and e (870-920, 1140-1300). Fix round 2's 70 mm gusset cling did not reach them. They sit
     above the gusset, on the centre front seam of the leg panels.
   - Likely cause: the centre front seam is longer than the body's front rise, so it bunches against the pinned
     gusset. The cling does not act on those leg-panel vertices.
   - Do any of these: shorten the front rise or centre seam; give the front leg panels' centre strip the same
     cling reach (`reach_panels`); or fair the body's pubic region in `prepare_body`, as the bust is faired. Do not
     cover it with a patch or tape.
   - Done:
     - In d, a and head_kit a, the crotch and lower belly are one smooth surface into the inner thighs. No lump, no
       pinch, no cast shadow. Only the thin centre seam tape reads.
     - A probe confirms it: within 6 cm of the centre front seam, from the waist seam down to the gusset, no suit
       vertex stands more than 6 mm off the faired skin.
     - Record it in DECISIONS (amend A48 again).

2. **The zip slider and garage show below the hood skirt (`covered:gunmetal` 773 px).**
   - Where: s1 (crop): the slider and the top of the garage stand just under the skirt's front edge
     (about 980-1030, 560-610). This breaks the step Check "zip runs ... to a garage under the hood skirt".
   - Cause: `tuck_collar` tucks the slider and garage only where they are above `zc - 3 mm`, and `_ease_tuck` moves
     only the hero mesh. The suit c view shows the slider parked about a third of the way up the mock neck, and the
     skirt edge ends just above it.
   - Fix: park the slider and garage higher on the mock neck, or lap the skirt lower at the front (`SKIRT_LAP_SUIT`),
     so the skirt covers the garage with at least 10 mm to spare. The zip tape, garage and slider should follow the
     hero's eased move.
   - Done:
     - `covered:gunmetal` is 0 in headwear and head_kit.
     - `ck-r2/gm_probe.py` on wren-headwear.blend and wren-head_kit.blend sees 0 px in all 120 views.
     - In s1 the zip disappears under the skirt with no slider, garage end or square-cut tape end in view.

3. **The hood skirt stands off at the left front shoulder.**
   - Where: s1 (680-1080, 480-600, lower crop in `ck-r3/s1z.png`): the skirt edge flares into a thin lip with a dark
     gap under it. The front and right are better, and headwear c is acceptable.
   - Done: in s1 the skirt edge lies on the suit all the way round, with no visible gap and no thin lip. Its edge is
     rounded like the nape edge in s2. Do it with item 2, in the same code.

4. **Abdomen dimples (round 1 item 5 and round 2 item 7; still not done).**
   - Where: e, two symmetric dimples at (790-830, 720-760) and (980-1000, 720-750). They read as navel and ab detail
     (render check 4, step Check "no ... anatomical detail").
   - Done: in e the abdomen is one smooth surface from the ribs to the waist seam. Fair the body under the suit there
     (`prepare_body`), as for item 1.

5. **The A52 rule reads a stale owner report.**
   - check.mjs checks items in `readdirSync` order (boots, gloves, headwear, head_kit, suit). So every `ownCheck:` in
     this run read the previous run's wren-suit-check.json (suit checked last, 22:59). If the suit had failed in this
     run, the covering items would still have passed `ownCheck:`.
   - Fix (pick one):
     - check.mjs checks each item after the items in its sim report's `under` list.
     - `covered_checks` fails when the owner's check JSON is older than the owner's `-sim.json`.
   - Done: a full run checks suit first, or a dry run in covered.py shows `ownCheck:` failing on an owner JSON older
     than its sim JSON. Add it to A52. No LIMIT changes.

6. **Broken panel lines at the collar and shoulders (round 1 item 4 and round 2 item 6; not started).** Narrowed to
   the most visible lines. ART-DIRECTION 9.1 says "panel lines meet without kinks".
   - Where:
     - The collar-base yoke tapes meet in a broken V left of the zip, with a gap and a stub: c (800-1100, 490-580),
       s1 (890-960, 580-720).
     - The shoulder yoke boundaries are waves ending in hooks: c (430-550, 570-600) and (1520-1720, 600-660);
       s2 (20-310, 740-800) and (1390-1530, 670-720).
   - Done: in c, s1 and s2:
     - each yoke boundary is one smooth curve that meets the raglan seam cleanly, with no wave, hook or notch;
     - the collar-base tapes form one continuous curve, or end cleanly on the zip tape.

7. **Waist seam notches (round 2 item 8; not started).**
   - Where: e, centre front (890-910, 1040-1060), plus a step in the tape at the left hip (420-560, 880-940). j,
     centre back (1125-1140, 180-200).
   - Done: in e and j the waist tape is an even strip with no notch or step, the same weight as the side seam tape in
     f.

## Acceptable, logged follow-ups (not part of this round)
- F1-F9 from the round 1 and 2 lists stay open as written. F2 (the earpiece cable ending on the chest with no PTT,
  s1) waits for step 09.
- F10. Suit `seamGap` 9.76 mm passes the < 10 limit, but with 0.24 mm to spare instead of the 0.5 mm asked. Log it as
  a seed risk. If a later rebuild goes over 10, it fails as a check and is fixed then.
- F11. Head stack suit edges: `edgeLength` passes (29.5 mm), and no suit edge is over 25 mm. But the worst
  single-edge growth is 5.5x (1.2 to 6.7 mm) under the skirt, against the 2x asked. That is hidden under the skirt.
  Note only.
- F12. Short tape stubs: s3 (390-410, 810-840) on the left hip, f (900-920, 330-345) and (830-860, 140-160) at the
  vent, and h beside the knee pads. Each one is under 3 cm. Fix them if item 6's code reaches them; otherwise log.
- F13. In f the side seam tape runs straight through the middle of the vent mesh (770-850, 100-560). A real suit
  would end the seam at the vent or run it along an edge. Design note for step 10.
