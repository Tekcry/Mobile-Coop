# Kestrel Exchange - design

Spec: `docs/prompts/exchange-map.md` | Standard: `docs/level-design.md` | Log: `docs/prompts/exchange-map-progress.md`

Status: **Phase 1 - architectural design, for Michael's review.** This part covers the building only. The gameplay
design (space sheets, guard sheets, overlays, beat chart, matrices, metrics, self-critique) is Phase 2, after review.

Plans (1 m = 10 px, 6 m grid, north up; the dashed red line is the route order, spaces 1-8, and nothing else from
gameplay):
- [Basement](exchange-plans/basement.svg) - cable tunnel and cable chamber, floor -3.3
- [Ground floor and site](exchange-plans/ground.svg) - floor 0.0
- [First floor](exchange-plans/first.svg) - floor 4.5
- [Roof](exchange-plans/roof.svg) - roof 9.0, raised roof 10.5

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
- **External walls** 0.45 m: red brick with Portland stone dressings, a stone plinth, and stone string courses on the
  light well and air shaft faces at first-floor level (+4.5) and under the parapet. The parapet is 1.0 m with a
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
  NW, NE and SW corners (the SE corner is the mouth of the air shaft) and on the rear elevation either side of the
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
| Light well (court) | Daylight and air for the equipment floors | 12.0 x 12.0, open | Stone flags, a dry fountain, drainpipes in three corners, the fire escape's first-floor landing on the west wall |
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
| Switchroom | Manual switchboard suite (sleeve-control positions at 1.5 m) and the supervisor's raised desk | 5.4 x 11.7 | The broker's tech's office; the suite kept (listed); the brass call-board clock on the north wall; tall windows over the court, one an opening fire exit onto the fire escape landing |
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
| Tank room | Gravity water tanks, over the power room's south half | 9 x 5.2, 3.0 high (roof +12.0) | |
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
| Fire escape | Switchroom fire exit window to a landing at +4.5 in the court, then a counterweighted drop ladder to the court | The ladder is pulled up and latched. It does not go to the roof. |
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
| Court under the fire escape landing | Court, landing: 2 |
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
- **Court windows** on the first floor are fixed, except the cloakroom's four casements and the switchroom's fire-exit
  casement. That keeps the string course from reaching the offices or the server hall.
- **Fire escape**: stops at the first floor.
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
| Fire escape landing and drop ladder | Means of escape from the switchroom (the largest staffed room) into the court |
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
