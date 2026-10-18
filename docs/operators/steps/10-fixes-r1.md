# Step 10 - fix list, round 1 (checker: FAIL)

Re-run by the checker: `E2E_GPU=1 npm run operators:check -- wren` exit 0, "9 item(s), all checks pass", LOD files:
anchors and game joints PASS in all five, one FLAG (hero bones 63); `npm run check` exit 0 (74 files, 769 tests, lint 0
errors, build OK, no glb in `dist/`). Diff scan: no forbidden files, no loosened item threshold in check.mjs or tests,
no new external files, GARMENTS unchanged. The failures are in the renders and the shipped geometry, not the checks.

Ranked by impact. Items 1-4 must be done for a PASS; 5-6 are small; "Logged follow-ups" need no fix this round, only
the record named.

## Must fix

1. **LOD2 / phone (and LOD1) geometry is shredded: shards poke through and holes open.** SPEC 1 ("the in-game LODs
   keep the same silhouette and read"; "the phone gets the lowest LOD of the same design"), SPEC 6.4 / 8 (the phone
   shows LOD2 in game AND in the menu, D9 / D21, so these are seen at menu distance on the phone), ART-DIRECTION render
   check 6 ("nothing lumpy").
   - Where: `docs/operators/mockups/tests/wren-lods-b-closeups-chest-head.webp` columns LOD2 and phone: jagged shards
     all over the hood / helmet harness and the shoulders, torn pouch flaps and strap edges on the chest (LOD1 shows the
     same on the head, less). `wren-lods-c-closeup-boot.webp` LOD1, LOD2, phone: black holes through the boot upper and
     rand. `wren-lods-a-silhouettes.webp` and `build/operators/wren/export/renders/wren-back-phone.png`,
     `wren-front-lod2.png`: dark slivers over shoulders, arms, back, thighs and calves (the same shards / holes seen at
     full figure). The baked textures are not the cause (measured: albedo 0.022-0.037 linear, roughness P1-P99
     0.64-0.92, metal under 0.4 % of texels in every set).
   - Measured with the glb files: open (boundary) edge length hero 35 m, LOD0 36 m, LOD1 131 m, LOD2 / phone 91 m. The
     covered-face cull (`drop_faces`, `CULL_COVERED`, `scripts/operators/py/bake_lods.py` lines 221-240, the test at 236) decides a
     whole face from one ray at its centre, and any back-facing hit within 3-4 cm culls it, so partly covered faces of
     the outer layer go and the collapse then pulls the inner layers (hood vs balaclava vs harness, boot upper vs
     lining) through each other. The alpha-mask IoU (0.967-0.979) cannot see this: holes inside the outline do not
     change the mask.
   - Fix direction (implementer's choice): cull only faces fully covered (several rays per face, all hit), and/or push
     inner layers inward after the collapse; for LOD2 / phone a single closed shell (voxel remesh of the joined figure,
     then decimate to 5-6 k, everything else in the bake) is the usual answer and is allowed (rib segments need to be
     separate only down to LOD1).
   - Done: (a) a new measure in the export report and `operators:check` (FAIL, not FLAG) - visible back-facing /
     interior pixels per view (front, side, back, chest, head, boot) rendered with back faces in a flag colour - for
     every LOD no more than the hero's count + 0.2 % of the figure's pixels; (b) open edge length of LOD1 / LOD2 / phone
     no more than 1.5x the hero's, or explained per piece in the report; (c) re-rendered sheets a / b / c where the LOD1,
     LOD2 and phone close-ups show no shards on the head and shoulders and no holes in the boot; (d) silhouette IoU not
     worse than now.

2. **The baked LODs were never seen in Babylon (the engine that will draw them).** The Lab binds the new textures
   (`src/operators/lab/lab.ts` 255-285: ORM channels, `invertNormalMapX/Y` "for the reader's mirror") and that was
   checked only by typecheck and unit tests; the step's Checks want GPU renders of what ships, and a wrong normal-map
   axis or ORM channel would ship into step 18 unnoticed.
   - Done: `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- wren --only lods,closeups` run on the hardware GPU with
     the baked LODs; the lods sheet (hero, LOD0, LOD1, LOD2, phone in the sneak pose) and a hero + LOD0 close-up of
     chest and boot under a raking light read the same relief as the Cycles renders (a dent reads as a dent, not a
     bump; no lit-from-below seams). Also covers the step text "rib segments must not gap when the torso bends": the
     sneak-pose columns show no gap between the rib segments at LOD0 and LOD1. PNG paths in the LOG.md draft.

3. **No tangents in the glTF files, but every map is a MikkTSpace tangent-space normal map.** `bpy.ops.export_scene.gltf`
   in `bake_lods.py` (line 824) leaves `export_tangents` off, so the files carry POSITION, NORMAL, TEXCOORD_0,
   JOINTS_0, WEIGHTS_0 only; Babylon then builds a derivative tangent frame that does not match the bake, which shows
   as shading seams at UV island borders, worst on the 5 k phone mesh where the normal map carries most of the shape.
   - Done: `export_tangents=True`; every LOD glb has a TANGENT attribute (add it to `lodChecks`: FAIL when a mesh
     primitive with a normal texture lacks TANGENT, with a unit test); the item 2 Lab sheet shows no seam lines along
     island borders on LOD2 / phone.

4. **LOG.md "Step 10" render-check verdict contradicts the renders.** It says "1 silhouette holds at every level ...
   5-7 nothing added" and files the shards / holes as "OPEN (taste) ... a few pixels". On the phone (menu) they are not
   a few pixels. Done: after items 1-3, the LOG.md draft's render check cites file and view per verdict, and anything
   left is OPEN with its cause, not "taste".

## Small

5. **LOD1 draw budget in `src/operators/lodChecks.ts` line 18 is 3; SPEC 6.4 says 2.** Only LOD2 carries "(+ glow)" in
   SPEC; reading LOD1 the same way is a reasonable assumption, but it is in code with no A-number and turns a SPEC
   overrun into a PASS line while DESIGN.md and LOG.md call it a FLAG. It hides no failure (draws are flag-only), but the
   check output and the docs must agree. Done: either `lod1.draws = 2` (the check prints FLAG, as DESIGN.md says), or an
   A-number "the goggle glow is one extra draw at every LOD below the hero (LOD2's '+ glow' read for LOD1 too)" with
   the budget written `draws: 2, glow: 1` and the limit text "SPEC 6.4 2 + glow". (Option worth a look: put the lens
   into the kit / atlas material with an emissive map; LOD1 2 draws, LOD2 / phone 1, SPEC met literally.)

6. **Numbers and small inconsistencies.**
   - A71 says LOD1's own set costs "about 2.7 MB of BC7 VRAM more"; report.json gives 8 MB for LOD1's six 1K maps
     (6 x 1.33 MB). Done: A71 states 8 MB.
   - LOD0 boot toe: light blotches from the bake (`wren-lods-c-closeup-boot.webp`, LOD0 column, toe and heel) on the
     gameplay LOD under 8 m. Done: gone in the re-render, or OPEN in LOG.md with the cause.
   - The phone glb's glow material is named `wren-lod2-glow`. Done: `wren-phone-glow` (the Lab matches `-glow`).

## Logged follow-ups (acceptable; record only)

- **Hero bones 63 vs SPEC ~30 (FLAG): legitimate.** SPEC's own sum is wrong: 17 game joints + 30 finger segments is
  already 47. Record for Michael with the next SPEC update. One real saving to log for step 18: Wren's ten toe bones sit
  inside a rigid boot and are weighted to it (if ever posed they would crease the boot per toe); one toe (ball) bone per
  foot is right for booted operators (63 -> 55).
- **Game LODs carry 23 skin joints (17 weighted + root, body, handL/R, toeL/R unweighted); the bones check allows
  +6.** Harmless (six more matrices per character) and flag-only; log it so step 18 can strip unweighted joints.
- **A72 (3 cm edge rule for built items, not LODs): legitimate** for LOD0-2 / phone (a 5-40 k figure cannot meet it,
  and the rule exists to stop faceted sim meshes). The hero (max edge 15.7 cm) is a decimation too; its close-ups match
  the source (hero vs source IoU 0.999, sheets b / c column 2), so no hero edge rule is needed, but A72 should say the
  hero is held by the silhouette / close-up comparison instead.
- **KTX2: OPEN, not a fail of this step** (WebP inside the GLBs, the encode command written). Note for that step: the
  command makes .ktx2 files only; the GLBs then need repacking with KHR_texture_basisu (for example glTF-Transform)
  and the loader needs the Basis transcoder bundled locally (no CDN, CLAUDE.md hard rule).
- **Phones load only the phone LOD:** the asset side holds (the phone glb is self-contained, 0.5 MB, textures embedded,
  no external URIs, nothing refers to hero files); the loader itself is step 18's, which must test that the phone
  build never fetches `*-hero*` files.
- The LOD check in `scripts/operators/check.mjs` skips silently when `export/report.json` is missing; after step 10 it
  should print a FLAG ("LODs not built") so a stale or missing export is visible.
