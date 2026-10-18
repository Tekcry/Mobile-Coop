# 05 - Co-op moves catalogue

Every two-player move and team interaction in the *Chaos Theory* co-op mode, with inputs, animation flow, the level-design problem each one solves, where it is used and how it is signposted.

**Sources:** the Xbox manual (XBM, co-op chapter pp. 20-28), the PS2 manual (PS2M), the Prima Official eGuide (PRIMA, all-platform co-op chapter and walkthroughs), the English and Russian Fandom wikis (FW/RUW, counted as one source family), the IGN wiki guide (IGNW), and a GamesFirst 2005 preview (GF). Full URLs and notes are in `research_notes/coop_moves.md`, `research_notes/coop_gadgets_controls_comms.md` and `01_sources.md`.

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

---

## 1. How the game organises co-op actions

| Family | Members | Trigger | Where usable | Confidence |
|---|---|---|---|---|
| **Free ("generic") moves** | Boost (Short Scale), Tomoe Nage (Long Jump), Human Ladder | Dedicated Co-op Action button; the whistle button is repurposed for it | Almost anywhere there is room | [VERIFIED - XBM, PS2M, PRIMA] |
| **Contextual ("static") moves** | Dual Rappelling, Hang Over Teammate ("Hangover"), Stand on Teammate's Shoulders | Normal Interact button, choosing a named entry in the HUD interaction menu | Only at spots the designer placed | [VERIFIED - XBM, PS2M, PRIMA] |
| **Team interactions** | Share View, Heal/Revive, Share Equipment | Interaction menu when near the partner (Share View works at any distance) | Anywhere | [VERIFIED - XBM, PS2M, PRIMA] |
| **Synchronized actions** | Paired retinal scanners, paired bomb wires, paired switches/code locks (PS2/GC), crane direction | Interaction menu at paired devices | Mission-specific set pieces | [VERIFIED - XBM, PRIMA; paired switches PS2/GC SINGLE SOURCE - PRIMA] |

**The handshake.** Every move uses the same two-step contract. One player *initiates*: they adopt a pose and wait. The other player walks over and *completes* with the same button or menu entry, and only then does the animation play. While the first player waits, an automatic voice line tells the partner they are ready. The partner's HUD also shows a Co-op Action icon. A second line plays on completion. [VERIFIED - XBM, PS2M, PRIMA]

**Graceful failure.** A free move started where there is not enough space makes the agent shake his head, and the controller vibrates. No penalty applies. [SINGLE SOURCE - XBM]

**Count.** A 2005 preview mentioned "about 10" co-op moves. The shipped manuals document six named moves (three free, three contextual), plus the team interactions and the synchronized set pieces. [6 moves VERIFIED; "10" SINGLE SOURCE - GF]

**Design reading.** This two-tier split is the main structural idea:
- **Free moves** give players a toolkit for *improvised* routes, so designers can scatter optional ledges and gaps.
- **Contextual moves** let designers *author* specific set pieces, such as a ceiling hatch over a keypad, without the move breaking the level anywhere else.

---

## 2. Free moves (Co-op Action button)

### 2.1 Boost / "Short Scale"
- **Names.** "Short Scale/Boost" in both manuals, "Boost" in PRIMA, "Short Scale" in the training objective. [VERIFIED]
- **Inputs.** The initiator crouches and presses Co-op Action. The partner walks up and presses Co-op Action.

  | Platform | Co-op Action button | Confidence |
  |---|---|---|
  | Xbox | Black | [VERIFIED] |
  | PS2 | L2 | [VERIFIED] |
  | GameCube | Z + D-pad Left | [SINGLE SOURCE - FW] |
  | PC | F or Page Down by default | [SINGLE SOURCE - FW] |

