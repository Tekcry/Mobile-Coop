# Step 08a - checker round 4 (final; no fix rounds remain): FAIL, the step is OPEN

Verdict: FAIL on the renders. The automatic checks pass:
- `E2E_GPU=1 npm run operators:check -- wren` (full, re-run by this checker): "5 item(s), all checks pass", checked
  in the order suit, gloves, boots, headwear, head_kit.
  - suit: `seamGap` 9.76.
  - `edgeLength`: suit 19.4, gloves 23.31, boots / headwear / head_kit 29.5.
  - headwear and head_kit: `covered:gunmetal` 0, and `ownCheck:gunmetal` passes on 2608 px in this run's
    suit-check.json.
- `npm run check`: exit 0. 73 files, 762 tests, build OK, lint 0 errors and 38 warnings.

Renders: suit a-k at 23:19-23:20, headwear c and head_kit a / s1-s4 at 23:23-23:25. All are newer than HEAD
(20:14). They were made on the hardware GPU: scratchpad `r3/full-build.log` says "test renders on NVIDIA GeForce RTX
4090 Laptop GPU". Crops are in the session scratchpad `ck4/` (crotch-a.png, crotch-d.png, ha-crotch.png,
lumbar-b.png).

The tooling changes only tighten and are sound:
- check.mjs now only re-orders the items by the length of their sim report's `under` list, then by membership. No
  LIMIT changed. This run checked suit first: wren-suit-check.json 23:34, then wren-gloves-check.json 23:36.
- covered.py `owner_report` sets `_stale` when the owner's check JSON is missing, or older than its `-sim.json`. Then
  `covered_checks` fails `ownCheck:`. The dry run (`python scripts/operators/py/covered.py`) prints the case "owner
  JSON older than its sim JSON" as False.
- check_garment.py adds two views and the covered branch, and changes no LIMITS.
- No forbidden files were edited. GARMENTS.wren = suit, gloves, boots, headwear, head_kit. No new external files.

The list below is ranked worst first. It is the evidence for the OPEN record and the starting list for any later
pass. Each item gives what is wrong, where to see it, and what done looks like.

1. **Crotch: a rounded bulge with a cast shadow above the gusset (round 3 item 1, not met).**
   - Where:
     - suit a (crop `ck4/crotch-a.png`, about 590-620, 790-835): a lit round form on the figure's left of the centre
       front seam, with a dark shadow under and beside it.
     - suit d (590-615, 790-830): the same form, softer.
     - head_kit a (580-615, 790-835): identical in the dressed stack.
     - e (860-920, 1130-1300): the centre seam tape waves, and the cloth either side of it is lumpy down to the
       gusset.
   - Measured: the fixer's own probe gives 9.8 mm off the faired skin, against the 6 mm asked. 79 vertices are over
     the limit, all at z 0.80-0.82.
   - What it breaks: the step's carried step 05 check (no gusset crumple), render check 6 ("nothing lumpy"), and the
     round 3 item 1 Done.
   - Next (the fixer's lead): bring the membrane zone's draw-in down into the gusset top (z from z_crotch + 0.01), or
     release the gusset pin in the settle. Then re-check `seamGap`: it is 9.76 mm now, with only 0.24 mm under the
     10 mm limit (F10).
   - Done:
     - In a, d and head_kit a, the crotch is one smooth surface into the inner thighs, with no cast shadow.
     - The centre seam tape in e is straight.
     - The probe is at most 6 mm from the waist seam to the gusset.

2. **Abdomen dimples (round 1 item 5, round 2 item 7, round 3 item 4; never fixed).**
   - Where: e, at (790-830, 720-760) and (980-1000, 720-750). They read as a navel and ab detail through the suit.
   - What it breaks: render check 4 (paint on the skin) and SPEC 1 "Physical".
   - Next (the fixer's lead): in `prepare_body`, raise the abdomen's 8 mm inward clamp, or fair the cling's faired-skin
     copy there.
   - Done: in e the abdomen is one smooth surface from the ribs to the waist seam.

3. **Broken panel lines at the collar and shoulders (round 1 item 4, round 2 item 6, round 3 item 6; never started).**
   - What it breaks: ART-DIRECTION 9.1 ("panel lines ... meet without kinks") and render check 6 ("clean panel
     lines").
   - Where:
     - c (820-1000, 500-580) and s1 (890-960, 580-720): the collar-base tapes form a broken V left of the zip, with gaps
       and a stub.
     - c (430-550, 570-610) and (1510-1720, 640-710); s2 (20-310, 740-800) and (1390-1530, 670-720): the shoulder yoke
       boundaries are waves that end in hooks.
     - c (1720-1760, 930-1000): the right raglan tape has a dog-leg.
   - Done: in c, s1 and s2:
     - each yoke boundary is one smooth curve into the raglan seam;
     - the collar-base tapes are one continuous curve, or end cleanly on the zip tape.

4. **Waist seam notches (round 2 item 8, round 3 item 7; never started).**
   - Where:
     - e, centre front (890-910, 1040-1060): a notch.
     - e, left hip (420-560, 880-940): a step in the tape.
     - j, centre back (1125-1140, 185-215): a dark gap where the centre back seam meets the waist tape.
   - What it breaks: render check 6.
   - Done: in e and j the waist tape is an even strip, with no notch, step or gap.

5. **The hood skirt front reads as a tab (round 3 items 2-3: the check is done, the visual is still open).**
   - Where: s1, the corners at about (800, 590) and (1085, 605), where the 20 mm front drop (`SKIRT_FRONT_SUIT`) starts.
   - What it breaks: render check 6.
   - Next (the fixer's lead): ease the drop over a wider arc (smoothstep over 0.0-0.9 of the front cosine), and keep
     `covered:gunmetal` at 0.
   - Done: in s1 the skirt's lower edge is one smooth curve from the sides to the front.

6. **The lumbar region reads as anatomy (the carried step 05 "lumbar dimple" check; not listed in rounds 1-3).**
   - Where: b (crop `ck4/lumbar-b.png`, about 580-700, 480-700). The spine groove runs deep down to the waist seam,
     between lit erector ridges. The left ridge shows as a separate lit oval at the rim (about 590-610, 570-640).
   - Note: the A51 fill is capped at 10 mm outward.
   - Done: in b the lower back is one taut surface with at most a shallow spine channel, and no lit muscle ridge.

## Follow-ups to log (not fails)
- F1-F9 stay open, as written in the round 1 and round 2 lists.
- F10: the seam-gap seed risk (9.76 mm against the 10 mm limit).
- F11: a 5.5x edge growth under the skirt.
- F12: tape stubs. Still seen in h (290-310, 600) and (1000-1020, 590), f (830-860, 140-160) and (900-920, 330-345),
  and s3.
- F13: the side seam runs through the middle of the vent, f (770-850, 100-560).
- F10-F13 are not yet in LOG.md.
- New: s4 shows a small dark sliver on the right boot collar (about 1000-1030, 635-645). Check whether it is a boot
  detail or a hole.
