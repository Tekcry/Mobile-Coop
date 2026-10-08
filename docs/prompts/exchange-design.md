# Kestrel Exchange - design

Spec: `docs/prompts/exchange-map.md` | Standard: `docs/level-design.md` | Log: `docs/prompts/exchange-map-progress.md`

Status: **Part 1 and Part 2 approved by Michael on 2026-10-08; all decisions final.** Both parts are the build
contract. Phase 2 refined a few building details (Part 2,
section 13 "Decisions"); the text and plans below already show them.

Plans (1 m = 10 px, 6 m grid, north up; the dashed red line is the route order, spaces 1-8, and nothing else from
gameplay):
- [Basement](exchange-plans/basement.svg) - cable tunnel and cable chamber, floor -3.3
- [Ground floor and site](exchange-plans/ground.svg) - floor 0.0
- [First floor](exchange-plans/first.svg) - floor 4.5
- [Roof](exchange-plans/roof.svg) - roof 9.0, raised roof 10.5
- Gameplay overlays (Part 2): [basement](exchange-plans/basement-gameplay.svg), [ground](exchange-plans/ground-gameplay.svg),
  [first](exchange-plans/first-gameplay.svg), [roof](exchange-plans/roof-gameplay.svg)

Coordinates in this document are map metres: x east, z north, y up. Grid lines 1-9 are x -24 .. 24 and A-G are z
-18 .. 18, every 6 m. Room sizes are clear (inside the walls) unless marked "c/l" (centre lines).

## 1. Building brief

### Purpose and era
Kestrel Exchange opened in 1934 as the city's automatic telephone exchange for the Kestrel district, for about 8,000
subscriber lines. It worked like every British exchange of its time:
- **Street cables** came in under the pavement through a cable tunnel into the **cable chamber** in the basement. They
  were fixed on steel cable bearers round the walls and rose through slots in the floor into the **main distribution
  frame (MDF)** directly above.
- On the MDF, each subscriber's line was cross-connected with jumper wire to the exchange equipment. The frames are
  4.0 m tall iron structures in rows, with rolling ladders on rails so linemen could reach the top terminal blocks. A
  **test desk** at the end of the hall let engineers test any line. Cable trenches under chequer-plate covers carried
  the internal cables from the MDF to the apparatus room's cable riser.
- The **apparatus room** on the first floor held the Strowger step-by-step switching racks (3.2 m tall) in rows, fed by
  overhead **cable runways** (ladder racking hung from the ceiling). Its height and its clerestory came from the racks'
  needs: room for the runways over them and daylight to work by.
- **Manual assistance** (trunk calls, directory enquiries, operator calls) was handled in the **switchroom** by
  operators seated at a long manual switchboard suite, under a supervisor at a raised desk. The operators had their own
  cloakroom, washroom, tea room and rest room next to it. In 1934 the switchroom staff were the largest group in the
  building.
- **Power**: the exchange ran on 50 V DC from banks of glass-cell **batteries**, charged by **rectifiers** from the
  mains. Two **standby generators** in a double-height **power room** took over in a power cut. Switchgear stood on a
  gallery so it stayed clear of the plant floor. Acid fumes from the battery room were drawn off by fans in a
  **fan room** directly above it.
- **Administration**: the exchange manager, the clerks and the line records occupied a suite of offices on the first
  floor street front. The public could use a **public call office** off the entrance hall. A **watch lodge** at the
  entrance housed the night watchman.
- **Goods**: heavy plant (generators, batteries, cable drums) came in through the rear goods yard and goods entrance.
  Apparatus racks went up to the first floor by the **goods lift** in the goods hall on the street side.
- The **light well** (the court) brought daylight and air into the middle of the plan. A narrow **air shaft** runs off
  its south-east corner to the party wall of the neighbouring building and lights and ventilates the cloakroom,
  washroom and test room on that side.

The exchange was decommissioned in 1994 when the district moved to a digital exchange. The building is heritage
listed (grade II, for the street elevations, the MDF hall and the switchroom), so the shell, the MDF frames, the
power plant and the switchroom suite were left in place.

### Present day (tonight)
A black-market data broker leases the building through a front company. His servers fill the old apparatus room,
partly between stripped Strowger racks, with a chain-link cage round the core. He re-commissioned one standby
generator as backup power. A contracted night watchman (from a security firm, unaware of what the tenant does) does
clocking rounds of the ground floor. The broker's tech works nights in the old switchroom, which is now his office.
His head of security uses the old manager's office. His own men guard the server cage, the roof and the rear yard,
where a van is being loaded. It is night, raining, and the street lamps are out of sight behind the building.

