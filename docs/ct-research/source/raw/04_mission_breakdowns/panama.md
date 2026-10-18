# Mission breakdown - Panama (Xbox/PC and PS2/GC)

## About this breakdown

**Research basis:** `research_notes/mission_panama.md` (full step tables, codes, enemy counts, 26 video links and sources).

**Main sources:**

| Code | Source | Note |
|---|---|---|
| PRIMA | Prima eGuide co-op walkthroughs | Primary route source |
| FAN | English and Russian Fandom wiki | One source |
| JV | jeuxvideo.com forum, French, 2005-06 | Many posters |
| MAN | Xbox and PS2 manuals | |
| EG | Elder-Geek | |
| NWR | Nintendo World Report | |

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. Where a row in a step table carries no tag of its own, the route comes from PRIMA alone [SINGLE SOURCE - PRIMA].

**Big picture:** the two builds share a premise but are different levels.
- **Xbox/PC:** one continuous level and the *first* real mission.
- **PS2/GC:** four sub-levels with loads between them, and the *last* mission of that campaign.
- [VERIFIED - PRIMA, FAN, JV, NWR]

---

## A. Xbox / PC

### 1. Setting and premise [VERIFIED - FAN + PRIMA]
- **Location.** A canal-authority administration building in Panama City, on the same day as the solo hero's bank mission.
- **Briefing (paraphrase).**
  - Records recovered in the solo campaign show a senior official has been taking bribes to let ships skip inspections.
  - The trainees are told they are not finished training, but no one else is available.
  - Their job is to find whatever records the official kept, and judge whether he acts alone. The "acts alone" angle is [SINGLE SOURCE - PRIMA].
- **Story link.** His dealings lead to a chemist, which sets up the Seoul mission. [SINGLE SOURCE - FAN]

### 2. Objective chain
1. **Access the archives on the top floor.** [VERIFIED - FAN + PRIMA]
2. **Access the main server.**
   - This objective appears only *after* the archive turns out to be partly deleted, so backups must be pulled from a server past the ground-floor exhibition hall. [Update text SINGLE SOURCE - FAN; server location VERIFIED - PRIMA]
3. **Exfiltrate to the truck in the courtyard,** which is also the insertion point. [VERIFIED]

**Other objective facts:**
- One optional bonus objective exists in the game text: recover information about other uninspected ships. The guide's objective box omits it. [VERIFIED - Xbox build + PC 1.05 game text; corrects the earlier reading]
- **Codes.** Door codes are gathered from emails and interrogations. Several of them open optional rooms that the guide's route does not need. [SINGLE SOURCE - FAN; "optional" is inference]
- **Hard fail.** Killing the official fails the mission instantly. [VERIFIED - game text + FAN RU]
- **Design tip in the game's own notes.** The two archive scanners are easiest with the official on one and any guard on the other, used at the same moment. If the official is unconscious, the scanner must be hacked instead. [VERIFIED - game text]

### 3. Ordered progression (guide route)

