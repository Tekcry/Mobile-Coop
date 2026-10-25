# Chaos Theory co-op levels - scrubbed digest

> Research record (2026-10-18): what the reference levels did, not Night Shift's rules. Where it disagrees with
> docs/DECISIONS.md, docs/VISION.md or docs/level-design.md, those win; e.g. its timers and stacked fail rules are not
> ours (2026-10-25: soft windows only in campaign and Sector Ops, timed drills allowed in Marlow Yard; G290: up to 2
> strict rules, section restart).

Digest of `source/01-coop-levels.md` (with `source/00-index.md` for conventions and `source/raw/08`, `09`, `11`, `12`
for level patterns, pacing, wow moments and anti-patterns). Written 2026-10-18 for Night Shift co-op prototype work.

**Scrubbed.** No reference-game character, gear or organisation names. The game title "Chaos Theory" (CT) and real
places are kept. Neutral words are used throughout:

| Digest word | Means |
|---|---|
| the trainees, player A / player B | the two co-op player characters (identical kit and abilities on console) |
| the solo hero | the single-player protagonist |
| the agency | the player characters' employer |
| the handler | the radio voice who briefs and guides |
| the colonel | the rogue officer who is the co-op villain from mission 4 on |
| the chemist | the scientist abducted in Seoul |
| the official | the corrupt canal official in Panama |
| the courier | the colonel's man in the Train Station |
| the intel officer | the foreign intelligence officer behind the colonel (Nuclear Plant reveal) |
| the rifle, the pistol | the standard rifle and pistol |
| the jammer | the pistol's electronics-disrupting beam (co-op form): hold the trigger to suppress a camera, light, turret or laser breaker; drains while held, refills after; stops if the user moves |
| stick-cam | the throwable wall camera (can make a noise and release gas) |
| stun dart | the stick-on stun projectile |
| mission device | the wrist computer with map, notes and intel |

**Co-op move vocabulary used below** (all are console Xbox/PC moves unless marked):

| Move | What it is |
|---|---|
| Handshake | Every co-op move: one player initiates (takes a pose, waits; an automatic voice line plays), the other walks up and completes with the same button or menu entry |
| Boost | Initiator crouches; partner is launched up to a ledge or over a wall |
| Boost-and-climb | After a boost, the boosted player hangs from the ledge and the partner climbs his body, so both arrive |
| Partner throw | Initiator stands, faces away; partner is thrown over a barrier or gap. Landing on a guard knocks him out |
| Hang-down | From a ledge, duct or roof, one holds a rope and lowers the other head-first; holder controls height with the triggers; the hanging player can hack, grab, use a sidearm or neck-snap |
| Dual rope | One holds the rope, the other rappels down or climbs up; holder steers sideways, rider controls height |
| Shoulder stand | One stands on the partner's shoulders to reach a high point; the rider can use weapons |
| Jam-and-pass | One holds the jammer on a device while the other passes; then they swap from the far side |
| Sync action | Both work two devices at the same moment (scanners, wire cuts, switches, mixing stations). Online without a headset the game syncs the two selections, so timing is relaxed |
| Captive scan | Grab a person and force him to a biometric scanner; with paired scanners, both players bring a captive |
| Joint interrogation | Both question the same captive (some codes are only given this way) |
| Free vs contextual | Free moves (boost, throw) work anywhere with room; contextual moves (hang-down, dual rope, shoulder stand) only at authored spots, via the interaction menu |

