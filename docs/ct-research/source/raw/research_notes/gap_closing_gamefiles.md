# Gap closing from primary game files (archive.org)

Scope: text extracted from game data, shipped documents and the PC credits video, all found on archive.org. Only text and images were read; nothing was executed. Everything below is paraphrased; the few quotes are under 15 words.

## Primary sources (short names used below)
- **PC105** = item `tom-clancys-splinter-cell-chaos-theory_202601`, file `Tom Clancys Splinter Cell Chaos Theory.rar` - an installed PC copy at patch 1.05 (contains `05_NuclearPlant` and `07_UNhq` maps). Text came from `Tom Clancys Splinter Cell Chaos Theory/System/dynamic-pc.umd` (a packed archive; its file table at the end lists `Data\System\Localization\*.int` and `Data\Maps\*.ini`, which were cut out by offset/size). Also `System/SplinterCell3Settings.ini`, `System/SplinterCell3User.ini`, and `Data/Videos/Credits.bik` (credits are a video; frames were extracted with ffmpeg and read). FINAL SHIPPED TEXT.
- **XBDLC** = item `og-xbox-dlcupdates`, file `DLC and Title Update Downloads/Splinter Cell CT DLC Installer.rar` (same rar also in items `Original-Xbox-Live-Updates-and-DLC` and `XbDLC2`). Contains the two Xbox Live co-op downloads: `content/$c/5553003804902482/` = Nuclear Plant, `content/$c/5553003804902483/` = UN Headquarters, each with `Localization/*.int`, `Maps/*.ini`, `contentmeta.xbx`, map textures and the `.lin` level package. Xbox title ID folder 55530038.
- **XB477** = item `sc-3-xb-build-477-retail`, file `SC3XB_Build477_Retail.zip`: Xbox dev-kit asset dump dated 21-22 Feb 2005 (about a month before release, pre-DLC). Used: `Default/dynamicxbox.umd` (packed archive with all English `.int` localisation and `Maps/*.ini`), and the co-op level packages `Default/LMaps/{00_Training_COOP,01_Panama,02_Seoulthree,03_ChemBunker,04_GCS}/*.lin` (zlib-chunked; contain level-designer comments). GCS = Grand Central Station = co-op Train Station.
- **PCDVD** = item `scct_20250728`, file `SCCT.zip`: PC retail DVD. Used `SCCT/Manual/ENGLISH/Manual.pdf` (dated 16/02/05), `SCCT/support/Readme/English/Readme.txt` (v1.02) and `SCCT/Patch/splinter_cell_chaos_theory_1.00_To_1.05_euro.exe` (its embedded 1.05 readme is stored as plain text).
- Cross-check: the PC105 co-op mission text is word-for-word identical to XB477 for Panama, Seoul and Chemical Bunker; Train Station and Training differ only in small wording fixes (button names removed for PC, three null objective strings filled in). The DLC text in XBDLC and PC105 is identical. So XB477 = near-final, and PC and Xbox share one script.
- Xbox manual scan (`/home/user/raw/ia/xbox_manual.pdf`): 49 pages; the last scanned page is manual p.48 (Versus passive defences). It has NO credits pages, so it could not help R-12.

---