| # | Area | Obstacle and solution | Co-op element | Req/Opt |
|---|---|---|---|---|
| 1 | Courtyard | Shoot out lampposts and move through shadow to an open 2nd-floor window | - | Optional |
| 2 | Façade | Boost, then Human Ladder, through the window into a photocopy room | Boost + Ladder | Required on this route (also the exit) |
| 3 | 2F hall | Kill the lights at the switch; hack the keypad | - | Keypad required |
| 4 | Broken-elevator corridor | A camera covers it. One agent jams the overhead light while the other slips by, then they swap | Jam-and-pass | Required to stay unseen |
| 5 | Rooms → elevator | Lights off, hack a keypad, ride to 3F, shoot out the car light | - | Required |
| 6 | 3F hall | Switch off the hall lights. A guard leaves the security office to fix them; agent A grabs him | Light lure | Method optional; captive required |
| 7 | Official's office | Agent B sneaks in and grabs the official; interrogating him yields codes | **Split across the floor** | Required |
| 8 | Two-scanner door | Both force their captives into the paired retinal scanners at once, then choke them out | **Synchronized forced scan** | Required [mechanic VERIFIED - MAN, PRIMA] |
| 9 | Archive room | Lights off. One agent searches the cabinet (objective 1) while the other knocks out the guard who comes to fix the light | Role split | Search required |
| 10-11 | Far hall → ceiling | Boost + Human Ladder up through a ceiling opening (OCR order reconstructed) | Boost + Ladder | Required [UNCERTAIN order] |
| 12 | Upper halls | Shoot lights, knock out guards, pass a motion-sensor door | - | Optional methods |
| 13 | Air duct | **Hangover**: the hanging agent hacks a wall keypad that opens the exhibition-hall gates | Hangover | Required [VERIFIED - PRIMA + JV] |
| 14 | Balcony | Each agent climbs over the rail, shimmies along a ledge to the opposite balcony, then takes an elevator down | Ledge traverse (solo, in turn) | Required [VERIFIED - PRIMA + JV] |
| 15 | Exhibition hall laser grid | One agent holds the jammer on the grid's breaker box (which sits *inside* the grid) while the other crosses; then they swap | Jam-and-pass | Required [VERIFIED - PRIMA + FAN] |
| 16 | Hall to server | Shoot lights; knock out the two guards who come to investigate | Lure + KO | Optional |
| 17 | Server room | Shoot the light near the computer so the camera can't see; use the computer (objective 2) | - | Required |
| 18 | Back across the grid | Jam-and-pass again | Jam-and-pass | Required |
| 19 | Reception hall | Shoot the chandeliers; climb the stairs unseen | - | Optional method |
| 20 | Exit | Hallways back to the photocopy room, out of the window, through the shadows to the truck | - | Required |

**Off-route rooms** (from wiki lists): billiard room and lounge, two security rooms, the official's gallery and private lounge, a locker room with three guards, storage, offices, a conference room, and a guard side-room that opens only if an alarm is raised. [SINGLE SOURCE - FAN RU] How they connect is unknown. [GAP]

### 4. Spatial flow [SINGLE SOURCE - PRIMA unless noted]
- **Entry and exit.** Outdoor courtyard, then a vertical entry through a second-floor window. [VERIFIED]
- **Layers:**
  - ground floor: exhibition hall (double height, with balconies), server room, reception hall;
  - second floor: photocopy room, halls;
  - third floor: security office, official's office, scanner door, archive;
  - a crawl and duct level above the third floor.
- **One big loop.**
  - Outbound: up and in, over the ceiling, through the duct, across the balcony, down to the exhibition hall and on to the server.
  - Return: back across the grid and up the reception-hall stairs to the *same window* by a different route.
- **Chokepoints.** The camera corridor, the two-scanner door, the exhibition gates (opened only from the duct) and the laser grid (crossed twice).
- **Branches.** Optional rooms reached with codes. [SINGLE SOURCE - FAN]

### 5. Security
- **Guards.** About 22 on a full clear. [SINGLE SOURCE - FAN RU] Behaviours worth noting:
  - guards come to fix lights that were switched off (exploitable lures);
  - guard pairs chat with randomised dialogue;
  - guards on the reception stairs watch the climb.
- **Cameras.** Two: the elevator corridor and the server room. [SINGLE SOURCE - PRIMA]
- **Lasers.** The exhibition floor grid. An in-level email jokes that its emergency breaker sits inside the grid, so only a remote device could reach it. That email is the game *explaining* why the jammer is the answer. [VERIFIED - PRIMA + FAN]
- **Locks.**
  - Keypads (hack or code).
  - The two-scanner door, opened with live captives.
  - Exhibition gates keyed from the duct.
  - No remote hacking in co-op. [SINGLE SOURCE - PRIMA]
- **Other devices.** A motion-sensor door. Light switches, lampposts and chandeliers that can all be killed.
- **Civilians.** One: the official, who must survive.
- **Alarms.** Escalate through armour, then helmets, then fortified positions. [SINGLE SOURCE - FAN]

