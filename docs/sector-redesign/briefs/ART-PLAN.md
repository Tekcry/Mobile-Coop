# ART-PLAN - Saltmarsh Park (campusOps) full detail-art lift

Planner: Opus, 2026-10-23. Source: ROADMAP "Next: campus detail art", ROADMAP Decided "Campus detail art (2026-10-23
~10:40)": "add the full detail-art lift of campus as efficiently as possible" (G278 extended from marlow-final to
campusOps: full finish, not greybox only). Planning only; builders build exactly from the slice briefs:
`ART-KIT.md` (Opus), `ART-S1.md` ... `ART-S5.md` (Sonnet). Acceptance A110-A157 (continues E9-CRATE.md's A109).

## 0. What "done" looks like
Every room of the five sections reads as its real place (gatehouse, HQ offices round an atrium, lab block, data hall,
1960s Old House, car park and grounds) at Epic on the laptop, and **nothing a player, guard, camera, laser or the light
meter uses changes** except where a slice brief names the change and its test. Every existing campus unit test and
e2e-sectorops part 6 stay green untouched on the dressed build. Perf stays inside the 24-guard budget (section 6).

## 1. Hard rules every art slice obeys (CLAUDE.md, bible, level-design)
- **Art source.** In-repo Blender scripts only (headless, the pinned Blender of `scripts/operators/blender.mjs`), factor-only
  materials, no UVs, no textures. CC0 textures (bible 5.16) are allowed but not used in this lift (no slice adds one).
  No external meshes, no Splinter Cell IP, no real brands or logos (Orrin / Larchmont are ours: plain-text-free plates only).
- **Babylon** only through `src/core/babylon.ts` (tests may import `@babylonjs/core/Engines/nullEngine` directly, as
  marlow-final's do). A missing side-effect import is added there.
- **Gameplay never reads art.** Props are meshes over level-builder boxes. Collision, cover, ledges, nav, perception,
  the light bake and the meter read only the boxes. `?gfx=min` (and a GLB that fails to load) shows the boxes.
- **Hot paths do not allocate.** The renderer's per-frame work (emissive repaint on a registry change, the one moving
  leaf if any) is allocation-free with preallocated buffers; `hyp2` / `hyp3`, never `Math.hypot`.
- **Desktop only.** No phone path, no touch work.
- **Removed / parked systems get nothing.** No new mechanics. Dressing adds no switch, lamp, door, anchor, item or guard.

## 2. Light parity (bible 5.1) - the three prop classes
Every placed piece is exactly one of:
| Class | Boxes it writes | Light bake / meter / guards | Picture |
| --- | --- | --- | --- |
| **solid** | visible collide boxes 1 cm inside the skin (`see: false`) | occlude (in `canonicalLightSet`, the shadow casters, guard sight) | the box casts, the prop draws over it |
| **see** | collision-only boxes (`visible: false`): racking, mesh, chairs, open frames | light passes (not in the canonical shapes); stops movement, bullets, guard sight | props cast no shadow, so the picture agrees |
| **visual** | none | nothing | must be non-occluding by construction (rule V below) |

- **Rule V (visual-only bulk).** A visual piece has no part in the body band (floor + 0.5 .. floor + 2.1 m) wider than
  0.35 m in plan, unless the whole piece lies within 0.15 m of a wall face (flush wall props) or above floor + 2.3 m
  (ceiling props). Floor clutter under 0.5 m is free. Two listed exceptions only: desk-top equipment in a piece's
  `overhang` list (monitors, phones, a kettle: each part <= 0.6 wide and <= 0.5 tall, on a skinned or solid desk), and
  open frames whose members are <= 5 cm with >= 70% open area (shelf uprights, drop rods, rails: the eye sees through
  them as the guards do). Anything else needs a see or solid box. Reason: a player must
  never hide behind something the guards see through, or be seen through something that looks solid.
- **Skins of greybox objects** (a desk, a pod, a bin) write no new box: the existing greybox box already is the solid
  box. The skin must enclose it and stand at most 5 cm proud of it (`PROP_PROUD`), listed overhangs excepted (rule S).
  Foliage, lids and handles count: nothing more than 5 cm above a skinned box in the body band.
- **Box-hidden skins** (`skin-hide`: the parked cars, the S5 van (H5 `panelVan`; the facility `boxVan` is a rail van and is not used), nothing else without a brief line): a real car cannot
  enclose a 1.5 m box over its whole length. The greybox box keeps collision, cover, nav, the bake and guard sight; the
  art renderer hides only its drawn instance and the skin becomes a shadow caster. The box may stand outside the skin by
  at most 0.6 m and only above 0.9 m (bonnet and boot ends): there the player looks more exposed and lit than he is (the
  safe direction). The skin may never stand more than 5 cm outside the box between 0.5 and 2.1 m (AS10).
- **Emissives** (screens, status LEDs, vending fronts, exit signs) are accents only: gain <= the facility kit's
  (`PROP_SCREEN_GAIN` 1.0, `PROP_LAMP_GAIN` 1.2), on the room's light circuit (`group`, dim to `PROP_DARK` when cut) unless
  the device has its own supply (exit signs: own supply, gain 0.6, green). A prop never adds, moves or removes a light.
- **Delta gate.** `tests/campusArtLight.test.ts` bakes the campus greybox and dressed and holds every protected point
  (section 4) within 0.02 of the greybox level (`LightField.totalAt` at feet + 1.0 m). A solid prop that shades a planned
  lit pool or lights a planned dark pocket fails here.

## 3. The kit (one shared instanced prop / material kit)
Source catalogues, all drawn by one campus renderer (`src/world/campusArt/campusArtRender.ts`, ART-KIT):
- **F** - the marlow-final facility props (`facility-props.glb`, `src/world/props/facilityProps.ts`), reused as they are
  through a catalogue adapter (no edit to marlow-final files).
- **K** - the new campus base kit (`campus-kit.glb`, `scripts/campus-props/kit.py`, catalogue `campusKit.ts`), built by ART-KIT.
- **H1..H5** - one hero catalogue per section (`hero-s<N>.glb`, `scripts/campus-props/hero_s<N>.py`, catalogue in
  `campusS<N>Dress.ts`), built by that section's slice.

Each placement may carry a non-uniform scale (`s: [sx, sy, sz]`, each 0.8-1.25) for **fit** pieces (marked `fit` below)
so one mesh skins greybox boxes of slightly different sizes. Fixed pieces never scale.

Budgets: tris per piece as listed (the build report test holds each under it). Draws: one per (section, material) for
the merged static opaque pieces, one per (catalogue, section, piece, material) for emissive, alpha (glass, mesh,
foliage) and moving pieces.

### 3.1 Reused from marlow-final (F) - no new art
| Piece | Use on campus | Class | Tris |
| --- | --- | --- | --- |
| officeDesk (fit) | every greybox desk 1.4-1.8 x 0.75 x 0.7-0.9 (S2, S3 write-up, S5 CEO) | skin | 250 |
| officeChair | at each skinned desk's knee side, dead space only | see (K box `chairEnv`) | 350 |
| filingCabinet | office wall runs, archive, post room | solid | 120 |
| receptionDesk (fit) | S2 reception desk skin | skin | 300 |
| loungeSeat | S2 reception / atrium seating, S5 drawing room (no: OH uses K `chesterfield`) | solid | 400 |
| greenWall | S2 atrium feature wall (flush) | visual | 300 |
| modelVitrine | S2 atrium Tidewater model (hero H2) | solid + see | 600 |
| securityDesk (fit) | gatehouse CCTV desk, S3 / S4 security rooms | skin | 500 |
| monitorWall | S4 NOC, S4 / S3 security rooms, S5 control room (flush) | solid (own boxes) | 400 |
| serverRack (fit, row) | S4 pod rack rows, S3 burn-in racks, S5 control racks | skin | 300 |
| meshPanel (row) | S3 gas cage, S4 cage faces (skin of the greybox fence panels) | skin | 120 |
| cableTray (hung) | S4 basket skins (fit, H4), plant room runs | visual / skin | 120 |
| switchgearPanel (row) | plant rooms, S4 UPS cabinets skin | skin / solid | 200 |
| driveCabinet, glandPlate, davitBox | plant rooms (flush) | visual | 200 / 80 / 100 |
| coolingUnit | S4 CRAC skin (fit), S2 / S5 plant rooms | skin / solid | 200 |
| pipeRun (row) | plant rooms, S3 chilled-water main skin (hung over the pipe anchor: visual) | visual | 160 |
| cableDrum | S3 / S4 docks, S4 compound | solid + see | 250 |
| palletLoad, palletLoadLow | S3 / S4 dock dead corners, the S4 dock crate stacks skin (fit) | solid | 120 |
| dispatchDesk | S3 / S4 dock desks (skin, fit) | skin | 250 |
| barrierPost | S1 barrier island (H1) | skin + overhang | 250 |
| bollard | S1 forecourt bollard skins (the lit bollards are lamps: skin only the posts) | skin | 80 |
| signPlate (hung) | every door head and corridor junction (room names are blank plates) | visual | 60 |
| holdingBench | S3 gowning bench | see | 120 |
| kitCaseWall | S3 gowning lockers (flush row) | see | 400 |
| vaultDoor, vaultLeaf | S5 strongroom (H5) | visual frame skin / see leaf | 400 / 600 |
| depositWall (row), timeLockPanel, bankGrille | S5 strongroom (H5) | solid / visual / visual | 250 / 160 / 200 |
| trenchGrating, cleanerTrolley | S4 hall floor (flush), S2 corridor dead ends | visual / see | 80 / 300 |

### 3.2 New base kit (K) - built by ART-KIT (`kit.py`)
| Piece | Size (m, x / y / z) | Use | Class | Tris |
| --- | --- | --- | --- | --- |
| chairEnv | (box only) 0.6 x 1.0 x 0.6 | the see box under any chair | - | 0 |
| meetingTable (fit) | 2.4 x 0.74 x 1.2 | meeting rooms, boardroom skins | skin | 200 |
| printerMfd | 0.6 x 1.15 x 0.65 | offices, mailroom | solid | 200 |
| waterCooler | 0.32 x 1.3 x 0.32 | offices, lobbies | visual (rule V: 0.32) | 120 |
| lockerBank (row) | 0.9 x 1.9 x 0.5 | mailroom, gatehouse, dock, plant | solid | 150 |
| shelving (row) | 1.2 x 2.0 x 0.5 | stores, archive, lab store | see | 200 |
| whiteboard | 1.8 x 1.2 x 0.04 | offices, lab write-up (flush, bottom 0.9) | visual | 40 |
| noticeBoard | 1.2 x 0.9 x 0.03 | corridors, kitchens, dock | visual | 40 |
| wallClock | 0.35 dia x 0.05 | offices, kitchens, lobbies | visual | 60 |
| fireExtinguisher | 0.2 x 0.65 x 0.2 on a bracket, bottom 0.3 | every room by a door | visual | 80 |
| fireCallPoint | 0.1 x 0.1 x 0.05, at 1.4 | every exit door | visual | 30 |
| exitSign | 0.4 x 0.15 x 0.05, hung over exit doors (own supply) | every exit door | visual (emissive) | 30 |
| ceilingDiffuser | 0.6 x 0.03 x 0.6 | modern interiors, under ceilings | visual | 40 |
| smokeDetector | 0.12 dia x 0.05 | every ceiling | visual | 30 |
| ceilingGrid (fit) | 3.6 x 0.02 x 3.6 tile of T-bar grid | office / lab ceilings (flush under slab) | visual | 60 |
| kitchenRun (row) | 1.2 x 0.9 x 0.6 base unit + worktop | kitchens (S2 kitchen skin, S5 kitchen) | skin / solid | 150 |
| wallCupboards (row) | 1.2 x 0.7 x 0.35, bottom 1.45 | over kitchen runs (flush) | visual | 60 |
| fridge | 0.6 x 1.8 x 0.65 | kitchens | solid | 80 |
| vendingMachine | 0.9 x 1.85 x 0.8 | lobbies, dock, S3 lobby | solid (+ screen) | 150 |
| cafeTable (fit) | 0.9 x 0.75 x 0.9 square top on a pedestal (a round top cannot enclose the square greybox) | S2 cafe skins | skin | 120 |
| cafeChair | 0.45 x 0.85 x 0.5 | around cafe tables | see (`chairEnv`) | 120 |
| recyclingBins | 1.0 x 0.9 x 0.4 | offices, kitchens, lobbies | solid | 80 |
| planterTrough (fit, row) | 2.0 x 0.7 x 0.8 (h 0.7), clipped planting flush with the box top | S1 facade planters skin, atrium | skin | 150 |
| plantPot | 0.6 dia x 1.6 (foliage from 0.6) | lobbies, reception, OH hall | see | 300 |
| labBench (fit, row) | 3.0 x 0.9 x 0.9 + reagent shelf to 1.6 | S3 bench skins, lab rooms | skin | 350 |
| fumeHood | 1.5 x 2.4 x 0.9 | lab rooms along walls | solid | 300 |
| gasCylinders | 1.2 x 1.7 x 0.4 rack of 4 | S3 gas cage, lab walls | see | 400 |
| instrumentCart | 0.6 x 1.1 x 0.5 | lab hall dead corners, S4 hall | see | 250 |
| batteryRack (fit, row) | 2.0 x 1.2 x 0.8 | S4 battery rack skins | skin | 300 |
| pduStrip | 0.15 x 1.8 x 0.1 | data hall pod ends (flush) | visual | 40 |
| floorTileGrid (fit) | 3.0 x 0.01 x 3.0 raised-floor grid lines | S4 hall / NOC floors (decal, 3 mm proud) | visual | 20 |
| bookcase (row) | 1.0 x 2.2 x 0.4 | OH formal rooms, CEO suite, archive walls | solid | 200 |
| boardTable (fit) | 4.0 x 0.76 x 1.4 | S5 boardroom skin | skin | 250 |
| chesterfield | 2.0 x 0.8 x 0.9 | OH drawing room, CEO suite | solid (seat) + see (back) | 400 |
| wingChair | 0.8 x 1.1 x 0.8 | OH formal rooms | see | 300 |
| fireplace | 1.6 x 1.3 x 0.5 surround + hearth | OH formal rooms (flush, one per room with a chimney) | solid (hearth 0.15) + visual | 300 |
| portraitFrame | 0.8 x 1.0 x 0.05 | OH halls, gallery, boardroom (flush, bottom 1.4) | visual | 40 |
| sideboard | 2.0 x 0.9 x 0.5 | OH dining / boardroom / gallery walls | solid | 150 |
| longcaseClock | 0.5 x 2.1 x 0.3 | OH hall (one) | solid | 150 |
| radiatorCast | 1.0 x 0.7 x 0.15 | OH every room under windows (flush) | visual | 150 |
| radiatorPanel | 1.2 x 0.6 x 0.1 | modern rooms under windows (flush) | visual | 40 |
| stoveRange | 1.2 x 0.9 x 0.65 | OH kitchen | solid | 200 |
| car (fit) x 4 colours | 1.8 x 1.5 x 4.2 to the box: body to 0.95, cabin to 1.5 over the middle 2.4 (carSilver, carBlack, carBlue, carWhite) | S1 car skins | skin-hide | 1200 each |
| bikeRack (row) | 2.0 x 1.0 x 0.6 with 3 bikes | S1 bike shelter | see | 600 |
| wheelieBin | 0.6 x 1.1 x 0.75 | S1 / S3 / S5 service yards | solid | 100 |
| binLarge (fit) | 1.4 x 1.2 x 1.1 (1100 L) | S1 bin store skins | skin | 200 |
| parkBench | 1.8 x 0.8 x 0.6 | S1 smoking shelter, S5 lawn | see | 150 |
| litterBin | 0.45 x 0.9 x 0.45 | exteriors by doors | visual (0.45: see box `binEnv`) | 80 |
| feederPillar (fit) | 1.6 x 1.5 x 0.4 | S1 feeder pillar skin (the breakers stay the switch items) | skin | 150 |
| siteSign | 1.5 x 2.2 x 0.3 | S1 entrance, S5 lane | solid | 100 |
| reeds | 2.0 x 0.5 x 2.0 clump | S1 verge, S5 lake edge (rule V: under 0.5) | visual | 300 |
| treeSkin (fit) | trunk skin over a greybox pillar r 0.3 + canopy from 3.0 | S1 verge trees, S5 trees | skin + visual canopy | 1500 |
| hedge (row) | 1.0 x 1.2 x 0.6 | S5 garden borders (only where a greybox wall or box already is) | skin | 120 |
| acCondenser | 1.0 x 1.0 x 0.45 on a frame | roofs, plant roof, S4 deck dead corners | solid | 250 |
| roofCowl | 0.5 x 0.8 x 0.5 | roofs (16.4.3: each over a riser) | visual (0.5 wide: see box) | 80 |
| ductRun (row, hung) | 1.0 x 0.4 x 0.6 | plant rooms, dock, data hall above 4.6 | visual | 60 |

K total: 60 ids (the four car colours are four ids; `chairEnv` and `binEnv` are box-only ids with no mesh), about 17 k
triangles (the cars 4.8 k); GLB budget 1.2 MB.

### 3.3 Materials
Renderer looks are one table keyed by material name across catalogues: `PROP_LOOK` (F, unchanged) plus
`CAMPUS_LOOK` (K and H): `carpetGrey`, `laminate`, `whiteGloss`, `oakDark` (Old House panelling and furniture),
`brick` (unused by props), `leatherGreen` (chesterfield), `paper` (shelving loads, books), `carPaint1..4`, `tyre`,
`chrome`, `labWhite` (benches, chamber panels), `epoxy`, `copper` (EMC door), `lead` (roof cowls), `bark`, `leaf`
(alpha foliage), `exitGreen` (emissive). A name in both tables must have the same look (test). Total distinct materials
on campus <= 40.

### 3.4 Finishes (the material half of the kit, no new meshes)
`finishes.ts` recolours greybox boxes per room tag and role (floor / wall / ceiling slab, found by size and the room's
storey), choosing colours that `pieceKind` turns into the right surface (carpet-grey offices, terrazzo atrium,
epoxy labs, raised-floor grey data hall, oak panel and brick Old House, asphalt / block paving outside). It changes
`BoxPiece.color` only: never a footstep surface (`b.surface`), a size, a flag or a light. Test: the canonical light hash,
the collision set, cover segments and nav are identical before and after `applyFinishes`.

## 4. Rule-based base dressing by room tag
### 4.1 Tags
Each section file gives every one of its rooms an `ArtTag` (`CAMPUS_ART_TAGS` in its dress file, exact table in its
brief): `office-open`, `office-cell`, `kitchen`, `reception`, `atrium`, `lobby`, `corridor`, `mailroom`, `store`,
`plant`, `security`, `gatehouse`, `lab-hall`, `lab-clean`, `lab-gown`, `lab-store`, `dock`, `data-hall`, `cage`, `noc`,
`ups`, `battery`, `riser`, `mantrap`, `oh-formal`, `oh-hall`, `oh-corridor`, `oh-service`, `oh-kitchen`, `oh-archive`,
`oh-control`, `oh-ante`, `strongroom`, `ext-verge`, `ext-road`, `ext-carpark`, `ext-service`, `ext-shelter`,
`ext-forecourt`, `ext-compound`, `ext-garden`, `ext-terrace`, `ext-jetty`, `roof`, `roof-plant`, `none`.

### 4.2 Mounts and the rule table
Mounts: **wall** (visual, flush <= 0.15 off a wall face found by `wallRuns`), **ceiling** (visual, under the slab found
by `ceilingAt`, bottom >= max(floor + 2.4, the highest walkable top under it + 1.9)), **floor-wall** (backed to a wall
run, writes its boxes), **floor-free** (dead space only, writes its boxes). Spacing is metres of free wall run or m2 of
free floor after keepouts. `max` is per room. Rows tile whole modules. Every rule places only where every keepout of
4.3 passes; a dropped candidate is counted in the report (`dropped`), never forced.

| Tag | wall | ceiling | floor-wall | floor-free |
| --- | --- | --- | --- | --- |
| office-open | whiteboard 1 / 14 m (max 2); noticeBoard 1 / 18 m; wallClock 1; radiatorPanel under each window | ceilingGrid tiling; ceilingDiffuser 1 / 13 m2; smokeDetector 1 / 50 m2 | filingCabinet pairs 1 / 12 m (max 4); printerMfd 1 if area >= 60 (max 1); recyclingBins 1 | waterCooler 1 if area >= 80 |
| office-cell | whiteboard 1; wallClock 1; radiatorPanel per window | ceilingGrid; diffuser 1 / 13 m2; smoke 1 | filingCabinet 1 pair; bookcase 1 if area >= 25 | - |
| kitchen | noticeBoard 1; wallClock 1; wallCupboards over every kitchenRun | ceilingGrid; smoke 1 | fridge 1; recyclingBins 1 | - |
| reception, atrium | - (hero only) | smoke 1 / 50 m2 | - | plantPot 1 / 60 m2 (max 4) |
| lobby | noticeBoard 1; fireExtinguisher 1; exitSign per exit | diffuser 1 / 13 m2; smoke 1 | vendingMachine 1 if area >= 30 (max 1); recyclingBins 1 | plantPot 1 if area >= 30 |
| corridor | noticeBoard 1 / 20 m; fireExtinguisher 1 / 25 m; exitSign per exit; signPlate per door | diffuser 1 / 6 m; smoke 1 / 10 m | - | - |
| mailroom | noticeBoard 1 | smoke 1 | lockerBank row 1 (<= 4 modules); shelving 1 row (<= 3) | - |
| store | - | smoke 1 | shelving rows along every free wall run (<= 8 modules) | palletLoadLow 1 if area >= 30 |
| plant | pipeRun rows 1 / wall run >= 4 m (at 2.6); driveCabinet 1; glandPlate 1 | ductRun row 1 | switchgearPanel row 1 (<= 4); coolingUnit 1 if area >= 40 | cableDrum 1 if area >= 40 |
| security, oh-control | noticeBoard 1; wallClock 1 | smoke 1; diffuser 1 | lockerBank 1 (<= 2) | - |
| gatehouse, lab-*, data-hall, cage, noc, mantrap, oh-ante, strongroom | (hero sets, section briefs) | smoke 1 / 50 m2 | - | - |
| dock | noticeBoard 1; fireExtinguisher 1 | ductRun row 1 (at 4.0+) | lockerBank 1 (<= 2); vendingMachine 0 | palletLoad / palletLoadLow 1 / 40 m2 (max 3) |
| ups | glandPlate 1 / 6 m | ductRun 1 | (UPS cabinets: hero skin) | - |
| battery | fireExtinguisher 1 | smoke 1 | (battery racks: hero skin) | - |
| riser | glandPlate 2; cableTray vertical run 1 (flush) | - | - | - |
| oh-formal | portraitFrame 1 / 6 m (max 4); radiatorCast per window | - | bookcase rows on walls >= 3 m without windows (<= 3); sideboard 1; fireplace 1 if the room has a chimney stack in `S5_BOX.chimneys` | wingChair pair 1 if area >= 40 |
| oh-hall | portraitFrame 1 / 6 m (max 6); radiatorCast per window | - | longcaseClock 1 (stair hall only); sideboard 1 | plantPot 1 |
| oh-corridor, oh-service | portraitFrame 1 / 8 m (oh-corridor only); noticeBoard 1 (oh-service only); radiatorCast per window | - | lockerBank 1 (oh-service only) | - |
| oh-kitchen | noticeBoard 1; wallCupboards over runs | - | kitchenRun rows (<= 6 modules); stoveRange 1; fridge 1 | - |
| oh-archive | - | - | shelving / filingCabinet rows on free walls (<= 6) | - |
| ext-carpark | - | - | - | litterBin 1 / 400 m2 (max 3) |
| ext-forecourt, ext-shelter | - | - | litterBin 1; parkBench 1 (ext-shelter, at the back panel) | - |
| ext-service | - | - | wheelieBin row 1 (<= 3) | - |
| ext-verge, ext-garden, ext-jetty | - | - | - | reeds 1 / 30 m2 (max 6; verge, jetty edge only) |
| ext-road, ext-terrace, ext-compound | - | - | - | - |
| roof | - | - | - | acCondenser 1 / 60 m2 (max 4) + roofCowl 1 / 80 m2 (each over a riser: within 2 m of a plant room or stair bulkhead wall) |
| roof-plant | - | - | - | ductRun row 1 between chillers (hung 0.6 over the deck, visual: only in dead space) |
| none | - | - | - | - |

Every room additionally gets: an exitSign over each door whose far side is a corridor, stair or outside; a
fireExtinguisher by the first door (wall, latch side); a signPlate at 2.2 over each door (both faces). These are wall
mounts and obey the wall rules.

### 4.3 Keepouts and clearances (`keepouts.ts`; all plan distances in metres, per storey: y band floor - 0.5 .. floor + 2.6)
| Id | From | Floor props (any box) | Wall props | Ceiling props |
| --- | --- | --- | --- | --- |
| K1 | player route legs (`SectorDef.routes` pts, y interpolated; climbs included) | capsule 1.2 | allowed (flush) | allowed |
| K2 | guard patrol legs (slot -> route points -> slot), reinforce points, `entries` run-ins, stage-action routes, `sweep` points | capsule 0.9 | allowed | allowed |
| K3 | doors (`b.anchors.doors`): the opening plus 1.2 deep each side, width + 0.6; the swing arc r = width + 0.1 | none | none within 0.6 of the opening edge, except exitSign / signPlate over it | allowed |
| K4 | interactables: switches, boards, laser panels, keypads, pair-gate key switches, alarms, intel boards, desks (security), pickups, the objective, the crate (E9, when present) | disc 1.5 | none within 0.6 of the item on the wall | allowed |
| K5 | takedown spots | disc 1.5 | allowed | allowed |
| K6 | hide spots, player spawns, nav seeds, checkpoints, the extract zone box | disc 1.2 (extract: the box) | allowed | allowed |
| K7 | co-op lips (`CAMPUS_COOP_LIPS`): rule 2 (no box with top >= 1.2 within 4.0 of the lip), rule 3 (no box with top 0.6-1.7 within 1.0 of the wall under the lip), the headroom prism (lip top + 0.1 .. + 1.9, 0.9 out) | per the rules | none on the wall under the lip | none in the prism |
| K8 | cameras: every floor point in `inFrame` over the sweep (5 deg steps) and `camRange`, rays from the lens to that point at 0.3 / 1.0 / 1.7 | no box may newly block a ray the greybox left clear | visual pieces > 0.35 in any axis may not cross a ray | same as wall |
| K9 | laser beams (`LaserDef`, each y in `ys`) | tube 0.3 | tube 0.3 | tube 0.3 |
| K10 | lamp fixtures (`LightInit` pos) | sphere 0.5 | sphere 0.5 | sphere 0.5 |
| K11 | traversal anchors: ladders, pipes, ducts, windows, ropes / rappel points, split gaps, ledges in use (`TraversalAnchors`) | 1.0 round each end, tube 0.6 along | tube 0.3 | tube 0.6 |
| K12 | glass boxes (`glass` flag) | 0.5 off the glass | none on glass | none |
| K13 | escape / fire-exit doors (16.4.2) | 1.0 in front, nothing in the escape line | - | - |

Plus the gates that hold globally (ART-KIT tests, section 4.4): nav, cover, M8, A64, light.

### 4.4 The proof - pure tests that fail if a prop blocks a nav cell or a route leg
`tests/campusArtGameplay.test.ts` (ART-KIT, data-driven: dressers never edit it) builds campusOps twice,
`buildCampus(b, { dress: false })` and `{ dress: true }`, and for every section asserts:
1. **Route legs:** every walked leg of every route has a path on the dressed runtime nav grid (`tests/helpers/runtimeNav.ts`,
   the e2e budgets) and its length is within 2% (+ 0.5 m) of the greybox path.
2. **Protected nav cells:** every cell walkable in the greybox grid that lies inside K1-K6 (and K13) stays walkable on the
   dressed grid (it fails naming the cell, the keepout and the box index that took it).
3. **Patrols:** every guard route point is walkable and every guard leg has a path (same as the per-section tests).
4. **Cover:** every greybox cover segment within 3 m of a K1 / K2 leg is unchanged (endpoints within 1 cm); new cover
   segments only where every point is >= 3 m from K1 / K2 legs.
5. **Lips:** `soloJumpThreats` + `soloTopLandingThreats` with 0.5 m extra stay empty for every lip on the dressed boxes;
   the headroom prism is empty.
6. **Cameras and lasers:** K8 ray sets identical (as blocked sets); no box in K9.
7. **Interact reach:** each K4 item is reachable: a nav cell within 1.6 m with a clear segment (no new box) to the item.
8. **M8 and A64:** the section tests' isolation and screen checks rerun on the dressed boxes (they already build through
   `campusOps.build`, which is dressed after ART-KIT: they must stay green with no edit).
