# Cinder Yard - campus building brief
Status: DRAFT (campus rewrite 2026-10-11)

Ostler Colocation's architect's record for the Cinder Yard campus off Cooper's Lane, Kestrel: Building A (2004), Building B (2021), the link bridge, the yard, the lane and what lies under the yard. Metres. Words and tables only; positions in words, P03B draws them. Short names: H = handover.md "Decisions to carry into P02", M = Michael's decisions for this stage, R = RULES.md section 1, D = 01-mission-brief.md "P02 must" lines, F = 00-facts.md, LD = docs/level-design.md, SS = docs/design/scale-sheet.md.

## 0. Inputs
| # | Decision or item | Where it lands (section, room ids) |
| --- | --- | --- |
| H1 | Parking in front of both buildings: marked bays, accessible bay by each entrance, visitor bays at A's reception, cars match the shift, Pell's van in the yard, tenant pair's van | 4; X03, X04, X12 |
| H2 | Extra rooms (gas suppression, generator hall with catwalks, CCTV equipment, key safe, customer staging and shipping cage, tape library, customer lounge, post room, locker room, media destruction) and a ground-floor staff WC off the controlled corridor | 5; BG28, BG40-BG43, AG12, AG13, BG07, BG08, AF05, AG02, AG04, AG14, AF06, AG15 |
| H3 | B's hall entered only upstairs: mantrap about 4.2 x 3.7 clear off the first-floor staff corridor, secure corridor, gallery with balustrade, stair down; hall 6.0 clear under the 6.6 roof; inner plant corridor from inside the hall; cooling gallery opens from the hall; switch bank on the gallery at its entrance | 2, 5, 11; BF05-BF10, BG13, BG20, BG23, BG24 |
| H4 | Equipment door, build room to hall: locked, no outside handle or reader, opens only from inside, alarmed, ring-exempt, never a way in | 5, 6; BG09, BG20 |
| H5 | Underfloor void: whole hall, 1.5 clear under thin tiles, structural slab sunk, hall floor level with corridors, hinged hatches throughout, level U, nobody on duty enters | 2, 5, 12b, 12c; BU01, BU02 |
| H6 | No goods lift. Main stair dog-leg, two 1.85 flights, open centre with balustrade, 2.0 landings, core about 4.0, off the controlled corridor only. Fire stairs: flights keep length, landings fill the core, solid centre wall, flights fill the width, ground exit on the end wall by the bottom landing | 8; AG18, AF12, BG02, BF02, AG21, AF15, BG12, BF11 |
| H7 | Corridor ceiling voids 1.5 clear on office floors only; offices keep normal ceilings; about 4.2 floor to floor; no void into a room whose walls run to the slab | 2, 9; AG10, AF01 |
| H8 | Carrier entrance under the yard feeds both buildings by the service tunnel; 2021 meet-me room in B; manhole by the vault | 9; TB01-TB04, AG23, BG31, BG32, BG30 |
| H9 | Pipe rack between the buildings, link bridge roof, roof cooling shaft into B's hall (bolted alarmed grille, key switch beside it, key in the key safe), cable and pipe risers with fixed ladders, smoke vents at the top of the fire stairs | 8, 9, 10; X13, LF02, BR05, AG25, AF16, AF19, BG15, BF12, BG32, AR04, BR02 |
| H10 | Downpipes on every facade, parapets and cills, fixed ladders, roof fall-arrest anchors, chain-link, a narrow service passage between B and the generator hall within F08 | 10, 12e; X07 |
| H11 | Neighbours: depot facade 7.0, viaduct 9.0 | 4 |
| M1 | H bullets adopted as Michael's decisions (progress.md line) | this table |
| M2 | One passenger lift per building in or beside the main core, every occupied floor, no goods lift, locked off at night (car at ground, doors shut, engineer's key or card only), nobody uses it tonight, full-height shaft with pit and machine space, type with a source | 5, 6, 7, 8, 9; AG19, AF13, AG20, AF14, BG03, BF03, BG04, BF04 |
| R1 | Campus of A (2004) and B (2021) joined at first floor by an enclosed bridge; shared grid, materials, storey logic, not identical | 2, 3; LF01 |
| R2 | RULES 1 list of hidden service paths, each with a real purpose (tunnel, rack, bridge roof, cooling shaft, corridor voids, risers, smoke vents, manhole and vault, underfloor void) | 8, 9, 10 |
| R3 | Extra rooms (as H2) | as H2 |
| R4 | Office floors: corridor-only suspended ceilings with a 1.5 void, about 4.2 floor to floor | 2, 9; AG10, AF01 |
| R5 | Control ladder: a real control at every zone boundary and inward step, knowledge gates, each with a costly alternative | 6 |
| D1 | Confirm the space-to-zone mapping in 01 section 6 | 6 |
| D2 | Place the loading apron or vehicle gate | 4; X02, X12, X08 |
| D3 | Carrier manhole | 4; TB02 |
| D4 | CCTV equipment room beside the security room | AG12 |
| D5 | Key safe room | AG13 |
| D6 | Locker room | AG14 (A, engineer's locker); BG06 (B locker area) |
| D7 | Link bridge | LF01, LF02 |
| D8 | Pipe rack | X13 |
| D9 | Technician's locker and car spot | BG06; 4 (B bay next to the accessible bay) |
| D10 | Ops monitoring desk, ops counter, night operations desk | AF02, AF03 |
| D11 | Cleaner's trolley bay | AG17 |
| D12 | Tenant cage near Pell's cage | BG22, BG21 |
| D13 | Customer staging | BG07, BG08 |
| D14 | B's plant corridor and its door | BG10 |

## 1. Precedents
| Precedent | Source | What this design takes |
| --- | --- | --- |
| Pure Data Centres, Brent Cross: second building on an existing London campus | (source: https://www.datacenterdynamics.com/en/news/pure-starts-work-on-second-building-at-brent-cross-campus-in-london-uk/) | Phase 2 as a separate, larger building on the same site, sharing the site's gate, yard and services |
| Ark Longcross: a two-building campus, the second building added later | (source: https://baxtel.com/data-center/ark-longcross-2) | Two buildings of one family, the later one built for denser load |
| Equinix "5 layers of security" | (source: https://equinix.com/resources/infographics/5-layers-of-security) | Nested rings: fence, reception, controlled staff floor, mantrap into the hall, locked cages |
| ANSI/TIA-942 functional spaces; Lumen London colocation data sheets | (source: https://silo.tips/download/ansi-tia-942-telecommunications-infrastructure-standard-for-data-centers); (source: https://assets.lumen.com/is/content/Lumen/len-1228-data-centre-colocation-london-uk-web) | Room vocabulary (entrance room = vault, meet-me room, computer room, support spaces); standby generator, bunded fuel, about 15 min battery autonomy |

Other sources used: lift data (Orona Next Essentia (source: https://www.orona-group.com/sites/default/files/2024-01/Orona%20Next%20Essentia_EN.pdf); Stannah Maxilift (source: https://www.stannahlifts.co.uk/product/passenger-lifts/maxilift-passenger-lift)); lift lobbies (source: https://www.designingbuildings.co.uk/wiki/Protected_lobby); mantraps (source: https://www.2mtechnology.net/security-vestibules-mantraps/); slab-to-slab secure walls (source: https://nationallocksupply.com/blog/data-center-door-hardware-spec-guide/).

## 2. The campus
- 2004: Ostler built Building A on the cleared goods yard as a small carrier-neutral data centre: reception, security and a raised-floor data hall on the ground floor, operations, records and offices on the first. LANTERN's 2003 fibre came in through the carrier vault under the yard (story).
- By 2019 A's hall was full and its single power intake and chillers were at capacity; the hall could not grow inside A (general knowledge: typical of 2000s colo). Phase 2 (2021) built Building B east of A on the rest of the yard: a larger hall, the new meet-me room, new power and a generator hall.
- They join at first floor because A's operations, records and engineers are on A's first floor and B's secure entry is on B's first floor: staff cross staff floor to staff floor without going outside, and the ground gap stays clear for vehicles and the fire brigade.
- B's hall is entered only from the first floor. B's ground floor holds goods, staging, lockers and plant, which need yard doors; people enter the secure zone once, through the first-floor mantrap, under the bridge post's eye, away from every goods door. Equipment reaches the hall only when staff inside open the equipment door from the hall side, so that door has no handle or reader outside.
- Construction, both: steel frame on pad footings, composite floor slabs 0.3, blockwork plinth to 1.2 then insulated metal panel cladding, flat single-ply roofs with 1.1 parapets (general knowledge). A (2004) has punched office windows with cills; B (2021) is windowless except staff areas on its west strip. Grid: 6.0 x 6.0 bays, one grid for the whole campus on the 0.5 grid; gridlines run on across the gap (the gap is two bays). Columns stand in the hall's rack rows.
- Building A: 36.0 x 24.0 (6 x 4 bays), two storeys, 864 m2 per floor. Building B: 48.0 x 30.0 (8 x 5 bays): a two-storey west strip 18 x 30 (staff, goods, entry) and a single tall hall block 30 x 30. Both within RULES 2 (48 x 30).
- Generator hall: a separate single-storey wing, 24.0 x 12.0, north of B behind a 1.5 m service passage. Reasons: its own foundations isolate engine vibration from the hall, the diesel is kept out of B's fire compartments, and its air louvres and flues need their own outside walls and roof (general knowledge).

| Building | Level | Floor (m) | Floor to floor (m) | Clear ceiling (m) |
| --- | --- | --- | --- | --- |
| A | Ground | 0.0 | 4.2 | rooms 3.0; corridor 2.4 under a 1.5 void to the 3.9 soffit |
| A | First | 4.2 | 4.2 | as ground |
| A | Roof | 8.4 | - | open; parapet 1.1 |
| B | Ground (strip) | 0.0 | 4.2 | 3.0 |
| B | Hall block (hall floor level with corridors) | 0.0 (raised floor) | 6.6 to roof | 6.0 to structure |
| B | First (strip) | 4.2 | 4.2 | 3.0 (gallery 3.0) |
| B | Hall roof / roof (strip) | 6.6 / 8.4 | - | open; parapets 1.1 |
| Link bridge | First | 4.2 | - | 3.0; bridge roof 7.8 |
| Generator wing | Ground | 0.0 | 6.6 to roof | 6.0; catwalks at 3.0 |
| B | Level U | -1.6 | 1.6 to hall floor | 1.5 under the tiles |
| Under the yard | Level B: vault, service tunnel | -3.6 | 3.6 to the yard | vault 3.0; tunnel 2.4 |

## 3. Design and operation
- A ground (2004): reception, security room, offices, goods-in and the first data hall. A first (2004): operations room, records, offices, plant gallery with the chilled-water pumps. A roof: chillers.
- 2021 phase 2: B's hall took over all customer racks; A's hall was emptied by 2022, its raised floor lifted and the space rebuilt as the locker room, staff WC, post room and customer services office. A's old meet-me room became A's comms room (A's own network and the tunnel shaft). A's chillers were replaced with larger units that serve both buildings through the pipe rack. A's outdoor generator was removed; its plinth in A's rear yard holds the bin store.
- 2021 also added the CCTV equipment room and key safe room beside A's security room, the link bridge, the iris-and-card mantrap, and moved the tape library and media destruction next to A's ops counter.
- B ground: staff entrance, lockers, customer staging, build room, B's plant corridor and LV switchroom. B first: bridge lobby and post, mantrap, secure corridor, gallery. B hall block: hall, cooling gallery, inner plant corridor (UPS, batteries, UPS switchroom), meet-me room, riser room, carrier equipment room.
- Tonight (Tuesday, late November, 01:10, rain): A's security room, reception and ops room are manned; corridors are lit; the cleaner works A's ground floor, then the first. B: bridge post, mantrap post, gallery patrol, the talking pair in the hall, the remote-hands technician at a tenant's racks, two tenant engineers in their cage near Pell's, Pell's contractor in the meet-me room, the facilities engineer on plant rounds. Pell's van is loaded at A's goods-in. The weekly generator test is due before dawn. Neither lift is used.

## 4. The site
- Cooper's Lane runs along the south side: 6.0 carriageway and a 2.0 footway on the site side (general knowledge). Across it the depot facade, 7.0 high, forms the south boundary. The viaduct, 9.0 to its deck, with bricked arches, forms the north boundary. East and west boundaries are the lane fence type.
- Site 108 x 76 (RULES 2: at most 110 x 80), lane included. A sits in the west, B in the east, fronts in one line facing the yard, 12 m apart. The generator wing sits behind B's west half; a transformer compound behind B's east half.
- Gatehouse (X02) at the lane fence's west end, with the main sliding vehicle gate and a pedestrian gate (card reader, released by the gatehouse officer) beside it. The east service gate (double, chained and padlocked) beside B's loading apron (X12) serves fuel tankers and B's deliveries.
- Lane, east and west fence: one security fence type, height per F14 (ASK-1). Inner fences (transformer compound, passage gates, bin store) are 2.4 chain-link (general knowledge).
- The yard (X03, X04) is the parking and loading forecourt: one row of marked bays (2.4 x 4.8; accessible 3.6 x 6.0, general knowledge) against each building's front, a 6.0 aisle, and a 6.4 inner strip along the fence where the lamp posts stand.
- A's row: 3 visitor bays by reception, 1 accessible bay by the entrance, 8 staff bays. B's row: 1 accessible bay by B's staff door, then 10 staff bays. The loading apron in front of B's staging roller door is hatched, no parking.
- Tonight's cars (one per person on shift who drives): A row (8 of 8 staff bays): duty manager, supervisor, desk operator, reception officer, rounds officer (brings the corridor patrol), ops desk officer, night duty engineer, gatehouse officer. B row (10 of 10): remote-hands technician (the bay next to the accessible bay; badge in the glovebox), bridge post officer, mantrap post, one of the talking pair (brings the other), roaming officer, B ground rounds officer, facilities engineer, Pell's contractor, and the tenant pair's van across two bays. No car: escort officer, perimeter patrol and gallery patrol (night bus), NOC operator (night bus), cleaner (dropped by the cleaning firm). The van crew came in Pell's van, which stands reversed to A's goods-in door; the returning driver is out on foot along the lane.
- The carrier manhole (TB02) is in the yard in front of the gap between A and B, beside the vault (TB01) below it. The pipe rack (X13) crosses the gap at high level north of the bridge. The gap (X05) is a paved service way from the yard to A's rear yard (X06).
- The service passage (X07) runs between B's north wall and the generator wing's south wall: 1.5 clear, walls 8.4 (B strip), 7.7 (hall block parapet) and 7.7 (wing parapet); chain-link gates at both ends.
- An east service drive (X08) runs along B's east side from the service gate to the transformer compound (X09) and the wing's east doors. A west path (X10) runs along A's west wall to the rear yard.

## 5. Room schedule
Clear size = wall-centreline rectangle less 0.3 each way (interior walls 0.3; on an outside wall 0.075 more). Area sums use the rectangles. Zone 3+ = restricted beside 3. "Void" = corridor ceiling void (1.5 clear). People are 01 section 3.

### Building A (2004)
| Id | Level | Name | Zone | Designed use | Use tonight | Clear (m) | Ceiling | Floor | Doors to | Walls to slab? | Void? | Lit? | Who at night | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AG01 | G | Entrance lobby and reception | 2 | Visitor sign-in, reception desk, fire repeater panel | Night reception post | 8.7 x 9.7 | 3.0 | Vinyl, entrance matting | X03 (main door), AG02, AG03, AG10 (reader); hatch to AG04 | N | N | Y | Reception officer | lobby |
| AG02 | G | Customer lounge | 2 | Customers wait for escort; intercom to the ops counter | Empty | 5.7 x 4.7 | 3.0 | Carpet tile | AG01 | N | N | N | - | meeting-room |
| AG03 | G | Visitor WC | 2 | Visitors' WC | Unused | 2.2 x 2.2 | 3.0 | Sheet vinyl | AG01 | N | N | N | - | visitor-wc |
| AG04 | G | Post room | 3 | Courier parcels and post, hatch to reception | Locked, on the rounds | 4.7 x 3.7 | 3.0 | Vinyl | AG10; hatch to AG01 | N | N | N | Rounds officer passes | storage |
| AG05 | G | Duty manager's office | 3 | Guarding firm's shift manager; shift log | Manager's base; master card in the desk drawer | 5.7 x 4.7 | 3.0 | Carpet tile | AG10 | N | N | Y | Duty manager (away on his walk part of each cycle) | facilities-office |
| AG06 | G | Admin office | 3 | Ostler admin staff | Dark; one south window left ajar | 7.7 x 5.7 | 3.0 | Carpet tile | AG10 | N | N | N | Cleaner in its pass | office |
| AG07 | G | Customer services office | 3 | Account managers (2004 hall area) | Dark | 7.7 x 5.7 | 3.0 | Carpet tile | AG10 | N | N | N | Cleaner in its pass | office |
| AG08 | G | Goods-in bay | 2 | Deliveries and outbound customer kit, asset check | Pell's crates staged for the van | 9.7 x 7.7 | 3.0 | Sealed concrete | X03 (roller door 3.0 x 3.0), AG09 | Y | N | Y | Van driver | loading-bay |
| AG09 | G | Goods lobby | 2 | Airlock between bay and corridor | Passage for the crates | 3.7 x 2.7 | 3.0 | Sealed concrete | AG08, AG10 (reader) | Y | N | Y | Van driver | goods-lobby |
| AG10 | G | Ground spine corridor | 3 | Controlled staff corridor east-west | Lit; rounds and cleaning | 3.2 x 29.7 | 2.4 | Vinyl | All AG rooms off it, AG18, AG20 | Y | Y | Y | Rounds officer, cleaner, duty manager on his walk | corridor |
| AG11 | G | Security room | 3+ | Monitor wall, access-control and alarm workstation, fire alarm main panel | Manned | 5.7 x 4.7 | 3.0 | Anti-static vinyl | AG10 (reader) | Y | N | Y | Desk operator, supervisor (leaves on rounds) | control-room |
| AG12 | G | CCTV equipment room | 3+ | Video recorders, network switches, intrusion panel; beside AG11 | Unmanned | 4.7 x 3.7 | 3.0 | Anti-static vinyl | AG10 (reader) | Y | N | N | - | comms-room |
| AG13 | G | Key safe room | 3+ | Electronic key safe and card store: B-tier cards, roof maintenance key | Unmanned | 2.7 x 3.7 | 3.0 | Vinyl | AG10 (reader) | Y | N | N | - | none |
| AG14 | G | Locker room | 3 | Staff lockers and benches (2004 hall area) | Night engineer's locker (note inside) | 7.7 x 4.7 | 3.0 | Sheet vinyl | AG10 | N | N | N | Rounds officer passes | shower-lockers |
| AG15 | G | Staff WC | 3 | Ground-floor staff WC off the controlled corridor | In use by staff | 4.7 x 3.7 | 3.0 | Sheet vinyl | AG10 | N | N | N | Anyone briefly | staff-wc |
| AG16 | G | Cleaner's store | 3 | Cleaning materials, sink | Cleaner's base | 2.2 x 1.7 | 3.0 | Sheet vinyl | AG10 | N | N | N | Cleaner briefly | janitor |
| AG17 | G | Cleaner's trolley bay | 3 | Recess where the trolley is parked | Trolley out with the cleaner | 1.7 x 1.2 | 2.4 | Vinyl | AG10 (open) | N | Y | Y | - | none |
| AG18 | G | Main stair A | 3 | Staff stair ground to first | Guards' stair | 3.7 x 7.7 | to soffit | Vinyl, nosings | AG10 (open) | Y | N | Y | Passing guards | none |
| AG19 | G | Lift shaft A | 3 | Passenger lift, ground to first | Car parked, locked off | 2.2 x 2.2 | full height | Pit -1.1 | AG20 (landing door) | Y | N | N | - | lift-shaft |
| AG20 | G | Lift lobby A ground | 3 | Landing in front of the lift | Corridor lit | 3.2 x 2.2 | 2.4 | Vinyl | AG10 (open), AG19 | N | Y | Y | Passing | none |
| AG21 | G | Fire stair A | 3 | Enclosed escape stair ground, first, roof | Unused | 3.2 x 6.2 | to soffit | Vinyl, nosings | AG10 (fire door), X10 (exit-only, west end wall), AF15 | Y | N | Emergency only | - | fire-stair-roof |
| AG22 | G | A comms room | 3 | 2004 meet-me room, now A's network racks; top of the tunnel shaft | Unmanned | 4.7 x 3.7 | 3.0 | Anti-static vinyl | AG10 (reader), AG23 (floor hatch, key) | Y | N | N | - | comms-room |
| AG23 | G to B | Tunnel access shaft A | 4 | Fixed ladder from the tunnel to AG22 | Closed | 1.7 x 1.7 | 3.6 deep | Concrete | AG22 (hatch), TB03 | Y | N | N | - | carrier-riser |
| AG24 | G | LV switchroom A | 3 | A's switchboard and small UPS for security and ops | Unmanned | 6.7 x 4.7 | 3.0 | Sealed concrete | AG10 | Y | N | N | - | switchroom |
| AG25 | G | Cable riser A | 3 | Cable riser with fixed ladder, ground to first; opens to both corridor voids | Closed | 1.7 x 1.2 | full height | Concrete | AG10 (locked door) | Y | N | N | - | riser-cupboard |
| AF01 | F | First-floor spine corridor | 3 | Controlled staff corridor east-west | Lit | 3.2 x 29.7 | 2.4 | Vinyl | All AF rooms, AF12, AF14, AF17 | Y | Y | Y | Corridor patrol, escort officer, cleaner later | corridor |
| AF02 | F | Operations room | 3 | Night operations desk (BMS screens for both buildings) and NOC monitoring desk | Manned | 11.7 x 7.7 | 3.0 | Carpet tile | AF03 (reader) | Y | N | Y | Night duty engineer, NOC operator | office |
| AF03 | F | Ops counter | 3 | Sign-in counter at the ops door: call-outs, media movements, lounge intercom | Manned | 3.7 x 2.7 | 2.4 | Vinyl | AF01 (open), AF02 (reader) | N | Y | Y | Operations desk officer; escort officer at the door | none |
| AF04 | F | Records room | 3 | Customer files, contracts, shift key log; register terminal | Unmanned | 5.7 x 4.7 | 3.0 | Carpet tile | AF01 (reader) | Y | N | N | Corridor patrol passes | storage |
| AF05 | F | Tape library | 3 | Customers' backup tapes in fire safes, own gas cylinders | Unmanned | 5.7 x 4.7 | 3.0 | Anti-static vinyl | AF01 (reader) | Y | N | N | - | storage |
| AF06 | F | Media destruction room | 3 | Shredder and degausser for retired drives | Unmanned | 4.7 x 3.7 | 3.0 | Sealed concrete | AF01 (reader) | Y | N | N | - | storage |
| AF07 | F | Meeting room | 3 | Customer and staff meetings | Dark | 5.7 x 4.7 | 3.0 | Carpet tile | AF01 | N | N | N | Cleaner in its pass | meeting-room |
| AF08 | F | Kitchen and break room | 3 | Staff kitchen | Kettle breaks | 6.7 x 5.7 | 3.0 | Sheet vinyl | AF01 | N | N | Y | Guards on breaks | kitchenette |
| AF09 | F | Facilities office | 3 | Ostler engineers' office: drawings, permits, spares | Dark | 5.7 x 4.7 | 3.0 | Carpet tile | AF01 | N | N | N | - | facilities-office |
| AF10 | F | Plant gallery | 3 | Service corridor with chilled-water headers overhead, AHU ducts, pipes out to the rack | Lit, noisy | 3.2 x 15.7 | 3.9 to soffit (pipes 2.6-3.6) | Sealed concrete | AF01 (reader), AF11, AF19 | Y | N | Y | Corridor patrol; engineer and escort on checks | plant-corridor |
| AF11 | F | Chilled-water pump room | 3 | Pumps, buffer vessel, pressurisation unit for both buildings | Running | 6.7 x 4.7 | 3.9 | Sealed concrete | AF10 | Y | N | N | Engineer on checks | none |
| AF12 | F | Main stair A | 3 | As AG18 | - | 3.7 x 7.7 | to soffit | Vinyl | AF01 (open) | Y | N | Y | Passing guards | none |
| AF13 | F | Lift shaft A | 3 | As AG19; machine on the guide rails at the shaft head | Locked off | 2.2 x 2.2 | head 3.9 | - | AF14 | Y | N | N | - | lift-shaft |
| AF14 | F | Lift lobby A first | 3 | Landing in front of the lift | Corridor lit | 3.2 x 2.2 | 2.4 | Vinyl | AF01 (open), AF13 | N | Y | Y | Passing | none |
| AF15 | F | Fire stair A | 3 | As AG21, on to the roof bulkhead | Unused | 3.2 x 6.2 | to soffit | Vinyl | AF01 (fire door), AR04 | Y | N | Emergency only | - | fire-stair-roof |
| AF16 | F | Cable riser A | 3 | As AG25 | Closed | 1.7 x 1.2 | full height | Concrete | AF01 (locked door) | Y | N | N | - | riser-cupboard |
| AF17 | F | Bridge vestibule A | 3 | A end of the link bridge | Lit | 3.2 x 2.7 | 2.4 | Vinyl | AF01 (open), LF01 (reader) | N | Y | Y | Supervisor on rounds | none |
| AF18 | F | Staff WC first | 3 | Staff WCs | In use | 4.7 x 3.7 | 3.0 | Sheet vinyl | AF01 | N | N | N | Anyone briefly | staff-wc |
| AF19 | F to R | Pipe riser A | 3 | Chilled-water pipes from AF11 to the roof chillers, fixed ladder, roof hatch | Closed | 1.7 x 1.2 | full height | Concrete | AF10 (locked door), AR01 (hatch) | Y | N | N | - | riser-cupboard |
| AR01 | R | A roof | 3 | Membrane roof, paved walkways, parapet | Wet, dark | 35.1 x 23.1 | open | Membrane, pavers | AR04, AF19 hatch, LF02 (fixed ladder) | - | - | N | - | none |
| AR02 | R | Chiller compound | 3 | Three air-cooled chillers on steel frames (two run, one standby) for both buildings | Running | 12.0 x 6.0 | open | Steel frame on plinths | AR01 | - | - | N | - | none |
| AR03 | R | Office AHU | 3 | Air handler for A's offices; ducts down into the corridor voids | Running | 6.0 x 3.0 | open | Plinth | AR01 | - | - | N | - | none |
| AR04 | R | Fire stair A bulkhead | 3 | Stair head with roof door and smoke vent | Closed | 3.2 x 6.2 | 3.0 | Vinyl | AF15, AR01 (roof door) | Y | N | N | - | none |

Sums (rectangles): A ground 731 of 864 m2 (85%); A first 592 of 864 (69%); A roof plant and bulkhead 113 of 864.

### Link bridge
| Id | Level | Name | Zone | Designed use | Use tonight | Clear (m) | Ceiling | Floor | Doors to | Walls to slab? | Void? | Lit? | Who at night | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LF01 | F (4.2) | Link bridge | 3 | Enclosed glazed steel bridge between A's and B's first floors; camera | Lit | 12.0 x 3.0 | 3.0 | Rubber | AF17 (A reader), BF01 (B reader, post) | Y | N | Y | Supervisor on rounds; the bridge post watches it | corridor |
| LF02 | Roof (7.8) | Bridge roof | 3 | Flat roof with edge rail; maintenance crossing between A's and B's roofs | Wet, dark | 12.0 x 3.5 | open | Membrane | AR01, BR01 (fixed ladders) | - | - | N | - | none |

Sum: 42 m2 over the 12 m gap (X05). Max stack: 3 walkable surfaces (gap: yard, bridge, bridge roof; wing: floor, catwalk, roof; riser: tunnel, BG31, hall roof); RULES 2 allows 4.

### Building B (2021), with the generator wing
| Id | Level | Name | Zone | Designed use | Use tonight | Clear (m) | Ceiling | Floor | Doors to | Walls to slab? | Void? | Lit? | Who at night | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BG01 | G | B ground lobby | 2 | Staff and contractor entrance, sign-in screen | Lit | 5.7 x 4.7 | 3.0 | Vinyl, matting | X04 (staff door, reader), BG05 (reader) | N | N | Y | Technician passes with kit | none |
| BG02 | G | Main stair B | 3 | Staff stair ground to first | Used by guards | 3.7 x 7.7 | to soffit | Vinyl, nosings | BG05 (open) | Y | N | Y | Passing | none |
| BG03 | G | Lift shaft B | 3 | Passenger lift, ground to first | Car parked, locked off | 2.2 x 2.2 | full height | Pit -1.1 | BG04 | Y | N | N | - | lift-shaft |
| BG04 | G | Lift lobby B ground | 3 | Landing in front of the lift | Lit | 3.2 x 2.2 | 3.0 | Vinyl | BG05 (open), BG03 | N | N | Y | Passing | none |
| BG05 | G | B ground corridor | 3 | Staff corridor north-south along the strip | Lit | 3.2 x 25.7 | 3.0 | Vinyl | BG01, BG02, BG04, BG06, BG07 (reader), BG09, BG10 (reader), BG14, BG15, BG16 | Y | N | Y | B ground rounds officer, facilities engineer, technician | corridor |
| BG06 | G | Locker area | 3 | Lockers for staff and contractors | Technician's locker (contractor card inside) | 7.7 x 4.7 | 3.0 | Sheet vinyl | BG05 | N | N | N | B ground rounds officer passes | shower-lockers |
| BG07 | G | Customer staging room | 2 | Customers unpack and test kit before it goes up | Technician's jacket over a chair, badge in it | 6.7 x 5.7 | 3.0 | Sealed concrete | X12 (roller door 3.0 x 3.0, key switch inside), BG05 (reader), BG08, BG09 (reader) | Y | N | Y | Technician between trips | build-room |
| BG08 | G | Shipping cage | 2 | Mesh cage for parcels in and out | Locked | 3.7 x 3.2 | 3.0 | Sealed concrete | BG07 (mesh door, key) | N | N | N | - | customer-cage |
| BG09 | G | Build room | 3 | Racks assembled before going into the hall | Empty racks on skates | 6.7 x 5.7 | 3.0 | Anti-static vinyl | BG05, BG07 (reader), BG20 (equipment door, opens from the hall only) | Y | N | N | - | build-room |
| BG10 | G | B plant corridor | 3 | Plant corridor behind a reader door: switchroom, gas room, fire stair, passage door | Lit; door sometimes wedged by the technician | 3.2 x 14.2 | 3.0 | Sealed concrete | BG05 (reader), BG11, BG12, BG28, X07 (exit-only, key outside) | Y | N | Y | Facilities engineer on rounds, B ground rounds officer | none |
| BG11 | G | LV switchroom B | 3 | Main LV switchboard, generator changeover, feeds to the UPS | Running | 6.7 x 4.7 | 3.0 | Sealed concrete | BG10 | Y | N | N | Facilities engineer | switchroom |
| BG12 | G | Fire stair B | 3 | Enclosed escape stair ground, first, roof | The facilities engineer's way to the roof | 3.2 x 6.2 | to soffit | Vinyl, nosings | BG10 (fire door), X05 (exit-only, west end wall), BF11 | Y | N | Emergency only | Facilities engineer on rounds | fire-stair-roof |
| BG13 | G | Gallery stair foot | 4 | Foot of the gallery stair, an alcove of the hall | Dark | 2.7 x 8.7 | open to BF10 | Raised floor tile | BG20 (open) | Y | N | N | Talking pair pass | none |
| BG14 | G | Facilities office B | 3 | Facilities engineer's desk, BMS screen, permits | Lit | 5.7 x 4.7 | 3.0 | Vinyl | BG05 | N | N | Y | Facilities engineer between rounds | facilities-office |
| BG15 | G | Cable riser B | 3 | Cable riser with fixed ladder, ground to first | Closed | 1.7 x 1.2 | full height | Concrete | BG05 (locked door) | Y | N | N | - | riser-cupboard |
| BG16 | G | B staff WC | 3 | WC for staff and contractors | In use | 2.2 x 2.2 | 3.0 | Sheet vinyl | BG05 | N | N | N | Anyone briefly | visitor-wc |
| BG20 | G (hall block) | Data hall | 4 | Customer racks in rows, cages, overhead fibre trays, perforated tiles, cameras, beams | Lit aisles, cooling hum | 25.7 x 14.2 | 6.0 | Anti-static raised floor tiles | BG09 (equipment door), BG13, BG23 (open), BG24 (reader), BG29 (open), BU01 (hatches) | Y | N | Y | Talking pair, technician at a tenant's racks, tenant pair | data-hall-bay |
| BG21 | G | Pell's cage | 5 | Ansell & Crowe's mesh cage of racks, labelled fibre | Being re-equipped; locked | 4.7 x 3.7 | 6.0 (mesh to 3.0) | Raised floor | BG20 (code lock and key) | N | N | N | - | customer-cage |
| BG22 | G | Tenant cage | 5 | Another tenant's cage beside Pell's | Maintenance window, door open | 4.7 x 3.7 | 6.0 (mesh to 3.0) | Raised floor | BG20 (key) | N | N | Y | Tenant pair | customer-cage |
| BG23 | G | Cooling gallery | 4 | Chilled-water air handlers (CRAH) blowing into the underfloor | Running | 3.7 x 29.7 | 6.0 | Raised floor tiles | BG20 (open), BG24, X08 (fire exit, exit-only, alarmed) | Y | N | Y | Facilities engineer on checks | cooling-gallery |
| BG24 | G | Inner plant corridor | 4 | Corridor to UPS, battery and UPS switchroom; pipes overhead from BF13 | Lit | 3.2 x 25.7 | 6.0 (pipes at 5.0) | Sealed concrete | BG20 (reader), BG23, BG25, BG26, BG27 | Y | N | Y | Facilities engineer on rounds | plant-corridor |
| BG25 | G | UPS room | 4 | UPS modules | Running | 7.7 x 5.7 | 6.0 | Sealed concrete | BG24 | Y | N | N | - | ups-room |
| BG26 | G | Battery room | 4 | Battery strings, about 10-15 min autonomy (general knowledge) | Running | 5.7 x 5.7 | 6.0 | Acid-resistant coating | BG24 | Y | N | N | - | battery-room |
| BG27 | G | UPS switchroom | 4 | Critical distribution boards to the hall's power units | Running | 6.7 x 5.7 | 6.0 | Sealed concrete | BG24 | Y | N | N | - | switchroom |
| BG28 | G | Gas suppression room | 3 | Inert-gas cylinders and valves for the hall, void, meet-me and carrier rooms | Unmanned | 4.7 x 5.7 | 6.0 | Sealed concrete | BG10 (key) | Y | N | N | - | none |
| BG29 | G | Meet-me lobby | 4 | Short corridor between the hall and the carrier rooms | Lit | 3.7 x 5.7 | 6.0 | Raised floor tiles | BG20 (open), BG30 (reader), BG33 (reader) | Y | N | Y | Roaming officer | none |
| BG30 | G | Meet-me room | 5 | Carriers' and tenants' patch panels; cross-connects | Lit | 8.7 x 5.7 | 6.0 (trays at 3.0) | Anti-static raised floor | BG29 (reader), BG31 (reader both sides) | Y | N | Y | Pell's contractor at his panel; roaming officer | meet-me-room |
| BG31 | G | Riser room | 5 | Top of the carrier riser; ducts turn into trays | Unmanned; camera | 3.7 x 5.7 | 6.0 | Sealed concrete | BG30, BG32 (floor hatch with rail) | Y | N | N | Roaming officer passes | none |
| BG32 | B to G | Carrier riser | 5 | Shaft with fixed ladder carrying the carrier ducts from the tunnel | Closed | 1.7 x 1.7 | 3.6 high | Concrete | TB04 (riser door, reader), BG31 (hatch) | Y | N | N | - | carrier-riser |
| BG33 | G | Carrier equipment room | 5 | Carriers' line-terminating racks | Unmanned | 8.7 x 5.7 | 6.0 | Anti-static raised floor | BG29 (reader) | Y | N | N | - | data-hall-bay |
| BG40 | G (wing) | Generator hall | 3 | Two diesel generator sets (one duty, one standby), silencers, day tanks | Dark until the test | 17.7 x 11.7 | 6.0 | Epoxy-painted concrete | X07 (personnel door, key), X09 (double doors), BG41, BG42, BG43 | Y | N | N (on for the test) | Facilities engineer for the test | generator-compound |
| BG41 | G (wing) | Generator catwalks | 3 | Steel grating walkways at 3.0 along both sets for silencers and valves; steel stair from the floor | As BG40 | 1.0 wide | 3.0 above | Steel grating | BG40 (stair) | - | N | N | - | none |
| BG42 | G (wing) | Bulk fuel room | 3 | Bunded diesel tank, fill point on the east wall | Unmanned | 5.7 x 5.7 | 6.0 | Bund, sealed concrete | BG40 | Y | N | N | - | none |
| BG43 | G (wing) | Generator control room | 3 | Generator panels and test controls | Dark until the test | 5.7 x 5.7 | 3.0 | Vinyl | BG40 | Y | N | N | Facilities engineer for the test | facilities-office |
| BF01 | F | B first lobby | 3 | Bridge arrival, bridge post desk, stair and lift landing | Lit | 8.7 x 6.7 | 3.0 | Vinyl | LF01 (reader), BF02, BF04, BF05 | N | N | Y | Bridge post officer | lobby |
| BF02 | F | Main stair B | 3 | As BG02 | - | 3.7 x 7.7 | to soffit | Vinyl | BF01 (open) | Y | N | Y | Passing | none |
| BF03 | F | Lift shaft B | 3 | As BG03; machine at the shaft head | Locked off | 2.2 x 2.2 | head 3.9 | - | BF04 | Y | N | N | - | lift-shaft |
| BF04 | F | Lift lobby B first | 3 | Landing in front of the lift | Lit | 3.2 x 2.2 | 3.0 | Vinyl | BF01 (open), BF03 | N | N | Y | Passing | none |
| BF05 | F | Staff corridor B | 3 | First-floor staff corridor from the lobby to the mantrap, plant and fire stair | Lit | 3.2 x 13.7 | 3.0 | Vinyl | BF01, BF06, BF11, BF12, BF13, BF14, BF15 | Y | N | Y | Mantrap post, bridge post's glances | corridor |
| BF06 | F | Mantrap vestibule | 3 | Waiting space and post desk at the mantrap's outer door | Lit | 3.7 x 3.2 | 3.0 | Vinyl | BF05 (open), BF07 (outer door) | N | N | Y | Mantrap post | none |
| BF07 | F | Mantrap | 4 | Interlocked two-door booth: outer card or PIN, inner card plus iris | Lit | 4.2 x 3.7 | 3.0 | Vinyl | BF06 (outer), BF08 (inner) | Y | N | Y | Anyone passing | mantrap (kit too small) |
| BF08 | F | Secure corridor | 4 | Corridor from the mantrap to the gallery | Lit | 3.2 x 11.7 | 3.0 | Anti-static vinyl | BF07, BF09 (sealed door) | Y | N | Y | Gallery patrol | corridor |
| BF09 | F | Gallery | 4 | Viewing gallery over the hall: glass balustrade 1.1 on the hall side, hall light switch bank at its entrance | Lit | 2.7 x 5.2 | 3.0 (hall side open 4.2-6.0) | Anti-static vinyl | BF08, BF10 (open), hall (looks over) | Y | N | Y | Gallery patrol | none |
| BF10 | F to G | Gallery stair well | 4 | Open stair 2.4 wide, two flights and a 2.0 landing, gallery to hall floor | Lit at the head | 2.7 x 8.7 | 3.9 to soffit | Vinyl, nosings | BF09, BG13 | Y | N | Y | Gallery patrol, talking pair | none |
| BF11 | F | Fire stair B | 3 | As BG12, on to the roof bulkhead | As BG12 | 3.2 x 6.2 | to soffit | Vinyl | BF05 (fire door), BR02 | Y | N | Emergency only | Facilities engineer on rounds | fire-stair-roof |
| BF12 | F | Cable riser B | 3 | As BG15 | Closed | 1.7 x 1.2 | full height | Concrete | BF05 (locked door) | Y | N | N | - | riser-cupboard |
| BF13 | F | Chilled-water valve room | 3 | Pipe rack entry, isolating valves, meters; pipes on to BG24 and the hall roof AHU | Running | 6.7 x 5.7 | 3.0 | Sealed concrete | BF05 (reader) | Y | N | N | Facilities engineer on checks | none |
| BF14 | F | Staff WC B first | 3 | WCs | In use | 4.7 x 3.7 | 3.0 | Sheet vinyl | BF05 | N | N | N | Anyone briefly | staff-wc |
| BF15 | F | Tenant work room | 3 | Desk space for visiting tenant engineers | Tenant pair's bags | 5.7 x 4.7 | 3.0 | Carpet tile | BF05 | N | N | N | - | meeting-room |
| BR01 | R (8.4) | B strip roof | 3 | Membrane roof, parapet | Wet, dark | 17.1 x 29.1 | open | Membrane, pavers | BR02, LF02 and BR03 (fixed ladders) | - | - | N | - | none |
| BR02 | R | Fire stair B bulkhead | 3 | Stair head with roof door and smoke vent | Closed | 3.2 x 6.2 | 3.0 | Vinyl | BF11, BR01 | Y | N | N | Facilities engineer on rounds | none |
| BR03 | R (6.6) | B hall roof | 3 | Lightweight deck, walkway pavers, perimeter anchors | Wet, dark | 29.1 x 29.1 | open | Membrane | BR01 (fixed ladder), BR04, BR05 | - | - | N | Facilities engineer on rounds | none |
| BR04 | R (6.6) | Hall supply AHU | 3 | Air handler with chilled-water coils feeding BR05 | Running | 8.0 x 3.0 | open | Plinth | BR03 | - | - | N | - | none |
| BR05 | R to G | Cooling supply shaft | 4 | Builder's-work shaft from BR04 down into the hall; bolted alarmed grille, key switch box beside it, hoist beam over it | Grille shut and armed | 1.7 x 1.7 | 0.9 deep plus the 6.0 drop | - | BR03 (grille), BG20 (diffuser panel) | Y | N | N | - | none |
| BR06 | R (6.6) | Generator wing roof | 3 | Exhaust stacks, attenuators, membrane | Dark; stacks hot after the test | 23.1 x 11.1 | open | Membrane | none (reached for repair by access platform) | - | - | N | - | none |

Sums (rectangles): B ground strip 481 of 540 m2 (89%); hall block 900 of 900 (fully tiled); B ground total 1381 of 1440 (96%). B first (strip only) 394 of 540 (73%). Generator wing 288 of 288. Pell's and the tenant cage sit inside BG20 and are not added.

### B level U
| Id | Level | Name | Zone | Designed use | Use tonight | Clear (m) | Ceiling | Floor | Doors to | Walls to slab? | Void? | Lit? | Who at night | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BU01 | U (-1.6) | Hall underfloor void | 4 | Cold-air plenum and cable space under the raised floor; pedestals at 0.6 centres; leak detection | Cold air moving | 25.7 x 14.2 | 1.5 | Dust-sealed concrete | BG20 (hinged hatches throughout), BU02 | Y | N | N | Nobody | none |
| BU02 | U (-1.6) | Cooling gallery plenum | 4 | Discharge plenum under the CRAH units, open to BU01 | Cold air moving | 3.7 x 14.2 | 1.5 | Dust-sealed concrete | BU01 (open), BG23 (hatch) | Y | N | N | Nobody | none |
Sum: 435 m2 under the hall band (377 + 58).

### Under the yard (level B)
| Id | Level | Name | Zone | Designed use | Use tonight | Clear (m) | Ceiling | Floor | Doors to | Walls to slab? | Void? | Lit? | Who at night | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TB01 | B (-3.6) | Carrier vault | 4 | Carrier entrance room: street ducts in, carriers' splice cases; LANTERN's 2003 cable | Dark | 7.7 x 5.7 | 3.0 | Concrete | TB02 (ladder), TB03, TB04 | Y | N | N | Nobody | carrier-vault |
| TB02 | Yard to B | Carrier manhole | 4 | Lidded shaft with fixed ladder from the yard into the vault | Lid shut | 1.2 x 1.2 | 3.6 deep | Concrete | X04 (lid), TB01 | Y | N | N | - | none |
| TB03 | B (-3.6) | Service tunnel, A branch | 4 | Walk-in tunnel: fibre ducts, A's power cables, BMS and CCTV cables, cold-water main | Dark | 2.6 wide x 10.0 | 2.4 | Concrete, 1.8 walkway | TB01, AG23 | Y | N | N | Nobody | none |
| TB04 | B (-3.6) | Service tunnel, B branch | 4 | As TB03, along under the yard and under B's south wall to the riser | Dark | 2.6 wide x 30.0 | 2.4 | Concrete, 1.8 walkway | TB01, BG32 (riser door) | Y | N | N | Nobody | none |
Sum: 48 + 2 + 30 + 90 = 170 m2, all under the yard and B's south band.

### Site
| Id | Level | Name | Zone | Designed use | Use tonight | Clear (m) | Ceiling | Floor | Doors to | Walls to slab? | Void? | Lit? | Who at night | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X01 | G | Cooper's Lane | outside | Public lane and footway | Wet, quiet | 108 x 8 | open | Asphalt | X02 gates | - | - | Street lamps | Returning van driver on foot | none |
| X02 | G | Gatehouse | 1 | Vehicle and visitor control at the main and pedestrian gates; yard monitor | Manned | 3.7 x 2.7 | 2.7 | Vinyl | X03, X01 (gates) | N | N | Y | Gatehouse officer | gatehouse |
| X03 | G | Front yard and car park A | 1 | Bays in front of A, goods-in apron | Cars, Pell's van at goods-in | 52 x 22 | open | Asphalt, marked bays | X01 (gates), AG01, AG08, X05, X10, X04 | - | - | PIR | Perimeter patrol, van driver | none |
| X04 | G | Front yard and car park B | 1 | Bays in front of B, loading apron, manhole lid | Cars, tenant van | 56 x 22 | open | Asphalt, marked bays | X03, BG01, X08, X12, TB02 | - | - | PIR | Perimeter patrol | none |
| X05 | G | Gap yard | 1 | Paved service way between A and B, under the bridge and rack | Dark | 12 x 24 | under LF01 at 4.2 | Concrete paving | X03, X06, BG12 exit | - | - | PIR | Perimeter patrol | none |
| X06 | G | Rear yard | 1 | Behind A to the viaduct and behind the wing: bin store, cycle shelter, old generator plinth | Dark | 52 x 22 + 24 x 2.5 | open | Concrete | X05, X10, X07 (gate), X11 | - | - | PIR | Perimeter patrol | none |
| X07 | G | Service passage | 1 | Gap between B and the wing: maintenance of both walls, buried cable drawpits | Dark | 1.5 x 24 | open | Gravel | X06 and X09 (chain-link gates), BG10, BG40 | - | - | N | Facilities engineer to the test | none |
| X08 | G | East service drive | 1 | Tanker and delivery drive from the service gate | Dark | 8 x 46 | open | Asphalt | X04, X09, BG23 exit | - | - | PIR | - | none |
| X09 | G | Transformer compound | 3 | Two transformers and the network operator's substation, chain-link fenced | Humming | 24 x 16 | open | Gravel | X08 (gate, padlock), X07 (gate), BG40, BG42 fill point | - | - | N | - | none |
| X10 | G | West path | 1 | Path along A's west wall from the yard to the rear yard; fire stair A exit | Dark | 4 x 24 | open | Concrete paving | X03, X06, AG21 exit | - | - | PIR | Perimeter patrol | none |
| X11 | G | Bin store | 1 | Chain-link bin enclosure on the old generator plinth | Locked | 3.7 x 2.7 | open | Concrete plinth | X06 | - | - | N | - | bin-store |
| X12 | G | Loading apron | 1 | Hatched no-parking apron at B's staging roller door, beside the east service gate | Empty | 10 x 8 | open | Concrete | X04, BG07 | - | - | PIR | - | none |
| X13 | 5.0-6.5 | Pipe rack | 3 | Two steel portal frames carrying chilled-water flow and return and a cable tray from AF10 to BF13 | Running | 12 x 2 | open | Steel | AF10, BF13 (wall sleeves) | - | - | N | - | none |
Site sum: lane 864 + yards 1144 + 1232 + 288 + rear 1204 + drive 368 + compound 384 + west path 96 + passage 36 + A 864 + B 1440 + wing 288 = 8208 = 108 x 76.

## 6. Zones and controls
| 01 space | Zone | Room ids |
| --- | --- | --- |
| S1 site | 1 (X09 3; X01 outside) | X02-X08, X10-X12, X13 (3) |
| S2 A ground | 2 and 3 (correction: 01 said 2; the staff side behind reception's reader is the controlled corridor H2 and H6 name) | 2: AG01-AG03, AG08, AG09; 3: AG04-AG07, AG10, AG14-AG22, AG24, AG25 |
| S3 security room | 3+ (confirmed) | AG11, AG12, AG13 |
| S4 A first | 3 (confirmed) | AF01-AF19, AR01-AR04 |
| S5 bridge and B secure floor | 3 to 4 (confirmed) | 3: LF01, LF02, BF01-BF06, BF11-BF15, BR01-BR04; 4: BF07-BF10 |
| S6 data hall | 4 (confirmed; cages 5) | BG13, BG20, BG23-BG27, BU01, BU02, BR05; 5: BG21, BG22 |
| S7 meet-me room | 5 (confirmed; its lobby 4) | BG30-BG33; 4: BG29 |
| X way out | 1 to 3 (correction: 01 said 1; B's ground and the wing are staff areas behind readers and keys) | 1: yard; 2: BG01, BG07, BG08; 3: BG02-BG06, BG09-BG12, BG14-BG16, BG28, BG40-BG43, BR06 |
| Not named in 01 | 4 | TB01-TB04, AG23 (locked plant under the yard; the riser door leads into 5) |

| From | To | Control | Who holds access | In a fire |
| --- | --- | --- | --- | --- |
| X01 | X03 | Main sliding gate and pedestrian gate at the gatehouse; pedestrian reader | Staff cards; gatehouse officer releases | Gatehouse opens for the brigade |
| X01 | X04 | East service gate, chain and padlock | Facilities; fuel supplier escorted | Stays shut |
| X03 | AG01 | Main door locked out of hours, intercom | Reception officer releases | Releases |
| X03 | AG08 | Roller door by key switch inside; wicket door reader | Ostler staff; van crew escorted | Wicket free to exit |
| AG01, AG09; AF17 | AG10; LF01 | Reader, A card (master card opens all A readers) | A staff, guards | Maglock releases |
| X04 / X12 | BG01 / BG07 | Staff door reader (B or contractor card); roller door key switch inside, locked at night | Staff, contractors; facilities | Staff door releases; roller door stays |
| BG01, BG07 | BG05 | Reader, B or contractor card; BG07 to BG09 reader | Staff, contractors | Releases |
| AG10 | AG11, AG12, AG13 | Reader, master card tier; key safe inside AG13 needs its PIN | Security staff, duty manager, Ostler | AG11 releases; AG12, AG13 stay locked (free exit) |
| AF01 | AF02 (via AF03), AF04-AF06, AF10 | Reader, master card tier | Ostler, security | Ops releases; records, tape, media, plant stay locked (free exit) |
| LF01 | BF01 | Reader, B-tier card or escort PIN; bridge post | B-tier holders | Releases both ways |
| BF06 | BF07, BF08 | Mantrap: outer door B-tier card or PIN; inner door card plus iris; interlock | Iris: night duty engineer, duty manager | Both doors release outward, interlock dropped |
| BF08 | BF09 | Sealed gas-tight door, no reader | Anyone inside 4 | Free both ways |
| BG05 | BG10 | Reader, B-tier or contractor card (the door the technician wedges) | Ostler, contractors | Releases |
| BG10 | BG28; X07 | Key; passage door exit-only with key cylinder outside | Facilities, gas contractor | Passage door is an exit |
| X07 / X09 | BG40 | Wing personnel door key; double doors key; compound gate padlock | Facilities, network operator | Exits push-bar |
| BG20 | BG24 | Reader, B-tier | Ostler engineers | Stays locked, free exit |
| BG29 | BG30, BG33 | Reader, B-tier card or PIN | Ostler; carriers escorted | Stays locked, free exit |
| BG30 | BG31 | Reader both sides, B-tier or PIN | Ostler cable team | Stays locked, free exit |
| TB04 | BG32 | Riser door at the tunnel end, reader B-tier or PIN | Ostler cable team | Stays locked, free exit |
| AG22 | AG23 | Locked floor hatch, key | Ostler | - |
| X04 | TB02 | Heavy lid, carriers' and Ostler's lifting keys (zone 1 to 4, ring-exempt: ASK-2) | Carriers, Ostler | - |
| BG20 | BG09 | Equipment door: no outside handle or reader, exit device inside, door-forced and held alarms to AG11; ring-exempt | Staff inside the hall | It is an exit; opening alarms |
| BG23; AG21, BG12 | X08; X10, X05 | Fire exits, exit-only, no outside hardware, alarmed | - | Exits |
| BR03 | BR05 to BG20 | Bolted grille with an alarm contact on the intrusion panel; key switch box beside it isolates the contact; roof key in AG13 | Facilities | Stays bolted |
| AF15, BF11 | AR01, BR01 | Roof doors: key outside, thumb-turn inside; smoke vents open only by the fire alarm or the firefighter's switch | Facilities; brigade | Vents open |
| AG10, AF01 | AG19, AF13 (lift A) | Zone 3 both floors. Day: staff card at each landing and in the car. Night: locked off, car at ground, doors shut; only an engineer's key switch or Ostler card in the car call panel | Ostler engineers | Car homes to ground and goes out of service |
| BG05, BF01 | BG03, BF03 (lift B) | Zone 3 both floors, never into 4. Same as lift A with B cards | Ostler engineers | Same |
| BG20 | BG21, BG22, BU01 | Pell's cage code lock plus key; tenant cage key; floor hatches unlocked, hinged | Tenants, Ostler escort; engineers | Cages stay locked |

## 7. Adjacency
Must touch:
- AG11 with AG12 and AG13: the operator reaches the panel and the key safe in seconds; all three open only to AG10.
- AG01 with AG02, AG03 and AG04's hatch: one desk handles visitors and couriers.
- AG08 and AG09 at A's south-east, beside AG22: goods and the tunnel shaft share the east end nearest the vault.
- AF03 at AF02's door, beside AF05 and AF06: the counter logs media movements. AF10 and AF11 at A's north-east, where X13 leaves: shortest chilled-water run to B.
- AF17, LF01 and BF01 in one straight line at 4.2: the bridge.
- Each lift beside its main stair core (AG18/AG19, BG02/BG03). BF06/BF07 off BF05 within sight of BF01: the bridge post and mantrap post see each other.
- BF08 to BF09 to BF10 to BG13: the only way people reach the hall floor.
- BG09 on the hall's west wall with BG07 beside it and BG07 on the yard: goods go yard, staging, build room, equipment door.
- BG24 along the hall's north side with BG25-BG27 off it; BG23 along the hall's east side over BU02.
- BG31 above the end of TB04, beside BG30; BG33 beside BG29: carrier ducts rise once and meet the panels.
- BG28 between BG10 and the hall block: cylinders are refilled from zone 3. BF13 at the strip's north-west where X13 lands, above BG10 and BG11; BG11 near the wing: short pipe and cable runs.
- TB01 under the yard in front of the gap, TB02 beside it: equal tunnel runs to both buildings.

Must not touch:
- Either lift shaft and any zone 4 or 5 room, or any room whose walls run to the slab other than its own lobby: lifts serve staff floors only.
- BG20 and the yard or BG05: only BG09's equipment door joins the hall to the ground floor.
- BF07 and any goods door (AG08, BG07, BG09): people and goods enter by separate doors.
- Corridor voids and AG11-AG13, AG22, AG24, AF02, AF04-AF06, AF10, AF11: those walls run to the slab.
- BG28 and BG20 by a door (cylinders reached from zone 3 only). The generator wing and B's walls: the 1.5 passage keeps the structures and fire risks apart.
- A zone 1 or 2 room and AG11-AG13. The vault and any building footprint: the carriers' chamber stays under open yard for street access.

## 8. Vertical circulation (LD 16.2)
- Main stair A (AG18, AF12): north side of the spine, east of centre. Dog-leg, two 1.85 flights of 13 risers (rise 0.1615, going 0.285), 2.0 landings, open centre with balustrade, handrails both sides; core 4.0 x 8.0; opens only to the controlled corridor.
- Lift A (AG19, AF13): beside the main stair core on its east side, sharing the core's wall; landing doors face the spine across a lift lobby. Type: machine-room-less traction, 630 kg / 8 persons, car 1.1 x 1.4; maker data asks a shaft of 1.6 x 1.65 (side doors) or 2.0 x 1.6 (centre doors), headroom 3.4 and a pit of about 1.0-1.5 (source: Orona Next Essentia and Stannah Maxilift pages in section 1). Here: shaft 2.2 x 2.2 clear full height in fire-resisting walls, pit 1.1, head 3.9 to the roof soffit, so no roof overrun. Drive on the guide rails at the shaft head; controller in the top landing door frame. Serves ground and first. Locked off tonight.
- Fire stair A (AG21, AF15, AR04): west end of the spine, ground to roof. Flights fill each half beside a solid 0.3 centre wall touching every landing; 13 risers per flight; landings fill the core ends; ground exit on A's west end wall off the bottom landing; roof bulkhead with a roof door and a smoke vent at the top of the stair.
- Main stair B (BG02, BF02) and lift B (BG03, BF03): south-west of the strip behind BG01, same stair spec; the lift beside the core on its south side, same type, ground and first only, landing doors onto BG04 and BF04.
- Fire stair B (BG12, BF11, BR02): north-west corner of the strip, ground to roof, same spec; ground exit on B's west end wall into the gap; bulkhead with smoke vent.
- Gallery stair (BF10 to BG13): open stair 2.4 wide, two straight flights of 13 and a 2.0 landing, in a well inside the strip, balustrade on the hall side, handrails both sides; 3.9 clear at its head under the strip roof.
- Roof access: A only by fire stair A; B only by fire stair B; bridge roof and hall roof only by fixed hooped ladders from those roofs. No outside ladder from the ground.
- Risers with fixed ladders: cable riser A (AG25, AF16) on the spine's west third, ground to first, side doors into both corridor voids; pipe riser A (AF19) from AF10 to a roof hatch by the chillers; cable riser B (BG15, BF12) mid-strip; carrier riser (BG32) from the tunnel to BG31's floor hatch with guard rail; tunnel shaft A (AG23) from TB03 to AG22's floor hatch; manhole (TB02) from the yard to the vault. None sits beside a stair core.
- Lift shafts open only to their own lobbies, never into a room whose walls run to the slab. Lift lobby fire separation: a protected lobby is asked where a lift well is outside a protected stair in a building relying on phased evacuation or serving a basement (source: https://www.designingbuildings.co.uk/wiki/Protected_lobby); neither building does, and the main stairs are not escape stairs, so each shaft is enclosed full height and its lobby is a corridor bay.

## 9. Services
- Telecoms: carrier ducts under Cooper's Lane enter TB01 (splice cases, LANTERN's 2003 cable). B: trays along TB04 to the riser door, up BG32 to BG31, into BG30's patch panels; overhead trays carry fibre through BG20 to the cages; BG33 holds carriers' line equipment. A: trays along TB03, up AG23 to AG22, then cable risers AG25/AF16 to AF02, AG11 and AG12. Campus backbone fibre runs in the tunnel.
- Power: the network operator's 11 kV substation in X09 (buried feed along X08) feeds two Ostler transformers in X09 (general knowledge), buried ducts under X07 to BG11 (main LV board with generator changeover), then BG27 and BG25 (UPS) with BG26 batteries, then the hall's power units and rack strips. A is fed from BG11 through TB04 and TB03 to AG24 (A's board and a small UPS for AG11, AG12, AF02). Generators (BG40, one duty, one standby) feed BG43's panels and buried ducts to BG11. Fuel: tanker on X08, fill point on BG42's east wall, bunded bulk tank, day tanks on the sets. Weekly test runs a set on load (general knowledge). Each lift has its own circuit from its building's board (A from AG24, B from BG11) with fire-alarm homing.
- Cooling: AR02 chillers, AF19 pipe riser, AF11 pumps, AF10 headers, X13 rack (flow and return, insulated, at 5.0-6.5), BF13 valves. Branch one passes the strip's east wall at 5.0 into BG24's high level and on to the CRAH units in BG23, which blow into BU02 and BU01; cold air rises through perforated tiles in the cold aisles and returns at high level. Branch two leaves BF13 above the hall roof on low supports to BR04, which pushes air down BR05 (1.7 x 1.7 clear, 0.9 through the roof) to a diffuser panel in the hall ceiling at 6.0. At the roof BR05 has the bolted grille with its alarm contact, the key switch box beside it and the hoist beam over it for lifting fan sections and attenuator cassettes out of BR04.
- Gas suppression: inert-gas cylinders in BG28, manifold through the wall into BG24's high level, nozzles in BG20, BG23, BU01, BU02, BG29-BG31, BG33. Aspirating smoke detection; warning sounders and strobes; abort and manual release at each protected door. AF05 has its own small cylinder set. Protected rooms have walls to the slab and sealed doors.
- Ventilation and voids: AR03 ducts drop into the corridor voids of AG10 and AF01 and branch through the corridor walls into the offices' own 3.0 ceilings. Each corridor void is 1.5 clear from the ceiling grid (2.4) to the slab soffit (3.9) across the corridor's 3.2 width; ducts, trays and pipes keep to a 0.6 band on one side, leaving at least 2.6 x 1.5 clear. Access: lift-out ceiling tiles along each corridor and side doors from the cable risers. The void ends at every wall that runs to the slab. B's strip has 0.9 service voids over its 3.0 ceilings (not crawlable). The hall has no ceiling.
- Fire alarm: addressable panel in AG11, repeaters at AG01 and BF01; call points at every exit. The alarm releases fail-safe locks, homes both lifts and opens the smoke vents; gas release is by the gas panel only.
- CCTV: network cameras to switches in AG25, AF16, BG15, BF12 and BG31, fibre by the risers (A) and the tunnel (B) to the recorders in AG12, pictures on the wall in AG11.
- Rainwater: downpipes at every corner and about every 12 m on every facade of A, B and the wing, into yard gullies; the bridge roof drains to hoppers on A's and B's walls.
- Crawl and walk spaces against F32 (floor to the underside of what is above): corridor voids 1.5 x 2.6 (crouch 1.5 x 1.2: pass); BU01/BU02 1.5 high, lanes 1.2 wide between pedestals at 1.2 centres (pass; ASK-6); tunnel 2.4 high x 2.6 wide, 1.8 walkway (walk-in: pass); vault 3.0 (pass); manhole 1.2 x 1.2, ladder shaft (SS 1.0: pass); risers and shafts 1.7 x 1.7 or 1.7 x 1.2 (pass); service passage 1.5 wide, open above (F08 1.2-1.95: pass).

## 10. Exterior elements
| Element | Building, facade or roof | Real reason | Same kind elsewhere? |
| --- | --- | --- | --- |
| Downpipes, 100 mm round steel on brackets | A, B and wing, every facade, corners and about every 12 m | Drain the flat roofs to yard gullies | Yes, one type on both buildings (general knowledge) |
| Parapets 1.1 with coping | A roof, B strip, hall roof, wing, bulkheads | Edge protection, membrane upstand | Yes |
| Windows and cills | A: top-hung office casements with cills on all facades, fixed glazing at reception; B: west strip only (BF01, BF05, BG01) | Daylight for offices and staff floors; the hall and plant have none | A's casements all one type |
| Link bridge glazing and roof | LF01, LF02 | Enclosed walkway; roof with 1.1 edge rail drains to hoppers | Only spans with X13 |
| Pipe rack | X13 over the gap | Chilled water and a cable tray from A to B | Only spans with LF01 |
| Fixed hooped ladders | AR01 to LF02, BR01 to LF02, BR01 to BR03, bulkhead roofs | Maintenance between roof levels | One steel type |
| Fall-arrest anchor posts | AR01, BR01, BR03 at about 6 m; LF02 rail | Roof workers clip on | Yes |
| Roof plant | AR02 chillers (pipes into AF19), AR03 AHU (ducts into A), BR04 AHU (pipes from BF13, duct into BR05), wing exhaust stacks and attenuators | Cooling, ventilation, engine exhaust | No lift overrun: both lifts fit inside the storey |
| Smoke vents | AR04, BR02 | Clear smoke from the fire stairs | Both fire stairs |
| Hoist beam | Over BR05 | Lift fan sections and cassettes | Only one |
| Grille and key switch box | BR05 on BR03 | Maintenance access with the alarm isolated | Only one |
| Service passage walls | B's north wall (cladding, no openings but BG10's door), wing's south wall (blockwork, one door) | Separate structures | - |
| Wing louvres and doors | Wing east wall | Engine air intake, plant access | - |
| Chain-link | X09, X07 gates, X11 | Utility enclosures | Yes |
| Lane fence | Lane, east and west boundaries | Site security (F14, ASK-1) | One type |
| Manhole lid | TB02 in X04 | Carriers' access | Only one |
| Lamps | Wall PIR floods on both fronts and the gap; PIR lamp posts in the fence strip; bulkhead lamps over each exit door; gatehouse lamps | Yard safety and security | Section 11 |

## 11. Night lighting
| Lamp type | Who switches it, where, or why it cannot be |
| --- | --- |
| Yard and car park PIR floods and lamp posts | Photocell enables at dusk, PIR switches each lamp for a set time; all-on override in X02 |
| Gatehouse lamps | Photocell, dusk to dawn; interior switched inside X02 |
| Entrance lamps over AG01, BG01 and exit doors | Photocell, dusk to dawn, no switch (security policy) |
| A corridor lights (AG10, AF01, AF17) and lift lobby lights | On all night; switch plates at each corridor end and the lighting panel in AG11 |
| B corridors, BF01, BF05-BF09 | On all night; switched from BF01's panel |
| Offices and rooms | Switched at each door; on only where people work (AG01, AG05, AG11, AF02, AF03, AF08, BG14, BG30) |
| Hall lights | By aisle row from the switch bank on BF09 at the gallery entrance; tonight all rows on; BG21 and the dark side of BG13 have no fittings of their own |
| Tunnel, vault, level U, risers | Off; tunnel and vault switched at each entry; level U has none (engineers bring hand lamps) |
| Generator hall | Off; switched at BG43's door; on for the test |
| Emergency lighting | Maintained exit signs always on and non-maintained fittings that light only on mains failure; cannot be switched (general knowledge, BS 5266) |

## 12. Known tensions
- a. The gallery is not under the 6.6 hall roof: it sits in the two-storey strip under the 8.4 roof (3.0 ceiling, 3.9 to soffit) and looks into the hall through a 1.8 high opening (4.2 to the 6.0 hall soffit) with a 1.1 glass balustrade. Its stair runs in a well inside the strip. ASK-7.
- b. Level U floor -1.6. Hall floor: 0.1 tile and stringer on pedestals from -1.6 to -0.1, so 1.5 clear; only the hall and cooling gallery slab is sunk. Equipment door threshold level at 0.0 both sides, no ramp. Pedestals at 1.2 centres: ASK-6.
- c. At or below the F22 sampler depth: level U (-1.6), vault and tunnel (-3.6), manhole and riser shafts, both lift pits (-1.1, closed). P07 places no guard there.
- d. Each lift shaft (2.5 x 2.5) sits beside its core; the core stays 4.0 x 8.0; core and shaft 6.5 x 8.0 together. No protected lobby is needed (section 8 source).
- e. Service passage 1.5 clear (F08 1.2-1.95); walls 7.7-8.4 and 7.7 (F08 3.6 minimum, feet 2.5); gravel floor level with the yard.
- f. Storeys 4.2 (Michael) against SS 3.3: deviation, Michael wins; stairs take 26 risers. Corridors 2.4 clear under the 1.5 void against SS 3.0: ASK-5.
- g. Kit gaps for a later kit change: mantrap 4.5 x 4 (kit 3 x 2.5); main stair core 4.0 x 8.0 at 4.2 storeys (kit 6 x 3.5); fire stairs 3.5 x 6.5 at 4.2 (kit sized for 3.3); corridors 30 long (kit 26); no module for key safe room, ops counter, lift lobbies, bridge, bridge vestibule, mantrap vestibule, gallery and stair well, meet-me lobby, riser room, gas room, pump and valve rooms, fuel room, catwalks, supply AHU and shaft, vault manhole, tunnel, level U, roofs, yards; generator hall uses the outdoor generator-compound. Lift shaft 2.5 x 2.5 fits the kit.
- h. B's first floor is the west strip only: B's three western bays for the full 30 m depth (18 x 30). The hall block (30 x 30) is single storey.

## 13. Review checklist (level-design 16.10)
1. None: every room is a rectangle on the grid; corridors run straight between cores.
2. None: every space has a use; 3+, 4 and 5 rooms are behind readers, keys or the mantrap. 3. None: ladders only in risers, shafts, the manhole and between roof levels; none beside a stair.
4. None: every stair has handrails both sides and a balustrade on each open side. 5. None: roofs only by the fire stair bulkheads; lower roofs by fixed ladders from those roofs.
6. None: chillers, AHUs, stacks, bulkheads, hoist beam, each with its pipes, ducts or cables. 7. None: openings are stair wells, lift shafts, risers, lidded hatches, smoke vents and the BR05 duct.
8. None: every object is named (cars, vans, crates, racks, CRAH units, cylinders, sets, tanks). 9. None.
10. None: AG22 and BG31 hatches are inside plant rooms (locked lid; guard rail); hall hatches have no ladder. 11. None: BR05 ends BR04's duct system; office grilles end AR03's. 12. None: BG31 is a plant room at the top of a shaft; its door to BG30 is its real door.
13. Exterior and service elements carry their reasons here (sections 9, 10); P06 copies them into the register.
14. Yes: an operator's architect would know every room; each main core sits behind its entrance, fire stairs at the end walls.

## 14. ASK items
- ASK-1: Lane fence height: take F14's climbable fence value (real security fences are 2.4-3.0, general knowledge).
- ASK-2 (answered 2026-10-11: exempt): Ring-exempt doors: manhole (1 to 4), equipment door, fire exits, passage door, wing doors and compound gates (key-only, from zone 1 into 3).
- ASK-3: Equipment door 2.0 x 2.1 (SS double door); real equipment doors are often 2.4 high or more (general knowledge).
- ASK-4: Lift numbers (shaft, pit 1.1, head 3.4) are maker data, not facts: add them to facts.json in P03B?
- ASK-5 (answered 2026-10-11: accepted): Corridors 2.4 clear under the 1.5 void (SS 3.0).
- ASK-6: Raised-floor pedestals at 1.2 centres for 1.2 lanes (real grids 0.6, general knowledge).
- ASK-7: Gallery opening into the hall only 1.8 high (4.2 to 6.0).

## 15. Questions for Michael
1. Generator hall: separate wing behind B with a 1.5 passage (as drawn), or inside B's footprint? Answered (Michael 2026-10-11): separate wing.
2. Ring exemptions in ASK-2: accept, or add zone-2 airlocks in front of each key-only plant door? Answered: exempt them.
3. Corridor height (ASK-5): accept 2.4 clear, or raise office floors to 4.5 (2.7 clear)? Answered: accept 2.4.
4. Raised-floor pedestals (ASK-6): 1.2 grid as drawn, or leave pedestals out of the build? Not asked; 1.2 grid stands unless Michael says otherwise.
5. Sizes: A 36 x 24, B 48 x 30, site 108 x 76: accept, or shrink B to 42 x 30? Answered: accept.

Downstream: P03B redoes the block plan from this brief, including both lift shafts (2.5 x 2.5 beside each main core, pits 1.1). schema.md's ring-to-space line (S1-S6) is stale: use section 6 here. The module kit needs the rows in tension g. B-step builders: lifts are built as closed shafts with shut landing doors (no working lift in the engine). P04S, P07: zone corrections for S2 and X; P07 places no guard on the floors in tension c.

## Revision log
| Date | Fix # | What changed (rows, sections) | Checker counts after | Status |
| --- | --- | --- | --- | --- |
| 2026-10-11 | campus rewrite | Replaces the single-building brief (last commit c805978): Building A, Building B, link bridge, generator wing, yard, lane, level U, vault and tunnel; new ids AG/AF/AR/LF/BG/BF/BR/BU/TB/X; both lifts | - | DRAFT |
| 2026-10-11 | answers | Michael: separate generator wing, ring exemptions (ASK-2), 2.4 corridors (ASK-5), sizes accepted; s14, s15 | - | DRAFT |
