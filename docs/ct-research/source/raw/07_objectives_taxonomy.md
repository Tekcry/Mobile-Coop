# 07 - Objectives taxonomy

Every type of objective used in the *Chaos Theory* co-op missions: how objectives chain together, how they create dependency between the two players, and how failure and optional objectives work.

**Evidence base:** the mission breakdowns in `04_mission_breakdowns/`, systems in `03_coop_overview.md` and `10_ai_detection_and_alarms.md`, and the research notes.

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. A row's tag is that of the mission evidence cited (see the 04 files).

---

## 1. Objective tiers and status rules

| Tier | Meaning | Examples | Confidence |
|---|---|---|---|
| **Primary** | Required to complete the mission | Access the archives; defuse the bombs | [VERIFIED - FAN, PRIMA] |
| **Secondary** | Optional, but counts toward a perfect score | "Discover if the colonel can attack again" (Nuclear Plant); PS2/GC "finish without an alarm" | [VERIFIED] |
| **Opportunity** | Optional, often hidden until discovered in play; counts toward a perfect score | Autopsy videotape; interrogate the officer; sabotage the boat; follow the agent to the locker | [VERIFIED] |
| **Status in co-op** | Only *Completed* or *Failed* (solo also has *Cancelled*) | - | [VERIFIED - XBM, PS2M] |
| **Perfect score** | All primary + secondary + opportunity objectives, plus no kills/injuries, no alarms, never recognised | - | [VERIFIED - PRIMA, XBM, PS2M] |

**How objectives are added mid-mission** [VERIFIED - FAN mission pages + PRIMA]:
- **A twist** reveals the goal was wrong: the target was a double; the archive was wiped; the colonel already holds the security room.
- **Intel** found in emails, overheard conversations or interrogations opens an opportunity, for example an email revealing an escape boat.
- **An event** fires, for example a phone call that reveals an infected soldier and an antidote locker.

---

## 2. Objective types

Each type lists its verb and how it works, the missions that use it, and the co-op dependency it creates.

### 2.1 Information objectives
| Type | How it works | Missions | Co-op dependency |
|---|---|---|---|
| **Retrieve data (computer)** | Use a terminal in a protected room | Panama (server), Chemical Bunker (protocol), Nuclear Plant (two terminals), UN HQ (encrypted data) | Often behind a two-person gate (paired scanners, jammer-held camera) |
| **Search physical files** | Search a cabinet or desk | Panama archive | One agent searches while the other guards against the light-fixer |
| **Interrogate** | Grab a person and question him for intel or codes | Panama (official, codes), Seoul (officer, double, target), Train Station (agent: locker code), PS2/GC Panama and Seoul | One agent grabs while the other neutralises escorts or watches the door |
| **Eavesdrop / overhear** | Stay hidden within earshot of a conversation | Chemical Bunker (technicians; PS2/GC opportunities), Train Station (bugged call) | Usually one listens while the other guards; in Train Station both wait |
| **Plant a bug** | Place a device on a phone | Train Station payphone | Needs Boost + Ladder + Hangover, so both agents |
| **Discover a fact** | "Find out who helped him"; "find out the real agenda" | Nuclear Plant; Train Station | Spread across several data points in different buildings |
| **Photograph/record** | Collect a recording (videotape, video file) | Chemical Bunker (both builds) | Optional side trip; one agent fetches from an awkward spot (trapdoor) |

### 2.2 Physical retrieval objectives
| Type | How it works | Missions | Co-op dependency |
|---|---|---|---|
| **Steal a sample/item** | Take serum, anti-virus, viral sample, toxin vial, fuse | Chemical Bunker; Train Station; PS2/GC Panama (fuse) | Often reached by Hangover (one agent lowers, the other grabs) |
| **Manufacture an item** | Mix an anti-virus at two stations to a recipe | Chemical Bunker | **Hard two-station sync** |
| **Extract from a warhead** | Open a casing, then defeat a safety | Chemical Bunker | Crane (operator + spotter), then sync wire cut / sync hack |

### 2.3 People objectives
| Type | How it works | Missions | Co-op dependency |
|---|---|---|---|
| **Capture alive / abduct** | Subdue a target without killing him; protect him | Seoul | One stuns, the other covers; the target must survive (hard fail) |
| **Escort / carry out** | Carry an unconscious person to extraction | Seoul | Carrier + door-opener/guard role split |
| **Use a person as a key** | Force a captive to a biometric scanner | Panama (two captives), Chemical Bunker (two captives), PS2/GC Panama finale | **Two captives at two scanners = forced split, then sync** |
| **Eliminate** | Required kill of a specific threat | Train Station (contaminated soldier) | Only the antidote holder may enter, so a forced asymmetric split |
| **Stop a villain** | Neutralise the antagonist in a held room | UN HQ | Undocumented |
| **Protect / do not kill** | A named person or class must survive | Panama (official), Seoul (target), UN HQ (staff, civilians), PS2/GC technicians | Constrains takedown choices for both players |

### 2.4 Sabotage objectives
| Type | How it works | Missions | Co-op dependency |
|---|---|---|---|
| **Destroy a vehicle/system** | Place charges on two mobile anti-aircraft vehicles | Seoul | Shoulder-stand to reach the charge point |
| **Disable an escape route** | Sabotage a boat engine | Seoul (opportunity) | Turret on the boat: jam + flank |
| **Defuse bombs** | Laser-linked twin bombs; live wire found via thermal | Train Station (3 pairs Xbox, 4 pairs PS2/GC); UN HQ (one bomb, hidden timer) | **Sync wire cut**; the laser splits the pair |
| **Switch off machinery** | Stop fans so a duct becomes a route | Nuclear Plant | Throw + rope |