### 6. Split and regroup

| Moment | Split | Regroup / enforcement |
|---|---|---|
| Camera corridor | Short alternation | Regroup at the next keypad |
| **3F double capture** | The biggest split: agents go to opposite ends of the floor | Each must bring a *live captive* to the paired scanners, so the split is enforced by needing two bodies and the regroup by needing synchronisation |
| Archive | One searches, one guards | Same room |
| Duct Hangover | One holds, one hacks | Same spot, two levels |
| Laser grid (twice) | The jammer pins the coverer in place | They swap on the far side |

### 7. Pacing curve
1. **Quiet open.** Dark courtyard and a first boost (an echo of training).
2. **Low tension.** Keypads and switches on 2F.
3. **First peak.** The 3F double capture: two agents, two captives, one synchronized door.
4. **Reveal.** The archive is wiped, so the goal moves to the ground floor.
5. **Traversal set piece.** Ceiling, duct Hangover, then the balcony shimmy over a double-height hall.
6. **Second peak.** The laser-grid relay and the server-room camera.
7. **Long exfil.** Reverse the grid and climb the guarded stairs.

Tension never resets, because there are no automatic checkpoints (manual pause-menu saves exist on Xbox/PC). [VERIFIED - EG + game files]

**Length:**
- 100% stealth runs: 16-35 min.
- Casual runs: 41-52 min.
- Speedruns: about 8 min.
- [VERIFIED - many video lengths]

### 8. Wow moments [UNCERTAIN - no Panama-specific player quotes found; inferred from mechanics reviewers praise]
- **The official as a key.** Using the corrupt official himself as a living key in a two-man forced retinal scan.
- **Upside-down hack.** Hacking upside down inside a duct to open gates for the rest of the level.
- **Balcony shimmy.** Hand-over-hand along a ledge above a double-height hall.
- **Ghost runs.** One uploader's ghost run ("100% Elite No KO/Kill") shows the level can be cleared with zero knockouts, which demonstrates route depth. [SINGLE SOURCE - video title]

### 9. Frustrations, exploits, flaws
- **Stuck points** [SINGLE SOURCE - JV, many posters]:
  - the ground-floor grille, where players didn't realise its keypad is reached by hanging from the vent above;
  - the balcony after the Hangover, where players missed the ledge and jumped to their deaths;
  - finding the server after the archive.
- **Shock bug.** Being shocked while hacking leaves an agent invisible but unable to open doors. [SINGLE SOURCE - FAN]
- **No automatic checkpoints.** Only manual saves, which wait for the partner. [VERIFIED - EG + game files]
- **Guard glitch.** Guards sometimes trip over each other and raise unearned alerts. [SINGLE SOURCE - EG]

### 10. Loadout [SINGLE SOURCE - FAN RU]

| Agent | Kit |
|---|---|
| Agent One | Rifle 30, sticky cam 2, shocker 1, pistol 60, adrenaline 1 |
| Agent Two | Rifle 30, sticky cam 1, smoke 2, flash 2, pistol 60, adrenaline 1 |

The light kit signals a stealth mission.

### 11. Key videos (not watched)
- V339, 100%/Expert/Elite/Ghost (22:46): https://www.youtube.com/watch?v=KlU0002suD4
- Centerstrain01, 100% stealth (22:23): https://www.youtube.com/watch?v=jgsTLGSXyMc
- Defy248, full stealth (35:34): https://www.youtube.com/watch?v=631YgJdDgyg
- Agt_ Pendergast (49:34): https://www.youtube.com/watch?v=T0MMaVD_eaM
- Xbox Kai Fam, original Xbox over XLink Kai (52:18): https://www.youtube.com/watch?v=D1zUg9YGRj0

---

## B. PS2 / GameCube (four sub-levels)