## R-12 Co-op designers and leads - CLOSED [SINGLE SOURCE - primary: PC105 `Data/Videos/Credits.bik`, read from frames at roughly 9-20 s and 36-45 s]
The credits video has a section "Single Player & Coop Mode Development Team (Montreal)". Co-op roles, as shown (spelling as on screen; names marked (?) were partly blurred):
- Co-op mode and PC version associate producer: Stephane Roy.
- Co-op mode lead game designer: Daniel "Berlu" Berube.
- Co-op mode lead level designer: Sebastien Galarneau, with the collaboration of Jonathan Dumont.
- Co-op mode level designers: Ariel Gauthier, Damien Galipot, Carl Lavoie, David Deschenes, Jonathan Dumont; with the collaboration of Martin Dufour.
- Co-op mode lead artist: Patrick Daigle (collaboration David Massicotte). Co-op mode art director: Jean-Francois Mignault (collaboration Patrick Daigle).
- Co-op mode modelers: Alexis Grzyb (?), Eric Fredette, Jesse Houston (?), Mathieu Fecteau, Nicolas Longchamps, Patrick Dubuc, Sandy de Montigny, plus at least one more name (collaboration Ian St-Louis).
- Co-op mode texture artists: Claude Gosselin, Marc Tetreault, Steve Fraser (collaboration Marc Salha).
- Co-op mode animators: Chi Chun Ng, Joseph Nasrallah.
- Co-op lead sound designer: Alexandre Carlotti.
- QA: co-op mode lead tester Alexandre Martel; co-op assistant lead tester Anthony Menard-Moquin; co-op lead tester PC version Alexandre Martel; separate co-op tester lists.
- Overall: producer Mathieu Ferland; creative director Clint Hocking; music composed by Amon Tobin; cinematics scored by Jesper Kyd. Versus was a separate team (Ubisoft Annecy). [SINGLE SOURCE]
- Note: `Credits.int` in both XB477 and PC105 is an unused, half-empty template (not the real credits). Ignore it.
- DLC authorship (inference only): the Nuclear Plant script pattern names are Italian words (`Magazzino`, `PompaShow`, `bimbo`, `ciccio`, `nondirmelo`), suggesting an Italian (likely Ubisoft Milan) team made at least that DLC map. The PC credits video does not list the DLC team. [UNCERTAIN - inference from identifiers]

## R-19 Nuclear Plant - UPGRADED (objectives, notes, briefing, route clues now primary) [VERIFIED - identical text in XBDLC `content/$c/5553003804902482/Localization/05_NuclearPlant.int` + `P_05_NuclearPlant.int` and PC105 `Data\System\Localization\05_NuclearPlant.int` / `P_05_NuclearPlant.int`]
- Story set-up (briefing): right after Grand Central, analysis of the defused bombs points to the Yongbyon nuclear plant in North Korea, believed to be a cover for military research; the three double-laser detonators came from there. Task: learn how many detonators Kim got and who helped him.
- Objectives (in order of the file): gather the Yongbyon complex blueprints (so Lambert can guide you); discover if Kim can attack again (Kim used 3 bombs in New York; learn how many he got); find out who helped Kim; exfiltrate to the primary extraction point, which is out of the Radiochemistry Laboratory's side door.
- Notes (route clues): the Central Archives are in the Main Control Room; the Main Control Room is near the turbine area; a security camera covers the stairs in the turbine area; the door to the Main Control Room is locked by a retinal scanner; the Radiochemistry Laboratory is linked to the power plant by an external footbridge; lasers protect the corridor to the footbridge; the Lab's Server Room is locked by a retinal scanner.
- Lambert's guidance lines (route sequence): no blueprints at start - get inside and find the main control room; once blueprints are taken, go on to the turbine zone; the security doors are blocked and a nearby computer controls them; the turbine is overhead - reach the stairs on the far side of the room, then cross the turbine room toward the control room; the elevator cannot be called from where you are - find another way to the upper floor; he scolds players who linger with radioactive material instead of going upstairs; the Lab's server can be reached from a ceiling trap-door; after learning the helper is Jin Soo (a CGIB officer), leave the Lab by the side door.
- Computer actions available: open the central archives' server; Yongbyon blueprints; stop ventilation fans; open security doors. Interaction label: Extraction.
- Intel e-mails: the lab director (Wen Bae-su) delivered FOUR double-laser detonators to Colonel Kim Pak-tu; Jin Soo of the CGIB asked Wen to send Kim as many detonators as possible for a test mission. Lambert's reaction: Kim still has one bomb and will attack again; proceed to the Lab. This sets up UN HQ.
- Designer triggers in the level package (XBDLC `.../LMaps/05_NuclearPlant/05_NuclearPlant.lin`): messages fire when players approach the security doors before opening them, when they are on the stairs to the turbine room, when they are on the footbridge outside the Lab, and when they access the archives (completes objective OBJ_55_P_20 - co-op mission number 55). [SINGLE SOURCE]
- Alarms: four alarm stages; stage four is full alert with fortified positions. [VERIFIED - both builds]
- Loadouts (map `.ini`, XBDLC and PC105 identical): host gets launcher, 2 pistol clips, 1 sticky camera, 1 sticky shocker; client gets launcher, 2 pistol clips, 2 flash grenades, 2 smoke grenades; no spare SC-20K magazines for either. **Correction (final review): the `AmmoClip*` keys count spare magazines; the loaded magazine is extra, so this matches the wiki's rifle 30 / pistol 60.** Elite: host 1 sticky shocker + 1 ring airfoil; client 1 ring airfoil + 2 flash grenades. [VERIFIED]
- Still open for R-19: scanner solutions, exact co-op move locations, guard placement (not in text).

