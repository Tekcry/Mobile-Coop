# 03 - Co-op mode overview

The structure, rules, story framing, controls, communication, platform differences and reception of the two-player co-op mode in *Tom Clancy's Splinter Cell: Chaos Theory* (2005).

**Detail files:**
- moves: 05
- equipment: 06
- detection and alarms: 10
- per-mission breakdowns: 04
- research notes in `research_notes/`, especially `systems_rules.md`, `platforms_versions.md`, `coop_gadgets_controls_comms.md`, `dev_and_design_intent.md` and `reception.md`

**Source shorthand:**

| Code | Source |
|---|---|
| XBM | Xbox manual |
| PS2M | PS2 manual |
| PRIMA | Prima Official eGuide |
| FW/RUW | English/Russian Fandom wiki |
| WP | Wikipedia |
| MN | Major Nelson / Xbox Wire, 25 Aug 2005 |
| G&M | Globe and Mail launch interview with the creative director and lead programmer, 15 Apr 2005 |
| EG | Elder-Geek 2009 co-op review |
| EUR | Eurogamer PC review |
| TX | TeamXbox review |
| Steam | Steam reviews and threads |

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

---

## 1. At a glance

| Aspect | Xbox / PC | PS2 / GameCube | N-Gage / DS |
|---|---|---|---|
| Developer of co-op | Ubisoft Montreal (Versus by Ubisoft Annecy) [VERIFIED] | Separate build, tested in Montreal; studio for the maps unclear [UNCERTAIN] | Gameloft, separate game [VERIFIED] |
| Missions | Training + 4 story missions on disc; 2 free downloads later (7 total) [VERIFIED] | Training + 4 missions, each split into 4-5 sub-levels [VERIFIED for split] | 5 parts in 2 missions [VERIFIED existence; names SINGLE SOURCE] |
| Modes | Story, Mission, Elite [VERIFIED] | Campaign (by sub-level), Training, Hall of Fame [SINGLE SOURCE - PS2M] | - |
| Connection | Split-screen, System Link, Xbox Live; PC LAN + online only, no split-screen [VERIFIED - PC 1.05 menu text + PC manual] | Split-screen only [VERIFIED] | Local wireless / Bluetooth [SINGLE SOURCE] |
| Alarm limit | None; four-stage escalation (except UN HQ: general alarm aborts) [VERIFIED] | 3 alarms fail a sub-level [SINGLE SOURCE - FW] | 3 alarms abort [VERIFIED] |
| Saving | No automatic checkpoints. Pause menu has Quick Save, Save and Load; saving waits for the partner, and a save reloads only with the same teammate [VERIFIED - Xbox build + PC 1.05 menu text; PC quick save also confirmed by speedrun rules] | Saved at end of each sub-level; no mid-mission save [VERIFIED] | Checkpoints [VERIFIED] |

---

## 2. Structure of the campaign

### 2.1 Mission list and order
- **Xbox/PC:** Training Facility, Panama, Seoul, Chemical Bunker, Train Station, then the downloadable Nuclear Plant and UN Headquarters. [VERIFIED - FW, WP, MN, video titles; see 01_sources.md]
- **PS2/GC:** Team Training, Seoul, Chemical Bunker, Train Station, Panama. [VERIFIED - FW, PRIMA, PS2M]
  - Panama comes last despite being first in story chronology.
  - The PS2 end screen speaks of "all four missions".
- **The downloads:**
  - Never part of Story mode; playable only in Mission and Elite modes.
  - On Xbox they first appeared after the Story was completed on Elite. [VERIFIED - MN; PC 1.05 patch notes confirm "Mission mode only"]
  - The publisher framed them as the conclusion of the co-op story. [VERIFIED - MN, WP]

### 2.2 Length
- **Per mission:** reviewers put each mission at roughly 60-90 minutes. [SINGLE SOURCE - TX]
- **Whole campaign:** about 4-6 hours. [VERIFIED - G&M review, Penny Arcade, others]
- **Full playthroughs on video:**
  - A complete co-op campaign upload runs over 7 hours.
  - A speedrun finishes the co-op in under 40 minutes.
  - [SINGLE SOURCE - video titles; see research_notes/videos.md]
