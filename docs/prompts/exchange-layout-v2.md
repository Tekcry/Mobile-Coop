# Exchange Layout v2

Approved by Michael 2026-10-10. Authority for the Kestrel Exchange greybox. Key space names and roles from `exchange-design.md` are kept; the room layout is replaced.

Footprint 48 x 36 m (x -24..24, z -18..18), 6 m column grid, north is +z. Levels: basement floor -3.3, ground 0, first 4.5, roof 9.0 (plant room walls to 12.0). The yard is south of the building (z -18..-36); Cooper's Lane is east of the yard.

## Purpose

A proposal; check it against `docs/story.md` and change this section to match the story if they differ.

The Continuity Office (the Client, Crane) wants proof of who is selling the city's call records before SUNDOWN. A broker rents spare trunk capacity at Kestrel Exchange and routes his traffic through a private line card in the core switch. The cage is air-gapped, so the team must physically tap it.

Mission Dead Line:
1. Pull the circuit record that identifies the broker's line card from the line-record cabinet in the Test room.
2. Plant the tap on that line at the core switch inside the server hall cage.
3. Extract at the yard side gate.

The building is mostly unmanned at night, as real exchanges are. The broker pays a private security contractor, so the guards are a contractor night shift, concentrated at the foyer, the cage and the roof.

## Corridors

- The spine: x -6..-3.5, z -18..18 (2.5 m wide) on basement, ground and first floors.
- Ground and first floor: cross corridor x -3.5..3.5, z -1.25..1.25.
- Ring corridor around the light well: north side z 6..8.5 and south side z -8.5..-6 (both x 3.5..20.5), west side x 3.5..6 and east side x 18..20.5 (both z -8.5..8.5).
- Light well (court) x 6..18, z -6..6: open to the sky at ground, a void above.
- Basement: the spine, plus a service tunnel x -3.5..20.5, z -1.25..1.25 (2.0 m wide) under the court to the riser base.

## Spaces

Format: name (x range; z range). Room ids in brackets.

### Basement (floor -3.3)
- [cable] cable chamber x -24..-6, z 0..18, rows of cable racks as cover. The existing spawn tunnel (4 spawns) enters it from the west.
- [rectifier] x -24..-6, z -6..0.
- [battery] battery hall x -24..-6, z -18..-6, rack rows.
- [genroom] generator room x 2.5..12, z -18..-8.5.
- [boiler] boiler house x 12..24, z -18..-8.5.
- Stair B foot x -3.5..2.5, z -18..-8.5.
- [riserbase] x 20.5..24, z -8.5..8.5.

### Ground (0)
- [mdf] MDF hall x -24..-6, z 0..18, long frame rows leaving three lanes.
- [test] test room x -24..-6, z -6..0, with the line-record cabinet.
- [transmission] x -24..-6, z -18..-6, rack rows.
- [foyer] x -3.5..6, z 8.5..18, reception desk, locked public street door on the north wall.
- [security] x 6..12, z 8.5..18, CCTV desks.
- [canteen] x 12..24, z 8.5..18, canteen and lockers.
- [meeting] visitors' meeting room x -3.5..3.5, z 1.25..8.5.
- [cleaners] cleaners' store and WCs x -3.5..3.5, z -8.5..-1.25.
- Stair B core x -3.5..2.5, z -18..-8.5.
- [goodsin] goods-in bay x 2.5..12, z -18..-8.5, roller door to the yard.
- Stair M hall x 12..18, z -18..-8.5.
- [workshop] x 18..24, z -18..-8.5, door to the yard.
- Riser strip x 20.5..24, z -8.5..8.5.
- [well] the court x 6..18, z -6..6.

### First floor (4.5)
- Void over the MDF hall x -24..-6, z 0..18 (no floor). The spine has a 1.0 m see-over rail on its west side for z 0..18.
- [control] control room x -24..-6, z -10..0, with the alarm monitoring panel.
- [records] records store x -24..-6, z -18..-10.
- [manager] manager's office x -3.5..6, z 14.25..18.
- T corridor x -3.5..6, z 12.25..14.25 (2 m), running east to the server hall west door.
- [boardroom] x -3.5..6, z 8.5..12.25.
- [servers] server hall x 6..24, z 8.5..18. Cage x 12..20, z 10.5..16 with the core switch (the objective) at about x 16, z 12.5 on the dark (south) side. Three lanes: cage perimeter, rack rows, cross aisle. K1 at (10, 11.3) and K2 at (21.7, 11.3).
- [office] general office x -3.5..3.5, z 1.25..8.5.
- [tea] x -3.5..3.5, z -8.5..-1.25.
- Cross corridor as above.
- Stair B landing x -3.5..2.5, z -18..-8.5.
- [wcs] x 2.5..12, z -18..-8.5.
- Stair M landing x 12..18 (z -18..-8.5).
- [lockers] x 18..24 (z -18..-8.5).
- [spares] riser room x 20.5..24, z -8.5..8.5.

