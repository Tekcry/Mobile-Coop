# ART-S4 build report (briefs/ART-S4.md, A142-A146, A152)

Builder: Sonnet 5.5, 2026-10-23. Branch `feature/sector-redesign-art-s4` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-art-s4`),
cut from the ART-KIT head 26670151. Files: `src/world/maps/campusS4Dress.ts`, `scripts/campus-props/hero_s4.py`,
`src/world/campusArt/assets/hero-s4.glb/.json`, `tests/campusS4Dress.test.ts`, this report. No kit, game or other section file touched.

## Numbers
| | |
| --- | --- |
| H4 | 12 pieces, 2168 triangles (brief cap 5 k), GLB 147 KB (cap 0.5 MB); every piece under its `triBudget`; bounds = the catalogue's within 1 cm (test) |
| Placements (section) | 563: **382 skins**, **21 heroes**, 160 base pass |
| Skins | 138 `F:serverRack` (10 pod rows x 13 + the spare row 8), 70 containPanel, 35 podRoof, 86 basketRun, 4 cracUnit, 7 batteryString, 18 upsCabinet, 4 chiller, 1 genset, 1 fuelTank, 2 crateStack, 16 cagePanel |
| Heroes | `F:monitorWall` 1, `F:securityDesk` 3, `H4:suppressionBank` 2 (see), `K:pduStrip` 10, `K:floorTileGrid` 5 |
| Base pass | K noticeBoard 9, fireExtinguisher 22, ductRun 20, exitSign 14, ceilingDiffuser 27, smokeDetector 17, wallClock 1, lockerBank 2, plantPot 1; F signPlate 39, glandPlate 8 |
| Draws | **25 of 40** (the kit's base pass alone was 15) |
| Triangles | 78,064 of 150 k (racks 36 k, baskets 19 k are the bulk) |
| Solid / see boxes written | monitorWall (2), 3 securityDesk, 2 suppressionBank (see), 2 lockerBank: nothing else (skins write none) |

## Gate results (this branch)
| Test | Result |
| --- | --- |
| `tsc --noEmit` | clean; eslint clean on the two TS files |
| `campusArtGameplay -t S4` (8 items: legs, protected cells, patrols, cover, lips, cameras / lasers, interactables, checkDressing + budgets) | pass |
| `campusArtLight -t S4` | pass (the monitor wall and desks are solid, so the light bake ran; every protected point within 0.02) |
| `campusS4.test.ts` (K3 choke, A64, the dog, las-tray K9, basket route) | 40 pass |
| `campusS4Dress.test.ts` (new) | 13 pass |
| `campusArtKit`, `campusRuntimeNav`, `campusDressRules` | pass (94 tests with campusS4 and the dress test) |
| Not run (lead / CI) | `npm run check`, build, e2e, GPU shots and perf |

## What was built
- **Tags** (A142): the brief's table, every room of `S4_ROOMS`.
- **Skins** (A143): per brief section 2, all through `skinRow` / `skin`, no box written. The CR4 box takes three exact-width
  modules (width scale 1: nothing proud on its east / west faces), the baskets' tops are flush (the tray is 0.4 deep, cables
  below the top), the basket route and every lip check are the greybox's (gameplay item 1 / 5 pass).
- **Hero set H4** (A144): the brief's table, plus `batteryString` and `cagePanel` (kit gaps L1, L2). No alpha, no new material
  names: every look is from PROP_LOOK / CAMPUS_LOOK; emissive parts `cracUnit.screen` (group `cold1`) and `upsCabinet.lamp`
  (group `ups`) only.
- **Hero placements**, landed by a nearest-valid search round the brief's point (`S4_HERO_LOG`, rewritten per dress):
  - NOC video wall (7.90, 3.6, 44.60) on the NOC's EAST wall facing west (the north wall's inner face is over the stair opening).
  - NOC desks (0.0, 3.6, 46.0) and (5.3, 3.6, 45.5); security room desk (4.7, 0, 46.1).
  - Suppression banks at (6.0, 0, 41.85) and (10.0, 0, 41.85) on the hall's NORTH wall.
  - PDU strips: 10 (one on each pod end, west rack's south end and east rack's north end, 0.3 m in from the rack corner).
  - Floor grid: 5 tiles (see L3).

## L-log (assumed decisions, simplest option, undoable)
- L1 Kit gap: `K:batteryRack` is 0.8 deep, the S4 battery boxes 1.0: the fit stretch is 1.275 (limit 1.25), so H4 has
  `batteryString` (2.0 x 1.2 x 1.0). Undo: kit batteryRack at 1.0 deep.
- L2 Kit gap: `F:meshPanel` is 2.4 high, the cage walls 3.0: stretch 1.258 (limit 1.25), so H4 has `cagePanel` (1.5 x 3.0 x 0.1,
  flat bars, no alpha). The cage's gate-door strips (0.9 high over each door hole) are not skinned.
- L3 Kit gap: floor decals (a 1 cm tile grid) are held to K1-K6 routes / patrol legs / door zones and the greybox overlap like a
  box, and the hall's aisles are 2.0 m wide against the 3.0 m tile (fit floor 2.4), so a greedy 1 m lattice places 5 tiles
  in the open floor. `add` also snaps y to 1 cm (brief: 3 mm), so the tile is y 0.01. A decal exemption in the kit would
  let the whole hall be tiled.
- L4 Brief row sizes were written in world axes; the kit's rows run local x along the row, so containPanel is 1.2 (x) x 0.7 x
  0.1 (z), podRoof 1.2 x 0.1 x 3.6, hulls as the kit template.
- L5 `crateStack` is 1.2 x 1.0 x 0.8 (the greybox crates are 1.0 high, the brief's 1.5 would stretch 0.68); `cracUnit` 2.0 high
  (the greybox box), `chiller` 2.2 (fan stacks on the 2.0 box, stretch 0.92).
- L6 `basketRun` hull is 3.0 high: trapeze hanger rods (2 cm) from the basket to the slab underside (7.0), allowed by an
  `overhang` of 2.7; `genset` 3.6 high (exhaust stack), `overhang` 1.05.
- L7 The 0.35 m `stub` basket is not skinned (under one module: scale 0.37).
- L8 Fuel tank: skinned with a 2.0 high hull; on this branch the tank box is 1.6 (stretch 0.81) and on the parallel branch 2.0
  (stretch 1): both pass the skin rule. The box lookup accepts 1.55-2.05.
- L9 The NOC window (fence now, armoured glass on the parallel branch) and the mantrap inner door: nothing is mounted on
  either (the `noc` and `mantrap` tags are hero-only and `data-hall` base is empty; K12 would block glass anyway).
- L10 Hero coordinates re-checked against `campusS4.ts`: the brief's NOC wall / desk points sit over the stair opening and
  its rail (box overlap), the west-wall banks at z 25 / 39 are two door zones and the supervisor's walked wall (K2 +0.4):
  all moved by the search (above). `F:securityDesk` needs the nav seed (2, 3.6, 44) and (2, 0, 45) 1.6 m clear, so the desks
  sit in the strip south of the stair rail.

## Skipped
- Stub basket skin, the gate-door cage strips (L2, L7); most of the raised-floor grid (L3).
- Group `S4_GROUPS.noc` / `sec` are set on the NOC and security desks and the video wall (their screens dim with the
  circuit); the cold-aisle and NOC lamps themselves, the door, keypad, gate and ladder pieces are untouched.

## Kit gaps (for the lead)
1. L1 / L2: fit limits 1.25 reject `batteryRack` on 1.0 deep boxes and `meshPanel` on 3.0 high cage walls (worked round with H4 pieces).
2. L3: floor decals (hull top under 5 cm) should be exempt from K1-K6 and the greybox overlap in `blocked` / `overlapsGreybox`;
   `add` snaps y to 1 cm.
3. `d.skin*` take no `group`: the emissive circuit groups are set on `d.placements[i].group` after the call (public array).

## Open items
- `npm run check` and the e2e / GPU shots (draws read 25, triangles 78 k from the pure count; a GPU `campus-art-shots` s4-a..g look
  is batch 3).
- Re-run `campusArtGameplay -t S4` after the parallel branches (fuel tank 2.0, armoured glass / door) merge: no dress change is expected.