- **Shortness was the most common criticism:** about 12 of roughly 27 professional pieces with co-op text mention it. [VERIFIED - reception.md count]

### 2.3 Modes
- **Story.** Missions in a fixed order; each must be completed to unlock the next. [VERIFIED - XBM, PRIMA]
- **Mission.** Replay any unlocked mission in any order. [VERIFIED - XBM, PRIMA]
- **Elite.**
  - Unlocked by finishing Story. Firearms start with no ammunition.
  - The manual says the knife becomes the kill tool; the guide paraphrases this as non-lethal-only.
  - Typically played on Expert by challenge players.
  - [Zero ammo VERIFIED - XBM, RUW, cheat sites; knife UNCERTAIN; Expert pairing SINGLE SOURCE]
- **PS2/GC Campaign.**
  - Each sub-level, once cleared, becomes selectable for score-chasing.
  - A Hall of Fame stores team scores, time and a "Stealth Award".
  - [VERIFIED for replay - PS2M, PRIMA; Hall of Fame SINGLE SOURCE - PS2M]

### 2.4 Difficulty
- **Settings.** Normal, Hard and Expert are shared with solo play. [SINGLE SOURCE for co-op - XBM "Create Mission" parameters]
- **What harder settings change:**
  - Damage taken rises.
  - Expert makes hacking harder.
  - Medkits restore less: full on Normal, 50% on Hard, less on Expert.
  - On Expert, wall mines can only be disarmed on a green light.
  - [VERIFIED - FW, PRIMA]
- **Co-op-specific scaling.** The anti-virus mixing puzzle in Chemical Bunker grows from 3 to 4 to 5 colour steps per agent. [SINGLE SOURCE - FW]
- **Guard perception** may or may not scale with difficulty; sources disagree. [UNCERTAIN - R-10]

---

## 3. Story framing and relation to the solo campaign

