# Sector Ops Warehouse layout review (2026-10-20, orchestrator review, suggestions only)

Michael: "review sector ops and decide how the layout can be improved to allow more realistic, believable pathways and
layout. I want to make the entire map and each section larger with more obstacles/routes, and make the warehouse size
more believable." / "Make suggestions only for warehouse".

## 1. Size: today, real reference, proposed
| | Today | Real (rules of thumb) | Proposed |
| --- | --- | --- | --- |
| Map | 48 x 44 = 2,112 m2 (Dust Depot 72 x 72, Refinery 68 x 60) | - | 96 x 92, ~8,800 m2 |
| Building | 48 x 36 = 1,728 m2, eaves 6.0 (small trade unit) | regional DC 4,000-10,000 m2, clear height 9-12 m | 84 x 56 = 4,700 m2, eaves 10, roof steel underside 8.5 |
| Structure | single span, no columns | bays 12-16 x 15-18 m, columns in rack rows | two 28 m spans, columns every 16.8 m, valley column line |
| Racks | tops 4.0, aisles 3.0, VNA 1.8 | double row 2.4 deep; reach aisle 2.8-3.2; VNA 1.7-1.9 | beams 1.5 / 3.0 / 4.5, top loads 6.0; module 5.6 m; VNA 4.2 m |
| Docks | 3 shutters at grade | ~1 per 600-900 m2, 2.4-2.7 x 3.0, floor 1.2 above yard, 1-2 drive-ins | 8 dock doors (4 in, 4 out) + 1 drive-in; yard at -1.2 |
| Truck court | 48 x 8 | 35-40 m, gatehouse, sprinkler tank, pump house | 32 m + 6 m west fire road |
| Offices | single storey 16 x 9 | two storeys at the front corner, overlooking the floor | 16 x 14, 2 storeys (3.3 each), roof plant deck 6.6 |

Per section: S1 880 -> ~2,100 m2 (2.4x); S2 480 -> ~1,800 (3.75x); S3 750 + 168 deck -> ~2,750 walkable (3.7x).
Why: guard focus sight 25 m (12 peripheral), so ~50 m halls mean no guard sees a whole space; patrol legs of 15-18 m at
0.9 m/s fit 25-45 s cycles, so racks split by a cross aisle every 15-18 m. Fallback if the perf run says no: scale
everything by 0.8 (building 67 x 45, map ~78 x 74).

```
z36 +---- rear strip: sprinkler tank, fire exits ---------------------------------+
    | S2 BULK STORE 50x36        F| S3 PICK MEZZANINE (decks 3.3 / 6.6)           |
    | block-stack|3 reach |4 VNA  | pick shelving, conveyor spine, pallet lift,   |
    | returns    |aisles  |gated  | 2 stairs; under it: pack benches, sorter      |
    |............ cross aisle on the valley columns .............................|
    | rack repair|        |       |                                               |
z-10+=====F= fire wall + shutter =+======================= dispatch lanes =+------+
    | S1 GOODS-IN staging | charge|  S3 dispatch marshalling                |OFFICE|
z-24+=D1=D2=D3=D4=[drive-in]======+=D5=D6=D7=D8=============================+=entr=+
    | S1 TRUCK COURT: trailers on D1/D3, shunter, gatehouse, pump house | fence |
z-56+--------------------------------------------------------------------------+
   x-48                         x8.4                                     x42  x48
```
F = fire doors (the section connectors C2, C3).

## 2. Pathways -> stealth routes
Real flow: truck -> dock leveller -> goods-in staging (15 m) -> reach truck to racks -> pick (VNA / mezzanine) ->
conveyor -> pack -> dispatch -> outbound dock (U-flow, both docks on the front wall). Forklift gangways front / rear and
cross aisles; a vented charge room; painted pedestrian walkways; VNA aisles gated (light curtains); 2 stairs per
mezzanine; a pallet lift; fire exits in every long wall; fire shutters closed at night with a pedestrian fire door
beside each (the connector); sprinkler mains, roof hatch via caged ladder in a plant area, office ducts, cable trays.
- Ground: dark aisles between lit pick faces, staging lanes, block stacks.
- High: top loads at 6.0 (co-op rope / solo rolling ladders), aisle-tie beams at ~7 m hand over hand, mezzanine 3.3 /
  6.6, office plant deck 6.6, sprinkler mains 8.0.
- Service: empty bottom rack bays (1.5 m) as crouch "rack tunnels" guards cannot follow (nav needs 1.7 m); under raised
  conveyors (1.5 m); office duct from a plant shaft (G56); under backed-on trailers.
- Co-op: boost to the 4.5 beam, human ladder / rope to top loads, hang-down from the mezzanine, one holds a VNA light
  curtain jammed while the other goes in; every co-op surface also has a solo way (LD 11.4).

