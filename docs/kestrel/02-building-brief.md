# Cinder Yard - building brief
Status: DRAFT

Cinder Yard is a small carrier-neutral colocation data centre run by Ostler Colocation on an old railway goods
yard in the Kestrel district of Hollowmere, under the viaduct. It opened in 2004 and was refitted in 2021.
This brief is the architect's record: what the building is, every room, how services run, and how it is used
tonight. All metres. Clear sizes only; positions are set later.

## 1. Precedents

| Precedent | Source | What this design takes from it |
| --- | --- | --- |
| Carrier-neutral colo, five concentric security layers (lobby, desk, mantrap, hall door, cage) | Equinix "5 layers of security" (general industry) (source: https://equinix.com/resources/infographics/5-layers-of-security) | The nested rings: site, reception/desk, controlled staff floor, mantrap into the secure hall, locked cages within |
| Small UK/London colocation spec sheets (storey heights, UPS, battery autonomy, generator and fuel, cooling load) | Lumen colocation data sheets (source: https://assets.lumen.com/is/content/Lumen/len-1228-data-centre-colocation-london-uk-web) | A 500 kW standby generator with a ~7000 L diesel tank, 15-min battery autonomy, ~750 W/m2 cooling (general knowledge) |
| TIA-942 functional spaces (entrance room, computer room, meet-me room, support spaces) | ANSI/TIA-942 overview (source: https://silo.tips/download/ansi-tia-942-telecommunications-infrastructure-standard-for-data-centers) | The room vocabulary: carrier entrance room (vault), meet-me room, computer room (data hall), kept physically separate |

## 2. The building

- Built and operated by Ostler Colocation, a regional operator. It rents space by the rack and the cage to
  tenants and carriers. Hollowmere and Ostler are fictional, so no real address: Cinder Yard, off Cooper's Lane, Kestrel.
- Opened 2004 as a carrier-neutral data centre on the cleared goods yard. The first carrier fibre was pulled in
  in 2003 through the street duct under the yard (story 2.0). The 2021 refit replaced the UPS and chillers,
  added the iris-and-card mantrap and the current camera and alarm panel, and re-clad the facade.
- Style and construction: a plain two-storey portal-frame industrial shell. Steel frame on pad footings, infill
  blockwork to the ground, insulated profiled-metal rainscreen above, flat built-up roof with a parapet.
  Windowless on the hall sides; small windows only on the office elevations (data centres are windowless, general knowledge).
- Structural grid: 6.0 m x 6.0 m bays, columns on the grid. The building is 8 bays by 5 bays.
- Overall building footprint 48.0 m (east-west) x 30.0 m (north-south) = 1440 m2 per floor (RULES 2 limit: 48 x 30).
- Storey heights (floor to floor), scale-sheet values only: basement 3.3 m; ground office/logistics block 3.3 m;
  first floor 3.3 m (roof slab at +6.6 m). The data hall and cooling gallery are double-height, single-storey,
  with a 5.0 m clear ceiling (scale sheet "halls 4.5-6.0"), allowing for an 800 mm raised floor and a ceiling void
  (a real data hall runs ~4.7-5.0 m clear, general knowledge). Roof slab at +6.6 m clears it (5.0 + 0.3 slab = 5.3 m).

## 3. Design and operation

- Ground floor is the working floor: reception and the security desk at the front; the secure core (mantrap, data
  hall, power and cooling plant, meet-me room) behind; goods handling (loading bay, build room, comms) to one side.
- First floor is staff only: Ostler's offices, the night operations desk, the facilities office, and amenities.
- Basement holds only the carrier entrance room (vault) under the secure core.
- Tenants are mixed: small businesses in single racks, a few locked cages. Ansell & Crowe Ltd rents one cage
  (Pell's). Carriers terminate their fibre in the vault and cross-connect in the meet-me room.
- Since opening, racks grew denser and the 2021 refit raised power and cooling and tightened access control.
- Tonight (a wet Tuesday, ~01:10): a normal skeleton night shift of contracted security officers plus the one
  Ostler employee on duty, the night duty engineer. Ansell & Crowe have paid for extra security for a cage
  handover: crates leave through the loading bay, a van is being loaded in the yard, and a private contractor
  sits at their patch panel. The weekly standby-generator test is due before dawn.

## 4. The site

- Site 78.0 m (east-west) x 56.0 m (north-south) = 4368 m2 (RULES 2 limit: 80 x 60). The building sits to the
  north; the yard is the open ground to the south, toward the lane.
- Cooper's Lane runs along the south boundary, a narrow service lane under the Kestrel viaduct. The haulage
  depot faces the site across the lane (story 2.0); Moth watches from the depot roof.
- The yard is the old goods-yard hardstanding: vans, fuel deliveries, the standby generator compound, staff
  parking and the loading apron. Finish is cracked concrete and gravel (loud underfoot).
- Vehicle gate on the lane at the west, with an ANPR camera reading plates in and out. A second gate at the
  east serves the loading apron. Pedestrian entry in the story is over the lane fence on the south boundary; the
  way out is the vehicle gate or across the loading apron (a different path from the fence), separate from the fence.
- The carrier duct manhole sits in the yard near the north-west, close to an exit-only fire door from the
  facilities/secure area (fix 6). Its lid lifts to the carrier entry path down to the vault.
- Boundaries: a 2.4 m palisade lane fence on the south (the climb-in point); 2.4 m blockwork boundary walls on
  the east, west and north; the viaduct abutment forms part of the north edge.
- Neighbours are solid: the viaduct (north) and the depot facade (south across the lane) are never enterable (RULES 2).

## 5. Room schedule

Sizes are clear (rectangle minus half of each wall). Service rooms (WCs, cupboards, mantrap, risers, stairs) are
below the 6 m play-space minimum by function and are tagged; all occupied rooms and corridors meet the minimums.

| Id | Level | Zone | Name | Design use | Use tonight | Clear size (w x d m) | Ceiling (m) | Floor finish | Doors to (ids) | Lit? | At night |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B01 | Basement | 5 | Carrier entrance room (vault) | Carriers' fibre terminates; entrance-room equipment | Carriers' kit only, unmanned | 8.0 x 6.0 | 3.0 | sealed concrete | B02, X10 (carrier path) | dim | none (no officer below nav depth, F22) |
| B02 | Basement | 5 | Carrier riser shaft | Ladder shaft, vault up to meet-me room | passage only | 2.0 x 2.0 (service) | shaft | concrete | B01, G18 | off | none |
| G01 | Ground | 2 | Lobby and reception desk | Visitor sign-in, waiting; fire alarm panel by the front door | night sign-in; alarm panel live | 9.0 x 7.0 | 3.0 | polished screed | X02, G03, G04, G05, G20 | on | duty manager passes on his walk |
| G03 | Ground | 2 | Visitor toilet (accessible) | Visitor WC | unused | 2.5 x 2.2 (service) | 3.0 | tile | G01 | off | none |
| G04 | Ground | 2 | Meeting room | Tenant and visitor meetings | empty, locked (no daytime meetings) | 6.0 x 5.0 | 3.0 | carpet tile | G01 | off | none |
| G05 | Ground | 2 | Security site office (duty manager) | Shift manager's office; log, master card | duty manager's base | 5.0 x 4.0 | 3.0 | carpet tile | G01 | on | duty manager (holds master card) |
| G06 | Ground | 3+ | Security control room | Monitor wall, intrusion/alarm panel; window onto the lobby | manned all night | 6.0 x 5.0 | 3.0 | antistatic vinyl | G20 (window onto G01, no door) | on | desk operator; supervisor (leaves on rounds) |
| G07 | Ground | 3 | Loading bay (goods-in) with goods lift | Delivery dock, kit receiving | crates out to the van | 10.0 x 8.0 | 4.0 | sealed concrete | G20, G10, G26 | on | van driver carrying crates |
| G26 | Ground | 2 | Goods lobby | Goods airlock: roller shutter to apron, inner door to the loading bay (goods boundary, Q2) | shutter open for loading | 4.0 x 3.0 | 3.0 | sealed concrete | X08 (shutter), G07 | on | van driver passes |
| G08 | Ground | 3 | Build room | Unbox, rack and test kit before install | quiet | 7.0 x 6.0 | 3.0 | antistatic vinyl | G20 | dim | none |
| G09 | Ground | 3 | Comms room (house MDF) | The building's own telecoms/IT frame | unmanned | 5.0 x 4.0 | 3.0 | antistatic vinyl | G20 | dim | none (used to hide a body, P06) |
| G10 | Ground | 3 | Goods lift shaft | Lift, ground to first (consumables) | idle | 2.5 x 2.5 (service) | shaft | steel | G07, F06 | off | none |
| G11 | Ground | 3 | Janitor's cupboard (with sink) | Cleaner's store, ground floor | unused | 2.0 x 1.5 (service) | 3.0 | sealed concrete | G20 | off | none |
| G12 | Ground | 4 | Mantrap | Two-door interlock; card plus iris into the hall | manned post | 3.0 x 2.5 (service) | 3.0 | antistatic vinyl | G20, G23 | on | mantrap post officer |
| G13 | Ground | 4 | Data hall (computer room) | White space: rack rows and customer cages, overhead fibre trays | humming, lit | 20.0 x 14.0 | 5.0 | raised access floor | G12, G23, G18, G19, X (fire exits) | on | talking pair on the aisles |
| G14 | Ground | 4 | UPS room | UPS modules, no-break power to the hall | running | 8.0 x 6.0 | 3.5 | antistatic vinyl | G23, G15 | on | none |
| G15 | Ground | 4 | Battery room | Battery strings for the UPS (~15 min autonomy, gen. knowl.) | running | 6.0 x 5.0 | 3.0 | acid-resistant | G14 | dim | none (vented; kept off staff rooms) |
| G16 | Ground | 4 | Electrical switchroom | Incoming LV switchgear, generator changeover (ATS) | live | 7.0 x 5.0 | 3.5 | sealed concrete | G23 | dim | none |
| G17 | Ground | 4 | Cooling gallery | CRAC/air-handling units and chilled-water headers; maintenance gantry | fans running | 16.0 x 4.0 | 5.0 | sealed concrete | G23 | dim | none |
| G18 | Ground | 5 | Meet-me room (MMR) | Carrier/tenant cross-connect patch panels | contractor at the panel | 7.0 x 6.0 | 3.0 | antistatic vinyl | G13, B02 (carrier reader door) | on | Pell's private contractor; roaming officer |
| G19 | Ground | 5 | Pell's cage (mesh, in G13) | One tenant's locked mesh cage of racks | being re-equipped | 4.0 x 3.0 (enclosure in G13) | 5.0 | raised access floor | G13 (caged door) | on | none (other cages are like mesh areas in G13) |
| G20 | Ground | 3 | Controlled corridor | Staff spine: reception to goods, stairs and the mantrap | quiet | 3.5 x 26.0 | 3.0 | linoleum | G01, G06, G07, G08, G09, G11, G12, G21, G25 | on | rounds officer passes |
| G21 | Ground | 3 | Main stair core | Main stair, ground to first | passage | 6.0 x 3.5 | 3.0 | linoleum | G20, F08 | on | none |
| G23 | Ground | 4 | Secure corridor | Serves UPS, battery, switch, cooling, hall, MMR | quiet | 3.5 x 14.0 | 3.0 | antistatic vinyl | G12, G13, G14, G16, G17 | dim | escort officer stands here |
| G22 | Ground | 3 | Plant and services corridor | Facilities corridor carrying the chilled-water pipes and pipe riser into the cooling gallery; CRAC servicing (Q1) | quiet, loud plant | 3.5 x 16.0 | 3.0 | sealed concrete | G20, X02 (exit-only fire door by X10) | dim | escort officer on plant checks |
| G24 | Ground | 3 | Fire stair 1 (SE, front block) | Enclosed escape stair, roof to ground, discharges outside | empty | 6.0 x 2.8 (stair) | 3.0 | concrete | F08, R02, X02 (exit-only) | emergency | none |
| G25 | Ground | 3 | Fire stair 2 (SW) | Enclosed escape stair, ground to first, discharges outside | empty | 6.0 x 2.8 (stair) | 3.0 | concrete | G20, F08, X02 (exit-only) | emergency | none |
| F01 | First | 3 | Ostler offices | Daytime admin and sales desks | dark | 12.0 x 8.0 | 3.0 | carpet tile | F08 | off | none |
| F02 | First | 3 | Night operations desk (NOC) | BMS and monitoring screens; the engineer's terminal (cage register) | manned | 8.0 x 6.0 | 3.0 | antistatic vinyl | F08 | on | night duty engineer (civilian) |
| F03 | First | 3 | Facilities office | Holds the cage and cross-connect records | quiet | 6.0 x 5.0 | 3.0 | carpet tile | F08 | dim | corridor patrol passes |
| F04 | First | 3 | Kitchenette and break room | Staff rest and food prep | occupied | 7.0 x 6.0 | 3.0 | vinyl | F08 | on | generator test technician (rests until the test) |
| F05 | First | 3 | Staff toilets, showers, lockers | Staff WC, showers, lockers | unused | 8.0 x 5.0 | 3.0 | tile | F08 | off | none |
| F06 | First | 3 | Storage room | Staff and consumables store | quiet | 5.0 x 4.0 | 3.0 | vinyl | F08, G10 | off | none |
| F07 | First | 3 | Janitor's cupboard (with sink) | Cleaner's store, first floor | unused | 2.0 x 1.5 (service) | 3.0 | vinyl | F08 | off | none |
| F08 | First | 3 | First-floor corridor | Staff spine linking all first-floor rooms and stairs | quiet | 3.5 x 24.0 | 3.0 | linoleum | F01-F07, G21, G24 (SE end), G25 (SW end) | on | corridor patrol; escort officer at the door |
| R01 | Roof | Plant | Roof chiller deck | Chillers on frames; chilled-water flow/return down to G17 | running | ~12.0 x 8.0 (plant) | open | pavers on roof deck | R02 | off | none |
| R02 | Roof | Plant | Roof stair bulkhead | Covered roof access at the head of fire stair 1, over the front block (SE corner) | empty | 6.0 x 2.8 (stair head) | 2.4 | concrete | G24 | emergency | none |
| R03 | Roof | Plant | AHU and plant platform | Office air-handling unit, exhausts and aerials | running | ~8.0 x 5.0 (plant) | open | roof deck | R02 | off | none |
| X02 | Site | 1 | Yard | Goods yard: vans, fuel, generator, parking, apron | working yard | ~50 x 30 (open) | - | concrete/gravel | X01, X03, X05, X06, X07, X08, X09, G01, X10 | PIR | gatehouse officer, perimeter patrol, van driver |
| X01 | Site | 1 | Cooper's Lane and lane fence | The service lane and the 2.4 m palisade climb-in fence | wet, quiet | lane ~6 wide | - | tarmac | X02 (over fence), X09 | street lamp | none (Moth on the depot roof opposite) |
| X03 | Site | 1 | Gatehouse | Vehicle sign-in, yard monitor | manned | 4.0 x 3.0 | 2.6 | concrete | X02 | on | gatehouse officer |
| X04 | Site | 1 | Parking | Staff and visitor parking bays | a few cars | ~12 x 6 | - | concrete | X02 | PIR | none |
| X05 | Site | 1 | Generator compound (with fuel tank) | Standby diesel generator and ~7000 L bunded tank, own locked fence | due for the weekly test | ~10 x 6 | - | concrete bund | X02 (gated) | off | none (technician arrives for the test) |
| X06 | Site | 1 | Bin store | Waste and recycling bins | quiet | 4.0 x 3.0 | 2.4 | concrete | X02 | off | none |
| X07 | Site | 1 | Smoking shelter | Covered smoking point (clear of the fuel tank) | unused | 3.0 x 2.0 | 2.4 | concrete | X02 | off | none |
| X08 | Site | 1 | Loading apron | Hardstanding at the dock shutter; van loading | van being loaded | ~12 x 8 | - | concrete | X02, G07, X09 | on | van driver |
| X09 | Site | 1 | Vehicle gate (ANPR) | Plated vehicle entry/exit on the lane | closed | 4.0 wide gate | - | tarmac | X01, X02, X08 | lamp | gatehouse officer controls it |
| X10 | Site | 1 | Carrier duct manhole | Lidded access to the carrier entry path to the vault | sealed | 1.0 x 1.0 opening | - | concrete | X02, B01 (carrier path) | PIR | none (near the facilities fire door) |

Area check (clear room + circulation areas vs gross footprint):
- Ground (excluding G19, an enclosure inside G13): 63+5.5+30+20+30+80+12+42+20+6.25+3+7.5+280+48+30+35+64+42+91+21+49+56+17+17 = 1069.25 m2. Gross 1440 m2; the remaining ~371 m2 is wall thickness, columns and reserved white space for future cages (TIA-942 flexible white space, general knowledge). Fits.
- First floor (covers the south/front block, not the double-height secure core): rooms + corridor + stairs = 96+48+30+42+40+20+3+84+55 = 418 m2. Available first-floor footprint ~768 m2. Fits.
- Basement: B01 48 + B02 4 = 52 m2, under the secure core only. Fits.
- Roof: plant R01+R03 ~136 m2 plus the bulkhead; the rest is parapeted flat roof over 1440 m2. Fits.

## 6. Adjacency

Must touch (with the reason):
- Meet-me room (G18) against the data hall (G13): cross-connect jumpers run straight from the panels into the hall trays.
- Carrier vault (B01) directly under the meet-me room (G18): the carrier riser (B02) runs straight up between them.
- Battery room (G15) beside the UPS room (G14): short DC runs between the strings and the UPS.
- UPS room (G14) beside the electrical switchroom (G16): switchgear feeds the UPS.
- Cooling gallery (G17) along the data hall wall (G13): the CRAC units must blow into the hall.
- Mantrap (G12) between the controlled corridor (G20) and the secure corridor (G23): the only staff way into zone 4.
- Security control room (G06) beside reception (G01) and the controlled corridor (G20): window onto the lobby, to
  watch arrivals; its only door opens from G20, the staff side, never from reception (zone 2 never opens into 3+).
- Duty manager office (G05) off the lobby (G01): signs people in and holds the log and master card.
- Loading bay (G07) beside the build room (G08) and goods lift (G10): kit is received, built, then installed.
- Goods lobby (G26) between the loading apron (X08) and the loading bay (G07): the goods boundary, so deliveries pass a threshold (Q2).
- Plant and services corridor (G22) along the cooling gallery (G17): the chilled-water pipes run in it and penetrate the wall into the gallery.

Must not touch (with the reason):
- Battery room (G15) away from the break room and offices: it off-gasses and must be vented clear of staff rooms.
- Data hall (G13) away from the lobby and visitor rooms (G01, G03, G04): visitors must never be near the white space.
- Generator compound and fuel tank (X05) away from the building and the smoking shelter (X07): noise, fumes and fire separation.
- Wet rooms (F05 toilets/showers) not over the data hall or electrical rooms: no water above live kit (placed over the offices).
- Smoking shelter (X07) clear of the fuel tank (X05): ignition separation.

## 7. Vertical circulation

Follows level-design 16.2 (people move only by stair cores, enclosed fire stairs, or fixed ladders inside plant/shafts).
- Main stair core (G21/F08), near the front by reception: the everyday stair, ground to first. Central-south so staff
  reach it straight from the controlled corridor and the offices.
- Fire stair 1 (G24/R02), south-east corner of the front (first-floor) block: enclosed, runs roof to ground and
  discharges straight outside to the yard (exit-only). It is also the only roof access, by the covered stair
  bulkhead at its head, over the front block (16.2.5).
- Fire stair 2 (G25), south-west corner of the front block: enclosed, ground to first, discharges outside. The two
  fire stairs sit at opposite ends of the first floor, so both serve it. The secure core (no first floor above it)
  keeps its own exit-only fire exits.
- The data hall has its own exit-only fire doors straight to the yard (industry rule for a large room). The plant and
  services corridor (G22) has an exit-only fire door that discharges by the carrier duct manhole X10 (fix 6).
- Goods lift (G10): working, ground loading bay to first-floor storage, for consumables and lighter kit; heavy racks
  stay on the ground (heavy floor loads kept low). It does not serve the basement.
- Carrier riser (B02): a fixed ladder in an enclosed shaft, vault (B01) up to the meet-me room (G18). The only link to
  the basement; the vault's other way in is the street duct and manhole (X10). This is the carriers' own path, kept
  separate from the security rings (real colocation practice, general knowledge).
- Plant ladders exist only on the roof chiller frames and inside the riser shaft (16.2.1). No exterior ladders.

Longest escape travel per floor (general knowledge, BS 9999-type travel limits ~18 m one way, ~45 m two ways):
- Ground: ~40 m from the far secure corner to a final exit (two directions available). First: ~24 m to the nearer fire stair,
  two directions available (stairs at both ends of the 48 m block, so at most about half its length).
- Data hall: ~25 m within the hall to one of its own fire exits. Basement vault: ~12 m to the riser or the manhole.

## 8. Services

- Carrier fibre and copper: street duct under Cooper's Lane -> carrier duct manhole X10 in the yard -> ~1.0 m
  concrete duct -> carrier entrance room/vault B01 (carriers' line-terminating kit) -> carrier riser B02 (fixed
  ladder shaft) -> meet-me room G18 (cross-connect patch panels) -> overhead fibre trays through the data hall G13
  -> customer cages, Pell's (G19) among them.
- Power: incoming LV supply from the street -> electrical switchroom G16 (switchgear, ATS) -> UPS room G14 (UPS
  modules) <-> battery room G15 (battery strings, ~15 min autonomy, general knowledge) -> PDUs in the data hall G13.
  Standby: ~500 kW diesel generator in compound X05 with a ~7000 L bunded tank (general knowledge) -> feeds G16 on
  mains failure. The weekly test runs the generator under load.
- Cooling and ventilation: roof chillers R01 -> chilled-water flow/return pipes down a pipe riser into the plant and
  services corridor G22 -> through the wall into the cooling gallery G17 -> CRAC/AHU units in G17 blow cold air into
  the data hall G13 (raised-floor plenum and front-of-rack)
  -> warm air returns to the CRACs. Offices are served by the roof AHU R03. No walk-through ducts: data-hall air
  moves through the raised floor and the open hall, not through any duct a person could pass (F32).
- Heating: electric panel heaters in the offices and break room (general knowledge); the data and plant spaces are
  cooled, not heated (they reject heat).
- Rainwater: cast-iron downpipes at the four building corners and at the mid-points of the long north and south
  elevations, into yard gullies and the site drainage.

## 9. Exterior elements

| Element | Where (words) | Real reason | Same kind elsewhere? |
| --- | --- | --- | --- |
| Cast-iron downpipes | Four corners and mid-points of the long elevations | Carry roof rainwater to the gullies | Yes, all alike (one climbable type, 2.5) |
| Rainscreen cladding rails | All upper-level elevations | Fixing rails behind the profiled metal rainscreen | Yes, continuous |
| Plant louvres | Cooling gallery wall and roof plant | Air in/out for CRAC and AHU plant | Yes, matched louvres |
| Office windows | Office elevations (south/west, first floor) only | Daylight to staff rooms; halls stay windowless | Yes, same unit (hall/MMR have none) |
| Fire exits (exit-only) | Fire stair 1 (SE), fire stair 2 (SW), data-hall exits, facilities exit by X10 | Escape; push bar inside, no handle outside, alarm to the desk | Yes, all the same door |
| Roof chillers | Roof deck (north) | Reject hall heat; chilled-water pipes down to G17 | With AHU, matched frames |
| Roof AHU and aerials | Roof deck (south) | Office air handling; small aerials | One each |
| Dock shutter and canopy | Loading apron face (east) | Goods dock; weather canopy over the apron | One |
| Yard lamps | On the building walls and compound posts | Light the working yard | Yes, all PIR-switched |

## 10. Night lighting

| Lamp type | Who switches it | Where the switch is |
| --- | --- | --- |
| Yard lamps (PIR motion, story 2.0) | Motion sensors; master at the yard lighting box | Yard lighting box on the gatehouse (X03) wall; photocell override |
| Lane street lamp | Council photocell, on all night | No local switch (photocell) |
| Emergency lighting (maintained) | None: fire circuit on battery | No switch (code circuit) |
| Office and break-room lights | Staff, per room | Switch inside each room (F01-F04) |
| Data-hall aisle lights | Staff; bank at the mantrap side of the hall | Hall switch bank by G12/G13 (the co-op light switch, P01 section 9) |
| Corridor and secure-corridor lights | Staff | Switches at the corridor ends (G20, G23, F08) |
| Security control, mantrap, reception | Always on (manned posts) | Local switch, left on |

## 11. Zones confirmed

P01 section 6 proposes S1=1, S2=2, S3=3+, S4=3, S5=4, S6=5. Confirmed. Clarifications: S4 (zone 3) spans two floors -
the ground-floor controlled logistics and the first-floor staff rooms - and the engineer's terminal and the cage
records (objective 4) sit on the first floor (NOC F02 / facilities F03), per the fixed program. The electrical
switchroom and cooling gallery are zone 4 (secure core), as the fixed program lists; a zone-3 plant and services
corridor (G22) carries the chilled-water pipes and gives S4 its plant/beam/pipe character (Q1). The goods lobby (G26)
is zone 2, the goods boundary between the apron and the loading bay (Q2).

| P01 space | Zone | Rooms in this brief |
| --- | --- | --- |
| S1 lane and yard | 1 | X01, X02, X03, X04, X05, X06, X07, X08, X09, X10 |
| S2 ground-floor offices | 2 | G01, G03, G04, G05, G26 (fire alarm panel in G01) |
| S3 security room | 3+ | G06 |
| S4 ops and facilities | 3 | F01, F02, F03, F04, F05, F06, F07, F08 (first floor); G07, G08, G09, G10, G11, G20, G21, G22 (ground logistics); fire stairs G24, G25 |
| S5 mantrap and data hall | 4 | G12, G13, G14, G15, G16, G17, G23 |
| S6 meet-me room | 5 | G18, G19, B01, B02 |

## 12. Review checklist (level-design 16.10)

1. Path-forcing room shapes? none (all rectangles on the grid; corridors straight).
2. Space with no purpose or too easy for its value? none (secure core behind the mantrap; cages locked and caged).
3. Ladder beside a stair, or outside a plant/shaft? none (ladders only in the riser shaft and on roof frames).
4. Stair without handrails or with a gap? none (enclosed fire stairs and a main core, built complete, 16.2.4).
5. Roof reached by anything but a bulkhead/fire stair? none (roof only by the fire-stair-1 bulkhead R02).
6. Roof object that is not plant? none (chillers, AHU, aerials, all with pipes/cables).
7. Floor or roof not fully covered, or a hole with no reason? none (openings are stairs, the two shafts, roof louvres).
8. Block with no named object, or object blocking a door/window? none (yard objects are real: bins, van, generator, fuel tank).
9. Barrier in front of a room for no reason? none.
10. Ladder in a hole in a floor? none (the riser ladder is in an enclosed shaft).
11. Vent that is not the end of a real duct? none (louvres serve the CRAC/AHU plant; no walk-through ducts).
12. Dead end needing an invented side door? none (every room has a stated door list).
13. Every element has a register row with a reason? the register is 16.9's deliverable for P06; every room and element
    here has a design use and a real reason (ASK-B1: the full element register table is built at P06, from this brief).
14. Would an architect recognise every room and a visitor guess the stairs? yes (TIA-942 spaces; the main stair is at
    the front by reception, fire stairs at opposite corners).

## 13. ASK items

- ASK-B1: the full element register (16.9) is a P06 deliverable; this brief gives the design use and reason for each room.
- ASK-B2: closed (Q3) - the data hall and cooling gallery use a 5.0 m clear ceiling, within the allowed 4.5-6.0 m.
- ASK-B3: closed (Q2) - a zone-2 goods lobby (G26) now sits between the apron and the loading bay, so the goods path
  reads zone 1 -> 2 -> 3.
- ASK-B4: storey heights use the scale sheet's 3.3 m; a real cable vault basement would be deeper (general knowledge).

## 14. Questions for Michael

1. Switchroom and cooling gallery are zone 4 (fixed program), but P01 beat B5 put a "plant gallery / switch room"
   in zone 3 (S4), where it teaches beams and the pipe run. Options: (a) accept zone-4 placement, move that teaching
   to the secure-core approach; (b) add a separate zone-3 plant/service corridor on the ground floor for it, keeping
   the switchroom in zone 4; (c) leave it to P04S/P06.
2. The loading-bay dock shutter crosses zone 1 (apron) straight to zone 3 (loading bay), skipping zone 2. Options:
   (a) accept it as a sanctioned, alarmed, normally-shut goods boundary (like reception, for goods); (b) insert a
   goods lobby so it reads zone 1 -> 2 -> 3; (c) reclassify the loading bay as zone 2.
3. Data hall clear ceiling: (a) 4.5 m (used, scale-sheet minimum for a hall); (b) 5.0 m (closer to a real hall, still allowed).
4. Carrier diversity: (a) one vault and one manhole (used, matches P01); (b) note a second divergent vault/manhole for
   redundancy but keep only one in play.

Answers (Michael, 2026-10-10), applied to this draft: Q1 (b) add a zone-3 plant and services corridor (G22); Q2 (b)
insert a zone-2 goods lobby (G26); Q3 (b) data hall and cooling gallery at 5.0 m clear; Q4 (a) one vault and manhole.

Downstream: P04 must recheck that G06 touches both G01 (window) and G20 (its only door).
Downstream: P04 and P06 must recheck fire stair 1 (G24) at the south-east corner of the front block, with R02 over the front block.

## Revision log

| Date | Fix # | What changed (rows, sections) | Status |
| --- | --- | --- | --- |
| 2026-10-10 | 1 | G06 door from G20, window onto G01 kept; G01, G06, G20 Doors to; section 6 G06 line | done |
| 2026-10-10 | 2 | Fire stair 1 moved NE to SE of the front block; G24, R02, F08 Doors to; section 7 (stairs, first-floor escape ~24 m); section 9 fire exits row | done |