### Site
A corner plot (see the ground plan):
- **Kestrel Street** to the north (the main elevation, main entrance and goods door, both locked tonight).
- **Mill Street** to the west (the MDF hall's tall windows; the cable manhole is in its pavement).
- **Harker & Sons**, a two-storey furniture depository (roof 7.6, parapet 0.6), adjoins to the east along a party
  wall from z -6 to 18. The exchange's air shaft ends against it.
- **The rear goods yard** (48 x 18 m, brick walls 2.7 m) lies to the south. Its vehicle gate onto Mill Street is
  locked. A side gate in its east wall opens onto **Cooper's Lane**, a 6 m service lane running south from the back
  of Harker & Sons. The depository's iron fire escape comes down into the lane.
- South of the yard is railway viaduct land, and east of the lane is the blank wall of a bonded store. There is no
  access to either.

### Construction
- Steel frame on a **6 m grid** (8 x 6 bays, 48 x 36 m), with 0.5 m square encased columns. They are visible inside
  every room and built into the walls on the wall lines.
- **External walls** 0.45 m: red brick with Portland stone dressings, a stone plinth, and stone string courses at
  first-floor level (+4.5) on the court's north and east walls, on its south wall east of the tall stair window, and
  on both air shaft faces, plus one under the parapet. The court's west wall has none: the 1950s fire escape balcony
  replaced it. The parapet is 1.0 m with a
  projecting stone cornice on the court side.
- **Internal walls** 0.3 m brick, plastered. Office partitions are timber with glazed upper panels.
- **Storeys**: basement -3.3 (cable chamber only), ground 0.0, first 4.5, roof 9.0 (parapet top 10.0). Slabs 0.3 m,
  so each storey is 4.2 m clear. The MDF hall and the power room rise two storeys to the roof slab (8.7 m clear). The
  apparatus range (server hall) has a raised roof at 10.5 with a 1.2 m clerestory (5.7 m clear inside).
- **Windows**: steel-framed, 1.6-1.8 m wide on a 3 m rhythm (two per 6 m bay, centred 1.5 m from the grid lines),
  with a sill at 0.9 and 2.4 m high. In the double-height MDF hall and power room they rise 6.0 m from a 1.5 m sill.
  - Street, lane and yard windows are **fixed** with wired glass (1934 security practice for an exchange, kept by the
    tenant).
  - Only the operators' cloakroom casements and the switchroom's fire-exit casement **open**, onto the court and the
    air shaft.
  - Every other court window is fixed.
- **Drainpipes**: cast iron, 0.15 m, from rainwater hoppers under the cornice to the ground. They stand in the court's
  NW and NE corners (the SE corner is the mouth of the air shaft; the SW corner drains into the NW pipe along a
  gutter) and on the rear elevation either side of the
  goods door.
- **Floors**: terrazzo in the entrance hall and colonnade; concrete in the plant rooms; chequer plate over cable
  trenches; acid-resistant red tile in the battery room; linoleum in the office corridor; carpet in the offices; stone
  flags in the court; asphalt on the roof; steel grating on the roof walkways.

### Palette and lighting character
- Palette, from the spec: wall plaster `#9c9486`, dark panelling `#4a3b2e`, bakelite black `#1f1c1a`, switchboard
  green enamel `#3f5e4f`, brass `#b08d4a`, oxblood tile `#6e2f2a`, terrazzo `#8a857b`, cast iron `#3c4146`, Portland
  stone `#c9c2b0`, red brick `#7a3b2e`, office carpet `#4f3a46`, glass `#1b2430`.
- Grade `{ tint: [0.95, 0.97, 1.1], saturation: 0.8, contrast: 1.12 }`.
- Fixtures as built:
  - Caged bulkhead lamps (cable chamber, tunnel, plant).
  - Enamel pendant work lamps over the frames, test desk and generators.
  - Green-shaded desk lamps (test desk, supervisor's desk, offices).
  - Fluorescent tubes added in the 1960s (offices, the apparatus room's work lights) and the broker's cold LED rack
    lighting.
  - A sodium floodlight on the rear elevation over the yard.
  - Moonlight through the tall windows, the light well, the air shaft and the roof lights.
  - Every room has its switch by its door.

## 2. Rooms by storey

### Basement (-3.3)
| Room | 1934 purpose | Size | Tonight |
| --- | --- | --- | --- |
| Manhole shaft | GPO cable manhole in the Mill Street pavement, iron ladder | 1.2 x 1.2, 3.3 deep | The way in (insertion) |
| Cable tunnel | Street cables from the manhole to the chamber | 1.8 wide, 2.2 high, ~7 m | Dark, wet |
| Cable chamber | Cables on bearers, up through floor slots into the MDF | 9.55 x 11.85, 3.0 high | One caged bulkhead lamp and its switch; cable drums left by the last cable gang; sump with a chequer-plate cover |
| Basement stair | Linemen's access from the MDF hall | 2 flights of 10 x 0.165 / 0.28, 1.3 wide, half landing -1.65 | Fire door at the top with a wired-glass panel |

### Ground floor (0.0)
| Room | 1934 purpose | Size | Tonight |
| --- | --- | --- | --- |
| MDF hall | Main distribution frame, test desk | 17.4 x 17.4, 8.7 high (double height) | Unchanged (listed): 5 rows of 4.0 m frames, test desk under a green desk lamp, rolling ladders, cable trench; moonlight through 12 tall windows on two streets; the watchman's clock station by the test desk |
| Battery lobby | Air lock between the MDF and the acid battery room (two doors) | 2.7 x 2.7 | Dark |
| Battery room | 50 V glass-cell batteries on 1 m stands | 17.4 x 5.7 less the lobby | Cells dead but still on their stands; acid-tile floor |
| Power room | Standby generators, rectifiers, switchgear gallery | 17.4 x 11.4, 8.7 high; gallery 2.25 deep at +4.5 along the north wall | Generator 2 running in standby; rectifier and switchgear cubicles 3.4 m along the south wall; chequer plate over the trenches; heating main along the east wall at +4.4; steel stair to the gallery at the west end |
| Power corridor | Plant to the court and the goods entrance | 2.1 wide, 9.0 long | Glazed door at its east end shows the court |
| Goods entrance | Plant and stores deliveries from the yard | 11.7 x 6.0 | Rear roller shutter locked from outside; the engineers' stores cage (chain-link 2.4) |
| Engineers' mess | Engineers' meal room | 9.0 x 8.7 | Disused |
| Staff WCs | | 9.0 x 5.7 | |
| Colonnade | Covered walk along the court's west side between the entrance hall and the rear | 2.1 wide, open to the court through arches | Dark; the watchman's round passes along it |
| Entrance hall | Staff and public entrance from Kestrel Street | 11.7 x 11.4 | Main doors locked; terrazzo |
| Public call office | Public telephone kiosks for the district | 5.7 x 5.4 | Disused kiosks |
| Watch lodge | Night watchman's lodge, hatch to the hall | 5.7 x 5.4 | The watchman's base (clock key board, kettle) |
| Goods hall | Apparatus deliveries from the street, goods lift | 11.4 x 11.1 | Street shutter locked; the goods lift is out of service (gates chained) |
| Light well (court) | Daylight and air for the equipment floors | 12.0 x 12.0, open | Stone flags, a dry fountain, drainpipes in the NW and NE corners, the fire escape balcony at +4.5 along the west and south walls, a bracket lamp over the stair door |
| Air shaft | Light and air for the cloakroom, washroom and test room | 1.85 x 6.0, walls 9-10 m high, open to the sky | Opens off the court's SE corner and ends at the depository's party wall |
| Main stair hall | Stair and passenger lift, ground to first | 5.7 x 8.4 | Lift out of service (gates locked) |
| WCs | | 5.7 x 2.4 | |
| Engineers' workshop | Repairs, relays, cable jointing | 11.4 x 11.1 | Benches; rear and lane windows fixed; yard door locked |
| Test room | Line test equipment | 5.1 x 9.55 | Door to the court |

### First floor (4.5)
| Room | 1934 purpose | Size | Tonight |
| --- | --- | --- | --- |
| Switchgear gallery | Switchgear for the power plant, over the plant floor | 17.4 x 2.25, rail on the void side | Work lamp; gauges |
| Fan room | Battery-room extract fans | 17.4 x 5.7 | Opens only onto the gallery (grille and door); the extract duct runs up into it from the battery room |
| Operators' cloakroom | Lockers for the switchroom operators | 11.4 x 5.4 | Dark; four opening casements, two onto the court and two onto the air shaft |
| Washroom | Operators' washroom | 11.4 x 5.4 | |
| WCs | | 5.7 x 2.4 | |
| Main stair landing | Top of the main stair | 5.7 x 1.65 | |
| Cloak lobby | Lobby between the stair, cloakroom, switchroom and supervisor | 5.7 x 5.7 | |
| Supervisor's office | Switchroom supervisor | 5.7 x 5.7 | |
| Operators' rest room | | 5.7 x 5.4 | |
| First aid | | 5.7 x 5.4 | |
| Switchroom | Manual switchboard suite (sleeve-control positions at 1.5 m) and the supervisor's raised desk | 5.4 x 11.7 | The broker's tech's office; the suite kept (listed); the brass call-board clock on the north wall; tall windows over the court, one an opening fire exit onto the fire escape balcony; switchboard suite as an island with positions on both sides |
| Tea room | Operators' tea room with a serving hatch into the switchroom | 5.7 x 5.7 | The tech's kettle |
| Instruction room | Operator training | 5.7 x 5.7 | |
| Stem corridor | From the switchroom to the offices, with the post room's clerk's hatch | 2.1 x 4.5 | |
| Clerks' office | Exchange clerks (billing, line orders) | 5.7 x 4.5 | Carpet; glazed partition to the corridor |
| Post room | Internal post, clerk's hatch | 3.3 x 4.5 | |
| Office corridor | T junction with the stem | 2.1 wide, linoleum; suspended ceiling at 3.0 with a ventilation void above it and grilles into each office | |
| Manager's office | Exchange manager | 5.7 x 4.2, street windows | The head of security's office |
| Records office | Line records (cabinets), document lift to the ground floor | 5.7 x 4.2 | Filing cabinets |
| Old equipment lobby | Receiving bay for apparatus between the offices and the apparatus room | 3.3 x 11.1 | Cold LED light under the server hall's double doors |
| Server hall (old apparatus room) | Strowger step-by-step racks 3.2 m in rows, cable runways at +4.4 | 13.8 x 11.1, 5.7 high (raised roof) | Racks partly stripped; server racks; chain-link cage (2.4) round the core switch; fluorescent work lights on circuits; the goods lift arrives here (out of service) |
| Lift motor room | The goods lift's winding gear (side drive), fixed ladder to a roof hatch | 5.1 x 5.7 | Rain heard through the hatch |
| Spares store | Apparatus spares | 5.1 x 3.55 | |

### Roof (9.0 / 10.5)
| Element | 1934 purpose | Size | Tonight |
| --- | --- | --- | --- |
| Main roof | Asphalt flat roof | 1.0 m parapets | Rain; puddles |
| Raised roof over the apparatus range | Height and clerestory light for the racks | +10.5, 14.4 x 12; 1.5 m step up from the main roof | |
| Tank room | Gravity water tanks, over the power room's south half (set 1.85 m back from the rear parapet) | 9 x 5.2, 3.0 high (roof +12.0) | |
| Roof hatch | Access to the roof from the lift motor room | 0.9 x 0.9 | The way onto the roof |
| Walkways | Steel grating to the tank room, with a bridge over the air shaft | 0.9 wide | |
| Hoist opening | Gap in the rear parapet under the old hoist beam over the goods door | 2.0 wide | |
| Roof lights | Lantern over the main stair; three strip roof lights over the MDF hall | | |
| Depository roof (neighbour) | | +7.6, parapet 0.6 | Its rear fire escape comes down into Cooper's Lane |

## 3. Vertical circulation
| Element | Connects | Notes |
| --- | --- | --- |
| Manhole ladder | Mill Street pavement to the cable tunnel | The cover is shut over the insertion point |
| Basement stair | Cable chamber to the MDF hall (-3.3 to 0) | 20 risers in two flights; fire door at the top |
| Main stair | Ground to first (0 to 4.5) | 26 risers (0.173 / 0.28), 1.4 wide, half landing +2.25; enters from the colonnade and the court |
| Passenger lift | Ground to first, in the stair hall | Out of service, gates locked |
| Goods lift | Goods hall to the server hall | Out of service, gates chained; motor room beside its shaft top |
| Steel stair | Power room floor to the switchgear gallery (0 to 4.5) | |
| Fire escape balcony | A steel balcony at +4.5 in the court, from the main stair's landing casement round the SW corner to the switchroom's fire exit window, then a counterweighted drop ladder to the court | The ladder is pulled up and latched. It does not go to the roof. |
| Roof hatch ladder | Lift motor room to the roof (4.5 to 9.0) | The only way onto the roof from inside |
| Rolling ladders | MDF hall floor to the frame tops (0 to 4.0) | On rails in the wide aisles |
| Document lift | Records office to the entrance hall | Hand-wound dumb waiter, a shaft about 0.9 x 0.9 |
| Depository fire escape | Depository roof to Cooper's Lane | Iron stairs and ladders on its rear wall |

## 4. Services (how things moved)
- **Cables**: street manhole, then the tunnel, then the cable chamber (on bearers), then up through floor slots into
  the MDF frames. From the frames, the cable trench under chequer plate runs to the hall's east end and on under the
  battery lobby to the riser. The riser carries them up to the apparatus room's cable runways at +4.4, and from there
  ducted cables go to the switchroom.
- **Power**: mains to the rectifiers, which charge the batteries and supply 50 V DC to the apparatus. Standby
  generators take over in a power cut. Switchgear is on the gallery.
- **Air**: the court and the air shaft give daylight and cross-ventilation. The battery room's extract duct (0.9 x
  0.9 galvanised) runs at high level to the fans in the fan room above and out through a roof cowl. The office suite
  has a plenum ventilation void over the corridor's suspended ceiling, with grilles into each office.
- **Heat**: a coke boiler in the power room's south-east corner. The heating main (flow and return, 0.2 m, lagged)
  runs along the power room's east wall at +4.4 and up into the first floor.
- **Water**: gravity tanks in the roof tank room. Rainwater runs off through hoppers and cast-iron downpipes in the
  court corners and on the rear elevation.
- **People**:
  - Staff came in at the Kestrel Street entrance hall.
  - Operators went up the main stair to the cloak lobby, the cloakroom and the switchroom.
  - Engineers worked the ground floor (MDF hall, test desk, power plant, workshop), using the colonnade and the
    power corridor.
  - Clerks used the office suite.
  - The night watchman made clocking rounds of the ground floor from the watch lodge.
- **Goods**:
  - Heavy plant, batteries and cable drums came through the rear yard and the rear goods entrance.
  - Apparatus racks came through the Kestrel Street goods door and up the goods lift to the apparatus room.
  - Line records went by the document lift.

## 5. The route over the building (order only)
| Space | Where | Building rooms |
| --- | --- | --- |
| 1 Cable tunnel and chamber | Basement, under the MDF hall's west half | Manhole, tunnel, cable chamber, basement stair to the fire door |
| 2 MDF hall | Ground, NW | MDF hall; exit by the battery lobby (two doors) |
| 3 Battery and power rooms | Ground, W and SW | Battery room, power room and gallery, fan room (the extract duct ends there); exit by the power corridor and its glazed door |
| 4 Light well | Ground, centre | Colonnade, court, air shaft; up by the main stair, the drainpipes and string course, or the air shaft, to the cloakroom / cloak lobby (the pinch point) |
| 5 Switchroom | First, west of the court | Cloak lobby, switchroom, tea room (serving hatch); exit by the stem corridor with the clerk's hatch |
| 6 Offices | First, NW of the court | Office corridor (T), clerks', post, manager's and records offices, ceiling void, document lift; exit to the old equipment lobby |
| 7 Server hall | First, N and NE | Old equipment lobby, server hall, lift motor room; ladder to the roof hatch |
| 8 Roof and yard | Roof, rear yard, lane | Walkways, tank room, hoist opening (rope to the yard), rear drainpipes, the depository roof and its fire escape, the yard, the side gate, Cooper's Lane (extract) |

The route is a spiral. It goes down into the basement and up into the NW hall, round the south-west plant, into the
court, up to the first floor, clockwise round the court (south, west, north, east), onto the roof and down the rear
elevation to the yard and the lane.

## 6. Checks

### Every room reachable by real circulation
- The entrance hall reaches the MDF hall, the colonnade, the call office and lodge, and the goods hall.
- The colonnade reaches the mess, the WCs, the court, the main stair and the power corridor.
- The power corridor reaches the power room and the goods entrance.
- The MDF hall reaches the battery lobby, then the battery room, then the power room, its gallery and the fan room.
- The court reaches the test room, the main stair and the air shaft.
- The main stair reaches the first-floor landing, which reaches the cloak lobby (then the supervisor, rest room,
  first aid and switchroom) and the cloakroom (then the washroom and WCs).
- The switchroom reaches the tea room, the instruction room and the stem corridor, which leads to the office suite.
- The office suite reaches the old equipment lobby, then the server hall, then the lift motor room, the spares store
  and the roof.
- The cable chamber is reached by the basement stair (and the manhole).
- Passes: every room has a door on a corridor, lobby or adjoining room. No room is reached only through a window.

### Real proportions (spec table)
| Item | Spec | Here |
| --- | --- | --- |
| Corridors | 1.8-2.4 | 2.1 everywhere (see the split rule below) |
| Doors | 0.9-1.0 x 2.1, double 1.8 | 1.0 x 2.1; double 1.8 (main entrance, server hall, sealed plant doors) |
| Stairs | 1.2-1.5 wide, 0.17 / 0.28, landing per half flight | Main 1.4, 0.173 / 0.28, half landing; basement 1.3, 0.165 / 0.28, half landing; steel stair to the gallery (plant stair, steeper) |
| MDF frames | 4.0 tall, aisles 1.2-1.95 | 4.0 tall; one aisle 1.85, the rest 2.25-3.1 (deviation D3) |
| Apparatus racks | 3.2, aisles 1.0-1.2 | 3.2, aisles 1.0-1.2 |
| Cable runways | 4.3-4.5 above the floor | +4.4 (the raised roof makes room, deviation D2) |
| Switchboard suite | 1.4 tall, positions at 1.5 m | 1.4, 1.5 m centres, about 7 m long |
| Offices | 4-6 m square | 5.7 x 4.2 (manager's, records), 5.7 x 4.5 (clerks') |
| Light well | 10-14 m square | 12 x 12 |
| Storeys | 0 / 4.5 / 9.0, parapet 1.0 | Same; raised roof 10.5 over the apparatus range only (D2) |
| Walls | external 0.45, internal 0.23-0.3 | 0.45 / 0.3 |
| Windows | sill 0.9, 1.6-2.0 wide, 2.4 high, regular rhythm | Same, 3 m rhythm; double-height rooms 6.0 high from 1.5 |

### At most three walkable surfaces per column
The nav keeps the lowest three standing surfaces (1.7 m headroom). A box standing on a floor replaces that floor in
its column. Highest count per area:
| Area | Surfaces |
| --- | --- |
| MDF hall over the cable chamber | Chamber floor -3.3, then the hall floor 0 (or a frame top +4.0, or the stair head lid +2.6), then the roof 9.0: **3** |
| MDF hall elsewhere | Floor (or frame top), roof: 2 |
| Basement stair | Flight, stair head lid, roof: 3 |
| Power room under the gallery | Floor, gallery 4.5, roof: 3 |
| Power room under the tank room | Floor, roof 9.0 (tank room floor), tank room roof 12.0: **3** (the tank room is kept off the gallery) |
| Battery room / fan room | Floor, fan room 4.5, roof: 3 |
| Every ground + first room | Floor, first floor, roof: 3 |
| Office corridor | Floor, first floor (the ceiling void has 1.1 m headroom, not a surface), roof: 3 |
| Server hall | Floor, first floor or a rack top (+7.7), raised roof 10.5: **3** |
| Main stair | Under-stair floor, flight / landing, roof: 3 (no first floor over the stair well) |
| Court under the fire escape balcony | Court, balcony: 2 |
| Air shaft under the roof walkway bridge | Shaft floor, bridge 9.0: 2 |
| Neighbour | One roof (its interior is not built) |

### No accidental split jumps
Any two facing faces at least 3.6 m tall and 1.2-1.95 m apart (overlapping by 0.8 m or more) make a split gap. Every
full-height wall in this building is 4.2 m or taller. So:
- Every corridor, lobby and narrow room is 2.1 m or wider (corridors exactly 2.1), or narrower than 1.2.
- Only two places are inside the window, both planned: the **MDF jumper aisle** (1.85 between two frame rows) and
  the **air shaft** (1.85).
- The other MDF aisles are 2.25-3.1 (D3).
- Racks (3.2), cubicles (3.4), stands, lockers, generators and the yard walls (2.7) are all under 3.6.
- The colonnade piers are 0.6 wide (under the 0.8 m overlap).
- The stair flights sit side by side in a 5.7 m hall, and the lift shaft stands 0.65 m from the upper flight.

### Windows on a rhythm
All windows are on a 3 m rhythm, centred 1.5 m either side of each grid line in every bay. The exceptions are where a
door, column or the stair takes the place: the court's north wall, the entrance doors and the goods doors.

### Gating: no route skips a space (real things only)
- **Kestrel Street doors** (main entrance, goods door): locked.
- **Lifts**: the passenger lift and the goods lift are out of service with gates locked. The goods lift would link
  the goods hall to the server hall.
- **Rear goods shutter**: locked from the yard side.
- **Plant doors to the yard**: sealed (heritage plant room).
- **Workshop yard door**: locked.
- **Street, lane and yard windows** on both floors: fixed wired glass. None opens onto a later space.
- **Court windows** on the first floor are fixed, except the cloakroom's four casements, the switchroom's fire-exit
  casement and the stair landing's casement (both onto the fire escape balcony). That keeps the string course from
  reaching the offices or the server hall.
- **Fire escape balcony**: stops at the first floor. It is out of reach of the string course (no string course on the
  west wall; the south wall's starts 3.0 m east of the balcony, past the tall stair window), so from the court it is
  reached only by a co-op boost (C1).
- **The colonnade's door into the stair hall**: locked, with the broker's crates stacked against it. The way up from
  the court is the stair hall's court door.
- **Drainpipes**: end in hoppers under the projecting cornice. Nothing within reach above a pipe top has standing room
  (the parapet top is 1.5 m over the highest grip), so the court does not lead to the roof. Phase 3 verifies it in
  the e2e.
- **The roof**: reached only by the hatch in the lift motor room (end of space 7), or from the lane up the
  depository's fire escape (backwards from the extract).
- **The fan room**: opens only onto the power room gallery. There is no door to the tea room.

### "Why is it here?" (architecture)
| Element | Why it is here |
| --- | --- |
| Cable tunnel, manhole, chamber, bearers, sump | Street cable entry under the MDF (standard GPO practice) |
| MDF frames, rolling ladders, test desk, cable trench | The main distribution frame and its maintenance |
| Jumper aisle (1.85) | The one aisle without a rolling ladder, between the two oldest frame rows. The wide aisles carry the ladder rails |
| Battery lobby (two doors) | Acid fume air lock |
| Battery stands, extract duct, fan room | Acid fumes drawn off at high level to fans above |
| Generators, cubicles, chequer plate, steel stair, gallery | Standby power plant with its switchgear kept clear of the plant floor |
| Heating main at +4.4 | The boiler's flow and return run along the plant wall at gallery height up to the first floor |
| Colonnade | A sheltered walk between the entrance and the rear without crossing the open court |
| Light well and string course | Daylight to the equipment floors. The string course marks the first floor on every court face |
| Air shaft | Light and air for the cloakroom, washroom and test room, which back onto the neighbour |
| Drainpipes | Rainwater from the court parapets and the rear roof |
| Fire escape balcony and drop ladder | Means of escape from the switchroom (the largest staffed room) and the stair landing into the court |
| Serving hatch | The operators' tea came through to the board without leaving it |
| Clerk's hatch | The post room served callers at a counter |
| Ceiling void and grilles | 1930s plenum ventilation for the office suite |
| Document lift | Line records sent between the records office and the entrance hall counter |
| Cable runways | Ladder racking carrying cables over the apparatus racks |
| Server cage | The broker's security round his core switch |
| Raised roof and clerestory | Height for the racks and runways, daylight over the apparatus |
| Goods lift, motor room, roof hatch | Apparatus in by lift; roof access for maintenance from the motor room |
| Tank room | Gravity water over the heaviest structure (the power room) |
| Walkways and the shaft bridge | Maintenance route from the hatch to the tanks, without crossing the asphalt |
| Hoist opening and beam | 1934 hoist over the rear goods door for heavy plant |
| Yard, gates, lane | Rear service yard; the side gate is the pedestrian way to the lane |
| Depository fire escape | The neighbour's means of escape, into the lane |

Verbs from the spec's table that the building supports as designed:
- Split (jumper aisle, air shaft); horizontal pipe (runways, heating main).
- Lips (string course, gallery edge, parapets, sills); wall jump (cubicles against a wall, trench walls).
- Ladders (rolling ladders, the hatch ladder; the chamber's access is the manhole ladder); drainpipes.
- Ducts (battery extract, ceiling void, document lift); rappel (hoist opening).
- Fences (stores cage, server cage, the yard's side gate); doors; windows; cover; hide spots (lockers, cupboards,
  cable drums).
- **Zipline: not used** (no believable fixture), as the spec says.

## 7. Deviations from the spec (for Michael's review)
| # | Spec | Proposed | Why |
| --- | --- | --- | --- |
| D1 | Space 1 "ground", chamber 3.0 m ceiling, "a short stair to a fire door" | The cable chamber is a **basement** (-3.3) under the MDF hall's west half, with a 20-riser stair in two flights | A 3.0 m chamber at ground level under a 4.5 m storey leaves a 1.2 m void (not real) or adds a fourth surface. Under the MDF it is how exchanges were built (cables rise straight into the frames), and it keeps the three-surface limit. The stair is short (one basement storey) but not 6-8 risers. |
| D2 | Roof 9.0 everywhere; runways 4.3-4.5 over the floor | The apparatus range (server hall) has a **raised roof at 10.5** (clerestory) | Runways at +4.4 over a first floor at 4.5 are at 8.9, above the 8.7 ceiling of a 9.0 roof. Rack tops (+7.7) also need standing room under the runways. Apparatus rooms were taller than other floors. The step up from the main roof is 1.5 m (a mantle). |
| D3 | MDF aisles 1.2-1.95 | One aisle 1.85 (the split), the others 2.25-3.1 | The spec's own "no accidental splits" target: every aisle in 1.2-1.95 between 4.0 m frames would be a split. The wide aisles carry the rolling-ladder rails. |
| D4 | (site not fixed) | Corner site: Kestrel Street N, Mill Street W, depository E, yard S, Cooper's Lane SE | The air shaft can then end at the neighbour's party wall and the depository's fire escape can come down into the same lane as the yard's side gate (space 8's secret route and the extract). |
| D5 | Battery extract duct "to a grille behind the gallery" | The duct rises into a **fan room** over the battery room, which opens onto the back of the gallery | A real destination for the duct: the fans. The fan room has no other door. |
| D6 | Fire escape in the light well | First floor only (landing + drop ladder), no roof | A fire escape to the roof would skip spaces 5-7. |
| D7 | Windows: open casements / fixed panes | All windows to the street, lane and yard are fixed; only five court / shaft casements open | Real security practice, and gating with real things (no route skips a space). |
| D8 | Plans `ground.svg`, `first.svg`, `roof.svg` | Plus `basement.svg` | D1 adds a storey; the standard asks for one file per storey. |
| D9 | "Server hall" on the first floor; "the lift motor room, its ladder up to the roof hatch" | Server hall in the north-east (street front), the **goods lift** beside it with a side-drive motor room south of it | The lift motor room must sit under the roof (for a hatch), next to the server hall. A side-drive goods lift that brought racks up from the street goods door fits both. |

## 8. Left for Phase 2 (not decided here)
- Guard routes, stops, isolation moments, lights per circuit, switches, lures, hide spots, cover, the dark and lit
  areas and the four routes per space.
- Placement of the rolling ladders and the trench covers.
- Which cloakroom casements open, where the string course is interrupted (the gap), the drainpipe on the shadow /
  high routes.
- The duct paths and grates; the rappel point at the hoist opening; the co-op lips C1-C3 and `EXCHANGE_COOP_LIPS`.
- Space 4's secret route as resolved on 2026-10-08 (jumping out of a split re-enabled): brace in the air shaft, jump
  up to the string course at +4.5 (reach from the 2.5 m feet line is up to about 4.75), then jump up 0.9 m to a
  cloakroom sill at +5.4 and climb in through the open casement.

---

# Part 2 - Gameplay design (Phase 2)

Overlays: [basement](exchange-plans/basement-gameplay.svg), [ground](exchange-plans/ground-gameplay.svg),
[first](exchange-plans/first-gameplay.svg), [roof](exchange-plans/roof-gameplay.svg). The overlays show the shadow, high,
loud and secret routes and the co-op routes C1-C3 in five colours. They also show guard routes with stops (wait,
facing), static posts with their focus cones, lit pools (lamp and radius), moonlit areas, loud floors, the planned
split gaps, vantages (V), objectives (stars), hide spots (H), switches (S), alarms (A) and takedown spots.

## 9. Engine facts this design is built on
All are measured from the code with the real functions, not estimated. The tables came from bundling `sightRate`,
`noiseRadius` and `SURFACE_NOISE` and running them.

**Sight.** Times to suspicious / detected (s) for a guard looking straight at the player (unaware, full exposure):

| Light on the player | Pose | 3 m | 6 m | 10 m | 15 m |
| --- | --- | --- | --- | --- | --- |
| Dark (ambient 0.10) | any pose, still or moving | never | never | never | never |
| Moonlit (0.29) | crouched, any gear | never | never | never | never |
| Moonlit (0.29) | standing gear 2 (1.3 m/s) | 2.3 / 7.7 | 4.6 / 15.4 | never | never |
| Moonlit (0.29) | standing gear 4 (2.8 m/s) | 1.4 / 4.8 | 2.4 / 7.8 | 10.1 / 33.7 | never |
| Lamp-lit (0.75) | crouched still | 0.9 / 2.9 | 1.2 / 4.2 | 2.7 / 9.1 | never |
| Lamp-lit (0.75) | crouched gear 2 | 0.5 / 1.8 | 0.7 / 2.5 | 1.4 / 4.5 | 10.1 / 33.8 |
| Lamp-lit (0.75) | standing gear 4 | 0.2 / 0.5 | 0.2 / 0.7 | 0.3 / 1.0 | 0.7 / 2.2 |

What the table means for the design:
- Darkness (ambient 0.08-0.12, the standard's value) is total cover. Only the 1.8 m close range gives a player away
  there, and only when moving and in front of (or walking past) the guard.
- Moonlight is safe crouched.
- **Lamps are the threat.** Every encounter is built from lit pools placed where a guard works or crosses, and
  darkness everywhere else.
- In the peripheral field (60 deg) a crouched, still player is never seen at 2 m or more, even when lit.

**Noise.**
- Footsteps are silent at crouched gears 1-4 and standing gears 1-2 on every surface. Audible radii (m):

| Surface | stand g3 2.0 | stand g4 2.8 | stand g5 3.8 | sprint | crouch g5 / g6 |
| --- | --- | --- | --- | --- | --- |
| concrete | 2.2 | 3.4 | 5.0 | 9.0 | 1.7 / 2.5 |
| metal (chequer plate) | 3.5 | 5.5 | 8.1 | 14.4 | 2.8 / 4.0 |
| grate (gallery, roof walkways, raised floor) | 3.0 | 4.8 | 7.1 | 12.6 | 2.4 / 3.5 |
| gravel (depository roof) | 2.8 | 4.5 | 6.6 | 11.7 | 2.3 / 3.2 |
| carpet (offices, office corridor linoleum) | 1.3 | 2.1 | 3.0 | 5.4 | 1.0 / 1.5 |

- A heard step raises a guard's meter to `noiseSuspicion(d, r)` = 0.12 + 0.58 (1 - d / r)^2 (`Enemy.hear` keeps the
  higher of that and the meter).
  - **Suspicious** (0.3) only within 0.44 of the radius.
  - **Investigating** (0.6) only within 0.09 of the radius.
  - So a loud floor brings a guard only if it is within about 2.4 m of where he stands (metal, standing gear 4).
  - Each planned loud floor sits right under a guard's stop.
- Walls muffle a noise to 0.45 of its reach.

**Patrols.**
- Guards walk at `walkSpeed` x 1.1: grunt 0.99, officer 0.94, heavy 0.83, sniper 0.94 m/s. They turn at 60 deg/s when
  calm.
- A route's stops all share one `wait`.
- Paused, a guard faces **along his next leg**. A stop cannot face a chosen direction; only a post (one point) has its
  own facing, with a glance either side every 14 s.
- Three or more points loop; two points go back and forth. Legs between stops follow the nav (A*), so the stops are
  placed where the shortest path is the intended one.

**Takedowns** (the geometry behind every takedown spot below):
- Drop: from a split, pipe, rope or lip, the guard 1.2-5 m below and within 1.0 m.
- Inverted: the guard's feet 0.6-2.8 m under the inverted root, which hangs 0.64 m under the pipe. So the pipe must
  be at most 3.44 m over his floor.
- Ledge pull: hanging, the guard 0.8-2.6 m above the hang root and within 1.4 m. A guard standing at a lip right over
  the hands qualifies.
- Above: from a standing surface 1.1-4.6 m over him, within 2.2 m.
- Window: across an open window plane, within 1.7 m, level within 0.6 m.
- Vent: from a duct, the guard 0.66-4.6 m below, within 2.2 m.

**Glass.** Fixed panes (`glassZ` / `glassX`) are static bodies: they block guards' sight and bullets but the player sees
through them. A vantage behind glass is safe.

## 10. Space sheets

### Space 1 - Cable tunnel and cable chamber
| Field | Content |
| --- | --- |
| Space | Basement (-3.3); street cable entry; tunnel 1.8 x 2.2 x ~7 m, chamber 9.55 x 11.85 x 3.0 |
| New mechanic | Teaches speed gears, the light meter, the noise meter, hang and shimmy, a hide spot. Combines nothing (first space). |
| Entry vantage | None needed (no guards). The insertion at the manhole foot looks straight down the tunnel into the chamber. |
| Routes | **Quiet (shadow):** "I crouch along the tunnel, mantle over the low cable drums and drop down by the stair foot." **Loud:** "I walk round the end of the drums over the sump's chequer-plate cover; the noise meter jumps." **High:** "I grab the cable bearers on the east wall (2.2 m) and shimmy along them over the sump, then drop off by the stair." No secret (no guards). |
| Loop | The drums row: round its east end (over the sump) or over the drums. |
| Stepping stones | All dark except the north half under the bulkhead lamp. |
| Guards | None. |
| Lights | Caged bulkhead lamp on the north wall (-18.8, 11.4), intensity 0.9, radius 6, circuit `chamber`; switch at the stair foot (-20.3, 5.0). Ambient 0.08. Stepping into its pool fills the light meter; the switch turns it off. |
| Surfaces | Concrete; the sump's chequer-plate cover (metal) in the gap at the drums' east end (x -15.0..-14.2, z 6.0..7.6). |
| Toys | The switch, the sump cover, the bearers, the drums. |
| Hide spots | Between the cable drums (-22.6, 9.6). |
| Traversal elements | Cable bearers: steel brackets on the north and east walls carrying the cables (why: cable support). Lip 2.2 m over the floor; standing grab <= 2.7. No climb-up (ceiling 0.8 m above). Drums 1.2-1.8: mantle <= 1.8. |
| Exit | The basement stair (two flights) to the fire door with its wired-glass panel. Through it: the moonlit stripes across the MDF hall's west aisle. Space 2's vantage. |
| Tension | 1 |

### Space 2 - MDF hall
| Field | Content |
| --- | --- |
| Space | Ground, double height (8.7); the main distribution frame; 17.4 x 17.4 |
| New mechanic | Teaches darkness vs moonlight, timing a patrol, the split jump (and jumping up out of it), the rolling ladder to the frame tops. Combines gears, light and noise from space 1. |
| Entry vantage | V2, just outside the fire door in the dark SW corner (-22.4, 5.4). G1 can be seen at C1 (lit by the test desk lamp, 12 m east along the south cross aisle) once per cycle (41 s). G1 never faces the vantage at a stop. Walking C1 -> C2 he faces north; the vantage is dark (never seen). |
| Routes | **Shadow:** "I crouch north up the dark west aisle; the moonlit stripes from the street windows are safe crouched. I go along the north cross aisle under the windows and down the empty aisle at x -16.5. I wait at its south end until the watchman walks north up the jumper aisle, then cross to the dark end of the test desk, take the frame records and slip through the lobby door." **High:** "I climb rolling ladder L1 in the west aisle onto the frame tops (4.0), run along them and the jumper trough to the row over the jumper aisle. I hang off the lip or drop into the split, and wait for the watchman to walk under me: a drop attack. Or I jump back up to the frame top and carry on." **Loud:** "I walk straight east along the south cross aisle past the lit test desk to the lobby door." **Secret:** "I lift the loose trench cover by the fire door and crawl the cable trench under the floor, watching the watchman's feet through the slotted covers, all the way to the cable pit in the battery lobby." |
| Loop | Round frame row x -18 (or -15) via the north and south cross aisles. |
| Stepping stones | West aisle dark all along (moon stripes every 3 m, safe crouched); north cross aisle moonlit; aisles x -16.5 and -13.5 dark; the test desk's east end dark. Spacing <= 4 m. |
| Guards | G1 alone (loop). Isolation at C3. |
| Lights | Test desk lamp (green-shaded) at (-11.8, 1.9), intensity 0.85, radius 2.8, circuit `mdf-desk`; switch by the lobby door (-8.2, 0.6). It is the one lit pool, on C1. Darken it by the switch, by shooting the lamp, or by EMP; avoid it by the north cross aisle or the trench. Moonlit zones (0.28) under the north windows (z 14.6..17.55) and three stripes across the west aisle (from the west windows). Ambient 0.10. |
| Surfaces | Concrete. The trench covers (metal) run along the south cross aisle (z 3.05..3.65) and down to the lobby: 0.65-1.25 m from C1, so a standing step on them at gear 3+ makes G1 suspicious there (metal g3 3.5 m: suspicious within 1.5 m). |
| Toys | The desk lamp (switch / shoot), the rolling ladders L1 (-21.9, 8.0) and L2 (-15.9, 11.0), the trench, the split, two doors. Lure: switching the desk lamp off sends G1 to the desk, the south mouth of the jumper aisle, under the split's south end (a drop attack spot). |
| Hide spots | Jumper-wire cupboard by the south wall (-20.0, 0.6). G1 passes the south cross aisle every cycle and finds a body left there. |
| Traversal elements | Jumper aisle split (between frame rows x -12 and -9.55; 1.85 apart, frames 4.0 tall, 9.0 m long). Rolling ladders (0 -> 4.0, on rails in the wide aisles). Frame tops (0.6 wide) and the jumper trough at the frame heads (z 14.0..14.6, +4.0): the cross-connect cable trough. Frame-top lips 4.0 over the aisles (kept, D12). |
| Exit | Battery lobby door (-7.5, 0) on the south wall: the pinch point (the trench also ends in the lobby). Checkpoint: the frame records at the test desk's dark east end (-9.0, 1.9). The connector (two-door lobby, dark, quiet) shows the battery room's glass cells through the second door. |
| Tension | 2 |

### Space 3 - Battery room and power room
| Field | Content |
| --- | --- |
| Space | Ground: battery room (17.4 x 5.7, single storey); power room (17.4 x 11.4, double height) with the switchgear gallery (+4.5, 2.25 deep) |
| New mechanic | Teaches noise by surface (chequer plate loud, battery room quiet), the ledge pull, the heating main as a pipe, wall jump. Combines darkness and patrol timing. |
| Entry vantage | V3, the dark floor west of the generators by the steel stair (-21.0, -9.2). G2 can be seen on the gallery along its whole length (it is open on the void side). He is lit at E1 by the gallery work lamp, every 36 s. V3 is dark and under his line: never seen. |
| Routes | **Shadow:** "Through the dark battery room to its west door, down the power room's dark west side past the steel stair, east along the dark generator side between the generators and the cubicles, and along the east wall to the auto-start panel. North in the dark to the corridor door. Round the generators the other way if he looks." **High:** "From the generator side I wall jump onto the switchgear cubicles (3.4) against the south wall, walk them east and grab the heating main (1.0 m above). I go hand over hand north to the gallery's east end, wait under the engineer at the rail and pull him over (ledge pull), or climb up behind him. Then I hang-drop off the main's north end by the exit." **Loud:** "From the battery room door straight along the chequer plate under the plant lamp to the exit." **Secret:** "I stand on a battery stand, open the extract duct and crawl up its riser into the fan room. The grille door opens onto the back of the gallery behind the engineer." |
| Loop | Round the generator block (north side between the generators and the gallery edge, south side between the generators and the cubicles). |
| Stepping stones | Battery room dark throughout; the power room's west side, generator side and east wall dark; the plant lamp's pool covers the middle north. Spacing <= 6 m (the generator block is cover, 2.4 m). |
| Guards | G2 alone (back and forth on the gallery). Isolation at E2. |
| Lights | Plant lamp over generator 2 (-11.0, y 3.5, -13.0), radius 6.5, intensity 0.95, circuit `plant`; switch by the east exit door (-6.6, -9.4). Gallery work lamp at the gallery's east end (-8.5, y 6.8, -7.3), radius 5, intensity 0.9, circuit `gallery`; switch by the fan room door on the gallery (-15.8, -6.6). Ambient 0.10. |
| Surfaces | Battery room: acid tile (concrete, and a quiet room: no metal). Power room concrete. Chequer plate (metal) over the trench along the gallery's foot (z -9.3..-8.7, x -21..-7) and between the generators. The gallery is steel grating (grate). Paired: walk the chequer plate (loud) or the concrete beside it (quiet). Under E1 the strip is 1.4 m from G2: standing gear 4 makes him suspicious (0.44), then he investigates; crouched gears 1-4 are silent. |
| Toys | Two switches, two lamps (shoot), the extract duct, the heating main, two doors. Lures: the gallery lamp off brings G2 to E1 at the rail (the ledge-pull spot); a noise on the chequer plate brings him down the steel stair to the dark west side (behind / front takedown spots). |
| Hide spots | Acid store cupboard in the battery room (-22.9, -3.0). A body on the gallery is found by G2 (he walks it); one on the floor under the plant lamp too. |
| Traversal elements | Cubicles 3.4 against the south wall (wall jump 2.7-3.8, the cubicle face is the wall). Heating main pipe at +4.4 along the east wall (x -6.6, z -17.0..-8.6): the boiler's flow and return. Gallery edge lip with its rail (rail top +5.5: ledge pull on G2 at the rail). Gallery runway pipe 2.5 m over the gallery (z -7.4): the switchgear cable runway, for inverted takedowns on G2. Steel stair. The extract duct (entry on a battery stand, riser into the fan room). |
| Exit | The east door (-6, -10.2) into the power corridor: the pinch point. Every route ends there; the gallery routes come down the heating main, the steel stair or a hang-drop. Checkpoint: the auto-start panel in the dark SE corner (-6.7, -14.8). The connector: the 2.1 m corridor, dark, and its glazed door showing the court in rain. |
| Tension | 2 |

### Space 4 - Light well
| Field | Content |
| --- | --- |
| Space | Ground, open sky; court 12 x 12 with the colonnade on its west side and the air shaft off its SE corner |
| New mechanic | Teaches climbing: drainpipe, string-course shimmy with an outside corner and a gap jump, getting up a floor unseen. The air shaft re-uses the split and adds jumping up out of it to a lip. Combines light and patrol timing (G3 above). |
| Entry vantage | V4, the colonnade's covered end bay (4.5, -8.6), dark, roofed (G3 above cannot see into it). It sees the court, the court lamp's pool, the stair door and the switchroom's fire window above, where G3 shows (lit) once per 41 s cycle. |
| Routes | **Loud:** "I walk out of the colonnade into the lamp's pool, through the stair hall's court door and straight up the main stair." **Shadow:** "I crouch north along the dark colonnade, plant the tap on the junction box in the dark NW corner, come back down the court's west side under the balcony (its shadow) and cross the last 3 m of lamp light to the stair door when the tech has turned away from his window." **High:** "From the colonnade's north end I climb the NW drainpipe to the string course and shimmy east along the north wall, round into the east wall and south to the outside corner. Round the corner into the air shaft, jump the 1.85 m gap to the far string course, shimmy back west and pull up into the cloakroom's open casement." **Secret:** "Round the court's dark north and east sides into the air shaft. I double-jump into a split, jump up out of it to the string course, shimmy to the shaft casement and climb into the cloakroom." |
| Loop | Round the fountain (low cover, 0.6 m); and the colonnade with the court's west side. |
| Stepping stones | Colonnade dark; the court moonlit (crouched is safe); the lamp's pool by the stair door (the deliberate crossing); the NW corner and the east side darker (0.15). |
| Guards | None on the ground. G3 (space 5) covers the court through the switchroom's open fire window while he walks to it (S1 -> S2, facing east into the court). That is the overlap. |
| Lights | Court lamp, a bracket lamp over the stair hall's court door (10.5, y 3.2, -5.4): radius 6, intensity 0.9, circuit `court`; switch in the colonnade end bay by the corridor door (3.7, -9.7). Darken: switch, shoot, EMP. Avoid: the drainpipe or air shaft routes. The switchroom's work lamp lights G3 at his window. Moonlit court (0.29); the NW corner and the shaft 0.15; colonnade 0.10. |
| Surfaces | Stone flags (concrete), terrazzo colonnade. The fire escape balcony is grating (loud, first floor). |
| Toys | Court lamp (switch / shoot), drainpipes, the air shaft, the stair door, the fountain. Lures: switching the court lamp off sends the nearest calm guard, G3, down the main stair to the court door to look. That takes him out of the switchroom, and the dark stair hall becomes a takedown spot. A noisemaker on the balcony draws him to the fire window (window takedown from the balcony). |
| Hide spots | Cloakroom lockers (the connector) for the stair and casement arrivals. The colonnade end bay's crates are cover. |
| Traversal elements | NW and NE drainpipes (pipeV 0 -> ~8.5, hoppers under the cornice; no roof access). String course (+4.5) on the north and east walls, both shaft faces and the south wall east of x 12.0. Outside corner at (18, -4.15). Gap: the shaft 1.85 (jump <= 2.5). Cloakroom casements: sill +5.4, 0.9 above the string course (jump up from a lip 0.4-1.2). Air shaft split (1.85, faces 9-10 m, 6.0 long): jump up from the split to the string course (+4.5; reach up to ~4.75). |
| Exit | The cloakroom and the main stair's landing on the first floor, joined by the landing: the pinch point. Checkpoint: "tap the trunk cable" at the junction box in the dark NW corner (6.7, 5.2). Connector: the cloakroom, lockers, dark. |
| Tension | 3 |

### Space 5 - Operators' switchroom
| Field | Content |
| --- | --- |
| Space | First floor west of the court; 5.4 x 11.7, with the tea room (5.7 x 5.7) and supervisor's office |
| New mechanic | Teaches windows (entering, the window takedown), low cover along the suite (cover-to-cover, over-cover takedown), the grab and a locker hide. Combines climbing (the balcony). |
| Entry vantage | V5, the dark cloak lobby (3.0, -8.8), looking north through the propped-open switchroom door down the whole room. G3 is lit at S1 (desk lamp) and S2 (work lamp). Seen within one 41 s cycle; at S1 he faces the window, away from the door. |
| Routes | **Shadow:** "I wait in the lobby until the tech walks to the window, then crouch north along the switchboard suite's east face (low cover). When he heads for the tea room I slip past the supervisor's desk to the stem corridor door." **High:** "From the stair landing I climb out of the casement onto the fire escape balcony, go round the corner and along the court wall in the dark to the open fire window. When he stands at it I pull him through (window takedown), or wait for him to leave and climb in." **Loud:** "Straight up the middle of the room past both lamps." **Secret:** "Through the supervisor's office into the tea room, the operator's log off the shelf, and through the serving hatch behind the suite. North along the back of the suite to the stem door." |
| Loop | Switchroom -> tea room door -> tea room -> serving hatch -> switchroom; and round the suite island. |
| Stepping stones | The suite (low cover, 4.5 m long), the lobby (dark), the tea room (dark), the passage behind the suite. |
| Guards | G3 alone (loop). Isolation at S3 (the tea room). |
| Lights | Work lamp by the fire window (4.6, y 6.3, 1.0), radius 4, intensity 0.85, circuit `switchroom`; switch by the lobby door (3.9, -5.6). Supervisor's desk lamp (green) (1.5, 4.0), radius 2.5, circuit `super-desk`; switch by the stem door (5.6, 5.0). Ambient 0.10; tea room dark. |
| Surfaces | Wood block (wood) in the switchroom; the balcony grating (grate) outside; tea room lino (carpet). |
| Toys | Two switches, two lamps, the serving hatch, the fire window, doors, lockers. Lure: his desk lamp off brings him to the desk at S1 (beside the stem door, and the dark passage behind the suite: grab or behind takedown). |
| Hide spots | Cloakroom lockers (connector) and the tea room larder (-5.4, -0.6). A body left in the switchroom is found by G3 (he crosses it twice per cycle). |
| Traversal elements | Fire escape balcony (+4.5) from the landing casement round the SW corner to the fire window: means of escape. The stair landing casement and the fire window (open casements). The serving hatch (open window anchor, sill 0.9, 1.2 wide). |
| Exit | The stem corridor door (4.8, 6.0): the pinch point. Checkpoint: the operator's log in the tea room, on the shelf by the supervisor's office door (-4.6, -5.4), dark, behind G3 at S3. Connector: the stem corridor, the clerk's hatch, voices from the offices. |
| Tension | 3 |

### Space 6 - Offices
| Field | Content |
| --- | --- |
| Space | First floor NW; corridor T (2.1), clerks' (5.7 x 4.5), post room (3.3 x 4.5), manager's and records (5.7 x 4.2), ceiling void over the stem and corridor |
| New mechanic | Teaches doors, corners and the corner takedown, cover-to-cover (desks), the human shield (grab), the vent drop, and the download's noise as a lure. Combines darkness and lures. |
| Entry vantage | V6, the stem corridor's dark south end (4.8, 7.4). It sees up the stem to the T, through the clerk's hatch into the post room, and G4 crossing the corridor when the download draws him. The manager's desk lamp shows G4 through the open office doors. G4's back-and-forth is inside the north offices and is visible through the doorways at (-3, 13.2) and (3, 13.2) within one 29 s cycle. |
| Routes | **Shadow:** "Over the clerk's hatch into the dark post room, through the connecting door into the clerks' office. I start the download, wait in the dark corner and take the head of security when the pulses bring him through the clerks' door, or let him go. Then I cross the corridor's west end when the tubes are off and go along to the exit when he is back at the records end." **High:** "From the switchroom I climb the fault-card cabinet into the ceiling void grille and crawl over the stem and the corridor. I watch him through the grilles and drop on him under the grille outside the clerks' door, or drop out by the exit door." **Loud:** "Up the stem and along the lit corridor to the exit door." **Secret:** "From the post room I slip across the corridor into the records office when he is in the manager's office. I open the old document lift hatch, crawl through the shaft and out into the equipment lobby." |
| Loop | The corridor and the interconnecting doors: clerks' <-> post room <-> corridor, and manager's <-> records <-> corridor. |
| Stepping stones | Post room, clerks' office, the dark stem, desks (low cover), the void over everything. |
| Guards | G4 alone (back and forth). Isolation at O2 (records). |
| Lights | Corridor tubes, two at (-3, 12.0) and (3, 12.0), radius 3, intensity 0.8, circuit `office-corridor`; switch at the stem (5.5, 7.0). Manager's desk lamp (-3.5, 16.6), radius 2.5, circuit `manager`; switch by his door (-2.0, 13.8). Clerks', post and records dark (ambient 0.10). |
| Surfaces | Carpet in the offices; linoleum corridor (quiet, carpet kind). The void is quiet. No loud floor (the space teaches doors and lures, not noise). |
| Toys | Two switches, doors (opened quietly or bashed), the void grilles, the document lift, the download. Lures: the download's pulses (`noticed()` -> `hear` at the terminal) bring G4 down the corridor, under the drop grille (-3, 12.0) and past the dark post room doorway (1.8, 10.8). The corridor lights off bring him to the stem switch (V6, corner takedown at the T). |
| Hide spots | Post room stationery cupboard (2.9, 6.6). A body in the corridor is found (G4 crosses it when lured; his doors open onto it). |
| Traversal elements | Ceiling void (a duct: entry wall grille in the switchroom's north wall at +3.0, from the 1.8 m fault-card cabinet; drop grilles over the T, at (-3, 12.0) and at (5.2, 12.0) by the exit; peek grilles into each office). Document lift (a duct through the shaft, records office -> equipment lobby, hatches at desk height). Clerk's hatch (open window). |
| Exit | The corridor's east door (6, 12.0) into the old equipment lobby (the document lift and the void's drop grille arrive beside it): the pinch point. Checkpoint: the download terminal in the dark clerks' office corner (-5.0, 7.0), off G4's route. Connector: the old equipment lobby, cold LED under the server hall's doors and through its glazed viewing screen. |
| Tension | 3 |

### Space 7 - Server hall
| Field | Content |
| --- | --- |
| Space | First floor N/NE, raised roof; 13.8 x 11.1; the old apparatus room |
| New mechanic | Combines: the runways as pipes over both guards (drop, inverted on the feeder), light management (two circuits plus LED), Mark & Execute (two guards in view), the cage fence. |
| Entry vantage | V7, behind the equipment lobby's glazed viewing screen (8.4, 9.2), dark. Glass blocks the guards' sight. It sees G6 at the gate (lit) and G5 at Q1 and Q4 and walking the north and south aisles within one 39 s cycle. |
| Routes | **Shadow:** "Through the lobby's north door into the dark north aisle behind the stripped racks. East to the gap in the row, round to the cage's dark north-east side while the patrol is on the west leg. I climb the fence on the blind side, install the tap, go back over and down the dark east aisle to the motor room door." **High:** "I wall jump onto the stripped west rack column, grab the runway over it and go hand over hand. I drop on the patrol at a corner of the aisles, or drop down to the feeder runway over the gate and choke the heavy upside down. Then into the open-topped cage." **Loud:** "Through the double doors at the heavy, using Mark & Execute on both when the patrol is in view." **Secret:** "Along the tops of the stripped racks (the west column joins the north row) to the cage's north-east, down behind it and over the fence on the blind side." |
| Loop | Round the cage through the rack aisles (north, east, south, west). |
| Stepping stones | Behind the stripped racks (north row, west column), the dark NE and SE corners, the cage's dark interior, rack tops. |
| Guards | G5 loop (Q1-Q4), G6 static post at the gate. Overlap: G6 faces west and covers the double doors and the west aisle, where G5 turns at Q1 and Q4. G5 at Q2 / Q3 faces the cage's east side (the blind side). Who first: G5 at a corner (G6 can see the west corners), or G6 when G5 is east. Isolation: G5 at Q2 (dark, behind G6); G6 when G5 is on the east leg (his back is the dark cage). |
| Lights | West tubes over the west aisle (12.6, y 8.4, 11.8), radius 6, intensity 0.9, circuit `hall-west`; switch by the double doors (10.1, 13.0). East tubes over the server column (21.3, y 8.4, 9.4), radius 5, circuit `hall-east`; switch by the motor room door (19.0, 6.6). Server LEDs (rack glow, no switch; EMP kills them). Ambient 0.10. Phase 3 tunes the lamps so the gate and the west aisle's middle read lit and the aisle ends read shadow. |
| Surfaces | The broker's raised floor throughout (grate, loud: standing gear 3 heard at 3.0 m). Rack tops are quiet (steel, but climbing is silent). |
| Toys | Two circuits (switches, shoot the tubes), the LEDs (EMP), runways, the cage fence, two doors, the glazed screen. Lures: the west tubes off bring G6, the nearest guard, off his post to look under the dead lamp in the west aisle (a grab or behind takedown from the dark). A noise in the north aisle brings G5 under the north runway (drop). |
| Hide spots | An empty Strowger cabinet in the west column (10.4, 10.6). A body anywhere in the aisles is found by G5. |
| Traversal elements | Stripped racks 3.2 (wall jump onto them; rack tops walkable, 2.5 m headroom). Runways at +4.4 (pipeH 8.9) over the north, south, west and east aisles, 0.3-0.6 m from G5's line (drop 1.2-5: from a hang at 8.9 the root is 7.0, 2.5 over the floor). Feeder runway at +3.3 (7.8) over the gate (inverted on G6: root 7.16, his feet 4.5, 2.66 below, within 2.8). Cage fence 2.4, open top. |
| Exit | The lift motor room door (19.5, 6.0) on the south wall: the pinch point. Checkpoint: "install the tap" (4 s) on the core switch in the cage's dark NE corner (18.6, 13.2), behind G6 and peripheral to G5 at Q2. Connector: the lift motor room, rain on the roof hatch, the ladder up. |
| Tension | 4 |

### Space 8 - Roof and yard
| Field | Content |
| --- | --- |
| Space | Roof (+9.0, parapets 1.0) and the rear goods yard (48 x 18), the lane |
| New mechanic | The set piece: combines everything; the rappel (and a drop attack from the rope) is the one new verb. |
| Entry vantage | V8a, the roof hatch (21, 2.8), dark. G7's laser along the rear parapet shows where he is. V8b, the hoist opening on the rear parapet (1.6, -17.0), dark, 22 m from G7 and 39 deg off his cone. It sees both loaders below at the van, G8's pallets by the goods door and G9's far stack within one 36 s cycle. |
| Routes | **Shadow:** "Along the walkway to the hoist opening in the dark. I wait until both loaders walk back to the van, hook on and rappel down 9 m to the goods door. I slip east along the dark rear wall, down the dark east side of the yard and out of the side gate into the lane." **High:** "Round the tank room's dark north side, wall jump onto its roof (3.0) and drop on the lookout below (above takedown). Down the west drainpipe behind the van, and the loaders one by one at their far stops: or drop on the first from the rope when he stops at the pallets under the hoist." **Loud:** "Straight across the roof to the rear drainpipe by the workshop, down and a sprint to the side gate." **Secret:** "Over the east parapet onto the depository's gravel roof, along it to its iron fire escape and down into Cooper's Lane, never entering the yard." |
| Loop | Roof: round the tank room (both sides dark). Yard: round the van and the pallet stacks. |
| Stepping stones | The roof is moonlit (crouched safe anywhere); the yard's east and south edges are dark; the van, coke bunker, bins and pallet stacks are cover. |
| Guards | G7 sniper post at the roof's far SW corner facing the van; G8 and G9 loaders back and forth (same 36 s cycle, together at the van rear, apart at the far ends). Overlap: G7 covers the van (where both loaders meet, lit). Isolation: G7 always (far corner, dark, nobody watches him); G8 at the pallets by the goods door (24 m from G7, out of his range); G9 at the far stack (26 m from G7). |
| Lights | Yard floodlight on the rear elevation over the van (-12, y 6.0, -18.3) aimed south, radius 11, intensity 1.0, circuit `yard`; switch at its isolator by the yard gate (-23.3, -22.8). Lane lamp at the side gate (27, -26), radius 4. Roof ambient 0.28 (moon), yard 0.20 away from the floodlight, lane 0.15. |
| Surfaces | Asphalt roof (concrete); steel walkways and the shaft bridge (grate, loud); the depository roof (gravel, loud); the yard (concrete). |
| Toys | Floodlight switch / shoot, the rope, two rear drainpipes, the depository roof, gates, the lane lamp. Lures: the floodlight off sends the nearest loader to look under it on the rear wall (west, away from the side gate), and G7 loses the van in the dark; a noisemaker at the goods door holds G8 under the hoist. |
| Hide spots | Inside the tank room behind the tanks (-20.0, -11.6); a wheelie bin by the coke bunker (-20.9, -19.6). A body at the van is found by G7 / the other loader. |
| Traversal elements | Hoist opening and beam: rappel 9 m, the 1934 goods hoist. Rear drainpipes (-12, -18.25) and (12, -18.25). Tank room 3.0 (wall jump; above takedown on G7, 3.0 down within 1.2 m). The depository parapet and fire escape (the neighbour's means of escape). Walkway bridge over the air shaft. |
| Exit | The side gate (24, -27.5) into the lane; extract at (27.0, -27.5), radius 2. All routes end in the lane (the secret one along it). |
| Tension | 5 |

## 11. Guard sheets
Facing is the next leg at every stop. Cycle = walk + waits; turns happen inside the waits.

| Guard | G1 - grunt - MDF hall |
| --- | --- |
| Job | The contracted night watchman on his clocking round of the hall: clock key at the test desk, at the jumper aisle's north end, at the NE corner by the door from the entrance hall. |
| Route | Loop, wait 4 s. C1 (-10.78, 4.3, y 0) facing N; C2 (-10.78, 15.6) facing SE; C3 (-7.6, 13.0) facing S. Legs: C1 -> C2 up the jumper aisle 11.3 m; C2 -> C3 round the row end 4.2 m; C3 -> C1 down the east aisle 11.6 m. Walk 27.1 m / 0.99 = 27.4 s + 12 s = **39.4 s** (about 41 with turns). |
| Gaps | While he walks C1 -> C2 (11 s) the south cross aisle and the west half are behind him. From C2 to the middle of the C3 -> C1 leg (about 16 s) the south cross aisle is clear. |
| Isolation moment | C3, the dark NE corner by the door, 4 s every cycle (and the whole jumper aisle walk). |
| Covered by / covers | Nobody (single guard). |
| Lures | Desk lamp off / shot: to the desk (the jumper aisle's south mouth, under the split). A noise: to the noise, then the search ring. |
| Search | Suspicious 3.5 s, investigate (look 4 s, 20 s max), search ring up to 11 m. Hide spots within reach: the jumper-wire cupboard, the basement stair (down and out of sight), the frame tops and the trench. |

| Guard | G2 - grunt - power room gallery |
| --- | --- |
| Job | The engineer on night duty reading the switchgear gauges along the gallery, pausing at the rail to look over the generator running in standby. |
| Route | Back and forth on the gallery (y 4.5), wait 5 s. E1 (-8.0, -7.6) at the rail, lit, facing W; E2 (-20.5, -7.3) at the panels, dark, facing E. 12.5 m each way: 25.3 s + 10 s = **35.3 s**. |
| Gaps | Walking west (12.6 s) his back is to the heating main, the gallery's east end and the exit door. At E2 the east half is 12 m away in his focus, but dark. |
| Isolation moment | E2, the gallery's dark west end, 5 s each cycle. The fan room door (secret exit) is behind him as he walks west past it. |
| Covered by / covers | Nobody. |
| Lures | Gallery lamp off: to E1 at the rail (ledge pull). Chequer plate at standing gear 4 within 2.4 m of him: suspicious -> down the steel stair (west end) to the noise. |
| Search | Down the steel stair to the floor; ring round the generators. Hide spots: the acid store cupboard, the battery room (dark), the fan room. |

| Guard | G3 - grunt - switchroom |
| --- | --- |
| Job | The broker's tech, working nights at the old supervisor's desk, getting up to look out at the court (waiting for the van), making tea. |
| Route | Loop, wait 4 s. S1 by the supervisor's desk (1.2, 2.4) facing ESE; S2 at the fire window (5.0, 1.5) facing WSW; S3 at the kettle in the tea room (-3.6, -3.0) facing ESE. Legs 3.9 + 13.6 (behind the suite, through the tea room door) + 11.2 = 28.6 m / 0.99 = 28.9 s + 12 s = **40.9 s**. |
| Gaps | S3 (4 s) plus most of the two tea room legs (about 14 s): the switchroom's east side is unwatched. |
| Isolation moment | S3 in the dark tea room, alone, 4 s. The supervisor's office door is behind his left shoulder. |
| Covered by / covers | Covers the court (space 4) through the open fire window on the S1 -> S2 leg (facing east, 4 s per cycle, plus S2 itself at 0.8 m from the window). |
| Lures | Desk lamp off: to S1. Work lamp off: to the window (S2). The court lamp off: down to the court door. A noise at the fire window (balcony): to the window. |
| Search | The switchroom and tea room; ring to 11 m includes the cloak lobby. Hide spots: cloakroom lockers, tea room larder, the balcony (out of his search ring's floor). |

| Guard | G4 - officer - offices |
| --- | --- |
| Job | The broker's head of security working at the manager's desk and filing in the records office. Officer: if he detects, he runs to the corridor alarm first. |
| Route | Back and forth through the connecting door, wait 6 s. O1 manager's desk (-3.0, 16.0) facing E; O2 records filing (3.4, 16.9) facing W. 6.7 m each way: 14.3 s + 12 s = **26.3 s** (about 29 with turns). |
| Gaps | Both stops face along the north wall; the corridor (through the doors) is always to his side or behind. |
| Isolation moment | O2, the dark records office, 6 s. |
| Covered by / covers | Nobody. |
| Lures | The download's pulses: down the corridor to the clerks' office, under the drop grille, past the post room doorway. Corridor tubes off: to the stem switch (the T, corner takedown). His desk lamp off: back to O1. |
| Search | Corridor and offices. Hide spots: post room cupboard, clerks' office (dark), the ceiling void (up through the switchroom cabinet). Alarm panel at the corridor's west end (-5.5, 12.0): officer runs there first. |

| Guard | G5 - grunt - server hall |
| --- | --- |
| Job | The broker's man walking the aisles round the cage. |
| Route | Loop, wait 3 s. Q1 (12.6, 15.0) facing E; Q2 (20.0, 15.0) facing S; Q3 (20.0, 9.0) facing W; Q4 (12.6, 9.0) facing N. 26.8 m / 0.99 = 27.1 s + 12 s = **39.1 s**. |
| Gaps | Q1 -> Q2 and the Q2 wait (10.5 s): the west aisle and south aisle are clear of him. Q3 -> Q4 (7.5 s): the north and east aisles are clear. |
| Isolation moment | Q2, the dark NE corner, behind G6, 3 s. |
| Covered by / covers | Covered by G6 at Q1 / Q4 (west corners, G6 facing west). Covers G6's back (the cage's east side) from Q2 / Q3. |
| Lures | Noise in the north aisle: under the north runway. West tubes off: G6 goes; G5 continues (the cage is then dark). |
| Search | Aisles and rack tops are not searched (floor ring). Hide spots: the empty cabinet, the stripped rack tops, the runways. |

| Guard | G6 - heavy - server hall |
| --- | --- |
| Job | The broker's heavy guarding the cage gate. |
| Route | Static post at the gate (14.2, 11.8), facing W (yaw -90 deg), glances +-34 deg every 14 s for 2.4 s. |
| Gaps | His back is the dark cage interior, and the cage is open-topped. |
| Isolation moment | When G5 is on the east leg (Q2 -> Q3, about 9 s per cycle), nobody watches G6's back. |
| Covered by / covers | Covers the double doors and the west aisle (G5's west corners). Covered by G5 from the east side. |
| Lures | West tubes off: he walks under the dead lamp in the west aisle (grab / behind from the dark north aisle or the lobby). |
| Search | Heavy (slow, 0.83 m/s). Frontal takedown lethal only; behind, drop and inverted work. Hide spots as G5. |

| Guard | G7 - sniper - roof |
| --- | --- |
| Job | The broker's lookout watching the loading over the rear parapet. |
| Route | Static post at the far SW corner (-21.8, -17.2), facing the van (yaw 129 deg), laser on, glances. |
| Gaps | The hoist opening (22 m, 39 deg off) and the yard's east half (beyond 25 m) are out of his sight; the van and its rear are in his focus at 11-14 m (lit). |
| Isolation moment | Always: the far corner, dark, nobody faces him. |
| Covered by / covers | Covers G8 and G9 at the van. |
| Lures | The floodlight off: he cannot see the van area (dark). A noise behind him on the roof: he turns and investigates it. He relocates only after firing. |
| Search | The roof. Hide spots: the tank room, the walkway bridge's shadow. |

| Guard | G8 - grunt - yard |
| --- | --- |
| Job | Loader carrying kit from the pallets at the rear goods door to the van. |
| Route | Back and forth, wait 5 s. Y1 pallets (0.6, -19.4) facing WSW; Y2 van rear (-10.6, -25.4) facing ENE. 12.7 m each way: 25.7 s + 10 s = **35.7 s**. |
| Gaps | At Y1 and on the way back he faces the van; the yard's east side is behind him. |
| Isolation moment | Y1, the dark goods door, out of G7's range, 5 s (the rope drop spot). |
| Covered by / covers | Covered by G7 at the van. Meets G9 at the van rear every cycle (talking). |
| Lures | Floodlight off: the nearer loader walks to look under it on the rear wall. A noisemaker by the goods door: held at Y1. |
| Search | The yard ring. Hide spots: bins, coke bunker, the van's dark side. |

| Guard | G9 - grunt - yard |
| --- | --- |
| Job | Second loader, fetching from the far pallet stack. |
| Route | Back and forth, wait 5 s. Y2' van rear (-10.6, -24.4) facing ESE; Y3 far pallet stack (1.4, -27.9) facing WNW. 12.5 m each way: 25.3 s + 10 s = **35.3 s**. Phase 5 matches it to G8's cycle to 0.1 s by nudging Y3, so the pair always meets at the van. |
| Gaps | At Y3 he faces the van; the side gate and the dark east edge are behind him. |
| Isolation moment | Y3, the dark middle of the yard, 26 m from G7 (out of range), 5 s; G8 is at Y1 at the same time. |
| Covered by / covers | As G8. |
| Lures | As G8. |
| Search | As G8. |

Patrol mix by space: 2 loop; 3 back and forth; 4 none (the sentry overlap from 5); 5 loop (with the court leg); 6 back
and forth; 7 loop + static post; 8 sentry post + talking pair. No two adjacent spaces share a mix.

## 12. Beat chart
| # | Space / connector | Tension | Taught | Combined | Release / feeling |
| --- | --- | --- | --- | --- | --- |
| 1 | Cable tunnel and chamber | 1 | gears, light meter, noise meter, hang / shimmy, hide | - | Calm: alone underground, learning |
| c | Basement stair, fire door glass | 1 | - | - | Anticipation: the moonlit hall through the glass |
| 2 | MDF hall | 2 | darkness vs moonlight, patrol timing, split (+ jump out), rolling ladder | gears, light, noise | Watching one man's clockwork |
| c | Battery lobby (two doors) | 1 | - | - | Release: a dark box between two doors |
| 3 | Battery and power rooms | 2 | noise by surface, ledge pull, pipe, wall jump | darkness, timing | Machinery hum, a man above |
| c | Power corridor, glazed door | 1 | - | - | Release; glimpse of the court in rain |
| 4 | Light well | 3 | climbing, string course, outside corner, gap jump, getting up a floor | split, light, a watcher above | Exposed under the sky, watched from a window |
| c | Cloakroom (lockers, dark) | 2 | - | hide | Breath among the lockers |
| 5 | Switchroom | 3 | windows, window takedown, low cover, grab + locker | climbing (balcony) | Close quarters with a man at work |
| c | Stem corridor, clerk's hatch | 2 | - | - | Voices beyond the wall |
| 6 | Offices | 3 | doors, corners, cover-to-cover, corner takedown, human shield, vent drop, download noise | lures, darkness | Cat and mouse with a sharp officer |
| c | Old equipment lobby, glazed screen | 2 | - | - | Cold light under the doors; planning through glass |
| 7 | Server hall | 4 | - | runways (drop, inverted), light management, Mark & Execute, fence | Two guards covering each other: who first |
| c | Lift motor room, hatch ladder | 2 | - | - | Rain on the hatch; the last breath |
| 8 | Roof and yard | 5 | rappel (+ drop from the rope) | everything | The set piece under the floodlight |
| - | Lane (extract) | 1 | - | - | Out |

Tension rises 1 -> 5 overall, every space is followed by a release connector (1-2), and the set piece is last.

## 13. Decisions (Phase 2 refinements; for Michael's approval with this document)
| # | Change from the spec / Part 1 | Why |
| --- | --- | --- |
| D10 | G1's round stays in the MDF hall (the spec has it passing the colonnade too) | A round through the hall and the colonnade is over 60 s; the standard's cycle is 25-45 s. Space 4 keeps its overlap (G3). |
| D11 | The test desk moved to the south wall below the jumper aisle; the frame records lie at its dark east end | The objective must be dark and out of every guard's view; G1 clocks at the desk. The desk lamp lights only its west end. |
| D12 | MDF frame-top lips kept (the spec says remove them) | The frame tops are a solo-reachable surface (rolling ladders), which the standard (11.5) allows. The spec's own high route and the jump up out of the split need them. |
| D13 | The fire escape becomes a balcony at +4.5 from the stair landing casement round the SW corner to the switchroom fire window. No string course on the court's west wall; the south wall's starts at x 12.0 (past the tall stair window) | It gives space 5 its high route and keeps every space 4 route converging on the cloakroom / landing. From the court the balcony is only a co-op boost (C1), with a real reason (the drop ladder is pulled up). |
| D14 | The court's SW drainpipe removed | With no string course near it, it led nowhere but within reach of the balcony. |
| D15 | The colonnade's door into the stair hall is locked, with the broker's crates against it (the crates also block the nav) | Otherwise the stair is 2 m from the vantage and the loud route makes the court pointless. The way up is the stair hall's court door, in the lamp's pool. |
| D16 | Inverted takedowns on a gallery runway (2.5 m over the gallery, G2) and on a feeder runway (3.3 m over the floor, over G6's gate). The 4.4 m runways and the heating main carry drops and traversal. | `TAKEDOWN.invertedMax` 2.8 under the inverted root (0.64 m under the pipe): from a 4.4 m pipe a floor guard is 3.76 m below, out of range. The spec's "confirm drop and inverted" at 4.3-4.5 cannot hold for inverted. |
| D17 | G6 is a static post at the gate (the spec: "checks the cage rear") | At a stop a guard faces his next leg, so a back-and-forth gate <-> rear would face into the cage at the gate. A post faces west over the doors and the west aisle (the overlap) and its isolation is when G5 is on the east leg. |
| D18 | G9's isolation is at a far pallet stack, not in the van's cab | G7 overlooks the van, so the cab is never unwatched. |
| D19 | G4 goes back and forth between the manager's and records offices; the download terminal is in the clerks' office | Spaces 5 and 6 then use different patrol mixes; the terminal is off his route and its pulses are what bring him to the corridor. |
| D20 | The switchboard suite is an island (positions both sides) with the supervisor's desk at the north end | "Behind the suite" exists. G3's leg from the desk to the fire window faces the court (his overlap). |
| D21 | The battery -> power door at the west end of the battery room; the power room's chequer plate runs along the gallery's foot; the cubicles extend to the east wall | The vantage is dark and west. The noise test works (the plate within 1.4 m of G2's E1 stop). The cubicles reach under the heating main. |
| D22 | The tank room moved 1.2 m north (z -16..-10.8) | A guard can stand at the rear parapet in front of it, and the tank room's roof is 1.2 m from him (above takedown). |
| D23 | Server hall: a second door from the equipment lobby into the north aisle; the lobby's glazed viewing screen; an open-topped cage; the north row and west column stripped (dark), the south row and east column servers (LED) | Shadow route entry, a safe vantage, a way into the cage from above, and the dark / lit split the routes need. |
| D24 | A 1.8 m fault-card cabinet in the switchroom under the ceiling void's wall grille | The void's entry grille is 3.0 m up; the cabinet puts it within 1.4 m of the feet. |
| D25 | A door between the supervisor's office and the tea room | The secret through the serving hatch needs a back way into the tea room. |
| D26 | Waits: G1 4 s (the spec says 5 s at the clock station), G3 and G5 3-4 s | With one wait for all stops, 5 s takes G1's loop past 45 s. |
| D27 | Yard tonight: the van under the floodlight, pallets at the goods door, a far pallet stack, a coke bunker, bins, a lane lamp at the side gate | The loaders' jobs and the dark / lit layout of the set piece. |

## 14. Coverage table
| Verb (CLAUDE.md) | Taught | Tested | Combined |
| --- | --- | --- | --- |
| Speed gears, silent gears | 1 | 3 (chequer plate) | 7 (raised floor), 8 |
| Crouch / stand, kneel | 1 | 2 | all |
| Sprint, forward roll | 1 (tunnel) | 8 (loud route) | - |
| Manual jump (leap) and its grabs | 2 (split double jump) | 4 (shaft) | 7 (rack tops) |
| Step / vault / mantle / drop / hop | 1 (drums) | 3 (generator side) | 8 (pallets, bunker) |
| Cover (low / high), peek, blind fire | 5 (suite) | 6 (desks, the T) | 7, 8 |
| Cover-to-cover, SWAT turn, corner swing | 5 (suite gaps), 6 (the T) | 6 | 8 (van, pallets) |
| Contextual lean, slicing the pie, doorway check | 6 (doors, T) | 6 | 7 |
| Ladders | 2 (rolling ladders) | 7 (hatch ladder) | - |
| Drainpipes | 4 (NW, NE) | 8 (rear) | - |
| Horizontal pipe: hands, legs up, inverted, turning | 3 (heating main) | 7 (runways) | 7 (feeder, inverted) |
| Ledges: hang, shimmy, climb up, lower in | 1 (bearers) | 4 (string course) | 6, 8 (parapets) |
| Ledges: gap jump, outside corner | 4 (shaft gap, corner) | 4 | - |
| Zipline | not used: no believable fixture in a 1934 exchange (spec) | | |
| Ducts: crawl, unscrew / kick, vent drop, peek grates | 2 (trench) | 3 (extract duct), 6 (void, vent drop) | 6 (document lift) |
| Windows: open vault / glazed break | 4 (casements) | 5 (fire window, hatches) | - |
| Landing bands | 1 (drums) | 3 (hang-drop off the main) | 8 (rope, drainpipes) |
| Split jump and jumping out of it | 2 (MDF) | 4 (air shaft) | - |
| Wall jump | 3 (cubicles) | 7 (racks) | 8 (tank room) |
| Rappel (descend, kick out, unhook) | 8 | 8 | 8 |
| Rappel kick-through window | not used: the rear elevation's windows are fixed wired glass (D7 gating); a kick-through would open a later room early | | |
| Fence (climb, shimmy, flip over) | 7 (cage) | 7 | - |
| Doors (quiet / bash) | 2 (lobby) | 6 | 8 (gates) |
| Takedowns behind / front / side | 2 | 3, 5 | all |
| Corner takedown | 6 (the T) | 7 | - |
| Over-cover takedown | 5 (suite) | 8 (van) | - |
| Above (from a ledge / surface) | 2 (frame top) | 7 (rack top) | 8 (tank room) |
| Below (ledge pull) | 3 (gallery rail) | - | - |
| Window takedown | 5 (fire window) | - | - |
| Drop attack (split / pipe / rope) | 2 (split) | 7 (runways) | 8 (rope) |
| Inverted | 3 (gallery runway) | 7 (feeder) | - |
| Vent drop | 6 (void grille) | - | - |
| Grab, human shield, knock out / kill / shove | 5 (G3) | 6 (G4) | 7 |
| Mark & Execute | 7 | 8 | - |
| Bodies: carry, hide | 5 (lockers) | 6, 7 | 8 |
| Hide spots | 1 | 2-7 | 8 |
| Light switches, shoot lights | 1 | 2-7 | 8 |
| Goggles (night / sonar) | 2 (dark hall) | 7 | 8 |
| Gadgets (gas, flash, EMP, noisemaker, sticky cam, drone, mine) | not placed; every space has a problem a gadget helps with (matrix) | | |
| Alarms (disable a panel) | 6 (corridor panel) | 7 | 8 |
| Objectives: intel, sabotage, plant, download, extract | 2, 3, 4, 6, 8 | | |
| Co-op: brace / boost | C1 (court), C2 (power room) | C3 (server hall) | - |
| Co-op: human ladder | available onto the MDF frame tops (4.0 <= 4.1); not planned | | |
| Co-op: dual takedown | 8 (loaders at their far stops) | | |
| Co-op: ping | everywhere | | |

## 15. Tool / problem matrix
| Problem | Darkness / timing | Light switch | Shoot light / EMP | Lure (noise, lamp, download) | Takedown kinds | Anchors | Gadgets | Co-op |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lit pool on the way (test desk, court lamp, cage gate) | time the guard away | yes (each has a switch) | yes | lamp off draws the guard to it | behind at the lamp | go round above (frame tops, string course, runways) | EMP, flash | boost past (C1, C3) |
| Patrol over a crossing (G1, G5) | wait at the vantage | darken it | yes | noise sends him off | drop (split, runways), above (frame / rack top) | trench under; runways over | sticky cam to watch, gas | dual watch with pings |
| Pair / overlapping guards (G5 + G6, G8 + G9 under G7) | take each at his isolation moment | floodlight / west tubes off | EMP the LEDs | noisemaker splits them | Mark & Execute, inverted + drop | rope, runways | gas, flash | dual takedown |
| Sniper overwatch (G7) | approach from behind in the dark | floodlight off blinds him | shoot the floodlight | noise behind him | above from the tank room roof | the hoist opening (out of his cone) | EMP, drone dart | one spots, one moves |
| Officer next to an alarm (G4) | wait for O2 | corridor tubes off | yes | the download's pulses | vent drop, corner, grab | ceiling void, document lift | gas in the corridor | one holds the alarm route |
| Loud floor (chequer plate, raised floor, walkways, gravel) | silent gears | - | - | noise as a lure (deliberately) | - | heating main, rack tops, frame tops above it | - | boost over it (C2) |
| Blocked / locked route (stair door, shutters, lifts) | - | - | - | - | - | court door, drainpipes, air shaft, balcony | - | boost (C1) |
| Watched window (G3 at the fire window) | wait for the tea room | his lamps off | yes | noise on the balcony | window takedown | balcony, serving hatch | sticky cam | C1 boost to the balcony |
| Heavy (G6) | behind him from the dark cage | west tubes off moves him | yes | switch lure to the doors | behind, drop, inverted (no frontal non-lethal) | feeder runway, cage top | gas, flash | dual with G5 |

Every problem has at least three tools; every tool solves at least three problems.

## 16. Metrics check (against the spec's Target numbers and the constants)
| Element | Build | Window | Pass |
| --- | --- | --- | --- |
| MDF split | Frames 4.0 tall, 1.85 apart, 9.0 m long (spec >= 5) | SPLIT 1.2-1.95, faces >= 3.6, overlap >= 0.8 | yes |
| Air shaft split | Walls 9-10 m, 1.85 apart, 6.0 m long | as above | yes |
| No accidental splits | Every other facing pair of faces >= 3.6 m is 2.1 m or wider or under 1.2 (Part 1 section 6); racks 3.2, cubicles 3.4 | automatic gaps | yes (Phase 4 test lists them) |
| Jump out of a split | MDF: frame top 4.0, 0.45 above the reach point (2.5 + 1.05); shaft: string course 4.5, 0.95 above | findJumpTarget up: 0.4-1.2 above | yes |
| Wall jump | Cubicles 3.4 (face = wall); racks 3.2; tank room 3.0 | WALL_JUMP 2.7-3.8, wall within 1.0 (spec 3.2-3.6 for the planned ones) | yes |
| Standing grab | Bearers 2.2; heating main 1.0 over the cubicles; runways 1.2 over the rack tops; gallery runway 2.5 over the gallery | REACH.grabMax 2.7 | yes |
| Gap jump | Air shaft 1.85 | maxGap 2.5 | yes |
| Jump up from a lip | String course 4.5 -> casement sill 5.4 (0.9) | 0.4-1.2 | yes |
| Generated lips | Frame tops 4.0 (kept, D12), cubicles 3.4, racks 3.2, gallery edge / rail, parapets, tank room 3.0, the stair head lid 2.6, drums < 1.9 (none) | LEDGE.minDrop 1.9 | listed; noLedge on the colonnade crates and the balcony's inner edge |
| Runways | 4.4 over G5's floor, 0.3-0.6 m off his line | TAKEDOWN drop 1.2-5 (root 2.5 over the floor), reach 1.0 | yes |
| Inverted | Gallery runway 2.5 over G2 (root 1.86 above his feet); feeder 3.3 over G6 (2.66) | 0.6-2.8, reach 0.9 | yes (D16) |
| Heating main | 4.4 over the power room floor (traversal); hang-drop off its north end 2.5 m | landing soft < 2.5 | yes |
| Ledge pull | G2 at the gallery rail, hands on the rail top +5.5, his feet 4.5 -> 0.9 above the root (+3.6) | 0.8-2.6, 1.4 | yes |
| Window takedown | G3 at S2, 0.8 m inside the fire window; balcony level with the floor | 1.7, level 0.6 | yes |
| Vent drop | Void floor +3.0 over G4's floor | 0.66-4.6, 2.2 | yes |
| Above (tank room) | G7 3.0 m below, 1.2 m from the roof edge | 1.1-4.6, 2.2 | yes |
| Rappel | Hoist opening at +9.0 (parapet gap 2.0), 9.0 m rope to the yard; no window within reach (fixed glass) | RAPPEL | yes |
| Fence | Cage 2.4 | FENCE | yes |
| Lit pool / dark | Lamps 0.85-1.0, radius 2.5-11 (6-8 for room lamps); ambient 0.08-0.12 indoors, court 0.29, roof 0.28 | spec | yes (desk lamps smaller on purpose) |
| Co-op boost lips | C1 balcony edge 4.5 over the court; C2 gallery edge 4.5 over the power room floor; C3 runway 4.4 over the server hall floor | >= 4.3 (maxUp 3.8 + 0.5), <= 4.5 | yes |
| Cycles | G1 39.4, G2 35.3, G3 40.9, G4 26.3, G5 39.1, G8 35.7, G9 35.3 s (+ turns inside the waits); G6, G7 posts | 25-45 s, stops 3-6 s | yes |
| Guards | 9 (SQUAD_CAP 9) | <= 9 | yes |
| Three surfaces per column | Part 1 table, plus the balcony (court, balcony) and the void (no headroom) | <= 3 | yes |

### Co-op lips (`EXCHANGE_COOP_LIPS`, Phase 4)
| Id | Endpoints | Height | Boost floor | Solo route to the same surface |
| --- | --- | --- | --- | --- |
| C1 | Balcony court edge, x 7.2, z -4.8 .. 2.0 | 4.5 | court 0.0 | stair landing casement or the switchroom fire window |
| C2 | Gallery edge, z -8.4, x -18.0 .. -14.0 | 4.5 | power room floor 0.0 | steel stair; heating main |
| C3 | West runway, x 12.0, z 8.7 .. 15.2 (pipe) | 8.9 (4.4 over the floor) | server hall 4.5 | wall jump onto the west rack column, grab the runway |

Every other lip or pipe 3.8-4.5 m over its floor sits on a solo-reachable surface: frame tops (rolling ladders); string
course (drainpipes, the shaft split); heating main (cubicles). None is removed. A solo player never sees a brace or boost
prompt (no mates).

## 17. Section 3-7 check per space (pass / fail, one line)
| Space | 3 Space structure | 4 Guards | 5 Light and sound | 6 Pacing | 7 Agency and toys |
| --- | --- | --- | --- | --- | --- |
| 1 | pass: no guards; quiet / loud / high ways, exit to the vantage | n/a (no guards) | pass: lamp with switch; sump loud vs drums quiet | pass: teaches five basics safely | pass: switch, cover, bearers, drums |
| 2 | pass: V2 sees G1 at C1 each cycle; 4 routes; pinch at the lobby; loop round a row; dark every <= 4 m | pass: job, clockwork 41 s, isolation C3, lures to the split; body found in the south aisle | pass: desk lamp with switch, darkened 3 ways, avoided by the north aisle / trench; trench covers loud | pass: one new mechanic set (split / ladder), tension 2 | pass: lamp, ladders, trench, split, doors |
| 3 | pass: V3 sees G2 along the gallery; 4 routes; pinch at the east door; loop round the generators | pass: job, 35 s, isolation E2, lures to the rail / stair | pass: two lamps with switches; chequer plate vs concrete side by side | pass: noise by surface, tension 2 (release after) | pass: switches, lamps, duct, pipe, doors |
| 4 | pass: V4 in the roofed end bay; 4 routes; pinch at the landing / cloakroom; loop round the fountain | pass: overlap from G3 (no guard on the ground: n/a for isolation) | pass: court lamp with switch, 3 ways to darken, avoided by pipe / shaft | pass: climbing, tension 3 | pass: lamp, pipes, shaft, door, fountain |
| 5 | pass: V5 sees the whole room; 4 routes; pinch at the stem door; loop via the hatch | pass: job, 41 s, isolation S3, lures to the desk / window | pass: two lamps with switches; balcony grating vs wood | pass: windows, tension 3 | pass: switches, hatch, window, doors, lockers |
| 6 | pass: V6 at the stem; 4 routes; pinch at the east door; loop via the connecting doors | pass: job, 29 s, isolation O2, lures under the grille and past the doorway | pass: tubes and desk lamp with switches; carpet and lino quiet (no loud floor here by design) | pass: doors / lures, tension 3 | pass: switches, void, document lift, download |
| 7 | pass: V7 behind glass sees both; 4 routes; pinch at the motor room door; loop round the cage | pass: jobs, 39 s + post, overlap both ways, isolations, lures | pass: two circuits with switches + LED (EMP); raised floor loud vs rack tops | pass: combines, tension 4 | pass: switches, runways, fence, glass, doors |
| 8 | pass: V8a / V8b see all three; 4 routes; all end in the lane; loops round the tank room / van | pass: jobs, 36 s pair + post, overlap, isolations at the far ends | pass: floodlight with switch, lane lamp; walkways / gravel loud vs asphalt | pass: set piece, tension 5 | pass: floodlight, rope, pipes, roof, gates |

No fails remain. Two items passed after fixes in this phase: space 4's routes all converging on the first floor (D13,
D15) and the server hall's inverted takedown (D16).

## 18. Self-critique (lead designer): the 10 weakest points and the fix for each
1. **Space 8's secret route over the depository is the safest exit.** No guard covers the depository roof or the
   lane, so a ghosting player always takes it.
   - Fix (in this design): its cost is noise (a gravel roof, 4.5 m at standing gear 4), an iron fire escape and a
     hang-drop into the lane, and it skips every takedown and the style bonus for the yard.
   - Further option for Michael: put G7's post at the roof's SE corner, covering the lane and the depository's fire
     escape. Then the pair are less covered.
2. **Guards cannot face a chosen direction at a stop.** So G3's overlap of the court is only his 4 s walk to the fire
   window, and G6 had to become a post.
   - Fix: stops are placed so the useful facing is the leg into them.
   - Future recommendation: a per-stop facing in `SquadSlot`.
3. **Darkness is absolute.** Below 0.12 ambient nothing is seen beyond 1.8 m, so the shadow routes are safe whenever
   they are dark.
   - Fix: every space puts its guard's work in a lamp's pool and its crossings next to it. The tension is in the lit
     crossing and the timing, not in the dark.
4. **Noise only brings a guard within 2.4 m.** That limits loud floors as threats.
   - Fix: each loud floor is placed under a guard's stop (the MDF trench by C1, the power room plate by E1, the server
     hall's raised floor everywhere G5 walks).
5. **The sloped extract duct (2.3 m rise over about 5 m, 25 deg).** The crawl pose stays level, so the body may clip.
   - Fallback if Phase 3's clip test fails: a fixed service ladder in a riser cupboard from the battery room to the fan
     room (same secret, a ladder instead of a crawl).
6. **The MDF vantage is at the fire door, and G1's lit stop is 12 m away.** On a phone at Low the desk lamp's pool
   is small.
   - Fix: the desk lamp's radius is 2.8 so it reads, and G1 passes through the lit south cross aisle twice per cycle.
7. **The talking pair needs exactly equal cycles.** Different cycles drift apart.
   - Fix: Phase 5 nudges Y3 until G8 and G9 match to 0.1 s, and the e2e checks they meet at the van each cycle.
8. **The court's loud route is short** (the lamp's pool is 3 m from the vantage).
   - Fix: it is lit and in G3's leg toward the window. The shadow route is the patient alternative, and the high and
     secret routes reach the cloakroom unseen.
9. **G6 is a heavy on a post.** Frontal takedowns on him are lethal only, so a non-lethal ghost must come from behind
   (from the cage) or above (the feeder runway).
   - Fix: both are planned, and the cage's open top makes the behind approach real.
10. **Space 6 has no loud floor.** That is intended (it teaches doors and lures), but it makes the space quieter than
    its neighbours.
    - Fix: the officer's alarm-first response is the threat there. The corridor alarm sits next to the download
      terminal.

## 19. Playtest checklist (for Michael's phone sessions and the e2e)
- From each vantage (V2-V8), can a first-time player read every patrol within one cycle?
- Is any route strictly best? Watch space 8's secret route (critique 1) and the court's loud route (critique 8).
- Is there a detection the player cannot escape? Every spot on a stealth route has a hide spot or a dark escape within
  11 m (the search ring).
- Did the player understand every detection? Lamps visibly light the guards' stops; G7's laser shows his cone.
- Was every toy used at least once across sessions (switches, rolling ladders, trench, duct, heating main, balcony,
  serving hatch, void, document lift, runways, cage, rope, depository)?
- Did the level feel like a 1934 telephone exchange (the MDF, the switchroom suite, the power plant, the apparatus room)?
- Darkness: does the light meter at Low match what the eye reads (the court's moonlight, the desk lamps)?
- The jump out of the split (MDF and air shaft): found without a prompt hunt?