**Confidence marks** are kept on key facts, as in the source: [CONFIRMED] (two or more independent sources),
[ONE SOURCE], [INFERRED] (inference or conflicting sources), [UNKNOWN] (nothing found; open question in
`source/06-open-questions.md`). [ANALYSIS] marks the researchers' or this digest's design reading, not a fact about
the game. Source codes in brackets (PRIMA = the official strategy guide, FAN = fan wiki, GF = the game's own files)
follow `source/00-index.md` section 4.

**Main caveat.** Most room-by-room routes come from one strategy guide's "quickest perfect-score" route, so move counts
are the minimum used on that route, not every use in the map. No video was watched by the researchers. The two
download missions have no guide coverage and are thinly documented.

---

## 1. Campaign overview

### 1.1 Three different co-op campaigns

| Build | Missions | Shape | Connection | Alarm rule | Saving |
|---|---|---|---|---|---|
| Xbox / PC ("Version 1", the reference) | Training + 4 story missions on disc, + 2 free downloads = 7 [CONFIRMED] | One continuous level per mission | Xbox: split-screen, System Link, online. PC: LAN and online, no split-screen [CONFIRMED] | Four escalating stages, no abort (except UN HQ: a general alarm aborts) [CONFIRMED] | No automatic checkpoints; pause-menu quick save / save / load, waits for the partner, reloads only with the same partner [CONFIRMED] |
| PS2 / GameCube ("Version 2") | Team Training + 4 missions, each cut into 4-5 sub-levels [CONFIRMED] | Short sub-levels with load screens; layouts cut down; identical kit; more paired switches and code locks [CONFIRMED] | Split-screen only [CONFIRMED] | 3 alarms fail a sub-level [ONE SOURCE: FAN, on ~14 pages] | Saved between sub-levels only [CONFIRMED] |
| N-Gage / DS (separate handheld game) | 5 short parts in 2 missions, own story [CONFIRMED] | 3-10 min parts | Local wireless only [CONFIRMED] | 3 alarms abort; level can drop later [CONFIRMED] | Checkpoints in the game generally; inside co-op parts [UNKNOWN] |

The rest of this digest follows the Xbox / PC build. PS2 / GC differences get one line per level. The handheld game is
summarised in 2.9 because it solved co-op in a completely different way (class permissions instead of two-body moves).

### 1.2 Mission order, setting and length (Xbox / PC)

| # | Mission | Setting | Delivery | Primaries (+ optional) | Ghost / expert run | Typical stealth | Casual |
|---|---|---|---|---|---|---|---|
| 0 | Training | Agency obstacle course, Maryland | Disc | 8 lesson objectives | 3-4 min | - | 9-16 min |
| 1 | Panama | Canal administration building, Panama City | Disc | 3 (+1 bonus) | ~8-11 min | 16-35 min | 41-52 min |
| 2 | Seoul | War-torn streets, hotel, temple, fish market, internet cafe | Disc | 5 (+2) | ~11-20 min | 20-35 min | 34-60 min |
| 3 | Chemical Bunker | Missile / bio-weapons bunker near Nampo, North Korea | Disc | 6 (+1) | ~10-27 min | 25-45 min | 45-80 min |
| 4 | Train Station | Grand Central and subway tunnels, New York | Disc (original finale) | 6 (+2-3) | 11:41 | 13-35 min | 30-70 min |
| 5 | Nuclear Plant | Yongbyon research complex, North Korea | Free download, Aug 2005 (PC patch, Oct 2005) | 2 (+1 secondary, +1 opportunity) | 22:44 | ~30 min | 48-108 min |
| 6 | UN Headquarters | UN HQ, New York, at night | Free download, Aug 2005 (PC patch) | 5 (+0) | 21:32 | ~34 min | 43-86 min |

- Lengths [CONFIRMED - many video lengths]; objective counts [CONFIRMED - FAN].
- Whole campaign: about 4-6 hours [CONFIRMED]. Critics' most common complaint was that the campaign was short
  (about 12 of ~27 reviews), not that missions were short [CONFIRMED].
- On PC the two downloads are listed UN HQ then Nuclear Plant and are Mission-mode only; story order is Train Station,
  Nuclear Plant, UN HQ [CONFIRMED]. Neither download is part of Story mode [CONFIRMED].
- Missions run about one primary objective per 5-10 minutes of careful play, a co-op set piece every 5-8 minutes and
  small hold-and-pass beats every 2-3 minutes in between [ANALYSIS of confirmed beat orders].

### 1.3 How co-op is structured across the campaign

- **Modes.** Story (fixed order, each unlocks the next), Mission (replay any unlocked mission), Elite (Mission rules
  but firearms start empty; unlocked by finishing Story) [CONFIRMED]. Difficulty Normal / Hard / Expert is shared with
  solo [CONFIRMED]. The only documented co-op-specific difficulty effect: the Chemical Bunker mixing sequence is 3 / 4 / 5
  inputs per player [ONE SOURCE: FAN].
- **Parallel story.** The trainees are deployed before they are qualified ("trial by fire"). Their arc runs alongside
  the solo campaign and fills its gaps: a bribed canal official, then the chemist he dealt with, then the chemist's
  bio-weapon programme, then the colonel who stole the warheads and seized a New York station, then the plant that
  made his detonators, then his last bomb at the UN [CONFIRMED]. Players remember the parallel story fondly; it was
  never the main draw [CONFIRMED].
- **Rules shared by every Xbox / PC mission** [CONFIRMED unless marked]:
  - Downed partner: about 30 s for the partner to inject a revive, which restores about half health; otherwise the
    mission fails. One syringe each, so two revives per team per mission.
  - Reading a computer updates both players' mission devices (shared intel).
  - Items marked with a dot can be handed to the partner.
  - No whistle in co-op (that button becomes the co-op action) [ONE SOURCE: PRIMA].
  - Headset voice is heard by guards within about 2 m at default sensitivity; talking can lure guards [CONFIRMED].
  - Perfect score: no kills or injuries (knockouts are free), never identified, no bodies found, no alarms, all
    primary, secondary and opportunity objectives [CONFIRMED]. Each player gets an individual percentage built from
    team stats [CONFIRMED].
  - Lethal force is allowed except where a mission forbids it; it costs score, not the mission [CONFIRMED].
  - Mission-specific hard fails: a protected person dies or escapes, a bomb's tripwire laser is touched, a general
    alarm in UN HQ, killing UN staff, entering a contaminated room without the antidote [CONFIRMED].
- **Alarms (Xbox / PC).** Stage 1 is a freebie; stage 2 guards wear body armour; stage 3 helmets; stage 4 permanent high
  alert with fortified positions. No abort, except UN HQ [CONFIRMED]. Alarm sources: guards reaching wall panels,
  cameras, lasers, motion sensors, failed hacks [CONFIRMED].
- **Objective tiers.** Primary, secondary (optional, counts for score), opportunity (optional, usually hidden until
  found by exploring) [CONFIRMED]. Twists add or rewrite objectives mid-mission: the target was a double, the archive
  was wiped, a call reveals a new threat, the villain is already in the control room [CONFIRMED].
- **Extraction.** Usually a vehicle or exit door; Train Station ends by leaping onto a moving train and UN HQ ends when
  the bomb is defused [CONFIRMED]. Whether both players must reach the exit is [UNKNOWN].
- **Signposting.** Sparse HUD (light and noise meters, partner health, an action icon, alarm counter, text box). No
  waypoints or partner markers are documented [UNKNOWN whether a partner marker exists]. Navigation leans on objective
  text that names places, in-world intel, rooms with obvious functions, overlooks, guard chatter and light [CONFIRMED].
- **Who built it.** A dedicated co-op team inside the main studio (own lead designer, level designers, artists, sound)
  [ONE SOURCE: credits]. A lead programmer said co-op was originally the main mode [ONE SOURCE]. The Nuclear Plant
  download was likely made by a different studio [INFERRED from script names]. One map slot (06) is missing between
  the downloads, and more download missions were announced than shipped [INFERRED].

### 1.4 Objective types and the dependency they create [CONFIRMED - FAN + PRIMA; table compiled by the researchers]

| Objective type | Example | Co-op dependency |
|---|---|---|
| Retrieve data | Server, protocol, archive terminal | Often behind a two-person gate (paired scanners, a jammer-held camera) |
| Search files | Archive cabinet | One searches, one handles the guard who comes to fix the lights |
| Interrogate | Official, officer, courier | One grabs, one neutralises escorts or watches the door |
| Eavesdrop | Technicians, a bugged payphone call | One listens, one guards; or both wait |
| Plant a bug | Payphone | Boost-and-climb + hang-down: needs both |
| Steal or make an item | Serum, anti-virus, viral sample | Hang-down retrieval; two-station mixing |
| Capture alive / escort | The chemist | One stuns, one covers; then carrier + door-opener |
| Person as key | Captives at paired scanners | Forced split, then sync |
| Required kill | Contaminated soldier | Only the antidote holder may enter: forced asymmetric split |
| Sabotage | Charges on two vehicles; boat engine | Shoulder stand; jam + flank |
| Defuse | Laser-linked twin bombs | Sync wire cut; the laser splits the pair |
| Switch off machinery | Fans so a duct becomes a route | Throw + rope |
| Exfiltrate | Truck, boat, side door, train | Both present [UNKNOWN whether required] |

Dependency strength [ANALYSIS]: two-body requirement (strongest) > item scarcity (one dose, one entrant) > reach (needs a
boost or hang-down) > protect-while-act > information asymmetry (operator and spotter) > distributed intel (soft).

---

## 2. Per level (Xbox / PC reference build)

Each level: setting, objectives in order, flow as a numbered route, split and co-op points, guards and lights, alarms
and fail rules, length, set pieces, frustrations, one line on PS2 / GC.

### 2.1 Training (obstacle course)

**Setting.** The agency's training facility in Maryland: an outdoor obstacle course plus a cheap cinderblock, plywood
and plasterboard structure with barbed wire, like a police field-skills course [ONE SOURCE: FAN]. Blue wall panels
explain each move; striped floor squares mark where contextual moves are done [ONE SOURCE: IGN wiki]. The briefing:
the trainees must learn to rely on each other and do what a lone agent cannot [ONE SOURCE: FAN].

**Objectives in order** (all primary, one per station) [CONFIRMED - FAN + wiki + video descriptions]:
1. Read the wall panels (tracked for score; a 100% needs a panel re-read [CONFIRMED]).
2. Get over a wall with a boost.
3. Pass a camera with the jammer.
4. Throw the partner over a laser; he turns it off with a switch.
5. Hang-down to hack a computer that turns off a laser.
6. Hack the dual retinal scanners together.
7. Dual rope to reach an upper area.
8. Reach the end of the course.

**Flow.**
1. Spawn; panels on the walls.
2. Wall with a door locked from the far side: boost; the boosted player opens the door for the partner.
3. Corridor with one camera: jam-and-pass, then swap.
4. Laser barrier with a switch beyond it: partner throw; thrown player hits the switch.
5. Small room with a laser at its door: boost-and-climb onto the roof, hang-down to the computer; grid drops. A wall
   medkit is in this room.
6. Door with two retinal scanners: sync hack. One player can do both alone, but a failed hack costs health.
7. Barbed-wire wall then a height: partner throw over the wire; thrown player climbs a pipe and starts a dual rope; the
   partner climbs while the holder steers him clear.
8. Final throw; reach the end zone.

Room geometry between stations is undocumented [UNKNOWN]. Flow is linear, one lesson per station [ONE SOURCE].

**Split and co-op points.** Every station splits the pair and reunites them within seconds through a built-in reunion
device: a door, a switch, a rope [ANALYSIS]. Order of interdependence rises: boost (partner only completes), jam (hold
and swap), throw (thrown player stranded until he acts), hang-down (two levels at once), sync scan (simultaneity),
dual rope (continuous partner control) [ANALYSIS].

**Guards and lights.** No guards documented; stats hint at one knock-out-able dummy [INFERRED]. One camera, at least two
lasers, one dual scanner door. Lighting undocumented [UNKNOWN].

**Fail rules.** Killing lowers the rating, does not fail [ONE SOURCE]. Revive rules are taught here by pop-up [CONFIRMED].

**Length.** 3-4 min expert, 9-16 min casual [CONFIRMED].

**Set pieces.** The first throw over a laser is the mode's signature and is the third thing players do [ANALYSIS].

**Frustrations.** Many pairs stuck at the very first wall: crouch gives a boost, stand gives a throw, and the tutorial
did not make that clear [CONFIRMED]. Confusion over the dual scanner [ONE SOURCE]. The tutorial assumes solo knowledge
[ONE SOURCE]. Several pairs never got past the first or second level [CONFIRMED].

**PS2 / GC.** One objective ("reach the end together"); boost wall, ladder, a throw at a dummy enemy, two scanners, a
laser computer; the last area needs only one player at the exit [ONE SOURCE each].

### 2.2 Panama (canal administration building)

**Setting.** The canal administration building in Panama City at night: offices with light switches, Spanish signage,
a double-height exhibition room, archives and a server room [CONFIRMED - FAN + PRIMA]. The official took bribes to let
ships skip inspections; the trainees must find his records. The handler welcomes them to "the big leagues" [CONFIRMED -
game text]. First real mission; quiet, stealth-focused, light kit (30 rifle rounds) [CONFIRMED].

**Objectives in order** [CONFIRMED - game text + FAN + PRIMA]:
1. Access the archives (east wing, top floor).
2. Twist: the archive data is partly deleted, so access the server backups past the exhibition room on the ground floor.
3. Exfiltrate to the truck in the courtyard (also the insertion point).
- Bonus: recover data on other uninspected ships [CONFIRMED - game text].
- Hard fail: killing the official [CONFIRMED].
- Intel: about nine computers' emails give door codes; the official's interrogation gives three codes [CONFIRMED].

**Flow** (one big loop; guide route) [ONE SOURCE: PRIMA unless marked]:
1. Courtyard at the trucks: shoot out lampposts, move in shadow to an open 2nd-floor window.
2. Facade: boost-and-climb into the copy room (2F). Required on this route; it is also the exit.
3. 2F hallway: kill lights at the wall switch; hack the keypad on the end door.
4. "Broken elevator" corridor: one jams the overhead light while the other slips past the camera; swap; hack next
   keypad.
5. Small rooms, lights off, elevator to 3F (shoot the car light while riding).
6. 3F hall: switch the hall lights off; a guard leaves the security office to fix them; player A grabs him and carries
   him to the scanner door.
7. Official's office at the far end: player B sneaks in and grabs the official; interrogate for codes.
8. Dual retinal door: both force their captives to scan at the same moment, then choke both out [route ONE SOURCE;
   mechanic CONFIRMED]. Hacking both scanners is the fallback [CONFIRMED].
9. Archive room: lights off; one searches the cabinet (objective 1) while the other knocks out the guard who comes to
   fix the lights.
10. Back along the hall to a floor grate under a ceiling opening.
11. Boost-and-climb up through the ceiling opening.
12. Upper halls: shoot lights, knock out guards, pass a motion-sensor automatic door.
13. Down stairs into an air duct: hang-down; the hanging player hacks a keypad that opens the exhibition gates
    [CONFIRMED - PRIMA + forum].
14. Balcony above the exhibition room: each player in turn hangs from the ledge and shimmies to the opposite balcony;
    elevator down [CONFIRMED].
15. Exhibition room floor laser grid: one holds the jammer on a glowing breaker box that sits inside the grid while the
    other crosses; swap [CONFIRMED]. An in-level email explains why the breaker can only be reached remotely.
16. Hallway to the server: shoot lights, knock out the two guards who come to look.
17. Server room: shoot the light near the computer so the room camera cannot see; use the computer (objective 2).
18. Back across the grid with the jammer relay; down a hallway to the reception hall.
19. Reception hall: shoot chandeliers, climb the stairs unseen.
20. Through hallways back to the copy room, out of the window, shadows to the truck (objective 3).

Choke points: the camera corridor, the dual scanner door, the exhibition gates (opened only from the hang-down keypad),
the laser grid (crossed twice). Optional loops exist behind codes (lounge, gallery, private elevator, locker room)
[ONE SOURCE: FAN]; how they connect is [UNKNOWN].

**Split and co-op points.**
- Window and ceiling: boost-and-climb x2 (forced regroup).
- Camera corridor and laser grid (x2): jam-and-pass.
- **3F double capture:** the biggest split. Players go to opposite ends of the floor; each must bring a live captive;
  the sync scan forces the regroup [route ONE SOURCE; mechanic CONFIRMED].
- Archive: protect-while-act (search vs the light-fixer).
- Duct: hang-down (two levels at once).
- Balcony: solo ledge shimmy in turn.
- Optional: partner throw onto courtyard guards, or behind a door a guard will open [ONE SOURCE: IGN wiki].

**Guards and lights.** About 22 guards across the map (full-clear stat) [ONE SOURCE]. Light is the main tool of the
route: switches, shot bulbs, chandeliers; switching off a light draws a specific guard out of a specific room, which
sets up captures [ONE SOURCE: PRIMA]. Two cameras, a laser grid, motion sensors in two rooms [CONFIRMED]. A guard room
that opens only if an alarm is raised [ONE SOURCE].

**Alarms and fails.** Standard four-stage escalation. Killing the official = instant fail [CONFIRMED].

**Length.** Stealth 16-35 min, casual 41-52 min, speedrun ~8 min, 100% no-knockout ghost 10:58 [CONFIRMED].

**Set pieces.** The official as a living key at the paired scanners (first peak); the archive-wiped reveal; the
upside-down hack in a duct; the balcony shimmy above the double-height hall; the laser-grid relay [ANALYSIS of
documented beats; no player quote singles one out].

**Frustrations** [ONE SOURCE: forum, many posters]: players stuck at a ground-floor grille with lasers and two guards
behind it, not realising its keypad is reached by the hang-down from a vent above; players missing the balcony ledge
and jumping to their deaths; finding the server room after the archive. A shock-while-hacking invisibility bug
[ONE SOURCE]. PC desync about a minute in (config mismatch) [CONFIRMED].

**Design reading** [ANALYSIS]: entry equals exit by a different path; security devices grow denser along the route
(keypads, camera corridor, dual scanner, laser grid); stuck points cluster where the solution is above the problem.

**PS2 / GC.** Last mission of that campaign, in 4 sub-levels (Alley, East Wing, Archives, Server Room); adds a zip line,
a shoulder-stand charge on an elevator car, a duct of relay gates opened alternately, beams over a laser floor watched
by a drone, and ends on an escorted captive scan [ONE SOURCE: PRIMA].

### 2.3 Seoul (war zone abduction)

**Setting.** Seoul during an invasion, same day as the solo hero's Seoul mission: war-torn streets, a small hotel, a
temple and grounds, sewers, a fish market over the river, an internet cafe, neon. Heavy war ambience; an on-screen note
says gunfire is not necessarily aimed at the players [CONFIRMED]. Task: abduct the chemist alive before enemy special
forces extract him; his death fails the mission. The briefing calls the job easy, to set up the twist [CONFIRMED].
Heavier kit (90 rifle rounds) signals combat is expected [ANALYSIS].

**Objectives in order** [CONFIRMED - FAN + PRIMA + game text]:
1. Capture the chemist (intel: a hotel near insertion).
2. Twist: he is a body double; find out where the real one is (interrogate an officer).
3. Destroy two mobile anti-aircraft vehicles. A 5-minute timer starts when a plane is shot down, with the handler
   warning each minute [CONFIRMED - game text].
4. Get to the internet cafe and capture him alive.
5. Carry him to the truck outside the cafe.
- Opportunities: interrogate the officer; sabotage the engine of the chemist's escape boat [CONFIRMED].
- Hard fails: the chemist dies; he reaches an intact boat; killing the double before interrogation [CONFIRMED except
  the last, ONE SOURCE].

**Flow** [CONFIRMED where the guide and a second walkthrough agree; otherwise ONE SOURCE]:
1. Insertion alley: shoot out neon signs; deal with the alley guard.
2. Hotel side wall: boost-and-climb from a large hole to a higher hole (2F).
3. Knock out patrols, drop through a floor hole to 1F.
4. Turret hall: one holds the jammer on an automatic turret while the other runs behind it and switches it off at its
   panel [CONFIRMED].
5. Drop through another floor hole, then boost-and-climb up through a hole in the next room [CONFIRMED].
6. Stairwell: one shoots the stair light, the other leaps to the railing and pulls the guard over from a hang
   (optional).
7. Top-floor bathroom: the double; interrogate (both can question him together [ONE SOURCE: game text]); medkit here.
8. Back door keypad: one hacks (or uses the code from an optional computer) while the other shoots the hall light.
9. Dark back alley: one knocks out two escorts, the other grabs and interrogates the officer. Optional side room via a
   vent holds the email about the escape boat.
10. Boost-and-climb over a low wall, a fence, a narrow alley; each takes a zip line down into the temple courtyard.
11. Vehicle 1: knock out two patrols without alerting a watcher on the temple's high balcony; shoulder stand at the
    vehicle's rear to plant the charge; detonate from the sewer tunnel [CONFIRMED].
12. Timer running: the tunnel leads to the far side of the temple.
13. Vehicle 2: three guards; shoulder stand again [CONFIRMED].
14. Radio crossover: the solo hero is heard interrogating a soldier for the trainees, who learn the cafe location
    [CONFIRMED that it plays in co-op; timing ONE SOURCE].
15. Sewers to the dark fish-market store (lights switch, medkit, ammo; a rest point).
16. Fish-market walkways over water: two guards (can be taken together); a turret on the boat (jam + flank), sabotage
    the boat (opportunity).
17. Alley by the cafe: the extraction truck (smoke grenades in the back).
18. Cafe, two documented ways in: (a) from a ledge outside, stun the chemist through the window with the stun dart,
    then boost-and-climb to an upstairs window [ONE SOURCE: PRIMA]; (b) front door with a retinal scanner (force a guard
    or hack), bar guards, then a door-bash plus partner's smoke grenade upstairs [ONE SOURCE]. Both end at the chemist's
    locked door; break the lock before he flees.
19. If he runs: with the boat sabotaged he gives up at the dock; otherwise he escapes and the mission fails [CONFIRMED].
20. Carry him out (one carries, the other opens doors and guards) to the truck [CONFIRMED].

Spatial structure: the hotel is a vertical puzzle (up, down, up again, up the stairs); the zip line is a high-to-low
entry into an open arena; the sewer is used twice as an underground connector; the two vehicle arenas are the only open
spaces, the rest is tight interiors [ANALYSIS].

**Split and co-op points.** Boost-and-climb x4, shoulder stand x2, turret flank x2, role splits at the keypad and the
officer, optional simultaneous takedown, carry + escort. **No paired-input sync on the guide route**: the one Xbox / PC
story mission without a sync lock [ANALYSIS of the guide route]. It shows a mission can be fully co-op without one.

**Guards and lights.** Patrols in the hotel, officer + two escorts, two patrols + a balcony watcher at vehicle 1, three
guards at vehicle 2, walkway pairs, cafe guards, two automatic turrets [CONFIRMED / ONE SOURCE per item]. Shootable neon,
room and stair lights; war noise raises ambient noise and gives windows to move [present CONFIRMED; masking INFERRED].

**Alarms and fails.** Alarm system present (unlike solo Seoul) [ONE SOURCE]; its escalation notes are missing
[UNKNOWN]. What happens when the vehicle timer hits zero is [UNKNOWN].

**Length.** Stealth 20-35 min, casual 34-60 min, ghost 10:46 [CONFIRMED].

**Set pieces.** The radio crossover (named by players and a reviewer) [CONFIRMED]; the double reveal at about the 1/3
mark; zip line into the temple; shoulder-stand demolitions under a watcher; the 5-minute timer; stunning the target
through a window; the carry-out [presence CONFIRMED; "wow" INFERRED]. A reviewer reportedly named Seoul the best co-op
mission [ONE SOURCE].

**Frustrations.** Score cannot exceed 90% (known bug) [CONFIRMED]. **Hidden trap:** skipping the optional boat email
means no reminder to sabotage the boat, and the target can then escape for an instant fail [CONFIRMED]. Saving with a
medkit cabinet open destroys the kit [ONE SOURCE].

**PS2 / GC.** 5 sub-levels (Streets, Rooftops, Gardens, Fish Market, Cafe); one vehicle on a 4-minute timer; a high /
low route split that re-merges inside a building; turret leapfrog as the core rhythm; a throw across water; paired
switches; quiet decoy-and-grab finale [ONE SOURCE: PRIMA].

### 2.4 Chemical Bunker (bio-weapons lab)

**Setting.** An old missile bunker used as a secret bio-weapons lab near a North Korean port [CONFIRMED]. Silos, labs,
a monkey lab with a chimpanzee who features in a technician's email (players love her) [CONFIRMED], an operating
theatre, a cryogenic chamber, a missile storage hall, a crane bay, sewers and a boat dock. Emails are addressed to the
colonel, setting him up as the next villain [ONE SOURCE].

**Objectives in order** [CONFIRMED - FAN + PRIMA + game text]: a recipe chain.
1. Infiltrate down one of the silos.
2. Recover the anti-viral protocol from the main lab.
3. Take the right primate blood serum (type A, B or O, randomised per run; read the note) [CONFIRMED].
4. Make the anti-virus in the cryogenic chamber and retrieve a sample.
5. Take a viral sample from a missile warhead.
6. Exfiltrate to the inflatable boat at the end of the dock.
- Opportunity: recover the autopsy videotape in the camera room [CONFIRMED].
- Emails warn in advance that mixing needs two people and is dangerous, and that the warhead's two hot wires must be
  cut together [CONFIRMED - game text].

**Flow** [ONE SOURCE: PRIMA unless marked]:
1. Surface: fence, ladder down to two silos, two patrolling guards.
2. Silo A: dual rope; the rappeller presses a panel at the bottom, then climbs back up the rope [CONFIRMED].
3. Silo B: the panel now raises a platform; one rides, the other operates it and jumps on at the last moment; ride down
   (objective 1) [CONFIRMED].
4. Hall and crawlspace: from an overlook, overhear two technicians in the missile storage hall below and shoot out all
   its lights now (the hall is entered at the end).
5. Crawlspace, tall ladder, vent: one drops silently into the monkey lab and knocks out the technician.
6. Hall: a light lure pulls a second guard from beyond the lasers (optional).
7. Laser corridor: hand-over-hand along an overhead pipe past laser set 1; partner throw past set 2; the thrown player
   switches the lasers off at a computer.
8. Operating theatre (upper ledge): one shoots the X-ray light board to black out the room, the other drops for two
   takedowns; the ledge player drops through a trapdoor to the tape (opportunity) [CONFIRMED].
9. Main lab control room: one hacks in, knocks out a sleeping guard and hits a wall switch to open the lab for the
   partner waiting outside.
10. Main lab: knock out two technicians, use the computer (objective 2) [CONFIRMED].
11. Mini lab upstairs: keypad, fridge keypad, take the serum the note asks for (objective 3) [CONFIRMED].
12. Back through the operating theatre (the hub); jam-and-pass at a camera by an elevator; into the cryo chamber, one at
    each station [CONFIRMED].
13. **Mixing:** both input their own colour sequence in turn, quickly; a wrong input releases ceiling gas that hurts or
    kills [CONFIRMED]. One player can run between both stations alone [ONE SOURCE].
14. Elevator up after the guard who arrives in it [CONFIRMED].
15. Crate hall: stick-cam gas on a guard.
16. Storage room: grab two guards and force them to twin retinal scanners together.
17. Cryo upper gallery: shoot the corner light; hang-down into the tank to collect the anti-virus (objective 4)
    [CONFIRMED].
18. Partner throw across the tank; the thrown player takes a guard and opens a **one-way door** for the partner
    [CONFIRMED].
19. Missile storage hall, still dark from step 4: clear guards and technicians (payoff of the foreshadow).
20. Mechanic room computer: crane instructions, warhead code, safety procedure [CONFIRMED].
21. **Crane:** one operates the crane from a control room with no view of the target; the other stands by the missile
    cradle and talks him in; the spotter has canned direction lines (back, forward, left, right, lower, raise, stop)
    [CONFIRMED - manual + PRIMA].
22. **Warhead:** open it; both find their hot wire with thermal vision and cut at the same time (objective 5)
    [CONFIRMED]. Failure is a big explosion [ONE SOURCE].
23. Trapdoor, sewer, boat room: shoot lights, reach the boat [CONFIRMED].

Spatial structure: two shafts with two different mechanics; a lab cluster across two floors; the operating theatre as
a hub; the cryo chamber visited twice (floor, then top gallery); the missile hall seen early and entered last; a
one-way door after the tank throw [ANALYSIS].

**Split and co-op points.** Dual rope, operate-and-jump platform, partner throw x2, camera jam, two-station mixing,
captive sync scan, hang-down, operator + spotter crane, sync wire cut. **No boost on the guide route.** It uses every
sync family in the campaign (scanners, mixing, crane, wire cut) [ANALYSIS].

**Guards and lights.** Single guards and technician pairs room by room; guard sleeping in a chair; a guard who arrives
by elevator next to a camera [ONE SOURCE / CONFIRMED]. The route depends on killing lights, including preparing a room
in advance [ONE SOURCE]. A computer can disable the camera system [ONE SOURCE].

**Alarms and fails.** Standard escalation. Lethal gas on wrong mixing input. No timers [ONE SOURCE].

**Length.** Stealth 25-45 min, casual 45-80 min; ghost run 19:39, the longest retail mission in a no-detection run
[CONFIRMED]. On PS2 it "took months" for some pairs [CONFIRMED].

**Set pieces.** The chimp (players and video titles) [CONFIRMED]; mixing, crane-with-spotter and warhead disarm quoted
as the three loved mini-games [ONE SOURCE]; the overlook-and-return to the missile hall; overheard technicians as story;
silo descent; throw over the tank.

**Frustrations.** Mixing is the most discussed puzzle and the main frustration: trial-and-error deaths, "save inside the
chamber and expect to die" [CONFIRMED]. **On PC the two-person mixing and wire cut sometimes did not register at all**
(can scroll, cannot confirm), blocking progress [CONFIRMED - two Steam threads + a forum]. Score caps at 97% [CONFIRMED].
Some players say sync is not possible without a microphone [ONE SOURCE].

**PS2 / GC.** 5 sub-levels; every sub-level ends on a "both press now" beat (paired switches, scanners, a two-terminal
warhead hack that replaces the wire cut); the crane is replaced by a panel; a fixed published mixing sequence; a
cycling floor laser players jump above in rhythm [ONE SOURCE: PRIMA].

### 2.5 Train Station (bombs under Grand Central)

**Setting.** Grand Central reached from below: sewers, a train repair yard, a water tunnel, a machine room, a metro
station, then the ticket hall and the main concourse, then down again [CONFIRMED]. The colonel's defectors have seized
the station and planted three bombs strong enough to collapse several blocks [CONFIRMED]. The colonel is only heard on
the phone [CONFIRMED]. This was the original retail finale [CONFIRMED].

**Objectives in order** [CONFIRMED - PRIMA + FAN + game text]:
1. Find out the colonel's real agenda.
2. Defuse the bombs in the subway tunnels: each is a laser-linked pair; both players cut the live wire at the same
   moment, then a second wire; the live wire changes over time [CONFIRMED - game text].
3. Bug the payphone in the main hall before the courier reaches it, undetected.
4. Get the antidote from the locker.
5. Eliminate the contaminated soldier in the washroom.
6. Stop the colonel's men leaving with the rest of the toxin: jump onto the departing train's roof.
- Opportunities: follow the courier to the locker; take the toxin vial from the dead soldier; recover bomb schematics
  [CONFIRMED / INFERRED].
- **Event-gated chain** [ANALYSIS]: bug the phone, wait and listen, learn about the locker and the infected man, then
  the antidote, then the washroom.

**Flow** [ONE SOURCE: PRIMA, step order reconstructed; order cross-checked by one timed video]:
1. Sewer: overhead pipe traverses; knock out a guard who walks into shadow; stick-cam gas on a second.
2. Repair yard: drop in through a wall hole; kill all lights, take guards in the dark; turret on the tracks: jam +
   flank (one holds the jammer, the other switches it off from behind).
3. Water tunnel, bomb pair 1: two bombs on facing walls with a laser between them (touching it detonates them). One
   shoots a far light to pull a guard over; the other throws his partner over the beam onto the guard (knockout on
   landing). Each goes to one bomb (the thrown one through a side door); thermal shows the live wire; cut together
   [cut CONFIRMED; throw-onto-guard ONE SOURCE].
4. Tunnel end: boost-and-climb to a ledge; one jams a small room's light while the other opens the machine room door
   and shoots its light; guards walk to the dead light.
5. Machine room, bomb pair 2: hug the wall to the bombs; creep along the laser; sync cut.
6. Metro station, bomb pair 3: split either side of a parked train (shadows on one side, a narrow gap on the other);
   sync cut; regroup through the dark train car.
7. Tracks, stairs, escalators: shoot the overhead light and a lit billboard.
8. Ticket booth: boost one player onto its roof; he drops through a trapdoor onto the guard inside and opens the door.
9. Main hall: boost-and-climb onto the central phone booth's roof, then hang-down to plant the bug. Then **wait and
   listen** to the call (the main rest beat).
10. Tail the courier to the locker room unseen; one knocks out the bodyguard, the other grabs the courier; both
    interrogate him for the locker code (only given to a joint interrogation [CONFIRMED - game text]); one opens the
    locker and injects the antidote.
11. Hallway and a transit police office.
12. Washroom: **only the injected player can enter**; he stabs the infected soldier (a required kill) and takes the vial;
    the partner may enter only after [CONFIRMED].
13. Boost-and-climb into the washroom ceiling; crawl the duct; drop into the final metro station [CONFIRMED].
14. Finale: one goes down an escalator for a guard while the other covers, shooting lights; then jump onto a glass dome,
    smash through and land on the roof of the escaping train.

Shape: down, up, down. Act 1 underground is about 45% of a fast run; the three defusals come in quick succession
(about 3:06, 4:43, 5:28 in a 13:38 ghost run) [ANALYSIS of one timed run].

**Split and co-op points.** Sync wire cut x3 (each laser forces a split, each cut joins the pair in time);
boost-and-climb x3 and a boost-only once; hang-down x1 (payphone); partner throw as an attack x1; train split and
regroup; ticket-booth trapdoor ambush; joint interrogation; single-entrant room (one antidote dose) [CONFIRMED for
cuts, antidote and joint interrogation; rest ONE SOURCE].

**Guards and lights.** Patrols that investigate shot lights and noises throughout; the courier and his bodyguard on a
script; a vomiting infected soldier [ONE SOURCE]. Players remember guards hearing them through the headset and luring
guards with deliberate noise [CONFIRMED]. Lights killed at every stage; a lit billboard as a light source [ONE SOURCE].

**Alarms and fails.** Standard escalation. Touching a bomb laser = detonation = fail [CONFIRMED]. Cutting the wrong
wire, or one player early, explodes [CONFIRMED]. Entering the washroom without the antidote kills [CONFIRMED]. Killing
the courier before the locker stage fails [ONE SOURCE: game files].

**Length.** Ghost 11:41, stealth 13-35 min, casual 30-70 min [CONFIRMED].

**Set pieces.** The two-man defusal: remembered as the tensest beat and also the most-asked "how do we do this?" in
comments (6+ across languages) [CONFIRMED]. Throwing the partner onto a lured guard; hanging upside down from a booth in
a vast hall to bug a phone; a trapdoor drop onto a guard; the lone antidote entry; smashing through a glass dome onto a
moving train [ONE SOURCE each].

**Frustrations.** Unclear defusal inputs: a shared device screen with no prompts; pairs who cut together and still
exploded [CONFIRMED]. The lower platform reached only through the washroom ceiling: a solution out of sight of its
problem [CONFIRMED]. A required kill in a game that rewards no kills [CONFIRMED]. A non-lethal press that sometimes
became a lethal kill on the courier [ONE SOURCE].

**PS2 / GC.** 4 sub-levels; four bomb pairs; an elevator that splits the pair onto two floors and two tunnels before a
ladder regroup; repeated throw-then-rope leapfrogs; paired switches at elevators; an overhead ambush where the target
stops right beside the hidden player; ends at the locker [ONE SOURCE: PRIMA].

### 2.6 Nuclear Plant (download)

**Setting.** A nuclear research complex in Yongbyon: a power plant (turbine hall with floor and balcony levels, stairs,
main control room) and a radiochemistry lab, joined by an outdoor footbridge through a laser-protected corridor
[CONFIRMED - FAN + publisher text]. Pitch: claustrophobic passages, massive open spaces, loud machinery, demanding
puzzles [ONE SOURCE: publisher]. The handler is text-only in both downloads (no voice) and players missed him
[CONFIRMED].

**Objectives** [CONFIRMED - game text]: (opportunity) take the complex blueprints so the handler can give advice;
(secondary) find out if the colonel can attack again; (primary) find out who helped him; (primary) exfiltrate through
the lab's side door. Payoff: the colonel received four detonators and used three, so one bomb is left, and the intel
officer arranged it [CONFIRMED]. Fewest primaries of any mission, yet the longest [CONFIRMED].

**Flow** (from the handler's guidance lines and notes; no walkthrough exists) [CONFIRMED for the lines; route INFERRED]:
1. Get inside; first computer holds the blueprints.
2. Security doors blocked; a nearby computer opens them.
3. **Turbine hall:** the best-documented beat. One throws the partner across to the far balcony; the thrown player
   goes where the fans are switched off, jumps into the fan inlet and brings the partner up by rope. Alternative
   reply: climb a ladder, switch off the fan, return to the gap [ONE SOURCE: forum excerpts].
4. Camera on the turbine stairs; the lift cannot be called from here, find another way up.
5. Main control room behind a retinal door; the archives server opened from a terminal.
6. Laser corridor to the outdoor footbridge (the only documented outdoor beat).
7. Lab server room behind a retinal door, reached through a ceiling trap-door; two computers answer the secondary.
8. Exit by the lab's side door.

How the retinal doors and lasers are beaten, guard placement and lighting are [UNKNOWN]. Guards are lethal-allowed;
nobody to interrogate [ONE SOURCE].

**Length.** Ghost 22:44 (about twice Train Station), casual 48-108 min [CONFIRMED]. One pair judged it the hardest
(confusing layout, many sub-objectives) [ONE SOURCE].

**Frustrations.** The fan puzzle stumped players ("what is the fan for?") because the machine's state and its control
were not readable [ONE SOURCE: forum titles]. Low objective density over a long traversal [INFERRED as the cause of
the confusion]. Download maps did not appear for some at launch (gated behind an Elite completion on Xbox) [CONFIRMED].

**Set pieces** [INFERRED]: climbing out of a turbine hall through a stopped fan; the footbridge between buildings; the
"one bomb left" email reveal.

**PS2 / GC.** Does not exist.

### 2.7 UN Headquarters (download, finale)

**Setting.** UN HQ in New York at night: a tower (security control room on the 22nd floor) and a second building with
the General Assembly hall [CONFIRMED]. International territory: no lethal force on UN guards or civilians, and the
handler aborts on any general alarm [CONFIRMED]. Pitch: "no room for kills or alarms" [ONE SOURCE: publisher].

**Objectives in order** (displayed order; the file order differs slightly) [CONFIRMED]:
1. Infiltrate: service stairs reach the top floor but the emergency doors open only from inside; find another way in.
2. Recover the encrypted data sent by the intel officer.
3. Reach the security control room (22nd floor) by elevator.
4. Twist: the colonel has already taken the control room (cameras off, blood on the floor); stop him.
5. Defuse the bomb in the assembly hall's ventilation before the countdown ends. No extraction.

**Flow** (assembled; no step-by-step source) [INFERRED order; items ONE SOURCE: FAN unless marked]:
1. Roof at night: rappel to the window-washing platform [CONFIRMED - game line]; locked roof door.
2. Top floor, middle floor (technical room, the data and the control-room entrance terminal).
3. Control-room keypad code can be read by luring a guard to it and watching him type through a stick-cam with thermal
   or night vision [ONE SOURCE].
4. Elevator to the 22nd floor; follow the corridor; the colonel and his men (lethal force allowed against them). The
   colonel cannot be grabbed or interrogated [ONE SOURCE].
5. Down through lower floors: a turret, a metal detector (disabled at terminals), service elevator to the ground
   floor, across to the second building.
6. Locked side rooms before the hall; the ventilation room above it: "half the job", then cross back downstairs to the
   other side [CONFIRMED - game text].
7. Defuse; the method is not in text [UNKNOWN; one comment suggests the wire-cut mechanic again].

**Co-op points.** No co-op move is documented by any source [UNKNOWN]. Plausible splits: the keypad observation (one
lures, one watches), the two-part ventilation device [INFERRED].

**Alarms and fails** (the strictest mission): general alarm = abort; killing a UN guard or civilian = abort; metal
detector alarm = fail [ONE SOURCE]; being seen in lit windows = fail (meaning unclear) [ONE SOURCE]; a **hidden
20-minute bomb timer**, announced by text at 20, 10, 5 and 1 minutes but not shown on screen [CONFIRMED durations].

**Length.** Ghost 21:32, stealth ~34 min, casual 43-86 min [CONFIRMED]. Players found it brutal ("Suicide Central",
"went through hell") [ONE SOURCE each].

**Frustrations** [ANALYSIS of the documented rules]: stacked instant-fail rules, a hidden timer, an ungrabbable villain
that breaks the "grab the target" grammar.

**Set pieces** [INFERRED]: night roof entry into one of the most guarded buildings; finding the villain already in the
control room; a race to a bomb above a live assembly.

**PS2 / GC.** Does not exist.

### 2.8 PS2 / GC campaign in one paragraph

Order: Team Training, Seoul, Chemical Bunker, Train Station, Panama (story chronology broken) [CONFIRMED]. Missions run
about 19-33 min in 4-5 sub-levels of 2-11 min each, saved between sub-levels, 3 alarms fail a sub-level [CONFIRMED /
ONE SOURCE]. Sub-levels carry constraint objectives ("finish without an alarm", "without killing") [CONFIRMED]. Co-op
is used more as gating: each throw is answered by a rope, each elevator by paired switches, each turret by a leapfrog,
and almost every sub-level ends on a "both press now" beat [ANALYSIS]. Reviewers called it "chopped up" and "half the
experience" of Xbox [ONE SOURCE], with long loads [ONE SOURCE].

### 2.9 Handheld campaign in one paragraph (N-Gage / DS)

Five original short parts (about 3.5 to 10.5 min each, about 37 min total in a normal run) [ONE SOURCE each]: rooftop
approach to a corporate HQ, a lift power cut, a detection-and-ceiling-escape with a 6-minute extraction countdown, a
prison rescue (missing fuse), and an escape carrying a wounded officer. Two **hard classes** picked in the lobby: a
hacker (computers only, unlimited stun tool, chaff and flash, no night or thermal vision) and an assault player
(electric panels only, lethal weapons, cameras, the only one with thermal, which shows lasers) [CONFIRMED for the
permissions; kit ONE SOURCE]. **No two-body moves** at all; the only partner verb is "heal ally" [INFERRED from 37
interaction labels]. One true sync task (two switches together) [CONFIRMED]. Panel actions open 15-second windows,
a lighter asynchronous cousin of a sync [ANALYSIS]. Lesson: permissions and complementary information can carry co-op
where acrobatics cannot; the risk is one class having nothing to do [ANALYSIS].

---

## 3. Patterns across levels

### 3.1 Move and beat frequency per mission (Xbox / PC guide routes; minimums, not totals)

| Beat | Training | Panama | Seoul | Chem. Bunker | Train Station | Nuclear Plant | UN HQ |
|---|---|---|---|---|---|---|---|
| Boost / boost-and-climb | 1+ | 2 | 4 | 0 | 4 | ? | ? |
| Partner throw | 2-3 | 0 (optional) | 0 | 2 | 1 (as attack) | 1 | ? |
| Dual rope | 1 | 0 | 0 | 1 | 0 | 1 | 1? (roof) |
| Hang-down | 1 | 1 | 0 | 1 | 1 | ? | ? |
| Shoulder stand | 0 | 0 | 2 | 0 | 0 | ? | ? |
| Jam-and-pass / turret flank | 1 | 2-3 | 2 | 1 | 2 | ?(camera) | ? |
| Sync action | 1 (scanners) | 1 (captive scanners) | 0 | 4 (scanners, mixing, crane, wire cut) | 3 (wire cuts) | ? | ?(bomb) |
| Protect-while-act / role split | - | 2 | 3 | 2 | 2 | ? | ? |
| Signature one-off set piece | - | Captive key | Shoulder demolition, escort | Crane operator + spotter, mixing | Single-entrant room, train leap | Fan / turbine | Hidden-timer bomb |
| Twist | - | Archive wiped | Target is a double | (recipe chain, no twist) | Phone call reveal | Detonator count | Villain holds the control room |

Source: guide route matrix [ONE SOURCE: PRIMA] for Panama to Train Station, [CONFIRMED] for Training, [ONE SOURCE /
UNKNOWN] for the downloads.

Pattern frequency [ANALYSIS of the guide routes]:
- **Hold-and-pass (jam-and-pass):** every mission. The connective tissue between set pieces.
- **Boost-and-climb:** every mission but Chemical Bunker. The most common move; it is how the pair enters, changes floor
  and reaches a ceiling route.
- **Make-your-own-dark:** every mission; light switches, shot bulbs and the jammer on lights are the core co-op verb.
- **Sync lock:** every story mission except Seoul (and every PS2 / GC mission).
- **Reach-in from above (hang-down):** about once per mission.
- **Throw with far-side release:** 0-2 per mission.
- **Set-piece patterns** (captive key, operator + spotter, single entrant, escort): once each, each in a different
  mission. They are what makes each mission memorable.

### 3.2 The recurring co-op beats (catalogue)

Each with where it appears, why it works and its diagram in words. Confidence per `raw/08`.

1. **Split-path-and-sync (rendezvous lock).** Two devices worked at the same moment, each reached by a different path or
   side; the pair meets in time, not space. Scanners (Training, Panama, Chemical Bunker), laser-linked bombs (Train
   Station), warhead wires. Real-world logic: dual control, two-person rule [CONFIRMED pattern].
2. **Hold-and-pass gate (cover relay).** A device held off only while one stands still; the other passes, then holds
   from the far side. Every mission [CONFIRMED]. Cheap, forces turn-taking, makes each player both protector and
   protected.
3. **Throw-across with far-side release.** One is launched over a barrier, then opens the way (switch, door, rope,
   one-way door). Training, Chemical Bunker (x2), Nuclear Plant. The thrower is stranded and dependent; the release
   device guarantees the reunion.
4. **Boost-then-climb vertical entry.** A height only two bodies reach; both act twice and nobody is stranded. Windows,
   ceilings, ledges, a phone booth.
5. **Reach-in from above.** Floor and door watched, ceiling not; one lowers the other to act. Training, Panama, Chemical
   Bunker, Train Station. The most cinematic image; the hanging player's life is in the holder's hands.
6. **Single-entrant room.** Fiction allows one in (one dose). Train Station. Roles assigned by the story.
7. **Captive as key.** Each player captures a person, usually in different places, then a sync scan. Panama, Chemical
   Bunker. Collapses infiltration, capture, escort and sync into one beat; makes non-lethal play useful.
8. **Operator and spotter.** One controls, one sees; voice is the link. Chemical Bunker crane. The purest
   asymmetric-information beat.
9. **Leapfrog relay.** Each opens the next stage for the other in turn (duct gates, throw then rope, turret leapfrog).
   Mostly PS2 / GC.
10. **Parallel routes that re-merge.** Geometry separates the pair (a train, an elevator stopping on two floors, a high
    route vs a street route); each gets a personal mini-challenge; a defined merge point. Train Station platform; PS2 /
    GC Seoul and Train Station.
11. **Protect-while-act.** One does a slow action (search, hack, interrogate); a predictable interrupter is scripted to
    arrive; the other handles him. Panama archive, Seoul officer, Train Station locker room. Gives the non-acting
    player a real job.
12. **Escort extraction.** Carrier is slow and cannot fight; partner opens doors and clears. Seoul.
13. **Lure and ambush.** One makes a stimulus (dead light, noise, stick-cam click, a voice); the other waits where the
    guard will walk. Includes the throw that lands on a lured guard.
14. **Event wait (eavesdrop).** Hold position while a call or conversation plays: story, objective generator and rest
    beat at once. Train Station call, Chemical Bunker technicians.
15. **Simultaneous takedown.** Both take one guard each at the same moment; if one acts early the other guard reacts
    [ONE SOURCE]. A player favourite ("co-op ambushes") [CONFIRMED].

Space and route patterns that support them: light lanes players make themselves; noise-mask zones (war ambience,
machinery); overlooks that let both plan (and one hostile overlook, the temple balcony watcher); foreshadow and
return; a hub room; one-way drops and commitment doors after key beats; entry-equals-exit loops; top-down
infiltration; two buildings and a bridge; machine-state routes; moving-target tails.

### 3.3 Typical spacing in time

- **Small beat** (hold-and-pass, boost): every 2-3 minutes of careful play [ANALYSIS].
- **Co-op set piece:** every 5-8 minutes [ANALYSIS].
- **Primary objective:** one per 5-10 minutes [ANALYSIS].
- **Twist:** at roughly the 1/3 to 2/3 mark (Panama after the first peak; Seoul at about 1/3; Train Station after the
  bombs; UN HQ at about 2/3) [CONFIRMED for existence; placement ANALYSIS].
- **Fast cluster example:** three sync defusals within about 2.5 minutes of a 13.6-minute ghost run (Train Station),
  then a long quieter public-space stretch [ANALYSIS of one timed run]. In casual play multiply ghost times by about
  2.5-5.
- **Generic shape** of the four retail missions [ANALYSIS]:
  - quiet exterior or service entry with a soft first co-op move (boost into a window, rappel down a silo, a pipe
    traverse);
  - low tension: keypads, switches, small jams;
  - peak 1: the first big sync;
  - twist;
  - rest: a dark service space, a medkit, a forced wait;
  - build: bigger and more open spaces;
  - peak 2: the climax set piece (crane and wire cut, the train leap, the cafe breach and carry);
  - exit: short, or a deliberate reverse route.
- **Pacing targets the researchers derived** (carried into our design bible) [ANALYSIS]: mission 30-60 min for an
  average pair; 3-6 primaries plus 1-3 discoverable optionals; small co-op beat every 2-4 min; major set piece every
  6-10 min; 1-2 signature never-repeated set pieces per mission; one twist at 40-60%; a rest beat after each major set
  piece; no partner separation without a defined merge point and a communication aid.

### 3.4 Wow moments (what players and critics actually named)

Named, with evidence [CONFIRMED unless marked]:
- Throwing the partner: over lasers, across gaps, **into guards**.
- The upside-down rope dangle, especially with a neck-snap on a guard below.
- Boost and human-ladder climbs.
- Simultaneous wire cuts and bomb defusal (the tensest beat).
- Coordinated double takedowns.
- Guards hearing your real voice; whispering; luring by talking.
- Jamming a camera while the partner runs.
- The parallel story: hearing the solo hero's mission from the co-op side.
- The chimp in the bunker lab.
- Failing and rescuing: one drops in front of a guard, the other clears the room and revives him, then the pair's cocky
  line plays.
- The bunker's mixing, crane-with-spotter and missile disarm [ONE SOURCE].
- Coordinating wordlessly with a stranger by miming [CONFIRMED - 3 comments].

Ingredients of each wow type [ANALYSIS, `raw/11`]:
- **Two-body move:** a physical animation a spectator understands; a clear initiate-and-complete handshake with an
  audio cue; a payoff the pair could not reach alone; optional danger. Amplified when the move doubles as an attack, or
  puts one player's life in the other's hands.
- **Sync moment:** players separated so neither sees the other's device; a visible stake; a countdown spoken by the
  players; instant legible success feedback. Amplified by hidden information only one can see (thermal shows the live
  wire).
- **Voice as a game object:** mic input heard by AI in a small consistent radius; ambient noise that covers it; voice as
  a lure.
- **Near-miss:** the threat comes close but cannot see you and you know it; a visible draining resource (jammer charge);
  the partner is the one keeping you safe. Needs readable detection.
- **Dramatic entrance or exit:** altitude change, a view of a big space, momentum, a chapter boundary.
- **Ceiling route:** guards who watch doors and floors; a visible opening that rewards looking up; a co-op move to use
  it.
- **Twist:** delivered in-world, rewrites the objective, both learn it together.
- **Landmark:** a long sightline from a safe spot, a recognisable space, a promise kept later.
- **Character and absurdity:** a humane detail in a grim place; systemic slapstick.
- **Emergent comedy:** physical consequences, recoverable failure, players who can talk.

Wow moments that misfired: the mixing (lethal gas, precise sequence, PC input failures); the upside-down hack where
players could not find where to start it; the fan machine state; scripted-feeling takedown moves ("press button, watch
animation") [CONFIRMED except the fans, ONE SOURCE].

### 3.5 Anti-patterns to avoid (from CT's own levels)

| # | What went wrong | Where | Prevention |
|---|---|---|---|
| A1 | Full-mission restarts in long missions; the weaker partner drags the run | All (no auto checkpoints; PS2 / GC no in-level save) [CONFIRMED] | Checkpoints per encounter; a downed partner is a rescue task before it is a reload |
| A2 | Losing each other: no partner marker, no shared map in reviews' experience | All [CONFIRMED complaint] | Partner indicator (diegetic if possible), pings, shared map, regroup gates |
| A3 | Solution above or far from the problem, no tell | Panama grille / vent; PS2 vent opened by a distant computer; Train Station washroom ceiling [CONFIRMED] | Line of sight from problem to solution; visible cause and effect (cable runs, lit panel, a sound on state change) |
| A4 | Unreadable machine state | Nuclear Plant fans [ONE SOURCE] | Every machine shows its state in sight and sound; its control is near or visibly linked |
| A5 | Lethal precision sync puzzle, trial-and-error deaths | Chemical Bunker mixing [CONFIRMED] | Forgiving timing, per-input feedback, non-lethal failure (alarm or reset) |
| A6 | Two-person inputs failing on one platform | PC mixing, wire cut, laser grids [CONFIRMED] | Test every two-person interaction on every input method; always a fallback |
| A7 | Optional intel silently guards a hard fail | Seoul boat [CONFIRMED] | Two or more cues for any hard-fail prevention; better, a recoverable chase |
| A8 | Score cap bugs | Seoul 90%, Chemical Bunker 97% [CONFIRMED] | Automated objective tests; per-mission score audit |
| A9 | Moves bound to fixed spots feel scripted ("elaborate keys") | General [CONFIRMED] | Mix free moves with authored spots; give each move more than one use (traverse, attack, scout) |
| A13 | Required kill in a no-kill-rewarding game | Train Station soldier [CONFIRMED] | Non-lethal alternative, or exempt it and say so |
| A14 | Hidden countdown | UN HQ bomb [ONE SOURCE] | Show timers |
| A15 | Stacked instant-fail rules | UN HQ [ONE SOURCE] | At most one clearly communicated hard rule per mission; others escalate |
| A16 | A named villain who breaks the verb grammar (cannot be grabbed) | UN HQ [ONE SOURCE] | Keep verbs consistent, or signal the exception |
| A20 | Tutorial input ambiguity (crouch = boost, stand = throw) | Training [CONFIRMED] | Teach the handshake explicitly; a co-op tutorial stands alone |
| - | Shared-device screen with no input prompts | Train Station defusal, PC [CONFIRMED] | On-screen prompts, a visible live-wire tell and a visible device timer |
| - | Low objective density over long traversal | Nuclear Plant [INFERRED] | Keep the 5-10 min objective rhythm; break long routes with small beats |
| - | Download content gated or missing | Xbox downloads [CONFIRMED] | Deliver new missions to everyone, ungated |

General literature red flags the researchers adopted [ANALYSIS, `raw/12` Part D]: one player idle for more than about
60 s; a "co-op" puzzle one player can solve alone (CT had several: one player could hack both scanners or run both
mixing stations); a move used only once in only one way; instant fail with no warning; a room with no purpose; a
security device with no reason to be there.

---

## 4. Prototype test level: "Pumphouse Nine"

**Purpose.** The smallest original level that exercises the core CT-style co-op loop end to end: soft handshake ->
hold-and-pass -> light lure -> throw with far-side release -> rest and overlook -> reach-in from above ->
split-path-and-sync finale -> short exit. Target 5-10 minutes for a pair who know the controls; about 3 minutes for a
ghost run. Every beat names the co-op move and the mechanic it tests.

**Setting** (original). A municipal water pumping station on the Hollowmere waterfront, night shift. Two operators of
the unit (player A and player B; in campaign terms Wren and Moth) must reach the station's control floor and switch the
outflow valves to manual, which needs two control keys turned at once at consoles on opposite sides of the main pump
hall (a real two-person rule for a safety-critical action). Guards are a private security contractor's night crew. All
names are working names.

**Fiction justifying each gate** (so nothing is a bare puzzle) [design, following CT's diegetic-tutorial lesson]:
- The loading dock roller door is chained after hours; the night crew uses the side door from inside only (easy out,
  hard in).
- The pump-hall corridor camera covers the route to the control floor; the night crew is thin, so the office guard
  fixes faults himself.
- The filter gallery has a tripwire laser across its walkway after a theft; its reset panel is on the far side (an
  email from the facilities manager complains about this).
- The valve terminal sits in a locked, lit valve pit watched by a guard; the catwalk above it has a maintenance hoist
  point.
- Manual override needs two keys turned within one second at consoles 20 m apart (two-person rule printed on a
  placard at each console).

### 4.1 Beat list

| # | Beat and room | Rough size | Co-op move | Mechanic it tests | Target time |
|---|---|---|---|---|---|
| 0 | **Insertion yard.** Dark yard behind the station, one floodlight on a pole, one roaming guard on a fixed loop. Loading-dock roof edge at 3.2 m, an open clerestory window above it | 20 x 15 m outdoor; dock roof 6 x 4 m | **Boost-and-climb** (crouch to boost, boosted player hangs and is climbed) | The handshake itself (initiate, wait, complete), with an on-screen prompt naming crouch = boost and a voice line from the waiting partner; ledge height that one body cannot reach; shooting the floodlight to make a lane; light meter | 45-60 s |
| 1 | **Pump-hall corridor.** Straight service corridor, one ceiling camera at the far end covering its length, one bright fixture over the door | 25 x 3 m, 3.5 m ceiling | **Jam-and-pass, then swap** | Jammer hold: must stand still, visible charge draining, refills when released; the passer reaches cover; the second jam from the far side; the camera's view cone and its blindness in darkness | 60 s |
| 2 | **Night office and breaker cupboard.** Office with a seated guard and a desk lamp; a breaker cupboard in the corridor outside | Office 8 x 10 m; cupboard 1.5 x 1 m | **Lure and ambush** (one throws the breaker, the other waits in the dark beside the cupboard) | AI reacts to a light going out by walking to the switch; light parity (the dark spot the player sees is the spot the guard cannot see into); takedown from shadow; optional voice lure (talking near the door) if voice is in the build | 60-90 s |
| 3 | **Filter gallery.** Walkway over open filter tanks; a tripwire laser across the walkway at a 4 m gap where a grating was removed; the laser reset panel visible on the far side under a lit sign | 30 x 8 m hall; walkway 1.5 m wide; gap 4 m | **Partner throw with far-side release**; optional: throw lands on a guard who patrols the far walkway end | Throw targeting (valid / invalid landing shown before commit); the thrown player alone for 20-30 s; the release panel reunites the pair; tripwire = alarm stage, not death | 60-90 s |
| 4 | **Stair core and overlook (rest beat).** Dark stair core; a wired-glass window looks down onto the main pump hall (the finale room) and the two consoles with their lit placards | Stair core 4 x 6 m; window 3 m wide | None: regroup, plan, talk | A "both present" trigger before the next scripted event; partner indicator check; shared map; foreshadow and return (they see the consoles, the guards and the lights they will deal with); optional: shoot out a pump-hall light from here to prepare the room | 30-45 s |
| 5 | **Valve pit from above.** Catwalk with a hoist point over a lit, locked valve pit; one guard patrols the pit floor; the valve terminal sits under the hoist point | Pit 10 x 10 m, 5 m deep; catwalk 1.2 m wide | **Hang-down** (holder lowers the partner head-first; holder controls height) | Reach-in from above; hack while hanging; a near-miss as the guard walks under the hanging player (readable detection: the guard's cone does not include up); holder must stay still; the hack opens the pump-hall access and logs both keys to both players' devices (shared intel) | 90 s |
| 6 | **Main pump hall: split-path-and-sync finale.** Two-level hall with pumps; console West on the floor reached through the shadows between pumps (two patrolling guards); console East on a mezzanine reached by the catwalk route (one camera); a single pipe run and a lit status board visibly link the two consoles | 20 x 30 m, mezzanine 8 m up on one side | **Parallel routes that re-merge**, then **sync action** (both turn keys within a forgiving window, about 1 s); optional **simultaneous takedown** of the floor pair | Separate mini-challenge per player; each console shows "partner ready" when the other player is in position; a spoken or shown 3-2-1; a per-input confirmation; failure = alarm stage and a 10 s reset, never death; a one-player solve is impossible (consoles too far apart to reach within the window) | 2-3 min |
| 7 | **Exit.** A one-way drop through a floor hatch into the outflow culvert, now dry with the valves shut; 40 m walk to the extraction van | Culvert 40 x 3 m | None (or a final boost out of the culvert grate) | Commitment drop (no backtracking); short exit; the end trigger fires only when both are in the zone (decide this explicitly; CT never documented it) | 30 s |

**Totals.** About 7-9 minutes for a careful pair, about 3 minutes ghost. Co-op beats at roughly 0:00, 1:00, 2:00, 3:30,
5:00 and 6:30: a small beat every 1-1.5 minutes (denser than CT's 2-3 minutes, on purpose, because this is a test bed)
and two big beats (throw-release and the sync finale), with the rest beat between them.

### 4.2 What the level deliberately includes from CT

- A soft first move that teaches the handshake without danger (CT's openings) [ANALYSIS of confirmed beat orders].
- Hold-and-pass as the connective tissue (every CT mission).
- Light as a lure and as a lane players make themselves (every CT route).
- A throw that strands one player until he releases the other (CT's signature move).
- An overlook that foreshadows the finale and lets the pair plan (Chemical Bunker's missile hall).
- A reach-in from above with a near-miss (CT's most cinematic image).
- A split that ends in a sync, with real-world two-person-rule fiction (scanners, bombs).
- A one-way drop after the key beat.

### 4.3 What it deliberately fixes from CT

- Every co-op spot shows a prompt that names the move and who initiates (fixes the first-wall and defusal confusion).
- Every solution is in line of sight of its problem: the laser reset panel is visible from the near side; the hoist
  point is visible from the pit door; the consoles are visible from the overlook (fixes A3).
- No lethal sync failure: a missed sync raises an alarm stage and resets (fixes A5).
- Every machine shows its state: valve terminal screen, console "partner ready" lights, the status board (fixes A4).
- No player idle more than about 30 s: during the throw, the thrower watches the far walkway for the guard; during
  the hang-down, the holder controls height; on the parallel routes, both have their own challenge.
- No sync that one player can do alone (CT's scanners and mixing could be solo-run).
- A checkpoint after beats 3 and 5; a downed partner is a revive task first (fixes A1).
- No hidden timer, at most one hard rule (none here: alarms escalate).

### 4.4 What the prototype needs from the engine (checklist for the build)

- Two-player handshake framework (initiate pose, wait, complete) for boost-and-climb, partner throw and hang-down,
  each with an authored-spot marker in the test level and a "not enough room" refusal.
- Jammer hold with a visible draining charge and a stand-still rule; targets: camera, light, laser reset.
- Light switches and breakers that guards notice and walk to fix; light parity between what is drawn, the light meter
  and guard perception.
- Tripwire laser tied to alarm escalation.
- A sync-action device pair with a configurable window (start at 1 s), per-player ready state and a shared countdown.
- Partner indicator and both-present triggers.
- Checkpoint and revive (30 s window is CT's figure).
- Shared intel to both players' mission devices.

### 4.5 Measurements to take in playtests

- Time per beat against the targets above, for a new pair and an experienced pair.
- Number of failed handshakes per move (CT's main newcomer failure).
- Seconds each player spends idle per beat (target under 30 s).
- Sync attempts per success at 1.0, 0.5 and 0.25 s windows.
- Whether pairs use the overlook to plan, and whether they talk about the consoles before reaching them.
- Retell test after the session: can each player describe the throw and the finale in one sentence.

---

## 5. Open items that matter for the prototype (from the source's open questions)

- Whether both players must reach the exit zone (CT never documented it) [UNKNOWN]. Decide it ourselves.
- Whether CT had any partner marker [UNKNOWN]. Reviews say players lost each other; assume we need one.
- How guards treat two intruders (shared or separate knowledge) [UNKNOWN]. Decide it ourselves.
- Whether guard perception scaled with difficulty [UNKNOWN; players believe it did].
- What happens when both players are down at once [UNKNOWN].
- Most of the two download missions' routes [UNKNOWN].