9. **Skins:** every skin encloses its greybox box (all axes) and stands <= `PROP_PROUD` off it (listed overhangs excepted).
10. **Rule V:** every visual placement passes rule V.
`tests/campusArtLight.test.ts`: light delta <= 0.02 at protected points (route legs every 1 m, takedown spots, hide
spots, lip tops, vantages named in the section data where present).

## 5. Batches and slices
| Batch | Slice | Model | Brief | Branch (cut from the base below) | Owns |
| --- | --- | --- | --- | --- | --- |
| 1 | ART-KIT | Opus 5.5 | `ART-KIT.md` | `feature/sector-redesign-art` | the kit, catalogues, renderer + World hook, rules engine, keepouts, gates, stubs, Blender kit, K pieces |
| 1 | checker | Opus 5.5 (fresh) | ART-KIT A110-A126 | - | `checks/art-kit-check.md` |
| 2 | ART-S1 .. ART-S5 (parallel, 5 agents) | Sonnet 5.5 | `ART-S<N>.md` | `feature/sector-redesign-art-s<N>` off the ART-KIT head | only `campusS<N>Dress.ts`, `hero_s<N>.py`, `hero-s<N>.glb/.json`, `tests/campusS<N>Dress.test.ts`, `checks/art-s<N>-build.md` |
| 2 | checker | Opus 5.5 (fresh, one for all five) | A127-A152 | - | `checks/art-sections-check.md` |
| 2 | fix rounds | Opus | the checker's must-fix list | the slice branch | up to 3 rounds |
| 3 | integrate + perf | the lead (Opus) + Character Build on the laptop | section 6 | `feature/sector-redesign-art` | `checks/art-perf.md` |