- **Animation flow.** The crouched agent offers cupped hands or a knee, the partner steps in and is lifted. The boosted agent either grabs a ledge or pipe above, or vaults clean over a low wall. [Outcomes VERIFIED - XBM, PS2M; pose UNCERTAIN, read from the manual pictogram]
- **Problem solved.** Reaching a height one body cannot reach: a window, a high ledge, a wall top. Designers use it to give a pair an entry route a lone guard would never expect, and to put one agent on the far side of a locked barrier so they can open it from inside.
- **Usage.** On the guide's routes it is the most common move. Each Xbox/PC mission uses it about 3-5 times, usually chained with Human Ladder:

  | Mission | Boost spots on the guide's route |
  |---|---|
  | Panama | Courtyard window; ceiling opening |
  | Seoul | Hotel hole; floor hole; low wall; cafe window |
  | Train Station | Tunnel ledge; phone booth; bathroom ceiling; ticket-booth roof (then drop through a trapdoor onto a guard) |

  The PS2/GC routes use it 1-2 times per mission. [SINGLE SOURCE - PRIMA for counts]
- **Signposting.**
  - **Training.** The first training objective is "jump over the wall using the Short Scale". The boosted agent goes over and opens a door from the far side. Striped floor squares mark where to do it. [Objective VERIFIED - FW, RUW, IGNW; striped squares SINGLE SOURCE - IGNW]
  - **Missions.** No markers. Ledges and windows read as climbable at a two-person height.

### 2.2 Tomoe Nage / "Long Jump"
- **Names.** "Tomoe Nage/Long Jump" in the manuals; "Tomoe Nage" in PRIMA and FW. Tomoe nage is a real judo sacrifice throw. [VERIFIED]
- **Inputs.**
  - The initiator stands, faces *away* from the landing direction and presses Co-op Action.
  - A landing reticule appears, and the initiator steers it. A red reticule means the throw is not possible.
  - The partner presses Co-op Action and is thrown.
  - [VERIFIED - XBM, PS2M, PRIMA; "standing not crouched" SINGLE SOURCE - PRIMA]
- **Animation flow.** The thrower rolls backwards and launches the partner with his feet in a flying arc over the obstacle. [SINGLE SOURCE - FW plus the manual pictogram]
- **Problem solved.** Crossing a horizontal barrier that cannot be walked through: a laser grid, a gap between walkways, barbed wire. [VERIFIED - PRIMA, FW]
- **Second use: a weapon.** Anyone standing near the landing point is knocked out. [VERIFIED - XBM, PS2M, PRIMA, FW] The guides turn this into a tactic:
  - In Train Station, one agent shoots out a light to lure a guard, then the partner is thrown over a bomb's laser to land on him. [SINGLE SOURCE - PRIMA]
  - The IGN wiki suggests throwing agents onto courtyard guards in Panama, or setting up a throw behind a door a guard will open. [SINGLE SOURCE - IGNW]
- **Usage.**

  | Build | Uses per mission | Examples |
  |---|---|---|
  | Xbox/PC | 0-2 | Training (twice); Chemical Bunker (over a laser set; over the cryotank); Train Station (onto a guard) |
  | PS2/GC | 0-2 | Seoul (across water onto a dock); Train Station (across two walkway gaps); Panama (across lasers, then the thrown agent hacks a scanner to drop them) |

  [SINGLE SOURCE - PRIMA]
- **Signposting.** Training teaches it with "throw your teammate over the laser and deactivate it with the switch". The thrown agent's reward is a switch that lets the thrower follow. [VERIFIED - FW, RUW]
- **Why players loved it.** It is a spectacular, slightly absurd acrobatic stunt that also solves a puzzle. It also produced community humour, such as a fan video titled "Operation Throw Torgos" (see `research_notes/videos.md`). [UNCERTAIN as a "why"; see 11_wow_moments.md for reception evidence]

