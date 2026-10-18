# Step 08a - fix round 2 (checker, round 2)

Verdict: FAIL. Full `E2E_GPU=1 npm run operators:check -- wren` fails 9 checks. That matches the fixer's report:
- suit `seamGap` 10.48 (< 10)
- gloves, boots, headwear and head_kit: `sampled:suit thumb loop elastic` 93 (>= 150)
- headwear and head_kit: `sampled:gunmetal` 0 and `edgeLength` 36.49 (<= 30)

`npm run check` passes (73 files, 762 tests, build; lint 0 errors, 38 warnings). No check was weakened.
check.mjs and the LIMITS in check_garment.py are unchanged. check_garment.py only gains two real views. The test
edits swap removed ids and assert they are gone. No forbidden files, brands or new external files. The five
GARMENTS items are built, and the LOG.md draft exists. Every render in mockups/tests (suit a-k, head_kit a-j and
s1-s4, headwear, gloves, boots) is newer than HEAD (22:02-22:08 against 20:14).

Round 1 items now passing:
- 2, nape: s2 and head_kit f show a smooth mock neck under the skirt.
- 3, zip garage: under the skirt. The probe below confirms the slider cannot be seen.
- 7, view f: frames the vent.

Checker probes (scratchpad `ck-r2/`, Blender headless on the GPU; nothing in the repo changed):
- `gm_probe.py`: the gunmetal slider in wren-head_kit.blend from 120 cameras, 60 directions round its centre
  (0.017, -0.061, 1.431) at 0.25 m and 0.6 m, 900x1125, 50 mm. **0 px in every view.**
- `tl_probe.py`: the thumb-loop material in wren-gloves.blend. The 93 px are **the loop poking through the glove**,
  not loop seen past the cuff. In the A30 wrist-from-below view, 45 px are on the glove's outer surface at the thumb
  web (535-540, 480-515 at 900 px). In the front view, specks show inside the glove outline at both thumb webs.
- `edge_probe.py`: the 36.49 mm edge is on **wren-suit-hero, not the hood skirt**. In the suit and boots stacks the
  longest suit edge is 8.6 mm. In the head_kit stack, 37 suit edges are over 30 mm and 55 are over 25 mm, all at
  about x 0.05-0.07, y +0.04, z 1.405: the back-left collar base under the skirt. Headwear's draw-in or push on the
  suit collar stretches it (A49 `tame_mock_neck` blend, or the skirt push-out).

Items are ranked by impact. Re-render the suit set and head_kit a / b / f / s1-s4 after the fixes, then run the full
`operators:check`.

1. **Crotch bulge: the suit reads as having male anatomy.** This is new in round 1, from the gusset pin in A48. It
   breaks render check 4, SPEC 1 and the step Check "no gusset crumple; no anatomical detail".
   - Where: d (585-610, 760-830) and a (575-605, 760-830) show a rounded bulge with a dark under-shadow at the
     crotch. Also head_kit a (575-605, 770-840) and e (820-960, 1000-1300).
   - Done: in d, a and head_kit a the crotch is one smooth surface running into the inner thighs, with no bulge, pad
     or under-shadow. Only the centre seam tape reads. In e, the gusset lies flat with no crumple.
   - Fix: the pinned diamond holds the gusset proud of the body. Pin it on the body surface or drop the pin and
     cling it. Record it in DECISIONS (amend A48).

2. **The thumb loops clip through the gloves.** The `sampled:` failure is a symptom of this.
   - Where: the gloves, boots, headwear and head_kit stacks (probe above). Step Check "thumb loops under the
     gloves"; render check (clipping).
   - Done: the probe (`tl_probe.py`, or the same method) and the check views see 0 px of `suit thumb loop elastic`
     in the gloves, boots, headwear and head_kit stacks. The loop sits under the glove all round the thumb web.
     Thin it or keep it on the skin; do not move the glove.
   - Do not widen the loop (9 -> 12 mm) and do not add a view aimed at the thumb web. Both would push more of the
     clip into view. Item 4 then covers the sampled count.

3. **Suit seam gap 10.48 mm (limit < 10).**
   - Where: wren-suit-sim.json `seamGapByFrame`. The gap is 8.5-9.4 mm through the sew phase, then rises in settle:
     16.3, 9.9, 10.48 at frames 15, 30, 40. The worst seam is outLoR / inLoR, on the lower legs.
   - Done: `seamGap` < 10 in the full run, with at least 0.5 mm to spare (<= 9.5) so seed noise cannot flip it.
     No change to the limit, the frame counts or the settle length that only stops the sim before the gap grows.
     More sewing force (16 -> 18) or a lower-leg fix is fine. Record the SIM change.

