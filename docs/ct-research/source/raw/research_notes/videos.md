# Splinter Cell: Chaos Theory co-op - video catalogue

Status: first full pass complete (2026-10-17). Nothing here was watched. All notes come from video titles, channel names, durations, playlist listings and the text on each watch page (description, creator chapter lists, upload date, view count), read through YouTube's search page, playlist pages and the public `youtubei/v1/next` endpoint.

How to read the tags:
- [VERIFIED] = stated by 2+ independent uploaders/sources. [SINGLE SOURCE] = one uploader's description or title. [UNCERTAIN] = inference from a title, or a YouTube auto-generated chapter list.
- "Creator chapters" = timestamps the uploader typed into the description. "Auto chapters" = chapter titles YouTube shows that do NOT appear in the description. These look machine-generated and are sometimes wrong. One Seoul video's auto chapters name the target "John Hu" instead of Jong Pom-chu. Treat auto chapters as [UNCERTAIN].
- Platform comes from the uploader's own wording where possible. "PC (likely)" means it was inferred, e.g. from Bandicam/Steam mentions or the Seoul 90% bug that one uploader calls PC-only.
- Lengths are the YouTube durations shown in search results.

---

## 0. Facts the video pages establish (useful for the level-design notes)

### 0.1 Mission order and naming
- PS2 co-op order is Team Training, Seoul, Chemical Bunker, Train Station, Panama. Jake "Ziggity" Steven numbers his PS2 US videos 01-05 this way, and SHOCK-25's PS2 (PCSX2) co-op videos are numbered Mission 0-4 in the same order. [VERIFIED]
- PS2 sub-level names, from Jake Ziggity's creator chapters plus SHOCK-25's Russian chapter names, which match one-to-one [VERIFIED]:
  - Seoul: Streets, Rooftops, Gardens, Fish Market, Cyber-Cafe.
  - Chemical Bunker: Silo, Laboratories, Cryogenic Chamber, Storage Room, The Docks.
  - Train Station: Train Repair Station, Hydro Tunnel, Subway, The Station.
  - Panama: The Alley, East Wing, Archives, Server Room.
- Jake Ziggity says PS2 co-op cannot save mid-mission, which is why it is split into small levels, and that Panama is last on PS2 but first on Xbox/PC. [SINGLE SOURCE]
- Xbox/PC order as uploaders number it: Training, Panama, Seoul 3, Chemical Bunker, Train Station, then the two later missions. [VERIFIED - hexen2k7, R3xXcoN GAMING, Urban Reflex, Agt_ Pendergast, DeepVelocityOps]
- The order of the two late missions differs between uploaders:
  - Nuclear Plant before UN HQ: hexen2k7, Urban Reflex, Agt_ Pendergast, 3dCossack, BoSstonPL ("Mission 5" = Nuclear Plant).
  - UN HQ before Nuclear Plant: R3xXcoN GAMING (Mission 5 = UN HQ, 6 = Nuclear Plant), DeepVelocityOps and CouchiesTV chapters.
  - A Russian PC duo (dat_carlin, part 6) say they realised the game had the two missions swapped: Nuclear Plant should come fifth, because they were sent after a bomb they had already dealt with in the previous episode. [VERIFIED that orderings differ; [SINGLE SOURCE] for the "swapped in the menu" explanation]
  - The Nuclear Plant briefing (in hexen2k7's description) follows straight on from Grand Central. The UN HQ briefing turns on a Jin Soo transmission. This supports story order Train Station > Nuclear Plant > UN HQ. [SINGLE SOURCE - hexen2k7 description; consistent with dat_carlin]
- The Seoul 3 co-op mission cannot score above 90% on PC because of a bug:
  - V339 says even a cheat-assisted perfect ghost with the boat sabotage gave 90%.
  - hexen2k7 calls it a PC-version bug that Ubisoft confirmed.
  - soluceinfo (FR) and Lulz Productions also report 90%.
  - [VERIFIED that it caps at 90%; [SINGLE SOURCE] for "Ubisoft confirmed" and "PC only"]
- Other reported score oddities:
  - R3xXcoN got 97% on Chemical Bunker without being detected. [SINGLE SOURCE]
  - PleasePlayMore says several co-op missions have glitches that block 100%. [SINGLE SOURCE]
  - BK201Tach says the "follow Chu to the locker" opportunity objective looked impossible: letting him open the locker ended the mission, and stopping him earlier did not count. [SINGLE SOURCE]

### 0.2 Xbox/PC objective lists (paraphrased from hexen2k7's descriptions; corroboration noted)
- Training: a series of move drills:
  - read the info panels
  - boost a partner over a wall (Short Scale)
  - beat a camera with the jammer
  - perform the Tomoe Nage throw
  - hack a computer while hanging (Hangover) to kill a laser
  - hack a dual retinal scanner
  - do a dual rappel
  - [SINGLE SOURCE for the full list. The move names also appear in the project brief from the Fandom wiki, so they are [VERIFIED] as named co-op moves.]
  - V339 adds that 100% needs at least one info panel re-read. [SINGLE SOURCE]
- Panama: reach the archives, reach the main server, exfiltrate. The briefing frames it as a hunt for the Panamanian Vice President's bribery records. ("Access the Archives" also appears as R3xXcoN's mission label.) [VERIFIED]
- Seoul 3:
  - Primary: capture Jong Pom-chu, learn where he is, destroy two Chun-ma anti-air vehicles, reach the cyber cafe guarding him, take him to extraction.
  - Opportunity: interrogate a North Korean officer for his location; sabotage his escape boat.
  - "Capture Jong Pom-chu" is also R3xXcoN's label. [VERIFIED for the capture goal; rest SINGLE SOURCE]
  - Splinter (PC Expert video) calls interrogating "the General" a bonus objective. SHOCK-25's PS2 Rooftops chapter also interrogates a general. [VERIFIED that a general/officer interrogation exists]
- Chemical Bunker:
  - Primary: enter down a missile silo; get the viral protocol from the main lab; get a chimpanzee blood serum for the antidote; take an anti-virus sample from the cryogenic chamber; take a viral sample from a missile; exfiltrate.
  - Opportunity: a monkey-autopsy videotape.
  - R3xXcoN's labels "Get some samples" and "Get Anti Virus Samples" agree on the samples goal. [VERIFIED for samples; rest SINGLE SOURCE]
- Train Station:
  - Primary: learn Colonel Kim's real aim; defuse bombs under the station; bug a hall telephone before Chu reaches it; get an antidote from a locker; eliminate a contaminated soldier in a bathroom; stop Kim's men leaving with the toxin.
  - Opportunity: bomb schematics; follow Chu to the locker; secure the toxin from the infected soldier.
  - Suru's creator chapters (bomb schematics, three bombs, phone bug, Chu, extraction) and R3xXcoN's label "Bug the Phone Call" corroborate the bombs, schematics and phone bug. [VERIFIED for those; rest SINGLE SOURCE]
- Nuclear Plant (Yongbyon):
  - Primary: find out who helped Kim; exfiltrate.
  - Secondary: whether Kim can strike again.
  - Opportunity: complex blueprints.
  - The briefing ties the plant to double-laser detonators found in the station bombs.
  - R3xXcoN's label "Find out who helped Kim" agrees. [VERIFIED for the main goal]
- UN Headquarters:
  - Primary: infiltrate; recover encrypted data sent by Jin Soo; reach the security control room; stop Colonel Kim; defuse a bomb.
  - The briefing forbids lethal force and says a general alarm aborts the mission.
  - R3xXcoN's label "Stop Colonel Kim" agrees. [VERIFIED for "stop Kim"; no-lethal/alarm-abort rule SINGLE SOURCE]
  - hexen2k7's 100% run records one knockout, marked as an objective. [SINGLE SOURCE]

