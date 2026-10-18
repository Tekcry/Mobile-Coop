# Mission breakdown - Train Station (Xbox/PC and PS2/GC)

**Research basis.** `research_notes/mission_train_station.md`: step list, codes, 28 video links and sources.

**Sources:**

| Code | Source | Note |
|---|---|---|
| PRIMA | Prima eGuide routes | Xbox/PC step order rebuilt from scrambled OCR |
| FAN | English and Russian Fandom wiki | Counted as one source |
| Suru | Video with uploader-typed objective timestamps | Not watched |
| hexen2k7 | Video description listing objectives | Not watched |
| SHOCK-25 | PS2 stats | Not watched |
| AT | AnandTech thread | |
| EG | Elder-Geek | |

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

---

## A. Xbox / PC

### 1. Setting and premise [VERIFIED - FAN + hexen2k7 + PRIMA]
- **Mission.** A rogue colonel refused his army's withdrawal and fled with bio-weapon warheads. He resurfaced with defectors who have seized New York's main rail terminal, with no demands. The pair must stop any release and learn his real aim.
- **Approach.** Infiltration starts deep underground (sewers, repair yard, service tunnels) and rises to the great hall.
- **The colonel** is heard only on a phone call, never met. [VERIFIED]
- **Campaign position.** This was the **original retail finale.** The guide, written before the downloads, calls it the final mission. [VERIFIED - PRIMA + several uploaders]

### 2. Objective chain [VERIFIED - PRIMA + FAN + hexen2k7: same six primaries]
1. Work out the colonel's real agenda.
2. Defuse the bombs under the station (three, per the briefing).
3. Bug the payphone in the main hall before the colonel's agent reaches it.
4. Get the antidote from a locker.
5. Eliminate the contaminated soldier in the washroom.
6. Stop the colonel's men leaving with the rest of the toxin.

