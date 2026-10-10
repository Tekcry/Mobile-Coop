# Kestrel - mission brief (Dead Line)
Status: DRAFT

Short names: story = docs/story.md, S0 = S0-security-spec.md, F = 00-facts.md, LD = docs/level-design.md. S1-S6 = the six guarded spaces, X = exfiltration, B1-B8 = beats. No coordinates, sizes or routes here.

## 1. Fixed by the story
| Fact | Source |
| --- | --- |
| Site: Cinder Yard, run by Ostler Colocation, on the old goods yard in Kestrel, under the viaduct | story header, 6.1 |
| Pell's cage is rented by Ansell & Crowe Ltd. Pell relays orders; he does not steal data | story 5, 6.1 |
| LANTERN pulled the first fibre into the building in 2003, through the carrier entrance under the yard; her cable is still in it | story 4, 8 |
| Objective line: card, cameras, cage; tap his line; out through the yard | story 8 |
| Entry is over the lane fence; the yard lights are on motion sensors | story 8 |
| A van is being loaded in the yard; its officers are Pell's extra cover | story 6.1, 8 |
| Moth is on the depot roof across the lane | story 8 |
| Rain, at night | story 3, 6.1 |
| The weekly generator test is due before dawn; the exit is made while it runs | story 6.1 |
| Tripping the data hall cooling pulls staff away: a lure, never a way in | story 6.1, RULES 1 |
| Guards are contracted security who believe they protect a business; 16 are on site because Pell paid for extra cover | story 5, 6.1 |
| One civilian, the night duty engineer, the one Ostler employee on shift. Never kill them | story 6.1, bible 5.7 |
| Closing line: the tap's first capture arrives as the team crosses the yard. SUNDOWN, nine nights, failover units "already delivered" | story 6, 6.1, 8 |

## 2. The night
- Cinder Yard, Ostler Colocation's data centre. A Tuesday in late November, 01:10 start, window to 02:10 (ASK-1). The clock is display only; nothing happens when it passes (no forced timer).
- Steady rain. A thin waning moon behind cloud, so the yard has no moonlight. The only light is the sensor-switched yard lamps, the gatehouse and glow from windows.
- A normal Tuesday inside: cooling hum, tenants' cages quiet, the generator's weekly test due before dawn, the duty engineer the only Ostler employee on shift.
- Tonight is not normal: Pell is closing out a handover. His cage is being re-equipped, crates go out through the goods-in bay and a van is being loaded in the yard.
- That is why there are 16 guards: Pell paid for extra cover (story 6.1). It is the van crew, a private contractor at his patch panel, and extra rounds. The guards do not know what he is. The van is a distraction; the traffic is the point.
- "Dead Line" is Peg's joke: a fibre nobody seems to use.