### 0.3 PS2 beat lists (paraphrased from SHOCK-25's creator chapters, a 100%/no-alarm PS2 run; all [SINGLE SOURCE] unless noted)
- Team Training: one computer, two retinal scanners hacked, a data read. Jake Ziggity adds two points: the level uses a North Korean soldier as the dummy enemy, and only one player needs to reach the final exit. [SINGLE SOURCE each]
- Seoul:
  - Streets: interrogate a soldier, pick up a wall mine on an upper floor, use a computer.
  - Rooftops: interrogate a general.
  - Gardens: place an explosive charge to destroy the air-defence unit.
  - Fish Market: wall mine by the stairs on the pilings; 4-stage door lock.
  - Cyber-Cafe: interrogate Jong Pom-chu.
- Chemical Bunker:
  - Silo: 3-stage lock; a computer that changes the objective.
  - Laboratories: keypad door, three hacked computers, two scientists interrogated.
  - Cryogenic Chamber: two computers.
  - Storage Room: two computers.
  - Docks: wall mines near the boat.
  - Jake Ziggity flags motion sensors on the way down the silo. [SINGLE SOURCE]
- Train Station:
  - Repair Station: pick up wall mines; use an explosive to open a door; disarm a laser mine.
  - Hydro Tunnel: computer, wall mine, two laser mines.
  - Subway: computer, laser mine, 6-stage lock on the final door.
  - The Station: an interrogation (target named "Kim Chu" in Russian).
  - Jake Ziggity says Hydro Tunnel is hardest, because a camera guards the laptop for the opportunity objective, and the last room has two patrolling guards around the final bomb. [SINGLE SOURCE]
- Panama:
  - The Alley: two computers.
  - East Wing: an EMP charge to open an elevator, a hacked computer, two retinal scanners on the last door.
  - Archives: interrogate Medeiros; a keypad door with a 4-digit code; three computers.
  - Server Room: a retinal scanner beside a laser grid.

---

## 1. Per-mission video lists

Format: URL | title (shortened) | channel | length | platform | notes

### 1.1 Training (Xbox/PC "Training Facility") and Team Training (PS2/GC)
1. https://www.youtube.com/watch?v=2VRGQUT2JvQ | Coop: Training (100% / Expert / Elite / Ghost) | V339 | 4:03 | PC (likely) | No commentary; partner planned a full ghost; elite mode means no starting ammo; panel re-read needed for 100%.
2. https://www.youtube.com/watch?v=WQ__XNyWP0M | COOP Training 100% Elite No KO/Kill | hexen2k7 | 3:14 | PC (likely) | 2008; the description lists every training objective (the move drills). Best short "all moves" reference.
3. https://www.youtube.com/watch?v=0hK1AeB07wk | CO-OP Walkthrough, 100% Stealth, Part 1 "Training" | Centerstrain01 | 15:56 | not stated | 57k views; auto chapters include "Inverted Descent" and "Double Hacking" [UNCERTAIN].
4. https://www.youtube.com/watch?v=1_spcLojzxo | Coop [1: Training] | Agt_ Pendergast | 15:32 | not stated | Part of a complete 7-mission playlist (2023).
5. https://www.youtube.com/watch?v=obcKEeRniRw | (Co-Op PS2 US Version) 01 - Team Training | Jake "Ziggity" Steven | 7:16 | PS2 (emulated) | See 0.3 notes.
6. https://www.youtube.com/watch?v=MmH3o7WF4wg | Coop [PS2-PCSX2-HD] Mission 0: Training | SHOCK-25 | 5:36 | PS2 (emulated) | Russian; 100%, no alarms; timestamped computer and retinal scans.
7. https://www.youtube.com/watch?v=gy1Vt3pxX8U | (PS2) Coop Campaign: Training Walkthrough | WalkthroughCinema | 4:20 | PS2 | 147k views, the most-viewed PS2 co-op clip found.
8. https://www.youtube.com/watch?v=gm9uYnMw9KA | Chaos Theory Co-op Training | ysuck63 | 3:10 | GameCube | 2008; start of a GC co-op playlist.
9. https://www.youtube.com/watch?v=jpNE979X_6M | Co-Op Part 1: Super Secret Agent Training | pwnagemcgee | 8:34 | not stated | Commentary; auto chapters cover rope moves and security [UNCERTAIN].
10. https://www.youtube.com/watch?v=PP_1bFZ7sU4 | (Coop) Training IL 1:28 (WR) | Playbottl | 1:50 | not stated | Speedrun; shows the minimum route.
- Also: https://www.youtube.com/watch?v=d4BM_kYG0Zw (soluceinfo, FR, 4:00); https://www.youtube.com/watch?v=OXPj2u6IL0Y (Melisca 24, Xbox, commentary, 13:50); https://www.youtube.com/watch?v=RXNrz5N-qZE (PS2 split-screen, 10:00); https://www.youtube.com/watch?v=m5lUF8rdW4Q (PS2 "Coop Trening", 4:21).

### 1.2 Panama
1. https://www.youtube.com/watch?v=KlU0002suD4 | Coop: Panama (100% / Expert / Elite / Ghost) | V339 | 22:46 | PC (likely) | No commentary; uploader says the only traces left were a few alerted guards and two hacked eye scanners.
2. https://www.youtube.com/watch?v=TvecAMtS_vk + https://www.youtube.com/watch?v=a7m1K7VaJOI | COOP Panama 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 6:15 + 6:15 | PC (likely) | In-game time 10:58, zero detections; briefing and objectives in description.
3. https://www.youtube.com/watch?v=jgsTLGSXyMc | CO-OP Walkthrough, 100% Stealth, Part 2 "Panama" | Centerstrain01 | 22:23 | not stated | 80k views; auto chapters: Archives, Extraction [UNCERTAIN].
4. https://www.youtube.com/watch?v=1risWusbZWc | Coop Mission 1 - Panama 100% Expert | R3xXcoN GAMING | 16:38 | PC (Bandicam) | Single file; part of a 32-video co-op playlist.
5. https://www.youtube.com/watch?v=631YgJdDgyg | CO-OP Full Stealth Walkthrough (Mission 1: Panama) | Defy248 | 35:34 | not stated | Expert, Elite, 0 KOs; slower, more deliberate.
6. https://www.youtube.com/watch?v=_YLK0cjSekE | Co Op Mission 1 Panama 100% With No Alarms | Because I Can | 23:29 | Xbox | 2025; one save used; first part has no audio.
7. https://www.youtube.com/watch?v=D1zUg9YGRj0 | XLink Kai Co-op - Mission 1 Panama | Xbox Kai Fam Live | 52:18 | original Xbox, online | Failed attempts cut out; normal (non-ghost) play.
8. https://www.youtube.com/watch?v=2FmkMk4rHQw | (Co-Op PS2 US Version) 05 - Panama | Jake "Ziggity" Steven | 31:01 | PS2 | Creator chapters: The Alley 0:00, East Wing 5:05, Archives 13:03, Server Room 22:57.
9. https://www.youtube.com/watch?v=ksP5rk2eJKQ | Coop [PS2-PCSX2-HD] Mission 4: Panama | SHOCK-25 | 29:38 | PS2 | Detailed beat timestamps (see 0.3).
10. https://www.youtube.com/watch?v=CtGfBsU1DwI (+ parts 2-4 in the ysuck63 GC playlist) | Co-op Panama Bank Part 1 | ysuck63 | 4:32 | GameCube | The uploader names the level "Panama Bank". CouchiesTV's full-run chapters also put a "BANK" segment after Panama. What "bank" refers to here is [UNCERTAIN].
- Also: https://www.youtube.com/watch?v=wU3hCoPYtT4 / https://www.youtube.com/watch?v=UvTRAKxshoU (TimbuckRules, Expert 100%, 2009); https://www.youtube.com/watch?v=qDooMV-HnYM (ImbaSneakingTeam, 100% Expert/Elite in 8:05); https://www.youtube.com/watch?v=Rl592Km8OZw (Urban Reflex, PC, commentary, 43:14); https://www.youtube.com/watch?v=XS6GZuy4iBg (NickyTheGamer, GC); https://www.youtube.com/watch?v=lFHlkLTsKQI (PS2 split-screen, 2:07:14); https://www.youtube.com/watch?v=0QznY6rsC3U (hexen2k7 "Action in Panama", 9:31, apparently a stylised edit; content unknown).