### 2.3 Human Ladder
- **Inputs.** The agent already hanging from a ledge (or pipe - PS2M) presses Co-op Action. The partner stands beneath and presses Co-op Action, then climbs up the hanging agent's body to the ledge. [VERIFIED - XBM, PS2M, PRIMA]
- **Problem solved.** It is the "second half" of a Boost: after one agent is boosted up, this brings the other agent up as well, so the pair does not get stranded. [VERIFIED - PRIMA]
- **Usage.** Almost always paired with Boost. See the counts in 2.1. [SINGLE SOURCE - PRIMA]
- **Design note.** Boost followed by Human Ladder is a complete, symmetric two-step climb. Both players act twice, and the pair ends up together. This avoids the classic "one player stuck below" problem.

---

## 3. Contextual moves (interaction menu at placed spots)

### 3.1 Dual Rappelling ("Co-op Dual Rappelling")
- **Inputs.**
  - At a rope anchor, one agent picks "Initiate Rappelling" and the other picks "Complete Rappelling". [Exact labels SINGLE SOURCE - PRIMA]
  - The rope-holder swings the rappelling partner side to side with the triggers:

    | Platform | Swing controls | Confidence |
    |---|---|---|
    | Xbox | L/R triggers | [VERIFIED] |
    | PS2 | L1/R1 | [VERIFIED] |

  - The rappeller moves up and down with the left stick and can use weapons. [VERIFIED - XBM, PS2M, PRIMA]
- **Variants.**
  - Lowering the partner down a shaft or silo.
  - Letting the partner climb *up* a rope the holder extends from above. [Up variant SINGLE SOURCE - PRIMA; training wording "help your teammate reach the upper part" SINGLE SOURCE - FW]
- **Animation flow.** The holder braces on a ledge, playing out rope. The partner hangs on the wall below. [SINGLE SOURCE - XBM pictogram]
- **Problem solved.** It gives a vertical descent or ascent with no fixed ladder. The holder becomes the operator, steering the partner around hazards such as wall alarm sensors.
- **Usage.**

  | Build | Mission | Use |
  |---|---|---|
  | Xbox/PC | Chemical Bunker | Down the silo. The rappeller presses a panel at the bottom, then climbs back up the rope. |
  | PS2/GC | Chemical Bunker | Down the silo, past wall alarm detectors |
  | PS2/GC | Train Station | Three times: down an elevator shaft, and twice up to walkways |
  | Both | Training | One use: up and over |

  [SINGLE SOURCE - PRIMA for missions; FW/RUW for training]
- **Signposting.**
  - **Interaction menu.** The menu entry appears only at the anchor.
  - **Voice lines.** Without a headset, the rappeller can send automatic "Left"/"Right"/"Stop" lines by holding the left stick. [VERIFIED - XBM, PRIMA]

### 3.2 Hang Over Teammate ("Hangover")
- **Names.** "Hang Over Teammate" in the manuals; "Hangover" in PRIMA and training. [VERIFIED]
- **Inputs.** The rope holder lowers the partner head-first, suspended by a rope at the ankles, usually through a ceiling hatch or hole, and raises or lowers him with the triggers. [VERIFIED; ankles/hatch detail SINGLE SOURCE - PRIMA]
- **What the suspended agent can do.**
  - Hack computers and keypads.
  - Fire the pistol, including the jammer.
  - Pull up into an "inverted crouch" to hide.
  - Grab and neck-snap an unaware guard below.
  - [VERIFIED - XBM, PS2M, PRIMA]
- **Voice lines.** The suspended agent can send automatic "Up"/"Down"/"Stop" lines. [VERIFIED - XBM, PRIMA]
- **Problem solved.** Reaching an object in a room the pair cannot enter by the floor, because the floor is guarded, lasered or locked. It gives designers a vertical "reach-in" puzzle: the guarded room's ceiling is the entrance.
- **Usage.** About one per mission.

  | Build | Mission | Use |
  |---|---|---|
  | Training | - | Hack a laser-grid computer |
  | Xbox/PC | Panama | From inside an air duct, hack a keypad that opens the exhibition gates |
  | Xbox/PC | Chemical Bunker | Collect the anti-virus from the top of the cryotank |
  | Xbox/PC | Train Station | From the top of a phone booth in the main hall, plant a bug on the payphone |
  | PS2/GC | Chemical Bunker | Collect the anti-virus |
  | PS2/GC | Panama | Lower the partner down a shaft to grab a fuse |

  [SINGLE SOURCE - PRIMA; training VERIFIED - FW, RUW]
