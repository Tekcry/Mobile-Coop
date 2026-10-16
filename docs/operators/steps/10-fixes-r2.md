# Step 10 - fix list, round 2 (checker: FAIL)

Re-run by the checker: `E2E_GPU=1 npm run operators:check -- wren` exit 0, "9 item(s), all checks pass"; LOD files:
tangents, anchors, gameJoints, backFaces, openEdges, triangles, draws PASS in all five, one FLAG (hero bones 63).
`npm run check` exit 0 (74 files, 772 tests, lint 0 errors / 38 warnings, build OK). Diff scan: no forbidden files, no
loosened threshold, no new external files, GARMENTS unchanged. Renders newer than HEAD; Babylon sheets on the RTX 4090
(ANGLE D3D11). The round-1 shards and boot holes are gone (sheets b / c, LOD1 / LOD2 / phone). Two new bake errors on
named kit, items 1-2, fail the round.

Judged and accepted this round (no fix needed, record only - see "Record" below):
- **A74 closed shells, ribs merged from LOD1 down: accepted.** The step's reason for separate ribs is "they must not gap
  when the torso bends" (also SPEC 8). A shell cannot gap, and the read holds: checker GPU renders (Lab, ANGLE D3D11,
  sneak pose, low front view, shadows off) show LOD0's separate segments overlapping with no gap and LOD1's shell
  keeping three lapped bands with their edges and stitch lines in the maps; Cycles `wren-chest-lod1.png` shows the
  same. The fixer's "striped ribs" trial was not kept as a render; the checker renders stand in for it.
- **A75 (glow = LOD1's "+ glow" draw): accepted;** check output, lodChecks, DESIGN.md agree.
- **backFaces / openEdges: genuine new FAIL checks, nothing loosened** (check.mjs diff is additive; a missing
  `backFacePx` fails as "not measured"; unit test covers both). Limits are exactly round 1's.
- **Blocky lit patches in the Babylon close-ups: explanation verified (shadow map, not maps or tangents).** Checker
  renders of `chestFront` (raking rig): with shadows off, hero and LOD1 shade alike with no patches and the same relief
  (pouches, rib laps); with `normalBias` 0 LOD1 goes dark like the hero (the arm's shadow) and the phone keeps only fine
  acne; with `normalBias` 0.05 the LOD1 leaks grow, the hero stays dark. Cause: the 1 cm normal bias insets the single
  coarse shell enough to open holes in the arm's shadow (the hero's stacked layers keep it closed). Step 18 item.
- **LOD0 boot-toe streaks: OPEN accepted** (step Checks allow OPEN with a reason), but the stated cause is not shown:
  the hero kit set has a similar flattened share (22 %, report `bakeMeans.flattenedTexels`) without streaks.

## Must fix

1. **LOD1, LOD2 and phone: dark diagonal slashes across the pistol holster.** SPEC 1 ("in-game LODs keep the same
   silhouette and read"; the phone LOD is the menu model, D21), step Do 2 ("LOD2 keeps the ... holster ...
   silhouettes"). Where: `build/operators/wren/export/renders/wren-side-lod1.png`, `wren-side-lod2.png`,
   `wren-side-phone.png` (right thigh holster face: black diagonal slashes; the hero `wren-side-hero.png` and LOD0
   show a clean holster with its retention strap); also `docs/operators/mockups/tests/wren-lods-a-silhouettes.webp`
   side row columns 4-6. It is new with the A74 shell and is not back faces (backFaces 0-5 px), so no check sees it.
   Likely cause: the shell's holster surface bakes from the pistol / holster interior (selected-to-active rays,
   `bake_lods.py` ~697, `cage_extrusion` / `max_ray_distance`) after the remesh closed the holster mouth.
   Done: re-rendered side views of LOD1 / LOD2 / phone show the holster face reading as the hero's (flat face, strap,
   no dark slashes); the cause written in LOG.md.

2. **LOD2 and phone: a dark torn wedge in the back plate's radio recess.** Same standard as item 1. Where:
   `wren-back-lod2.png`, `wren-back-phone.png` (upper left of the back plate, where the radio sits; LOD1
   `wren-back-lod1.png` shows the radio and a clean plate), sheet a back row columns 5-6. The radio is dropped at LOD2
   (DROP_SMALL 45 mm or the cull) and the recess bakes a jagged dark triangle. Done: the recess bakes clean, or the
   radio is kept at LOD2 (it is a named kit item, SPEC 5 radio recess "upper left"); re-rendered back views clean.

3. **Catch this class in the pipeline (bake errors inside the outline).** IoU sees the outline, backFaces sees holes;
   neither sees a wrong bake. Done: a measure in report.json and `operators:check` that compares each LOD's clay render
   with the hero's per view in blocks (for example 16 x 16 px blocks whose mean luminance differs from the hero's by
   more than a set amount), FAIL over a limit set from the current LOD0 (which is clean) so items 1-2 would have
   failed; unit test; the limit and why in an A-number. If the implementer finds a better measure, it must be shown to
   fail on the round-2 renders of items 1-2.

4. **LOG.md render-check verdict.** The round-1 record says "no dark slivers over ... back, thighs" at LOD1 / LOD2 /
   phone; items 1-2 contradict it. Done: the round-2 record cites file and view per verdict, including the side and
   back views of every LOD.

## Record (orchestrator / fixer, no new work)

- **A70 contradicts A74:** A70 still says "The rib segments stay separate pieces at every LOD". Done: A70 says
  "separate at the hero and LOD0; part of the shell from LOD1 down (A74)", and A74 notes the step text it departs from
  (step 10 Do 2) and the checker's render evidence above.
- **Babylon patches (LOG.md item 2):** replace "shadow-terminator / bias effect" with the verified cause above; step 18
  follow-up: per-LOD shadow `normalBias` (the shell LODs need a smaller one) checked with the game's shadow generator.
- **The `lods-closeups` sheet's "Torso bent (sneak), ribs" row does not show the ribs** (the arms and the side view
  hide them; `scripts/operator-sheet.mjs` lods(), view `joint chest, radius 1.1, yaw 1.2`). Done: a view that shows
  the front rib laps in the sneak pose (the checker used `joint ['chest', [0, -0.15, 0]], radius 0.9, yaw 0.35,
  pitch -0.35`), re-rendered.
- **LOD0 toe streaks (OPEN):** write the cause as a hypothesis, with the hero kit's 22 % flattened share against it.
- **LOD1 / LOD2 boot laces barely read** (sheet c columns 4-6): note, not a fail at 8 m+; mention in the OPEN list.
- Unchanged from round 1: hero bones 63 (SPEC sum wrong; toe bones 63 -> 55), six unweighted helper joints, KTX2 OPEN
  for Michael (repack with KHR_texture_basisu, local Basis transcoder), the phone never fetches `*-hero*` (step 18).
