# G1h report: heads, faces, eyes, hair caps

Branch `feature/gm-g1h` (off feature/gm-gb 5da3600c). Kit truth: `guards.json` of the P1 fix round (origin/feature/guard-models
7488d74d), used only as an uncommitted fixture under `scratch/`.

## What
- `scripts/operators/py/build_head.py` (new): the two heads-stage job modes of the GB contract.
  - `--base <b> --head <v>`: one head variant. hm08 head region (cut on the SPEC 7 neck loop: 42 verts, nearest 45% of the way from the
    neck joint to the head joint), the base's macro sliders + the variant's CC0 face targets, uniform scale to `refHeight`, ears kept,
    mouth closed (hm08 neutral). LOD0 4,000 / LOD1 1,200 / LOD2 400 triangles; the seam loop is protected in the decimation and kept
    at every LOD (weld by position or `mh_index`). Skin weights `neck` -> `head` over 2 loops. Eyes generated (UV sphere, cornea bulge,
    224 tris each at LOD0, separate objects; merged into the head on material slot 1 at LOD1 / LOD2). 1024 face tile baked on the GPU
    (Cycles, selected-to-active from the head subdivided twice): albedo (neutral), tangent normal, ORM.
  - `--haircaps --base <b>`: the base's cap set (buzz, crop, sidepart, receding, fade; bald = no mesh) over the base's one shared
    cranium (the union of its heads), the head envelope, the eye block.
- `scripts/operators/py/guard_skin.py` (new): procedural skin (mottling, redness at nose / cheeks / ears, lips, shave shadow, stubble,
  short beard, brows, lashes, pores, creases; roughness lower on lips and the eye's wet line), hair (strands from the crown, side part
  groove) and the numpy eye block (4 iris cells: brown, darkbrown, hazel, bluegrey).
- `scripts/operators/guardHeadCheck.mjs` (new, pure + CLI): budgets, job outputs, report and envelope checks.
  `node scripts/operators/guardHeadCheck.mjs --out <bake dir> --kit <guards.json>` checks every report under `<out>/heads/`.
- `tests/guardHeadCheck.test.ts` (new).
- Wren: untouched. `git diff --stat 5da3600c HEAD` lists only the four new files above (plus this report).

## Outputs (GB "Job contract" style; relative to `--out`)
| job | writes | notes |
| --- | --- | --- |
| `heads-<v>` | `heads/guard-<v>-head.{blend,json}`, `heads/guard-<v>-face-{albedo,normal,orm}.png` | blend objects `guard-<v>-head-lod{0,1,2}`, `guard-<v>-eye{L,R}-lod0`; custom props `piece` = `head:<v>`, `tint` = `skin` (eyes `none`) |
| `haircaps-<b>` | `heads/guard-<b>-haircaps.{blend,json}`, `heads/guard-<b>-cap-<style>-{albedo,normal,orm}.png`, `heads/<b>/envelope.json`, `heads/guard-<b>-eyes-{albedo,normal,orm}.png` | blend objects `guard-<b>-cap-<style>-lod{0,1}` (`piece` = `hair:<style>`, `tint` = `hair`), `guard-<b>-envelope` |
| `heads-broad-1` (a base with no cap job and one head) | the head outputs + `heads/broad/envelope.json` + `heads/guard-broad-eyes-*.png` | broad's kinds wear no cap (all balaclava), so the P1 plan has no `haircaps-broad` |
`headJobOutputs(kit, jobId)` in guardHeadCheck.mjs lists them; the driver declares only the blend + json.

### Head envelope for G3 (lead request): `heads/<base>/envelope.json`
Blender metres (Z up, face toward -Y, head's left on +X), feet at z = 0, the base at its `refHeight`:
`offset` (0.015 = SPEC 7 `face.envelopeOffset`), `thickestCap` (0.012, sidepart), `clearance` (0.003), `crownZ`, `centreY` (the hm08
head joint), `maxRadii` {`x`, `yFront`, `yBack` about x = 0 / y = centreY, `zAboveEyes`}, `bounds`, `landmarks` {`neckJoint`,
`headJoint`, `eyeMid`, `browZ` (the brow line: helmets stop there), `scalpCrownZ`, `ears` {`zRange`, `yRange`, `halfWidth`}}, and
`mesh` {`tris`, `verts`, `faces`}: the union head (ears included) offset outward by 15 mm, ~2,000 triangles. The same mesh is the
`guard-<b>-envelope` object in the blend. Smoke values:
| base | crownZ | maxRadii x / yFront / yBack / zAboveEyes | browZ | ears z | tris |
| --- | --- | --- | --- | --- | --- |
| average | 1.785 | 0.103 / 0.140 / 0.116 / 0.126 | 1.682 | 1.565-1.698 | 2000 |
| broad | 1.840 | 0.104 / 0.142 / 0.119 / 0.129 | 1.734 | 1.623-1.748 | 2000 |
(lean: written by `haircaps-lean`, not smoked.)

## Decisions I assumed
- Cranium lock: some face targets move the cranium (average-4's `forehead-nubian-incr` / `eyebrows-trans-forward` push the back of
  the crown up to 13.5 mm), which breaks SPEC 7's "every head of a base keeps the base's cranium". Each recipe's offsets now fade
  out from 0.15 to 0.05 head units below the lowest hairline of any style (ears excepted). Result: under the caps every head is within
  0.32 mm of the base (average-4 worst); face reads unchanged (the lock starts above the brows). Undo: `lock=None` in `shaped`.
- Eyes sized from the hm08 eye helper's box (radius 14.7 mm average, 15.1 mm broad, so they fill the hm08 socket; MakeHuman's eyes
  are a little large). 224 tris each (2 x 224 = 448 <= kit 500; PLAN said ~250).
