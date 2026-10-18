# Step 11 - fix round 1 (checker, round 1)

Verdict: FAIL. The KTX2 carry-over (D26, A73, A79) and A78's export / rig changes are sound; the render set is not.
The checker read all 30 sheets in docs/operators/mockups/wren/ (all newer than HEAD 4426758, every caption names
ANGLE D3D11 on the RTX 4090). Five close-ups miss their subject, the close-ups cannot show the materials the render
check asks about, the rim sheet is not a silhouette, and the callouts misreport built items. Items are ranked by
impact. Do not touch materials.py, the garment builders or any check limit: every fix below is in the Lab
(`src/operators/lab/*`), the sheet script (`scripts/operator-sheet.mjs`) or the docs.

Expected and must stay visible: `wren lod1 FAIL bakeDiff: chest 36 px > 24` (step 10, OPEN, block-end retry).

## Fix list (ranked)

1. **The close-ups render the unbaked `source` LOD, so render check 3 and SPEC 1 "Physical" / "Lived-in" cannot be
   judged.** `scripts/operator-sheet.mjs:222` renders every close-up with `lod: 'source'`, whose materials A78 flattens
   to one constant albedo / roughness each: no diamond micro-emboss, no vent perforations, no micro-pebble grip, no
   composite fibre, no wear. In the sheets the suit shell, stretch, abrasion, grip and vent zones differ only by a
   0.032-0.036 albedo step and read as one flat material (forearm: grip panel indistinguishable; knee: the grip panel
   is a flat dark patch; underarm: no vent). D21 makes the hero the close-up LOD and it carries these details in its
   baked normal / ORM maps.
   Done: every close-up is rendered from the hero LOD (or hero beside source, labelled); at 0.4-0.75 m the vent
   perforations (underarm, knee backs), the grip pebble (forearm, knee), the shell emboss, the abrasion weave and the
   composite read as different materials without colour; captions say which LOD.

2. **Five close-ups do not show their subject (step file "Do" 1).**
   - `wren-sheet-closeup-underarm.webp`: the camera sits against the body; no vent, no side strap, nothing
     identifiable (median 0.04). `labData.ts` underarm: `joint: 'shR'`, `yaw: 1.5`.
   - `wren-sheet-closeup-thighR.webp` ("the empty holster"): the frame shows the LEFT thigh's three sleeves and the
     right thigh's leg bands; the holster is not in frame. `labData.ts` thighR `yaw: 0.95` looks at the figure's left
     side (the anchors put the right side at -x: DESIGN.md `pistolHolster` x -0.2083).
   - `wren-sheet-closeup-belt.webp` ("Belt and holster"): no holster in frame (pouches, closure, cam pouch only).
   - `wren-sheet-closeup-ribsSide.webp`: a low view of a hip / seat with dashed lines; the three rib segments from the
     side are not identifiable.
   - `wren-sheet-closeup-shoulder.webp` ("Shoulder strap and buckle"): framed on the face and neck; the buckle is cut
     off at the bottom edge.
   Done: each of the five shows the named item filling a good part of the frame - the underarm vent panel and the
   22 mm side strap with its buckle; the empty holster (mouth, shell, platform, both leg bands, hanger); the belt with
   the holster hanger; the three rib segments overlapping in profile; the shoulder strap over the shoulder with its
   magnetic buckle at the chest plate tab. Check the yaw sign for every right-side close-up.

3. **The rim-light sheet is not a silhouette (render check 1).** `wren-sheet-rim-silhouette.webp`: "Two back rims, no
   front light", yet the Front and 3/4 front views show the whole front evenly lit mid grey, and the goggle glow
   light (Lab point light, range 3 m) washes the Side and 3/4 back views green. The `rim` rig's lights (`labData.ts`
   `v: [+-0.6, -0.25, 0.75]`) light the camera side, not the back (or the sign convention is inverted).
   Done: in Front and 3/4 front the body is near black (lit-figure median below sRGB 0.08) with bright edges at the
   head and optic, the plate shoulder line, the holster and sleeves and the belt; the glow lights only the lenses and
   their immediate surround (or the glow light is off for this sheet, labelled); the caption's claim matches the
   picture.

4. **The callouts misreport the suit (SPEC 1 render checklist: every visible item named with its job / anchors).**
   `builtKit()` reads only sim.json kit / patch ids, so:
   - collar, chestFront, ribsSide: "Not built yet: Suit chest zip" although the zip is built and visible;
   - handPalm, handBack, forearm: "Not built yet: Thumb loops" although `suit thumb loop elastic` is in the build;
   - forearm, knee: "Nothing of the kit is built in this view yet: the bare mannequin body shows" although the suit
     with its seam tape, elbow abrasion and knee grip panel fills the frame;
   - no close-up names the suit's built zones (grip panels, vents, abrasion and stretch zones, seam tape, thumb loops,
     zip and garage under the hood skirt) with their job.
   - beltFront lists the rappel ring, drone pod and medkit, which are on the back and not visible.
   Done: no built item is labelled "not built" or "bare mannequin"; each close-up's callouts name the visible suit
   features with job and anchor; items not in the frame are not listed.