### Roof (9.0)
- Deck over everything with a 1.0 m parapet.
- [plant] fan and plant room x 12..24, z 8.5..18, walls to 12.0, AHU blocks, doors to the deck and to the riser head.
- Riser head x 20.5..24, z -8.5..8.5.
- Stair M head x 12..18, z -18..-8.5.
- V stack housing x -7.5..-6, z -18..-10.
- Tank room x -21..-12, z -15.5..-10.5.
- Dishes x -21..-16, z 12..16.
- Sniper post G7 at x 21, z -16.5 on the south-east parapet.
- [roof] is the deck. [yard] is the yard.

## Vertical links

Use steep stairs; if LevelBuilder has no ladder support, do not build a ladder system.

- **C cable shaft:** cable chamber to MDF hall, south-west corner x -23.7..-21.5, z 1.2..3.3.
- **B back stair:** basement, ground, first floor, in the stair B core along its west wall (x -3.3..-2.0), straight runs, rise 0.17 run 0.28.
- **M main stair:** ground, first floor, roof, x 16.5..17.8, z -17.2..-9.2, straight runs.
- **V battery extract:** a 1.5 x 8 m shaft at x -7.5..-6, z -18..-10, straight stair runs, linking battery (basement), transmission (ground), records (first floor) and the roof stack. Doors only into those west-side rooms, none onto the spine.
- **R services riser:** x 21.3..23.2, z -0.8..7.5, straight run per storey alternating direction, linking riserbase (basement), ground (door from the ring east side), spares (first floor) and the riser head (roof).
- **Y steel stair** from the roof south parapet at x 16..18 down to the yard, running south about 15 m.
- **Plant ramp** from the yard down into genroom (if too long for the yard, use a stair). **Coke chute:** a steep stair from the yard down into the boiler house.

## Doors

1.0 x 2.1 m, on shared walls, centres on 0.5 m multiples; the S1a finding that a 1.0 m door only passes the nav grid on half-metre centres still holds. Pairs to connect:

- **Basement:** tunnel-cable; cable-spine (two); cable-rectifier; rectifier-battery; rectifier-spine; battery-spine; spine-B foot; B foot-genroom; genroom-boiler; spine-service tunnel; service tunnel-riserbase; genroom-yard (roller); boiler-yard (chute stair).
- **Ground:** mdf-spine (two); mdf-test; test-transmission; test-spine; transmission-spine; transmission-yard (fire door); spine-foyer; spine-cross; spine-B core; spine-yard (south end fire exit); foyer-meeting; foyer-ring (north-west); foyer-security; foyer-street (locked); security-ring; canteen-ring; cross-meeting; cross-cleaners; cross-ring; meeting-spine; cleaners-spine; ring-goodsin; ring-M hall; ring-workshop; ring-riser strip; B core-goodsin; goodsin-M hall; goodsin-yard (large roller); workshop-yard.
- **First floor:** spine-control; spine-records; spine-T corridor; spine-cross; spine-B landing; T corridor-manager; T corridor-boardroom; T corridor-servers (west door); boardroom-ring; servers-ring; servers-spares (east door); ring-spares; cross-office; cross-tea; cross-ring; ring-wcs; ring-M landing; ring-lockers; B landing-wcs.
- **Roof:** plant-deck; plant-riser head; riser head-deck; M head-deck; tank-deck.

## Routes

Each hop must be reachable; a unit test asserts it.

**Circuit record (Test room)**
- A1: spawn, C shaft, mdf, test.
- A2: spawn, chamber, basement spine, B stair, ground spine, test.
- A3: spawn, chamber, rectifier, battery, V up to transmission, test.

**Cage interior**
- B1: spawn, C, mdf, spine, cross, ring, M up, first-floor ring, servers (south door), cage.
- B2: spawn, chamber, spine, B stair up, first-floor spine, T corridor, servers (west door), cage.
- B3: basement spine, service tunnel, riserbase, R up to spares, servers (east door), cage.
- B4: battery, V up to the roof, deck, plant room, duct D1, cage dark side.

**Extraction (yard side gate, east)**
- E1: workshop door to the yard.
- E2: goodsin roller across the yard.
- E3: roof, Y stair, yard.

## Co-op places built now, wired after the playtest