## 3. People
Spaces: S1 yard, S2 ground-floor offices, S3 security room, S4 ops and facilities, S5 mantrap and data hall, S6 meet-me room. Armed = sidearm (Q3). Roster is RULES section 2.
| Role | n | Space | Employer | Job tonight | Most of the night in | Armed |
| --- | --- | --- | --- | --- | --- | --- |
| Gatehouse officer | 1 | S1 | Guarding firm | Signs vehicles in and out, watches the lane gate and the yard monitor | Gatehouse | yes |
| Perimeter patrol | 1 | S1 | Guarding firm | Fixed loop of fence line and yard; checks the sensor lamps | Yard | yes |
| Van driver | 1 | S1 | Guarding firm, extra post paid by Ansell & Crowe | Carries crates from goods-in to the van | Yard, goods-in bay | yes |
| Rounds officer | 1 | S2 | Guarding firm | Tries doors and checks windows on a fixed round | Ground-floor offices | yes |
| Duty manager | 1 | S2 | Guarding firm | Shift manager: signs the log, holds the master card, walks to reception and back each cycle | His office | yes |
| Desk operator | 1 | S3 | Guarding firm | Watches the monitor wall, takes radio calls | Security room | yes |
| Supervisor | 1 | S3 | Guarding firm | Leaves on a rounds loop through ops and the hall door, then returns | Security room, then rounds | yes |
| Corridor patrol | 1 | S4 | Guarding firm | Walks the ops and facilities corridors | Ops and facilities | yes |
| Escort officer | 1 | S4 | Guarding firm | Shadows the engineer on plant checks (lone-worker rule); otherwise stands at the ops corridor door | Ops and facilities | yes |
| Mantrap post | 1 | S5 | Guarding firm | Checks cards, logs entries | Mantrap vestibule | yes |
| Talking pair | 2 | S5 | Guarding firm | Walk the hall aisles together, stopping to talk | Data hall | yes |
| Pell's private contractor | 1 | S6 | Ansell & Crowe Ltd (post paid for the handover) | Watches his client's patch panel, logs who enters | Meet-me room | yes |
| Roaming officer | 1 | S6 | Guarding firm | Loops the meet-me room and the carrier-side corridor | Meet-me room and approaches | yes |
| Generator test technician | 1 | X | Guarding firm (trained facilities officer; the engineer is the only Ostler employee) | Runs the weekly generator test | Staff rest room until the test | yes |
| Returning van driver | 1 | X | Guarding firm, extra post paid by Ansell & Crowe | Second officer of the van crew; off site on the lane run, walks back to sign the van sheet | Off site until the test | yes |
| Night duty engineer (civilian) | 1 | S4 | Ostler Colocation | Watches the building-management screens, signs off the generator test; the only person iris-enrolled for the hall | Ops office | no |
Total 16 guards + 1 civilian. At most 12 awake (F21): the four asleep at the start are the S6 pair and the exit pair (P07 chooses, Q5). The bible's civilian rules (flee to the nearest guard or alarm and raise it; never fight; killing fails the mission) are followed. The engineer's grab for the iris is the S0 civilian-grab ASK (ASK-8).

## 4. The objective chain
(general knowledge) How a circuit reaches a tenant's cage:
1. A carrier's fibre runs in underground ducts under the street to a chamber outside the building.
2. It enters through sealed ducts into the carrier entrance room, where the carrier's own equipment ends the line.
3. From there it is patched into the meet-me room: rows of patch panels where carriers' and tenants' fibre ends are brought together.
4. A cross-connect is a short fibre jumper the operator's technicians run between two panel ports, one on a carrier or tenant, one on the customer's panel. It is ordered, labelled and billed per circuit.
5. Fibre in overhead trays then runs through the data hall to the tenant's cage or rack panel.
6. A broker sells private links: each party orders a cross-connect to his panel, so traffic never touches the public internet and the only record is the order. His circuits sit side by side in the meet-me room, labelled by cage number.
7. A passive tap is an optical splitter clipped into one jumper. It copies a share of the light without breaking the line. It goes on the patch end in the meet-me room because the cage is locked mesh under cameras.