### 1.3 Seoul ("Seoul 3" on Xbox/PC)
1. https://www.youtube.com/watch?v=A9qRzUt9RtE | Coop: Seoul 3 (100%* / Expert / Elite / Ghost) | V339 | 19:47 | PC (likely) | Explains the 90% cap; many forced engagements avoided with careful smoke grenades.
2. https://www.youtube.com/watch?v=1-KpQGqaYd8 + https://www.youtube.com/watch?v=M3kPwc52rmI | COOP Seoul3 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 6:18 + 6:34 | PC | In-game time 10:46; one knockout and two civilian knockouts, all marked as objectives.
3. https://www.youtube.com/watch?v=_1ijhaN0cmw | CO-OP Walkthrough, 100% Stealth, Part 3 "Seoul 3" | Centerstrain01 | 20:14 | not stated | Auto chapters mention a tank sabotage and an interrogation [UNCERTAIN].
4. https://www.youtube.com/watch?v=S1KySIBDvKQ | Co-op: Seoul PC (Expert) HD | Splinter | 31:45 | PC | Both screens shown; no-KO "tactical espionage" style; general interrogation noted as a bonus objective.
5. https://www.youtube.com/watch?v=yQPMp8u8Cqc + https://www.youtube.com/watch?v=zs2CPw52P-E | Coop Mission 2 - Seoul 3 1/2, 2/2 100% Expert | R3xXcoN GAMING | 10:35 + 7:06 | PC | One KO. An Elite/Expert version is also in the same playlist.
6. https://www.youtube.com/watch?v=EasI1Hs9TWM | XLink Kai Co-op - Mission 2 Seoul | Xbox Kai Fam Live | 31:21 | original Xbox | Fails cut out.
7. https://www.youtube.com/watch?v=__LRg8KrYQ8 | (Co-Op PS2 US) 02 - Seoul | Jake "Ziggity" Steven | 18:50 | PS2 | Creator chapters: Streets 0:00, Rooftops 2:52, Gardens 5:25, Fish Market 9:00, Cyber-Cafe 13:55.
8. https://www.youtube.com/watch?v=KWwInB9WjNY | Coop [PS2-PCSX2-HD] Mission 1: Seoul | SHOCK-25 | 15:06 | PS2 | Beat timestamps (see 0.3).
9. https://www.youtube.com/watch?v=cwBOPjYbi5k | co-op walkthrough SEOUL | NickyTheGamer | 6:09 | GameCube | Uploader says the GC Seoul sub-missions are very short; all fit in one video, the first done in under a minute.
10. https://www.youtube.com/watch?v=65Ls9P9GwKE + https://www.youtube.com/watch?v=cLMkZMd3nwE | Co op Campaign - Seoul 1/2, 2/2 - Split Screen | BK201Tach | 15:36 + 12:51 | not stated (split-screen) | Commentary-free family playthrough.
- Also: https://www.youtube.com/watch?v=-mf3o-FxGAQ (Defy248, Expert Elite, 28:36); https://www.youtube.com/watch?v=puvCXAdiRxk (soluceinfo FR, Expert, 90%); https://www.youtube.com/watch?v=PRhaF2S6EJw (ysuck63 GC, first two sub-missions at 100%); https://www.youtube.com/watch?v=Kkqs_P6Q7r8 (GC on Dolphin 2/3); https://www.youtube.com/watch?v=vP51V2QUMS0 (fisher5390, 2007, "stealth 100%", 5:54, platform unknown); https://www.youtube.com/watch?v=axYqdY1AJ9E (Spyker2041 first-time run; its auto chapters misname Jong, showing auto chapters are unreliable).

### 1.4 Chemical Bunker
1. https://www.youtube.com/watch?v=chb66dBOt74 + https://www.youtube.com/watch?v=ILxhYQ1BHc0 | COOP Chemical Bunker 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 10:10 + 10:10 | PC | In-game time 19:39, zero detections; full objective list in description.
2. https://www.youtube.com/watch?v=FmSiWt_hVG4 + https://www.youtube.com/watch?v=mqyj-66XLMo | Coop Mission 3 - Chemical Bunker 1/2, 2/2 100% Elite/Expert | R3xXcoN GAMING | 15:17 + 14:05 | PC | A 4-part Expert version is also in the playlist (got 97%).
3. https://www.youtube.com/watch?v=pMqEoJ1m8Oc | Coop [4: Chemical Bunker] | Agt_ Pendergast | 46:53 | not stated | Single file, full mission.
4. https://www.youtube.com/watch?v=hHg-nYqfLzA | PC - Co op Chemical Bunker [4K:60FPS] | ShepherdMods | 42:33 | PC | High-resolution capture, useful for reading geometry.
5. https://www.youtube.com/watch?v=nCJ8xbWt-nM | co-op 100% Chemical bunker | Zolt Assassin | 44:14 | not stated | Page not read; the 100% claim comes from the title only.
6. https://www.youtube.com/watch?v=qLQEHSaRECM | (Co-Op PS2 US) 03 - Chemical Bunker | Jake "Ziggity" Steven | 32:29 | PS2 | Creator chapters: Silo 0:00, Laboratories 6:04, Cryogenic Chamber 15:56, Storage Room 21:25, The Docks 27:42.
7. https://www.youtube.com/watch?v=NTaZh6gW8R0 | Coop [PS2-PCSX2-HD] Mission 2 | SHOCK-25 | 37:54 | PS2 | Beat timestamps (see 0.3).
8. https://www.youtube.com/watch?v=xVf5HzPBx9Q + https://www.youtube.com/watch?v=T2XssBZ_jgI | co-op walkthrough Chemical Bunker Part 1, 2 | NickyTheGamer | 8:20 + 7:38 | GameCube (per uploader's Seoul description) | Uploader mentions a big shortcut in the first level.
9. https://www.youtube.com/watch?v=8Ldd9814MoE (+ parts 2-5 in playlist) | SC: CT Co-op Chemical Bunker 1-5 | ysuck63 | 4:51 etc. | GameCube | Five parts, likely one per sub-level [UNCERTAIN].
10. https://www.youtube.com/watch?v=49TgQ2npG1Y | Coop - Chemical Bunker | Spyker2041 | 44:07 | not stated | First-time run. Auto chapters mention an elevator puzzle, laser grid, cryo access, retinal scanner and a "warhead room and crane puzzle" [UNCERTAIN]; worth checking on screen.
- Also: https://www.youtube.com/watch?v=8OvS5zQkS6w (Urban Reflex, PC, commentary, 51:17); https://www.youtube.com/watch?v=Cgp8_wNtyQk (PS2 split-screen, 55:15); https://www.youtube.com/watch?v=dWuinQ0k8pg (R3xXcoN 100% speedrun, 14:54).