- K1 and K2 key points as inert interactable markers (a future two-person cage lock; solo alternatives later: the officer's key, or cutting the fence slowly and loudly).
- Guards G5 and G6 placed facing each other across the cage so a future sync takedown fits.

## Parked

MDF cable runway boost spot, goods shutter winch, the two-person lock wiring, the officer-key and fence-cutting solo alternatives, the optional broker annex ledger, a manager's office safe as a second circuit-record source.

## Guards

Default placement; keep the archetypes from `exchange-design.md` Section 11 and remap each start room to the nearest equivalent here; do not add a tenth.

- G1 foyer reception.
- G2 MDF hall loop.
- G3 ground ring patrol.
- G4 officer: security office plus first-floor T corridor rounds.
- G5 and G6 (heavy) at the cage.
- G7 sniper at the roof post.
- G8 yard and goods-in.
- G9 basement generator and battery loop.

Each stands near a lit pool with a dark flank so there is a shadow route.

## Objective chain

- O1 "Pull the circuit record": hold interact 3 s at the line-record cabinet in the test room.
- O2 "Tap the broker's line": hold 4 s at the core switch inside the cage.
- Extraction: the yard side gate, radius 2.
- Rules `noAlarms`, `noKills`, `undetected` stay bonus.
- Extend the existing `exchange-greybox` mission entry; do not create a second one.

## Vents

Crawlable low ducts at crouch clearance: clear height = player crouch height + 0.15 m, minimum 1.1 m (measure the crouch collider, do not guess).

- D1: a grille in the server hall ceiling over the cage north-east corner (x 20.5..23, z 15..17.5).
- D2: a grille in the T corridor ceiling (x 0..2, z 12.5..14).

Both connect through a ceiling void and a duct to the plant room (roof), entered by a floor hatch next to an AHU. Grilles open like doors. Choose the egress down into the room that the engine supports (stacked rack tops, a short stair) and document it in `progress.md`.

## General rules

Greybox blocks only. Doors on half-metre centres. Do not change nav, AI or other game code. Keep these existing ids: cable, mdf, well, servers, roof, yard.

## Build steps

All Sonnet; the efficiency rules in Section 0 of `first-playable.md` apply to each. The steps themselves are in `first-playable.md` Section 3 (R1, R2, R3, S1c-v2) and repeated here.

**R1 - Basement and ground floor.**
- Goal: rebuild the basement and ground floor of `src/world/maps/exchange.ts` to the spec; remove the old S1a layout; keep the map registration, the `exchange-greybox` mission entry, the fullbright flag and the e2e-fp-map suite.
- Read: this file (Corridors, Spaces, Vertical links, Doors, Routes A); the existing `exchange.ts`, `tests/exchangeMap.test.ts` and `scripts/e2e-fp-map.mjs`; grep LevelBuilder for box, room, door, stair.
- Files: `exchange.ts`, `exchangeMap.test.ts`, `e2e-fp-map.mjs`, `progress.md` and `CHANGELOG.md` lines.
- Do: build the basement and ground spaces, C, B (basement to ground), M (ground only for now), V (basement to ground), R (basement to ground), the plant ramp and the coke stair, all listed doors.
- Acceptance: (1) `?autostart=exchange&mode=sandbox&fullbright=1` boots with 0 console errors and the operator is in the spawn tunnel; (2) unit test: every basement and ground room centre is reachable from spawn 1, and routes A1, A2 and A3 hold hop by hop; (3) no two walkable surfaces closer than 2.4 m in one column except stair runs; (4) `npm run check` and `e2e:quick` pass (known-flaky suites excepted).
- Smoke: update e2e-fp-map with the new room ids and teleports.
- Hand check: spawn tunnel, chamber, C up to the MDF hall; chamber, spine, B stair up; walk the ring and the cross corridor; ride the V shaft from the battery hall to the transmission room.

**R2 - First floor and roof.**
- Goal: build the first floor and roof to the spec and finish the vertical links.
- Read: this file (First floor, Roof, Vertical links, Doors, Routes B, Co-op places); `exchange.ts` from R1.
- Do: first-floor spaces and the MDF void with its rail; cage with the core switch placeholder and K1 and K2 inert markers; B and M tops; V and R up to the roof; the roof deck, plant room with AHU blocks, riser head, tank room, dishes, stack housing, Y steel stair to the yard, the G7 post marker; reserve the D1 and D2 grille positions without building ducts.
- Acceptance: unit test that every room centre on all four levels is reachable from spawn 1 and routes B1, B2, B3 hold hop by hop up to the cage interior, and routes E1 to E3 reach the yard side gate; `npm run check` and `e2e:quick` pass.
- Smoke: extend e2e-fp-map with first-floor and roof teleports.
- Hand check: walk B1 (main stair), B2 (back stair and spine balcony), B3 (service tunnel and riser) to the cage; climb V to the roof.

**R3 - Ducts and grilles.**
- Goal: the crawlable duct system from the plant room to D1 and D2.
- Read: this file (Vents), `exchange.ts` from R2, the player crouch height in `src/player`.
- Do: measure crouch clearance first, then build the plant room floor hatch, the duct, the ceiling void, D1 and D2 grilles as door-like interactables, and the egress.
- Acceptance: unit test that with all doors into the server hall treated as blocked, the cage interior is reachable from the plant room via D1; route B4 holds hop by hop; a crouched player fits the duct.
- Smoke: extend e2e-fp-map.
- Hand check: climb V to the roof, enter the plant room, crawl to D1, drop into the cage.

**S1c-v2 - Lights, guards, spawns, objective, extraction.**
- Same as the original S1c (lights, 9 guards, 4 spawns, alarms, hide spots) with these changes: use this file's guard placement and objective chain (O1 then O2); extend the existing `exchange-greybox` mission entry; the 4 spawns stay in the spawn tunnel; extraction at the yard side gate.
- Acceptance adds: objective sites (the Test room cabinet and the cage core switch) are below the shadow light level; the headless run completes O1, O2 and extraction in order.
