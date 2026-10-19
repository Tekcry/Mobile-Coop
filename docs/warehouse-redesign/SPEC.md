# Warehouse - Sector Ops redesign spec (step 3) - DRAFT

Spec writer, 2026-10-20. Stopped early: the account is close to its limit and the job lead paused the job for the night.

**State of this draft**
- Done: the building (1), section 1's design (2.1), engine fit (3), loosenings (4, also in BRIEF), the decisions the
  job lead must make (6).
- Mostly done: the section 1 build sheet (5). Every coordinate is worked out, but **nobody has checked it against
  the code or run the checks**. The implementer must confirm every call signature (levelBuilder.ts:124-394), then run
  `npm test` (the sectors, sectorStep3 and rooms suites) and `e2e-sectorops` before calling it done.
- Outline only: sections 2 and 3 (2.2, 2.3). They stay as built tonight (M2).
- Missing: the element register (cut, loosening L9), and the ASCII plan has no scale.

Authority: BRIEF M1-M4. Inputs: REVIEW.md (`W` = warehouse.ts, `O` = warehouseOps.ts, `S` = warehouseSectors.ts,
`LD` = docs/level-design.md). Frame: x runs west to east, z south to north (+z is north), y is up, all in metres.
Yaw 0 points along +z. Camera `facing` is in degrees, with 0 = +z.

Template note: this reworks the existing Warehouse map, so the template's fixed sections "Originality" and
"existing systems only" do not apply in full. The phases are replaced by tonight's greybox step. The only code
outside the map is the check change C1 and the optional wiring N1 (section 6).

---

## 1. The building

**Brief.** A 1990s steel portal-frame trade-distribution unit, 48 x 36 m, on an estate. The wholesaler has
goods-in, trade-counter offices and a fitting workshop along the yard (the front band). Behind the band are a
storage hall (racking) and an assembly hall with a rear mezzanine and offices. Tonight the night shift is a
goods-in checker, a forklift driver and a clerk, waiting for a delivery due at 03:00. That is why shutter W is left
part-raised. A contracted security crew is also on site: gate officer, yard patrol, CCTV operator and office patrol.

**Structure.**
- Single-span portal frames span the 36 m north-south. Frames sit at 8 m centres along x: x = -24, -16, -8, 0, 8,
  16, 24. There are no internal columns.
- Eaves are 6.0 m, with the roof sheet at 5.8-6.0. Rafters (visual) are 0.5 deep at y 5.5-6.0 on the frame lines.
- The yard is z -26 to -18. Its south side is the boundary wall (map edge, a rail embankment beyond). The vehicle
  gate is at x 3.5-9.5 and the gatehouse is east of it.
- The front band (section 1) runs along z -18. The entrance is a personnel door at x -5 into the trade-counter
  reception.
- The office block sits between frame lines x -8 and 8. It is single-storey: a 1.6 m services void runs over its
  corridor half, and a plant deck sits over its south offices.
- Fire compartment walls are full height (6.0 m) and carry a parapet 1.5 m through the roof. They run along
  z -6 (x -24 to -4), x -4 (z -8.8 to -6) and z -8.8 (x -4 to 24), and separate the front band from the halls. The
  section connectors are fire lobbies or offices in those walls.
- Fire exits: the front band exits to the yard. The halls' exits are in the gable and rear walls (sections 2 and 3,
  later).
- Services: a sprinkler pump house in the yard feeds a valve set in the workshop, with mains hung under the roof.
  An office AHU on the plant deck has ducts in the void. A crane in the workshop has a runway maintenance walkway.

```
 z  -6 +=====================================+ x-4   (S2 storage hall beyond z -6; S3 assembly hall beyond z -8.8)
       | GI office (win) | C2 lobby |charging|
 z-8.8 +----d-----w------+--[N]-----+ open   +====+====================================================+
       |                            | comms | WC |  mess (h2)  |=== catwalk 3.0 ===========================L|
       |      GOODS-IN BAY          +--d----+-d--+------d------+                                           |
 z-12  |      x -24..-8             D corridor (h1)              D    WORKSHOP x 8..24     beam x 9.8      |
       |   [E lane pallets]         +--d--------+---d------+--d--+                         lathe  bench     |
       |   [W lane pallets] wrapper | reception | transport| security (DVR, hatch)  ladder  bench      cage |
 z-16  |  desk                      D  counter  |          |                     lockers                  |
 z-18  +===[SHUTTER W]====[SHUTTER E]====[E]====[w1.2]=====[w6.0]=+==[d11]==[SHUTTER 13-17]==[pump house]===+
       |  skip    pallets  shelter                (cam-yard)                     van                         |
 z-22  |               [=========== trailer x -11.4..2.2 ===========]  officer  [gatehouse]                  |
       | START (-20,-24.6)  ......dark lane z -26..-24.6......    [== gate x 3.5..9.5 ==]                   |
 z-26  +---------------------------------------------------------------------------------------------------+
     x -24          -16            -8      -4      0      4      8              16                       24
```

Heights: roof 6.0. Plant deck 3.3. Void floor 3.0, clear to 4.6. Lobby-block roof 3.2. Catwalk 3.0. Pump house
4.3. Trailer bed 1.3, top 4.0.

## 2. The sections

### 2.1 Section 1 - Goods-in and trade offices (build tonight)

**Objective.** Download the security DVR (footage and codes) at (3.95, 0, -15.0) in the security office. It takes
10 s within 4 m in plan, with feet within 2 m of y 0, so it also works from the corridor, the workshop's west end or
the yard outside the window.

