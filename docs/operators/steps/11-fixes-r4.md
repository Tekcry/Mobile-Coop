# Step 11 - fix list round 4 (checker, round 4, final; recorded OPEN for the block-end retry)

Verdict: FAIL, narrow (one item, text and data only; no render shows a modelling fault).

Re-run by the checker: `npm run check` exit 0 (75 files, 791 tests, lint 0 errors / 38 warnings, build OK).
operators:check not re-run: only lab.ts, labData.ts, operator-sheet.mjs and operatorLab.test.ts are newer than
scratchpad/opcheck2.log, so it stands with the one expected step 10 line `wren lod1 FAIL bakeDiff: chest 36 px > 24`.
33 sheets, all newer than HEAD, every caption names ANGLE D3D11 on the RTX 4090.

Round 3 items confirmed fixed:
- 1 Wireframe (`wren-sheet-wireframe.webp`, full-resolution crops): hero, LOD0, LOD1, LOD2 and phone tiles draw their
  triangle edges over the near-black underlay; the "Wireframe, lod0, chest at 0.5 m" tile shows LOD0's edges.
  LOG verdict corrected.
- 2 Callouts no longer name absent items: head (no battery pod, no earpiece), neckRear (band and goggle cable added,
  no earpiece), collar (no head harness), chestFront (no PTT), ptt (earpiece cable, no earpiece), beltFront (magnetic
  buckle called out, no sling socket), new hipL (cam pouch, sling socket boss between it and the drone pod, pod; left
  side view, front to the left: correct). include / exclude are unit-tested (`tests/operatorLab.test.ts`). DESIGN.md
  loadout table names hipL for the sling socket and the earpiece note.
- 3 LOG.md superseded lines marked (KTX2 decoder, 0.18-0.27 medians, 30 sheets, the "OPEN (sheets, not fixed)" item,
  the round 2 wireframe verdict); STATE.md step 11b list carries the gunmetal target.
- Spot-check of the load() debug re-apply and the wire underlay on non-wire sheets: `closeup-knee` re-rendered with
  the current code matches the round 2 file in the tree (mean diff 0.5 / 255, 0.02 % of pixels over 8); `rim-silhouette`
  differs 3.1 % at edges, but two back-to-back renders with the same code differ 4.0 %, so that is run-to-run noise,
  not a change. Originals restored byte-identical.

Out of scope, confirmed logged (not fails): D28 kit layout / D29 phone LOD / gunmetal (STATE.md 11b list); hero bake
confetti, LOD1 / LOD2 / phone mid grey, LOD1 chest bakeDiff 36 px, vent holes, 08a lumbar / crotch patches (LOG.md
"Open (step 10 / 08a block-end retry)").

## Fix list

1. **Close-ups leave visible items without a callout (SPEC 1 render checklist: "For every visible item the callout
   names: what it is, its anchors ..., its contents ..., its route ..., its job"; the same rule round 3 applied to the
   beltFront buckle).** Round 3 removed the items a frame does not show, but each list still covers only the frame's
   subject zone, so prominent neighbours in the same frame have no callout. Seen on the round 3 renders:
   - `wren-sheet-closeup-hipL.webp`: the slim laminate waist belt (`waistBelt`) runs through the centre of the frame and
     carries all three called-out items, and the pistol magazine pouch (`pistolMagPouch`) is at the left edge; neither
     is called out. `tests/operatorLab.test.ts:187` pins hipL to exactly `camMinePouch, dronePod, slingSocket`.
   - `wren-sheet-closeup-collar.webp`: both harness shoulder straps (`harnessShoulders`) cross the frame; not called out.
   - `wren-sheet-closeup-chestFront.webp`: the shoulder straps (`harnessShoulders`) with their buckles at the plate tabs
     (`magBuckle`) and the side straps (`sideStraps`) at the plate sides; not called out.
   - `wren-sheet-closeup-ptt.webp`: the suit chest zip (`suitZip`) runs down the left half of the frame and the rifle
     magazine pouch tops (`magPouches`) are at the bottom left; not called out.
   - `wren-sheet-closeup-beltFront.webp`: the lowest rib segments (`ribSegments`) fill the top of the frame; the holster
     top (`thighHolster` / `holsterHanger`) and the sleeve caps (`throwableSleeves`) are at the bottom edges; not
     called out.
   Done: for these five and every other close-up (audit all 22 by the same rule), each item clearly identifiable in
   the frame has a callout, added through the close-up's `include` list in `src/operators/lab/labData.ts` (lines
   301-325); items cut by the frame edge so far that they cannot be identified may be left out, and the rule used is
   written in DESIGN.md's callout notes in one line. The hipL test asserts the belt and the pistol pouch; add one
   assertion per changed close-up. Re-render only the changed close-ups (`SHEET_CLOSEUPS=...`, `--only closeups`) on
   the GPU and record the verdicts in LOG.md. If the side panel overflows, shorten the callout text, not the list.

Trivial (fix with item 1): LOG.md lines 1590-1591 repeat "Port 4191 free."; drop the second.

## Notes (not fails)
- `lods` / `wireframe`: LOD2 and phone are the same mesh (5,557 triangles) until D29 (11b) - already logged.
- The wire tile at 0.5 m reads sparse (LOD0's chest is large flat triangles); fine for a wire check.
