# ART-S3 build report (briefs/ART-S3.md, A137-A141, A152 shared)

Builder: Sonnet 5.5, 2026-10-23. Branch `feature/sector-redesign-art-s3` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-art-s3`),
cut from the ART-KIT head 26670151. Files: `src/world/maps/campusS3Dress.ts`, `scripts/campus-props/hero_s3.py`,
`src/world/campusArt/assets/hero-s3.glb/.json` (`npm run campus-props:build -- --set hero-s3`), `tests/campusS3Dress.test.ts`.
The kit, `campusDress.ts`, `campusS3.ts` and game code are untouched.

## Placed (section 3 only: 190 placements)
| Source | Count | What |
| --- | --- | --- |
| Skins (H3 hero) | 16 | chamberWall 1, condensingUnit 1, emcPanel 1, hoardingPanel 9 (a row of the 11 m board screen), stockShelf 2 (both runs), logDesk 1, gasBottles 1 |
| Skins (F / K) | 25 | F serverRack 22 (three rows 8 + 8 + 6, fronts to the hall), K labBench 2, F officeDesk 1 (dock desk) |
| Hero placements | 9 | craneGirder 1, cleanBench 1, passBox 1, stickyMat 2, hazardPlate 4 |
| Base pass (`d.base()`) | 140 | ceilingDiffuser 58, smokeDetector 17, fireExtinguisher 15, exitSign 9, signPlate 16, noticeBoard 8, wheelieBin 3, vendingMachine 2, recyclingBins 2, plantPot 2, lockerBank 2, filingCabinet 2, wallClock 2, whiteboard 1, bookcase 1 |

Skins by rule S (all pass `skinFit`; the CR3 west face is 7.5 mm proud at most, tested). Base placements by rule: floor props passed
K1-K13 / C / F / B, wall pieces passed W and K3 / K4 / K7 / K12; the kit's own drop counts are in art-kit-build.md (S3: K1 350,
K2 99, C 94 at the kit trial).

## Numbers
- **Draws 29 of 40** (base alone was 19 at the kit trial); **triangles 16 040** of 150 k; placements 190 of 2500. Headroom for
  later heroes: 11 draws.
- **H3: 12 pieces, 3 304 triangles (budget 5 k), GLB 221 KB (budget 0.4 MB)**, 11 materials, all from `CAMPUS_LOOK` / `PROP_LOOK`
  (no new look, no emissive, no alpha: every H3 mesh is a merged static). Per piece: chamberWall 444, condensingUnit 412,
  emcPanel 456, hoardingPanel 148, stockShelf 204, craneGirder 360, cleanBench 192, passBox 72, stickyMat 12, hazardPlate 48,
  logDesk 96, gasBottles 860.
- Blender 5.2.2, headless `-b`, 6 s build.

## Gates (all green on this head)
- `npx tsc --noEmit` clean; eslint clean on the two TS files.
- `campusArtGameplay -t S3` + `campusArtLight -t S3`: 9 passed (a real bake: the clean bench is the one new solid box; gameplay
  unchanged, rule C and K1-K13 held by `add`, which throws).
- `campusS3.test.ts`, `campusRuntimeNav`, `campusArtKit`, `campusDressRules`, `campusS3Dress` (12): 85 passed.
- No e2e, no full vitest, no `npm run check` (lead / CI).

## Deviations from the brief (the kit report wins) - L-log
- **L1 Chamber and EMC room are whole-box shells, not rows of wall modules.** The kit's `skinFit` needs a skin hull to enclose its
  greybox box within 2 cm (scale 0.8-1.25), so a 1.2 x 4.4 x 0.06 module cannot skin a 6 x 8 box, and rows on all four faces
  would cover each other's faces. `chamberWall` is one 8 x 4.4 x 6 shell (door and viewing port on the east face, cam-lock seams
  on all faces, the west back face flat), `emcPanel` one 6 x 4 x 8 shell (closed RF door with finger-stock and a dark lamp box on
  the north face). Hull = box + 7.5 mm per face, scale 1. West (CR3 lip) face: 7.5 mm proud, seams are 1 mm lines, no handle.
- **L2 Dock desk is F officeDesk, not dispatchDesk** (the greybox box is 0.75 high; dispatchDesk is 1.14 and cannot skin it).
  Found by `boxAt` on the box centre (31.5, 0.375, -1.0), not `boxesIn` (which also returns a stair tread).
- **L3 Bench 3 (2 m, the burn-in log desk) is `H3:logDesk`, not K labBench** (2.0 / 3.0 = 0.67 is under the 0.8 fit floor).
  Benches 1-2 are K labBench (3 m, overhang table covers the shelf).
- **L4 Gas cylinders:** the cage is filled by a 2.4 x 1.6 x 3.1 greybox bottle block, so two kit `gasCylinders` cannot stand
  inside (the free strip is 0.85 m wide and K2 guard 9 leg 1 / K6 hide spot reject every spot). Instead `H3:gasBottles` skins
  the block (4 x 5 bottles in red / yellow / steel, chain rails, plinth, 860 tris).
- **L5 craneGirder:** brief x 26 at (25, 8, -19) runs along x and the hall is 22 m north-south. Built 20.4 m long, a ceiling piece
  (hull y -1..0, placed at the 9.0 underside), yaw PI / 2 so it spans z -29.2..-8.8, at x 28.5: 3.2 m from the nearest high-bay
  lamps (25 and 32), bottom 8.0 (walkway top 6.0 + 1.9 = 7.9, clear). Candidates 35.5 and 43 were not needed.
- **L6 cleanBench:** placed at the brief's x 36.5 against the north wall, centre z -0.55 (back on the wall face at z -0.15; the
  brief's z -0.85 left a 0.3 gap). Candidates 35, 38.5 and the east wall were not needed.
- **L7 passBox:** the brief's (33, 5.6, -3) is the beam pass-through opening (las-gown, z -3.6..-2.4). Placed on the gowning
  side of the solid stretch of the x 33 partition at z -5.0, y 4.5 (hull 0.9-1.5 over the floor), 1.1 m from the beams.
- **L8 stickyMat:** door mat could not stay in front of the gowning door (K3 door zone, K2 reinforce point): placed at (31.2, -3.5),
  1.8 m in. The second at the pass-through (32.3, -3.0), 0.25 m off the beam plane (tube clearance 0.43 in 3D).
- **L9 hazardPlate:** the gas cage has no door box (only a weldmesh fence): the plate is on the blockwork wall facing
  the dock, (35.85, -2.0). las-gown: 0.85 m east of the panel on the same wall (x 32.05, z -0.15). las-store: the panel sits on
  the south shelf run with no wall 0.6 m beside it; the plate is on the north run's west face at z -2.5 (0.2 m outside the K9
  clearance of the beam gap). EMC: east of the door, (46.3, -16.0).
- **L10 hoardingPanel faces:** plywood faces west (the door side, the face players meet), the X braces are on the back (east) face,
  not the other way round. stockShelf is shown on both faces; the module is 1.45 long (the two runs are 1.25 and 1.65 m: fit 0.88
  and 1.15).
- **L11 no lamp on emcPanel:** the lamp box is a dark plastic housing (room off), no emissive material, so no extra draw.

## Skipped / dropped (each logged by `S3_HERO_LOG`, asserted by the test)
- **F holdingBench (gowning bench): dropped.** Nine candidate spots (the brief's (31.5, -5.4) plus the west and east walls, north
  wall) all fail K5 (takedown spots of guards 1 and 3) or K2 (guard 3 leg 0).
- **F kitCaseWall row (gown lockers): dropped, all four modules.** West wall z -0.8 / -2.0: K5 guard 3; z -3.2: K2 reinforce point;
  z -4.4: K5 guard 2; east wall: K2 guard 3 leg 0 / K9 las-gown / K3 door 74. The brief's south wall (x 30.2..32.8) is the gowning
  door's wall (door x 30.6..31.8).
- **K gasCylinders x 2:** replaced by the gas bottle skin (L4).
- Gowning room therefore holds only the base smoke detector, the pass box, the mats and the plate (all of it guard routes).

## Kit gaps (worked around inside my files)
1. No tiling of a box's four faces: `skinRow` modules cover the full cross-section, so only one face direction can carry detail
   and a thin wall-panel piece cannot skin a thick box. A `skinFace` (thin panel over one face, flush) would let the brief's
   module design work; worked around with whole-box shells.
2. `skin` pieces cannot have a different fit scale floor (0.8): a labBench cannot skin a 2 m bench.
3. `d.add` throws with a message only (no structured rule id); the dresser's `place` helper in `campusS3Dress.ts` catches and logs.
4. Hero placement candidates are fixed lists in the dress file; a kit-level `tryAdd(piece, spots)` would remove the helper.

## E2 coordination
No wall piece is mounted on the S3 landing (x 22 line), the viewing corridor glass (z -8 line), the write-up office front or the
clean room glass line (z -6): the test asserts every H3 wall piece is 0.5 m clear of x 22, z -6 and z -8. The pass box is on the
gowning / clean partition (x 33): if E2 glazes that wall the pass box must move (the dress file lists a second spot at z -1.2).

## What Michael should try
`views` s3-a .. s3-g in `scripts/campus-art-shots.mjs` (GPU, batch 3): s3-a (hall from the west door: chamber east face with door
and port, racks, crane girder overhead), s3-c (EMC room with the lamp box, racks), s3-d (crane walkway), s3-f (gowning room and
clean bench).
