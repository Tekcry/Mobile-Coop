# 02 - Co-op moves

Every two-player move and team interaction in the co-op mode of *Splinter Cell: Chaos Theory* (2005), on all platforms: the free moves (Boost / Short Scale, Human Ladder, Tomoe Nage), the contextual moves (Dual Rappelling, Hang Over Teammate / "Hangover", Stand on Teammate's Shoulders), the team interactions (Share View, Heal / Revive, Share Equipment), the synchronized actions (paired retinal scanners, paired bomb wires, paired switches, paired code lock, two-station mixing, crane), the jammer alternation, simultaneous takedowns and co-op ambushes, joint interrogation, carrying, and the moves sometimes attributed to the mode that did not ship.

**Platforms.** Version 1 = Xbox / PC (one continuous level per mission; Training Facility + Panama, Seoul ("Seoul 3"), Chemical Bunker, Train Station, then the downloadable Nuclear Plant and UN Headquarters). Version 2 = PS2 / GameCube (Team Training + Seoul, Chemical Bunker, Train Station, Panama, each split into 4-5 sub-levels). N-Gage / DS = a separate Gameloft campaign (see section 14). Every fact below says which platform it applies to.

**Confidence tags used in this file.**
- [CONFIRMED - several sources: ...] = two or more independent sources (the sources are listed).
- [ONE SOURCE: ...] = a single source.
- [INFERRED / UNCERTAIN: ...] = inference, conflict or weak evidence.
- [UNKNOWN - see 06-open-questions.md, R-xx] = a documented gap.
- [ANALYSIS] = the researchers' design interpretation, not a fact about the game.

**Source codes** (legend in 00-index.md): XBM = Xbox manual (co-op chapter pp. 20-28, versus controls p. 31); PS2M = PS2 manual; PRIMA = Prima Official eGuide (all platforms; co-op and versus chapters by Steve Stratton); FW / RUW = English / Russian Fandom wiki (one source family; FAN in the mission files means the same family); IGNW = IGN wiki guide (user-edited; co-op Training / Panama sections credited to GameFAQs author "Vampire Horde" / VampireHorde; Seoul section anonymous); JV = jeuxvideo.com forum thread "[AIDE] Mode Cooperation" (French, 2005-06, 19 pages, many posters); MAN = the Xbox and PS2 manuals together; MAN-X / MAN-PS2 = Xbox / PS2 manual; NWR = Nintendo World Report GameCube review; EG = Elder-Geek 2009 co-op review; RYB = Jason Rybka's About.com Xbox co-op walkthrough (read through two machine-translated mirrors); NEO = Neoseeker forum threads (search-result excerpts); SCQ = SuperCheats Q&A snippets; AT = AnandTech forum; WP = Wikipedia; XB477 = Xbox build 477 asset dump (Feb 2005); PC105 = installed PC copy at patch 1.05; XBDLC = Xbox Live download installer for the two downloads; PCDVD = PC retail DVD (manual, readmes, 1.05 patch); V339, Suru, hexen2k7, SHOCK-25, Ziggity = YouTube uploaders (descriptions / titles / comments, videos not watched). **Note on "GF":** in `05_coop_moves_catalogue.md` and `research_notes/coop_moves.md`, GF means the **GamesFirst 2005 preview**; in `02_coverage_matrix.md`, GF means the primary game files. In this file "GF" always means the GamesFirst preview, and the game files are named by XB477 / PC105 / XBDLC / PCDVD.

---

## 1. How the game organises co-op actions

### 1.1 The four families

| Family | Members | Trigger | Where usable | Confidence |
|---|---|---|---|---|
| **Free ("generic") moves** | Boost (Short Scale), Tomoe Nage (Long Jump), Human Ladder | Dedicated Co-op Action button; the whistle button is repurposed for it | Almost anywhere there is room | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| **Contextual ("static") moves** | Dual Rappelling, Hang Over Teammate ("Hangover"), Stand on Teammate's Shoulders | Normal Interact button, choosing a named entry in the HUD interaction menu | Only at spots the designer placed | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| **Team interactions** | Share View, Heal/Revive, Share Equipment | Interaction menu when near the partner (Share View works at any distance) | Anywhere | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| **Synchronized actions** | Paired retinal scanners, paired bomb wires, paired switches/code locks (PS2/GC), crane direction | Interaction menu at paired devices | Mission-specific set pieces | [CONFIRMED - several sources: XBM, PRIMA; paired switches PS2/GC ONE SOURCE: PRIMA] |

- **Naming of the two move families.** PS2M calls the placed moves "Static" co-op moves; XBM and PRIMA call them "Contextual". The anywhere moves are "Generic" in the manuals. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Free moves on the Co-op Action button; contextual moves, heal, share and sync on Interact** (Xbox A, PS2 X, GameCube A, PC Space / Enter). See section 2. [CONFIRMED - several sources: XBM, PS2M, FW controls page]
- **Developer-side confirmation of the two tiers.** "Generic moves (Boost/Short Scale, Human Ladder, Tomoe Nage) work anywhere. Contextual or 'static' moves (Dual Rappelling, Hangover, shoulder-stand) only work at authored spots. One player signals and the other completes the move." [CONFIRMED - several sources: Prima eGuide, PS2 manual, TeamXbox review]

### 1.2 The universal handshake (initiate, then complete)
- Every move uses the same two-step contract. One player **initiates**: he adopts a pose and waits. The other player walks over and **completes** with the same button or menu entry, and only then does the animation play. [CONFIRMED - several sources: XBM pp. 24-26, PS2M, PRIMA]
- While the first player waits, an **automatic voice line** tells the partner he is waiting. A second line plays **on completion**. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- The partner's HUD shows a **"Co-op Action" key icon** when the other agent is ready for a co-op move or interaction. [CONFIRMED - several sources: XBM p. 23 item 10, PS2M item 10]
- For players **without a headset**, the voice lines are part of "Alternative Voice Communication", which switches on automatically and works only in specific situations (move initiated, move completed, partner down, rope and crane direction calls). [CONFIRMED - several sources: XBM p. 26, PRIMA]
- **Graceful failure.** A free move started where there is not enough space makes the agent **shake his head**, and the **controller vibrates**. No penalty applies. [ONE SOURCE: XBM p. 23]
- **How long an initiator can wait** before the pose cancels: not documented. [UNKNOWN - see 06-open-questions.md (gap listed in research_notes/coop_moves.md "Frame-level animation details and timing windows")]
- **Whether free moves are blocked near enemies or during alarms:** not documented. [UNKNOWN - see 06-open-questions.md (gap listed in research_notes/coop_moves.md)]

### 1.3 How many moves
- A 2005 preview mentioned "about 10" new co-op-only moves (human ladder, hand boost, tandem rappel, Tomoe-nage toss) and proximity voice. [ONE SOURCE: GF (GamesFirst preview)] A GameSpot "First Look" said five missions including a tutorial; previews in late 2004 to early 2005 promised four co-op levels and about 10 co-op-specific moves. [CONFIRMED - several sources: GamesFirst, GameSpot (for the move set and voice feature)]
- The shipped manuals document **six named moves** (three free, three contextual), plus Share View, Heal, Share Equipment, the synchronized actions and the crane. [6 moves CONFIRMED - several sources: XBM, PS2M, PRIMA; "10" ONE SOURCE: GF (GamesFirst preview)]
- **E3 2004 (May).** Co-op was shown. GameSpot's E3 impressions describe two spies entering a building, **one kneeling to boost the other over a wall**, with more emphasis on teamwork than Pandora Tomorrow. Footage: SickadtSteve, "E3 2004 CO-OP Mode Showcase", https://www.youtube.com/watch?v=IIfns1gvSRY (4:25). [CONFIRMED - several sources: that co-op was shown at E3 2004; demo details ONE SOURCE: GameSpot snippet] Alex37's "E3 Gameplay [Rare Footage]" (https://www.youtube.com/watch?v=11-wUk-tLaY, 7:57) has co-op from 2:14; the uploader notes the build's HUD, animations, weapon models and map layouts differ from release. [ONE SOURCE: video description]

### 1.4 Interaction-menu and HUD labels (exact wording where known)
- Contextual moves appear as named entries in the HUD Interaction menu only at valid spots: "Initiate Rappelling" / "Complete Rappelling", "Initiate Hangover" / "Complete Hangover", "Initiate Climb Shoulder" / "Complete Climb On", "Accept View Sharing", "Share Equipment". [CONFIRMED - several sources: XBM + PRIMA; exact rappel and shoulder labels ONE SOURCE: PRIMA]
- Game-file HUD interactions: "Heal Teammate", "Share Equip.", "Extraction", a generic "Defuse". [CONFIRMED - several sources: XB477 + PC105 HUD.int]
- XBM names a "Crane Communication" interaction "at the top of the HUD", a "Puzzle Action" for synchronized actions, and "Grab Character" for the Hangover neck snap. [ONE SOURCE: XBM p. 27 (crane, puzzle action); Grab Character CONFIRMED - several sources: XBM, PS2M, PRIMA]

### 1.5 Design reading [ANALYSIS]
- This two-tier split is the main structural idea:
  - **Free moves** give players a toolkit for *improvised* routes, so designers can scatter optional ledges and gaps.
  - **Contextual moves** let designers *author* specific set pieces, such as a ceiling hatch over a keypad, without the move breaking the level anywhere else.
- One handshake for every move: initiate, then complete, with a voice line and an icon. Players learn it once.
- Every move is a role split. One player is the *platform or operator* (crouch, rope, shoulders); the other is the *actor* (climbs, hacks, kills). Good set pieces swap roles across a mission so neither player is always the platform.
- Moves double as attacks: a throw that knocks out a guard, or an upside-down neck snap. Traversal and takedowns become one action, which creates "did you see that?" moments.
- Sync puzzles are rendezvous points that pull split-up players back together on the designer's schedule.
- Automatic voice lines keep co-op playable without voice chat. Any new game should carry an equivalent ping or callout layer.

---

## 2. Controls per platform

### 2.1 Main table

| Platform | Co-op Action (free moves: Boost, Tomoe Nage, Human Ladder) | Contextual moves / heal / share / sync (Interact) | Confidence |
|---|---|---|---|
| Xbox | **Black** button (replaces the whistle) | **A** via Interaction menu | [CONFIRMED - several sources: XBM diagram + text, FW controls page] |
| PS2 | **L2** (replaces the whistle) | **X** | [CONFIRMED - several sources: PS2M, FW controls page] |
| GameCube | **Z + D-pad Left** (Z is a modifier; the same combo whistles in solo) | **A** | [ONE SOURCE: FW controls page] |
| PC | **F**, also **Page Down** (defaults) | **Space / Enter** | [ONE SOURCE: FW controls page] |

- No PC or GameCube manual was found (archive.org search; replacementdocs search returned nothing usable), so PC and GC bindings rely on the Fandom controls page only. [ONE SOURCE: research note gap] The PC retail manual (PCDVD `Manual.pdf`, dated 16/02/05) was later read for save and revive rules (see section 5.2).

### 2.2 Other bindings that matter for the moves

| Function | Xbox | PS2 | GameCube | PC | Confidence |
|---|---|---|---|---|---|
| Rope holder moves partner (Dual Rappel: side to side; Hangover: up / down) | L / R triggers | L1 / R1 | not documented | not documented (PRIMA's generic wording: "Fire and Secondary Fire") | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| Rappeller climbs up / down | left stick | left stick | - | - | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| Hangover: suspended agent's "inverse crouch" (hide) | left trigger | L1 | - | PRIMA: hold the secondary-fire trigger | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| Tomoe Nage aim | initiator steers a target reticule after pressing Co-op Action (red = invalid) | same | same | same | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| Directional voice calls (rope, crane) | click and hold left stick + direction; release = "Stop" | (manual wording only for Xbox) | - | - | [CONFIRMED - several sources: XBM p. 27, PRIMA] |
| Revive | A (Interaction menu, "Heal Teammate") | X | - | **Insert** = revive (PC default key) | [CONFIRMED - several sources: XBM, PS2M; PC key from PC ini (PC105)] |
| Text chat "Say (Coop)" | - | - | - | **T** and **End** keys | [ONE SOURCE: FW controls page] |
| Bomb wire cut | (Interact) | **X** (a Brazilian PS2 player's comment) | - | players unsure which key (AT, YouTube comments) | [ONE SOURCE each] |
| EEV | right-stick click (Xbox co-op diagram) / button labelled "camera / EEV" | - | - | key **4** binds EEV mode (`SplinterCell3User.ini`) | [ONE SOURCE: XBM diagram; PC ini] |
| Quick save / load | pause menu | none mid-mission | none mid-mission | pause menu; F5 / F8 in the default PC map (not confirmed for co-op) | [CONFIRMED - several sources: game-file menus; F5/F8 ONE SOURCE: FW controls] |

- **Xbox co-op default diagram (XBM p. 20):** left trigger = KO attack / fire secondary; right trigger = lethal attack / fire primary; Y jump; X equip item; B crouch; A interact; **Black co-op action**; White quick inventory; Back OPSAT menu; Start pause; D-pad night / thermal / sticky camera (and EMF); right stick camera, its click EEV. [ONE SOURCE: XBM]
- **The PC "Say" key** presumably opens the text chat box that XBM lists on the HUD ("Chat box: used to communicate with Co-op partner in text format"). [INFERRED / UNCERTAIN: link between the two]
- **Versus (for comparison, Xbox):** **White** = start / finish a co-op move; **A** = heal partner, give / accept gadget (contextual). [ONE SOURCE: XBM p. 31]
- **EEV in co-op (affects remote hacking).** PRIMA says the EEV cannot be used in co-op, so there is no remote hacking from range and every hack (including those done from a Hangover) is done in person. The XBM co-op controller diagram still labels a button "EEV", and the PC ini binds key 4 to EEV mode; no co-op map, loadout or menu string enables or disables it. [INFERRED / UNCERTAIN: conflict; UNKNOWN - see 06-open-questions.md, R-02]
- **GameCube input trouble.** NWR says the GC controller makes some co-op inputs awkward (Z-button combinations); JV GameCube posters could not work out how to boost at all; "GameCube controls: some co-op inputs are hard to find" (PS2/GC Panama breakdown). [ONE SOURCE each: NWR; JV]
- **PC keyboard.** The co-op tutorial teaches only co-op moves and assumes single-player knowledge; keyboard and mouse is "obtuse" (Steam). 1UP (PC) said the relaxed pace of co-op suits a gamepad better than keyboard and mouse. [ONE SOURCE each: Steam; 1UP Metacritic blurb]

---

## 3. Free moves (Co-op Action button, almost anywhere)

### 3.1 Boost / "Short Scale"

**Names.** "Short Scale/Boost" in both manuals; "Boost" in PRIMA; "Short Scale" in the Training Facility objective (FW). Russian localisation: "подброс" (toss / boost). Hand boost in the GamesFirst preview. [English names CONFIRMED - several sources: XBM, PS2M, PRIMA, FW; Russian name ONE SOURCE: RUW; "hand boost" ONE SOURCE: GF (GamesFirst preview)]

**What it does.** The outcome is situational: it either boosts the partner up to grab a ledge or pipe, or vaults him clean over an obstacle (for example a wall). [CONFIRMED - several sources: XBM, PS2M] PRIMA adds that the boosted agent automatically grabs the ledge or pipe above. [ONE SOURCE: PRIMA]

**Trigger and handshake.**
- The initiator **crouches**, then presses Co-op Action. The partner walks up and presses Co-op Action; the boost then plays. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW controls page]
- Crouch gives a Boost; standing gives a Tomoe Nage (section 3.3). PRIMA and both manuals agree: the Boost initiator crouches, the Tomoe Nage initiator must stand (not crouch). [CONFIRMED - several sources: PRIMA, MAN-X, MAN-PS2]
  - Superseded / conflicting player claim: one JV answer said that boosting someone vertically means the booster must stand, not crouch. The research reads this as "standing gives a Tomoe Nage, crouching gives a Boost". [ONE SOURCE: JV; corrected by PRIMA + MAN-X + MAN-PS2]
  - GameCube players explaining the first training wall: "stand with your back to the wall and press the co-op input (Z + D-pad Left on GC); the partner faces you, crouches and presses the same", and the boost plays. A first-time player says they were stuck at "the very first bit". [CONFIRMED - several sources: 2 commenters on https://www.youtube.com/watch?v=gm9uYnMw9KA] Note: in this description the crouching agent is the one who completes; the manuals say the initiator crouches. Who must press first is therefore not fully settled by the comments. [INFERRED / UNCERTAIN: order of presses]

**Buttons.** Xbox Black; PS2 L2; GameCube Z + D-pad Left; PC F or Page Down. [Xbox, PS2 CONFIRMED - several sources: XBM, PS2M; GC, PC ONE SOURCE: FW]

**Anywhere vs marked spots.**
- Free move: usable almost anywhere there is room. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Training:** striped floor squares mark where to do it. [ONE SOURCE: IGNW]
- **Missions:** no markers. Ledges and windows read as climbable at a two-person height. [ANALYSIS from the guide routes]
- **Versus (Xbox/PC):** spies can Boost only where a **Boost icon** shows (lower-left of the screen). [ONE SOURCE: PRIMA versus chapter]

**Timings.** No timing window, animation length or initiator wait limit is documented. [UNKNOWN - see 06-open-questions.md (timing windows gap in research_notes/coop_moves.md)]

**Heights and distances.** No height in metres is documented in any source. The move reaches "a height one body cannot reach: a window, a high ledge, a wall top". [UNKNOWN - see 06-open-questions.md; description ANALYSIS]

**What each player controls.** The crouched initiator is the platform; the completer is lifted and either grabs the ledge / pipe or vaults the obstacle. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Animation flow.** The crouched agent offers cupped hands or a knee, the partner steps in and is lifted. The boosted agent either grabs a ledge or pipe above, or vaults clean over a low wall. [Outcomes CONFIRMED - several sources: XBM, PS2M; pose INFERRED / UNCERTAIN: read only from the XBM pictogram ("one agent kneeling, partner stepping up from his hands/knee")] The E3 2004 description also shows "one kneeling to boost the other over a wall". [ONE SOURCE: GameSpot E3 snippet]

**Typical chain.** Boost then Human Ladder (section 3.2) so both agents reach the ledge. [CONFIRMED - several sources: PRIMA basics + PRIMA walkthroughs]

**Uses per mission and where.** Counts are the minimum used on the guide's one recommended route, not every possible use in the map. On the guide's routes Boost is the most common move, used in every non-training mission, about 3-5 times per Xbox/PC mission, usually chained with Human Ladder. The catalogue (05) says the PS2/GC routes use it 1-2 times per mission; its own PS2/GC matrix (section 15.3) counts 1 (Seoul), 1 (Chemical Bunker), 3 (Train Station) and 3 (Panama) when single Boosts and Boost + Ladder pairs are added together. Both readings are kept. [ONE SOURCE: PRIMA for counts]

*Xbox / PC*

| Mission | Boost spots on the guide's route | Confidence |
|---|---|---|
| Training Facility | (1) First wall: boost the partner over; he opens the door locked from the far side. (2) Boost + Human Ladder onto a roof before the Hangover station. | [Wall ONE SOURCE: FAN (objective); first-wall confusion CONFIRMED - several sources: JV; roof route ONE SOURCE: IGNW] |
| Panama | (1) Façade: Boost + Human Ladder through the open 2nd-floor window into the Photocopy Room (also the exit route). (2) Far hall: Boost + Human Ladder up through a ceiling opening above a floor grate (order in the sequence reconstructed from scrambled OCR). | [ONE SOURCE: PRIMA; ceiling placement INFERRED / UNCERTAIN] |
| Seoul ("Seoul 3") | (1) Hotel side wall: Boost + Human Ladder from a large hole to a higher hole (2nd floor). (2) Floor holes: break a lock, drop through a floor hole, then Boost + Human Ladder up through a hole in the floor of the adjacent room. (3) Low wall after the back alley. (4) Cyber cafe, Prima route: Boost + Human Ladder to an open upstairs window. | [(1) ONE SOURCE: PRIMA (RYB has the partner entering on foot, so a ground entry may exist); (2) CONFIRMED - several sources: PRIMA, RYB; (3) CONFIRMED - several sources: PRIMA, RYB (wall climb); (4) ONE SOURCE: PRIMA] |
| Chemical Bunker | None on the guide's route ("boost-ladder: all but Chemical Bunker"). | [ONE SOURCE: PRIMA; pattern count from 08] |
| Train Station | (1) Tunnel end: Boost + Human Ladder up to a ledge (required, height), then down a ladder. (2) Ticket booth: **Boost only**, one agent onto the booth roof; he drops through a roof trapdoor onto the guard inside, knocks him out, then opens the door for his partner. (3) Main hall: Boost + Human Ladder onto the roof of the central circular phone booth, then Hangover (section 4.2). (4) Washroom ceiling: Boost + Human Ladder into an opening in the bathroom ceiling, crawl the duct, drop into the Final Metro Station. | [(1)-(3) ONE SOURCE: PRIMA; (4) CONFIRMED - several sources: PRIMA, NEO snippet ("the bathroom vent co-op move leads to the lower platform")] |
| Nuclear Plant (download) | Not documented. | [UNKNOWN - see 06-open-questions.md, R-19] |
| UN Headquarters (download) | Not documented ("No co-op moves are documented for this mission"). | [UNKNOWN - see 06-open-questions.md, R-20] |

*PS2 / GameCube*

| Mission / sub-level | Boost spots on the guide's route | Confidence |
|---|---|---|
| Team Training | First-wall boost (GameCube input described by players). | [CONFIRMED - several sources: 2 commenters on gm9uYnMw9KA; UNKNOWN beyond that - see 06-open-questions.md, R-05] |
| Seoul: Streets | Agent 1 crouches by a tall crate near insertion and Boosts Agent 2 onto it; then Human Ladder so Agent 1 also reaches the crate tops. | [ONE SOURCE: PRIMA] |
| Chemical Bunker: The Docks | Drop to a lower tunnel; Boost + Human Ladder to a high ledge; ladder up to the docks beside a large ship. | [ONE SOURCE: PRIMA] |
| Train Station: Hydro Tunnel | Ladder; Boost + Human Ladder to an elevated walkway (then the spotter + actor walkway room). | [CONFIRMED - several sources: PRIMA, Jake Ziggity description] |
| Train Station: Subway | Escalators; Boost + Human Ladder onto a ticket booth; trapdoor in; Agent 1 breaks the lock of the booth's door. | [ONE SOURCE: PRIMA; 6-pin lock CONFIRMED - several sources: FW, SHOCK-25] |
| Train Station: The Station | Boost Agent 2 onto a ledge; he climbs to an upper walkway and hides with his back to a brick pillar (Chu ambush, section 8). | [ONE SOURCE: PRIMA] |
| Panama: East Wing | (1) Agent 1 climbs onto the central desk (#4) and boosts Agent 2 to the reception hall's upper level; Agent 2 uses EMF vision plus the OCP to disable one of the two wall cameras above the stairs, so Agent 1 can run up the stairs. (2) Under the ceiling opening (#5): Boost + Human Ladder so both reach the ledge above (players stuck at a gated ceiling vent at the top of the stairs). | [(1) ONE SOURCE: PRIMA; (2) CONFIRMED - several sources: PRIMA, JV, NEO, SCQ] |
| Panama: Archives | Under the NE door (#9): Boost + Human Ladder up to the archive's second floor. | [ONE SOURCE: PRIMA] |

**Failure cases and quirks.**
- No room: head shake + controller vibration. [ONE SOURCE: XBM]
- **Stuck at the first wall.** Players got stuck at the very first Training wall, unsure whether to crouch or stand; the two-tier input (crouch = boost, stand = throw) was not obvious. [ONE SOURCE: JV, several posts] JV posters on GameCube asked how to do the Short Scale at all, so the move exists on GC. [ONE SOURCE: JV]
- **PS2/GC Panama East Wing:** during the boost "between the 2 cameras", the booster then could not climb up himself; presumably that is why the Human Ladder (or the stairs with the camera down) is needed. [ONE SOURCE: JV; INFERRED / UNCERTAIN]
- **PS2/GC Panama East Wing vent.** A computer at the bottom of the stairs carries an email about a high-end drone guarding east-wing access; its security action "Circulation Ventilation" opens the grated vent at the top of the stairs. NEO: hack the computer and the vent unlocks (one poster says it sometimes opened by itself, a glitch). JV: if one agent is seen by the cameras, the vent hatch shuts. Players often found it grated. PRIMA does not mention this computer. [CONFIRMED - several sources: FAN (data), JV, NEO, SCQ; whether the vent is shut by default INFERRED / UNCERTAIN]
- **Train Station lower platform.** Players got stuck finding the way to the lower platform, which is through the washroom ceiling vent (a Boost + Ladder spot). [ONE SOURCE: NEO snippet]

**Tutorial coverage.**
- Xbox/PC Training: the first objective after reading the panels is "Get over a wall with the boost ('Short Scale')"; the boosted agent goes over and opens a door from the far side; the wall is the first obstacle. [Objective CONFIRMED - several sources: FW, RUW, IGNW; wall is "first obstacle" ONE SOURCE: JV] Hexen2k7's description lists the drill as "boost a partner over a wall (Short Scale)". [ONE SOURCE: hexen2k7]
- PS2/GC Team Training: the wall boost exists (GC players' comments). [Partial, see 06-open-questions.md, R-05]

**Reception.** Boost and Human Ladder are among the most-praised features: "chained to reach windows and holes" (Prima walkthrough; Eurogamer; Pocket-lint); named by Eurogamer, Pocket-lint, NWR; boosts remembered fondly by Reddit players. [CONFIRMED - several sources: Eurogamer, Pocket-lint, NWR, Reddit]

**Design value [ANALYSIS].**
- Problem solved: reaching a height one body cannot reach (window, high ledge, wall top). Designers use it to give a pair an entry route a lone guard would never expect, and to put one agent on the far side of a locked barrier so he can open it from inside.
- Openings re-teach it without danger: Panama's dark courtyard and boost into a window; Seoul's alley and boost into a hotel hole (09 pacing).
- Pattern P4 "Boost-then-ladder vertical entry" (08): "a two-step handshake where both players act twice and no one is stranded"; turns an ordinary façade into an entrance a lone guard would never watch.
- Real-world analogue used in the translation guide: "standard two-person climbing assist used by climbers and tactical teams" (renamed "Leg-Up"; one player braces with cupped hands, knee or back).

### 3.2 Human Ladder

**What it does.** Brings the second agent up to a ledge after the first is up, by climbing the hanging agent's body. It is the "second half" of a Boost, so the pair does not get stranded. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Trigger and handshake.** The agent **already hanging** from a ledge (or a pipe, per PS2M) presses Co-op Action. The partner **stands beneath** and presses Co-op Action, then climbs up the hanging agent's body to the ledge. [CONFIRMED - several sources: XBM, PS2M, PRIMA; "or pipe" ONE SOURCE: PS2M] Corroborated by NWR and a JV Seoul sewer description. [CONFIRMED - several sources: MAN, NWR, JV]
- PS2 player detail: **the agent who was boosted up must press the co-op button again after landing** so the partner can climb him. [ONE SOURCE: comment on https://www.youtube.com/watch?v=gy1Vt3pxX8U]

**Buttons.** Same Co-op Action button as Boost (Xbox Black, PS2 L2, GC Z + D-pad Left, PC F / Page Down). [as section 2.1]

**Anywhere vs marked.** Free move, anywhere with a ledge or pipe; in Versus only after a Boost where the Boost icon appears. [CONFIRMED - several sources: XBM, PS2M, PRIMA; Versus ONE SOURCE: PRIMA]

**Timings, heights.** Not documented. [UNKNOWN - see 06-open-questions.md]

**What each player controls.** Hanging agent = the ladder (initiates, holds); standing agent = climber (completes, climbs). [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Animation flow.** XBM pictogram: agent hanging from a ledge, partner climbing his body. [ONE SOURCE: XBM pictogram, the researchers' reading]

**Uses per mission and where.** Almost always paired with Boost; see the tables in 3.1 (every "Boost + Human Ladder" entry). [ONE SOURCE: PRIMA]

**Tutorial coverage.** Not named in the Fandom Training objective list; the IGNW Training route uses Boost + Human Ladder onto a roof before the Hangover station. Whether Training teaches it on a panel is unknown. [ONE SOURCE: IGNW; UNKNOWN - see 06-open-questions.md] Lore text on the FW Agent Two page mentions "human ladder, back to back climbing" as part of the agents' training. [ONE SOURCE: FW Agent Two page]

**Reception.** Named with Boost by Eurogamer, Pocket-lint and NWR; "the climb-over-partner move" is called realistic by a judo player on Reddit. [CONFIRMED - several sources]

**Design value [ANALYSIS].** Boost followed by Human Ladder is a complete, symmetric two-step climb. Both players act twice, and the pair ends up together. This avoids the classic "one player stuck below" problem. Translation-guide name "Ledge Relay"; real-world analogue: partner pull-up.

### 3.3 Tomoe Nage / "Long Jump"

**Names.** "Tomoe Nage/Long Jump" in the manuals; "Tomoe Nage" in PRIMA and FW; Russian "длинный прыжок" (long jump); "Tomoe-nage toss" in the GamesFirst preview; Eurogamer calls it "Long Jump". Tomoe nage is a real judo sacrifice throw. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW, RUW]

**What it does.**
1. **Traversal:** launches the partner in a flying arc over a horizontal barrier that cannot be walked through: a laser grid, a gap between walkways, barbed wire, water, a cryotank. [CONFIRMED - several sources: PRIMA, FW]
2. **Attack:** anyone (an NPC) standing near the landing point is hit and **knocked out**. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW Tomoe nage page] NWR: "tossing your buddy ... into enemies". [ONE SOURCE: NWR]

**Trigger and handshake.**
- The initiator **stands** (not crouched), **faces away** from the intended landing direction and presses Co-op Action. [CONFIRMED - several sources: XBM, PS2M, PRIMA; "standing not crouched" ONE SOURCE: PRIMA, confirmed by the manuals' crouch-for-boost rule]
- A **landing reticule** appears and the initiator steers it. A **red reticule** means the throw is not possible. [CONFIRMED - several sources: XBM, PS2M, PRIMA] NEO players describe throwing the partner "over the tank with the aiming reticle". [ONE SOURCE: NEO]
- The partner presses Co-op Action and is thrown. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Buttons.** Co-op Action (Xbox Black, PS2 L2, GC Z + D-pad Left, PC F / Page Down). [as section 2.1]

**Anywhere vs marked.** Free move, anywhere with room; red reticule where impossible. [CONFIRMED - several sources: XBM, PS2M, PRIMA] Not available in Versus. [Not found in any source]

**Timings, distances.** No throw distance, arc height or timing window is documented; red reticule is the only stated limit. [UNKNOWN - see 06-open-questions.md]

**What each player controls.** Thrower: chooses the landing spot with the reticule. Thrown agent: completes, then is alone on the far side and must usually open the way (switch, computer, scanner, rope, door) for the thrower. [CONFIRMED - several sources: XBM, PS2M, PRIMA; far-side release pattern from the routes]

**Animation flow.** The thrower rolls (falls) backwards and launches the partner with his feet in a flying arc over the obstacle (judo sacrifice throw). [ONE SOURCE: FW plus the XBM pictogram "flying body over a backward-rolling thrower"]

**Uses per mission and where.** 0-2 per mission on the guide routes. [ONE SOURCE: PRIMA]

*Xbox / PC*

| Mission | Use | Confidence |
|---|---|---|
| Training Facility | (1) "Throw your teammate over the laser and deactivate it with the switch": the thrown agent hits the switch so the thrower can follow. (2) Over a barbed-wire wall; the thrown agent climbs a pipe and starts Dual Rappelling. (3) A final Tomoe Nage to finish the course. | [(1) CONFIRMED - several sources: FW, RUW; (2) and (3) ONE SOURCE: IGNW] Count note: 05's matrix and usage table say Training uses it **twice**; the IGNW route in the training breakdown lists **three** throws (laser, barbed wire, final). Both are kept. |
| Panama | Optional: IGNW suggests throwing agents onto courtyard guards, and setting up a throw behind a door a guard will open. Not on PRIMA's route. | [ONE SOURCE: IGNW] |
| Seoul | None on the guide route. | [ONE SOURCE: PRIMA] |
| Chemical Bunker | (1) Laser corridor: hand-over-hand along an overhead pipe past laser set 1; at the pipe's end, throw one agent past laser set 2; he deactivates the lasers at a computer around the corner. (2) Over the Cryotank: the thrown agent knocks out a guard and opens a **one-way door** for his partner; then an elevator down toward the Blue Room. | [(1) ONE SOURCE: PRIMA; (2) CONFIRMED - several sources: PRIMA, NEO (two threads: throw partner over the tank with the aiming reticle, partner opens a door, small lift to the storage bay)] |
| Train Station | Water (Hydro) tunnel, bomb pair 1, **used as an attack**: one agent shoots a light on the far wall to lure a guard; the other sets up a Tomoe Nage by the bomb laser and throws his partner over the beam at the moment the guard is near, so the thrown agent lands on the guard and knocks him out. The second guard who comes to check is knocked out too. Then each goes to his bomb (the thrown agent via a nearby side door) for the simultaneous cut. Required in PRIMA's route (other ways round not documented). | [ONE SOURCE: PRIMA] |
| Nuclear Plant | Turbine hall / fan puzzle: one agent throws the other across to the far balcony; the thrown agent walks to the far side of the turbine room where the fans have been switched off (a "stop ventilation fans" computer exists), jumps into the fan inlet and uses rappelling / a rope to bring his partner up. Another reply: climb the ladder, turn off the fan, return to a gap at the other end. | [Fan switch CONFIRMED - several sources: FAN data, NEO; moves ONE SOURCE: NEO forum excerpt, thread "The nuclear plant!!!! AGH!!!", March 2006, page 403] |
| UN Headquarters | Not documented. | [UNKNOWN - see 06-open-questions.md, R-20] |

*PS2 / GameCube*

| Mission / sub-level | Use | Confidence |
|---|---|---|
| Team Training | A PS2 viewer laughs that a partner "threw him at the enemy" (a throw used as an attack). | [ONE SOURCE: comment on gy1Vt3pxX8U] |
| Seoul: Fish Market | Move south along a walkway, drop to the lower walkway; Tomoe Nage throws Agent 1 across the water onto a dock. Then split: Agent 1 shimmies a beam over the water, Agent 2 takes the upper walkway. | [ONE SOURCE: PRIMA] |
| Chemical Bunker | None. | [ONE SOURCE: PRIMA] |
| Train Station: Hydro Tunnel | (1) Tomoe Nage across a gap in the walkway (Agent 2 thrown); Agent 2 then sets up Dual Rappelling at the upper walkway's edge and Agent 1 climbs up. (2) Back up; Tomoe Nage across a gap on the highest walkway (Agent 1 thrown); Agent 1 then does Dual Rappelling for Agent 2 to climb up. | [ONE SOURCE: PRIMA] |
| Panama: Server Room | Agent 1 hacks the keypad by the insertion point to drop the gate ahead; Agent 2 sets up a Tomoe Nage and throws Agent 1 over the laser beams; Agent 1 hacks the retinal scanner on the wall (#2, left of the lasers) to switch the lasers off. | [CONFIRMED - several sources: PRIMA, FAN RU] |

**Failure cases and quirks.**
- Red reticule = throw impossible. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- Input ambiguity with Boost (stand vs crouch) at the first Training wall. [ONE SOURCE: JV]
- The thrower is stranded until the thrown agent releases him; Chemical Bunker's tank throw ends at a one-way door (commitment point, no backtracking). [CONFIRMED - several sources: PRIMA, NEO]

**Tutorial coverage.** Xbox/PC Training objective 4: "Do the Tomoe Nage: throw your partner over a laser; the thrown agent then turns the laser off with a switch" (the third thing players do). Hexen2k7's drill list: "perform the Tomoe Nage throw". PS2/GC Team Training: a throw at an enemy (comment only). [CONFIRMED - several sources: FW, RUW; hexen2k7 ONE SOURCE; PS2 partial, see 06-open-questions.md, R-05]

**Reception.**
- The signature memory of the mode: "throw your buddy at guards", "tomoe nage the entire co-op campaign" (Steam); "dispatch an idiot by throwing your idiot" and shouting its name (Reddit); a judo player says the throw is realistic (Reddit 1djaago); Eurogamer liked "Long Jump" (throwing a partner into an NPC); GameRevolution; NWR praises acrobatic moves "like Chinese acrobats" (GameCube). [CONFIRMED - several sources: Steam, Reddit 1g21m8q, ijtifz, 1djaago, 1s6ylts, Eurogamer, GameRevolution, NWR]
- Fan video "Operation Throw Torgos" (redrumy3, 0:32), https://www.youtube.com/watch?v=LXMhZHUOpEk, title suggests a partner-throw gag. [INFERRED / UNCERTAIN: title only]
- "The first throw over a laser is the mode's signature moment, and here [Training] it is the third thing players do." [ANALYSIS]
- Why players loved it: a spectacular, slightly absurd acrobatic stunt that also solves a puzzle. [INFERRED / UNCERTAIN as a "why"; see 11_wow_moments.md for reception evidence]

**Design value [ANALYSIS].**
- Pattern P3 "Throw-across with far-side release" (08): a spectacular move that leaves the thrower stranded and dependent; the release device (switch, computer, scanner, rope, one-way door) is a reunion guarantee.
- Pattern P14 "Lure and ambush": the throw that lands a partner on a lured guard (Train Station bomb pair 1).
- Principle "every co-op move has more than one use": the throw also knocks out a guard at the landing spot, and guides built tactics around it.
- Translation-guide name "Partner Launch": "one player braces low and launches the partner over a low barrier or across a short gap; anyone at the landing spot is knocked down"; "exaggerated athletic assist".

---

## 4. Contextual moves (Interact button, interaction menu, placed spots only)

### 4.1 Dual Rappelling ("Co-op Dual Rappelling")

**Names.** "Co-op Dual Rappelling" (manuals); "tandem rappel" (GamesFirst preview); RUW calls it paired descent / ascent. [CONFIRMED - several sources: XBM, PS2M, PRIMA; GF ONE SOURCE; RUW ONE SOURCE]

**What it does.** A vertical descent or ascent on a rope with no fixed ladder. Variants:
- lowering the partner down a shaft or silo;
- letting the partner climb **up** a rope the holder extends from above. [Up variant ONE SOURCE: PRIMA; Training wording "help your teammate reach the upper part" ONE SOURCE: FW]
- Training direction note: EN wording says "reach the upper part"; the RU text uses both "descent" and "ascent", so the direction in Training is not fully settled by text (IGNW's route has the partner climbing up). [INFERRED / UNCERTAIN]

**Trigger and handshake.** At a rope anchor, one agent picks **"Initiate Rappelling"** in the HUD interaction menu; the other picks **"Complete Rappelling"** and goes onto the partner's rope. [Exact labels ONE SOURCE: PRIMA; mechanism CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Buttons.** Interact (Xbox A, PS2 X, GC A, PC Space / Enter) to start / complete; holder swings with **Xbox L / R triggers, PS2 L1 / R1** (PRIMA: "Fire and Secondary Fire"); rappeller **left stick** up / down. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Anywhere vs marked.** Only at placed rope anchors; the menu entry appears only there. Rope is not an inventory item; ropes exist only at the contextual Dual Rappelling / Hangover spots. [CONFIRMED - several sources: XBM, PRIMA]

**What each player controls.**
- **Rope holder:** swings / shifts the rappeller **side to side** with the triggers; steers him around hazards such as wall alarm sensors. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Rappeller:** moves **up and down** with the left stick and **can use weapons** (the pistol, including the jammer). [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- "In dual rappel one player controls sideways movement and the other controls height." [ONE SOURCE: Reddit 1qfdvur; matches the IGNW training route]
- Without a headset, the **rappeller** can send automatic **"Left" / "Right"** voice lines by clicking and holding the left stick left / right; releasing sends **"Stop"**. [CONFIRMED - several sources: XBM p. 27, PRIMA]

**Animation flow.** The holder braces on a ledge, playing out rope; the partner hangs on the wall below. [ONE SOURCE: XBM pictogram]

**Timings, heights.** Not documented. [UNKNOWN - see 06-open-questions.md]

**Uses per mission and where.**

| Build | Mission / sub-level | Use | Confidence |
|---|---|---|---|
| Xbox/PC | Training Facility | One use, up and over: after a Tomoe Nage over the barbed-wire wall, the thrown agent climbs a pipe and initiates Dual Rappelling; the partner climbs the rope **up** while the holder shifts him clear with the triggers. | [ONE SOURCE: IGNW; rappel objective FAN] |
| Xbox/PC | Chemical Bunker | Silo A (the far silo): one agent lowers the other down the shaft to a **control panel**; the rappeller presses it, then **climbs back up** his partner's rope. The panel raises a platform in the other silo (operate-and-jump, section 6.7). | [CONFIRMED - several sources: PRIMA, NEO ("lower your friend... press the switch... pull him back up")] |
| Xbox/PC | Nuclear Plant | Thrown agent "uses rappelling to bring the partner up" from the fan inlet (rope assist). | [ONE SOURCE: NEO forum excerpt] |
| Xbox/PC | UN Headquarters | The controller's opening line orders the pair to **rappel down to the window-washing platform** and get in from there. Whether this is the two-person Dual Rappelling or a solo rappel is not stated. | [Text CONFIRMED - several sources: XBDLC + PC105 game text; roof-door start also confirmed by a speedrunner; co-op nature INFERRED / UNCERTAIN] |
| PS2/GC | Chemical Bunker: Silo | East silo: **Agent 2 initiates** Dual Rappelling, Agent 1 rappels; Agent 2 swings the rope side to side so Agent 1 avoids **wall-mounted alarm detectors** in the shaft. Agent 1 activates the control panel at the bottom (raises the west-silo platform), then climbs the rope back up. Both ride the west-silo platform down. | [CONFIRMED - several sources: PRIMA, Ziggity's PS2 description ("a few motion sensors" going down the missile site)] |
| PS2/GC | Train Station: Train Repair Station | Agent 1 lowers Agent 2 down an elevator shaft by Dual Rappelling; Agent 2 calls the elevator up from the bottom; both ride down; the elevator then splits them (Agent 2 off on the first floor, Agent 1 to the bottom floor, two parallel tunnels). Required. | [ONE SOURCE: PRIMA] |
| PS2/GC | Train Station: Hydro Tunnel | Twice, after each Tomoe Nage across a walkway gap: the thrown agent sets up Dual Rappelling at the upper walkway's edge and the partner **climbs up** the rope (Agent 2 for Agent 1, then Agent 1 for Agent 2). Throw / rope leapfrog. | [ONE SOURCE: PRIMA] |

Summary: Xbox/PC Chemical Bunker (one) and Training (one); PS2/GC Chemical Bunker (one) and Train Station (three). [ONE SOURCE: PRIMA for missions; FW/RUW for training]

**Failure cases and quirks.** Steering failure in the PS2/GC silo would touch wall alarm detectors (the hazard is documented; the exact consequence is not). [ONE SOURCE: PRIMA; consequence UNKNOWN] "Solo with two controllers" is possible in theory but very frustrating, because rappel needs both players' inputs. [ONE SOURCE: Reddit 1qfdvur]

**Tutorial coverage.** Xbox/PC Training objective 7: "Use dual rappelling so a partner can reach a higher area" / "do a dual rappel" (hexen2k7). PS2/GC Team Training: unknown. [CONFIRMED - several sources: FW, hexen2k7; PS2 UNKNOWN - see 06-open-questions.md, R-05]

**Reception.** Named with shoulder-stand and back-to-back climbing by Pocket-lint, Eurogamer and Steam; "inverted rappel" remembered fondly on Reddit; the silo descent is called a physical showpiece. [CONFIRMED - several sources]

**Design value [ANALYSIS].** The holder becomes the operator, steering the partner around hazards. "Operator/actor split with continuous control"; translation-guide name "Belay Line" (real-world analogue: belay climbing; rope access for maintenance). The Training order puts the rappel last because it needs continuous partner control, unlike the early moves where the partner only completes.

### 4.2 Hang Over Teammate ("Hangover")

**Names.** "Hang Over Teammate" in the manuals; "Hangover" in PRIMA and the Training objective; Russian roughly "hang on rope with partner's help". [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW, RUW]

**What it does.** The rope holder lowers the partner **head-first, suspended by a rope at the ankles**, usually through a ceiling hatch, trapdoor or hole, and raises or lowers him with the triggers. [CONFIRMED - several sources: XBM, PS2M, PRIMA; ankles / hatch detail ONE SOURCE: PRIMA]

**What the suspended agent can do.** [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- Hack nearby computers and keypads (in person; no EEV remote hacking in co-op per PRIMA).
- Use the secondary weapon: the pistol, including the OCP / jammer.
- Pull up into an **"inverted crouch" / "inverse crouch"** to hide (Xbox left trigger / PS2 L1 / PRIMA: hold the secondary-fire trigger).
- **Grab and neck-snap** an unaware guard below via "Grab Character" (inverted neck snap).
- Send automatic **"Up" / "Down"** voice lines by clicking and holding the left stick up / down; releasing sends **"Stop"**. [CONFIRMED - several sources: XBM p. 27, PRIMA]

**Trigger and handshake.** One agent selects "Initiate Hangover", the other "Complete Hangover" in the interaction menu at a placed spot. [CONFIRMED - several sources: XBM, PRIMA (labels from the menu-label list)]

**Buttons.** Interact to start / complete; holder raises / lowers with the triggers (Xbox L / R, PS2 L1 / R1); inverse crouch Xbox left trigger / PS2 L1. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Anywhere vs marked.** Placed spots only (striped square in Training, per IGNW). [CONFIRMED - several sources: XBM, PS2M, PRIMA; striped square ONE SOURCE: IGNW]

**What each player controls.** Holder: height (triggers). Suspended agent: actions (hack, shoot / jam, hide, neck snap) and voice calls. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**Animation flow.** XBM pictogram: agent on a platform holding the rope, partner hanging head-down. [ONE SOURCE: XBM pictogram]

**Timings, heights.** Not documented. The catalogue's phrase "an upside-down agent dangling a metre above a guard's head" is descriptive prose, not a measured value. [ANALYSIS; UNKNOWN - see 06-open-questions.md]

**Uses per mission and where.** About one per mission.

| Build | Mission / sub-level | Use | Confidence |
|---|---|---|---|
| Xbox/PC | Training Facility | Station 4: laser at the entrance of a small room; computer reachable only from above. Boost and Human Ladder onto a roof, then from a striped square lower the partner upside down to hack the computer ("Disable Laser Grid") and kill the laser grid; a medkit is in the laser room. | [CONFIRMED - several sources: FAN + JV for the Hangover hack; roof route ONE SOURCE: IGNW; medkit ONE SOURCE: FAN RU] |
| Xbox/PC | Panama | Down the stairs past the automatic door; Hangover inside the **air duct**: the hanging agent hacks a wall keypad that opens the Exposition Room's (exhibition hall) gates. Then cancel the Hangover and go to the small balcony. | [CONFIRMED - several sources: PRIMA, JV] |
| Xbox/PC | Chemical Bunker | Cryo upper gallery: shoot the corner light so the guard across the room cannot see; Hangover at the top of the Cryotank lowers one agent to collect the anti-virus ("Retrieve a sample of the anti-virus"). | [CONFIRMED - several sources: PRIMA, NEO ("bring your partner back up"), FAN PS2 wording ("access the chamber from above")] |
| Xbox/PC | Train Station | Main hall: behind the central circular phone booth, Boost + Ladder onto its roof, move to the front edge, then Hangover so the hanging agent **plants the bug on the payphone**; then wait and listen to the call. Required in PRIMA's route. | [Objective CONFIRMED - several sources; method ONE SOURCE: PRIMA] |
| Xbox/PC | Nuclear Plant, UN HQ | Not documented. | [UNKNOWN - see 06-open-questions.md, R-19, R-20] |
| PS2/GC | Chemical Bunker: Cryogenic Chamber | At the top of the chamber, Agent 2 lowers Agent 1 into the chamber to take the anti-virus. | [CONFIRMED - several sources: PRIMA, FAN ("access the cryogenic chamber from above")] |
| PS2/GC | Panama: Server Room | At a shaft at the end of the duct, Agent 1 lowers Agent 2 to grab a **fuse** at the bottom, then pulls him up; Agent 2 slots the fuse into a circuit box (#5) to open a gate atop a short ladder; both climb into the server room. Required. | [ONE SOURCE: PRIMA] |

Summary: about one per mission (Panama, Chemical Bunker, Train Station on Xbox/PC; Chemical Bunker and Panama on PS2/GC). [ONE SOURCE: PRIMA; Training CONFIRMED - several sources: FW, RUW]

**Failure cases and quirks.**
- **Panama ground-floor grille (Xbox/PC).** Several JV posters were stuck at a ground-floor grille with lasers and two guards behind it; the answer was to go back up, find a large vent and do the upside-down descent to key the code that opens the grille. Players look at the grille, not the ceiling. [CONFIRMED - several sources: PRIMA, JV]
- **After the Panama Hangover:** JV posters reported getting stuck at the balcony edge, or jumping and dying (they missed the solo ledge shimmy); another took the elevator from the balcony and got stuck. [CONFIRMED - several sources: PRIMA, JV]
- The upside-down hack "lost its magic when players couldn't find where to start it (Panama grille, PS2/GC vent)". [CONFIRMED - several sources: 11 section 4]
- A JV poster, giving a hint for another level, points to the training move done just before hacking the computer, "where one spy ends up upside down". [CONFIRMED - several sources: FAN, JV]

**Tutorial coverage.** Xbox/PC Training objective 5: "Hack a computer while hanging upside down ('Hangover') to switch off a laser grid" / "Hack the computer to deactivate the laser using the Hangover move". PS2/GC Team Training: one laser-grid computer ("Disable Laser Grid", recorded as an objective, not as a security hack on this build); whether it is reached by Hangover is unknown. [Xbox CONFIRMED - several sources: FW, RUW; PS2 ONE SOURCE: FAN RU; UNKNOWN - see 06-open-questions.md, R-05]

**Reception.** Eurogamer's favourite ("above all the Hangover rope-dangle neck-break"); "upside-down rope dangle and neck-break" (Eurogamer; Steam); 03's praise list: "the upside-down rope dangle with a neck snap". [CONFIRMED - several sources]

**Design value [ANALYSIS].**
- Problem solved: reaching an object in a room the pair cannot enter by the floor (guarded, lasered or locked). It gives designers a vertical "reach-in" puzzle: the guarded room's ceiling is the entrance (pattern P5 "Reach-in from above").
- It is the most cinematic move and the clearest picture of "my life is literally in my partner's hands".
- Stuck points cluster where the solution is above the problem; vertical solutions need stronger signposting.
- Translation-guide name "Drop Line"; inverted rope work exists in rescue and film stunt practice; plausibility depends on tone.

### 4.3 Stand on Teammate's Shoulders

**Names.** "Stand on Teammate's Shoulders" (manuals); "shoulder-stand" in the research; on-screen notes: "climb on each other's shoulders" (Seoul). [CONFIRMED - several sources: XBM, PS2M, game text]

**What it does.** Lets the top agent interact with something just out of reach without needing a ledge to grab (a charge point high on a vehicle, a hatch). The top agent can interact with elevated objects and **use weapons**. [CONFIRMED - several sources: XBM, PS2M]

**Trigger and handshake.** One agent picks **"Initiate Climb Shoulder"**; the partner picks **"Complete Climb On"** and climbs up. [CONFIRMED - several sources: XBM, PS2M; labels ONE SOURCE: PRIMA]

**Buttons.** Interact (Xbox A, PS2 X, GC A, PC Space / Enter). [as section 2.1]

**Anywhere vs marked.** Placed spots only. [CONFIRMED - several sources: XBM, PS2M, PRIMA]

**What each player controls.** Top agent: interacts (places charge) and can use weapons. Bottom agent: the platform; what he can do while supporting is not documented. [CONFIRMED - several sources: XBM, PS2M; bottom agent UNKNOWN]

**Animation flow.** XBM pictogram: one agent standing on the other's shoulders. [ONE SOURCE: XBM pictogram]

**Timings, heights.** Not documented. [UNKNOWN - see 06-open-questions.md]

**Uses per mission and where.**

| Build | Mission / sub-level | Use | Confidence |
|---|---|---|---|
| Xbox/PC | Seoul, anti-aircraft vehicle 1 (temple) | Knock out the two patrolling guards without alerting the watcher on the temple's high balcony; shoulder-stand at the rear of the Chun-Ma to place an explosive charge; move into the sewer tunnel and detonate from there. Required. | [CONFIRMED - several sources: PRIMA, RYB, FAN note, SuperCheats tip summary] |
| Xbox/PC | Seoul, anti-aircraft vehicle 2 | Through the tunnel to the far side of the temple; three guards (one walks up and sits down; RYB recommends a decoy / flank); shoulder-stand charge again. Required. | [3 guards CONFIRMED - several sources: PRIMA, RYB] |
| PS2/GC | Seoul: Gardens | One anti-aircraft vehicle (only one on this build); behind it, Stand on Shoulders and "place charge"; required; under a **4-minute timer**. | [CONFIRMED - several sources: PRIMA, FAN note; timer ONE SOURCE: FAN] |
| PS2/GC | Panama: East Wing | Drop down the elevator shaft onto the car roof; Stand on Shoulders, then plant a charge on the shaft wall to blow open the car's trapdoor; drop through. Required. | [CONFIRMED - several sources: PRIMA, FAN (RU stat: one EMP charge used to open the elevator)] |

- **Charge.** The explosive charge is placed from a partner's shoulders and detonated remotely. [CONFIRMED - several sources: PRIMA, IGNW Seoul, RUW Seoul in-game note]
- **Seoul timer (Xbox/PC).** A five-minute limit to destroy the second vehicle. Game text: the 5-minute timer starts **when the (friendly) plane is shot down**, with controller (Lambert) warnings at each minute. [CONFIRMED - several sources: RYB, game text (XB477 + PC105)] Earlier source: RYB said detonating AA #1 starts the timer; the game text names the plane being shot down as the trigger. Both are kept. PRIMA does not mention a timer. [ONE SOURCE: RYB for "detonating AA #1"]
- **Signposting.** The OPSAT / on-screen note says to disable the tanks by climbing on each other's shoulders. [CONFIRMED - several sources: game text (XB477, PC105), FW; RUW Seoul shoulder note ONE SOURCE in the earlier pass, now confirmed by game text]

**Tutorial coverage.** Not taught by name in Training on either build. [CONFIRMED - several sources: FW objective list, game files]

**Reception.** "Demolishing a missile vehicle from a partner's shoulders" is a Seoul showpiece (present confirmed; "wow" reaction not sourced); the PS2/GC "trapdoor charge blown from a partner's shoulders" likewise. Named in reception with Dual Rappelling and back-to-back climbing (Pocket-lint, Eurogamer, Steam). [Present CONFIRMED; reaction INFERRED / UNCERTAIN]

**Design value [ANALYSIS].** "Shoulder-stand demolition shows a contextual move used twice in an arena with a watcher. The repetition across two arenas teaches, then tests." Translation-guide name "Stack": a common real two-person reach.

---

## 5. Team interactions

### 5.1 Share View
- **What it does.** When one agent uses a camera gadget (the sticky camera), the other can pick **"Accept View Sharing"** in the Interaction menu to watch the feed. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Range.** Works at any distance. [CONFIRMED - several sources: XBM, PS2M, PRIMA (family table)]
- **Split-screen.** Not available in split-screen, because the partner can simply look at the other half of the screen. [ONE SOURCE: XBM p. 25] Platform note: split-screen exists on Xbox, PS2 and GameCube (PS2/GC co-op is split-screen only); the PC has **no** native split-screen (PC menu: LAN / Online / Settings). PRIMA had listed PC split-screen; this is corrected by the PC 1.05 menu text and the PC manual (R-13 closed). So on PS2/GC Share View is effectively never usable, and on PC it is always available. [CONFIRMED - several sources: PC105 + PCDVD manual for no PC split-screen; consequence for Share View INFERRED / UNCERTAIN]
- **Button.** Interact (Xbox A, PS2 X, GC A, PC Space / Enter). [as section 2.1]
- **Sticky camera functions.** Launcher-fired; recon, noise lure and knockout gas (the camera is destroyed after gas). [CONFIRMED - several sources: PS2M, XBM, PRIMA, FW]
- **Spotter uses in routes (Share View not named in the source).**
  - PS2/GC Train Station Hydro Tunnel: Agent 1 sticks a camera to a wall and spots for Agent 2, who sneaks in and knocks out the walkway guard and the floor guard. [CONFIRMED - several sources: PRIMA, Jake Ziggity]
  - UN HQ (Xbox/PC): the security-room keypad code can be learned by luring guards to the keypad and watching them type it with a sticky camera plus thermal or night vision; "a two-player-friendly observation trick". [ONE SOURCE: FW UN HQ trivia]
- **Tutorial coverage.** Not taught by name in Training. [CONFIRMED - several sources: FW objective list]
- **Design value [ANALYSIS].** It turns the camera into an "overwatch" tool: one player scouts and the other reads the same picture. This is the seed of the overwatch-and-infiltrate pattern (08). Translation-guide name "Feed Share".

### 5.2 Heal / Revive (adrenaline)
- **Downed state.** At zero health in co-op an agent is not killed outright: he drops unconscious ("knocked unconscious" / "critically wounded"); the FW Cooperative page says the injured player must wait for the partner. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW]
- **Revive.** The partner goes to him and picks the heal interaction ("Heal Teammate") from the Interaction menu (Xbox A / PS2 X; PC default key **Insert** = revive). The training note: you heal your partner, if you have a syringe, by **standing over him and interacting**. [CONFIRMED - several sources: XBM, PS2M, game files XB477 + PC105]
- **Effect.** An adrenaline shot that restores **about half health**; RUW: the syringe restores **50%**. [CONFIRMED - several sources: PRIMA, RUW]
- **Window.** About **30 seconds** to reach the downed partner, otherwise the mission fails. [CONFIRMED - several sources: XBM, PS2M, PRIMA, PCDVD manual p. 13]
- **Item.** "Adrenalin Syringe" (internal name REVIVESYRINGE), "an experimental adrenaline boost injected into an incapacitated person's torso". [CONFIRMED - several sources: Equipments.int / HUD.int in XB477 and PC105]
- **Count (Xbox/PC).** Each agent carries **one** syringe, so the team can revive **twice per mission**; both manuals say revive can only be used "twice per game". [CONFIRMED - several sources: in-game Co-op Training pop-up on Xbox and PC (XB477 + PC105 `P_00_Training_COOP.int`), XBM, PS2M; RUW tables and PRIMA's own Xbox/PC gear boxes give 1 syringe per agent per mission]
  - **Superseded claim:** PRIMA's co-op basics page says each agent carries **two** adrenaline shots. Corrected by the game's training text (one each, two per team) for Xbox/PC (R-03 closed for Xbox/PC). [ONE SOURCE: PRIMA; corrected by XB477 + PC105]
  - **PS2/GC:** FW sub-level tables give **2 syringes per agent per sub-level**; the PS2/GC count was not checked in game files (no PS2/GC data available). [ONE SOURCE: FW; UNKNOWN - see 06-open-questions.md, R-03]
  - The earlier "most consistent reading" in the research notes (Xbox/PC 1 each per mission, PS2/GC 2 each per sub-level) remains the working reading. [INFERRED / UNCERTAIN for PS2/GC]
- **Communication.** When an agent's health hits zero, an automatic voice line tells the partner he needs help. [ONE SOURCE: PRIMA] Xbox HUD shows **teammate status (partner's health)**; the PS2 HUD list has no teammate-health item. [ONE SOURCE each: XBM p. 23; PS2M]
- **Both agents down at once:** no source states it; the menus only show a game-over state that waits for the teammate. Implied failure because nobody remains to revive within the window. [UNKNOWN - see 06-open-questions.md, R-03]
- **Quirk / exploit (Xbox/PC Chemical Bunker).** Players can skip a lift ride by dropping down the shaft onto or near the partner (fall damage downs rather than kills) and reviving at the bottom. NickyTheGamer mentions "a BIG shortcut" early in the mission. [ONE SOURCE: RUW; INFERRED / UNCERTAIN]
- **Softening trial and error.** Players at the cryotank expect to die several times (save inside); PRIMA's revive rule softens this. [ONE SOURCE each: NEO; PRIMA]
- **Rescue stories.** Players' favourite failure stories: a partner misjudges a zip line, drops in front of a guard, the other clears the room and revives him, then the agents' "Damn we're good" line plays. [CONFIRMED - several sources: Reddit 1megyet, 1ouonhz, PS2 / ParagonMitchell comments, 6lzq8e]
- **Reception.** "The original's 30-second revive was praised"; GameRevolution listed the adrenaline heal among the moves; "adrenaline heal" also in the GameRevolution GameCube review. [CONFIRMED - several sources]
- **Tutorial coverage.** Not a Training objective, but a Co-op Training pop-up explains it (one adrenaline boost each, two revives per mission). [CONFIRMED - several sources: XB477, PC105]
- **N-Gage/DS.** A generic co-op line says a man is down and the other player must find the body and use a **health pack within 30 seconds** to save him; interaction "HEAL ALLY"; health pack = 50 HP; 1 health pack per role. [ONE SOURCE: N-Gage text table]
- **Versus.** Spies "nurse" each other via HUD interact (Xbox/PC); Xbox A = heal partner. [ONE SOURCE each: PRIMA; XBM p. 31]
- **Design value [ANALYSIS].** A downed partner becomes a time-limited rescue task before it becomes a reload; translation-guide name "Pick-Up".

### 5.3 Share Equipment
- **What it does.** Equip an item, approach the partner and pick **"Share Equipment"** (HUD: "Share Equip."). Only items **marked with a dot** in the inventory can be given; both agents must be near each other. [CONFIRMED - several sources: XBM, PS2M, PRIMA, game files]
- **Cancel.** The request can be cancelled before the partner answers / accepts. [ONE SOURCE: PS2M]
- **Button.** Interact (Xbox A, PS2 X). Versus Xbox: A = give / accept gadget (contextual). [CONFIRMED - several sources: XBM, PS2M; Versus ONE SOURCE: XBM p. 31]
- **Did it ship? Yes.** HUD interaction "Share Equip." and training pop-ups explain it (only items marked with a dot can be shared). [CONFIRMED - several sources: XB477, PC105, PC manual]
  - **Superseded claim:** the Fandom Training Facility page lists a "Share Equipment" text as cut content (deleted data): an email dated **06/23/07** from **"Dan" to "Seb"** describing the move. The earlier research marked the feature [INFERRED / UNCERTAIN] because of this. Corrected: a designer comment in French in the training level says that note is not used for now and exists only so it gets translated. So the tutorial note was cut; the feature was not (R-04 closed). [ONE SOURCE: XB477 training `.lin` + `00_Training_COOP.int`]
- **Loadout context.** Xbox/PC loadouts are **asymmetric**: Agent One carries the launcher payloads (sticky cameras in quantity, sticky shockers, ring airfoil rounds); Agent Two carries hand grenades (flash, smoke, frag); UN HQ gives both agents an identical kit in the game files. PS2/GC loadouts are **symmetric** (identical per sub-level). See 04-kit.md. [CONFIRMED - several sources: RUW tables + PRIMA gear boxes; game files]
- **Tutorial coverage.** Not a Training objective; explained by training pop-ups. [CONFIRMED - several sources: XB477, PC105]
- **Design value [ANALYSIS].** Combined with the asymmetric Xbox/PC loadouts, sharing makes inventory a team resource ("you shock the near guard, I'll flash the pair"). Translation-guide name "Hand-Off".

### 5.4 Shared intel (not a move, but a team rule)
- When one agent reads a computer, **both agents' mission devices (OPSATs) update**. [CONFIRMED - several sources: training pop-up text, XB477 + PC105]
- Every co-op map has an OPSAT map page; the map legend has Alarm, Objective, Player, Location and Triggered Alarms and **no teammate entry**. Whether the partner is marked is unknown. Agents are told apart by goggle-light colour: Agent One blue, Agent Two red. [map CONFIRMED - several sources: game files; legend ONE SOURCE: InGameMenus.int; marker UNKNOWN - see 06-open-questions.md, R-11; goggle colour ONE SOURCE: FW] (see 05-hud-and-camera.md)

---

## 6. Synchronized actions (two bodies, one moment)

### 6.0 General rules
- **What they are.** Both agents must act at the same moment at paired devices: defusing bombs (simultaneous wire cut), dual retinal scanners, opening doors that need two guards forced to scanners, and other "puzzle actions". [CONFIRMED - several sources: PRIMA, XBM; bomb wire cut also FW Train Station]
- **Input.** Interaction menu at the device ("Puzzle Action", XBM p. 27): the player selects the action and presses A (Xbox). [CONFIRMED - several sources: XBM p. 27, PRIMA]
- **Online without headsets the timing requirement is removed.** The first player selects the action and presses A, the second does the same, and the game syncs them automatically (the dual retinal scanner is explicitly covered). PRIMA adds that this makes synchronized puzzles easier when playing online without a headset (they need not be exactly simultaneous). [CONFIRMED - several sources: XBM p. 27 "Puzzle Action", PRIMA]
- **Mic dependence (player view).** A JV player said synchronising is not really possible without a microphone; the game's relaxed no-headset sync is the counterpoint. [ONE SOURCE each: JV; PRIMA]
- **Solo bypass.** One agent can do some "dual" tasks alone (both training retinal scanners; both cryo stations per RUW). [CONFIRMED - several sources: FW-RU, IGNW]
- **Tolerance window in milliseconds / seconds:** not documented. [UNKNOWN - see 06-open-questions.md]
- **PC input failures.** On PC, players reported being unable to complete the mixing (and wire cutting): they can scroll choices (A / D) but cannot confirm (2020 Steam thread); a 2014 Steam thread reports nothing happening at the cryotank on PC while it worked on Xbox; a 2008 AnandTech thread reports the same class of problem for two-player objects (cryo, bombs, laser grids) and players unsure how to operate the dual-defuse interface on PC (no answer). [CONFIRMED - several sources: 2 Steam threads + AT]
- **Bonus-disc documentary (developer voice):** the co-op is a "field side story" of two rookie agents; the hardest part was "two characters synchronising specific actions"; "you got to trust a partner". [ONE SOURCE: bonus-disc documentary Q1_t00, archive.org item q-1-t-00_202406, local transcript]
- **Design reading [ANALYSIS].** A synchronized action works as a *rendezvous*: it forces two players who have split up to arrive, hold and count down together. Both pieces of hardware are mounted where one person cannot work them alone, which mirrors the real-world "two-person rule" (dual control: two separate locks or combinations, physical separation such as Minuteman launch-key slots too far apart for one person to turn both, simultaneous action; banks use two keys or split combinations).

### 6.1 Summary table

| Action | How it works | Where | Confidence |
|---|---|---|---|
| Paired retinal scanners | Two scanners must be satisfied at once. In Training each agent hacks one, and a failed hack costs health. In missions the pair often grabs two captives and forces them to the scanners simultaneously. | Training; Panama (a security guard and the VP); Chemical Bunker (two captives); PS2/GC Panama exit door (East Wing) and PS2/GC Chemical Bunker Cryogenic Chamber | [CONFIRMED - several sources: FW, PRIMA, IGNW] |
| Paired bomb wires | Both agents cut the live wire at the same moment. Thermal vision shows which wire is live; on PS2/GC controller vibration also cues it. In Train Station the bombs are protected by a laser between the pair, and touching it fails the mission. | Train Station (three bombs Xbox/PC, four pairs PS2/GC); Chemical Bunker missile warhead (Xbox/PC) | [CONFIRMED - several sources: PRIMA, FW] |
| Paired switches | Buttons on both sides of a door or elevator pressed together | PS2/GC Seoul, Chemical Bunker, Train Station; N-Gage/DS Breakdown | [ONE SOURCE: PRIMA; N-Gage CONFIRMED - several sources] |
| Paired code lock | Two codes locked in at the same moment on a missile warhead | PS2/GC Chemical Bunker | [ONE SOURCE: PRIMA; two terminals CONFIRMED - several sources: PRIMA + FAN] |
| Two-station mixing | The anti-virus is mixed at two cryotank stations, with each agent handling one colour set. On Xbox/PC the colour sequence is randomised per mission and difficulty (3, 4 or 5 steps). | Chemical Bunker | [CONFIRMED - several sources: FW table, PRIMA] |
| Crane | One agent drives a crane while the other gives directions with automatic voice lines (Back / Forward / Left / Right / Lower / Raise / Stop) to set a missile on a holder. A simultaneous wire cut follows. | Xbox/PC Chemical Bunker | [CONFIRMED - several sources: XBM, PRIMA] |

### 6.2 Paired retinal scanners (every documented instance)

| Build | Mission / place | Method | Confidence |
|---|---|---|---|
| Xbox/PC | Training Facility, station 5 | Door with two retinal scanners: each agent hacks one scanner at the same time. One agent can hack both, but a failed hack costs health; the objective text warns that failing is "dangerous". JV: a poster asked whether the training scanner needs hacking because two faces must be scanned at once; players were confused by retinal-scanner hacking. | [CONFIRMED - several sources: FAN, JV, IGNW; solo hack and health cost ONE SOURCE: FAN RU; confusion ONE SOURCE: JV] |
| Xbox/PC | Panama, 3rd-floor archive door | Switch off the 3F hall lights; a guard leaves the security office to turn them back on; Agent A grabs him and carries him to the retinal-scanner room at the end of the hall. Agent B sneaks into the VP's office at the opposite end of the hall and grabs de Medeiros from behind (interrogating him gives codes). Both force their captives (the guard and the VP) to look into the paired scanners at the same moment, then choke both unconscious. | [ONE SOURCE: PRIMA; mechanic CONFIRMED - several sources: MAN-X + PRIMA intro ("forcing a couple of guards to open a door locked by a pair of retinal scanners" as a stock synchronised puzzle)] |
| Xbox/PC | Panama (game-text tip) | The two archive scanners are easiest with the official (VP) on one and any guard on the other, used at the same moment; if the official is unconscious, the scanner must be hacked instead. | [CONFIRMED - several sources: game text XB477 + PC105] |
| Xbox/PC | Chemical Bunker, storage room | One agent climbs the crates and shoots out the far-wall light; both sneak up and grab the two guards by the far door, then simultaneously force them to use the twin retinal scanners. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Seoul, cyber cafe front door (RYB route only) | A single retinal scanner guarded by two men: force one to scan or hack it. | [ONE SOURCE: RYB] |
| Xbox/PC | Nuclear Plant | Main control room door and lab server room locked by retinal scanners; how they are beaten (dragging a guard, a "security doors" terminal, or a dual synchronized scan) is not documented. | [UNKNOWN - see 06-open-questions.md, R-19] |
| PS2/GC | Team Training | RUW stats list 2 retinal scanners hacked. | [ONE SOURCE: FAN RU] |
| PS2/GC | Chemical Bunker: Cryogenic Chamber | Camera leapfrog to the elevator; shoot the elevator's ceiling light; ride to the 2nd floor; Agent 2 throws a **flash grenade** as the doors open; both grab a stunned guard and force them through the twin retinal scanners simultaneously, then choke them. | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: East Wing exit | Both agents **hack** the two retinal scanners flanking the exit door at the same time, opening the way to the West Wing. JV posters describe a big room full of lasers where cutting a beam wakes a shooting drone, with two retinal scanners they could not reach without crossing lasers, failing when they tried to hack. | [CONFIRMED - several sources: PRIMA, FAN (RU: 2 retinal scanners hacked on the last door); JV] |
| PS2/GC | Panama: Server Room (laser scanner) | Single scanner hacked by the thrown agent to drop the lasers (section 3.3). | [CONFIRMED - several sources: PRIMA, FAN RU] |
| PS2/GC | Panama: Server Room (final) | Single captive escorted up the stairs past an OCP-jammed camera and forced into the scanner, which retrieves the server files and ends the PS2/GC campaign. | [ONE SOURCE: PRIMA] |

- Failed hacks sound alarms (solo rule); in Training failing a retinal hack costs health. [CONFIRMED - several sources: PS2M hacking rules, FW/RUW training, PRIMA]
- **Design reading [ANALYSIS].** "A living key": the best beat in either build is a two-scanner door opened by two captives (a guard and the target). Infiltration, capture, a split and a synchronized finale fold into one moment; non-lethal play becomes useful because a dead person cannot open the door (pattern P7 "Captive as key").

### 6.3 Paired bomb wires (simultaneous wire cut)

**Xbox/PC Train Station (three laser-linked bomb pairs).**
- Two bombs on facing walls with a **laser beam between them**; touching the beam detonates them (mission failure). [CONFIRMED - several sources: PRIMA, FW]
- Procedure in the game's intel (notebook): the first simultaneous cut breaks the "laser link" and wakes a second security system that needs a **second simultaneous cut**; the **live wire changes over time ("pulses")**. Thermal vision shows which wire lights on each pulse. [CONFIRMED - several sources: FAN notebook transcription, PRIMA ("cutting the two live wires"), NEO answer] Game text: "both agents cut the active wire at the same time, then a second wire; the active wire changes". [CONFIRMED - several sources: XB477 + PC105]
- Players' description: (1) both agents select the bomb; (2) each uses thermal vision to find the hot wire; (3) both cut at the same moment; (4) repeat for a second wire **before a timer runs out**. A Brazilian PS2 player adds: turn thermal on to see which wire glows, turn it off, then cut that wire; another says the cut is the X button on PS2. A PS2 uploader says it is hard without controller vibration, which also cues the live wire. [CONFIRMED - several sources: 6+ independent comments across PC, PS2 and GameCube: 8FiRUvq86sg (PC), LY9-0Dk-YHk (GameCube, 2 commenters), ge7dEnjp6MU (PS2 + description)]
- They "must talk to sync". [ONE SOURCE: PRIMA]
- Pair 1 (water / Hydro tunnel): thrown-agent attack, then the thrower walks to the wall bomb on his side without breaking the beam; the thrown agent goes through a nearby door to the matching bomb; cut. Pair 2 (machine room): while guards look at the broken light, both hug the right wall to the bombs at the far end; the lead agent creeps along the laser (without touching it) to the matching bomb; cut. Pair 3 (metro platform): a parked train splits the pair, one on each side; cut; regroup through the dark train car. [ONE SOURCE: PRIMA; sync cut CONFIRMED - several sources: PRIMA, FAN, AT, EG]
- Beat timing in Suru's Elite 100% run (13:38 total): schematics 1:36, bombs 3:06 / 4:43 / 5:28, bug 7:24, the agent 10:56, extraction 13:30. [CONFIRMED - several sources: order matches PRIMA]
- Timer length for the second wire: not documented. [UNKNOWN - see 06-open-questions.md]

**PS2/GC Train Station (four bomb pairs despite the "three bombs" briefing).**
- Count: 1 in Train Repair Station, 2 in Hydro Tunnel, 1 in Subway; SHOCK-25's stats count 1 + 2 + 1 "laser mines disarmed". [CONFIRMED - several sources: PRIMA, SHOCK-25 (RUW copies SHOCK-25)]
- Each agent cuts his bomb's active wire at the same moment as his partner; **thermal vision OR controller vibration** tells which wire is active; "wait for your partner before cutting". [ONE SOURCE: PRIMA] The in-game email says: deactivate the laser first, which **starts a countdown**, then both cut the hot wire before it ends. [ONE SOURCE: FAN] A SuperCheats Q&A describes the Train Repair room: two trains in opposite rooms, the bomb room between them, a laser that detonates on contact, players unsure how to drop the laser. [ONE SOURCE: SCQ]
- Subway pair: Agent 2 waits at the bomb on the left of the subway train; Agent 1 goes to the opposite bomb; simultaneous cut (sync cut either side of a train). [ONE SOURCE: PRIMA]

**Xbox/PC Chemical Bunker missile warhead.**
- After the crane, open the warhead with code **1961**; both agents use thermal vision to find their active wire and cut simultaneously ("Retrieve a viral sample from one of the missiles"). Email (Computer 8, "Disarming the warheads"): after opening the casing, the safety must be disabled by cutting **two hot wires simultaneously**, strongly recommended with two people. Game text: removing toxin from a warhead requires cutting two hot wires simultaneously. [CONFIRMED - several sources: PRIMA, FAN email, game text]
- PS2/GC replaces the wire cut with a simultaneous two-terminal hack (section 6.5). [CONFIRMED - several sources: PRIMA, FAN]

**UN Headquarters (Xbox/PC) final bomb.** The defusal mechanic is not in the UN HQ text; the HUD has a generic "Defuse" interaction. A Czech viewer of a let's play ending the mission (GhostLetsPlays part 4) says "the little wires" made him tear his hair out, which suggests the two-person wire cut is reused. Hidden 20-minute countdown (warnings at 20, 10, 5 minutes and 60 seconds). [Defusal method INFERRED / UNCERTAIN: one comment; timer CONFIRMED - several sources: game text + FAN RU; UNKNOWN - see 06-open-questions.md, R-20]

**Failures and reception.** Players report that both clicked the first wire together and it exploded (likely the wrong wire or a pulse change); English, Spanish and Portuguese players ask which key cuts the wire. "The bomb is the single most-asked 'how do we do this' moment" in comments; the Train Station bomb is the tensest moment; failing the missile disarm "and everyone flying" is a favourite funny failure. Reviewers highlight synchronized wire cutting (NWR, Elder-Geek). A bomb-disarm guessing video: https://www.youtube.com/watch?v=akFHEo91RA0. [CONFIRMED - several sources: 6+ comments across NrooRPC9cog, xjynpfObTLs, LY9-0Dk-YHk, ge7dEnjp6MU; Reddit; NWR, EG]

**Design reading [ANALYSIS].** "A device built for two": laser-linked twin bombs make a single trap that only two people can solve; the tripwire divides the pair spatially and the simultaneous cut joins them in time. Hidden information only one player can see (thermal shows the live wire) plus a wire that changes over time are amplifiers. The defusal needs explicit input prompts and a visible indication of which wire is live and how much time is left.

### 6.4 Paired switches
| Build | Place | Detail | Confidence |
|---|---|---|---|
| PS2/GC | Seoul: Cyber-Cafe | Both agents press switches on either side of a door at the same time to open it. Required. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Silo | Synchronised switches on both sides of the exit door. Required. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Storage Room | Synchronised switches on both sides of the elevator door; enter when a small floor laser grid turns off; ride up. | [ONE SOURCE: PRIMA] |
| PS2/GC | Train Station: The Station | Elevator: both press switches on either side at the same time to open the doors; Agent 2 jumps to the cable in the shaft and slides down to the car roof; Agent 1 follows; drop through the roof trapdoor; synchronized switches **again** to open the inner doors. | [ONE SOURCE: PRIMA] |
| N-Gage/DS | Breakdown | Press two switches **at the same time** to restore power (all area cameras then shut off); a second radio line repeats this, apparently as a hint after a failed attempt. | [CONFIRMED - several sources: N-Gage text + FW] |
- On PS2/GC Chemical Bunker every sub-level ends on a "both press now" beat (switches, scanners, warhead hack). [ONE SOURCE: PRIMA; reading ANALYSIS]

### 6.5 Paired code lock (PS2/GC Chemical Bunker: Storage Room)
- Simultaneous warhead hack: each agent deciphers a code; **whoever finishes first must wait** so both lock in at the exact same time. Required. Fandom lists Computers 9-10 "Access Warhead" for PS2. This is the PS2 equivalent of the Xbox wire cut. [ONE SOURCE: PRIMA; two-terminal hack CONFIRMED - several sources: PRIMA + FAN]

### 6.6 Two-station mixing (Chemical Bunker cryotank)
**Xbox/PC.**
- Use the OCPs to pass a surveillance camera near an elevator; enter the Cryotank; one agent at **Station A**, the other at **Station B** (chambers labelled A / B above the doors). [CONFIRMED - several sources: PRIMA, NEO]
- Review the protocol in Notes and mix: PRIMA says it must be done **quickly** and the agents **take turns** adding each ingredient. Game text: mixing requires two people **at the same time**, each following a **per-user colour sequence** (colours: **blue, red, violet, green, yellow, aqua**). [CONFIRMED - several sources: PRIMA, game text XB477 + PC105]
- Email "Mixing the protocol": ingredients must be mixed **simultaneously in protocol order, and two people are required**; it is dangerous. [ONE SOURCE: FAN data; danger confirmed by NEO gas / death posts]
- Randomisation: each agent's colour sequence is randomised; sequence length **3, 4 or 5 inputs on Normal, Hard and Expert**; the required blood serum type (A, B or O) is randomised per playthrough (three alternative protocol notes). [CONFIRMED - several sources: FAN table, NEO (randomness), game text (serum)]
- **Failure:** wrong inputs release **gas from the ceiling** that badly hurts or kills. [CONFIRMED - several sources: PRIMA, NEO (several threads), FAN, Steam, JV]
- **Exploit:** one agent can run between both stations and do the whole sequence. [ONE SOURCE: RUW]
- **PC failure:** cannot confirm inputs (section 6.0). [CONFIRMED - several sources: 2 Steam threads + AT]

**PS2/GC (Cryogenic Chamber sub-level).**
- Each agent enters an opposite side of the chamber; both hack their control pads; mix following the notes to a **fixed, published sequence: A2, B3, B1, A1, B2, A3**. Required (two control pads). RUW: the anti-virus is made by hacking two computers (simpler than Xbox). [CONFIRMED - several sources: PRIMA + FAN (same sequence); RUW ONE SOURCE]

**Reception.** The most-discussed co-op puzzle of the mission; lockstep teamwork and lethal stakes; splits opinion between wow and frustration; quoted with affection as one of the bunker's three "mini-games" (chemical mixing, crane with a spotter, missile disarm); on PS2 the Chemical Bunker "took months" for some pairs. [CONFIRMED - several sources: Steam, NEO, JV, Reddit]

**Design reading [ANALYSIS].** Anti-pattern A5 "Lethal precision sync puzzle with trial-and-error deaths": prevention = forgiving timing, clear feedback per input, non-lethal failure. Two emails explain the two-person mixing and the simultaneous wire cut before players reach them: diegetic tutorials for sync puzzles.

### 6.7 Crane (operator and spotter), Xbox/PC Chemical Bunker
- XBM "Crane Gameplay": one agent operates a crane while the other gives directions via a **"Crane Communication"** interaction picked at the top of the HUD. Click and hold the left stick **up / down / left / right = "Back" / "Forward" / "Left" / "Right"**; with the **left trigger = "Lower"**; with the **right trigger = "Raise"**; release = **"Stop"**. [ONE SOURCE: XBM p. 27] The PC manual also describes partner voice commands for the crane. [ONE SOURCE: PCDVD manual]
- Route: the Mechanic Room computer's emails explain how to operate the crane, give warhead code 1961, and (third email) how to disable the safety; "Crane is back!" email: a repaired crane will be used for final loading of armed missiles once its operator returns. One agent operates the crane from the north **Control Room** while the other stands by the **missile holder across the room** and talks him into placing a missile on the holder. Then the simultaneous wire cut. [ONE SOURCE: PRIMA; crane email CONFIRMED - several sources: FAN + PRIMA]
- PS2/GC: the crane is replaced by a **control panel that lowers the missile** (Agent 2 jams the walkway turret, runs through the west door to the panel, then jams the turret again so Agent 1 can cross). [ONE SOURCE: PRIMA; crane absence ONE SOURCE]
- Reception: "Communication itself is the mechanic"; quoted with affection on Reddit (1ouonhz). [ONE SOURCE]
- **Design reading [ANALYSIS].** Pattern P8 "Operator and spotter (asymmetric information)": one player controls a machine but cannot see the target, the other sees the target but cannot control the machine; voice (or pings) is the only link; "the purest asymmetric-information beat in the campaign".

### 6.8 Other two-person relays (one opens the way for the other)
| Build | Place | Detail | Confidence |
|---|---|---|---|
| Xbox/PC | Training, first wall | Boosted agent opens the door locked from the far side. | [ONE SOURCE: FAN] |
| Xbox/PC | Chemical Bunker silo B | The rappeller's panel has raised a platform in the other silo; one agent rides while the other operates the lowering control and **jumps on at the last moment** ("operate-and-jump"); ride down to the doorway. | [CONFIRMED - several sources: PRIMA, NEO] |
| Xbox/PC | Chemical Bunker main-lab control room | One agent hacks the keypad of the Main Lab Control Room (or uses code 8416 from interrogation), knocks out a guard sleeping in a chair and presses a red wall switch to open the Main Lab for his partner waiting at the Main Lab door. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Chemical Bunker tank throw | Thrown agent opens a one-way door. | [CONFIRMED - several sources: PRIMA, NEO] |
| Xbox/PC | Train Station ticket booth | Boosted agent drops through the trapdoor onto the guard and opens the door. | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: East Wing duct | Air duct with gates: Agent 1 waits at a control box while Agent 2 crawls the duct; Agent 1 opens the gate at the end; then Agent 2 waits at the far control box and opens it for Agent 1. A relay of alternating gate control, required on this route. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Silo | Mobile ceiling sensor: Agent 1 holds it with the OCP while Agent 2 runs to the end door, breaks its (3-pin) lock and uses a computer inside to deactivate the sensor so Agent 1 can cross. | [lock CONFIRMED - several sources: PRIMA + FAN; device type INFERRED / UNCERTAIN (RUW calls it a "turret")] |
| N-Gage/DS | Breakdown, Prison Rescue, Escape | Assault-only panels drop lasers for **15 seconds** (or turn lights off for 15 s); the Assault opens the window and both must cross in it. | [Lasers CONFIRMED - several sources; 15 s ONE SOURCE: FW] |
- Pattern P9 "Leapfrog relay" [ANALYSIS]: duct gates, throw-and-rope, turret leapfrog; gives rhythm and equal agency.

---

## 7. Jammer alternation (the co-op OCP, "camera jammer")

### 7.1 The device
- **Identity.** The "jammer" named in Training is the SC Pistol's **OCP** (Optically Channeled Potentiator) in co-op form. Manuals list it as the **"Cooperative-Only Gadget"**; PS2M says "OCP, or Jammer"; FW says it works like Pandora Tomorrow's Camera Jammer. [CONFIRMED - several sources: XBM pp. 25-26, PS2M, PRIMA, FW OCP page, IGNW training]
- **Use.** Select the pistol, aim at an electronic object (light, camera, laser emitter / breaker box, turret or its control, mobile sensor) and **HOLD the secondary trigger**. The effect lasts only **while held** and while **charge** remains; **moving cancels it**. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW] (On the Xbox co-op diagram the left trigger is "fire secondary". [ONE SOURCE: XBM p. 20])
- **Indicator.** A light on the gun is **red**, and turns **green** on a jammable target (a visual, not an audio cue). [CONFIRMED - several sources: XBM p. 25, PRIMA]
- **Charge.** Drains while held and **refills automatically**. **Tapping the trigger rapidly stretches the charge.** [CONFIRMED - several sources: PRIMA, MAN-PS2] PS2/GC Hydro Tunnel route: "tapping to save charge". [CONFIRMED - several sources: PRIMA, Ziggity]
- **Noise.** Using the OCP is silent, but some disabled devices crackle, which can itself lure guards. [ONE SOURCE: PRIMA]
- **Duration numbers.** No charge length is documented. A JV poster (platform not stated) describes neutralising a flying machine-gun drone in a "sort of museum" for **about 20 seconds** (presumably with the OCP) while the partner moved to the door, then swapping roles for a camera. [ONE SOURCE: JV; INFERRED / UNCERTAIN] PS2/GC Seoul Streets uses the drain as a soft timer: the partner must knock out a patrol "before the OCP charge runs out". [ONE SOURCE: PRIMA]
- **Held, not fire-and-forget.** One player keeps aiming and holding the trigger while the other moves. [ONE SOURCE: Reddit 1qfdvur; matches the manual rules]
- **PS2 loadout tables** list no jammer (the tables may only list weapons and consumables). [ONE SOURCE: FAN; INFERRED / UNCERTAIN]
- **Also usable** while hanging in a Hangover, while on a Dual Rappel and while on a partner's shoulders (pistol). [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Signposting.** OPSAT notes: Panama "Disable the laser using the jammer"; Seoul "turrets can be disabled with the Jammer"; an in-level Panama email jokes that the grid's emergency breaker sits inside the grid, so only a "microwave ray" / remote device could reach it. [CONFIRMED - several sources: FW, RUW, game text, PRIMA]

### 7.2 Patterns built on it
- **Jam-and-pass, then swap (hold-and-pass gate).** One agent holds the jammer on a camera, laser emitter or turret while the other crosses; then they swap. It appears in every mission. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW]
- **Turret flank.** One agent jams an automated turret (aim at the turret or its computer; EMF vision helps find it) while the partner runs behind it and switches it off at its control panel; IGNW warns the jammer must not lapse while the partner crosses. [CONFIRMED - several sources: PRIMA Seoul / Train Station routes, IGNW Seoul, FW/RUW Seoul note]
- **Turret leapfrog (PS2/GC).** Turrets that cannot be shut off, only suppressed: each agent jams for the other in turn. [CONFIRMED - several sources: PRIMA + RUW (2 turrets in Gardens)]
- **Light kill.** One agent jams an overhead light so the partner can drop or pass unseen. [ONE SOURCE: PRIMA]
- **Escort.** Jam a camera while escorting a captive to a scanner (PS2/GC Panama). [ONE SOURCE: PRIMA]
- **Jam-and-hack.** One jams a camera while the other hacks a computer (PS2/GC Hydro Tunnel). [CONFIRMED - several sources: PRIMA, Ziggity]

### 7.3 Every documented use

| Build | Mission / place | Use | Confidence |
|---|---|---|---|
| Xbox/PC | Training, station 2 | Camera covering a passage: one agent stands still holding the jammer on the camera while the other crosses; the crossed agent then jams so the first can follow. Objective: "Use the co-op jammer to get past a camera" ("synchronise: one jams while the other moves"). | [ONE SOURCE: FAN; jammer rules CONFIRMED - several sources: MAN, PRIMA] |
| Xbox/PC | Panama, "Broken Elevator" corridor | A camera near a broken elevator: one agent OCPs the overhead light while the other slips past the camera, then they swap roles. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Panama, Exposition Room (ground floor) laser grid | One agent aims the pistol OCP at a glowing **red box** (the grid breaker, which sits *inside* the grid) to suppress the grid; the other crosses; then they swap. Done **twice** (out to the server and back). | [CONFIRMED - several sources: PRIMA, FAN] |
| Xbox/PC | Seoul, hotel turret hall | One agent holds the OCP on the automatic machine-gun turret while the other runs to the control panel behind it and switches it off (OCP drains while held). | [CONFIRMED - several sources: PRIMA, RYB, FAN note] |
| Xbox/PC | Seoul, fish market boat | Boat with an automatic turret below: jammer + panel again, then sabotage the boat (opportunity). | [ONE SOURCE: RYB] |
| Xbox/PC | Chemical Bunker, cryo approach | Use OCPs to pass a surveillance camera near an elevator. | [CONFIRMED - several sources: PRIMA, NEO] |
| Xbox/PC | Train Station, repair yard | Track-mounted automatic machine-gun turret: one agent holds it off with the OCP while the other runs behind it and switches it off ("a solo player cannot both jam and walk around it"). | [ONE SOURCE: PRIMA; inference INFERRED / UNCERTAIN] |
| Xbox/PC | Train Station, tunnel end | One agent uses OCP on a small room's light while the other opens the door into the Machine Room and immediately shoots its overhead light. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Nuclear Plant, turbine stairs | A camera covers the stairs; likely jam-and-pass. | [Camera ONE SOURCE: FAN note; jam INFERRED / UNCERTAIN] |
| PS2/GC | Seoul: Streets | Agent 2 enters the ground floor and holds his OCP on the ceiling light; Agent 1 drops through a hole in the 2nd floor into the darkened ground floor, avoiding the front arc of an automatic turret, and knocks out the hall patrol before the OCP charge runs out (timed handoff; OCP drain = soft timer). | [ONE SOURCE: PRIMA] |
| PS2/GC | Seoul: Gardens | Turret leapfrog: Agent 1 OCPs the first turret while Agent 2 runs south into a dark alley; Agent 2 then OCPs it so Agent 1 can follow; at a second turret by the AA vehicle, Agent 2 OCPs while Agent 1 runs into shadows behind the vehicle, then Agent 1 OCPs while Agent 2 crosses. Turrets cannot be deactivated. | [CONFIRMED - several sources: PRIMA + RUW for 2 turrets; leapfrog ONE SOURCE: PRIMA] |
| PS2/GC | Seoul: Fish Market | Agent 2 OCPs the turret by the exit door while Agent 1 breaks the lock on that door (4-pin cafe entrance lock). | [lock CONFIRMED - several sources: PRIMA + FAN] |
| PS2/GC | Seoul: Cyber-Cafe | Turret leapfrog again: Agent 1 OCPs a turret, Agent 2 sprints south across the room, then returns the favour. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Silo | Mobile ceiling sensor held while partner breaks lock and disables it (section 6.8). | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Laboratories | OCP leapfrog past a mobile ceiling sensor in the insertion hall, a second sensor leapfrog inside, camera leapfrogs to the fridge computer (code 1423), the walkway and the main lab. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Cryogenic Chamber | Camera leapfrog to the elevator. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Storage Room | Agent 2 OCPs the walkway turret, runs to the control panel that lowers the missile, then OCPs the turret again so Agent 1 can cross. | [turret CONFIRMED - several sources: PRIMA + RUW stats] |
| PS2/GC | Chemical Bunker: The Docks | Agent 1 rolls under lasers (hold crouch while running), optionally OCPs the lower laser so Agent 2 can creep through. | [ONE SOURCE: PRIMA] |
| PS2/GC | Train Station: Hydro Tunnel | Agent 2 drops over a railing next to a surveillance camera; Agent 1 jams it with EMF vision + OCP (tapping the trigger to save charge) while Agent 2 hacks the laptop (opportunity); Ziggity says the camera guarding the laptop makes this the hardest part. | [CONFIRMED - several sources: PRIMA, Ziggity] |
| PS2/GC | Train Station: Subway | Turret on the stair half-landing: Agent 1 OCP-jams it while Agent 2 runs past; at the top, Agent 2 jams it so Agent 1 can follow (an alternating "cover me" exchange). | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: Alley | Agent 1 holds his OCP on the camera in the next room (#7); Agent 2 crosses while it is down and opens door #8 with code 5993. | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: East Wing | Boosted Agent 2 uses EMF vision plus the OCP to disable one of the two wall cameras above the stairs so Agent 1 can run up. | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: Archives | Agent 1 uses EMF plus the OCP to kill the north-wall camera (RUW: one OCP / pistol hit disables it; if it spots you, ceiling turrets activate) while Agent 2 hacks the central computer. | [ONE SOURCE: PRIMA; RUW ONE SOURCE] |
| PS2/GC | Panama: Server Room | (1) Camera corner: Agent 1 OCPs the east-wall camera, Agent 2 rounds the corner, then Agent 2 returns the favour. (2) Agent 2 OCPs the camera near the top of the stairs while Agent 1 walks his captive to the scanner; Agent 2 inches past the camera with his back to the wall. | [ONE SOURCE: PRIMA] |

- **Frequency.** OCP / jammer alternation ("one jams, the other moves, then swap") appears in every mission; on PS2/GC it is everywhere. [ONE SOURCE: PRIMA for routes; concept CONFIRMED - several sources: XBM, PS2M, FW OCP page]
- **Tutorial coverage.** Xbox/PC Training station 2 (above); hexen2k7 drill "beat a camera with the jammer". PS2/GC Team Training: whether a jammer station exists is unknown. [CONFIRMED - several sources: FW, hexen2k7; UNKNOWN - see 06-open-questions.md, R-05]
- **Reception.** "Jam a camera while your partner runs" (NWR, GameSpot first look); the camera-jam run is among the moves reviewers celebrate. [CONFIRMED - several sources: NWR, GameSpot snippet]
- **Design reading [ANALYSIS].** Because the jammer holds a device off only while someone stands still holding it, one player physically cannot get both of them past a camera alone; every camera or laser gate becomes a two-person gate. It is the cheapest way to force cooperation without scripting, and it creates small, frequent co-op beats between big set pieces (target in the pacing analysis: a small co-op beat such as hold-and-pass or boost every 2-4 minutes). Translation-guide name "Hold-Down Device".

---

## 8. Simultaneous takedowns and co-op ambushes

### 8.1 No dedicated move
- There is **no dedicated dual-takedown move**. Simultaneous knockouts are done with ordinary attacks, grabs and gadgets by both players at once; PRIMA repeatedly scripts them. [ONE SOURCE: PRIMA]
- **Why:** both players knock out two guards at the same moment so neither can raise the alarm. [ONE SOURCE: PRIMA]
- **Difficulty:** if one agent acts (fires) early, the other guard reacts. [ONE SOURCE: Reddit 1df5iet]
- **Knockout tools as alarm control:** gas cameras, shockers and airfoil rounds let a pair neutralise two guards at once, supporting the simultaneous-takedown tactic. [ONE SOURCE: PRIMA]
- **Tomoe Nage and Hangover neck snap** are the two moves that are themselves takedowns (sections 3.3, 4.2). [CONFIRMED - several sources: XBM, PS2M, PRIMA]

### 8.2 Documented simultaneous takedowns

| Build | Place | Detail | Confidence |
|---|---|---|---|
| Xbox/PC | Seoul, fish market walkways | Two guards on a platform can be taken simultaneously. | [ONE SOURCE: RYB] |
| PS2/GC | Seoul: Fish Market | Both take out the two patrols together from shadow (sync takedown). | [ONE SOURCE: PRIMA] |
| PS2/GC | Seoul: Cyber-Cafe | Both agents fire sticky cameras at the south wall near the dartboard, make noise to lure the two guards, and gas them. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Storage Room | Agent 2 drops over a railing and hangs from the edge of a walkway; Agent 1 fires a sticky camera at the feet of the lower patrol; synchronised takedown = gas release + **ledge-grab pull-over** at the same moment. | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: The Docks | Agent 2 sticky-cams the far south wall under a guard on an elevated walkway; Agent 1 creeps along the shadowed side of the ship; synchronised takedown (gas + blow to the head). | [ONE SOURCE: PRIMA] |
| PS2/GC | Chemical Bunker: Silo | Flash grenade at the feet of two guards near insertion, rush and knock them out. | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: Server Room | (1) Open the next doors stealthily (seated guards inside); creep up and knock both out simultaneously. (2) Server room: Agent 1 hides under the stairs (#6), Agent 2 at the base (#7); two guards patrol in a circuit; when they pass, Agent 1 grabs the rear guard while Agent 2 simultaneously knocks out the leader. | [ONE SOURCE: PRIMA] |
| PS2/GC | Train Station: Hydro Tunnel | Spotter + actor: Agent 1 sticks a camera to a wall and spots; Agent 2 sneaks in and knocks out the walkway guard and the floor guard. | [CONFIRMED - several sources: PRIMA, Ziggity] |

### 8.3 Co-op ambushes (lure one, drop the other)

| Build | Place | Detail | Confidence |
|---|---|---|---|
| Xbox/PC | Train Station bomb pair 1 | Light lure + partner thrown onto the guard (Tomoe Nage attack). | [ONE SOURCE: PRIMA] |
| Xbox/PC | Train Station ticket booth | Boost onto the roof, drop through the trapdoor onto the guard inside. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Seoul stairwell | One agent shoots the light near the stairs; the other jumps to the railing above and does a **ledge-grab takedown** (pulls the guard over from a hang). | [ONE SOURCE: PRIMA; RYB just says shoot the stair light and deal with the guard] |
| Xbox/PC | Chemical Bunker operating theatre | One agent shoots the X-ray light board to black out the room while the other drops to knock out a technician and a guard; the ledge agent then drops through a trapdoor into the camera room for the autopsy tape. | [CONFIRMED - several sources: PRIMA, FAN] |
| Xbox/PC | Chemical Bunker hall | Shoot a light to lure a guard from beyond the lasers; knock him out. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Panama archive | Lights off; one agent searches the cabinet while the other knocks out the guard who comes to fix the light. | [ONE SOURCE: PRIMA] |
| Xbox/PC | Panama 3F hall | Switch off the hall lights; the guard who comes out to fix them is grabbed (light-switch lure). | [ONE SOURCE: PRIMA] |
| PS2/GC | Seoul: Cyber-Cafe | Agent 1 hits a light switch to pull the patrolling guard's attention; Agent 2 creeps up behind Jong, grabs and interrogates him (decoy + grab). | [ONE SOURCE: PRIMA] |
| PS2/GC | Train Station: The Station | Agent 2, boosted onto a ledge, hides on an upper walkway with his back to a brick pillar; after **about a minute** Chu (in a suit) and his bodyguard stop near him, talk and walk on; **he must not move** until they pass; then he grabs Chu from behind. | [ONE SOURCE: PRIMA] |
| PS2/GC | Panama: Archives | Agent 1 sticks a camera near the far door and kills the wall camera; Agent 2 hacks; the first gasses the guard who enters. | [ONE SOURCE: PRIMA] |

- **Light-and-drop** (one shoots out a light; the other drops on the guard who comes to investigate) and **interrogate under cover** are tactics the guides script repeatedly. [ONE SOURCE: PRIMA]
- **Reception.** Coordinated double takedowns ("co-op ambushes") are among the most-praised synchronized moments: TeamXbox ("coordinated multi-kills hook you"); Globe and Mail (the mode is easier than single-player because two spies can attack guard pairs at once); GameRevolution ("expected a 'nifty little co-op feature' and got hooked on co-op ambushes"); Steam; Reddit (players love dropping on or shooting two guards at the exact same moment). NWR: unscripted coordination (one distracts, one flanks) teaches communication. [CONFIRMED - several sources]
- **Design reading [ANALYSIS].** Pattern P14 "Lure and ambush"; translation-guide name for the simultaneous takedown: "Double Drop" (paired guards on mutual watch).

---

## 9. Joint interrogation and interrogation role splits

- **Joint interrogation.** Some intel comes from **both agents interrogating the same person together**: Train Station key code **0315** (Chu's son's birth date) is given when both agents interrogate Chu together; the Seoul body double can be (dual-)interrogated by both agents together. [CONFIRMED - several sources: game text XB477 + PC105 for Train Station; Seoul ONE SOURCE: game text]
- **Train Station code conflict resolved.** 9201 is the **locker number** (told to Chu on the phone by an unnamed caller; PRIMA names locker 9201); 0315 is the **key code**. Both earlier sources were right (R-17 partly closed). [CONFIRMED - several sources: game text]
- **Interrogation role split (protect-while-act).** One agent grabs and interrogates while the other neutralises escorts or watches the door:
  - Xbox/PC Seoul back alley: one agent knocks out the two escorts while the other grabs the officer from behind and interrogates him; PRIMA says this completes both "Find out where Jong is" and the opportunity "Interrogate the North Korean officer"; RYB calls it optional (you may just take him out) and suggests thrown bottles as a distraction. [Officer + 2 guards CONFIRMED - several sources: PRIMA, RYB; dual completion ONE SOURCE: PRIMA]
  - Xbox/PC Train Station locker room: one agent knocks out Chu's bodyguard while the other grabs Chu from behind and interrogates him for 0315; one agent opens the locker and injects himself with the antidote. [ONE SOURCE: PRIMA; code CONFIRMED - several sources]
  - PS2/GC Panama Archives: Agent 2 grabs de Medeiros and interrogates him (secondary objective; elevator code 3298) while Agent 1 optic-cables the next door and knocks out the guard. [CONFIRMED - several sources: PRIMA, FAN]
  - PS2/GC Seoul Streets: Agent 2 stays at street level in shadow, grabs the patrolling guard and interrogates him for door code **8251** while Agent 1 goes high and takes the zip line. [code CONFIRMED - several sources: PRIMA, FAN]
  - PS2/GC Train Station The Station: Agent 2 grabs Chu from behind, interrogates him **twice** (code 0315), knocks him out and drops down; SHOCK-25 interrogates "Kim Chu" at 28:10. [CONFIRMED - several sources: PRIMA, FAN]
- **Other interrogations by mission.** Xbox/PC Panama: interrogating the VP gives codes 3245 (VP office to gallery), 3298 (VP private elevator) and 9728 (VP's archive computer; used nowhere per RUW). Xbox/PC Seoul interrogatable characters (RUW): Jong's double, the officer near the hotel, a soldier near an AA vehicle, and Jong himself (interrogate Jong first for points, never kill him). Xbox/PC Chemical Bunker: mini-lab code 5791 and main-lab security port 8416 from interrogation; a soldier at the computer in the camera-control room and the scientist in the monkey lab can be interrogated. Nuclear Plant: nobody can be interrogated. UN HQ: Colonel Kim cannot be grabbed from behind or interrogated (script pattern `InterogateKim` has an empty speech line). [CONFIRMED - several sources: game text, FAN, PRIMA, Steam code list; individual items as tagged in the mission files]
- **Crossover interrogation (Seoul).** In the solo Seoul mission the solo hero interrogates one of two North Korean special forces soldiers near a truck for the trainees; over a radio patch a trainee asks where Jong was taken and the soldier says a cyber cafe off the fish market by the river. Co-op players hear it as radio dialogue (one walkthrough places it right after the second AA vehicle); the agents do not see him. Whether it replaces the agents' own officer interrogation is unconfirmed. [CONFIRMED - several sources: FW Seoul transcript, FW trivia, GameGrin; timing ONE SOURCE: RYB; replacement INFERRED / UNCERTAIN]
- **Noise.** Grabs and interrogations make no game noise (silent to the AI). [ONE SOURCE: PRIMA]
- **Design reading [ANALYSIS].** Pattern P11 "Protect-while-act": a predictable interrupter is scripted to arrive during a slow action so the non-acting player has a real job.

---

## 10. Carrying bodies and NPCs

- **No two-person carry move is documented.** Every carry in the sources is done by one agent while the partner opens doors, jams cameras or clears the route. [Absence: not found in any source]
- **Xbox/PC Seoul extraction:** carry Jong down the stairs and out (PRIMA: one carries, the other opens doors), to the truck outside the cyber cafe = mission complete. A designer comment: dropping Jong near the truck = mission success. [CONFIRMED - several sources: PRIMA, RYB; designer comment from game files]
- **Xbox/PC Panama:** Agent A grabs the light-fixing guard and carries him to the retinal-scanner room at the end of the hall (captive for the scan). [ONE SOURCE: PRIMA]
- **PS2/GC Panama Server Room finale:** Agent 1 carries / walks his captive up the stairs while Agent 2 OCPs the camera; Agent 1 forces the guard to use the scanner. [ONE SOURCE: PRIMA]
- **N-Gage/DS Escape:** the colonel is badly wounded and must be carried out; who carries, the carry speed and the fail rules are unknown. [CONFIRMED - several sources for the carry; details UNKNOWN - see 06-open-questions.md, R-23]
- **Design reading [ANALYSIS].** Pattern P12 "Escort extraction": the carrier is slow and cannot fight; the partner opens doors and clears the route.

---

## 11. Other actions used in co-op routes (solo moves, done in turn) and communication aids

- **Wall jumps with a partner:** no two-person wall jump is documented. On PS2/GC Chemical Bunker Storage Room, a hall has a cycling floor laser grid: run when it shuts off; a sound warns it is coming back, and **both agents do a split jump** (wall split) to stay above it. This is a solo move done by both at once. [ONE SOURCE: PRIMA]
- **Zip line (solo move, in turn):** Xbox/PC Seoul (each agent in turn into the temple courtyard; alternative: one slides down a pole while the other zips after shooting out a top-right light); PS2/GC Seoul Streets (Agent 1 into the decrepit building); PS2/GC Panama Alley (each in turn from the fire escape to the north-west balcony). [Seoul zip line CONFIRMED - several sources: PRIMA, RYB; pole ONE SOURCE: RYB; PS2 ONE SOURCE: PRIMA]
- **Ledge traverse / shimmy (solo, in turn):** Xbox/PC Panama balcony over the Exposition Room (each agent climbs over the railing, hangs, shimmies to the opposite balcony, climbs up, takes the elevator down); PS2/GC Panama East Wing beams over a laser floor guarded by a drone; PS2/GC Seoul Fish Market beam over water. [CONFIRMED - several sources: PRIMA, JV for Panama balcony; others ONE SOURCE: PRIMA]
- **Hand-over-hand pipes:** Xbox/PC Chemical Bunker laser corridor; Xbox/PC Train Station sewer. [ONE SOURCE: PRIMA]
- **Elevator cable slide:** PS2/GC Train Station The Station (Agent 2 jumps to the cable, slides to the car roof, Agent 1 follows). Flagpole slide: PS2/GC Panama Archives. Roll under lasers: PS2/GC Docks. [ONE SOURCE: PRIMA]
- **Back-to-back climbing:** see section 12.
- **Voice baiting (Xbox Live).** The headset microphone is heard by guards within a radius: options can disable voice detection and set its **sensitivity (default 50 = about 2 m in game** for a normal speaking voice); players can lure or distract guards by talking, or give themselves away; options also include voice through TV speakers, voice masking and Quick Match restricted to headset users. GF (GamesFirst preview): whistling into the headset can attract a guard without a button press. Players remember the mic feeding the in-game sound meter (most-praised systemic detail). The PC manual says the sensitivity setting does not change partner voice volume; partner-to-partner distance falloff is never mentioned. [CONFIRMED - several sources: XBM pp. 22, 26, PRIMA, GF, TeamXbox, Reddit mngqa0 (2 commenters), vpwdry, 1e9pwjx; whistle ONE SOURCE: GF; falloff UNKNOWN - see 06-open-questions.md, R-22]
- **No whistle in co-op:** the whistle button becomes the Co-op Action button, so the headset voice is the only "whistle". [CONFIRMED - several sources: PRIMA, XBM controller diagram, FW controls page]
- **Automatic voice lines (no headset).** Initiate / complete lines; "needs help" when health empties; Hangover "Up / Down / Stop"; Dual Rappel "Left / Right / Stop"; crane "Back / Forward / Left / Right / Lower / Raise / Stop". [CONFIRMED - several sources: XBM p. 26-27, PRIMA; crane ONE SOURCE: XBM p. 27]
- **Wordless coordination.** One player finished the hardest difficulty with a stranger without mics, by miming; another played with Korean players using jumps and visual cues; another found coordinating moves with a stranger who spoke another language both infuriating and the most satisfying thing he did online. [CONFIRMED - several sources: 3 independent YouTube comments]
- **Pings / gestures / world markers:** none documented. [UNKNOWN - see 06-open-questions.md, R-11]

---

## 12. Moves sometimes attributed to the mode (status)

| Name | Status | Confidence |
|---|---|---|
| Short Scale (boost over wall) | Shipped. Official manual name "Short Scale/Boost". | [CONFIRMED - several sources] |
| Tomoe Nage | Shipped. "Tomoe Nage/Long Jump". | [CONFIRMED - several sources] |
| Hangover | Shipped. Manuals: "Hang Over Teammate"; Prima / training: "Hangover". | [CONFIRMED - several sources] |
| Dual Rappelling / rope assist | Shipped, contextual. "Co-op Dual Rappelling". | [CONFIRMED - several sources] |
| Human ladder | Shipped, generic. | [CONFIRMED - several sources] |
| Back-to-back (split) climbing | **Not a shipped move.** It appears only in lore text on the FW Agent Two page ("human ladder, back to back climbing"); neither manual nor Prima mentions it; a RUW search for related terms found nothing for CT. Likely lore / marketing wording, or a cut / preview-only move. Note: reception sources list "back-to-back climbing" (Pocket-lint, Eurogamer, Steam) and Reddit players remember "back-climbs" fondly; these may describe the Human Ladder (climbing the partner's back). | [INFERRED / UNCERTAIN] |
| Climbing on partner's shoulders | Shipped as contextual "Stand on Teammate's Shoulders". | [CONFIRMED - several sources] |
| Sharing equipment | Shipped (XBM, PS2M, PRIMA, game files). FW marks a training text about it as deleted data; that was only the training note (R-04 closed). | [CONFIRMED - several sources] |
| Simultaneous retinal scan | Shipped; synchronized action; hacked in Training, often done with two captives in missions. | [CONFIRMED - several sources] |
| Simultaneous bomb wire cut | Shipped; Chemical Bunker missile + Train Station bombs. | [CONFIRMED - several sources: PRIMA, FW Train Station] |
| Partner revive | Shipped ("Heal Teammate" / "Revive"). | [CONFIRMED - several sources] |
| Boost to window | Is just Boost (+ Human Ladder) used at windows (Panama photocopy room, Seoul cafe). | [ONE SOURCE: PRIMA] |
| "Swing" | No co-op move of this name found in the manuals or Prima. | [not found] |
| "Trampoline" | No co-op move of this name found. | [not found] |
| "Sacrifice" | Not found as a move name. Tomoe Nage is technically a judo "sacrifice throw", a possible origin of the term. | [INFERRED / UNCERTAIN] |
| Dual takedown | No dedicated move; Prima repeatedly scripts "simultaneous" knockouts done with ordinary takedowns / gadgets by both players at once. | [ONE SOURCE: PRIMA] |
| Distracting / baiting | No dedicated button; done with Tomoe-Nage-onto-guard, shooting lights, sticky-cam noise and (online) talking through the headset, which guards can hear. | [CONFIRMED - several sources: XBM headset section, PRIMA] |
| Crane gameplay | Shipped: one drives the crane, the other directs (Chemical Bunker Xbox/PC). | [CONFIRMED - several sources: XBM, PRIMA] |
| Share View | Shipped: watch the partner's sticky-camera feed; not in split-screen. | [CONFIRMED - several sources] |
| Simultaneous switches / code lock | PS2/GC routes use paired switches at both sides of doors / elevators and a synchronized code lock-in. | [ONE SOURCE: PRIMA] |
| Wall jump with partner | Not documented as a two-person move; only both agents doing a solo split jump at once (PS2/GC Storage Room). | [ONE SOURCE: PRIMA] |

---

## 13. Versus (Spies vs Mercs) overlap

- **Xbox/PC Versus spies** have "Team Moves": **Boost** (only where a **Boost icon** shows, lower-left of the screen) and **Human Ladder** after it; plus "team abilities": **nursing** (heal each other via HUD interact), **sharing gadgets**, and **removing a merc's Spy Finder (tracking) tag** from a teammate. WP also says Versus added "cooperative moves for the spy team". [CONFIRMED - several sources: PRIMA versus chapter + WP; details ONE SOURCE: PRIMA]
- **Versus spy controls on Xbox:** **White** button = start / finish a co-op move; **A** = heal partner, give / accept gadget (contextual). [ONE SOURCE: XBM p. 31]
- PRIMA says these Team Moves are only in the Xbox/PC versions; this is consistent with the FW Multiplayer page (PS2 Versus is basically a Pandora Tomorrow clone) and with the PS2 manual's spy-abilities list, which has no co-op moves. The GameCube has no Versus. [CONFIRMED - several sources: PRIMA, FW, PS2M]
- No evidence that Tomoe Nage, Hangover, Dual Rappelling or Shoulders exist in Versus. [not found]
- Co-op tech carried into Versus: spies got co-op moves and could heal and share gear. [CONFIRMED - several sources: Ubisoft PR, GamesFirst, GameRevolution, TeamXbox]

---

## 14. N-Gage / DS (separate Gameloft campaign)

- **No acrobatic co-op moves.** None appear among the **37 interaction labels** in the N-Gage text table (open / bash door, lock pick, hack computer, hack panel, heal ally, grab, interrogate, optic cable, rappel, switch on / off, use keypad, pick-ups). None is a boost, ladder, throw or other two-man move; the only partner action is **"HEAL ALLY"** (within **30 s**, health pack = 50 HP). This is absence of evidence (a move could have no text label). [ONE SOURCE: N-Gage text table; conclusion INFERRED / UNCERTAIN]
- **One true sync task:** two switches pressed together (Breakdown); whether both players must operate them or one Hacker can do both is not stated (two "computers" logged about 30 s apart in a stealth run are probably the switches; since the Assault cannot hack, these are likely plain switches anyone can use). [Simultaneous press CONFIRMED - several sources: N-Gage text + FW; operation INFERRED / UNCERTAIN]
- **Hard class roles** instead of moves: Hacker (hack computers; cannot short-circuit panels; unlimited stun gun, 3 electronics-disabling grenades, 3 flashbangs, 1 health pack; no night or thermal vision) vs Assault (short-circuit electric panels; cannot hack; rifle 30, pistol 30, 3 frags, 3 sticky cams, 1 health pack; night and thermal vision). [Exclusive actions CONFIRMED - several sources: N-Gage text pop-ups + FW; kit and vision ONE SOURCE: FW]
- **Timed windows as soft sync:** Assault-only panels drop lasers (a corridor and a lobby in Breakdown) or turn lights off for **15 seconds**; Corruption alternates devices Panel (Assault) - Computer (Hacker) - Panel (Assault) - Computer (Hacker) - Computer (Hacker), the last starting a 6-minute extraction countdown. Escape: four automatic machine-gun turrets only switched off by hacking computers (Hacker-only). Chaff grenade disables all electronics in range for 20 seconds; in the solo training text a shocker hit disables a camera for 15 seconds. [Lasers CONFIRMED - several sources; 15 s, turrets, gadget timings ONE SOURCE: FW / N-Gage text]
- **Comparison table from the research** (N-Gage/DS vs console): asymmetry hard (class permissions) vs soft (identical agents; asymmetry from position and timing, one boosts, one is boosted); co-op moves none (only heal ally) vs many (boost, Tomoe Nage throw, human ladder, dual rappel, hang-over, shoulders, simultaneous actions); synchronised actions: two switches vs simultaneous retinal scans, simultaneous bomb-wire cuts and more; partner down: about 30 s to reach him and use a health pack vs about 30 s revive window with limited revives. [as tagged above]
- See 01-coop-levels.md for the parts.

---

## 15. Summary tables and use counts

### 15.1 Moves summary (all platforms)

| Move / interaction | Family | Initiate | Complete | Buttons (Xbox / PS2 / GC / PC) | Spot | Key numbers | Failure / limit | Taught in Xbox/PC Training |
|---|---|---|---|---|---|---|---|---|
| Boost / Short Scale | Free | Crouch + Co-op Action | Partner presses Co-op Action | Black / L2 / Z + D-pad Left / F or Page Down | Anywhere with room (striped squares in Training; Boost icon in Versus) | Usually 3-5 per Xbox/PC mission (with Ladder) | Head shake + vibration if no room | Yes (objective 2) |
| Human Ladder | Free | Hanging agent presses Co-op Action | Partner below presses Co-op Action, climbs | same | Any ledge / pipe | Paired with Boost | Boosted agent must press again after landing (PS2 comment) | Used on the IGNW route, not an objective |
| Tomoe Nage / Long Jump | Free | Stand, face away, Co-op Action, steer reticule | Partner presses Co-op Action | same | Anywhere with room | 0-2 per mission | Red reticule = impossible; lands on NPC = knockout | Yes (objective 4; 2-3 throws on the route) |
| Dual Rappelling | Contextual | "Initiate Rappelling" | "Complete Rappelling" | Interact (A / X / A / Space-Enter); holder L/R triggers (PS2 L1/R1); rappeller left stick | Placed rope anchors only | Xbox/PC 1 (Chem Bunker) + Training; PS2/GC 1 + 3 | Steer around wall alarm sensors (PS2/GC silo) | Yes (objective 7) |
| Hangover | Contextual | "Initiate Hangover" | "Complete Hangover" | Interact; holder triggers; inverse crouch Xbox LT / PS2 L1 | Placed spots (ceiling hatch, duct, booth top) | About 1 per mission | Players miss where to start it | Yes (objective 5) |
| Stand on Shoulders | Contextual | "Initiate Climb Shoulder" | "Complete Climb On" | Interact | Placed spots | Xbox/PC Seoul 2; PS2/GC Seoul 1, Panama 1 | - | No |
| Share View | Team | Partner uses sticky camera | "Accept View Sharing" | Interact | Any distance | - | Not in split-screen | No |
| Heal / Revive | Team | Agent drops at zero health | Partner "Heal Teammate" | A / X / - / Insert | Anywhere | ~30 s window; ~half health (50%); Xbox/PC 1 syringe each = 2 per team; PS2/GC 2 each per sub-level (FW) | Mission fails after ~30 s | Training pop-up only |
| Share Equipment | Team | Equip item, approach, "Share Equipment" | Partner accepts | Interact | Near partner | Dot-marked items only | Cancel before accept (PS2M) | Training pop-up only (training email unused) |
| Synchronized actions | Sync | Both select action at paired devices | Game syncs (relaxed online without headset) | Interact | Set pieces | Mixing 3 / 4 / 5 steps; Seoul 5-min (Xbox) / 4-min (PS2 Gardens) timers around shoulders; bomb second-wire timer | Laser touch = detonation; wrong mix = gas; failed hack = health / alarm | Yes (objective 6, retinal) |
| Jammer (OCP) alternation | Gadget tactic | Hold secondary trigger on device | Partner moves | Pistol secondary fire | Any electronic device | Charge drains / refills; tap to stretch; ~20 s drone (JV, uncertain) | Moving cancels; lapse = seen | Yes (objective 3) |

[Each cell carries the confidence given in sections 3-7.]

### 15.2 Mission-by-mission move matrix, Xbox/PC (guide routes)
Counts are the minimum used on one recommended route, not every possible use in the map. ✓ = used; number = count where known.

| Move / action | Training | Panama | Seoul | Chem. Bunker | Train Station | Nuclear Plant | UN HQ |
|---|---|---|---|---|---|---|---|
| Boost (+ Human Ladder) | ✓ | 2 | 4 | - | 4 | see 04 (not documented) | see 04 (not documented) |
| Tomoe Nage | 2 (05 matrix; IGNW route has 3) | (optional, IGNW) | - | 2 | 1 (attack) | 1 (turbine hall, forum) | see 04 (not documented) |
| Dual Rappelling | 1 | - | - | 1 | - | rope assist (forum) | rappel to window-washing platform (co-op nature unknown) |
| Hangover | 1 | 1 | - | 1 | 1 | see 04 | see 04 |
| Shoulders | - | - | 2 | - | - | see 04 | see 04 |
| Jammer alternation | ✓ | 2+ | ✓ (turret) | ✓ | ✓ (turret / light) | likely (turbine-stairs camera) | see 04 |
| Synchronized action | retinal | retinal (captives) | - | retinal, mixing, crane, wire cut | 3 bombs | scanner doors (method unknown) | bomb (method unknown) |

Confidence: [ONE SOURCE: PRIMA] for Panama, Seoul, Chemical Bunker and Train Station; [CONFIRMED - several sources: FW, IGNW] for Training; Nuclear Plant [ONE SOURCE: NEO forum excerpt]; UN HQ rappel [CONFIRMED - several sources: game text]. The two downloadable missions are not in the guide; see 01-coop-levels.md and `04_mission_breakdowns/nuclear_plant.md`, `04_mission_breakdowns/un_headquarters.md`. [UNKNOWN - see 06-open-questions.md, R-19, R-20]

### 15.3 Mission-by-mission move matrix, PS2/GameCube (guide routes)

| Move / action | Seoul | Chem. Bunker | Train Station | Panama |
|---|---|---|---|---|
| Boost (+ Ladder) | 1 | 1 | 3 | 3 |
| Tomoe Nage | 1 | - | 2 | 1 |
| Dual Rappelling | - | 1 | 3 | - |
| Hangover | - | 1 | - | 1 |
| Shoulders | 1 | - | - | 1 |
| Zip line (solo move) | 1 | - | - | 1 |
| Jammer alternation | ✓ (turret x3, light) | ✓ (sensors, cameras) | ✓ | ✓ |
| Paired switch / scanner / code | switch | switch, scanners, code, wire cut (as listed in 05; the PS2/GC build replaces the wire cut with the two-terminal code hack) | switches x2, wire cuts | scanners x2 |

Confidence: [ONE SOURCE: PRIMA]. The contents of PS2/GC Team Training are not documented in text. [UNKNOWN - see 06-open-questions.md, R-05]

Breakdown of the PS2/GC counts from the routes: Seoul = Boost + Ladder on the tall crate (Streets), zip line (Streets), shoulders (Gardens), Tomoe Nage across water (Fish Market), paired switches (Cyber-Cafe). Chemical Bunker = rappel (Silo), Hangover (Cryogenic Chamber), Boost + Ladder (Docks), switches (Silo exit, Storage elevator), twin scanners (Cryo), code lock (Storage). Train Station = rappel x3 (Repair Station shaft; Hydro x2 up), Tomoe Nage x2 (Hydro), Boost + Ladder x2 (Hydro walkway, Subway ticket booth) + Boost x1 (Station ledge), switches x2 (Station elevator outer and inner doors), wire cuts (4 pairs). Panama = zip line (Alley), shoulders (East Wing), Boost x1 (East Wing desk), Boost + Ladder x2 (East Wing ceiling, Archives), Tomoe Nage (Server Room), Hangover (Server Room fuse), scanners (East Wing exit dual hack; Server Room final captive). [ONE SOURCE: PRIMA]

### 15.4 Frequency summary (PRIMA routes, both builds)
- Boost (+/- Human Ladder) is by far the most common, used in every non-training mission (roughly 3-5 per mission). [ONE SOURCE: PRIMA]
- OCP / jammer alternation appears in every mission. [ONE SOURCE: PRIMA; concept CONFIRMED - several sources: XBM, PS2M, FW OCP page]
- Tomoe Nage: 0-2 per mission. Hangover: about 1 per mission (Panama, Chemical Bunker, Train Station on Xbox; Chemical Bunker, Panama on PS2/GC). Dual Rappelling: Chemical Bunker (both builds), Train Station (PS2/GC, 3x). Stand on Shoulders: Seoul AA vehicles (both builds) and PS2/GC Panama elevator. [ONE SOURCE: PRIMA]
- Synchronized actions in every main mission: dual retinal scanners (Panama, Chemical Bunker), simultaneous wire cuts (Chemical Bunker missile, Train Station bombs), simultaneous switches (PS2/GC only), simultaneous code lock (PS2/GC Chemical Bunker). [ONE SOURCE: PRIMA]
- Pattern frequency (analysis of the guide routes) [ANALYSIS]: P2 hold-and-pass in all missions; P4 boost-ladder in all but Chemical Bunker; P13 light lanes in all; P1 sync in every story mission on Xbox/PC except Seoul, and in every PS2/GC mission; P5 reach-in about one per mission; P3 throw-release 0-2 per mission; the set-piece patterns (P7 captive key, P8 operator-spotter, P6 single entrant, P12 escort) appear once each, in different missions.

### 15.5 Main co-op set pieces per Xbox/PC mission (from 09)

| Mission | Primaries (+ optional) | Expert ghost run | Typical stealth run | Casual run | Main co-op set pieces |
|---|---|---|---|---|---|
| Training | 8 lesson objectives | 3-4 min | - | 9-16 min | One per objective |
| Panama | 3 (+0) | ~8 min (speedrun) | 16-35 min | 41-52 min | Captive scan; Hangover; laser relay x2 |
| Seoul | 5 (+2) | ~13-20 min | 20-35 min | 34-60 min | Turret flank; shoulder demolition x2; escort |
| Chemical Bunker | 6 (+1) | ~10-27 min | 25-45 min | 45-80 min | Rappel; cryo mix; captive scan; Hangover; throw; crane; wire cut |
| Train Station | 6 (+2-3) | 11:41 | 13-35 min | 30-70 min | Wire cut x3; payphone Hangover; single-entrant room; train exit |
| Nuclear Plant | 2 (+1 secondary +1 opportunity) | 22:44 | ~30 min | 48-108 min | Turbine throw / rope (others undocumented) |
| UN HQ | 5 (+0) | 21:32 | ~34 min | 43-86 min | Undocumented |

[Lengths CONFIRMED - several sources: video lengths; objective counts CONFIRMED - several sources: FAN]

---

## 16. Tutorial coverage

### 16.1 Xbox/PC Training Facility (ordered)
Setting: Third Echelon Training Facility, Fort Meade, Maryland (FW; date 23 June 2007 from PS3 files); an outdoor obstacle course plus a central cinderblock / plywood / plasterboard structure with barbed wire on wall tops. Briefing (paraphrase): as trainees the two must learn to depend on each other; the course teaches tasks a single agent could not achieve. There is no Prima walkthrough for either training build. [ONE SOURCE: FAN]

| # | Obstacle | Solution | Co-op move | Required? | Confidence |
|---|---|---|---|---|---|
| 0 | Course start, panels on walls | Read the panel at each station; blue panels have a "replay tips" option; striped floor squares mark move spots. Reading is itself an objective; 100% needs re-reading at least one panel; skipping lowers the rating (RUW) | - | Scored | [CONFIRMED - several sources: FAN, V339; striped squares ONE SOURCE: IGNW] |
| 1 | Wall; door locked from the far side | Crouch and boost the partner over; he opens the door | Boost | REQUIRED | [ONE SOURCE: FAN; first-wall confusion CONFIRMED - several sources: JV] |
| 2 | Camera covering a passage | One agent stands still holding the jammer on the camera while the other crosses; the crossed agent then jams so the first can follow | Jammer alternation | REQUIRED (as objective) | [ONE SOURCE: FAN; jammer rules CONFIRMED - several sources: MAN, PRIMA] |
| 3 | Laser barrier with a switch beyond it | Tomoe Nage throws one agent over; he hits the switch | Tomoe Nage | REQUIRED | [ONE SOURCE: FAN] |
| 4 | Laser at the entrance of a small room; computer reachable only from above | Boost and Human Ladder onto a roof, then from a striped square lower the partner upside down to hack the computer and kill the laser grid; a medkit is in the laser room | Boost + Human Ladder + Hangover | REQUIRED | [CONFIRMED - several sources: FAN + JV for Hangover hack; roof route ONE SOURCE: IGNW; medkit ONE SOURCE: FAN RU] |
| 5 | Door with two retinal scanners | Each agent hacks one scanner at the same time; one agent can hack both, but a failed hack costs health | Synchronized action | REQUIRED | [CONFIRMED - several sources: FAN, JV, IGNW] |
| 6 | Barbed-wire wall, then a height | Tomoe Nage over the wall; the thrown agent climbs a pipe and starts Dual Rappelling; the partner climbs the rope while the holder steers him with the triggers | Tomoe Nage + Dual Rappelling | REQUIRED | [ONE SOURCE: IGNW; rappel objective FAN] |
| 7 | Final obstacle | A final Tomoe Nage, then reach the end | Tomoe Nage | REQUIRED | [ONE SOURCE: IGNW] |

- Objective list (FAN order): read panels; Short Scale; jammer; Tomoe Nage; Hangover; dual retinal scanner (the text warns failing is dangerous); Dual Rappelling ("help your partner reach an upper area"); reach the end. Hexen2k7's description lists the same drills. [ONE SOURCE: FAN for wording and order; CONFIRMED - several sources: FAN, hexen2k7 that these are the named drills]
- Each objective appears as its station is reached (inferred). [INFERRED / UNCERTAIN]
- Security: one camera, at least two lasers plus a laser-grid room, one two-scanner door, barbed wire; no guards documented; RUW end stats: 1 computer hacked, 2 retinal scanners hacked, 0 knocked out "though actually 1". [ONE SOURCE: FAN; the "1" INFERRED / UNCERTAIN]
- **Not taught as objectives:** Human Ladder (but used on the IGNW route), Stand on Teammate's Shoulders, Share View, Heal Teammate, Share Equipment. The game's training pop-ups do explain revive (one adrenaline boost each, two revives per mission) and Share Equipment (dot-marked items). The training note email about Share Equipment was left unused. Whether panels teach the others is unknown. [Objectives CONFIRMED - several sources: FAN, game files; pop-ups CONFIRMED - several sources: XB477, PC105]
- Training text: when one agent reads a computer, both agents' mission devices update. [CONFIRMED - several sources: game text]
- Length: 3-4 minutes for expert runs (V339 4:03; hexen2k7 3:14), 9-16 minutes casually; speedrun "Training IL - 1:28 (WR)" (Playbottl, https://www.youtube.com/watch?v=PP_1bFZ7sU4, platform unknown). [CONFIRMED - several sources: video lengths]
- Loadout per agent (identical): rifle 30, pistol 20 with jammer, one adrenaline syringe; Elite: both firearms start with zero ammunition. [ONE SOURCE: RUW]
- Frustrations: stuck at the first wall (crouch vs stand); retinal-scanner hacking confusion; pointless panel re-read for 100%; the tutorial teaches only co-op moves and assumes solo knowledge (Steam); a possible progression bug reloading Training after a later mission (JV). [as tagged in the training breakdown]
- Key videos (not watched): hexen2k7 100% Elite no KO/kill https://www.youtube.com/watch?v=WQ__XNyWP0M (3:14, "shortest clean pass through every co-op move drill"); V339 https://www.youtube.com/watch?v=2VRGQUT2JvQ (4:03); Centerstrain01 https://www.youtube.com/watch?v=0hK1AeB07wk (15:56); Agt_ Pendergast https://www.youtube.com/watch?v=1_spcLojzxo (15:32); DeepVelocityOps full campaign https://www.youtube.com/watch?v=4GtVpbf1xAw (7:22:04); ysuck63 https://www.youtube.com/watch?v=gm9uYnMw9KA; WeAreDeathBringers https://www.youtube.com/watch?v=VC5OdmsjlFM; blueshoezproductions https://www.youtube.com/watch?v=MCU6nG2MuA8.

### 16.2 PS2/GC Team Training
- Its own "Training" entry in the co-op menu, outside the four-mission campaign; one primary objective: work together to reach the end; no end-of-level statistics screen. [CONFIRMED - several sources: PS2M, FAN, PRIMA; objective ONE SOURCE: FAN]
- Contents: one laser-grid computer (an objective, not a security hack on this build); two retinal scanners; one neutralised figure in the statistics. [ONE SOURCE: FAN RU]
- Community fragments: the first-wall boost input on GameCube (stand with your back to the wall, press Z + D-pad Left; the partner faces you, crouches and presses the same); the boosted agent must press the co-op input again after landing for the ladder step; a throw used on an enemy; a North Korean soldier used as the training target; the last area needs only one player to reach the exit point (Ziggity). [ONE SOURCE each, except the GC wall input CONFIRMED - several sources: 2 commenters]
- Loadout: rifle 60, pistol 40, flash grenade 1, adrenaline 2 for each agent; no jammer listed. [ONE SOURCE: FAN]
- Length: 4-7 minute videos (WalkthroughCinema 4:20, xxxPS2xxx 4:21, SHOCK-25 5:36, Ziggity 7:16); speedrun record about 1:27. [CONFIRMED - several sources for video lengths; record ONE SOURCE]
- Unknown: station order, which moves are taught, layout, briefing text, whether a jammer exists. [UNKNOWN - see 06-open-questions.md, R-05]
- Key videos: Ziggity https://www.youtube.com/watch?v=obcKEeRniRw (7:16); WalkthroughCinema https://www.youtube.com/watch?v=gy1Vt3pxX8U (4:20); SHOCK-25 https://www.youtube.com/watch?v=MmH3o7WF4wg (5:36).

### 16.3 Signposting in missions
- Generic moves: initiator's pose + automatic voice line + partner's HUD Co-op Action icon. Contextual moves: named entries in the interaction menu only at valid spots. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- OPSAT mission notes spell out co-op requirements: Seoul "climb on your partner's shoulders" to disable the tanks, "a turret can be disabled with the jammer"; Panama "disable the laser using the jammer"; Train Station "both agents must cut the active wire at the same time". [CONFIRMED - several sources: FW + RUW mission pages, game text]
- In-level emails explain sync puzzles before the test (Chemical Bunker mixing and wire cut; Panama breaker inside the grid). [ONE SOURCE: FAN data; CONFIRMED for Panama - PRIMA + FAN]
- XBM says the loading screen gives mission clues / hints. [ONE SOURCE: XBM]

### 16.4 Design reading of the Training order [ANALYSIS]

| Observation | Principle it suggests |
|---|---|
| Every move gets one dedicated station, objective and panel | Teach each co-op verb in isolation before combining |
| The order runs boost, jam, throw, hang, sync, rappel | Moves get more interdependent along the way. Early ones barely need the partner (he only completes the move). Later ones need continuous partner control (the rope holder steers) and simultaneity (scanners) |
| Every split resolves within seconds via a reunion device (door, switch, rope) | Training normalises splitting before real missions make splits long and dangerous |
| The mission is a fictional training course | The tutorial is justified in-world, so the obstacle-course architecture is honest about being artificial; real missions then have to make the same verbs plausible in real buildings |
| Players stalled on input ambiguity (crouch vs stand) | A tutorial must teach the handshake itself (initiate, then complete) explicitly |

---

## 17. Reception of the moves (critics and players)

- **Headline.** Two-person moves are the most-praised features: above all the partner throw (Tomoe Nage), the boost and human ladder, and the upside-down rope dangle with a neck snap. Synchronized moments (simultaneous wire cuts, jam-and-run past cameras, coordinated double takedowns, "co-op ambushes") come next. [CONFIRMED - several sources: reception.md]
- **Critic statements naming moves:**
  - Eurogamer (PC 8/10, Kristan Reed, 8 Apr 2005): liked Boost, Human Ladder, "Long Jump" (throwing a partner into an NPC), and above all the Hangover rope-dangle neck-break; criticised wandering with no map and found the co-op "tacked on". [ONE SOURCE]
  - GameRevolution (Xbox A-, GC B; 5 Apr 2005): expected a "nifty little co-op feature" and got hooked on co-op ambushes; listed moves plus the adrenaline heal. [ONE SOURCE]
  - TeamXbox (Rob Semsey, 9.8): moves are one-button; coordinated multi-kills hook you; guards react to voice volume. [ONE SOURCE]
  - Globe and Mail (29 Mar 2005): smart collaborative actions; easier than single-player because two spies can attack guard pairs at once. [ONE SOURCE]
  - NWR (GC, Daniel Bloodworth, 27 Apr 2005): acrobatic moves "like Chinese acrobats"; tossing your buddy into enemies; unscripted coordination (one distracts, one flanks). [ONE SOURCE]
  - Pocket-lint (Xbox, 19 May 2005): the moves make it a real team event rather than two solo players sharing a screen. [ONE SOURCE]
  - GameSpot (via search summaries only): two spies doing what one can't is "endearing"; special moves tied to fixed spots feel forced. [INFERRED / UNCERTAIN: snippets only]
  - Penny Arcade (Tycho, 27 Jul 2005): co-op challenges are about communication rather than reflexes. [ONE SOURCE]
  - Elder-Geek (2009): simultaneous tasks; teamwork required. [ONE SOURCE]
- **Players.** Steam: "throw your buddy at guards", "tomoe nage the entire co-op campaign"; 22 of 236 English co-op-mentioning Steam reviews name specific co-op moves. Reddit: the Tomoe Nage throw is the signature memory; boosts, back-climbs and inverted rappel remembered fondly; a judo player says the throw and the climb-over-partner move are realistic; simultaneous takedowns are loved and hard; the co-op "needed both players" (climb into vents, kill lights and cameras, open doors in sync), contrasted with Conviction / Blacklist co-op. [CONFIRMED - several sources: Steam corpus, Reddit 1g21m8q, ijtifz, 1djaago, 1s6ylts, 99qjfn, 1rz5d99, 1m8z5gm, 1df5iet]
- **Criticisms of the moves.**
  - Moves bound to fixed spots feel scripted: "press button, watch animation" (Steam); "elaborate keys" (Retro Spectives podcast, https://www.youtube.com/watch?v=3G7D5CjM6RU); GameSpot found the location-bound moves forced. [CONFIRMED - several sources: 3 sources]
  - Co-op moves clunky and awkward to execute at times; inputs for shared devices unclear (bomb, laser grid, door code). [CONFIRMED - several sources: Reddit 1g21m8q, many YouTube help requests, AT 2008]
  - Hard for newcomers: several pairs never got past the first or second level; Chemical Bunker on PS2 "took months". [CONFIRMED - several sources]
  - Cryo mixing (lethal, precise, PC input failures); the upside-down hack when players could not find where to start it; the Nuclear Plant fan puzzle ("what is the fan for?", "AGH"). [CONFIRMED - several sources; fans ONE SOURCE: NEO titles]
- **Emergent comedy.** Door slams on your partner, physics mishaps, yelling about alarms, failing the missile disarm and everyone flying, zip-line misjudgements turned into rescues. Fan machinima "Splinter Cell Co-Op Theater (Bob and Steve)"; G4 X-Play's machinima nicknamed the agents "Bob and Steve"; players also say "Spy Blue and Spy Red". [CONFIRMED - several sources: Steam, Reddit 1fiyo7i; X-Play attribution INFERRED / UNCERTAIN]
- **Developer intent.** No developer statement explains why missions were built around two-player moves rather than just two players in solo maps, or why objectives are split or simultaneous. [UNKNOWN - see 06-open-questions.md]
- **Credits (who made the moves).** The PC credits video lists co-op mode animators Chi Chun Ng and Joseph Nasrallah; co-op mode lead game designer Daniel "Berlu" Berube; lead level designer Sebastien Galarneau (with Jonathan Dumont). The PS2 bonus-disc Animation developer diary (https://www.youtube.com/watch?v=xocq_CIzuag, 4:57) may show the paired animations. [Credits ONE SOURCE: PC105 Credits.bik; diary content INFERRED / UNCERTAIN]

---

## 18. Design value notes [ANALYSIS]

All points in this section are the researchers' interpretation, not facts about the game.

### 18.1 From the moves catalogue (05 section 9)
1. **One handshake for every move.** Initiate, then complete, with a voice line and an icon. Players learn it once.
2. **Free moves** make the level a playground; **contextual moves** let designers stage set pieces. A new game needs both tiers.
3. **Every move is a role split.** One player is the platform or operator (crouch, rope, shoulders); the other is the actor (climbs, hacks, kills). Good set pieces swap roles across a mission so neither player is always the platform.
4. **Moves double as attacks.** A throw that knocks out a guard, or an upside-down neck snap. Traversal and takedowns become one action, which creates "did you see that?" moments.
5. **Sync puzzles are rendezvous points.** They pull split-up players back together on the designer's schedule.
6. **Automatic voice lines** keep co-op playable without voice chat. Any new game should carry an equivalent ping or callout layer.

### 18.2 Problem each move solves
- Boost: height one body cannot reach; entry a lone guard would never expect; one agent on the far side of a locked barrier opens it from inside.
- Human Ladder: no one stranded below.
- Tomoe Nage: crossing a horizontal barrier (laser grid, walkway gap, barbed wire); doubles as an attack.
- Dual Rappelling: vertical descent / ascent with no fixed ladder; the holder becomes the operator steering around hazards.
- Hangover: reach-in to a room whose floor is guarded, lasered or locked; "the guarded room's ceiling is the entrance".
- Shoulders: interacting with something just out of reach without a ledge (a charge on a vehicle, a hatch).
- Share View: overwatch-and-infiltrate.
- Share Equipment: inventory as a team resource with asymmetric kits.

### 18.3 Level-design patterns built on the moves (08)
P1 split-path-and-sync (rendezvous lock); P2 hold-and-pass gate (cover relay); P3 throw-across with far-side release; P4 boost-then-ladder vertical entry; P5 reach-in from above (hang down); P6 single-entrant room (Train Station antidote); P7 captive as key; P8 operator and spotter; P9 leapfrog relay; P10 parallel routes that re-merge; P11 protect-while-act; P12 escort extraction; P14 lure and ambush; P19 one-way drop / commitment door (Chemical Bunker one-way door after the throw; Train Station ticket-booth trapdoor and washroom duct drop). Each has the "why it works" given in sections 3-10.

### 18.4 Wow-moment ingredients (11)
- **W1 Choreographed two-body move** (partner throw over a laser; boost plus human ladder into a window; upside-down hack through a ceiling; shoulder-stand demolition). Ingredients: a physical animation that needs both bodies and reads at a glance (spectator test); a clear handshake with an audio cue; a payoff the pair could not reach alone (height, gap, reach); optional danger (a guard below, a laser beneath). Amplifiers: the move doubles as an attack; the move puts one player's life in the other's hands (the rope holder).
- **W2 Synchronised moment ("3... 2... 1... now")** (wire cut, paired scanners, double takedowns, two-station mixing). Ingredients: players separated so neither sees the other's device; a visible stake; a shared countdown spoken by the players; instant legible success feedback. Amplifiers: hidden information only one player can see (thermal live wire); a live wire that changes over time.
- **W4 Near-miss** (a guard directly beneath a hanging agent; passing a turret while the partner's jammer charge drains; waiting motionless while Chu and his bodyguard stop beside you on PS2/GC). [Beats ONE SOURCE: PRIMA; "wow" INFERRED / UNCERTAIN]
- **Misfires:** cryo mixing (lethal gas, precise sequence, PC input failures); upside-down hack when players could not find where to start it; fan machine-state puzzle; scripted takedown moves felt like "press button, watch animation".

### 18.5 Anti-patterns tied to the moves (12)
- A3 solutions placed above the problem without a tell (grille opened from a vent above; vent controlled by a distant computer; lower platform via a washroom ceiling). Prevention: visible cause and effect, line of sight from problem to solution.
- A5 lethal precision sync puzzle; A6 sync inputs failing on one platform (test every two-person interaction on every input method; always have a fallback).
- A9 moves bound to fixed spots feel scripted. Prevention: mix free moves with authored spots; give each move more than one use (traverse, attack, scout).
- A20 tutorial assumes solo knowledge; input ambiguity (crouch = boost, stand = throw). Prevention: teach the handshake and context rules explicitly.

### 18.6 Principles derived (13)
- One handshake for every two-person action (audio and UI cue at both steps; graceful failure; no silent failure).
- Two tiers: free and authored; every authored spot also has a non-authored alternative or a clear reason.
- Every co-op move has more than one use (list two purposes per move per mission).
- Every role split gives both players a real job (no idle stretch over about 60 seconds).
- Split, then sync; every split ends at a merge point or a synchronised action.
- Two-body requirements grounded in the world and real security practice (paired scanners, paired bomb wires, the cryo email "two people are required", the single antidote dose; dual control and two-person integrity).
- Sync tolerance and fallback: forgiving windows, per-input feedback, relaxed timing without voice, failure escalates rather than kills.

### 18.7 Real-world analogues (14 translation guide)
Leg-Up (Boost; two-person climbing assist used by climbers and tactical teams); Ledge Relay (Human Ladder; partner pull-up); Partner Launch (Tomoe Nage; exaggerated athletic assist); Belay Line (Dual Rappelling; belay climbing, rope access for maintenance); Drop Line (Hangover; inverted rope work in rescue and film stunt practice); Stack (Shoulders; common real two-person reach); Feed Share (Share View; body-worn or deployable camera feeds); Pick-Up (revive; rescue window); Hand-Off (Share Equipment); Double Drop (simultaneous takedown; paired guards on mutual watch); Hold-Down Device (jammer; e.g. directed IR "dazzler" or handheld RF suppressor).

---

## 19. Unknowns (all moves)

- Initiator wait time, animation lengths, timing windows for every move; whether free moves are blocked near enemies or during alarms. [UNKNOWN - see 06-open-questions.md]
- Heights and distances for Boost, Human Ladder, Tomoe Nage, rope moves and Shoulders: no numbers in any source. [UNKNOWN - see 06-open-questions.md]
- Sync tolerance window; the Train Station second-wire timer length; when the UN HQ timer starts and how its bomb is defused. [UNKNOWN - see 06-open-questions.md, R-20]
- PS2/GC adrenaline count and the both-down rule. [UNKNOWN - see 06-open-questions.md, R-03]
- PS2/GC Team Training station order and moves. [UNKNOWN - see 06-open-questions.md, R-05]
- Nuclear Plant co-op move locations beyond the turbine hall and how the scanner doors are passed. [UNKNOWN - see 06-open-questions.md, R-19]
- UN HQ co-op moves; whether the opening rappel is the two-person move. [UNKNOWN - see 06-open-questions.md, R-20]
- EEV in co-op (remote hacking). [UNKNOWN - see 06-open-questions.md, R-02]
- Partner marker on the map; pings. [UNKNOWN - see 06-open-questions.md, R-11]
- Partner voice falloff. [UNKNOWN - see 06-open-questions.md, R-22]
- N-Gage/DS room layouts, who operates the Breakdown switches. [UNKNOWN - see 06-open-questions.md, R-23]
- The `.lin` level packages contain map geometry and script, but no text describing exact co-op move locations; that still needs video. [ONE SOURCE: gap_closing_gamefiles.md]
- No dedicated "all co-op moves" showcase video exists; no commentary or transcripts could be read. Official-looking co-op trailers: https://www.youtube.com/watch?v=hFAPasSujbE, https://www.youtube.com/watch?v=vzzG_KNahQ8, https://www.youtube.com/watch?v=rlUtBArK8Q4; "All Training Videos" (Isolated Oaf) PS2 https://www.youtube.com/watch?v=6Uy0tnDb5Ec and PC https://www.youtube.com/watch?v=1-Tyzb41how (whether they include co-op moves is uncertain). [INFERRED / UNCERTAIN]
- Official names in localisations beyond Russian (French / German manuals not checked). [UNKNOWN]

---

## Sources used for this file

**Files in /home/user/docs:**
- /home/user/docs/05_coop_moves_catalogue.md
- /home/user/docs/research_notes/coop_moves.md
- /home/user/docs/research_notes/coop_gadgets_controls_comms.md
- /home/user/docs/03_coop_overview.md
- /home/user/docs/04_mission_breakdowns/training.md
- /home/user/docs/04_mission_breakdowns/panama.md
- /home/user/docs/04_mission_breakdowns/seoul.md
- /home/user/docs/04_mission_breakdowns/chemical_bunker.md
- /home/user/docs/04_mission_breakdowns/train_station.md
- /home/user/docs/04_mission_breakdowns/nuclear_plant.md
- /home/user/docs/04_mission_breakdowns/un_headquarters.md
- /home/user/docs/04_mission_breakdowns/ngage_ds_campaign.md
- /home/user/docs/research_notes/mission_training.md
- /home/user/docs/research_notes/mission_panama.md
- /home/user/docs/research_notes/mission_seoul.md
- /home/user/docs/research_notes/mission_chemical_bunker.md
- /home/user/docs/research_notes/mission_train_station.md
- /home/user/docs/research_notes/mission_nuclear_plant.md
- /home/user/docs/research_notes/mission_un_hq.md
- /home/user/docs/research_notes/mission_ngage_ds.md
- /home/user/docs/research_notes/gap_closing_gamefiles.md
- /home/user/docs/research_notes/gap_closing_community.md
- /home/user/docs/research_notes/reception.md
- /home/user/docs/research_notes/videos.md
- /home/user/docs/research_notes/systems_rules.md
- /home/user/docs/research_notes/dev_and_design_intent.md
- /home/user/docs/research_notes/platforms_versions.md
- /home/user/docs/research_notes/music_and_atmosphere.md
- /home/user/docs/research_notes/real_world_security_and_architecture.md
- /home/user/docs/06_gadgets_and_tools.md
- /home/user/docs/07_objectives_taxonomy.md
- /home/user/docs/08_level_design_patterns.md
- /home/user/docs/09_pacing_and_flow.md
- /home/user/docs/10_ai_detection_and_alarms.md
- /home/user/docs/11_wow_moments.md
- /home/user/docs/12_anti_patterns.md
- /home/user/docs/13_principles.md
- /home/user/docs/14_translation_guide.md
- /home/user/docs/01_sources.md
- /home/user/docs/02_coverage_matrix.md
- /home/user/docs/OPEN_QUESTIONS.md

**External URLs cited in this file:**
- XBM: https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory (PDF https://archive.org/download/xboxmanual_Splinter_Cell_3_Chaos_Theory/Splinter_Cell_3_Chaos_Theory.pdf); alternative scan https://www.docdroid.net/kYAIsM5/tom-clancys-splinter-cell-chaos-theory-manual-xbox-pdf ; index https://www.manualslib.com/manual/379207/Ubisoft-Splinter-Cell-Chaos-Theory.html
- PS2M: https://archive.org/details/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA
- PRIMA: https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide (print edition, lending only: https://archive.org/details/tomclancyssplint0000loec)
- Game files: PC105 https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601 ; XBDLC https://archive.org/details/og-xbox-dlcupdates ; XB477 https://archive.org/details/sc-3-xb-build-477-retail ; PCDVD https://archive.org/details/scct_20250728 ; bonus disc https://archive.org/details/q-1-t-00_202406
- FW: https://splintercell.fandom.com/api.php (pages incl. Training Facility, Team Training, Tomoe nage, Cooperative, Agent One, Agent Two, Splinter Cell Controls, Optically Channeled Potentiator, Camera Jammer, Adrenaline Syringe, Sticky Camera, Seoul 3, Train Station, Nuclear Plant, United Nations Headquarters, Multiplayer); https://splintercell.fandom.com/wiki/Training_Facility
- RUW: https://splintercell.fandom.com/ru/api.php (Взаимодействия, Обучение, Сеул 3, Химический бункер, Нью-Йорк (Chaos Theory), Панама, Атомная станция, Штаб-квартира ООН)
- IGNW: https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Training_Facility ; https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Panama_Bank ; https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Seoul
- GF (GamesFirst preview): https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/
- JV: https://www.jeuxvideo.com/forums/1-9456-997863-1-0-1-0-0.htm ; https://www.jeuxvideo.com/forums/1-9456-991848-1-0-1-0-0.htm
- NWR: https://nintendoworldreport.com/review/4357
- EG: http://elder-geek.com/2009/09/splinter-cell-chaos-theory-co-op-review/
- Classic Co-op: https://www.classicco-op.com/coop-spotlight/2017/6/21/co-op-spotlight-splinter-cell-chaos-theory
- GameGrin: https://www.gamegrin.com/articles/splinter-cell-chaos-theory-diaries-part-seven/
- GameRevolution Xbox review: https://www.gamerevolution.com/review/36141-splinter-cell-chaos-theory-review ; GC review: https://www.gamerevolution.com/?p=32392
- Daily Cardinal: https://www.dailycardinal.com/article/2005/04/splinter-sequel-rife-with-chaos
- Guinness World Records: https://www.guinnessworldrecords.com/world-records/549102-first-video-game-to-feature-a-fully-stealth-based-co-op-mode
- YouTube: https://www.youtube.com/watch?v=IIfns1gvSRY ; https://www.youtube.com/watch?v=11-wUk-tLaY ; https://www.youtube.com/watch?v=gm9uYnMw9KA ; https://www.youtube.com/watch?v=gy1Vt3pxX8U ; https://www.youtube.com/watch?v=obcKEeRniRw ; https://www.youtube.com/watch?v=MmH3o7WF4wg ; https://www.youtube.com/watch?v=LXMhZHUOpEk ; https://www.youtube.com/watch?v=akFHEo91RA0 ; https://www.youtube.com/watch?v=WQ__XNyWP0M ; https://www.youtube.com/watch?v=2VRGQUT2JvQ ; https://www.youtube.com/watch?v=0hK1AeB07wk ; https://www.youtube.com/watch?v=1_spcLojzxo ; https://www.youtube.com/watch?v=4GtVpbf1xAw ; https://www.youtube.com/watch?v=VC5OdmsjlFM ; https://www.youtube.com/watch?v=MCU6nG2MuA8 ; https://www.youtube.com/watch?v=PP_1bFZ7sU4 ; https://www.youtube.com/watch?v=3G7D5CjM6RU ; https://www.youtube.com/watch?v=xocq_CIzuag ; https://www.youtube.com/watch?v=hFAPasSujbE ; https://www.youtube.com/watch?v=vzzG_KNahQ8 ; https://www.youtube.com/watch?v=rlUtBArK8Q4 ; https://www.youtube.com/watch?v=6Uy0tnDb5Ec ; https://www.youtube.com/watch?v=1-Tyzb41how ; https://www.youtube.com/watch?v=-JnlamHBZrc (Suru Train Station 100%, comments and description) ; https://www.youtube.com/watch?v=ge7dEnjp6MU (Ziggity PS2 Train Station, comments) ; https://www.youtube.com/watch?v=__LRg8KrYQ8 (Ziggity PS2 Seoul) ; https://www.youtube.com/watch?v=qLQEHSaRECM (Ziggity PS2 Chemical Bunker)
- Reddit threads (via Arctic Shift, https://arctic-shift.photon-reddit.com/api/posts/search): r/Splintercell 1g21m8q, ijtifz, 1djaago, 1s6ylts, 1df5iet, 1megyet, 1ouonhz, 6lzq8e, 1qfdvur, mngqa0, vpwdry, 1e9pwjx, 1fiyo7i, 99qjfn, 1rz5d99, 1m8z5gm
- Steam discussions, app 13570: https://steamcommunity.com/app/13570/discussions/