- **Why it delights.** It is the most cinematic move: an upside-down agent dangling a metre above a guard's head. It is also the clearest picture of "my life is literally in my partner's hands".

### 3.3 Stand on Teammate's Shoulders
- **Inputs.** One agent picks "Initiate Climb Shoulder"; the partner picks "Complete Climb On" and climbs up. The top agent can interact with high objects and use weapons. [VERIFIED - XBM, PS2M; labels SINGLE SOURCE - PRIMA]
- **Problem solved.** Interacting with something just out of reach, without needing a ledge to grab. Examples are a charge placed high on a vehicle, or a hatch.
- **Usage.**

  | Mission | Use | Confidence |
  |---|---|---|
  | Seoul (both builds) | Placing explosive charges on the rear of the two anti-aircraft vehicles; the OPSAT note says to climb on your partner's shoulders | [VERIFIED - PRIMA, FW/RUW mission note] |
  | PS2/GC Panama | Placing a charge to open an elevator trapdoor | [SINGLE SOURCE - PRIMA] |

---

## 4. Team interactions

### 4.1 Share View
- When one agent uses a sticky camera, the other can pick "Accept View Sharing" to watch the feed. [VERIFIED - XBM, PS2M, PRIMA]
- It is disabled in split-screen, because the partner can simply look at the other half of the screen. [SINGLE SOURCE - XBM]
- **Design value.** It turns the camera into an "overwatch" tool: one player scouts and the other reads the same picture. This is the seed of the overwatch-and-infiltrate pattern (08).

### 4.2 Heal / Revive
- At zero health an agent drops unconscious. The partner has about 30 seconds to reach him and inject adrenaline from the interaction menu, which restores about half health. Otherwise the mission fails. [VERIFIED - XBM, PS2M, PRIMA, RUW]
- Each agent carries one syringe, so the team can revive twice per mission. The guide's "two each" is wrong for Xbox/PC. [VERIFIED - in-game training text on Xbox and PC + XBM, PS2M]
- An automatic voice line tells the partner a downed agent needs help. [SINGLE SOURCE - PRIMA]
- **Quirk.** In Chemical Bunker players can skip a lift ride by dropping down the shaft (fall damage downs rather than kills) and reviving at the bottom. [SINGLE SOURCE - RUW]

### 4.3 Share Equipment
- Equip an item, approach the partner and pick "Share Equipment". Only items marked with a dot can be given, and the request can be cancelled before it is accepted. [VERIFIED - XBM, PS2M, PRIMA; cancel SINGLE SOURCE - PS2M]
- The Fandom wiki lists a training text about it as deleted content. A designer comment in the training level confirms that only that note was unused; the feature shipped. [SINGLE SOURCE - Xbox build level file; R-04 closed]
- **Design value.** Combined with the *asymmetric* Xbox/PC loadouts (Agent One carries shockers, airfoil rounds and cameras; Agent Two carries grenades - see 06), sharing makes inventory a team resource.

---

## 5. Synchronized actions (two bodies, one moment)

