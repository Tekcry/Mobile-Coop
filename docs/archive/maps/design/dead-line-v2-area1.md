# Dead Line v2 - Area 1: the Approach (Cable Lane)

Stage D1 (Area 1), revision of 2026-10-10. Goal (Michael): Area 1 requires careful planning and patience; a player who does not watch the guards and time their moves gets caught. Source of truth: `map-dead-line-v2.json` (the G1 generator's format). Checks: `map-dead-line-v2-validation.md` (`map-dead-line-v2-analysis.mjs`, engine perception, light and noise from `src/`). Perception proposal: `map-dead-line-v2-perception.md`. Plan: `dead-line-v2-area1.svg`, generated from the JSON by `map-dead-line-v2-svg.mjs`. Site and buildings: `dead-line-v2-brief.md`. Rules: `docs/level-design.md` Section 16.

Positions are (x, z) in metres from the lane mouth; heights are y. Every guard loop is exactly 40.0 s on the master clock.

## 1. The place

Cable Lane is a 1930s service lane that runs 180 m east from Viaduct Road to the exchange's vehicle gate, named for the telco's 1934 cable tunnel under it. North: the railway viaduct, its arches let as lock-ups with single-storey lean-to fronts. South: the backs of a pub, a printing works and the Mill Street yards. East: a turning head at the exchange gate, beside the telco's substation in arch A18. At night every business is shut; Pell's contractor holds the lane because it is the only road to the gate. Rain all night.

The van cannot stop in sight of the lane mouth, so it drops the team on Viaduct Road north of the railway bridge; they walk south under the bridge to the lane mouth.

## 2. The linear path

| Layer | Route id | What it is |
| --- | --- | --- |
| Ground (shadow) | M | The lane: the foot gap past the contractor's car, pavements, recess mouths, parked cars |
| Up | UP (drops at the gaps), UPQ (downpipes down) | The lean-to roofs, reached by their own downpipes. Roof lights on A4, A5, A8 and A9 keep the walk to the lit 1.2 m gutter strip; the A6 and A13 forecourts force a descent; anti-climb spikes on A16's east end mean the way down there is A16's downpipe |
| Below | BELOW | The 1934 cable tunnel from M1 at the lane mouth to M2 at the A6 forecourt, where the 1962 water main crossing (the duct bank) ends it |
| Lamps out | FP1 | The ground route with the lane lamps pulled at FP1 (GA2 walks over and resets them) |

| Segment | x | Encounter | Ends at |
| --- | --- | --- | --- |
| Viaduct Road under the bridge | 0 to 12 | E1.1 | V0 |
| Lane mouth: the car, GA1, GA5 | 12 to 46 | E1.2, E1.3 | K1 at FX1 |
| Lock-up row: GA2, GA6 | 46 to 82 | E1.4 | FX3 |
| Printworks bay: GA3 | 82 to 100 | E1.5 | K2 at A9 |
| Connector (quiet) | 100 to 132 | none | A13 |
| A13 sand bays | 132 to 142 | E1.6 | K3 |
| East lane: GA4 | 142 to 172 | E1.7 | A17 reveal (V4) |
| Turning head: GA7, GA4 | 172 to 191 | E1.8 | K4 in the substation |

Area 1 ends at the pier door SD into the telco drum store A19 (Area 2).

**Time (measured).** Ground route 240 m, ideal walk 130 s. Timetable bot (perfect knowledge, silent gear): 240.3 s, 38% of it waiting, longest wait 26 s. A first-time player will take several times the bot's waiting.

## 3. Element register

Generated from the `register` array in `map-dead-line-v2.json` each time the analysis runs (rule 16.9); the analysis fails if any element has no row.

<!-- register:start -->
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| GROUND | Ground slab over the tunnel | The tunnel is 2.0 m below the lane surface (1934 cut-and-cover box) | Sight and noise between the tunnel and the lane | 16.7.1 |
| BRIDGE | Railway bridge deck over Viaduct Road, +6.5 | The railway crosses the road on a girder bridge | Dark drop-off under it | 16.0 |
| A18CEIL | Ceiling of the substation rooms, 3.0 | Rooms built inside the arch vault | Encloses the switch room and LV room | 16.5.1 |
| GHROOF | Gatehouse flat roof, 2.7 | Single-storey 1962 gatehouse | Encloses GB1 | 16.5.1 |
| road | Viaduct Road under the railway bridge | Viaduct Road passes under the railway; public road | Public road; the van drops the team in the dark under the bridge | 16.6.2 |
| lane | Cable Lane | Cable Lane: 1930s service lane along the viaduct to the exchange gate | Service lane along the viaduct, the only road to the exchange gate | 16.6.2 |
| bay | Printworks loading bay | The printworks loading bay off the lane | Paper reels and print leave by lorry from the dock | 16.6.2 |
| turn | Turning head | A dead-end lane needs a turning head for vans and lorries | Vans and lorries turn at the dead end of the lane | 16.6.2 |
| a17f | In front of bricked arch A17 | Hardstanding in front of the railway-sealed arch A17 | Hardstanding in front of the railway-sealed arch | 16.6.2 |
| subf | Substation forecourt | Substation access hardstanding, fenced as HV equipment must be | Access hardstanding for the electricity board and telco engineers | 16.6.2 |
| swr | Substation switch room | 1961 HV switch room for the exchange supply | High-voltage switchgear for the exchange supply | 16.6.2 |
| lvr | Substation LV room | 415 V distribution board room behind the switch room | 415 V distribution board feeding the exchange cables; the pier door SD to the drum store | 16.6.2 |
| gh | Gatehouse (context, Area 2) | The exchange gatehouse at the vehicle gate (Area 2 context) | The contractor gate man watches the lane for vans | 16.6.2 |
| jc1 | Jointing chamber JC1 | Jointing chamber where tunnel cables split into street ducts | Tunnel cables split into the small street ducts under Viaduct Road | 16.6.2 |
| tun | Cable tunnel (west section) | 1934 cable tunnel under the lane | 1934 route for the exchange cables to the city | 16.6.2 |
| jc2 | Joint bay JC2 | Tunnel cables are jointed to the 1962 duct bank cables where the water main crosses at x 72 | Tunnel cables are jointed to the 1962 duct bank cables | 16.6.2 |
| r1 | Lean-to roofs A2 to A5 | Tenants lean-to roofs | Felt roofs of the tenants fronts | 16.6.2 |
| r2 | Lean-to roofs A7 to A12 | Tenants lean-to roofs | Felt roofs of the tenants fronts | 16.6.2 |
| r3 | Lean-to roofs A14 to A16, corrugated iron | The brewery fronts are roofed in corrugated iron sheet | Roof walk; loud above crouch gear 4 (metal 1.6) | 16.8.3 |
| aroof | A block roof (context, Area 2) | A block roof (Area 2 context) | The exchange roof; Pell sniper post | 16.6.2 |
| VIA-W | Railway viaduct A1 to A16 (arches let as lock-ups, shutters closed) | The railway crosses Kestrel on brick arches (1870s) | North wall of the lane; landmark | 16.4.1 |
| A17 | Arch A17 bricked infill, set 1 m back | Sealed by the railway after a fire; infill built inside the reveal | Recess H11 and vantage V4 | 16.4.1 |
| P18W | Viaduct pier between A17 and A18 | Structure of the viaduct | West wall of the substation | 16.4.1 |
| P18E | Viaduct pier between A18 and A19 (pier door SD cut through it in 1961) | Structure of the viaduct | East wall of the LV room | 16.4.1 |
| VIA-E | Viaduct over the exchange arches A19 onwards (Area 2) | The railway continues east | Context | 16.4.1 |
| XFMR | Transformer room (louvred doors to the forecourt) | 11 kV to 415 V transformer for the exchange, ventilated by louvres | Hum; cover at H12 | 16.4.1 |
| LT2a | Lean-to A2 (tyre shop), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT2b | Lean-to A2 (tyre shop), east of its door | As above | As above | 16.4.1 |
| LT2c | Lean-to A2 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV2 | Lean-to A2 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT3a | Lean-to A3 (scrap dealer), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT3b | Lean-to A3 (scrap dealer), east of its door | As above | As above | 16.4.1 |
| LT3c | Lean-to A3 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV3 | Lean-to A3 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT4a | Lean-to A4 (cabinet maker), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT4b | Lean-to A4 (cabinet maker), east of its door | As above | As above | 16.4.1 |
| LT4c | Lean-to A4 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV4 | Lean-to A4 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT5a | Lean-to A5 (lock-up), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT5b | Lean-to A5 (lock-up), east of its door | As above | As above | 16.4.1 |
| LT5c | Lean-to A5 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV5 | Lean-to A5 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT7a | Lean-to A7 (car repairs workshop), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT7b | Lean-to A7 (car repairs workshop), east of its door | As above | As above | 16.4.1 |
| LT7c | Lean-to A7 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV7 | Lean-to A7 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT8a | Lean-to A8 (van hire), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT8b | Lean-to A8 (van hire), east of its door | As above | As above | 16.4.1 |
| LT8c | Lean-to A8 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV8 | Lean-to A8 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT9a | Lean-to A9 (lock-up), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT9b | Lean-to A9 (lock-up), east of its door | As above | As above | 16.4.1 |
| LT9c | Lean-to A9 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV9 | Lean-to A9 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT10a | Lean-to A10 (printers store), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT10b | Lean-to A10 (printers store), east of its door | As above | As above | 16.4.1 |
| LT10c | Lean-to A10 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV10 | Lean-to A10 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT11a | Lean-to A11 (lock-up), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT11b | Lean-to A11 (lock-up), east of its door | As above | As above | 16.4.1 |
| LT11c | Lean-to A11 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV11 | Lean-to A11 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT12a | Lean-to A12 (lock-up), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT12b | Lean-to A12 (lock-up), east of its door | As above | As above | 16.4.1 |
| LT12c | Lean-to A12 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV12 | Lean-to A12 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT14a | Lean-to A14 (brewery), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT14b | Lean-to A14 (brewery), east of its door | As above | As above | 16.4.1 |
| LT14c | Lean-to A14 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV14 | Lean-to A14 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT15a | Lean-to A15 (brewery), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT15b | Lean-to A15 (brewery), east of its door | As above | As above | 16.4.1 |
| LT15c | Lean-to A15 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV15 | Lean-to A15 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| LT16a | Lean-to A16 (brewery), west of its door | Tenants built single-storey fronts for floor space and a shop door | Body under the roof walk; front wall | 16.4.1 |
| LT16b | Lean-to A16 (brewery), east of its door | As above | As above | 16.4.1 |
| LT16c | Lean-to A16 door, set 1.0 m back | Shop doorway recessed off the lane | Hide spot depth | 16.3.1 |
| EAV16 | Lean-to A16 eaves, 0.6 m overhang at 3.0 | Felt roofs overhang the front wall to throw rain clear | Shelter for GA1 (A2); tested for shading | 16.0 |
| SKIP | Scrap dealer skip on the kerb | Skips stand in the road under a council permit | Cover; body hide for GA1 | 16.4.1 |
| CAR | Contractor saloon parked across the lane mouth (body 1.0 m; the glazed cabin above it is see-through) | Parked across the mouth so no vehicle can turn in from Viaduct Road; the lane is the only road to the gate | GA1 and GA5 post; parked hard against the north kerb, so the only way past on foot is the 3.5 m pavement side | 16.4.1 |
| P1 | Parked car P1 (a Mill Street resident) | Residents park in the lane overnight | Stepping-stone cover | 16.4.1 |
| P2 | Parked car P2 (a Mill Street resident) | As P1 | Stepping-stone cover | 16.4.1 |
| A6CA | Car waiting for repair (A6 forecourt) | The repairer drives cars straight into the arch; a lean-to would block it | Cover; H5 | 16.4.1 |
| A6CB | Car waiting for repair (A6 forecourt) | As A6CA | Cover; H5 | 16.4.1 |
| SB-BK | Sand bay back wall (concrete blocks) | Builders merchant keeps loose sand in open bays, loaded by loader from the lane | Cover | 16.4.1 |
| SB-D1 | Sand bay divider | Separates sand from gravel | Cover; H9 | 16.4.1 |
| SB-D2 | Sand bay divider | Separates gravel from ballast | Cover; H9 | 16.4.1 |
| PAL | Pallet of bricks | Merchant stock waiting for collection | Low cover | 16.4.1 |
| FP1 | Council street-lighting feeder pillar FP1 | Street lighting is fed from a pillar at the back of the footway at the lane end (photocell and fuses) | Switch for circuit CA1 | 16.8.1 |
| PUB-W | The Linesman pub (back) | Pub named for the telephone linesmen; back wall on the lane | South edge | 16.4.1 |
| PUB-E | The Linesman pub (back) | As above | South edge | 16.4.1 |
| PUB-BIN | Back of the pub bin store | Commercial bins kept in a brick enclosure open to the lane for the collection lorry | Hide H1 | 16.4.1 |
| PW1 | Hollowmere printing works (3 storeys, closed at night) | 1920s works; high barred windows on the lane | South edge | 16.4.1 |
| PW2 | Hollowmere printing works (3 storeys, closed at night) | 1920s works; high barred windows on the lane | South edge | 16.4.1 |
| PW3 | Hollowmere printing works (3 storeys, closed at night) | 1920s works; high barred windows on the lane | South edge | 16.4.1 |
| PW4 | Hollowmere printing works (3 storeys, closed at night) | 1920s works; high barred windows on the lane | South edge | 16.4.1 |
| PW5 | Hollowmere printing works (3 storeys, closed at night) | 1920s works; high barred windows on the lane | South edge | 16.4.1 |
| PW6 | Hollowmere printing works (3 storeys, closed at night) | 1920s works; high barred windows on the lane | South edge | 16.4.1 |
| FX1-BK | Printworks fire exit FX1 (door set 1.0 m back) | Exit doors open outward; recessed so they do not swing into the lane | Hide spot FX1 | 16.3.1 |
| FX2-BK | Printworks fire exit FX2 (door set 1.0 m back) | Exit doors open outward; recessed so they do not swing into the lane | Hide spot FX2 | 16.3.1 |
| FX3-BK | Printworks fire exit FX3 (door set 1.0 m back) | Exit doors open outward; recessed so they do not swing into the lane | Hide spot FX3 | 16.3.1 |
| FX4-BK | Printworks fire exit FX4 (door set 1.0 m back) | Exit doors open outward; recessed so they do not swing into the lane | Hide spot FX4 | 16.3.1 |
| PW-BAYBK | Printworks dock door wall | The works loads through a dock door | Back of the bay | 16.4.1 |
| DOCK | Loading dock, 1.1 m | Dock height matches a lorry bed | GA3 rear stop faces it | 16.4.1 |
| VAN | Contractor van, cargo body (cab glazed, not a block) | The only off-street space on the lane; it waits for the midnight relief | GA3 post; hides the lane from the dock | 16.4.1 |
| MS-H | Mill Street houses (backs) | Victorian terrace | South edge | 16.4.1 |
| MS-Y | Mill Street back yards, walls 2.4 m with glass coping | Victorian back yards; glass coping against burglars | Unclimbable south edge | 16.4.1 |
| WH | Wharf Supplies warehouse (blank wall) | The warehouse faces Wharf Street, not the lane | South edge of the turning head | 16.4.1 |
| WH-C | Wharf Supplies warehouse corner | As WH | Corner of the lane and the turning head | 16.4.1 |
| BW1 | Exchange boundary wall | Site boundary; no openings but the gate | East edge | 16.3.5 |
| BW2 | Exchange boundary wall | As BW1 | East edge | 16.3.5 |
| BW3 | Exchange boundary wall | As BW1 | East edge | 16.3.5 |
| ABLK | A block (1934 exchange; context for SN) | The exchange building | Carries the sniper post (Area 2) | 16.4.1 |
| BRG-S | Cable bearers and cables, south wall | Steel bearers carry the cables along the tunnel | Narrows the walkway to 1.8 m | 16.7.1 |
| BRG-N | Cable bearers and cables, north wall | As BRG-S | As BRG-S | 16.7.1 |
| o-road | Lane mouth off Viaduct Road | The lane joins the public road | Lane mouth off Viaduct Road | 16.3.1 |
| o-bay | Loading bay mouth | Lorries back into the bay from the lane | Loading bay mouth | 16.3.1 |
| o-turn | Lane into the turning head | The lane widens at its end | Lane into the turning head | 16.3.1 |
| o-a17l | Lane to the A17 hardstanding | Continuous hardstanding along the arch fronts | Lane to the A17 hardstanding | 16.3.1 |
| o-a17t | Turning head to the A17 hardstanding | As above | Turning head to the A17 hardstanding | 16.3.1 |
| SG | Substation palisade gate SG (padlocked, telco key: hold 3 s) | HV equipment must be fenced; the board and the telco reach it from the lane | Substation palisade gate SG (padlocked, telco key: hold 3 s) | 16.3.5 |
| SRD | Switch room double doors, 1.8 m | Switchgear panels come in through double doors | Switch room door (telco key) | 16.3.1 |
| LVD | Double doors, switch room to LV room, 1.8 m | The LV board came in through the switch room | Door from the switch room to the LV room | 16.3.1 |
| SD | Pier door SD to the telco drum store A19 (telco key both sides) | Cut in 1961 so telco staff reach their substation from the drum store | Pier door SD to the telco drum store A19 (telco key both sides) | 16.3.5 |
| GHW | Gatehouse window onto the turning head | The gate man watches the lane for arriving vans | Gatehouse window onto the turning head | 16.3.1 |
| o-jc1 | Jointing chamber into the tunnel | Same structure, the chamber is the tunnel end | Jointing chamber into the tunnel | 16.7.1 |
| o-jc2 | Tunnel into the joint bay | As above | Tunnel into the joint bay | 16.7.1 |
| M1 | Manhole M1 over JC1 (17.4, 15.4): double cast-iron cover, 10 m lift noise | Telco access to the jointing chamber | Below route entry, 4 m from GA1 at the car | 16.2.1 |
| M2 | Manhole M2 over JC2 (68.5, 17.0): cast-iron cover in the lane at the A6 forecourt, 10 m lift noise | Telco access to the joint bay at the duct bank | Below route exit, 3 m from GA6 at the P2 car and 5 m from GA2 at the forecourt | 16.2.1 |
| DP2 | Cast-iron downpipe at the west end of lean-to A2 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP3 | Cast-iron downpipe at the west end of lean-to A3 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP4 | Cast-iron downpipe at the west end of lean-to A4 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP5 | Cast-iron downpipe at the west end of lean-to A5 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP7 | Cast-iron downpipe at the west end of lean-to A7 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP8 | Cast-iron downpipe at the west end of lean-to A8 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP9 | Cast-iron downpipe at the west end of lean-to A9 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP10 | Cast-iron downpipe at the west end of lean-to A10 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP11 | Cast-iron downpipe at the west end of lean-to A11 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP12 | Cast-iron downpipe at the west end of lean-to A12 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP14 | Cast-iron downpipe at the west end of lean-to A14 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP15 | Cast-iron downpipe at the west end of lean-to A15 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| DP16 | Cast-iron downpipe at the west end of lean-to A16 (climbable, 3.0 m) | Each lean-to gutter falls west to a cast-iron downpipe | Up route access; every one is climbable (16.2.6) | 16.2.6 |
| D-A2W | Drop off A2 west end (3 m) | The roof edge; no stair | Loud way down (roll landing) | 16.2.6 |
| D-A5E | Drop off A5 east end into the A6 forecourt (3 m) | The roof ends where the repairer forecourt starts | Loud way down at the A6 gap | 16.2.6 |
| D-A7W | Drop off A7 west end into the A6 forecourt (3 m) | Roof edge | Loud way down | 16.2.6 |
| D-A12E | Drop off A12 east end into the sand bays (3 m) | The roof ends where the merchant bays start | Loud way down at the A13 gap | 16.2.6 |
| D-A14W | Drop off A14 west end into the sand bays (3 m) | Roof edge | Loud way down | 16.2.6 |
| LA1 | Sodium wall lantern on the pub wall at the lane mouth | The council lights the junction end of the lane; the bracket is on the pub wall | Light pool | 16.8.1 |
| LA2 | Sodium wall lantern on the printworks wall between FX1 and FX2 | The council lights the lane; the works asked for a lantern over its fire exits | Light pool | 16.8.1 |
| LA3 | Lamp column at the Mill Street yards | The yard walls are too low to carry a lantern | Light pool | 16.8.1 |
| LA5 | Lamp column on the north kerb at A16 | Council lanterns alternate sides every 25 to 35 m; the brewery fronts carry no bracket | Light pool | 16.8.1 |
| LA4 | Printworks dock floodlight in a wire vandal cage (photocell) | The works was burgled; dusk-to-dawn security light, supply inside the locked works | Light pool | 16.8.1 |
| LA6 | Bulkhead over the switch room door | Light for engineers at the door; switch inside by the door | Light pool | 16.8.1 |
| LA7 | Exchange gate floodlight on the gate pier | Lights arriving vans; switch in the gatehouse | Light pool | 16.8.1 |
| CA1 | Circuit CA1, council lane lamps | Street lighting on one photocell circuit from the feeder pillar | The switchable lane circuit (rule L3) | 16.8.1 |
| PW | Printworks floodlight circuit | The works own security light | The circuit that cannot be put out (rule L3) | 16.8.1 |
| CA2 | Circuit CA2, substation bulkhead | Telco light for the substation door | Lights SG | 16.8.1 |
| CX | Circuit CX, exchange gate floodlight | Exchange security light at the gate | Lights the turning head | 16.8.1 |
| SW-SUB | Switch for LA6 inside the switch room | Light switch by the door, inside | Exfil only | 16.8.1 |
| SW-GATE | Switch for LA7 in the gatehouse | Gate man controls the gate light | Area 2 | 16.8.1 |
| H1 | Pub bin store, among the bins | Commercial bins collected from the lane | Hide spot | 16.0 |
| H2 | Printworks fire exit recess FX1 | Recessed fire exit door | Hide spot | 16.0 |
| H3 | Lean-to A3 door recess | Recessed shop doorway | Hide spot | 16.0 |
| H4 | Printworks fire exit recess FX2 | Recessed fire exit door | Hide spot | 16.0 |
| H6 | Printworks fire exit recess FX3 | Recessed fire exit door | Hide spot | 16.0 |
| H7 | Lean-to A9 door recess | Recessed shop doorway | Hide spot | 16.0 |
| H8 | Lean-to A11 door recess | Recessed shop doorway | Hide spot | 16.0 |
| H9 | Sand bay between the dividers | Merchant sand bays | Hide spot | 16.0 |
| H10 | Lean-to A15 door recess | Recessed shop doorway | Hide spot | 16.0 |
| H11 | A17 bricked arch reveal | Infill set back in the arch reveal | Hide spot | 16.0 |
| V0 | Vantage V0 | A dark place a person would wait (see its space) | Under the bridge at the lane mouth: GA1 both stops, LA1, the car shadow, FP1, M1 | 3.1 |
| V1 | Vantage V1 | A dark place a person would wait (see its space) | FX1 recess: GA2 both stops | 3.1 |
| V2 | Vantage V2 | A dark place a person would wait (see its space) | A8 roof: GA3 cab and rear stop | 3.1 |
| V3 | Vantage V3 | A dark place a person would wait (see its space) | Sand bay H9: the east lane and GA4 at P2 | 3.1 |
| V4 | Vantage V4 | A dark place a person would wait (see its space) | A17 reveal: GA4 both stops, the gatehouse window, SG | 3.1 |
| S1 | Spawn S1 | The van cannot stop in sight of the lane mouth, so it drops the team on the far side of the railway bridge | Start | 16.0 |
| S2 | Spawn S2 | The van cannot stop in sight of the lane mouth, so it drops the team on the far side of the railway bridge | Start | 16.0 |
| S3 | Spawn S3 | The van cannot stop in sight of the lane mouth, so it drops the team on the far side of the railway bridge | Start | 16.0 |
| S4 | Spawn S4 | The van cannot stop in sight of the lane mouth, so it drops the team on the far side of the railway bridge | Start | 16.0 |
| GA1 | GA1: Lane mouth sentry with the car | Holds the only road to the gate with the car; radio check with GA2 every cycle. | The car at the lane mouth and the A2 eaves | 16.8.2 |
| GA2 | GA2: Lock-up row walker | A5 was broken into last month: he tries the padlocks along the row and answers GA1. | A5 door (on VG) and the A6 forecourt mouth (over M2) | 16.8.2 |
| GA3 | GA3: Contractor van driver | Waits in the dry for the midnight relief. | Printworks bay, cab and rear doors | 16.8.2 |
| GA4 | GA4: Outer man at the turning head | Meets vans at the turning head and talks to GA7 and the gate man. | Turning head to the lane end | 16.8.2 |
| GB1 | GB1: Gate man (Area 2 guard; his window looks into Area 1) | Logs vans at the gate. | Gatehouse window | 16.8.2 |
| SN | SN: Sniper on A block roof (Area 2; context to measure his reach) | Overwatch of the yard (Area 2). | A block north parapet (brief: about 212, -20) | 16.8.2 |
| route-M | Ground route (shadow, timing) | A way along the lane | Timed route | 3.2 |
| route-UP | Up route (downpipes and lean-to roofs; drops at the gaps) | A way along the lane | Timed route | 3.2 |
| route-UPQ | Up route, climbing down the downpipes (quiet) | A way along the lane | Timed route | 3.2 |
| route-BELOW | Below route (cable tunnel M1 to M2) | A way along the lane | Timed route | 3.2 |
| route-FP1 | Lane mouth with the lamps out (FP1 detour) | A way along the lane | Timed route | 3.2 |
| VG | Cable tunnel ventilation grating VG in the north kerb at (57, 19.75) | A 120 m cable tunnel needs natural ventilation: a vent shaft to a kerb grating (kerb, not carriageway, so vans do not load it) | Noise under it reaches the lane unmuffled; GA2 stands on it at his west stop (E1.4 cost) | 16.3.4 |
| X1 | Area 1 exit through the pier door SD | The telco route into its own drum store | Ends Area 1 | 16.3.5 |
| K0 | Checkpoint K0 | Before each encounter space (standard 3.9) | start | 3.9 |
| K1 | Checkpoint K1 | Before each encounter space (standard 3.9) | FX1 after the lane mouth | 3.9 |
| K2 | Checkpoint K2 | Before each encounter space (standard 3.9) | A9 recess after the bay | 3.9 |
| K3 | Checkpoint K3 | Before each encounter space (standard 3.9) | A13 sand bays | 3.9 |
| K4 | Checkpoint K4 | Before each encounter space (standard 3.9) | substation switch room | 3.9 |
| RG1 | Regroup point RG1 | All routes rejoin at the substation | Co-op regroup | 11 |
| E1.1 | Start vantage V0: watch GA1 for one cycle | Encounter (see the area doc) | Encounter | 3 |
| E1.2 | Lane mouth: GA1 and the car | Encounter (see the area doc) | Encounter | 3 |
| E1.3 | Feeder pillar FP1: lane lamps off (GA2 resets it) | Encounter (see the area doc) | Encounter | 3 |
| E1.4 | Lock-up row: GA2; vent grating VG over the tunnel | Encounter (see the area doc) | Encounter | 3 |
| E1.5 | Printworks bay: GA3, the van and the caged floodlight | Encounter (see the area doc) | Encounter | 3 |
| E1.6 | A13 sand bays: the layers meet, M2, the choice for the east lane | Encounter (see the area doc) | Encounter | 3 |
| E1.7 | East lane under GA4 at P2 (looking down the lane) and LA5 | Encounter (see the area doc) | Encounter | 3 |
| E1.8 | Turning head: GA4, the gatehouse window, LA6 and LA7, gate SG | Encounter (see the area doc) | Encounter | 3 |
| T1 | Lean-to roof walk (downpipes up, drop or downpipe down) | Toy (see the area doc) | passes over E1.2, E1.5 | 7 |
| T2 | Cable tunnel M1 to M2 | Toy (see the area doc) | passes E1.2 to E1.5 unseen | 7 |
| T3 | Feeder pillar FP1 (lane lamps CA1) | Toy (see the area doc) | dark lane for the measured window | 7 |
| T4 | Lamps to shoot (LA1, LA2, LA3, LA5, LA6, LA7) | Toy (see the area doc) | a dark pool | 7 |
| T5 | Hide spots and body hides (skip, van, cars, recesses) | Toy (see the area doc) | safety | 7 |
| T6 | Van cab rota card (Area 2 intel) | Toy (see the area doc) | the gate man break time and the card box location | 7 |
| lock-SG | Lock SG | hold 4 s, telco key (padlock and chain) | out of Area 1 | 16.3.5 |
| lock-M1 | Lock M1 | hold 4 s, telco key, either side | below route | 16.3.5 |
| lock-M2 | Lock M2 | hold 3 s, either side | below route | 16.3.5 |
| lock-SD | Lock SD | telco key | into Area 2 | 16.3.5 |
| LA8 | Lamp column on the north kerb at A8 | Council lanterns alternate sides every 25 to 35 m; a lean-to front is too low for a bracket, so a column | Light pool | 16.8.1 |
| RL8 | Lean-to A8 roof lights | The van hire workshop is lit by daylight through translucent roof sheets; they will not bear a person | Only the 1.2 m gutter strip is walkable: the roof walk passes in LA8 light and GA3 cab view (item 6 exposure) | 16.5.1 |
| RL9 | Lean-to A9 roof lights | The lock-up workshop is lit the same way | Only the 1.2 m gutter strip is walkable: the roof walk passes in LA8 light and GA3 cab view (item 6 exposure) | 16.5.1 |
| GA5 | GA5: contractor driver in the car | Two men hold the car: one outside on foot, one in the dry ready to move it for the relief van. | Driver seat of the car at the lane mouth | 16.8.2 |
| SPK16 | Anti-climb spikes on the east 5.5 m of the A16 roof and gutter | The brewery fitted spikes where its roof meets the open turning head after a break-in | No drop at the end of the roof walk: the way down is the A16 downpipe under LA5 in GA4's view | 16.4.1 |
| lock-SRD | Lock SRD | telco key, hold 3 s | into the substation | 16.3.5 |
| GA6 | GA6: van crew second man on the printworks wall | The printworks lets the contractor park its van in the bay; in return the van crew's second man tries the works' fire exits. | Printworks fire exits FX2 to the P2 car | 16.8.2 |
| RLY | Railway lineside compound in front of bricked arch A1 (2.4 m palisade, locked) | The railway keeps its signal relay cabinets in a fenced compound at the foot of its own arch | Closes the A1 frontage: with the car against the north kerb the only way past on foot is the pavement gap | 16.4.1 |
| LA9 | Lamp column on the north kerb at A4 | Council lanterns alternate sides along the lane; the lean-to fronts are too low for a bracket, so a column | Lights the north strip and the A4 and A5 gutters in GA2's view | 16.8.1 |
| RL4 | Lean-to A4 roof lights | The cabinet maker workshop is lit by daylight through translucent roof sheets; they will not bear a person | Only the 1.2 m gutter strip is walkable, in LA9 light and GA2's view | 16.5.1 |
| RL5 | Lean-to A5 roof lights | The lock-up workshop is lit by daylight through translucent roof sheets; they will not bear a person | Only the 1.2 m gutter strip is walkable, in LA9 light and GA2's view | 16.5.1 |
| GA7 | GA7: gate crew second man by the transformer louvres | Two men meet the relief van at the turning head; on a cold wet night one stands in the warm air from the transformer louvres. | Substation palisade by the louvres | 16.8.2 |
| LA10 | Car repairer security floodlight over the A6 forecourt (caged, photocell) | Customers' cars stand on the open forecourt overnight; the repairer lights it dusk to dawn | The A6 gap (where roof walkers must come down) is lit and GA2 checks it from his east stop | 16.8.1 |
| A6 | Car repairer floodlight circuit | The repairer's own security light | Cannot be put out | 16.8.1 |
<!-- register:end -->

## 4. Guards

Seven Area 1 guards, all Pell's contractor (grunts, walk 0.9 m/s). GA1 and GA2 radio each other (GA2 is at his west stop as GA1 reaches B). GA4 and GA7 talk while GA4 is at P1 and GA7 faces him. GB1 and SN (Area 2) are in the file only to measure that they see nothing of Area 1.

| Id | Job tonight | Stops (x, z), dwell, facing | Phase | Isolation moment | Lures | Body hide |
| --- | --- | --- | --- | --- | --- | --- |
| GA1 | Holds the lane mouth with the car; radio check with GA2 | A (21.2, 16.25) 17 s at the car, facing south-west over the foot gap and the junction. B (27, 20.25) 6.2 s under A2's eaves, facing down the lane (radio, cigarette) | 27 | Walking to B, his back to the gap | CA1 off; LA1 shot | The skip; a missed radio check sends GA2 to the car |
| GA5 | Driver sitting in the car, heater on, windows up (hears at 0.45), ready to move it for the relief van | Seated (19.9, 19.0), facing north through the windscreen | 0 | Always (he does not leave the car) | - | - |
| GA2 | Walks the lock-up row trying padlocks; answers GA1 | W (57, 19.75) 6.5 s on the vent grating VG, facing west. E (68, 20.75) 6.8 s at the kerb by the A6 forecourt over M2, facing north into the lit forecourt | 1 | At E, facing the forecourt | CA1 off sends him to reset FP1 | FX3 recess |
| GA6 | Van crew's second man: tries the printworks fire exits (the works lets the contractor use its bay) | FX2 (60.25, 13.75) 15 s, facing west along the works wall under LA2. Q (67, 14.25) 9 s by the P2 car, facing east to the van | 35.5 | At Q, facing east | Noise at FX1 | FX1 recess |
| GA3 | Van driver waiting for the relief | Cab (89.1, 12.25) 17 s, seated high (eye 2.0 m), facing north across the lane. Rear (89.1, 7.1) 4.7 s facing the dock | 30 | Stepping out down the van's side | Noise at the bay mouth | Inside the van |
| GA4 | Outer man at the turning head | P1 (184, 16.5) 4 s talking to GA7. P2 (175, 16.5) 13.4 s at the lane end, facing west down the lane for the relief van | 11.5 | Walking back to P1 | LA5 shot | A17 reveal |
| GA7 | Gate crew's second man, standing in the warm air from the transformer louvres | (189.5, 18.75): 18 s facing the substation gate and the A17 frontage, 21 s facing the lane end (talking to GA4) | 38.5 | Facing the lane end | LA6 or LA7 shot | A17 reveal |

## 5. Lights

| Id | Fitting | Position, height, range | Circuit | Switch | Shoot | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| LA1 | Sodium wall lantern on the pub wall | (20, 12.3), 5 m, r 12 | CA1 | FP1 | Yes | Lights the junction end of the lane and the foot gap |
| LA2 | Sodium wall lantern on the printworks wall | (52, 12.3), 5 m, r 12 | CA1 | FP1 | Yes | Over the works' fire exits |
| LA9 | Lamp column, north kerb at A4 | (48, 19.6), 6 m, r 12 | CA1 | FP1 | Yes | Lanterns alternate sides; lights the A4 and A5 gutters |
| LA10 | Car repairer's security floodlight, caged | (67, 25.6), 4 m, r 10 | A6 (own photocell) | none outside | No | Customers' cars stand on the forecourt overnight |
| LA8 | Lamp column, north kerb at A8 | (88, 19.6), 6 m, r 12 | CA1 | FP1 | Yes | In front of the van cab |
| LA3 | Lamp column at the Mill Street yards | (112.5, 12.8), 6 m, r 12 | CA1 | FP1 | Yes | The yard walls are too low for a lantern |
| LA4 | Printworks dock floodlight, caged | (90, 4.3), 4.5 m, r 10 | PW (photocell) | none outside | No | Security light |
| LA5 | Lamp column, north kerb at A16 | (164.5, 19.6), 6 m, r 12 | CA1 | FP1 | Yes | Over A16's downpipe and the east lane |
| LA6 | Bulkhead over the switch room doors | (185.5, 25.7), 2.6 m, r 5 | CA2 | in the switch room | Yes | Light for engineers |
| LA7 | Gate floodlight | (190.8, 18), 5 m, r 12 | CX | gatehouse | Yes | Lights arriving vans |

FP1 (hold 3 s) puts out CA1; GA1 radios it, GA2 walks to FP1 at the investigate pace and resets it: dark window 22.6 to 32.7 s, median 27.5 s.

## 6. The underground route

| Item | Detail |
| --- | --- |
| Section | 1934 concrete box 2.4 x 2.6; cable bearers leave a 1.8 m walkway; floor -4.4 |
| Length | M1 (17.4, 15.4) at the lane mouth to M2 (68.5, 17.0) at the A6 forecourt: about 55 m. The 1962 water main crosses at x 72; the tunnel was filled there and the cables re-run in a duct bank, so the west section ends in joint bay JC2 |
| Manholes | Cast-iron covers, 10 m of noise while lifting (`MANHOLE_LIFT_NOISE_RADIUS`). M1 is a double cover: 6 s with the keys, 4 m from GA1 at the car. M2: 3 s, lifted from below with the head at street level, 3 m from GA6 at Q and 3.8 m from GA2 at E |
| Vent grating VG | (57, 19.75) in the kerb under GA2's west stop: noise made below it comes out unmuffled. Silent at crouched gear 4; standing gear 3 heard on 35% of passes, a sprint on most |
| Timed exposures | The M1 lift (GA1), the M2 lift (GA6, GA2), the grating at faster gears |
| Why nobody guards it | Telco property; no keys; Pell does not know it |

## 7. Encounters, ways past and windows

Windows: crossing each encounter at the silent crouched gear 4 from every 0.5 s of the 40 s cycle with the engine perception (sight and hearing); safe = no meter reaches 0.3. Start times are master-clock seconds.

| Encounter | Ground M | Up UP / UPQ | Below | Lamps out FP1 | Closed by |
| --- | --- | --- | --- | --- | --- |
| E1.2 Lane mouth | 28%, 20.6 s, starts 26 to 37 | 30%, 29.2 s | 29%, 31.4 s | 28%, 23.6 s | GA1 |
| E1.4 Lock-up row | 33%, 21.3 s, starts 18 to 31 | 34% / 31%, 27.8 / 33.0 s | 36%, 28.8 s | 33% | GA6, GA2 |
| E1.5 Printworks bay | 38%, 10.4 s, starts 24.5 to 39.5 | 43%, 10.2 s | 38% (ground) | 38% | GA3 |
| E1.7 East lane | 40%, 16.6 s, starts 5 to 21 | 35%, 25.7 s | 40% (ground) | 40% | GA4 |
| E1.8 Turning head | 30%, 31.3 s, starts 8.5 to 20.5 | 30% | 30% | 30% | GA7 |

**E1.1 Start.** V0 under the bridge: GA1's two stops, the car, LA1's pool, M1, FP1.

**E1.2 Lane mouth.** The car is parked across the lane hard against the north kerb, and the railway's palisade compound closes A1's frontage, so the only way past on foot is the 3.5 m pavement side under LA1, which GA1 watches from A (17 s of 40). Ground: go while he walks to B or stands there. Roofs: the same gap, then A2's downpipe beside his rain shelter. Tunnel: M1's 6 s double cover beside the car, within his earshot at A. Loud: take him at B; the next radio check fails.

**E1.3 FP1.** Optional. The lamps go out for 23 to 33 s; GA2 comes up the lane to reset them, toward the player.

**E1.4 Lock-up row.** GA6 looks west along the works wall through LA2's pool for 15 s; GA2 on the grating looks up the north strip and the A4 and A5 gutters (roof lights keep roof walkers on the gutter, in LA9's light) and then watches the lit forecourt where the roofs end. Tunnel users come up at M2 within earshot of GA6 and GA2.