### 1.5 Train Station
1. https://www.youtube.com/watch?v=2X5MvQPOQ14 + https://www.youtube.com/watch?v=yDq17RUC8fs | COOP Train Station 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 6:36 + 6:44 | PC | In-game time 11:41; full objective list in description.
2. https://www.youtube.com/watch?v=-JnlamHBZrc | Co-op Mission 5 - Train Station 100% HD | Suru | 13:38 | not stated | Elite, 0 kills, 0 alarms. Creator chapters: schematics 1:36, bombs 3:06 / 4:43 / 5:28, phone bug 7:24, Chu 10:56, extraction 13:30. Best single-file beat map.
3. https://www.youtube.com/watch?v=SXHCqjqi_Tc + https://www.youtube.com/watch?v=kRDWrH-zamE | Coop Mission 4 - Train Station 1/2, 2/2 100% Elite/Expert | R3xXcoN GAMING | 9:45 + 15:22 | PC | A 3-part Expert version is also in the playlist.
4. https://www.youtube.com/watch?v=xjynpfObTLs | Co-op: Train Station 1/2 PC (Expert) HD | Splinter | 40:38 | PC | 100% Expert, no KOs, very slow and cautious.
5. https://www.youtube.com/watch?v=B0INvKmshWg | Coop [5: Train Station] | Agt_ Pendergast | 32:04 | not stated | Single file.
6. https://www.youtube.com/watch?v=_UclJhv8ZUs | COOP 100% Train Station, Elite / Expert / Ghost | TrayZorXx67 | 19:17 | not stated | 2025, FR; partner's perspective is in a separate upload.
7. https://www.youtube.com/watch?v=ge7dEnjp6MU | (Co-Op PS2 US) 04 - Train Station | Jake "Ziggity" Steven | 30:34 | PS2 | Creator chapters: Train Repair Station 0:00, Hydro Tunnel 5:37, Subway 16:42, The Station 23:00.
8. https://www.youtube.com/watch?v=gxnoQJNrPV8 | Coop [PS2-PCSX2-HD] Mission 3 | SHOCK-25 | 33:06 | PS2 | Beat timestamps (see 0.3).
9. https://www.youtube.com/watch?v=NrooRPC9cog | co-op walkthrough Train Station part 1 | NickyTheGamer | 8:56 | GameCube (likely) | 53k views.
10. https://www.youtube.com/watch?v=5t6c1xj2IqI | COOP Train Station No KO/KILL 100% HARD 1/2 | BoSstonPL | 16:38 | not stated | Polish.
- Also: https://www.youtube.com/watch?v=B5mtzFTTI3s (Urban Reflex, 35:03); https://www.youtube.com/watch?v=LY9-0Dk-YHk (ysuck63 GC); https://www.youtube.com/watch?v=1FYUWwle97Q (PS2 split-screen, 1:46:05); https://www.youtube.com/watch?v=PsHnw-tdpzQ (R3xXcoN 100% speedrun, 14:04).

### 1.6 Nuclear Plant (Xbox/PC only)
1. https://www.youtube.com/watch?v=OBU3MtaoKb4 + https://www.youtube.com/watch?v=rVg3fr3OrPA + https://www.youtube.com/watch?v=jry663Tx5bg | COOP Nuclear Plant 100% Elite No KO/Kill 1/3-3/3 | hexen2k7 | 8:02 + 8:03 + 8:07 | PC | In-game time 22:44; zero detections.
2. https://www.youtube.com/watch?v=phfqPfdFZdQ | [1920x1080 PC] Expert 100% #17 Coop Nuclear Plant | PleasePlayMore | 30:57 | PC | No commentary, single file; the uploader counts it as the fifth co-op mission.
3. https://www.youtube.com/watch?v=tg8sn2ZC2CY / https://www.youtube.com/watch?v=mODHEazeQr8 / https://www.youtube.com/watch?v=YpVZb_5lGq8 | Coop Mission 6 - Nuclear Plant 1/3-3/3 100% Expert | R3xXcoN GAMING | 8:37 + 6:51 + 10:09 | PC | Elite/Expert versions also exist (kM-HTagymSM, OWqEWyFiN34, ioOcGz6P_PQ).
4. https://www.youtube.com/watch?v=wIRXoX8nd0I | Coop [6: Nuclear Plant] | Agt_ Pendergast | 48:23 | not stated | Single file.
5. https://www.youtube.com/watch?v=8Ww7rE4UOm8 | Co-Op Part 5: Nuclear Plant | Urban Reflex | 52:39 | PC | Commentary.
6. https://www.youtube.com/watch?v=BXhyhwzT67c | COOP Nuclear Plant No KO/KILL 100% HARD 1/3 | BoSstonPL | 15:39 | not stated | Polish; counted as Mission 5.
7. https://www.youtube.com/watch?v=-TWOS7Mb1OA (+ 8L90xIjo9uk, wdxUBFyBMlA) | COOP - Nuclear Plant 1/3-3/3 | Pretend3r | 6:43 + 5:59 + 7:29 | not stated | Part of a complete playlist.
8. https://www.youtube.com/watch?v=H-AXCQQ8sCs | Co-op part 6: Nuclear Plant (RU) | dat_carlin | 54:28 | PC (likely) | Notes on the mission-order swap (see 0.1).
9. https://www.youtube.com/watch?v=BTZC73LY1Lw (parts 1-4) | COOP "Nuclear Plant" (RU) | PAYKOOBRAZNIY | 37:38 each approx. | PC | Russian commentary.
10. https://www.youtube.com/watch?v=H1dZFtX0jxY | Speedrun Co-op "Nuclear Plant" 8:31 | TimmyAkmed | 9:33 | not stated | Easiest settings with glitches; shows skips, not intended flow.

### 1.7 UN Headquarters (Xbox/PC only)
1. https://www.youtube.com/watch?v=5RBmv-nRtTs + https://www.youtube.com/watch?v=Vmob0mzcINg + https://www.youtube.com/watch?v=-mU9NO8dxVw | COOP UN Headquarters 100% Elite No KO/Kill 1/3-3/3 | hexen2k7 | 7:43 + 7:43 + 8:05 | PC | In-game time 21:32; one knockout (objective); briefing explains the non-lethal rule.
2. https://www.youtube.com/watch?v=3CH1BrvzlPA | [1920x1080 PC] Expert 100% #18 Coop UN Headquarters | PleasePlayMore | 34:17 | PC | No commentary, single file.
3. https://www.youtube.com/watch?v=v4gb6uKa5SQ + https://www.youtube.com/watch?v=uHMLby5KwZI | Coop Mission 5 - UN HQ 1/2, 2/2 100% Elite/Expert | R3xXcoN GAMING | 14:59 + 13:54 | PC | 3-part Expert version also exists (Ya-6NCCKmTg, 0iWVH-KZ6_8, DbJGFSi1FKo).
4. https://www.youtube.com/watch?v=yQH90XJtxTY + https://www.youtube.com/watch?v=2X_1z7gNOyw | Co-op UN HQ part 1, 2 | CR4ZY BALLISTICS | 21:15 + 9:13 | original Xbox (HD PVR capture) | Uploader calls it a longplay. The only confirmed original-Xbox capture of this mission found.
5. https://www.youtube.com/watch?v=TvaVH-CWZRM | Coop [7: UN Headquarters] | Agt_ Pendergast | 43:50 | not stated | Single file.
6. https://www.youtube.com/watch?v=748PAmV4MUc | Co-Op Part 6: UN Headquarters | Urban Reflex | 45:56 | PC | Commentary; uploader calls it the finale.
7. https://www.youtube.com/watch?v=vHbEPapMngk | UN HEADQUARTERS - CO-OP (No Commentary) | No Commentary Games | 43:27 | not stated |
8. https://www.youtube.com/watch?v=iTrJGQAZg-o | Coop Mission 5 UN HQ 100% SpeedRun | R3xXcoN GAMING | 17:04 | PC | Fast but still 100%.
9. https://www.youtube.com/watch?v=PoXfW1ZVeBI | COOP Mission "UN Headquarters" 1/2 (RU) | TheEasyNICK | 25:48 | PC (likely) | Russian commentary.
10. https://www.youtube.com/watch?v=QUCFE8TJccA | Czech coop LP - UN Headquarters part 1 | GhostLetsPlays | 22:19 | not stated | Czech commentary.
- Possibly relevant: https://www.youtube.com/watch?v=g1WZNszNcfE (TimmyAkmed speedrun "New York" 6:46). Which NYC mission it covers (Train Station or UN HQ) is [UNCERTAIN].