- **Base branch.** Cut ART-KIT from `feature/sector-redesign-p3` (S4 / S5 built; `feature/sector-redesign` is frozen for train 23). Old text, kept for reference: cut from `feature/sector-redesign` once `feature/sector-redesign-s45` (S4 / S5 / E8, 5bee8eff
  or later) is merged into it; until then from `origin/feature/sector-redesign-s45`. Section slices cut from the ART-KIT
  head after its checker passes.
- **Registration.** ART-KIT pre-registers all five dressers in `src/world/maps/campusDress.ts` against stub files
  (`campusS<N>Dress.ts` exporting an empty dresser), so the section slices edit only their own new files and never
  touch a shared line (assumption AS3: the "one registration line" is written once by ART-KIT, not per slice).
- **Parallel safety.** Each hero GLB is its own file, built by its own script; no shared binary changes in batch 2.
- **CPU.** Five Sonnet builders in parallel run vitest one file at a time (`npx vitest run tests/campusS<N>Dress.test.ts
  tests/campusArtGameplay.test.ts -t S<N>`); Blender builds are short (< 1 min each). Respect the desktop CPU cap
  (CLAUDE.md heavy-usage: 3 tsc / vitest agents per session; stagger the rest).


### 5.1 The section slice contract (every ART-S<N> brief adds to it, never loosens it)
- **Files (only these):** `src/world/maps/campusS<N>Dress.ts` (replaces the stub: `S<N>_ART_TAGS`, `HERO_S<N>`,
  `dressS<N>`), `scripts/campus-props/hero_s<N>.py`, `src/world/campusArt/assets/hero-s<N>.glb` + `.json` (built by
  `npm run campus-props:build -- --set hero-s<N>`), `tests/campusS<N>Dress.test.ts`, `docs/sector-redesign/checks/art-s<N>-build.md`.