## R-20 UN Headquarters - UPGRADED [VERIFIED - identical text in XBDLC `content/$c/5553003804902483/Localization/07_UNhq.int` + `P_07_UNhq.int` and PC105 same names]
- Briefing: Third Echelon intercepted an encrypted message between Jin Soo and the UN HQ in Manhattan; infiltrate; it is international territory, so lethal force is not allowed and Lambert aborts on a general alarm.
- Rules (notes): lethal force on UN guards and civilians not allowed; mission aborted if a general alarm is called; emergency doors open only from the inside. Killing a guard or civilian triggers an immediate abort (five separate kill-check patterns); a general alarm gives "mission over". Designer comments: game over when players kill guards or civilians, and game over when one of the alarms is activated. [VERIFIED]
- Roof entry: Lambert's opening line says to rappel down to the window-washing platform and get into the building. Objective text: the service stairs lead to the top floor but the emergency doors only open from inside, so find another way in. Patterns named `Falling` / `Fallen` exist (probably a fall-death check). [VERIFIED for the text; patterns SINGLE SOURCE]
- Route clues (notes and Lambert): the Security Control Room is on the 22nd floor; cameras turn out to be OFF on arrival (Kim got there first); use the elevator to reach the Security Control Room, which is on the other side of the floor - follow the main corridor; a computer action unlocks service doors and another opens the Security Control Room entrance; a computer can disable a metal detector; the ground floor can be reached with a service elevator; finding blood tells Lambert that Kim got there first, and he orders the agents to stop him whatever it takes.
- Objectives in file order: infiltrate the building; reach the Security Control Room; stop Colonel Kim (he has taken the Security Control Room); recover the encrypted data sent by Jin Soo; defuse the bomb before it blows.
- Colonel takedown: patterns `InterogateKim` (its speech line is empty/null) and `DefeatKim` (Lambert: Kim is no longer a threat). No text says whether Kim must be knocked out or may be killed; given the no-lethal rule applies to UN guards and civilians, Kim appears exempt. [UNCERTAIN]
- Bomb: Kim put a bomb in the General Assembly Hall ventilation system; the ventilation system is on top of the General Assembly Hall, which is in the second building. A computer file "Bombing Plan" and an e-mail from Jin Soo to Kim say the bomb must go off during tonight's assembly (the UN Secretary speaks on Korean peace). Lambert, in the ventilation room: that's half the job, now reach the other side of the room - the passage is back downstairs.
- Timer: Lambert's timer lines cover 20 minutes, 10 minutes, 5 minutes and 60 seconds left. Patterns `Timerbomb`, `paralleltimer`, `Countdown`, `Bombdetonation` exist. The 20-minute warning is the first, so the hidden timer is 20 minutes; the text does not say exactly when it starts, but the bomb is only announced in the same objectives pattern as "Stop Colonel Kim"/"Defuse". [VERIFIED for durations; start point UNCERTAIN]
- Bomb-defusal mechanic: not described in the UN HQ text; the HUD has a generic Defuse interaction. The co-op Train Station e-mail describes the series' two-man method (both agents cut the active wire at the same time, twice, and the active wire changes over time). Whether UN HQ reuses this is not stated. [UNCERTAIN]
- "Lit windows" failure: no string mentions windows or lights in UN HQ. Not resolved.
- Loadouts: both agents get 3 sticky cameras, 3 sticky shockers, 3 ring airfoils, 3 flash, 3 smoke, launcher, no spare magazines (pistol or SC-20K). **Correction (final review): weapons still carry their loaded magazine (wiki: rifle 30, pistol 20).** Elite: host 1 shocker + 1 airfoil; client 1 airfoil + 2 flash. This matches the no-lethal rule. [VERIFIED - XBDLC + PC105 ini]

