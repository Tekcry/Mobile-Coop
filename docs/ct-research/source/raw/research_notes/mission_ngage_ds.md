# Handheld co-op campaign: Splinter Cell: Chaos Theory (N-Gage 2005 / Nintendo DS 2005, Gameloft)

Status: complete (2026-10-17). Tags: [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. Fandom EN + Fandom RU are counted as ONE source ("FW").

## 0. Overview

- Developer/publisher Gameloft; N-Gage NA 29 Mar 2005 / EU 31 Mar 2005; DS NA 28 Jun 2005 / EU 1 Jul 2005. [SINGLE SOURCE - FW game page]
- Co-op campaign = 5 parts in 2 missions: Mission A (ARGUS Corporation HQ, New York): Rooftops -> Breakdown -> Corruption; Mission B (prison in Cuba): Prison Rescue -> Escape. All dated "Summer 2007" by the wiki. [SINGLE SOURCE - FW]; the five part names in this order also appear as chapter markers in a DS co-op playthrough video (arronmunroe). [VERIFIED - FW + YT-ARRON chapters]
- Story frame: the US Colonel Geoff Trason has been kidnapped; ARGUS Corporation is the prime suspect; two Shadownet agents raid ARGUS HQ to pull data from the main server about where he is held, which leads to an old prison in Cuba, where they free him and carry him out. [SINGLE SOURCE - FW briefings]
- This is a separate story from the console co-op (Agent One/Agent Two, Panama/Seoul/North Korea/NYC train station); it is not the same plot.
- Roles: "Shadownet Hacker" and "Shadownet Assault" (see section 1).


### 0.1 Key primary source found: the N-Gage game's own text table

The N-Gage build v1.0.240 is preserved on archive.org (file listing of the game folder). Its main data file (system/apps/6r73/6r73.dat) contains zlib-compressed localisation tables (EN/FR/DE/IT/ES) with keys like `COOP_01.COM_000_10`. I decompressed it locally and read only the text strings (no gameplay data). Abbreviation below: **NG-TXT**. This is the game's own dialogue, so it is a strong source for briefings, radio lines and role limits, but it says nothing about map layout. The wiki's "Information" sections match these strings almost word for word, so the wiki (FW) was clearly transcribed from the game; for briefing text FW + NG-TXT therefore confirm each other, but they are not fully independent for anything beyond the text itself.

Findings from NG-TXT [SINGLE SOURCE - NG-TXT, consistent with FW]:
- Internal mission keys are COOP_01 (Rooftops), COOP_02 (Breakdown), COOP_03 (Corruption), COOP_07 (Prison Rescue), COOP_08 (Escape). Keys COOP_04-06 are absent from the text table. Whether three co-op parts were cut is only an inference. [UNCERTAIN]
- Localised menu names: Rooftops = FR "Infiltration", DE "Dacher", IT "Il tetto", ES "Azoteas"; Breakdown = FR "Panne de courant", DE "Storfall", IT "Fallimento", ES "Averia"; Corruption = DE "Korruption", IT "Corruzione", ES "Corrupcion"; Prison Rescue = FR "Sauvetage", DE "Befreiung", IT "Salvataggio", ES "Rescate de la carcel"; Escape = FR "La fuite", DE "Flucht aus dem Gefangnis", IT "Fuga", ES "Huida de la carcel". (Umlauts and accents dropped here.)
- Mode is called "COOP" in the game-type menu; versus is "VERSUS". The lobby has an "EXPERTISE" field and a "CHANGE EXPERTISE" option, so each player picks Hacker or Assault before the match. Hosting/joining is over Bluetooth ("HOST GAME" / "JOIN GAME"; a prompt says Bluetooth is needed for multiplayer). If the host quits, the session ends.
- Role names in-game: "Shadownet Assault" (internal id coopspy1) and "Shadownet Hacker" (coopspy2). Italian calls Assault "Spia" (spy).
- Hard role limits, shown as pop-up messages: the Assault cannot hack computers; the Hacker cannot short-circuit electric panels. The interaction verbs are "HACK COMPUTER" and "HACK PANEL" (FR "court-circuiter"). [VERIFIED - NG-TXT + FW]
- Downed partner: a generic co-op line says a man is down and the other player must find the body and use a health pack within 30 seconds to save him. An interaction "HEAL ALLY" exists. [SINGLE SOURCE - NG-TXT]
- Alarm lines (generic co-op): first alarm = two more and the mission is over; second = one more and Lambert calls it off; third = mission aborted. A separate line tells the agents the alarm level was lowered. [VERIFIED - NG-TXT + FW Rooftops trivia]
- End-of-mission stats screen counts locks picked, computers hacked and "electro hacks" (panels), bodies found, enemies startled/alerted, alarms, camera/laser/motion detections, primary/opportunity/bonus objectives, mission time and time bonus, total score. Fail reasons include detected, detected too many times, died, objective killed, out of time. These are shared with solo play; which apply to co-op is not stated. [SINGLE SOURCE - NG-TXT; co-op applicability UNCERTAIN]
- Gadget descriptions: chaff grenade disables all electronics in range for 20 seconds; health pack = 50 HP; sticky shocker gun fires a device that sticks to a target and shocks it. In the solo training text a shocker hit disables a camera for 15 seconds. [SINGLE SOURCE - NG-TXT]

## 1. The two roles (Shadownet Hacker vs Shadownet Assault)

| | Shadownet Hacker | Shadownet Assault |
|---|---|---|
| Lobby colour (per FW) | blue tag, blue goggles; FW maps him to "Agent One" | red tag, purple goggles; FW maps him to "Agent Two" |
| Weapon | Sticky Shocker gun, unlimited | SC-20K (30 rounds), Five-seveN (30 rounds) |
| Grenades | 3 chaff, 3 flashbang | 3 frag |
| Other gear | - | 3 sticky cameras |
| Health packs | 1 | 1 |
| Vision | (no night/thermal per FW) | night vision and thermal vision (only he has them, per FW) |
| Can do | hack computers | short-circuit ("hack") electric panels |
| Cannot do | short-circuit panels | hack computers |
Sources: loadout table and vision/colour notes [SINGLE SOURCE - FW, identical table on all 5 part pages]; can/cannot rule [VERIFIED - FW + NG-TXT].

- Lambert's opening line frames the Assault as the fighter and the Hacker as computer expert *and* stealth expert. [VERIFIED - NG-TXT + FW]
- Pocket Gamer (DS) describes the Hacker as unarmed and the Assault as his protector. [SINGLE SOURCE - Pocket Gamer]. This clashes with FW, which gives the Hacker an unlimited sticky shocker (a non-lethal stun tool). Reconcile as: Hacker has no lethal weapon. [UNCERTAIN on exact wording]
- The Ubisoft press release (May/June 2005, via NWR) says each player chooses one of two Shadownet "expertises", Assault or Hacker. [VERIFIED - NWR press release + NG-TXT lobby strings]
- Gaming Target (N-Gage) confirms one player is Shadownet Assault and the other Shadownet Hacker. [VERIFIED - Gaming Target + NWR/Ubisoft + NG-TXT]
- The sticky shocker in this version works like the console OCP: it temporarily knocks out electronics, so wasting shots can make some lasers/cameras impossible to pass. FW states this for the game generally (solo). [SINGLE SOURCE - FW game page]. Note: the Hacker's shocker is unlimited in co-op (FW table), which would remove this risk in co-op. [inference, UNCERTAIN]
- Design reading (my analysis, not a source claim): the split is a lock-and-key system. Computers (Hacker only) and electric panels (Assault only) both control doors, lasers, lights and turrets, so every security layer is gated by one specific role. The Hacker carries the electronics-defeating tools (shocker, chaff) and flash for crowd control; the Assault carries lethal force, frags, cameras for scouting, and the vision modes needed to see lasers (thermal; in the solo training thermal is the mode that shows lasers [NG-TXT]). So the Hacker must rely on the Assault to spot lasers, and the Assault must rely on the Hacker for computers.

- No co-op acrobatic move appears in the game's interaction list. The N-Gage text table has 37 interaction verbs (open/bash door, lock pick, hack computer, hack panel, heal ally, grab, interrogate, optic cable, rappel, switch on/off, use keypad and pick-ups). None is a boost, ladder, throw or other two-man move; the only partner action is "HEAL ALLY". This strongly suggests the handheld co-op has no console-style co-op moves. It is absence of evidence (a move could have no text label). [SINGLE SOURCE - NG-TXT; conclusion UNCERTAIN]
- Co-op is strictly two humans: if a player drops, the game cancels the session for lack of players. No AI partner text exists. [SINGLE SOURCE - NG-TXT]. A press release and reviews describe it as 2-player only. [VERIFIED - NWR/Ubisoft + Gaming Target + multiplayer.it + Nokia release via GamesIndustry.biz]
- Enemy model: the game's asset list includes a "Coop_Mercinary" mesh, and the Versus side is ARGUS mercenaries. So the co-op guards are likely mercenary models. [UNCERTAIN - asset name only]

## 2. Connection and presentation (both handhelds)

- N-Gage: two-player co-op over local Bluetooth; Versus up to 4 (2 vs 2). N-Gage Arena is NOT used for co-op or versus (only top-10 scores and downloadable replays). [VERIFIED - Gaming Target + multiplayer.it + Nokia release (Bluetooth co-op) + NG-TXT (Bluetooth lobby, Arena strings only for rankings/replays)]. The pre-release fact sheet promised "global multiplayer over N-Gage Arena", which the final game did not deliver for co-op. [SINGLE SOURCE - N-Gage media kit factsheet; contradiction noted]
- DS: co-op over DS local wireless; no download play, so each player needs a cartridge. [VERIFIED - NWR DS review (each player needs a copy) + Gameswelt (each needs own module) + GameSpot DS review (multiple cartridges, via search summary only)]
- Ubisoft's DS feature list: "Cooperative mode for two players with five levels to explore", each player picks Assault or Hacker; Versus 2-4 players on seven maps. [SINGLE SOURCE - Ubisoft press release 11 May 2005 and "gone gold" note 3 June 2005, both on NWR]. GamesRadar's DS review also counts five original co-op missions. [VERIFIED - Ubisoft/NWR + GamesRadar]
- Perspective: full 3D, third-person chase camera behind the agent, not 2D and not top-down. On DS the top screen shows the 3D view and the touch screen shows a radar plus buttons for vision modes, weapons and inventory; the stylus also does lock-picking. [VERIFIED - IGN DS review (3D engine; touch screen for inventory and vision modes) + NWR press release (touch screen for inventory, vision modes, camera) + Pocket Gamer (stylus lock-picking) + my own look at frames from the SHOCK-25 and arronmunroe DS co-op videos and the N-Gage co-op beta footage]. N-Gage was promoted as the series' first fully 3D handheld entry, after the 2D side-scrolling earlier games. [VERIFIED - Pocket Gamer N-Gage news + N-Gage factsheet]
- IGN (DS) says co-op works acceptably because both players share the same third-person control scheme, while Versus is unbalanced (mercs in first person with stylus aiming). [SINGLE SOURCE - IGN DS review, Craig Harris, 28 Jun 2005]
- IGN says the DS design is based on Gameloft's N-Gage version from a few months earlier. [SINGLE SOURCE - IGN]. FW calls the DS game a port of the N-Gage game. [VERIFIED - IGN + FW]. The co-op part names and briefings in the DS videos match the N-Gage text table, so the co-op campaign is the same on both. [VERIFIED - NG-TXT + DS videos (titles/frames) + FW]. Layout differences between N-Gage and DS co-op maps: not documented. [GAP]. One 2026 YouTube description (DarkInput) claims the DS levels are generally smaller and more linear than N-Gage's; it refers to the single-player game. [SINGLE SOURCE, solo only]
- Approximate length of each part from one DS playthrough with chapter markers (arronmunroe, two players, not a stealth run): Rooftops about 3.5 min, Breakdown about 4 min, Corruption about 10 min, Prison Rescue about 9 min, Escape about 10.5 min, so the whole campaign takes about 37 minutes. A 100%-stealth DS run (SHOCK-25) took about 13.5 / 14 / 26.5 min for the first three parts. [SINGLE SOURCE each - video chapter/description timestamps]

## 3. Mission A - ARGUS Corporation HQ, New York (3 parts)

Source note: FW pages for each part give the briefing, Lambert's radio lines in order (marked with arrows), the loadout, and short "trivia" bullets naming each electric panel/computer and its effect. Those trivia bullets use the same counts and order as the timestamps in SHOCK-25's DS video description (panels and computers per part), and the FW pages embed that video. So FW trivia and SHOCK-25 are probably by the same person: I count them as ONE source ("FW/SHOCK"). The radio lines are confirmed by NG-TXT.

### 3.1 Rooftops (COOP_01; FR menu name "Infiltration")
- Setting/premise: New York, ARGUS building. The Colonel Trason kidnapping is the motive; the target is the main server. [VERIFIED - FW + NG-TXT]. Night-time outdoor scenes with buildings appear in DS video frames. [SINGLE SOURCE - my look at video thumbnails]. That play starts on the roofs is implied by the name only; no source describes the route. [UNCERTAIN]
- Objective: get into the ARGUS building (RU wiki objective line: infiltrate ARGUS HQ). [SINGLE SOURCE - FW-RU]
- Briefing beats: Lambert introduces the team (Assault = combat, Hacker = hacking and stealth) and says the mission only works if both cooperate. [VERIFIED - NG-TXT + FW]
- Progression: the stealth run uses 1 electric panel (about 4 min into the part) and then 1 computer (about 30 s later), and knocks out 1 enemy. [SINGLE SOURCE - FW/SHOCK]. What the panel and computer control: [GAP]. The part ends with Lambert saying it is time to go below, so it hands off into the building (Breakdown starts in the elevator). [VERIFIED - NG-TXT + FW]
- Role forcing: with one panel and one computer, each role has to act once: the Assault for the panel, the Hacker for the computer. [inference from FW/SHOCK counts + role rule; UNCERTAIN whether either is optional]
- Security elements: [GAP] (FW gives none for this part).
- Alarms/checkpoints: generic 3-alarm rule (alarm warning lines are documented on this page). [VERIFIED - FW + NG-TXT]
- Split/regroup, co-op moves, wow moments, frustrations: [GAP]
- Videos: SHOCK-25 (DS, 100% stealth, starts about 2:35) https://www.youtube.com/watch?v=-Y6zjZ7oVNM ; arronmunroe (DS, 0:19-3:46) https://www.youtube.com/watch?v=jnQ74p1Klf8 ; N-Gage co-op beta press footage (no sound; its first frame shows Lambert's team intro) https://www.youtube.com/watch?v=oozYweL4ASM

### 3.2 Breakdown (COOP_02; FR "Panne de courant", DE "Storfall")
- Premise: the agents are inside and riding the elevator to the server room when the elevator power cuts out. [VERIFIED - NG-TXT + FW]
- Objectives in order (from radio lines):
  1. Restore power: find the control room on this floor. [VERIFIED - NG-TXT + FW]
  2. In the control room both "computer switches" must be pressed at the same time. Lambert explains this, and a second line repeats that both switches must be pressed together, which looks like a hint after a failed or single press. [VERIFIED - NG-TXT + FW for the lines; reading of the second line as a fail hint UNCERTAIN]
  3. After that, power returns and all cameras in the area shut off; the agents go back to the elevator. [VERIFIED - NG-TXT + FW]
  4. Closing line: power restored, keep moving toward the server room. [VERIFIED - NG-TXT + FW]
- Security elements: lasers in a hallway and in the lobby, plus cameras (switched off when the switches are pressed). [VERIFIED for lasers - NG-TXT + FW; cameras SINGLE SOURCE - NG-TXT/FW line]
- Role-specific actions:
  - Assault: electric panel #1 turns off the hallway lasers for 15 s; panel #2 turns off the lobby lasers for 15 s. The game strings for the two laser zones exist; the 15-second duration is FW's. [Lasers: VERIFIED - NG-TXT + FW; 15 s: SINGLE SOURCE - FW/SHOCK]
  - Two "computers" are logged in the stealth run, about 30 s apart, near the end of the part. These are most likely the two switches. [SINGLE SOURCE - FW/SHOCK]. Whether both players operate them or the Hacker does both is not stated. Since the Assault cannot hack computers, a true simultaneous press by both players suggests these are plain switches that anyone can use. [UNCERTAIN - inference]
- How the level forces both roles: the panels that drop the lasers for only 15 s are Assault-only, so the Assault opens a short window and both must cross in it (or the Hacker crosses while the Assault holds the panel). The power restore needs two simultaneous presses, so one player cannot do it alone. [Simultaneous press VERIFIED - NG-TXT + FW; timing-window tactic is my design reading]
- Split/regroup: the simultaneous switches imply the two agents stand at two different switches at the same moment; then both return to the elevator (regroup). [VERIFIED for "return to elevator"; switch positions GAP]
- Co-op moves: none documented. Enemies knocked out in the stealth run: 3. [SINGLE SOURCE - FW/SHOCK]
- Wow moment (design reading): a mid-mission plot twist (the lift dies) that turns a transit section into a co-op puzzle. Frustrations: [GAP]
- Videos: SHOCK-25 from about 16:15; arronmunroe 3:46-7:49.

### 3.3 Corruption (COOP_03)
- Premise: the agents reach the server floor; the server room is heavily guarded; the job is to hack the main computer and then leave the building unseen. [VERIFIED - NG-TXT + FW]
- Opening orders: do not use the elevator door; enter through the ventilation system. Speed matters. [VERIFIED - NG-TXT + FW]
- Ordered progression as far as sources allow (trivia order matched to SHOCK-25 timestamps):
  1. Electric panel #1 (Assault): the laser system is "hacked" and a new laser pattern goes live, so the panel changes the grid instead of switching it off. [VERIFIED - NG-TXT string + FW]
  2. Computer #1 (Hacker): laser system off. [VERIFIED - NG-TXT + FW]. A matching laser-system-enabled message also exists. When it fires is [GAP].
  3. Electric panel #2 (Assault): opens doors. [SINGLE SOURCE - FW/SHOCK]
  4. Computer #2 (Hacker): opens doors. [SINGLE SOURCE - FW/SHOCK]
  5. Computer #3 (Hacker): locks the doors and starts a 6-minute countdown to extraction. [SINGLE SOURCE - FW/SHOCK]. That this is the main server hack is likely but not stated. [UNCERTAIN]
  6. Scripted twist: Lambert says the agents have been detected and must get out of the server room through the ceiling. [VERIFIED - NG-TXT + FW]. Whether this always happens or only if they are spotted: [UNCERTAIN]. The script reading is supported by the line coming right after the server objective in the radio order.
  7. Intel update: all doors are now unlocked; go to a new extraction point. [VERIFIED - NG-TXT + FW]
  8. Mission complete. [VERIFIED - NG-TXT + FW]
- Order in time (SHOCK-25): panel 33:00, computer 36:20, panel 37:00, computer 43:00, computer 45:00; part runs about 26 min; 8 of 12 enemies knocked out. [SINGLE SOURCE - FW/SHOCK]
- How the level forces both roles: lasers and doors are each tied to a panel/computer pair, so both roles touch each security system. Panel and computer alternate (A, H, A, H, H), so the agents keep handing off. [design reading from the order above]
- Security elements: laser grid (reconfigurable), locked doors, heavy guard presence, vents as the intended way in, timed extraction. [VERIFIED for lasers/doors/vents - NG-TXT + FW; timer SINGLE SOURCE]. An out-of-time fail reason exists in the game text, so running out the 6 minutes probably fails the mission. [UNCERTAIN - inference]
- Split/regroup: [GAP] beyond the above.
- Wow moments (design reading): forced entry through vents, the twist where they are detected and must escape through the ceiling, and the late rule change (doors unlocked, new extraction). Frustrations: [GAP]
- Videos: SHOCK-25 from about 30:30 to the end (57:01); arronmunroe 7:49-17:48.

## 4. Mission B - old prison in Cuba (2 parts)

Note: no video description with timestamps exists for these parts (SHOCK-25 published only parts 1-3). Sources are FW/SHOCK-style trivia (FW EN + FW RU, one source), NG-TXT, and the arronmunroe chapter markers.

### 4.1 Prison Rescue (COOP_07; FR "Sauvetage", DE "Befreiung")
- Premise: the ARGUS data showed exactly where the colonel is: an old prison in Cuba. Lambert greets them in Spanish, warns that reports on the prison are grim and that he does not know the colonel's condition, and orders a rescue. [VERIFIED - NG-TXT + FW]
- Loadout change: this is the only part with extra supplies listed (Assault SC-20K 30+60 rounds, frags 3+2, health packs 1+1; Hacker chaff 3+2). FW writes "+N", which probably means pick-ups in the level. [SINGLE SOURCE - FW; meaning of "+" UNCERTAIN]
- Ordered progression (FW trivia order; true order not confirmed by any timestamp):
  1. Mines on the route: they can be shot to destroy them; FW-RU adds that a shocker hit disables them for a while. [SINGLE SOURCE - FW (EN + RU)]. In role terms: the Assault can shoot them, and the Hacker's shocker can neutralise them for a short time. [inference]
  2. Electric panel #1 (Assault) is missing a fuse, so it cannot be used yet. [VERIFIED - NG-TXT (fuse-missing line) + FW]
  3. "Electric panel #2: fuse acquired" - the fuse is obtained (the wording suggests it is taken from another panel). Back at panel #1 the hallway lasers go off. [VERIFIED for the fuse-acquired message - NG-TXT + FW; the rest SINGLE SOURCE - FW]
  4. Electric panel #3 opens doors. [SINGLE SOURCE - FW]
  5. A prison cell lock is picked (DS: three-pin stylus lock-pick, which FW notes as "1-2-3"). [SINGLE SOURCE - FW]. Which role picks locks: [GAP]
  6. "Block B key obtained", followed by Lambert lowering the alarm level. [VERIFIED for both strings - NG-TXT + FW; their linkage SINGLE SOURCE - FW]
  7. Warning not to leave the colonel behind (the colonel is now with the team). [VERIFIED - NG-TXT (string is in the Escape table, COOP_08) + FW (both parts)]
  8. Electric panel #4 turns the lights off for 15 seconds. [SINGLE SOURCE - FW]
  9. End: Lambert praises them and orders the wounded evacuated quickly. [VERIFIED - NG-TXT + FW]
- How the level forces both roles: the fuse puzzle is a fetch-and-return around an Assault-only panel; a lights-off panel (Assault) gives a 15-second dark window that is useful to the Hacker, who has no night vision (per FW). The Hacker's chaff/shocker handle electronics and mines. [design reading; role rule VERIFIED]
- Security elements: mines, hallway lasers, locked doors and cells, Block B key, lights. [SINGLE SOURCE - FW; fuse/key/lasers also in NG-TXT]
- Alarms/checkpoints: alarm level drops once in this part (around the Block B key). [SINGLE SOURCE - FW]
- Split/regroup, co-op moves, wow moments, frustrations: [GAP]. Design reading: the colonel is the mission's "escort object" and fail state (an objective-killed fail reason exists in the game text; whether it is used here is [UNCERTAIN]).
- Videos: arronmunroe 17:48-26:55 https://www.youtube.com/watch?v=jnQ74p1Klf8 . No stealth/100% video found.

### 4.2 Escape (COOP_08; FR "La fuite", DE "Flucht aus dem Gefangnis")
- Premise: they are out of the worst of it but not safe; the colonel is badly wounded and must be carried out. Do not leave him behind. [VERIFIED - NG-TXT + FW]
- Objective: get the colonel out alive (carried). Who carries him, how fast a carrier moves, and whether the carrier can fight: [GAP]
- Security elements: mines (shoot to destroy; FW-RU: shocker disables temporarily) and automatic machine-gun turrets that can ONLY be turned off by hacking computers, i.e. by the Hacker. [SINGLE SOURCE - FW (EN + RU)]. A machine-gun-deactivated message is a game string. [VERIFIED for the string - NG-TXT + FW]
- Ordered progression (FW; partial):
  - Computers #1-#4 each deactivate a machine gun (four turret hacks, all Hacker work). [SINGLE SOURCE - FW]
  - After a turret is disabled, Lambert lowers the alarm level (FW ties the decrement to the machine gun). [SINGLE SOURCE - FW]
  - Electric panel #1 (Assault) switches the lights off for 15 s. [SINGLE SOURCE - FW]
  - Two scripted traps: (a) in the second room on the left, beside the switch, a small room holds three guards and opening it gets you spotted; (b) two doors in the middle of the left side of the big courtyard hide two guards. [SINGLE SOURCE - FW]
- How the level forces both roles: four turret computers that only the Hacker can switch off, plus a carry objective and an Assault-only lights panel. So the team has to split jobs: one handles the turrets, while the other protects, carries or kills lights. This is a design reading; no source says who carries the colonel. [UNCERTAIN]
- Wow moments (design reading): the carry-out finale and turret-lined courtyard. Frustrations (FW): the room and courtyard ambushes that are hard to avoid. [SINGLE SOURCE - FW]
- Videos: arronmunroe 26:55-37:28.

## 5. Co-op reception (handheld only)

- GamesRadar (DS): counts the five original co-op missions plus Spies vs Mercs as a highlight worth trying; criticises the return to checkpoints and the three-strike alarm rule across the game. [SINGLE SOURCE for the praise; checkpoint/3-alarm criticism VERIFIED for the game generally - GamesRadar + FW]
- IGN (DS, 28 Jun 2005): co-op is "fine" because both players use the same third-person scheme; Versus is close to broken. [SINGLE SOURCE]
- Pocket Gamer (DS, Jon Jordan, 1 Jul 2005): the multiplayer is well designed; co-op is one unarmed Hacker guarded by the other player. Overall the game is called a near-disaster for control/tech reasons. [SINGLE SOURCE]
- NWR (DS, Daniel Bloodworth, 29 Jun 2005): could not test co-op (only one copy); doubts players will find a partner who owns the game. [SINGLE SOURCE]. Gameswelt (DS): calls the co-op "bonus missions" and notes everyone needs their own cartridge. [SINGLE SOURCE]. Empire (DS): calls the multiplayer modes disappointing without detail. [SINGLE SOURCE]
- Gaming Target (N-Gage, Matt Swider, 4 Aug 2005): describes the co-op roles; regrets that co-op works only over local Bluetooth, not N-Gage Arena, so finding a partner is the problem. [SINGLE SOURCE]. multiplayer.it (N-Gage): calls the two Bluetooth modes bold and interesting. [SINGLE SOURCE]
- Recurring frustration across both handhelds: finding a second player with the same game and hardware nearby. [VERIFIED - NWR + Gaming Target + Gameswelt]
- No review describes a specific co-op mission moment. [GAP]

## 6. Handheld vs console co-op design (comparison)

Console facts below come from the other notes in this folder (systems_rules.md, coop_moves.md and the mission files) and keep their tags there; handheld facts are tagged above.

| Aspect | N-Gage / DS (Gameloft) | Xbox/PC and PS2/GC (Ubisoft) |
|---|---|---|
| Players and link | 2 players, local only: Bluetooth (N-Gage) or DS wireless with one cart each | split-screen, System Link, online (Xbox/PC); PS2/GC split-screen |
| Characters | "Shadownet Hacker" and "Shadownet Assault", fixed classes chosen in the lobby | Agent One and Agent Two, same abilities and kit |
| Asymmetry | hard: computers are Hacker-only, electric panels are Assault-only; separate loadouts (non-lethal shocker/chaff/flash vs rifle/pistol/frags/cams); only Assault has night/thermal vision (FW) | soft: identical agents; asymmetry comes from position and timing (one boosts, one is boosted) |
| Co-op moves | none found; only "heal ally" | many: boost, Tomoe Nage throw, human ladder, dual rappel, hang-over, shoulders, simultaneous actions |
| Synchronised actions | yes: two switches pressed at the same time (Breakdown) | yes: simultaneous retinal scans, simultaneous bomb-wire cuts and more |
| Partner down | about 30 s to reach him and use a health pack | about 30 s revive window; limited revives |
| Alarms | 3 alarms = abort; alarm level can drop later | Xbox/PC: escalating alarm stages (armour, helmets, fortify), not an abort except some missions; PS2/GC sub-levels: 3 alarms = fail |
| Structure | 2 missions split into 3 + 2 short parts (3-10 min each in a normal run) | 4-7 long missions (Xbox/PC) or missions split into sub-levels (PS2/GC) |
| Story | own plot: ARGUS HQ data raid -> rescue of Col. Geoff Trason in Cuba | runs in parallel with Sam's campaign (Panama, Seoul, North Korea, NYC) |
| Camera | 3D third-person on both handhelds (not 2D, not top-down) | 3D third-person |
| Escort | wounded colonel carried out in Escape | no carry-escort in the base co-op missions documented in this folder (prisoner/target capture exists, e.g. Jong in Seoul) |

Design takeaways (my analysis):
- Gameloft could not reproduce the physical co-op moves on handheld controls, so it moved the interdependence into role permissions: two device types (computer vs panel), each usable by one class only. This is a cheap, readable way to force cooperation: a level designer puts a lock on the path and picks which class holds the key.
- The 15-second panel windows (lasers, lights) create short timing tasks: the panel user opens a window, the partner moves through it. It is a softer, asynchronous version of the console synchronised actions. Breakdown's two-switch press is the only documented true sync task.
- The kits are complementary: the Hacker is the stealth/electronics specialist with no lethal weapon; the Assault is the protector who can kill, scout with sticky cams and see lasers in thermal. Reviewers describe the result as a protect-the-hacker loop (Pocket Gamer).
- Short parts with one twist each (lift power cut, detection and ceiling escape, missing fuse, carry the colonel) suit handheld sessions and the 3-alarm abort.

## 7. Gaps

- No source maps the room-by-room layout of any part; FW gives only the device list and effects.
- Rooftops: what its one panel and one computer do; the route; any security.
- Breakdown: whether the two simultaneous switches need one player each (likely) or a Hacker plus anyone; where they are.
- Corruption: whether the detection and ceiling escape is always scripted or depends on being seen; what happens at the 6-minute timer; which computer is the main server.
- Prison Rescue / Escape: who can pick locks; who carries the colonel and how carrying works (speed, weapons, swapping); whether the colonel can be put down; fail rules for his death; where the four turret computers are; real order of events (only FW's list order).
- Whether checkpoints exist inside the co-op parts (FW says the alarm count drops "after each checkpoint" for the game in general; NG-TXT only shows the co-op alarm-lowered line).
- Difficulty levels in co-op, scoring and unlock order of the five parts (is Prison Rescue locked until Corruption is done?).
- N-Gage vs DS co-op map differences; whether the N-Gage needs one game card per player.
- Whether the missing internal keys COOP_04-06 were cut co-op parts.
- Night/thermal vision rule for the Hacker comes only from FW; NG-TXT does not show a co-op-specific vision rule.
- No GameFAQs DS co-op guide reachable (403); no DS or N-Gage manual on archive.org; GameSpot reviews (N-Gage 8.6, DS 5.6) blocked (403).

## 8. Sources

Primary / game data
- NG-TXT: N-Gage build v1.0.240 file listing on archive.org: https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240_Files.zip/ - fetched only system/apps/6r73/6r73.dat (plus version.txt), decompressed the zlib blocks locally and read the localisation strings (COOP_01..08, COOP_GEN, lobby, multi, interactions, gamestats, HUD descriptions, asset names). Also on archive.org: v1.0.214 Review Kit 2, v1.0.247 Demo (not used).
- N-Gage Media Preview Kit (archive.org ISO): https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit_Image.iso/ - Factsheet PDF (1-4 players via Bluetooth, 2-player co-op, 4-player 2v2 versus, promised Arena multiplayer) and Quick guide controls PDF (number-key controls, key 3 cycles thermal/night/normal). The kit also holds a "video_preliminary_multiplayer.zip" (not downloaded; probably the source of the beta YouTube clip).

Wiki
- FW (counted once): Fandom EN API pages Rooftops, Breakdown, Corruption, Prison Rescue, Escape, Tom Clancy's Splinter Cell: Chaos Theory (N-Gage/DS), Template:Splinter Cell Chaos Theory (N-Gage/DS), Agent One, Agent Two, Shadownet, Alarm, Sticky Shocker, Chaff Grenade (cached in /home/user/raw/wiki/). Fandom RU API pages Крыши, Авария, Коррупция, Тюремное спасение, Побег (https://splintercell.fandom.com/ru/api.php) - same content plus the mine/shocker note.

Press releases / previews
- NWR, 11 May 2005, Ubisoft DS feature release (five co-op levels, Assault/Hacker expertise, 7 versus maps): https://nintendoworldreport.com/news/10528
- NWR, 3 Jun 2005, DS gone gold (same feature list): https://nintendoworldreport.com/news/10601
- Nokia release 31 Mar 2005 via GamesIndustry.biz (Bluetooth co-op and head-to-head; Arena for clips and rankings): https://www.gamesindustry.biz/tom-clancyrsquos-splinter-cell-chaos-theory-tm-for-the-n-gage-platform-shipping-now
- Pocket Gamer N-Gage launch news (fully 3D, demos): https://www.pocketgamer.com/x-men-legends-splinter-cell/x-men-and-splinter-cell-infiltrate-the-n-gage/
- gry-online N-Gage demo news (demo over Bluetooth, Gameloft first covered Dec 2004): https://www.gry-online.pl/newsroom/zagrajcie-na-n-gage-w-demo-tom-clancys-splinter-cell-chaos-theory/z649d5
- Digitimes Nokia release 31 Mar 2005 (paywalled teaser only): https://www.digitimes.com/news/a20050331PR203.html

Reviews
- Gaming Target, N-Gage, Matt Swider, 4 Aug 2005 (roles, Bluetooth, no Arena co-op): https://www.gamingtarget.com/article.php?artid=4509
- multiplayer.it, N-Gage (2-player Bluetooth co-op, 4-player versus, Arena scoreboards): https://multiplayer.it/recensioni/splinter-cell-chaos-theory.html
- IGN, DS, Craig Harris, 28 Jun 2005 (3D engine, touch screen, co-op "fine", versus broken, based on N-Gage version): https://www.ign.com/articles/2005/03/24/splinter-cell-chaos-theory (redirected to the DS review)
- GamesRadar, DS (five original co-op missions; checkpoints and three-strike alarms): https://www.gamesradar.com/splinter-cell-chaos-theory-2/ (curl worked; WebFetch returned a truncated page)
- Pocket Gamer, DS, Jon Jordan, 1 Jul 2005 (unarmed hacker protected by partner; stylus lock-picking): https://www.pocketgamer.com/tom-clancys-splinter-cell-chaos-theory/review/
- NWR, DS review, Daniel Bloodworth, 29 Jun 2005 (one copy per player; multiplayer untested): https://nintendoworldreport.com/review/4376/tom-clancys-splinter-cell-chaos-theory-ds-nintendo-ds
- Gameswelt, DS (co-op bonus missions; one module per player): https://www.gameswelt.de/tom-clancys-splinter-cell-chaos-theory/test/tom-clancys-splinter-cell-chaos-theory-ds-606
- Empire, DS (multiplayer disappointing): https://www.empireonline.com/gaming/reviews/tom-clancy-splinter-cell-chaos-theory-2-review
- Wikipedia CT article (cached /home/user/raw/wp_ct.txt): Gameloft made N-Gage/DS/mobile; review scores (GameSpot N-Gage 8.6, DS 5.6; GameSpy N-Gage 4.5/5, DS 2.5/5).

Videos (descriptions/chapters read; frames viewed only as YouTube auto-thumbnails)
- SHOCK-25, "Splinter Cell 3: Chaos Theory Coop [DS-MelonDS] Missions 1-2-3 - Rooftops. Breakdown. Corruption", 5 May 2022, 57:01, two MelonDS instances over emulated Wi-Fi; description lists per-part timestamps, panel/computer counts, KO counts: https://www.youtube.com/watch?v=-Y6zjZ7oVNM
- arronmunroe, "Tom Clancy's Splinter Cell: Chaos Theory Nintendo DS 2 player Co-op and Versus", 1:05:48; chapters: Rooftops 0:19, Breakdown 3:46, Corruption 7:49, Prison Rescue 17:48, Escape 26:55, then versus maps Offices, Garage, Museum, Mansion, Warehouse, Laboratory: https://www.youtube.com/watch?v=jnQ74p1Klf8
- Andrew A, "N Gage SplinterCell Chaos Theory preliminary multiplayer", 4:46, press footage of the co-op beta from an archive.org dump, no sound: https://www.youtube.com/watch?v=oozYweL4ASM
- Other handheld videos found (not used for co-op facts): ngage.arhn.eu N-Gage longplay 8:53:15 https://www.youtube.com/watch?v=60_igXGTMw0 (description = official N-Gage blurb: co-op for two over Bluetooth, versus up to 4); DarkInput N-Gage full walkthrough https://www.youtube.com/watch?v=pcTmAqXuFbE and DS full walkthrough https://www.youtube.com/watch?v=G3QsJrkpMGw (single-player); Lvaneede N-Gage gameplay https://www.youtube.com/watch?v=rNpTE0xvf1A ; N Gaming AYT 2 EKA2L1 https://www.youtube.com/watch?v=YWF-zEiZTaM

Failed / blocked
- GameSpot N-Gage review (1900-6121193) and DS review (1900-6128541): 403 via WebFetch; GameSpot DS ship news: empty via curl.
- GameFAQs DS FAQ list: 403.
- GameSpy N-Gage/DS review URLs (wireless.gamespy.com, ds.gamespy.com): dead (24-byte reply).
- ngage.arhn.eu: site suspended (OVHcloud page).
- IGN DS preview URL guess (2005/05/11): empty page.
- co-optimus.com: blocked (60-byte reply).
- YouTube player API (storyboards) and chapter thumbnails: login/bot wall; only auto-thumbnails hq1-3 were reachable.
- archive.org: no N-Gage or DS manual found; WebSearch found no DS-specific co-op walkthrough.
