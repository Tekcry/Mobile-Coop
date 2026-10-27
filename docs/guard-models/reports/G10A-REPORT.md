# G10a: sheet defects fixed before Michael's look notes (Opus builder, 2026-10-24)

Brief: `C:/NightShift/scratch/ctcore/briefs/gm-g10a.md`. Branch `feature/gm-g10a` off `origin/feature/guard-models`
1569b0f8. Source: the full bake a8ff2d45 and its sheet. No taste changes (G10 waits for Michael).

## Per defect

### D1 Sheet-only bugs - done
- a. Goggle glow on every face. Cause: the sheet built each rig with `defaultLook()` (the operator's tri-lens), so
  `characterRig.ts` added four `addGlow` points per figure. Fix: new `src/operators/lab/guardSheetRig.ts` `sheetRig`
  builds the rig as `enemyRig.ts` `buildEnemyRig` does (factionLook, build, plates, `guardRows`, no merge);
  `guardSheet.ts:200` uses it, the `defaultLook` import is gone.
- b. False "not in the broad file: shield_riot" note. Fix: `guardSheetRig.ts` `missingPieces` skips `SHIELD_ID`;
  `guardSheet.ts:213` uses it.
- c. Bases caption read average / lean / broad, the tile drew broad / lean / average (+x is screen-left with the camera
  at +z). Fix: `guardSheetPlan.mjs:213` (bases) and `:284` (line-ups) place figure i at x = ((n - 1) / 2 - i) * spacing.
- `guardSheetRig.ts` added to `SHEET_FILES` (`guardBakePlan.mjs:396`).
- Tests: new `tests/guardSheetRig.test.ts` (3: every human kind x urban / desert / maritime leaves no `goggleGlow`
  mesh; a control rig with the operator look does make one; `missingPieces` skips the shield, names `plate_heavy`);
  `tests/guardSheetPlan.test.ts` (+1: strictly decreasing x in caption order, bases and both line-ups).

### D2 Skin tone 0 clamps and greys - done
- Cause: tint = target / 0.75 clamped to 1; tone 0 red 0.98 clamped (landed grey-white), tone 1 red 0.76 by 1 %.
- Fix: `guards.json:211-212` tone 0 -> [0.75, 0.444, 0.329], tone 1 -> [0.75, 0.355, 0.197] (hue kept, largest
  channel = neutral). `guardKit.ts:270-275`: a skin-tone channel over `tintNeutral.skin` or a hair-colour channel over
  `tintNeutral.hair` is an error ("would clamp"). SPEC.md:211-212 values, `:215-216` the rule line.
- Tests: `guardKit.test.ts` (+1: bundled kit under the neutrals; tone 0 at 0.98 fails with the exact message; a grey
  hair over 0.6 fails); `guardResolve.test.ts` (+1: every tone's skin bytes decode to target / 0.75 within a byte step,
  none above 1).

### D3 Uniforms near-black - done (code; bake proof is the laptop run)
- Cause: guard garments keep Wren's dark procedural cloth (~0.03 linear) and the bake used it as is, so the SPEC 8 tint
  (target / 0.4) landed ~10x too dark.
- Fix: `bake_guard.py:70-72` constants (`FABRIC_SLOTS`, `LEGS_SHARE = 0.78` with its SPEC 8 reference, `LEG_PARTS`),
  `:416-446` `srgb_to_linear` / `linear_to_srgb` / `albedo_to_neutral` / `albedo_mean` (the baked albedo is a byte sRGB
  image, so the mean is taken and the scale applied in linear; 3 clamp rounds), `:907-915` after `fill_missed`: every
  `garment` region with a fabric slot is scaled per channel to 0.4 (trousers / work_trousers 0.312); `none` parts
  (boots, gloves, work_gloves) untouched. `:1114` `report['albedoMean']` per `lod<n>.<region>` (linear, covered texels,
  every region).
- `guardLodReport.mjs` is not where the report is rebuilt (that is `guard-lods.mjs`, outside this slice's files), so
  `guard-check.mjs` reads `lods/guard-<b>.bake.json` itself (falling back to `report.bake.albedoMean` if a later
  change passes it through). Rule `guard-check.mjs:38` `checkAlbedoMeans`: every fabric garment part at every LOD
  within +-15 % of its neutral per channel; a missing field or region is a problem.
- Tests: `guardLods.test.ts` (+1: pass at neutral, 0.03 fails by region name, legs 0.312 pass and 0.4 fail, a boots
  region ignored, a missing region and a missing field fail, the shield file unchecked). Numeric check of the helpers
  (Blender's Python, ast-extracted): a 0.03 cloth -> 0.400 mean (0.312 legs), still 0.400 after byte quantising,
  correlation with the original texels 0.9994, alpha kept.

### D4 Jagged hair-cap hairline - done (code; the last refinements are smoked offline only, see Smoke)
- Cause (two, the desktop smoke showed the second): `run_haircaps` collapse-decimates the snapped dense cap with no
  boundary protection, so boundary vertices move (up to 52 mm off the contour) and drop; and the dense boundary itself
  is a staircase: `cap_shell` snaps only vertices with an outside neighbour, so ~60 % of the dense boundary (cut-quad
  corners) stays at grid positions (dense contour turns up to 169 deg).
- Fix (`build_head.py`, hair-cap code only, helpers `:1327-1640`):
  - `drop_cap_islands` (stray pieces), `fill_small_holes` (a 4-vertex pinhole at the receding temples) on the dense
    cap (`:1682-1683`); `close_pinholes` again on each decimated cap (the decimator reopens them), with
    `CAP_PINHOLE_RESERVE = 8` tris kept under each budget for it (`:1689`, `:1715`).
  - `hairline_polylines`: the dense boundary loops (walked by boundary half-edges, so a pinch does not split a loop)
    without the unsnapped staircase corners (runs of 1-2 between snapped vertices) and with `despike` (sharpest vertex
    out while any turn is over 60 deg): the contour polyline, EDGE_T off the scalp (the shell's taper).
  - `snap_loops` / `snap_hairline` after each decimate (LOD0, LOD1): every boundary vertex goes onto the polyline; the
    longest run whose nearest points already follow the loop order (`increasing_run`) keeps them, every other vertex is
    spread evenly in order between its placed neighbours; then `SNAP_RELAX = 3` spacing passes along the contour (no
    short edge at a corner). A vertex with no usable arc keeps its position (`keptOwn`).
  - Decimator protection was not added (the dense boundary outnumbers the buzz budget).
- Haircaps JSON: `caps.<id>.hairline = { lod0, lod1: { boundaryVerts, loops, maxDevMm, maxTurnDeg, keptOwn },
  contour: { verts, loops, loopVerts, maxTurnDeg }, islandsDropped, holesClosed }`.
- `guardHeadCheck.mjs:160` `HAIRLINE_LIMITS`: maxDevMm <= 1.5 (LOD0) / 3 (LOD1), maxTurnDeg <= 75, a missing measure
  is a problem.
- Tests: `guardHeadCheck.test.ts` (+1: at the limits passes; a 151 deg tooth, 1.6 / 3.4 mm deviations and missing
  measures fail by name). Synthetic Python self-check of the snap (48-vertex sawtooth with a swapped pair against a
  400-point contour): before maxDevMm 4.0, maxTurnDeg 157.7; after 0.0 mm, 14.3 deg, either winding.

### D5 Runtime-only kit data in every bake hash - done
- Grep of `scripts/operators/**` (py and mjs): `skinTones`, `hairColours`, `tintJitter` are read only by
  `guardSheetPlan.mjs` (and in `src/` by `guardTints.ts`, `guardKit.ts`); no bake or check script reads them (the check
  imports `guardBudget.ts` / `gearMask.ts`, neither reads them).
- Fix: `guardBakePlan.mjs:154` `RUNTIME_ONLY`; `normalizeKit` returns `shared` and `bakeShared` (`:232`); `slice`
  (`:253`) and `g4Slice` (`:408`) use `bakeShared`; the sheet job keeps `shared`. `HASH_VERSION` not bumped.
- Tests: `guardBakePlan.test.ts` (+1, real kit, every job of every stage): a skin tone, a hair colour or `tintJitter`
  change moves only the sheet hash; `tintNeutral.fabric` moves every job except prep (prep's slice is the bases' ids,
  heights and builds only, as before).

### D6 Face through the balaclava - done (diagnosis: head through the membrane; no winding or missing-half fault)
Step 1 (node, read-only, the bundled `guard-broad-lod{0,1,2}.glb`, front = +z from the head's eye triangles, head
centre = broad-1 vertex centroid):

| LOD | balaclava tris (kit) | x < 0 / x > 0 | inverted winding x < 0 / x > 0 | eye slot y | broad-1 front verts below slot x < 0 / x > 0 | of those outside the membrane |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 532 (600) | 266 / 266 | 0 / 0 | 1.677-1.720 | 255 / 295 | 142 / 177 |
| 1 | 198 (200) | 96 / 102 | 0 / 0 | 1.677-1.720 | 70 / 89 | 35 / 51 |
| 2 | 79 (80) | 38 / 41 | 0 / 0 | 1.677-1.720 | 28 / 37 | 17 / 25 |

"Outside" = a ray from the vertex along the front axis meets no balaclava triangle. A front ray map at LOD0 shows the
head hit before the membrane over the whole centre column from brow to chin (nose 3.5 cm wide, lips / chin ~5 cm),
the balaclava everywhere else; every balaclava hit is a front face. So the membrane (a 20-column ring 3 mm off the
fit head) cuts inside the nose, lips and chin; the tiles' slight yaw, the head mesh's own asymmetry (x > 0 has more
vertices outside) and the throat rows riding the neck make it read as one half. Tints (balaclava all slot `none`) and
UVs (inside the balaclava's face tile on both sides) are clean.

Step 2: `bake_guard.py:676-733` (constant `HEAD_COVER_REACH = 1.0`, `:63`): for a head whose kinds all have
`faceCovered: true` (broad-1: heavy, enforcer), a head sample point (face centre and 0.8-inset corners) is hidden when
it pokes out (the segment from it to the head's vertex centroid crosses the balaclava) or its outward ray meets the
balaclava at all (only the eye slot lets a ray out); a face whose points are all hidden is dropped at every LOD; one
ring of margin comes back, never a poking face; eye faces (material 1) and seam-ring faces (the body weld) always stay.
`:1115` `report['coveredHeadTris'] = { 'lod<n>': { <head>: { dropped, kept } } }`. No `headwear.py` change.
The rule was chosen by simulating it in node on the bundled broad GLBs (bind pose; the first version, the body test's
reach-limited rays, still left the lips and chin ringed with skin). Simulated result, head front-ray cells seen in
front of the balaclava below the eye slot (of ~400 face cells): LOD0 2,485 of 4,448 head tris dropped, the whole centre column -> 33 cells
(a few at the jaw line); LOD1 785 of 1,200 dropped, -> 28; LOD2 271 of 398 dropped, -> 53.
`guard-check.mjs:59-84` `faceCoveredHeads` / `checkCoveredHeads`: every face-covered head at every LOD must have a
`coveredHeadTris` entry with `dropped > 0`; missing is a problem. Test: `guardLods.test.ts` (+1). No assertion on the
bundled GLBs (the lead adds it with the asset copy).

## Checks
- `npx vitest run` one file at a time: guardSheetRig 3, guardSheetPlan 22, guardKit 15, guardResolve 10, guardLods 22,
  guardHeadCheck 18, guardBakePlan 39, guardAssets 34, guardAssetsReport 13: all pass.
- `npm run typecheck:fast` clean; eslint clean on the changed TS files (the `.mjs` scripts are eslint-ignored).
- `guard-bake.mjs --stage sheet --dry-run` and `--stage lods --dry-run` print the plan; `guard-sheet.mjs --in
  C:/NightShift/scratch/guard-bake-g4smoke --out <scratchpad>/x.png --dry-run` parses (lists the missing inputs).

## Desktop smoke (Blender -b, one job at a time under heavy.lock; stopped at 19:25 by the orchestrator's rule)
Out dir `C:/NightShift/scratch/guard-bake-g10a` (upstream copied from the G4 smoke: prep, average body, average-1 head,
trousers and gloves garments, no gear).
- D3, `lods-average` (723 s, OPTIX GTX 1080 Ti) at 49e6d2d9: `albedoMean` trousers LOD0 / 1 / 2
  0.0276 -> 0.312 (all three channels 0.311-0.312), gloves untouched 0.025-0.030, body 0.74 / 0.74 / 0.71;
  `coveredHeadTris` {} (average has no face-covered head). `guard-check` on it names only the garments missing from the
  smoke dir (shirt, jacket: "no albedo mean").
- D4, `haircaps-average` (34-58 s) run four times while fixing the second cause; the last desktop run (pinholes closed,
  before the spacing passes and the budget reserve) gave, LOD0 / LOD1 maxDevMm 0 everywhere, maxTurnDeg:
  buzz 54.8 / 53.8, crop 55.8 / 56.8, sidepart 54.1 / 53.9, fade 61.1 / 61.1, receding 71.9 / 90.5 (and receding LOD0
  804 tris > 800 from the closed pinholes); the first run (plain snap) had 155-176 deg everywhere. The final version
  (spacing passes, 8-tri reserve) is checked offline on the dumped LOD0 caps (Blender's Python, the same functions):
  buzz 56.7, crop 53.4, sidepart 53.3, fade 49.6 deg, 0 mm; receding and all LOD1 caps are not re-smoked.
- D6: no broad upstream on the desktop: the node simulation above is its evidence.

## Laptop rebake request (word for word)
ONE laptop alone request on the merge of feature/gm-g10a into feature/guard-models: set `guard-bake-all`, stages in
order: probe; prep + bodies + guardBodyCheck; heads + guardHeadCheck; garments + guardGarmentCheck; gear; lods; check;
sheet. `E2E_GPU=1`, `--push`. Expect every job to run once (D5 changes every kit slice), ~55 min (last full: 3294 s).
Smoke checks in that run (they replace the desktop smokes the 19:25 rule stopped): guardHeadCheck passes the hair-cap
`hairline` limits for every cap of average and lean (watch `receding` LOD1 maxTurnDeg <= 75 and its LOD0 tris <= 800);
`check-average`, `check-lean`, `check-broad` pass (fabric `albedoMean` within 15 % of 0.40 / 0.312, `coveredHeadTris`
for broad-1 with dropped > 0 at LOD0-2); on the sheet the uniforms read as the faction colour, the heavy / enforcer
faces show only the eye slot, no goggle dots, the bases left to right average / lean / broad.
Then copy the 12 GLBs + 3 JSON from `bake/guard-models` into `src/operators/assets/guards/`, add the D6 bundled-GLB
assertion to `tests/guardAssets.test.ts`, run the asset tests, send the new sheet to Michael.

## Open items
- D4's final version and D6 are proven only offline (dumped caps, node simulation on the bundled GLBs); the laptop bake
  is their real smoke. If receding LOD1 still turns over 75 deg, the next step is a lower `despike` angle for it (a
  real temple notch, not a tooth), or Michael's call on the limit.
- D6 leaves a few head cells at the jaw line in front of the balaclava (simulated); the throat rows riding the neck
  can still part from the jaw in a turned pose (polish, or a balaclava weight change in `headwear.py` in G10).
- Whether the uniform colour is then still too dark, and tone lightness, are G10 (Michael).
- `guard-lods.mjs` does not copy `albedoMean` / `coveredHeadTris` into `report.bake` (outside this slice's files);
  the check reads the bake JSON directly. A one-line pass-through there is optional polish.

## D4b Receding corner (follow-up, brief `scratch/ctcore/briefs/gm-g10a-hairline-fix.md`)
- Cause: a real contour corner, not a snap fault. The receding temple "M" (`hairline()` recede term) turns ~100 deg
  within 1-2 cm. The despiked contour spreads it over several ~3 mm segments (each <= 59 deg), but at LOD1 (~80
  boundary verts) one edge spans the corner, so one vertex took the whole turn. maxDevMm 0, keptOwn 0, pinchVerts 0:
  no off-contour vertex and no pinch-merged pinhole.
- Fix (`build_head.py` only; despike, spike_deg, budgets, reserve and `guardHeadCheck.mjs` limits unchanged, 75 deg
  kept): `CORNER_DEG = 65.0`; `corner_slide(line, s0, par, own)` runs in `snap_loops` after the relax. While the
  sharpest boundary vertex turns over 65 deg, its two neighbours slide halfway toward it along the contour (unwrapped
  across the seam); a slide is kept only if the max turn over i-2..i+2 drops, else undone and the loop stops. Vertices
  stay on the line (dev 0), order holds. `snap_loops` / `snap_hairline` return the slide count; each LOD's hairline JSON
  gains `pinchVerts` and `cornerSlides` (diagnostics, the check ignores them).
- Self-check `scripts/operators/py/trials/hairline_selfcheck.py` (Blender Python, exit 1 on a fail; 32 pass):
  (a) 48-vertex sawtooth with a swapped pair vs a 400-point circle: 4.0 mm / 146.4 deg -> 0.0 mm / 8.7 deg, no slide,
  both windings; (b) 400-point contour with a 110 deg corner filleted at 3 mm, 24-vertex loop with one vertex on the
  corner: 99.9 -> 37.4 deg in 3 slides, 0.0 mm, par strictly increasing, both windings, corner mid-loop and on the seam,
  directly and through `snap_loops` / `loops_measure`.
- Desktop smoke (21:58 local, `--only haircaps-average,haircaps-lean`, 53 / 49 s, BelowNormal, under heavy.lock):
  guardHeadCheck `--partial` all pass. maxTurnDeg LOD0 / LOD1 before (81a1f3b8) -> after, slides in brackets;
  maxDevMm 0, keptOwn 0, pinchVerts 0 everywhere:

| Cap | average before | average after | lean before | lean after |
| --- | --- | --- | --- | --- |
| buzz | 56.7 / 51.5 | 56.7 / 51.5 | 54.7 / 52.8 | 54.7 / 52.8 |
| crop | 53.4 / 56.9 | 53.4 / 56.9 | 55.1 / 50.1 | 55.1 / 50.1 |
| sidepart | 53.3 / 56.6 | 53.3 / 56.6 | 52.4 / 49.0 | 52.4 / 49.0 |
| receding | 65.7 / 102.6 | 64.1 / 64.1 (1 / 5) | 65.5 / 100.8 | 61.2 / 64.0 (1 / 4) |
| fade | 49.6 / 66.1 | 49.6 / 62.0 (0 / 1) | 49.7 / 59.8 | 49.7 / 59.8 |

  Receding LOD0 tris 794 / 796 (<= 800); average receding LOD1 79 boundary verts, 239 tris (was 80 / 242: LOD1 is
  decimated from the slid LOD0). Not checked: how the slid LOD1 triangles look on the sheet (a slide moves a boundary
  vertex up to ~7/8 of an edge along the hairline; the faces behind it stretch). The laptop rebake is the real proof.
