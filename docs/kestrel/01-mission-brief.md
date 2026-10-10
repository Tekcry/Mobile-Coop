# Kestrel - mission brief (Dead Line)
Status: DRAFT (campus redesign, Michael 2026-10-11; the single-building version was APPROVED 2026-10-10)

Short names: story = docs/story.md, S0 = S0-security-spec.md, F = 00-facts.md, LD = docs/level-design.md. A = Building A (2004 original), B = Building B (2021 phase 2). S1-S7 = the seven guarded spaces, X = the way out, B1-B10 = beats. No coordinates, sizes or routes here.

## 1. Fixed by the story
| Fact | Source |
| --- | --- |
| Site: Cinder Yard, run by Ostler Colocation, on the old goods yard in Kestrel, under the viaduct. Campus: Building A (2004 original: offices, security room, night operations desk, records) and Building B (2021 phase 2: secure data hall, meet-me room, Pell's cage), joined at first-floor level by an enclosed link bridge | story header, 6.1; Michael 2026-10-11 |
| Pell's cage is rented by Ansell & Crowe Ltd, in Building B's data hall. Pell relays orders; he does not steal data | story 5, 6.1 |
| LANTERN pulled the first fibre into the site in 2003, through the carrier entrance under the yard; her cable is still in it. The entrance now feeds both buildings through the service tunnel; the 2021 meet-me room is in Building B | story 4, 8; Michael |
| Objective line: card, cameras, cage; tap his line; out through the yard | story 8 |
| Entry is over the lane fence; the yard lights are on motion sensors | story 8 |
| A van is being loaded in the yard; its officers are Pell's extra cover | story 6.1, 8 |
| Moth is on the depot roof across the lane | story 8 |
| Rain, at night | story 3, 6.1 |
| The weekly generator test is due before dawn, in Building B's indoor generator hall; the exit is made while it runs | story 6.1; Michael |
| Tripping the data hall cooling pulls staff away: a lure, never a way in | story 6.1, RULES 1 |
| Guards are contracted security who believe they protect a business. 20 are on site because Pell paid for extra cover (story says 16; Michael raised it to 20 for the campus) | story 5, 6.1; RULES 2 |
| One civilian, the night duty engineer, the one Ostler employee on shift. Never kill them | story 6.1, bible 5.7 |
| Closing line: the tap's first capture arrives as the team crosses the yard. SUNDOWN, nine nights, failover units "already delivered" | story 6, 6.1, 8 |

## 2. The night
- Cinder Yard, Ostler Colocation's two-building data centre. A Tuesday in late November, 01:10 start, window to 02:10 (ASK-1). The clock is display only; nothing happens when it passes (no forced timer).
- Steady rain. A thin waning moon behind cloud, so the yard has no moonlight. The only light is the sensor-switched yard lamps, the gatehouse and glow from windows.
- A normal Tuesday inside: cooling hum in both buildings, tenants' cages quiet, the duty engineer the only Ostler employee on shift, the generator's weekly test due before dawn.
- Tonight is not normal: Pell is closing out a handover. His cage in B is being re-equipped, crates go out through A's goods-in bay and a van is being loaded in the yard.
- That is why there are 20 guards: Pell paid for extra cover (story 6.1). It is the van crew, a private contractor at his patch panel, a post on the link bridge and extra rounds in both buildings. The guards do not know what he is. The van is a distraction; the traffic is the point.
- "Dead Line" is Peg's joke: a fibre nobody seems to use.

## 3. People
Spaces: S1 site (lane, yard, goods-in), S2 A ground floor, S3 security room with its CCTV equipment room and key safe room, S4 A first floor (operations, records, plant gallery), S5 link bridge and B's secure floor, S6 B's data hall, S7 meet-me room, X the way out (yard, generator hall wing). Armed = sidearm (Q3).
| Role | n | Space | Employer | Job tonight | Most of the night in | Armed |
| --- | --- | --- | --- | --- | --- | --- |
| Gatehouse officer | 1 | S1 | Guarding firm | Signs vehicles in and out, watches the lane gate and the yard monitor | Gatehouse | yes |
| Perimeter patrol | 1 | S1 | Guarding firm | Fixed loop of fence line and yard; checks the sensor lamps | Yard | yes |
| Van driver | 1 | S1 | Guarding firm, extra post paid by Ansell & Crowe | Carries crates from goods-in to the van | Yard, goods-in bay | yes |
| Reception officer | 1 | S2 | Guarding firm | Signs the visitor and delivery book, watches the lobby monitor | Reception | yes |
| Rounds officer | 1 | S2 | Guarding firm | Tries doors and checks windows on a fixed round of A's ground floor, post room and locker room | A ground floor | yes |
| Duty manager | 1 | S2 | Guarding firm | Shift manager: signs the log, holds the master card, walks to reception and back each cycle; iris-enrolled | His office | yes |
| Desk operator | 1 | S3 | Guarding firm | Watches the monitor wall, takes radio calls | Security room | yes |
| Supervisor | 1 | S3 | Guarding firm | Leaves on a rounds loop through A's first floor and the bridge post, then returns | Security room, then rounds | yes |
| Corridor patrol | 1 | S4 | Guarding firm | Walks A's first-floor corridors, records and plant gallery | A first floor | yes |
| Escort officer | 1 | S4 | Guarding firm | Shadows the engineer on plant checks (lone-worker rule); otherwise stands at the ops door | A first floor | yes |
| Operations desk officer | 1 | S4 | Guarding firm | Staffs the night operations desk: logs customer call-outs and media movements, answers the lounge intercom | Operations desk | yes |
| Bridge post officer | 1 | S5 | Guarding firm | Checks cards and the tour sheet at the post on B's side of the link bridge | Bridge post | yes |
| Mantrap post | 1 | S5 | Guarding firm | Checks cards and logs entries at the mantrap | Mantrap vestibule | yes |
| Gallery patrol | 1 | S5 | Guarding firm | Walks the secure corridor and the gallery, looking down into the hall | Secure corridor, gallery | yes |
| Talking pair | 2 | S6 | Guarding firm | Walk the hall aisles together, stopping to talk | Data hall | yes |
| Pell's private contractor | 1 | S7 | Ansell & Crowe Ltd (post paid for the handover) | Watches his client's patch panel, logs who enters | Meet-me room | yes |
| Roaming officer | 1 | S7 | Guarding firm | Loops the meet-me room, the riser room and the corridor outside | Meet-me room and approaches | yes |
| Generator test technician | 1 | X | Guarding firm (trained facilities officer; the engineer is the only Ostler employee) | Runs the weekly generator test | Rest room off the generator hall until the test | yes |
| Returning van driver | 1 | X | Guarding firm, extra post paid by Ansell & Crowe | Second officer of the van crew; off site on the lane run, walks back to sign the van sheet | Off site until the test | yes |
| Night duty engineer (civilian) | 1 | S4 | Ostler Colocation | Watches the building-management screens for both buildings, signs off the generator test; iris-enrolled, the story's preferred key | Ops office | no |
Total 20 guards + 1 civilian. At most 12 are awake at once (F21 MAX_ALIVE); the other 8 are dormant guards (S5). Which sleep when is P07's call (ASK-5). Civilian rules (flee to the nearest guard or alarm and raise it; never fight; killing fails the mission) follow bible 5.7. The engineer at the iris is a louder alternative only (4.1, ASK-8).

## 4. The objective chain
(general knowledge) How a circuit reaches a tenant's cage:
1. A carrier's fibre runs in underground ducts under the street to a chamber outside the site.
2. It enters through sealed ducts into the carrier entrance under the yard (the vault), where the carrier's own equipment ends the line. LANTERN's 2003 cable is in this entrance.
3. From the vault, ducts run through the service tunnel to each building. Since 2021 a riser lifts Building B's circuits to the meet-me room: rows of patch panels where carriers' and tenants' fibre ends are brought together.
4. A cross-connect is a short fibre jumper the operator's technicians run between two panel ports, one on a carrier or tenant, one on the customer's panel. It is ordered, labelled and billed per circuit.
5. Fibre in overhead trays then runs from the meet-me room through the data hall to the tenant's cage or rack panel.
6. A broker sells private links: each party orders a cross-connect to his panel, so traffic never touches the public internet and the only record is the order. His circuits sit side by side in the meet-me room, labelled by cage number.
7. A passive tap is an optical splitter clipped into one jumper. It copies a share of the light without breaking the line. It goes on the patch end in the meet-me room because the cage is locked mesh under cameras.

Cards and codes (all findable without contact): the master card (A's readers) is in the duty manager's desk drawer; the B-tier card (B's readers and the carrier riser door, higher tier) and the roof maintenance key (4.1) are in the key safe, whose PIN is written in the shift key log in the records room; the escort PIN (B's readers accept it instead of the card) is on a note in the night engineer's locker in the locker room, where he keeps it because it changes monthly.

| # | Where | Person, record or device | Player does | Why now | Unlocks | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Inside the perimeter | Lane, perimeter fence (site) | Lane fence (F14); sensor lamps | Climb the fence into the yard. Completion is a zone trigger: ASK-2 | First step | The yard | Sensor lamp trips; fence rattle at gears above 3 |
| 2 Keycard | A ground floor, duty manager's office (S2) | Master card in his desk drawer | Take the card while he is on his walk (S0 "Take card") | The security zone and ops need it; nothing earlier carries a reader | Security room, CCTV room, key safe room, ops, records | Manager returns; rounds officer; reception officer |
| 3 Blind the security room | CCTV equipment room beside the security room (S3) | Intrusion panel; the monitor wall is next door | Panel: Loop cameras or Cameras off, and Beams off (S0). Completion rule ASK-3 | Cameras and beams cover A's first floor, the bridge, B and the hall | Safe movement through S4-S6 | Desk operator next door; supervisor away only part of the cycle; "off" is noticed 10 s after the desk is manned |
| 4 Pell's cage number | A first floor, records room (S4); the ops terminal holds the same register | Customer file and shift key log; register on the engineer's terminal (F27), objective type intel (F28) | Read the file in the records room | Needs the card (2) and unwatched corridors (3) | Cage number, the key safe PIN, who is iris-enrolled | Corridor patrol; escort; ops desk officer; the engineer at the terminal |
| 5 Secure zone | B: data hall, reached by a ghost route (4.1) | Roof cooling shaft, or the carrier route | Get into the hall, or into the meet-me room. Completion is a zone trigger: ASK-2 | Needs the cage number (4) | The hall, Pell's cage, the meet-me room | Pair; cameras; the shaft grille alarm |
| 6 Tap | B meet-me room (S7) | Pell's patch panel under his cage number; passive fibre tap | Fit the tap: objective type plant (F28), held interact; kind and hold time ASK-4 | Needs the cage number (4) and the secure zone (5) | The tap's capture; the generator test starts (Q1) | Contractor at the panel; roaming officer; hold noise (F19) |
| 7 Exfiltration | Yard (X) | Generator test in B's generator hall, technician, returning van driver, engineer | Reach the extract point (F27 "extract", F28 type extract), leaving by the vehicle gate or the loading apron (P02 places it), not back over the lane fence | Only after the tap; the test noise is the cover | End of mission; SUNDOWN reveal | Technician, returning driver, yard patrol, engineer; sensor lamps |

### 4.1 Ghost solutions
Ghost = never detected, no alarm, nobody knocked out, killed or grabbed. Every objective, in order, has a solution with no contact.
| Obj | Ghost solution | Louder alternatives |
| --- | --- | --- |
| 1 | Dark wall, over the lane fence at a quiet gear, slow past the yard sensors | Shoot the sensor lamps or run the fence (noise, guards investigate) |
| 2 | Enter A by the admin office window left ajar, or the goods-in door in the loader's gap; take the master card from the manager's drawer on his walk | Takedown (card taken); clone-by-grab |
| 3 | Panel in the CCTV equipment room (master-card reader, out of the operator's sight): Loop cameras, Beams off | Take the operator down and use the desk; shoot cameras (a manned desk sends a guard) |
| 4 | Customer file and key log in the records room (master card) | Read the ops terminal with the engineer present (he flees and raises the alarm); grab or take down the engineer |
| 5 | Roof cooling shaft: reach B's roof (smoke vent at the top of a fire stair, the link bridge roof or the pipe rack), isolate the grille's alarm contact with the maintenance key from the key safe, unbolt it, rappel into the hall. Or the carrier route: manhole, vault, service tunnel, riser to the meet-me room (riser door: B-tier card or PIN) | Grab the engineer or the duty manager to the iris in the mantrap; fire-alarm lock release (alarm); break the grille (alarm) |
| 6 | From the hall the meet-me room reader takes the B-tier card or PIN (or arrive by the riser); trip cooling to draw off the roaming officer; fit the tap from the side of the panel the contractor's seat does not see | Take the contractor down; clone a B-tier card by grab |
| 7 | Back down the riser, along the tunnel, up the manhole into the yard, then to the vehicle gate or loading apron under the test noise | Out of the hall's equipment door (opens from inside, alarmed); a run across the yard |

### 4.2 Control ladder
| Boundary | Real control | Knowledge gate | Ghost solution | Louder alternative |
| --- | --- | --- | --- | --- |
| Lane to yard | Perimeter fence; PIR lamps | - | Dark wall, quiet gear, slow | Shoot the lamps |
| Yard to A | Locked doors, latched windows, van at goods-in | - | Ajar admin window; goods-in gap | Break a window (noise) |
| A ground floor to the security zone | Master-card readers: security room, CCTV room, key safe room | Where the card is | Drawer card | Takedown; clone-by-grab |
| CCTV room panel | Reader, then a held panel action | - | Loop cameras, Beams off, unseen | Shoot cameras; take down the operator |
| A ground floor to first floor | Fire stair, ops and records readers | Cage number is in the records | Master card; records file | Grab the engineer |
| Link bridge | Reader at each end; post on B's side; camera | B end takes the B-tier card (key safe, PIN in the key log) or the escort PIN (engineer's locker note) | Cross in the post's gap, or skip the bridge by the roof or the pipe rack | Fire alarm releases the magnetic locks (alarm); clone-by-grab |
| B mantrap | Outer door B-tier card or PIN; inner door card plus iris | Who is enrolled (register: engineer, manager) | None through it: skip by the fire stair and roof, or the carrier route | Grab an enrolled person to the iris; fire-alarm release (alarm) |
| B roof to hall | Bolted, alarmed cooling shaft grille | Maintenance key (key safe room), key switch box beside the grille | Isolate with the key, unbolt, rappel | Break the grille (alarm) |
| Hall aisles | Cameras, pair, lit aisles, beams | The pair's round | Cameras looped; switch bank on the gallery; underfloor void | Shoot the aisle lights |
| Hall to meet-me room | Reader | B-tier card or PIN | As the bridge | Clone-by-grab from the mantrap post |
| Carrier entrance | Manhole cover (lift noise F19); riser door reader | Where the manhole is (LANTERN); B-tier card or PIN | Lift while the yard patrol is away; B-tier card or PIN at the riser door | Run the yard |
| Meet-me room to Pell's panel | Contractor, roamer, camera | Cage number | Lure, gap, blind side | Take the contractor down |

### 4.3 Secret routes
| Route | Beat | Real reason to exist |
| --- | --- | --- |
| Service tunnel | B9, B10 | Carries the carrier ducts, power and pipes from the entrance under the yard to both buildings; staff walk it to maintain them |
| Carrier manhole and vault | B2, B9, B10 | The carrier's chamber: the only place the street ducts are reached |
| Cable and pipe risers with fixed ladders | B5, B9 | Carry cable and pipe between floors; the ladder is for the cable team. The carrier riser rises from the tunnel to the meet-me room |
| Corridor ceiling voids | B3, B5 | Services run over corridors; never into rooms whose walls run to the slab |
| Smoke vents | B6, B7 | Opened from the top of a fire stair to clear smoke; the fire service reaches the roof |
| Link bridge roof | B6 | Flat roof joining A's and B's roofs; maintenance crosses it to the roof plant |
| Pipe rack | B6 | Carries chilled water and power from A's plant to B (phase 2 shares A's chillers); horizontal pipes |
| Roof cooling supply shaft | B8 | Feeds cooled air down into the hall; the grille is bolted and alarmed, with a key switch box beside it for maintenance and a hoist beam above for lifting fan units |
| Hall underfloor void (level U) | B8 | Raised-floor space for cable and cold air, with hinged hatches through the aisles |

## 5. Optional objectives
| Objective | Room | Why the record or label is there | Player does |
| --- | --- | --- | --- |
| Copy Pell's cage access log | Security room desk | Access-control software logs every swipe at the hall and the cage door; the desk workstation holds the history (general knowledge) | Terminal, objective type download (F27, F28) |
| Photograph his rack's labels | Data hall, Pell's cage | Cages are wire mesh so staff can audit them, and fibre is labelled at both ends for the engineers who patch it (general knowledge) | Interactable intel (F27, F28), through the mesh |

## 6. Beats
Zones are P02's fixed program numbers: 1 site, 2 reception, 3 controlled, 3+ restricted, 4 secure, 5 high security. Which space gets which number is a proposal for P02 to confirm: S1 and X 1, S2 2, S3 3+, S4 3, S5 3 (bridge, lobby) to 4 (corridor, gallery), S6 4, S7 5. Tension chart: 1,3,2,4,3,4,3,5,4,5. Each peak (B4, B6, B8) is followed by a release; each high route rejoins inside its own space (LD 3).
| # | Place and zone | Obj | Player wants | In the way | Teaches | Mood | T | Min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 Insertion | Lane and fence, zone 1 | 1 | Over the fence unseen | Sensor lamps just inside; a camera-free dark wall | Crouch gears and noise | Wet, exposed, quiet | 1 | 3 |
| B2 The yard | Yard, gatehouse, A's goods-in bay, van, manhole; zone 1 | - | A way into A | Gatehouse officer, patrol, van driver, camera over goods-in | Making darkness: lamps, switches, a camera's frame | Watchful; a working yard | 3 | 5 |
| B3 A ground floor | Reception, admin offices, manager's office, post and locker rooms; zone 2 | 2 | The master card | Manager, rounds officer, reception officer, lit rooms | Windows, corridor ceiling voids, hiding; takedown as the loud option | Dim, ordinary, tense | 2 | 3.5 |
| B4 Security room | Security room, CCTV room, key safe room; zone 3+ | 3 | Blind cameras and beams | Operator, supervisor's rounds window, monitor wall | Cameras, the desk and panel, readers | Cold blue glow, cramped | 4 | 5.5 |
| B5 A first floor | Ops office, records, plant gallery, risers; zone 3 | 4 | The cage number | Patrol, escort, ops desk officer, engineer, beams | Beams, pipes over the plant corridor, riser ladder | Loud plant, noise helps | 3 | 4 |
| B6 Link bridge | Bridge, A and B ends, with its roof and the pipe rack outside; zone 3 | - | Cross to B | Post on B's side, readers, camera; outside: rain, yard patrol, lamps | Readers at a post, smoke vents, the pipe rack | Glass, rain, long sightlines | 4 | 3.5 |
| B7 B secure floor | Lobby, mantrap, secure corridor, gallery; zones 3-4 | - | A way past the iris | Bridge post, mantrap post, gallery patrol | The mantrap and iris, and the way around it | Hushed, watched | 3 | 3 |
| B8 Data hall | Hall, Pell's cage, underfloor void; zone 4 | 5 | Cross the hall to the meet-me room | Pair on rounds, cameras, long lit aisles | Rappel, hall lights, the underfloor void | Clinical, humming, exposed | 5 | 5.5 |
| B9 Meet-me room | Meet-me room and riser room; zone 5 | 6 | Tap Pell's panel | Contractor at the panel, roaming officer | The held tap beside a watcher | Small, cold, precise | 4 | 4 |
| B10 The way out | Riser, tunnel, vault, manhole, yard to the vehicle gate or loading apron; zone 1 | 7 | Leave by a different path from the entry | Same yard, now with technician, returning driver, engineer, generator roar | Set piece: everything combined | Release into dread | 5 | 4 |
Teach, test, twist: B1-B3 teach, B4-B9 test with combinations (B9 tests precision), B10 is the twist (the yard learnt in B2 has changed). A player on the carrier route skips B6-B8; the beat times below follow the roof-shaft route. Counts as in section 3.

## 7. Mechanics
Only mechanics in 00-facts.md. Every row names a real element. "-" means no further use.
| Mechanic | Taught | Tested | Combined | Real element, or not used |
| --- | --- | --- | --- | --- |
| Darkness and light meter | B1 | B2 | B8 | Dark yard, lit windows, white-lit hall |
| Crouch gears and noise | B1 | B2 | B10 | Fence rattle (F14, B1); sensor-lamp speed limit (S0); generator masking only if ASK-7 |
| Fence | B1 | - | - | The lane fence |
| PIR lights | B1 | B2 | B10 | Yard lamps on motion sensors; the pipe rack's slow shimmy (F12) stays under their speed limit (S0) |
| Light switches | B2 | B4 | B8 | Yard lighting box on the gatehouse wall; hall switch bank on the gallery |
| Shooting lamps | B2 | B5 | B10 | Yard floods; corridor ceiling fittings |
| Cameras | B2 | B5 | B8 | Fixed camera over goods-in (first), corridor, bridge and hall cameras |
| Desk and panel | B4 | B5 | B8 | Security room desk; intrusion panel in the CCTV room |
| Card readers | B3 | B4 | B6 | Readers on the security zone, ops, records, bridge ends, mantrap, meet-me room and riser doors |
| Takedown, drop attack | B3 | B5 | - | Louder alternative only: from behind in the offices; drop from the plant gantry |
| Grab | B7 | - | - | Louder alternative only: engineer or manager to the iris; clone from a grabbed holder |
| Hiding bodies | B3 | B5 | - | Louder alternative only: comms cupboard, janitor's cupboard |
| Mantrap and iris | B7 | - | - | Mantrap and iris at B's secure corridor; the roof shaft and carrier route are the counters |
| Beams | B5 | B8 | B9 | Plant corridor, hall approach, meet-me approach. Rule for P04S: at least one beam in B5 and one in B9 is on no panel, so beams are met live |
| Drainpipes, ledges | B2 | B10 | - | Downpipe and cill ledge on the goods-in wall |
| Wall jump | B2 | B5 | - | Goods-in canopy lip; plant gantry lip |
| Split jump | B2 | B10 | - | Service strip between the boundary wall and B's outer wall (needs F08 width and height) |
| Ladders | B5 | B6 | - | Fixed steel ladder to the plant gantry; to the pipe rack |
| Horizontal pipes | B5 | B6 | B8 | Chilled-water pipes over the plant corridor; the pipe rack between the buildings; CRAC pipework along the hall wall |
| Rappel | B8 | - | - | Hoist beam above the roof cooling shaft, down into the hall |
| Crouch voids | B3 | B5 | B8 | Corridor ceiling voids over A's floors; the hall underfloor void (level U) |
| Riser ladders | B5 | B9 | - | Cable riser between A's floors; the carrier riser to the meet-me room |
| Smoke vents | B6 | B7 | - | Vents at the top of A's and B's fire stairs, onto the roof |
| Windows | B2 | B3 | - | Ground-floor office windows in A (the hall and meet-me room have none, general knowledge) |
| Co-op boost | B2 | B10 | - | Goods-in canopy roof edge (F33 lip window), also solo-reachable by the downpipe |
| Human ladder | not used | - | - | Boost covers the one co-op lip the slice needs; a second needs a lip within the F15 grab height and no real element is named |

## 8. Time budget
Assumptions: moving = crouched gear 3, 1.3 m/s (F18), including climbs, shimmies and holds. Watching and waiting = one patrol cycle at each vantage (0.75 min, the F30 upper bound of 45 s) plus gap waits (3-8 s each) and set waits (supervisor leaves, lure reset).
| Beat | Moving min | Watching and waiting min | Total |
| --- | --- | --- | --- |
| B1 Insertion | 1 | 2 | 3 |
| B2 The yard | 2 | 3 | 5 |
| B3 A ground floor | 1.5 | 2 | 3.5 |
| B4 Security room | 1.5 | 4 | 5.5 |
| B5 A first floor | 1.5 | 2.5 | 4 |
| B6 Link bridge | 1.5 | 2 | 3.5 |
| B7 B secure floor | 1.5 | 1.5 | 3 |
| B8 Data hall | 2 | 3.5 | 5.5 |
| B9 Meet-me room | 1.5 | 2.5 | 4 |
| B10 The way out | 2 | 2 | 4 |
| Total | 16 | 25 | 41 |
Check: 16 min at 1.3 m/s is 1248 m, 1.9 to 2.8 times the 450-650 m critical path (RULES 2), a fair allowance for retreats and second looks. A player who knows the map moves 4.2-6.0 min at crouched gear 4 (1.8 m/s), plus about 8 min of waits that cannot be skipped: 12-14 min (RULES 2).

## 9. Co-op
- Highlight (one kills the lights, one crosses), B8, data hall. The aisle lights are on a switch bank on the gallery at the hall's entrance. One player switches them off. The pair sees lights changed in view (bible 5) and walks to the bank. The other crosses the dark aisle. The first hides on the gallery or in the underfloor void and rejoins. Solo: switch off, hide on the gallery or in the void while the pair investigates, then cross; or skip the bank and cross by the underfloor void.
- Second, smaller: B4-B5. One player at the panel cuts cameras (2 s, noticed 10 s after the desk is manned, S0) while the other crosses the camera corridor. Solo: loop the cameras (6 s hold) and cross.
- First team move, B2: one player boosts the other to the goods-in canopy roof edge (F33 lip window). It gives an overwatch run above the yard patrol, away from the sensor lamps, ending in a drop to the goods-in bay. Solo reaches the same roof by the downpipe, or stays on the shadow route along the wall.
- Player count never changes guard count (bible P6).

## 10. Mission rules
- Detection: suspicious, then investigating, then alert, then search (bible 3). Alarm level 0-3: 1 torches, 2 helmets and tighter patrols, 3 reinforcements. Cameras, the desk and beams only call existing enemy functions (S0 section 10). No instant fail.
- Fails: killing the civilian (bible 5.7); all players down reloads the last checkpoint. Alarms never fail the mission (Q4).
- Ghost (rating bonus): `noAlarms`, `noKills`, no detections (rating counts detections; "undetected" is not a rule, ASK-11), `noBodiesFound`, nobody knocked out and nobody grabbed (the last two are new counters, ASK-15). Guards investigating a noise, a light or a plant fault is allowed if they never see anyone. The cooling trip is a plant fault, not an alarm; the fire alarm, the gas suppression warning and anything that raises the alarm level are alarms.
- Every objective has a ghost solution (4.1). Takedown, grab, clone-by-grab and the fire-alarm lock release are louder alternatives, never the only way.
- Lure: Trip cooling (S0, 2 s hold, 4 m noise) pulls the engineer and two calm guards for a short while; it resets after 120 s.
- Generator test: event-driven, never a timer (Q1).

## 11. Radio (from the story)
```
LANTERN: Evening, Night Shift. Cinder Yard. I pulled the first fibre into that building.
LANTERN (solo): In over the lane fence. Keep to the wall - the yard lights are on sensors.
LANTERN (team): Over the lane fence, all of you. Keep to the wall - the yard lights are on sensors.
[player crosses the lane]
MOTH (if not present): I'm on the depot roof across the lane. Van's being loaded in the yard.
SEXTON: Rain's on our side tonight. Nobody looks up in the rain.
MOTH: I look up in the rain.
[player moves]
SEXTON: Nobody sensible.
LANTERN: Card, cameras, cage. Tap his line, out through the yard. Stay in the dark.
[player is inside the perimeter]
TALLY: Cooling alarm brings the duty engineer running. Just saying.
LANTERN: The carrier entrance is under the yard. My cable's still in it.
[player taps the cross-connect]
TALLY: Tap's on. Light's coming through clean. He'll never know.
...
[player crosses the yard during the generator test]
TALLY (end): Peg... he's not selling data. He's relaying orders. Someone called SUNDOWN.
TALLY (end): Nine nights. And the hardware's already delivered.
LANTERN: Then we've nine nights. Come home.
```

## 12. ASK items
- ASK-1: clock window 01:10 to 02:10 is a proposal; no number exists in the facts.
- ASK-2: objectives 1 and 5 are zone triggers (yard entered; hall or meet-me room entered), not in F27 or F28.
- ASK-3: objective 3 completes when cameras are looped or off AND beams are off at the panel (proposal).
- ASK-4: the tap's interactable kind (F27) and hold time; no hold time exists in the facts.
- ASK-5: dormant guards: 8 of 20 sleep (12 awake, F21); the wake rules are for S5 and P07. Proposal: the S7 pair and exit pair wake when objectives 4 and 6 complete.
- ASK-6: if waking a guard would pass the awake cap (F21, 12), S5 decides which earlier guards go dormant again.
- ASK-7: whether the noise model can mask footsteps near the generator (F19 lists no masking). If not, the generator is a story reason only.
- ASK-8: the engineer is a civilian and must be grabbable for the louder iris route (S0 section 11).
- ASK-9: closed (Michael, 2026-10-11): the riser door takes the B-tier card or PIN. P04S confirms the other doors on the route.
- ASK-11: "undetected" as a ghost condition; the bible lists only the four rules.
- ASK-12: closed (Q3): all guards armed.
- ASK-13: decided (Michael, 2026-10-11): a maintenance key switch in a box beside the grille on B's roof isolates its alarm contact; the key is in the key safe room. P04S decides whether it joins the security file. The hoist beam is the rappel anchor (F13).
- ASK-14: decided (Michael, 2026-10-11): a PIN is an intel pickup (F27) that sets a flag a reader or the key safe accepts. The fire-alarm lock release is not in S0 (RULES 2) and is dropped unless S2 builds it; no ghost solution depends on it.
- ASK-15: decided (Michael, 2026-10-11): "nobody knocked out" and "nobody grabbed" are new rating counters beside the bible's four; B6 builds them.

## 13. Questions for Michael (answered 2026-10-10)
1. Triggers: assume the bible 5.8 triggers and actions. Objective 1 completes on a zone trigger; completing objective 6 starts the generator test (ASK-2 closed).
2. Carrier route: yard manhole, vault, riser to the meet-me room's own reader door (the tunnel and campus added 2026-10-11).
3. Weapons: all guards carry sidearms (16 then, 20 now; ASK-12 closed).
4. Alarm fail: alarms never fail the mission; only killing the civilian does.
5. Dormant guards: left to P07. Proposal in ASK-5 is a default only.

Downstream: P02 must confirm the space-to-zone mapping in section 6, place the loading apron or vehicle gate, the carrier manhole, the CCTV equipment room beside the security room, the key safe room, the locker room, the link bridge and the pipe rack. P03B and P03R must recheck the beats and the three secret roofs (vent, bridge roof, rack). P04S must recheck: panel in the CCTV room (ASK-3), the riser door on the B-tier card or PIN (ASK-9), the grille key switch (ASK-13), bridge readers and the post, and that beats B5 and B9 each have a live beam. S2 must recheck the PIN intel flag, the B-tier card and the key safe (ASK-14). P07 must recheck the 20 guards and 8 dormant (ASK-5), the bridge post gap and that the S7 roamer covers the riser door. P08 must recheck the hall highlight (section 9) and the ghost counters (ASK-15).

## Revision log
| Date | Fix # | What changed (sections) | Status |
| --- | --- | --- | --- |
| 2026-10-10 | 1 | Sections 3 (manager and engineer rows), 4 (rows 4 and 5), 7 (Grab row) | done |
| 2026-10-10 | 2 | Sections 4 (row 7), 6 (B8 row) | done |
| 2026-10-10 | 3 | Sections 4 (carrier paragraph), 13 (answer 2) | done |
| 2026-10-10 | 4 | Sections 6 (zone line, zone column), 12 (ASK-10 closed) | done |
| 2026-10-10 | 5 | Sections 6 (zone line, B4 and B5 zones) | done |
| 2026-10-10 | 6 | Sections 4 (carrier paragraph, P02 line), 13 (answer 2), downstream | done |
| 2026-10-10 | 7 | Section 7 (Fence and Crouch rows), downstream | done |
| 2026-10-11 | C1 | Header, sections 1, 2, 4 (circuit steps 2-3) for the campus | done |
| 2026-10-11 | C2 | Section 4 (cards and codes, objective table), 12 (ASK-2) | done |
| 2026-10-11 | C3 | Section 4.1 new; section 10 (ghost line, no-takedown line replaced), 12 (ASK-15) | done |
| 2026-10-11 | C4 | Section 4.2 new | done |
| 2026-10-11 | C5 | Section 4.3 new | done |
| 2026-10-11 | C6 | Section 6 rebuilt (B1-B10), downstream | done |
| 2026-10-11 | C7 | Sections 2, 3 rebuilt (20 guards plus engineer), 12 (ASK-5), 13 | done |
| 2026-10-11 | C8 | Sections 7 (pipe rack, rappel, voids, risers, vents), 8 (41 min), 12 (ASK-13, ASK-14) | done |
| 2026-10-11 | C9 | Section 9 (hall highlight on the gallery, solo way kept) | done |
| 2026-10-11 | C10 | RULES.md section 2 (site line, levels line) | done |
| 2026-10-11 | Q | Michael's answers: sections 4 (cards, 4.1, 4.2), 4.3, 12 (ASK-9, 13, 14, 15), downstream | done |
