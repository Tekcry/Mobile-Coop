# 06 - Open questions

Everything about the Splinter Cell: Chaos Theory (2005) 2-player co-op mode that the research could not settle: the 23 logged research gaps (R-01 to R-23) with their status, every other conflict, [UNCERTAIN] and [GAP] item found anywhere in /home/user/docs, the assumptions logged during the run, and a checklist of what to check in the game or on video, ordered by value for building a CT recreation.

**Platform labels.** Version 1 = Xbox / PC (Training Facility, Panama, Seoul, Chemical Bunker, Train Station, plus the downloads Nuclear Plant and UN Headquarters). Version 2 = PS2 / GameCube (Team Training, Seoul, Chemical Bunker, Train Station, Panama, split into 4-5 sub-levels each). N-Gage / DS = the separate Gameloft campaign (Rooftops, Breakdown, Corruption, Prison Rescue, Escape).

**Status words** (from OPEN_QUESTIONS.md):
- **CLOSED:** answered, mainly from primary game files (see `research_notes/gap_closing_gamefiles.md`).
- **UPGRADED:** part-answered.
- **OPEN:** still needs a human to check videos or a physical copy.

**Confidence tags.** [CONFIRMED - several sources: ...], [ONE SOURCE: ...], [INFERRED / UNCERTAIN: ...], [UNKNOWN], [ANALYSIS] (the researchers' interpretation, not a fact about the game). Source codes are kept exactly (legend in 00-index.md). Game-file codes: **PC105** (installed PC copy at patch 1.05), **XB477** (Xbox build 477 dev-kit dump, 21-22 Feb 2005), **XBDLC** (Xbox Live download packages), **PCDVD** (PC retail DVD: manual dated 16/02/05, readme v1.02, embedded 1.05 patch readme). Note: "GF" means the GamesFirst 2005 preview in `coop_gadgets_controls_comms.md` but the primary game files in `02_coverage_matrix.md`; this file names the game files by the codes above and uses "GamesFirst" for the preview.

**None of the videos cited below were watched by the researchers.** They were catalogued from titles, descriptions, chapters and comments; YouTube transcripts could not be downloaded.

---

## 1. Research gaps R-01 to R-23

### Status at a glance

| ID | Short question | Status |
|---|---|---|
| R-01 | PC order of the two downloads (and PC briefing) | CLOSED |
| R-02 | EEV (remote hack / scan device) usable in co-op? | OPEN |
| R-03 | Adrenaline count and both-down rule | CLOSED for Xbox/PC (PS2/GC count and both-down still open) |
| R-04 | Did Share Equipment ship? | CLOSED |
| R-05 | PS2/GC Team Training layout and move order | UPGRADED |
| R-06 | How the AI treats two intruders | OPEN |
| R-07 | Checkpoints per platform | CLOSED |
| R-08 | Friendly fire | UPGRADED (CLOSED for Xbox, partly for PC) |
| R-09 | Must both agents reach extraction? | OPEN |
| R-10 | Does difficulty change guard perception? | OPEN |
| R-11 | Map and partner marker | UPGRADED |
| R-12 | Co-op designers | CLOSED |
| R-13 | PC split-screen | CLOSED |
| R-14 | Panama briefing framing | CLOSED for Xbox/PC (PS2/GC unchecked) |
| R-15 | Seoul 90% rating cap | UPGRADED |
| R-16 | Chemical Bunker serum | UPGRADED |
| R-17 | Train Station informant (Chu) and codes | UPGRADED |
| R-18 | PS2/GC Train Station grenade type | OPEN |
| R-19 | Nuclear Plant route | UPGRADED |
| R-20 | UN HQ route | UPGRADED |
| R-21 | Co-op music | CLOSED for missions (menu music open) |
| R-22 | Does partner voice fade with in-game distance? | OPEN |
| R-23 | N-Gage/DS co-op details | OPEN |

Remaining after the gap-closing pass (02_coverage_matrix.md): **open** R-02, R-06, R-09, R-10, R-18, R-22, R-23; **partly answered** R-05, R-08, R-11, R-15, R-16, R-17, R-19, R-20.

---

### R-01 - PC order of the two downloads (Version 1, PC)

- **Original question.** As logged: "PC order of the two downloads". Full scope from the research: on PC, are Nuclear Plant and UN Headquarters played in a different order from Xbox (Nuclear Plant 6th, UN HQ 7th), and was the PC briefing text rewritten for the swapped order?
- **Status: CLOSED.**
- **What is now known.**
  - The PC 1.05 readme (embedded in the patch exe on PCDVD) lists the two new co-op levels as **UN Headquarters then Nuclear Plant**, selectable only in **Mission mode** from the Create Game screen, not in Story mode, and without the "use native languages" sound option [ONE SOURCE: PCDVD patch readme]. Both are Mission-mode only, so players choose the order (OPEN_QUESTIONS.md).
  - The PC briefing and objective text are **byte-for-byte the same as Xbox** (Nuclear Plant opens with the Grand Central aftermath; UN HQ follows from the Jin Soo lead). So the PC briefing was **not** rewritten [CONFIRMED - several sources: XBDLC vs PC105 diff].
  - Internal numbering: Nuclear Plant is map 05 / mission 55 / map identity 201; UN HQ is map 07 / identity 202; base co-op maps are 00-04, identities 100-105. Both download briefings point to the Panama briefing voice cue `Play_BRF_51_000_01Lam` (looks like a placeholder) [ONE SOURCE: PC105/XBDLC].
  - PC players and listings: UN HQ is listed / played before Nuclear Plant, which is last [CONFIRMED - several sources: Fandom ("final in PC version"; UN "sixth in PC version"), speedrun.com level list (UN before Nuclear) and its Any% Co-op rules (missions in order, timing ends at the Nuclear Plant evac doors), DeepVelocityOps PC chapter order (UN 4:07:54, Nuclear 5:33:56), R3xXcoN PC uploads (UN "Mission 5", Nuclear "Mission 6"), RednBlue2k9 (German PC, 2009: Nuclear Plant the second of the two patch-1.05 bonus missions), TheEasyNICK / PAYKOOBRAZNIY (Russian PC, 2013: Nuclear Plant "finally the last co-op mission")].
  - Video orderings differ: Nuclear Plant before UN HQ in hexen2k7, Urban Reflex, Agt_ Pendergast, 3dCossack, BoSstonPL ("Mission 5" = Nuclear Plant); UN HQ before Nuclear Plant in R3xXcoN GAMING, DeepVelocityOps and CouchiesTV chapters [CONFIRMED that orderings differ: videos.md]. hexen2k7's description shows the Nuclear Plant briefing follows straight on from Grand Central and the UN HQ briefing turns on a Jin Soo transmission, supporting story order Train Station > Nuclear Plant > UN HQ [ONE SOURCE: hexen2k7 description].
- **Conflicting sources (now resolved).**
  - FW (English) says the two swap order on PC (UN HQ 6th, Nuclear Plant last); the Russian Fandom wiki calls UN HQ the 7th mission "on Xbox and PC" [INFERRED / UNCERTAIN in platforms_versions.md: "order" may just be list order]. Resolved by the readme: Mission mode only, list order UN HQ then Nuclear Plant.
  - RednBlue2k9 (German PC LP) description said the trail to the plant came from finding that the UN HQ warheads matched those Kim used in New York, implying a rewritten PC briefing [ONE SOURCE: uploader paraphrase]. dat_carlin (Russian PC LP, part 6) said the Nuclear Plant briefing sent them after a bomb they had already dealt with in UN HQ, so it was **not** rewritten [ONE SOURCE: uploader description]. **Corrected by** the PC105 vs XBDLC byte-identical text: not rewritten.
- **What remains to check.** Nothing for the order. Optional: confirm in a PC 1.05 copy that the Create Game list shows UN HQ above Nuclear Plant. Videos: dat_carlin https://www.youtube.com/watch?v=H-AXCQQ8sCs ; RednBlue2k9 part 1 https://www.youtube.com/watch?v=Ti5rTnmVL3E .
- **Related open items** (platforms_versions.md, mission_nuclear_plant.md): PC "Elite unlock" requirement for the downloads is not stated in PC patch notes [UNKNOWN]; the Xbox Elite gate is confirmed only by Major Nelson [ONE SOURCE: MN]; whether the Steam / Ubisoft Connect build ships pre-patched to 1.05 (and so includes the downloads) is not confirmed [UNKNOWN]; the exact Xbox Live release day per region and whether a later fix was issued for the "not on level select" reports [UNKNOWN].

### R-02 - Is the EEV (remote hack / scan device) usable in co-op? (Version 1)

- **Original question.** "Is the remote hack/scan device usable in co-op?" In the research: PRIMA says the EEV cannot be used in co-op, so no remote hacking from range, but the Xbox manual's co-op controller diagram still labels a button "EEV". Which is true?
- **Status: OPEN.**
- **What is now known.**
  - The co-op controls bind it: PC `SplinterCell3User.ini` binds key **4** to EEV mode; the shared Xbox controller layout labels a button "camera / EEV" (right stick click per XBM p.20). The engine has EEV actions for scan, distance hack, remote access and laser designation [ONE SOURCE: PC105, XB477].
  - No co-op map, loadout or menu string enables or disables EEV specifically, and no co-op objective or note mentions it [INFERRED / UNCERTAIN: absence in game files].
  - CT replaced binoculars with the EEV for solo / co-op; binoculars exist only in the Versus spies kit [CONFIRMED - several sources: FW Binoculars page, XBM versus controls].
- **Conflicting sources.** PRIMA: "EEV cannot be used" in co-op [ONE SOURCE: PRIMA; music_and_atmosphere.md also repeats "CT also adds EEV, which co-op agents cannot use" from Prima's co-op exceptions]. XBM co-op controller diagram: "EEV" labelled on right-stick click [ONE SOURCE: XBM p.20]. PC105 ini: key 4 = EEV [ONE SOURCE].
- **What to check.** In any Xbox or PC co-op mission, click the right stick (Xbox) / press 4 (PC) and see whether the EEV view opens and whether it can scan or hack at range. Any full Xbox/PC co-op video showing a player in EEV view would settle it; candidates: DeepVelocityOps full campaign https://www.youtube.com/watch?v=4GtVpbf1xAw , V339 Panama ghost https://www.youtube.com/watch?v=KlU0002suD4 [ANALYSIS: suggested, not known to show it].

### R-03 - Adrenaline count and the both-down rule

- **Original question.** "Adrenaline count and the both-down rule": how many revives does each agent / team get per mission on each platform, and what happens if both agents are down at once?
- **Status: CLOSED for Xbox/PC.** Still open: the PS2/GC count, and what happens if both agents are down at once.
- **What is now known.**
  - Co-op Training pop-up (both builds): one agent can heal a downed partner by interacting; **each agent carries one adrenaline boost, so the revive can only be done twice per mission**; you heal your partner, if you have a syringe, by standing over him and interacting [CONFIRMED - several sources: XB477 + PC105 `P_00_Training_COOP.int`; matches both manuals' "twice per game"].
  - Equipment entry "Adrenalin Syringe" (internal REVIVESYRINGE), an experimental adrenaline boost injected into an incapacitated person's torso; HUD interaction "Heal Teammate"; PC default key Insert = revive [CONFIRMED - several sources: Equipments.int / HUD.int both builds; PC ini].
  - About **30 seconds** to reach a downed partner or the mission fails [CONFIRMED - several sources: XBM, PS2M, PRIMA, PCDVD manual p.13]. Revive restores about half health (PRIMA) / 50% (RUW) [CONFIRMED - several sources].
  - Both down at once: no string found; the menu has a game-over state that waits for the teammate, nothing more [ONE SOURCE: game text]. Implied failure because nobody remains to revive within 30 s [INFERRED / UNCERTAIN].
  - Fall damage downs rather than kills (Chemical Bunker shaft-drop exploit: jump down the lift shaft onto / near the partner, then revive) [ONE SOURCE: RUW].
- **Conflicting sources.**
  - PRIMA's basics / co-op intro: each agent carries **two** adrenaline shots [ONE SOURCE: PRIMA]. PRIMA's own Xbox/PC gear boxes and RUW tables give **1 per agent per mission** [CONFIRMED - several sources]. **Corrected by** the in-game training text: one each on Xbox/PC; PRIMA's "two each" is wrong for Xbox/PC.
  - Per-mission notes that repeated the conflict before the correction: mission_training.md ("PRIMA two each vs RU Fandom 1 per agent for Xbox Training [CONFLICT - UNCERTAIN]"), mission_panama.md ("CONFLICT on adrenaline count - FAN says 1, PRIMA says 2 (general)"), mission_train_station.md ("Prima general: 2; Fandom RU: 1"), mission_seoul.md (Prima "each agent carries two").
  - PS2/GC: FW sub-level tables give **2 per agent per sub-level** (e.g. Team Training, Panama Alley, Train Station all parts) [ONE SOURCE: FW; Panama Alley loadout CONFIRMED - FAN + PRIMA gear panel (SC-20K + launcher, sticky camera x1, flash x1, adrenaline x2)]. No PS2/GC game data was available to check.
- **What to check.** (a) PS2/GC: count syringes in the inventory at the start of a sub-level and test whether a third revive is possible. Videos: Jake "Ziggity" Steven PS2 series, e.g. Seoul https://www.youtube.com/watch?v=__LRg8KrYQ8 , Chemical Bunker https://www.youtube.com/watch?v=qLQEHSaRECM . (b) Both down: in any build, let both agents reach zero health within 30 s and record what happens (immediate fail, wait screen, timer).

### R-04 - Did Share Equipment ship?

- **Original question.** "Did Share Equipment ship?" The Fandom Training Facility page labels a "Share Equipment" text as cut content (deleted data), while both manuals and Prima describe it as a feature.
- **Status: CLOSED. Yes.**
- **What is now known.** HUD interaction "Share Equip." exists; training pop-ups explain it (only items marked with a dot can be shared) [CONFIRMED - several sources: both builds + PC manual]. The Training map has an e-mail (dated 06/23/07, "Dan" to "Seb") explaining Share Equipment, and a designer comment in French says that note is not used for now and exists only so it gets translated [ONE SOURCE: XB477 training `.lin` + `00_Training_COOP.int`]. So only the tutorial note was unused.
- **Conflicting sources (resolved).** FW / FAN: deleted data, date 23 June 2007 taken from the PS3 version's game files, not on-screen text [ONE SOURCE: FAN; "UNCERTAIN whether ever shown in-game"]. XBM, PS2M, PRIMA: shipped feature [CONFIRMED]. coop_moves.md had "[VERIFIED as feature; UNCERTAIN why FW calls it cut]" - answered by the designer comment.
- **What to check.** Nothing essential. Optional: confirm the request can be cancelled before acceptance (PS2M only).

### R-05 - PS2/GC Team Training layout and move order (Version 2)

- **Original question.** "PS2/GC Team Training layout and move order": station order, which moves are taught, layout, enemies (the "1 neutralised"), whether a jammer exists, and briefing text (mission_training.md Gaps).
- **Status: UPGRADED.**
- **What is now known.**
  - Team Training sits outside the four-mission PS2 campaign: the PS2 Co-op menu has "Training" (a special mission that teaches the basics of co-op) separate from "Campaign"; the end review covers "all four missions" [CONFIRMED - several sources: PS2M + FAN + PRIMA (PS2 campaign starts at Seoul)]. SHOCK-25 titles it "Mission 0: Training"; Ziggity's PS2 series numbers it "01 - Team Training" [CONFIRMED - FAN + Ziggity title].
  - One primary objective: get to the end of the level by working together; no secondary / opportunity objectives; no end-of-level stats screen [ONE SOURCE: FAN / FAN (RU)].
  - Known contents: 1 computer "Disable Laser Grid" (recorded as an objective on PS2/GC, not as a security-system hack); 2 retinal scanners hacked; 1 enemy or dummy neutralised [ONE SOURCE: FAN (RU)]. [INFERRED / UNCERTAIN] A shorter course sharing the laser-grid computer and dual retinal scanner beats with Xbox.
  - Community fragments [ONE SOURCE each unless noted]:
    - The level uses a North Korean soldier as the target / dummy enemy (Jake "Ziggity" Steven, description of https://www.youtube.com/watch?v=obcKEeRniRw).
    - The last area needs only one player to reach the exit point (same).
    - A partner "threw him at the enemy" (a throw used as an attack) and the human-ladder re-press: the boosted agent must press the co-op button again after landing so the partner can climb him (comments on https://www.youtube.com/watch?v=gy1Vt3pxX8U).
    - GameCube first wall: back to the wall, press the co-op input (Z + D-pad left); the partner faces you, crouches and presses the same [CONFIRMED - several sources: 2 commenters on https://www.youtube.com/watch?v=gm9uYnMw9KA].
  - Equipment per FAN (EN and RU tables identical): SC-20K 60, SC Pistol 40, flash grenade 1, adrenaline syringe 2, both agents. No jammer listed [ONE SOURCE: FAN; INFERRED / UNCERTAIN: the tables may list only weapons and consumables].
  - Length: PS2 videos run 4:20-7:16 (WalkthroughCinema 4:20, xxxPS2xxx 4:21, SHOCK-25 5:36, Ziggity 7:16). speedrun.com lists a Team Training (Co-op) WR of about 1:27 [CONFIRMED - multiple listings; speedrun time from a search snippet only].
- **Conflicting sources.**
  - A GameCube-era commenter claims the PS2 version has only training videos, not a training level; contradicted by two PS2 uploads of Team Training [claim REJECTED in gap_closing_community.md].
  - PS2/GC saving: PRIMA says progress is saved at the end of each area; classicco-op.com says GC has no save during missions and a failed mission restarts in full [CONFLICT in mission_training.md]. Resolved: saves only between sub-levels, no mid-mission save (R-07).
  - Whether Short Scale, Tomoe Nage, Hangover, jammer or rappel stations exist here is unconfirmed; JV posters on GameCube asked how to do the Short Scale at all, so the move exists on GC, but not necessarily in training [UNKNOWN].
- **What to check / watch.** Watch a PS2/GC Team Training video end to end and list the stations in order, the moves at each, the jammer, the enemy, and whether one player alone can finish the last area:
  - Jake "Ziggity" Steven, PS2 US, 7:16: https://www.youtube.com/watch?v=obcKEeRniRw
  - SHOCK-25, PS2 (PCSX2), 5:36: https://www.youtube.com/watch?v=MmH3o7WF4wg
  - WalkthroughCinema, PS2, 4:20: https://www.youtube.com/watch?v=gy1Vt3pxX8U
  - xxxPS2xxx "Coop Trening", 4:21: https://www.youtube.com/watch?v=m5lUF8rdW4Q
  - Củ Cà Rốt Co-op Team PS2 split-screen Training, 10:00: https://www.youtube.com/watch?v=RXNrz5N-qZE
  - ysuck63 "Co-op Training" (GameCube per comments; platform not stated by uploader), 3:10: https://www.youtube.com/watch?v=gm9uYnMw9KA
  - Playbottl "Training IL - 1:28 (WR)", platform unknown (may be the PS2 level): https://www.youtube.com/watch?v=PP_1bFZ7sU4
- OPEN_QUESTIONS.md: R-05 is purely historical and has no bearing on the new game.

### R-06 - How the AI treats two intruders (all console versions)

- **Original question.** "How the AI treats two intruders (shared knowledge, separate searches)": does the AI treat the two agents as one threat or two, does it share information about them, and do searches split?
- **Status: OPEN.** No source found.
- **What is now known.**
  - General CT AI applies to co-op levels by default: bodies raise alarms only if a guard or active camera actually sees them; guards notice open doors, shot lights, cut fabric; KO'd guards can be revived by other guards (kick + revive); guards enter alert on their own but only ring an alarm once certain [CONFIRMED - several sources: FW, WP, PRIMA].
  - One reviewer reports guards tripping over each other and alerting others while the agents were hidden, a glitch that made detection feel unearned [ONE SOURCE: EG]. WorthPlaying: AI omniscience about gunfire affects co-op too [ONE SOURCE: WorthPlaying Xbox/PC].
  - Simultaneous takedowns are hard: if one agent acts early, the other guard reacts [ONE SOURCE: Reddit 1df5iet].
  - Globe and Mail found co-op easier than solo because two spies can attack guard pairs at once [ONE SOURCE].
  - Scientists spotting hidden players in the Chemical Bunker lab [ONE SOURCE: jeuxvideo.com summary].
- **Conflicting sources.** None; only absence.
- **What to check.** In any Xbox/PC mission: (1) let a guard see Agent One only, then check whether he or other guards move toward Agent Two's hiding place; (2) let both be glimpsed in different rooms and watch whether two separate searches start; (3) check whether a guard who heard Agent One searches Agent One's last noise point only. Full campaign video for observation: https://www.youtube.com/watch?v=4GtVpbf1xAw ; critique video with Good/Bad/Ugly chapters: https://www.youtube.com/watch?v=KCOcnYpCD0s .

### R-07 - Checkpoints and saving per platform

- **Original question.** "Checkpoints per platform": does co-op have checkpoints or mid-mission saves on each platform?
- **Status: CLOSED.**
- **What is now known.**
  - **Xbox/PC:** no automatic checkpoints; manual **Quick Save / Save / Load** from the pause menu. Saving waits for the teammate; the host can ask to save "permanently" and the partner can accept or refuse; a co-op save reloads only with the same teammate (join fails with "you don't have the same saved game"; Xbox asks you to add the partner to your friends list) [CONFIRMED - several sources: `InGameMenus.int` / `PreGameMenus.int` both builds]. PC readme 1.02 fixed a crash when saving in co-op; you must save from the Pause menu; PC manual: co-op save is valid for the current session [CONFIRMED for PC]. PC quick save and quick load in co-op confirmed by speedrun.com Any% Co-op rules (allowed) and IL categories "Any% No QS/QL" (KuroKishi / Diligence UN HQ 6:05 and Nuclear Plant 7:41 "No QS/QL"), and a Reddit boast of beating co-op Panama on Elite / Expert "with NO SAVES" [CONFIRMED - several sources: speedrun.com API, Reddit 15s93fb, video titles].
  - **Xbox (manual):** "Save Game" stores Story progress so the same pair can continue in another session (both consoles' saves must match; launching from that save auto-invites the partner); "Quick Save" exists mid-mission but only for the current session; Retry restarts from it [ONE SOURCE: XBM pp.27-28].
  - **PS2/GC:** progress saved at the end of each sub-level; unlocked areas replayable in any order; no mid-mission save [CONFIRMED - several sources: PRIMA + PS2M + Jake Ziggity descriptions (he used emulator save states to record) + GameCube reviewer]. A Reddit user calls GameCube co-op levels "extremely chopped up" [ONE SOURCE: Reddit kw1j41].
- **Conflicting sources (resolved).**
  - Elder-Geek (PC, 2009): no checkpoints; dying or botching an objective means a full restart [ONE SOURCE: EG]. Rybka (Xbox walkthrough) repeatedly says to save [ONE SOURCE]. Reconciled: EG means no **automatic** checkpoints [CONFIRMED - game files; earlier tagged UNCERTAIN reconciliation in gap_closing_community.md].
  - classicco-op.com: GameCube co-op has no saving, a whole mission in one go, and needs both discs [ONE SOURCE]; PRIMA: saves per area. Resolved as "saves only between sub-levels" (PS2/GC). Disc count stays [INFERRED / UNCERTAIN].
- **Still open (sub-items).** How a quick load works for two players (does it reload both, who can trigger it) [UNKNOWN - gap_closing_community.md]. A possible progression bug: after a later Xbox mission the game reportedly reloaded Training instead of continuing [ONE SOURCE: JV; INFERRED / UNCERTAIN]. Rybka's "med-kit save bug" in Seoul [ONE SOURCE: Rybka; unchecked].
- **What to check.** On Xbox or PC: one player triggers Quick Load mid-mission; record whether both players reload and whether the partner must accept.

### R-08 - Friendly fire

- **Original question.** "Friendly fire": does a friendly-fire option exist, what is its default, and can agents hurt each other?
- **Status: UPGRADED** (CLOSED for Xbox, partly for PC).
- **What is now known.**
  - **Xbox:** match-creation options include a "FRIENDLY FIRE" setting next to mode, difficulty, language, friends-only and voice-only [ONE SOURCE: XB477 `PreGameMenus.int` [OPTIONSTITLE]; the string is also present in PC105's copy].
  - **PC:** the PC co-op menu file (`PreGame_PC.int`, section CoopCommon) lists name, mode, mission, difficulty, skills, language, voice-only - no friendly fire. PC `SplinterCell3Settings.ini` sets `b_friendlyFire=true` in the game-info section. So on PC friendly fire appears always on with no menu toggle [ONE SOURCE each; PC conclusion INFERRED / UNCERTAIN until checked in game].
  - Engine: the level info stores friendly fire, mission mode (Story / Mission / internally "SILENT" = Elite) and difficulty together [ONE SOURCE: XB477 `common.lin`].
  - Solo CT: friendly fire on allies drops the rating to zero [ONE SOURCE: FW main / Mission Failed pages]; co-op equivalent unknown.
- **Conflicting / earlier sources.** Before the game files: an IGN wiki Xbox glitch tip has one agent hit the other with a sticky shocker and notes "friendly fire must be on", implying a host option; FW Panama trivia describes the same shock-your-partner invisibility bug [INFERRED / UNCERTAIN in systems_rules.md: setting implied but not documented in XBM / PS2M / PRIMA]. 10_ai_detection_and_alarms.md Gaps still lists "Whether a friendly-fire option exists (implied by an IGN tip and a wiki bug note)" - superseded by XB477.
  - The UN HQ speedrun glitch: one player fakes lock-picking a door while the partner tasers him, which leaves the model stuck and the player practically invisible ("becoming a ghost") [CONFIRMED - several sources: YouTube comments on B8z_7lUW6XI, yEjHJb-SpjQ, gOn-T6LlNHk]. This needs friendly fire to work on PC.
- **What to check.** On PC 1.05: shoot or shock the partner and see whether he takes damage; look for any friendly-fire toggle in Settings. On Xbox: check the Create Mission screen for the option and its default. Speedrun video showing the taser glitch: https://www.youtube.com/watch?v=B8z_7lUW6XI .

### R-09 - Must both agents reach extraction?

- **Original question.** "Must both agents reach extraction?" (systems_rules.md: "Whether both agents must physically reach extraction: no explicit rule found").
- **Status: OPEN.**
- **What is now known.**
  - Extraction places are concrete [CONFIRMED - several sources: game text both builds]: Panama - back to the truck in the exterior courtyard; Seoul - take Jong to the truck outside the cyber cafe (designer comment: dropping Jong near the truck = mission success); Chemical Bunker - the Zodiac at the end of the missile-boat dock (designer comment: a message fires at the Zodiac if objectives are incomplete); Train Station - no extraction, it ends by jumping onto the roof of the passing subway car; Nuclear Plant - out of the Radiochemistry Lab's side door; UN HQ - mission completes after the bomb is defused (no extraction objective).
  - Mechanism: HUD "Extraction" interaction (also in the Nuclear Plant text); co-op code has `ECoopSuccessVolume` and `CoopSuccessInteraction` [ONE SOURCE: XB477 `common.lin`]. [INFERRED / UNCERTAIN] Extraction is triggered by an interaction inside a zone.
  - No string says both agents must be present [INFERRED / UNCERTAIN].
  - Only indirect hint: the PS2 uploader says the last area of Team Training needs only one player to reach the exit point; whether that is general or a training exception is unknown [ONE SOURCE: https://www.youtube.com/watch?v=obcKEeRniRw].
- **Conflicting sources.** None.
- **What to check.** In a mission with a real extraction zone (e.g. Panama), leave one agent far away and have the other use "Extraction" at the courtyard truck; record whether the mission ends, whether the prompt appears only when both are in the volume, and any message. Videos showing the end of missions: V339 Panama ghost https://www.youtube.com/watch?v=KlU0002suD4 ; Suru Train Station (extraction at 13:30) https://www.youtube.com/watch?v=-JnlamHBZrc ; hexen2k7 Chemical Bunker 2/2 https://www.youtube.com/watch?v=ILxhYQ1BHc0 ; PleasePlayMore Nuclear Plant https://www.youtube.com/watch?v=phfqPfdFZdQ ; V339 Seoul https://www.youtube.com/watch?v=A9qRzUt9RtE .

### R-10 - Does difficulty change guard perception?

- **Original question.** "Does difficulty change guard perception?" (Normal / Hard / Expert; also Elite).
- **Status: OPEN.**
- **What is now known.**
  - Names: Normal / Hard / Expert (internally Easy / Normal / Hard); modes Story, Mission, Elite (internally "SILENT") [CONFIRMED - several sources: both builds]. No game text on what difficulty changes [ONE SOURCE: gap_closing_gamefiles.md].
  - Known effects of harder settings: damage taken rises; Expert makes hacking harder; medkits restore full on Normal, 50% on Hard, less on Expert; on Expert wall mines can only be disarmed on a green light [CONFIRMED - several sources: FW, PRIMA]. Co-op-specific scaling: the Chemical Bunker mixing sequence grows from 3 to 4 to 5 colour steps per agent [ONE SOURCE: FW].
- **Conflicting sources.**
  - Steam posters: one says difficulty only scales damage dealt / received and has no effect on how easily guards spot you; another says some noises guards ignore on Normal are heard on Expert [ONE SOURCE each: Steam].
  - A YouTube co-op run calls Expert "highly sensitive, high damage AI" [ONE SOURCE].
  - FW Difficulty trivia says harder settings generally raise awareness [ONE SOURCE: FW].
  - Community comments: enemies spot you much more easily on Expert ("enemy can easily see you", so they shoot out lights); on Elite guards come to investigate at the slightest noise and fire at once, unlike Expert [INFERRED / UNCERTAIN: YouTube comments on https://www.youtube.com/watch?v=tg8sn2ZC2CY and https://www.youtube.com/watch?v=jry663Tx5bg]. Not a controlled comparison.
- **What to check.** Same room, same light-meter level, same distance, Normal vs Expert: measure how long a guard takes to notice, and whether a fixed noise (e.g. a run on metal at a set distance) is heard on one and not the other. V339's Training video description links Normal, Expert and Elite playlists for side-by-side viewing: https://www.youtube.com/watch?v=2VRGQUT2JvQ .

### R-11 - Map and partner marker

- **Original question.** "Map and partner marker": does the co-op HUD or OPSAT show where the partner is (marker, waypoint, map dot), and is there a map at all in co-op?
- **Status: UPGRADED.**
- **What is now known.**
  - Every co-op map, including both download maps, has an OPSAT map texture (`map_training`, `map_panama`, `map_seoul3`, `map_chemicalbunker`, `map_gcs`, `map_NuclearPlant`, `map_UNhq`) referenced as MapIcon / briefing MapImage in its `.ini`; the download packages ship `Magma/Data/Textures/Maps/map_*.dds` (256x128) and `load_map_*.dds` [CONFIRMED - several sources: XB477 + XBDLC + PC105 ini].
  - OPSAT menu (shared by solo and co-op): Goals, Notes, Data, Map, Equipment; map legend: Alarm, Objective, Player, Location, Triggered Alarms; no separate "teammate" legend entry [ONE SOURCE: `InGameMenus.int`].
  - Training pop-up: when one agent gets information from a computer, both agents' OPSATs are updated [CONFIRMED - several sources: both builds].
  - A split-screen OPSAT layout file `opsat_split.mgb` exists on Xbox [ONE SOURCE].
  - Verdict: co-op has an OPSAT with a map page; the 256x128 textures look like small briefing / loading images, so whether there is a navigable floor plan, and whether the partner is marked, is still not shown [INFERRED / UNCERTAIN]. The "no map" reviewer claim is at least partly wrong.
  - No on-screen partner marker or waypoint is described in any manual or Prima [absence ONE SOURCE each]. Pings / gestures / world markers: none documented.
  - Community: no new source; memory is about voice and verbal coordination ("yelling at each other when someone got spotted") [ONE SOURCE: gap_closing_community.md].
- **Conflicting sources.**
  - Eurogamer (PC, Kristan Reed, 8 Apr 2005): much time spent wandering and hunting for each other "with no map" [ONE SOURCE]. Game files: a map page exists [CONFIRMED]. Partly resolved.
  - PS2M says the OPSAT map is displayed "in Solo mode", implying no map in co-op on PS2 [ONE SOURCE: PS2M; INFERRED / UNCERTAIN].
  - FW OPSAT page: CT's OPSAT 3D map shows allies (generic, not co-op) [ONE SOURCE: FW] - may or may not apply to the partner in co-op.
- **What to check.** Open the OPSAT Map page in an Xbox/PC co-op mission (Back button on Xbox): is it a navigable floor plan or a static image; does "Player" show one dot or two; does the partner appear anywhere on screen. Then repeat on PS2 (does the Map page exist in co-op at all). Then check the split-screen OPSAT layout. Videos: full campaign https://www.youtube.com/watch?v=4GtVpbf1xAw ; any PS2 split-screen video, e.g. https://www.youtube.com/watch?v=lFHlkLTsKQI .

### R-12 - Co-op designers

- **Original question.** "Co-op designers": who designed the co-op mode (lead designer, level designers, producer)?
- **Status: CLOSED** [ONE SOURCE: PC105 `Data/Videos/Credits.bik`, read from frames at roughly 9-20 s and 36-45 s].
- **What is now known.** Section "Single Player & Coop Mode Development Team (Montreal)" (names as on screen; (?) = partly blurred):
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
  - Overall: producer Mathieu Ferland; creative director Clint Hocking; music by Amon Tobin; cinematics by Jesper Kyd. Versus was a separate team (Ubisoft Annecy).
  - `Credits.int` in XB477 and PC105 is an unused, half-empty template; ignore it.
- **Conflicting / earlier sources.** dev_and_design_intent.md: "No named co-op lead designer, co-op level designers or co-op producer in any source I reached" (MobyGames blocked; Prima names only co-op testers; the PS2 manual has no staff credits; the Xbox manual scan has no credits pages) - superseded. music_and_atmosphere.md: MobyGames search snippets list Xbox Lead Sound Designer Fabien Noel and "Coop Lead Sound Designer" Alexandre Carlotti; PC: Isabelle Ballet (lead sound designer), Jeremi Valiquette (sound studio director); PS2: Brian Youds, Amaury La Burthe sound collaboration; IMDb snippet: Keith Arem sound recordist / voice director [INFERRED / UNCERTAIN: search summaries only]. Carlotti is now confirmed by the credits video; the others remain search-snippet only.
- **Still open.** DLC authorship: the Nuclear Plant script pattern names are Italian words (`Magazzino`, `PompaShow`, `bimbo`, `ciccio`, `nondirmelo`), suggesting an Italian (likely Ubisoft Milan) team made at least that map; the PC credits video does not list the DLC team [INFERRED / UNCERTAIN: inference from identifiers]. Ubisoft Milan was a co-developer or support studio for CT [CONFIRMED that Milan was involved; what it did INFERRED / UNCERTAIN]. Which studio made the PS2/GC co-op maps [INFERRED / UNCERTAIN; Prima acknowledgements name "Co-Op PS2 Testers" in the Montreal team].

### R-13 - PC split-screen

- **Original question.** "PC split-screen": did the PC version have native split-screen co-op?
- **Status: CLOSED. No.**
- **What is now known.** PC co-op menu: LAN, Online, Settings (`PreGame_PC.int` [MainMenuCoop]); the PC manual's co-op main menu lists the same three. The "SPLIT SCREEN" title string and a split-game menu class exist only as Xbox leftovers in shared files [CONFIRMED - several sources: PC105 + PCDVD manual].
- **Conflicting sources (resolved).** PRIMA's connection table lists PC as "Split-screen, LAN, Online" and says split-screen is supported by all platforms [ONE SOURCE: PRIMA]. Steam users (2015 thread 483366528901839569, co-op.gg listing) say LAN / online only; community uses Nucleus Co-op or DxWnd hacks; the Steam store system requirements mention "joystick for Solo and Co-op modes" [platforms_versions.md: UNCERTAIN, leaning no]. Corrected by the game files.
- **What to check.** Nothing.

### R-14 - Panama briefing framing

- **Original question.** "Panama briefing framing": what is the Panama co-op premise (canal-inspection bribery vs immigration bribes), and does it differ between builds?
- **Status: CLOSED for Xbox/PC.** PS2/GC framing unchecked.
- **What is now known (Xbox/PC, both builds).** VP Senor Segundo Ruiz de Medeiros has been taking bribes to let ships bypass spot inspections through the Canal Zone. Objectives: access the archives (East Wing, top floor); the data there is partly deleted, so access the server backups past the Exposition Room on the ground floor; exfiltrate to the truck. Bonus: recover info about other uninspected ships. Do not kill the VP (instant failure) [CONFIRMED - several sources: XB477 + PC105].
- **Conflicting sources.** PS2/GC per PRIMA (paraphrase): de Medeiros is VP of Panama's immigration offices and takes bribes to let illegal immigrants cross the border; the team must get into his administration building, open his archives, find hard evidence, and learn whether he acts alone or on another party's orders [ONE SOURCE: PRIMA]. The PS2 Lambert line on Fandom just says to get into the archives and retrieve the info [ONE SOURCE: FAN]. Whether the PS2 in-game text matches PRIMA [INFERRED / UNCERTAIN].
- **What to check.** Read the PS2 Panama briefing on screen. Video: Jake "Ziggity" Steven PS2 Panama https://www.youtube.com/watch?v=2FmkMk4rHQw .
- Related: EG notes that co-op missions include dialogue with Sam Fisher in parallel missions; whether that happens in Panama is not confirmed [INFERRED / UNCERTAIN: mission_panama.md].

### R-15 - Seoul 90% rating cap (Version 1)

- **Original question.** "Seoul 90% rating cap": why can Seoul ("Seoul 3") not be scored above 90%?
- **Status: UPGRADED.** The cap is confirmed; the cause is unknown.
- **What is now known.**
  - Cap: Seoul 3 cannot be completed above 90%; 90% is effectively 100% [CONFIRMED - several sources: Steam user Joshhhuaaa- quoted in Steam thread 1326718197214822685; V339 description ("physically impossible" above 90%; even a cheat-assisted perfect ghost with the boat sabotage gave 90%); Defy248 description ("90 cause its max in this mission"); Lulz Productions ("90(100%)"); TrayZorXx67 title "100%-(90%)"; PleasePlayMore title "Expert 90% (Glitch?)"; soluceinfo (FR) 90%].
  - A 2022 Reddit thread (PC co-op): two players knocked out only the two required targets (fake and real Jong Pom-chu), no detection, and still got 90%. Replies: knockouts tied to objectives don't count; a known unfixed bug; treat 90% as the maximum [ONE SOURCE: Reddit v5jncz].
  - Chemical Bunker caps at **97%** (R3xXcoN got 97% undetected; PleasePlayMore "Expert 97% (Glitch?)"; TrayZorXx67 "100%-(97%)"; Reddit v5jncz reply) [CONFIRMED in OPEN_QUESTIONS.md and chemical_bunker.md D; earlier tagged INFERRED / UNCERTAIN "titles only" in mission_chemical_bunker.md].
  - PleasePlayMore's PC co-op series description says some missions cannot reach 100% because of glitches even when every condition is met [ONE SOURCE].
- **Conflicting sources / hypotheses.**
  - hexen2k7 calls it a PC-version bug that Ubisoft confirmed [ONE SOURCE: "Ubisoft confirmed" and "PC only" are single source]. Whether Xbox caps too is [UNKNOWN].
  - Researcher hypothesis (unverified): the post-launch boat opportunity (Jong's escape boat; ru Fandom says the objective was reworded in patch v1.05) or a hidden objective cannot register [ANALYSIS].
  - Solo analogy only: solo players report 96% on solo Seoul with clean stats and blame (a) soldiers already in combat mode spotting the player without a visible alarm and (b) grenades thrown into IFV hatches being counted as player-caused injuries; not tested for co-op [INFERRED / UNCERTAIN: Reddit dgzg9g].
- **What to check.** On Xbox (not PC), play Seoul to a full ghost with all objectives (including the boat sabotage) and read the score. On PC, test whether skipping the boat objective changes the score. Videos: V339 https://www.youtube.com/watch?v=A9qRzUt9RtE ; Defy248 https://www.youtube.com/watch?v=-mf3o-FxGAQ ; PleasePlayMore https://www.youtube.com/watch?v=6q3P3ZQFfOk ; soluceinfo https://www.youtube.com/watch?v=puvCXAdiRxk ; Chemical Bunker 97%: https://www.youtube.com/watch?v=VgD93an8rR4 , https://www.youtube.com/watch?v=Z_mYQGQKh6s , R3xXcoN https://www.youtube.com/watch?v=FmSiWt_hVG4 + https://www.youtube.com/watch?v=mqyj-66XLMo .

### R-16 - Chemical Bunker serum (Version 1)

- **Original question.** "Chemical Bunker serum": how many serum vials are taken, and how is the random blood type communicated?
- **Status: UPGRADED.** Blood-type communication is answered; the vial count is not.
- **What is now known.**
  - Steps: go down a missile silo; recover the anti-viral protocol from the main lab; get the right chimpanzee blood serum; make the anti-virus in the cryogenic chamber; take a virus sample from a missile warhead (code 1961); exfiltrate to the Zodiac. Optional: monkey-autopsy videotape [CONFIRMED - several sources: both builds].
  - The protocol note names Component One as blood serum type **A, B or O**; three alternative notes exist, so the type is chosen per playthrough and read from the protocol [CONFIRMED - several sources: both builds].
  - Mixing requires two people at the same time, each following a per-user colour sequence (colours blue, red, violet, green, yellow, aqua; user A green/red/violet, user B blue/yellow/aqua; 3 / 4 / 5 inputs on Normal / Hard / Expert) [CONFIRMED - game text; per-user split and counts ONE SOURCE: Fandom en/ru notes; randomness CONFIRMED by a Neoseeker poster who thought the colours "may change every game"].
  - Monkey blood fridge code 1423; mini-lab door 5791 (interrogation); main-lab security port 8416 (interrogation); warhead casing 1961 [CONFIRMED - several sources: Fandom + Steam "SCCT Co-op door codes" thread].
  - Removing toxin from the warhead requires cutting two hot wires simultaneously; a crane can be operated (PC manual describes partner voice commands; "Crane is back!" e-mail) [CONFIRMED - game text; crane ONE SOURCE: manual + e-mail].
- **Conflicting sources (vial count).** Neoseeker: take all three. Steam 2014: one per player. ru Fandom: one type per agent, and wrong picks block the chamber. Prima: only "consult notes and collect the needed sample". Game files: no count given; one sample each of anti-virus and virus is implied [INFERRED / UNCERTAIN]. Also listed in chemical_bunker.md row 11 as "vial count conflict R-16".
- **Other open Chemical Bunker items** (mission_chemical_bunker.md Gaps): alternatives to Prima's route, exact guard counts, and where the interrogations for 5791 / 8416 happen on Xbox/PC; whether a solo player can bypass the sync actions on Xbox/PC (ru Fandom claims a solo player can operate both cryo stations); why players got stuck at "The Docks" (Neoseeker thread title only); the remaining Neoseeker thread t534995 "Coop help needed please" was not read; no developer commentary. Shortcut / exploit claims: drop-on-partner revive skipping the elevator (ru Fandom) and NickyTheGamer's "a BIG shortcut" early [INFERRED / UNCERTAIN].
- **What to check.** In the Mini Lab fridge: how many vials can be picked up, whether each agent needs one, and what happens with a wrong type. Videos: hexen2k7 Chemical Bunker 1/2 https://www.youtube.com/watch?v=chb66dBOt74 and 2/2 https://www.youtube.com/watch?v=ILxhYQ1BHc0 ; Spyker2041 first-time run (auto chapters mention an elevator puzzle, laser grid, cryo access, retinal scanner and a "warhead room and crane puzzle") https://www.youtube.com/watch?v=49TgQ2npG1Y ; ShepherdMods PC 4K https://www.youtube.com/watch?v=hHg-nYqfLzA .

### R-17 - Train Station informant (Chu) and codes (Version 1)

- **Original question.** "Train Station informant and codes": is 9201 the locker number or the code (Prima says the anti-virus is in locker 9201 but the code is 0315), and what happens to Chu (interrogated, knocked out, killed)?
- **Status: UPGRADED.**
- **What is now known.**
  - **9201 is the LOCKER NUMBER** (told to Chu on the phone by an unnamed caller); **0315 is the KEY CODE** (Chu's son's birth date, given when both agents interrogate him together). Both earlier sources were right [CONFIRMED - several sources: both builds].
  - Chu must not be killed early (mission fails); after the locker stage a script allows killing or knocking him out [ONE SOURCE: XB477 designer comments].
  - No text shows him dying after interrogation [ONE SOURCE: game files].
  - Suru's 100% run: the two players' stat blocks show 0 kills (one player 0 KOs, the other 2 KOs) and a 100% rating, while the timestamp list labels the 10:56 beat "Killing Chu". So whatever happens to Chu is not counted as a player kill [ONE SOURCE: Suru description, https://www.youtube.com/watch?v=-JnlamHBZrc]. Leaning "Chu dies, scripted" [INFERRED / UNCERTAIN].
- **Conflicting sources (fate).** Prima: grab and interrogate only. Fandom RU: Chu can be interrogated but cannot be knocked out and **always dies**. Fandom's opportunity note: "kill Chu near the lockers". Suru: "Killing Chu". Designer comments: kill or KO allowed after the locker stage. BK201Tach: the "follow Chu to the locker" opportunity looked impossible (letting him open the locker ended the mission; stopping him earlier did not count) [ONE SOURCE], and a non-lethal button press sometimes became a lethal kill, which failed the mission [ONE SOURCE: BK201Tach bloopers description, https://www.youtube.com/watch?v=BdwhJtGy7a8].
- **Other open Train Station items** (mission_train_station.md Gaps): Prima's Xbox/PC map legend is unreadable in OCR; which side of the Metro Station train the second agent takes (OCR garbled, probably the right); whether the "recover schematics" opportunity exists in the build Prima covered (absent from its objective box; present in Fandom and hexen2k7's 2008 run); exact content of the Chu-Kim call (no transcript page); whether objectives 4-6 appear only after the call; whether killing Chu affects rating; Agent One's Xbox/PC gear in Prima (OCR lost); alternative routes using the Fandom-listed locks (Bomb 1, Bomb 3, Warehouse 5-pin); civilians: none documented; no on-screen mission timer documented [INFERRED / UNCERTAIN].
- **What to check.** Play the locker stage: interrogate Chu, then try to knock him out, kill him, or leave him; record what the game does and the score. Videos: Suru https://www.youtube.com/watch?v=-JnlamHBZrc (10:56); Train Station (README list) https://www.youtube.com/watch?v=2X5MvQPOQ14 ; R3xXcoN https://www.youtube.com/watch?v=SXHCqjqi_Tc + https://www.youtube.com/watch?v=kRDWrH-zamE ; TrayZorXx67 https://www.youtube.com/watch?v=_UclJhv8ZUs .
- OPEN_QUESTIONS.md: R-17's fate question is historical; D-22 and D-25 (recorded elsewhere) come from it.

### R-18 - PS2/GC Train Station grenade type (Version 2)

- **Original question.** "PS2/GC Train Station grenade type (frag vs flash)": does the shared PS2/GC Train Station kit carry a frag or a flash grenade?
- **Status: OPEN.** No new data.
- **What is now known.** Fandom (EN/RU) PS2/GC Train Station kit, same in all four parts: SC-20K 60, sticky camera 2, SC pistol 40, **frag grenade 1**, adrenaline syringe 2, both agents; wall mines picked up in level: Repair Station +4, Hydro Tunnel +1, Subway +1 [ONE SOURCE: Fandom, echoing SHOCK-25]. Agent 1 also uses an explosive charge on the iron gate (not in Fandom's table) [ONE SOURCE: Prima; matched by SHOCK-25's stat line].
- **Conflicting sources.** Prima's PS2 gear box (OCR) shows launcher attachment, **flash grenade**, adrenaline [ONE SOURCE: PRIMA] vs Fandom's frag grenade [ONE SOURCE: FW]. coop_gadgets_controls_comms.md lists "Train Station (all 4 areas): sticky cam 2 + frag 1 each" and "Frag grenade ... both agents on PS2/GC Train Station [VERIFIED - RUW + PRIMA + FW]" - that VERIFIED tag predates the noted Prima conflict.
- **What to check.** Open the inventory at the start of any PS2/GC Train Station sub-level. Videos: Jake "Ziggity" Steven PS2 Train Station https://www.youtube.com/watch?v=ge7dEnjp6MU ; Củ Cà Rốt PS2 split-screen https://www.youtube.com/watch?v=1FYUWwle97Q .
- OPEN_QUESTIONS.md: R-18 is purely historical.

### R-19 - Nuclear Plant route (Version 1 download)

- **Original question.** "Nuclear Plant route": the full route (insertion point, room order, where the blueprints computer is, how the retinal scanners are passed, how the laser corridor is crossed, what happens on the footbridge, extraction approach), which co-op moves are used outside the turbine hall, guards / patrols / cameras / lighting / noise masking, whether a timer or forced-fail condition exists, and the PC briefing text (mission_nuclear_plant.md and nuclear_plant.md Gaps).
- **Status: UPGRADED.**
- **What is now known** [CONFIRMED - several sources: identical text in XBDLC `05_NuclearPlant.int` / `P_05_NuclearPlant.int` and PC105 unless noted]:
  - Briefing: right after Grand Central, analysis of the defused bombs points to the Yongbyon nuclear plant in North Korea (believed to be a cover for military research); the three double-laser detonators came from there. Task: learn how many detonators Kim got and who helped him.
  - Objectives in file order: gather the Yongbyon complex blueprints (so Lambert can guide you); discover if Kim can attack again (Kim used 3 bombs in New York); find out who helped Kim; exfiltrate to the primary extraction point, out of the Radiochemistry Laboratory's side door.
  - Notes: Central Archives in the Main Control Room; Main Control Room near the turbine area; a security camera covers the stairs in the turbine area; the Main Control Room door is locked by a retinal scanner; the Radiochemistry Laboratory is linked to the power plant by an external footbridge; lasers protect the corridor to the footbridge; the Lab's Server Room is locked by a retinal scanner.
  - Lambert's route lines: no blueprints at start - get inside and find the main control room; once blueprints are taken, go to the turbine zone; the security doors are blocked and a nearby computer controls them; the turbine is overhead - reach the stairs on the far side, then cross the turbine room toward the control room; the elevator cannot be called from there - find another way up; he scolds players who linger with radioactive material; the Lab's server can be reached from a **ceiling trap-door**; after learning the helper is Jin Soo (a CGIB officer), leave by the Lab's side door.
  - Computer actions: open the central archives' server; Yongbyon blueprints; stop ventilation fans; open security doors. Interaction label: Extraction. Fandom data order: (1) blueprints image; (2) "Open security doors"; (3) "Stop ventilation fans"; (4) "Open central archives server"; (5) Wen Bae-Su e-mail; (6) Jin Soo e-mail [ONE SOURCE: Fandom data].
  - Intel e-mails: the lab director (Wen Bae-su) delivered **four** double-laser detonators to Colonel Kim Pak-tu; Jin Soo of the CGIB asked Wen to send Kim as many as possible for a test mission. Lambert: Kim still has one bomb and will attack again.
  - Designer triggers: messages at the security doors (before opening), on the stairs to the turbine room, on the footbridge outside the Lab, and at the archives (completes `OBJ_55_P_20`) [ONE SOURCE: XBDLC `.lin`].
  - Four alarm stages; stage four is full alert with fortified positions [CONFIRMED - both builds].
  - Loadouts (map `.ini`): host: launcher, 2 pistol clips, 1 sticky camera, 1 sticky shocker; client: launcher, 2 pistol clips, 2 flash, 2 smoke; no spare SC-20K magazines. The `AmmoClip*` keys count spare magazines; the loaded magazine is extra, so this matches the wiki's rifle 30 / pistol 60. Elite: host 1 sticky shocker + 1 ring airfoil; client 1 ring airfoil + 2 flash [CONFIRMED - XBDLC + PC105].
  - Turbine hall (best-documented beat): one agent throws the other (Tomoe Nage) across to the far balcony; the thrown agent goes to where the fans have been switched off, jumps into the fan inlet and uses rappelling to bring the partner up; another reply: climb the ladder, turn off the fan, return to the gap at the other end [ONE SOURCE: Neoseeker thread "The nuclear plant!!!! AGH!!!" (March 2006), search snippets only; fan-off mechanic CONFIRMED - Fandom data + Neoseeker].
  - Lambert is text-only (no voice) [CONFIRMED - several sources].
  - Players call it the hardest and longest co-op mission (dat_carlin: confusing layout, many sub-objectives, could not finish it stealthily; GhostLetsPlays: probably one of the longest) [ONE SOURCE each; known ~23 min ghost / 30-120 min casual].
- **Conflicting / uncertain sources.**
  - PC briefing: see R-01 (RednBlue2k9 vs dat_carlin; resolved: not rewritten).
  - Speedruns use an invisibility glitch (fake lock-pick + partner taser), so they are poor evidence for the intended route [CONFIRMED - several sources: YouTube comments on B8z_7lUW6XI, yEjHJb-SpjQ, gOn-T6LlNHk].
  - Auto-generated YouTube chapters (Spyker2041 2012 blind playthrough, 1:18:45): navigating the facility -> encountering guards -> ventilation and infiltration -> hacking and exploration -> co-op traversal challenges -> securing the upper levels -> navigating laser grids -> stealth takedowns and lift -> "incubator room" infiltration -> final extraction attempts [INFERRED / UNCERTAIN: machine-generated].
  - RednBlue2k9 German LP part titles: "the one taser" (early; fits Agent One's single sticky shocker), climbing (part 3), "well-lit ventilation shafts... again" (part 4), "Fackelmann" (a flame / torch-carrying enemy, part 9), "a completely new challenge" (part 10), "the last hurdle" (part 14), ending "with a bang and smoke" (part 15) [INFERRED / UNCERTAIN: jokey titles].
  - Turbine stairs: "likely jam-and-pass" [INFERRED / UNCERTAIN]. Implied structure: infiltration -> turbine hall puzzle -> retinal-locked control room (intel 1) -> laser corridor + footbridge -> lab server room (intel 2) -> side-door exfil [INFERRED / UNCERTAIN]. Whether objectives are revealed in stages [INFERRED / UNCERTAIN]. Low objective density and long traversal as a factor in stuck points [INFERRED / UNCERTAIN: 09].
  - Launch problems (Xbox): Major Nelson added that there "may be some issues"; GameSpot reported claims the content was unplayable because the maps did not appear on the level-select screen and a Ubisoft moderator was looking into it [CONFIRMED - Xbox.com edit + GameSpot snippet]; whether those reports were simply the Elite gate [INFERRED / UNCERTAIN]; whether / how it was fixed [UNKNOWN].
  - PC crash point / disconnects: YouTube commenters ask for a fix for Panama and Nuclear Plant disconnecting immediately on PC [ONE SOURCE].
- **Still open.** How the scanner doors are passed (dragging a guard, the "security doors" terminal, or a dual synchronized scan; Prima's general rules mention doors "locked by a pair of retinal scanners" needing two guards forced to scan at once, but not tied to this mission); the laser corridor and footbridge; co-op moves outside the turbine hall; guard counts, patrols, camera count, lighting; whether machinery noise masks footsteps; timer or forced-fail; civilians / scientists [UNKNOWN]. No Fandom transcript page; Neoseeker full text 403; "What is the fan for?!" thread title only.
- **What to watch.** hexen2k7 Nuclear Plant https://www.youtube.com/watch?v=OBU3MtaoKb4 (and parts https://www.youtube.com/watch?v=rVg3fr3OrPA , https://www.youtube.com/watch?v=jry663Tx5bg ); PleasePlayMore single-file 1080p https://www.youtube.com/watch?v=phfqPfdFZdQ ; Spyker2041 blind first play https://www.youtube.com/watch?v=xFO_ntoDVBY ; R3xXcoN 1/3-3/3 https://www.youtube.com/watch?v=tg8sn2ZC2CY , https://www.youtube.com/watch?v=mODHEazeQr8 , https://www.youtube.com/watch?v=YpVZb_5lGq8 ; RednBlue2k9 part 1/15 https://www.youtube.com/watch?v=Ti5rTnmVL3E and 15/15 https://www.youtube.com/watch?v=N3QdeyXEufQ . Note for each scanner door how it was opened and where co-op moves are used.

### R-20 - UN Headquarters route (Version 1 download)

- **Original question.** "UN HQ route": the roof entry method; where the data is; how the 22nd floor is approached; how the colonel is neutralised; the transfer to the second building; how the metal detector is handled; the bomb mechanic; co-op moves used; guard and civilian behaviour; the meaning of the "lit windows" rule; when the hidden timer starts (un_headquarters.md and mission_un_hq.md Gaps).
- **Status: UPGRADED.**
- **What is now known** [CONFIRMED - several sources: identical text in XBDLC `07_UNhq.int` + `P_07_UNhq.int` and PC105 unless noted]:
  - Briefing: Third Echelon intercepted an encrypted message between Jin Soo and the UN HQ in Manhattan; infiltrate; international territory, so lethal force is not allowed and Lambert aborts on a general alarm.
  - Rules: lethal force on UN guards and civilians not allowed; mission aborted on a general alarm; emergency doors open only from the inside. Killing a guard or civilian triggers an immediate abort (five separate kill-check patterns); a general alarm gives "mission over". Designer comments: game over when players kill guards or civilians, and when one of the alarms is activated.
  - Roof entry: Lambert's opening line says to rappel down to the **window-washing platform** and get into the building. The service stairs lead to the top floor but the emergency doors only open from inside. Patterns `Falling` / `Fallen` exist (probably a fall-death check) [patterns ONE SOURCE]. Roof-door start: the speedrunner says the run begins with him going to the door on the roof and (pretending to) pick its lock [CONFIRMED - FAN rooftop-lock entry + speedrunner's YouTube reply on B8z_7lUW6XI].
  - Route clues: the Security Control Room is on the **22nd floor**, on the other side of the floor - follow the main corridor; cameras turn out to be **OFF** on arrival (Kim got there first; finding blood tells Lambert this, and he orders the agents to stop him whatever it takes); use the elevator; a computer action unlocks service doors and another opens the Security Control Room entrance; a computer can disable a metal detector; a service elevator reaches the ground floor.
  - Objectives in file order: infiltrate the building; reach the Security Control Room; stop Colonel Kim (he has taken the Security Control Room); recover the encrypted data sent by Jin Soo; defuse the bomb before it blows.
  - Bomb: in the General Assembly Hall ventilation system, on top of the General Assembly Hall in the second building. "Bombing Plan" file and a Jin Soo e-mail: it must go off during tonight's assembly (the UN Secretary speaks on Korean peace). Lambert, in the ventilation room: that's half the job, now reach the other side of the room - the passage is back downstairs.
  - Timer: Lambert's lines at 20 minutes, 10 minutes, 5 minutes and 60 seconds left; patterns `Timerbomb`, `paralleltimer`, `Countdown`, `Bombdetonation`. The 20-minute warning is the first, so the hidden timer is 20 minutes [CONFIRMED for durations]. No number on screen.
  - Loadouts: both agents get 3 sticky cameras, 3 sticky shockers, 3 ring airfoils, 3 flash, 3 smoke, launcher, no spare magazines (pistol or SC-20K); weapons still carry their loaded magazine (wiki: rifle 30, pistol 20). Elite: host 1 shocker + 1 airfoil; client 1 airfoil + 2 flash [CONFIRMED - XBDLC + PC105 ini].
  - Lambert is text-only (no voice) [CONFIRMED - several sources].
- **Conflicting / uncertain sources.**
  - **Lit windows:** Fandom RU: being detected in windows where the light is on fails the mission (beside the metal-detector rule and the hidden 20-minute timer note) [ONE SOURCE: FAN RU]. No game string mentions windows or lights in UN HQ [game files]. Meaning unclear: spotted from outside through windows, or in lit window areas [INFERRED / UNCERTAIN]. A fuzzy Reddit memory describes a co-op mission where you "shimmy down the side of a building" and a guard in a room you pass investigates a light going out; the commenter mixes up missions [INFERRED / UNCERTAIN: Reddit 1m8z5gm]. [ANALYSIS] An exterior descent past lit office windows is a plausible reading, not confirmed.
  - **Metal detector:** Fandom RU lists metal-detector alarm as a fail [ONE SOURCE]; game text has a computer that disables a metal detector [CONFIRMED]. How it is handled in practice [UNKNOWN].
  - **Kim's fate:** Fandom's Kim page says he is "stunned"; Fandom's New York City page says the agents killed him; hexen2k7's 100% no-kill run lists exactly one knock-out marked "(objective)" [INFERRED / UNCERTAIN]. Game patterns `InterogateKim` (empty speech line) and `DefeatKim` ("Kim is no longer a threat"); no text says whether Kim must be knocked out or may be killed; given the no-lethal rule names UN guards and civilians, Kim appears exempt [INFERRED / UNCERTAIN].
  - **Defusal:** not in the UN HQ text; the HUD has a generic Defuse interaction; the co-op Train Station e-mail describes the series' two-man method (both agents cut the active wire at the same time, twice; the active wire changes over time). A Czech viewer on the final UN HQ part says "those little wires" made him tear his hair out [ONE SOURCE: YouTube comment, GhostLetsPlays part 4, https://www.youtube.com/watch?v=iYKmSOodngw]. Which wire, how many, whether timed [UNKNOWN].
  - **Timer start:** the bomb is announced only in the same objectives pattern as "Stop Colonel Kim" / "Defuse" [INFERRED / UNCERTAIN]. systems_rules.md: "hidden 20-minute timer plus on-screen bomb countdown objective" [ONE SOURCE: FW objective text]; topic files say no on-screen count.
  - **Cameras "off":** a later state after Kim's takeover or after the agents' hack - unclear in mission_un_hq.md [INFERRED / UNCERTAIN]; game text says off on arrival because Kim got there first.
  - **Objective reveal:** each objective's text reveals the next location [INFERRED / UNCERTAIN; GameSpot snippet supports the "discover Kim on arrival" twist].
  - **Route order:** roof -> top floor -> middle floor (technical room) -> 22nd-floor security control room (by elevator) -> lower floors -> service elevator to ground floor -> transfer to the second building -> General Assembly hall and the ventilation above it [ONE SOURCE: Fandom notes / locks; order partly INFERRED / UNCERTAIN].
  - **Platform availability:** one commenter says UN HQ disappeared from their Xbox 360 backward-compatible install while Nuclear Plant stayed; others say both maps are present on Xbox One / Series [INFERRED / UNCERTAIN for 360; Xbox One presence CONFIRMED - 2 commenters + 1 Reddit user].
  - **Keypad trick:** one agent lures a guard while the other watches the keypad through a sticky camera (+ thermal / night vision) - a natural split, but no source describes it as two-player [UNKNOWN].
- **Still open.** Lit windows, metal detector handling, 22nd-floor approach, Kim takedown, timer start, defusal method, co-op moves used, guard counts / patrols, civilians, lighting, camera behaviour before the "off" state, the closing cinematic / ending text [UNKNOWN]. No Fandom transcript page; no forum / FAQ text read.
- **What to watch.** hexen2k7 UN HQ https://www.youtube.com/watch?v=5RBmv-nRtTs (and https://www.youtube.com/watch?v=Vmob0mzcINg , https://www.youtube.com/watch?v=-mU9NO8dxVw ); CR4ZY BALLISTICS original Xbox https://www.youtube.com/watch?v=yQH90XJtxTY ; PleasePlayMore https://www.youtube.com/watch?v=3CH1BrvzlPA ; R3xXcoN https://www.youtube.com/watch?v=v4gb6uKa5SQ + https://www.youtube.com/watch?v=uHMLby5KwZI ; GhostLetsPlays final part https://www.youtube.com/watch?v=iYKmSOodngw . Note: when the first timer line appears, whether any window rule fires, how Kim is taken, and the defusal inputs. Avoid speedruns for route evidence (B8z_7lUW6XI uses the taser invisibility glitch).

### R-21 - Co-op music

- **Original question.** "Co-op music": which music plays on the co-op menus and in each co-op mission (Xbox/PC seven missions; PS2/GC sub-levels); does co-op reuse single-player stem sets or "Common"; did Kyd write any co-op music?
- **Status: CLOSED for missions.** Menu music not identified.
- **What is now known** (each map's `.ini` [MUSICFILES], identical in XB477 and PC105; downloads from XBDLC + PC105) [CONFIRMED]:

| Map | Music banks |
|---|---|
| Training | `Mus_Common` + `SCX_Mus_00Training` (the solo training bank) |
| Panama | `Mus_Common` + `Mus_02CargoShip` (solo Cargo Ship) |
| Seoul | `Mus_Common` only |
| Chemical Bunker | `Mus_Common` + `Mus_07Battery` (solo Battery) |
| Train Station | `Mus_Common` + `Mus_04Penthouse` (solo Penthouse) |
| Nuclear Plant | `Mus_Common` + `Mus_05Displace` (solo Displace) |
| UN HQ | `Mus_Common` + `Mus_11KokuboSosho` (solo Kokubo Sosho) |

  - Co-op scripts trigger generic themes `Mus_Gen_Shetland1-3` and `Mus_Gen_SpyRoom_1-3` (probably inside Mus_Common); music states: idle, exploration, stress A/B, fight, death, failure, success [ONE SOURCE: XB477 / XBDLC `.lin`].
  - Music by Amon Tobin; no separate co-op composer; no dedicated co-op score [CONFIRMED for reuse].
  - Ambiences are bespoke: `Amb_C01_*` Panama, `Amb_C02_*` Seoul docks, `Amb_C03_*` Chemical Bunker, `Amb_C04_*` Train Station; the download maps borrow Chemical Bunker, Battery and Kokubo / Penthouse-type ambiences plus a `SCX_DL_COOP` sound bank [CONFIRMED - ini files].
- **Conflicting / earlier sources.** music_and_atmosphere.md: "Which composer the co-op mode used: NOT ESTABLISHED"; "none of the co-op missions has documented music"; hypothesis that co-op maps reuse single-player stem sets and / or Common [INFERRED / UNCERTAIN then] - now confirmed by the game files. Kyd's "Spy Room", "Defusal", "Spy Theme" and "Common" cues (Fandom PC-rip list; Fandom says Kyd did the "multiplayer" music) point to Versus [ONE SOURCE; link to Versus INFERRED / UNCERTAIN]; a fan upload labels "Defusal" as Bathhouse (single-player) music [INFERRED / UNCERTAIN]. Note the co-op `Mus_Gen_SpyRoom_1-3` theme name overlaps Kyd's "Spy Room" title [ANALYSIS: possible link, not established].
- **Still open.** Co-op menu music; PS2/GC co-op music banks (no PS2/GC data).
- **What to listen to.** Fan uploads not listened to: co-op music video "-8Oio-dEv8M" (https://www.youtube.com/watch?v=-8Oio-dEv8M) and multiplayer menu "PrKI5lpffwo" (https://www.youtube.com/watch?v=PrKI5lpffwo). In game: sit on the co-op menu (Xbox and PC) and identify the track.

### R-22 - Does partner voice fade with in-game distance?

- **Original question.** "Does partner voice fade with in-game distance?" (Is partner-to-partner chat proximity-attenuated, or only the guards' hearing?)
- **Status: OPEN.**
- **What is now known.**
  - The microphone fed the guards' sound meter: voice registered on the in-game sound meter, guards heard real talking and could be lured by deliberate noise [CONFIRMED - several sources: Reddit mngqa0 (2 commenters), vpwdry, 1e9pwjx; XBM p.26; PRIMA; GamesFirst; TeamXbox].
  - Xbox options: voice masking, voice through speakers, voice detection and voice detection sensitivity (how much guards hear you); default sensitivity 50 = about 2 m in-game for a normal voice [CONFIRMED - XBM + PRIMA; option strings ONE SOURCE: `PreGameMenus.int`]. No option or string about partner-to-partner distance attenuation [ONE SOURCE: game files].
  - PC manual: the sensitivity setting does not change partner voice volume [ONE SOURCE: PCDVD manual].
  - The headset is described as constant contact with the partner [ONE SOURCE: PRIMA].
  - Today on PC the in-game voice option is greyed out; players use Discord [ONE SOURCE: Reddit vpwdry].
- **Conflicting sources.** None; only absence.
- **What to check.** Two Xbox consoles over System Link (or Xbox Live revival) with headsets: talk at a fixed volume with the agents side by side, then at opposite ends of a map; note any volume change. Not checkable on PC today without restoring the in-game voice.

### R-23 - N-Gage / DS co-op details

- **Original question.** "N-Gage/DS co-op details": room layouts, device effects, roles, scoring (ngage_ds_campaign.md §6 and mission_ngage_ds.md §7).
- **Status: OPEN.**
- **What is now known.** Five parts in two missions: Mission A (ARGUS Corporation HQ, New York): Rooftops -> Breakdown -> Corruption; Mission B (prison in Cuba): Prison Rescue -> Escape; all dated "Summer 2007" by the wiki [ONE SOURCE: FW; part names in order CONFIRMED - FW + arronmunroe chapters]. Roles Hacker (hacks computers; cannot short-circuit panels) and Assault (short-circuits electric panels; cannot hack) [CONFIRMED - NG-TXT + FW]. Classic 3-alarm abort and checkpoint saves [CONFIRMED - FW + GamesRadar]. Local only: Bluetooth (N-Gage) or DS wireless with one cart each [ONE SOURCE each]. Full 3D third-person camera [CONFIRMED]. Lengths (arronmunroe, not stealth): Rooftops ~3.5 min, Breakdown ~4, Corruption ~10, Prison Rescue ~9, Escape ~10.5, total ~37 min; SHOCK-25 100% stealth: ~13.5 / 14 / 26.5 min for the first three [ONE SOURCE each].
- **Open sub-questions** (mission_ngage_ds.md §7 and ngage_ds_campaign.md §6):
  - Room-by-room layout of every part.
  - Rooftops: what its one panel and one computer do; the route; any security.
  - Breakdown: whether the two simultaneous switches need one player each (likely) or a Hacker plus anyone; where they are.
  - Corruption: whether the detection-and-ceiling-escape twist is always scripted or depends on being seen; what happens at the 6-minute timer (an "out of time" fail reason exists, so probably failure [INFERRED / UNCERTAIN]); which computer is the main server; when the "laser system enabled" message fires.
  - Prison Rescue / Escape: who can pick locks; who carries the colonel and how carrying works (speed, weapons, swapping); whether the colonel can be put down; fail rules for his death; where the four turret computers are; real order of events (only FW's list order); meaning of FW's "+N" supplies (probably pick-ups) [INFERRED / UNCERTAIN].
  - Whether checkpoints exist inside the co-op parts (FW says the alarm count drops "after each checkpoint" for the game in general; NG-TXT shows only the co-op alarm-lowered line).
  - Difficulty levels in co-op, scoring and unlock order (is Prison Rescue locked until Corruption is done?); which stats-screen fields apply to co-op.
  - N-Gage vs DS co-op map differences [UNKNOWN]; DarkInput claims DS levels are smaller and more linear than N-Gage's, but for single-player [ONE SOURCE, solo only]; whether the N-Gage needs one game card per player; DS single-card vs multi-card beyond one GameSpot snippet.
  - Whether the missing internal keys COOP_04-06 were cut co-op parts [INFERRED / UNCERTAIN].
  - The Hacker's night / thermal vision rule comes only from FW; NG-TXT shows no co-op-specific vision rule.
  - Whether any console-style co-op moves exist: the 37 interaction verbs include no two-man move; the only partner action is "HEAL ALLY" [ONE SOURCE: NG-TXT; INFERRED / UNCERTAIN: absence of evidence].
  - Hacker weapon wording: Pocket Gamer (DS) calls the Hacker unarmed and the Assault his protector; FW gives the Hacker an unlimited sticky shocker; reconciled as "no lethal weapon" [INFERRED / UNCERTAIN]. The sticky shocker works like the console OCP (temporarily knocks out electronics; wasting shots can make some lasers / cameras impossible to pass); the Hacker's is unlimited in co-op, which would remove that risk [INFERRED / UNCERTAIN].
  - Enemy model: asset "Coop_Mercinary" suggests mercenary models [INFERRED / UNCERTAIN: asset name only].
  - Role forcing in Rooftops (each role acts once) [INFERRED / UNCERTAIN: whether either is optional]; who carries the colonel [INFERRED / UNCERTAIN]; risk that hard role locks strand a player ("I can't do anything here") - no source shows whether this happened [INFERRED / UNCERTAIN].
  - The pre-release N-Gage fact sheet promised "global multiplayer over N-Gage Arena"; the final game used Arena only for top-10 scores and replays [CONFIRMED - several sources; contradiction noted].
  - No review describes a specific co-op moment; no GameFAQs DS co-op guide reachable (403); no DS or N-Gage manual on archive.org; GameSpot reviews (N-Gage 8.6, DS 5.6) blocked.
- **What to watch.** arronmunroe DS 2-player co-op (chapters: Rooftops 0:19, Breakdown 3:46, Corruption 7:49, Prison Rescue 17:48, Escape 26:55) https://www.youtube.com/watch?v=jnQ74p1Klf8 ; SHOCK-25 DS (MelonDS) Rooftops / Breakdown / Corruption 100% stealth (Rooftops from about 2:35, Breakdown from about 16:15, Corruption from about 30:30 to 57:01) https://www.youtube.com/watch?v=-Y6zjZ7oVNM . Map each panel / computer to its effect and note who carries the colonel.
- OPEN_QUESTIONS.md: R-23 is purely historical.

---

## 2. Other conflicts, [UNCERTAIN] and [GAP] items, by topic

Items already covered under an R-number above are not repeated here except as a pointer. File references are to /home/user/docs.

### 2.1 Platforms, versions, release, online

- PC online shutdown date: April 2016 (PCGamingWiki + Steam guide, search snippets) vs 7 Oct 2016 (MobyGames, search snippet); GameSpy services died May 2014; Steam users date the end to 2016; CT (PC) is on Ubisoft's April 2022 decommission list [INFERRED / UNCERTAIN on date; dead official PC online CONFIRMED - VGC + Shacknews] (research_notes/platforms_versions.md, dev_and_design_intent.md, reception.md). Which backend (GameSpy vs Uplay servers) [INFERRED / UNCERTAIN] (reception.md).
- Original Xbox Live end, commonly 15 Apr 2010, not verified in some notes (dev_and_design_intent.md, reception.md Gaps); 03 §7 states it as fact.
- Xbox Insignia revival: CT main title (US-056, 55530038) and Versus executable (US-065, 55530041) listed with matchmaking; whether co-op matchmaking works [INFERRED / UNCERTAIN] (platforms_versions.md).
- GameRanger support: no source [UNKNOWN] (platforms_versions.md).
- PS2: Versus online via XLink Kai; no remote co-op [INFERRED / UNCERTAIN] (platforms_versions.md). PS2 online (Versus) official shutdown date [UNKNOWN].
- PS2/GC co-op layouts in detail beyond the sub-level split [UNKNOWN]; layouts reworked / smaller on PS2/GC for co-op specifics [INFERRED / UNCERTAIN] (platforms_versions.md).
- Steam / Ubisoft Connect patch level and download presence [UNKNOWN] (platforms_versions.md).
- Mobile (J2ME) version: no co-op found [INFERRED / UNCERTAIN] (01_sources.md).
- Split-screen orientation following the Xbox dashboard widescreen setting [INFERRED / UNCERTAIN: one forum user] (platforms_versions.md).
- Developer of the PS2/GC co-op maps unclear [INFERRED / UNCERTAIN] (03 §1).
- GameCube needs both discs [INFERRED / UNCERTAIN: Classic Co-op only] (platforms_versions.md).
- Pre-release (Feb 2005) material spoke of only 4 co-op levels; retail had Training + 4 [ONE SOURCE: GamesFirst] (platforms_versions.md).

### 2.2 Modes, difficulty, saving and scoring

- Elite wording: XBM says no firearm ammo but the knife is available for kills; PRIMA says restricted to non-lethal weapons; a Steam poster says Elite strips all weapons and gadgets except the knife with Expert-level damage; RUW Elite tables show 0 firearm ammo plus a reshuffled gadget set [zero ammo CONFIRMED - XBM + RUW + cheat sites; knife vs non-lethal INFERRED / UNCERTAIN; "all gadgets removed" INFERRED / UNCERTAIN] (03 §2.3, 06, coop_gadgets_controls_comms.md, systems_rules.md). Ammo found in the level can still be picked up [ONE SOURCE: cheat text]. Elite typically on Expert [ONE SOURCE]. Game files: Elite cuts each agent to one or two non-lethal items [CONFIRMED].
- PS2 Elite: no Elite in the PS2 manual; cheat sites list "Elite: complete Story mode, knife only" and "Elite difficulty - finish Co-Op Mission mode" under PS2, probably copied from Xbox entries [INFERRED / UNCERTAIN] (systems_rules.md).
- Max-alarm handling in Xbox/PC co-op: no general max-alarm fail found (stage 4 with no abort) [INFERRED / UNCERTAIN: absence]; whether stage-4 alarms cancel secondary / opportunity objectives as in solo - co-op objective review has only Completed / Failed, so they presumably show as Failed [INFERRED / UNCERTAIN] (systems_rules.md, 10 §5).
- Lethal force in co-op beyond the listed missions [INFERRED / UNCERTAIN] (systems_rules.md).
- PS2/GC 3-alarm sub-level fail [ONE SOURCE: FW, stated on ~14 sub-level pages; earlier "from shared brief, not re-verified" UNCERTAIN in coop_gadgets_controls_comms.md and music_and_atmosphere.md].
- Scripted kills vs perfect score: the infected soldier (Train Station) must be killed, yet perfect runs exist (hexen2k7 100% Elite, 0 kills), so the scripted kill is evidently exempt [INFERRED / UNCERTAIN] (07, mission_train_station.md).
- FW-RU UN HQ note: pushing a stunned guard onto another lowers the stealth rating [ONE SOURCE] (systems_rules.md).
- Seoul and Chemical Bunker caps: see R-15.
- Training scoring: re-reading a panel needed for 100% [CONFIRMED]; whether the panel line counts as optional [INFERRED / UNCERTAIN] (mission_training.md).
- How quick load works for two players: see R-07.

### 2.3 Controls, HUD, communication and camera (see 05-hud-and-camera.md)

- PC "Say (Coop)" key (T / End) opening the HUD chat box [INFERRED / UNCERTAIN: link] (coop_gadgets_controls_comms.md).
- PC voice chat specifics [UNKNOWN] (coop_gadgets_controls_comms.md).
- PC F5 / F8 quick save / load in co-op [ONE SOURCE: FW; co-op quick save CONFIRMED by speedrun rules].
- No PC or GameCube manual was found for controls (PC manual later found on PCDVD; GameCube still none); GC bindings rely on the Fandom controls page only (coop_gadgets_controls_comms.md).
- Pings / gestures / world markers: none documented [UNKNOWN] (03 §6).
- Partner exposure / partner meter: no way to see the partner's meter [UNKNOWN] (10 §7, 13 #11).
- Co-op camera distance, shoulder offset, FOV, split-screen camera, downed-player view, Share View presentation, objective-notification presentation, subtitle behaviour, downed-partner line wording [UNKNOWN] (05-hud-and-camera.md).
- E3 build HUD differences [UNKNOWN] (videos.md).
- The "timer" on the Xbox co-op HUD: listed in 03 §5 but not in the XBM p.23 list as recorded [INFERRED / UNCERTAIN] (05-hud-and-camera.md §1.1).
- Whistle: GamesFirst says whistling into the headset replaces the whistle button; the PS2 manual has "Whistle/Co-op action" [INFERRED / UNCERTAIN: single preview] (music_and_atmosphere.md). A Substack retrospective says guards now fire toward a whistle rather than walk to it, conflicting with Prima's tip that whistling lures guards (context dependent; solo) (music_and_atmosphere.md).
- Shared-device input prompts on PC (cryo mixing, bomb, laser grid): players could scroll (A/D) but not confirm [CONFIRMED - Steam x2 + AnandTech]; whether this is a PC bug or a missing prompt [UNKNOWN] (mission_chemical_bunker.md A9).
- GC controller mapping awkward (Z-button combinations) [ONE SOURCE: NWR].

### 2.4 Kit and gadgets

- EEV: see R-02.
- SC-20K attachments other than the launcher (sniper, shotgun, foregrip) in co-op: not documented [UNKNOWN] (06 §5, coop_gadgets_controls_comms.md).
- No co-op loadout selection screen documented; fixed kits [ONE SOURCE: PRIMA gear boxes; absence otherwise INFERRED / UNCERTAIN] (06, coop_gadgets_controls_comms.md).
- Loadout reading: the map settings list only spare magazines and spare launcher rounds; the wiki counts add the loaded one (2 spare rifle magazines = 30 + 60 = 90 rounds; 0 spare sticky cameras = 1 in the launcher). The reading is the researchers' inference [INFERRED / UNCERTAIN for the mechanism; numbers match on all seven maps; UN HQ gives both agents an identical kit] (06 §2). Correction log: an earlier draft read "0 spare magazines" as "no ammunition"; reverted (00_PROGRESS.md).
- Training gives each agent one gas grenade, which the wiki omits [ONE SOURCE: game files] (06 §6).
- Chemical Bunker Elite sticky-camera split is reversed relative to ru Fandom's Seoul 3 table (A2 had 4 there) - possibly a wiki inconsistency [INFERRED / UNCERTAIN] (mission_chemical_bunker.md).
- RUW Seoul puts flash grenades with Agent One and frags with Agent Two; Chem Bunker puts both flash and frag with Agent Two (noted in coop_gadgets_controls_comms.md; consistent with PRIMA for Chem Bunker).
- Panama explosive charge in the East Wing elevator shaft (PS2/GC): FAN (RU) calls it an "EMP charge" and counts it as used, but the loadout tables do not list it; presumably found or contextual [INFERRED / UNCERTAIN] (mission_panama.md).
- PS2/GC Train Station grenade: see R-18. PS2 jammer in Team Training: see R-05.
- PS2/GC Silo / Labs device type: Prima "mobile ceiling sensor" vs ru Fandom "ceiling turret" disabled via the computer's switch-object action [INFERRED / UNCERTAIN: device type] (mission_chemical_bunker.md).
- Panama PS2/GC turrets: Archives (2) and Server Room (2), triggered by alarms or cameras, cannot be disabled [ONE SOURCE: FAN (RU)]; JV reports machine-gun fire in the Alley [INFERRED / UNCERTAIN] (mission_panama.md).
- Jammer hold vs fire-and-forget: a Reddit user stresses co-op OCP jamming is held, not fire-and-forget [ONE SOURCE: Reddit 1qfdvur; matches manual] (05 gap notes).

### 2.5 Moves

- Back-to-back climbing: not a shipped move; only in lore text on the FW Agent Two page; possibly cut or marketing wording [INFERRED / UNCERTAIN] (05, coop_moves.md).
- "Swing", "trampoline", "sacrifice": not found as move names; "sacrifice" may come from Tomoe Nage being a judo sacrifice throw [INFERRED / UNCERTAIN] (05, coop_moves.md).
- Move count: "about 10" in a 2005 preview vs 6 named moves in the manuals [6 CONFIRMED; "10" ONE SOURCE: GamesFirst] (05).
- Boost animation pose (cupped hands / knee) read from the manual pictogram only [INFERRED / UNCERTAIN] (05, coop_moves.md).
- Tomoe Nage "why players loved it" [INFERRED / UNCERTAIN as a "why"] (05).
- Frame-level animation details and timing windows (e.g. how long an initiator can wait); whether free moves are blocked near enemies or during alarms; official names in other localisations beyond Russian (French / German manuals not checked) [UNKNOWN] (coop_moves.md Gaps).
- Dual Rappel direction in Xbox Training (up vs down) [UNKNOWN] (mission_training.md).
- Nuclear Plant and UN HQ co-op moves: see R-19, R-20.
- Team Training (PS2/GC): RUW stats imply a dual scanner and a laser-grid computer [INFERRED / UNCERTAIN] (coop_moves.md); see R-05.

### 2.6 AI, detection and alarms

- Two intruders: see R-06. Difficulty: see R-10.
- Seoul 3 alarm escalation behaviour [UNKNOWN] (mission_seoul.md).
- Nuclear Plant noise masking [INFERRED / UNCERTAIN]; loud turbine halls pitched in PR, mechanic undocumented (08, nuclear_plant.md).
- "Meter overrides appearance" readability gap [ONE SOURCE: PRIMA] (10 §1, 15 §3.1).
- Ordinary cameras beaten by darkness alone [ONE SOURCE: IGNW tip] (10, systems_rules.md).

### 2.7 Missions

**Training Facility (Xbox/PC)** (mission_training.md, training.md):
- Objectives revealed per station [INFERRED / UNCERTAIN].
- Spatial flow inferred from mechanics; physical layout between stations not documented [UNKNOWN]; no loops, shortcuts or branches documented.
- Guards: none documented; stats imply one knock-out-able person or dummy ("0 people knocked out though actually 1") [INFERRED / UNCERTAIN]. Lighting, noise, civilians not documented.
- Whether Human Ladder, shoulders and back-to-back climb are taught; whether panels give voice-over [UNKNOWN].
- Possible progression bug (Training reloaded after a later mission) [ONE SOURCE: JV; INFERRED / UNCERTAIN].
- IGNW: one agent can hack both retinal scanners; RUW: failure costs health (training.md row 5).
- No Prima walkthrough for either training build; GameFAQs Eddo_C co-op FAQ and Supercheats ed13689 PS2 co-op walkthrough blocked.

**Team Training (PS2/GC):** see R-05.

**Panama** (mission_panama.md, panama.md):
- Xbox steps 10-11 order (Boost + Human Ladder up through a ceiling opening) reconstructed from scrambled OCR [INFERRED / UNCERTAIN]; PS2 Archives step 6 also reconstructed.
- Off-route rooms (billiard room and lounge SALON, Security 1 and 2 SEGURIDAD, Collection Room SALA DE COLLECCION via 3245, locker room CUARTO DE VESTUARIOS with 3 guards, VP private lounge, storage, offices, Restricted Area, Conference Room, a guard side-room that opens only on alarm) and how they connect [UNKNOWN]; codes 1523, 1534 and 3245 open optional loops [INFERRED / UNCERTAIN].
- De Medeiros location: FAN (RU) private lounge vs PRIMA VP's office (may be adjoining rooms) [INFERRED / UNCERTAIN].
- JV poster (platform not stated): shot by guards above after hacking a computer after the truck start; fits the PS2 Alley better [INFERRED / UNCERTAIN].
- PS2/GC East Wing vent: computer at the bottom of the stairwell (email about a high-end drone; "Circulation Ventilation" security action) opens the grated vent; one poster says it sometimes opened by itself (glitch); JV: if one agent is seen by cameras the hatch shuts [CONFIRMED - FAN + JV + NEO + SCQ]; PRIMA does not mention it, so whether it is shut by default [INFERRED / UNCERTAIN]. How the East Wing drone behaves once triggered [UNKNOWN]. A JV poster stuck in a "sort of museum" watched by a flying machine-gun drone neutralised for about 20 seconds - this room or the Xbox Exposition Room [INFERRED / UNCERTAIN]. JV: during the boost "between the 2 cameras" the booster could not climb up himself [INFERRED / UNCERTAIN].
- Archive keypad code 9835 found only by trial and error; hacking it makes the guard get stuck trying to reach the panel [ONE SOURCE: FAN / SHOCK-25].
- GameCube-specific differences from PS2: none documented [UNKNOWN].
- Panama wow moments: no Panama-specific player quotes [INFERRED / UNCERTAIN: inferred]; no designer commentary; GameSpot "Co-op Hands-On - Panama" (2005) 403-blocked.
- GameCube "Panama Bank" naming and CouchiesTV's "BANK" chapter unexplained [INFERRED / UNCERTAIN] (videos.md).
- PS2/GC framing: see R-14. Whether Sam Fisher speaks in Panama [UNKNOWN].

**Seoul** (mission_seoul.md, seoul.md):
- Rybka-only items to check: the five-minute AA timer (now in game text), the boat turret, the retinal-scanner front door, the med-kit save bug.
- Fisher exchange: triggered by a fixed point (after AA 2) or something else; whether it auto-completes "Find out where Jong is" when the officer was not interrogated; whether it replaces the agents' own optional officer interrogation [INFERRED / UNCERTAIN].
- Boat sabotage objective: absent from Prima's (launch-era) objective list; ru Fandom says it was reworded in patch v1.05 (from disabling the boat to breaking its motor) [ONE SOURCE: ru Fandom; post-launch change INFERRED / UNCERTAIN].
- Chokepoints and peak / rest labels are design readings [INFERRED / UNCERTAIN].
- Showpieces present but "wow" reaction not sourced [UNKNOWN].
- Xbox/PC saving (Rybka "save often" vs EG "no checkpoints"): resolved by R-07.
- PS2/GC: alternatives to Prima's single route per sub-level, guard counts beyond those named, why ru Fandom lists a "general" as the Rooftops interrogee; Gardens 4-minute timer is Fandom-only.
- Cause of the 90% cap: see R-15. No developer commentary.

**Chemical Bunker:** see R-16 (and R-15 for 97%). Also: peak labels in the structure [INFERRED / UNCERTAIN]; no timers documented (mission_chemical_bunker.md).

**Train Station:** see R-17 and R-18. Also: "Recover bomb schematics" listed by FAN and hexen2k7, absent from the guide's box [INFERRED / UNCERTAIN]; Tomoe Nage over the laser REQUIRED in Prima's route, other ways round not documented; OCP cover + disarm at the turret is "REQUIRED-ish" [INFERRED / UNCERTAIN] (mission_train_station.md).

**Nuclear Plant:** see R-19. **UN HQ:** see R-20. **N-Gage / DS:** see R-23.

### 2.8 Story, development and credits

- No developer statement on why co-op stars trainees or why objectives are split [UNKNOWN] (03 §3, dev_and_design_intent.md).
- Staffing: more than 100 people in Montreal plus about 50 in Annecy (GameSpot "First Look", search summary) vs about 300 at peak (Wikipedia, North Bay Nugget 2006); may count different things [INFERRED / UNCERTAIN] (dev_and_design_intent.md).
- Patrick Fortier (listed as a director, Wikipedia infobox) and Mathieu Berube (level designer; replayed the Bank level with Hocking in 2016) - roles otherwise unknown [ONE SOURCE each].
- Ubisoft Milan's role; Annecy and CT co-op (no link found); Blacklist co-op studio claims [INFERRED / UNCERTAIN] (dev_and_design_intent.md).
- Not read: IGN Q&A with Mathieu Ferland (2004/05); TotalVideoGames and Canoe/WHAM Q&As; Collector's Edition development diaries; G4 "Making Of"; GDC talks / postmortems on CT co-op; Designer Notes podcast (Hocking, eps. 43-44) and Tone Control interview; GameSpot co-op hands-on full text; TeamXbox co-op overview; OXM / Edge print [UNKNOWN] (dev_and_design_intent.md).
- Exact download release dates and the PC/Xbox order swap (now resolved by R-01) (dev_and_design_intent.md).
- Nuclear Plant authorship (Italian team): see R-12.
- Bob and Steve machinima built on CT co-op footage is only implied [ONE SOURCE / INFERRED / UNCERTAIN] (videos.md); X-Play Co-Op Theater background not cross-checked; one Steam user credits X-Play with a machinima [INFERRED / UNCERTAIN] (reception.md).

### 2.9 Music, sound and atmosphere

- Number of intensity layers: four (Wikipedia / Remix, CDM, TMT, Kotaku) vs three states (SquareEnixMusic review: calm exploration, approaching danger, enemies alarmed); best reading "four layers mapped to about three states"; exact trigger table and transition / decay times unknown [INFERRED / UNCERTAIN] (15 §1.2, music_and_atmosphere.md).
- Album live band and orchestra credits literal or partly a joke [INFERRED / UNCERTAIN]; "Bobby Azinsky" (Wikipedia) likely a misspelling of Bobby Owsinski [INFERRED / UNCERTAIN] (music_and_atmosphere.md).
- Boccherini "Minuet" used in the game, level unknown [ONE SOURCE: VGOST fan wiki].
- Some Tobin music heard on Top Gear [INFERRED / UNCERTAIN] (Steam 16687618).
- GameSpot review snippet: music percussive, recalls Mission: Impossible [INFERRED / UNCERTAIN].
- IGN / GameSpot 2005 year-end audio awards not verified; G-Phoria 2005 categories unknown [INFERRED / UNCERTAIN].
- Co-op weather, time of day and palette per co-op map: undocumented [UNKNOWN] (15 §3.5, §6).
- Co-op menu music: see R-21. Partner voice falloff: see R-22. PS2 co-op voice: whether any online co-op voice existed on PS2 [UNKNOWN].
- Ubisoft "Behind the Scenes: Sound Design" featurette (punciITHal8) and "Developer Diaries - Sound" (g0Jl6uVAcGE) not viewed; one bonus-disc clip (S3_t02, 3:47) produced no speech and was not identified (music_and_atmosphere.md).
- Kyd's multiplayer cues and Versus link [INFERRED / UNCERTAIN] (music_and_atmosphere.md); see R-21.

### 2.10 Reception and community

- Full review bodies for IGN, GameSpot, GameSpy, 1UP, OXM, PC Gamer, GamePro, Game Informer, X-Play and GameTrailers not reached; their co-op comments are Metacritic blurbs or search snippets only; Edge's co-op comments not found (reception.md). IGN, GameSpot, Game Informer, Edge / games(TM) rows tagged [INFERRED / UNCERTAIN: snippets].
- Reddit claim that Eurogamer's Xbox review called CT dumbed-down: search summary only [INFERRED / UNCERTAIN] (reception.md).
- ResetEra / NeoGAF, Co-optimus, Ubisoft forums not read (reception.md).
- Steam counts are keyword approximations (reception.md).
- One veteran says the first levels are among the best co-op ever but later levels feel rushed [ONE SOURCE: Reddit 1utzrr6].

### 2.11 Video catalogue uncertainties (research_notes/videos.md, 01_sources.md)

- Auto-generated chapters are unreliable (e.g. Spyker2041's misname Jong as "John Hu") [INFERRED / UNCERTAIN wherever used].
- Platform not stated for many uploads (e.g. NickyTheGamer Panama https://www.youtube.com/watch?v=XS6GZuy4iBg ; fisher5390 https://www.youtube.com/watch?v=vP51V2QUMS0 ; French Dailymotion Panama https://www.dailymotion.com/video/xmaxsg ; Playbottl Training IL https://www.youtube.com/watch?v=PP_1bFZ7sU4 ; DantasLevi PS2 Classics https://www.youtube.com/watch?v=-R4jUzkk7oI , which missions unknown).
- Titles of uncertain meaning: "Operation Throw Torgos" https://www.youtube.com/watch?v=LXMhZHUOpEk ; hexen2k7 "Action in Panama" https://www.youtube.com/watch?v=0QznY6rsC3U ; TimmyAkmed "New York" speedrun https://www.youtube.com/watch?v=g1WZNszNcfE (Train Station or UN HQ?); DoubleTroubeify playlist episode titles ("Crane Life", "Defusing the Situation", "Elevator") https://www.youtube.com/playlist?list=PLDABDF07C09F86F5A ; ysuck63 GC Chemical Bunker 1-5 one per sub-level? https://www.youtube.com/watch?v=8Ldd9814MoE ; synzh GC IL numbering (Level 1 https://www.youtube.com/watch?v=0n_jqp8QH3U , Level 10 https://www.youtube.com/watch?v=oIGRXjMCh2s ) suggests GC sub-levels counted individually; ParagonMitchell "Unredacting the Chaos Theory files" https://www.youtube.com/watch?v=BTeinCL-KFk ; IGN Xbox Review "Co-Op Missions" chapter at 3:55 https://www.youtube.com/watch?v=1eetPo7gdQw ; Isolated Oaf training videos PS2 https://www.youtube.com/watch?v=6Uy0tnDb5Ec and PC https://www.youtube.com/watch?v=1-Tyzb41how ; TheApacheKing training videos https://www.youtube.com/watch?v=KITpNqMXnZY (likely single-player); Hyper Tension Films GC video https://www.youtube.com/watch?v=nOZ7tuHzFlE (co-op coverage unknown); Digital Foundry PC vs Xbox https://www.youtube.com/watch?v=YnlvSci_PCE (co-op content unknown); level-design diary https://www.youtube.com/watch?v=yxzr8K95RQ0 and animation diary https://www.youtube.com/watch?v=xocq_CIzuag (co-op coverage unknown).
- Distro / Heinki "Co-Op in 38m44s" ends on the final frame of Nuclear Plant, implying their order ends with Nuclear Plant [INFERRED / UNCERTAIN] https://www.youtube.com/watch?v=yEjHJb-SpjQ .
- ParagonMitchell "The most cursed co-op game" chapters stop at Train Station plus "An Unfortunate End", suggesting they did not finish [INFERRED / UNCERTAIN] https://www.youtube.com/watch?v=SwxTLoWn5e4 .
- Thin original-Xbox captures; no original-Xbox Nuclear Plant capture confirmed; no GC Nuclear Plant / UN HQ (consistent with Xbox/PC only). Not read: Zolt Assassin Chemical Bunker 100% (nCJ8xbWt-nM), Pretend3r and Urban Reflex parts without descriptions, DoubleTroubeify descriptions.

### 2.12 Research access gaps (sources that were blocked)

- YouTube transcripts and watch pages (Google "sorry" redirect; player API LOGIN_REQUIRED; third-party transcript sites 403 / 429); reddit.com / old.reddit JSON "Blocked"; pullpush.io refuses agents; Arctic Shift comment full-text search times out; GameFAQs (403, also via reader proxy); co-optimus (403); GameSpot (403); supercheats (403); Softpedia (403); neowin (403); MobyGames (403 / CAPTCHA); PCGamingWiki (Cloudflare 403); IGN wiki Chemical_Bunker and New_York_Subway_Line pages empty; xboxaddict closed 2025; replacementdocs no results; archive.org Prima print text 401; PS2 USA image "item not available"; `sony-playstation-2-t-redump-collection` CHD only; no GameCube image found (gap_closing_gamefiles.md, gap_closing_community.md, coop_gadgets_controls_comms.md, 01_sources.md).
- Web search budget ran out during several notes (Panama, Training, Chemical Bunker, UN HQ, systems rules, platforms, reception, dev intent, videos, real-world security).

### 2.13 Background research (not about the CT co-op; for completeness)

- `research_notes/stealth_coop_design_literature.md`: pager rules read as anti-"kill everyone" (forum opinion); escalating alarm clock level detail; no save-anywhere snippet; Valve countdown timers detail; co-op grew from observing players; co-op extension details; marking UI for human partners (conflicting secondary sources); two-sniper mode details; Sniper Elite 4 and "Overwatch" mode; same-role disguise detection; Desilets quote wording; original Metal Gear two-level alert; Sly Cooper planning tool; Intravenous (no primary source); GDC Vault talks behind membership; Tom Leonard's Thief AI page; GMTK transcripts 403 [INFERRED / UNCERTAIN or UNKNOWN as marked there].
- `research_notes/real_world_security_and_architecture.md`: anti-passback, bank time-delay locks, retention periods (snippets); corridor widths, floor-to-floor heights, ceiling-void depths, police response times, randomised patrol timing, hospital / rail / port shift patterns, casino count-room procedures not sourced; many facility profiles rest on one Wikipedia article; npsa.gov.uk read via the UK Government Web Archive mirror [INFERRED / UNCERTAIN or UNKNOWN as marked there].

---

## 3. Assumptions logged during the run

From OPEN_QUESTIONS.md:
1. The Xbox/PC version is treated as the reference build. PS2/GC and handheld versions are documented separately.
2. Where the strategy guide and the game's own text disagree, the game text wins.
3. Unwatched videos are cited only through their titles, descriptions and comments.

Source-counting rules applied throughout (research_notes/_AGENT_BRIEF.md and per-note headers):
4. The Fandom wiki counts as one source; English and Russian Fandom (FW / RUW / FAN) are one source family where RUW translates FW. RUW's per-mission loadout tables have no English equivalent, so they count as a distinct single source for loadouts (coop_gadgets_controls_comms.md).
5. SHOCK-25 video descriptions are not independent of RU Fandom (the RU editor appears to be the same person, identical emoji-stat formatting); FW trivia and SHOCK-25 DS timestamps are counted as one source "FW/SHOCK" (mission_training.md, mission_ngage_ds.md).
6. Two pages of the same site = one source; Ubisoft press releases reprinted on different sites = one source (dev_and_design_intent.md).
7. Cheat sites with identical user-submitted text (Cheat Index / ChapterCheats / IGN wiki) are counted once (systems_rules.md).
8. Never invent mission details, room sequences, moves or mechanics; unknowns go under "Gaps" (_AGENT_BRIEF.md).

Interpretation assumptions:
9. Map settings files list **spare** magazines and spare launcher rounds; the wiki totals add the loaded one (rifle 30 = one loaded magazine; 2 spare = 90; sticky cam = file count + 1). This reading is the researchers' inference, but the numbers match on all seven maps; an earlier draft wrongly read 0 spare magazines as "no ammo" and was reverted (06 §2, 00_PROGRESS.md, gap_closing_gamefiles.md corrections).
10. XB477 (21-22 Feb 2005) is treated as near-final, and PC and Xbox share one script, because PC105 co-op text is word-for-word identical for Panama, Seoul and Chemical Bunker and differs only in small wording fixes for Train Station and Training (gap_closing_gamefiles.md).
11. Elder-Geek's "no checkpoints" is read as "no automatic checkpoints" (R-07).
12. Speedrun videos are poor evidence for intended routes (glitches) (gap_closing_community.md).
13. Pacing labels such as "peak" or "rest" are the researchers' analysis of documented beat orders (09).
14. Where only a "wow" is inferred from a documented beat, it is marked as inferred (11).
15. "Platform (likely)" calls in the video catalogue are inferences, e.g. from Bandicam / Steam mentions or the Seoul 90% bug that one uploader calls PC-only (videos.md).

---

## 4. What needs checking in the game - checklist ordered by value for building a CT recreation

[ANALYSIS] Ordered by how much each answer changes what a recreation must build (core loop and HUD first, mission-specific trivia last). Platform to check first: Xbox or PC 1.05 (the reference build), unless noted.

1. [ ] **Camera** (UNKNOWN; not in any research file): measure the co-op third-person camera distance, height, shoulder offset, FOV, corner behaviour, how it frames two-person moves, and the split-screen camera per half. Any clean capture, e.g. ShepherdMods PC 4K Chemical Bunker https://www.youtube.com/watch?v=hHg-nYqfLzA and PS2 split-screen https://www.youtube.com/watch?v=lFHlkLTsKQI .
2. [ ] **R-11 map and partner marker:** open the OPSAT Map page in co-op; static image or navigable plan; one or two "Player" dots; any on-screen partner cue. Check the split-screen OPSAT layout. Check PS2 for a co-op map page.
3. [ ] **HUD layout as rendered:** screen positions of the 12 Xbox HUD elements; how the Co-op Action icon, teammate status and chat box look; whether a timer appears (Seoul AA, Train Station bomb, UN HQ). Capture: V339 Panama https://www.youtube.com/watch?v=KlU0002suD4 .
4. [ ] **Downed state:** what the downed player sees and hears; how the partner's HUD shows it; the exact help line; what happens when both are down (R-03 remainder).
5. [ ] **R-09 extraction:** can one agent alone trigger "Extraction"?
6. [ ] **Shared device screens:** the Train Station bomb ("Defuse" device screen), the two-player laser grid and the cryo mixing: inputs, on-screen prompts, timer display, what a wrong cut does. Videos: Suru https://www.youtube.com/watch?v=-JnlamHBZrc ; https://www.youtube.com/watch?v=8FiRUvq86sg ; GameCube https://www.youtube.com/watch?v=LY9-0Dk-YHk ; PS2 https://www.youtube.com/watch?v=ge7dEnjp6MU .
7. [ ] **Co-op move timing:** how long an initiator can wait; whether free moves are blocked near enemies or during alarms; the Tomoe Nage reticule range; animation lengths (coop_moves.md Gaps). Training videos: hexen2k7 100% Elite https://www.youtube.com/watch?v=WQ__XNyWP0M ; V339 https://www.youtube.com/watch?v=2VRGQUT2JvQ .
8. [ ] **R-06 two intruders:** separate vs shared AI knowledge and searches.
9. [ ] **Light and noise meters as rendered:** ambient marker look; how fast bars respond; whether mic voice shows on the meter (R-22 partner side too).
10. [ ] **Share View presentation:** full screen or inset; can the receiver move; HUD shown.
11. [ ] **Objective notifications:** how an update appears (sound, text, icon) and how communication-box lines are timed; subtitle behaviour for voiced lines.
12. [ ] **R-02 EEV:** does right-stick click / key 4 open a working EEV in co-op?
13. [ ] **R-10 difficulty:** detection speed and hearing on Normal vs Expert.
14. [ ] **R-08 friendly fire on PC:** can agents damage each other; any toggle.
15. [ ] **Quick save / load with two players** (R-07 remainder): who triggers, does it reload both.
16. [ ] **R-20 UN HQ:** lit-window rule, metal detector, Kim, timer start, defusal method. Videos listed under R-20.
17. [ ] **R-19 Nuclear Plant:** scanner doors, laser corridor, footbridge, co-op move locations, guard placement. Videos listed under R-19.
18. [ ] **R-16 serum vials** and **R-17 Chu's fate** (videos listed above).
19. [ ] **R-15 rating caps:** Seoul 90% on Xbox vs PC; Chemical Bunker 97%.
20. [ ] **Per-map look:** palette, weather, time of day, brightness of each co-op map vs its solo counterpart (15 §3.5).
21. [ ] **R-21 co-op menu music.**
22. [ ] **Version 2 items:** R-03 PS2/GC syringe count; R-05 Team Training stations; R-18 grenade type; R-14 PS2 Panama briefing; PS2 HUD as rendered.
23. [ ] **R-23 N-Gage/DS** device effects, carry rules, radar, scoring (videos under R-23).
24. [ ] **R-22 partner voice falloff** (needs two Xbox consoles with headsets).

---

## 5. Design decisions recorded elsewhere

The D-01 to D-25 design decisions for the new game are not research questions and are not repeated here. They are recorded in raw/OPEN_QUESTIONS.md (the decisions table, decided by the user on 2026-10-18) and raw/DESIGN_BIBLE.md (§12, with the trade-offs). Several came from research gaps above (D-15 from R-09, D-16 from R-06, D-17 from R-22, D-18 from R-08, D-19 from R-02, D-20 from R-16, D-21 from R-20, D-22 and D-25 from R-17, D-23 from R-15, D-24 from R-07); OPEN_QUESTIONS.md notes that R-05, R-18 and R-23 are purely historical and have no bearing on the new game.

---

## Sources used for this file

**Files in /home/user/docs:**
- /home/user/docs/OPEN_QUESTIONS.md (in full)
- /home/user/docs/02_coverage_matrix.md (in full)
- /home/user/docs/research_notes/gap_closing_gamefiles.md (in full)
- /home/user/docs/research_notes/gap_closing_community.md (in full)
- Gaps / gap-closing sections of: /home/user/docs/03_coop_overview.md, 05_coop_moves_catalogue.md, 06_gadgets_and_tools.md, 09_pacing_and_flow.md, 10_ai_detection_and_alarms.md, 13_principles.md, 15_music_and_atmosphere.md, and /home/user/docs/04_mission_breakdowns/chemical_bunker.md, ngage_ds_campaign.md, nuclear_plant.md, panama.md, seoul.md, train_station.md, training.md, un_headquarters.md
- Gaps sections and uncertainty grep of: /home/user/docs/research_notes/coop_gadgets_controls_comms.md, coop_moves.md, systems_rules.md, platforms_versions.md, reception.md, dev_and_design_intent.md, music_and_atmosphere.md, videos.md, mission_training.md, mission_panama.md, mission_seoul.md, mission_chemical_bunker.md, mission_train_station.md, mission_nuclear_plant.md, mission_un_hq.md, mission_ngage_ds.md, stealth_coop_design_literature.md, real_world_security_and_architecture.md, _AGENT_BRIEF.md
- /home/user/docs/00_PROGRESS.md, /home/user/docs/01_sources.md, /home/user/docs/README.md, /home/user/docs/07_objectives_taxonomy.md, /home/user/docs/08_level_design_patterns.md, /home/user/docs/11_wow_moments.md, /home/user/docs/12_anti_patterns.md (uncertainty grep)

**External URLs cited in this file:**
- Game files: https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601 (PC105); https://archive.org/details/og-xbox-dlcupdates (XBDLC; also https://archive.org/details/Original-Xbox-Live-Updates-and-DLC and https://archive.org/details/XbDLC2); https://archive.org/details/sc-3-xb-build-477-retail (XB477); https://archive.org/details/scct_20250728 (PCDVD)
- Manuals and guide: https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory ; https://archive.org/details/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA ; https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide
- Fandom API: https://splintercell.fandom.com/api.php , https://splintercell.fandom.com/ru/api.php
- AnandTech 2008: https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/
- speedrun.com API: https://www.speedrun.com/api/v1/games/j1n44e6p/categories , https://www.speedrun.com/api/v1/games/j1n44e6p/levels , https://www.speedrun.com/api/v1/runs?category=zd3xm8dn
- Steam: https://steamcommunity.com/app/13570/discussions/0/133262738417485094/ , https://steamcommunity.com/app/13570/discussions/0/828925849173270181/ , https://steamcommunity.com/app/13570/discussions/0/45350245387206844/ , https://steamcommunity.com/app/13570/discussions/0/1326718197214822685/
- Reddit: https://www.reddit.com/r/Splintercell/comments/v5jncz/ , https://www.reddit.com/r/Splintercell/comments/15s93fb/ , https://www.reddit.com/r/Splintercell/comments/kw1j41/ , https://www.reddit.com/r/Splintercell/comments/1m8z5gm/ , https://www.reddit.com/r/Splintercell/comments/dgzg9g/ , https://www.reddit.com/r/Splintercell/comments/1qfdvur/ , https://www.reddit.com/r/Splintercell/comments/1df5iet/ , https://www.reddit.com/r/Splintercell/comments/1e9pwjx/ , https://www.reddit.com/r/Splintercell/comments/1utzrr6/ , https://www.reddit.com/r/patientgamers/comments/mngqa0/ , https://www.reddit.com/r/gaming/comments/vpwdry/
- GamesRadar DS review: https://www.gamesradar.com/splinter-cell-chaos-theory-2/
- Dailymotion: https://www.dailymotion.com/video/xmaxsg
- YouTube playlist: https://www.youtube.com/playlist?list=PLDABDF07C09F86F5A
- YouTube videos: https://www.youtube.com/watch?v=H-AXCQQ8sCs , https://www.youtube.com/watch?v=Ti5rTnmVL3E , https://www.youtube.com/watch?v=N3QdeyXEufQ , https://www.youtube.com/watch?v=4GtVpbf1xAw , https://www.youtube.com/watch?v=KlU0002suD4 , https://www.youtube.com/watch?v=__LRg8KrYQ8 , https://www.youtube.com/watch?v=qLQEHSaRECM , https://www.youtube.com/watch?v=obcKEeRniRw , https://www.youtube.com/watch?v=MmH3o7WF4wg , https://www.youtube.com/watch?v=gy1Vt3pxX8U , https://www.youtube.com/watch?v=m5lUF8rdW4Q , https://www.youtube.com/watch?v=RXNrz5N-qZE , https://www.youtube.com/watch?v=gm9uYnMw9KA , https://www.youtube.com/watch?v=PP_1bFZ7sU4 , https://www.youtube.com/watch?v=KCOcnYpCD0s , https://www.youtube.com/watch?v=B8z_7lUW6XI , https://www.youtube.com/watch?v=yEjHJb-SpjQ , https://www.youtube.com/watch?v=gOn-T6LlNHk , https://www.youtube.com/watch?v=-JnlamHBZrc , https://www.youtube.com/watch?v=ILxhYQ1BHc0 , https://www.youtube.com/watch?v=chb66dBOt74 , https://www.youtube.com/watch?v=phfqPfdFZdQ , https://www.youtube.com/watch?v=A9qRzUt9RtE , https://www.youtube.com/watch?v=tg8sn2ZC2CY , https://www.youtube.com/watch?v=jry663Tx5bg , https://www.youtube.com/watch?v=2VRGQUT2JvQ , https://www.youtube.com/watch?v=lFHlkLTsKQI , https://www.youtube.com/watch?v=2FmkMk4rHQw , https://www.youtube.com/watch?v=-mf3o-FxGAQ , https://www.youtube.com/watch?v=6q3P3ZQFfOk , https://www.youtube.com/watch?v=puvCXAdiRxk , https://www.youtube.com/watch?v=VgD93an8rR4 , https://www.youtube.com/watch?v=Z_mYQGQKh6s , https://www.youtube.com/watch?v=FmSiWt_hVG4 , https://www.youtube.com/watch?v=mqyj-66XLMo , https://www.youtube.com/watch?v=49TgQ2npG1Y , https://www.youtube.com/watch?v=hHg-nYqfLzA , https://www.youtube.com/watch?v=BdwhJtGy7a8 , https://www.youtube.com/watch?v=2X5MvQPOQ14 , https://www.youtube.com/watch?v=SXHCqjqi_Tc , https://www.youtube.com/watch?v=kRDWrH-zamE , https://www.youtube.com/watch?v=_UclJhv8ZUs , https://www.youtube.com/watch?v=ge7dEnjp6MU , https://www.youtube.com/watch?v=1FYUWwle97Q , https://www.youtube.com/watch?v=OBU3MtaoKb4 , https://www.youtube.com/watch?v=rVg3fr3OrPA , https://www.youtube.com/watch?v=xFO_ntoDVBY , https://www.youtube.com/watch?v=mODHEazeQr8 , https://www.youtube.com/watch?v=YpVZb_5lGq8 , https://www.youtube.com/watch?v=5RBmv-nRtTs , https://www.youtube.com/watch?v=Vmob0mzcINg , https://www.youtube.com/watch?v=-mU9NO8dxVw , https://www.youtube.com/watch?v=yQH90XJtxTY , https://www.youtube.com/watch?v=3CH1BrvzlPA , https://www.youtube.com/watch?v=v4gb6uKa5SQ , https://www.youtube.com/watch?v=uHMLby5KwZI , https://www.youtube.com/watch?v=iYKmSOodngw , https://www.youtube.com/watch?v=-8Oio-dEv8M , https://www.youtube.com/watch?v=PrKI5lpffwo , https://www.youtube.com/watch?v=jnQ74p1Klf8 , https://www.youtube.com/watch?v=-Y6zjZ7oVNM , https://www.youtube.com/watch?v=8FiRUvq86sg , https://www.youtube.com/watch?v=LY9-0Dk-YHk , https://www.youtube.com/watch?v=WQ__XNyWP0M , https://www.youtube.com/watch?v=XS6GZuy4iBg , https://www.youtube.com/watch?v=vP51V2QUMS0 , https://www.youtube.com/watch?v=-R4jUzkk7oI , https://www.youtube.com/watch?v=LXMhZHUOpEk , https://www.youtube.com/watch?v=0QznY6rsC3U , https://www.youtube.com/watch?v=g1WZNszNcfE , https://www.youtube.com/watch?v=8Ldd9814MoE , https://www.youtube.com/watch?v=0n_jqp8QH3U , https://www.youtube.com/watch?v=oIGRXjMCh2s , https://www.youtube.com/watch?v=BTeinCL-KFk , https://www.youtube.com/watch?v=1eetPo7gdQw , https://www.youtube.com/watch?v=6Uy0tnDb5Ec , https://www.youtube.com/watch?v=1-Tyzb41how , https://www.youtube.com/watch?v=KITpNqMXnZY , https://www.youtube.com/watch?v=nOZ7tuHzFlE , https://www.youtube.com/watch?v=YnlvSci_PCE , https://www.youtube.com/watch?v=yxzr8K95RQ0 , https://www.youtube.com/watch?v=xocq_CIzuag , https://www.youtube.com/watch?v=SwxTLoWn5e4
