# Mission breakdown - Training Facility (Xbox/PC) and Team Training (PS2/GC)

**Research basis:**
- `research_notes/mission_training.md`: objectives, videos, sources.
- `research_notes/coop_moves.md`: the IGN wiki training route.

**Sources and how they are counted:**

| Code | Source | Note |
|---|---|---|
| FAN | English and Russian Fandom wiki | One source |
| IGNW | IGN wiki guide | User-edited; credits GameFAQs author VampireHorde |
| JV | jeuxvideo.com forum thread, 2005-06 | Multiple posters |
| MAN | Xbox manual and PS2 manual | Official rules |
| V339 | YouTube description by V339 | Not watched |

There is no Prima walkthrough for either training build.

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

**Overall confidence:**
- **Xbox/PC:** medium. The objective order is documented and partly corroborated. The geometry between stations is undocumented.
- **PS2/GC:** low. Almost nothing is documented.

---

## A. Xbox / PC - Training Facility

### 1. Setting and premise [SINGLE SOURCE - FAN]
- An agency training ground in Maryland, USA, set before the first deployment.
- It is an outdoor obstacle course plus a central structure of cinderblock, plywood and plasterboard with barbed wire on the wall tops, like a police or military field-skills course.
- **Briefing (paraphrase):** as trainees, the two must learn to depend on each other; nothing stands between them and failure except their wits and their partner; the course teaches tasks a single agent could not achieve.

### 2. Objective chain [SINGLE SOURCE - FAN for wording and order; individual stations corroborated as noted in §3]
All objectives are primary. Each is revealed as its station is reached (inferred from per-station wording [UNCERTAIN]).
1. Read the wall panels that explain moves and equipment. Reading them is tracked for score: a 100% rating requires re-reading at least one panel [VERIFIED - FAN + V339].
2. Get over a wall with the boost ("Short Scale").
3. Use the co-op jammer to get past a camera.
4. Throw the partner over a laser with the Tomoe Nage, then switch the laser off.
5. Hack a computer while hanging upside down ("Hangover") to switch off a laser grid.
6. Pass a door locked by two retinal scanners.
7. Use dual rappelling so a partner can reach a higher area.
8. Reach the end of the course.

Killing does not fail the mission but lowers the rating. [SINGLE SOURCE - FAN (RU)]

### 3. Ordered progression

| # | Obstacle | Solution | Co-op move | Required? | Confidence |
|---|---|---|---|---|---|
| 0 | Course start, panels on walls | Read the panel at each station; blue panels have a "replay tips" option; striped floor squares mark move spots | - | Scored | [VERIFIED - FAN, V339; striped squares SINGLE SOURCE - IGNW] |
| 1 | Wall; door locked from the far side | Crouch and boost the partner over; he opens the door | Boost | REQUIRED | [SINGLE SOURCE - FAN; first-wall confusion VERIFIED - JV] |
| 2 | Camera covering a passage | One agent stands still, holding the jammer on the camera, while the other crosses; the crossed agent then jams so the first can follow | Jammer alternation | REQUIRED (as objective) | [SINGLE SOURCE - FAN; jammer rules VERIFIED - MAN, PRIMA] |
| 3 | Laser barrier with a switch beyond it | Tomoe Nage throws one agent over; he hits the switch | Tomoe Nage | REQUIRED | [SINGLE SOURCE - FAN] |
| 4 | Laser at the entrance of a small room; computer reachable only from above | Boost and Human Ladder onto a roof, then from a striped square lower the partner upside down to hack the computer and kill the laser grid; a medkit is in the laser room | Boost + Human Ladder + Hangover | REQUIRED | [VERIFIED - FAN + JV for Hangover-hack; roof route SINGLE SOURCE - IGNW; medkit SINGLE SOURCE - FAN RU] |
| 5 | Door with two retinal scanners | Each agent hacks one scanner at the same time. One agent can hack both, but a failed hack costs health | Synchronized action | REQUIRED | [VERIFIED - FAN + JV + IGNW] |
| 6 | Barbed-wire wall, then a height | Tomoe Nage over the wall; the thrown agent climbs a pipe and starts dual rappelling; the partner climbs the rope while the holder steers him with the triggers | Tomoe Nage + Dual Rappelling | REQUIRED | [SINGLE SOURCE - IGNW; rappel objective FAN] |
| 7 | Final obstacle | A final Tomoe Nage, then reach the end | Tomoe Nage | REQUIRED | [SINGLE SOURCE - IGNW] |

**Not explicitly taught by name:** shoulder-stand, Share View, revive and Share Equipment. A training note about Share Equipment was left unused (see §D); the feature shipped. [R-04 closed]

### 4. Spatial flow [UNCERTAIN - inferred from the mechanics; no layout description found]
- **Linear.** One lesson per station, with no branches or loops documented.
- **Splits and re-merges.** Almost every station splits the pair and re-merges them immediately:
  - The wall separates them, and the door reunites them.
  - The laser separates them, and the switch reunites them.
  - The Hangover and rappel put the two agents on two levels at once.
- **Vertical layers:** ground, then roof, then the inside of a room seen from above.

### 5. Security [SINGLE SOURCE - FAN unless noted]

| Element | What is documented |
|---|---|
| Cameras | One |
| Lasers | At least two, plus a laser-grid room |
| Retinal scanners | One door with two scanners [VERIFIED - FAN + JV] |
| Barbed wire | Present |
| Guards | None documented. End statistics hint at one knock-out-able figure. [UNCERTAIN] |
| Lighting, noise | Not documented |