4. **The gunmetal and thumb-loop `sampled:` checks: the rule to record.**
   - No real view in the dressed stack sees the slider (probe: 0 of 120 views), and it is correctly covered (step
     Check "garage under the hood skirt"). A30's route, adding a real view, does not exist here.
   - Record a narrow assumed decision (next free A-number) and implement it in check_garment.py exactly as follows.
     It adds a check and loosens none:
     - (a) A material can skip `sampled:` in a later item only if it is listed in an explicit `COVERED` table. Each
       entry gives the material, the item that covers it and why:
       - `gunmetal`: covered by `headwear` (the hood skirt over the zip garage).
       - `suit thumb loop elastic`: covered by `gloves` (the glove over the thumb web). Add this entry only once
         item 2 makes it 0 px.
       The skip applies from that item onward only.
     - (b) The material must have passed `sampled:`, `albedo:` and `roughness:` in its own item's check JSON
       (wren-suit-check.json: today 2325 px of gunmetal and 22341 px of thumb loop). Read that JSON. The check fails
       if the JSON is missing, or if that material failed or was not sampled there.
     - (c) In the covering item and every later one, a new check `covered:<name>` reports the material's px over
       the views and must be **0**. A covered part that shows is then a clip or a gap, and it fails.
   - Every other material keeps `minPixels` 150, and LIMITS do not change.
   - Done: the decision is in DECISIONS.md. The gloves, boots, headwear and head_kit checks show `covered:gunmetal`
     (headwear, head_kit) and `covered:suit thumb loop elastic` (gloves onward) passing at 0 px, with their
     own-item references. A test or a dry run shows `covered:` failing when the material has px > 0.

5. **Head stack: the suit collar is stretched under the skirt (edgeLength), and the skirt's front edge stands off
   the shoulders.**
   - edgeLength: the probe above puts the stretched edges on the suit, not the skirt. Done: `edgeLength` <= 30 mm
     in headwear and head_kit. No suit edge in the head stack is longer than in wren-suit.blend by more than about
     2x. Do not subdivide to hide a stretch the draw-in causes.
   - Skirt front edge, in s1 (crops 540-1060 and 1060-1580, y 480-840): the skirt is a flat plate with a
     knife-thin edge and needle tips at both shoulders (570, 545 and 1520, 580). A dark gap under it shows that it
     stands off the suit. Also headwear c (590-700, 1170-1210). This breaks render check (floating parts, nothing
     lumpy). Done: in s1 and headwear c the skirt edge lies on the suit all round, with no visible gap and no
     pointed corners. Its edge is rounded like the nape edge in s2.

6. **Zone outlines are still broken (round 1, item 4, not done).** This breaks the step Check "every zone reads by
   material alone" and ART-DIRECTION 9.1 "panel lines meet without kinks".
   - Yoke boundaries are waves ending in hooks:
     - s1: (330-460, 700-740) and (1540-1800, 780-830, with a notch at 1700-1750)
     - s2: (20-290, 740-800) and (1390-1530, 700-760)
     - c: (430-550, 570-600) and (1520-1720, 600-660)
   - The collar-base yoke tapes meet in a broken V at the centre front: s1 (790-1010, 620-720), straight segments at
     angles with a gap left of the zip, and c (800-1100, 490-580, notch at 970, 575).
   - Short stubs:
     - s3 (395-470, 790-840): a square-cut tape end in mid-panel on the left hip below the waist seam
     - f (900-920, 330-345): a stub on the vent outline
     - f (830-860, 140-160): a kink in the side seam tape at the top of the vent
     - h (290-310, 597 and 1005-1020, 575): short stubs beside the knee pads. Check whether these run on to a seam.
   - Done: each shoulder yoke is one panel from the collar across the shoulder, like A2-back / A2-chest. Its
     boundary is a single smooth curve or straight line with no wave or hook, meeting the raglan seam cleanly. The
     collar-base tapes are one continuous curve, or meet the zip tape cleanly. No tape under about 3 cm ends in mid
     panel in any suit or s-view.

7. **The abdomen still shows two dimples (round 1, item 5, partly done).**
   - Where: e, two symmetric dimples at (790-830, 720-760) and (980-1000, 720-750). Under the rake they read as
     navel / ab detail (render check 4).
   - Done: in e the abdomen is one smooth surface between the ribs and the waist seam, with no dimples.

8. **Notches in the waist seam.**
   - Where: e has a notch at the centre front (890-910, 1040-1060), and the tape shows a step: lit upper edge,
     shadow below (420-1250, 880-1050). j has a notch at the centre back (1125-1140, 180-200; round 1, item 6).
   - Done: in e and j the waist tape is an even strip with no notch at the centre front or back, and no step between
     the top and leg sides, the same weight as the side seam tape in f.

## Acceptable, logged follow-ups (not part of this round)
- F1-F5 from steps/08a-fixes-r1.md stay open as written.
- F6. At full figure (d, a, head_kit a) the waist seam reads as a high-cut bodysuit leg line: it is the only
  horizontal line on the front. It is a flush seam, not a band, so round 1 item 1 is met. The step 09 belt sits over
  it. A design note for Michael: should the seam run level at the natural waist instead?
- F7. The suit-only ankle shows the left cuff hem flared and wavy, and the outer leg seam tape waving (k 0-185,
  500-580; 1020-1060, 0-700). Both are inside the boot in the dressed stack (s4), so note only.
- F8. In b and head_kit b (590-700, 560-700) the lower back reads as a strong lumbar hollow. Most of it is the lit
  flank seen past the back's edge, and j closer up shows a smooth spine. Re-check after item 8.
- F9. The zip garage's side tapes in c (960-990, 380-560) wobble slightly. They are under the skirt in the dressed
  stack, so note only.