- **Order inside `dressS<N>`:** (1) skins of greybox objects (`skin`, `skinRow`, `skinCyl`; `skinHide` only where the
  brief says), (2) hero placements (`add`, exact positions from the brief), (3) `d.base()` last, so the base pass dresses
  round the heroes. Find greybox pieces with `boxAt` / `cylAt` at the coordinates the brief gives, or from the section's
  exported constants (`S3_BOX`, `S4_BOX`, `S4_PODS`, `S5_BOX` ...). Never hard-code a `b.boxes` index.
- **Hero pieces:** every H piece in the brief, sizes within 2 cm, tris under budget, one mesh per (piece, material), only
  materials of `CAMPUS_LOOK` / `PROP_LOOK` (no new material without a brief line). `HERO_S<N>` lists them with boxes per
  class (ART-PLAN 2).
- **Budgets per section** (`artCounts`, ART-KIT): <= 40 draws, <= 150 k triangles, <= 2500 placements; the hero GLB
  <= 0.6 MB.
- **Gates (must pass, unedited):** `tests/campusArtGameplay.test.ts -t S<N>`, `tests/campusArtLight.test.ts -t S<N>`,
  `tests/campusS<N>.test.ts`, `tests/campusRuntimeNav.test.ts`, `tests/campusArtKit.test.ts`; then `npm run check`. A gate
  failure is fixed by moving or dropping the dressing, never by editing a gate, a section builder or a test.