### 1. Setting and premise
- **Same building.** It is the campaign *finale* on this build. [VERIFIED]
- **Different briefing.** The guide frames the official's bribery as letting illegal migrants across the border. [SINGLE SOURCE - PRIMA; R-14]
- **Rules.** Each sub-level fails on the 3rd alarm. Progress saves per sub-level. [Alarms SINGLE SOURCE - FAN; PS2/GC has no mid-mission save, VERIFIED by the gap pass]

### 2. Objectives per sub-level [VERIFIED - FAN + PRIMA]

| Sub-level | Primary | Secondary | Opportunity |
|---|---|---|---|
| Alley | Get into the archives building | Enter with no alarm | No kills; read all computers |
| East Wing | Reach the West Wing | No alarm | No kills |
| Archives | Get the archive information | Interrogate the official | No alarm; no kills |
| Server Room | Get the server files | No alarm | No kills |

### 3. Progression (guide route) [SINGLE SOURCE - PRIMA unless noted]

**Alley**
1. Insert at a truck. One agent knocks out an approaching guard.
2. The other times a turning camera, slips into a side room, knocks out a guard and reads a computer for the copy-room code. [Code VERIFIED - FAN + PRIMA]
3. Both climb the truck roof, jump to a fire escape and climb it.
4. Each rides a **zip line** to a balcony.
5. Enter the copy room with the code. One agent jams the next room's camera while the other opens the door.

**East Wing**
1. Use a sticky camera to watch a guard round a corner, then knock him out.
2. Drop down the elevator shaft onto the car roof.
3. **Shoulder-stand** to plant a charge that blows the car's trapdoor. [VERIFIED - PRIMA + FAN]
4. Reception hall: lure two guards with sticky-camera noise and gas them together.
5. From the central desk, **boost** a partner to the upper level. He jams one of two cameras so the other can take the stairs.
6. **Boost + Ladder** into a ceiling vent. Players often found it grated. A computer at the bottom of the stairs, with an email about a security drone, controls the vent, and being seen by the cameras shuts it. [VERIFIED - FAN + JV + Neoseeker/Supercheats snippets; whether it is shut by default is UNCERTAIN]
7. **Duct with relay gates.** Each agent opens the next gate for the other at a control box.
8. **Laser-floor hall** guarded by a drone that wakes if a beam is broken. Cross by hanging from narrow beams and shimmying to a thick central beam. [Drone VERIFIED - FAN + JV]
9. **Simultaneous hack** of the two retinal scanners beside the exit. [VERIFIED]

**Archives**
1. Drop to an eave, leap to a **flagpole** and slide into the courtyard.
2. Climb a dumpster and a fence to the official's window. Wait for him to turn away.
3. One agent interrogates him (gets the elevator code) while the other clears the next room using the optic cable. [Interrogation VERIFIED]
4. Ceiling crawl to the archive.
5. In the archive, flank the doorway. One agent sticks a camera near the far door and jams the wall camera; the other hacks the central computer (primary). The first gasses the guard who enters.
6. **Boost + Ladder** to the mezzanine. Hack a computer for the exhibition code and take the private elevator.
7. If a camera spots you, ceiling turrets activate. A wiki note describes a door-keypad bug. [SINGLE SOURCE - FAN RU]

**Server Room**
1. Hack a gate keypad. **Tomoe Nage** over the beams; the thrown agent hacks a retinal scanner to drop them. [VERIFIED - PRIMA + FAN RU]
2. Camera corner: alternate the jamming.
3. **Simultaneous knockout** of two seated guards. Into a duct.
4. **Hangover** down a shaft to fetch a **fuse**. Slot it to open a gate into the server room.
5. Hide at the stairs and **simultaneously take** a patrolling pair: one grabbed, one knocked out.
6. The captor walks his captive up the stairs while the partner jams the camera. The captive is forced into the scanner, which retrieves the files and ends the campaign.

### 4. Spatial flow [SINGLE SOURCE - PRIMA]

| Sub-level | Shape |
|---|---|
| Alley | Ground → vertical rise (truck, fire escape) → zip line to upper floor |
| East Wing | Descent (shaft) → double-height hall → ceiling and duct → beams over a lethal floor |
| Archives | Exterior descent (flagpole) and climb back up → interior with a mezzanine |
| Server Room | Gates and lasers → duct → vertical shaft → walkway above stairs |