**Entry and exit.**
- Start: the yard's dark south-west corner, (-20.0, 0, -24.6), yaw 0.5.
- Exit: C2, the fire lobby in the lobby block. Near door at (-14.5, -8.8), far door at (-14.5, -6) into section 2.
  The checkpoint stays (-14.5, 0, -7.2, yaw 0), so section 2 is unchanged.
- The objective sits mid-east and the exit north-west, so the way out is a different path, not a backtrack.

**Critical path.** Yard, under shutter W, the bay, reception, the corridor, the security office, back down the
corridor's west door, the bay, C2.

**Routes** (the data is in 5.6).

| # | Kind | Way in | Way out |
| --- | --- | --- | --- |
| R1 | Ground / shadow | Crouch under shutter W (1.5 m gap), staged pallets, reception's bay door, behind the counter, corridor, security | Corridor west door, bay, C2 |
| R2 | High | Drainpipe x -22.4, roof, roof hatch ladder to the plant deck (east part), drop through the security ceiling hatch | Cabinet back up through the hatch, deck, roof, west to the smoke vent, drop to the lobby-block roof, drop at C2 |
| R3 | Service | Lane behind the trailer, past the gate, workshop door, east end ladder, catwalk, void, drop through the mess hatch (onto the CCTV operator at the kettle), corridor, security | Corridor west door, bay, C2 |
| Loud | - | Breach the entrance door (x -5), or rappel at x 1.2 and break the transport window | - |
| Co-op extras | - | See section 3 | - |

**Loops.** Two loops:
- Yard, bay, reception, corridor, workshop, yard.
- Bay, reception, corridor, bay.

**Stealth tools.**
- Pipes:
  - Drainpipes at x -22.4, 8.6 and 22.6, all climbable to the roof (LD 2.5).
  - Bay sprinkler main at y 5.0 along z -17.0, from x -6.8 (over the deck) to x -23.4.
  - Workshop branch at y 4.7 along x 12, from z -10.35 (the catwalk edge) to z -17.4.
- Crawl spaces:
  - The office void, 16 x 5 m, clear 1.6 m, so guards cannot enter (nav needs 1.7).
  - Under the trailer, 1.3 m.
  - Under shutter W, 1.5 m.
- Hatches (drop down):
  - h1 over the corridor's west end.
  - h2 over the mess kettle.
  - The security ceiling hatch, which is two-way via a filing cabinet.
  - The roof hatch.
  - The smoke vent over the lobby-block roof.
- Ledges with a reason:
  - The lobby-block roof edge (3.2) and the plant-deck edges (3.3): office roofs, solo wall jump since a wall is below.
  - The catwalk edge (3.0): no wall below, co-op leg-up.
- Dark pockets:
  - Shutter W front (its lamp is out) and the lane behind the trailer (ambient 0.17).
  - The bay's south-east corner by closed shutter E, and the north-west corner behind the goods-in office.
  - The plant deck, the void and the catwalk; the workshop (only an exit light).
  - The transport office and the comms room.
- Lit:
  - The W lane (work), the goods-in office (spills through its window) and the corridor.
  - The security office (monitor glow) and the mess.
  - The entrance and shutter E floodlight, and the gatehouse door.
- Devices:
  - cam-yard: on the facade at x -8.4, sweeping the entrance and the shutters.
  - cam-bay: on the bay's west wall at z -9.4, sweeping the W lane and the crawl landing.
  - Workshop beam at x 9.8 across the whole workshop. It forces the catwalk, the jammer or the corridor.
  - Plant-deck beam at x -1.0. It splits the deck into the bay side and the roof-hatch side.
  - Alarm panel: unchanged, (-4.15, -8.2), in the charging bay.

**Guards** (8; no heavies, dogs or snipers, G155; listed in the order `?sectorGuards=4` takes them). Cycle = walk at
the archetype speed plus pauses. Today sectorMode passes only `wait`, so `waits` and `faces` need N1.

| # | Kind | Post / route | Reason | Cycle | Isolation moment |
| --- | --- | --- | --- | --- | --- |
| 1 gate | officer | Post (9.0, -22.4), yaw -2.53, facing the gate | Gate control; the 03:00 delivery | post | While the yard patrol is at its west end (over 15 m away) |
| 2 yardPatrol | runner | (10.5, -21.0) to (-6.5, -19.6) and back, wait 3 (waits 4, 4; faces pi, 0) | Gatehouse to front entrance: checks the entrance lock and the security window | about 32 s | West end, facing the door. The trailer covers the approach; the shelter's east panel blocks the smoker; cam-yard sweeps |
| 3 checker | officer | Loop (-21.6, -15.6) desk, (-11.2, -15.4) E lane, (-19.0, -9.9) office door; wait 4 (waits 5, 4, 4; faces -pi/2, 0, 0) | Checks staged pallets against delivery notes | about 43 s | At the E lane: the dark south-east corner, pallets screen the driver, the office wall screens the clerk |
| 4 cctv | officer | Loop (4.7, -16.2) monitors, (3.6, -12.3) corridor, (2.6, -9.9) kettle; wait 5 (waits 6, 1, 6; faces -pi/2, -pi/2, 0) | Watches the monitors, makes tea | about 31 s | At the kettle, under hatch h2. The office is empty about 12 s per cycle |
| 5 driver | grunt | (-9.6, -9.4) charger to (-18.2, -11.9) W lane and back, wait 5 (faces 0, pi) | Checks the forklift charge; waits at the raised shutter for the truck | about 30 s | At the charger, under the lobby-block roof edge (drop attack); pallets screen the checker |
| 6 smoker | grunt | Post (-13.4, -20.5), yaw 0.6, in the shelter (open north, panels S/E/W) | Break, waiting for the delivery | post | Always out of the yard patrol's sight (east panel). The gate officer is far |
| 7 clerk | grunt | Post (-22.6, -7.0), yaw about 2.6, at the goods-in office window | Paperwork; watches the W lane | post | When the checker is at the desk or the E lane |
| 8 officePatrol | enforcer | (-7.0, -12.3) to (7.0, -12.3) and back, wait 4 (faces -pi/2, pi/2) | Night tour clocking the two fire doors | about 43 s | West end, facing the bay door, under hatch h1, while the CCTV operator is at the monitors or kettle |