- **Own test** `tests/campusS<N>Dress.test.ts`: every room of `S<N>_ROOMS` has a tag; every brief skin target is skinned
  exactly once; every hero placement exists at its brief position (5 cm, yaw exact); the hero report vs `HERO_S<N>`
  (tris, materials, footprints, solid boxes 1 cm inside the skin); section budgets; `d.check()` empty; `report.dropped`
  printed (not asserted).
- **Report** `checks/art-s<N>-build.md`: placements by piece, dropped by rule, draws / tris, GLB bytes, test counts, L-log.
- **Never:** edit `campusS<N>.ts` or any other shared file, add or move a lamp, switch, door, anchor, item or guard, or
  write a box a brief does not name. E2e is the lead's (batch 3).

## 6. GPU perf pass and e2e (batch 3, laptop, `E2E_GPU=1`, Character Build)
Never from SwiftShader; cloud / desktop software GL marks every line "pending PC run".
1. Build: `npm run build` at the integration head (all five sections merged into `feature/sector-redesign-art`).
2. **Shots / contact sheets** (`scripts/campus-art-shots.mjs`, ART-KIT writes it from `scripts/sector-lights-shots.mjs`):
   35 fixed views (7 per section, listed in each section brief "Views"), Epic, vision off, photo-freeze, 960 px webp,
   `before` (a build of the commit ART-KIT was cut from: pure greybox; the script is copied into that worktree
   untracked for the run) and `after` (the integration head); `--sheet` writes `docs/sector-redesign/art/sheet-s<N>.webp` (before | after per view). It also prints per
   view: draws, triangles, active meshes and the `meter field` probe (feet + 1.0 at the view's player point): every probe
   within 0.02 of before (light parity, as marlow-final S9).
3. **Perf:** `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=campus --counts=0,12,24` on the same two
   builds, before and after (ART-KIT adds the `campus` row to `MAP_Q`: `autostart=campusOps&mode=sector&sectorGuards=0`, the S2 atrium spawn
   via `&debugSpawn=s2` if guard-cap's spot flag needs it - the lead checks the flag name at run time). Budgets (A153):
   - draws added at any of the 35 views <= 70; triangles added <= 0.35 M; total draws <= 600 / triangles <= 8 M per frame;
   - guard-cap GPU ms after - before <= +0.8 ms at 0, 12 and 24 guards (patrol / facing), frame median <= +1.0 ms;
   - `perf.mjs --desktop --budget` with `MAP=campusOps MODE=sector` (ART-KIT adds the `MODE` env, default unchanged)
     passes its existing budgets (<= 520 draws, <= 1.7 M triangles at 640 x 360).
   Over budget: the lead's first levers, in order: drop `minor` visual pieces (< 0.4 m) beyond 25 m via the per-section
   merged mesh split (`small` meshes with `addLODLevel(25, null)`), merge more pairs, cut H tris. Never cut a box.
4. **e2e** (all `E2E_GPU=1` on the laptop): `e2e-sectorops:6` (campus part, every section block), `e2e-coop`,
   `e2e-netmove`, `smoke`; then `npm run e2e` (full) before the PR to the train. Unit: `npm run check` (lint + vitest +
   build).
5. Report `checks/art-perf.md`: before / after tables, sheet paths, verdict per budget.

## 7. Acceptance index (detail in the slice briefs)
- A110-A126 ART-KIT. A127-A152 sections (S1 A127-A131, S2 A132-A136, S3 A137-A141, S4 A142-A146, S5 A147-A151, all
  sections A152). A153-A157 the perf pass and integration:
- **A153** Perf budgets of section 6.3 met on the laptop, recorded in `checks/art-perf.md`.
- **A154** 35 views before / after shot, five sheets committed (webp, <= 400 KB each), meter probes within 0.02.
- **A155** `e2e-sectorops:6`, `e2e-coop`, `e2e-netmove`, `smoke` GPU green at the integration head; full `npm run e2e`
  green before the train PR.
- **A156** Docs: `CHANGELOG` fragment (`changes/feature-sector-redesign-art.md`), `TESTING.md` "Campus art" desktop
  checklist (walk each section at Epic: nothing snags, no prop hides a prompt, a cut circuit dims screens), 
  `docs/systems/world-and-characters.md` "Campus art kit" section, `docs/sector-redesign/STATE.md`.
- **A157** No file outside the slice ownership lists changed (the checker diffs each branch).

## 8. Assumptions (logged, undoable; for Michael's review)
- **AS1** marlow-final's kit (`src/world/kit/*`, `src/world/props/*`, `scripts/facility-*`, the `MapLayout.facilityProps` /
  `kit` hooks) is not on master or our branches yet (906065e4, no PR). If it is on master when ART-KIT starts, ART-KIT
  merges master. If not, ART-KIT ports the exact files from 906065e4 unchanged (listed in ART-KIT step 1) so the later
  master merge is identical content. Undo: drop the ported files, campus draws K / H only.
- **AS2** Props that hold space write their own collision (marlow-final's PA1 rule): new floor props change nav, cover and
  the bake, so they go only into dead space under the K1-K13 keepouts and the section 4.4 gates. Undo: `dress: false`.
- **AS3** The dresser registration is pre-written by ART-KIT with stubs (no per-slice shared edit).
- **AS4** Foliage and reeds outside stay under 0.5 m (rule V) or carry a see box: no "hide in the reeds" look the guards
  ignore. The verge's hide spot stays a hide spot item. Undo: give reeds a see box and raise them.
- **AS5** Finishes recolour greybox boxes (so `?gfx=min` and the fallback look more like the final palette). Footstep
  surfaces never change. Undo: skip `applyFinishes`.
- **AS6** No CC0 textures in this lift (factor-only materials, as marlow-final). A texture pass would be its own slice.
- **AS7** Lamps and their fittings stay the light rig's (`fixtureModels.ts`); dressing never skins a lamp, the S5
  chandelier included.
- **AS8** The strongroom vault leaf stands open as a see piece where the keepouts allow (ART-S5); if no spot passes, the
  frame alone is dressed and the leaf is left out (logged).
- **AS10** Box-hidden skins (cars, the S5 van H5 `panelVan`): the box stays the gameplay shape; the picture shows the car, whose
  bonnet and boot are lower than the box ends (safe direction only, ART-PLAN 2). Undo: draw the boxes (no hide), or
  replace the boxes with car-shaped ones (a gameplay change: Michael's call).
- **AS9** Room tags live in the section dress files (`CAMPUS_ART_TAGS`), not on `RoomDef` (no shared type change).

No question blocks the build; each assumption above is applied and listed for the morning review.