### 2.5 Movement objectives
| Type | How it works | Missions | Co-op dependency |
|---|---|---|---|
| **Infiltrate by a specified route** | "Enter down one of the silos"; "find another way in" | Chemical Bunker; UN HQ | Rappel / platform two-step |
| **Reach a location** | "Get to the cyber cafe"; "reach the security control room" | Seoul; UN HQ; PS2/GC sub-levels | Usually gated by co-op moves |
| **Follow / tail** | Shadow a moving target unseen | Train Station (agent to the locker) | Two bodies to keep hidden on the move |
| **Exfiltrate** | Reach the truck, boat, side door or train | Most missions | Whether both must arrive is undocumented (R-09) |

### 2.6 Constraint objectives (PS2/GC sub-levels and secondary objectives)
- "Finish without an alarm"; "finish without killing anyone"; "gain entry without one alarm". [VERIFIED - FAN + PRIMA]
- These turn the stealth standard into explicit, optional goals.

### 2.7 Timed objectives
- **Seoul (Xbox/PC).** A five-minute window to destroy the second vehicle after the first. [SINGLE SOURCE - RYB]
- **PS2/GC Gardens.** A 4-minute timer. [SINGLE SOURCE - FAN]
- **UN HQ.** A 20-minute bomb timer with no on-screen count; the controller warns at 20, 10 and 5 minutes and at 60 seconds. [VERIFIED - FAN RU + game text]
- Timers are rare and concentrated in climactic beats.

---

## 3. How objectives chain

| Chain pattern | Description | Example |
|---|---|---|
| **Linear reveal** | A twist rewrites the goal and moves the pair to a new area | Seoul: capture → double → find him → (detour: vehicles) → cafe → carry out |
| **Recipe chain** | Each item is an ingredient for the next | Chemical Bunker: protocol → serum → mix → anti-virus; then warhead → sample |
| **Event-gated chain** | A wait or event (a call) generates the next objectives | Train Station: bug phone → listen → locker → antidote → washroom |
| **Two-site investigation** | The answer is split across buildings | Nuclear Plant: control-room archives + lab server room |
| **Escalating finale** | A bomb or timer at the end | Train Station (escaping train), UN HQ (bomb above the assembly) |
| **Extension** | The first target proves incomplete, so a second target is added deeper in | Panama: archive wiped → server on the ground floor |

**Rule of thumb from the original.** Every mission has 3-6 primaries and 0-3 optionals.
- On Xbox/PC, Panama has 3 primaries, Seoul 5, Chemical Bunker 6, Train Station 6, Nuclear Plant 2 (plus 1 secondary and 1 opportunity), and UN HQ 5. [VERIFIED - FAN]
- Most optionals are found by exploring, not listed up front.

---

## 4. How objectives create dependency between players

1. **Two-body requirements.** Two scanners, two wires, two switches, two stations. These are the strongest dependency, because the objective is *impossible* alone (except where exploits exist).
2. **Item scarcity.** One antidote dose means one entrant. The objective assigns roles.
3. **Reach requirements.** A charge point, a bug site or a sample above or below the reachable floor means a boost, shoulder-stand or Hangover.
4. **Protect-while-act.** One agent does the objective (search, interrogate, hack) while the other guards against the predictable interrupter (the light-fixer, an escort, a patrol).
5. **Information asymmetry.** The crane operator cannot see the target; the spotter cannot drive. Only talk solves it.
6. **Distributed intel.** Codes and clues are found in different places, so the pair is encouraged to split and report back. This is soft dependency.

---

## 5. Failure and optional objectives

**Hard fail on a primary breach** [VERIFIED for the listed cases]:
- a protected person dies;
- a target escapes (boat);
- a bomb's tripwire laser is touched;
- a general alarm in UN HQ;
- the revive window expires.

**Soft failure** [VERIFIED]:
- An optional objective missed or failed only lowers the score.
- Alarms escalate rather than fail on Xbox/PC (except UN HQ).
- On PS2/GC, three alarms fail a sub-level.

**Trap case.** In Seoul, skipping an optional email removes the reminder to sabotage the boat, and the target can then escape for an instant fail. Optional intel silently guards a hard fail. Logged as an anti-pattern (12).

**Scripted lethal objectives** (the contaminated soldier) coexist with a scoring system that rewards zero kills. A perfect run still exists, so the scripted kill is evidently exempt. [UNCERTAIN inference]

**Rating caps.** In Seoul (90%) and possibly Chemical Bunker (97%), an objective or stat cannot register, so a "perfect" run tops out below 100%. [VERIFIED for Seoul; R-15]

---

## 6. Takeaways (analysis)

- **Objective verbs are varied but few** (about 20). Variety comes from *combining* a verb with a co-op dependency type, for example interrogate plus escort, or retrieve plus Hangover.
- **Every main mission has at least one "two bodies, one moment" objective.** It is the signature of the mode.
- **Mid-mission twists that rewrite the objective** happen in Panama, Seoul and UN HQ. They are the mode's main narrative device.
- **Optional objectives reward curiosity** (emails, overheard talk). However, optional intel should never be the only safeguard against a hard fail.