- **Protagonists.** Two unnamed agents-in-training, "Agent One" and "Agent Two", from the same agency as the solo hero. They are told apart by goggle-lamp colour: blue for One, red for Two. [VERIFIED - WP, FW]
- **Premise.** A world crisis forces the agency to deploy trainees before they are fully qualified, so each mission is a trial by fire. [VERIFIED - WP, FW]
- **Parallel narrative.** The co-op story runs alongside the solo campaign, picking up threads from the solo missions and filling gaps between them:
  - Panama follows leads from the solo bank mission.
  - In Seoul, the solo protagonist himself appears in a supporting role, interrogating a soldier, and the trainees assume his name is a call-sign.
  - [VERIFIED for the parallel structure - WP, EG, Steam; solo protagonist's cameo VERIFIED - FW, EG]
- **The co-op arc:**
  1. **Training.** The pair qualify on an obstacle course.
  2. **Panama.** They find that a canal official took bribes to let ships skip inspection, linked to a chemist.
  3. **Seoul.** They abduct that chemist in a war zone.
  4. **Chemical Bunker.** They recover a bio-weapon and make an antidote in a North Korean bunker.
  5. **Train Station.** A rogue colonel who took the warheads seizes a New York station; the pair defuse his bombs.
  6. **Nuclear Plant.** They trace his helpers back to a nuclear plant.
  7. **UN Headquarters.** They stop his final bomb at the UN.
  - [VERIFIED - FW mission briefings + WP + MN]
- **Did the story land?** Critics considered it secondary. One noted it ends abruptly without the downloads. Players remember the "parallel story" fondly; nine Steam reviews mention it. [SINGLE SOURCE - Penny Arcade; Steam count SINGLE SOURCE]
- **Developer intent.**
  - The creative director said the aim was "three games in one box": the solo hero stays the core, co-op lets friends share the world and fiction, and Versus is the third game.
  - The lead programmer said co-op was originally the *main* mode before solo was prioritised for market reasons.
  - [SINGLE SOURCE - G&M]
  - No developer statement explains why the co-op stars trainees or why objectives are split. [GAP]

---

## 4. Core rules

### 4.1 Failure
- **Downed partner.** At zero health an agent is unconscious. The partner has about 30 seconds to inject adrenaline, which restores roughly half health; otherwise the mission fails. [VERIFIED - XBM, PS2M, PRIMA, RUW]
- **Revive limit.** Each agent carries one adrenaline syringe, so the team can revive twice per mission. The guide's "two each" is wrong for Xbox/PC. [VERIFIED - in-game training text on Xbox and PC + both manuals; R-03 closed for Xbox/PC]
- **Both agents down.** No game text covers it beyond a game-over state that waits for the teammate. [GAP]
- **Friendly fire.** Xbox match setup has a friendly-fire option. The PC menu has none, and the PC settings file defaults it to on. [SINGLE SOURCE each; PC UNCERTAIN - R-08]
- **Mission-specific hard fails:**
  - a protected character dies (Panama's vice president; Seoul's chemist, who must also not escape);
  - a bomb's tripwire laser is touched;
  - a general alarm in UN HQ;
  - lethal force on UN staff;
  - entering a contaminated room without the antidote.
  - [See 10 §5 for tags]
- **Lethal force.** Allowed against most enemies. It costs score but does not fail the mission, except in specific missions. [VERIFIED]

### 4.2 Alarms
- **Xbox/PC.** Four stages: freebie, then body armour, then helmets, then permanent high alert with fortified positions. No abort, except in UN HQ. [VERIFIED]
- **PS2/GC.** Three alarms fail a sub-level. [SINGLE SOURCE - FW]
- **Full detail:** 10_ai_detection_and_alarms.md.

### 4.3 Checkpoints and saving
- **Xbox.** Story progress is saved between missions; both consoles' saves must match, and launching auto-invites the partner. A mid-mission quick save lasts only for the session. [SINGLE SOURCE - XBM]
- **PC.** A 2009 reviewer found no checkpoints: dying or botching an objective means a full restart. They called this realistic but punishing with a weaker partner. [SINGLE SOURCE - EG] The game files show manual saves exist on PC, so this refers to automatic checkpoints (R-07 closed, §12).
- **PS2/GC.** Progress saved at the end of each sub-level. GameCube reportedly has no mid-mission save and needs both discs. [VERIFIED for sub-level save; GC details SINGLE SOURCE]

### 4.4 Scoring and statistics
- **End screens.** Each mission ends with an Objective Review (co-op shows only Completed or Failed) and Mission Statistics (alarms, kills, knockouts, civilians). [VERIFIED - XBM, PS2M]
- **Individual scores.** Each agent receives an individual percentage score compiled from team statistics. [VERIFIED - PRIMA, RUW]
- **Perfect score:**
  - no kills or injuries (knockouts are free);
  - never recognised as an intruder;
  - no bodies found;
  - no alarms;
  - all primary, secondary and opportunity objectives.
  - [VERIFIED - PRIMA, XBM, PS2M]

### 4.5 Objectives
- **Three tiers:** primary (must do), secondary and opportunity (optional, often discovered in play). [VERIFIED - FW, PRIMA]
- **Mid-mission updates.** Objectives update during the mission as intel arrives. Examples:
  - the chemist "has been moved";
  - the archive data turns out to be partially deleted, so the server must be reached;
  - a call is about to come in on a payphone.
  - [VERIFIED - FW]
- **Full taxonomy:** 07_objectives_taxonomy.md.

---

## 5. Controls and interface

| Platform | Co-op Action (free moves) | Contextual moves / heal / share / sync | Confidence |
|---|---|---|---|
| Xbox | Black (replaces whistle) | A, via Interaction menu | [VERIFIED] |
| PS2 | L2 | X | [VERIFIED] |
| GameCube | Z + D-pad Left | A | [SINGLE SOURCE - FW] |
| PC | F or Page Down; "Say" on T or End | Space / Enter | [SINGLE SOURCE - FW] |

- **HUD (Xbox).** Shows:
  - the agent's own light and noise meters;
  - life bar;
  - **partner health**;
  - a **Co-op Action icon** when the partner is ready for a move;
  - alarm counter;
  - timer;
  - a **text chat box**.
  - The PS2 HUD lacks partner health and chat. [SINGLE SOURCE each - XBM, PS2M]
- **Split-screen** is vertical: Agent One on the left, Agent Two on the right. [SINGLE SOURCE - PRIMA]
- **Map and markers.**
  - No on-screen partner marker or waypoint is documented.
  - One reviewer complained that partners wander looking for each other with no map. [SINGLE SOURCE - EUR; R-11]
- **Moves.** See 05 for all moves and inputs.

---

## 6. Communication

| Channel | What it does | Confidence |
|---|---|---|
| Voice chat (Xbox Live headset) | Positional, and **audible to guards** within a configurable radius (default about 2 m in game). Players whisper, use ambient noise as cover, or lure guards by talking. Detection can be disabled. Options include voice through TV speakers and voice masking. | [VERIFIED - XBM, PRIMA, preview, TX, Steam] |
| Automatic voice lines (no headset) | Announce when a move is initiated or completed and when a partner is down. Rope and crane operators can send "Up/Down/Left/Right/Stop" style commands from the stick. | [VERIFIED - XBM, PRIMA] |
| Sync without voice | Online without headsets, synchronized actions are synced automatically, so exact timing is not needed. | [VERIFIED - XBM, PRIMA] |
| Share View | Watch the partner's sticky-camera feed (not in split-screen). | [VERIFIED] |
| Text chat (PC) | "Say" key. | [SINGLE SOURCE - FW] |
| Pings / gestures / world markers | None documented. | [GAP] |

**Why it matters.** Turning voice into a stealth mechanic was the most-praised co-op systems idea after the moves themselves. [VERIFIED - reception.md] It made talking part of the stealth: players must decide when it is safe to speak.

---

## 7. Split-screen vs online vs LAN

| Option | Notes | Confidence |
|---|---|---|
| Split-screen | Available on all consoles. One critic found it tiresome because the game is about seeing around corners and the partner's screen gives information away. Another found it worked better than expected on GameCube. | [SINGLE SOURCE each] |
| Online (Xbox Live) / System Link / LAN | Critics' preferred way to play (with headsets). | [SINGLE SOURCE - TX] |
| Today | Original Xbox Live closed on 15 Apr 2010, and PC online services were later decommissioned. PC co-op still works through the LAN menu over virtual-LAN tools. Both players must run identical configurations, because a widescreen mod on one PC desyncs the session. Xbox One/Series runs the game with the downloads included (split-screen and System Link). | [VERIFIED - see platforms_versions.md] |

---

## 8. Platform differences in brief

| Difference | Confidence |
|---|---|
| PS2/GC co-op maps are cut down from the Xbox/PC layouts, split into short sub-levels with load breaks, use identical loadouts for both agents and a 3-alarm rule, and add paired switches and paired code locks. | [VERIFIED for split and loadouts; layout shrinkage VERIFIED - WorthPlaying PS2, NWR GC] |
| Xbox/PC loadouts are asymmetric (precision launcher kit vs grenades). | [VERIFIED] |
| The GameCube has no Versus. The PS2's Versus is an older-style mode without co-op moves. | [VERIFIED] |
| The 3DS remake and the PS3 HD collection have no co-op. | [VERIFIED] |
| The N-Gage/DS games have their own small co-op campaign with hard class roles (a hacker who cannot short-circuit panels, an assault agent who cannot hack). | [SINGLE SOURCE for roles - FW; see 04_mission_breakdowns/ngage_ds_campaign.md] |

---

## 9. What reviewers and players praised

From `research_notes/reception.md`, which holds counts and sources:
1. **Two-person moves.** Above all the partner throw (Tomoe Nage), the boost and human ladder, and the upside-down rope dangle with a neck snap. [VERIFIED]
2. **Synchronized moments.** Simultaneous wire cuts, jam-and-run past cameras, coordinated double takedowns ("co-op ambushes"). [VERIFIED]
3. **Guards hearing your voice.** [VERIFIED]
4. **A full, separate co-op campaign** built for two, rather than the solo game with a second body ("three games in one"). Critics repeatedly called it revolutionary or the highlight on Xbox Live. [VERIFIED]
5. **The parallel story** and the two red/blue trainees. [VERIFIED - Steam, Classic Co-op]
6. **Emergent comedy:** door slams, physics accidents, blaming each other for alarms. [SINGLE SOURCE - Steam]

**Headline numbers.** Metacritic Xbox 94. 19 of 70 Xbox critic blurbs mention co-op or multiplayer. Of 236 English Steam reviews mentioning co-op, about 93% are positive. Later lists rank it the best stealth co-op in the series. [VERIFIED]

## 10. What they criticised

1. **Too short.** Four missions plus training at launch. [VERIFIED - about 12 outlets]
2. **No checkpoints / full restarts,** punishing with a weaker partner. [VERIFIED - EG, Steam, Classic Co-op]
3. **Losing each other.** Reviewers said there was no map or partner marker. Coordination friction when play styles differ. [VERIFIED - EUR, NWR, EG] The game files show every co-op map has a map page in the mission device, and reading a computer updates both agents' devices. So the "no map" claim is at least partly wrong; whether the partner is marked is still unknown (R-11).
4. **Moves bound to fixed spots** feel scripted, like "elaborate keys". [VERIFIED - GameSpot snippet, Steam, podcast]
5. **Empty levels** (one dissenting reviewer). [SINGLE SOURCE - EUR]
6. **Glitches.** Guards alerting each other oddly; desync; a co-op frame cap around 30-35 fps on PC; clipping deaths. [VERIFIED for "glitches"; details SINGLE SOURCE]
7. **Dead official online** and PC setup hassle today. [VERIFIED]
8. **Cut-down PS2/GC co-op** with long loads. [VERIFIED]
9. **Split-screen undermines stealth information.** [SINGLE SOURCE - VideoGamer]

## 11. Gaps

| Ref | Gap |
|---|---|
| - | Both-agents-down rule (the syringe count, R-03, is closed) |
| R-09 | Whether both agents must reach extraction |
| R-10 | Whether difficulty affects perception |
| R-11 | Whether the partner is marked on the map |

R-01, R-07, R-12 and R-13 were closed by the gap pass (see §12 and OPEN_QUESTIONS).
| - | No developer statement on why co-op stars trainees or why objectives are split |

## 12. Gap-closing update (primary game files + community)

Sources: `research_notes/gap_closing_gamefiles.md` and `gap_closing_community.md`.

- **Who built it** [SINGLE SOURCE - the credits video on the PC 1.05 install]:
  - The co-op team at Ubisoft Montreal had its own associate producer and its own lead game designer.
  - It also had a lead level designer with five level designers, a lead artist, an art director, a lead sound designer and a lead tester.
  - Names are in the research note.
  - The Nuclear Plant download may have been built by a separate (Italian) studio. [UNCERTAIN - inferred from script identifiers]
- **Saving.**
  - On Xbox and PC the pause menu has Quick Save, Save and Load.
  - Saving waits for the partner, and the host can ask to save permanently, which the partner may refuse.
  - A co-op save reloads only with the same teammate.
  - So the reviewer's "no checkpoints" means there are no **automatic** checkpoints. [VERIFIED]
- **Shared intel.** Reading a computer updates both agents' mission devices. [VERIFIED - training text]
- **Extraction points are concrete places.**
  - Panama: the truck in the courtyard.
  - Seoul: the truck outside the cyber cafe.
  - Chemical Bunker: the boat at the end of the dock.
  - Train Station: a jump onto the passing subway car.
  - Nuclear Plant: the lab's side door.
  - UN HQ: ends on the defusal.
  - [VERIFIED - game text] Whether both agents must be present is still unknown (R-09).
- **Difficulty names.** Normal / Hard / Expert, with modes Story / Mission / Elite. [VERIFIED]
- **Voice in the simulation.** Players remember the microphone feeding the in-game sound meter, so guards heard real talking and could be lured by it. It is the most-praised systemic detail in community memory. [VERIFIED - several Reddit threads] Partner-to-partner distance falloff is never mentioned (R-22).
- **What the community says made it special** [VERIFIED unless noted]:
  - it truly needed both players;
  - the moves work as physical comedy and bonding;
  - failure is funny and becomes a rescue story;
  - split-screen family memories;
  - pairs coordinated without words, across languages;
  - simultaneous takedowns. [SINGLE SOURCE]
- **Community criticisms** [VERIFIED unless noted]:
  - maps small and too brightly lit next to solo levels [SINGLE SOURCE];
  - inputs for shared devices unclear (bombs, laser grids, door codes);
  - hard for newcomers;
  - the PC frame cap and desync;
  - 100% blocked by bugs on two maps.