- Cycles are within LD 4.3 (25-45 s).
- Takedown spots (data, within 1.6 m of the route) are the isolation spots above.
- These guards pass M8 **only with C1** (isolation in time). The static check fails for any open yard, because the
  patrol's whole route counts. Do not add filler blocks to pass it (section 6).

**Connector.** C2 box [-16.25, -8.55, -12.75, -6.25], checkpoint (-14.5, 0, -7.2, yaw 0), label "Into the fire
lobby". Reinforcements come in at the gate: (5.0, -25.0) and (8.0, -25.0), 2 per stage.

### 2.2 Section 2 - Storage hall (outline; stays as built tonight)
- Real racking: double rows 2.3 m deep, 4.5 m tops, running north-south.
  - Wall row x -24 to -22.9; aisle A1 3.0 m.
  - Row R1 x -19.9 to -17.6.
  - **VNA aisle A2, 1.8 m (split jump: racks over 3.6 m, 1.2-1.95 m apart).**
  - Row R2 x -15.8 to -13.5; aisle A3 3.0 m.
  - Row R3 x -10.5 to -8.2.
  - East gangway 4.2 m.
  - Gangways south (z -6 to -3), north (z 15 to 18) and a cross aisle (z 4 to 7). No fixed ladders: two rolling
    platform ladders (`ladder` 0 to 4.5) at rack ends.