**Opportunity objectives:**
- Follow the agent to the locker. [VERIFIED]
- Secure the toxin vial from the infected soldier. [VERIFIED]
- Recover bomb schematics from the first computer. [Listed by FAN and hexen2k7, absent from the guide's box - UNCERTAIN]

**The phone call drives the reveals.** After the bug is placed, the pair must wait and listen. The agent and the colonel discuss a man who infected himself and is hiding in a washroom, and an antidote in a locker. That sets up objectives 4-6. [Content SINGLE SOURCE - PRIMA; "long call" VERIFIED by a speedrun note]

The locker code comes from interrogating the agent. [VERIFIED]

### 3. Ordered progression (guide route, reconstructed)

| # | Space | Obstacle and solution | Co-op element | Req? | Confidence |
|---|---|---|---|---|---|
| 1 | Sewer | Hand-over-hand along an overhead pipe over a gap; knock out a guard in shadow; sticky-cam gas on a second guard; another pipe over crates | - | - | [SINGLE SOURCE] |
| 2 | Train repair yard | Climb shelves through a hole in the wall; kill all the lights; take guards in the dark. A track-mounted **turret**: one agent jams it while the other runs behind and switches it off | Turret flank | Req in practice | [SINGLE SOURCE] |
| 3 | Water tunnel - bomb pair 1 | Two bombs on facing walls linked by a **laser**; touching it detonates them. One agent shoots a far light to lure a guard; the other **throws his partner over the laser to land on the guard**. Take the second guard. Each agent goes to his bomb (one via a side door) and **both cut the live wire at the same instant**, with thermal vision showing which wire pulses live | Throw-attack + sync cut | Cut req; throw route-specific | [Throw SINGLE SOURCE; sync cut VERIFIED - PRIMA + FAN + AT + EG] |
| 4 | Tunnel end | Boost + Ladder to a ledge, ladder down. One agent jams a light while the other opens the machine-room door and shoots its light | Boost + Ladder; light play | Req (height) | [SINGLE SOURCE] |
| 5 | Machine room - pair 2 | While guards check the dead light, hug the wall to the bombs; creep along the laser without touching it; sync cut | Sync cut | Req | [SINGLE SOURCE route; cut VERIFIED] |
| 6 | Metro platform - pair 3 | **A parked train splits the pair**: one goes through the shadows on one side, the other through the narrow gap on the other. Sync cut. Regroup *through* the dark train car | Forced split / regroup | Req | [SINGLE SOURCE] |
| 7 | Stairs, escalators | Cross the tracks behind a static guard; a sticky shocker on the phone-booth guard; shoot the escalator light and a lit billboard | - | Opt | [SINGLE SOURCE] |
| 8 | Ticket booth | **Boost** one agent onto the booth roof; he drops through a trapdoor onto the guard inside and opens the door for his partner | Boost + trapdoor ambush | Req on this route | [SINGLE SOURCE] |
| 9 | **Main hall payphone** | Behind the central circular phone booth: Boost + Ladder onto its roof, then a **Hangover** from the front edge so the hanging agent plants the bug on the phone. Then **wait and listen** to the call | Boost + Ladder + Hangover | Req (method single-source) | [Objective VERIFIED; method SINGLE SOURCE] |
| 10 | Tail | Follow the agent to the locker room unseen. One agent takes his bodyguard while the other grabs and interrogates the agent for the code. One agent opens the locker and injects the antidote | Moving-target stealth; role split | Req | [Code VERIFIED; agent's fate conflicts - PRIMA interrogate vs FAN RU/Suru death - R-17] |
| 11 | Transit police office | Take the guards | - | - | [SINGLE SOURCE] |
| 12 | **Contaminated washroom** | **Only the injected agent may enter**; entering without the antidote kills. He stabs the infected soldier (a scripted kill) and takes the vial. Afterwards the partner may enter | Forced asymmetric split | Req | [VERIFIED - PRIMA + FAN RU] |
| 13 | Ceiling duct | Boost + Ladder into the washroom ceiling; crawl; drop into the final metro station | Boost + Ladder | Req | [VERIFIED - PRIMA + Neoseeker snippet] |
| 14 | Finale | One agent goes down an escalator for a guard while the other covers, shooting lights. Take the last guards. **Leap onto a glass dome, smash through, land on the roof of the escaping train** | Spectacle exit | Req | [SINGLE SOURCE] |

**Beat timing cross-check.** Suru's Elite 100% run hits these marks: schematics 1:36, bombs 3:06 / 4:43 / 5:28, bug 7:24, the agent 10:56, extraction 13:30. The order matches the guide. [VERIFIED order]

### 4. Spatial flow [SINGLE SOURCE - PRIMA; overall shape consistent with Suru]
- **Down, up, down.** Sewer (lowest), then service layers (repair yard, water tunnel, machine room, metro), up the stairs and escalators to the ticket hall and **the great hall** (the one big public space), then back down through a washroom ceiling duct to the final platform, ending with a drop onto a train.
- **Branch.** One: the platform split on either side of the train, re-merging through the car.
- **Chokepoints.** Each laser-linked bomb pair, the turret, the ticket booth, the phone booth, the single-entrant washroom and the duct.
- **Locks off the main route.** Locked doors on two bomb rooms and a warehouse probably belong to alternate routes. [SINGLE SOURCE - FAN; inference]

### 5. Security
- **Laser-linked bomb pairs.** The defining device: a tripwire between two bombs, plus a two-stage, pulsing live wire. [VERIFIED]
- **Turret.** One, in the repair yard.
- **Light-reactive guards.** The guide's route uses light kills throughout.
- **The agent and his bodyguard** move through the station on a script.
- **Contamination hazard** in the washroom. [VERIFIED]
- **Alarms** escalate through armour, helmets and fortified positions. [SINGLE SOURCE - FAN]
- **Civilians.** None documented. [GAP]

### 6. Split and regroup

| Moment | Split | Regroup / enforcement |
|---|---|---|
| Bomb pairs | One agent per wall | Regroup after the cut. Pair 1 also puts them on opposite sides of the laser |
| Platform | Split by the train | Regroup through the car |
| Washroom | The single antidote dose forces one agent alone into a lethal room | Partner follows after the kill |
| Ticket booth | Boost puts one inside | Partner let in through the door |

### 7. Pacing curve
1. **Act 1, underground (about 45% of a fast run).** Sewer stealth, a light-killing arena, then three defusals in quick succession. Each wire cut is a tension spike.
2. **Act 2, public space.** Escalator climb, booth ambush, the payphone set piece. The forced wait during the call is the main rest beat and the story reveal.
3. **Act 3, tail and contamination.** Moving-target stealth, interrogation, a lone agent in the lethal washroom.
4. **Finale.** Duct, last guards, through the glass dome onto the train.

**Timer.** No on-screen timer documented. [UNCERTAIN]

**Length.** About 12-14 min for expert ghost runs, 30-70 min casually, under 5 min for a world-record run. [VERIFIED - video lengths]

### 8. Wow moments
- **Throwing a partner over a bomb's laser onto a guard.** [SINGLE SOURCE]
- **Two-person defusal.** A laser tripwire and a live wire that moves. Reviewers highlight synchronized wire cutting. [VERIFIED - EG, reception.md]
- **Bugging the payphone.** Hanging upside down from the roof of the central booth in a vast hall to bug the phone, then eavesdropping on the villain. [SINGLE SOURCE]
- **Trapdoor drop** onto a guard. [SINGLE SOURCE]
- **One-man entry** into a contaminated room. [VERIFIED]
- **Exit by smashing through a glass dome onto an escaping train.** [SINGLE SOURCE]

### 9. Frustrations, exploits, flaws
- **PC defusal controls.** Players were unsure how to operate the dual-defuse interface on PC. [SINGLE SOURCE - AT]
- **Lower platform.** Players got stuck finding the way to the lower platform, which is through a washroom ceiling vent. [SINGLE SOURCE - Neoseeker snippet]
- **HUD symbols.** Confusion over HUD symbols, probably the alarm counter. [SINGLE SOURCE]
- **Scripted kills.** Scripted lethal beats (the soldier, and possibly the agent) clash with no-kill play. [VERIFIED for the soldier]
- **Speedrun skip.** Speedrunners skip most of the phone call. [SINGLE SOURCE]
- **Possible 100% blockers.** Some missions may have glitches that block 100%. [SINGLE SOURCE]

### 10. Loadout [SINGLE SOURCE - FAN RU; Agent Two VERIFIED with PRIMA]

| Agent | Kit |
|---|---|
| Agent One | Rifle 60, sticky cam 1, shocker 3, airfoil 3, pistol 40, flash 2, adrenaline 1 |
| Agent Two | Rifle 60, sticky cam 3, pistol 40, frag 2, adrenaline 1 |

### 11. Key videos (not watched)
- Suru, 100% with objective timestamps (13:38): https://www.youtube.com/watch?v=-JnlamHBZrc
- hexen2k7, 100% Elite no KO/kill, part 1 (6:36): https://www.youtube.com/watch?v=2X5MvQPOQ14
- PleasePlayMore, PC Expert 100% (32:09): https://www.youtube.com/watch?v=Iduxc5xLfnM
- Agt_ Pendergast (32:04): https://www.youtube.com/watch?v=B0INvKmshWg

---

## B. PS2 / GameCube (four sub-levels, third mission of that campaign)

**Rules for this build:**
- Saves come only between sub-levels, and three alarms fail a sub-level. [VERIFIED save; alarms SINGLE SOURCE]
- No payphone, antidote, washroom or train finale. The mission ends at a locker. [VERIFIED]
- **Four** bomb pairs are defused despite the "three bombs" briefing. [VERIFIED - PRIMA + SHOCK-25]

| Sub-level | Objectives | Route essentials (guide) | Co-op content |
|---|---|---|---|
| Train Repair Station | Defuse the bombs; (secondary) find defusal information | **Rappel** a partner down an elevator shaft; he calls the car. **The elevator splits the pair**: one gets off on an upper floor, the other rides to the bottom, into two parallel tunnels. One disarms a mine, climbs shelves, takes a guard by a train and one inside a car. The other disarms several mines, **blows an iron gate with a charge**, and climbs a ladder to regroup. A computer gives the schematics and a door code [VERIFIED code]. Bomb pair with a laser: sync cut; thermal *or controller vibration* shows the live wire | Rappel; parallel tunnels; sync cut |
| Hydro Tunnel | Bombs 2 and 3 | Multi-level walkways with gaps: **throw** across, then the thrown agent sets a **rope for his partner to climb up**, twice, leapfrogging. A camera guards a laptop: one jams it (tapping to save charge) while the other hacks [VERIFIED - PRIMA + Ziggity]. A switch blacks out a tunnel: take two guards, defuse pair 2. **Boost + Ladder** to a walkway; one agent spots with a sticky camera while the other takes a walkway guard and a floor guard; defuse pair 3 | Throw / rope leapfrog; jam-and-hack; spotter + actor |
| Subway | Last bomb; exit to the station | Sticky-cam lure and gas two patrols; mine; computer; sync cut either side of a train. **Turret on the stair landing**: alternating jam ("cover me") up the stairs. Boost + Ladder onto a ticket booth, trapdoor, break the lock [VERIFIED lock] | Turret leapfrog |
| The Station | Get the locker code from the agent; get the toxin from the locker | Boost one agent to a high walkway, back to a pillar. The agent and his bodyguard stop right beside him and talk; **he must not move**. Then he grabs and interrogates [VERIFIED code]. **Paired switches** open an elevator; slide down the elevator **cable** to the car roof; trapdoor; paired switches again. Parallel routes into the locker room (ceiling pipe vs door). Open the locker | High ambush; paired switches; cable slide |

Routes are [SINGLE SOURCE - PRIMA] unless marked.

**Loadout (identical for both agents):** rifle 60, sticky cam 2, pistol 40, frag 1, adrenaline 2. The guide's box shows a flash grenade instead [R-18].

**Key videos (not watched):**
- Ziggity, PS2 (30:34): https://www.youtube.com/watch?v=ge7dEnjp6MU
- SHOCK-25, PCSX2 (33:06): https://www.youtube.com/watch?v=gxnoQJNrPV8

---

## C. Design reading (analysis)

1. **A real place, explored by its service layers.** The pair rises from sewers through the station's working back-of-house (repair yard, water tunnels, machine room) into the famous public hall, then drops back into service space. The landmark is earned by ascent.
2. **A device built for two.** Laser-linked twin bombs make a single trap that only two people can solve. The tripwire divides the pair spatially, and the simultaneous cut joins them in time. It is the clearest single co-op device in the campaign.
3. **The eavesdrop as a narrative hinge.** A forced wait during a phone call is a rest beat, a story reveal and an objective generator at once.
4. **Asymmetry by item scarcity.** One antidote dose means one agent alone in a lethal room. The fiction, not a rule, assigns roles.
5. **A spectacle exit in a public space.** A glass dome, a moving train, a leap: the original finale ends on movement, not a cutscene.
6. **The PS2/GC version shows co-op as gating.** Each throw is answered by a rope, each elevator by paired switches, each turret by a leapfrog. It is more repetitive but very clear about interdependence.
7. **Watch-outs.**
   - A scripted lethal beat (the soldier) in a mission whose scoring rewards non-lethal play is a mixed message.
   - The dual-defuse interface was unclear to some PC players.

## D. Gap-closing update (primary game files + community)

- **Locker and code.** Locker number 9201 is told to the agent on the phone; key code 0315 is obtained when **both agents interrogate him together**. Both earlier sources were right (R-17 partly closed). [VERIFIED - game text]
- **The agent's fate.**
  - He must not be killed before the locker stage, or the mission fails.
  - After that, a script allows killing or knocking him out.
  - A 100%, zero-kill run labels this beat "Killing Chu", which suggests a scripted death that does not count as a player kill. [UNCERTAIN - leaning scripted]
- **Bomb procedure as players describe it** [VERIFIED - 6+ independent comments across PC, PS2 and GameCube]:
  1. Both agents select the bomb.
  2. Each uses thermal vision to find the hot wire.
  3. Both cut at the same moment.
  4. Repeat for a second wire before a timer runs out.
  - It is the single most-asked "how do we do this" moment in player comments, so it is both the tensest and the most confusing beat.
- **Music.** The map adds the solo penthouse music set to the common set (see 15). [VERIFIED - map settings]
