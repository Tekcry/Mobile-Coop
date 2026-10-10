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
| Seven civilians (story names one, the night duty engineer; Michael raised it to seven for the campus). Never kill one | story 6.1, bible 5.7; Michael 2026-10-11 |
| Closing line: the tap's first capture arrives as the team crosses the yard. SUNDOWN, nine nights, failover units "already delivered" | story 6, 6.1, 8 |

## 2. The night
- Cinder Yard, Ostler Colocation's two-building data centre. A Tuesday in late November, 01:10 start, window to 02:10 (ASK-1). The clock is display only; nothing happens when it passes (no forced timer).
- Steady rain. A thin waning moon behind cloud, so the yard has no moonlight. The only light is the sensor-switched yard lamps, the gatehouse and glow from windows.
- A normal Tuesday inside: cooling hum in both buildings, most cages quiet, two Ostler engineers on shift (duty engineer in A, facilities engineer in B) among seven civilians, the generator's weekly test due before dawn.
- Tonight is not normal: Pell is closing out a handover. His cage in B is being re-equipped, crates go out through A's goods-in bay and a van is being loaded in the yard.
- That is why there are 20 guards: Pell paid for extra cover (story 6.1). It is the van crew, a private contractor at his patch panel, a post on the link bridge and extra rounds in both buildings. The guards do not know what he is. The van is a distraction; the traffic is the point.
- "Dead Line" is Peg's joke: a fibre nobody seems to use.