---

## 2. Full co-op campaign videos and playlists

Single-file complete runs:
- https://www.youtube.com/watch?v=4GtVpbf1xAw | Co-op Exclusive Campaign, Complete Walkthrough | DeepVelocityOps | 7:22:04 | PC (Steam link) | 30k views, 2024. Creator chapters: Training 0:00, Panama 14:06, Seoul 3 1:05:34, Chemical Bunker 1:42:26, Train Station 2:58:19, UN HQ 4:07:54, Nuclear Plant 5:33:56.
- https://www.youtube.com/watch?v=LLww3vy8_1Y | coop - Hard, All Side Objectives - No Commentary | 3dCossack | 4:17:33 | not stated | Creator chapters: Training 0:00, Panama 11:06, Seoul 3 1:07:37, Chemical Bunker 1:38:32, Train Station 2:14:32, Nuclear Plant 2:53:44, UN HQ 3:38:17.
- https://www.youtube.com/watch?v=AYR7YqF5aMI | We Have Splinter Cells At Home | CouchiesTV | 2:02:52 | not stated | Comedy edit with creator chapters for every mission (incl. a "Bank" segment after Panama).
- https://www.youtube.com/watch?v=BTeinCL-KFk | Unredacting the Chaos Theory files | ParagonMitchell | 4:29:26 | PC (likely) | Long cut; auto chapters cover training, archives, a VP confrontation, a North Korean sector, a subway bunker and a final lab [UNCERTAIN].
- https://www.youtube.com/watch?v=nNiX9-Mwk20 | part 1 - Split screen Co-op - 1080p60 - No commentary | No commentary dog | 1:35:15 | Xbox 360 backward compatibility (uploader) | 42k views. Calls it split-screen on Xbox hardware [SINGLE SOURCE].
- https://www.youtube.com/watch?v=0JWME32knV0 | PC COOP #1 (FR stream) | Tiflorg | 5:16:03 | PC | Creator chapters: Training 3:08, Panama 29:03, Seoul 1:54:34, Chemical Bunker 2:59:32.
- https://www.youtube.com/watch?v=kVCaUgzYtQk | PS2 Classics - COOP (stream) | DantasLevi | 1:33:50 | PS2 |
- https://www.youtube.com/watch?v=X8QWLd8Z18A + https://www.youtube.com/watch?v=XtLqqPY6kPU | Let's Play Coop (Part One, Two) | Croakitoad | 2:51:40 + 2:54:04 | PC (likely) | Uploader says all six story levels, including the two late Xbox/PC releases.
- https://www.youtube.com/watch?v=W7BvAS6uY2I | Coop Campaign (PT-BR) | JVCOMANDO | 2:24:33 |
- https://www.youtube.com/watch?v=7KTmpnSJCyA | longplay (coop) stream | Multi Topic Talk | 3:33:56 |

Playlists:
- https://www.youtube.com/playlist?list=PL8CD4BB2EF76017B9 | hexen2k7 | 15 videos, all 7 missions, 100% Elite, Hard, no kills/alarms/bodies, no KO. Best clean reference set.
- https://www.youtube.com/playlist?list=PL9kYDIS3DwQiZYkt4hYaAOmqWvOCWC1pf | R3xXcoN GAMING "Classic SCCT Coop 100% Expert" | 32 videos: Expert, Elite/Expert and 100% speedrun versions of the six post-training missions.
- https://www.youtube.com/playlist?list=PLgyR0yzZK_7f-4rjO4iJke08CTCPtgLV8 | Agt_ Pendergast | 7 videos, one per mission, 15-50 min each.
- https://www.youtube.com/playlist?list=PLlSX5tH1nyFhjC01UAVXBo7kYJytZdOJu | Urban Reflex | 6 videos (Panama to UN HQ), PC, commentary.
- https://www.youtube.com/playlist?list=PL5D9DAA99163BEC2A | Pretend3r "COOP [complete]" | 12 videos.
- https://www.youtube.com/playlist?list=PL26727E6F5CCD6690 | ysuck63 "Co-op (GC)" | 16 videos, GameCube, 2008-09. The most complete GC co-op set found.
- https://www.youtube.com/playlist?list=PLAMlJxzkqk8hbfSlOVvdnHjS4hpezJdCQ | SHOCK-25 PS2 (single player + co-op) | items 11-15 are the full PS2 co-op campaign, 100% / no alarms, with timestamped beats.
- Jake "Ziggity" Steven PS2 US co-op 01-05: obcKEeRniRw, __LRg8KrYQ8, qLQEHSaRECM, ge7dEnjp6MU, 2FmkMk4rHQw (no playlist found; search by title).
- https://www.youtube.com/playlist?list=PLspeOI0YmcdN9YHJYZWXxLagyzkU5liyD | GaLm "Casual Agents" | 15 episodes, commentary; episode 1 has 89k views.
- https://www.youtube.com/playlist?list=PL3FLe35dimGTQfLLgtdxrdNACeDc0fMO0 | YMS Streams "Plazethrough" | 8 parts, roughly 45-90 min each, commentary.
- https://www.youtube.com/playlist?list=PLDABDF07C09F86F5A | DoubleTroubeify with AxmanAMV | 40 episodes, commentary. Episode titles hint at beats ("Crane Life", "Defusing the Situation", "Elevator") [UNCERTAIN].
- Russian: https://www.youtube.com/playlist?list=PLQ6L-Ee5ECFXpnBVTm-V6SmQOBkvMjd9A (Berofu, PC, 9 parts); https://www.youtube.com/playlist?list=PL99EF637EDF39FE74 (RedWolfikPlay, 10 parts; episode names include Archive, Main Server, Chemical Bunker).
- Others found: Laugh A Lot Gamers (PLh5Z7c39-mylFZcxZgKjzG9UB0CHEgWRW); zalphaJigsaw (PLE784716A0DF28FD8); MrNinjafreak (PLqL25VC2zZMlnsOcNSDbv3K4TcmPRKXls); CrypticNmad (PLK5MCq2OWk1I-tn8a1IYTpZvnXexeQgW5); MEATfast "Stealth Stories" (PLAF995568E5699969); MotoVio (PL994E346F984E9A58); ManiaChris DE (PL6D9E923921B88F8A); GeorgianGamers (PL643587121476769E).
- Per-mission PS2 split-screen set (2026, low views): Củ Cà Rốt Co-op Team: Training RXNrz5N-qZE, Panama lFHlkLTsKQI, Chemical Bunker Cgp8_wNtyQk, Train Station 1FYUWwle97Q.