### 6. Split and regroup design
- Every split is short (seconds) and has a built-in reunion device: a door, a switch, a rope.
- The camera station teaches the core co-op rhythm: hold, move, swap.
- The retinal door teaches the "rendezvous lock": both bodies at two devices at once.

### 7. Pacing curve
- A flat tutorial cadence: read, perform, move on. Danger appears only through the health cost of a failed scanner hack. [SINGLE SOURCE - FAN]
- Length is short: 3-4 minutes for expert runs, 9-16 minutes casually. [VERIFIED - several video lengths]

### 8. Wow moments
- No training-specific player commentary was found.
- The moves introduced here are the ones reviewers later celebrate: the partner throw, the upside-down hack and the jam-and-run. [SINGLE SOURCE - NWR and general reviews]
- The first throw over a laser is the mode's signature moment, and here it is the third thing players do.

### 9. Frustrations, exploits, flaws
- **Stuck at the first wall.** Players got stuck at the very first wall, unsure whether to crouch or stand. The two-tier input (crouch = boost, stand = throw) was not obvious. [SINGLE SOURCE - JV, several posts]
- **Hacking confusion.** Players were confused by retinal-scanner hacking. [SINGLE SOURCE - JV]
- **Panel re-read for 100%.** Getting 100% requires a pointless panel re-read. [VERIFIED - V339 + FAN]
- **Assumed solo knowledge.** The tutorial teaches only co-op moves and assumes solo knowledge of the basics. [SINGLE SOURCE - Steam]
- **Possible progression bug.** After a later mission, the game reportedly reloaded Training instead of continuing. [SINGLE SOURCE - JV; UNCERTAIN]

### 10. Loadout (per agent, identical) [SINGLE SOURCE - RUW]
- Rifle 30 rounds, pistol 20 rounds with jammer, one adrenaline syringe.
- In Elite mode, both firearms start with zero ammunition.

### 11. Key videos (not watched; full list in research notes)
- Centerstrain01, 100% stealth, part 1 (15:56): https://www.youtube.com/watch?v=0hK1AeB07wk
- Agt_ Pendergast, "Coop [1: Training]" (15:32): https://www.youtube.com/watch?v=1_spcLojzxo
- V339, 100%/Expert/Elite/Ghost (4:03): https://www.youtube.com/watch?v=2VRGQUT2JvQ
- hexen2k7, 100% Elite no KO/kill (3:14): https://www.youtube.com/watch?v=WQ__XNyWP0M
- DeepVelocityOps, full co-op campaign (7:22:04): https://www.youtube.com/watch?v=4GtVpbf1xAw

---

## B. PS2 / GameCube - Team Training

### What is known
- **Place in the menu.** It sits outside the four-mission campaign as its own "Training" entry in the co-op menu. [VERIFIED - PS2M + FAN + PRIMA]
- **Objective.** One primary objective: work together to reach the end. No end-of-level statistics screen. [SINGLE SOURCE - FAN]
- **Contents:**
  - one laser-grid computer (an objective, not a security hack on this build);
  - two retinal scanners;
  - one neutralised figure in the statistics.
  - [SINGLE SOURCE - FAN RU]
- **Loadout.** Rifle 60, pistol 40, flash grenade 1, adrenaline 2 for each agent. [SINGLE SOURCE - FAN]
- **Length.** 4-7 minute videos; a speedrun record of about 1:27. [VERIFIED for video lengths; record SINGLE SOURCE]
- **Load times.** A GameCube reviewer complained about long, frequent loads between sections. [SINGLE SOURCE - NWR]

### Unknown
Station order, which moves are taught, layout, briefing text, whether a jammer exists. [GAP - OPEN_QUESTIONS R-05]

### Key videos (not watched)
- Ziggity, PS2 US, 01 Team Training (7:16): https://www.youtube.com/watch?v=obcKEeRniRw
- WalkthroughCinema, PS2 (4:20): https://www.youtube.com/watch?v=gy1Vt3pxX8U
- SHOCK-25, PCSX2, mission 0 (5:36): https://www.youtube.com/watch?v=MmH3o7WF4wg

---

## C. Design reading (analysis)

| Observation | Principle it suggests |
|---|---|
| Every move gets one dedicated station, objective and panel | Teach each co-op verb in isolation before combining |
| The order runs boost, jam, throw, hang, sync, rappel | Moves get more interdependent along the way. Early ones barely need the partner (he only completes the move). Later ones need continuous partner control (the rope holder steers) and simultaneity (scanners) |
| Every split resolves within seconds via a reunion device | Training normalises splitting before real missions make splits long and dangerous |
| The mission is a fictional training course | The tutorial is justified in-world, so the obstacle-course architecture is honest about being artificial. Real missions then have to make the same verbs plausible in real buildings |
| Players stalled on input ambiguity (crouch vs stand) | A tutorial must teach the handshake itself (initiate, then complete) explicitly |

## D. Gap-closing update

- **Revive rule from the in-game training text.** Each agent carries one adrenaline syringe, so the pair can revive twice per mission. [VERIFIED - Xbox build + PC 1.05 text]
- **Share Equipment.** The training note was deliberately unused, per a designer comment; the feature itself shipped (R-04 closed). [SINGLE SOURCE - level file]
- **Training text.** When one agent reads a computer, **both agents' mission devices update**. [VERIFIED - game text]
- **PS2/GC Team Training** (community comments; R-05 partial, SINGLE SOURCE each):
  - The first-wall boost input on GameCube.
  - The boosted agent must press the co-op input again after landing for the ladder step.
  - A throw used on an enemy.
  - A North Korean soldier used as the training target.
  - The last area needs only one player to reach the exit.