| Action | How it works | Where | Confidence |
|---|---|---|---|
| Paired retinal scanners | Two scanners must be satisfied at once. In training each agent hacks one, and a failed hack costs health. In missions the pair often grabs two captives and forces them to the scanners simultaneously. | Training; Panama (a security guard and the VP); Chemical Bunker (two captives); PS2/GC Panama exit door and final door | [VERIFIED - FW, PRIMA, IGNW] |
| Paired bomb wires | Both agents cut the live wire at the same moment. Thermal vision shows which wire is live, and on PS2/GC controller vibration also cues it. In Train Station the bombs are protected by a laser between the pair, and touching it fails the mission. | Train Station (three bombs, both builds); Chemical Bunker missile warhead (Xbox/PC) | [VERIFIED - PRIMA, FW] |
| Paired switches | Buttons on both sides of a door or elevator pressed together | PS2/GC Seoul, Chemical Bunker, Train Station | [SINGLE SOURCE - PRIMA] |
| Paired code lock | Two codes locked in at the same moment on a missile warhead | PS2/GC Chemical Bunker | [SINGLE SOURCE - PRIMA] |
| Two-station mixing | The anti-virus is mixed at two cryotank stations, with each agent handling one colour set. On Xbox/PC the colour sequence is randomised per mission and difficulty (3, 4 or 5 steps). | Chemical Bunker | [VERIFIED - FW table, PRIMA] |
| Crane | One agent drives a crane while the other gives directions with automatic voice lines (Back/Forward/Left/Right/Lower/Raise/Stop) to set a missile on a holder. A simultaneous wire cut follows. | Xbox/PC Chemical Bunker | [VERIFIED - XBM, PRIMA] |

- **Online without headsets.** The game removes the timing requirement: the first player selects the action, the second selects it, and the game syncs them. PRIMA notes this makes synchronized puzzles easier online. [VERIFIED - XBM, PRIMA]
- **Design reading.** A synchronized action works as a *rendezvous*: it forces two players who have split up to arrive, hold and count down together. Both pieces of hardware are mounted where one person cannot work them alone, which mirrors the real-world "two-person rule".

---

## 6. Non-move co-op tactics the levels rely on

These are not buttons, but the guides script them repeatedly, so the levels are built for them.

| Tactic | Description | Confidence |
|---|---|---|
| **Jam-and-pass** | One agent holds the pistol's co-op jammer (OCP) on a camera, laser emitter or turret while the other crosses; then they swap. It appears in every mission. | [VERIFIED - XBM, PS2M, PRIMA, FW] |
| **Turret flank** | One agent jams a turret while the partner runs behind it and switches it off at its panel. | [VERIFIED - PRIMA, IGNW, FW/RUW note] |
| **Simultaneous takedowns** | Both players knock out two guards at the same moment so neither can raise the alarm. | [SINGLE SOURCE - PRIMA] |
| **Light-and-drop** | One agent shoots out a light; the other drops on the guard who comes to investigate. | [SINGLE SOURCE - PRIMA] |
| **Interrogate under cover** | One agent knocks out nearby guards while the other interrogates a captive. | [SINGLE SOURCE - PRIMA] |
| **Voice baiting (Xbox Live)** | The headset microphone is heard by guards within a radius (default about 2 m in game), so players can lure guards by talking, or give themselves away. | [VERIFIED - XBM, PRIMA, GF] |

---

## 7. Status of moves sometimes attributed to the mode

| Name | Status | Confidence |
|---|---|---|
| Back-to-back climbing | Not a shipped move. It appears only in lore text on the wiki's character page; neither manual nor the guide mentions it. Possibly cut, or marketing wording. | [UNCERTAIN] |
| "Swing", "trampoline", "sacrifice" | Not found as move names. "Sacrifice" may come from Tomoe Nage being a judo sacrifice throw. | [UNCERTAIN] |
| Dual takedown | No dedicated move. Simultaneous knockouts are done with ordinary attacks. | [SINGLE SOURCE - PRIMA] |
| Versus mode overlap | Xbox/PC Versus spies can Boost and Human Ladder (only where a Boost icon appears), heal each other, share gadgets and remove a tracking tag from a teammate. PS2 Versus has no co-op moves. | [VERIFIED - PRIMA, WP; PS2 SINGLE SOURCE - PS2M, FW] |

