# 05 - HUD and camera

What a player sees and is prompted with in the Splinter Cell: Chaos Theory (2005) 2-player co-op mode: the HUD per platform, the OPSAT, interaction prompts, the light and sound meters, how each player knows where the partner is and what the partner is doing, the camera, and the parts of the visual atmosphere that affect readability.

**Platform labels used in this file.**
- **Version 1 = Xbox / PC.** Training Facility + Panama, Seoul, Chemical Bunker, Train Station, plus the two downloads Nuclear Plant and UN Headquarters.
- **Version 2 = PS2 / GameCube.** Team Training + Seoul, Chemical Bunker, Train Station, Panama, each split into 4-5 sub-levels.
- **N-Gage / DS.** A separate Gameloft co-op campaign (Rooftops, Breakdown, Corruption, Prison Rescue, Escape).

**Confidence tags.** [CONFIRMED - several sources: ...], [ONE SOURCE: ...], [INFERRED / UNCERTAIN: ...], [UNKNOWN - see 06-open-questions.md, R-xx], [ANALYSIS] (the researchers' interpretation, not a fact about the game). Source codes are kept exactly as in the research (legend in 00-index.md). Note on one code: in the research note `coop_gadgets_controls_comms.md`, **GF means the GamesFirst 2005 preview**; in `02_coverage_matrix.md`, GF means the primary game files. In this file GF always means the GamesFirst preview; the game files are named by their own codes: **PC105** (installed PC copy at patch 1.05), **XB477** (Xbox build 477 dev-kit dump, 21-22 Feb 2005), **XBDLC** (Xbox Live download packages for Nuclear Plant and UN HQ), **PCDVD** (PC retail DVD: manual dated 16/02/05, readme v1.02, 1.05 patch readme).

---

## 1. HUD layout

### 1.1 What is on screen in co-op - Xbox (Version 1)

The Xbox manual (XBM, co-op chapter, p.23) lists these co-op HUD elements [ONE SOURCE: XBM p.23]:

| # | Element | What it shows |
|---|---|---|
| 1 | Life bar | The agent's own health |
| 2 | Light meter (stealth meter) | How visible the agent is (see §3.1) |
| 3 | Noise meter | The agent's own noise against the environment's noise (see §3.2) |
| 4 | Interaction system | The context interaction menu (see §2.1) |
| 5 | Selected item | The equipped weapon or gadget |
| 6 | Communication box | Incoming comms, at the top of the screen |
| 7 | Objective icon | Objective state |
| 8 | Ammo | Rounds for the selected item |
| 9 | **Teammate status** | The partner's health |
| 10 | **Co-op Action key icon** | Appears when the partner is ready for a co-op move or interaction |
| 11 | Alarm indicator | Counts alarms; "each alarm has global repercussions" |
| 12 | **Chat box** | "Used to communicate with Co-op partner in text format" |

- The element numbering above follows the order the research notes give; the Co-op Action icon is "item 10" in both the XBM and PS2M lists [CONFIRMED - several sources: XBM p.23 item 10, PS2M item 10].
- The topic file 03 summarises the Xbox HUD as: the agent's own light and noise meters, life bar, partner health, a Co-op Action icon when the partner is ready for a move, alarm counter, timer and a text chat box [ONE SOURCE: XBM]. The **timer** is in 03's Xbox summary but not in the XBM p.23 element list as recorded in the research note. Both manuals do say a HUD timer appears when one is triggered, and reaching zero is "bad news" [CONFIRMED - several sources: XBM, PS2M]. So the Xbox co-op HUD can show a timer when a mission triggers one (see §1.5).
- The alarm indicator sits **above the visibility bar** (the light meter) and counts alarms; each alarm has "global repercussions" [CONFIRMED - several sources: XBM, PS2M (same wording in both manuals)].
- **The "sparse HUD" reading.** The original co-op HUD is meters, partner health, an action icon, an alarm counter and a text box. No waypoints or partner markers are documented [ANALYSIS, from 09_pacing_and_flow.md §3; marker absence UNKNOWN - see 06-open-questions.md, R-11].
- An early E3 build had a different HUD from the release (the uploader notes that the build's HUD, animations, weapon models and map layouts differ from release) [ONE SOURCE: Alex37 "E3 Gameplay [Rare Footage]", https://www.youtube.com/watch?v=11-wUk-tLaY, co-op from 2:14]. What the differences are: [UNKNOWN - see 06-open-questions.md].

### 1.2 What is on screen in co-op - PS2 and GameCube (Version 2)

- **PS2 co-op HUD list** (PS2 manual): life bar, light meter, noise meter, interaction system, selected item, communication box, objective bar, objective icon, ammo, Co-op action icon, timer, alarm indicator [ONE SOURCE: PS2M].
  - **No teammate-health item and no chat box** are listed [ONE SOURCE: PS2M]. 03 states this as "the PS2 HUD lacks partner health and chat" [ONE SOURCE each: XBM, PS2M].
  - PS2M adds an **objective bar** that the XBM list does not have [ONE SOURCE: PS2M].
  - The PS2 noise meter is described as showing "how noisy the environment around the spy is" [ONE SOURCE: PS2M].
  - The PS2 HUD shows a timer when one is triggered, and an alarm counter where each alarm has "global repercussions" [ONE SOURCE: PS2M].
- **GameCube HUD:** no GameCube manual was found, so there is no GameCube HUD list [UNKNOWN - see 06-open-questions.md]. GameCube co-op is split-screen only, like PS2 [ONE SOURCE: PRIMA]. GameCube control notes come from the Fandom controls page only (Z + D-pad Left is the Co-op Action) [ONE SOURCE: FW controls page].

### 1.3 What is on screen in co-op - PC (Version 1)

- No PC HUD element list is recorded in the research. The PC manual (PCDVD `SCCT/Manual/ENGLISH/Manual.pdf`, dated 16/02/05) was read for the revive timer, co-op saving, crane voice commands and the co-op menu, but its HUD page is not summarised [UNKNOWN - see 06-open-questions.md].
- PC text chat: the default PC binding "Say (Coop)" is on **T** and **End** [ONE SOURCE: FW controls page]. It presumably opens the text chat box that XBM lists on the HUD [INFERRED / UNCERTAIN: link between the "Say" key and the chat box].
- PC revive key: **Insert** = revive by default [CONFIRMED - several sources: PC105 `SplinterCell3User.ini`, plus Equipments.int/HUD.int in both builds for the "Heal Teammate" interaction].
- PC EEV key: key **4** is bound to EEV mode in `SplinterCell3User.ini` [ONE SOURCE: PC105] (whether EEV works in co-op: [UNKNOWN - see 06-open-questions.md, R-02]).
- PC F5 quick save / F8 quick load exist in the default key map [ONE SOURCE: FW controls; not confirmed for co-op in that source]. Co-op quick save and quick load exist on PC [CONFIRMED - several sources: speedrun.com Any% Co-op rules, Reddit 15s93fb, PC105 and XB477 menu text] (the in-game pause menu has Quick Save, Save and Load).
- PC co-op voice chat specifics were not found [UNKNOWN - see 06-open-questions.md]. Today the in-game PC voice option is greyed out, so players use Discord [ONE SOURCE: Reddit vpwdry].

### 1.4 What is on screen - N-Gage and DS (Gameloft campaign)

- **Perspective:** full 3D, third-person chase camera behind the agent, not 2D and not top-down [CONFIRMED - several sources: IGN DS review, NWR press release, Pocket Gamer, the researcher's own look at frames from the SHOCK-25 and arronmunroe DS co-op videos and the N-Gage co-op beta footage].
- **DS screens:** the top screen shows the 3D view; the touch screen shows a **radar** plus buttons for vision modes, weapons and inventory; the stylus also does lock-picking (DS three-pin stylus lock-pick, which FW notes as "1-2-3") [CONFIRMED - several sources: IGN DS review (3D engine; touch screen for inventory and vision modes), NWR press release (touch screen for inventory, vision modes, camera), Pocket Gamer (stylus lock-picking)].
- **N-Gage controls:** number-key controls; key 3 cycles thermal / night / normal [ONE SOURCE: N-Gage Media Preview Kit "Quick guide controls" PDF].
- **Role refusal pop-ups:** "the Assault cannot hack computers" and "the Hacker cannot short-circuit electric panels" appear as pop-up messages; interaction verbs are "HACK COMPUTER" and "HACK PANEL" (French "court-circuiter") [CONFIRMED - several sources: NG-TXT, FW].
- **Lobby:** game type "COOP" (versus is "VERSUS"); an "EXPERTISE" field and "CHANGE EXPERTISE" option to pick Hacker or Assault; "HOST GAME" / "JOIN GAME"; a prompt says Bluetooth is needed for multiplayer; if the host quits, the session ends [ONE SOURCE: NG-TXT].
- **Lobby colours:** Hacker = blue tag, blue goggles (FW maps him to "Agent One"); Assault = red tag, purple goggles (FW maps him to "Agent Two") [ONE SOURCE: FW].
- **HUD descriptions** exist as strings in the N-Gage text table (NG-TXT read "HUD descriptions"), but their content is not summarised in the research [UNKNOWN - see 06-open-questions.md, R-23].
- **End-of-mission stats screen:** counts locks picked, computers hacked and "electro hacks" (panels), bodies found, enemies startled/alerted, alarms, camera/laser/motion detections, primary/opportunity/bonus objectives, mission time and time bonus, total score. Fail reasons include detected, detected too many times, died, objective killed, out of time. These are shared with solo play; which apply to co-op is not stated [ONE SOURCE: NG-TXT; co-op applicability INFERRED / UNCERTAIN].
- **Alarm warnings by radio, not a counter alone:** classic 3-alarm abort; Lambert warns after alarm 1 (two left) and alarm 2 (one left) and aborts on the 3rd; alarm level is lowered after checkpoints / scripted events [CONFIRMED - several sources: FW (DS Rooftops trivia + N-Gage/DS game page), GamesRadar DS review]. NG-TXT shows a co-op "alarm lowered" line [ONE SOURCE: NG-TXT].

### 1.5 Timers on screen

| Where | Timer | Shown how | Tag |
|---|---|---|---|
| All (rule) | A HUD timer appears when triggered; reaching zero is "bad news" | HUD | [CONFIRMED - several sources: XBM, PS2M] |
| Seoul (Xbox/PC) | A 5-minute timer starts when the plane is shot down, with Lambert warnings at each minute (destroy the two Chun-Ma anti-aircraft systems) | HUD timer per the rule above; Lambert warnings | [CONFIRMED - several sources: XB477 + PC105 game text; earlier ONE SOURCE: Rybka walkthrough] |
| Seoul Gardens (PS2/GC) | 4-minute timer | HUD | [ONE SOURCE: FW] |
| Train Station (both builds) | Deactivating a bomb's laser starts a countdown; both agents cut the hot wire before it ends; players describe repeating for a second wire "before a timer runs out" | Not stated whether on screen | [ONE SOURCE: Fandom in-game email; players' description CONFIRMED - several sources: YouTube comments on 8FiRUvq86sg, LY9-0Dk-YHk, ge7dEnjp6MU]. No on-screen **mission** timer is documented [INFERRED / UNCERTAIN] |
| UN HQ (Xbox/PC download) | Hidden 20-minute bomb timer. Lambert's timer lines cover 20 minutes, 10 minutes, 5 minutes and 60 seconds left. Script patterns `Timerbomb`, `paralleltimer`, `Countdown`, `Bombdetonation` | **No number is shown on screen**; the countdown is announced by the controller's text lines | [CONFIRMED - several sources: XBDLC + PC105 game text, FAN RU note]. Start point [INFERRED / UNCERTAIN: R-20] |
| N-Gage/DS Corruption | Computer #3 (Hacker) locks doors and starts a 6-minute countdown to extraction | Not described | [ONE SOURCE: FW/SHOCK] |

- **Conflict on UN HQ.** The research note `systems_rules.md` lists for UN HQ a "hidden 20-minute timer plus on-screen bomb countdown objective" [ONE SOURCE: FW objective text]. The topic files say the timer has **no on-screen count** (07_objectives_taxonomy.md: "A 20-minute bomb timer with no on-screen count"; un_headquarters.md: "no number is shown") [CONFIRMED - several sources: FAN RU + game text]. Corrected reading: no on-screen number; "countdown objective" refers to the objective text. Whether a HUD timer ever appears in UN HQ: [UNKNOWN - see 06-open-questions.md, R-20].

### 1.6 Communication box, subtitles and text chat

- **Communication box:** in-mission comms appear in a "communication box" at the **top of the screen** [CONFIRMED - several sources: XBM p.23, PS2M].
- **Briefings:** co-op missions open with Lambert addressing both trainees (e.g. Panama: he welcomes them to "the big leagues" despite their training status) [ONE SOURCE: Fandom mission pages, which reproduce briefing text]. Lambert is voiced by Don Jordan in CT [CONFIRMED - several sources: Slashdot, Steam review 55110708].
- **Text chat box** (Xbox HUD item): "used to communicate with Co-op partner in text format" [ONE SOURCE: XBM]. PS2 lists no chat box [ONE SOURCE: PS2M].
- **Subtitles:** whether spoken lines are subtitled in co-op is not documented [UNKNOWN - see 06-open-questions.md]. What is known is the reverse case below: in the downloads the controller's lines are text only.
- **Text-only controller in the two downloads (Nuclear Plant and UN HQ, Xbox/PC):** Lambert's briefing and in-mission lines appear only as on-screen text with no voice. Players explain it as the late downloads not getting new recordings. A Reddit commenter says of UN HQ "you can read his text on screen" [CONFIRMED - several sources: YouTube comments on hexen2k7 1/3 and PleasePlayMore #17, Reddit v5jncz, Steam threads 828925849173270181 and 45350245387206844]. A Steam reply says the missions never shipped with spoken Lambert lines [ONE SOURCE: Steam].
  - Both download briefings point to the Panama briefing voice cue `Play_BRF_51_000_01Lam`, which looks like a placeholder [ONE SOURCE: PC105/XBDLC text].
  - On PC, enabling "Use native sounds" on these two maps made the **info screen vanish** and killed ambient and enemy voices, matching the 1.05 patch readme warning (the two new levels ship "without the 'use native languages' sound option") [CONFIRMED - several sources: Steam threads 828925849173270181 + 45350245387206844, PCDVD 1.05 readme].
  - Co-op maps launched directly from a batch file (`00_Training_COOP`, `01_Panama`, `02_seoulthree`, `03_ChemBunker`, `04_GCS`, `05_NuclearPlant`, `07_UNhq`) behave like test builds: lots of ammo, **no dialogue** [ONE SOURCE: Steam discussion 133262738417485094].
  - Players noticed and missed the voice [CONFIRMED - several sources: Steam threads + video comments]. [ANALYSIS] Text-only guidance flattens a mission's feel even when the text is identical (15 §7, 13 #36).
- **Seoul cross-campaign radio:** the solo hero's interrogation of a soldier is relayed to the trainees as radio dialogue in Seoul; the agents do not see him [CONFIRMED - several sources: FW, EG; delivery as radio per mission_seoul.md]. In single-player Seoul, Lambert says the trainees lost their target [ONE SOURCE: GameGrin diary pt 7].

### 1.7 OPSAT screens (the mission device)

- **Button:** Xbox co-op diagram maps the OPSAT menu to **Back** [ONE SOURCE: XBM p.20].
- **Menu pages (shared by solo and co-op):** **Goals, Notes, Data, Map, Equipment** [ONE SOURCE: `InGameMenus.int` (XB477 / PC105)].
- **Goals:** the objective list. Objectives come in three tiers: primary (must do), secondary and opportunity (optional, often discovered in play) [CONFIRMED - several sources: FW, PRIMA]. They update mid-mission as intel arrives (see §2.9). At the end, the co-op Objective Review shows only **Completed** or **Failed** (no "Canceled" status, unlike solo) [CONFIRMED - several sources: XBM, PS2M].
- **Notes:** mission notes carry route clues and explicit co-op hints (see §2.11): e.g. Seoul "climb on each other's shoulders" to disable the tanks, "turrets can be disabled with the Jammer", "gunfire may not be aimed at you"; Panama "disable the laser using the jammer"; Train Station "both agents must cut the active wire at the same time" [CONFIRMED - several sources: FW + RUW mission pages (same wiki family; RUW Seoul shoulder note is RUW-only: ONE SOURCE), XB477 + PC105 game text for Seoul]. Chemical Bunker's protocol note names the blood serum type (A, B or O; three alternative notes, so the required type is read from the note each run) [CONFIRMED - several sources: XB477 + PC105].
- **Data:** e-mails and computer files read in the level, e.g. Panama key codes, the Chemical Bunker "Anti-viral protocol" and "Mixing the protocol" e-mails, the UN HQ "Bombing Plan" file and Jin Soo e-mail, the Nuclear Plant Wen Bae-su and Jin Soo e-mails [CONFIRMED - several sources: game text XB477/PC105/XBDLC + Fandom Data pages].
- **Map:** a map page exists for every co-op map (see §1.8-1.9) [CONFIRMED - several sources: XB477 + XBDLC + PC105 ini]. Whether it is a navigable floor plan and whether it marks the partner: [UNKNOWN - see 06-open-questions.md, R-11].
- **Equipment:** inventory; items marked with a **dot** can be shared with the partner (see §2.4) [CONFIRMED - several sources: XBM, PS2M, PRIMA, game text].
- **Shared intel:** when one agent gets information from a computer, **both agents' OPSATs are updated** [CONFIRMED - several sources: training pop-up text in XB477 and PC105].
- **PS2 OPSAT map:** PS2M says the OPSAT map is displayed "in Solo mode", implying no map in co-op on PS2 [ONE SOURCE: PS2M; INFERRED / UNCERTAIN].
- **Generic CT OPSAT:** CT's OPSAT 3D map shows allies (FW OPSAT page, generic, not co-op) [ONE SOURCE: FW]. Whether it shows the partner in co-op: [UNKNOWN - see 06-open-questions.md, R-11].
- **OPSAT talk is silent:** grab/interrogation and OPSAT talk count as silent to the AI [ONE SOURCE: PRIMA "Sound & Silence"].
- **Unlockable advice:** in Nuclear Plant, gathering the Yongbyon complex blueprints (opportunity objective, first computer) lets Lambert give advice about the complex [ONE SOURCE: Fandom; objective text CONFIRMED - several sources: XBDLC + PC105: "gather the Yongbyon complex blueprints (so Lambert can guide you)"].

### 1.8 Map legend

- The OPSAT map legend has: **Alarm, Objective, Player, Location, Triggered Alarms** [ONE SOURCE: `InGameMenus.int`].
- There is **no separate "teammate" legend entry** [ONE SOURCE: `InGameMenus.int`]. [ANALYSIS] This leans towards no partner marker, but "Player" could in principle cover both agents; not shown either way [UNKNOWN - see 06-open-questions.md, R-11].
- Not to be confused with: Prima's Xbox/PC printed map legend ("Map features") for Train Station, which is unreadable in the OCR, so exact positions on the guide map are not recoverable [ONE SOURCE: mission_train_station.md Gaps].

### 1.9 Map textures per co-op map

Every co-op map, including both download maps, has an OPSAT map texture referenced as **MapIcon / briefing MapImage** in its map `.ini` [CONFIRMED - several sources: XB477 + XBDLC + PC105 ini].

| Map file | Mission | Map texture | Internal numbers | Platform |
|---|---|---|---|---|
| `00_Training_COOP` | Training Facility | `map_training` | map 00; base co-op identities 100-105 | Xbox/PC |
| `01_Panama` | Panama | `map_panama` | map 01 | Xbox/PC |
| `02_seoulthree` (`02_Seoulthree` in XB477 LMaps) | Seoul ("Seoul 3") | `map_seoul3` | map 02 | Xbox/PC |
| `03_ChemBunker` | Chemical Bunker | `map_chemicalbunker` | map 03 | Xbox/PC |
| `04_GCS` (GCS = Grand Central Station) | Train Station | `map_gcs` | map 04 | Xbox/PC |
| `05_NuclearPlant` | Nuclear Plant (download) | `map_NuclearPlant` | map 05 / mission 55 / map identity 201 | Xbox/PC |
| `07_UNhq` | UN Headquarters (download) | `map_UNhq` | map 07 / identity 202 | Xbox/PC |

- The download packages also ship `Magma/Data/Textures/Maps/map_*.dds` at **256x128** and `load_map_*.dds` [CONFIRMED - several sources: XBDLC; PC105].
- [INFERRED / UNCERTAIN] The 256x128 map textures look like the small briefing / loading images, so whether there is a navigable floor plan is still not shown [ONE SOURCE: gap_closing_gamefiles.md verdict].
- **Slot 06 is missing** in the map numbering (00-05, then 07), which hints at a cut or renumbered mission [numbering ONE SOURCE: Steam discussion 133262738417485094; "cut mission" INFERRED / UNCERTAIN].
- The Xbox build 477 level packages are `Default/LMaps/{00_Training_COOP,01_Panama,02_Seoulthree,03_ChemBunker,04_GCS}/*.lin`; the download level packages are in XBDLC `content/$c/5553003804902482/` (Nuclear Plant) and `content/$c/5553003804902483/` (UN HQ), Xbox title ID folder 55530038 [ONE SOURCE each: XB477, XBDLC].
- PS2/GC map textures: no PS2/GC data was available [UNKNOWN - see 06-open-questions.md, R-05].
- **Correction of an earlier claim.** Eurogamer (PC, 8/10, Kristan Reed, 8 Apr 2005) said much time is spent wandering and hunting for each other "with no map" [ONE SOURCE: Eurogamer]. The game files show every co-op map has a map page, so the "no map" claim is at least partly wrong [CONFIRMED - several sources: XB477 + XBDLC + PC105]; whether the partner is marked remains open (R-11).

### 1.10 Split-screen layout and the split-screen OPSAT layout file

- **Orientation:** split-screen is **vertical**: Agent 1 on the **left**, Agent 2 on the **right**; needs two controllers [ONE SOURCE: PRIMA]. A forum snippet (xisto) also says split screen is vertical, one red light and one blue [ONE SOURCE: xisto forum snippet via search; page behind a bot wall]. A forum user says split orientation follows the Xbox dashboard widescreen setting [INFERRED / UNCERTAIN: one forum user].
- **Split-screen OPSAT layout file:** `opsat_split.mgb` exists on Xbox [ONE SOURCE: XB477]. [ANALYSIS] So the OPSAT has a dedicated split-screen layout; what it looks like: [UNKNOWN - see 06-open-questions.md, R-11].
- **Where split-screen exists:**

| Platform | Split-screen co-op | Tag |
|---|---|---|
| Xbox | Yes (plus System Link and Xbox Live) | [CONFIRMED - several sources: XBM p.21, PRIMA, WP, MN] |
| PC | **No native split-screen.** PC co-op menu: LAN, Online, Settings (`PreGame_PC.int` [MainMenuCoop]); the PC manual's co-op main menu lists the same three. The "SPLIT SCREEN" title string and a split-game menu class exist only as Xbox leftovers in shared files | [CONFIRMED - several sources: PC105 + PCDVD manual; R-13 closed] |
| PS2 | Split-screen only | [CONFIRMED - several sources: PRIMA, GF (GamesFirst)] |
| GameCube | Split-screen only | [ONE SOURCE: PRIMA; consistent with NWR] |
| Xbox One / Series (backward compatibility) | Local split-screen works; System Link between One/Series works; no online. Both co-op download missions included (Microsoft described them as "split-screen co-op missions") | [CONFIRMED for BC + downloads: Xbox Wire 10 Jun 2019 + GamesHedge + Wikipedia BC list; local/System Link by inference from Team XLink notes] |

  - Earlier source said otherwise: PRIMA's connection table lists PC as "Split-screen, LAN, Online" and says split-screen is supported by all platforms. Steam users (2015 thread 483366528901839569, co-op.gg listing) said PC has LAN/online only. **Corrected by** the PC 1.05 menu text and the PC manual (R-13 closed): PC had no native split-screen. Community tools fake it: Nucleus Co-op or DxWnd hacks (e.g. Birden, Nucleus Co-op split-screen on PC: https://www.youtube.com/watch?v=3nLKhKGucII; Steam threads 4068391194358261602, 4849903998511829758); a 2024 Steam user says Nucleus Co-op supports only the Steam version [ONE SOURCE].
- **Share View is disabled in split-screen** because the partner can simply look at the other half of the screen [ONE SOURCE: XBM p.25].
- **Reception of split-screen:**
  - VideoGamer (Keza MacDonald): split-screen is tiresome because the game is about seeing around corners and the partner's screen gives information away [ONE SOURCE: VideoGamer]. Listed as anti-pattern A18 "Split-screen leaks information" (12_anti_patterns.md).
  - Nintendo World Report (GameCube, Daniel Bloodworth, 27 Apr 2005): split-screen works better than expected [ONE SOURCE: NWR].
  - "Split-screen weaker than Live/link": VideoGamer, TeamXbox [CONFIRMED - several sources: reception.md count 2].
  - Community memory: large numbers of comments about split-screen at sleepovers and with family; "some of the best laughs" of their life [CONFIRMED - several sources: dozens of comments across ParagonMitchell, DeepVelocityOps, Reddit 1df5iet, 18zgpgu, 1lw7uy0].
  - [ANALYSIS] Colour-coded goggle lights let partners recognise each other in darkness and on split-screen, where silhouettes are lost (see §4.1).
- **Split-screen videos to check the layout** (not watched by the researchers): PS2 split-screen set by Củ Cà Rốt Co-op Team: Training https://www.youtube.com/watch?v=RXNrz5N-qZE, Panama https://www.youtube.com/watch?v=lFHlkLTsKQI, Chemical Bunker https://www.youtube.com/watch?v=Cgp8_wNtyQk, Train Station https://www.youtube.com/watch?v=1FYUWwle97Q; BK201Tach "Co op Campaign - Seoul 1/2, 2/2 - Split Screen" https://www.youtube.com/watch?v=65Ls9P9GwKE + https://www.youtube.com/watch?v=cLMkZMd3nwE; "No commentary dog" Xbox 360 backward-compatibility split-screen part 1 https://www.youtube.com/watch?v=nNiX9-Mwk20; BK201Tach bloopers https://www.youtube.com/watch?v=BdwhJtGy7a8.

### 1.11 Loading screens

- XBM says the loading screen gives mission clues / hints [ONE SOURCE: XBM]. 09 lists "loading-screen hints" as a signpost [ONE SOURCE: XBM].
- The download packages ship `load_map_*.dds` loading-map textures [ONE SOURCE: XBDLC].
- PS2/GC have load breaks between sub-levels; NWR criticises long, frequent loading through the menus and between sections [ONE SOURCE: NWR]. A Steam user reported Seoul 3 (and Train Station) crashing at the loading screen on PC [ONE SOURCE: Steam].

### 1.12 Interface around the HUD (menus, pause, options, end screens)

- **Xbox co-op menu:** Xbox Live / Split-Screen / System Link / Options; then profile selection. Live menu: Quick Match, OptiMatch, Create Mission (choose mission, mode, difficulty, language), Friends, Players, Messaging, Download (new content) [ONE SOURCE: XBM]. Xbox match-creation options include **FRIENDLY FIRE** next to mode, difficulty, language, friends-only and voice-only [ONE SOURCE: XB477 `PreGameMenus.int` [OPTIONSTITLE]; the string is also in PC105's copy].
- **PC co-op menu:** LAN, Online, Settings; the CoopCommon section lists name, mode, mission, difficulty, skills, language, voice-only, with **no friendly-fire option**; `SplinterCell3Settings.ini` sets `b_friendlyFire=true` [ONE SOURCE each: PC105; PC conclusion INFERRED / UNCERTAIN: R-08].
- **PS2 co-op menu** (offline, under Solo/Co-op): Training, Campaign, Options, Hall of Fame (high scores) [ONE SOURCE: PS2M]. The Hall of Fame stores team scores, time and a "Stealth Award" [ONE SOURCE: PS2M].
- **Pause menu (Xbox and PC):** Quick Save, Save and Load. Saving waits for the teammate; the host can ask to save "permanently" and the partner can accept or refuse. A co-op save reloads only with the same teammate (join fails with "you don't have the same saved game"; Xbox asks you to add the partner to your friends list) [CONFIRMED - several sources: `InGameMenus.int` / `PreGameMenus.int` both builds]. PC readme 1.02: fixed a crash when saving in co-op; you must save from the Pause menu [ONE SOURCE: PCDVD readme].
- **Voice options (Xbox):** voice masking, voice through TV speakers, voice detection, voice detection sensitivity (how much guards hear you), Quick Match restricted to headset users [CONFIRMED - several sources: XBM pp.22, 26; PRIMA; `PreGameMenus.int`].
- **PS2 options:** "shadow calibration" (brightness calibration); separate music / effects volume; headset settings [ONE SOURCE: PS2M].
- **PC audio menu:** EAX and Dolby options [ONE SOURCE: Steam user].
- **End screens:** each mission ends with an **Objective Review** (co-op shows only Completed or Failed) and **Mission Statistics** (alarms, kills, knockouts, civilians) [CONFIRMED - several sources: XBM, PS2M]. Each agent gets an individual percentage score compiled from team statistics [CONFIRMED - several sources: PRIMA, RUW]. The "you were identified / detected" state counts: perfect score needs no kills or injuries (knockouts are free), never recognised as an intruder, no bodies found, no alarms, all primary, secondary and opportunity objectives [CONFIRMED - several sources: PRIMA, XBM, PS2M].
- **Mission-specific "game over" screen:** the menu has a game-over state that waits for the teammate; no string covers both agents down at once [ONE SOURCE: game text, gap_closing_gamefiles.md R-03].

---

## 2. Prompts

### 2.1 The context interaction menu ("interaction system")

- **What it is:** the HUD "interaction system" lists the actions possible at the agent's position; the player picks one with the normal Interact button [CONFIRMED - several sources: XBM, PS2M, PRIMA].

| Platform | Interact (contextual moves, heal, share, sync) | Co-op Action (free moves: Boost, Tomoe Nage, Human Ladder) | Tag |
|---|---|---|---|
| Xbox | **A**, via the Interaction menu | **Black** button (replaces the whistle) | [CONFIRMED - several sources: XBM diagram + text, FW controls] |
| PS2 | **X** | **L2** (replaces the whistle) | [CONFIRMED - several sources: PS2M, FW controls] |
| GameCube | **A** | **Z + D-pad Left** (Z is a modifier; the same combo whistles in solo) | [ONE SOURCE: FW controls page] |
| PC | **Space / Enter** | **F**, also **Page Down** | [ONE SOURCE: FW controls page] |

- **Full Xbox co-op default diagram (XBM p.20):** left trigger = KO attack / fire secondary; right trigger = lethal attack / fire primary; Y = jump; X = equip item; B = crouch; A = interact; Black = co-op action; White = quick inventory; Back = OPSAT menu; Start = pause; D-pad = night / thermal / sticky camera (and EMF); right stick = camera, its click = EEV [ONE SOURCE: XBM]. The shared Xbox controller layout labels a button "camera / EEV" [ONE SOURCE: XB477].
- **Named menu entries** (contextual moves and team interactions appear as named entries in the HUD Interaction menu, **only at valid spots**) [CONFIRMED - several sources: XBM, PS2M, PRIMA]:

| Entry (as recorded) | Use | Tag |
|---|---|---|
| "Initiate Rappelling" / "Complete Rappelling" | Dual Rappelling at a rope anchor | [exact labels ONE SOURCE: PRIMA] |
| "Initiate Hangover" / "Complete Hangover" | Hang Over Teammate | [CONFIRMED - several sources: XBM + PRIMA] |
| "Initiate Climb Shoulder" / "Complete Climb On" | Stand on Teammate's Shoulders | [labels ONE SOURCE: PRIMA; move CONFIRMED - XBM, PS2M] |
| "Accept View Sharing" | Watch the partner's sticky-camera feed | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| "Share Equipment" / HUD string **"Share Equip."** | Give a dot-marked item | [CONFIRMED - several sources: XBM, PS2M, PRIMA, XB477 + PC105 HUD.int] |
| **"Heal Teammate"** | Revive a downed partner with the adrenaline syringe | [CONFIRMED - several sources: Equipments.int/HUD.int both builds, XBM] |
| **"Extraction"** | End the mission at the extraction zone | [ONE SOURCE: XB477 HUD + Nuclear Plant text] |
| **"Defuse"** (generic) | Bomb devices | [ONE SOURCE: HUD text, gap_closing_gamefiles.md R-20] |
| **"Crane Communication"** | Crane spotter's voice commands; picked "at the top of the HUD" | [ONE SOURCE: XBM p.27] |

- **Crane prompt (Xbox/PC Chemical Bunker):** pick the "Crane Communication" interaction at the top of the HUD, then click-and-hold the left stick up / down / left / right = "Back" / "Forward" / "Left" / "Right", + left trigger = "Lower", + right trigger = "Raise", release = "Stop" [ONE SOURCE: XBM p.27]. The PC manual describes the partner giving voice directions for the crane [ONE SOURCE: PCDVD manual + an in-level e-mail "Crane is back!"].
- **Synchronized devices without a headset:** the first player selects the action and presses A, the second does the same, and the game syncs them automatically (dual retinal scanner explicitly covered) [CONFIRMED - several sources: XBM p.27, PRIMA, which adds that this makes synchronized puzzles easier online without a headset].
- **Shared device screens were a prompt failure.** "Defuse" opens a device screen at the Train Station bomb; two brothers on PC could not work out the inputs for it or for a two-player laser grid, and nobody answered (AnandTech 2008: https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/) [ONE SOURCE: forum]. PC players report being unable to complete the cryo mixing (and wire cutting): they can scroll choices (**A/D**) but cannot confirm (2020 Steam thread); a 2014 Steam thread reports nothing happening at the cryo tank on PC while it worked on Xbox [CONFIRMED - several sources: Steam x2 + AnandTech]. The bomb is the single most-asked "how do we do this" moment in comments (English, Spanish and Portuguese players ask which key cuts the wire) [CONFIRMED - several sources: 6+ comments across NrooRPC9cog, xjynpfObTLs, LY9-0Dk-YHk, ge7dEnjp6MU]; on PS2 the cut is the X button [ONE SOURCE: YouTube comment on ge7dEnjp6MU]. Community criticism: inputs for shared devices unclear (bomb, laser grid, door code) [CONFIRMED - several sources: Reddit 1g21m8q + many YouTube help requests + AnandTech 2008]. [ANALYSIS] The shared device screen needed on-screen input prompts and a visible indication of which wire is live and how much time is left.
- **Two-station mixing (Chemical Bunker):** each agent follows his own colour sequence at Station A / Station B (chambers labelled A/B above the doors); colours blue, red, violet, green, yellow, aqua; user A green/red/violet, user B blue/yellow/aqua; 3 inputs on Normal, 4 on Hard, 5 on Expert; randomised [CONFIRMED - several sources: XB477 + PC105 for colours and two-person rule; per-user split and step counts ONE SOURCE: Fandom en/ru notes; Station A/B labels CONFIRMED - Prima + Neoseeker].
- **Tomoe Nage aiming:** after pressing Co-op Action the initiator steers a **target reticule**; **red = invalid / impossible** [CONFIRMED - several sources: XBM, PS2M, PRIMA].
- **Graceful failure prompt:** a free move started where there is not enough room makes the agent **shake his head** and the controller **vibrates**; no penalty [ONE SOURCE: XBM p.23].
- **Versus comparison (not co-op):** in Versus a Boost icon appears lower-left only where a Boost is possible [ONE SOURCE: PRIMA]; Xbox Versus uses White to start / finish a co-op move and A to heal partner, give / accept gadget [ONE SOURCE: XBM p.31]; spies "nurse" each other via HUD interact (Xbox/PC) [ONE SOURCE: PRIMA].
- **N-Gage / DS interaction list:** the N-Gage text table has 37 interaction verbs (open/bash door, lock pick, hack computer, hack panel, heal ally, grab, interrogate, optic cable, rappel, switch on/off, use keypad and pick-ups). None is a boost, ladder, throw or other two-man move; the only partner action is **"HEAL ALLY"** [ONE SOURCE: NG-TXT; "no co-op moves" conclusion INFERRED / UNCERTAIN].

### 2.2 Co-op move prompts (the handshake)

- **Two-step contract:** one player initiates (adopts a pose and waits); the other walks over and completes with the same button or menu entry; only then does the animation play [CONFIRMED - several sources: XBM pp.24-26, PS2M, PRIMA].
- **Visual prompt:** the partner's HUD shows the **Co-op Action key icon** when the other is ready for a co-op move or interaction [CONFIRMED - several sources: XBM p.23 item 10, PS2M item 10].
- **Audio prompt:** an automatic voice line tells the partner the initiator is waiting; another plays on completion [CONFIRMED - several sources: XBM, PS2M, PRIMA] (see §4.6).
- **Player descriptions of the prompt in practice:**
  - GameCube first wall in training: stand with your back to the wall and press the co-op input (Z + D-pad left on GC); the partner faces you, crouches and presses the same, and the boost plays. A first-time player says they were stuck at "the very first bit" [CONFIRMED - several sources: 2 commenters on https://www.youtube.com/watch?v=gm9uYnMw9KA].
  - PS2 human ladder: the agent who was boosted up must press the co-op button **again after landing** so the partner can climb him [ONE SOURCE: comment on https://www.youtube.com/watch?v=gy1Vt3pxX8U].
  - Input ambiguity (crouch = boost, stand = throw); the tutorial assumes solo knowledge [CONFIRMED - several sources: Steam, JV] (12 A20).
  - Co-op moves clunky and awkward to execute at times [CONFIRMED - several sources: Reddit 1g21m8q + YouTube help requests].
- **Missions have no move markers:** outside training there are no floor markers; ledges and windows read as climbable at a two-person height [ANALYSIS, 05 §2]; contextual moves are signposted only by the menu entry appearing at the anchor [CONFIRMED - several sources: XBM, PS2M, PRIMA].

### 2.3 Heal Teammate

- **Prompt:** HUD interaction "Heal Teammate" (Xbox A / PS2 X) when standing over the downed partner [CONFIRMED - several sources: XBM, PS2M, PRIMA, Equipments.int/HUD.int both builds]. Training note: you heal your partner, if you have a syringe, by standing over him and interacting [CONFIRMED - several sources: XB477 + PC105 `P_00_Training_COOP.int`]. PC default key: **Insert** = revive [ONE SOURCE: PC105 ini].
- **Item:** "Adrenalin Syringe" (internal REVIVESYRINGE), an experimental adrenaline boost injected into an incapacitated person's torso [CONFIRMED - several sources: Equipments.int both builds].
- **Rule:** about **30 seconds** to reach the downed partner or the mission fails; restores about half health (PRIMA) / 50% (RUW); one syringe per agent on Xbox/PC, so two revives per team per mission ("twice per game" in both manuals) [CONFIRMED - several sources: XBM p.25, PS2M, PRIMA, RUW, PCDVD manual p.13, training text].
  - Earlier source said otherwise: PRIMA's basics page says each agent carries **two** adrenaline shots. **Corrected by** the in-game training text on Xbox and PC (one each) and PRIMA's own Xbox/PC gear boxes and RUW tables (1 per agent per mission). PS2/GC sub-levels give **2 per agent** per FW tables [ONE SOURCE: FW; PS2/GC count unchecked in game, see 06-open-questions.md, R-03].
- **Downed agent's view / prompt:** not documented [UNKNOWN - see 06-open-questions.md] (see §5.5).
- Teammate status (partner health) on the Xbox HUD is the visual cue that the partner is hurt or down [ONE SOURCE: XBM p.23].

### 2.4 Share Equip.

- **Prompt:** equip an item, approach the partner and pick "Share Equipment" (HUD string "Share Equip."); only items marked with a **dot** in the inventory can be given; the request can be cancelled before it is accepted [CONFIRMED - several sources: XBM, PS2M, PRIMA, game text both builds; cancel ONE SOURCE: PS2M].
- Training pop-ups explain it (only items marked with a dot can be shared) [CONFIRMED - several sources: XB477 + PC105 + PC manual].
- **Unused training note:** the Training map has an e-mail (dated 06/23/07, "Dan" to "Seb") explaining Share Equipment, and a designer comment in French says that note is not used for now and exists only so it gets translated. So the tutorial note was cut, not the feature [ONE SOURCE: XB477 training `.lin` + `00_Training_COOP.int`]. Earlier source said: the Fandom wiki labels this text as cut content (deleted data), and Fandom says the date comes from the PS3 version's game files, not on-screen text [ONE SOURCE: FAN]; **corrected by** the designer comment (R-04 closed).

### 2.5 Extraction

- **Prompt:** an "Extraction" HUD interaction exists (also listed in the Nuclear Plant text) [ONE SOURCE: XB477 HUD text; XBDLC/PC105 Nuclear Plant text]. The co-op code has a dedicated success volume class `ECoopSuccessVolume` plus a `CoopSuccessInteraction` [ONE SOURCE: XB477 `common.lin`]. [INFERRED / UNCERTAIN] Extraction is triggered by an interaction inside a zone.
- **Extraction places (Xbox/PC)** [CONFIRMED - several sources: XB477 + PC105 + XBDLC text]:
  - Panama: back to the truck in the exterior courtyard.
  - Seoul: take Jong to the truck outside the cyber cafe (designer comment: dropping Jong near the truck = mission success).
  - Chemical Bunker: the Zodiac at the end of the missile-boat dock (a designer comment says a message fires at the Zodiac if objectives are incomplete).
  - Train Station: no extraction; it ends by jumping onto the roof of the passing subway car (smash through a glass dome) [method ONE SOURCE: PRIMA]. Suru's run reaches "Extraction" at 13:30 [ONE SOURCE: https://www.youtube.com/watch?v=-JnlamHBZrc].
  - Nuclear Plant: out of the Radiochemistry Laboratory's side door (speedrun.com Any% Co-op timing ends at the Nuclear Plant evac doors).
  - UN HQ: mission completes after the bomb is defused (no extraction objective).
- **Whether both agents must be present:** no string says so [UNKNOWN - see 06-open-questions.md, R-09]. PS2 Team Training hint: the last area needs only one player to reach the exit point [ONE SOURCE: Jake "Ziggity" Steven, https://www.youtube.com/watch?v=obcKEeRniRw].

### 2.6 Training panels (Xbox/PC Training Facility)

- **Blue wall panels** explain each move and gadget; they have a **"Replay Tips"** option [ONE SOURCE: IGNW training].
- **Reading the panels is an objective** (the first one: "read the wall panels that explain moves and equipment") and is tracked for score: a 100% rating requires **re-reading at least one panel** [CONFIRMED - several sources: FAN + V339 (https://www.youtube.com/watch?v=2VRGQUT2JvQ)]. RU Fandom says skipping the read-the-panels objective lowers your rating [ONE SOURCE: RUW]. V339 calls the panel re-read an "optional objective" [INFERRED / UNCERTAIN].
- **Training pop-ups** (game text `P_00_Training_COOP.int`, both builds): heal a downed partner by interacting, each agent carries one adrenaline boost so the revive can only be done twice per mission; Share Equipment; when one agent gets information from a computer, both agents' OPSATs are updated [CONFIRMED - several sources: XB477 + PC105].
- **Not taught by name:** shoulder-stand, Share View, revive and Share Equipment (revive and sharing are in pop-ups) [CONFIRMED - several sources: FAN objective list; R-04].
- Whether panels give voice-over: [UNKNOWN - see 06-open-questions.md].
- The co-op tutorial teaches only co-op moves and assumes single-player knowledge; keyboard / mouse is obtuse [ONE SOURCE: Steam].
- **PS2/GC Team Training:** no panel or prompt description recorded [UNKNOWN - see 06-open-questions.md, R-05].

### 2.7 Striped floor squares

- In training, **striped squares on the floor** mark where co-op moves are performed (e.g. crouch on a striped square for the Short Scale; Hangover from a striped square on the roof) [ONE SOURCE: IGNW training].
- In missions: no markers are documented [ANALYSIS, 05 §2].

### 2.8 Jammer indicator (on the gun)

- The co-op-only Jammer (the pistol's OCP held on target) shows a **red light** that turns **green** on a jammable target; it is a visual cue, not an audio one [ONE SOURCE: XBM p.25]. Moving cancels it; charge drains while held and refills; tapping stretches the charge [CONFIRMED - several sources: XBM pp.25-26, PS2M, PRIMA].

### 2.9 Objective notifications

- Objectives **update during the mission** as intel arrives, e.g. Seoul: the chemist "has been moved"; Panama: the archive data turns out to be partially deleted, so the server backups must be reached; Train Station: a call is about to come in on a payphone [CONFIRMED - several sources: FW, game text].
- In-mission comms (including Lambert's guidance) appear in the communication box at the top of the screen [CONFIRMED - several sources: XBM p.23, PS2M].
- **Designer-placed message triggers** (Nuclear Plant level package): messages fire when players approach the security doors before opening them, when they are on the stairs to the turbine room, when they are on the footbridge outside the Lab, and when they access the archives (completes objective `OBJ_55_P_20`, co-op mission number 55) [ONE SOURCE: XBDLC `05_NuclearPlant.lin`]. Lambert scolds players who linger with radioactive material instead of going upstairs [CONFIRMED - several sources: XBDLC + PC105].
- **Seoul:** a 5-minute timer with Lambert warnings at each minute after the plane is shot down [CONFIRMED - several sources: XB477 + PC105].
- **UN HQ:** controller timer lines at 20, 10, 5 minutes and 60 seconds; "Kim is no longer a threat" (`DefeatKim`); `InterogateKim` has an empty speech line [ONE SOURCE each: XBDLC/PC105 patterns].
- **N-Gage/DS Breakdown:** a second radio line repeats that both switches must be pressed together, which looks like a hint after a failed or single press [lines CONFIRMED - several sources: NG-TXT + FW; hint reading INFERRED / UNCERTAIN].
- **Training:** each objective is revealed as its station is reached [INFERRED / UNCERTAIN: from per-station wording].
- **Train Station:** whether objectives 4-6 appear only after the call or are listed from the start is not stated [INFERRED / UNCERTAIN].
- How an objective update looks on screen (sound cue, banner, icon behaviour): [UNKNOWN - see 06-open-questions.md].

### 2.10 Controller lines as text only (downloads)

See §1.6. Both download missions (Nuclear Plant, UN HQ; Xbox/PC) deliver every Lambert briefing and in-mission line as on-screen text only [CONFIRMED - several sources: YouTube comments, Reddit v5jncz, Steam threads].

### 2.11 Mission notes as hints

- Seoul (Xbox/PC, game text): Jong must stay alive; gunfire may not be aimed at you (a war is on); turrets can be disabled with the Jammer; disable the tanks by climbing on each other's shoulders; hotel back door code 7649 (computer works only after power is restored); medkit in the hotel bathroom; guards on the temple balconies; an old sewer links the front and back of the temple; fish-market rooftops let you move unseen; ammo in the small fish store; smoke grenades in the back of the extraction truck [CONFIRMED - several sources: XB477 + PC105].
- Panama (Xbox/PC): two retinal scanners at the Archive room, easiest with the VP on one scanner and any guard on the other, both at once; if the VP is unconscious you must hack; motion sensors in the meeting room and exposition room; laser grid disabled with the Jammer (an e-mail jokes that its breaker is inside the grid); key codes - exposition area 2341, server-room-side to exposition 1534, hall outside billiards 1523, VP office to gallery 3245, VP private elevator 3298, VP's archive computer 9728 (from interrogating the VP) [CONFIRMED - several sources: game text both builds].
- Nuclear Plant: the Central Archives are in the Main Control Room; the Main Control Room is near the turbine area; a security camera covers the stairs in the turbine area; the door to the Main Control Room is locked by a retinal scanner; the Radiochemistry Laboratory is linked to the power plant by an external footbridge; lasers protect the corridor to the footbridge; the Lab's Server Room is locked by a retinal scanner [CONFIRMED - several sources: XBDLC + PC105].
- UN HQ: lethal force on UN guards and civilians not allowed; mission aborted if a general alarm is called; emergency doors open only from the inside; Security Control Room on the 22nd floor [CONFIRMED - several sources: XBDLC + PC105].
- [ANALYSIS] "Objective text that names places" is the main navigation signpost (09 §3); Nuclear Plant and UN HQ notes read like a route script.

---

## 3. Light and sound meters

### 3.1 Light meter (stealth meter)

- **Each agent's HUD shows his own stealth (light) meter** [CONFIRMED - several sources: PRIMA, XBM, PS2M]. At the far left the agent is effectively invisible; the more light on the agent, the further away guards can see him; in a brightly lit space any guard with clear line of sight notices at once [CONFIRMED - several sources: PRIMA, XBM, PS2M].
- **The meter overrides appearance:** the meter, not how dark the screen looks, decides visibility [ONE SOURCE: PRIMA]. [ANALYSIS] A known readability gap: what players see and what the system computes can disagree.
- **Partner's meter:** no reported way to see what the partner's meter reads; no partner-exposure indicator exists [ONE SOURCE: PRIMA, EG; listed as a gap in 10 §7 and 13 #11] [UNKNOWN - see 06-open-questions.md].
- **Light as a shared resource in co-op:** one agent kills a light so the other can move, or holds a light off with the jammer (PS2/GC Seoul) [CONFIRMED - several sources: PRIMA]. Almost every artificial light can be shot out, switched off or temporarily disabled with the jammer; disabling a light alerts nearby guards [CONFIRMED - several sources: PRIMA, FW, WP].
- **Alarm counter above the meter:** players were confused by HUD symbols above the light meter (likely the alarm counter) in Train Station ("Train station - We're stuck") [ONE SOURCE: Neoseeker search snippet].
- **PS2 brightness:** PS2 options include "shadow calibration" [ONE SOURCE: PS2M].

### 3.2 Sound meter vs the ambient marker

- **Layout:** CT adds a **noise meter under the light (stealth) meter**. Bars show the agent's noise and a marker shows the ambient level. Noise above the ambient marker is audible to guards [CONFIRMED - several sources: Wikipedia, PS2M, PRIMA, NWR, Empire, TechEnclave, PC Games].
- **Prima's description:** a **transparent slider** = ambient level; **bars past the slider brighten** when the agent is audible; enemies fire at the last spot where noise exceeded ambient [ONE SOURCE: PRIMA "Sound & Silence"].
- **Co-op HUD has the same meter**, described as showing the spy's noise and how noisy the environment is [CONFIRMED - several sources: XBM p.23, PS2M]. Each agent has his own noise meter [CONFIRMED - several sources: XBM + PS2M].
- **What changes noise** [details ONE SOURCE: PRIMA; noise-vs-ambient CONFIRMED]:
  - Analogue speed sets noise; crouching is quieter; walking with a gun drawn is silent under normal conditions, so use it where ambient is zero.
  - Grass and carpet are quiet; wood and metal are loud [CONFIRMED - several sources: Prima, PC Games, Giant Bomb / Fandom stealth snippet].
  - Grab / interrogation and OPSAT talk are silent to the AI. OCP use is silent but the disabled device may crackle, which works as a lure.
  - Hitting a person is quieter than shooting a bulb; a miss into a wall is loudest.
  - Changing rifle attachments sounds noisy but is not "heard".
- **Ambient sources move the marker:** generators, storms, machinery, radios, TVs, hammering machines, passing trucks, thunder, and the war ambience in Seoul raise the ambient marker and open windows to move; when generators are off it gets quiet and dangerous [CONFIRMED - several sources: PRIMA, PC Games DE, Substack review, NWR]. Ubisoft calls it a "sound masking system" [ONE SOURCE: bonus-disc documentary]. PC Games (DE): the noise bar limit shifts with background noise [ONE SOURCE].
- **Co-op Seoul:** the mission notes say gunfire may not be aimed at you because a war is on [CONFIRMED - several sources: game text + FW]; [ANALYSIS] the battlefield soundscape can run at full volume without players reading it as detection.
- **Nuclear Plant:** loud machinery should mask noise (Ubisoft PR stresses "loud machines"), but no source documents a masking mechanic there [INFERRED / UNCERTAIN].

### 3.3 Microphone voice on the meter

- **Guards hear real voices (Xbox Live, and PC headsets online):** the headset microphone feeds the player's voice into the game world; nearby guards can hear you if you speak too loudly; you can talk loudly on purpose to attract or distract guards [CONFIRMED - several sources: XBM p.26, PRIMA, GF (GamesFirst), GameSpot hands-on snippet, TeamXbox].
- **On the meter:** players remember that **microphone voice registered on the in-game sound meter**, so guards could hear talking at full volume, and that you could deliberately make noise into the mic to attract or distract guards [CONFIRMED - several sources: Reddit mngqa0 (2 commenters), vpwdry, 1e9pwjx]. It is the most-praised systemic detail in community memory [CONFIRMED - several sources: several Reddit threads].
- **Numbers:** voice detection sensitivity sets the detection radius; the **default value 50 = about 2 m in-game** for a normal speaking voice [CONFIRMED - several sources: XBM, PRIMA]. The feature can be switched off in Options under Xbox Live [ONE SOURCE: XBM].
- **No whistle in co-op:** the whistle button becomes the Co-op Action button, so the voice is the only vocal lure [CONFIRMED - several sources: PRIMA ("agents can't whistle"), XBM controller diagram, FW controls page, Steam user]. GamesFirst says whistling into the headset can attract a guard without a button press [ONE SOURCE: GF]. Earlier claim: GamesFirst framed headset whistling as replacing the button; the retail PS2 manual still has a "Whistle/Co-op action" button [INFERRED / UNCERTAIN: single preview].
- **Ambient cover for voices:** to talk near guards, find louder ambient sound to cover your voice [ONE SOURCE: GF].
- **Always-on:** the headset is described as constant contact with the partner [ONE SOURCE: PRIMA].
- **Partner volume:** the PC manual says the sensitivity setting does **not** change partner voice volume [ONE SOURCE: PCDVD manual]. Whether partner-to-partner chat fades with in-game distance: [UNKNOWN - see 06-open-questions.md, R-22].
- **PS2/GC:** the PS2 USB headset is documented for chat and lobby generally (and to "spy on enemies" via gadgets in Versus), but PS2/GC co-op is offline split-screen, so voice detection by guards applies to Xbox and PC online co-op only [split-screen CONFIRMED - several sources: GF, Co-optimus snippet; PS2 voice INFERRED / UNCERTAIN].
- **Today on PC:** the in-game voice option is greyed out, so players use Discord [ONE SOURCE: Reddit vpwdry].

### 3.4 Light and noise rules seen from the HUD (summary)

- [ANALYSIS, 10 §7] Each player has a personal meter pair (light plus noise) and sees the partner's health on Xbox, so each player always knows his own exposure; the weak spots are that the meter overrides the visuals and no partner-exposure indicator exists.

---

## 4. Partner indicators

### 4.1 Blue and red goggle lamps

- **The two agents are told apart by goggle-lamp colour: one blue, one red** [CONFIRMED - several sources: Fandom Agent One / Agent Two pages, xisto forum snippet (split screen vertical, one red light one blue), Steam review "Spy Blue and Spy Red" (21672477), WP].
- **Mapping: Agent One = blue, Agent Two = red** [ONE SOURCE: FW; 03 and 06 tag it CONFIRMED via WP + FW and PRIMA + XBM + FW for the goggles row; 15 keeps "assignment SINGLE SOURCE"]. A Steam poster says the **host is blue** and the red agent (Agent 2) has the more lethal loadout [ONE SOURCE: Steam "SC:CT coop" (2022)].
- **Early screenshots had both agents blue** before red/blue were split [ONE SOURCE: Fandom].
- **Enemies cannot see the glow** (in fiction) [ONE SOURCE: Fandom trivia].
- **HDR bloom:** the PC SM3.0 HDR path adds bloom to the goggle glow (no anti-aliasing with HDR) [ONE SOURCE: bit-tech; HDR path CONFIRMED - bit-tech + TechEnclave].
- **Fan names:** "Spy Blue and Spy Red"; "Steve and Bob" / "Bob and Steve" in fan slang after G4 X-Play's machinima [CONFIRMED - several sources: Steam, Reddit 1fiyo7i, reception.md].
- **N-Gage/DS:** Hacker = blue tag, blue goggles; Assault = red tag, **purple** goggles [ONE SOURCE: FW].
- [ANALYSIS] Colour-coded light points identify the partner in darkness and on split-screen, where silhouettes vanish (15 §3.4).

### 4.2 Markers, waypoints and pings

- **On-screen partner marker / waypoint:** none described in any manual or Prima [ONE SOURCE each: XBM, PS2M, PRIMA - absence; UNKNOWN - see 06-open-questions.md, R-11].
- **Pings / gestures / world markers:** none documented [UNKNOWN - see 06-open-questions.md].
- **Map legend has no teammate entry** (Alarm, Objective, Player, Location, Triggered Alarms) [ONE SOURCE: `InGameMenus.int`].
- **Reviewer complaint:** partners wander looking for each other with no map (Eurogamer); conflicting plans get you shot (NWR) [ONE SOURCE each; counted as "Coordination / navigation friction: 2" in reception.md]. 03 §10 tags "Losing each other" [CONFIRMED - several sources: EUR, NWR, EG].
- **Community memory** about finding each other is about voice and verbal coordination ("yelling at each other when someone got spotted") [ONE SOURCE: gap_closing_community.md R-11; no new source on markers].
- **Communication without words:** one player finished the hardest difficulty with a stranger without mics, by miming; another played with Korean players and used jumps and visual cues; another coordinated moves with a stranger who spoke another language [CONFIRMED - several sources: 3 independent YouTube comments].
- **N-Gage/DS:** the DS touch screen has a radar [CONFIRMED - several sources: IGN DS + NWR press release]; whether it shows the partner: [UNKNOWN - see 06-open-questions.md, R-23].

### 4.3 Teammate status (partner health)

- Xbox HUD item "Teammate status (partner's health)" [ONE SOURCE: XBM p.23]. Not on the PS2 HUD list [ONE SOURCE: PS2M]. Whether it shows the downed state distinctly: [UNKNOWN - see 06-open-questions.md].

### 4.4 Co-op Action icon

- Appears on the partner's HUD when the other is ready for a move or interaction (see §2.2) [CONFIRMED - several sources: XBM p.23, PS2M].

### 4.5 Share View (partner's camera feed)

- When one agent uses a sticky camera (a camera gadget), the other can pick **"Accept View Sharing"** to watch the feed [CONFIRMED - several sources: XBM, PS2M, PRIMA]. Share View works at any distance (team interactions are otherwise "near the partner") [ONE SOURCE: 05 §1 table].
- **Not in split-screen** [ONE SOURCE: XBM p.25].
- The sticky camera: launcher-fired (Agent One carries the launcher attachment on Xbox/PC); recon, noise lure (clicker) and knockout gas (the camera is destroyed after gas) [CONFIRMED - several sources: PS2M gadget text, XBM, PRIMA, FW]. A camera plus thermal or night vision can read keypad codes guards type in UN HQ (wiki tip) [ONE SOURCE: FW UN HQ trivia].
- [ANALYSIS] Share View turns the camera into an overwatch tool: one player scouts and the other reads the same picture.

### 4.6 Voice (headset and automatic lines)

- **Headset (Xbox Live; PC online):** see §3.3. Xbox Communicator recommended; options: voice through TV speakers, voice masking, Quick Match restricted to headset users [CONFIRMED - several sources: XBM pp.22, 26; PRIMA; GF].
- **"Alternative Voice Communication"** switches on automatically for an agent without a headset; it only works in specific situations [CONFIRMED - several sources: XBM p.26, PRIMA]:
  - Initiating a co-op move or interaction plays a recorded message telling the partner he is waiting; another plays on completion [CONFIRMED - several sources: XBM, PRIMA].
  - When an agent's health hits zero, a message tells the partner he needs help [ONE SOURCE: PRIMA].
  - Hangover (suspended agent): click-and-hold left stick + up/down sends "Up" / "Down"; release sends "Stop" [CONFIRMED - several sources: XBM p.27, PRIMA].
  - Dual Rappelling (rappeller): click-and-hold left stick + left/right sends "Left" / "Right"; release = "Stop" [CONFIRMED - several sources: XBM, PRIMA].
  - Crane: see §2.1 ("Back" / "Forward" / "Left" / "Right" / "Lower" / "Raise" / "Stop") [ONE SOURCE: XBM p.27].
- **Dual rappel split of control:** one player controls sideways movement (the rope holder, with the triggers: Xbox L/R triggers, PS2 L1/R1) and the other controls height (left stick) [CONFIRMED - several sources: XBM, PS2M, PRIMA; Reddit 1qfdvur].
- **Canned agent banter:** after a rescue players remember the agents' "Damn, we're good" line; also the "we're the first" exchange about other Splinter Cells [CONFIRMED - several sources: Reddit 1megyet, 1g21m8q, 1rz5d99, ijtifz, 1fiyo7i]. In Seoul the trainees assume "Fisher" is a call sign because they believe they are the first Splinter Cells [ONE SOURCE: Fandom].
- **Text chat:** Xbox chat box; PC "Say (Coop)" on T / End [ONE SOURCE each: XBM; FW controls].

### 4.7 Shared intel

- Reading a computer updates both agents' OPSATs [CONFIRMED - several sources: training pop-up text in XB477 + PC105]. Joint interrogation: some intel (the Train Station key code 0315; the Seoul double) comes from both agents interrogating the same person together [CONFIRMED - several sources: game text].

### 4.8 Downed-partner voice line

- An automatic message tells the partner the downed agent needs help [ONE SOURCE: PRIMA]. 03 §6 and 10 §7 state that automatic voice lines announce moves and downed partners [CONFIRMED - several sources: XBM, PRIMA, for the system as a whole].
- The exact wording of the line: [UNKNOWN - see 06-open-questions.md].

---

## 5. Camera in co-op

### 5.1 Third-person camera (Xbox/PC, PS2/GC)

- **Control:** Xbox right stick = camera; its click = EEV [ONE SOURCE: XBM p.20]. The shared Xbox layout labels a button "camera / EEV" [ONE SOURCE: XB477].
- **Co-op camera behaviour** (distance, height, shoulder offset, field of view, collision, corner behaviour, how it frames the partner during two-person moves): **not documented in the research** [UNKNOWN - see 06-open-questions.md].
- **Vision overlays:** thermal and night-vision overlays slide over the HUD as if through Fisher's eyes [ONE SOURCE: GF (GamesFirst)]; the goggle overlay slides over the view like a lens [ONE SOURCE]. Night, thermal and EMF modes are all used in co-op (Xbox D-pad) [CONFIRMED - several sources: PRIMA, XBM controls]. EMF shows electronics glowing on a blue field (white on a bluish field) [CONFIRMED - several sources: Fandom goggles page, NWR]. The night-vision "whine" is remembered as iconic [ONE SOURCE: Steam 227082455]. Controller vibration also cues the live bomb wire: PRIMA's Train Station routes give thermal vision OR controller vibration on Xbox/PC and on PS2/GC (05 lists vibration under PS2/GC); a PS2 uploader says the bomb is hard without vibration [CONFIRMED - several sources: PRIMA, FW, YouTube PS2 comment on ge7dEnjp6MU].
- **Co-op animation:** co-op animation (three connected characters) was the hardest animation work, per lead animator Jacques Dussault [ONE SOURCE: Computer Graphics World, Mar 2005]. The bonus-disc documentary says the hardest part of co-op was two characters synchronising specific actions [ONE SOURCE: documentary]. Animation dev diary (https://www.youtube.com/watch?v=xocq_CIzuag, 4:57) may show paired animations [INFERRED / UNCERTAIN: not watched].

### 5.2 Split-screen camera

- Vertical split, Agent 1 left, Agent 2 right (see §1.10) [ONE SOURCE: PRIMA]. Each half has its own HUD [ANALYSIS: implied by the per-agent HUD lists]. Split orientation may follow the dashboard widescreen setting [INFERRED / UNCERTAIN: one forum user].
- Split-screen camera numbers (aspect, FOV per half): [UNKNOWN - see 06-open-questions.md].

### 5.3 Shoulder

- Whether the camera sits over a shoulder, can swap shoulders, or how it peeks around corners in co-op: [UNKNOWN - see 06-open-questions.md]. The research records nothing about CT's camera offset.

### 5.4 Share View feed

- See §4.5. The feed is the partner's sticky-camera view, accepted through the Interaction menu; not available in split-screen [CONFIRMED - several sources: XBM, PS2M, PRIMA; split-screen rule ONE SOURCE: XBM p.25].
- What the feed looks like on the receiving screen (full screen or inset, HUD shown or not, can the receiver still move): [UNKNOWN - see 06-open-questions.md].

### 5.5 Camera views when downed

- At zero health the agent falls unconscious ("knocked unconscious" / "critically wounded") and must wait for the partner [CONFIRMED - several sources: XBM, PS2M, PRIMA; FW Cooperative page].
- What the downed player's camera shows (own body, spectating the partner, a countdown) is not documented [UNKNOWN - see 06-open-questions.md].
- The menu has a game-over state that waits for the teammate [ONE SOURCE: game text].
- Fall damage downs rather than kills: in Chemical Bunker players can skip a lift ride by dropping down the shaft onto / near the partner and reviving at the bottom [ONE SOURCE: RUW].

### 5.6 Other viewing devices

- **Optic cable:** used under doors in co-op (IGNW Panama) [ONE SOURCE: IGNW].
- **EEV:** CT's remote scan / hack device. PRIMA says co-op agents cannot use it; the Xbox co-op diagram still labels a button "EEV", the PC binds key 4 to EEV mode, and the engine has EEV actions for scan, distance hack, remote access and laser designation; no co-op file enables or disables it [CONFLICT: PRIMA (no) vs XBM diagram + PC105 ini (bound); UNKNOWN - see 06-open-questions.md, R-02].
- **Binoculars:** not in CT solo / co-op (replaced by EEV); only in the Versus spies kit [CONFIRMED - several sources: FW Binoculars page, XBM versus controls].
- **Sticky camera feed:** see §4.5.

### 5.7 Known numbers related to camera and display

| Number | What | Tag |
|---|---|---|
| 30-35 fps | PC co-op frame rate capped "for synchronization" | [CONFIRMED - several sources: multiple Steam reviews, Reddit 1m3rm7z, 1htj7ha] |
| 640x480 | Pretend3r played UN HQ (PC, 2005-06) on Normal at this resolution because of lag | [ONE SOURCE: Pretend3r] |
| Widescreen / FOV | A community widescreen fix (ThirteenAG, forced FOV) on only one PC causes co-op desyncs / disconnects; both players must run identical configs / FOV or remove the fix; "during the training hacking minigame, about 1 min into Panama" | [CONFIRMED - several sources: Steam threads 1651043958651257044, 540734423695895475; Steam guide 1762258050] |
| 4x-16x | Xbox One / Series backward-compatibility resolution boost | [CONFIRMED - several sources: Xbox Wire 2019 + Wikipedia BC list] |
| 256x128 | Download-map OPSAT map textures | [ONE SOURCE: XBDLC] |
| 2 m | Default voice detection radius (sensitivity 50) | [CONFIRMED - several sources: XBM, PRIMA] |
| 30 s | Time to revive a downed partner | [CONFIRMED - several sources: XBM, PS2M, PRIMA, PCDVD manual p.13] |

- Camera distance, FOV and offsets: [UNKNOWN - see 06-open-questions.md].

### 5.8 N-Gage / DS camera

- Full 3D third-person chase camera behind the agent on both handhelds [CONFIRMED - several sources: IGN DS, NWR, Pocket Gamer, video frames]. IGN (DS, Craig Harris, 28 Jun 2005): co-op works acceptably because both players share the same third-person control scheme, while Versus is unbalanced (mercs in first person with stylus aiming) [ONE SOURCE: IGN DS]. The DS touch screen holds a camera button per the NWR press release [ONE SOURCE: NWR].

---

## 6. Visual atmosphere that affects readability (brief; see 01-coop-levels.md for per-map detail)

- **Near-dark levels:** most levels are near-dark, which builds atmosphere but strains the eyes; reviewers advise raising brightness [CONFIRMED - several sources: Pocket-lint, VideoGamer, PC Games user comment].
- **Co-op maps brighter and smaller:** players call the co-op maps too small and lit too brightly compared with solo levels ("low-budget" feel) [ONE SOURCE: Reddit 1g21m8q, 2 commenters].
- **Reduced graphics:** co-op and Versus did not get the full single-player graphics upgrade [ONE SOURCE: GameRevolution]. A player says Versus has "no ambience" compared with single-player [ONE SOURCE: Steam 23239859].
- **Making darkness is the core co-op verb:** Prima's co-op walkthroughs constantly use light switches, shot bulbs, the OCP and a shot-out lit billboard: Panama halls and courtyard lampposts / chandeliers / elevator-car lights, Seoul neon signs shot out before climbing into the hotel, Chemical Bunker halls, the x-ray light board in the Operation Room and the Blue Room, Train Station repair area, escalators and lit billboard [ONE SOURCE: PRIMA co-op walkthroughs].
- **Lighting tech:** most lights are per-pixel omni and spot lights; normal mapping everywhere; PC SM3.0 adds HDR (16-bit floating-point buffer, tone mapping), soft shadows, hardware shadow mapping and parallax mapping [CONFIRMED - several sources: CGW, Wikipedia, PC Gamer, bit-tech, TechEnclave]. Special shaders brighten dark areas so that night vision is useful [ONE SOURCE: CGW, Dany Lepage].
- **Readability on weaker hardware (GameCube):** the GC build adds artificial lights where Xbox relies on moonlight, recolours a grey staircase bright yellow, has missing bats, and reduces EMF view to white boxes against the Xbox bluish field with pulsating white electrical objects [ONE SOURCE: NWR]. PS2 co-op maps are shrunk [CONFIRMED - several sources: WorthPlaying + NWR].
- **Palettes per co-op map:** no source describes palette, weather or time of day for any co-op map [UNKNOWN - see 06-open-questions.md]. Settings only: Training (Third Echelon facility, Fort Meade), Panama (PCA building, Panama City, office interiors), Seoul (war-torn streets, hotel, fish market, cyber-cafe, neon), Chemical Bunker (Nampo silo, labs, "Blue Room", cryogenic chamber), Train Station (Grand Central, repair area, subway, lit billboards), Nuclear Plant (Yongbyon), UN HQ (New York) [ONE SOURCE: Fandom + Prima]. Co-op weather is undocumented [UNKNOWN - see 06-open-questions.md].
- **Colour in general:** players remark on a surprising amount of colour in CT compared with modern games [ONE SOURCE: Steam 16492969]; one negative reviewer felt it lacks SC1's visual style [ONE SOURCE: Steam 145383153].
- **Creative director's later view:** old baked lighting was clean and readable for stealth; modern diffuse lighting and AO make it hard to read what is safe, so stealth lighting should be directed like stage lighting [ONE SOURCE: FRVR interview]. Players must know a guard is there before stepping into his path; a badly timed patrol is fixed by flipping where it starts [ONE SOURCE: dev diary 4].
- **Goggle silhouette:** the three-lens / three-dot goggle silhouette was designed as the hero's recognisable signature [ONE SOURCE: bonus-disc documentary, SC1 segment].

---

## Sources used for this file

**Files in /home/user/docs:**
- /home/user/docs/03_coop_overview.md (sections 1, 4-8, 10-12)
- /home/user/docs/05_coop_moves_catalogue.md
- /home/user/docs/06_gadgets_and_tools.md
- /home/user/docs/07_objectives_taxonomy.md
- /home/user/docs/09_pacing_and_flow.md
- /home/user/docs/10_ai_detection_and_alarms.md
- /home/user/docs/12_anti_patterns.md
- /home/user/docs/13_principles.md
- /home/user/docs/15_music_and_atmosphere.md (section 3 in full; 2.1, 2.3, 2.6, 7)
- /home/user/docs/OPEN_QUESTIONS.md
- /home/user/docs/02_coverage_matrix.md
- /home/user/docs/README.md
- /home/user/docs/04_mission_breakdowns/training.md, train_station.md, un_headquarters.md, nuclear_plant.md, seoul.md, chemical_bunker.md, panama.md, ngage_ds_campaign.md
- /home/user/docs/research_notes/coop_gadgets_controls_comms.md (in full)
- /home/user/docs/research_notes/gap_closing_gamefiles.md (in full; R-03, R-04, R-07, R-08, R-09, R-11, R-13, R-20, R-22)
- /home/user/docs/research_notes/gap_closing_community.md
- /home/user/docs/research_notes/music_and_atmosphere.md (sections 2-3, appendix)
- /home/user/docs/research_notes/systems_rules.md
- /home/user/docs/research_notes/coop_moves.md
- /home/user/docs/research_notes/mission_training.md
- /home/user/docs/research_notes/mission_train_station.md
- /home/user/docs/research_notes/mission_chemical_bunker.md
- /home/user/docs/research_notes/mission_seoul.md
- /home/user/docs/research_notes/mission_ngage_ds.md
- /home/user/docs/research_notes/platforms_versions.md
- /home/user/docs/research_notes/reception.md
- /home/user/docs/research_notes/videos.md
- /home/user/docs/research_notes/dev_and_design_intent.md

**External URLs cited in this file:**
- Xbox manual: https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory (PDF https://archive.org/download/xboxmanual_Splinter_Cell_3_Chaos_Theory/Splinter_Cell_3_Chaos_Theory.pdf)
- PS2 manual: https://archive.org/details/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA
- Prima eGuide: https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide
- PC105: https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601
- XBDLC: https://archive.org/details/og-xbox-dlcupdates (same file in https://archive.org/details/Original-Xbox-Live-Updates-and-DLC and https://archive.org/details/XbDLC2)
- XB477: https://archive.org/details/sc-3-xb-build-477-retail
- PCDVD: https://archive.org/details/scct_20250728
- Fandom API: https://splintercell.fandom.com/api.php and https://splintercell.fandom.com/ru/api.php
- IGN wiki: https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Training_Facility
- GamesFirst preview: https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/
- AnandTech 2008: https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/
- N-Gage Media Preview Kit: https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit_Image.iso/
- NG-TXT: https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240_Files.zip/
- GamesRadar DS review: https://www.gamesradar.com/splinter-cell-chaos-theory-2/
- Steam discussions: https://steamcommunity.com/app/13570/discussions/0/133262738417485094/ , https://steamcommunity.com/app/13570/discussions/0/828925849173270181/ , https://steamcommunity.com/app/13570/discussions/0/45350245387206844/ ; Steam guide https://steamcommunity.com/sharedfiles/filedetails/?id=1762258050
- Reddit: https://www.reddit.com/r/patientgamers/comments/mngqa0/ , https://www.reddit.com/r/gaming/comments/vpwdry/ , https://www.reddit.com/r/Splintercell/comments/1e9pwjx/ , https://www.reddit.com/r/Splintercell/comments/1g21m8q/ , https://www.reddit.com/r/Splintercell/comments/v5jncz/ , https://www.reddit.com/r/Splintercell/comments/1megyet/ , https://www.reddit.com/r/Splintercell/comments/1qfdvur/ , https://www.reddit.com/r/Splintercell/comments/1m3rm7z/ , https://www.reddit.com/r/Splintercell/comments/1htj7ha/ , https://www.reddit.com/r/Splintercell/comments/15s93fb/ , https://www.reddit.com/r/Splintercell/comments/1fiyo7i/
- speedrun.com API: https://www.speedrun.com/api/v1/runs?category=zd3xm8dn
- Videos: https://www.youtube.com/watch?v=11-wUk-tLaY , https://www.youtube.com/watch?v=gm9uYnMw9KA , https://www.youtube.com/watch?v=gy1Vt3pxX8U , https://www.youtube.com/watch?v=obcKEeRniRw , https://www.youtube.com/watch?v=2VRGQUT2JvQ , https://www.youtube.com/watch?v=-JnlamHBZrc , https://www.youtube.com/watch?v=3nLKhKGucII , https://www.youtube.com/watch?v=RXNrz5N-qZE , https://www.youtube.com/watch?v=lFHlkLTsKQI , https://www.youtube.com/watch?v=Cgp8_wNtyQk , https://www.youtube.com/watch?v=1FYUWwle97Q , https://www.youtube.com/watch?v=65Ls9P9GwKE , https://www.youtube.com/watch?v=cLMkZMd3nwE , https://www.youtube.com/watch?v=nNiX9-Mwk20 , https://www.youtube.com/watch?v=BdwhJtGy7a8 , https://www.youtube.com/watch?v=xocq_CIzuag , https://www.youtube.com/watch?v=8FiRUvq86sg , https://www.youtube.com/watch?v=LY9-0Dk-YHk , https://www.youtube.com/watch?v=ge7dEnjp6MU , https://www.youtube.com/watch?v=NrooRPC9cog , https://www.youtube.com/watch?v=xjynpfObTLs , https://www.youtube.com/watch?v=jry663Tx5bg , https://www.youtube.com/watch?v=phfqPfdFZdQ
- Wikipedia CT article: https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Chaos_Theory
