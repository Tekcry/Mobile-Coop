# Dead Line v2 - site and building brief (stage D0)

Status: D0 approved by Michael, 2026-10-10 (decisions: 1934 building with 1960s additions; manholes count as plant ladders; vertical drainpipe climbs only; no coke yard; the 1962 duct bank cut stays and the tunnel's east section is a gated alternative entry for Area 3; the level logic rules are adopted into `docs/level-design.md` Section 16; crouch ducts 1.5 x 1.2 m). Docs only. No code, no map JSON. Replaces the layout in `map-dead-line.json` / `.md` / `.svg`, which failed playtest; nothing of that layout is reused. Story, guards' employer, light, noise and engine numbers come from `mission-1-dead-line.md` and `map-dead-line-validation.md`.

Companion files:
- `docs/level-design.md` Section 16 - the level logic rules this brief and every later map follow (adopted at D0).
- `dead-line-v2-area1.md` and `dead-line-v2-area1.svg` - Area 1 in full detail; Areas 2 to 4 outlined.
- `dead-line-v2-engine-check.md` - tunnels, crouch ducts and the camera under low ceilings.

Coordinates: metres, x east, z north, y up. Origin at the south-west corner of the Cable Lane mouth (Area 1 plan). Ground level y 0.

---

## 1. Era (a conflict, resolved)

- `docs/story.md` (higher authority) says the Kestrel Exchange was built in 1934 (LANTERN: "Kestrel Exchange, 1934").
- `mission-1-dead-line.md` calls it a 1960s exchange.
- Resolution: the main building (A block) is 1934. The trunk extension (B block), the gatehouse, the generator house and the substation are 1960s. Both documents stay true.
- Tonight is the late 2020s. The equipment is digital and the building is unmanned at night, monitored remotely by the telephone company (the telco).

## 2. What the site is

A district telephone exchange for Kestrel, Hollowmere's old telephone and industrial quarter. It switches local calls and carries trunk circuits to the rest of the city. Every subscriber line in the district arrives here by cable, is jointed on the main distribution frame (MDF) and is connected to the switch.

| Period | What the building did | Who worked there |
| --- | --- | --- |
| 1934 | Automatic (step-by-step) local switch on the first floor; a manual trunk switchboard on the second floor; the MDF and test desk on the ground floor; batteries, power and a coke boiler in the basement and yard | About 60: engineers, operators (the switchboard ran day and night), clerks, a caretaker |
| 1962 | B block added for trunk switching; standby generator, gatehouse and substation added; boiler converted from coke to oil (1968) | About 40; the manual board closed in 1975 |
| 1990s | Digital switch replaced the step-by-step racks on the first floor; A/C condensers added on the roof | About 10 engineers, days only |
| Tonight | Remote-monitored. Day engineers go home at 18:00. Spare floor in B block is leased to tenants. Aldous Pell's company leases a caged bay in the trunk hall and pays a private security contractor to guard it | Pell's contractor (the only people on site) |

Why it can be entered at night at all: the telco cut its own night security years ago; Pell's contractor guards Pell's interests (the cage, the alarm panel that would warn him, the vehicle route) and nothing else. That is why some telco spaces (the cable tunnel, the substation, the drum store, the heating subway) have no guards: the contractor has no keys to them and no reason to go in. The team carries current telco keys supplied by the Client (Crane, Continuity Office); LANTERN knows the building type from his apprenticeship.

## 3. Site plan

```
                 railway viaduct (brick, deck +7.0 m), arches A1 .. A24 (10 m pitch)
  Viaduct  +------------------------------------------------------------------------------+
  Road     | lock-ups and lean-to workshops A2..A16 | A17 | A18     | A19..A22 telco arches|
  (bridge  |                                       |brick|substation| drum store, garages |
  over)    +----------- Cable Lane (Area 1) -------+-----+---Gv-----+---------------------+
           | pub | printworks (bay) | Mill St yards | turn head |gh |  service yard (Area 2)|
           +-----+------------------+---------------+-----------+---+  boiler hs, gen hs   |
                                                                    |  A block  | B block  |
                                                                    +---Kestrel Road (front)+
```

| Part | Size | Position |
| --- | --- | --- |
| Cable Lane (public lane, approach) | 180 m long, 9 m wall to lean-to front | x 12 to 192, z 12 to 21 |
| Railway viaduct | 12 m deep, 7 m to the deck | z 26 to 38, runs the full length |
| Exchange compound | 64 x 58 m | x 192 to 256, z -32 to 26 |
| Service yard | 64 x 22 m open, plus the telco arches | z -10 to 12 open; arches A19 to A22 on the north edge |
| A block (1934) | 36 x 18 m, basement + 3 floors | x 196 to 232, z -30 to -12 |
| B block (1962) | 24 x 18 m, basement + 2 floors | x 232 to 256, z -30 to -12 |
| Kestrel Road (public front) | 12 m road and pavements | z -44 to -32 |

Boundaries: the viaduct on the north (brick, no openings except the telco arches, which the telco leases); Cable Lane and the substation on the west (2.7 m brick wall, the vehicle gate Gv and the gatehouse); Kestrel Road on the south (the building's front itself, plus 2.4 m railings); a 1950s warehouse on the east (blank 8 m brick wall, no openings).

## 4. Buildings and rooms

Sizes are clear internal sizes in metres (length x width x ceiling). Storey heights: A block basement 4.0, ground 4.5, first 4.5, second 3.6; B block basement 3.0, ground 4.8, first 4.2. Slabs 0.3. Exterior walls 0.45, interior walls 0.3 (scale sheet). Structural grid 6 x 6 m in A block, 6 x 7.5 m in B block.

### 4.1 Gatehouse (1962), single storey, in the boundary line at the vehicle gate

| Room | Size | Function | Contents tonight |
| --- | --- | --- | --- |
| Gate office | 6 x 4 x 2.7 | Controls the vehicle gate; logs vans; window to the lane (west) and to the yard (east) | Contractor's desk, gate motor control, the contractor's key safe with the access cards (Area 2 objective), kettle, radio charger |
| WC and store | 6 x 1.7 x 2.7 | Staff WC; cleaning store | |

Flat roof at 3.0 m behind a 0.3 m upstand, no access (a single-storey roof needs none; maintenance by ladder brought by the roofer).

### 4.2 Substation (1961), in railway arch A18, leased by the telco

| Room | Size | Function | Contents |
| --- | --- | --- | --- |
| Forecourt | 9 x 5, open | Access hardstanding for the electricity board and telco engineers | 2.4 m steel palisade (anti-climb, standard for substations), padlocked gate SG, bulkhead lamp LA6 over the switch room doors |
| Switch room | 5 x 5 x 3.0 | High-voltage switchgear for the exchange's supply | Switchgear panels, light switch for LA6 by the door, 1.8 m double doors from the forecourt (switchgear comes in through them); the supply cable leaves through a sealed 0.6 m cable duct into the cable tunnel (not passable) |
| LV room | 8 x 6.5 x 3.0, behind the switch room | 415 V distribution board feeding the exchange cables (added at D1) | The LV board, cable trays; 1.8 m double doors from the switch room; pier door SD in its east wall |
| Pier door SD | 1.2 x 2.1, through the 2 m pier from the LV room | Cut in 1961 so telco staff reach their substation from the drum store without going round by the lane | Steel door, telco lock both sides (the team's key opens it) |
| Transformer room | 3 x 5 x 4.5, beside the switch room | 11 kV to 415 V transformer | Transformer on a plinth, louvred steel doors to the forecourt (ventilation), constant hum |

### 4.3 Telco arches (A19 to A22), on the yard's north edge

| Arch | Size | Function | Notes |
| --- | --- | --- | --- |
| A19 cable drum store | 8 x 12 x 5.5 (vault) | Drums of cable delivered by lorry from Wharf Street (north side of the viaduct) | Roller door with a wicket door south to the yard; double doors north to Wharf Street, bolted from inside (the Area 4 exit); pier door SD west into the substation |
| A20 garage | 8 x 12 x 5.5 | Engineers' vans | One telco van; roller door to the yard |
| A21 garage | 8 x 12 x 5.5 | Tonight: Pell's contractor's second van | |
| A22 stores | 8 x 12 x 5.5 | Spare equipment, cable reels on racks, old step-by-step selectors in labelled crates | Personnel door to the yard |

### 4.4 Boiler house (1934) and oil tank (1968)

| Room | Size | Function | Contents |
| --- | --- | --- | --- |
| Boiler room | 12 x 8 x 5.0 | Heats A block (low-pressure hot water) | Oil-fired boiler (was coke until 1968), pumps, plant ladder to the boiler top platform (burner and flue access), stair down into the heating subway pit |
| Former coke store | 6 x 8 x 5.0 | Coke was tipped through a wall chute from the yard; now the boiler workshop | Bench, drums, the old chute door (welded shut in 1968) |
| Chimney | 2 x 2, 20 m | Flue | Steel access rungs inside the flue base only (no external ladder) |
| Oil tank bund | 7 x 3.5, walls 1.2 | 10,000 litre tank in a spill bund | Fill point beside the yard road |

### 4.5 Generator house (1964)

| Room | Size | Function | Contents |
| --- | --- | --- | --- |
| Engine room | 8 x 6 x 4.0 | Standby diesel generator for the exchange (a power cut must not stop the phones) | Diesel set, day tank, control panel, louvres, exhaust stack through the roof |

Cables to the power room run in a sealed cable trench (0.6 m, not walkable).

### 4.6 A block (1934 main exchange)

Central corridor 3.0 m wide on every floor, running east-west between the two cores; rooms 7.5 m deep on each side, except where an open hall takes the full depth.

**Cores**
| Core | Where | What | Serves |
| --- | --- | --- | --- |
| A1 main stair and goods lift | West end, 6 x 6 enclosure plus a 3 x 3 lift shaft | Open-well stair, 2.4 m flights, mid landings, handrails both sides, balustrade on the well | Basement to roof (covered bulkhead at the north-west corner) |
| A2 fire stair | East end, 6 x 3 enclosure | Enclosed stair, 1.3 m flights, fire doors at every floor, smoke vent hatch at the top | Basement to roof (covered bulkhead at the north-east corner) |
| SR supply-air riser | Beside A1, 2.0 x 1.5 shaft | Builder's-work shaft from the fan room to the roof; fixed steel plant ladder for filter and damper maintenance; inspection doors at each floor | Ventilation (section 6) |
| CR1, CR2 cable risers | Beside the cable chamber, 2.4 x 1.2 each | Cables from the cable chamber up to the MDF; access doors per floor; no ladder (cables fill them) | Cables |

**Basement (floor y -4.0)**
| Room | Size | Function (1934 / tonight) | Contents |
| --- | --- | --- | --- |
| Cable chamber | 12 x 7.5 x 3.7 | Where the street cables arrive from the cable tunnel and turn up the risers | Cable bearers floor to ceiling, joint cases, gas-pressure alarm panel, fire door into the tunnel's east section (jointers' access) |
| Battery room | 12 x 7.5 x 3.7 | 50 V exchange battery (keeps the phones working in a power cut) | Rows of cells on stands, acid-resistant tiled floor, extract fan |
| Power room | 12 x 7.5 x 3.7 | Rectifiers and the DC switchboard, fed by the substation (via the tunnel) and the generator | Rectifier cabinets, distribution boards |
| Fan room | 9 x 7.5 x 3.7 | 1934 filtered supply air (relays need dust-free air) | Intake through a louvred area well on the yard side, filters, supply fan into SR |
| Heating mains room | 6 x 7.5 x 3.7 | Where the heating subway arrives from the boiler house | Pumps, valves, flow and return mains rising in the riser |
| Basement stores | 6 x 7.5 x 3.7 | Spares | Shelving |

**Ground floor (y 0)**
| Room | Size | Function | Contents |
| --- | --- | --- | --- |
| Entrance hall | 6 x 7.5 x 4.2 | Public entrance from Kestrel Road (locked; day staff only) | Reception counter, 1934 terrazzo floor, a memorial plaque |
| MDF room | 18 x 7.5 x 4.2 | Main distribution frame: every line is jointed here | Double-sided frames 3.2 m high in rows, jumper-wire trolleys (the real frames had rolling ladders; left out so the only ladders on the site are plant ladders) |
| Test room | 9 x 7.5 x 4.2 | Test desk and circuit records | Test desk, record cabinets (P1, the circuit record) |
| Engineers' room | 6 x 7.5 x 4.2 | Day engineers' office | Desks, kettle, rota board |
| Goods-in | 6 x 7.5 x 4.2 | Deliveries from the yard to the goods lift | 3 x 3 roller shutter and a staff door with a card reader, both on the yard side (Area 2 to 3 entry) |
| Toilets and lockers | 6 x 7.5 x 4.2 | Staff | |

**First floor (y 4.5)**
| Room | Size | Function | Contents |
| --- | --- | --- | --- |
| Apparatus hall | 24 x 18 x 4.2, columns on the 6 m grid | 1934 step-by-step switch; since the 1990s the digital switch (one third of the floor) and empty rack rows | Racks in rows with 1.2 m aisles and a 3.0 m main aisle, cable runways overhead, two builder's-work supply ducts at high level along the north and south walls (section 6) |
| Corridor | 3.0 wide, along the hall's north side between the cores | Access without crossing the equipment | Glazed screen into the hall |

**Second floor (y 9.0)**
| Room | Size | Function | Contents |
| --- | --- | --- | --- |
| Manual board room | 24 x 7.5 x 3.3, roof lights over | 1934 trunk switchboard (closed 1975, kept as a heritage room) | The old operator positions in a long row, tall windows to Kestrel Road |
| Network control room | 9 x 7.5 x 3.3 | Alarm and monitoring panel for the exchange | The alarm panel CP (P2), desks; Pell's officer watches it tonight |
| Manager's office | 6 x 7.5 x 3.3 | Exchange manager | |
| Rest room | 6 x 7.5 x 3.3 | Operators' rest room, now a meeting room | |
| Canteen and kitchen | 9 x 7.5 x 3.3 | Staff canteen | Hatch to the kitchen |

**Roof (y 12.6, asphalt, parapet 1.1 m)**
| Element | Size | Why it is there |
| --- | --- | --- |
| A1 stair bulkhead and lift motor room | 6 x 9 x 3.0, north-west corner | Covered roof access from the main stair; the goods-lift winding gear sits over its shaft |
| A2 stair bulkhead | 6 x 3 x 3.0, north-east corner | Covered roof access from the fire stair; smoke vent hatch |
| Water tank room | 4 x 4 x 2.5 on the A1 bulkhead | Gravity water supply |
| A/C condensers | 4 units on a steel frame 8 x 3 x 1.8, north side | Cooling for the 1990s digital switch; pipework drops into SR through a sleeved opening |
| Exhaust cowls | 3 units, 1.2 x 1.2 x 1.5 | Ventilation exhaust from the builder's-work ducts |
| Roof lights | 3 glazed lanterns 6 x 2, over the manual board room | Daylight for the 1934 operators; wired glass, not walkable |

Nothing else is on the roof. It is fully covered: the only openings are the two bulkhead doors, the A2 smoke vent hatch, the roof lights and the cowls.

### 4.7 B block (1962 trunk extension)

| Core | Where | What |
| --- | --- | --- |
| B1 fire stair | North-east corner, 6 x 3 | Enclosed stair, ground to roof bulkhead; ground-floor exit door to the yard (opens from inside only) |
| Link | Ground and first floor | 3.0 m corridor through the party wall into A block's corridor |

| Room | Storey | Size | Function | Contents |
| --- | --- | --- | --- | --- |
| Cable gallery | Basement | 24 x 4.5 x 2.7 | Cables from A block's cable chamber run east and rise into the trunk hall through the floor trenches | Cable bearers; the trench pits with steel steps |
| B plant room | Basement | 9 x 7.5 x 2.7 | Ventilation for the trunk hall | Fan, heater battery |
| Vestibule | Ground | 6 x 3 x 3.0 | Lobby between the link corridor and the trunk hall | Card reader door into the hall |
| Trunk hall | Ground | 18 x 15 x 4.5 | 1962 crossbar trunk switch, mostly removed; spare floor leased to tenants | Remaining rack rows, Pell's leased cage (8 x 6, steel mesh to the ceiling, its own door) with the trunk equipment (P3), under-floor cable trenches (section 6) |
| Transmission room | First | 18 x 15 x 3.9 | Transmission and fibre equipment | Racks, cable runways |
| Store | First | 6 x 7.5 x 3.9 | | |
| Roof | y 9.3 | 24 x 18 | Flat roof, parapet 1.1 | B1 bulkhead, two extract fans, two condensers; fully covered |

## 5. Circulation

| Kind | Route |
| --- | --- |
| Public | Kestrel Road door into the entrance hall (day only, locked at night) |
| Staff at night | Vehicle gate Gv, the yard, the goods-in staff door (card reader) |
| Main corridors | A block central corridor on every floor, A1 to A2; link corridors into B block |
| Stair cores | A1 (main, with the goods lift); A2 and B1 (enclosed fire stairs). No other stairs in the buildings |
| Fire escape | A2 and B1 discharge to the yard; the Kestrel Road door is also an exit |
| Goods | Lorry or van in the yard, goods-in, goods lift (A1), any floor |
| Roof access | A1 bulkhead (NW corner), A2 bulkhead (NE corner of A block), B1 bulkhead (NE corner of B block). No roof ladders anywhere |
| Plant ladders (the only ladders) | SR riser (maintenance), boiler top platform, tunnel shafts M1 and M2 |
| Vehicles | Cable Lane, Gv, the yard; drum lorries through A19 from Wharf Street |

## 6. Underground and duct systems

Every one carries something real, has an owner and a size, and ends where its job ends.

| System | Built | Carries | Size (clear) | Length | Access | Ends at | Guards can enter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cable tunnel (west section) | 1934 | Subscriber and junction cables from the exchange to the Viaduct Road ducts | 2.4 high x 2.6 wide, cable bearers both walls leave a 1.8 m walkway | 60 m including both chambers (x 12 to 72) | Manholes M1 (jointing chamber at the lane mouth, double cast-iron cover) and M2 (joint bay at the A6 forecourt); cast-iron covers make 10 m of noise when lifted | West: jointing chamber JC1. East: the 1962 duct bank at x 72 | No: they have no keys (2.4 m headroom would let them) |
| Cable tunnel (east section) | 1934 | The same cables, plus the substation supply cable since 1961 (through a sealed 0.6 m duct) | As above | About 150 m from the duct bank to the cable chamber | None from outside. Entered only through the cable chamber's fire door in A block. Kept as a gated alternative entry for Area 3 (Michael, D0 approval); Area 3's design sets the gate and states how the section is reached so it is never a dead end | The duct bank (west) and A block's cable chamber (east) | No |
| Duct bank (cuts the tunnel) | 1962 | When the water board laid a trunk main across the lane in 1962 (at the A6 and A7 arches, x 72), 1.5 m of tunnel was filled with concrete and the cables re-run through 100 mm ducts cast into it | Solid | 1.5 m | None | | No one passes |
| Heating subway | 1934 | Heating flow and return mains from the boiler house to A block | 1.5 high x 1.2 wide (crouch) | 26 m | Pit stair in the boiler house; door into the heating mains room | Heating mains room (A basement) | No (1.7 m nav headroom) |
| Builder's-work supply ducts | 1934 | Filtered supply air from the fan room to the apparatus hall and the second floor | 1.5 high x 1.2 wide (crouch), brick and render | Riser SR plus two 24 m runs at high level in the apparatus hall, one 24 m run over the second-floor corridor ceiling | Inspection doors (0.9 x 1.2, hinged) at the riser landings and at each duct end; supply grilles into rooms are 0.6 x 0.3 (look through, not passable) | Blanked duct ends with inspection doors | No |
| Trunk hall cable trenches | 1962 | Cables from the cable gallery to the trunk hall racks | 1.5 deep x 1.2 wide (crouch), chequer-plate covers | 3 trenches, 15 m each, across the hall | Steel steps from the trench pits in the cable gallery; covers lift in place (hold) | The rack rows and the cage floor (cables rise through a cable gland plate, not passable) | No |

Sizes for the crouch systems come from `dead-line-v2-engine-check.md` (1.5 x 1.2 m, now the scale sheet size). The walk-in tunnel uses 2.4 m.

## 7. Palette and lighting character

Brown brick and Portland-stone trim on the 1934 front; plain brick and concrete on the 1960s parts; green-painted steel, cream tiles, terrazzo, linoleum in offices, chequer plate in the plant. At night: sodium lane lanterns, a caged dock floodlight on the printworks, a gate floodlight, wall bulkheads in the yard, and inside only emergency lights, equipment LEDs and the rooms the contractor has switched on. Rain all night.

## 8. Mission structure on this site (refined)

| Area | Where | Target time | Objective |
| --- | --- | --- | --- |
| 1 Approach | Cable Lane, linear, west to east | 5 to 7 min | Reach the substation unseen |
| 2 Perimeter | Service yard and gatehouse | 5 min | Take the access cards from the gatehouse key safe; reach A block |
| 3 Building | A block and B block | 8 min | P1 circuit record (test room), P2 open the cage (network control room panel), P3 plant the tap (cage, B block) |
| 4 Exfil | Rear: yard north strip and arch A19 to Wharf Street | 2 min | Reach the van |

Total about 20 to 22 minutes. The mission doc's eight chapters, roster ids and objective ids need a revision pass once this brief is approved (not done here). The coke yard of the mission doc becomes the former coke store inside the boiler house (the boiler went to oil in 1968).
