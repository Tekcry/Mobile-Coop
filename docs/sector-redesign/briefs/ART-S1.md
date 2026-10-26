# ART-S1 brief - section 1 dressing: gatehouse, car park, forecourt (builder: Sonnet 5.5; checker: Opus, batch 2)

Read first: `ART-PLAN.md` sections 1-5.1 (rules, kit, keepouts, the section slice contract) and the ART-KIT API in
`src/world/campusArt/*.ts`. Source of every coordinate: `src/world/maps/campusS1.ts` (read only). Build exactly this;
anything not covered: simplest option, logged as L1, L2 ... in `checks/art-s1-build.md`. Never ask. Acceptance
A127-A131 + A152. Branch `feature/sector-redesign-art-s1` off the ART-KIT head (worktree
`C:/NightShift/Mobile-Coop-sector-redesign-art-s1`).

## 1. Room tags (`S1_ART_TAGS`)
| Room id | Tag | | Room id | Tag |
| --- | --- | --- | --- | --- |
| verge | ext-verge | | bikes | ext-shelter |
| gatehouse | gatehouse | | smoke | ext-shelter |
| lane | ext-road | | dyard | ext-service |
| park | ext-carpark | | forecourt | ext-forecourt |
| bins | ext-service | | plantroof | roof |
| c1 | lobby | | | |

