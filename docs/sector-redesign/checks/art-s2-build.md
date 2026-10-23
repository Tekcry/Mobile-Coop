# ART-S2 build report (briefs/ART-S2.md, A132-A136 + A152)

Builder: Sonnet 5.5, 2026-10-23 (died at an account swap after 7ac5acdf); finished by the art integrator (Opus 5.5): the stray
probe `tests/campusS2Probe.test.ts` (committed in WIP 9859afd5) deleted, gates rerun, this report. Branch
`feature/sector-redesign-art-s2` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-art-s2`), cut from the ART-KIT head
26670151. Owned files only: `src/world/maps/campusS2Dress.ts`, `scripts/campus-props/hero_s2.py`,
`src/world/campusArt/assets/hero-s2.glb/.json`, `tests/campusS2Dress.test.ts`, this report.

## Placed (section 2: 781 placements)
| Source | Count |
| --- | --- |
| Skins H2: receptionCounter 2 (one 6 m desk), speedGate 18 (four barrier segments: 5 + 3 + 3 + 7), cafeCounter 2, mailCage 3, switchBoard 2, stockShelf 3, sortingTable 1, liftDoor 9, kitchenCounter 4, bmsDesk 1, balconyPlanter 3 | 48 |
| Skins K / F: cafeTable 3, officeDesk 9, boardTable 1 | 13 |
| Chairs (F officeChair, see box `chairEnv`) | 7 of 9 desks |
| Heroes: logoWall, modelVitrine (fallback spot), lowTable + 2 loungeSeat (fallback spot) | 4 |
| Base pass (`d.base()`) | 709: ceilingGrid 179, ceilingDiffuser 177, pipeRun 64, smokeDetector 44, filingCabinet 38, shelving 29, ductRun 25, noticeBoard 24, signPlate 23, roofCowl 22, fireExtinguisher 14, whiteboard 12, wallClock 8, plantPot 9, recyclingBins 7, lockerBank 5, printerMfd 5, waterCooler 5, switchgearPanel 4, acCondenser 4, exitSign 3, vendingMachine 2, palletLoadLow, glandPlate, coolingUnit, cableDrum, bookcase 1 each |

Base drops (rule: count, largest first): filingCabinet B 84, K1 73, C 65, K4 21, K3 11, K5 7, K2 5; waterCooler K2 113, K1 32, B 4, K5 4;
roofCowl B 78, K1 32, K2 15, K4 8, K5 4, K3 3, K6 3; driveCabinet V 70; recyclingBins B 26, C 20, K2 12, K1 4, K5 3, K4 1; palletLoadLow B 49;
fireExtinguisher B 47, K4 2; printerMfd B 41, C 16; noticeBoard B 36, K3 1; acCondenser C 18, K1 16, B 4, K3 3; fridge K2 28, C 13, K5 4;
shelving B 16, K3 9, K6 4, K5 2, K2 1; ceilingGrid sky 16, K10 15; ceilingDiffuser sky 12, low 3; cableDrum B 19, K4 8; pipeRun B 18, K3 1;
lockerBank B 6, C 5, K3 4, K5 2, K2 1; bookcase K1 12, C 9, K4 5, K5 2, K2 2, K3 1, B 1; plantPot K1 15, B 8, K2 6, K7 4, K3 1;
vendingMachine B 11, C 2, K2 / K3 / K5 1; glandPlate K4 10; switchgearPanel K4 8, B 1; whiteboard B 9, K3 5; wallClock B 25;
smokeDetector sky 7, K10 2, B 1; signPlate nowall 19, B 5; exitSign B 5; coolingUnit K4 3, B 2.

## Numbers
- Draws 39 of 40 (`artCounts`). Triangles 51,024 of 150 k. Placements 781 of 2500.
- H2: 13 pieces, 1,944 tris (budget 4 k), GLB 157.6 KB (budget 0.4 MB). Per piece (built / budget): receptionCounter 200/350,
  speedGate 92/160, cafeCounter 292/350, mailCage 216/300, switchBoard 176/200, sortingTable 132/150, stockShelf 132/150, bmsDesk 276/450,
  liftDoor 72/80, balconyPlanter 144/200, logoWall 60/60, lowTable 60/60, kitchenCounter 92/150.
- Materials (15): steel, steelDark, galv, plastic, white, whiteGloss, laminate, oak, marble, timber, glass, foliage, chrome, screen, lamp.
- Emissive circuits: the 18 speedGate modules carry `S2_GROUPS.atrium` and a green `lamp` (set after `skinRow`, the kit's skins take no group: same gap as S1 L5).

## Gates (this worktree, one slot at a time)
- `npx tsc --noEmit`: clean.
- `vitest run tests/campusS2Dress.test.ts`: 12 / 12.
- `vitest run tests/campusArtGameplay.test.ts -t S2`: 8 pass (34 skipped by the filter).
- `vitest run tests/campusArtLight.test.ts -t S2`: 1 pass (4 skipped).
- `vitest run tests/campusS2.test.ts`: 40 / 40 (K2 choke, A64).
- Not run: `campusRuntimeNav`, `campusArtKit`, full vitest, `npm run check`, e2e, GPU shots (the join and the lead's batch 3).

## Brief errors and deviations (L-log)
- **L1** Plant switchgear: F `switchgearPanel` is 2.3 high and 1.6 deep, no fit on the 2.4 x 1.8 x 1.0 boxes: new H2 `switchBoard`
  (2.2 x 1.8 x 0.9 fit, three door panels, 200 tris) per the brief's fallback.
- **L2** NW store block: K `shelving` is 0.5 deep, no fit on 1.4 x 1.8 x 3.0: H2 `stockShelf` built 1.2 x 1.8 x 1.4 (double-sided bay, reads solid), 3 modules along z.
- **L3** L1 kitchen counter: K `kitchenRun` is 0.9 high, the greybox counter 1.1: new H2 `kitchenCounter` (1.2 module, 4 along x).
- **L4** Chairs: 7 of 9 desks. (-31.5, -4.5) on L1 refused K1 both sides (route leg 10); (-33, -25.5) on L2 refused K6 both sides (hide /
  spawn / seed). (-12, 5) on L1 took the other side (box 107 on the preferred side).
- **L5** Seating group: the brief spot (-27.4, -19.5) refused K2 (guard 1 leg 1); placed at the first clear fallback (-28, -21.5), table
  along x with the seats at x +-1.0. Two seats, not four (the brief's placement table names two).
- **L6** Model vitrine: (-10.6, -27.4) refused K4 (switch within 1.9) and (-28.6, -27.4) refused K1 (route leg 2); placed at the
  third fallback (-11, -27.5), yaw -PI / 2.
- **L7** F `greenWall` omitted at both spots (-29.84, -15) and (-29.84, -2): rule V refuses a 1.2 m wide visual part in the body band.
  **Kit gap** (for the join): the F greenWall is flush-wall but deeper than rule V's 0.15 flush allowance, or needs a see box; either
  a kit line (flush allowance or a `greenWall` see box) or leave it out.
- No lamp, switch, door, anchor, item, guard, glass front or stair touched.

## Views (brief section 5)
Not rendered here (GPU shots are batch 3); the seven views s2-a .. s2-g are `scripts/campus-art-shots.mjs`'s.

## A152
Changed files: the owned list above, plus a tracked `scripts/operators/py/__pycache__/common.cpython-313.pyc` modified by the Blender
run and committed in WIP 9859afd5 (removed at the join on `feature/sector-redesign-art`).
