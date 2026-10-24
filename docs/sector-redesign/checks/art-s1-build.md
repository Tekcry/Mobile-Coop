# ART-S1 build report (briefs/ART-S1.md, A127-A131 + A152)

Builder: Sonnet 5.5, 2026-10-23. Branch `feature/sector-redesign-art-s1` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-art-s1`),
cut from the ART-KIT head 26670151. Owned files only: `src/world/maps/campusS1Dress.ts`, `scripts/campus-props/hero_s1.py`,
`src/world/campusArt/assets/hero-s1.glb/.json`, `tests/campusS1Dress.test.ts`, this report.

## Placed (section 1: 74 placements)
| Source | Count |
| --- | --- |
| Skins `skin-hide` (cars, kit `carSilver` x7, `carBlack` x7) | 14 |
| Skins `skin` (3 binLarge, feederPillar, 3 planterTrough, 2 treeSkin, cageTrolley, gateDesk, pcDesk, teaPoint, trafficIsland, barrierArm, 8 lightBollard) | 23 (10 on cylinders: 2 trees, 8 bollards) |
| Hero `add`: barrierHousing, intercomPost (H1), siteSign, 2 bikeRack (K) | 5 |
| Base pass (`d.base()`) | 32: reeds 5, fireExtinguisher 5, litterBin 5, signPlate 4, exitSign 3, wheelieBin 3, ceilingDiffuser 2, acCondenser, noticeBoard, smokeDetector, recyclingBins, plantPot 1 each |

Base drops (rule: count): reeds K1 284, K6 37, B 34, K4 4, K5 3; acCondenser K1 192, C 45, K6 4, K2 2, B 1; wheelieBin K1 20, C 16, K6 5;
plantPot K1 34, K4 13, K7 9; vendingMachine K4 7, K1 6, C 4, K7 2, K3 1; recyclingBins K4 4, C 2; litterBin K1 4, B 1; parkBench K5 2, K2 1, K1 1;
one each: smokeDetector K10, signPlate K10, exitSign K10, noticeBoard B, fireExtinguisher B.

## Numbers
- Draws 37 of 40 (`artCounts`: 14 merged materials, 14 car, 9 instanced emissive / alpha). Triangles 12,964 of 150 k. Placements 74.
- H1: 12 pieces, 1,712 tris (budget 3 k), GLB 134.6 KB (budget 0.3 MB), 3-5 s build, every piece within its brief budget
  (gateDesk 268/450, pcDesk 176/250, teaPoint 240/300, monitorBank 120/120, keyCabinet 36/40, visitorBoard 36/40, trafficIsland 180/200,
  barrierArm 116/120, barrierHousing 112/120, cageTrolley 288/400, lightBollard 80/80, intercomPost 60/80).
- Emissive circuits: gateDesk screens on `S1_GROUPS.gate` (43), barrierArm lamp on lane (49), 8 lightBollard lenses on fore (42); skin placements get their `group`
  set after the call (the kit's `skin` / `skinCyl` take no group option, L5).

## Gates (this worktree, one slot at a time)
- `npx tsc --noEmit`: clean.
- `vitest run tests/campusArtGameplay.test.ts tests/campusArtLight.test.ts tests/campusS1.test.ts tests/campusS1Dress.test.ts`: 4 files, 111 tests, all pass
  (gameplay: all five sections' legs, nav cells, patrols, cover, lips, rays, reach, `checkDressing`, budgets; light: bake unchanged; S1 greybox 51; own test 13).
- Not run (per the job's list): `campusRuntimeNav`, `campusArtKit`, full vitest, `npm run check`, e2e, GPU shots.

## Brief errors and deviations (L-log)
- **L1 three wall pieces refused (rule V), omitted, not moved.** The brief's z / x put them 0.15 m off the wall face (the gatehouse walls are 0.3 thick centred on -73 and 14:
  inner faces at z -73.15 and x 14.15). Rule V needs wallDist + depth <= 0.15, so `monitorBank` (18.8, -73.3), `keyCabinet` (15.2, -73.3) and `visitorBoard` (14.3, -78.0) throw.
  Verified by probe: at the faces (z -73.15, -73.15, x 14.15) all three pass every keepout. One-line fix for the lead: move them to the faces (this adds a `screen`
  draw and a `brass` material, ~2 draws, 39 total). Left out so far, listed in `S1_OMITTED` (the test pins the list).
- **L2** `bikeRack` at x -5 refused K6 (the hide spot at (-5, -47.2)): omitted per the brief. 2 stands placed (-8, -2).
- **L3** `parkBench` (8, -47.6) refused K1 (route leg 4): omitted per the brief.
- `intercomPost` at x 12.6 and `siteSign` placed as briefed (no omission).
- **L4 cars use 2 of the 4 colours** (silver, black; `k % 2`). A `skin-hide` car costs one draw per mesh material per colour (7 each); four colours alone were 28 draws,
  the section 53 of 40. Two colours: 37. Restoring four colours needs a kit change (merge the car meshes, or cut a car's materials).
- **L5** Kit gap: `skin` / `skinCyl` take no `group`; the dress file sets `d.placements[i].group` after the call.
- **L6** Brief miscount: section 2 lists 37 skins (14 + 3 + 1 + 3 + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 8), not 32; all 37 are skinned.
- **L7** Hero materials trimmed to merged ones the section already pays for (no `paper`, `fabric`, `chrome`): sacks use `laminate` / `plastic` / `white`, the paper pad is `white`.
- **L8** Wall pieces are modelled at their mount height (monitorBank 0.85-1.65, keyCabinet 1.1-1.7, visitorBoard 0.9-1.5) and placed with y = the floor (the kit report wins over the brief's centre heights).
- **L9** `overhang` entries: gateDesk 0.4 (monitors), pcDesk 0.3 (far-end monitor, 0.7 m from the objective), teaPoint 0.3 (kettle). The pcDesk monitor face is `plastic` (not lit).
  `lightBollard` is modelled 0.2 square x 0.95 with `cylFit` r 0.1 / h 0.95, scaled 0.8 / 0.947 onto the r 0.08, h 0.9 post.
- No debug overlay, lamps, windows, door or fence panel touched.

## Views (brief section 5)
Not rendered here (GPU shots are batch 3); the seven views s1-a .. s1-g are `scripts/campus-art-shots.mjs`'s.

## A152
Changed files: the owned list above only (a stale tracked `scripts/operators/py/__pycache__/common.cpython-313.pyc` is modified by Blender runs, not staged).
