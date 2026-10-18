# Step 11 - fix round 2 (checker, round 2)

Verdict: FAIL. A80 (reader winding) is correct and not a loosened test; KTX2 / D27 is sound; `npm run check` passes
(75 files, 790 tests, lint 0 errors, build OK); no pipeline or data change after the fixer's full operators:check
(only the known step 10 `wren lod1 FAIL bakeDiff: chest 36 px > 24`). The checker read all 31 sheets in
docs/operators/mockups/wren/ (all newer than HEAD, every caption names ANGLE D3D11 on the RTX 4090). What fails: A80
made the goggle spill light the operator herself, one close-up still misses its subject, callouts still list items out
of frame, the figure statistics measure the backdrop, the gunmetal is still not shown, the close-ups are too dark to
judge materials, and 24 sheets still have no verdict. Every fix is in the Lab (`src/operators/lab/*`), the sheet script
(`scripts/operator-sheet.mjs`) or the docs. Do not touch materials.py, the garment builders or any check limit.
Note: labData.ts (12:08) is newer than most sheets (12:06-12:07): re-render the whole set at the end.

Expected and must stay visible: `wren lod1 FAIL bakeDiff: chest 36 px > 24` (step 10, block-end retry).

## Fix list (ranked)

1. **The goggle spill light floods Wren herself (render check 1 and 5; D21's menu).** After A80 the faces are lit from
   the right side, so the Lab's glow point light (`lab.ts:139-142`, placed at head +0.2 m z, range 3 m, `lab.ts:742`)
   now lights her own face, hood, harness and chest bright green and blows the goggle housing to white:
   - `wren-sheet-goggle.webp` "In use, full darkness: glow only": whole head and shoulders green, housing white;
   - `wren-sheet-colourblind.webp`: all four panels show a white housing and a lit face, not the lens glow;
   - `wren-sheet-context.webp`: "crouched in shadow" is lit green from the head down; the 20 m darkness identity test
     shows a green-lit body, not a silhouette with two lenses;
   - `wren-sheet-menu.webp` (every strip) and `wren-sheet-lods.webp` (all six LODs): head and chest lit green, a halo.
   Done: the spill never lights the operator's own meshes (e.g. `excludedMeshes` with every loaded operator mesh, or a
   forward spot that reaches only the environment ahead); the lenses glow, the housing keeps its own value (no white
   blow-out, no bloom halo over the head); in the darkness views only the lenses and a faint silhouette read; the stale
   captions go ("stand-in housing until the head kit exists" on colourblind, "the glow is a stand-in until the head kit
   exists" on context). Re-render goggle, colourblind, menu, context and lods.

2. **The shoulder close-up still misses its subject (r1 item 2).** `wren-sheet-closeup-shoulder.webp` frames the chest
   plate, the mag pouches and the upper arm; the strap's run over the top of the shoulder is out of frame and the
   magnetic buckle at the chest-plate tab is cut by the top edge (top centre). `labData.ts` `shoulder` entry.
   Done: the left shoulder strap from the back over the shoulder to the chest-plate tab, with its magnetic buckle
   wholly in frame and filling a good part of it.

3. **Callouts still name items that are not in the frame, and one twice (r1 item 4; SPEC 1 render checklist).**
   - `closeup-chestRear`: "Rifle magazine pouches x2" (front of the chest plate);
   - `closeup-shoulder`: "PTT button" and "Radio cable" (not in frame in this render);
   - `closeup-ribsSide`: "Suit chest zip" and "Rifle magazine pouches x2" (front items; confirm against the frame);
   - `closeup-collar`: the zip twice ("Chest zip and garage (suit)" from SUIT_FEATURES and "Suit chest zip" from the
     kit item `suitZip`).
   Done: per-close-up `exclude` lists match what each final frame shows; one zip entry; re-check every close-up's
   list against its own picture after items 2 and 6.

4. **The "lit figure" statistics measure the backdrop, so the rim sheet's claim is unverified (r1 item 3).**
   `operator-sheet.mjs` `figureStats` (192-212) drops only pixels within 9/255 of the clear colour, so the backdrop
   wall and the floor (lighter than the clear colour) count as figure. `wren-sheet-rim-silhouette.webp` "3/4 back -
   median 0.06" while the lit figure there reads about sRGB 0.4-0.5; every view prints median 0.06, the wall's value.
   The close-up captions use the same function. Also the rim edges in Front and 3/4 front are thin and faint, short of
   r1 item 3's "bright edges at the head and optic, the plate shoulder line, the holster and sleeves and the belt".
   Done: the statistics come from a figure mask (e.g. a second render with the backdrop and floor hidden, or an alpha
   / stencil pass) and the captions are re-measured; the rim rig gives readable bright edges at those features in
   Front and 3/4 front while the body stays near black (masked median below 0.08).

5. **Gunmetal still not shown as satin metal (r1 item 5, left "not judged").** In every close-up the magnetic
   buckles (belt front closure in `beltFront`, leg-band buckles in `thighR` / `knee`, the strap-tab buckles in `ptt`,
   the side-strap buckle in `underarm`) are featureless dark rectangles; no highlight, no split line. Only the round
   pouch snap in `forearm` shows a highlight.
   Done: one close-up at about 0.3 m on a buckle (belt closure or a leg band) where the two gunmetal halves show a
   satin highlight and their split line, distinct from the rubber-edged base and from a hole; the other close-ups
   show at least a highlight on their buckles. Lab-side only (environment / probe placement / rig); record in A78.

6. **The close-ups are too dark to judge render check 3 and 4 (r1 item 1's "Done").** Every close-up's figure sits at
   about sRGB 0.05-0.12. In `handPalm` / `handBack` the leather palm, stretch back and wrist tab cannot be told apart;
   in `knee` the grip panel is not identifiable; in `head`, `chestFront`, `collar` the shell, seam tape, composite and
   zip garage merge. The calibrated value is right for ART-DIRECTION 4 but hides relief.
   Done: each close-up adds a labelled detail-read panel of the same view (exposure lifted about +2 EV, or the raking
   rig), beside the calibrated one, at the same LOD; LOG.md judges render check 3 / 4 per close-up from it and says
   for each zone that still does not read whether the cause is the step 10 bake (see the follow-ups) or the model.

7. **Explain or fix the turnaround's front / back value (A80 verification).** Under `figure` (front key 2.0 from
   above, back rim 1.4) the Back and 3/4 back panels of `wren-sheet-turnaround.webp` read clearly lighter than the
   Front panels (legs about sRGB 0.07 front vs 0.18 back, by eye), the reverse of what the rig should give.
   Done: masked leg / torso values front vs back measured and printed; either a cause that is not the lighting
   direction (e.g. the bake's AO / roughness, the environment) recorded in A80 with the numbers, or the fix. A grey
   sphere or card rendered under `figure` from front and back shows the key side brighter.

8. **Wireframe sheet is stale (BRIEF sheet: "triangle counts and texture sizes").** `wren-sheet-wireframe.webp`
   footer: "Textures: none yet (flat material factors; baked maps arrive in step 10). Costs and budgets are measured
   in step 10." The chest wire tile renders the 2.5 M-triangle source.
   Done: the footer prints the measured texture sets, KTX2 sizes and VRAM per LOD (report.json); the wire tile uses
   the hero or LOD0 so the wire reads.

9. **Self-review incomplete (r1 item 7; step Checks 2).** After items 1-8 re-render, LOG.md's step 11 record lists all
   31 sheets with a one-line verdict against render check 1-7 and SPEC 1, plus what is left open and why. The
   checker's round 2 verdicts (in the orchestrator's report) may be the starting point; re-judge what changed.

## Logged follow-ups (acceptable; record in LOG.md for the step 10 / 08a block-end retry, not fails)

- **Hero bake blotches: the fixer's diagnosis holds.** `build/operators/wren/export/textures/hero/wren-hero-cloth-orm.png`
  itself carries the confetti: the roughness (G) channel breaks into light / dark fragments over the sleeve, leg and
  hood islands; it shows in the Lab as camouflage-like patches (forearm, handBack, underarm, thighR, boots, neckRear,
  rim 3/4 back) and as glossy patches on the boot upper. Not the transcode (Babylon vs reference 0.07-0.14 / 255),
  not the Lab. Step 10 retry.
- LOD1 / LOD2 / phone suit reads mid grey against near-black hero / LOD0 under the same rig (`lods-closeups`, and both
  decodes in `ktx2-compare`): the in-game LODs do not keep the hero's value (SPEC 1 "Two levels"). Step 10 retry.
- Vent perforations do not resolve in the hero maps at 0.55-0.65 m (`underarm`, `ribsSide`); check the bake's texel
  density for the vent islands in the step 10 retry.
- Step 08a items still visible: lumbar light patch (`chestRear`, `backPlate`), crotch patch (`belt`).
- `compare`: both figures crowded into the left 40 % of the tile; `menu`: the last strip column is cut by the sheet's
  right edge; `thighL`: only two sleeves read clearly, caps small; `beltBack`: the rappel ring's bow does not read.
- Goggle stowed (Cycles): lenses still glow when stowed - Michael's decision (covert light leak).
- The game bundle holds KhronosTextureContainer2 (core/babylon.ts import, URL blanked): step 18 item, as A79 says.