- Objective: the case in a mesh cage (`fence`) at the north-west end.
- High route: rack tops, plus sprinkler mains at y 6.1 across the aisles (1.6 m above the tops, hand over hand).
- Co-op: boost onto any rack top (4.5).
- Lights: lamps over the gangways, aisles dark.
- Guards (about 9, no heavy; replace S:89's heavy with an enforcer):
  - reach-truck driver (C2 to the cross aisle)
  - stocktaker (U-route A1 north, A3 south)
  - cage officer (post)
  - tour guard (gangway loop clocking the west fire exit)
  - two pickers (north gangway)
  - battery-room grunt
- C3 stays the "stock control office" (O:43, S:69-76).
- Needs loosening L11 (entry vantage per aisle).

### 2.3 Section 3 - Assembly hall, mezzanine and rear offices (outline; stays as built tonight)
- The mezzanine becomes a steel deck at 3.3 on columns at 4 m along z 12, over the whole rear block, with offices
  under it at the west and parts storage at the east.
- Rails are visual-only (guards never drop over 2.2 m). Add a two-flight stair (0.183 / 0.28) and a pallet gate.
- The hack terminal moves into an enclosed goods-out office on the deck.
- Crane runway walkway along z -8.8 at 3.0, mirroring section 1's catwalk. A sprinkler main runs from the plant
  room at 5.0.
- The plant room (south-east) gets 2 doors, and an HVAC duct (auto-crawl allowed, G56: it starts in the plant shaft)
  to a grille over the manager's office.
- Extraction moves to the east fire-exit lobby (the freight lift is retired).
- Stores cage as mesh.
- Remove the indoor sniper (S:132) and the heavies (S:127, S:134).
- Guards (about 10):
  - line supervisor
  - fitter at the press
  - crane operator (walks with the pendant)
  - stores officer
  - plant engineer's round
  - goods-out clerk (post on the deck)
  - deck loader
  - manager (post)
  - tour guard clocking the east fire exit
  - forklift driver

## 3. Co-op extras (section 1)
Each one is optional, and each surface also has a solo way (LD 11.4).
- Leg-up onto the charging bay's open front (3.2). Solo: wall jump at the lobby-block wall.
- Leg-up onto the catwalk anywhere (3.0). Solo: the east ladder.
- Leg-up into hatch h1 from the corridor (3.0). Solo: deck or catwalk into the void.
- Leg-up from the lobby-block roof to the roof through the smoke vent (2.8). Solo: drainpipes.
- Boost onto the pump house (4.3), then jump-grab the eaves (1.7).
- Two-person rope at the eaves (6.0, within `ropeMax`; E6 is avoided because the roof is at 6.0).
- Hang-down from the eaves into the yard, or from the deck edge into the bay.
- The trailer is marked `noLedge`, so co-op cannot reach a surface solo cannot.

## 4. Level-standard loosenings (M3) - also in BRIEF.md

| # | Rule | What | Why | Undo |
| --- | --- | --- | --- | --- |
| L1 | LD 3.2 (LD:32) three routes plus a secret per guarded space | Counted per section (objective and exit), not per room | Per room multiplies routes in small rooms | Add the missing route kinds per space |
| L2 | LD 3.3 (LD:36) rejoin before the next space; no route skips a space | Routes rejoin at the objective room and the connector only | R2 and R3 skip the bay floor, yard and reception by design (sandbox) | Add pinch points per space |
| L3 | LD 16.2.1 (LD:305) storeys joined only by stairs or plant-space ladders | Fixed caged ladders: workshop to the plant deck, and the crane walkway ladder | Real warehouse practice for plant decks and crane access | Replace them with a stair |
| L4 | LD 16.2.5 (LD:309) roof access by stair bulkhead or fire stair | Roof hatch with a fixed ladder from the plant deck | Real practice on industrial units | A stair bulkhead |
| L5 | LD 16.7.4 (LD:345) never an opening that pops into a room | Ceiling access hatches h1, h2 and the security hatch | The CT ceiling entry; real void access points | Remove the hatches |
| L6 | LD 16.7.5 (LD:346) ducts only in walls, slabs or voids | Sprinkler mains (and a visual AHU duct) hung under the roof at 4.7-5.0 | Warehouses hang services exposed; above any accidental mantle | Remove the pipes |
| L7 | LD 16.7.3 (LD:344) crawls 1.5 m clear | Void openings 1.3-1.4 m clear from the deck and lobby roof; under the trailer 1.3 m | The void must stay under 1.7 so guards stay out; a trailer bed is about 1.3 | Raise the openings to 1.5 and drop the trailer crawl |
| L8 | LD 11.3 / 11.5 (LD:117, LD:122) co-op lips 4.3-4.5, every lip in the band planned | With G151, any 2.4-4.6 m lip with no wall below (no solo wall jump) is a co-op target if its surface is also solo-reachable (11.4 kept) | G151 replaced marked spots (G81); the doc still cites G81 | Restrict co-op targets to 4.3-4.5 |
| L9 | LD 16.9, 13, 14 (LD:354-361, LD:195-271) register, deliverables, phases | Greybox prototype: this spec's tables stand in for the register; ASCII plans; one greybox step | Prototype for Michael's morning judgement (CLAUDE.md current goal) | Produce the full set before a final build |
| L10 | LD 15 (LD:273-285) acceptance tests | Only e2e-sectorops and the Vitest checks; the solo ghost run is Michael's playtest | Most need the finished build | Run the full section 15 set |
| L11 | LD 3.1 (LD:30) one entry vantage sees every guard | Section 2 (later): a dark vantage per aisle end; every guard readable from at least one | A racked 20 x 24 m hall cannot show 9 guards from one spot | One vantage per space |

Kept (they fix M1): LD 2.2, 2.5, 3.4, 4.1, 4.3, 4.4, 16.4.1, 16.5.1 (the section 1 roof is now solid with only
real openings), 16.6.1.

## 5. Section 1 build sheet (check every value against the code first)

### 5.1 How it plugs in
- `src/world/maps/warehouse.ts`: add `WarehouseOpts.southBand?: boolean` (default true, so the plain Warehouse is
  unchanged). When it is false, `buildWarehouse` skips:
  - W:165-177 (facade, windows, lintels, posts)
  - the z -6 wall and the hatch (W:181-187)
  - W:188-194 (the z -11, z -8.8 and x 6 walls and the dispatch window)
  - W:199-227 (dock, dispatch and workshop contents; corridor pipes)
  - the doors at W:327-329
  - W:331-349 (dumpster, cabinet, yard, lane zone)
  - the lamp rows z -15 and -9 in W:358-364
  - W:366-368 (floodlights)
  - W:383-396 (walkway, drainpipe, rappel, pump house, fire walls) and W:400 (fence). **Keep W:398-399**: that is
    section 3's deck pipe.

  It starts the x -4 wall (W:180) at z -6. Add a Vitest check that the plain `warehouse` box count is unchanged
  (capture the number first).
- New file `src/world/maps/warehouseS1.ts`: `buildServiceS1(b)` holds everything in 5.2-5.4, plus the exported data
  `S1_ROOMS`, `S1_SWITCHES`, `S1_PICKUPS`, `S1_HIDESPOTS`, `S1_SPAWNS` and `S1_NAV_SEEDS`.
- `warehouseOps.ts`:
  - Options become `{ southBand: false, gapsX4: [[14, 15.1]], gapsZ12, officeSwing, officeDesk, extra }`.
  - In `opsPieces`, delete C2 (O:34-40) and the section 1 pieces (O:46-52), and call `buildServiceS1(b)` first.
  - `OPS_DOORS.c2Near` becomes `[-14.5, -8.8]`.
  - Layout:
    - rooms: the base rooms minus `dock`, `dispatch`, `workshop` and `corridor`, plus `S1_ROOMS` (squads empty)
    - playerSpawns: `S1_SPAWNS`
    - enemySpawns: base, filtered to z >= -6
    - props, pickups, hideSpots and switches: base items with z >= -6, or x > -4 and z >= -8.8; plus S1's
    - objectives: drop `termB` and `extract`
    - navSeeds: add `S1_NAV_SEEDS`
- `warehouseSectors.ts`:
  - section 0 from 5.6
  - cameras `cam-dock` and `cam-workshop` become `cam-yard` and `cam-bay` (5.5)
  - lasers `laser-corridor-w/e` become `laser-workshop` and `laser-deck`
  - the alarm panel is unchanged
  - Counts stay cameras 2/2/3 and lasers 2/1/2.
- Tests:
  - `tests/sectorStep3.test.ts:85`: `SECTION_ROOMS[0]` gets the S1 room ids (5.4).
  - `tests/sectorStep3.test.ts:52` uses the literal 'cam-dock' only as wire data (no change needed).
  - `tests/sectors.test.ts` M8: C1 (section 6).
  - Other S1 asserts already hold: 8 guards (at least 8 and no more than section 2's 10), all at least 7 m from the
    start, routes, door centres.
- `scripts/e2e-sectorops.mjs`: no logic change. The optional shot `s1-start` moves to (-20, 0, -24.6). Section 1
  must pass the nav-legs, seal and reach checks without filler; climb legs are listed in `climbs`.

### 5.2 Walls, slabs, roof
Walls are 0.3 m thick on their centre line. `wallX(z, x0, x1, gaps, h, colour, 0.3)`; `wallZ(x, z0, z1, gaps, h, ...)`.
Lintels are `box`. Mark every lintel, slab and the 2.8-3.3 band `overhead: true`. Mark the void roof and the
parapets `noLedge: true`.
- **Facade** `wallX(-18, -24, 24, [[-21,-17],[-13,-9],[-5.6,-4.4],[0.6,1.8],[5.4,6.6],[10.4,11.6],[13,17]], 6.0, WALL_DARK)`.
  - Shutter W (E1 fallback, raised 1.5 m): panel `box(-19, 3.0, -18, 4.0, 3.0, 0.1, STEEL)` (y 1.5-4.5); lintel
    `box(-19, 5.25, -18, 4.0, 1.5, 0.3)`.
  - Shutter E, closed: `box(-11, 2.25, -18, 4.0, 4.5, 0.1, STEEL)` plus lintel at x -11.
  - Workshop shutter, closed: the same at x 15.
  - Entrance: lintel `box(-5, 4.05, -18, 1.2, 3.9, 0.3)`; `door(-5.6, 0, -18, 1.2, PI/2, {locked:true, breachable:true, swing:-1})`.
  - Windows at x 1.2 (transport) and x 6.0 (security): sill `box(x, 0.45, -18, 1.2, 0.9, 0.3)`, head
    `box(x, 4.05, -18, 1.2, 3.9, 0.3)`, `windowAt(x, 1.5, -18, 1.2, 1.2, 0, {sill:0.9, open:false, breakable:true})`.
  - Workshop door: lintel at x 11; `door(10.4, 0, -18, 1.2, PI/2, {swing:1})`, unlocked (E7 fallback).
  - Visual hazard posts at x -21, -17, -13, -9, 13, 17.
- **Compartment walls** (6.0 high):
  - `wallX(-6, -24, -4, [[-15.1,-13.9]], 6.0, WALL)`, lintel `box(-14.5, 4.05, -6, 1.2, 3.9, 0.3)`, far door
    `door(-15.1, 0, -6, 1.2, PI/2, {swing:-1, locked:true, breachable:false})`.
  - `wallZ(-4, -8.8, -6, [], 6.0)`.
  - `wallX(-8.8, -4, 24, [], 6.0)`.
- **Lobby block** (x -24 to -4, z -8.8 to -6, 3.0 high):
  - South wall `wallX(-8.8, -24, -12.5, [[-22.6,-21.4],[-19.6,-18.4],[-15.1,-13.9]], 3.0)`. Charging front x -12.5
    to -8 is open; x -8 to -4 is the office block wall.
  - Window x -22: sill and head (2.1-3.0); `windowAt(-22, 1.5, -8.8, 1.2, 1.2, 0, {sill:0.9})`.
  - Lintels `box(x, 2.55, -8.8, 1.2, 0.9, 0.3)` at x -19 and x -14.5.
  - Doors: `door(-19.6, 0, -8.8, 1.2, PI/2, {swing:-1})` (office) and **near door**
    `door(-15.1, 0, -8.8, 1.2, PI/2, {swing:1, locked:true, breachable:false})`.
  - Partitions `wallZ(-16.5, -8.8, -6, [], 3.0)`, `wallZ(-12.5, -8.8, -6, [], 3.0)`.
  - Roof slab `box(-14.075, 3.1, -7.55, 19.85, 0.2, 2.8, CONCRETE)` (top 3.2).
- **Office block** (x -8 to 8, z -18 to -8.8). The south rooms have a 3.0 ceiling. The corridor and north rooms have
  a 2.8 ceiling with the void from 3.0 to 4.6.
  - West x -8:
    - `wallZ(-8, -17.85, -13.8, [[-16.4,-15.2]], 3.0)` plus lintel `box(-8, 2.55, -15.8, 0.3, 0.9, 1.2)`
    - `wallZ(-8, -13.8, -8.8, [[-12.9,-11.7]], 2.8)` plus lintel `box(-8, 2.45, -12.3, 0.3, 0.7, 1.2)`
    - void wall `box(-8, 3.8, -11.3, 0.3, 2.0, 5.0)`
  - East x 8:
    - `wallZ(8, -17.85, -13.8, [], 3.0)`
    - `wallZ(8, -13.8, -8.8, [[-12.9,-11.7]], 2.8)` plus lintel
    - void wall with the catwalk opening z -10.15 to -8.95 (y 3.0-4.6): `box(8, 3.8, -11.975, 0.3, 2.0, 3.65)`,
      `box(8, 2.9, -9.55, 0.3, 0.2, 1.2)`, `box(8, 4.7, -9.55, 0.3, 0.2, 1.2)`
  - North z -8.8, x -8 to -4: `box(-6, 1.4, -8.8, 4.0, 2.8, 0.3)`. Void north wall with the opening x -6.5 to -5.3
    (y 3.0-4.6) onto the lobby-block roof: `box(-7.25, 3.8, -8.8, 1.5, 2.0, 0.3)`,
    `box(-4.65, 3.8, -8.8, 1.3, 2.0, 0.3)`, `box(-5.9, 2.9, ...)`, `box(-5.9, 4.7, ...)` (1.2 wide).
  - Corridor south z -13.8:
    - `wallX(-13.8, -8, 8, [[-5.1,-3.9],[-0.1,1.1],[3.9,5.1]], 2.8)` with lintels at x -4.5, 0.5 and 4.5
    - band `box(0, 3.05, -13.8, 16, 0.5, 0.3)`
    - upper wall with the deck access opening x -3.6 to -2.4 (y 3.3-4.6): `box(-5.8, 4.05, -13.8, 4.4, 1.5, 0.3)`,
      `box(2.8, 4.05, -13.8, 10.4, 1.5, 0.3)`, `box(-3.0, 4.7, -13.8, 1.2, 0.2, 0.3)`
  - Corridor north z -10.8: `wallX(-10.8, -8, 8, [[-7.1,-5.9],[-2.1,-0.9],[1.9,3.1]], 2.8)` with lintels at x -6.5,
    -1.5 and 2.5.
  - Partitions:
    - `wallZ(-2, -17.85, -13.8, [], 3.0)`, `wallZ(3, ...)`
    - `wallZ(-3, -10.8, -8.8, [], 2.8)`, `wallZ(1, ...)`
  - Slabs (split each around its holes into column boxes):
    - deck: x -8.15 to 8.15, z -17.85 to -13.95, y 3.0-3.3; hole (security) x 6.0-6.9, z -15.85 to -14.95
    - void floor: x -8.15 to 8.15, z -13.95 to -8.95, y 2.8-3.0; holes h1 x -6.05 to -5.15, z -12.75 to -11.85,
      and h2 x 2.15-3.05, z -10.4 to -9.5
    - void roof: the same rectangle at y 4.6-4.8 (`noLedge`)
- **Doors inside** (1.2 wide, 2.1 high; hinge = centre - 0.6 along the leaf):
  - Corridor west `door(-8, 0, -12.9, 1.2, 0, {swing:1})`; corridor east `door(8, 0, -12.9, 1.2, 0, {swing:-1})`.
  - Reception bay door `door(-8, 0, -16.4, 1.2, 0, {swing:1})`.
  - Room doors on z -13.8: hinges at x -5.1, -0.1, 3.9 (yaw PI/2, swing +1, opening south into the rooms; with yaw
    PI/2, swing +1 opens toward -z, `doors.ts:127`).
  - Room doors on z -10.8: hinges at x -7.1, -2.1, 1.9 (yaw PI/2, swing -1, opening north into the room).
- **Roof** (top 6.0): `box` y 5.8-6.0 over x -24 to -4, z -18.15 to -6.15, with the smoke-vent hole x -20.6 to -19.4,
  z -8.0 to -6.8. Over x -4 to 24, z -18.15 to -8.95, with the roof-hatch hole x 4.5-5.5, z -14.8 to -14.0. Mark
  `overhead`. `surface('metal', -24, 24, -18.15, -6, 6.0)`.
- **Parapets** (y 6.0-7.5, `noLedge`):
  - `box(-14, 6.75, -6, 20.3, 1.5, 0.3)`
  - `box(10, 6.75, -8.8, 28.3, 1.5, 0.3)`
  - `box(-4, 6.75, -7.4, 0.3, 1.5, 2.8)`
  - gables on the perimeter tops: `box(-24.5, 6.75, -12.4, 1.0, 1.5, 12.5)`, `box(24.5, 6.75, -13.725, 1.0, 1.5, 9.85)`

### 5.3 Traversal, contents, lights
- **Anchors**:
  - `pipeV(x, -18.23, 0, 6.0, 0)` for x = -22.4, 8.6 and 22.6.
  - `rappel(1.2, 6.0, -18.15, PI, 6.0)`.
  - `pipeH(-6.8, -17.0, -23.4, -17.0, 5.0)` (bay main).
  - `pipeH(12.0, -10.35, 12.0, -17.4, 4.7)` (workshop branch).
  - `ladder(5.0, -14.45, 3.3, 6.0, 0)` (roof hatch; top (5.0, 6.0, -14.0)).
  - `ladder(8.5, -14.6, 0, 3.3, -PI/2)` (workshop to the deck).
  - `ladder(23.5, -9.55, 0, 3.0, -PI/2)` (catwalk).
  - Catwalk `box(15.625, 2.9, -9.55, 14.95, 0.2, 1.2, STEEL)` (x 8.15-23.1), with a visual rail.
  - Deck rails are visual only (no collision), with the pallet-gate gap at z -17.65 to -16.45.
  - Valve cage: `fence(22, -17.85, 22, -15.8, 2.4)` and `fence(22, -15.8, 23.85, -15.8, 2.4)`.
  - Pump house `block(20.2, -19.025, 3.2, 4.3, 1.75, WALL)`.
- **Yard**:
  - Trailer body `box(-4.6, 2.65, -23.35, 13.6, 2.7, 2.5)` (y 1.3-4.0, `noLedge`) plus rear bogie
    `block(-9.9, -23.35, 3.0, 1.3, 2.5)`.
  - Shelter, x -15 to -12, z -21.2 to -19.8: panels S, W, E 2.2 high (colliding); the roof is visual.
  - Skip `block(-22.7, -21.5, 1.8, 1.7, 3.6)`.
  - Empty pallets `block(-16.4, -19.0, 1.2, 1.4, 1.0)`.
  - Van `block(15, -21.4, 2.0, 2.5, 5.5)`.
  - Gatehouse `block(11.25, -23.6, 2.5, 2.6, 2.0)` (1.4 m off the boundary, so no wall jump out).
  - Gate panel visual at z -25.95, x 3.5-9.5.
  - Lane `ambientZone(-11.6, 2.4, -26, -22.0, 0.17, -1, 6)`.
- **Bay**:
  - W lane pallets `block(x, -14.4, 1.2, 1.6, 1.0, SHRINK)` at x -19.8, -18.4, -17.0.
  - E lane `block(-12.0, -13.8, 1.2, 1.8, 1.0)`, `block(-10.8, -13.8, 1.2, 1.8, 1.0)`, `block(-11.4, -11.6, 1.2, 1.2, 1.0)`.
  - Wrapper: turntable `block(-16.0, -11.8, 1.6, 0.15, 1.6)` plus mast `block(-16.0, -12.75, 0.3, 2.4, 0.3)`.
  - Desk `block(-22.8, -15.6, 0.8, 1.05, 1.6)`.
  - Empty stacks `block(-23.4, -11.4, 1.0, 1.5, 1.2)` and `block(-23.4, -10.1, 1.0, 0.9, 1.2)`.
  - Forklift `block(-10.2, -7.6, 1.2, 2.2, 2.4)`.
  - Charger `block(-6.0, -6.5, 1.0, 1.6, 0.6)`.
  - Lobby-block roof storage `block(-21, -7.0, 1.2, 1.0, 0.8, CRATE, 3.2)` and `block(-10.5, -7.2, 1.6, 1.2, 1.0, CRATE, 3.2)`.
- **Offices**:
  - Counter `block(-5.0, -15.4, 3.0, 1.05, 0.6)`.
  - Transport desks `block(-0.6, -16.6, 1.6, 0.75, 0.8)` and `block(2.0, -15.0, 0.8, 0.75, 1.6)`.
  - DVR desk `block(3.5, -15.6, 0.7, 0.75, 2.4)`.
  - Cabinet under the security hatch `block(7.4, -15.4, 0.9, 1.3, 0.5)`.
  - Mess worktop `block(4.5, -9.25, 5.0, 0.9, 0.6)`.
  - Server rack `block(-7.4, -9.6, 0.6, 2.0, 1.0)`.
  - AHU on the deck `block(1.5, -16.3, 3.0, 1.8, 1.6, STEEL, 3.3)`.
- **Workshop**:
  - Benches `block(12.5, -14.0, 2.4, 0.9, 0.9)` and `block(19.0, -15.5, 0.9, 0.9, 2.4)`.
  - Lathe `block(17.0, -11.8, 2.2, 1.3, 0.8)`.
  - Drill `block(21.0, -16.8, 0.6, 1.7, 0.6)`.
  - Lockers `block(8.45, -16.6, 0.6, 2.0, 1.6)`.
  - Crane beams and girder visual.
- **Lights** (`lamp` unless noted; colour warm white unless noted; groups 30-36 are new circuits, 20 is outside):

  | Light | Position (x, y, z) | Radius | Intensity | Group |
  | --- | --- | --- | --- | --- |
  | W lane | (-19, 5.05, -14.4) | 7 | 0.8 | 30 |
  | Goods-in office | (-20.2, 2.75, -7.4) | 4 | 0.8 | 31 |
  | Charger (green) | (-10.2, 2.75, -7.4) | 3 | 0.4 | 31 |
  | Corridor | (0, 2.65, -12.3) | 6 | 0.8 | 32 |
  | Reception emergency | (-5, 2.85, -14.4) | 3 | 0.4 | 33 |
  | Security (blue) | (4.8, 2.85, -15.8) | 4 | 0.7 | 34 |
  | Mess | (4.5, 2.65, -9.8) | 4 | 0.8 | 35 |
  | Workshop exit (green) | (11, 2.4, -17.6) | 3 | 0.4 | 36 |
  | Spot over shutter E | (-11, 5.6, -18.6) | 7.5 | 0.9 | 20 |
  | Entrance | (-5, 2.6, -18.5) | 5 | 0.8 | 20 |
  | Workshop door | (11, 2.6, -18.5) | 4 | 0.6 | 20 |
  | Gatehouse | (11.25, 2.45, -22.45) | 4 | 0.7 | 20 |

  The shutter E spot uses `makeCone(0, -1, -0.25, 0.7)`. Add the void `ambientZone(-8, 8, -13.8, -8.8, 0.05, 2.95, 4.65)`.
- Switches: (-23.85, -12.0) yaw PI/2 group 30; (-7.85, -13.3) yaw PI/2 group 32; (3.15, -14.3) yaw PI/2 group 34.

### 5.4 Rooms and data lists
Rooms:

| id | x | z |
| --- | --- | --- |
| yard | -24..24 | -26..-18 |
| goodsIn | -24..-8 | -18..-8.8 |
| goodsInOffice | -24..-16.5 | -8.8..-6 |
| lobby | -16.5..-12.5 | -8.8..-6 |
| charging | -12.5..-4 | -8.8..-6 |
| reception | -8..-2 | -18..-13.8 |
| transport | -2..3 | -18..-13.8 |
| security | 3..8 | -18..-13.8 |
| officeCorridor | -8..8 | -13.8..-10.8 |
| comms | -8..-3 | -10.8..-8.8 |
| wc | -3..1 | -10.8..-8.8 |
| mess | 1..8 | -10.8..-8.8 |
| workshop | 8..24 | -18..-8.8 |

- Spawns: (-20, -24.6), (-21.2, -24.6), (-18.8, -24.6), (-20, -25.4), yaw 0.5.
- Hide spots: (-21.3, -21.5) and (-6.0, -7.2).
- Pickups (ammo): (-23.3, -14.0) and (6.0, -9.4).
- Nav seeds: (-20, 0, -24.6), (0, 6.0, -16), (6, 3.3, -16.6), (16, 3.0, -9.55), (-20, 3.2, -7.4).
- Nav layers stay at 3 or fewer per column (the void and the 1.0 m slot over it fall under the 1.7 headroom).

### 5.5 Devices
- `cam-yard`: at [-8.4, -18.35], y 4.5, facing 180, sweep [140, 220], section 0.
- `cam-bay`: at [-23.6, -9.4], y 2.8, facing 135, sweep [110, 165], section 0.
- `laser-workshop`: (9.8, -17.7) to (9.8, -9.1), section 0.
- `laser-deck`: (-1.0, -17.7) to (-1.0, -13.95), floorY 3.3, section 0.
- Both lasers use ys [0.35, 0.9, 1.45].

### 5.6 Section 0 data
- Start `{ x: -20.0, y: 0, z: -24.6, yaw: 0.5 }`.
- Objective `{ kind: 'download', label: 'Download the security DVR', x: 3.95, y: 0, z: -15.0, yaw: PI/2 }`. The e2e
  stands at x + 0.9, which is free floor.
- Connector as in 2.1 (nearAt [-14.5, -8.8], farAt [-14.5, -6]).
- Guards as in the 2.1 table. Each has `wait` (used today), `waits` and `faces` (used once N1 lands), and
  `takedownSpot` at its isolation spot (for example yardPatrol [-6.5, -19.9]; driver [-9.6, -9.6]).
- Routes:
  - **R1**, obj 12, climbs [2]: [-20,-24.6], [-19,-20], [-19,-18.9], [-19,-17], [-16,-16.2], [-9,-15.8], [-7.3,-15.8],
    [-7.2,-14.4], [-4.5,-14.4], [-4.5,-13], [4.4,-12.6], [4.4,-14.5], [4.8,-15], [4.4,-12.6], [-7,-12.3],
    [-9.2,-12.3], [-14.5,-10], [-14.5,-9.4], [-14.5,-7.4].
  - **R2**, obj 7, climbs [1,3,5,8,10,12,14]: [-20,-24.6], [-22.4,-18.75], [-22,-17.2,6], [5,-13.5,6], [5,-14.9,3.3],
    [7.4,-14.6,3.3], [6.45,-15.4], [4.8,-15], [7.4,-16], [7.4,-14.6,3.3], [5,-14.9,3.3], [5,-13.5,6],
    [-20,-9.6,6], [-20,-7.4,3.2], [-15.5,-8.4,3.2], [-14.5,-9.6], [-14.5,-7.4].
  - **R3**, obj 15, climbs [7,9,10,11]: [-20,-24.6], [-12.5,-25.3], [2.8,-25.3], [9.5,-19.2], [11,-18.9], [11,-17.2],
    [22.6,-12], [23.3,-10.4], [22.6,-9.55,3], [8.6,-9.55,3], [7,-9.6,3], [2.6,-9.95,3], [2.6,-9.6], [2.5,-11.6],
    [4.4,-14.5], [4.8,-15], [4.4,-12.6], [-7,-12.3], [-9.2,-12.3], [-11,-10], [-13.6,-9.4], [-14.5,-7.4].

  R2's and R3's climb indices must be recounted against the final lists. The rule: every leg into, out of or inside
  the void, through a hatch or the vent, up a drainpipe, or under the shutter is a climb.

## 6. Decisions for the job lead (and engine questions)
- **C1 (needed for section 1's guards): M8 isolation in time.** Today's check (`sectorCheck.ts:185`, `CHECK_RANGE` 15)
  needs a takedown spot unseen from every point of every other route. That is what forced the pocket filler (REVIEW
  4). Proposal: a guard passes if its spot is statically unseen (as now, so sections 2 and 3 stay green), **or** it has
  an isolation window.
  - Model: sample t from 0 to 180 s every 0.25 s. Each guard walks from its slot along its route at its walk speed
    (src/config/enemies.json), pausing `wait` at each point. Two points ping-pong; three or more loop.
  - Isolated: guard i is isolated at t when every other guard is over 15 m away or has no clear eye-height line. It
    passes on 3 s or more of isolation in a row.
  - Size: about 60 lines plus the M8 test edit.
  - If declined: section 1 can only pass by skipping M8 for 'service' until C1 lands. Do not add filler blocks.
- **N1 (optional):** `sectorMode.ts:310` passes only `wait`; pass `waits`, `faces`, `start` and `loop` the way
  `infiltrationMode.ts:95` does. Fallback: a uniform `wait` (all cycles above hold).
- **D3:** section 1's start moves to the yard's south-west corner (the smoker and the trailer sit by the old start).
- **D4:** sections 2 and 3 as built keep heavies (S:89, 127, 134) and the indoor sniper (S:132), against G155 for
  co-op, until their rebuild.
- **D5:** section 1 has 8 guards (was 10). G190 puts room first; the test minimum is 8; the PC perf run (G187) sets
  any rise.
- **E7 (new): one-way fire-exit doors are not built.** The workshop door is an unlocked leaf for now.
- Mechanics to confirm in the greybox:
  - Whether a climb-up through a hatch into the 1.6 m void works. If not, those hatches are drop-only.
  - Whether the camera copes with the 1.3 m openings (L7).
  - Whether the perimeter wall tops stay unreachable.

## 7. Future
- E1 roller doors: raise and lower shutter W.
- E2 hatches and rooflights.
- E3 (G44) vertical sight, so high routes need not rely on darkness only.
- E4 (G41) guards close doors.
- Sections 2 and 3 rebuilt to 2.2 and 2.3.