5. **Gunmetal renders as flat black holes in every Lab sheet (render check 3 and 6: one metal finish that reads as
   metal).** A78 gave `hardware gunmetal`, `gunmetal`, `hardware metal` and `anodised aluminium` a 0.02-0.05 base
   colour but they stay metallic (glTF default 1, Lab 0.9) and the Lab has no environment to reflect, so the magnetic
   buckles, the belt closure and the leg-band buckles are featureless black rectangles (turnaround front, thighR,
   thighL, beltFront, knee, ptt). Before A78 they were light grey; neither reads as satin gunmetal.
   Done: a Lab-side fix only (export factors and / or a bundled, generated environment - no CDN, no new external
   file): in the detail close-ups the buckle halves show a satin highlight and their split line, distinct from the
   rubber-edged base and the black of a hole; materials.py and the check limits unchanged; record it in A78.

6. **Whole-figure sheets still read the near-black suit as light grey to white.** `studio` (exposure 4.5) drives the
   turnaround and the compare sheet: in `wren-sheet-compare.webp` Wren is near white with a bloom halo, lighter than
   the navy game operator beside her; the turnaround reads mid grey. ART-DIRECTION 4 (near-black, plates a hair
   lighter than the suit) cannot be judged from them. Also A78's text (exposure 0.45, grey card sRGB 0.5, suit
   0.12-0.24) disagrees with `labData.ts` (`detail` exposure 1.0, comment and captions "sRGB ~0.7", "0.2-0.33").
   Done: turnaround and compare use a calibrated whole-figure rig (no bloom halo) where the suit reads near black and
   darker than the game operator, plates a hair lighter than the suit; A78, the labData comment and the captions
   state the same numbers.

7. **Self-review incomplete (step Checks 2).** 23 of 30 sheets were not judged. After items 1-6 re-render, LOG.md's
   step 11 record lists every sheet with a one-line verdict against render check 1-7 and SPEC 1, and anything left
   open with its reason.

## Logged follow-ups (acceptable; record in LOG.md, not fails)

- **A79 interim (acceptable for the Lab, not for shipping).** The decoded stand-ins are the UASTC data's own level-0
  decode; the step 11 lods-closeups sheet is visually identical to step 10's WebP sheet, and the decoded path never
  constructs a KTX2 Texture, so no CDN request can happen. Gates before step 18 uses KTX2 in the game: Michael's OK
  for the vendor/ktx2 files; the first Babylon-transcoded render compared with the decoded sheet (orientation: the
  Lab reader v-flips UVs and relies on invertY, which Babylon cannot apply to compressed textures; sRGB vs linear;
  mips); the game's glTF path needs the KHR_texture_basisu loader extension imported in core/babylon.ts; add a guard
  or test that KhronosTextureContainer2.URLConfig never keeps Babylon's CDN defaults when a KTX2 loads (hard rule: no
  runtime network). The game build's `dist/assets/babylon-*.js` now holds KhronosTextureContainer2 with its
  `cdn.babylonjs.com/babylon.ktx2Decoder.js` default; check against a HEAD build whether the new core/babylon.ts
  export put it there (bundle growth, a CDN URL reachable from the game) and if so keep the Lab's use out of the game
  chunk. GLBs are 2.2-2.7x larger on disk (hero 55 MB, LOD0 18 MB): the RDO choice stays a step 18 item.
- Goggle glow light spill (step 07 follow-up 6) now dominates the menu sheet (D21's main menu): head and chest lit
  green, a glowing halo round the head; also lods and context.
- The LOD1 / LOD2 / phone raking blow-outs in `wren-sheet-lods-closeups.webp` are unchanged from step 10 (block-end
  retry), not caused by KTX2.
- `wren-sheet-compare.webp`: "moth is built" is false (moth-lab.glb is step 05's body); the Wren figure is cut by the
  left frame edge. `wren-sheet-wireframe.webp`: the 0.5 m chest wire tile is saturated solid grey (source, 2.5 M
  triangles) and the footer still says baked maps "arrive in step 10".
- `wren-sheet-closeup-neckRear.webp`: the hood's shock-cord lock hangs free below two grommet loops (render check 7,
  minor). `wren-sheet-closeup-beltBack.webp`: the rappel ring's bow sits below its tunnel against the seat; confirm
  it is held flush.
- Goggle sheet: the stowed Cycles views show the lenses glowing while stowed (a light leak for a covert operative;
  decide whether the glow is off when stowed).
- Step 08a OPEN items still visible: collar tapes left of the zip (collar, ptt), the crotch hole / bulge (thighL,
  beltFront), the lumbar region (chestRear, backPlate). Block-end retry as STATE says.