## R-01 PC order / briefing - CLOSED
- PC 1.05 readme (embedded in the patch exe, PCDVD) lists the two new co-op levels as UN Headquarters then Nuclear Plant, selectable only in Mission mode from the Create Game screen, not in Story mode, and without the "use native languages" sound option. [SINGLE SOURCE - patch readme]
- The briefing and objective text on PC is byte-for-byte the same as on Xbox (Nuclear Plant opens with the Grand Central aftermath; UN HQ follows from the Jin Soo lead). So the PC briefing was NOT rewritten for the swapped order. [VERIFIED - XBDLC vs PC105 diff]
- Internal numbering: Nuclear Plant is map 05 / mission 55 / map identity 201; UN HQ is map 07 / identity 202. (Base co-op maps are 00-04, identities 100-105.) Both DLC briefings point to the Panama briefing voice cue `Play_BRF_51_000_01Lam`, which looks like a placeholder. [SINGLE SOURCE]

## R-02 EEV in co-op - LEFT OPEN
- The co-op controls show EEV is bound: PC `SplinterCell3User.ini` binds key 4 to EEV mode; the shared Xbox controller layout labels a button "camera / EEV". The engine has EEV actions for scan, distance hack, remote access and laser designation. [SINGLE SOURCE]
- No co-op map, loadout or menu string enables or disables EEV specifically, and no co-op objective or note mentions it. In-game check still needed. [UNCERTAIN]