- PLAN 5 "LOD1 / LOD2 eyes in head": the head is decimated to budget less the merged eyes (1,104 + 96 = 1,200; 352 + 48 = 400).
- Masks (brows, lashes, lid line, lips, beard, scalp, redness) are evaluated at the vertices of the 2x subdivided bake source
  (65,504 quads), not interpolated from hm08's ~5 mm face verts.
- Face UV: the face (front of 72 deg azimuth, below the hairline) is its own island at 1.9x the density of the rest; ears own islands;
  the rest cut up the back midline. Coverage 0.55 of the tile, 2 of 4,000 UV triangles flipped.
- Caps are cut from the union head subdivided twice, the edge snapped onto the hairline contour (no hm08 staircase), thickness tapering
  to 0.4 mm at the hairline, then decimated to the kit budget. One cap set per base fits every head of the base (lock above).
- The eye block is written per base (by the cap job, or the capless base's head job), so parallel jobs never write one file.
- `GUARD_HEAD_ALSO_CAPS=1`: a head job also bakes its base's caps. Smoke-only hook, because this branch's driver predates the
  `haircaps-<b>` job (the plan on feature/guard-models has it).
- Kind strings: not checked here; G0's SPEC 1 says they match `enemies.json`.

## Smoke (desktop, GTX 1080 Ti OPTIX, heavy.lock taken each time on try 1, released after)
All through `guard-bake.mjs --stage heads --only <one> --par 1`, out `C:/NightShift/scratch/guard-bake-g1h`. I ran more than the one
job the brief names: single jobs only, ~4.5 min of Blender in all. Two runs failed on bugs that are now fixed (a shadowed name;
stale view-layer entries), one rerun added the face UV gain, one refreshed the envelope radii, and one ran the cap path.
| job | result | head tris L0 / L1 / L2 (budget 4,000 / 1,200 / 400) | eyes L0 (<= 500) | seam kept | crown z vs refHeight | albedo mean (linear) | rough / AO | time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heads-average-1 | pass | 4,000 / 1,200 / 398 | 448 | 42 / 42 / 42 | 1.770 / 1.77 | 0.712, 0.684, 0.679 | 0.511 / 0.971 | 31 s |
| heads-broad-1 | pass (+ envelope, eye block) | 4,000 / 1,200 / 400 | 448 | 42 / 42 / 42 | 1.825 / 1.825 | 0.714, 0.686, 0.679 | 0.511 / 0.971 | 21 s |
| average caps (hook) | pass | buzz 500 / 200, crop 798 / 250, sidepart 1,000 / 300, receding 798 / 250, fade 700 / 250 (all = budget) | - | - | - | hair 0.599 (neutral 0.6) | 0.48 / ~1.0 | 48 s |
Cap thickness max = each style's `offset`. `guardHeadCheck.mjs` on the bake dir: 5 reports checked, all pass. Bones: the head carries
`head` / `neck` vertex groups only. The rig is G1's; there are no face bones (A15).

## Tests
- `npx vitest run tests/guardHeadCheck.test.ts tests/guardBakePlan.test.ts`: 2 files, 38 passed (guardHeadCheck 11).
- `npx tsc --noEmit -p .`: clean. `npx eslint tests/guardHeadCheck.test.ts`: clean (`scripts/**/*.mjs` is outside the lint set).
- Blender's bundled `python.exe` (no Blender) ran numpy-only checks of the topology, lock and cap-shell code with `bpy` stubbed (seconds).

## Open items
- For G3: refit headwear and helmets on `heads/<base>/envelope.json` (above). The landmarks' joints are hm08's, scaled to the base.
  If G1's retarget moves the head joint, take the head bone from G1's body and the shape from the envelope.
- GB / plan (not my files):
  - Add `guard_skin.py` to `LIBS.heads` in guardBakePlan.mjs, or a skin change will not rebake.
  - Declare the extra outputs (pngs, `heads/<b>/envelope.json`) if hash skips should check them.
  - The broad envelope comes from `heads-broad-1`; G3 / lods should depend on that job.
- G4: the neutral skin albedo measures 0.69 linear over the tile, not 0.75 (shave shadow and redness pull it down), so the SPEC 8 tint
  (colour / 0.75) lands ~8% dark. G4 can divide by the measured mean in the face report, or the skin neutral can be raised 8%.
- G4: the seam weld to G1's body (the head is in hm08 proportions scaled uniformly; the report's `seam.centre` and `mhIndex` give
  the loop). The LOD0 eye objects are separate pieces of `head:<v>`.
- Cap strand normals are faint at 256 px (bump at 0.4 mm). Goes on the G10 polish list if the 1.5 m crops read flat.
- Not smoked: the lean caps, the other 7 heads. The laptop bake runs all 11 heads-stage jobs.