| # | Room | Person, record or device | Player does | Why now | Unlocks | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Inside the perimeter | Lane, perimeter fence | Lane fence (F14); sensor lamps | Climb the fence into the yard. Completion is a zone trigger: ASK-2 | First step; nothing else is reachable | The yard | Sensor lamp trips; fence rattle at gears above 3 |
| 2 Keycard | Duty manager's office (S2) | Duty manager's master card | Take card from his desk drawer while he is on his walk (S0 "Take card"); or takedown (card taken automatically); or clone card from a grabbed manager | The security room door needs it; nothing earlier carries a reader | Security room, ops, mantrap and vault readers | Manager returns; rounds officer; a revoked card if a holder body is found while the desk is manned |
| 3 Blind the security room | Security room (S3) | Intrusion panel beside the desk; the monitor wall | Panel holds: Loop cameras or Cameras off, and Beams off (S0). Completion rule ASK-3 | Cameras and beams cover ops, mantrap and hall; they must be dealt with before S4 | Safe movement through S4-S6 | Desk operator in the room; supervisor away only part of the cycle; "off" is noticed 10 s after the desk is manned |
| 4 Pell's cage number | Ops office (S4) | Ostler's cage and cross-connect register on the engineer's monitoring terminal, behind the ops reader | Terminal (F27) reading, objective type intel (F28) | Needs the card (2) and unwatched corridors (3). The register also shows who is iris-enrolled | Cage number, the meet-me panel ports, the engineer as the iris key | Engineer is at the terminal (civilian: flees and raises the alarm); corridor patrol; escort officer |
| 5 Secure zone | Mantrap and data hall (S5) | Mantrap with card and iris; the night duty engineer | Hold the engineer (grab), swipe the card, then Scan eye (S0). Alternative: carrier entrance below | Both factors need a card (2) and a grabbed enrolled person (4 identifies him) | The hall, Pell's cage, the meet-me room | Mantrap post; the pair; a seen grab; the engineer must stay conscious |
| 6 Tap | Meet-me room (S6) | Pell's patch panel under his cage number; passive fibre tap | Fit the tap: objective type plant (F28), held interact; kind and hold time ASK-4 | Needs the cage number (4) and the secure zone (5) | The tap's capture; the generator test starts (Q1) | Pell's contractor at the panel; roaming officer; hold noise (F19) |
| 7 Exfiltration | Yard (X) | Generator test, technician, returning van driver, engineer | Reach the extract point (F27 "extract", F28 type extract) | Only after the tap; the test noise is the cover | End of mission; SUNDOWN reveal | Five officers and the civilian in the yard; sensor lamps |
Carrier entrance (objective 5 alternative): a cable chamber under the yard, entered from a stair in the facilities area, with no guards (nav depth rule, F22). Its doors take the master card (ASK-9). Whether it passes Space 5 is Q2. The yard hatch opens from inside only.

## 5. Optional objectives
| Objective | Room | Why the record or label is there | Player does |
| --- | --- | --- | --- |
| Copy Pell's cage access log | Security room desk | Access-control software logs every swipe at the hall and the cage door; the desk workstation holds the history (general knowledge) | Terminal, objective type download (F27, F28) |
| Photograph his rack's labels | Data hall, Pell's cage | Cages are wire mesh so staff can audit them, and fibre is labelled at both ends for the engineers who patch it (general knowledge) | Interactable intel (F27, F28), through the mesh |

## 6. Beats
Zones (proposal; P02 fixes them, ASK-10): Z0 public lane, Z1 perimeter and yard, Z2 staff offices, Z3 controlled (security room, ops and facilities), Z4 secure (mantrap, hall, meet-me room). Tension chart: 1,3,2,4,3,5,4,5. Each peak is followed by a release; each high route rejoins inside its own space (LD 3).
| # | Place and zone | Obj | Player wants | In the way | Teaches | Mood | T | Min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 Insertion | Lane and fence, Z0 to Z1 | 1 | Get over the fence unseen | Sensor lamps just inside; a camera-free dark wall to follow | Crouch gears and noise (fence, sensor lamps) | Wet, exposed, quiet | 1 | 3 |
| B2 S1 | Yard with gatehouse, goods-in bay, generator compound, van; Z1 | - | Reach the goods-in bay or a window | Gatehouse officer, patrol, loader at the van, a camera over goods-in | Making darkness: lamps, switches, a camera's frame | Watchful; a working yard | 3 | 6 |
| B3 S2 | Ground-floor offices: reception, admin office, duty manager's office; Z2 | 2 | A card to open the security room | Manager, rounds officer, lit rooms | Takedown from behind, hiding bodies, taking a card | Dim, ordinary, tense | 2 | 4 |
| B4 S3 | Security room; Z3 | 3 | Blind cameras and beams | Operator at the desk, supervisor's rounds window, monitor wall | Cameras, the desk and panel | Cold blue glow, cramped | 4 | 6 |
| B5 S4 | Ops office, plant gallery, switch room; Z3 | 4 | Read the cage number | Patrol, escort, engineer at the terminal, beams | Beams, with the pipe route over them | Loud plant, noise helps | 3 | 5 |
| B6 S5 | Mantrap vestibule and data hall; Z4 | 5 | Open the inner door with card and iris | Mantrap post, pair on rounds, long lit aisles | Grab and iris, hall lights | Clinical, humming, exposed | 5 | 6 |
| B7 S6 | Meet-me room; Z4 | 6 | Tap Pell's panel | Contractor at the panel, roaming officer | The held tap beside a watcher | Small, cold, precise | 4 | 4 |
| B8 X | Yard, back to the lane; Z1 to Z0 | 7 | Cross the yard and leave by the lane | Same yard, now with technician, returning driver, engineer, generator roar | Set piece: everything combined | Release into dread | 5 | 3.5 |
Teach, test, twist: B1-B3 teach, B4-B6 test with combinations, B7 tests precision, B8 is the twist (the yard learnt in B2 has changed). Counts as in section 3.