## R-03 Adrenaline / revive count - CLOSED (Xbox/PC)
- Co-op Training pop-up (both builds): one agent can heal a downed partner by interacting; each agent carries one adrenaline boost, so the revive can only be done twice per mission. The training note adds that you heal your partner if you have a syringe by standing over him and interacting. [VERIFIED - XB477 + PC105 `P_00_Training_COOP.int`; matches manuals' "twice per game"]
- Equipment entry: "Adrenalin Syringe" (internal REVIVESYRINGE), an experimental adrenaline boost injected into an incapacitated person's torso. HUD interaction: Heal Teammate. PC default key: Insert = revive. [VERIFIED - Equipments.int/HUD.int both builds; PC ini]
- PC manual: about 30 seconds to reach a downed partner or the mission fails. [SINGLE SOURCE - PCDVD manual p.13]
- So the Prima "two each" is wrong for Xbox/PC; it is one each, two per team. Both-down-at-once behaviour: no string found (the menu has a game-over state that waits for the teammate, nothing more). PS2/GC count not checked (no PS2/GC data available, see Gaps).

## R-04 Share Equipment (bonus) - CLOSED
- Shipped feature: HUD interaction "Share Equip."; training pop-ups explain it (only items marked with a dot can be shared). [VERIFIED - both builds + PC manual]
- Why the wiki calls the training text "deleted": the Training map has an e-mail (dated 06/23/07, "Dan" to "Seb") explaining Share Equipment, and a designer comment in French says that note is not used for now and exists only so it gets translated. So the tutorial note was cut, the feature was not. [SINGLE SOURCE - XB477 training `.lin` + `00_Training_COOP.int`]

## R-07 Saving (bonus) - UPGRADED
- In-game pause menu (Xbox build and PC) has Quick Save, Save and Load. Saving waits for the teammate; the host can ask to save "permanently" and the partner can accept or refuse. A saved co-op game can only be reloaded with the same teammate (join fails with "you don't have the same saved game"; Xbox asks you to add the partner to your friends list). [VERIFIED - `InGameMenus.int`/`PreGameMenus.int` both builds]
- PC readme 1.02: fixed a crash when saving in co-op; you must save from the Pause menu. PC manual: co-op save is valid for the current session. [VERIFIED for PC]
- So: no automatic checkpoints in the text, but manual saves exist on Xbox and PC.

## R-08 Friendly fire - CLOSED for Xbox, partly for PC
- Xbox match-creation options include a "FRIENDLY FIRE" setting next to mode, difficulty, language, friends-only and voice-only. [SINGLE SOURCE - XB477 `PreGameMenus.int` [OPTIONSTITLE]; the string is also present in PC105's copy of that file]
- PC: the PC co-op menu file (`PreGame_PC.int`, section CoopCommon) lists name, mode, mission, difficulty, skills, language, voice-only - no friendly fire. PC `SplinterCell3Settings.ini` sets friendly fire ON by default in the game-info section (`b_friendlyFire=true`). So on PC friendly fire appears to be always on, with no menu toggle. [SINGLE SOURCE each; PC conclusion UNCERTAIN until checked in game]
- Engine: the level info stores friendly fire, mission mode (Story / Mission / internally "SILENT" = Elite) and difficulty together. [SINGLE SOURCE - XB477 `common.lin`]

## R-09 Extraction - UPGRADED (rule still not fully closed)
- Each mission names a concrete extraction place: Panama - back to the truck in the exterior courtyard; Seoul - take Jong to the truck outside the cyber cafe (designer comment: dropping Jong near the truck = mission success); Chemical Bunker - the Zodiac at the end of the missile-boat dock (a designer comment says a message fires at the Zodiac if objectives are incomplete); Train Station - no extraction; it ends by jumping onto the roof of the passing subway car; Nuclear Plant - out of the Radiochemistry Lab's side door; UN HQ - mission completes after the bomb is defused (no extraction objective). [VERIFIED - both builds]
- Mechanism: HUD has an "Extraction" interaction (also listed in the Nuclear Plant text), and the co-op code has a dedicated success volume class (`ECoopSuccessVolume`) plus a `CoopSuccessInteraction`. This suggests extraction is triggered by an interaction inside a zone. [SINGLE SOURCE - XB477 common.lin]
- No string says both agents must be present. [UNCERTAIN] Needs a gameplay check.

## R-10 Difficulty (bonus)
- Co-op difficulty names are Normal / Hard / Expert (internally Easy / Normal / Hard). Modes: Story, Mission, Elite. [VERIFIED - both builds] Nothing on what difficulty changes.

## R-11 Map / OPSAT / partner marker - UPGRADED
- Every co-op map, including both DLC maps, has an OPSAT map texture (`map_training`, `map_panama`, `map_seoul3`, `map_chemicalbunker`, `map_gcs`, `map_NuclearPlant`, `map_UNhq`) referenced as MapIcon / briefing MapImage in its `.ini`. The DLC packages also ship `Magma/Data/Textures/Maps/map_*.dds` (256x128) and `load_map_*.dds`. [VERIFIED - XB477 + XBDLC + PC105 ini]
- The OPSAT menu (shared by solo and co-op) has Goals, Notes, Data, Map, Equipment; the map legend has Alarm, Objective, Player, Location and Triggered Alarms. There is no separate "teammate" legend entry. [SINGLE SOURCE - `InGameMenus.int`]
- Training pop-up: when one agent gets information from a computer, BOTH agents' OPSATs are updated. [VERIFIED - both builds]
- A split-screen OPSAT layout file (`opsat_split.mgb`) exists on Xbox. [SINGLE SOURCE]
- Verdict: co-op has an OPSAT with a map page; the 256x128 map textures look like the small briefing/loading images, so whether there is a navigable floor plan, and whether the partner is marked, is still not shown. [UNCERTAIN] The "no map" reviewer claim is at least partly wrong.

## R-13 PC split-screen - CLOSED
- PC co-op menu: LAN, Online, Settings (`PreGame_PC.int` [MainMenuCoop]); PC manual's co-op main menu lists the same three. The "SPLIT SCREEN" title string and a split-game menu class exist only as Xbox leftovers in shared files. [VERIFIED - PC105 + PCDVD manual] PC had no native split-screen co-op.

## R-14 Panama framing (bonus) - CLOSED for Xbox/PC
- Panama briefing (both builds): VP Senor Segundo Ruiz de Medeiros has been taking bribes to let ships bypass spot inspections through the Canal Zone. Objectives: access the archives (East Wing, top floor); the data there is partly deleted, so access the server backups past the Exposition Room on the ground floor; exfiltrate to the truck. Bonus: recover info about other uninspected ships. Do not kill the VP (instant failure). [VERIFIED]
- Route clues: two retinal scanners at the Archive room, easiest with the VP on one scanner and any guard on the other, both at once; if the VP is unconscious you must hack; motion sensors in the meeting room and exposition room; laser grid disabled with the Jammer (an e-mail jokes that its breaker is inside the grid); key codes - exposition area 2341, server-room-side to exposition 1534, hall outside billiards 1523, VP office to gallery 3245, VP private elevator 3298, VP's archive computer 9728 (from interrogating the VP). [VERIFIED]

## R-16 Chemical Bunker serum (bonus) - UPGRADED
- Steps: go down a missile silo; recover the anti-viral protocol from the main lab; get the right chimpanzee blood serum; make the anti-virus in the cryogenic chamber; take a virus sample from a missile warhead (code 1961); exfiltrate to the Zodiac. Optional: monkey-autopsy videotape. [VERIFIED]
- The protocol note names Component One as blood serum type A, B or O - three alternative notes exist, so the required type is chosen per playthrough and read from the protocol. Mixing requires two people at the same time, following a per-user colour sequence (colours: blue, red, violet, green, yellow, aqua). Monkey blood is in a fridge, code 1423. Removing toxin from a warhead requires cutting two hot wires simultaneously. A crane can be operated (PC manual describes partner voice commands for it). [VERIFIED - both builds; crane SINGLE SOURCE manual + e-mail]
- How many vials: no count given; one sample each of anti-virus and virus is implied. [UNCERTAIN]

## R-17 Train Station (bonus) - CLOSED for codes, partly for Chu
- 9201 is the LOCKER NUMBER (told to Chu on the phone by an unnamed caller); 0315 is the KEY CODE (Chu's son's birth date, given when both agents interrogate him together). Both are right. [VERIFIED - both builds]
- Chu must not be killed early (mission fails); after the locker stage a script allows killing or knocking him out. No text shows him dying after interrogation. [SINGLE SOURCE - designer comments XB477] 
- Other steps: identify the threat; disarm 3 bombs in the subway tunnels (both agents cut the active wire at the same time, then a second wire; the active wire changes); bug the main-hall payphone before Chu reaches it, undetected; follow Chu to the locker; take the antidote and kill the infected soldier in the bathroom; secure the toxin; jump onto the roof of the departing subway car. [VERIFIED]

## R-21 Co-op music - CLOSED (which banks), audio not heard
Each map's `.ini` [MUSICFILES] (identical in XB477 and PC105; DLC from XBDLC + PC105) [VERIFIED]:
- Training: shared `Mus_Common` + `SCX_Mus_00Training` (the solo training bank).
- Panama: `Mus_Common` + `Mus_02CargoShip` (solo Cargo Ship).
- Seoul: `Mus_Common` only.
- Chemical Bunker: `Mus_Common` + `Mus_07Battery` (solo Battery).
- Train Station: `Mus_Common` + `Mus_04Penthouse` (solo Penthouse).
- Nuclear Plant: `Mus_Common` + `Mus_05Displace` (solo Displace).
- UN HQ: `Mus_Common` + `Mus_11KokuboSosho` (solo Kokubo Sosho).
- Co-op scripts trigger generic themes named `Mus_Gen_Shetland1-3` and `Mus_Gen_SpyRoom_1-3` (internal names, probably inside Mus_Common); the music system has states idle, exploration, stress A/B, fight, death, failure, success. [SINGLE SOURCE - XB477/XBDLC `.lin`]
- Credits: music by Amon Tobin; no separate co-op composer. So co-op reuses solo stem sets plus the common set; there is no dedicated co-op score. Menu music not identified. [VERIFIED for reuse]
- Co-op ambiences are bespoke (`Amb_C01_*` Panama, `Amb_C02_*` Seoul docks, `Amb_C03_*` Chemical Bunker, `Amb_C04_*` Train Station); the DLC maps borrow Chemical Bunker, Battery and Kokubo/Penthouse-type ambiences plus a `SCX_DL_COOP` sound bank. [VERIFIED - ini files]

## R-22 Voice (bonus)
- Xbox options: voice masking, voice through speakers, voice detection and voice detection sensitivity (how much guards hear you). No option or string about partner-to-partner distance attenuation. [SINGLE SOURCE - PreGameMenus.int] PC manual: the sensitivity setting does not change partner voice volume. Still open.

## Seoul (bonus route clues) [VERIFIED - both builds]
- Objectives: capture Jong Pom-chu alive (he is in a small hotel near the insertion point); he has been moved - interrogate a North Korean officer; destroy two Chun-Ma anti-aircraft systems (a 5-minute timer starts when the plane is shot down, with Lambert warnings at each minute); get to the cyber cafe; sabotage Jong's escape boat in the fish market (optional); take Jong to the truck outside the cyber cafe.
- Notes: Jong must stay alive; gunfire may not be aimed at you (a war is on); turrets can be disabled with the Jammer; disable the tanks by climbing on each other's shoulders; hotel back door code 7649 (computer works only after power is restored); medkit in the hotel bathroom; guards on the temple balconies; an old sewer links the front and back of the temple; fish-market rooftops let you move unseen; ammo in the small fish store; smoke grenades in the back of the extraction truck. A fake Jong can be (dual-)interrogated. Seoul scoring cap (R-15): not explained by any string.

---

## Gaps (not closed here)
- R-05 PS2/GC Team Training and all PS2/GC strings: the PS2 USA image in `redumpSonyPlaystation2UsaGames2018Aug01Part3` returns "item not available"; `sony-playstation-2-t-redump-collection` holds only CHD files (not browsable); no GameCube image found. PS2 R-03 count also unchecked.
- R-02 EEV usability, R-06 AI, R-09 both-agents rule, R-11 partner marker, R-15 Seoul cap, R-20 lit windows and defusal method, R-22 voice attenuation, R-23 N-Gage/DS: no decisive strings.
- The `.lin` level packages contain map geometry and script, but no text describing exact co-op move locations; that still needs video.

## Sources
- https://archive.org/download/tom-clancys-splinter-cell-chaos-theory_202601/Tom%20Clancys%20Splinter%20Cell%20Chaos%20Theory.rar/ (listing) and inner files `.../System/dynamic-pc.umd`, `.../System/SplinterCell3Settings.ini`, `.../System/SplinterCell3User.ini`, `.../Data/Videos/Credits.bik` - PC 1.05 install: localisation, map ini, credits video.
- https://archive.org/download/og-xbox-dlcupdates/DLC%20and%20Title%20Update%20Downloads/Splinter%20Cell%20CT%20DLC%20Installer.rar/ - Xbox DLC: `Splinter Cell CT DLC Installer/content/$c/5553003804902482/...` (Nuclear Plant) and `.../5553003804902483/...` (UN HQ): Localization/*.int, Maps/*.ini, contentmeta.xbx, LMaps/*.lin, map textures, Readme.txt. Same rar in items `Original-Xbox-Live-Updates-and-DLC` and `XbDLC2`.
- https://archive.org/download/sc-3-xb-build-477-retail/SC3XB_Build477_Retail.zip/ - Xbox build 477: `SC3XB_Build477_Retail/Default/dynamicxbox.umd`, `.../Default/LMaps/<map>/<map>.lin`, `.../Default/LMaps/common.lin`, `.../Default/LMaps/Menu/Menu.lin`.
- https://archive.org/download/scct_20250728/SCCT.zip/ - PC DVD: `SCCT/Manual/ENGLISH/Manual.pdf`, `SCCT/support/Readme/English/Readme.txt`, `SCCT/Patch/splinter_cell_chaos_theory_1.00_To_1.05_euro.exe` (embedded readme 1.05; the rest of the patch is RTPatch-compressed and was not decoded).
- https://archive.org/advancedsearch.php and https://archive.org/metadata/<id> - item discovery.
- Checked but not useful: `tom-clancys-splinter-cell-chaos-theory` (zip with one packed data1.dd), `tom-clancys-splinter-cell-chaos-theory_202506` and `splinter-cell-3_202011` (ISOs with InstallShield cabs only), `redump-id-57802` (Xbox demo disc, not browsable), `tom-clancy-s-splinter-cell-chaos-theory-classic-tom-clancy-pc-game-99` and the DODI repack (no usable listing), `redumpSonyPlaystation2UsaGames2018Aug01Part3` PS2 7z ("item not available"), `sony-playstation-2-t-redump-collection` (CHD only).
- Local: `/home/user/raw/ia/xbox_manual.pdf` and `/home/user/raw/ia/xbm/p-46..p-49.png` - no credits pages in the scan.

## Source URLs
- https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601 (PC105: installed PC copy, patch 1.05)
- https://archive.org/details/og-xbox-dlcupdates (XBDLC: Xbox Live download installer; same file also in https://archive.org/details/Original-Xbox-Live-Updates-and-DLC and https://archive.org/details/XbDLC2)
- https://archive.org/details/sc-3-xb-build-477-retail (XB477: Xbox build 477 asset dump)
- https://archive.org/details/scct_20250728 (PCDVD: PC retail DVD, manual, readme, 1.05 patch)
- https://archive.org/advancedsearch.php (item discovery)