Speedruns (show routes and skips, not intended flow):
- https://www.youtube.com/watch?v=yEjHJb-SpjQ | Co-Op in 38m44s (world record per uploader) | Distro (with Heinki) | 41:49 | Timing ends on the final frame of Nuclear Plant, which implies their run order ends with Nuclear Plant [UNCERTAIN].
- https://www.youtube.com/watch?v=gOn-T6LlNHk | co op Speedrun in 56:47 with commentary | Oldschooldummy | 57:12 | Game audio replaced by music; uploader points to silly glitches.
- https://www.youtube.com/watch?v=1ODKgDBEao4 and https://www.youtube.com/watch?v=ALN3KBYqyAw | Heinki co-op speedrun learning streams.
- GameCube 2-player IL speedruns by synzh (e.g. https://www.youtube.com/watch?v=0n_jqp8QH3U Level 1, https://www.youtube.com/watch?v=oIGRXjMCh2s Level 10, plus Levels 2, 3, 4, 11). The level numbering (at least 11) suggests GC sub-levels are counted individually [UNCERTAIN].

---

## 3. Co-op moves showcases
No dedicated "all co-op moves" compilation was found under any of the query wordings tried. The best substitutes:
- Training-level runs (section 1.1), above all hexen2k7 (description lists each move drill) and V339 (clean ghost). [VERIFIED that Training is the move tutorial]
- https://www.youtube.com/watch?v=IIfns1gvSRY | E3 2004 CO-OP Mode Showcase (High Quality) | SickadtSteve | 4:25 | original E3 footage of co-op.
- https://www.youtube.com/watch?v=hFAPasSujbE (geimeris661, 3:55), https://www.youtube.com/watch?v=vzzG_KNahQ8 (gamethingsnet, 5:05), https://www.youtube.com/watch?v=rlUtBArK8Q4 (TimeLifeHD, 5:05) | official-looking co-op trailers. Content not described on the pages.
- https://www.youtube.com/watch?v=SjycM4h_5r0 | "СТЕЛС КООП ШЕДЕВР" | Tekkie | 12:03 | Russian video essay; creator chapters include a mini-guide to the mechanics (5:30) and teamwork (6:40).
- https://www.youtube.com/watch?v=t3btK_uM6KY | Review - How True Stealth and Co-op Work | itz_Saide | 49:54 | 2026; filmed with a co-op partner.
- https://www.youtube.com/watch?v=SYU5Ve4qKik | Charc0al and Rokazulu's co-op clips from 2008 | 2:02 | short community clips.
- https://www.youtube.com/watch?v=LXMhZHUOpEk | "Operation Throw Torgos" | redrumy3 | 0:32 | title suggests a partner-throw gag [UNCERTAIN].
- https://www.youtube.com/watch?v=6Uy0tnDb5Ec (PS2) and https://www.youtube.com/watch?v=1-Tyzb41how (PC) | All Training Videos | Isolated Oaf | in-game tutorial videos. Whether they include co-op move videos is [UNCERTAIN].

---

## 4. Reviews, retrospectives and video essays that cover co-op
- https://www.youtube.com/watch?v=KCOcnYpCD0s | The Co-Op Experience | Lawerenceofalevi | 32:42 | Xbox (two Xbox Ones on system link); every mission done "to perfection" on Expert. Creator chapters: The Good 0:00, The Bad 10:04, The Ugly 28:56, The Results 30:15. The most design-relevant critique found.
- https://www.youtube.com/watch?v=SwxTLoWn5e4 | The most cursed co-op game | ParagonMitchell | 21:54 | 55k views, Feb 2026, PC. Argues the co-op is weaker than remembered, at least on PC. Creator chapters: Panama 5:56, Seoul 8:57, Chemical Bunker 12:47, Train Station 16:53, "An Unfortunate End" 20:30, which suggests they did not finish the late missions [UNCERTAIN].
- https://www.youtube.com/watch?v=3G7D5CjM6RU | Co-op Review (Retro Spectives Podcast Bonus 1) | 49:48 | The description says they discuss whether partner moves changed their strategy or were just "elaborate keys", how the levels accommodate a second player, and the griefing potential.
- https://www.youtube.com/watch?v=IuwfdmAicjc | Review Retrospective - Closer than ever | KIRK COLLECTS | 1:17:56 | 234k views; creator chapter "Splinter Cell Co-op" at 1:01:35.
- https://www.youtube.com/watch?v=q0gHxY-DFD8 | Is Chaos Theory As Good As I Remember? | Chris Davis | 42:40 | 248k views; chapter "Multiplayer and Co-Op Modes" at 39:15.
- https://www.youtube.com/watch?v=cfR80DTXYjU | The Peak Of Stealth | Boulder Punch | 30:58 | 111k views; creator chapter "Co-op & Spies Vs. Mercs" at 25:09.
- https://www.youtube.com/watch?v=1eetPo7gdQw | Xbox Review | IGN | 7:08 | 2005-era review re-uploaded in 2011; chapter "Co-Op Missions" at 3:55, which appears to be auto-generated [UNCERTAIN].
- https://www.youtube.com/watch?v=NeXMx_orkIg | PC and Xbox GameSpot Review (Greg Kasavin, re-upload) | 4:52 | Contemporary review; co-op coverage not described.
- https://www.youtube.com/watch?v=nOZ7tuHzFlE | Splinter Cell on GameCube was...special | Hyper Tension Films | 1:05:35 | Chaos Theory GC section 31:07-49:50. Compares the GC port to PC/Xbox. Whether it covers co-op is unknown.
- https://www.youtube.com/watch?v=w2jTmXleZHU | PS2 Vs GC comparison | Rozmon | 9:21 | Uploader calls it mostly a test.
- https://www.youtube.com/watch?v=edi3vnpq2yw | Co-op Mode With My Girlfriend and It Was Chaotic | The Rat Shepherd | 17:02 |
- Mostly single-player (co-op only touched, if at all): Acerthorn (hs3sfnhWRSc, chapters are SP missions only), thesummerofmark (4JRAPQg6UYw), Mister No Life (Uhp1SCRIdmo), KingSigy (6UGAwYEPG6M), CarmelOP (Ydbu8_O3FQQ), David Strong (g8M8Dly5zts).
- Versus-mode context (not co-op): Super Bunnyhop Spies vs. Mercs retro review (YQ753pwa0B8, 193k views); ParagonMitchell "The best multiplayer game you've never played" (LqZ664Y7pwI); Godmode_CT (LXaP0EIYaXo); TheButterAnvil (Q_Kka4VhWG0).

---

## 5. Developer, E3 and making-of footage
- https://www.youtube.com/watch?v=IIfns1gvSRY | E3 2004 CO-OP Mode Showcase | SickadtSteve | 4:25 | Original E3 co-op footage.
- https://www.youtube.com/watch?v=11-wUk-tLaY | E3 Gameplay [Rare Footage] | Alex37 | 7:57 | Creator timestamps: single-player 0:00, co-op 2:14, early Bathhouse 5:12. Uploader notes the build's HUD, animations, weapon models and map layouts differ from release. Useful for early co-op layouts.
- https://www.youtube.com/watch?v=nN1YVwO-3hQ | E3 2004 Videos Compilation | Alex37 | 1:32:23 | Co-op appears at:
  - 0:31 Hokkaido and co-op gameplay
  - 2:53 co-op footage
  - 11:05 co-op clips
  - 57:00 "Co-op Showcase"
  - It also has a Clint Hocking single-player showcase (34:52), AI and Sound dev diaries, and European magazine E3 coverage. The uploader warns the timestamps may be off.
- https://www.youtube.com/watch?v=J9pl7tlJjh4 | E3 2004 Single Player Showcase | SickadtSteve | 22:18 | Context.
- https://www.youtube.com/watch?v=d2vBjrRKs3g | Pre-Order Bonus DVD Content | Lucian The World Gamer | 1:34:00 | PS2 pre-order DVD. Creator chapters: Developers' Diaries 0:38, NSA Training Program 20:30, Trailers 28:08, Mega64 videos 44:41, soundtrack sampler 54:29, archive trailers 1:13:20.
- Developer diaries (ripped from the PS2 limited-edition disc):
  - Level Design: https://www.youtube.com/watch?v=yxzr8K95RQ0 (4:27). The most relevant diary for this project; whether it covers co-op maps is unknown.
  - Animation: https://www.youtube.com/watch?v=xocq_CIzuag (4:57). Co-op moves needed paired animations, so this may show them [UNCERTAIN].
  - Sound Design: https://www.youtube.com/watch?v=vp3tET9xVKk.
  - AI, presented by lead AI programmer Frédéric Blais per the description: https://www.youtube.com/watch?v=i8Yf_REi0ko (3:36).
  - Sound, presented by lead sound designer Fabien Noel: https://www.youtube.com/watch?v=g0Jl6uVAcGE (4:24).
  - Also: https://www.youtube.com/watch?v=f9-VSg95FKQ (Developer Diary Part 1 of 4) and https://www.youtube.com/watch?v=RrVVsUqSVqc (PS2 disc dev diary).
- https://www.youtube.com/watch?v=CF51EMy6SDY | PlayZone 10/2004 (German magazine) | 7:21 |
- Official-era trailers: https://www.youtube.com/watch?v=-1yetVmKfHo (IGN Xbox trailer, 1:33); https://www.youtube.com/watch?v=Siv5InnoJUE (IGN GameCube, 1:08); co-op trailers in section 3.
- Not Chaos Theory, despite matching searches: IGN "Splinter Cell Co-Op Story, Part 1" (edd-oZsTwng) is Conviction (2010).

---

## 6. Comedic and community videos
G4 X-Play "Splinter Cell Co-Op Theater" (Bob and Steve):
- Facts from the upload pages:
  - 2005 machinima by X-Play, 11 episodes in total. [VERIFIED - Gaytheist description says 2005 X-Play and 11 episodes; Unimportant Entertainment's title says 11 episodes; an episode titled "11" exists]
  - That it is built on Chaos Theory co-op footage is only implied: ParagonMitchell mentions Bob and Steve while introducing CT co-op. [SINGLE SOURCE / UNCERTAIN]
- https://www.youtube.com/watch?v=Et72vAIhyO8 | Bob and Steve Splinter Cell Coop Theater | G4 Archive | 43:11 | 2026 premiere; probably the fullest version.
- https://www.youtube.com/watch?v=5W-LCbdH7pE | Co-Op Theater HD | Gaytheist | 26:43 | All 11 episodes, AI-upscaled from 240p sources (uploader's own caveat).
- https://www.youtube.com/watch?v=9pyg4G7dBVk | Co-Op Theater (Bob & Steve 11 Episodes) | Unimportant Entertainment | 39:09 |
- Single episodes:
  - alfaita 1/6-4/6 (2007; 545k, 398k, 336k, 133k views): https://www.youtube.com/watch?v=wp9O6FvyD0U, https://www.youtube.com/watch?v=4pGGPd3CgOU, https://www.youtube.com/watch?v=nNVVTFs8f8E, https://www.youtube.com/watch?v=yRG2lfbIOks
  - creator006 5/6, 6/6: https://www.youtube.com/watch?v=MgdPaPdOM7c, https://www.youtube.com/watch?v=P8qDz2-SQns
  - alex141516, episode 11 (Bob and Steve argue over who gets the "good missions"): https://www.youtube.com/watch?v=0AjQNb6-ti0
  - ACBlackJ0ck, X-Play "Co-Op Theater V" (description: Bob and Steve on a mission to save New York): https://www.youtube.com/watch?v=mUT6_oFpmV0
Other comedy and community:
- https://www.youtube.com/watch?v=BdwhJtGy7a8 | Co op Campaign Bloopers - Split Screen | BK201Tach | 8:11 | The description explains a control quirk around Chu: a non-lethal button press sometimes became a lethal kill, which failed the mission. [SINGLE SOURCE]
- https://www.youtube.com/watch?v=5wGuwswy7gg | Funny Co-op Moments | AHUK! | 3:50
- https://www.youtube.com/watch?v=m0o5Evv169k | How to Properly Play Chaos Theory Co-op | SteveFinnigan | 9:19 | Parody.
- https://www.youtube.com/watch?v=-YgPhqHubuE (The Donkeypits, tutorial fails, 5:38); https://www.youtube.com/watch?v=2BN_mGBhHiE (LocalHostGamers, failed tutorial, 2:55); https://www.youtube.com/watch?v=OP626wI8zqQ (Shepy, FR, training + fails); https://www.youtube.com/watch?v=PiI66IzHF0Y (BryanGaming, FR).
- https://www.youtube.com/watch?v=CUIoqZqR1AA | Home Made Co-Op Trailer | Mutchado | 3:33 | 2008 fan trailer.
- https://www.youtube.com/watch?v=OhWvIzuo7KM | PC Co-op Gameplay [HD] | XxShephardxX | 7:39 | 143k views; two players learning co-op.
- https://www.youtube.com/watch?v=N7PCIXt4UKs (Philly Cinema), https://www.youtube.com/watch?v=edi3vnpq2yw (Rat Shepherd), CouchiesTV, GaLm and DoubleTroubeify playlists (section 2).

Setup and how-to videos (for anyone reproducing captures):
- https://www.youtube.com/watch?v=LY69X7EgsmM (Nenz, ZeroTier on PC, 31k views)
- https://www.youtube.com/watch?v=3nLKhKGucII (Birden, Nucleus Co-op split-screen on PC)
- https://www.youtube.com/watch?v=r9E-6ymEygU (EgOless, Radmin VPN)
- https://www.youtube.com/watch?v=OiW-Tx3l_HY (Gubbsplinta)
- https://www.youtube.com/watch?v=FE5F6EUQC-0 (Joshhhuaaa-VS Versus setup)

---

## 7. Recommended viewing order (top 10 for a level designer)
1. **hexen2k7 Training, 100% Elite** (https://www.youtube.com/watch?v=WQ__XNyWP0M, 3:14). Shortest clean pass through every co-op move drill; the description lists each drill.
2. **V339 Panama, 100% / Expert / Elite / Ghost** (https://www.youtube.com/watch?v=KlU0002suD4, 22:46). A planned two-player ghost route; shows how the first real map is meant to be read when nobody is spotted.
3. **Suru Train Station 100%** (https://www.youtube.com/watch?v=-JnlamHBZrc, 13:38). Creator-timestamped objective beats (schematics, three bombs, phone bug, Chu, extraction). The best single-file beat map.
4. **Jake Ziggity PS2 Seoul** (https://www.youtube.com/watch?v=__LRg8KrYQ8, 18:50) then **PS2 Chemical Bunker** (https://www.youtube.com/watch?v=qLQEHSaRECM). Shows how the PS2 build splits missions into small sub-levels, with chapter markers at each boundary. Pair it with the Xbox/PC version of the same mission.
5. **hexen2k7 Chemical Bunker 1/2 + 2/2** (chb66dBOt74, ILxhYQ1BHc0). The longest Xbox/PC mission in a no-detection run; the objective list maps to rooms (silo, lab, cryo, missile).
6. **DeepVelocityOps complete co-op campaign** (https://www.youtube.com/watch?v=4GtVpbf1xAw, 7:22:04). One file with chapter jumps to every mission. Normal pacing shows where real players stall. Use as a jump-in reference.
7. **Lawerenceofalevi "The Co-Op Experience"** (https://www.youtube.com/watch?v=KCOcnYpCD0s, 32:42). Expert Xbox players' critique in Good/Bad/Ugly chapters; direct design feedback.
8. **SickadtSteve E3 2004 co-op showcase** (https://www.youtube.com/watch?v=IIfns1gvSRY) plus **Alex37 E3 gameplay** from 2:14 (https://www.youtube.com/watch?v=11-wUk-tLaY). How Ubisoft pitched co-op, and early layouts that differ from release.
9. **PS2 bonus-DVD Level Design developer diary** (https://www.youtube.com/watch?v=yxzr8K95RQ0, 4:27; full DVD at https://www.youtube.com/watch?v=d2vBjrRKs3g). First-party design intent (co-op coverage unknown).
10. **ParagonMitchell "The most cursed co-op game"** (https://www.youtube.com/watch?v=SwxTLoWn5e4, 21:54) and/or the **Retro Spectives co-op podcast** (https://www.youtube.com/watch?v=3G7D5CjM6RU). Modern critiques; the podcast explicitly asks whether partner moves were real tactics or just glorified door keys.
- Next, for the two late missions: hexen2k7 Nuclear Plant (OBU3MtaoKb4 and parts) and UN HQ (5RBmv-nRtTs and parts), or PleasePlayMore's single-file 1080p versions (phfqPfdFZdQ, 3CH1BrvzlPA).
- For GameCube: the ysuck63 GC playlist.

---

## 8. Transcript test
- `https://www.youtube.com/api/timedtext?v=SwxTLoWn5e4&lang=en&kind=asr` returned HTTP 200 with an empty body.
- The innertube `get_transcript` endpoint returned 400 FAILED_PRECONDITION.
- The innertube `player` endpoint returned LOGIN_REQUIRED for the WEB client and no caption tracks for the ANDROID, IOS and embedded clients.
- Third-party transcript sites:
  - youtubetotranscript.com: 403 via both curl and WebFetch.
  - downsub.com: 403.
  - kome.ai: 429.
  - youtube-transcript.io: 308 redirect, not followed.
- Result: no transcript or commentary notes could be extracted, and nothing in this file is based on spoken commentary. (The `next` endpoint did report English auto-captions exist for several videos, e.g. SwxTLoWn5e4, hs3sfnhWRSc, cfR80DTXYjU, but they could not be downloaded.)

---

## 9. Gaps
- No dedicated "all co-op moves" showcase video exists among the results; move coverage relies on Training runs and E3 footage.
- No commentary or transcript content could be read (see section 8), so route and strategy notes from commentary are missing.
- Original-Xbox captures are thin: Xbox Kai Fam (Panama, Seoul), CR4ZY BALLISTICS (UN HQ), Lawerenceofalevi (all, via Xbox One BC), Because I Can (Panama), Melisca 24 (Training), No commentary dog (360 BC). No original-Xbox Nuclear Plant capture was confirmed.
- GameCube coverage is mostly 2008-era low-resolution uploads (ysuck63, NickyTheGamer, synzh). No GC Nuclear Plant or UN HQ was found, consistent with those missions being Xbox/PC only.
- The GameCube "Panama Bank" naming and CouchiesTV's "BANK" chapter are unexplained.
- Many Xbox/PC uploads don't state their platform. Platform calls marked "likely" are inferences.
- Several promising pages were not read: Zolt Assassin's Chemical Bunker 100% (nCJ8xbWt-nM), the Pretend3r and Urban Reflex parts without descriptions, and the DoubleTroubeify episode descriptions.
- WebSearch hit the shared session budget, so the G4 X-Play Co-Op Theater background (air dates, link to CT) was not cross-checked off YouTube.

---

## 10. Sources and methods
- YouTube search via /home/user/raw/yt.sh, about 55 queries. Wordings covered: per mission (training, panama expert, seoul, chemical bunker, train station, nuclear plant, UN headquarters, yongbyon), per platform (PS2, gamecube, xbox, split screen, xlink kai), full campaign / longplay / speedrun / no alarm, moves / hangover move, review / retrospective / developer diary / E3 2004 / Spies vs Mercs documentary / trailer / IGN / GameSpot / X-Play Bob and Steve / Co-Op Theater, and languages RU (кооператив прохождение, ядерная станция, штаб ООН), FR, DE (koop deutsch), ES (cooperativo). The exact query "splinter cell chaos theory coop" returned NOPARSE once and worked on retry.
- YouTube playlist-filtered search (search URL with the playlist filter) for 6 queries, plus playlist page reads for the 12 playlists listed in section 2.
- Watch-page metadata (description, date, views, chapters) for about 235 videos via `https://www.youtube.com/youtubei/v1/next` (WEB client).
  - Direct watch-page HTML scraping worked at first, then began redirecting to google.com/sorry (rate limit, HTTP 302), probably because several agents were querying YouTube at once.
  - WebFetch on https://www.youtube.com/watch?v=0hK1AeB07wk returned only navigation and footer, no description.
- Transcript attempts and failures: see section 8.
- WebSearch: refused, because the shared per-turn search budget was exhausted.
- Cached Fandom text (/home/user/raw/wiki/) checked for Co-Op Theater mentions: none found.
- Key pages whose descriptions supplied facts:
  - hexen2k7: WQ__XNyWP0M, TvecAMtS_vk, 1-KpQGqaYd8, chb66dBOt74, 2X5MvQPOQ14, OBU3MtaoKb4, 5RBmv-nRtTs
  - V339: 2VRGQUT2JvQ, KlU0002suD4, A9qRzUt9RtE
  - Jake Ziggity: obcKEeRniRw, __LRg8KrYQ8, qLQEHSaRECM, ge7dEnjp6MU, 2FmkMk4rHQw
  - SHOCK-25: MmH3o7WF4wg, KWwInB9WjNY, NTaZh6gW8R0, gxnoQJNrPV8, ksP5rk2eJKQ
  - R3xXcoN GAMING: 1risWusbZWc, yQPMp8u8Cqc, akWLnghZb8c, H6g5WoCDuPc, Ya-6NCCKmTg, tg8sn2ZC2CY, i1Ctp-CKpUk, FmSiWt_hVG4, SXHCqjqi_Tc, v4gb6uKa5SQ, kM-HTagymSM
  - Others: Suru -JnlamHBZrc; Splinter S1KySIBDvKQ; BK201Tach BdwhJtGy7a8; dat_carlin H-AXCQQ8sCs; PleasePlayMore phfqPfdFZdQ, 3CH1BrvzlPA; NickyTheGamer cwBOPjYbi5k, T2XssBZ_jgI; ysuck63 gm9uYnMw9KA, PRhaF2S6EJw, CtGfBsU1DwI; Alex37 11-wUk-tLaY, nN1YVwO-3hQ; Lucian d2vBjrRKs3g; Gaytheist 5W-LCbdH7pE; DeepVelocityOps 4GtVpbf1xAw; 3dCossack LLww3vy8_1Y; CouchiesTV AYR7YqF5aMI; Lawerenceofalevi KCOcnYpCD0s; ParagonMitchell SwxTLoWn5e4; Retro Spectives 3G7D5CjM6RU; soluceinfo puvCXAdiRxk; Lulz vjiFZuwld-U; CR4ZY BALLISTICS yQH90XJtxTY, 2X_1z7gNOyw; Xbox Kai Fam D1zUg9YGRj0, EasI1Hs9TWM.