## 7. Mechanics
Only mechanics in 00-facts.md. Every row names a real element. "-" means no further use.
| Mechanic | Taught | Tested | Combined | Real element, or not used |
| --- | --- | --- | --- | --- |
| Darkness and light meter | B1 | B2 | B7 | Dark yard, lit windows, white-lit hall |
| Crouch gears and noise | B1 | B2 | B8 | Fence rattle (F14), sensor-lamp speed limit (S0); generator masking only if ASK-7 |
| Fence | B1 | B8 | - | The lane fence |
| PIR lights | B1 | B2 | B8 | Yard lamps on motion sensors |
| Light switches | B2 | B4 | B6 | Yard lighting box on the gatehouse wall; hall switch bank |
| Shooting lamps | B2 | B5 | B8 | Yard floods; corridor ceiling fittings |
| Cameras | B2 | B5 | B6 | Fixed camera over goods-in (first), corridor and hall cameras |
| Desk and panel | B4 | B5 | B6 | Security room desk and intrusion panel |
| Card readers | B3 | B4 | B6 | Readers on security room, ops, mantrap and vault doors |
| Takedown, drop attack | B3 | B5 | B6 | Behind in the offices; drop from the plant gantry onto the corridor |
| Grab | B6 | B7 | - | Engineer to the iris; clone from a grabbed manager (B3 option) |
| Hiding bodies | B3 | B5 | B6 | Comms cupboard, janitor's cupboard |
| Mantrap and iris | B6 | - | - | Mantrap and iris at the hall; carrier route is the counter |
| Beams | B5 | B6 | B7 | Plant corridor, hall approach, meet-me approach. Rule for P04S: at least one beam in B5 and one in B7 is on no panel, so beams are met live |
| Drainpipes, ledges | B2 | B8 | - | Downpipe and cill ledge on the goods-in wall; generator compound roof edge |
| Wall jump | B2 | B5 | - | Goods-in canopy lip; plant gantry lip |
| Split jump | B2 | B8 | - | Service gap between the boundary wall and the generator compound wall (needs F08 width and height) |
| Ladders | B5 | B8 | - | Fixed steel ladder to the plant gantry; to the compound roof |
| Horizontal pipes | B5 | B6 | - | Chilled-water pipes over the plant corridor; CRAC pipework along the hall wall |
| Windows | B2 | B3 | - | Ground-floor office windows (admin rooms have windows; hall and meet-me room do not, general knowledge) |
| Co-op boost | B2 | B8 | - | Generator compound roof edge (F33 lip window), also solo-reachable by the split jump |
| Human ladder | not used | - | - | Boost covers the one co-op lip the slice needs; a second needs a lip within the F15 grab height and no real element is named |
| Rappel | not used | - | - | Roof anchors are fall-arrest only (general knowledge); a descent would shortcut B8 |

## 8. Time budget
Assumptions: moving = crouched gear 3, 1.3 m/s (F18), including climbs and holds. Watching and waiting = one patrol cycle at each vantage (0.75 min, the F30 upper bound of 45 s) plus gap waits (3-8 s each) and set waits (supervisor leaves, lure reset).
| Beat | Moving min | Watching and waiting min | Total |
| --- | --- | --- | --- |
| B1 Insertion | 1 | 2 | 3 |
| B2 S1 | 2 | 4 | 6 |
| B3 S2 | 1.5 | 2.5 | 4 |
| B4 S3 | 1.5 | 4.5 | 6 |
| B5 S4 | 2 | 3 | 5 |
| B6 S5 | 2 | 4 | 6 |
| B7 S6 | 1.5 | 2.5 | 4 |
| B8 X | 1.5 | 2 | 3.5 |
| Total | 13 | 24.5 | 37.5 |
Check: 13 min at 1.3 m/s is 1014 m, 1.8 to 2.7 times the 380-550 m critical path (RULES 2), a fair allowance for retreats and second looks. A player who knows the map moves 3.5-5.1 min at crouched gear 4 (1.8 m/s), plus about 7 min of waits that cannot be skipped: 10-14 min (RULES 1).

