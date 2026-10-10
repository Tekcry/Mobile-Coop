# Dead Line v2 - Area 1: the Approach (Cable Lane)

Stage D0 (approved 2026-10-10), docs only. Plan and long section: `dead-line-v2-area1.svg` (1 m = 10 px, grid 6 m, north up). Site and buildings: `dead-line-v2-brief.md`. Rules: `docs/level-design.md` Section 16.

Positions are (x, z) in metres from the lane mouth; heights are y. Detection numbers (sight fill, cone checks, lit share) are not computed here; D1 runs the existing checker against these positions and adjusts.

## 1. The place

Cable Lane is a 1930s service lane that runs 180 m east from Viaduct Road to the exchange's vehicle gate. It is named for the telco's 1934 cable tunnel that runs under it. Its north side is the railway viaduct, whose arches are let as lock-up workshops with single-storey lean-to fronts. Its south side is the backs of a pub, a printing works and the Mill Street terrace yards. It ends in a turning head at the exchange gate, beside the telco's substation in arch A18.

At night every business is shut. Pell's contractor holds the lane because it is the only road to the exchange's vehicle gate: they want to see anyone coming long before the gate. Rain all night.

## 2. The linear path

One direction of travel: west to east. Three layers run side by side and rejoin at real pinch points.

| Layer | What it is | Where it runs |
| --- | --- | --- |
| Ground (shadow) | The lane itself: pavements, door recesses, parked cars, a skip | Start to the substation |
| Up | The lean-to roofs on the arch fronts at +3.0 to +3.6, reached by the lean-tos' own cast-iron downpipes | A2 to A5, A7 to A12, A14 to A16 (gaps at A6 and A13 force a descent) |
| Below | The 1934 cable tunnel, entered by telco manhole M1 at the lane mouth, left by M2 at the joint bay by A13 | x 12 to 137 (the 1962 duct bank closes it beyond) |

