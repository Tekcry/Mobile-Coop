# 03 - Mechanics

The rules of the 2-player co-op mode of *Tom Clancy's Splinter Cell: Chaos Theory* (2005): friendly fire, downing and revive, health, difficulty, alarms, guard senses, doors, interrogation, the grab menu, saving, scoring, hard fails, communication and network rules. Every fact is labelled with the platform it applies to.

**Platform labels used in this file:**
- **Xbox/PC (Version 1):** one continuous level per mission; Training Facility, Panama, Seoul ("Seoul 3"), Chemical Bunker, Train Station, plus the two downloads Nuclear Plant and UN Headquarters. Xbox and PC share one script (PC 1.05 text is word-for-word the Xbox build 477 text for Panama, Seoul and Chemical Bunker; small wording fixes for Train Station and Training) [CONFIRMED - several sources: PC105 + XB477 diff].
- **PS2/GC (Version 2):** Team Training plus four missions split into sub-levels: Seoul (Streets, Rooftops, Gardens, Fish Market, Cyber-Cafe), Chemical Bunker (Silo, Laboratories, Cryogenic Chamber, Storage Room, The Docks), Train Station (Train Repair Station, Hydro Tunnel, Subway, The Station), Panama (The Alley, East Wing, Archives, Server Room).
- **N-Gage/DS (handheld):** the separate Gameloft co-op campaign (Rooftops, Breakdown, Corruption, Prison Rescue, Escape) with the Shadownet Hacker and Shadownet Assault roles.