## 3. Obstacles, guard jobs, light
Obstacles: rack runs, 3-high block stacks (3.6 m), wrapped loads, parked forklifts / pallet trucks with charge stands,
mesh returns cages (block movement, not sight), rack-repair bay with a scaffold tower, conveyors and spirals, pack
benches, stretch-wrap turntables, dock levellers (1.2 m edges), columns with impact guards, glazed goods-in office pod.
Guard jobs: forklift put-away loop, VNA operator in his aisle, cycle-count stocktaker, dock pair unloading (talking),
shunter checking seals, security tour clocking fire exits, office watcher at the first-floor glazing, CCTV operator,
roof / plant-deck check.
Light: only working zones lit (dock door in use, staging lane, aisle being picked, pack benches, offices); elsewhere
emergency level with green exit signs; narrow-beam aisle cones hung at 8 m keep the top loads dark (needed until G44
limits guard sight upward).

## 4. Sections
- S1 truck court + goods-in (10 guards). Start: dark SW fire road. Objective: inbound manifest terminal in the goods-in
  pod. Exit: C2 fire door. Routes (rejoin at the office, 2 ways to C2): ground (fire road, under the D1 trailer, dock
  edge, in at half-raised D2, behind staging); high (downpipe or boost to the 4.5 dock canopy, trailer roof, high
  louvre, charge-room roof 3.3, drop to staging); service (pump house, tank, sprinkler valve room, charge-room extract
  duct); loud (drive-in shutter or drivers'-room window). Guards: gate officer, yard tour, shunter, dock pair, checker,
  forklift loop, charge hand, smoker, CCTV. Light: gate floods, D2 work lamp, office pod spill; fire road, under-trailer,
  canopy top dark.
- S2 bulk store (11 guards). Three 16.8 m bays: west block-stack field, returns cage, rack repair; middle 3 reach aisles;
  east 4 gated VNA aisles (L14); one cross aisle. Objective: a flagged pallet at beam 4.5 (vertical play). Routes:
  ground (block-stack maze, dark aisles), high (rolling ladder / scaffold, top loads, aisle-tie beams), service (rack
  tunnels, VNA split-jump hide); all rejoin at the C3 fire door, 2 approaches. Guards: 2 reach drivers, VNA operator,
  2 pickers, stocktaker, cage keyholder, rack inspector, security tour, battery-swap pair.
- S3 pick mezzanine, dispatch, offices (12 guards). Objective: server room on the office first floor. Exit: a trailer at
  D8 or the staff door. Routes: ground (under conveyors, pack benches, wrapped lanes, office ground floor); high (deck 2
  at 6.6, office plant deck, air-handling duct from its plant shaft to the server-room ceiling grille); service
  (pallet-lift shaft ladder, conveyor bridge into the glazed first-floor corridor); loud (reception door). Guards:
  2 pickers, pack pair, sorter operator, dispatch loader loop, shift manager at the glazing, CCTV / IT, night
  receptionist, security tour, cleaner, deck loader.

Level standard: keep L1-L16; new loosenings for Michael: L17 hall ceiling 9-10 m (scale sheet says 4.5-6.0); L18 tour /
forklift loops 45-90 s with 2+ stops (LD 4.3 says 25-45 s); L19 dock doors 2.7 x 3.0, drive-ins 4 x 4.5 (sheet roller
door 3 x 3); L20 straight aisle runs up to 18 m, darkness as cover (sheet says 12 m); L21 top pallet loads walkable
(LD 2.2 licence); L22 navLayers 5 (as Fallow).

## 5. Effort and risks
| Step | Hours |
| --- | --- |
| Massing prototype first: shell, column grid, roof with collision, truck court, docks, a parameter-driven rack generator; walked in Free Roam behind a flag so Michael judges the scale | 10-14 |
| S1 rebuild (build sheet, greybox, lamps + light test, guards, e2e routes) | 25-30 |
| S2 rebuild | 20-26 |
| S3 rebuild (mezzanine, offices, conveyors, lift shaft) | 30-40 |
| Total | 85-110 |
Art / dressing later (warehouseArt rack bays; the cloud warehouse-lamps roof and lamp work).
Risks: nav grid 96 x 92 at 0.5 m x 5 layers ~170k cells (~3.5x today; flow fields span the whole map: a per-section nav
bound is engine work); light bake time and the 8-lamps-per-column cap (S1 already lost an exit sign); S1-S3 light tests
rewritten; guards 10-12 per section within SECTOR.maxAlive 32 but the PC perf run (G187) is pending; e2e-sectorops' 9
routes rewritten, connector-only checks need parapets / noLedge near 6 m tops; high routes rely on darkness until G44;
moving shutters and motion-sensor aisle lights (E1, G47) are not built but would suit this map.