---

## 8. Mission-by-mission move matrix (guide routes)

Counts are the minimum used on one recommended route, not every possible use in the map. ✓ = used; number = count where known.

### Xbox/PC
| Move / action | Training | Panama | Seoul | Chem. Bunker | Train Station | Nuclear Plant | UN HQ |
|---|---|---|---|---|---|---|---|
| Boost (+ Human Ladder) | ✓ | 2 | 4 | - | 4 | see 04 | see 04 |
| Tomoe Nage | 2 | (optional, IGNW) | - | 2 | 1 (attack) | see 04 | see 04 |
| Dual Rappelling | 1 | - | - | 1 | - | see 04 | see 04 |
| Hangover | 1 | 1 | - | 1 | 1 | see 04 | see 04 |
| Shoulders | - | - | 2 | - | - | see 04 | see 04 |
| Jammer alternation | ✓ | 2+ | ✓ (turret) | ✓ | ✓ (turret/light) | see 04 | see 04 |
| Synchronized action | retinal | retinal (captives) | - | retinal, mixing, crane, wire cut | 3 bombs | see 04 | see 04 |

Confidence: [SINGLE SOURCE - PRIMA] for Panama, Seoul, Chemical Bunker and Train Station; [VERIFIED - FW, IGNW] for Training. The two downloadable missions are not in the guide; see `04_mission_breakdowns/nuclear_plant.md` and `04_mission_breakdowns/un_headquarters.md` for what could be found.

### PS2/GameCube
| Move / action | Seoul | Chem. Bunker | Train Station | Panama |
|---|---|---|---|---|
| Boost (+ Ladder) | 1 | 1 | 3 | 3 |
| Tomoe Nage | 1 | - | 2 | 1 |
| Dual Rappelling | - | 1 | 3 | - |
| Hangover | - | 1 | - | 1 |
| Shoulders | 1 | - | - | 1 |
| Zip line (solo move) | 1 | - | - | 1 |
| Jammer alternation | ✓ (turret x3, light) | ✓ (sensors, cameras) | ✓ | ✓ |
| Paired switch / scanner / code | switch | switch, scanners, code, wire cut | switches x2, wire cuts | scanners x2 |

Confidence: [SINGLE SOURCE - PRIMA]. The contents of PS2/GC Team Training are not documented in text (OPEN_QUESTIONS R-05).

---

## 9. Design takeaways (analysis, not claims about the original)

1. **One handshake for every move.** Initiate, then complete, with a voice line and an icon. Players learn it once.
2. **Free moves** make the level a playground; **contextual moves** let designers stage set pieces. A new game needs both tiers.
3. **Every move is a role split.** One player is the *platform or operator* (crouch, rope, shoulders); the other is the *actor* (climbs, hacks, kills). Good set pieces swap roles across a mission so neither player is always the platform.
4. **Moves double as attacks.** A throw that knocks out a guard, or an upside-down neck snap. Traversal and takedowns become one action, which creates "did you see that?" moments.
5. **Sync puzzles are rendezvous points.** They pull split-up players back together on the designer's schedule.
6. **Automatic voice lines** keep co-op playable without voice chat. Any new game should carry an equivalent ping or callout layer.

## Gap-closing notes

- **Jamming is held, not fire-and-forget.** One player keeps aiming and holding the trigger while the other moves. [SINGLE SOURCE - Reddit; matches manual rules]
- **Dual rappel splits the controls.** One player controls sideways movement and the other controls height. [SINGLE SOURCE - Reddit; matches IGN wiki training route]
- **Joint interrogation.** Some intel (a key code on Train Station, the double on Seoul) comes from both agents interrogating the same person together. [VERIFIED - game text]
- **Simultaneous takedowns** are a player favourite and hard to pull off: if one agent acts early, the other guard reacts. [SINGLE SOURCE - Reddit]