**Confidence tags:** [CONFIRMED - several sources: ...], [ONE SOURCE: ...], [INFERRED / UNCERTAIN: ...], [UNKNOWN - see 06-open-questions.md, R-xx], [ANALYSIS] (the researchers' interpretation, not a fact about the game). Source codes (XBM, PS2M, PRIMA, FW, FAN, RUW, FW-RU, IGNW, JV, EG, NWR, GF, MN, TX, EUR, G&M, WP, CCO, RYB, NEO, SCQ, AT, PC105, XB477, XBDLC, PCDVD, NG-TXT, Steam, etc.) are kept exactly; 00-index.md carries the legend.

**Precedence note.** The topic files (03, 04, 05, 06, 07, 10, 12, 15, OPEN_QUESTIONS) were corrected by the gap-closing pass on primary game files (`gap_closing_gamefiles.md`) and community sources (`gap_closing_community.md`). Where an older research note disagrees, the corrected value is given as the fact and the older claim is kept as a note.

---

## 1. Friendly fire

### Xbox (Version 1)
- **A match option exists.** Xbox match creation (the [OPTIONSTITLE] block of the pre-game menus) lists a "FRIENDLY FIRE" setting next to mode, difficulty, language, friends-only and voice-only. [ONE SOURCE: XB477 `PreGameMenus.int` [OPTIONSTITLE]; the same string is also present in PC105's copy of that file]
- **Engine storage.** The level info stores friendly fire, the mission mode (Story / Mission / internally "SILENT" = Elite) and the difficulty together. [ONE SOURCE: XB477 `common.lin`]
- **Default value on Xbox:** not stated in any text. [UNKNOWN - see 06-open-questions.md, R-08]
- **Earlier, weaker evidence (now superseded by the menu string but kept):** an IGN wiki Xbox glitch tip has one agent hit the other with a sticky shocker and notes "friendly fire must be on", implying a host option. The FW Panama trivia describes the same shock-your-partner invisibility bug. Before the gap pass this was tagged [INFERRED / UNCERTAIN: a friendly-fire setting is implied but not documented in XBM/PS2M/PRIMA]. [ONE SOURCE: IGNW tip; ONE SOURCE: FW Panama trivia]

### PC (Version 1)
- **No menu toggle.** The PC co-op menu file (`PreGame_PC.int`, section CoopCommon) lists name, mode, mission, difficulty, skills, language and voice-only, but no friendly fire. [ONE SOURCE: PC105 `PreGame_PC.int`]
- **Default on.** `SplinterCell3Settings.ini` sets friendly fire ON in the game-info section (`b_friendlyFire=true`). [ONE SOURCE: PC105 `System/SplinterCell3Settings.ini`]
- **Reading:** on PC friendly fire appears to be always on, with no menu toggle. [INFERRED / UNCERTAIN: PC conclusion holds until checked in game; R-08 is UPGRADED, not closed]
- **Glitch that depends on hitting the partner (PC speedruns):** one player fakes lock-picking a door while the partner tasers him; the model gets stuck and the player becomes practically invisible ("becoming a ghost"). It is used in the UN HQ individual-level speedrun and recurs in later missions. [CONFIRMED - several sources: YouTube comments on B8z_7lUW6XI (Buttercak3), yEjHJb-SpjQ, gOn-T6LlNHk]
- **Related bug:** if an agent is shocked while hacking a console or computer, he becomes invisible but can no longer open doors himself. Listed on the Xbox Panama page, platform-generic on FW. [ONE SOURCE: FAN (EN and RU)]

### PS2/GC (Version 2)
- No source states whether friendly fire exists or can be toggled. [UNKNOWN - see 06-open-questions.md, R-08 covers only Xbox/PC]

### N-Gage/DS (handheld)
- No source. [UNKNOWN - see 06-open-questions.md, R-23]

### Score effect (solo reference only)
- In solo CT, friendly fire on allies drops the rating to zero; the co-op equivalent is unknown. [ONE SOURCE: FW main / Mission Failed pages]
- The Tomoe Nage throw knocks out an NPC at the landing point; this is a move effect, not friendly fire. [CONFIRMED - several sources: XBM + PS2M]

---

## 2. Down / revive / death

### 2.1 Going down (Xbox/PC and PS2/GC)
- **At zero health an agent is not killed outright.** He falls unconscious ("knocked unconscious" / "critically wounded"); the FW Cooperative page says the injured player must wait for the partner. [CONFIRMED - several sources: XBM, PS2M, PRIMA; FW Cooperative]
- **The revive window is about 30 seconds.** The partner has about 30 seconds to reach the downed agent; otherwise the mission fails. [CONFIRMED - several sources: XBM, PS2M, PRIMA; PC manual p.13 (PCDVD) says the same for PC: about 30 seconds to reach a downed partner or the mission fails]
- **Automatic alert:** when an agent's health hits zero, an automatic message tells the partner he needs help. [ONE SOURCE: PRIMA]
- **Fall damage downs rather than kills (Xbox/PC Chemical Bunker quirk):** players can skip the lift ride by jumping down the shaft onto or near the partner and then reviving at the bottom. [ONE SOURCE: RUW]
- **Deaths that are not "downs":** some hazards kill outright rather than downing (they are listed as deaths or mission fails in the sources): entering the contaminated washroom in Train Station without the antidote kills the agent [ONE SOURCE: RUW]; wrong cryo-mixing inputs in Chemical Bunker release ceiling gas that "badly hurts or kills" [CONFIRMED - several sources: PRIMA + NEO + FAN + Steam + JV]; Panama players who missed the balcony ledge "jumped to their deaths" [ONE SOURCE: JV]; Steam reviewers mention clipping deaths [ONE SOURCE: Steam]. Whether these are true instant deaths or downs that start the 30-second window is not stated. [INFERRED / UNCERTAIN: the sources only say "kills" or "dies"]

### 2.2 How the revive works
- **Interaction:** the partner goes to him and picks the heal interaction from the Interaction menu (Xbox A / PS2 X). HUD interaction label: "Heal Teammate". PC default key: Insert = revive. Training note: you heal your partner, if you have a syringe, by standing over him and interacting. [CONFIRMED - several sources: XBM, PS2M, PRIMA; HUD.int both builds; PC105 ini]
- **The item:** "Adrenalin Syringe" (internal name REVIVESYRINGE), an experimental adrenaline boost injected into an incapacitated person's torso. [CONFIRMED - several sources: `Equipments.int` / `HUD.int` in XB477 and PC105]
- **Heal amount:** about half health. PRIMA says the adrenaline shot restores about half health; RUW says the syringe restores 50%. [CONFIRMED - several sources: PRIMA, RUW]
- **Manual name for the move:** "Heal Teammate: revive a downed partner. Usable only twice per game, and you have about 30 seconds to reach him or the mission fails." [ONE SOURCE: XBM rules as summarised in mission_training.md]
- Not explicitly taught by name in Training. [ONE SOURCE: FAN objective list]

### 2.3 Syringe counts per platform

| Platform | Syringes | Revives | Status |
|---|---|---|---|
| Xbox/PC (all seven missions, both agents) | 1 per agent per mission | 2 per team per mission ("twice per game") | [CONFIRMED - several sources: in-game Co-op Training pop-up in XB477 + PC105 `P_00_Training_COOP.int` ("each agent carries one adrenaline boost, so the revive can only be done twice per mission"); XBM + PS2M "twice per game"; RUW loadout tables; PRIMA Xbox/PC gear boxes] R-03 CLOSED for Xbox/PC |
| PS2/GC (every sub-level, both agents) | 2 per agent per sub-level (loadout tables) | Not confirmed from game files | [ONE SOURCE: FW sub-level loadout tables; PS2M manual says revive "twice per game"] The PS2/GC count was never checked against game data (no PS2/GC data available). [UNKNOWN - see 06-open-questions.md, R-03 (PS2/GC part)] |
| N-Gage/DS | 1 health pack per role (both Hacker and Assault); Prison Rescue lists "health packs 1+1" (probably +1 pickup) | "Heal ally" within 30 s with a health pack | [ONE SOURCE: FW loadout tables; NG-TXT for the 30 s line] |

- **Superseded claim (kept as a note):** PRIMA's co-op basics page says each agent carries **two** adrenaline shots. That is wrong for Xbox/PC: PRIMA's own Xbox/PC gear boxes, the RUW tables and the in-game training text all give one per agent. Earlier research notes (`coop_gadgets_controls_comms.md`, `mission_panama.md`, `mission_seoul.md`, `mission_train_station.md`, `mission_training.md`, `dev_and_design_intent.md`) recorded this as a CONFLICT with the "most consistent reading" of Xbox/PC 1 each per mission and PS2/GC 2 each per sub-level; the gap pass closed it for Xbox/PC using the training text. [CONFIRMED - several sources: XB477 + PC105 training text + XBM + PS2M; PRIMA "two each" superseded]
- **Syringes can be shared?** Share Equipment hands over any item marked with a dot; whether the syringe is marked is not stated. [UNKNOWN - see 06-open-questions.md]

### 2.4 Both agents down
- No game text covers it beyond a game-over state in the menu that waits for the teammate. [ONE SOURCE: XB477 / PC105 menu strings; "no string found" per gap pass]
- Earlier notes: "not stated anywhere; implied failure because nobody remains to revive within the 30 s window". [INFERRED / UNCERTAIN: absence of evidence]
- Status: [UNKNOWN - see 06-open-questions.md, R-03 remainder (both-down rule)]

### 2.5 What fails the mission (down/death part)
- A downed partner not revived within about 30 seconds fails the mission for both. [CONFIRMED - several sources: XBM, PS2M, PRIMA, PC manual]
- Using up both revives means the next down cannot be healed. [INFERRED / UNCERTAIN: follows from the two-revive limit; not stated as a separate rule]
- There are no automatic checkpoints on any platform, so a failure means reloading a manual save (Xbox/PC) or replaying the sub-level (PS2/GC); see §11. A 2009 reviewer said dying or botching an objective means a full restart. [ONE SOURCE: EG]

### 2.6 N-Gage/DS (handheld)
- Generic co-op line: a man is down and the other player must find the body and use a health pack within 30 seconds to save him. An interaction "HEAL ALLY" exists; it is the only partner action among the 37 interaction labels. [ONE SOURCE: NG-TXT]
- Health pack = 50 HP. [ONE SOURCE: NG-TXT gadget text]
- If a player drops out of the session, the game cancels it for lack of players; there is no AI partner. [ONE SOURCE: NG-TXT]
- Fail reasons in the shared stats text include "died". Which apply to co-op is not stated. [ONE SOURCE: NG-TXT; co-op applicability INFERRED / UNCERTAIN]

---

## 3. Health and medkits

### 3.1 Health display
- **Xbox:** each agent has his own life bar and sees the **partner's health** ("Teammate status") on the HUD. [ONE SOURCE: XBM p.23]
- **PS2:** life bar only; the PS2 co-op HUD list has no teammate-health item. [ONE SOURCE: PS2M]
- **PC:** not separately documented (shared Xbox script). [UNKNOWN - see 06-open-questions.md]
- (Full HUD detail: see 05-hud-and-camera.md.)

### 3.2 Medkits: wall cabinets, not loadout items (Xbox/PC)
- **Medical kits are wall cabinets used in co-op as in solo.** [CONFIRMED - several sources: RUW Training + RUW Seoul + IGNW (IGNW Seoul tells players to "use meds")]
- **They are not part of any co-op loadout.** No Xbox/PC or PS2/GC loadout table lists a medkit; the adrenaline syringe is the only carried healing item. [CONFIRMED - several sources: RUW tables, FW tables, PRIMA gear boxes, game-file map settings]
- **Heal amount by difficulty (general CT, sources mostly describe solo):** medkits restore full health on Normal, 50% on Hard, less on Expert. [CONFIRMED - several sources: FW Difficulty + PRIMA solo chapter] Whether co-op uses the same values is not separately stated. [INFERRED / UNCERTAIN: co-op applicability]
- **Reusable or not:** no source says whether a cabinet heals once or can be used repeatedly, or whether it heals both agents. The Seoul save bug below (saving with the cabinet door open destroys the kit) suggests the kit is a single object inside the cabinet. [UNKNOWN - see 06-open-questions.md; the single-object reading is INFERRED / UNCERTAIN]
- **Revive vs medkit:** the revive restores about half health (see §2.2); a medkit is the only way to top up afterwards on the documented maps.

### 3.3 Medkit locations per mission (Xbox/PC)

| Mission | Medkits documented | Where | Confidence |
|---|---|---|---|
| Training Facility | 1 | In the laser room (the Hangover-hack room) | [ONE SOURCE: FAN (RU)] |
| Panama | None documented | - | [UNKNOWN - see 06-open-questions.md] |
| Seoul 3 | 3 | (1) Hotel top-floor bathroom, where the double is interrogated (also an in-game note: "medkit in the hotel bathroom"); (2) the small Fish Market Store after the sewers (Rybka: switch to the right of the door, med kit, save); (3) by the cyber-cafe door (Rybka) | Count [CONFIRMED - several sources: RUW ("3 cabinets") + RYB]; hotel bathroom [CONFIRMED - several sources: PRIMA + RYB + game-text note XB477/PC105]; others [ONE SOURCE: RYB] |
| Chemical Bunker | None documented | - | [UNKNOWN - see 06-open-questions.md] |
| Train Station | None documented | - | [UNKNOWN - see 06-open-questions.md] |
| Nuclear Plant | None documented | - | [UNKNOWN - see 06-open-questions.md] |
| UN Headquarters | None documented | - | [UNKNOWN - see 06-open-questions.md] |

- **Seoul medkit save bug:** saving with the medkit cabinet door open destroys ("kills") the medkit. [ONE SOURCE: RYB]
- **PS2/GC:** no medkit is documented in any sub-level. [UNKNOWN - see 06-open-questions.md]

### 3.4 N-Gage/DS
- Each role carries 1 health pack (50 HP); used to heal oneself or the downed ally ("HEAL ALLY" within 30 s). Prison Rescue lists extra supplies "health packs 1+1" for the Assault, which probably means a pickup. [ONE SOURCE: FW tables + NG-TXT; meaning of "+" INFERRED / UNCERTAIN]

### 3.5 Other health costs
- **Failed retinal-scanner hack in Training costs health** (objective text warns failing is "dangerous"). One agent can hack both scanners, but a failed hack hurts. [ONE SOURCE: FAN RU for the health cost; solo-hacking both scanners CONFIRMED - several sources: FW-RU + IGNW]
- **Cryo gas** on wrong mixing input (Chemical Bunker): badly hurts or kills. [CONFIRMED - several sources: PRIMA + NEO + FAN + Steam + JV]
- **Damage taken rises with difficulty.** [CONFIRMED - several sources: FW Difficulty + PRIMA]
- **Alarm stage 2 body armour** halves chest damage to guards, not to agents (see §5).

---

## 4. Difficulty levels

### 4.1 Names
- **Difficulty:** Normal / Hard / Expert, shared with solo play; internally Easy / Normal / Hard. [CONFIRMED - several sources: XB477 + PC105 menu text; XBM ("difficulty" is a Create Mission parameter); FW/FW-RU Chemical Bunker notes give per-difficulty co-op puzzle lengths]
- **Modes (Xbox/PC):** Story / Mission / Elite. Elite is a mode, not a difficulty tier; internally the mission mode "SILENT" = Elite. [CONFIRMED - several sources: XB477 + PC105; internal name ONE SOURCE: XB477 `common.lin`]
- **Modes (PS2/GC):** Campaign (missions in order, each split into sub-levels; every completed sub-level becomes selectable), Training, Hall of Fame. No Elite mode in the PS2 manual. [ONE SOURCE: PS2M] Cheat sites disagree: one lists "Elite: complete Story mode, knife only" under PS2, and ChapterCheats PS2 lists "Elite difficulty - finish Co-Op Mission mode", probably copied from Xbox entries. [INFERRED / UNCERTAIN]
- **N-Gage/DS:** co-op difficulty levels are not documented. [UNKNOWN - see 06-open-questions.md, R-23]

### 4.2 The three modes (Xbox/PC)
- **Story:** missions in a fixed order; each must be succeeded to unlock the next. [CONFIRMED - several sources: XBM + PRIMA]
- **Mission:** replay any Story mission (PRIMA: only those already unlocked) in any order. [CONFIRMED - several sources: XBM + PRIMA]
- **Elite:** same as Mission mode but firearms start with no ammunition; opens only after Story is completed. [CONFIRMED - several sources: XBM + Cheat Index / ChapterCheats / IGN wiki (identical user text, counted once) + multiplayer.it; unlock CONFIRMED - several sources: PRIMA + Cheat Index]

### 4.3 Elite rules (and the conflicting claims)

| Claim | Source | Status |
|---|---|---|
| Firearms (rifle and pistol) start with zero ammunition | XBM; RUW tables (0/0 for every mission); cheat sites; a YouTube co-op 100% run describes Elite as "no ammo on spawn" | [CONFIRMED - several sources: XBM, RUW, cheat sites] |
| The knife becomes available to kill with | XBM | [INFERRED / UNCERTAIN: manual wording; not confirmed elsewhere] |
| "Restricted to non-lethal weapons" | PRIMA | Looser / incorrect paraphrase of the manual; the manual wording wins [ONE SOURCE: PRIMA] |
| Elite strips all weapons and gadgets except the knife, with Expert-level damage | One Steam poster | [INFERRED / UNCERTAIN: contradicted by the Elite loadout tables, which keep gadgets] |
| Ammo found in the level can still be picked up | Cheat text | [ONE SOURCE: cheat text] |
| Elite loadouts reshuffle gadgets (e.g. gas grenades instead of frags) and cut each agent to one or two non-lethal items | RUW tables; game-file map settings | [CONFIRMED - several sources: RUW + game files (PC105, XBDLC)] |
| Elite is typically played on Expert | YouTube playlist description (PLpMZ4IkRJgZVibktTy6OM4aeZbjRVSmvK) | [ONE SOURCE: YouTube playlist] |
| "Elite mode is just a non-lethal replay" (criticism) | TeamXbox review | [ONE SOURCE: TX] |
| On Elite, guards come to investigate at the slightest noise and fire at once, unlike Expert | A commenter on hexen2k7's Elite run (YouTube jry663Tx5bg) | [INFERRED / UNCERTAIN: not a controlled comparison] |

**Elite loadouts (Xbox/PC; firearm ammo 0 for both agents everywhere):**
- Training Facility: 0/0 ammo, adrenaline 1 each. [ONE SOURCE: RUW]
- Panama: Agent One sticky cam 1, shocker 1, airfoil 1, adrenaline 1; Agent Two sticky cam 1, airfoil 1, flash 2, adrenaline 1. [ONE SOURCE: RUW]
- Seoul, Chemical Bunker, Train Station: sticky cam 1 each; Agent One gas grenade x4; Agent Two flash grenade x4; adrenaline 1 each. [ONE SOURCE: RUW]
- Nuclear Plant: host 1 sticky shocker + 1 ring airfoil; client 1 ring airfoil + 2 flash grenades (game files). RUW: sticky cam 1 each, sticky shocker 1 (Agent One), airfoil 1 each, flash 2 (Agent Two), adrenaline 1 each. [CONFIRMED - several sources: XBDLC + PC105 ini; RUW]
- UN HQ: host 1 shocker + 1 airfoil; client 1 airfoil + 2 flash (game files); RUW the same as Nuclear Plant. [CONFIRMED - several sources: XBDLC + PC105 ini; RUW]
- (Full kit detail: see 04-kit.md.)

**Elite unlock and the downloads (Xbox/PC):**
- Elite unlocks by finishing co-op Story. [CONFIRMED - several sources: XBM + cheat sites]
- On Xbox, Nuclear Plant and UN HQ first appeared only after the Story was completed **on Elite**; after that they stay selectable in Mission mode. [ONE SOURCE: MN (official)] The Ubisoft press release does not mention this requirement. [ONE SOURCE: Ubisoft press release 24 Aug 2005]
- PC 1.05 patch notes: the downloads are selectable in Create Game in Mission mode, not accessible in Story mode; no Elite precondition is mentioned. ["not in Story" CONFIRMED - several sources: MN + PC 1.05 notes; PC Elite precondition UNKNOWN - see 06-open-questions.md]

### 4.4 What harder settings change (Normal / Hard / Expert)
- **Damage taken rises** with difficulty. [CONFIRMED - several sources: FW Difficulty + PRIMA (solo chapter)]
- **Expert makes hacking harder.** [CONFIRMED - several sources: FW + PRIMA]
- **Medkits restore less:** full on Normal, 50% on Hard, less on Expert. [CONFIRMED - several sources: FW Difficulty + PRIMA]
- **Wall mines:** can be disarmed on a green or red light on Normal and Hard, but only on green on Expert. [CONFIRMED - several sources: FW Difficulty + PRIMA + XBM (wall mine)]
- **Co-op-specific scaling (Xbox/PC Chemical Bunker):** the anti-virus mixing code is 3 values on Normal, 4 on Hard and 5 on Expert per agent; each agent's colour sequence is randomised (user A: green/red/violet; user B: blue/yellow/aqua). [ONE SOURCE: FW Chemical Bunker notes; randomness CONFIRMED - several sources: FAN + NEO poster ("colours may change every game")]
- The gap pass found **no game text on what difficulty changes** in co-op. [ONE SOURCE: gap_closing_gamefiles.md R-10]

### 4.5 Does difficulty change guard perception? (conflicting claims)
- One Steam poster: difficulty only scales damage dealt and received and has no effect on how easily guards spot you.
- Another Steam poster: some noises guards ignore on Normal are heard on Expert.
- The YouTube co-op 100% run (playlist PLpMZ4IkRJgZVibktTy6OM4aeZbjRVSmvK) calls Expert "highly sensitive, high damage AI".
- FW Difficulty trivia: harder settings generally raise awareness.
- Community (YouTube comments on tg8sn2ZC2CY, jry663Tx5bg): enemies spot you much more easily on Expert ("enemy can easily see you", so players shoot out lights); on Elite guards investigate at the slightest noise and fire at once.
- Status: [INFERRED / UNCERTAIN: Steam threads 617321352205280978 and 3078747189787867364, YouTube, FW trivia; R-10 stays OPEN] [UNKNOWN - see 06-open-questions.md, R-10]

---

## 5. Alarms

### 5.1 The HUD counter (Xbox/PC and PS2/GC)
- The HUD has an **alarm indicator above the visibility (light) bar** counting alarms; each alarm has "global repercussions". [CONFIRMED - several sources: XBM + PS2M (same wording in both manuals)]
- Players were confused by "HUD symbols above the light meter" (probably the alarm counter) in Train Station. [ONE SOURCE: Neoseeker search snippet]
- The OPSAT map legend has an "Alarm" entry and "Triggered Alarms". [ONE SOURCE: `InGameMenus.int`]

### 5.2 What raises an alarm (Xbox/PC; solo rules apply in co-op)
- Guards running to **wall-mounted alarm panels**. A guard who flees instead of fighting is probably heading for one; shooting the guard who spotted you before he reaches a panel prevents the alarm. [CONFIRMED - several sources: PRIMA solo chapter (several mission sections) + FW Alarm]
- Being seen on a **camera**. [CONFIRMED - several sources: PRIMA, FW, XBM]
- **Failing or aborting a hack late** ("in the red zone"); PS2M: failing or timing out of a hack sounds an alarm. [CONFIRMED - several sources: FW Alarm + XBM; PS2M]
- Presenting the **wrong face to a retinal scanner**. [CONFIRMED - several sources: PRIMA, FW, XBM]
- **Lasers and motion detectors.** [CONFIRMED - several sources: PRIMA, FW, XBM]
- A guard **raises an alarm only once he is certain**; a guard who sees a body, notices a shot-out light or thinks he saw or heard something enters an alert state on his own first. [ONE SOURCE: PRIMA wording; graduated alertness CONFIRMED - several sources: PRIMA, FW, WP]
- Bodies trigger an alarm only if a patrolling guard or an active camera actually sees them. [CONFIRMED - several sources: FW, WP]

### 5.3 The four stages (Xbox/PC; solo and co-op share the escalation)

| Alarm | Consequence |
|---|---|
| 1st | A freebie: guards respond, then write it off as a false alarm |
| 2nd | Guards put on **body armour**, roughly halving chest damage |
| 3rd | Guards add **helmets**, so headshots need a face hit |
| 4th | Every guard is permanently on high alert; co-op mission notes describe enemies **fortifying positions**, and FW says guards set up furniture as cover |

[CONFIRMED - several sources: PRIMA (solo), FW Alarm page, FW co-op mission notes, WP]
- The co-op mission notes listing stage 2 armour / stage 3 helmets / stage 4 fortified positions appear on the pages for Panama, Chemical Bunker, Train Station and Nuclear Plant. [ONE SOURCE: FW mission pages] The Nuclear Plant stage list is also in the game files: four alarm stages, stage four is full alert with fortified positions. [CONFIRMED - several sources: XBDLC + PC105]
- Hocking quote framing: "no game over"; alarms escalate instead of ending the mission. [CONFIRMED - several sources: Hocking in PC Gamer, Fandom co-op mission pages, JoongAng Daily, Xbox/PS2 manual alarm indicator]
- **Seoul 3 (Xbox/PC):** the co-op Seoul mission has an alarm system even though the solo Seoul mission does not; the escalation in this mission is undocumented. [ONE SOURCE: FW Alarm trivia; escalation UNKNOWN - see 06-open-questions.md]
- **Panama extra:** the laser room has an extra side room with guards that only opens if an alarm is raised. [ONE SOURCE: FAN (RU)]

### 5.4 Per-platform limits

| Platform | Limit | Confidence |
|---|---|---|
| Xbox/PC | **No alarm count aborts a mission on its own** (unlike earlier entries in the series). Four-stage escalation, then permanent high alert. Exception: UN HQ (general alarm aborts). | [CONFIRMED - several sources: PRIMA, FW]; "no general max-alarm failure rule found" was earlier tagged [INFERRED / UNCERTAIN: absence of evidence] in systems_rules.md |
| PS2/GC | **Each sub-level fails on the third alarm.** | [ONE SOURCE: FW, stated on about 14 sub-level pages (e.g. Gardens, Cyber-Cafe, all five Chemical Bunker pages, Panama pages)]. An earlier note (music_and_atmosphere.md) tagged it "reportedly ..." as [INFERRED / UNCERTAIN: from shared brief]; FW sub-level pages are the basis. |
| N-Gage/DS | **Three alarms abort.** Lambert warns after alarm 1 ("two more and the mission is over") and alarm 2 ("one more and Lambert calls it off"), and aborts on the 3rd. No armour escalation. | [CONFIRMED - several sources: NG-TXT + FW (DS Rooftops trivia + N-Gage/DS game page) + GamesRadar DS review] |

- **Solo comparison (Xbox/PC):** at maximum alarms in solo CT, secondary and opportunity objectives are cancelled (and some dialogue simplified). [CONFIRMED - several sources: FW Alarm + ChapterCheats user tip] The co-op Objective Review shows only "Completed" or "Failed" (no "Canceled"), unlike solo. [CONFIRMED - several sources: XBM + PS2M] So in co-op such objectives presumably show as Failed. [INFERRED / UNCERTAIN: inference]
- **PS2/GC secondary objectives** of the form "finish without a single alarm" / "gain entry without one alarm" reward clean play (e.g. Panama: The Alley "Gain entry with no alarm"; East Wing "Finish with no alarm"; Archives opportunity "Finish with no alarm"; Server Room "Finish with no alarm"). [CONFIRMED - several sources: FW + PRIMA PS2 walkthrough]
- [ANALYSIS] Bite-sized PS2/GC sub-levels plus a strict alarm cap make Version 2 behave like the series' older "three strikes" model. GamesRadar's complaint about the return of the "three strikes" rule is about the DS game, not PS2/GC co-op.

### 5.5 What an alarm does while active, and decay
- **An alarm is a temporary state (Xbox/PC):** guards abandon routines, draw weapons and search for a while, then return to duty. [ONE SOURCE: PRIMA]
- **Music:** being spotted or setting off an alarm raises music intensity at once; calm returns as the alarm decays ("the music speeds up when enemies are alerted and settles when the alarm dies down"). [CONFIRMED - several sources: CDM + TechEnclave review] Engine music states: idle, exploration, stress A and B, fight, death, failure, success. [ONE SOURCE: XB477 / XBDLC level scripts] Players complain combat music can linger about a minute after a quick takedown. [ONE SOURCE: Steam reviews, GameGrin]
- **Does the counter itself go down on Xbox/PC or PS2/GC?** Not documented; the stage effects at 2-4 are described as permanent ("permanently on high alert" at 4). [UNKNOWN - see 06-open-questions.md]
- **N-Gage/DS alarm decay:** the alarm level is lowered after checkpoints and scripted events. Examples: in Prison Rescue, "Block B key obtained" is followed by Lambert lowering the alarm level; in Escape, each of the four turret computers the Hacker switches off lowers the alarm level. A separate generic line tells the agents the alarm level was lowered. [CONFIRMED - several sources: FW + NG-TXT for the strings; linkage ONE SOURCE: FW]
- **Checkpoints effect:** FW says the alarm count drops "after each checkpoint" for the N-Gage/DS game in general; NG-TXT only shows the co-op alarm-lowered line. [ONE SOURCE: FW; co-op checkpoints UNKNOWN - see 06-open-questions.md, R-23] Xbox/PC and PS2/GC have no automatic checkpoints, so no checkpoint effect applies there (see §11).

### 5.6 Armour, helmets and fortify in practice
- Stage 2 armour roughly halves chest damage; stage 3 helmets mean headshots need a face hit; stage 4 fortified positions and furniture as cover. [CONFIRMED - several sources: PRIMA (solo), FW Alarm, WP]
- These are guard-side upgrades only; no source says agents are affected. [INFERRED / UNCERTAIN]
- See also §6.

### 5.7 Alarms and score
- **Alarms cost score.** [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- A perfect score needs no alarms. [CONFIRMED - several sources: PRIMA, XBM, PS2M]
- See §13.

### 5.8 Mission-specific overrides
- **UN Headquarters (Xbox/PC):** a general alarm aborts the mission (Lambert aborts "the moment he hears a general alarm"; game text "mission over"; designer comment: game over when one of the alarms is activated). Extra fail triggers per FW-RU: being seen at lit windows, tripping the metal detector alarm. [Abort CONFIRMED - several sources: FW briefing + Ubisoft PR via WorthPlaying / VideoGamer ("no room for kills or alarms") + XBDLC/PC105 game text + designer comments; extras ONE SOURCE: FW-RU]
- **PS2/GC Panama Archives and Server Room:** ceiling turrets are triggered by alarms or camera sightings and cannot be disabled. [ONE SOURCE: FAN (RU)]
- **PS2/GC Seoul Gardens:** an alarm spawns one masked NVG (night-vision goggle) enemy. [ONE SOURCE: FAN (RU)]
- **PS2/GC Chemical Bunker Silo:** wall-mounted alarm detectors line the rappel shaft; the rope holder swings the rope side to side so the rappeller avoids them. [CONFIRMED - several sources: PRIMA + Ziggity PS2 description ("a few motion sensors" going down the missile site)]
- Full hard-fail list: §14.

---

## 6. Heavies and armoured guards

- **No "heavy" guard archetype is documented for co-op** on any platform. Armour in the sources comes only from the alarm escalation. [UNKNOWN - see 06-open-questions.md]
- **Alarm-driven armour (Xbox/PC):** alarm 2 = body armour (roughly halving chest damage); alarm 3 = helmets (headshots need a face hit); alarm 4 = permanent high alert, fortified positions, furniture set up as cover. [CONFIRMED - several sources: PRIMA (solo), FW Alarm, FW co-op mission notes (Panama, Chemical Bunker, Train Station, Nuclear Plant), WP; Nuclear Plant stages also in XBDLC + PC105]
- **PS2/GC:** no armour escalation is documented; the third alarm fails the sub-level. [ONE SOURCE: FW] Whether stages 1-2 add armour on Version 2 is not stated. [UNKNOWN - see 06-open-questions.md]
- **N-Gage/DS:** no armour escalation. [ONE SOURCE: FW]
- **Special enemies that are documented:**
  - PS2/GC Seoul Gardens: an alarm spawns one **masked NVG enemy**. [ONE SOURCE: FAN (RU)]
  - **Automatic machine-gun turrets** (Xbox/PC Seoul hotel and boat, Train Station repair yard, UN HQ lower floors; PS2/GC Seoul Streets, Gardens x2, Fish Market, Cyber-Cafe, Chemical Bunker Storage Room, Train Station Subway stair landing, Panama Archives x2 and Server Room x2). Beaten by jamming and switching off at the panel on Xbox/PC; some PS2/GC turrets cannot be shut off, only suppressed. [CONFIRMED - several sources: PRIMA, RYB, FAN, IGNW for the main cases; see 01-coop-levels.md]
  - **UAV drone** guarding the PS2/GC Panama East Wing laser floor, waking if a beam is broken (an email: it "won't activate unless you break the security lines"); a UAV is also listed in PS2/GC Seoul Gardens. [East Wing CONFIRMED - several sources: FAN + JV; Gardens ONE SOURCE: FAN (RU)]
  - **Mobile ceiling sensors** (PS2/GC Chemical Bunker Silo and Laboratories); RUW calls the Silo device a "turret". [ONE SOURCE: PRIMA; device type INFERRED / UNCERTAIN]
  - **Colonel Kim's men in UN HQ** are the one group that may be killed there (lethal force allowed). [ONE SOURCE: FW]
  - A flame/torch-carrying enemy ("Fackelmann") in a German Nuclear Plant LP title, part 9. [INFERRED / UNCERTAIN: jokey LP title (RednBlue2k9), not verifiable]
  - N-Gage/DS Escape: four automatic machine-gun turrets that can only be switched off by hacking computers (Hacker only). [ONE SOURCE: FW; turret-off string CONFIRMED - several sources: NG-TXT + FW]

---

## 7. Guard senses

### 7.1 Sight and the light (stealth) meter
- **Each agent's HUD shows a stealth (light) meter.** At the far left the agent is effectively invisible. The more light on the agent, the further away guards can see him; in a brightly lit space any guard with clear line of sight notices at once. [CONFIRMED - several sources: PRIMA, XBM, PS2M]
- **The meter overrides appearance:** the meter, not how dark the scene looks, decides visibility. [ONE SOURCE: PRIMA] [ANALYSIS] This is a known readability gap: what players see and what the system computes can disagree.
- **PS2 options include "shadow calibration".** [ONE SOURCE: PS2M]
- **Lights are mutable.** Almost every artificial light can be shot out, switched off or temporarily disabled with the jammer (OCP). Disabling a light alerts nearby guards (they notice the change); the trade usually favours the player. [CONFIRMED - several sources: PRIMA, FW, WP]
- **Guards come to fix lights** (exploitable lures): in Xbox/PC Panama the security-office guard comes out to fix a light switched off in the hall; the archive guard tries to turn the lights back on; server-hall guards investigate shot-out lights. [ONE SOURCE: PRIMA / FAN each]
- **Weather:** lightning briefly changes light levels, creating momentary windows (documented for solo); lightning can reveal you while thunder covers your noise; guards dislike rain and re-route to dry places. [ONE SOURCE: PRIMA for the lightning window; storm effects CONFIRMED - several sources: bonus-disc documentary + CGW] Co-op weather is undocumented. [UNKNOWN - see 06-open-questions.md]
- **In co-op each agent has his own meter, and the second agent is a second body to hide.** Missions repeatedly use **light as a shared resource**: one agent kills a light so the other can move, or holds a light off with the jammer (e.g. PS2/GC Seoul Streets, where the low agent jams the ground-floor light while the high agent drops in). [CONFIRMED - several sources: PRIMA]
- **The partner's meter is not visible:** no reported way to see what the partner's meter reads. [UNKNOWN - see 06-open-questions.md]
- **Community view:** co-op maps are small and too brightly lit next to solo levels ("low-budget" feel). [ONE SOURCE: Reddit 1g21m8q, 2 commenters]
- **GameCube readability:** the GC version adds artificial lights where Xbox relies on moonlight, recolours a grey staircase bright yellow, and reduces EMF view to white boxes. [ONE SOURCE: NWR]
- **UN HQ "lit windows":** being detected in windows where the light is on fails the mission; whether this means being spotted from outside through windows or in lit window areas is unclear; no game string mentions windows or lights in UN HQ. [ONE SOURCE: FW-RU; meaning UNKNOWN - see 06-open-questions.md, R-20] A fuzzy Reddit memory of shimmying down a building past a room where a guard investigated a light going out cannot be assigned to UN HQ. [INFERRED / UNCERTAIN: Reddit 1m8z5gm]

### 7.2 Hearing and the noise (sound) meter vs ambient
- **Noise meter:** each agent's noise meter (under the light meter) compares his own noise with a marker for the **ambient** noise of the area. Noise above the marker can be heard by nearby guards. The co-op HUD has the same meter ("the spy's noise and how noisy the environment is"). [CONFIRMED - several sources: PRIMA, XBM (p.23), PS2M, FW, WP, NWR, Empire, TechEnclave, PC Games]
- **Ubisoft calls it a "sound masking system":** loud places hide the player's noise. [ONE SOURCE: bonus-disc documentary]
- **What changes noise** [ONE SOURCE: PRIMA for details; noise-vs-ambient CONFIRMED]:
  - Moving slowly or crouched is quieter; analogue stick speed sets noise.
  - Floor material matters: grass and carpet are quiet; metal and wood are loud. [CONFIRMED - several sources: PRIMA, PC Games, Giant Bomb / Fandom stealth snippet]
  - Walking with a weapon drawn is silent in normal conditions, so use it where ambient is zero.
  - Grabs and interrogations make no game noise; OPSAT talk / comms are silent to the AI.
  - Using the OCP is silent, but some devices crackle when disabled, which can itself lure guards.
  - Hitting a person is quieter than shooting a bulb; a missed shot into a wall is the loudest thing you can do.
  - Changing rifle attachments sounds noisy but is not "heard".
  - Breaking a lock is faster than picking but noisy. [CONFIRMED - several sources: FW, PRIMA, IGNW]
- **How guards use noise:** guards walk to the source of a sound to investigate. In a firefight they aim at the last spot where the player's noise rose above the ambient level. [ONE SOURCE: PRIMA]
- **Ambient sources are level-design tools:** generators, storms, machinery, radios, televisions, hammering machines, passing trucks, thunder and the war ambience in Seoul raise the ambient marker and give players windows to move; when generators are off it gets quiet and dangerous. The sound designer placed a fountain near a garden path so standing near it masks footsteps (solo Bank). [ONE SOURCE: PRIMA for solo examples; masking sources CONFIRMED - several sources: reviews + guide; fountain ONE SOURCE: sound diary]
- **Co-op Seoul war ambience:** the in-game notes warn that the surrounding gunfire is not necessarily aimed at the players (a war is on). Ambient war noise is present; its masking effect on player noise is inferred. [ONE SOURCE: FW note; masking INFERRED / UNCERTAIN]
- **Nuclear Plant machinery:** Ubisoft's pitch stresses loud machinery, but no source documents a noise-masking mechanic there. [INFERRED / UNCERTAIN]
- **Distractions:** in solo, whistling, throwing objects and the sticky camera's clicker. In co-op the whistle button becomes the Co-op Action button (no whistling), so the pair lures guards with sticky-camera noise, shooting out lights, noisy device failures, Tomoe-Nage-onto-guard, and on Xbox Live their own voices. Rybka suggests thrown bottles as a distraction in Seoul. [CONFIRMED - several sources: XBM, PRIMA, GF, Steam; bottles ONE SOURCE: RYB]
- **Difficulty and hearing:** one Steam poster says some noises guards ignore on Normal are heard on Expert. [INFERRED / UNCERTAIN; R-10]

### 7.3 Voice detection (the real microphone)
- **Guards hear players' headset speech (Xbox Live, and PC online/LAN).** The headset microphone is heard by guards within a configurable radius; the default sensitivity value 50 equals about 2 m in game for a normal speaking voice. Talking loudly can give you away, and can be used deliberately to lure or distract guards. [CONFIRMED - several sources: XBM pp.22 and 26, PRIMA, GF preview, TX, GameSpot hands-on snippet, Steam]
- **Voice feeds the sound meter:** players remember that microphone speech registered on the in-game sound meter, so guards could hear it at full volume, and that you could deliberately make noise into the mic to attract or distract guards. It is the most-praised systemic detail in community memory. [CONFIRMED - several sources: Reddit mngqa0 (2 commenters), vpwdry, 1e9pwjx]
- **Options (Xbox):** voice detection on/off and voice detection sensitivity ("how much guards hear you"), voice masking, voice through TV speakers, Quick Match restricted to headset users ("voice-only" match option). [ONE SOURCE: XB477 `PreGameMenus.int`; XBM p.22] PC co-op menu also lists "voice-only". [ONE SOURCE: PC105 `PreGame_PC.int`]
- **PC manual:** the sensitivity setting does not change partner voice volume. [ONE SOURCE: PCDVD manual]
- **Whistling into the headset** can attract a guard without a button press. [ONE SOURCE: GF]
- **Ambient cover for voices:** to talk near guards, find louder ambient sound to cover your voice. [ONE SOURCE: GF]
- **PS2/GC:** co-op is split-screen only, so headset voice detection does not apply; the PS2 USB headset is documented only for chat and lobby generally. [CONFIRMED - several sources for split-screen only: PRIMA + GF; headset text ONE SOURCE: PS2M; "voice detection applies to Xbox and PC online co-op only" INFERRED / UNCERTAIN for PS2]
- **Today on PC:** the in-game voice option is greyed out, so players use Discord. [ONE SOURCE: Reddit vpwdry]
- [ANALYSIS] Voice detection is the most daring co-op detection rule: real conversation becomes a stealth risk and a tool, and it enforces a whisper culture.

### 7.4 Looking up
- No source documents whether guards look up at agents on ceilings, pipes, ledges, Hangover ropes or the Human Ladder. The only related facts: guards on the Panama reception stairs watch the climb [ONE SOURCE: PRIMA]; a guard on the Seoul temple's high balcony watches the first anti-aircraft vehicle area and must not be alerted [CONFIRMED - several sources: PRIMA + RYB]; an agent hanging in the Hangover can take an "inverse crouch" to hide [CONFIRMED - several sources: XBM, PS2M, PRIMA]. [UNKNOWN - see 06-open-questions.md]

### 7.5 Cameras and electronic sensors
- **Ordinary (non-thermal) cameras can be beaten by darkness alone.** [ONE SOURCE: IGNW tip]
- **The jammer (co-op OCP) holds a camera off** only while an agent stands still holding it; moving cancels it. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW]
- **Being seen on a camera raises an alarm.** [CONFIRMED - several sources: PRIMA, FW, XBM]
- **Specific camera effects:**
  - PS2/GC Panama Archives: a camera that one OCP/pistol hit disables; if it spots you a ceiling turret activates. [ONE SOURCE: FAN (RU)]
  - PS2/GC Panama East Wing: if one agent is seen by the cameras, the ceiling vent hatch shuts. [ONE SOURCE: JV; vent computer CONFIRMED - several sources: FAN + JV + NEO + SCQ]
  - Xbox/PC Chemical Bunker: computer 3 offers a security option to disable the camera system. [ONE SOURCE: FAN Data]
  - Xbox/PC UN HQ: the security cameras are found switched OFF on arrival (the colonel got there first). [CONFIRMED - several sources: XBDLC + PC105 game text]
  - Xbox/PC Panama server room: shoot the light near the computer so the room camera cannot see you. [ONE SOURCE: PRIMA]
  - N-Gage/DS Breakdown: pressing the two switches restores power and shuts off all cameras in the area. [CONFIRMED - several sources: NG-TXT + FW]
  - N-Gage/DS solo training text: a sticky shocker hit disables a camera for 15 seconds; chaff grenade disables all electronics in range for 20 seconds. [ONE SOURCE: NG-TXT]
  - Versus (comparison): cameras show green when idle and red when the alarm is active, and emit sound. [CONFIRMED - several sources: PS2M + PRIMA Versus]
- **Other sensors:** lasers (Training, Panama exhibition grid, Chemical Bunker corridor, Train Station bomb tripwires, Nuclear Plant footbridge corridor, PS2/GC cycling floor grids), motion sensors (Panama meeting and exposition rooms; a motion-sensor automatic door), mobile ceiling sensors (PS2/GC Chemical Bunker), wall-mounted alarm detectors (PS2/GC Silo shaft), the UN HQ metal detector. [see 01-coop-levels.md for tags]

### 7.6 Body discovery
- **Bodies trigger an alarm only if a patrolling guard or an active camera actually sees them.** Earlier games in the series used an automatic sweep. [CONFIRMED - several sources: FW, WP]
- **A guard who finds a corpse goes to high alert immediately.** [ONE SOURCE: PRIMA]
- **"No bodies found"** is one of the perfect-score conditions (as listed in 10 and 03); the end statistics track bodies found (hexen2k7 runs record "0 bodies found"). [CONFIRMED - several sources: PRIMA, XBM, PS2M as summarised in 10; hexen2k7 stats ONE SOURCE] Note: systems_rules.md's PRIMA list omits "no bodies found"; 10 and 03 include it.
- [ANALYSIS] Guards must perceive evidence (no automatic sweeps), so a pair can hide bodies and plan.

### 7.7 Evidence guards notice
- Searching guards notice **open doors, cut fabric, shot-out lights and missing colleagues**. [CONFIRMED - several sources: FW, WP, PRIMA solo]
- Disabling a light alerts nearby guards. [CONFIRMED - several sources: PRIMA, FW, WP]
- A disabled device may crackle, which lures guards. [ONE SOURCE: PRIMA]
- Scientists in the Chemical Bunker lab reportedly spotted hidden players. [ONE SOURCE: JV summary]

### 7.8 Guards reviving colleagues
- **A guard who finds a knocked-out colleague kicks and revives him.** That moment is itself an opening to take the reviver. [ONE SOURCE: PRIMA; KO'd guards revivable CONFIRMED - several sources: FW main page + WP + PRIMA solo]

### 7.9 Awareness states, search and barks
- **Graduated awareness:** normal routine, a suspicious/searching state and an alert/combat state. [CONFIRMED - several sources: PRIMA, FW, WP]
- **Investigation:** searching guards move slowly and carefully; use flashlights and flares, sometimes throwing them into dark areas; in combat they take cover, lean and shoot around corners and use squad tactics; frightened guards fire wildly into shadows. [CONFIRMED - several sources: FW, WP]
- **Barks:** guards comment on what they notice, talk to each other ("did you hear that?"), form impromptu search teams and call for cover; they move through stress stages from puzzled to rattled, shown in voice and animation. Guard pairs chat with randomised dialogue (e.g. two Panama server-room guards with 3 variants). [CONFIRMED - several sources: bonus-disc documentary + AI diary + WP; Panama variants ONE SOURCE: FAN (RU)]
- **Suspicion vs recognition:** a perfect score requires never being *recognised* as an intruder; mere suspicion is fine. [CONFIRMED - several sources: PRIMA, XBM, PS2M]

### 7.10 Two intruders
- No source describes whether the AI treats the two agents as one threat or two, or how it shares information about them. [UNKNOWN - see 06-open-questions.md, R-06]
- One reviewer reports **guards tripping over each other and alerting others while the agents were hidden**, a glitch that made detection feel unearned. [ONE SOURCE: EG]
- Simultaneous takedowns are hard because if one player fires early the other guard reacts. [ONE SOURCE: Reddit 1df5iet]

### 7.11 Readability with two players (what the original did) [ANALYSIS, with tags from 10 §7]
1. Each player has a personal meter pair (light plus noise) and sees the partner's health on Xbox. [CONFIRMED]
2. Escalation is gradual and does not end the mission on Xbox/PC; two players will make mistakes and the game absorbs them with armour stages rather than a reload. [CONFIRMED]
3. Guards must perceive evidence (no automatic body sweeps). [CONFIRMED]
4. Two-person security devices (paired scanners, jammer-held cameras) are fixed in place and visible. [CONFIRMED]
5. Automatic voice lines announce moves and downed partners, so detection-critical coordination does not depend on voice chat. [CONFIRMED]
6. Where it fell short: visibility that disagrees with the scene (meter overrides appearance); glitchy guard collisions causing unearned alerts; no way to see the partner's meter; punishing restarts when one player fails. [ONE SOURCE each: PRIMA, EG; partner meter is a gap]

**Lessons from the wider stealth literature** (from `stealth_coop_design_literature.md`, paraphrased, as listed in 10 §8) [ANALYSIS]:

| Principle | Origin | Two-player implication |
|---|---|---|
| Exposure and noise reach should be legible before the player commits | Mark of the Ninja's design rules; Thief | Both players should be able to read each other's exposure, not only their own |
| A glimpse should start a search, not an alarm; give graduated states | Mark of the Ninja; Thief; Metal Gear's alert-evasion-infiltration cycle | A partner's slip should give the other player time to act (cover, distract, rescue) |
| AI must decide only from what it perceives | Thief; Halo 2 | Two intruders are perceived separately; a guard who saw player A should not know where player B is |
| Guards talking to each other makes coordination legible | F.E.A.R. | Paired guard searches with call-and-response barks tell the pair what the AI believes |
| Give every encounter at least one zero-failure path, communicated but not obvious | Randy Smith, GDC 2006 | Verify a zero-failure path for two bodies, including the moment both must cross |
| Levels need scouting spots, connected safe "islands" and escape loops | Randy Smith | Scouting spots big enough for two; loops that let pairs split and regroup during a search |
| Cheap failure (encounter-level checkpoints, fast reload) | Mark of the Ninja | A partner's failure should become a rescue task for the other player before it becomes a reload for both |
| Instant-fail stealth breeds trial-and-error; offer graduated or fail-forward models | Bycer 2017; Payday 2; Invisible Inc. | Prefer escalation (armour, lockdowns, pressure) over abort, except in explicit hard-mode missions |

---

## 8. Doors

### 8.1 How doors are opened (overview)
- **Interaction menu.** Doors, keypads, scanners and other devices are worked through the HUD Interaction menu (Xbox A / PS2 X; PC Space / Enter; GameCube A). Contextual entries appear by name. [CONFIRMED - several sources: XBM + PRIMA; GC and PC bindings ONE SOURCE: FW controls page] A dedicated "door menu" layout (the exact list of door options) is not described in the co-op sources. [UNKNOWN - see 06-open-questions.md]
- **N-Gage/DS interaction verbs** (the closest thing to a door menu in the sources): the N-Gage text table has 37 interaction verbs, including open/bash door, lock pick, hack computer, hack panel, heal ally, grab, interrogate, optic cable, rappel, switch on/off, use keypad and pick-ups. [ONE SOURCE: NG-TXT]
- **Optic cable:** peek under doors; used under doors in co-op (Xbox/PC Panama route per IGNW; PS2/GC Panama Archives: one agent optic-cables the next door, enters when the patrol turns away and knocks out the guard). [ONE SOURCE: IGNW; PS2/GC use ONE SOURCE: PRIMA]
- **Guards notice open doors.** [CONFIRMED - several sources: FW, WP]
- **Door slams on the partner** are part of the remembered emergent comedy. [ONE SOURCE: Steam; CONFIRMED - several sources for "doors slammed in a partner's face": Reddit 1megyet and others]

### 8.2 Lock picking (all platforms)
- **Pin-sequence lock picking** or **breaking the lock** (faster but noisy). PRIMA's routes often just "break the lock". [CONFIRMED - several sources: FW, PRIMA, IGNW]
- **Documented lock pin counts:**

| Mission (platform) | Lock | Pins | Confidence |
|---|---|---|---|
| Seoul 3 (Xbox/PC) | Booth | 4 | [ONE SOURCE: FAN] |
| Seoul 3 (Xbox/PC) | Hotel entrance | 2 | [ONE SOURCE: FAN] |
| Seoul 3 (Xbox/PC) | Hotel room | 4 | [ONE SOURCE: FAN] |
| Seoul 3 (Xbox/PC) | Cyber-cafe exit | 4 | [ONE SOURCE: FAN] |
| Seoul 3 (Xbox/PC) | Jong's door (both cafe routes end by breaking it; Rybka: break, don't pick, before he flees) | - | [CONFIRMED - several sources: PRIMA + RYB] |
| Train Station (Xbox/PC) | Bomb 1 room, Bomb 3 room, Warehouse | 5 each | [ONE SOURCE: FAN]; probably on alternate routes (PRIMA's route picks none) [INFERRED / UNCERTAIN] |
| UN HQ (Xbox/PC) | Seven locks: rooftop; stairs near the elevator on the top floor; technical room on the middle floor; stairs near the elevator on the lower floor; toilet near the metal detector; left ventilation room and right technical room in front of the central hall. All 6-pin, the hardest tier (harder than Train Station's 5-pin) | 6 each | [ONE SOURCE: FAN] |
| UN HQ (Xbox/PC) | Roof door at the start (the speedrunner says the run begins by going to the roof door and pretending to pick its lock) | 6 | [CONFIRMED - several sources: FAN + speedrunner's own YouTube reply on B8z_7lUW6XI] |
| PS2/GC Chemical Bunker Silo | End door of the sensor hall (to Laboratories); Agent 2 breaks it | 3 | [CONFIRMED - several sources: PRIMA + FAN] |
| PS2/GC Seoul Fish Market | Exit door (cafe entrance), broken while the partner jams the turret | 4 (cafe entrance) | [CONFIRMED - several sources: PRIMA + FAN] |
| PS2/GC Train Station Subway | Exit to the station (ticket booth door; SHOCK-25 picks a 6-pin lock on the last door at 26:20) | 6 | [CONFIRMED - several sources: FAN + SHOCK-25 + PRIMA] |
| N-Gage/DS Prison Rescue | Prison cell lock (DS: three-pin stylus pick, FW notes "1-2-3") | 3 | [ONE SOURCE: FW]; who picks locks is unknown [UNKNOWN - see 06-open-questions.md, R-23] |

- **Speedrun glitch:** one player fakes lock-picking a door while the partner tasers him, which leaves the model stuck and the player practically invisible. [CONFIRMED - several sources: YouTube comments on B8z_7lUW6XI, yEjHJb-SpjQ, gOn-T6LlNHk]

### 8.3 Hacking (keypads, computers, scanners)
- **Done by touch, in person.** Computers, keypads and retinal scanners are hacked by contact. [CONFIRMED - several sources: PS2M hacking rules, FW/RUW, PRIMA]
- **No remote hacking in co-op (per PRIMA):** the EEV cannot be used, so all hacking is done in person. [ONE SOURCE: PRIMA] CONFLICT: the XBM co-op controller diagram still labels a button "camera / EEV", the PC `SplinterCell3User.ini` binds key 4 to EEV mode, and the engine has EEV actions for scan, distance hack, remote access and laser designation; no co-op map, loadout or menu string enables or disables EEV. [INFERRED / UNCERTAIN; UNKNOWN - see 06-open-questions.md, R-02]
- **Failure:** failing or aborting a hack late (in the red zone) sounds an alarm; PS2M: failing or timing out of a hack sounds an alarm. [CONFIRMED - several sources: FW Alarm + XBM; PS2M]
- **Training (Xbox/PC):** a failed retinal-scanner hack costs health. [ONE SOURCE: FAN RU]
- **Expert makes hacking harder.** [CONFIRMED - several sources: FW + PRIMA]
- **Hack while hanging:** the suspended agent in a Hangover can hack nearby computers and keypads (Training laser grid; Xbox/PC Panama air duct keypad that opens the exhibition gates). [CONFIRMED - several sources: XBM, PS2M, PRIMA; Panama duct CONFIRMED - several sources: PRIMA + JV]
- **Shock-while-hacking bug:** an agent shocked while hacking becomes invisible but can no longer open doors himself. [ONE SOURCE: FAN (EN and RU)]
- **PC desync during the training hacking minigame** (and about 1 minute into Panama) traced to mismatched configurations. [CONFIRMED - several sources: two Steam threads]
- **Players were confused by hacking** (the training retinal scanner). [ONE SOURCE: JV]
- **N-Gage/DS:** computers can only be hacked by the Hacker; electric panels can only be short-circuited by the Assault ("HACK COMPUTER" / "HACK PANEL", FR "court-circuiter"); refusal pop-ups enforce this. [CONFIRMED - several sources: NG-TXT + FW]

### 8.4 Retinal scanners
- **Paired scanners are the stock synchronized action:** two scanners must be satisfied at once. [CONFIRMED - several sources: FW, PRIMA, IGNW, XBM]
- **Three ways to beat a scanner:**
  1. **Hack it** (in Training each agent hacks one at the same time; one agent can hack both alone, but a failed hack costs health). [CONFIRMED - several sources: FAN + JV + IGNW; health cost ONE SOURCE: FAN RU]
  2. **Force a live captive to look into it** (grab, walk him to the scanner, force the scan, then choke him out). MAN-X and PRIMA's intro describe "forcing a couple of guards to open a door locked by a pair of retinal scanners" as a stock puzzle. [CONFIRMED - several sources: XBM, PRIMA]
  3. **Wrong face = alarm:** presenting the wrong face to a retinal scanner raises an alarm. [CONFIRMED - several sources: PRIMA, FW, XBM]
- **Where they appear:**
  - Training (Xbox/PC): one door, two scanners, hacked. [CONFIRMED - several sources: FAN + JV]
  - Panama (Xbox/PC): the two-scanner Archive door; the game's own note says it is easiest with the VP on one scanner and any guard on the other, used at the same moment; if the VP is unconscious the scanner must be hacked instead. [CONFIRMED - several sources: XB477 + PC105 game text; PRIMA route]
  - Seoul 3 (Xbox/PC): the cyber-cafe front door (Rybka route), forced with a guard or hacked. [ONE SOURCE: RYB]
  - Chemical Bunker (Xbox/PC): twin retinal scanners in the storage room, opened with two captives grabbed at the far door. [ONE SOURCE: PRIMA]
  - Nuclear Plant: the main control room door and the lab server room are locked by retinal scanners; how they are beaten is undocumented. [ONE SOURCE: FW notes; CONFIRMED - several sources for the notes: XBDLC + PC105; method UNKNOWN - see 06-open-questions.md, R-19]
  - PS2/GC Panama East Wing exit (simultaneous hack); Server Room (one scanner hacked by the thrown agent to drop lasers; the final scanner with a captive escorted past a jammed camera). [CONFIRMED - several sources: PRIMA + FAN]
  - PS2/GC Chemical Bunker Cryogenic Chamber: flash grenade as the elevator doors open, both grab a stunned guard and force them through twin scanners simultaneously, then choke them. [ONE SOURCE: PRIMA]
  - PS2/GC Team Training: two retinal scanners hacked (stats). [ONE SOURCE: FAN (RU)]
- **Online without a headset**, synchronized actions (the dual retinal scanner is explicitly covered) are synced automatically: the first player selects the action and presses A, the second does the same. [CONFIRMED - several sources: XBM p.27, PRIMA]

### 8.5 Key codes (all documented)

| Mission (platform) | Code | Opens | How obtained | Confidence |
|---|---|---|---|---|
| Panama (Xbox/PC) | 1523 | Hall outside the billiards room | Computer email (two guards plan to sneak into the lounge's big-screen TV to watch a match) | [ONE SOURCE: FAN]; also CONFIRMED - several sources: game text (XB477 + PC105) |
| Panama (Xbox/PC) | 1534 | Door from the server room out to the exposition area | Computer | as above |
| Panama (Xbox/PC) | 2341 | Door into the exposition area | Computer (reply in the same email chain) | as above |
| Panama (Xbox/PC) | 3245 | Door between the VP's office and his gallery | Interrogation of the VP | as above |
| Panama (Xbox/PC) | 3298 | The VP's private elevator | Interrogation of the VP | as above |
| Panama (Xbox/PC) | 9728 | "The archive room computer" (VP's archive computer) | Interrogation of the VP (RU localisation; used nowhere per FAN RU) | [ONE SOURCE: FAN (RU)]; also listed in game text per gap pass |
| Panama (PS2/GC) | 5993 | Copy room | Alley computer email (Neron asks Jose to change it) | [CONFIRMED - several sources: FAN + PRIMA] |
| Panama (PS2/GC) | 2341 | Exposition-area door (used in the Server Room) | Archives NE computer | [CONFIRMED - several sources: FAN + PRIMA] |
| Panama (PS2/GC) | 3298 | VP's private elevator (ends the Archives sub-level) | Interrogating the VP | [CONFIRMED - several sources: FAN + PRIMA] |
| Panama (PS2/GC) | 9835 | Archive-room keypad ("secret") | Appears in no intel; trial and error only; if you hack it, the guard gets stuck trying to reach the panel; SHOCK-25's chaptering shows the hack covering "3 doors" | [ONE SOURCE: FAN (RU) / SHOCK-25] |
| Panama (PS2/GC) | 1534 | (Email also present on PS2 Archives, but no keypad for it) | - | [ONE SOURCE: FAN (RU)] |
| Seoul 3 (Xbox/PC) | 7649 | Hotel back door | Email "Hotel Door code" (Ping to Cho, dated 07/08/07) on a hackable computer near the start (Rybka: in a locked room to the left); the computer works only after power is restored | [CONFIRMED - several sources: FAN Data + RYB + Steam co-op door-code thread + game text] |
| Seoul (PS2/GC) | 8251 | Exit / hotel door (Streets) | Interrogating the patrolling guard, or a nearby computer | [CONFIRMED - several sources: PRIMA + FAN] |
| Chemical Bunker (Xbox/PC) | 5791 | Mini-lab door | Interrogation | [CONFIRMED - several sources: FAN + Steam code list] |
| Chemical Bunker (Xbox/PC) | 1423 | Refrigerated locker in the mini lab (monkey blood) | Computer email "Talking Monkey?" | [CONFIRMED - several sources: FAN + Steam code list; game text] |
| Chemical Bunker (Xbox/PC) | 8416 | Main-lab security port | Interrogation | [CONFIRMED - several sources: FAN + Steam code list] |
| Chemical Bunker (Xbox/PC) | 1961 | Missile warhead casing | Computer email "Warhead Access" (Bae to Kim) | [CONFIRMED - several sources: FAN + Steam code list; game text] |
| Chemical Bunker (PS2/GC) | 1423 | Refrigerator | Computer #2 | [CONFIRMED - several sources: PRIMA + FAN] |
| Chemical Bunker (PS2/GC) | Mixing order A2, B3, B1, A1, B2, A3 | Anti-virus (fixed, published sequence) | Notes | [CONFIRMED - several sources: PRIMA + FAN] |
| Train Station (Xbox/PC) | 9201 | Locker number (told to Chu on the phone by an unnamed caller) | Bugged phone call | [CONFIRMED - several sources: XB477 + PC105 game text] |
| Train Station (Xbox/PC) | 0315 | Locker key code (Chu's son's birth date) | Both agents interrogate Chu together | [CONFIRMED - several sources: game text; PRIMA + FAN for the code] |
| Train Station (PS2/GC) | 1810 | North door (Train Repair Station) | Email on the north-east computer | [CONFIRMED - several sources: PRIMA + FAN Data + keypad codes page] |
| Train Station (PS2/GC) | 0315 | Locker | Interrogating Chu (twice) | [CONFIRMED - several sources: PRIMA + FAN] |
| UN HQ (Xbox/PC) | 250282 | Security room keypad (marked "secret") | Lure guards to the keypad and watch them type it with a sticky camera plus thermal or night vision; or knock out a guard and push him into another guard (lowers the stealth rating) | [ONE SOURCE: FAN EN/RU (code also on Fandom keypad-codes page, same source)] |
| Nuclear Plant | None documented; "Open security doors" and "Open central archives server" are computer actions | - | - | [ONE SOURCE: FAN Data; CONFIRMED - several sources: XBDLC + PC105 for the computer actions] |

- **Earlier conflict, now resolved (Train Station):** older notes treated Prima's "locker 9201" and the code 0315 as conflicting; the game text shows 9201 is the locker number and 0315 the key code, so both were right. [CONFIRMED - several sources: XB477 + PC105; R-17 partly closed]
- **Optional rooms:** several Panama codes (1523, 1534, 3245) are not needed on PRIMA's route and open optional loops. [INFERRED / UNCERTAIN: inference]
- **Code sources:** door codes come from emails, overheard talk and interrogations; the Steam thread "SCCT Co-op door codes" lists "Seoul: 7649" and 5791, 1423, 8416, 1961 for Chemical Bunker. [CONFIRMED - several sources: FAN + Steam]
- **PS2/GC Archives keypad bug:** the guard opens the archive door, it stays open until the keypad is hacked, and the guard then gets stuck trying to reach the panel. [ONE SOURCE: FAN / SHOCK-25 (same author)]

### 8.6 Door bashing
- **Xbox/PC Seoul 3 (Rybka cafe route):** door-bash one guard in the ground-floor bar, timed with thermal vision; upstairs, door-bash plus the partner's smoke grenade breaches 2-3 guards. [ONE SOURCE: RYB]
- **N-Gage/DS:** "open/bash door" is one of the 37 interaction verbs. [ONE SOURCE: NG-TXT]
- No other source describes bashing rules (noise, knockdown effect, platforms). [UNKNOWN - see 06-open-questions.md]

### 8.7 Other door types
- **Doors opened by the partner from the far side:** Training wall (boosted agent opens the door locked from the far side); Chemical Bunker Main Lab (one agent enters the control room by keypad, takes a sleeping guard and hits a red wall switch that opens the lab for his partner); Train Station ticket booth (boosted agent drops through the roof trapdoor and opens the door). [ONE SOURCE: FAN / PRIMA each]
- **One-way door (Xbox/PC Chemical Bunker):** after the throw over the cryotank, the thrown agent opens a one-way door for his partner; it stops backtracking. [CONFIRMED - several sources: PRIMA + NEO]
- **Motion-sensor automatic door (Xbox/PC Panama upper halls).** [ONE SOURCE: PRIMA]
- **Emergency doors that open only from inside (UN HQ):** the service stairs lead to the top floor but the emergency doors open only from inside, so the agents rappel to the window-washing platform. [CONFIRMED - several sources: XBDLC + PC105 game text]
- **Security doors opened from a computer (Nuclear Plant):** "Open security doors"; the security doors are blocked and a nearby computer controls them. [CONFIRMED - several sources: XBDLC + PC105]
- **UN HQ:** one computer unlocks service doors and another opens the Security Control Room entrance ("Open Security Control Room Entrance"). [CONFIRMED - several sources: game text]
- **Paired switches (PS2/GC only):** buttons on both sides of a door or elevator pressed together (Seoul Cyber-Cafe; Chemical Bunker Silo exit and Storage Room elevator; Train Station The Station elevator, twice). [ONE SOURCE: PRIMA]
- **Relay gates (PS2/GC Panama East Wing duct):** each agent opens the next gate for the other at a control box. [ONE SOURCE: PRIMA]
- **Fuse gate (PS2/GC Panama Server Room):** fetch a fuse by Hangover and slot it into a circuit box to open a gate. [ONE SOURCE: PRIMA]
- **N-Gage/DS:** electric panels (Assault) and computers (Hacker) open doors; in Corruption a Hacker computer locks the doors and starts a 6-minute extraction countdown, then later all doors unlock. [CONFIRMED - several sources: NG-TXT + FW for the strings; order ONE SOURCE: FW/SHOCK]
- **PC language bug:** one PC regional version (Polish) or its language pack can break door unlocking in Nuclear Plant. [ONE SOURCE: PCGamingWiki search snippet]

---

## 9. Interrogation

### 9.1 How it works
- **Grab a person and question him** for intel or codes; done through the grab, then an interrogate interaction. [CONFIRMED - several sources: PRIMA, FAN, 07 taxonomy]
- **Interrogation makes no game noise** (silent to the AI). [ONE SOURCE: PRIMA]
- **"Interrogate under cover":** one agent knocks out nearby guards while the other interrogates the captive. [ONE SOURCE: PRIMA]
- **Repeat questioning:** PS2/GC The Station: Agent 2 grabs Chu from behind and interrogates him **twice** (code 0315), then knocks him out. [ONE SOURCE: PRIMA]
- **Score:** interrogate Jong first for points (Seoul extraction tip). [ONE SOURCE: PRIMA / RYB summary in mission_seoul.md]

### 9.2 Solo vs joint interrogation
- **Joint interrogation exists.** Some intel comes from both agents interrogating the same person together. [CONFIRMED - several sources: game text, as summarised in 05]
  - **Train Station (Xbox/PC):** the key code 0315 is given when **both agents interrogate Chu together**. [CONFIRMED - several sources: XB477 + PC105 game text]
  - **Seoul 3 (Xbox/PC):** the fake Jong (the double) can be (dual-)interrogated by both agents together. [ONE SOURCE: game text (XB477 + PC105)]
- **Solo interrogations** (one agent) are the norm on the guide routes: Panama VP (Xbox/PC and PS2/GC), Seoul officer, PS2/GC Seoul Streets patrol, PS2/GC Rooftops double, PS2/GC Cyber-Cafe Jong, PS2/GC Station Chu. [ONE SOURCE: PRIMA each]
- Whether a joint interrogation is required or only one option, and how two agents interrogate at once, is not described. [UNKNOWN - see 06-open-questions.md]

### 9.3 Who can be interrogated and what they give

| Mission (platform) | Person | Result | Confidence |
|---|---|---|---|
| Panama (Xbox/PC) | VP de Medeiros (grabbed from behind in his office by Agent B) | Codes 3245 (office to gallery) and 3298 (private elevator); RU localisation also 9728 (archive computer) | [ONE SOURCE: FAN for codes; PRIMA for the grab; game text lists 9728] |
| Panama (PS2/GC) Archives | VP (Agent 2 grabs and interrogates) | Secondary objective "Interrogate the VP"; elevator code 3298 | [CONFIRMED - several sources: PRIMA + FAN] |
| Seoul 3 (Xbox/PC) | Jong's double (top-floor bathroom) | Reveals he is not Jong; PRIMA says this still completes "Capture Jong Pom-chu"; choke him out afterwards | [double CONFIRMED - several sources: PRIMA + RYB + FAN; objective completion ONE SOURCE: PRIMA] |
| Seoul 3 (Xbox/PC) | North Korean officer with two escorts in the back alley | Jong's new location; per PRIMA completes both the opportunity "Interrogate the North Korean officer" and the primary "Find out where Jong is"; Rybka: optional, you may just take him out | [officer + 2 guards CONFIRMED - several sources: PRIMA + RYB; dual completion ONE SOURCE: PRIMA] |
| Seoul 3 (Xbox/PC) | A soldier near an anti-aircraft vehicle; Jong himself | Listed as interrogable | [ONE SOURCE: FAN (RU); RYB confirms double, officer and Jong] |
| Seoul 3 (Xbox/PC) | (Sam Fisher interrogates a soldier in his own solo mission; heard by radio) | Jong moved to a cyber-cafe off the fish market by the river | [CONFIRMED - several sources: FAN transcript, EG, GameGrin, RYB] |
| Seoul (PS2/GC) Streets | Patrolling guard (Agent 2) | Door code 8251 | [CONFIRMED - several sources: PRIMA + FAN] |
| Seoul (PS2/GC) Rooftops | "Jong" who climbs down (a double); RU stat lists a "general" | Reveals the real Jong has fled | [ONE SOURCE: PRIMA; "general" ONE SOURCE: FAN (RU) / SHOCK-25] |
| Seoul (PS2/GC) Cyber-Cafe | Real Jong (Agent 2 grabs while Agent 1 decoys the patrol with a light switch) | Mission complete | [ONE SOURCE: PRIMA] |
| Chemical Bunker (Xbox/PC) | Unspecified (where the interrogations happen is undocumented) | 5791 (mini lab), 8416 (main-lab port) | [CONFIRMED - several sources: FAN + Steam]; location UNKNOWN - see 06-open-questions.md |
| Chemical Bunker (Xbox/PC) | Scientist in the monkey lab (heard talking to the monkey); soldier at the computer in the camera-control room (tape room) | Interrogable | [ONE SOURCE: FAN (RU)] |
| Chemical Bunker (PS2/GC) Laboratories | 2 scientists interrogated (stats) | - | [ONE SOURCE: FAN (RU)] |
| Train Station (Xbox/PC) | Chu (in the locker room; one agent takes the bodyguard, the other grabs Chu) | Key code 0315 (joint interrogation) | [CONFIRMED - several sources: game text + PRIMA + FAN] |
| Train Station (PS2/GC) The Station | Chu ("Kim Chu" in SHOCK-25's Russian chapter at 28:10) | 0315 | [CONFIRMED - several sources: PRIMA + FAN] |
| Nuclear Plant | No one can be interrogated | - | [ONE SOURCE: FAN (RU)] |
| UN HQ | Colonel Kim cannot be grabbed from behind or interrogated; the level script has a pattern `InterogateKim` whose speech line is empty/null | - | [ONE SOURCE: FAN EN Kim page + RU notes; script pattern ONE SOURCE: XBDLC/PC105] |
| N-Gage/DS | "interrogate" exists as an interaction verb; no specific use documented | - | [ONE SOURCE: NG-TXT] |

- Splinter's PC Expert video calls interrogating "the General" a bonus objective; SHOCK-25's PS2 Rooftops chapter also interrogates a general. [CONFIRMED - several sources that a general/officer interrogation exists]

---

## 10. Grab menu

The sources do not print a full grab menu. What is documented, per action and platform:

| Action | What is documented | Platform | Confidence |
|---|---|---|---|
| **Grab** | Grab a guard or civilian from behind (Panama VP and guard; Seoul officer and doubles; Train Station Chu; PS2/GC captives after a flash grenade). Grabs make no game noise. | Xbox/PC, PS2/GC | [CONFIRMED - several sources: PRIMA, FAN; noise rule ONE SOURCE: PRIMA] |
| **Carry** | Carry a grabbed or unconscious person: Panama Agent A carries the grabbed guard to the retinal-scanner room; Seoul: one agent carries the unconscious Jong down the stairs and out while the other opens doors; PS2/GC Panama Server Room: the captor walks his captive up the stairs to the scanner while the partner jams the camera | Xbox/PC, PS2/GC | [ONE SOURCE: PRIMA; Seoul carry CONFIRMED - several sources: PRIMA + RYB] |
| **Interrogate** | See §9 | Xbox/PC, PS2/GC | [CONFIRMED] |
| **Force to a device (retinal scan)** | Walk the captive to the scanner and force him to use it | Xbox/PC, PS2/GC | [CONFIRMED - several sources: XBM, PRIMA] |
| **Knock out / choke out** | After the forced scan, "choke both unconscious" (Panama); "choke him out afterwards" (Seoul double); PS2/GC Chemical Bunker: force through scanners "then choke them". Knockouts are free for score | Xbox/PC, PS2/GC | [ONE SOURCE: PRIMA; KO free CONFIRMED - several sources] |
| **Kill** | Lethal force is allowed against most enemies and costs score. Scripted kill: in Train Station the injected agent sneaks behind the vomiting infected soldier and stabs him with the knife (a required kill that cannot be done non-lethally). XBM says the knife is the Elite kill tool | Xbox/PC | [CONFIRMED - several sources: PRIMA + FAN RU for the soldier; knife CONFIRMED - several sources: PRIMA + XBM] |
| **Non-lethal press turning lethal (quirk)** | Around Chu, a non-lethal button press sometimes became a lethal kill, which failed the mission | Xbox (split-screen) | [ONE SOURCE: BK201Tach "Co op Campaign Bloopers - Split Screen" description] |
| **Push a stunned guard into another** | Pushing a stunned or knocked-out guard onto another guard (UN HQ) lowers the stealth rating; used as an alternative way to get the keypad code | Xbox/PC | [ONE SOURCE: FW-RU] |
| **Human shield** | Not documented for co-op in any source | All | [UNKNOWN - see 06-open-questions.md] |
| **Inverted neck snap (Hangover)** | The suspended agent can perform an inverted neck snap on an unaware guard below via "Grab Character" | Xbox/PC, PS2/GC | [CONFIRMED - several sources: XBM, PS2M, PRIMA] |
| **Ledge-grab pull-over** | Seoul stairwell: from a hang on the railing, pull a guard over (ledge-grab takedown); PS2/GC Storage Room: hang from a walkway edge and pull a guard over at the same moment the partner gasses the lower patrol | Xbox/PC, PS2/GC | [ONE SOURCE: PRIMA] |
| **Ungrabbable characters** | Colonel Kim (UN HQ) cannot be grabbed or interrogated. Chu (Train Station) can be interrogated but, per FAN RU, cannot be knocked out and always dies | Xbox/PC | [ONE SOURCE: FAN; Chu fate INFERRED / UNCERTAIN, see §14] |

- **Controls:** grab and its follow-ups use the normal Interaction system (Xbox A / PS2 X); exact menu layout per platform is not described. [INFERRED / UNCERTAIN] Xbox co-op default diagram: left trigger KO attack / fire secondary; right trigger lethal attack / fire primary. [ONE SOURCE: XBM p.20]
- **N-Gage/DS:** "grab" and "interrogate" are interaction verbs. [ONE SOURCE: NG-TXT]
- **Simultaneous takedowns** (no dedicated move; ordinary attacks timed together) are used on PRIMA's routes so neither guard can raise the alarm (e.g. PS2/GC Server Room: one agent grabs the rear guard while the other knocks out the leader). [ONE SOURCE: PRIMA]

---

## 11. Checkpoints and saving

### 11.1 Summary by platform

| Platform | Automatic checkpoints | Manual save | Confidence |
|---|---|---|---|
| Xbox | None | Pause menu: Quick Save, Save and Load. A mid-mission Quick Save is valid only for the current session; Retry reloads it. "Save Game" stores Story progress so the same pair can continue in another session (both consoles' saves must be identical; launching from that save auto-invites the partner) | [CONFIRMED - several sources: XB477 `InGameMenus.int` / `PreGameMenus.int` + XBM pp.27-28] |
| PC | None | Same pause menu (Quick Save, Save, Load); you must save from the Pause menu; the PC manual says the co-op save is valid for the current session; PC readme 1.02 fixed a crash when saving in co-op | [CONFIRMED - several sources: PC105 menu text + PCDVD manual + readme 1.02 + speedrun.com rules] |
| PS2/GC | None inside a sub-level | Progress saved at the end of each sub-level ("area"); no mid-mission save | [CONFIRMED - several sources: PRIMA + PS2M + Ziggity descriptions + Classic Co-op] |
| N-Gage/DS | Checkpoints (the game generally) | - | [CONFIRMED - several sources: FW + GamesRadar DS review]; co-op specifics UNKNOWN - see 06-open-questions.md, R-23 |

R-07 is CLOSED.

### 11.2 Xbox/PC save rules (from the game text)
- **Saving waits for the teammate.** [CONFIRMED - several sources: XB477 + PC105 menu strings]
- **The host can ask to save "permanently", and the partner can accept or refuse.** [CONFIRMED - several sources: XB477 + PC105]
- **A saved co-op game can only be reloaded with the same teammate.** Join fails with "you don't have the same saved game"; Xbox asks you to add the partner to your friends list. [CONFIRMED - several sources: XB477 + PC105]
- **Story continuation (Xbox Live "Create Mission"):** a Story save can be continued with the same partner (both consoles' saves must be identical; launching auto-invites the partner). [ONE SOURCE: XBM]
- **PC default keys:** F5 quick save and F8 quick load exist in the default map. [ONE SOURCE: FW controls; not confirmed for co-op]
- **How a quick load works for two players** (does it reload both, who can trigger it) is not found. [UNKNOWN - see 06-open-questions.md]

### 11.3 Earlier claims, reconciled
- **"No checkpoints" (Elder-Geek 2009, PC):** dying or botching an objective means a full restart; called realistic but punishing with a weaker partner. [ONE SOURCE: EG] The game files show manual saves exist on PC, so this refers to **automatic** checkpoints. Earlier notes tagged the conflict with XBM's session quick save as [INFERRED / UNCERTAIN] and suggested it "may differ by platform or reviewer missed it"; the gap pass resolved it. [CONFIRMED - several sources: PC105 + speedrun.com]
- **PC quick save confirmed by speedruns:** speedrun.com's Any% Co-op rules allow quicksaving and quickloading; co-op individual-level runs are filed under "Any% No QS/QL" (KuroKishi / Diligence UN HQ 6:05, Nuclear Plant 7:41, Train Station 4:52, all "No QS/QL"). A Reddit player boasts of beating co-op Panama on Elite/Expert "with NO SAVES". [CONFIRMED - several sources: speedrun.com API rules + Reddit 15s93fb + video titles]
- **Xbox:** Rybka (Xbox walkthrough) repeatedly says to save; an Xbox 2025 Panama 100% no-alarms run notes "one save used". [ONE SOURCE: RYB; ONE SOURCE: Because I Can video description]
- **GameCube (Classic Co-op 2017):** co-op has no save function inside its bite-sized missions; a failed mission restarts in full; needs both discs to reach every mission. Earlier notes flagged a CONFLICT with PRIMA's "progress saved at the end of each area"; reconciled as: saves happen only between sub-levels, never inside one. [CONFIRMED - several sources: PRIMA + PS2M + Ziggity + CCO; disc count ONE SOURCE: CCO]
- **PS2:** Jake "Ziggity" Steven says PS2 co-op has no in-mission saving and that the missions are cut into small sub-levels for that reason; he used emulator save states to record. A Reddit user calls GameCube co-op levels "extremely chopped up". [ONE SOURCE each: Ziggity descriptions; Reddit kw1j41]

### 11.4 Saving quirks
- **Seoul medkit save bug (Xbox):** saving with a medkit cabinet open destroys the kit. [ONE SOURCE: RYB]
- **Chemical Bunker cryo chamber:** players advise saving inside and expecting to die several times. [ONE SOURCE: NEO]
- **Possible progression bug (Xbox):** after finishing a later co-op mission the game reloaded the Training mission from the start instead of continuing. [ONE SOURCE: JV; INFERRED / UNCERTAIN]
- **PS3 Classic Trilogy HD** adds manual saves but has no co-op. [CONFIRMED - several sources: FW HD page + IGN wiki note]

---

## 12. What happens if one player is caught, detected or killed

- **Detected (Xbox/PC):** a guard who sees an agent becomes suspicious, then alert, and raises an alarm only once certain (running to a wall panel, or via a camera). Each alarm escalates for **both** agents (armour, helmets, fortify); it never ends the mission on its own except in UN HQ. [CONFIRMED - several sources: PRIMA, FW, XBM; see §5]
- **Detected (PS2/GC):** the third alarm fails the whole sub-level for both players. [ONE SOURCE: FW]
- **Detected (N-Gage/DS):** the third alarm aborts the mission. [CONFIRMED - several sources: NG-TXT + FW + GamesRadar] In Corruption, a scripted line says the agents have been detected and must leave the server room through the ceiling, after which all doors unlock and a new extraction point is given; whether this is scripted or triggered by detection is unknown. [CONFIRMED lines - NG-TXT + FW; trigger INFERRED / UNCERTAIN] The shared stats text includes the fail reasons "detected" and "detected too many times". [ONE SOURCE: NG-TXT]
- **UN HQ (Xbox/PC):** being seen at lit windows or tripping the metal detector fails the mission per FW-RU; a general alarm aborts. [Abort CONFIRMED; extras ONE SOURCE: FW-RU]
- **Recognised vs suspected:** a perfect score is lost only if an agent is recognised as an intruder; mere suspicion is fine. [CONFIRMED - several sources: PRIMA, XBM, PS2M]
- **Downed (Xbox/PC, PS2/GC):** the agent drops unconscious; an automatic voice line tells the partner he needs help; the partner has about 30 seconds to inject adrenaline (about half health). If the window expires, the mission fails for both. Only two revives per team on Xbox/PC. [CONFIRMED - several sources: XBM, PS2M, PRIMA, PC manual; see §2]
- **Partner health is visible on Xbox** (Teammate status); not on PS2. [ONE SOURCE each: XBM, PS2M]
- **Downed (N-Gage/DS):** the partner must find the body and use a health pack within 30 seconds. [ONE SOURCE: NG-TXT]
- **Both down:** no text beyond a game-over state that waits for the teammate. [UNKNOWN - see 06-open-questions.md, R-03 remainder]
- **Mission failure is shared:** there is no per-player failure; a mission fail ends the run for both, and without automatic checkpoints the pair reloads a manual save (Xbox/PC) or replays the sub-level (PS2/GC). Reviewers call this punishing with a weaker partner; "the team is only as good as its weakest link" (Steam). [CONFIRMED - several sources: EG, Steam, Classic Co-op]
- **Failure as a rescue story (community memory):** a partner misjudges a zip-line and drops in front of a guard; the other clears the room and revives him; then the agents' "Damn we're good" line plays. Players say most of the fun is messing up and improvising; pairs blame each other for alarms. [CONFIRMED - several sources: Reddit 1megyet, 1ouonhz, PS2 / ParagonMitchell comments, 6lzq8e; Steam]
- **Split-screen leaks information:** one critic found split-screen tiresome because the partner's screen gives information away. [ONE SOURCE: VideoGamer]
- **Missile disarm failure (Chemical Bunker):** players remember failing the disarm causes a large explosion with ragdolls everywhere. [ONE SOURCE: Reddit 1ouonhz]
- **Train Station bomb:** players report both clicking the first wire together and the bomb exploding (likely the wrong wire or a pulse change). [CONFIRMED - several sources: 6+ comments across NrooRPC9cog, xjynpfObTLs, LY9-0Dk-YHk, ge7dEnjp6MU]

---

## 13. Scoring / success rating and statistics

### 13.1 End screens (Xbox/PC and PS2/GC)
- **Objective Review:** co-op shows only "Completed" or "Failed" (solo also has "Cancelled"). [CONFIRMED - several sources: XBM + PS2M]
- **Mission Statistics:** alarms, kills, knockouts, civilians (manual wording: kills, civilians knocked out, alarms triggered, etc.) with a success score. Killing a civilian costs many points; a knockout costs nothing. [CONFIRMED - several sources: XBM + PS2M]
- **Individual scores (Xbox/PC):** team statistics are compiled into an individual percentage score per agent. FW-RU lists co-op results as two percentages ("100% / 100%"). [CONFIRMED - several sources: PRIMA + FW-RU]
- **PS2/GC:** the success score is based on both players' statistics; per-sub-mission stats; a "Mission Overview" after a whole mission (both players' results per sub-mission); a "Final Game Review" at campaign end showing both players' results in "all four missions"; a **Hall of Fame** per mission storing the best sub-mission team scores, time played and whether the team earned a **"Stealth Award"**. [ONE SOURCE: PS2M]
- **Score range:** 0-100% (solo). [ONE SOURCE: FW]
- **N-Gage/DS stats screen** counts locks picked, computers hacked and "electro hacks" (panels), bodies found, enemies startled/alerted, alarms, camera/laser/motion detections, primary/opportunity/bonus objectives, mission time and time bonus, and a total score; shared with solo, co-op applicability unknown. [ONE SOURCE: NG-TXT; co-op INFERRED / UNCERTAIN] Co-op scoring for the handheld is otherwise undocumented. [UNKNOWN - see 06-open-questions.md, R-23]

### 13.2 What a perfect score needs
- No kills or injuries (knockouts are free);
- never being recognised as an intruder (mere suspicion is fine);
- no bodies found (listed in 10 and 03; systems_rules.md's PRIMA list omits it);
- no alarms;
- all primary, secondary and opportunity objectives completed.
- [CONFIRMED - several sources: PRIMA, XBM, PS2M]
- **Knockouts are free, confirmed in practice:** FW-RU Panama record: 22 enemy KOs + 1 civilian KO (the VP) still 100% / 100%. [CONFIRMED - several sources: PRIMA + FW-RU]
- **Objective knockouts are marked separately:** hexen2k7's 100% no-KO/kill runs list knockouts tagged "(objective)" (Seoul 3: one knockout and two civilian knockouts, all marked as objectives; UN HQ: exactly one knockout marked objective, consistent with Kim being knocked out). [ONE SOURCE: hexen2k7 descriptions]
- **Scripted kills are exempt:** the infected soldier in Train Station must be killed by design, yet perfect-score runs exist (hexen2k7 100% Elite 0 kills), so that kill is evidently exempt. Suru's run labels the 10:56 beat "Killing Chu" while the two players' stats show 0 kills (one player 0 KOs, the other 2 KOs) and 100%, so whatever happens to Chu is not counted as a player kill. [INFERRED / UNCERTAIN: inference from run stats]
- **Civilian casualties** cost heavily (an automatic 0% in solo). [CONFIRMED for solo - PRIMA, FW]
- **Solo friendly fire on allies** drops the rating to zero; co-op equivalent unknown. [ONE SOURCE: FW]
- **Stealth-rating losses:** pushing a stunned guard onto another lowers the stealth rating (UN HQ). [ONE SOURCE: FW-RU]
- **Training panels:** reading the wall panels is tracked as an objective; 100% requires re-reading at least one panel; RU Fandom says skipping the read-the-panels objective lowers the rating. V339 calls the re-read an "optional objective". Killing in Training does not fail the mission but lowers the rating. [CONFIRMED - several sources: V339 + FAN; kill rule ONE SOURCE: FAN (RU)]
- [ANALYSIS] Scoring rewards non-lethal ghosting without making it mandatory, and the suspicion / recognition distinction gives a margin for error.

### 13.3 Rating caps (bugs)
- **Seoul 3 cannot be scored above 90%** (90% is effectively 100%). [CONFIRMED - several sources: Steam user Joshhhuaaa- in thread 1326718197214822685; V339 description ("physically impossible" above 90%; even a cheat-assisted perfect ghost with the boat sabotage gave 90%); Defy248 ("90 cause its max in this mission"); Lulz Productions ("90(100%)"); TrayZorXx67 title "100%-(90%)"; PleasePlayMore title "Expert 90% (Glitch?)"; soluceinfo (FR) 90%; Reddit v5jncz]
  - Reddit v5jncz (2022, PC co-op): two players knocked out only the two required targets (fake and real Jong Pom-chu), no detection, and still got 90%. Replies: knockouts tied to objectives don't count; it is a known unfixed bug; many perfect runs end at 90%, so treat 90% as the maximum. [ONE SOURCE: Reddit v5jncz; cap CONFIRMED with prior uploader evidence]
  - hexen2k7 calls it a PC-version bug that Ubisoft confirmed; one uploader calls it PC-only. ["Ubisoft confirmed" and "PC only" ONE SOURCE each]
  - Cause unknown; one researcher hypothesis is that the post-launch boat opportunity or a hidden objective cannot register. [UNKNOWN - see 06-open-questions.md, R-15; hypothesis INFERRED / UNCERTAIN]
  - Possible mechanism by analogy with solo Seoul (96% with clean stats): soldiers already in combat mode spotting the player without a visible alarm, and grenades thrown into IFV hatches counted as player-caused injuries. Not tested for co-op. [INFERRED / UNCERTAIN: Reddit dgzg9g, analogy only]
- **Chemical Bunker caps at 97%.** [CONFIRMED - several sources per the gap pass: PleasePlayMore "Expert 97% (Glitch?)", TrayZorXx67 "100%-(97%)", R3xXcoN got 97% without being detected, Reddit v5jncz reply about trouble getting 100% on Chemical Bunker] Earlier notes tagged the 97% cap [INFERRED / UNCERTAIN: two titles only]; the gap pass upgraded it.
- **Other 100% blockers:** PleasePlayMore's PC co-op series description says some missions cannot reach 100% because of glitches even when every condition is met; the community says 100% is blocked by bugs on two maps. [ONE SOURCE: PleasePlayMore; CONFIRMED - several sources for "two maps": Reddit + uploaders]

### 13.4 How runs are labelled
- Video titles combine difficulty and mode with stealth goals: "100% / Expert / Elite / Ghost" (V339), "100% Elite No KO/Kill" (hexen2k7: no kills, alarms or bodies, no KO, all 7 missions on Hard per the playlist), "100% Expert" (R3xXcoN), "Any% No QS/QL" (speedrun.com). [CONFIRMED - several sources: video titles]

---

## 14. Mission hard-fail rules per mission

**Universal (Xbox/PC and PS2/GC):** a downed agent not revived within about 30 seconds fails the mission. [CONFIRMED - several sources: XBM, PS2M, PRIMA] Alarms never fail Xbox/PC missions on their own (except UN HQ). [CONFIRMED - several sources: PRIMA, FW] Lethal force generally costs score but does not fail missions, except in the listed cases. [CONFIRMED for solo - FW + WP; co-op beyond the listed missions INFERRED / UNCERTAIN]

| Mission | Platform | Hard-fail rule | Confidence |
|---|---|---|---|
| Training Facility | Xbox/PC | None documented. Kills do not fail, only lower the rating. A failed scanner hack costs health. | [ONE SOURCE: FAN (RU)] |
| Team Training | PS2/GC | None documented; the last area reportedly needs only one player to reach the exit point | [ONE SOURCE: Ziggity description obcKEeRniRw] |
| Panama | Xbox/PC | **Killing the VP (Segundo Ruiz de Medeiros) fails the mission instantly.** | [CONFIRMED - several sources: XB477 + PC105 game text + FAN RU]; earlier tagged [ONE SOURCE: RUW] in 10 §5 and systems_rules.md, upgraded by the gap pass |
| Panama | PS2/GC | Third alarm in a sub-level fails it. The VP is the one civilian; a VP-death fail is not separately documented for Version 2. | [ONE SOURCE: FW]; VP rule on PS2/GC UNKNOWN - see 06-open-questions.md |
| Seoul 3 | Xbox/PC | **Jong must be taken alive; his death fails the mission.** **If Jong reaches an intact boat (the escape boat was not sabotaged) and flees, he escapes and the mission fails**; if the boat was sabotaged he gives up at the dock. **Killing Jong's double before interrogating him fails the mission.** A five-minute timer starts when a friendly plane is shot down (game text) with Lambert warnings at each minute; Rybka says detonating the first anti-aircraft vehicle starts a five-minute limit to destroy the second; the consequence of the timer running out is not stated. | Jong death [CONFIRMED - several sources: FW + PRIMA]; boat escape [CONFIRMED - several sources: FAN RU + RYB]; double [ONE SOURCE: FAN (RU)]; timer [CONFIRMED - several sources: RYB + game text]; timer fail consequence UNKNOWN - see 06-open-questions.md |
| Seoul | PS2/GC | Third alarm fails a sub-level. **Gardens: 4-minute timer** (destroy the anti-aircraft vehicle). No boat or truck on Version 2. | [ONE SOURCE: FW each] |
| Chemical Bunker | Xbox/PC | No explicit mission-fail rule. Wrong cryo-mixing inputs release gas that badly hurts or kills (deaths, which the revive softens). Lambert (PS2 text) says do not kill the technicians. A message fires at the Zodiac if objectives are incomplete (designer comment). | Gas [CONFIRMED - several sources: PRIMA + NEO + FAN + Steam + JV]; Zodiac message [ONE SOURCE: XB477 designer comment] |
| Chemical Bunker | PS2/GC | Third alarm fails a sub-level. Technicians must not be killed (stated by Lambert in Laboratories); whether killing one fails the sub-level is not stated. | [ONE SOURCE: FW for alarms]; technicians [CONFIRMED - several sources: PRIMA + FAN]; fail effect UNKNOWN - see 06-open-questions.md |
| Train Station | Xbox/PC | **Touching the laser strung between paired bombs detonates them (failure).** **Entering the contaminated washroom without the antidote kills the agent**; only one agent can use the antidote. **Chu must not be killed before the locker stage, or the mission fails**; after that a script allows killing or knocking him out. Bomb defusal: both cut the live wire at the same moment, then a second wire, "before a timer runs out" (the in-game email: deactivating the laser starts a countdown; both cut the hot wire before it ends). | Laser [ONE SOURCE: PRIMA; CONFIRMED - several sources: PRIMA Xbox and PS2 sections + FAN data per mission_train_station.md]; washroom [ONE SOURCE: RUW; CONFIRMED - several sources: PRIMA + FAN RU]; Chu [ONE SOURCE: XB477 designer comments]; bomb timer [CONFIRMED - several sources: player comments; email ONE SOURCE: FAN] |
| Train Station | PS2/GC | Laser between a bomb pair detonates them = mission failure; third alarm fails a sub-level; Four bomb pairs are defused despite the "three bombs" briefing. | Laser [ONE SOURCE: PRIMA]; alarms [ONE SOURCE: FW]; four pairs [CONFIRMED - several sources: PRIMA + SHOCK-25] |
| Nuclear Plant | Xbox/PC | None documented. Lethal force allowed. No timer documented. | [ONE SOURCE: FAN]; timer UNKNOWN - see 06-open-questions.md, R-19 |
| UN Headquarters | Xbox/PC | **Killing a UN guard or civilian aborts the mission at once** (five separate kill-check patterns in the script; designer comment: game over when players kill guards or civilians). **A general alarm ends it ("mission over"; designer comment: game over when one of the alarms is activated).** **Metal detector alarm = failure** (FW-RU). **Being seen in lit windows = failure** (FW-RU; meaning unclear; no game string mentions windows). **Hidden 20-minute bomb timer:** Lambert's timer lines cover 20 minutes, 10 minutes, 5 minutes and 60 seconds left (patterns `Timerbomb`, `paralleltimer`, `Countdown`, `Bombdetonation`); no number is shown on screen; when it starts is not stated. Patterns `Falling` / `Fallen` exist (probably a fall-death check). Lethal force is allowed against Colonel Kim's rogue North Koreans. | Kill and alarm aborts [CONFIRMED - several sources: XBDLC + PC105 game text + designer comments + FW + hexen2k7 briefing + Ubisoft PR]; metal detector and lit windows [ONE SOURCE: FW-RU]; timer durations [CONFIRMED - several sources: game text + FAN RU]; start point [UNKNOWN - see 06-open-questions.md, R-20]; Falling patterns [ONE SOURCE: XBDLC/PC105 script]; Kim's men [ONE SOURCE: FW] |
| N-Gage/DS (all parts) | Handheld | Three alarms abort. Partner not healed within 30 s. Session ends if a player (or the host) drops. Corruption: a 6-minute extraction countdown (an "out of time" fail reason exists, so running out probably fails). Prison Rescue / Escape: "Don't leave the colonel behind"; an "objective killed" fail reason exists, whether used here is unknown. | Alarms [CONFIRMED - several sources: NG-TXT + FW + GamesRadar]; 30 s [ONE SOURCE: NG-TXT]; 6-min timer [ONE SOURCE: FW/SHOCK; fail INFERRED / UNCERTAIN]; colonel line [CONFIRMED - several sources: NG-TXT + FW]; colonel fail [INFERRED / UNCERTAIN] |

- **Earlier wording kept:** 03 §4.1 and 10 §5 listed the Panama VP rule as [ONE SOURCE: RUW]; the gap pass confirmed it from the level scripts and game text. 10 §5 listed the chemist rule as [CONFIRMED - several sources: FW, PRIMA] (for the chemist). The gap pass confirmed both from game text and designer comments.
- **UN HQ colonel:** whether Kim must be knocked out or may be killed is not stated; given the no-lethal rule applies to UN guards and civilians, Kim appears exempt; Fandom's Kim page says "stunned", Fandom's New York City page says the agents killed him; the script has `DefeatKim` (Lambert: Kim is no longer a threat). [INFERRED / UNCERTAIN; R-20]
- **Train Station Chu fate:** PRIMA says grab and interrogate; FAN RU says he can be interrogated but cannot be knocked out and always dies; FAN's opportunity note says "kill Chu near the lockers"; Suru's 100% zero-kill run labels the beat "Killing Chu". Leaning: a scripted death after the interrogation that does not count as a player kill. [INFERRED / UNCERTAIN: R-17]
- **Optional intel guards a hard fail (Seoul 3):** the boat plan comes from an optional computer (email "Escape Contingency"); Rybka says if you read it you later get a reminder to sabotage the boat, if you skip it you get no reminder. [computer CONFIRMED - several sources: FAN + RYB; reminder behaviour ONE SOURCE: RYB] The launch-era guide does not list the boat objective; FW-RU says it was reworded in patch 1.05 (from disabling the boat to breaking its motor). [INFERRED / UNCERTAIN: may have changed after launch]
- **Extraction:** whether both agents must reach extraction is not stated in any string; the PS2/GC Team Training hint suggests only one player is needed there. Extraction is an interaction ("Extraction") inside a success volume (`ECoopSuccessVolume`, `CoopSuccessInteraction`); Seoul designer comment: dropping Jong near the truck = mission success. [UNKNOWN - see 06-open-questions.md, R-09; mechanism ONE SOURCE: XB477 common.lin]

---

## 15. Communication rules that are mechanics

### 15.1 Voice chat (Xbox Live; PC online / LAN)
- **Positional, and audible to guards** within a configurable radius (default sensitivity 50 = about 2 m in game for normal speech). Players whisper, use ambient noise as cover, or lure guards by talking. Detection can be disabled or resized in the online options. [CONFIRMED - several sources: XBM pp.22 and 26, PRIMA, GF preview, TX, Steam]
- **Options:** voice through TV speakers, voice masking, voice detection, voice detection sensitivity, Quick Match restricted to headset users / "voice-only" match option. [CONFIRMED - several sources: XBM + XB477 menu text; PC "voice-only" ONE SOURCE: PC105]
- **Xbox Communicator headset recommended.** [ONE SOURCE: XBM]
- **The mic feeds the in-game sound meter.** [CONFIRMED - several sources: Reddit mngqa0 (2 commenters), vpwdry, 1e9pwjx]
- **Always-on:** the headset is described as constant contact with your partner. [ONE SOURCE: PRIMA]
- **Partner-to-partner distance falloff** is never mentioned; the PC manual says the sensitivity setting does not change partner voice volume. [UNKNOWN - see 06-open-questions.md, R-22]
- **No whistle in co-op:** the whistle button becomes the Co-op Action button, so the voice is the only vocal lure; whistling into the headset attracts a guard without a button press. [CONFIRMED - several sources: PRIMA + XBM + Steam user; whistling ONE SOURCE: GF]
- **PS2/GC:** split-screen only, so no voice detection applies. [CONFIRMED - several sources: PRIMA + GF] PS2 USB headset supported only for online play generally. [ONE SOURCE: PS2M]
- **Today (PC):** the in-game voice option is greyed out; players use Discord; "No in-game voice without a headset on Steam; Discord recommended". [ONE SOURCE: Reddit vpwdry; Steam]
- [ANALYSIS] Turning voice into a stealth mechanic was the most-praised co-op systems idea after the moves themselves (reception counts: proximity voice praised by 3 critics; "voice heard by guards" mentioned in 4 Steam reviews).

### 15.2 Automatic voice lines ("Alternative Voice Communication", no headset)
- Switches on automatically for an agent without a headset and only works in specific situations. [CONFIRMED - several sources: XBM p.26, PRIMA]
  - When an agent initiates a co-op move or interaction, a recorded voice message tells the partner he is waiting; another plays on completion. [CONFIRMED - several sources: XBM, PRIMA]
  - When an agent's health hits zero, a message tells the partner he needs help. [ONE SOURCE: PRIMA]
  - During Hangover (suspended agent): click-and-hold the left stick + up/down sends "Up"/"Down"; release sends "Stop". [CONFIRMED - several sources: XBM p.27, PRIMA]
  - During Dual Rappelling (rappeller): click-and-hold the left stick + left/right sends "Left"/"Right"; release = "Stop". [CONFIRMED - several sources: XBM, PRIMA]
  - Crane (Xbox/PC Chemical Bunker): pick the "Crane Communication" interaction at the top of the HUD, then click-hold the left stick up/down/left/right = "Back"/"Forward"/"Left"/"Right", + left trigger = "Lower", + right trigger = "Raise", release = "Stop". [ONE SOURCE: XBM p.27] The PC manual describes partner voice directions for the crane. [ONE SOURCE: PCDVD manual]
- **HUD counterpart:** a Co-op Action icon appears when the partner is ready for a move. [CONFIRMED - several sources: XBM p.23 + PS2M]

### 15.3 Synchronisation without voice
- **Online without headsets, synchronized actions are synced automatically:** the first player selects the action and presses A, the second does the same, and the game syncs them, so exact timing is not needed (dual retinal scanner explicitly covered). PRIMA says this makes synchronized puzzles easier online without a headset. [CONFIRMED - several sources: XBM p.27, PRIMA]
- A jeuxvideo.com player said synchronising is not really possible without a microphone. [ONE SOURCE: JV]
- Players also coordinated without words: one finished the hardest difficulty with a stranger without mics by miming; another played with Korean players using jumps and visual cues. [CONFIRMED - several sources: 3 independent YouTube comments]

### 15.4 Text and other channels
- **Text chat box (Xbox HUD):** "used to communicate with Co-op partner in text format". [ONE SOURCE: XBM p.23] Not on the PS2 HUD. [ONE SOURCE: PS2M]
- **PC "Say (Coop)":** T and End keys; presumably opens the text chat box. [ONE SOURCE: FW controls; link INFERRED / UNCERTAIN]
- **Share View:** watch the partner's sticky-camera feed via "Accept View Sharing" (works at any distance); disabled in split-screen. [CONFIRMED - several sources: XBM, PS2M, PRIMA; split-screen rule ONE SOURCE: XBM]
- **Shared intel:** when one agent reads a computer, both agents' OPSATs (mission devices) update. [CONFIRMED - several sources: XB477 + PC105 training text]
- **Quick chat, pings, gestures, world markers:** none documented. [UNKNOWN - see 06-open-questions.md]
- **Partner marker:** none documented; the OPSAT map legend (Alarm, Objective, Player, Location, Triggered Alarms) has no "teammate" entry. [UNKNOWN - see 06-open-questions.md, R-11]
- **Goggle lamp colours** identify partners in the dark: blue for Agent One, red for Agent Two. [CONFIRMED - several sources: FW Agent One/Agent Two pages + xisto forum snippet + Steam "Spy Blue and Spy Red"]
- **Controller voice in the downloads:** Lambert has no voice in Nuclear Plant and UN HQ; his briefing and in-mission lines appear only as on-screen text. On PC, enabling "Use native sounds" made the info screen vanish and killed ambient and enemy voices on these two maps (the patch readme warned the maps lack the "Use native languages" option). [CONFIRMED - several sources: YouTube comments + Reddit v5jncz + Steam threads 828925849173270181 and 45350245387206844 + patch readme]
- **N-Gage/DS:** no voice chat documented; the briefing frames the roles; local Bluetooth / DS wireless only. [ONE SOURCE: NG-TXT / reviews]

---

## 16. Network / session rules that affect play

### 16.1 Connection modes

| Platform | Modes | Confidence |
|---|---|---|
| Xbox | Split-screen, System Link, Xbox Live. System Link: up to 4 consoles for Versus, max 2 for co-op, 1 player per console | [CONFIRMED - several sources: XBM p.21, PRIMA, MN, WP; System Link CONFIRMED - several sources: Team XLink wiki + WP list] |
| PC | LAN and Online only; **no native split-screen** (PC co-op menu: LAN, Online, Settings; the "SPLIT SCREEN" string and split-game menu class exist only as Xbox leftovers in shared files) | [CONFIRMED - several sources: PC105 `PreGame_PC.int` [MainMenuCoop] + PCDVD manual; R-13 CLOSED] |
| PS2 | Split-screen only (PS2 LAN/online exists for Versus only) | [CONFIRMED - several sources: PRIMA + GF] |
| GameCube | Split-screen only; no Versus at all | [ONE SOURCE: PRIMA for split-screen; no Versus CONFIRMED - several sources: GameRevolution GC + GF] |
| N-Gage | Two players over local Bluetooth; N-Gage Arena not used for co-op (only top-10 scores and replays) | [CONFIRMED - several sources: Gaming Target + multiplayer.it + Nokia release + NG-TXT] |
| DS | Local wireless; no download play, each player needs a cartridge | [CONFIRMED - several sources: NWR + Gameswelt + GameSpot DS snippet] |

- **Superseded claim:** PRIMA's connection table lists PC as "Split-screen, LAN, Online" and says split-screen is supported by all platforms. Corrected by the PC menu files and manual; Steam users also report LAN/online only (community uses Nucleus Co-op or DxWnd hacks to fake split-screen). [PRIMA ONE SOURCE, superseded]

### 16.2 Host and client
- **Host = Agent One (blue), client = Agent Two (red)** per a Steam poster, who adds the red agent has the more lethal loadout. [ONE SOURCE: Steam "SC:CT coop" 2022] The game files label the Nuclear Plant and UN HQ loadouts and Elite kits by host and client. [CONFIRMED - several sources: XBDLC + PC105 ini]
- **Host powers:** Xbox Live "Create Mission" lets the host pick mission, mode, difficulty and language (and, per the menu strings, friends-only, voice-only and friendly fire). PC Create Game (CoopCommon): name, mode, mission, difficulty, skills, language, voice-only. [ONE SOURCE: XBM; XB477 / PC105 menu strings]
- **Saving:** the host can ask to save permanently; the partner may refuse; a save reloads only with the same teammate. [CONFIRMED - several sources: XB477 + PC105]
- **Xbox Live menu:** Quick Match, OptiMatch, Create Mission, Friends, Players, Messaging, Download (new content). [ONE SOURCE: XBM]
- **N-Gage/DS:** "HOST GAME" / "JOIN GAME"; if the host quits, the session ends; each player picks Hacker or Assault ("EXPERTISE" / "CHANGE EXPERTISE") in the lobby. [ONE SOURCE: NG-TXT; roles CONFIRMED - several sources: NG-TXT + Ubisoft PR]

### 16.3 Split-screen information
- **Vertical split:** Agent One on the left, Agent Two on the right; needs two controllers. [ONE SOURCE: PRIMA] A forum user says the split orientation follows the dashboard widescreen setting. [INFERRED / UNCERTAIN]
- **Share View is disabled in split-screen** (you can see the other half). [ONE SOURCE: XBM]
- A split-screen OPSAT layout file (`opsat_split.mgb`) exists on Xbox. [ONE SOURCE: XB477]
- **Split-screen undermines stealth information:** one critic found it tiresome because the game is about seeing around corners and the partner's screen gives information away; another found it worked better than expected on GameCube. [ONE SOURCE each: VideoGamer; NWR]

### 16.4 PC frame cap, desync and stability
- **Co-op frame rate capped at about 30-35 fps "for synchronization"** on PC. [CONFIRMED - several sources: multiple Steam reviews; Reddit 1m3rm7z (35 fps cap, NV fix), 1htj7ha; 7 Steam reviews mention FPS cap / desync]
- **Desync** can ruin hour-long missions; alt-tab kicks the player; using different resolutions or a widescreen patch on one PC desyncs the session. Both players must run identical configurations (same FOV, or remove the ThirteenAG widescreen fix on both). [CONFIRMED - several sources: two Steam threads (2014 thread updated later; 2019 "[Solved]" thread 1651043958651257044) + Reddit + YouTube comments]
- **Disconnect points:** during the training hacking minigame, about 1 minute into Panama; YouTube commenters ask for a fix for Panama and Nuclear Plant disconnecting immediately on PC; a crash two or three rooms after the laser hallway in Chemical Bunker; Seoul 3 and Train Station crashing at the loading screen. [CONFIRMED - several sources for desync points: Steam threads; others ONE SOURCE each: Reddit, YouTube, Steam 208684375425833027]
- **Lag:** Pretend3r played UN HQ on Normal at 640x480 because of lag (PC, 2005-06). [ONE SOURCE: Pretend3r]
- **PC two-person inputs failing:** on PC, players could not confirm cryo-mixing or wire-cut inputs (they could scroll choices with A/D but not confirm), while the same steps worked on Xbox; a 2008 AnandTech thread (two brothers) could not work out the Train Station bomb and two-player laser grid inputs ("defuse" opens a device screen). [CONFIRMED - several sources: Steam 2149847049320991738 + 540737414190211787 + AT]
- **Patch:** base game -> 1.05 recommended; Ubisoft support (2023) advises running the 1.05 patch as admin and applying it directly from the base game; the installer can fail ("could not retrieve installation folder"). [ONE SOURCE: Ubisoft rep in Steam thread 3812910027112979074]
- **Original Xbox title update** shipped with Steel Squat (July 2005) fixed light replication between host and clients (and other Versus bugs). [CONFIRMED - several sources: WorthPlaying + VideoGamer]

### 16.5 Service status today
- **Original Xbox Live closed 15 April 2010.** [CONFIRMED - several sources: xbox-scene + WP (Whitten letter)]
- **PC online:** GameSpy-backed services died 2014; Ubisoft ended CT online in 2016 (April 2016 per PCGamingWiki + Steam guide snippets vs 7 Oct 2016 per MobyGames snippet); CT (PC) is on Ubisoft's 2022 decommission list. Steam and Microsoft store text: "online features for this game are no longer supported. Multiplayer and co-op modes are no longer functional." [CONFIRMED that official PC online co-op is dead; exact date INFERRED / UNCERTAIN]
- **PC workaround:** co-op works via the LAN menu (Coop -> LAN -> Create Game) over virtual LAN tools: Radmin VPN (most recommended), ZeroTier One (manual IP, interface metric 1), Hamachi (gateway/metric hack, unreliable), Tunngle (closed 30 Apr 2018), Evolve (closed). Both players need their own copy. A 2024 Steam user says co-op works on Steam and Ubisoft Connect, and Nucleus Co-op split-screen supports only the Steam version. [CONFIRMED - several sources: multiple Steam threads 2015-2024; 2024 claim ONE SOURCE]
- **Xbox today:** System Link tunnelling via XLink Kai (Team XLink: co-op yes, max 2); title updates must match (Xbox 360 digital copy lacks them, so 360 cannot link with One/Series); Xbox One/Series backward compatibility (10 June 2019) includes both co-op downloads (described by Microsoft as "split-screen co-op missions"), local split-screen and System Link work, no online. One commenter says UN HQ disappeared from their 360 install. Insignia lists the title (55530038) with matchmaking; co-op function unconfirmed. [CONFIRMED - several sources: Team XLink + WP + Xbox Wire 2019 + GamesHedge; Insignia ONE SOURCE]
- **PS2:** co-op is split-screen only, so remote co-op is not possible; PS2 Versus is played online via XLink Kai. [INFERRED / UNCERTAIN]
- (Platform history detail: see 01-coop-levels.md and 00-index.md.)

---

## Sources used for this file

**Files in /home/user/docs read in full or drawn from:**
- /home/user/docs/10_ai_detection_and_alarms.md
- /home/user/docs/03_coop_overview.md
- /home/user/docs/research_notes/systems_rules.md
- /home/user/docs/research_notes/gap_closing_gamefiles.md
- /home/user/docs/research_notes/gap_closing_community.md
- /home/user/docs/research_notes/coop_gadgets_controls_comms.md
- /home/user/docs/OPEN_QUESTIONS.md
- /home/user/docs/04_mission_breakdowns/training.md, panama.md, seoul.md, chemical_bunker.md, train_station.md, nuclear_plant.md, un_headquarters.md, ngage_ds_campaign.md
- /home/user/docs/research_notes/mission_training.md, mission_panama.md, mission_seoul.md, mission_chemical_bunker.md, mission_train_station.md, mission_nuclear_plant.md, mission_un_hq.md, mission_ngage_ds.md
- /home/user/docs/research_notes/platforms_versions.md
- /home/user/docs/research_notes/coop_moves.md
- /home/user/docs/05_coop_moves_catalogue.md
- /home/user/docs/06_gadgets_and_tools.md
- /home/user/docs/12_anti_patterns.md
- /home/user/docs/15_music_and_atmosphere.md
- /home/user/docs/research_notes/music_and_atmosphere.md
- /home/user/docs/research_notes/reception.md
- /home/user/docs/research_notes/dev_and_design_intent.md
- /home/user/docs/research_notes/videos.md
- /home/user/docs/07_objectives_taxonomy.md, 08_level_design_patterns.md, 09_pacing_and_flow.md, 11_wow_moments.md, 02_coverage_matrix.md (grep only)

**Primary game files (via the gap-closing notes):**
- https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601 (PC105; inner files `System/dynamic-pc.umd`, `System/SplinterCell3Settings.ini`, `System/SplinterCell3User.ini`, `Data/Videos/Credits.bik`): https://archive.org/download/tom-clancys-splinter-cell-chaos-theory_202601/Tom%20Clancys%20Splinter%20Cell%20Chaos%20Theory.rar/
- https://archive.org/details/og-xbox-dlcupdates (XBDLC): https://archive.org/download/og-xbox-dlcupdates/DLC%20and%20Title%20Update%20Downloads/Splinter%20Cell%20CT%20DLC%20Installer.rar/ ; also https://archive.org/details/Original-Xbox-Live-Updates-and-DLC and https://archive.org/details/XbDLC2
- https://archive.org/details/sc-3-xb-build-477-retail (XB477): https://archive.org/download/sc-3-xb-build-477-retail/SC3XB_Build477_Retail.zip/
- https://archive.org/details/scct_20250728 (PCDVD: manual, readme 1.02, 1.05 patch): https://archive.org/download/scct_20250728/SCCT.zip/
- N-Gage build text (NG-TXT): https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240_Files.zip/

**Manuals and guide:**
- XBM: https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory ; https://archive.org/download/xboxmanual_Splinter_Cell_3_Chaos_Theory/Splinter_Cell_3_Chaos_Theory.pdf ; https://www.docdroid.net/kYAIsM5/tom-clancys-splinter-cell-chaos-theory-manual-xbox-pdf ; https://www.manualslib.com/manual/379207/Ubisoft-Splinter-Cell-Chaos-Theory.html
- PS2M: https://archive.org/details/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA ; https://archive.org/download/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA/Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA_djvu.txt
- PRIMA: https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide ; https://archive.org/download/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide_djvu.txt

**Wikis:**
- FW / FAN: https://splintercell.fandom.com/api.php (pages Alarm, Difficulty, Cooperative, Mission Failed, Stealth, Stealth Meter, Health, Medical Kit, Adrenaline Syringe, Training Facility, Panama, Seoul 3, Chemical Bunker, Train Station, Nuclear Plant, United Nations Headquarters, Keypad lock/Codes, Kim Park-Chu, PS2/GC sub-level pages, N-Gage/DS pages); https://splintercell.fandom.com/wiki/Training_Facility ; https://splintercell.fandom.com/wiki/Panama
- FW-RU / RUW: https://splintercell.fandom.com/ru/api.php
- IGNW: https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory ; https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Training_Facility ; https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Panama_Bank ; https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Seoul

**Press, reviews and official posts:**
- MN: https://news.xbox.com/en-us/2005/08/25/splinter-cell-content/
- Ubisoft press release 24 Aug 2005: https://gamedeveloper.com/press-release/tom-clancys-splinter-cell-chaos-theory
- WorthPlaying 13 Jul 2005: https://worthplaying.com/article/2005/7/13/news/25830-splinter-cell-chaos-theory-xboxpc-steel-squat-map-available-now/
- VideoGamer 14 Jul 2005: https://www.videogamer.com/news/new-map-sneaks-up-on-chaos-theory/
- Hexus 15 Jul 2005: https://hexus.net/gaming/news/xbox/1378-splinter-cell-chaos-theory-mp-maps/
- Gamepressure 1.05 patch notes: https://www.gamepressure.com/download.asp?ID=9626
- GameSpot "New content available for Chaos Theory" (search snippets only): https://www.gamespot.com/articles/new-content-available-for-chaos-theory/1100-6131850/
- EG: http://elder-geek.com/2009/09/splinter-cell-chaos-theory-co-op-review/
- GF: https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/
- GameRevolution: https://www.gamerevolution.com/review/36141-splinter-cell-chaos-theory-review ; https://www.gamerevolution.com/?p=32392
- Classic Co-op (CCO): https://www.classicco-op.com/coop-spotlight/2017/6/21/co-op-spotlight-splinter-cell-chaos-theory
- NWR GC review: https://nintendoworldreport.com/review/4357
- GamesRadar DS review: https://www.gamesradar.com/splinter-cell-chaos-theory-2/
- Gaming Target N-Gage review: https://www.gamingtarget.com/article.php?artid=4509
- multiplayer.it: https://multiplayer.it/recensioni/splinter-cell-chaos-theory.html ; https://multiplayer.it/trucchi/tom-clancys-splinter-cell-chaos-theory-splinter-cell-3-trucchi.html
- Cheat pages: https://cheatindex.co.uk/xbox-tom-clancys-splinter-cell-chaos-theory-cheats ; https://www.chaptercheats.com/cheats/playstation2/15298/splinter-cell-chaos-theory-cheat-codes ; https://www.chaptercheats.com/cheats/xbox/15297/splinter-cell-chaos-theory-cheat-codes
- Xbox Wire 2019: https://news.xbox.com/en-us/2019/06/10/e3-2019-whats-next-xbox-backward-compatibility/
- Team XLink: https://www.teamxlink.co.uk/wiki/Tom_Clancy's_Splinter_Cell:_Chaos_Theory_(Xbox)
- Xbox-Scene DLC listing: https://www.xbox-scene.info/files/file/187-splinter-cell-chaos-theory/
- Insignia: https://insignia.live/games/55530038
- Steam store: https://store.steampowered.com/app/13570/

**Forums:**
- AT: https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/
- JV: https://www.jeuxvideo.com/forums/1-9456-997863-1-0-1-0-0.htm ; https://www.jeuxvideo.com/forums/1-9456-1043411-1-0-1-0-0.htm ; https://www.jeuxvideo.com/forums/1-9456-991848-1-0-1-0-0.htm
- NEO (search snippets only): https://www.neoseeker.com/forums/20441/t523827-co-op-chemical-bunker-level-help/ ; https://www.neoseeker.com/forums/20441/t522352-mixing-chemicals-coop/ ; https://www.neoseeker.com/forums/20441/t533767-cryogenic-chamber/ ; https://www.neoseeker.com/forums/20441/t529674-co-op-help-in-panama/ ; https://www.neoseeker.com/forums/20441/t1062716-train-station-were-stuck/ ; https://www.neoseeker.com/forums/20441/t663364-nuclear-plant-agh/
- RYB (Rybka, via mirrors): https://ceb.eyewated.com/splinter-cell-chaos-theory-co-op-walkthrough-seoul/ ; https://lt.eyewated.com/splinter-cell-chaos-theory-co-op-walkthrough-seulas/
- PCGamingWiki (search snippet only): https://www.pcgamingwiki.com/wiki/Tom_Clancy's_Splinter_Cell:_Chaos_Theory
- Steam discussions (app 13570): https://steamcommunity.com/app/13570/discussions/0/617321352205280978/ ; https://steamcommunity.com/app/13570/discussions/0/3078747189787867364/ ; https://steamcommunity.com/app/13570/discussions/0/1326718197214822685/ ; https://steamcommunity.com/app/13570/discussions/0/405692124738223900/ ; https://steamcommunity.com/app/13570/discussions/0/208684375425833027/ ; https://steamcommunity.com/app/13570/discussions/0/540737414190211787/ ; https://steamcommunity.com/app/13570/discussions/0/2149847049320991738/ ; https://steamcommunity.com/app/13570/discussions/0/1651043958651257044/ ; https://steamcommunity.com/app/13570/discussions/0/828925849173270181/ ; https://steamcommunity.com/app/13570/discussions/0/45350245387206844/ ; https://steamcommunity.com/app/13570/discussions/0/133262738417485094/ ; https://steamcommunity.com/app/13570/discussions/0/3812910027112979074/ ; https://steamcommunity.com/app/13570/discussions/0/483366528901839569/ ; https://steamcommunity.com/sharedfiles/filedetails/?id=1762258050
- speedrun.com API: https://www.speedrun.com/api/v1/games/j1n44e6p/categories ; https://www.speedrun.com/api/v1/games/j1n44e6p/levels ; https://www.speedrun.com/api/v1/runs?category=zd3xm8dn
- Reddit (via the Arctic Shift API https://arctic-shift.photon-reddit.com/api/posts/search): https://www.reddit.com/r/Splintercell/comments/v5jncz/ ; https://www.reddit.com/r/Splintercell/comments/15s93fb/ ; https://www.reddit.com/r/Splintercell/comments/1e9pwjx/ ; https://www.reddit.com/r/patientgamers/comments/mngqa0/ ; https://www.reddit.com/r/gaming/comments/vpwdry/ ; https://www.reddit.com/r/Splintercell/comments/1megyet/ ; https://www.reddit.com/r/Splintercell/comments/1ouonhz/ ; https://www.reddit.com/r/Splintercell/comments/1df5iet/ ; https://www.reddit.com/r/Splintercell/comments/1g21m8q/ ; https://www.reddit.com/r/Splintercell/comments/kw1j41/ ; https://www.reddit.com/r/Splintercell/comments/1m3rm7z/ ; https://www.reddit.com/r/Splintercell/comments/1htj7ha/ ; https://www.reddit.com/r/Splintercell/comments/1m8z5gm/ ; https://www.reddit.com/r/Splintercell/comments/dgzg9g/ ; https://www.reddit.com/r/patientgamers/comments/6lzq8e/

**Videos cited (descriptions, titles or comments only; none watched):**
- Seoul 90% cap: https://www.youtube.com/watch?v=A9qRzUt9RtE (V339) ; https://www.youtube.com/watch?v=-mf3o-FxGAQ (Defy248) ; https://www.youtube.com/watch?v=6q3P3ZQFfOk (PleasePlayMore) ; https://www.youtube.com/watch?v=puvCXAdiRxk (soluceinfo) ; https://www.youtube.com/watch?v=1-KpQGqaYd8 and https://www.youtube.com/watch?v=M3kPwc52rmI (hexen2k7)
- Chemical Bunker 97%: https://www.youtube.com/watch?v=VgD93an8rR4 (PleasePlayMore) ; https://www.youtube.com/watch?v=Z_mYQGQKh6s (TrayZorXx67)
- Clean-run stats: https://www.youtube.com/playlist?list=PL8CD4BB2EF76017B9 (hexen2k7) ; https://www.youtube.com/watch?v=-JnlamHBZrc (Suru) ; https://www.youtube.com/watch?v=2X5MvQPOQ14 (hexen2k7 Train Station) ; https://www.youtube.com/watch?v=OBU3MtaoKb4 (hexen2k7 Nuclear Plant) ; https://www.youtube.com/watch?v=5RBmv-nRtTs (hexen2k7 UN HQ) ; https://www.youtube.com/watch?v=2VRGQUT2JvQ (V339 Training) ; https://www.youtube.com/watch?v=_YLK0cjSekE (Because I Can, Xbox Panama)
- Speedruns and glitches: https://www.youtube.com/watch?v=B8z_7lUW6XI ; https://www.youtube.com/watch?v=iD_AeCbzvJI ; https://www.youtube.com/watch?v=qcI5CBbQ2vE ; https://www.youtube.com/watch?v=hQliVhgIWSg ; https://www.youtube.com/watch?v=yEjHJb-SpjQ ; https://www.youtube.com/watch?v=gOn-T6LlNHk
- Difficulty perception comments: https://www.youtube.com/watch?v=tg8sn2ZC2CY ; https://www.youtube.com/watch?v=jry663Tx5bg ; playlist PLpMZ4IkRJgZVibktTy6OM4aeZbjRVSmvK (https://www.youtube.com/playlist?list=PLpMZ4IkRJgZVibktTy6OM4aeZbjRVSmvK)
- Bomb procedure comments: https://www.youtube.com/watch?v=8FiRUvq86sg ; https://www.youtube.com/watch?v=LY9-0Dk-YHk ; https://www.youtube.com/watch?v=ge7dEnjp6MU ; https://www.youtube.com/watch?v=NrooRPC9cog ; https://www.youtube.com/watch?v=xjynpfObTLs
- PS2/GC saving and training: https://www.youtube.com/watch?v=obcKEeRniRw (Ziggity) ; https://www.youtube.com/watch?v=gm9uYnMw9KA (ysuck63)
- Chu control quirk: https://www.youtube.com/watch?v=BdwhJtGy7a8 (BK201Tach)
- Split-screen / partner perspectives and Xbox: https://www.youtube.com/watch?v=KCOcnYpCD0s (Lawerenceofalevi)
