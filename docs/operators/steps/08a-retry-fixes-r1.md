# Step 08a retry (Wren block end) - checker round 1: FAIL

Verdict: FAIL on the renders (item 1 is a regression). Crotch, lumbar, waist ring, neckline, yokes and hood skirt are
fixed. The abdomen is now worse than at HEAD.

Automatic checks (re-run by this checker):
- `E2E_GPU=1 npm run operators:check`: exit 1, ONE FAIL `rigidSkin:lod2` (legBandBuckleL0 / L1 absorbed by the LOD2 shell; routed to the step 10 retry). Everything else passes: suit seamGap 9.59, edgeLength suit 19.4 / others 23.31-29.67, all 30 rigidKit lines, rigidSkin hero / lod0 / lod1 (spread 0), bakeDiff LOD0 back 14 / boot 119/404, LOD1 chest 5 / head 17, LOD2 side 9 / chest 8.
- `npm run check`: exit 0 (76 files, 803 tests, build OK, lint 0 errors / 38 warnings).

What was checked:
- Renders: wren-suit-a..k 21:05-21:06, headwear 21:10-21:11, head_kit a-j / s1-s4 21:11-21:12, pose sheets
  21:41-21:43. All are newer than HEAD (55a5137, 20:21). They were made on the hardware GPU: scratchpad
  `w4/full-build.log` says "test renders on NVIDIA GeForce RTX 4090 Laptop GPU".
- Comparison crops against the HEAD renders are in the session scratchpad `ck5/`: e-abd vs old-e-abd, a-abd vs
  old-a-abd, crotch-a / crotch-hka vs old-crotch-a, c-collar vs old-c-collar, c-raglanR2 vs old-c-raglanR2, b-lumbar vs
  old-b-lumbar, j-cb, e-cf, e-hip, c-yokeL.
- No forbidden files were edited. check.mjs and the tests are untouched, so no threshold was loosened. GARMENTS is
  unchanged, and there are no new external files.
- The later items show no regression in the check lines: every rigidKit line and rigidSkin hero / lod0 / lod1 pass;
  seams and edge lengths are as listed above; bakeDiff passes. The `rigidSkin:lod2` FAIL is routed to the step 10
  retry (orchestrator), so it is not counted here.

## Fix list (worst first)

1. **Abdomen: the suit now shows the rectus muscles (a regression; round 4 item 2 is not met).**
   - Where:
     - e (`wren-suit-e-closeup-chest-waist.webp`, about 820-1010, 380-860; crop `ck5/e-abd.png` against
       `ck5/old-e-abd.png`): a segmented six-pack. There is a linea-alba groove, blocky tendinous-intersection steps
       along the shadow line at x ~1000, and a dark navel-like pit at about (820-870, 720-760).
     - HEAD's e had only the two small dimples. The new form is larger and reads more as anatomy.
     - a (crop `ck5/a-abd.png`): the same banding, faint at full figure.
     - The lower belly below the armour's rib segments shows it in the dressed stack too (armour d).
   - What it breaks:
     - Render check 4: "not as paint on the skin".
     - The step's Check: "no ... anatomical detail".
     - SPEC 1 "Physical".
     - LOG.md wrongly says the dimples are "softer".
   - Cause (the lead):
     - The new `abdomen` zone (suit.py `SIM['cling']['zones']`, `'support': 'subdiv'`) holds the suit 3.3 mm off
       `subdivided_skin()`.
     - That is the rendered body with only a 10-pair Taubin fairing (build_garment.py `subdivided_skin`). Taubin is a
       band-pass that keeps 5-7 cm features: the rectus ridges, as the prepare_body comment (fix round 1) already notes.
       So the membrane now copies the body's abdominal relief.
     - Also, `membrane_zones` now runs its final `push_out` for every suit vertex against `subdivided_skin(0)` (the raw
       subdivided body) whenever any zone uses `subdiv`. This moves the global guard, not only the zone vertices.
   - Next:
     - Hold the abdomen zone off a support with no abdominal relief: the prepare_body-relaxed body (subdivided), or a
       plain-Laplacian fairing of the subdivided body over the abdomen (not Taubin). Alternatively, drop the abdomen zone
       and keep A91's 14 mm settle.
     - Limit the `subdiv` final guard to the zones' own vertices.
     - Keep the lumbar zone: b is now good, so keep that result.
     - Re-check the crotch (a, head_kit a, e) and `seamGap` after the change.
   - Done:
     - In e the abdomen is one smooth surface from the ribs to the waist seam: no groove, no segment steps, no navel.
       It is at least as smooth as HEAD's e, without HEAD's two dimples.
     - a and d show no banding.
     - Crotch, lumbar (b) and waist ring stay as they are now.
     - LOG.md describes the result accurately.

2. **Right raglan seam: the dog-leg at the underarm is still there (round 4 item 3, listed under "Where"; the
   implementer did not touch it).**
   - Where: c, about 1620-1670, 930-1000 (crop `ck5/c-raglanR2.png`). The tape is smooth down to about y 920, then
     kinks to the right and swells into a blob where it reaches the underarm. HEAD's c showed the same.
   - What it breaks: ART-DIRECTION 9.1 (panel lines meet without kinks) and render check 6 (clean panel lines).
   - Done: in c the right raglan tape is one smooth curve into the underarm, the same width all the way, with no blob.

3. **Suit collar: a crumpled wing on the left top edge, larger than at HEAD.**
   - Where:
     - c, about 760-860, 330-400 (crop `ck5/c-collar.png` against `ck5/old-c-collar.png`): the stand collar's left top
       edge flares out as a pointed, folded flap.
     - The right top edge (about 1190-1250, 300-365) has jagged spikes.
     - The hood skirt covers both in the dressed stack (s1). They show in the suit's own collar close-up.
   - What it breaks: render check 6 ("nothing lumpy").
   - Done:
     - In c the collar's top edge is one clean, even line on both sides of the zip, with no flap or spikes.
     - s1 / s2: the hood skirt still laps the collar cleanly (step 07 round 3 nape check).

## Notes (not fails)

- **Crotch probe.** It reads 6.6 mm against the 6 mm asked: 17 vertices at z 0.800-0.818.
  - The visual Done is met: a and head_kit a show one smooth surface, with no bulge and no cast shadow; compare
    `ck5/crotch-a.png` with `ck5/old-crotch-a.png`.
  - The probe is not a step Check or a check.mjs limit, and the round 4 Done asked for it. If item 1's change does not
    bring it under 6 mm, record the 0.6 mm as an assumed decision, with these renders as the evidence.
- **Tape-end artifacts (F12 family).**
  - A small bright bow-tie cap where the centre front tape meets the waist ring (e about 900, 1043; crop `ck5/e-cf.png`).
  - The same cap where the centre back tape meets it (j about 1140, 167; crop `ck5/j-cb.png`).
  - A twisted knot at the bottom end of the centre front tape at the gusset (e about 865-890, 1315-1340).
- **Lumbar.** b has a soft horizontal shelf across the back at about (610-690, 540-555), where the lumbar zone's top
  probably fades out. It is a matter of taste: watch it.
- **Yoke ends.** The yoke tapes end square, a few mm short of the raglan tape: c (527, 620), s2 (290, 800) and
  (1415, 710). This is acceptable as a clean end.
- **Earlier follow-ups.** F11, F12 and F13 (f: the side seam through the vent) are still open, as before. The s4
  boot-collar sliver is not visible in the new s4.
