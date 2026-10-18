# Step 11 - fix round 3 (checker, round 3)

Verdict: FAIL, narrow. `npm run check` passes (re-run by the checker: 75 files, 790 tests, lint 0 errors / 38
warnings, build OK). operators:check not re-run: no pipeline input or build/operators file is newer than the round 2
log (only lab.ts / labData.ts changed after it), so it stands with the one expected step 10 line
`wren lod1 FAIL bakeDiff: chest 36 px > 24`. No forbidden file, no loosened limit (check.mjs only adds the KTX2
staleness rule; tests only add checks; the glb winding test change is A80). All 32 sheets read; all newer than HEAD,
every caption names ANGLE D3D11 on the RTX 4090.

Round 2 items confirmed fixed: 1 (goggle spill: goggle, colourblind, context, menu, lods), 2 (shoulder), 3 for
chestRear / ribsSide / collar zip, 4 (masked stats; rim Front 0.00 / 3/4 front 0.07 with edges), 6 (+2 EV panels on
every close-up), 7 (turnaround key side brighter, grey sphere 0.40 / 0.32), 8 footer (costs per LOD), 9 (LOG verdicts).

Round 2 item 5 (gunmetal): the fixer's diagnosis holds. A metallic material's specular colour is its base colour, so
0.051 gives F0 about 5 %, the same as dark plastic; with hard-part roughness 0.55+ no Lab light can give a satin hot
spot without faking it. The buckle close-up does show the two halves and the split line. Not a step 11 fail: move it
to step 11b (it touches materials.py anyway) with a target, e.g. gunmetal as a metal with F0 / base colour about
0.25-0.45 linear and roughness near 0.55, or as a dielectric coating (Cerakote-like) and then the "one metal finish"
read comes from the edge wear; recheck on `wren-sheet-closeup-buckle.webp`.

Do not touch materials.py, garment builders, the kit layout (D28, 11b) or the phone LOD (D29, 11b).

## Fix list

1. **The wireframe sheet draws no wireframe (BRIEF Stage 2.2 "A wireframe and LOD strip"; r2 item 8 "so the wire
   reads").** `wren-sheet-wireframe.webp`: the LOD strip tiles (hero, lod0, lod1, lod2, phone) and the
   "Wireframe, lod0, chest at 0.5 m" tile are all shaded surfaces with soft cast shadows and no triangle edges; at
   0.5 m on LOD0 (40 k triangles) the edges would be tens of pixels apart. The step 04 version of this sheet (HEAD)
   did draw a wire with the same `debug: 'wire'` path (`lab.ts:412` sets `mat.wireframe`), so this is a regression
   since step 04 (the baked / KTX2 PBR materials, the A80 / env / shadow changes, or a Babylon 9 side-effect import
   for wireframe - check the console for "requires a side-effect import"). LOG.md's verdict "wireframe: PASS (LOD0
   wire reads)" is wrong.
   Done: the chest tile and at least LOD1, LOD2 and phone in the strip show their triangle edges (hero may read
   dense); LOD0's wire reads on the chest tile; LOG verdict corrected from the new render. Re-render with
   `--only wire`.

2. **Callouts still name items that are not visible in their frame (SPEC 1 render checklist: "for every visible
   item"; r2 item 3 "per-close-up lists match what each final frame shows").**
   - `closeup-head` (front view): "Battery pod" (rear of the harness, on the occiput) is not in the frame; the
     entry for `head` in `labData.ts:296` has no `exclude` list, so every head-zone item is listed.
   - "Earpiece" (in the ear, under the hood and balaclava) is never visible, yet is listed on `head`, `collar`,
     `ptt` and `neckRear`; keep the earpiece cable (visible), drop the earpiece itself or mark it "under the hood,
     not visible" consistently.
   - `closeup-collar`: "Head harness (split crown)" - only the chin is at the frame's top edge; confirm or drop.
   - `closeup-beltFront`: the visible belt closure buckle is not called out (no "Magnetic quick-release buckle"
     entry) and `slingSocket` is excluded, although DESIGN.md's loadout table names `beltFront` as the sling
     socket's view (left hip). Either call it out (if in frame) or change DESIGN.md's view column to a sheet that
     shows it.
   - `closeup-chestFront`: "PTT button" - confirm it is in frame (top right strap edge) or drop it.
   Done: each listed close-up's callouts name only what its own frame shows; DESIGN.md's view column agrees.
   Re-render the touched close-ups only.

3. **LOG.md's step 11 record contradicts itself.** The implementer's section still states superseded facts as
   current: "OPEN (A79): Babylon's decoder files ... are not on the PC ... the Lab draws each KTX2 texture as the
   reference transcoder decoded it" (fixed in round 1, D27), "Lit-figure sRGB medians now 0.18-0.27" (now 0.05-0.13
   masked), "30 sheets" (now 32), "OPEN (sheets, not fixed): ... Suit chest zip: not built yet ... rim sheet's goggle
   glow light washes the back green" (fixed). Done: those lines marked superseded (one short note each, pointing at
   the fix round) so the committed record reads true top to bottom. Add the gunmetal value to the step 11b list in
   STATE.md (see above).

## Logged follow-ups (confirmed in LOG.md; not fails)

- Hero bake confetti (handBack, handPalm, forearm, knee, boots, thighs, underarm, neckRear, rim 3/4 back), LOD1 /
  LOD2 / phone mid grey (`lods-closeups`), LOD1 chest bakeDiff 36 px, vent holes below bake resolution, 08a lumbar
  (`chestRear`, `backPlate`, `beltBack`) and crotch patches: all in LOG.md "Open (step 10 / 08a block-end retry)".
  The knee grip panel is still not identifiable even at +2 EV: attributed to the bake in LOG; keep it on that list.
- 11b scope (D28 / D29): bent throwable sleeves and mag pouches (`thighL`, `lods-closeups` torso bent), phone LOD.
- Notes: `compare` figures in the left of the tile; `menu` last column cut; `beltBack` rappel ring bow does not read;
  `thighL` caps small; the A-pose hand casts a large hand-shaped shadow across the hip in `belt` and `thighR` (reads
  like a stain; consider moving the key or the arm for those two frames); the darkness identity test at 20 m
  (`context`) is two dots and an almost invisible figure - acceptable for "full darkness", but a slightly larger
  frame would help the read.