## 3. People
Spaces: S1 site (lane, yard, goods-in), S2 A ground floor, S3 security room with its CCTV equipment room and key safe room, S4 A first floor (operations, records, plant gallery), S5 link bridge and B's secure floor, S6 B's data hall, S7 meet-me room, X the way out (yard, B's ground plant, generator hall wing). Armed = sidearm (Q3).
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
| Operations desk officer | 1 | S4 | Guarding firm | Sits at the ops sign-in counter: logs customer call-outs and media movements, answers the lounge intercom | Ops counter | yes |
| Bridge post officer | 1 | S5 | Guarding firm | Checks cards and the tour sheet at the post on B's side of the link bridge | Bridge post | yes |
| Mantrap post | 1 | S5 | Guarding firm | Checks cards and logs entries at the mantrap | Mantrap vestibule | yes |
| Gallery patrol | 1 | S5 | Guarding firm | Walks the secure corridor and the gallery, looking down into the hall | Secure corridor, gallery | yes |
| Talking pair | 2 | S6 | Guarding firm | Walk the hall aisles together, stopping to talk | Data hall | yes |
| Pell's private contractor | 1 | S7 | Ansell & Crowe Ltd (post paid for the handover) | Watches his client's patch panel, logs who enters | Meet-me room | yes |
| Roaming officer | 1 | S7 | Guarding firm | Loops the meet-me room, the riser room and the corridor outside | Meet-me room and approaches | yes |
| B ground rounds officer | 1 | X | Guarding firm | Tries doors on B's ground floor: locker area, customer staging, plant corridor, generator hall wing (the post freed when the generator test moved to a civilian) | B ground floor | yes |
| Returning van driver | 1 | X | Guarding firm, extra post paid by Ansell & Crowe | Second officer of the van crew; off site on the lane run, walks back to sign the van sheet | Off site until the test | yes |
| Night duty engineer | 1 | S4 | Ostler Colocation | Watches the building-management screens for both buildings and signs off the generator test; iris-enrolled, the story's preferred key | Night operations desk, one plant check a cycle | no |
| NOC operator | 1 | S4 | Network monitoring contractor to Ostler (ASK-16) | Watches the network monitoring screens, raises tickets, phones tenants | Monitoring desk in the ops area | no |
| Night cleaner | 1 | S2, S4 | Contract cleaning firm | Cleans A's offices and corridors floor by floor; the trolley stands in the corridor while they work the rooms | A ground floor, then first | no |
| Critical facilities engineer | 1 | X | Ostler Colocation | Plant rounds of B (chillers, UPS, switchgear); runs the weekly generator test and signs it off | B plant rooms, generator hall wing | no |
| Remote-hands technician | 1 | S6 | Remote-hands firm hired by a tenant (ASK-16) | Swaps hardware at the tenant's racks; brings kit in by the staff door | Data hall rack row; locker in B's locker area | no |
| Visiting tenant engineers | 2 | S6 | Tenant firm, not Ansell & Crowe (ASK-16) | Planned maintenance window in a cage near Pell's, with a tool cart | That cage | no |
Total 20 guards + 7 civilians. At most 12 are awake at once (F21 MAX_ALIVE); the other 8 guards are dormant (S5, ASK-5). Whether civilians count towards the cap is for S5 and S6 (ASK-17). Civilians follow bible 5.7 and perception rules like guards: on seeing the player they flee to the nearest guard or alarm point and raise it, never fight; killing one fails the mission; knocking one out costs rating. They work task routines (desk, rack, plant round, cleaning), so their movement is readable. Grabbing the engineer at the iris is a louder alternative only (4.1, ASK-8).

## 4. The objective chain
(general knowledge) How a circuit reaches a tenant's cage:
1. A carrier's fibre runs in underground ducts under the street to a chamber outside the site.
2. It enters through sealed ducts into the carrier entrance under the yard (the vault), where the carrier's own equipment ends the line. LANTERN's 2003 cable is in this entrance.
3. From the vault, ducts run through the service tunnel to each building. Since 2021 a riser lifts Building B's circuits to the meet-me room: rows of patch panels where carriers' and tenants' fibre ends are brought together.
4. A cross-connect is a short fibre jumper the operator's technicians run between two panel ports, one on a carrier or tenant, one on the customer's panel. It is ordered, labelled and billed per circuit.
5. Fibre in overhead trays then runs from the meet-me room through the data hall to the tenant's cage or rack panel.
6. A broker sells private links: each party orders a cross-connect to his panel, so traffic never touches the public internet and the only record is the order. His circuits sit side by side in the meet-me room, labelled by cage number.
7. A passive tap is an optical splitter clipped into one jumper. It copies a share of the light without breaking the line. It goes on the patch end in the meet-me room because the cage is locked mesh under cameras.

Cards and codes (all findable without contact): the master card (A's readers) is in the duty manager's desk drawer; the B-tier card (B's readers and the carrier riser door, higher tier) and the roof maintenance key (4.1) are in the key safe, whose PIN is written in the shift key log in the records room; the escort PIN (B's readers accept it instead of the card) is on a note in the night engineer's locker in the locker room, where he keeps it because it changes monthly. Track B has its own credential: the remote-hands technician's contractor card (B-tier, not the iris) in their locker in B's locker area, or left in their car in the yard.

Two tracks that meet (RULES 1). Objective 1 starts both. Track A (TA, Building A) and Track B (TB, Building B) run in parallel; entering the secure zone (5) needs at least one thing from each; then the tap (6) and the way out (7). Solo: A first, so the cameras are blind when B is crossed, then B. A team splits or moves together. Intel read by one player is radioed to all. Brackets are the objective numbers.
| # | Where | Person, record or device | Player does | Why now | Unlocks | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Inside the perimeter | Lane, perimeter fence (site) | Lane fence (F14); sensor lamps | Climb the fence into the yard. Completion is a zone trigger: ASK-2 | First step, both tracks | The yard | Sensor lamp trips; fence rattle at gears above 3 |
| TA1 Keycard (2) | A ground floor, duty manager's office (S2) | Master card in his desk drawer | Take the card while he is on his walk (S0 "Take card") | A's security zone, ops and records need it | Security room, CCTV room, key safe room, ops, records | Manager returns; rounds officer; reception officer; the cleaner's round |
| TA2 Blind the cameras (3) | CCTV equipment room beside the security room (S3) | Intrusion panel; the monitor wall is next door | Panel: Loop cameras or Cameras off, and Beams off (S0). Completion rule ASK-3 | Cameras and beams cover A's first floor, the bridge and all of B | Safe movement for both tracks | Desk operator next door; supervisor away part of the cycle; "off" is noticed 10 s after the desk is manned |
| TA3 Cage number and key safe code (4) | A first floor, records room (S4); the ops terminal holds the same register | Customer file and shift key log; register (F27), objective type intel (F28) | Read the file and the log; the intel is radioed | Needs TA1 and unwatched corridors (TA2) | Cage number (needed for 6), key safe PIN, who is iris-enrolled | Corridor patrol; escort; ops desk officer; engineer and NOC operator in the ops area; the cleaner |
| TA4 Key safe | Key safe room (S3) | Key safe, PIN from TA3 | Enter the PIN; take the B-tier card and the roof key | Needs TA3; back on the ground floor | B-tier card (B's readers, riser), roof key (shaft) | As TA2 |
| TB1 Reach B unseen, TB2 scout the secure floor | Link bridge, service tunnel, pipe rack or B's roof; then the lobby, corridor and gallery (S5), or the roof and rack | Bridge post and camera, rack lamps, tunnel from the carrier manhole; mantrap post, gallery patrol | Cross by a quiet route (4.3); learn the rounds and radio them | B takes none of A's cards; the entries are blind without scouting | B's ground floor, roof, the timing of each entry | Bridge post; yard patrol; rain and lamps; cameras (TA2); gallery patrol; the facilities engineer's round |
| TB3 B credential, no contact | B's locker area, or the yard (S1) | Contractor card in the remote-hands technician's locker, or in their car | Take it while the owner is at the racks | Riser, meet-me and plant readers take it; the iris does not | A B-tier credential without TA4 | B ground rounds officer; the technician's return; yard patrol |
| TB4 Take position | Mantrap lobby, B's roof at the shaft, or the carrier riser | (4.1, 4.2) | Be at an entry with what it needs | Entry is not a place to look for a card | The entry | The watchers at that entry |
| 5 Secure zone, the meeting point | B: data hall or meet-me room | Roof shaft or carrier riser (4.1) | Enter with one thing from each track. Completion is a zone trigger: ASK-2 | Needs TA or TB items (4.1) | The hall, Pell's cage, the meet-me room | Pair; cameras; the shaft grille alarm |
| 6 Tap | B meet-me room (S7) | Pell's patch panel under his cage number; passive fibre tap | Fit the tap: objective type plant (F28), held interact; kind and hold time ASK-4 | Needs the cage number (TA3) and 5 | The tap's capture; the generator test starts (Q1) | Contractor at the panel; roaming officer; hold noise (F19) |
| 7 Exfiltration | Yard (X) | Generator test in B's generator hall, the facilities engineer, returning van driver, duty engineer | Reach the extract point (F27 "extract", F28 type extract), leaving by the vehicle gate or the loading apron (P02 places it), not back over the lane fence | Only after the tap; the test noise is the cover | End of mission; SUNDOWN reveal | Facilities engineer, returning driver, yard patrol; sensor lamps |

### 4.1 Ghost solutions
Ghost = never detected (no civilian may see the player either), no alarm, nobody knocked out, killed or grabbed. Every objective has a no-contact solution, solo and with the team split: a split player needs the radioed intel, never the other player's hands.
| Obj | Ghost solution | Louder alternatives |
| --- | --- | --- |
| 1 | Dark wall, over the lane fence at a quiet gear, slow past the yard sensors | Shoot the sensor lamps or run the fence (noise, guards investigate) |
| TA1 | Enter A by the admin office window left ajar, or the goods-in door in the loader's gap; take the master card from the manager's drawer on his walk, between passes of the cleaner | Takedown (card taken); clone-by-grab |
| TA2 | Panel in the CCTV equipment room (master-card reader, off the cleaner's round, out of the operator's sight): Loop cameras, Beams off | Take the operator down and use the desk; shoot cameras (a manned desk sends a guard) |
| TA3 | Customer file and key log in the records room (master card), while the cleaner works the other floor; radio the cage number and the PIN | Read the ops terminal with the engineer and NOC operator present (they flee and raise the alarm); grab the engineer |
| TA4 | The PIN at the key safe, cameras already looped | Clone a B-tier card by grab |
| TB1, TB2 | Bridge in the post's gap, or the pipe rack, B's roof or the tunnel (none needs a reader); scout from the rack, the roof or the gallery's glass | Fire-alarm lock release (alarm) |
| TB3 | The contractor card from the locker while the technician is at the racks, or from their car in the yard | Clone-by-grab from the mantrap post |
| TB4, 5 | Roof shaft: roof key (TA4) and B's roof (TB1); isolate the grille's contact with the key, unbolt it, rappel in. Or carrier route: manhole, vault, tunnel, riser; riser door takes the card (TB3 or TA4) or PIN; riser room camera looped (TA2). The mantrap has no ghost route | Grab the engineer or manager to the iris; fire-alarm release (alarm); break the grille (alarm) |
| 6 | The meet-me reader takes the B-tier card or PIN (or arrive by the riser); trip cooling to draw off the roaming officer and the facilities engineer; fit the tap from the side the contractor's seat does not see | Take the contractor down; clone a B-tier card by grab |
| 7 | Back down the riser, along the tunnel, up the manhole into the yard, then to the vehicle gate or loading apron under the test noise | Out of the hall's equipment door (opens from inside, alarmed); a run across the yard |

### 4.2 Control ladder
| Boundary | Real control | Knowledge gate | Ghost solution | Louder alternative | Civilians in the way, and the answer |
| --- | --- | --- | --- | --- | --- |
| Lane to yard | Perimeter fence; PIR lamps | - | Dark wall, quiet gear, slow | Shoot the lamps | None outside |
| Yard to A | Locked doors, latched windows, van at goods-in | - | Ajar admin window; goods-in gap | Break a window (noise) | Cleaner in the offices: go in during their pass at the far end |
| A ground floor to the security zone | Master-card readers: security room, CCTV room, key safe room | Where the card is | Drawer card | Takedown; clone-by-grab | Cleaner's trolley marks where they are (4.4); the security zone is off their round |
| CCTV room panel | Reader, then a held panel action | - | Loop cameras, Beams off, unseen | Shoot cameras; take down the operator | None; the room is off the round |
| A ground floor to first floor | Fire stair, ops and records readers | Cage number is in the records | Master card; records file | Grab the engineer | Engineer and NOC operator face their screens in the ops area: the records corridor is outside their view; the cleaner works one floor at a time |
| Link bridge | Reader at each end; post on B's side; camera | B end takes the B-tier card (key safe, PIN in the key log) or the escort PIN (engineer's locker note) | Cross in the post's gap, or skip the bridge by the roof or the pipe rack | Fire alarm releases the magnetic locks (alarm); clone-by-grab | None on the bridge |
| B mantrap | Outer door B-tier card or PIN; inner door card plus iris | Who is enrolled (register: engineer, manager) | None through it: skip by the fire stair and roof, or the carrier route | Grab an enrolled person to the iris; fire-alarm release (alarm) | Not on the ghost route |
| B roof to hall | Bolted, alarmed cooling shaft grille | Maintenance key (key safe room), key switch box beside the grille | Isolate with the key, unbolt, rappel | Break the grille (alarm) | The facilities engineer's plant round leaves the roof stair empty for a gap (4.4) |
| Hall aisles | Cameras, pair, lit aisles, beams | The pair's round | Cameras looped; switch bank on the gallery; underfloor void | Shoot the aisle lights | Technician at the racks, tenant pair at their cage: cross in the dark aisle, the void, or by the pair's open cage door (4.4) |
| Hall to meet-me room | Reader | B-tier card or PIN | As the bridge | Clone-by-grab from the mantrap post | None |
| Carrier entrance | Manhole cover (lift noise F19); riser door reader | Where the manhole is (LANTERN); B-tier card or PIN | Lift while the yard patrol is away; B-tier card or PIN at the riser door | Run the yard | Facilities engineer's round passes the riser room: time the gap |
| Meet-me room to Pell's panel | Contractor, roamer, camera | Cage number | Lure, gap, blind side | Take the contractor down | The cooling lure pulls the facilities engineer too |

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

### 4.4 Civilian opportunities (options, never the only way; ghost needs the civilian away or facing elsewhere)
- Technician props a door with a wedge while carrying kit in (B's plant corridor reader): ghost, in the gap before they return.
- Technician's badge in a jacket over a chair in customer staging (B ground): ghost, a B-tier credential (TB3). Louder: grab the technician (rating cost).
- The plant round leaves the plant corridor and roof stair empty for a gap: ghost, reach the roof (TB1, TB4). Louder: lure the facilities engineer with the cooling trip.
- Cleaner's trolley parked in a corridor shows where the cleaner is and holds a door ajar, a ghost pass of one A reader. Louder: take the cleaner down (rating cost).
- Tenant pair's cage door left open during their work: ghost, a gap across the aisle toward Pell's cage.

## 5. Optional objectives
| Objective | Room | Why the record or label is there | Player does |
| --- | --- | --- | --- |
| Copy Pell's cage access log | Security room desk | Access-control software logs every swipe at the hall and the cage door; the desk workstation holds the history (general knowledge) | Terminal, objective type download (F27, F28) |
| Photograph his rack's labels | Data hall, Pell's cage | Cages are wire mesh so staff can audit them, and fibre is labelled at both ends for the engineers who patch it (general knowledge) | Interactable intel (F27, F28), through the mesh |

## 6. Beats
Zones are P02's fixed program numbers: 1 site, 2 reception, 3 controlled, 3+ restricted, 4 secure, 5 high security. Which space gets which number is a proposal for P02 to confirm: S1 and X 1, S2 2, S3 3+, S4 3, S5 3 (bridge, lobby) to 4 (corridor, gallery), S6 4, S7 5. Tension chart: 1,3,2,4,3,4,3,5,4,5. Each peak (B4, B6, B8) is followed by a release; each high route rejoins inside its own space (LD 3). Shape: B1-B2 shared, then Track A (B3-B5) and Track B (B6-B7) in parallel, meeting at B8, then the tap (B9) and the way out (B10). Solo plays them in order. Teach, test, twist: B1-B3 teach, B4-B9 test (B9 tests precision), B10 is the twist (the yard learnt in B2 has changed). A player on the carrier route skips the bridge and rappel; times follow the roof-shaft route.
| # | Place and zone | Track, obj | Player wants | In the way | Teaches | Mood | T | Min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 Insertion | Lane and fence, zone 1 | both, 1 | Over the fence unseen | Sensor lamps just inside; a camera-free dark wall | Crouch gears and noise | Wet, exposed, quiet | 1 | 3 |
| B2 The yard | Yard, gatehouse, A's goods-in bay, van, technician's car, manhole; zone 1 | both (TB3 option) | A way into A, or toward B | Gatehouse officer, patrol, van driver, camera over goods-in | Making darkness: lamps, switches, a camera's frame | Watchful; a working yard | 3 | 5 |
| B3 A ground floor | Reception, admin offices, manager's office, post and locker rooms; zone 2 | A, TA1 | The master card | Manager, rounds officer, reception officer, cleaner, lit rooms | Windows, corridor ceiling voids, hiding; takedown as the loud option | Dim, ordinary, tense | 2 | 3.5 |
| B4 Security room | Security room, CCTV room, key safe room; zone 3+ | A, TA2 | Blind cameras and beams | Operator, supervisor's rounds window, monitor wall | Cameras, the desk and panel, readers | Cold blue glow, cramped | 4 | 5.5 |
| B5 A first floor | Ops office, records, plant gallery, risers; zone 3 | A, TA3, TA4 | The cage number and key safe code, then the key safe | Patrol, escort, ops desk officer, engineer, NOC operator, cleaner, beams | Beams, pipes over the plant corridor, riser ladder | Loud plant, noise helps | 3 | 4.5 |
| B6 Link bridge | Bridge, A and B ends, with its roof and the pipe rack outside; zone 3 | B, TB1 | Reach B unseen | Post on B's side, readers, camera; outside: rain, yard patrol, lamps | Readers at a post, smoke vents, the pipe rack | Glass, rain, long sightlines | 4 | 3.5 |
| B7 B secure floor | Lobby, mantrap, secure corridor, gallery, locker area; zones 3-4 | B, TB2-TB4 | Scout, a B credential, a position at an entry | Bridge post, mantrap post, gallery patrol, B ground rounds officer, facilities engineer, technician | The mantrap and iris, and the way around it | Hushed, watched | 3 | 4 |
| B8 Data hall | Hall, Pell's cage, underfloor void; zone 4 | meet, 5 | Cross the hall to the meet-me room | Pair on rounds, technician, tenant pair, cameras, long lit aisles | Rappel, hall lights, the underfloor void | Clinical, humming, exposed | 5 | 5.5 |
| B9 Meet-me room | Meet-me room and riser room; zone 5 | 6 | Tap Pell's panel | Contractor at the panel, roaming officer | The held tap beside a watcher | Small, cold, precise | 4 | 4 |
| B10 The way out | Riser, tunnel, vault, manhole, yard to the vehicle gate or loading apron; zone 1 | 7 | Leave by a different path from the entry | Same yard, now with facilities engineer, returning driver, generator roar | Set piece: everything combined | Release into dread | 5 | 4 |
## 7. Mechanics
Only mechanics in 00-facts.md. Every row names a real element. "-" means no further use.
| Mechanic | Taught | Tested | Combined | Real element, or not used |
| --- | --- | --- | --- | --- |
| Darkness and light meter | B1 | B2 | B8 | Dark yard, lit windows, white-lit hall |
| Crouch gears and noise | B1 | B2 | B10 | Fence rattle (F14, B1); sensor-lamp speed limit (S0); generator masking only if ASK-7 |
| Fence | B1 | B6 | - | The lane fence; the mesh fence round the plant compound at the pipe rack's foot |
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
| Drainpipes, ledge hang and shimmy | B2 | B10 | - | Downpipe on the goods-in wall; the cill ledge beside it (hang and shimmy to the window); the plinth ledge under the link bridge |
| Vault, mantle, drops | B2 | B10 | - | Vault: the bollard rail at goods-in; mantle: the loading dock edge; drops: canopy edge to the bay (B2), plant gantry (B5), bridge roof to the rack (B6) |
| Wall jump | B2 | B5 | - | Goods-in canopy lip; plant gantry lip |
| Split jump | B2 | B10 | - | Service strip between the boundary wall and B's outer wall (needs F08 width and height) |
| Ladders | B5 | B6 | - | Fixed steel ladder to the plant gantry; to the pipe rack |
| Horizontal pipes: hands, legs up, inverted | B5 | B6 | B8 | Hands: chilled-water pipes over the plant corridor. Legs up: the pipe rack's long run between the buildings (a ghost route, TB1). Inverted: the underside of the CRAC pipework along the hall wall |
| Rappel | B8 | - | - | Hoist beam above the roof cooling shaft, down into the hall |
| Crouch voids | B3 | B5 | B8 | Corridor ceiling voids over A's floors; the hall underfloor void (level U); the low stretch of the service tunnel where the duct banks cross |
| Riser ladders | B5 | B9 | - | Cable riser between A's floors; the carrier riser to the meet-me room |
| Smoke vents | B6 | B7 | - | Vents at the top of A's and B's fire stairs, onto the roof |
| Windows | B2 | B3 | - | Ground-floor office windows in A (the hall and meet-me room have none, general knowledge) |
| Co-op boost | B2 | B10 | - | Goods-in canopy roof edge (F33 lip window), also solo-reachable by the downpipe |
| Human ladder | B6 | - | - | The pipe rack ladder's anti-climb lower section is out of reach (general knowledge); a team lifts one up, solo uses the downpipe and the bridge roof |
| Zip line | not used | - | - | Not used: saved for a future mission (Michael, 2026-10-11) |

## 8. Time budget
Assumptions: moving = crouched gear 3, 1.3 m/s (F18), including climbs, shimmies and holds. Watching and waiting = one patrol cycle at each vantage (0.75 min, the F30 upper bound of 45 s) plus gap waits (3-8 s each) and set waits (supervisor leaves, lure reset).
| Beat | Moving min | Watching and waiting min | Total |
| --- | --- | --- | --- |
| B1 Insertion | 1 | 2 | 3 |
| B2 The yard | 2 | 3 | 5 |
| B3 A ground floor | 1.5 | 2 | 3.5 |
| B4 Security room | 1.5 | 4 | 5.5 |
| B5 A first floor | 2 | 2.5 | 4.5 |
| B6 Link bridge | 1.5 | 2 | 3.5 |
| B7 B secure floor | 2 | 2 | 4 |
| B8 Data hall | 2 | 3.5 | 5.5 |
| B9 Meet-me room | 1.5 | 2.5 | 4 |
| B10 The way out | 2 | 2 | 4 |
| Total | 17 | 25.5 | 42.5 |
Solo 42.5 min (35-45, RULES 2). Split team: about 36-39 min: 8 shared (B1-B2), Track A 13.5 (B3-B5) with Track B 7.5 (B6-B7) in parallel, meeting at 22-25 min (B's inside work waits for the cameras, TA2), then 13.5 (B8-B10). Check: 17 min at 1.3 m/s is 1326 m, 2.0 to 2.9 times the 450-650 m critical path (RULES 2), a fair allowance for retreats and second looks. A player who knows the map moves 4.2-6.0 min at crouched gear 4 (1.8 m/s), plus about 8 min of waits that cannot be skipped: 12-14 min (RULES 2).

## 9. Co-op
- Highlight, B4 with B6-B7 (split across the buildings): player A in Building A's security room loops Building B's cameras (6 s hold; cut takes 2 s and is noticed 10 s after the desk is manned, S0) as player B crosses the bridge and the secure floor. A reads the records and radios the cage number and PIN. Solo: do TA2 first, loop, walk over and cross.
- Second moment, B8, data hall (one kills the lights, one crosses): the aisle lights are on a switch bank on the gallery. One player switches them off; the pair sees the change (bible 5) and walks to the bank; the other crosses the dark aisle; the first hides on the gallery or in the underfloor void and rejoins. Solo: switch off, hide on the gallery or in the void while the pair investigates, then cross; or skip the bank and cross by the void.
- Team moves: B2, one player boosts the other to the goods-in canopy roof edge (F33 lip window), an overwatch run above the yard patrol ending in a drop to the bay; solo uses the downpipe or the shadow route. B6, a human ladder to the pipe rack ladder; solo uses the downpipe and bridge roof.- Player count never changes guard count (bible P6).

## 10. Mission rules
- Detection: suspicious, then investigating, then alert, then search (bible 3). Alarm level 0-3: 1 torches, 2 helmets and tighter patrols, 3 reinforcements. Cameras, the desk and beams only call existing enemy functions (S0 section 10). No instant fail.
- Fails: killing any civilian (bible 5.7; knocking one out costs rating); all players down reloads the last checkpoint. Alarms never fail the mission (Q4).
- Ghost (rating bonus): `noAlarms`, `noKills`, no detections (rating counts detections; "undetected" is not a rule, ASK-11), `noBodiesFound`, nobody knocked out and nobody grabbed (the last two are new counters, ASK-15). No civilian may see the player either (they flee and raise the alarm, ASK-17). Guards investigating a noise, a light or a plant fault is allowed if they never see anyone. The cooling trip is a plant fault, not an alarm; the fire alarm, the gas suppression warning and anything that raises the alarm level are alarms.
- Every objective has a ghost solution (4.1). Takedown, grab, clone-by-grab and the fire-alarm lock release are louder alternatives, never the only way.
- Lure: Trip cooling (S0, 2 s hold, 4 m noise) pulls the facilities engineer and two calm guards for a short while; it resets after 120 s.
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
- ASK-16: the civilians' employers (monitoring contractor, cleaning firm, remote-hands firm, tenant firm) are generic labels; story.md names none.
- ASK-17: whether civilians count towards the awake cap (F21), and that a civilian seeing the player counts as a detection, are for S5 and S6. TALLY's radio line (section 11) says the duty engineer comes running; the cooling trip now pulls the facilities engineer.
- ASK-18: Optional later: a player at the security desk views camera feeds to guide a partner (S1 Part B scope).
- ASK-19: the fix 6 moves (hands, legs-up and inverted pipes, hang and shimmy, vault and mantle, drops, human ladder) are named from Michael's list; their F numbers and size limits are not checked against 00-facts.md in this revision.

## 13. Questions for Michael (answered 2026-10-10)
1. Triggers: assume the bible 5.8 triggers and actions. Objective 1 completes on a zone trigger; completing objective 6 starts the generator test (ASK-2 closed).
2. Carrier route: yard manhole, vault, riser to the meet-me room's own reader door (the tunnel and campus added 2026-10-11).
3. Weapons: all guards carry sidearms (16 then, 20 now; ASK-12 closed).
4. Alarm fail: alarms never fail the mission; only killing the civilian does.
5. Dormant guards: left to P07. Proposal in ASK-5 is a default only.

Downstream: P02 must confirm the space-to-zone mapping in section 6, place the loading apron or vehicle gate, the carrier manhole, the CCTV equipment room beside the security room, the key safe room, the locker room, the link bridge and the pipe rack. P03B and P03R must recheck the beats and the three secret roofs (vent, bridge roof, rack). P04S must recheck: panel in the CCTV room (ASK-3), the riser door on the B-tier card or PIN (ASK-9), the grille key switch (ASK-13), bridge readers and the post, and that beats B5 and B9 each have a live beam. S2 must recheck the PIN intel flag, the B-tier card and the key safe (ASK-14). P07 must recheck the 20 guards and 8 dormant (ASK-5), the bridge post gap and that the S7 roamer covers the riser door. P08 must recheck the hall highlight (section 9) and the ghost counters (ASK-15). Downstream (civilians, tracks): P02 must place the technician's locker and the car spot, the ops monitoring desk, the cleaner's trolley bay, the tenant cage, customer staging and B's plant corridor door. P04S must recheck the riser room camera, the B ground rounds officer and the technician's wedged door. P07 must recheck 20 guards (the generator test technician post became the B ground rounds officer) and seven civilians' routines. P08 must recheck the two tracks, the split-team highlight and civilian counters. S5 and S6 must recheck the awake cap (ASK-17). RULES 2's roster-by-space sentence is superseded by section 3.

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
| 2026-10-11 | 1, 5, 6, 8 | RULES.md: section 2 (guards and civilians), 12 (S6), 1 (traversal bullet, two-tracks bullet, objective list wording) | done |
| 2026-10-11 | 2, 3, 4, 6, 7 | Sections 1, 2, 3 (seven civilians, B ground rounds officer, behaviour), 4 (obj 7), 4.1, 4.2 (civilian column), new 4.4, 7 (fence, ledge, vault and mantle, pipes, tunnel crawl, human ladder, zip line), 10 (fails, ghost, lure), 12 (ASK-16, 17, 19) | done |
| 2026-10-11 | 8 | Sections 4 (tracks table), 4.1, 6 (track column, beats), 8 (42.5 min, split team), 9 (highlight), 12 (ASK-18), downstream | done |
