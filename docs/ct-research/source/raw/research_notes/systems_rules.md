# Splinter Cell: Chaos Theory (2005) co-op - core rule systems

Tags: [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. All text paraphrased.
Source shorthand (full URLs in Sources):
- FW = English Splinter Cell Fandom wiki; FW-RU = Russian Fandom wiki (same platform, counted together with FW as ONE source family unless noted)
- XBM = official Xbox manual (archive.org scan, OCR'd by me)
- PS2M = official PS2 manual (archive.org OCR text)
- PRIMA = Prima Official Game Guide (archive.org OCR text; co-op chapter by Steve Stratton)
- MN = Major Nelson, Xbox Wire, 25 Aug 2005
- Steam = Steam community threads for app 13570 (different posters; counted as one source family)
Cross-reference: revive mechanics, saving details, HUD and controls are written up in depth in `coop_gadgets_controls_comms.md` (Part C/D). This file only summarises them where a rule depends on them.

---

## 1. Menu modes and unlock flow

### Xbox (and PC - same build)
- Co-op main menu (Xbox): Xbox Live / Split-Screen / System Link / Options; then profile selection. [SINGLE SOURCE - XBM]
- Three co-op game modes:
  - **Story** - missions in fixed order; each must be succeeded to unlock the next. [VERIFIED - XBM + PRIMA]
  - **Mission** - replay any Story mission (PRIMA: only those already unlocked) in any order. [VERIFIED - XBM + PRIMA]
  - **Elite** - same as Mission mode but firearms start with no ammunition; the knife becomes available to kill with; opens only after Story mode is completed. [VERIFIED - XBM + Cheat Index/ChapterCheats/IGN wiki (identical user-submitted text, counted once) + multiplayer.it]. PRIMA instead words it as "restricted to non-lethal weapons" - a looser/incorrect paraphrase; the manual wording wins. One Steam poster adds that Elite strips all weapons and gadgets except the knife with Expert-level damage; a YouTube co-op 100% run describes Elite as "no ammo on spawn", played on Expert. [UNCERTAIN on "all gadgets removed"; VERIFIED that ammo is the restriction; ammo found in the level can still be picked up - SINGLE SOURCE (cheat text)]
- Xbox Live "Create Mission" lets the host pick mission, mode, difficulty and language; a Story save can be continued with the same partner (both consoles' saves must be identical; launching auto-invites the partner). [SINGLE SOURCE - XBM]
- DLC missions (Nuclear Plant, UN HQ): playable only in Mission and Elite mode, never in Story; on Xbox you first had to play through Coop Story **on Elite** to make the maps appear, after which they stay selectable in Mission mode. [SINGLE SOURCE - MN (official)]. PC patch 1.05 notes: selectable in Create Game in Mission mode, not accessible in Story mode (no Elite precondition mentioned). [VERIFIED for "not in Story" - MN + PC 1.05 notes]
- Unlock cheats: see platforms_versions.md section 8 (Xbox profile name, PS2/GC button codes).

### PS2 / GameCube
- Main menu: Solo/Co-op vs Multiplayer Online (online = Versus only, ubi.com or LAN). Co-op menu: Training, Campaign, Options, Hall of Fame, Quit. [SINGLE SOURCE - PS2M]
- Campaign: missions in order; each **sub-mission** once completed becomes selectable from the mission list, so after unlocking everything players can play sub-missions in any order, do quick matches and chase high scores. [VERIFIED - PS2M + PRIMA ("progress saved at the end of each area", "similar to Mission mode")]
- No Elite mode in the PS2 manual. One cheat site lists "Elite: complete Story mode, knife only" under PS2, and ChapterCheats PS2 lists "Elite difficulty - finish Co-Op Mission mode" - probably copied from Xbox entries. [UNCERTAIN]
- Hall of Fame: per mission, best sub-mission scores; table shows team score, time played and whether the team earned a **Stealth Award**. [SINGLE SOURCE - PS2M]
- End screens: per sub-mission stats; "Mission Overview" after a whole mission (both players' results per sub-mission); "Final Game Review" at campaign end showing both players' results in "all four missions". [SINGLE SOURCE - PS2M]

## 2. Difficulty
- Solo and co-op share Normal / Hard / Expert. [SINGLE SOURCE for co-op - XBM ("difficulty" is a Create Mission parameter); FW-RU/FW Chemical Bunker notes give per-difficulty co-op puzzle lengths]
- What changes (general CT, sources mostly describe solo): damage taken rises with difficulty; Expert also makes hacking harder; med kits restore full health on Normal, 50% on Hard, less on Expert; wall mines can be disarmed on green or red light on Normal/Hard but only green on Expert. [VERIFIED - FW Difficulty + PRIMA (solo chapter) + XBM (wall mine)]
- Co-op-specific difficulty effect: in Chemical Bunker the anti-virus mixing code is 3 values on Normal, 4 on Hard, 5 on Expert per agent. [SINGLE SOURCE - FW Chemical Bunker notes]
- Does difficulty change AI perception? Steam posters disagree: one says difficulty only scales damage dealt/received and has no effect on how easily guards spot you; another says some noises guards ignore on Normal are heard on Expert; the YouTube co-op run calls Expert "highly sensitive, high damage AI"; FW Difficulty trivia says harder settings generally raise awareness. [UNCERTAIN]
- Elite is a co-op mode, not a difficulty tier, but is typically played on Expert. [SINGLE SOURCE - YouTube playlist description]

## 3. Alarm system

### Xbox/PC co-op
- HUD has an alarm indicator above the visibility bar counting alarms; each alarm has "global repercussions". [VERIFIED - XBM + PS2M (same wording in both manuals)]
- Escalation, as listed in the mission notes of Panama, Chemical Bunker, Train Station and Nuclear Plant: stage 2 = enemies wear body armour, stage 3 = helmets, stage 4 = enemies fortify positions. [SINGLE SOURCE - FW mission pages]. Same 4-stage system described for solo CT (first alarm "a freebie"; at 4 alarms guards permanently on high alert; Sam is not failed). [VERIFIED - FW Alarm + PRIMA solo chapter + Wikipedia]
- At max alarms in solo CT, secondary and opportunity objectives are cancelled (and some dialogue simplified). [VERIFIED - FW Alarm + ChapterCheats user tip]. Whether co-op cancels objectives the same way: the co-op objective review only has "Failed" or "Completed" statuses (no "Canceled"), unlike solo. [VERIFIED - XBM + PS2M]. So in co-op such objectives presumably show as Failed. [UNCERTAIN - inference]
- Alarm sources: guards hitting wall alarm panels, cameras, lasers, motion detectors, failed hacks (failing or aborting a hack in the red zone sounds an alarm). [VERIFIED - FW Alarm + XBM]
- No general max-alarm failure rule found for Xbox/PC co-op missions (notes list stage 4 with no abort). [UNCERTAIN - absence of evidence]
- Seoul co-op has an alarm system although solo Seoul does not. [SINGLE SOURCE - FW Alarm trivia]
- **UN Headquarters**: lethal force against UN guards and civilians forbidden; Lambert aborts the mission on a general alarm. [VERIFIED - FW briefing/notes + Ubisoft PR via WorthPlaying/VideoGamer ("no room for kills or alarms")]. Extra fail triggers per FW-RU: being seen at lit windows, tripping the metal detector alarm. [SINGLE SOURCE - FW-RU]. Lethal force is allowed against Kim's rogue North Koreans there. [SINGLE SOURCE - FW]

### PS2/GameCube co-op
- Every sub-level fails on the 3rd alarm. [SINGLE SOURCE - FW (stated on ~14 sub-level pages)]. GamesRadar's DS review complains about the return of the "three strikes" alarm rule but that is the DS game. [not applicable]
- Secondary objectives of the form "finish without one alarm" / "gain entry without one alarm" (Panama sub-levels). [VERIFIED - FW + PRIMA PS2 walkthrough]

### N-Gage/DS co-op
- Classic 3-alarm abort: Lambert warns after alarm 1 (two left) and 2 (one left) and aborts on the 3rd; alarm level is lowered after checkpoints / scripted events; no armour escalation. [VERIFIED - FW (DS Rooftops trivia + N-Gage/DS game page) + GamesRadar DS review]

## 4. Mission failure conditions (co-op)
- Partner down and not revived within ~30 s = mission failed; revive usable only twice per game. [VERIFIED - XBM + PS2M + PRIMA] (details: coop_gadgets_controls_comms.md Part D)
- Both agents down simultaneously: not stated anywhere; implied failure. [UNCERTAIN]
- Seoul: Jong must be captured alive - his death fails the mission; also fails if Jong reaches an intact boat, or if Jong's double is killed before interrogation. [VERIFIED for Jong's death - FW + PRIMA; others SINGLE SOURCE - FW-RU]
- Panama: killing Vice President de Medeiros fails the mission. [SINGLE SOURCE - FW-RU]
- Training Facility: kills do not fail, only lower rating; retinal scanners can be hacked by one agent alone but a failed hack costs health. [SINGLE SOURCE - FW-RU; IGN wiki also says one agent can hack both scanners -> VERIFIED for solo-hacking both scanners]
- Train Station (PS2/GC walkthrough): touching the laser between a pair of bombs detonates them = failure; bombs need simultaneous wire cuts. [VERIFIED for simultaneous cut - FW + PRIMA; laser fail SINGLE SOURCE - PRIMA]
- Train Station (Xbox): only one agent can use the antidote; entering the contaminated bathroom without it kills you; Chu cannot be KO'd (dies anyway). [SINGLE SOURCE - FW-RU]
- UN HQ: general alarm, kills of UN staff/civilians, lit-window detection, metal detector; hidden 20-minute timer plus on-screen bomb countdown objective. [see section 3; timer SINGLE SOURCE - FW-RU; bomb countdown SINGLE SOURCE - FW objective text]
- Timers in general: HUD timer appears when triggered; reaching zero is "bad news". [VERIFIED - XBM + PS2M]. PS2/GC Seoul: Gardens has a 4-minute timer. [SINGLE SOURCE - FW]
- Lethal force generally: killing civilians/friendlies does not fail solo CT missions (only score), except specific missions; co-op follows mission-specific rules above. [VERIFIED for solo - FW + Wikipedia; co-op UNCERTAIN beyond the listed missions]

## 5. Checkpoints and saving
- Xbox: Story progress save between missions (identical saves on both consoles); Quick Save mid-mission valid only for the current session, Retry reloads it. [SINGLE SOURCE - XBM; see coop_gadgets_controls_comms.md Part D]
- PC reviewer (Elder-Geek 2009): no checkpoints in co-op missions, dying or botching an objective means restarting. [SINGLE SOURCE - Elder-Geek] Partly conflicts with XBM's session quick save (may differ by platform or reviewer missed it). [UNCERTAIN]
- PS2: progress saved at end of each sub-level, one save file on PS2/GC with automatic checkpoints in solo. [VERIFIED - PRIMA + PS2M]
- GameCube: reviewer says co-op has no save function inside its bite-sized missions; you must finish a mission in one go. [SINGLE SOURCE - Classic Co-op 2017]

## 6. Scoring, success rating, statistics
- End-of-mission: Objective Review (co-op: Failed or Completed only) and Mission Statistics (kills, civilians knocked out, alarms triggered, etc.) with a success score; killing a civilian costs many points, KO costs nothing. [VERIFIED - XBM + PS2M]
- Xbox/PC: team stats compiled into **individual scores per agent**. [SINGLE SOURCE - PRIMA]; FW-RU lists co-op results as two percentages ("100% / 100%"), consistent. [VERIFIED - PRIMA + FW-RU]
- PS2: success score based on both players' statistics; Hall of Fame + Stealth Award. [SINGLE SOURCE - PS2M]
- Perfect score requirements: no kills or injuries (KO only), never identified as intruder, no alarms, all primary/secondary/opportunity objectives. [SINGLE SOURCE - PRIMA]. FW-RU Panama record: 22 enemy KOs + 1 civilian KO still 100%/100%, consistent with KOs being free. [VERIFIED - PRIMA + FW-RU]
- FW-RU UN HQ note: pushing a stunned guard onto another lowers the stealth rating. [SINGLE SOURCE]
- Solo CT score range 0-100%; friendly fire on allies drops rating to zero in solo. [SINGLE SOURCE - FW main/Mission Failed pages] (co-op equivalent unknown)

## 7. Light and sound meters in co-op
- Each agent's HUD keeps CT's stealth (light) meter bar and noise meter bar (own noise vs environment), plus partner health on Xbox. [VERIFIED - XBM + PS2M]
- Voice detection (online, headset): guards can hear players' headset speech within a radius (default 50 = about 2 m in-game for normal speech); can be disabled or resized in online options; talking can be used to lure guards. [VERIFIED - XBM + PRIMA + GamesFirst preview]
- Whistle is replaced by the co-op action button in co-op (no whistling). [VERIFIED - PRIMA + Steam user]
- Normal (non-thermal) cameras can be defeated by darkness alone. [SINGLE SOURCE - IGN wiki tip]

## 8. AI and detection with two players
- General CT AI (applies to co-op levels by default): bodies raise alarms only if a guard or active camera actually sees them; guards notice open doors, shot lights, cut fabric; KO'd guards can be revived by other guards (kick + revive). [VERIFIED - FW main page + Wikipedia + PRIMA solo]
- Co-op-specific: guards hear headset voices (above). Elder-Geek notes glitches where guards tripping over each other alert others even when agents are hidden. [SINGLE SOURCE]
- Tomoe Nage thrown at an NPC knocks him out. [VERIFIED - XBM + PS2M]
- Whether AI tracks both agents independently / shares information about "two intruders": no source. [GAP]

## 9. Friendly fire
- An IGN wiki Xbox glitch tip has one agent hit the other with a sticky shocker and notes "friendly fire must be on", implying a host option. FW Panama trivia describes the same shock-your-partner invisibility bug. [UNCERTAIN - a friendly-fire setting is implied but not documented in XBM/PS2M/PRIMA]

## 10. Level end / extraction
- Objectives commonly end with "exfiltrate to the primary extraction point" (Panama truck, Chemical Bunker zodiac, Nuclear Plant side door) or "get to extraction with Jong" (Seoul). [SINGLE SOURCE - FW mission pages]
- Whether both agents must physically reach extraction: no explicit rule found. [GAP]

## 11. Solo play of co-op
- No official solo option: co-op requires two players. Steam posters show co-op maps can be launched solo via a command-line .bat but play as test versions and cannot be completed without cheats; a fan mod swaps map names to load co-op maps from the solo menu. [SINGLE SOURCE - Steam]
- Elder-Geek: tempting to operate alone, but level design forces teamwork. [SINGLE SOURCE]
- One agent can do some "dual" tasks alone (both training retinal scanners). [VERIFIED - FW-RU + IGN wiki]
- Online without headset, synchronized actions need not be exactly simultaneous. [VERIFIED - PRIMA + XBM (synchronization handled automatically)]

## 12. Asymmetric agents
- Xbox/PC: per-mission gear differs between Agent 1 and Agent 2 (PRIMA gear boxes); a Steam poster says the red agent (Agent 2) has the more lethal loadout and the host is blue. [VERIFIED for asymmetry - PRIMA + Steam; details in coop_gadgets_controls_comms.md]
- N-Gage/DS: hard role split - Hacker (hacks, stealth) vs Assault (combat, vision modes). [SINGLE SOURCE - FW + Gaming Target review names the roles -> VERIFIED for names]

## Gaps
- Exact Xbox/PC alarm consequences in co-op beyond armour stages (is there any abort count? are objectives "Failed" at stage 4?).
- Both-down rule; whether both agents must reach extraction.
- Friendly-fire option existence and default.
- AI behaviour toward two intruders (shared alerts, separate search).
- Whether difficulty changes guard perception.
- Whether Elite removes gadgets or only ammo.
- PC co-op specifics (manual not found; PCGamingWiki and GameFAQs blocked 403).
- GameSpot/IGN 2005 co-op previews and reviews blocked (403), so press descriptions of rules could not be read directly.
- Web search budget for the session ran out before Steam-version patch level could be checked.

## Sources
- XBM: https://archive.org/download/xboxmanual_Splinter_Cell_3_Chaos_Theory/Splinter_Cell_3_Chaos_Theory.pdf (OCR'd locally with tesseract; pages ~19-28 co-op modes, Elite, HUD, revive, saving, end screens)
- PS2M: https://archive.org/download/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA/Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA_djvu.txt (menus, campaign/sub-missions, Hall of Fame, Stealth Award, revive, end screens) - also cached at /home/user/raw/ia/ps2_manual.txt
- PRIMA: https://archive.org/download/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide_djvu.txt (co-op chapter ~line 2840-3450: connection table, modes, revive, stats/perfect score, voice detection; PS2 walkthrough ~37400-41500; solo alarm/difficulty sections) - also /home/user/raw/ia/prima_eguide.txt
- FW pages via API: Alarm, Difficulty, Cooperative, Mission Failed, Stealth, Stealth Meter, Health, Medical Kit, Adrenaline Syringe, Training Facility, Panama, Seoul 3, Chemical Bunker, Train Station, Nuclear Plant, United Nations Headquarters, PS2 sub-level pages, Rooftops/Breakdown/Corruption/Prison Rescue/Escape (N-Gage/DS) - https://splintercell.fandom.com/api.php
- FW-RU via API https://splintercell.fandom.com/ru/api.php : Штаб-квартира ООН, Панама, Сеул 3, Взаимодействия, Нью-Йорк (Chaos Theory), Атомная станция, Адреналин, Статистика (CT section empty)
- MN: https://news.xbox.com/en-us/2005/08/25/splinter-cell-content/ (DLC rules)
- Gamepressure 1.05 patch notes: https://www.gamepressure.com/download.asp?ID=9626
- WorthPlaying 13 Jul 2005: https://worthplaying.com/article/2005/7/13/news/25830-splinter-cell-chaos-theory-xboxpc-steel-squat-map-available-now/ ; VideoGamer 14 Jul 2005: https://www.videogamer.com/news/new-map-sneaks-up-on-chaos-theory/ (UN HQ "no kills or alarms")
- Elder-Geek co-op review 2009: http://elder-geek.com/2009/09/splinter-cell-chaos-theory-co-op-review/ (no checkpoints, seven missions, operate alone remark)
- GamesFirst preview Feb 2005: https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/ (voice proximity, no whistle button)
- GameRevolution Xbox review: https://www.gamerevolution.com/review/36141-splinter-cell-chaos-theory-review ; GC review: https://www.gamerevolution.com/?p=32392 (adrenaline heal, "four levels")
- Classic Co-op spotlight 2017: https://www.classicco-op.com/coop-spotlight/2017/6/21/co-op-spotlight-splinter-cell-chaos-theory (GC no mid-mission save)
- Cheat pages: https://cheatindex.co.uk/xbox-tom-clancys-splinter-cell-chaos-theory-cheats ; https://www.chaptercheats.com/cheats/playstation2/15298/splinter-cell-chaos-theory-cheat-codes ; https://www.chaptercheats.com/cheats/xbox/15297/splinter-cell-chaos-theory-cheat-codes ; https://multiplayer.it/trucchi/tom-clancys-splinter-cell-chaos-theory-splinter-cell-3-trucchi.html ; IGN wiki https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory (Xbox_Cheats, PS2_Cheats, Training_Facility, Co-op_Missions_(Xbox_version_only))
- Steam threads (app 13570): /discussions/0/617321352205280978 (difficulty, Elite), /3078747189787867364 (difficulty), /3110268136059532240 (co-op differences), /133262738417485094 (co-op maps solo)
- YouTube playlist PLpMZ4IkRJgZVibktTy6OM4aeZbjRVSmvK (Expert/Elite co-op 100% runs; description only)
- Wikipedia CT article (cached /home/user/raw/wp_ct.txt)
- Failed/blocked: gamespot.com articles (403), co-optimus.com (403), pcgamingwiki.com (403 Cloudflare, WebFetch too), gamefaqs.gamespot.com (403), mobygames (403), neoseeker (403), cheatcc (403), supercheats (403), softpedia (403), neowin (403), community.pcgamingwiki.com (403), moddb (403), web.archive.org (blocked per brief), github.com repo (proxy: repo not enabled), chaostheory.miraheze.org dump on archive.org (mostly unrelated content)