## 2. Skins of greybox objects (in this order; `boxAt` / `cylAt` with the builder's centres, y = h / 2 for `block`)
| Target (builder line) | Centre (x, y, z) / size | Piece | Call |
| --- | --- | --- | --- |
| 14 parked cars (`CARS`, `bayX`, `ROW_Z`) | (bayX(bay), 0.75, ROW_Z[row]) / 1.8 x 1.5 x 4.2 | K car, colour `['carSilver','carBlack','carBlue','carWhite'][k % 4]` (k = index in `CARS`) | `skinHide` yaw 0 (the box is long in z) |
| Bins x 3 | (-38.2, 0.6, -48.2), (-36.6, 0.6, -48.2), (-38.2, 0.6, -46.2) / 1.4 x 1.2 x 1.1 | K binLarge | `skin` yaw 0 (lid hinge north) |
| Feeder pillar | (-31.4, 0.75, -46.6) / 1.6 x 1.5 x 0.4 | K feederPillar | `skin` yaw PI (door face south, where the breakers are; the switch items stay the game's) |
| Facade planters x 3 | (-11, 0.35, -35.6), (-7, ...), (-3, ...) / 2.4 x 0.7 x 0.8 | K planterTrough | `skin` yaw 0 |
| Verge trees x 2 | cylinders (22.5, -66), (24.5, -60), r 0.3, h 5 | K treeSkin | `skinCyl` |
| Cage trolley | (-30.5, 0.6, -44) / 1.0 x 1.2 x 0.8 | H1 cageTrolley | `skin` yaw 0 |
| CCTV desk | (18.8, 0.375, -73.8) / 1.6 x 0.75 x 0.7 | H1 gateDesk | `skin` yaw PI (operator side south, faces the north wall) |
| PC desk | (19.35, 0.375, -77.75) / 0.9 x 0.75 x 1.6 | H1 pcDesk | `skin` yaw -PI / 2 (operator side west; just south of the window, F42) |
| Kettle counter | (18.4, 0.45, -78.55) / 1.6 x 0.9 x 0.6 | H1 teaPoint | `skin` yaw 0 (front north) |
| Barrier island | (11, 0.5, -77) / 1.0 x 1.0 x 2.4 | H1 trafficIsland | `skin` yaw 0 |
| Barrier arm (visual box) | (12.75, 1.0, -77) / 2.5 x 0.08 x 0.1 | H1 barrierArm | `skin` yaw 0 (pivot at x 11.5) |
| Forecourt bollards x 8 | cylinders at (`BOLLARD_XS`, -45.5), r 0.08, h 0.9 | H1 lightBollard | `skinCyl` |

## 3. Hero set H1 - the gatehouse (`hero_s1.py`, catalogue `HERO_S1`, id 'H1')
| Piece | Size (x / y / z, m) | What | Class | Tris |
| --- | --- | --- | --- | --- |
| gateDesk (fit) | 1.6 x 0.75 x 0.7 | laminate desk closed to the floor (modesty panel), two 24" monitors (overhang: 0.55 x 0.4 each, on the back 0.25), keyboard, radio charger, phone | skin | 450 |
| pcDesk (fit) | 1.6 x 0.75 x 0.9 (long axis local x) | desk, PC tower under, keyboard; **no monitor within 0.4 m of the objective (19.3, 0, -76)** (the game draws its own terminal) | skin | 250 |
| teaPoint (fit) | 1.6 x 0.9 x 0.6 | steel base unit, worktop, kettle (0.2 x 0.28), 3 mugs, a small under-counter fridge door | skin | 300 |
| monitorBank | 1.2 x 0.8 x 0.12 | 2 x 2 CCTV screens on a wall bracket; screens `screen` emissive on group `S1_GROUPS.gate` | visual (flush) | 120 |
| keyCabinet | 0.45 x 0.6 x 0.1 | steel key safe | visual (flush) | 40 |
| visitorBoard | 0.9 x 0.6 x 0.03 | clipboard rack and a fault-ticket sheet | visual (flush) | 40 |
| trafficIsland (fit) | 1.0 x 1.0 x 2.4 | kerbed island, yellow / black kerb faces, a small control post stub flush with the top | skin | 200 |
| barrierArm (fit) | 2.5 x 0.08 x 0.1 | round aluminium arm 0.08, red / white bands (`red` / `white`), tip lamp lens (`lamp`, group `S1_GROUPS.lane`) | skin of a visual box | 120 |
| barrierHousing | 0.32 x 0.9 x 0.32 | motor housing on the island top | visual (rule V: 0.32) | 120 |
| cageTrolley (fit) | 1.0 x 1.2 x 0.8 | galvanised roll cage full of courier sacks (reads solid) | skin | 400 |
| lightBollard (fit) | 0.2 dia x 0.95 | aluminium bollard; the top lens is `lamp` emissive on group `S1_GROUPS.fore` (the real light stays the rig's) | skin | 80 |
| intercomPost | 0.2 x 1.3 x 0.15 | driver intercom on a post | see (box 0.2 x 1.3 x 0.15) | 80 |

Hero placements (`add`, exact; a throw is a brief error: report it, do not move the piece):
| Piece | x, y, z | yaw | Why |
| --- | --- | --- | --- |
| monitorBank | (18.8, 1.25, -73.3) on the north wall's inner face | PI | the CCTV officer's cam-gate / cam-walk monitors |
| keyCabinet | (15.2, 1.4, -73.3) | PI | the site keys by the door |
| visitorBoard | (14.3, 1.2, -78.0) on the west wall's inner face | PI / 2 | the visitor list the player downloads is also on paper |
| barrierHousing | (11.0, 1.0, -76.2) on the island top | 0 | the barrier's motor |
| intercomPost | (12.6, 0, -79.3) | 0 | the drivers' intercom by the gate (if `add` throws: x 13.2; still throws: omit, L-log) |
| K siteSign | (6.8, 0, -79.0) | PI | the Orrin site sign at the gate (omit + L-log if it throws) |
| K bikeRack x 3 | (-8, 0, -46.8), (-5, 0, -46.8), (-2, 0, -46.8) | PI | the bike shelter's stands (each omitted + L-log if it throws) |
| K parkBench | (8, 0, -47.6) | PI | the smoking shelter's bench (omit + L-log if it throws) |

## 4. Base pass
`d.base()` last. Expected from the rules: exterior litter bins, wheelie bins in the delivery yard, reeds on the verge
(under 0.5 m), condensers and cowls on the plant roof, door extras on the gatehouse and C1. Do not add more.

## 5. Views (for `scripts/campus-art-shots.mjs`; eye -> target)
s1-a (24, 1.6, -70) -> (19, 1.2, -76) verge to the rear window; s1-b (15, 1.7, -74) -> (19, 0.9, -77) gatehouse inside;
s1-c (11, 1.7, -79.5) -> (11, 1, -70) the barrier lane; s1-d (-36, 4, -78) -> (-15, 0.5, -60) the car park; s1-e
(-28, 1.7, -50) -> (-37, 1, -47) bin store and feeder pillar; s1-f (-2, 1.7, -44) -> (-20, 2, -36) forecourt and canopy;
s1-g (-28, 1.7, -43.5) -> (-38, 2, -41) delivery yard and the plant-roof ladder.

## 6. Acceptance
- **A127** Tags: every S1 room tagged per section 1.
- **A128** Skins: all 32 targets of section 2 skinned once (14 cars `skin-hide`, the rest `skin`); every `skinFit` null.
- **A129** H1: 12 pieces per section 3, report within budgets (total H1 <= 3 k tris, GLB <= 0.3 MB); placements per the
  table or logged omissions (only the four rows that allow it).
- **A130** S1 gates green: `campusArtGameplay -t S1`, `campusArtLight -t S1`, `campusS1.test.ts`, `campusRuntimeNav`
  unchanged; the CR1 canopy lip threats empty (nothing near the canopy grew a top >= 1.2).
- **A131** S1 budgets: <= 40 draws, <= 150 k tris (`artCounts`), report written.
- **A152** (shared) ART-PLAN 5.1 contract held: only the owned files changed (`git diff --stat` in the report).

## Do not touch
`campusS1.ts`, `campusSectors.ts`, `campusLips.ts`, `campusOps.ts`, `campusDress.ts`, any ART-KIT file, other sections'
files, lamps (the car-park columns, the lane floodlight, the bollard lights and the canopy downlights stay the rig's: only
the bollard posts are skinned), the gatehouse windows and door, the cut fence panel.