## 9. Co-op
- Highlight (one kills the lights, one crosses), B6, data hall. The aisle lights are on a switch bank at the hall's mantrap side. One player switches them off. The pair sees lights changed in view (bible 5) and walks to the bank. The other crosses the dark aisle. The first hides on the pipe route and rejoins. Solo: switch off, hide above or in a cupboard while the pair investigates, then cross.
- Second, smaller: B4-B5. One player at the panel cuts cameras (2 s, noticed 10 s after the desk is manned, S0) while the other crosses the camera corridor. Solo: loop the cameras (6 s hold) and cross.
- First team move, B2: one player boosts the other to the generator compound roof edge (F33 lip window). It gives an overwatch run above the yard patrol, away from the sensor lamps, ending in a drop to the goods-in bay. Solo reaches the same roof by the split jump up the service gap, or stays on the shadow route along the wall.
- Player count never changes guard count (bible P6).

## 10. Mission rules
- Detection: suspicious, then investigating, then alert, then search (bible 3). Alarm level 0-3: 1 torches, 2 helmets and tighter patrols, 3 reinforcements. Cameras, the desk and beams only call existing enemy functions (S0 section 10). No instant fail.
- Fails: killing the civilian (bible 5.7); all players down reloads the last checkpoint. Alarm-level fail: Q4.
- Ghost (rating bonus): `noAlarms`, `noKills`, no detections (rating counts detections; "undetected" is not a rule, ASK-11), and `noBodiesFound`. Knock-outs, including the civilian, cost rating.
- Every objective has a no-takedown path (P3): 2 drawer card, 3 lure then panel, 4 lure the engineer away, 5 grab the engineer (a grab is not a takedown) or the carrier entrance, 6 wait for a gap, 7 sneak.
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
- ASK-2: objective 1 is "enter the yard": a zone trigger, not in F27 or F28. See Q1.
- ASK-3: objective 3 completes when cameras are looped or off AND beams are off at the panel (proposal).
- ASK-4: the tap's interactable kind (F27) and hold time; no hold time exists in the facts.
- ASK-5: dormant guards: the wake rule for the S6 pair and exit pair (proposal: S6 pair when objective 4 completes; exit pair when objective 6 completes) is for S5 and P07.
- ASK-6: if waking the S6 pair would pass the awake cap (F21, 12), S5 decides which earlier guards go dormant again.
- ASK-7: whether the noise model can mask footsteps near the generator (F19 lists no masking). If not, the generator is a story reason only.
- ASK-8: the engineer is a civilian and must be grabbable (S0 section 11).
- ASK-9: which doors the carrier route has and whether the master card opens them (P04S).
- ASK-10: zone names Z0-Z4 are proposals; P02 fixes them.
- ASK-11: "undetected" as a ghost condition; the bible lists only the four rules.
- ASK-12: guards' kinds: whether an unarmed officer exists is not in F20 (Q3).

## 13. Questions for Michael (answered 2026-10-10)
1. Triggers: assume the bible 5.8 triggers and actions. Objective 1 completes on a zone trigger; completing objective 6 starts the generator test (ASK-2 closed).
2. Carrier route: it passes a corner of S5 (a door the talking pair's round crosses), so no space is skipped.
3. Weapons: all 16 guards carry sidearms (ASK-12 closed).
4. Alarm fail: alarms never fail the mission; only killing the civilian does.
5. Dormant four: left to P07. The proposal in the people table (S6 pair and exit pair) is a default only.