A GameCube reviewer notes big spaces were broken into smaller load-separated areas, with simplified lighting. [SINGLE SOURCE - NWR]

### 5. Security
- **Cameras.** Two to three per sub-level.
- **Lasers.** Lasers plus a drone in the East Wing; beams in the Server Room.
- **Turrets.** In the Archives and Server Room. They trigger on alarms or camera sightings and cannot be disabled. [SINGLE SOURCE - FAN RU]
- **Guards.** Small counts (2-4 per sub-level).
- **Civilian.** The official.

### 6. Split and regroup [SINGLE SOURCE - PRIMA]
- **Alley.** A hard solo errand for one agent while the other waits on the truck.
- **East Wing.** A leapfrog relay through the duct gates, then a forced regroup at the paired scanners.
- **Archives.** Interrogator vs room-clearer, then a doorway flank with different jobs.
- **Server Room.** Laser separation via the throw. Vertical separation via the Hangover. Simultaneous takedown, then an escort plus cover.

### 7. Pacing
- **Alley.** A calm open with traversal flourishes.
- **East Wing.** The escalation and peak: demolition, lure-and-gas, the vent puzzle, the beam crossing under a drone, the sync hack.
- **Archives.** A story beat, exterior acrobatics, then a methodical room puzzle.
- **Server Room.** The finale, which chains three co-op moves and a synchronized takedown.

**Rest and length:**
- Load screens act as rests, though one reviewer found them too long. [SINGLE SOURCE - NWR]
- Full mission: about 30 min. [VERIFIED - two video lengths]

### 8. Wow moments [UNCERTAIN - inferred]
- **Zip line** from the fire escape.
- **Trapdoor charge** blown from a partner's shoulders.
- **Beam crossing** above a laser floor watched by a drone.
- **Flagpole** slide.
- **Upside-down fuse** retrieval.

### 9. Frustrations [VERIFIED for the vent - JV + Neoseeker + Supercheats snippets; others SINGLE SOURCE]
- **East Wing vent.** It is not obvious the vent is controlled by a computer and by the cameras.
- **Drone room.** Players couldn't reach the scanners without waking the drone.
- **Archive keypad.** The keypad and its code are bugged.
- **GameCube controls.** Some co-op inputs are hard to find.

### 10. Loadout (identical for both agents) [SINGLE SOURCE - FAN; Alley VERIFIED with PRIMA]
- Rifle 60, pistol 40, flash 1, adrenaline 2.
- Sticky cams: 1 in the Alley, 2 in the other three sub-levels.

### 11. Key videos (not watched)
- Ziggity, PS2 US, 05 Panama (31:01): https://www.youtube.com/watch?v=2FmkMk4rHQw
- SHOCK-25, PCSX2, with part timestamps (29:38): https://www.youtube.com/watch?v=ksP5rk2eJKQ

---

## C. Design reading (analysis)

1. **A living key.** The best beat in either build is a two-scanner door opened by two *captives* (a guard and the target). Infiltration, capture, a split and a synchronized finale fold into one moment. Security logic (biometric dual control) creates the co-op requirement.
2. **Diegetic justification.** An email explains why the laser breaker can only be reached remotely, so the co-op gadget answer feels authored by the world, not the designer.
3. **Mid-mission objective extension.** "The archive is wiped" turns a top-floor heist into a whole-building traverse. That doubles the level's use without new premise text.
4. **Entry equals exit, by a different path.** The loop makes the return trip fresh and keeps the exit memorable.
5. **Stuck points cluster where the solution is above the problem.** A keypad below is reached from a vent above. Players look at the grille, not the ceiling, so vertical solutions need stronger signposting.
6. **The PS2/GC build trades the loop for a chain of short set pieces,** and shows how the same verbs scale down: zip line, demolition, a relay through gates.
