# Step 10 - fix list, round 3 (checker: FAIL; last round)

Re-run by the checker: `E2E_GPU=1 npm run operators:check -- wren` exit 1, "1 failed check(s)": `wren lod1 FAIL bakeDiff: front 31 px at
122,525 > 24`; the 9 items PASS, every other LOD check PASS, one FLAG (hero bones 63). `npm run check` exit 0 (75 files,
782 tests, lint 0 errors / 38 warnings, build OK). Diff
scan: no forbidden files, check.mjs and lodChecks additive (bakeDiff is a new FAIL; no limit loosened), no new external
files, GARMENTS unchanged, LOG.md draft present. Cycles renders 09:15 today, newer than HEAD (06:18); the hero renders
are pixel-identical to renders-r2.

**bakeDiff (A76) verdict: a genuine new check, but its limits hide defects - not acceptable as is.** Checker re-ran
`darkPatches` on both render sets. renders-r2: LOD1 front 78 / side 40, LOD2 front 212 / side 32 / back 151, phone
front 208 / side 31 / back 146 - FAIL as claimed; LOD0 passes. But the radio wedge fails back 142 by only 4-9 px. And
all four loose limits come from real LOD0 bake errors (checker overlays of the patches): back 128 = a dark line under
the thigh band (`wren-back-lod0.png` 146,502); chest 157 and head 125 = a dark smear on the suit above the chest-plate
top edge (`wren-chest-lod0.png` 260,18; `wren-head-lod0.png` 255,501); boot 367 = the toe streaks. Those limits now
pass two real shell defects: LOD1 chest 36 px (a black notch where the plate's lower band meets the cummerbund,
`wren-chest-lod1.png` 404,347) and LOD2 / phone chest 47 px (the tall pouch right of the double mag pouch is torn in
two with a dark wedge, `wren-chest-lod2.png` / `-phone.png` 255,273; LOG round 2 calls the chest "under the limits").
The measure also misses the thin holster arcs in the side view (LOD1 11, LOD2 14, phone 9 px; each arc is 1-2 px
wide at 420 x 840, but the arcs are plain to see in `wren-side-lod1/lod2/phone.png`). It reads renders without
checking they are newer than the GLBs.

## Must fix (ranked)

1. **Holster face, LOD1 / LOD2 / phone (round-2 item 1, still OPEN).** A dark groove down the holster in
   `wren-front-lod1.png` (122,525, 31 px, FAIL) and thin dark diagonal arcs on the holster face in
   `wren-side-lod1.png`, `-lod2`, `-phone` (right thigh). The hero and LOD0 holster face is flat and clean. The
   fixer's two routes stand: the holster (and pistol) kept as a separate piece below LOD0 (decimated from LOD0's
   holster, like the lens), or a decimation that keeps that face's triangles fat. Done: item 2's holster view and the
   front and side views pass bakeDiff at 24 px, and by eye the holster face reads like the hero's (flat face, strap,
   no arcs) in front, side and holster views of LOD1, LOD2, phone; the cause in LOG.md (confirmed, not a hypothesis).

2. **bakeDiff limits that cannot hide a defect.** (a) The shells (LOD1, LOD2, phone) get their own limit of 24 px in
   every view; the loose limits apply to LOD0 only, each named in A76 with its defect and file / pixel (the four above).
   (b) A new close-up view `holster` (right thigh, about the `chest` view's scale) in the renders, backFaces and
   bakeDiff, limit 24 px. (c) bakeDiff and backFaces FAIL "stale" when a LOD render is older than that LOD's GLB.
   (d) Unit tests for (a) to (c). Never raise a limit to pass: a shell view over 24 px is a defect to fix (items 1, 3).
   Done: `operators:check` prints per-LOD limits and the holster view; on renders-r2 the shells still fail; on the
   final renders every shell view is at most 24 px; A76 updated.

3. **Chest, shell LODs.** LOD2 / phone: the tall pouch torn in two with a dark wedge (`wren-chest-lod2.png`,
   `-phone.png`, 255,273); LOD1: the black notch at the plate's lower band (`wren-chest-lod1.png`, 404,347). Done:
   chest views of LOD1 / LOD2 / phone pass bakeDiff at 24 px and show the pouch whole and the band edge clean.

## Should fix (logged follow-up if the round runs out)

4. **LOD0 bake errors** (LOD0 is the closest gameplay LOD): the dark line under the thigh bands (back view; also dark
   torn blotches at the thigh-band buckles in `wren-front-lod0.png`, right thigh), the smear above the chest-plate top
   edge (chest and head views), the toe streaks (boot view). Try the A76 sharp-edge split on LOD0 first (same
   mechanism). Done: each fixed with its LOD0 limit lowered to 24 px, or left OPEN in LOG.md and A76 with the file,
   pixel and patch size, the LOD0 limit staying as the only loose one.

## Logged follow-ups (accepted, no work this round)

- Phone / LOD2 head close-up (`wren-head-lod2.png`, `-phone.png`): lumpy face shell and dark smears along the hood edge;
  bakeDiff 2 px. Not a fail (LOD2 is 20 m+); the phone menu framing is a step 18 item - list it there.
- LOD2 / phone back: the radio reads as a lighter blotch (`wren-back-lod2.png`, `-phone.png`); not dark, not a fail.
- LOD1 / LOD2 boot laces faint; LOD2 / phone toe light specks (`wren-boot-lod2.png`). Note only.
- Unchanged: hero bones 63, six unweighted helper joints, Babylon shadow normalBias per LOD (step 18), the phone never
  fetching `*-hero*` (step 18).

## KTX2 (toktx 4.4.2 now installed)

Not in this round: the holster and the measure use the last round, and KTX2 needs its own check. It is the first task
of step 11 (it belongs to step 10 Do 3, so step 11 records it as step 10's carry-over): encode every LOD's maps with
toktx (UASTC + Zstd 18; normal and ORM linear, albedo sRGB; per A73), repack the GLBs with `KHR_texture_basisu`, the
Basis transcoder bundled locally (no CDN; the Babylon KTX2 side-effect import through src/core/babylon.ts only if the
Lab needs it), the Lab loading every LOD's KTX2 GLB on the GPU, texture costs re-measured in report.json and DESIGN.md,
and a check that every LOD GLB carries `KHR_texture_basisu` and no WebP / PNG. A73 closed.