| Segment | x | Space | Encounter | Ends at (pinch / checkpoint) |
| --- | --- | --- | --- | --- |
| Drop-off | 0 to 12 | Under the railway bridge over Viaduct Road (dark) | E1.1 | V0 |
| Lane mouth | 12 to 46 | Contractor's car across the lane, lantern LA1, feeder pillar FP1, manhole M1 | E1.2, E1.3 | K1 at fire exit recess FX1 |
| Lock-up row | 46 to 82 | Printworks back wall (south), lean-tos A4, A5, A7 and the open A6 forecourt (north) | E1.4 | FX3 |
| Printworks bay | 82 to 100 | The loading bay with the contractor's van under the caged floodlight LA4 | E1.5 | K2 at A9's door recess |
| Connector | 100 to 132 | Quiet stretch past A10 to A12; lantern LA3 | none (breathe; the sniper's laser is visible ahead) | A13 |
| A13 sand bays | 132 to 142 | Builders' merchant's open bays; M2; all three layers meet | E1.6 | K3 |
| East lane | 142 to 172 | Brewery lean-tos A14 to A16; lantern LA5; the sniper's sweep | E1.7 | A17 recess (V4) |
| Turning head | 172 to 192 | GA4's beat, the gatehouse window, the gate floodlight, the substation forecourt | E1.8 | K4 in the substation switch room |

Area 1 ends in the substation switch room (K4). Area 2 starts through the pier door SD into the telco drum store A19, or through the vehicle gate Gv.

**Time.** Ground route from the van to K4 is about 205 m: about 105 s at gear 3 standing with the one 3 s hold (ideal walk). First run: 8 encounters at about 35 s plus about 1 min of transit, about 5.5 to 6.5 min (target 5 to 10). D1 measures both with the bots.

## 3. Element register (every element and its real reason)

| Id | Element | Real-world reason | Gameplay use |
| --- | --- | --- | --- |
| VIA | Railway viaduct, brick, deck +7.0 | The railway crosses Kestrel on arches (1870s) | North wall of the whole area; landmark; train noise above |
| BR | Railway bridge over Viaduct Road | Where the railway crosses the road | Dark drop-off for the van; start vantage |
| A1 | Arch A1, bricked | The railway's own store, sealed | Dark wall beside the start |
| LT | Lean-tos A2-A5, A7-A12, A14-A16: felt roofs +3.0 front to +3.6 at the arch | Tenants built single-storey fronts for floor space and a shop door | Up route |
| UP | 0.3 m upstands between lean-tos | Fire separation between tenants | Step-overs on the roof walk |
| DP | Cast-iron downpipes, one at the west end of every lean-to (13) | Each gutter falls west to a downpipe | Climb points. Every one is climbable (rule 16.2.6) |
| DR | Lean-to doors recessed 1.2 x 1.0 | Shop doorways set back off the lane | Hide spots H3, H7, H8, H10 |
| A6 | Open forecourt at A6, two cars, engine hoist | The car repairer drives cars straight into the arch; a lean-to would block it | Forced descent from the roofs; cover; H5 |
| A13 | Open sand bays at A13, 1.5 m block walls, pallets of bricks | The builders' merchant loads loose sand by loader from the lane; no roof | Forced descent; cover; H9; the three layers meet |
| A17 | Arch A17 bricked, infill set 1 m back | Sealed by the railway after a fire; infill built inside the reveal | Hide H11, vantage V4 |
| SKIP | Scrap dealer's skip on the kerb at A3 | Skips stand in the road under a council permit | Cover; body hide for GA1 |
| CAR | Contractor's saloon across the lane mouth | Blocks any vehicle: the lane is the only road to the gate | GA1's post; casts LA1's shadow westward |
| P1, P2 | Parked cars on the south kerb | Mill Street residents park in the lane overnight | Stepping-stone cover |
| PUB | The Linesman pub, back wall and yard wall 2.4 m with glass coping | Pub named for the telephone linesmen; glass coping against burglars | South edge; no climb |
| BIN | Pub bin store, brick, open to the lane | Commercial bins collected from the lane | Hide H1 |
| PW | Printing works back wall, high barred windows | 1920s works; windows high for daylight and security | South edge |
| FX1-FX4 | Fire exit doors in 1.4 x 1.0 recesses | Exit doors open outward; recessed so they do not swing into the lane | Hide spots H2, H4, H6; vantage V1 |
| BAY | Loading bay 12 x 8 with a 1.1 m dock | Paper reels arrive by lorry; dock height matches a lorry bed | GA3's space |
| VAN | Contractor's van reversed into the bay | The only off-street space on the lane; it waits for the midnight relief | GA3's post; the van body hides the lane from the dock; the rota card in the cab |
| MS | Mill Street yard walls 2.4 m, glass coping, locked timber doors | Victorian back yards | South edge, no way through (no detours to dead ends) |
| WH | Warehouse blank wall | The warehouse faces Wharf Street, not the lane | South edge of the turning head |
| TH | Turning head 20 x 15 | A dead-end lane needs one for lorries and vans | Open ground before the gate |
| FP1 | Council feeder pillar (photocell and fuses for the lane lamps) | Street lighting is fed from a pillar at the lane end | Switch for circuit CA1 |
| M1 | Telco manhole over jointing chamber JC1 | Cables turn from the tunnel into the Viaduct Road ducts here | Below route entry |
| M2 | Telco manhole over joint bay JC2 | Cables are jointed to the 1962 duct bank here | Below route exit |
| TUN | Cable tunnel, 2.4 x 2.6, bearers both walls | 1934 route for the exchange's cables to the city | Below route |
| DB | Duct bank, 1.5 m of solid concrete | 1962 water main crossing: the tunnel was filled and the cables re-run in cast-in ducts | Ends the below route at A13 |
| SUB | Substation in A18: forecourt, palisade 2.4 m, gate SG, switch room, transformer | The exchange's own 11 kV supply (1961) | Pinch point and checkpoint K4 |
| SD | Pier door between A18 and A19 | Telco staff reach the substation from the drum store | Way into Area 2 |
| BW | Exchange boundary wall 2.7 m | Site boundary, no openings but the gate | East edge; no climb |
| GV | Vehicle gate, steel palisade | Vans in and out | The guarded way into Area 2 |
| GH | Gatehouse window to the lane | The gate man watches for arriving vans | GB1's view into the turning head |

No other blocks, openings or level changes exist in Area 1.

## 4. Guards

All four are Pell's contractor. Loops are on the 40 s master clock (D1 fits waypoints and dwell to exactly 40.0 s). Guard speed 0.9 m/s.

| Id | Job tonight | Route and stops | Tells | Isolation moment | Covers / covered by | Lures | Body hide |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GA1 | Holds the lane mouth with the car; radio check with GA2 every cycle | A (30.0, 19.3) at the car's north end, facing W to Viaduct Road, 18 s. B (27.0, 20.6) under A2's eaves out of the rain, facing E down the lane, 13 s (radio call and a cigarette). Walks 3.7 m each way | Lighter flare and the radio call at B; the car door creak as he leans on it at A | At A while GA2 is walking or at his east stop: dark (LA1 is 9 m away), nobody watching | Covered by GA2 during GA2's west stop (8 s) | CA1 off; LA1 shot; noise at the skip | The skip (6 m). If GA1 misses a radio check, GA2 walks to the car |
| GA2 | Walks the lock-up row trying padlocks (A5 was broken into last month); answers GA1 | W (57.0, 19.8) at A5's door, facing W up the lane to GA1, 8 s (radio reply). E (67.0, 22.0) in the A6 forecourt, facing N at the repairer's cars and shutter, 8 s. Walks 10.2 m each way | Padlock rattle at A5; his radio reply | At E, between the cars, facing the arch, outside LA2's pool, nobody watching | Covers the lane mouth and FP1 at W | CA1 off (sends him to FP1); noise in the A6 forecourt | Between the A6 cars (H5). If GA2 misses a radio check, GA1 calls it in and walks east |
| GA3 | Contractor's van driver waiting for the midnight relief | Cab (89.6, 12.2), seated, facing N across the lane through the windscreen, 16 s. Out of the driver door, down the van's east side, rear (89.6, 7.0) facing S at the dock (flask, checks the load), 11 s. Walks 5.5 m each way | Cab light and door slam each way; phone glow in the cab | Stepping out at (90.8, 11.5) on the van's east side: outside LA4's 7 m pool, the van hides him from the lane | Covers the lean-to fronts A8 and A9 from the cab | Noise at the bay mouth; nothing changes LA4 | Inside the van's rear doors |
| GA4 | The contractor's outer man: meets vans at the turning head, talks to the gate man | P1 (189.0, 14.0) by the gate, facing W, 7 s. P2 (178.0, 16.0) at the lane end, facing W down the lane, 7 s. Walks 11.2 m each way | Radio chatter with GB1 at P1; boots on the wet setts | At P2 when SN's laser is elsewhere: dark (LA5 26 m, LA7 15 m away), out of GB1's window view | Covered by GB1 (window) and SN (sweep); covers SG and the A17 recess | LA6 or LA7 shot; noise at A17 | A17 reveal (H11). If GA4 misses his chat at P1, GB1 radios and Area 2 goes to suspicious |
| GB1 | (Area 2) Gate man in the gatehouse | Static at the window (194.0, 6.2) facing W | | | Covers the south half of the turning head | | |
| SN | (Area 2) Sniper on A block's roof, about (212, -20), +14 m | 30 s sweep over the yard; the laser crosses the turning head and the lane east of x 150 | Visible laser | | Covers the turning head and the A14 to A16 roofs | | |

Area 1's own guards: 4. With GB1 and SN, 6 can see Area 1 at its east end (cap 9 / `MAX_ALIVE` 12).

## 5. Lights

| Id | Fitting | Position, height, pool | Owner and circuit | Switch | Shoot | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| LA1 | Sodium wall lantern | (36, 12) on the pub wall, 5 m, r 8 | Council, CA1 | FP1 | Yes | The council lights the lane for the tenants |
| LA2 | Sodium wall lantern | (66, 12) on the printworks wall, 5 m, r 8 | Council, CA1 | FP1 | Yes | As LA1 |
| LA3 | Lamp column | (112.5, 12.8), 6 m, r 9 | Council, CA1 | FP1 | Yes | The yard walls are too low to carry a lantern |
| LA5 | Lamp column | (152, 12.8), 6 m, r 9 | Council, CA1 | FP1 | Yes | As LA3 |
| LA4 | Dock floodlight in a wire vandal cage | (90, 4.3) over the dock door, 4.5 m, r 7 | Printworks, own photocell | None outside (the supply is inside the locked works) | No (caged) | The works was burgled; dusk-to-dawn security light |
| LA6 | Bulkhead | (185.5, 26.2) over the switch room door, 2.6 m, r 5 | Telco, CA2 | Inside the switch room by the door | Yes | Light for engineers at the door |
| LA7 | Gate floodlight | (192.6, 18) on the gate pier, 5 m, r 10 | Exchange, gatehouse switch (Area 2) | In the gatehouse | Yes (GB1 hears it) | Lights arriving vans |
| LT | Tunnel bulkheads every 12 m | Tunnel | Telco | At the foot of M1 and M2 | Yes | Off tonight; engineers switch them on when working |

Rules: L3 is met by CA1 (switchable at FP1) and LA4 (cannot be switched or shot, timing only). L4: CA1 off sends GA2 to FP1 (about 12 s), he finds the pillar door open, shuts it and radios "brownout"; the lamps stay off and the lane guards are heightened for 60 s. A shot lamp sends the nearest guard to it for 8 s. L5: four circuits touch Area 1 (CA1, LA4's photocell, CA2, the gate circuit). Target lit share about 60% (mission chapter 1); D1 measures it.

## 6. The underground route

| Item | Detail |
| --- | --- |
| What it is | The exchange's 1934 cable tunnel under Cable Lane: subscriber and junction cables from the exchange to the city ducts under Viaduct Road |
| Section | Reinforced concrete box, 2.4 m high x 2.6 m wide; steel cable bearers on both walls leave a 1.8 m walkway; floor at -4.4, soffit at -2.0 |
| Usable length | M1 (14.5, 16.2) to M2 (134, 16.4): 120 m, straight, under the lane centreline |
| Access | M1 over jointing chamber JC1 (5 x 4.4 at the lane mouth, where the cables split into small street ducts); M2 over joint bay JC2 (6 x 3.9 by A13). Shafts 1.2 x 1.2 with fixed steel ladders, 4.4 m. Double telco covers: lifting is a hold (M1 4 s, M2 3 s), noise 4 m (`HOLD_NOISE_RADIUS`) |
| Ends | West: JC1's wall with the small duct mouths. East: the 1962 duct bank (solid, cables vanish into 100 mm ducts). East of the duct bank the tunnel continues to the exchange but has no access from Area 1 |
| Light and sound | Unlit (ambient 0.06, from the scale sheet's plant value); bulkheads off. Footsteps and voices from the lane are heard muffled through the roof (0.45) |
| Why nobody guards it | Telco property; the contractor has no keys and no reason; Pell does not know it is there. The team has the Client's telco keys |
| Gives | Passes E1.2 to E1.5 unseen |
| Costs | The M1 hold is 16 m from GA1 in the dark lane mouth, so it still needs his radio window. M2 is lifted blind: the player hears GA3's door slams and the lane, but sees nothing until the cover is up. No rota card (it is in the van). About the same ideal time as the lane, but no waiting |

## 7. Encounters and the ways past each

Every way has a cost. "Reason" is the real-world fact that makes the way exist.

**E1.1 Start vantage V0** (10.5, 22.5), under the bridge. Watch GA1 for one cycle, see LA1's pool, the car's shadow, FP1 and M1. Teaches: observe, the radio window. No threat.

**E1.2 Lane mouth, GA1 and the car**
| Way | How | Cost | Reason |
| --- | --- | --- | --- |
| Ground | During GA1's radio stop at B (facing E), from the pub bin store H1 along the south pavement, past the car's west side (in the car's shadow from LA1) and on to FX1 | 13 s window; the stretch past the car is near him | The car blocks low sight; LA1 is east of the car, so the car shades its west side |
| Up | Climb DP1 at A2 during the radio stop, cross A2's roof directly over GA1 at B, on along A3 to A5 | 3 s climb close to him; the roof walk is slow (crouch) | The lean-to has a downpipe; GA1 shelters under its eaves |
| Below | Lift M1 (4 s) during the radio stop, 16 m from GA1 | Hold noise 4 m; a long blind walk; no rota card | Telco jointing chamber at the junction |
| Loud | Take GA1 down from behind at B, or drop on him from A2's roof; body in the skip | GA2's next radio check fails: he walks to the car within 40 s | The radio check is the contractor's own routine |

**E1.3 Feeder pillar FP1** (39.3, 12.6), under LA1. Optional light action.
| Way | How | Cost | Reason |
| --- | --- | --- | --- |
| Switch | Hold 3 s while GA1 faces W at A and GA2 is not at his W stop | GA2 walks to FP1; the lane is heightened 60 s | The council's lane lamps are fed from this pillar |
| Shoot | Shoot LA1, LA2, LA3 or LA5 one at a time | Glass noise; the nearest guard checks for 8 s | Plain lanterns |
| Ignore | Use the shadows | Longer waits in E1.4 and E1.7 | |

**E1.4 Lock-up row, GA2**
| Way | How | Cost | Reason |
| --- | --- | --- | --- |
| Ground | South pavement: FX1, car P1, FX2, car P2, FX3, moving while GA2 is at E or walking E | Every hop is 6 to 8 m; LA2's pool at x 58 to 74 must be crossed in his gap | Fire exit recesses and parked cars |
| Up | Roofs A4 and A5, then the A6 gap: climb down A5's downpipe (back 8 m) or drop 3 m (roll, 5 m noise); cross the A6 forecourt behind the cars while GA2 is at W facing W; climb A7's downpipe | The gap puts you in GA2's own forecourt; a drop is loud | The car repairer's forecourt has no roof |
| Below | Tunnel | As above | |
| Loud | Take GA2 at E between the cars (his isolation moment); body between the cars | GA1's next radio call goes unanswered: he calls it in and walks east | |
| Light | CA1 off sends GA2 to FP1 for about 25 s and empties the row | GA1 is suspicious; heightened 60 s | |

**E1.5 Printworks bay, GA3 and the van**
| Way | How | Cost | Reason |
| --- | --- | --- | --- |
| Ground | Along the north strip past A8 and A9 while GA3 is at the rear (the van hides the lane from the dock); his door slam is the cue | The cab faces the north strip for 16 s of every 40; LA4 cannot be put out | The van body is 2.6 m tall; the cab looks across the lane |
| Up | Roofs A7 to A12 straight over the encounter | Slow; A8's roof is also the vantage V2 that shows both his stops | Continuous lean-tos |
| Below | Tunnel | As above | |
| Loud | Take GA3 as he steps out at the van's east side; body in the van | His relief is due at midnight (no alarm in the mission's time, but the van rear is the only hide) | |
| Optional | Rota card on the cab dashboard: hold 2 s at the passenger door while GA3 is at the rear | 2 s in the bay mouth | Shows the gate man's break time and where the card box is (Area 2 intel) |

**E1.6 A13 sand bays** (137, 23.5). The three layers meet: roof walkers must come down (the merchant's bays have no roof), the tunnel ends at M2 (hold 3 s, blind). Checkpoint K3. The choice for E1.7 is made here, in sight of the sniper's laser crossing the lane ahead (vantage V3).

**E1.7 East lane under the sniper's sweep**
| Way | How | Cost | Reason |
| --- | --- | --- | --- |
| Ground | Under the A14 to A16 eaves and door recesses (H10), crossing LA5's pool when the laser is elsewhere | LA5 is lit unless CA1 is off or LA5 is shot | The lean-to fronts and eaves shade the strip from the roof-height view to the south-east (D1 checks the angles) |
| Up | Roofs A14 to A16 | Dark but in SN's elevated view: move only between sweeps; descend at A16 (downpipe at its west end, or drop 3 m) | No parapet on a lean-to roof |
| Below | None (the duct bank) | | |

**E1.8 Turning head: GA4, the gatehouse window, LA6 and LA7**
| Way | How | Cost | Reason |
| --- | --- | --- | --- |
| Ground | From the A17 reveal (V4, H11) to the substation gate SG while GA4 is at P2 facing W (SG is behind him) and the laser is away; hold 3 s at SG; into the switch room | SG is lit by LA6; GB1's window covers the south half of the turning head, not SG | The substation is reached from the lane by design (the electricity board's access) |
| Light | Shoot LA6 first | GA4 checks it for 8 s | |
| Loud | Take GA4 at P2 (his isolation moment, between sweeps); body in H11 | GB1 notices the missed chat within 40 s: Area 2 starts suspicious | |
| Gate | Go through Gv instead (Area 2 decides how it opens) | In GB1's and LA7's face | |

Checkpoint K4 in the switch room. The way on is the pier door SD into the drum store (Area 2).

## 8. Self-check against the rules

| Rule | Area 1 |
| --- | --- |
| 16.2.1 to 16.2.5 vertical access | No stairs or ladders in the lane except the manhole shafts (plant ladders in service shafts). No roof access needed (no building is entered) |
| 16.2.6 consistent climbing | Every lean-to downpipe is climbable; no other drainpipe type exists in the lane (the printworks' downpipes are inside its walls) |
| 16.3 openings | Every opening is in the register |
| 16.4 objects | Every object is named in the register |
| 16.5 roofs | Lean-to roofs are complete; gaps are whole open forecourts, not holes |
| 16.6.1 no forcing shapes | The lane is straight; length is the lane's real length |
| 16.6.3 dead ends | None: the tunnel runs M1 to M2; the yards and the printworks are closed walls, not spurs |
| 16.7 underground | Real cable tunnel with real shafts and real ends |

Open for D1: the cone and fill checks for every window above; the lit share; SN's range to x 150 (if the sniper archetype's range does not reach, his sweep covers only the turning head and E1.7 relies on LA5 and the roofs' exposure to GB1 instead); whether the A14 to A16 eaves really shade the north strip from SN.

## 9. Areas 2 to 4 (outline only)

**Area 2 - Perimeter (about 5 min).** The exchange's service yard, 64 x 22 m between A block and the viaduct, entered from the substation through the drum store A19 or through the vehicle gate Gv. The yard holds the gatehouse (the contractor's key safe with the access cards: the objective), the boiler house with its oil tank bund and chimney, the generator house, the telco garages in arches A20 and A21 (a telco van and the contractor's second van), and the sniper SN on A block's roof. Darkness comes from the viaduct's shadow along the arch fronts and the gaps between the yard buildings; light from the gate floodlight, wall bulkheads on A block's north wall and the boiler house lamp. Three ways to the building: the goods-in staff door (card reader, needs the cards), the heating subway from the boiler house into A block's basement (crouch, 1.5 m, the cards still needed inside), and the boiler house's flat roof as the high vantage and the way round the sniper's sweep. A yard walker, the gate man GB1 and a pair at the garages are the guards; the rota card from Area 1 tells the gate man's break.

**Area 3 - Building (about 8 min).** A block and B block as in the brief. P1 is in the ground-floor test room, P2 at the network control room panel on the second floor, P3 in Pell's cage in B block's trunk hall. Routes are the real circulation: the central corridors, the main stair A1 and the fire stairs A2 and B1, the basement plant (battery room, power room, fan room, heating mains room), and the crouch systems: the supply-air riser SR (plant ladder) to the builder's-work ducts above the apparatus hall (grilles look down on the hall) and over the second-floor corridor, and the cable trenches under the trunk hall floor, entered from the cable gallery, which pass under the cage's rack rows. Guards: the officer at the control room, a corridor patrol, the hall pair, the heavy at the cage. Order of objectives stays open (P1 and P2 either order; P3 needs both).

**Area 4 - Exfil at the rear (about 2 min).** From B block's fire stair B1 exit (opens from inside) along the dark strip at the foot of the viaduct to the drum store A19 and out through its north doors (bolted from inside) to Wharf Street, where the van waits. If the alarm is up, the reinforcement van comes to Wharf Street and GB1 runs to unbolt A19's north doors for it, so the rear is full of guards and the exit flips to the substation pier door SD, the turning head and the cable tunnel M2 to M1 back to Viaduct Road.