**E1.5 Printworks bay.** GA3 sits high in the van cab looking across at the north strip and the A8 and A9 gutter strips under LA8; go while he is out at the back of the van. LA4 cannot be put out.

**E1.6 A13.** No guard. The roofs end; the east lane is in view.

**E1.7 East lane.** GA4 stands at the lane end looking west through LA5's pool for 13 s and walks west the same way; roof walkers must come down A16's downpipe under LA5 (the spikes stop a drop by the turning head).

**E1.8 Turning head.** GA7 faces the substation gate for 18 s of 40; SG needs 4 s (padlock and chain) under LA6. Then the switch room doors (3 s) and the pier door SD (3 s), telco keys.

## 8. What changed in this revision, and why

| Change | Why |
| --- | --- |
| Drop-off north of the railway bridge | The van cannot stop in sight of the lane mouth (it also gives the route its real length) |
| Car moved to the junction, hard against the north kerb; railway compound palisade at A1 | Every route passes the lit foot gap that GA1 watches; the roofs and the tunnel no longer skip E1.2 |
| GA5 in the car (new) | Two men hold the car; he hears less inside it |
| GA1 faces the foot gap at A | His job is to stop anyone passing |
| Duct bank moved to x 72; M1 beside the car (6 s double cover); M2 at the A6 forecourt | Michael's item 4: the tunnel has timed exposures at both manholes |
| GA6 (new) walks the works wall; GA2 back to two stops | Item 6: a pair covering each other on the row |
| LA9 north column; roof lights on A4 and A5; LA10 forecourt floodlight; H5 removed (now lit) | Item 5: roof walks on lit gutters in a guard's view; the A6 gap lit and watched |
| GA3 eye 2.0 m (van cab), cab 17 s; LA8 to x 88 | E1.5 roof exposure and window |
| GA4 to the lane end; GA7 (new) at the transformer louvres | One guard could not cover E1.7 and E1.8 |
| A16 spikes; brewery roofs corrugated iron | Item 5: no drop by the turning head; loud above crouch gear 4 |
| SG 4 s, switch room doors 3 s, SD 3 s | Padlock and chain, double doors and the pier door all need the telco keys |
| Phases set by search (coordinate search on the bot's time and waiting) | Item 2 pacing |

## 9. The 14-question checklist (`docs/level-design.md` 16.10)

| # | Question | Area 1 |
| --- | --- | --- |
| 1 | Room shapes that force a path | None |
| 2 | Spaces with no purpose, or too easy to reach | None; the substation is padlocked and watched |
| 3 | Ladders beside stairs, or outside a plant space or shaft | Only the manhole shafts |
| 4 | Stairs without handrails or with gaps | No stairs |
| 5 | Roof reached other than by a covered stair or fire stair | No secure building's roof; lean-to roofs by their downpipes |
| 6 | Roof objects that are not roof equipment | Roof lights and the brewery's security spikes only |
| 7 | Floors or roofs not fully covered, holes without a reason | None |
| 8 | Blocks without a named object, objects blocking a door or window | None: the car stands in the road, the compound gate faces Viaduct Road |
| 9 | Barrier in front of a room for no reason | The railway compound palisade fronts the railway's own arch |
| 10 | Ladder in a floor hole | None |
| 11 | Vent not the end of a duct system | VG is the tunnel's ventilation shaft |
| 12 | Dead end needing an invented side entrance | None |
| 13 | Every element has a register row | Yes (checked) |
| 14 | Would an architect recognise it | Yes |

## 10. Areas 2 to 4 (outline only, unchanged)

**Area 2 - Perimeter (about 5 min).** The service yard between A block and the viaduct, entered from the substation through the drum store A19 or through the gate Gv: the gatehouse with the contractor's key safe (the objective), the boiler house, the generator house, the telco garages, the sniper SN on A block's roof (measured: he cannot see into Area 1). Ways to the building: the goods-in staff door, the heating subway (crouch, 1.5 m), the boiler house roof.

**Area 3 - Building (about 8 min).** A block and B block as in the brief; P1 test room, P2 control room panel, P3 Pell's cage; the cores, the basement plant, the crouch ducts and trenches, the tunnel's east section as a gated alternative entry.

**Area 4 - Exfil at the rear (about 2 min).** B1's exit, the foot of the viaduct, the drum store A19 and its north doors to Wharf Street; on an alarm, back through the substation and the lane.
