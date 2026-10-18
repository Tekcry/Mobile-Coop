# 04 - Kit

Everything the two agents carry in the co-op mode of Splinter Cell: Chaos Theory (2005): weapons, rifle attachments, gadgets, goggle modes, ammunition, per-mission loadouts (raw game-file values and the totals they produce), Elite mode, how co-op kit differs from solo, and the separate handheld kit.

**Platform labels used in this file.**
- **Xbox/PC (Version 1):** seven co-op maps (Training Facility, Panama, Seoul 3, Chemical Bunker, Train Station, plus the two downloads Nuclear Plant and UN Headquarters). Map files: `00_Training_COOP`, `01_Panama`, `02_seoulthree`, `03_ChemBunker`, `04_GCS` (Grand Central Station = Train Station), `05_NuclearPlant`, `07_UNhq`.
- **PS2/GameCube (Version 2):** Team Training plus four missions split into sub-levels (Seoul, Chemical Bunker, Train Station, Panama, in that order).
- **N-Gage/DS:** a separate Gameloft co-op campaign with two fixed classes (section 9).

**Confidence tags.** [CONFIRMED - several sources: ...], [ONE SOURCE: ...], [INFERRED / UNCERTAIN: ...], [UNKNOWN - see 06-open-questions.md, R-xx], [ANALYSIS] (the researchers' interpretation, not a fact about the game). Source codes (XBM, PS2M, PRIMA, FW, RUW, FAN, IGNW, GF, WP, PC105, XB477, XBDLC, PCDVD, NG-TXT, RYB, JV, NWR, EG, NEO, AT, MN, SHOCK-25, Steam) are as in 00-index.md. FAN = English + Russian Fandom wiki counted as one source family; RUW = the Russian Fandom wiki, which alone holds the Xbox/PC per-mission loadout tables.

---

## 1. Quick reference: the kit rules in co-op

| Rule | Platform | Confidence |
|---|---|---|
| No whistle: the whistle button becomes the Co-op Action button | Xbox/PC, PS2/GC | [CONFIRMED - several sources: PRIMA, XBM controller diagram, FW controls page] |
| The SC Pistol's OCP becomes the co-op "jammer": hold-to-jam on a draining, self-refilling charge; moving cancels it | Xbox/PC, PS2/GC | [CONFIRMED - several sources: XBM pp.25-26, PS2M, PRIMA, FW OCP page] |
| EEV (remote scan/hack device): PRIMA says it cannot be used in co-op; the co-op controls still bind it | Xbox/PC (PS2/GC unknown) | [INFERRED / UNCERTAIN: PRIMA vs XBM diagram, PC `SplinterCell3User.ini`; UNKNOWN - see 06-open-questions.md, R-02] |
| Fixed loadouts per mission and per agent; no co-op loadout selection screen documented | Xbox/PC, PS2/GC | [ONE SOURCE: PRIMA gear boxes; absence of a selection screen is INFERRED / UNCERTAIN: absence of evidence]. The map settings files hold one fixed kit per agent per mode (Mission and Elite), which is consistent with no choice screen [ANALYSIS] |
| Asymmetric kits: Agent One (host) carries the launcher payloads (sticky cameras in quantity, sticky shockers, ring airfoil rounds); Agent Two (client) carries most of the hand grenades (flash, smoke, frag). Exception: UN HQ gives both agents an identical kit | Xbox/PC | [CONFIRMED - several sources: RUW tables + PRIMA gear boxes (Chemical Bunker, Train Station) + PC105/XB477/XBDLC map settings] |
| Symmetric kits: both agents get identical kit per sub-level | PS2/GC | [CONFIRMED - several sources: FW sub-level pages + PRIMA single "Agent's gear" box] |
| Share Equipment: items marked with a dot in the inventory can be handed to the partner (Interaction menu, both agents near each other) | Xbox/PC, PS2/GC | [CONFIRMED - several sources: XBM, PS2M, PRIMA; shipped feature confirmed by XB477 + PC105 HUD text "Share Equip."] |
| Revive item: one adrenaline syringe per agent per mission on Xbox/PC (two revives per team); two per agent per sub-level on PS2/GC | Xbox/PC; PS2/GC | [CONFIRMED - several sources: XB477 + PC105 training text, XBM, PS2M for Xbox/PC; ONE SOURCE: FW for PS2/GC] |
| Elite mode: firearms start with no ammunition; a reduced non-lethal gadget set | Xbox/PC only | [CONFIRMED - several sources: XBM, RUW, cheat sites, PC105/XB477/XBDLC Elite blocks] |
| Binoculars are not in the co-op kit (Versus spies only) | All console builds | [CONFIRMED - several sources: FW Binoculars page, XBM versus controls] |
| Rope is not an inventory item; ropes exist only at placed rappel and hang spots | Xbox/PC, PS2/GC | [CONFIRMED - several sources: XBM, PRIMA] |

---

## 2. Weapons

### 2.1 SC-20K assault rifle
- **Who carries it.** Both agents, every co-op map, on all console platforms. [CONFIRMED - several sources: RUW, PRIMA gear boxes, FW, map settings files]
- **Magazine size.** 30 rounds. Derived: the maps that give zero spare rifle magazines (Training, Panama, Nuclear Plant, UN HQ) show exactly 30 rounds in the wiki, and each spare magazine adds 30 (1 spare = 60, 2 spare = 90). [ANALYSIS - derived from PC105 map settings + RUW totals, consistent on all seven maps]
- **Calibre.** The Panama locker room holds "5.56 mm" ammo on a bench, which the wiki counts as SC-20K rounds. [ONE SOURCE: FAN (RU) room list]
- **Starting attachment.** `StartupAttach=Launcher` on every co-op map in the map settings, so the rifle starts with the launcher fitted (see section 3). [CONFIRMED - several sources: PC105 map .ini + XB477 / XBDLC map .ini]
- **Load per mission (Xbox/PC Mission mode, per agent):** Training 30, Panama 30, Seoul 90, Chemical Bunker 90, Train Station 60, Nuclear Plant 30, UN HQ 30. Elite: 0 everywhere. (Full tables in section 7.)
- **PS2/GC:** 60 rounds per agent in every sub-level, "SC-20K (with launcher attachment per PRIMA)". [ONE SOURCE: FW for counts; launcher CONFIRMED - several sources: FW + PRIMA PS2 gear boxes]
- **Use in routes.** Mostly for shooting out lights (pistol is the usual tool) and lethal force where allowed; lethal force is forbidden on UN guards and civilians in UN HQ, allowed against the colonel's men there. [CONFIRMED - several sources: FAN + XBDLC/PC105 text for the UN rule; ONE SOURCE: FAN for the colonel's men]
- **N-Gage/DS:** only the Assault class carries it, 30 rounds (+60 in Prison Rescue). See section 9.

### 2.2 SC Pistol (with OCP) and the co-op "jammer"
- **Who carries it.** Both agents, every map, all console platforms. [CONFIRMED - several sources: XBM, PS2M, PRIMA, RUW, FW]
- **Magazine size.** 20 rounds. Derived: maps with zero spare pistol magazines (Training, UN HQ) show 20 rounds; 1 spare = 40 (Train Station), 2 spare = 60 (Panama, Seoul, Chemical Bunker, Nuclear Plant). [ANALYSIS - derived from PC105 map settings + RUW totals]
- **Calibre / file key.** The map settings key is `AmmoClip57` (5.7 mm); Panama's Security 1 room holds "5.7 mm" ammo on a desk. The N-Gage/DS game names the pistol "Five-seveN". [ONE SOURCE: FAN (RU) for the Panama ammo; ONE SOURCE: FW for the Five-seveN name on handhelds; the key name is from PC105 map .ini]
- **Load per mission (Xbox/PC Mission mode):** Training 20, Panama 60, Seoul 60, Chemical Bunker 60, Train Station 40, Nuclear Plant 60, UN HQ 20. Elite: 0. PS2/GC: 40 in every sub-level.
- **General co-op uses.**
  - Shooting out lights (lampposts, chandeliers, neon, room lights, a lit billboard). [CONFIRMED - several sources: PRIMA co-op walkthroughs, RYB]
  - Usable while hanging upside down (Hangover), on Dual Rappel and on a partner's shoulders. [CONFIRMED - several sources: XBM, PS2M, PRIMA]. The suspended Hangover agent can "use secondary weapon (pistol, incl. OCP/jammer)". [CONFIRMED - several sources: XBM, PS2M, PRIMA] (see 02-coop-moves.md)
- **The OCP becomes the co-op jammer.**
  - Names: the manuals call it the "Cooperative-Only Gadget"; PS2M says "OCP, or Jammer"; the Training objective calls it the jammer. [CONFIRMED - several sources: XBM pp.25-26, PS2M, PRIMA, FW OCP page, IGNW training]
  - Use: select the pistol, aim at an electronic object (light, camera, laser emitter, turret or turret control, mobile sensor) and HOLD the secondary trigger. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW]
  - The effect lasts only while the trigger is held and while charge remains. Moving cancels it. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW]
  - The charge drains while held and refills automatically. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
  - Tip: tapping the trigger rapidly stretches the charge. [ONE SOURCE: PRIMA; repeated in PRIMA's PS2/GC Train Station Hydro Tunnel route ("tapping the trigger to save charge")]
  - A light on the gun is red and turns green on a jammable target. This is a visual cue, not an audio one. [CONFIRMED - several sources: XBM p.25, PRIMA; "visual not audio" ONE SOURCE: XBM p.25 via music notes]
  - The FW OCP page says it works like Pandora Tomorrow's Camera Jammer. [ONE SOURCE: FW OCP page]
  - Using the OCP is silent, but some devices crackle when disabled, which can itself lure guards. [ONE SOURCE: 10_ai_detection_and_alarms.md (sources as listed there)]
  - Community: "co-op OCP behaves differently from Sam's" [ONE SOURCE: Steam thread "SC:CT coop" (2022)]; a PS2 thread stresses that OCP jamming in co-op "is not fire-and-forget" (one player keeps aiming and holding the trigger while the other moves). [ONE SOURCE: Reddit 1qfdvur]
  - FAN (RU) PS2/GC Panama Archives: a camera that one OCP/pistol hit disables. [ONE SOURCE: FAN/SHOCK-25 (same author)]
  - A JV poster (platform not stated) describes a flying machine-gun drone in a "sort of museum" that they could neutralise for about 20 seconds (presumably with the OCP) while the partner moved to the door, then swap roles for a camera. [INFERRED / UNCERTAIN: JV only; may be PS2/GC Panama East Wing or the Xbox Exposition Room]
- **Why it matters.** Because the jammer holds a device off only while someone stands still holding it, one player cannot get both agents past a camera alone: every camera, laser or turret becomes a two-person gate. It is the most-used co-op tool. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW] (design reading of this in 03-mechanics.md)
- **Level patterns built on the jammer** [CONFIRMED - several sources: PRIMA, IGNW, FW]:
  - Jam-and-pass, then swap: Training camera; Panama "Broken Elevator" corridor (one agent OCPs the overhead light while the other slips past the camera); Panama Exposition Room laser grid (one agent aims at the glowing red breaker box, which sits inside the grid; used in both directions); PS2/GC throughout.
  - Turret flank: one agent jams an automatic turret while the partner runs behind it to its control panel and switches it off (Xbox/PC Seoul hotel, Seoul fish-market boat [ONE SOURCE: RYB], Train Station repair yard). EMF vision helps find the turret. IGNW warns the jam must not lapse while the partner crosses. In-game note: "you can disable a turret using the jammer". [CONFIRMED - several sources: PRIMA, RYB, IGNW, FW/RUW note]
  - Light kill: one agent holds an overhead light off so the partner can drop unseen (PS2/GC Seoul Streets, where the high agent must knock out the hall patrol "before the OCP charge runs out"). [ONE SOURCE: PRIMA]
  - Escort: jam a camera while the partner walks a captive to a scanner (PS2/GC Panama Server Room). [ONE SOURCE: PRIMA]
  - Turret leapfrog: PS2/GC Seoul Gardens (two turrets that cannot be shut off, only suppressed), Cyber-Cafe, Train Station Subway stairs ("cover me"). [CONFIRMED - several sources: PRIMA + RUW for the Gardens turrets]
  - Sensor leapfrog: PS2/GC Chemical Bunker mobile ceiling sensors and cameras. [ONE SOURCE: PRIMA]
  - Jam-and-hack: PS2/GC Train Station Hydro Tunnel (one jams the camera guarding a laptop, tapping to save charge, while the other hacks). [CONFIRMED - several sources: PRIMA + Ziggity]
  - In-level justification: a Panama email jokes that the laser grid's emergency breaker sits inside the grid, so only a "microwave ray" could reach it. [CONFIRMED - several sources: PRIMA + FAN]
- **PS2/GC Team Training:** "No jammer is listed for PS2" in FAN's table. [INFERRED / UNCERTAIN: FAN; the tables may list only weapons and consumables]. PS2M names the OCP/Jammer as the co-op-only gadget and PRIMA's PS2/GC routes use it constantly. [CONFIRMED - several sources: PS2M, PRIMA]
- **N-Gage/DS:** the Hacker's sticky shocker gun does the electronics-disabling job instead (section 9).

### 2.3 Knife
- **Normal missions.** Close-quarters kills. Example: in Train Station (Xbox/PC) the agent who took the antidote stabs the infected soldier in the washroom (a scripted kill). [CONFIRMED - several sources: PRIMA, FAN (RU)]. Perfect-score runs exist despite it, so the scripted kill is evidently exempt from scoring. [ONE SOURCE: PRIMA rules + hexen2k7 100% Elite run]
- **Elite mode.** XBM: firearms start with no ammunition and the knife becomes available to kill with. PRIMA instead words Elite as "restricted to non-lethal weapons". The research notes judge PRIMA's wording a looser paraphrase and let the manual wording win. [CONFIRMED - several sources: XBM + Cheat Index/ChapterCheats/IGN wiki (identical user text, counted once) + multiplayer.it for the knife; whether the knife is truly usable in Elite stays INFERRED / UNCERTAIN: XBM vs PRIMA]
- A cheat site lists "Elite: complete Story mode, knife only" under PS2, probably copied from Xbox entries; the PS2 manual has no Elite mode. [INFERRED / UNCERTAIN: cheat sites]
- Solo comparison: knife-point interrogations are praised as playing "like a radio drama" (PC Games DE). [ONE SOURCE: PC Games DE; solo context]

### 2.4 What is usable in co-op, per platform

| Weapon / item | Xbox/PC Mission | Xbox/PC Elite | PS2/GC | N-Gage/DS |
|---|---|---|---|---|
| SC-20K | Yes, both agents | Carried, 0 rounds | Yes, 60 | Assault only, 30 |
| Launcher attachment | Fitted on both (`StartupAttach=Launcher`) | Fitted on both | Yes (PRIMA gear boxes) | Not described |
| Sniper / shotgun / foregrip attachments | Never issued (capacity keys only, section 3) | Never issued | Not documented | Not documented |
| SC Pistol + OCP jammer | Yes, both | Carried, 0 rounds; jammer function not documented separately | Yes, 40 | Assault: Five-seveN 30; jammer not present |
| Knife | Yes (scripted kill in Train Station) | XBM: the kill tool | Not documented separately | Not documented |
| Sticky camera | Yes | 1 each (wiki) | Yes | Assault only, 3 |
| Sticky shocker | Agent One (both in UN HQ) | Agent One in Panama/NP/UN HQ | Not in kit | Hacker only, unlimited |
| Ring airfoil round | Agent One in Seoul/Chem/Train; both in UN HQ | Both in Panama/NP/UN HQ | Not in kit | Not in kit |
| Gas grenade | Training only (1 each, files) | Agent One x4 in Seoul/Chem/Train; 1 each in Training | Not in kit | Not in kit |
| Frag grenade | Agent Two in Seoul/Chem/Train | Not in kit | Train Station (1 each; R-18) | Assault, 3 |
| Flash grenade | Varies (section 7) | Agent Two (2 or 4) | Most sub-levels, 1 | Hacker, 3 (flashbang) |
| Smoke grenade | Agent Two in Panama/NP; both in UN HQ | Not in kit | Not in kit | Not in kit |
| Chaff grenade | Not in kit | Not in kit | Not in kit | Hacker, 3 |
| Wall mine (as a weapon to place) | Not issued (capacity key only) | Not issued | Level pickups | Not documented |
| Adrenaline syringe | 1 each | 1 each | 2 each | Health pack 1 each |
| EEV | Bound to a key; usability R-02 | Same | Not documented | Not documented |
| Binoculars | No | No | No | No |

[Sources per cell are given in sections 2 to 9.]

---

## 3. Rifle attachments

- **Launcher.**
  - Game files: `StartupAttach=Launcher` on all seven co-op maps (Xbox/PC). [CONFIRMED - several sources: PC105 map .ini + XB477 / XBDLC map .ini]. The Nuclear Plant and UN HQ settings give the launcher to host AND client. [CONFIRMED - several sources: XBDLC + PC105 ini]
  - PRIMA's Xbox/PC gear boxes list the "launcher attachment" in Agent One's box for Chemical Bunker, and in the Agent Two box for Train Station. [ONE SOURCE: PRIMA (OCR-damaged)]. Earlier source summary (06_gadgets_and_tools.md, coop_gadgets_controls_comms.md) said "Agent One's gear box includes the launcher attachment"; the game files show both agents start with it. [ANALYSIS - reconciliation; the files are the stronger source]
  - What it fires in co-op: sticky cameras, sticky shockers and ring airfoil rounds. [CONFIRMED - several sources: PRIMA, RUW]
  - The launcher appears to start loaded with one sticky camera: the wiki's sticky-camera totals are always the file count plus one, while shocker and airfoil counts match the file exactly. In Elite (no `StickyCamera` key) the wiki still lists sticky cam 1 for each agent. [ANALYSIS - derived from the PC105 map settings vs RUW totals on all seven maps]
  - PS2/GC: PRIMA's PS2 gear boxes list "SC-20K + launcher" / "sticky camera + launcher attachment". [CONFIRMED - several sources: FW + PRIMA PS2 gear boxes]
- **Sniper, shotgun, foregrip.**
  - Not mentioned for co-op in any written source (manuals, PRIMA, wikis). [UNKNOWN - see 06-open-questions.md (no R-number; listed as a gap in 06_gadgets_and_tools.md §5)]
  - The map settings carry a max-capacity block that includes `AmmoClipShotgun=5` and `AmmoClipSniper=5` (Panama example), but no co-op map issues a shotgun or sniper magazine, and `StartupAttach` is `Launcher` on every map. [ONE SOURCE: PC105 map ini; the meaning of the block as carry limits is INFERRED / UNCERTAIN]. Reading: the engine has the keys but the co-op kit never hands these attachments out; whether they can be found as level pickups is not documented. [ANALYSIS]
  - No foregrip key appears in the supplied values. [ANALYSIS - absence in the supplied data]

---

## 4. Gadgets and items, one by one

### 4.1 Sticky camera
- **What it does.** Launcher-fired onto surfaces for scouting. It can make a noise (the "clicker") to lure guards and release knockout gas; gassing destroys the camera. [CONFIRMED - several sources: PS2M gadget text, XBM, PRIMA, FW]
- **Share View (co-op only).** When one agent uses a sticky camera, the partner can pick "Accept View Sharing" in the Interaction menu to watch the feed. Share View works at any distance. It is disabled in split-screen (you can see the other half). [CONFIRMED - several sources: XBM, PS2M, PRIMA; split-screen rule ONE SOURCE: XBM] (see 02-coop-moves.md)
- **Route uses** [ONE SOURCE: PRIMA unless marked]:
  - Gas a lone guard: Xbox/PC Chemical Bunker crate hall; Train Station sewer (second guard).
  - Lure two guards with camera noise and gas them together: PS2/GC Panama East Wing reception hall (Agent Two fires at the far wall); PS2/GC Seoul Cyber-Cafe (both agents fire at the south wall near the dartboard); PS2/GC Train Station Subway.
  - Watch a guard round a corner: PS2/GC Panama East Wing.
  - Archive set-up: PS2/GC Panama Archives (Agent One sticks a camera near the far door and gasses the guard who enters).
  - Simultaneous takedowns: PS2/GC Chemical Bunker Storage Room (sticky-cam gas on the lower patrol at the same moment as a ledge-grab pull-over) and The Docks (gas plus a blow to the head).
  - Spotter: PS2/GC Train Station Hydro Tunnel (one spots with a sticky camera while the other takes a walkway guard and a floor guard).
  - Lure technicians away if they linger: PS2/GC Chemical Bunker Laboratories.
  - Read a keypad code: in UN HQ the security-room keypad code (250282, marked "secret") can be learned by luring guards to the keypad and watching them type it through a sticky camera plus thermal or night vision; alternatively push a knocked-out guard into another guard, which lowers the stealth rating. [ONE SOURCE: FAN (EN/RU); code also on the Fandom keypad-codes page, same source]
- **Counts, Xbox/PC Mission mode (per agent, Agent One / Agent Two):** Training not listed / not listed; Panama 2 / 1; Seoul 1 / 4; Chemical Bunker 4 / 1; Train Station 1 / 3; Nuclear Plant 2 / 1; UN HQ 4 / 4. Elite: 1 / 1 (wiki). File counts are spares (section 7). [CONFIRMED - several sources: RUW + PC105/XB477/XBDLC map settings]
- **PS2/GC:** 1 per agent in Seoul (all five), Chemical Bunker (all five) and Panama Alley; 2 per agent in Train Station (all four) and Panama East Wing, Archives, Server Room; none in Team Training. [ONE SOURCE: FW counts; item CONFIRMED - several sources: FW + PRIMA]
- **Correction note.** RUW's Chemical Bunker table gives the 4 sticky cameras to Agent One while its Seoul table gives them to Agent Two; the Chemical Bunker research note called this "possibly a wiki inconsistency" [INFERRED / UNCERTAIN at the time]. The game files confirm both: Seoul client `StickyCamera=3` (4 total), Chemical Bunker host `StickyCamera=3` (4 total). [CONFIRMED - several sources: PC105 map .ini + XB477]
- **GameCube solo aside:** the GC version has a GBA link-cable feature (commands / sticky-camera feed on the GBA), solo only. [CONFIRMED - several sources: GameRevolution GC review + GF preview, per platforms notes]

### 4.2 Sticky shocker
- **What it does.** One-shot knockout. [CONFIRMED - several sources: RUW, PRIMA]. RUW calls it "electro-cartridge". [ONE SOURCE: RUW]
- **Who has it (Xbox/PC):** Agent One only on Panama (1), Seoul (3), Chemical Bunker (3), Train Station (3), Nuclear Plant (1); BOTH agents in UN HQ (3 each, game files). Elite: Agent One only, 1, in Panama, Nuclear Plant, UN HQ. [CONFIRMED - several sources: RUW + map settings; UN HQ "both" CONFIRMED - several sources: XBDLC + PC105 ini]
- **Earlier claim superseded.** 06_gadgets_and_tools.md and coop_gadgets_controls_comms.md say "Agent One only (Xbox/PC)"; RUW's UN HQ table also gives shockers only to Agent One. The UN HQ game files give both agents 3. [Corrected by the gap-closing pass, game files over wiki]
- **Route uses** [ONE SOURCE: PRIMA]:
  - Seoul cafe (Xbox/PC): Agent One climbs the red crates onto a narrow ledge and knocks Jong out through the cafe's open window with a sticky shocker from outside, sidestepping his flight.
  - Train Station (Xbox/PC): a sticky shocker on the guard by the phone booths.
  - Nuclear Plant: a German Let's Play part title "the one taser" fits Agent One's single shocker. [INFERRED / UNCERTAIN: RednBlue2k9 titles]
- **Friendly fire / bug.** An IGN wiki Xbox glitch tip has one agent hit the other with a sticky shocker and notes "friendly fire must be on". FW Panama trivia: being shocked while hacking leaves an agent invisible but unable to open doors. [ONE SOURCE each: IGNW; FW. Friendly-fire option: Xbox match creation has a FRIENDLY FIRE setting (ONE SOURCE: XB477 `PreGameMenus.int`); PC has no menu option and `SplinterCell3Settings.ini` sets `b_friendlyFire=true` (ONE SOURCE each; PC conclusion INFERRED / UNCERTAIN; see 06-open-questions.md, R-08)]
- **PS2/GC:** not in the co-op kit. [CONFIRMED - several sources: RUW + PRIMA, as stated in the source]
- **N-Gage/DS:** the Hacker's main weapon, unlimited (section 9).

### 4.3 Ring airfoil round
- **What it does.** A blunt projectile that knocks out in one hit in CT. [CONFIRMED - several sources: RUW tables + PRIMA Chemical Bunker box; KO rule from FW]
- **Who has it (Xbox/PC Mission):** Agent One, 3, in Seoul, Chemical Bunker, Train Station; BOTH agents, 3 each, in UN HQ (game files). None in Training, Panama, Nuclear Plant. [CONFIRMED - several sources: RUW + map settings]
- **Elite:** one each for BOTH agents in Panama, Nuclear Plant and UN HQ (so in Elite Agent Two also gets an airfoil). [CONFIRMED - several sources: RUW + map settings Elite blocks]
- **Earlier claim superseded.** "Agent One only (Xbox/PC)" (06, coop_gadgets notes) is true in Mission mode except UN HQ, and not true in Elite. [Corrected from game files]
- **PS2/GC:** not in the co-op kit. [ANALYSIS - absent from every FW PS2/GC table]

### 4.4 Gas grenade
- **File key.** `GazGrenade`. [ONE SOURCE: PC105 map .ini as supplied]
- **Xbox/PC Training:** the map settings give each agent ONE gas grenade, in both Mission and Elite; the wiki loadout omits it. [ONE SOURCE: game files (PC105, matching XB477 per the gap pass)]
- **Xbox/PC Elite:** Agent One (host) gets 4 in Seoul, Chemical Bunker and Train Station ("gas grenades instead of frags"). [CONFIRMED - several sources: RUW + map settings]
- **Pickup:** +1 gas grenade in UN HQ. [ONE SOURCE: RUW]
- **Capacity block:** `GazGrenade=3` (Panama example). [ONE SOURCE: PC105 map ini; meaning INFERRED / UNCERTAIN]
- **Earlier claim superseded.** "Gas grenade: Elite loadouts only (Agent One) + 1 pickup in UN HQ" (06 §3.3, coop_gadgets notes, RUW) misses the Training gas grenade in the files.
- Note: the commonest co-op gas source is the sticky camera's knockout gas, not the grenade. [ANALYSIS]

### 4.5 Frag grenade
- **Xbox/PC:** Agent Two (client), 2, in Seoul, Chemical Bunker, Train Station. None in Elite. [CONFIRMED - several sources: RUW + PRIMA + map settings]
- **PS2/GC:** both agents, 1, in Train Station (all four sub-levels) per FW; PRIMA's PS2 gear box (OCR) shows a flash grenade instead. [ONE SOURCE: FW; conflict with PRIMA; UNKNOWN - see 06-open-questions.md, R-18]
- **Community reading:** "The red agent has a more lethal loadout than the blue host." [ONE SOURCE: Steam thread "SC:CT coop" (2022)]
- **Capacity block:** `FragGrenade=4` (Panama example). [ONE SOURCE: PC105 map ini]

### 4.6 Flash grenade (flashbang)
- **What it does.** Blinds. [CONFIRMED - several sources: FW/RUW loadouts + PRIMA]
- **Xbox/PC Mission counts (Agent One / Agent Two):** Training 0 / 0; Panama 0 / 2; Seoul 2 / 0; Chemical Bunker 0 / 2; Train Station 2 / 0; Nuclear Plant 0 / 2; UN HQ 3 / 3 (files; wiki gives only Agent Two 3). [CONFIRMED - several sources: RUW + map settings]
- **Xbox/PC Elite:** Agent Two 2 (Panama, Nuclear Plant, UN HQ) or 4 (Seoul, Chemical Bunker, Train Station). [CONFIRMED - several sources: RUW + map settings]
- **PS2/GC:** 1 per agent in Team Training, Seoul (all except Gardens), Chemical Bunker (all five), Panama (all four). [ONE SOURCE: FW; CONFIRMED - several sources: FW + PRIMA for the Alley]
- **Route uses** [ONE SOURCE: PRIMA]:
  - PS2/GC Chemical Bunker Silo: flash two guards near insertion, rush and knock them out.
  - PS2/GC Chemical Bunker Cryogenic Chamber: Agent Two throws a flash as the elevator doors open; both grab a stunned guard and force them through twin retinal scanners together.
- **Capacity block:** `FlashGrenade=2` (Panama example), although UN HQ issues 3. [ANALYSIS - the capacity block was quoted only for Panama, so it may differ per map]
- **Note on the asymmetry claim.** "Agent Two carries the hand grenades" is the general pattern, but Agent One carries the flashbangs in Seoul and Train Station. [ANALYSIS - from RUW + files]

### 4.7 Smoke grenade
- **Xbox/PC Mission:** Agent Two, 2, in Panama and Nuclear Plant; BOTH agents, 3 each, in UN HQ (files; wiki gives only Agent Two 3). [CONFIRMED - several sources: RUW + map settings; ONE SOURCE: RUW for the Agent-Two-only claim, superseded]
- **Pickup:** two smoke grenades in the back of the Seoul extraction truck (also an in-game note). [CONFIRMED - several sources: RYB + RUW + XB477/PC105 notes text]
- **Route uses:** Seoul cafe front-door route: door-bash plus the partner's smoke grenade breaches 2-3 guards upstairs. [ONE SOURCE: RYB]. V339's Seoul 3 run "avoided many forced engagements with careful smoke grenades". [ONE SOURCE: V339 video description] (Neither agent's Seoul starting kit has smoke, so these come from the truck pickup. [ANALYSIS])
- **PS2/GC:** not in the kit. [ANALYSIS - absent from FW tables]
- **Capacity block:** `SmokeGrenade=4` (Panama example). [ONE SOURCE: PC105 map ini]

### 4.8 Chaff grenade / EMP
- **Chaff (console co-op):** not in any console co-op loadout and not among the supplied capacity keys. [ANALYSIS - absence in RUW, FW and the supplied file values]
- **Chaff (N-Gage/DS):** the Hacker carries 3 ("electronics-disabling grenades"); the game text says a chaff grenade disables all electronics in range for 20 seconds; +2 in Prison Rescue. [ONE SOURCE: FW (kit); ONE SOURCE: NG-TXT (20 seconds)]
- **EMP charge (PS2/GC Panama):** PRIMA's East Wing route needs an explosive charge, planted from a partner's shoulders on the elevator shaft wall to blow open the car's trapdoor; FAN (RU) calls it an "EMP charge" and counts one as used ("one EMP charge used to open the elevator"); a video summary lists "an EMP charge to open an elevator". The loadout tables do not list it, so it is presumably found or contextual. [CONFIRMED - several sources: PRIMA + FAN for its use; source of the item INFERRED / UNCERTAIN]
- **EEV laser designation** is a separate engine action (see 4.13).

### 4.9 Wall mine
- **Console co-op role.** A level pickup and a hazard to disarm; no co-op map issues wall mines at the start. [CONFIRMED - several sources: FW + PRIMA]
- **PS2/GC pickups (wall mines picked up):** Seoul Streets +1 (2nd-floor wall), Seoul Fish Market +1 (pilings near the stairs), Chemical Bunker The Docks +2 (near the boat), Train Station Repair Station +4, Hydro Tunnel +1, Subway +1 (pillar). [ONE SOURCE: FW (EN/RU), echoing SHOCK-25; Seoul and Docks positions CONFIRMED - several sources: PRIMA + RUW]
- **Disarming.** PRIMA's PS2/GC route repeatedly has agents disarm wall mines; EMF vision helps spot them. [ONE SOURCE: PRIMA]. On Normal and Hard a wall mine can be disarmed on a green or red light; on Expert only on green. [CONFIRMED - several sources: FW Difficulty + PRIMA + XBM]
- **Laser mines.** SHOCK-25's PS2 stats count the Train Station laser-linked bombs as "laser mines disarmed" (1 + 2 + 1). [CONFIRMED - several sources: PRIMA + SHOCK-25]
- **Capacity block:** `WallMine=1` (Panama example). [ONE SOURCE: PC105 map ini]
- **N-Gage/DS:** mines on the route can be shot to destroy them; a shocker hit disables them for a while (FW-RU). [ONE SOURCE: FW (EN + RU)]

### 4.10 IR stress generator
- Appears only as a capacity key, `InfraRedStressGen=2` (Panama example). No co-op map issues it and no source describes it in co-op. [ONE SOURCE: PC105 map ini; function in co-op UNKNOWN - see 06-open-questions.md (no R-number)]

### 4.11 Camera jammer
- Not a separate co-op item. The FW OCP page says the co-op OCP works like Pandora Tomorrow's Camera Jammer (the FW "Camera Jammer" page was read for this). [ONE SOURCE: FW] See 2.2.

### 4.12 Explosive charge
- **Placed from a partner's shoulders, detonated remotely.** Xbox/PC Seoul: a charge on the rear of each of the two Chun-Ma anti-aircraft vehicles, detonated from a sewer tunnel (vehicle 1). In-game note: disable the tanks by climbing on each other's shoulders. [CONFIRMED - several sources: PRIMA + IGNW + RUW note]
- PS2/GC Seoul Gardens: shoulder-stand to place the charge on the one anti-aircraft vehicle. [ONE SOURCE: PRIMA]
- PS2/GC Panama East Wing: the elevator trapdoor charge (see 4.8). [CONFIRMED - several sources: PRIMA + FAN]
- PS2/GC Train Station Repair Station: Agent One blows an iron gate with an explosive charge (SHOCK-25 stats: "1 explosive charge used to open a door"); not in FW's table. [ONE SOURCE: PRIMA, matched by SHOCK-25]

### 4.13 EEV (remote scan / hack device)
- **PRIMA:** the EEV cannot be used in co-op, so there is no remote hacking from range; all hacking is done in person. [ONE SOURCE: PRIMA]
- **XBM:** the Xbox co-op controller diagram still labels the right-stick click "EEV". [ONE SOURCE: XBM]
- **Game files:** the PC `SplinterCell3User.ini` binds key 4 to EEV mode; the shared Xbox controller layout labels a button "camera / EEV". The engine has EEV actions for scan, distance hack, remote access and laser designation. No co-op map, loadout or menu string enables or disables EEV specifically, and no co-op objective or note mentions it. [ONE SOURCE: PC105 / XB477]
- **Status:** [UNKNOWN - see 06-open-questions.md, R-02]. Needs an in-game check.
- **Context:** in CT the EEV replaced the binoculars for solo; binoculars survive only in the Versus spies kit. [CONFIRMED - several sources: FW Binoculars page, XBM versus controls]. Music notes: "CT also adds EEV, which co-op agents cannot use". [CONFIRMED - several sources as tagged there: Fandom goggles page, NWR, PRIMA co-op exceptions]
- **Translation guide entry (original name):** "EEV (remote hack/scan, disabled in co-op)". [ANALYSIS - 14_translation_guide.md §2]

### 4.14 Optic cable
- Peek under doors. Used in co-op on Xbox/PC Panama (IGNW) and PS2/GC Panama Archives ("A1 optic-cables the next door, enters when the patrol turns away and knocks out the guard"). [ONE SOURCE each: IGNW; PRIMA]
- N-Gage/DS: "optic cable" is one of the 37 interaction verbs in the N-Gage text. [ONE SOURCE: NG-TXT]

### 4.15 Lock pick and breaking locks
- Pin-sequence lock picking; breaking a lock is faster but noisy. [CONFIRMED - several sources: FW, PRIMA ("break the lock"), IGNW ("pick lock"); PS2M lock-picking rules]
- **Pin counts seen in co-op:**
  - UN HQ (Xbox/PC): seven locks, all 6-pin (the hardest tier), plus a keypad. [ONE SOURCE: FAN]
  - Seoul 3 (Xbox/PC): 2-4 pins: booth 4-pin, hotel entrance 2-pin, hotel room 4-pin, cyber-cafe exit 4-pin. PRIMA has the agents simply "break" locks; RYB: break (do not pick) Jong's lock before he flees. [ONE SOURCE: FAN; RYB]
  - Train Station (Xbox/PC): Warehouse 5-pin; locks on Bomb 1 and Bomb 3 rooms (probably alternative routes). [ONE SOURCE: FAN; inference INFERRED / UNCERTAIN]
  - PS2/GC Train Station Subway: 6-pin lock on the exit to the station (SHOCK-25 picks a 6-pin lock on the last door at 26:20). [CONFIRMED - several sources: FAN + SHOCK-25]
  - PS2/GC Chemical Bunker Silo: 3-pin lock on the door to Laboratories (Agent Two breaks it). [CONFIRMED - several sources: PRIMA + FAN]
  - PS2/GC Seoul Fish Market: "4-stage door lock". [ONE SOURCE: video summary]
- N-Gage/DS: a three-pin stylus pick on DS (FW notes "1-2-3"); which class picks locks is unknown. [ONE SOURCE: FW; UNKNOWN - see 06-open-questions.md, R-23]

### 4.16 Hacking (computers, keypads, retinal scanners)
- Done by touch. Failure can trip alarms (solo rule); in Training a failed retinal-scanner hack costs health. Hacking is harder on Expert. An agent can hack while hanging upside down. [CONFIRMED - several sources: PS2M, FW/RUW, PRIMA]
- When one agent gets information from a computer, BOTH agents' OPSATs update. [CONFIRMED - several sources: XB477 + PC105 training text]

### 4.17 Adrenaline syringe (revive item)
- **Equipment entry:** "Adrenalin Syringe" (internal `REVIVESYRINGE`), an experimental adrenaline boost injected into an incapacitated person's torso. HUD interaction: Heal Teammate. PC default key: Insert = revive. [CONFIRMED - several sources: Equipments.int / HUD.int in XB477 + PC105; PC ini]
- **Effect:** restores about half health (RUW: 50%) within a window of about 30 seconds, otherwise the mission fails. [CONFIRMED - several sources: XBM, PS2M, PRIMA, RUW, PCDVD manual p.13]
- **Count, Xbox/PC:** one per agent per mission, so two revives per team. Co-op Training pop-up: each agent carries one adrenaline boost, so the revive can only be done twice per mission; you heal your partner if you have a syringe by standing over him and interacting. Both manuals: revive only "twice per game". [CONFIRMED - several sources: XB477 + PC105 `P_00_Training_COOP.int`, XBM, PS2M; see 06-open-questions.md, R-03 (closed for Xbox/PC)]
- **Superseded claim:** PRIMA's co-op basics page says each agent carries TWO adrenaline shots. That is wrong for Xbox/PC; PRIMA's own Xbox/PC gear boxes and RUW tables give 1 per agent. [Corrected by the in-game training text]
- **Count, PS2/GC:** 2 per agent per sub-level. [ONE SOURCE: FW; not checked in game files (no PS2/GC data available); UNKNOWN - see 06-open-questions.md, R-03]
- **Both down at once:** no string found (the menu has a game-over state that waits for the teammate). [UNKNOWN - see 06-open-questions.md, R-03]
- **Exploit:** in Chemical Bunker (Xbox/PC) a player can skip the lift by jumping down the shaft onto/near the partner and then being revived (fall damage downs rather than kills). [ONE SOURCE: RUW]
- No adrenaline key appears among the non-zero map-settings values supplied for this file. [ANALYSIS - the one-each rule comes from the training text]
- **N-Gage/DS:** a health pack (50 HP) per player; "heal ally" within 30 seconds. [ONE SOURCE: NG-TXT]

### 4.18 Medical kits (wall cabinets)
- Used in co-op as in solo. One in Training's laser room; three in Seoul (hotel bathroom, the fish store after the sewers, by the cafe door). IGNW Seoul tells players to "use meds". [CONFIRMED - several sources: RUW Training + RUW Seoul + RYB + IGNW]
- Restore full health on Normal, 50% on Hard, less on Expert. [CONFIRMED - several sources: FW Difficulty + PRIMA]
- Bug: saving with the medkit cabinet open destroys the kit (Seoul). [ONE SOURCE: RYB]

### 4.19 Mission items
- **Antidote (Train Station, Xbox/PC):** only one agent can take the antidote, so only he can enter the infected soldier's washroom; entering without it kills. [CONFIRMED - several sources: RUW + PRIMA]
- **Toxin vial** from the infected soldier (Train Station opportunity). [CONFIRMED - several sources: PRIMA + FAN]
- **Bug for the payphone** (Train Station main hall, planted from a Hangover). [CONFIRMED - several sources for the objective; method ONE SOURCE: PRIMA]
- **Chimpanzee blood serum, anti-virus sample, viral sample (Chemical Bunker).** Blood type A, B or O randomised per run; vial count conflicts (Neoseeker: take all three; Steam 2014: one per player; RUW: one type per agent, wrong picks block the chamber; PRIMA: collect the needed sample). [CONFIRMED - several sources for randomisation; vial count UNKNOWN - see 06-open-questions.md, R-16]
- **Fuse (PS2/GC Panama Server Room):** fetched from a Hangover down a shaft and slotted to open a gate. [ONE SOURCE: PRIMA]
- **Videotape** of the chimp autopsy (Chemical Bunker opportunity). [CONFIRMED - several sources: FAN + PRIMA]

### 4.20 Not in the co-op kit
- **Binoculars:** Versus spies only. [CONFIRMED - several sources: FW, XBM]
- **Rope:** contextual only (Dual Rappelling / Hangover spots). [CONFIRMED - several sources: XBM, PRIMA]

---

## 5. Goggle modes in co-op

### 5.1 Modes and how they look
- **Modes:** night vision, thermal and the new electromagnetic (EMF) vision; all are used in co-op. [CONFIRMED - several sources: PRIMA, XBM controls, Fandom goggles page, NWR]
- **EMF look:** electronics shown white on a bluish field on Xbox, with pulsating white electrical objects; on GameCube EMF is reduced to white boxes. [ONE SOURCE: NWR (GC review)]
- **Night vision:** special shaders brighten dark areas so night vision is useful [ONE SOURCE: CGW, Lepage]; the night-vision "whine" is remembered as iconic [ONE SOURCE: Steam 227082455]. A Reddit thread on PC co-op mentions an "NV fix" alongside the 35 fps cap. [ONE SOURCE: Reddit 1m3rm7z]
- **Overlay framing:** thermal and night-vision overlays slide over the HUD like a lens, "as if through Fisher's eyes". [ONE SOURCE: GF]
- **Goggle glow:** the PC SM3.0 HDR path adds bloom to the goggle glow (wider dynamic range, bigger glow, more bloom on the "headset" glow; 16-bit floating-point buffer). [CONFIRMED - several sources: bit-tech + TechEnclave]. In the fiction enemies cannot see the goggle glow. [ONE SOURCE: Fandom goggles page trivia]
- **Silhouette:** the three-lens goggle silhouette was designed as the hero's recognisable signature. [ONE SOURCE: documentary, SC1 segment]

### 5.2 Controls
- **Xbox co-op diagram (XBM p.20):** D-pad = night / thermal / sticky camera (and EMF); right-stick click = EEV. [ONE SOURCE: XBM]
- **PC:** key 4 = EEV mode in `SplinterCell3User.ini` [ONE SOURCE: PC105]. Other PC vision keys are not given in the sources. [UNKNOWN]
- **N-Gage:** key 3 cycles thermal / night / normal (Quick guide controls PDF in the media kit). [ONE SOURCE: N-Gage Media Preview Kit]
- **DS:** the touch screen has buttons for vision modes, weapons and inventory. [CONFIRMED - several sources: IGN DS review + NWR press release]

### 5.3 What each mode does in co-op
- **Thermal:**
  - Shows which bomb wire is live: Xbox/PC Chemical Bunker missile warhead (both use thermal to find their live wire and cut together) and Train Station bombs (the live wire pulses and changes over time). [CONFIRMED - several sources: PRIMA + FAN email + AT + EG]
  - Players' procedure (all platforms): both agents select the bomb; each switches to thermal to find the hot wire; both cut at the same moment; repeat for a second wire before a timer runs out. A Brazilian PS2 player: turn thermal on to see which wire glows, turn it off, then cut that wire; the cut is the X button on PS2. [CONFIRMED - several sources: 6+ YouTube comments on PC, PS2, GameCube uploads]
  - PS2/GC: thermal OR controller vibration shows the live wire; a PS2 uploader says it is hard without vibration. [CONFIRMED - several sources: PRIMA + Ziggity description/comments]
  - Blood-serum sequence in Chemical Bunker (RUW "thermal-vision trick"). [ONE SOURCE: RUW]
  - Door-bash a guard in the Seoul cafe bar, timed with thermal vision. [ONE SOURCE: RYB]
  - Reading keypad codes typed by guards through a sticky camera (UN HQ; thermal or night vision). [ONE SOURCE: FAN]
  - Partners must talk ("left wire is hot"). [ANALYSIS - from 06 §4 and music notes]
- **EMF (electromagnetic):** spots cameras, turrets and wall mines; used constantly on the PS2/GC route (e.g. PS2/GC Panama East Wing: EMF plus OCP to disable a wall camera; Archives: EMF plus OCP on the north-wall camera; PS2/GC Train Station Hydro Tunnel: EMF plus OCP on the laptop camera). [CONFIRMED - several sources: PRIMA, XBM]
- **Darkness alone:** ordinary (non-thermal) cameras can be beaten by darkness alone. [ONE SOURCE: IGNW tip]
- **Night vision vs guards:** in PS2/GC Seoul an alarm spawns one masked NVG enemy. [ONE SOURCE: RUW]

### 5.4 Goggle lamps: telling the agents apart
- Each agent's goggle lamps glow a different colour: **blue for Agent One, red for Agent Two**. [Colours CONFIRMED - several sources: FW Agent One/Agent Two pages + xisto forum snippet + Steam review "Spy Blue and Spy Red" + WP; the blue = One / red = Two assignment ONE SOURCE: FW]
- Steam: "blue host" (Agent One = host). [ONE SOURCE: Steam thread "SC:CT coop" (2022)]
- Early CT screenshots had both agents with blue goggle lights before red/blue were split. [ONE SOURCE: Fandom]
- **Split-screen:** split-screen is vertical (Agent 1 on the left, Agent 2 on the right; two controllers needed); the xisto snippet describes one red light and one blue on vertical split-screen. [ONE SOURCE: PRIMA for the layout; xisto snippet for the lights]. Share View is disabled in split-screen. [ONE SOURCE: XBM]. A split-screen OPSAT layout file (`opsat_split.mgb`) exists on Xbox. [ONE SOURCE: XB477]
- **Where split-screen exists:** Xbox (plus System Link and Xbox Live); PS2 and GameCube (split-screen only). PC has NO native split-screen co-op: the PC menu is LAN / Online / Settings, and "SPLIT SCREEN" strings are Xbox leftovers. [CONFIRMED - several sources: XBM, PRIMA, WP, GF for Xbox/PS2; PC105 + PCDVD manual for PC; R-13 closed]. Earlier claim superseded: PRIMA listed split-screen for PC. [Corrected by the PC menu files]
- **Partner marker:** no on-screen partner marker is described in any manual or PRIMA; the OPSAT map legend (Alarm, Objective, Player, Location, Triggered Alarms) has no teammate entry. [UNKNOWN - see 06-open-questions.md, R-11] The lamp colour is the documented way to tell the agents apart. (see 05-hud-and-camera.md)
- **Handhelds:** N-Gage/DS Hacker = blue tag, blue goggles ("Agent One" per FW); Assault = red tag, purple goggles ("Agent Two" per FW). [ONE SOURCE: FW]

---

## 6. Ammunition: magazine sizes, spare vs loaded, pickups

### 6.1 Magazine sizes (Xbox/PC)
- SC-20K: 30 rounds per magazine. SC Pistol: 20 rounds per magazine. [ANALYSIS - derived from map settings vs wiki totals on all seven maps]
- The PS2/GC totals (60 / 40) equal one loaded plus one spare magazine at the same sizes; no PS2/GC settings file was available to check. [ANALYSIS - inference only]

### 6.2 Spare vs loaded (how to read the files)
- The map settings `AmmoClip*` keys count **spare** magazines; the loaded magazine is extra. So `AmmoClipSC20k=2` = 30 loaded + 60 spare = 90 rounds; `AmmoClip57=2` = 20 + 40 = 60; no key (0 spare) = the loaded magazine only (rifle 30, pistol 20). [CONFIRMED - several sources: PC105/XB477/XBDLC map settings + RUW totals agree on all seven maps; the mechanism itself is the researchers' reading, INFERRED / UNCERTAIN, but the numbers match everywhere]
- The same applies to the launcher: `StickyCamera=N` = N spare plus 1 loaded. Sticky shocker and ring airfoil counts are taken as-is. Grenades are taken as-is. [ANALYSIS - derived]
- **Correction note.** An earlier draft of the gap-closing pass read "0 spare magazines" as "no ammunition" (for example "no spare SC-20K magazines for either" in Nuclear Plant, "no spare magazines (pistol or SC-20K)" in UN HQ). That was wrong and was reverted in the final review: weapons still carry their loaded magazine (UN HQ: rifle 30, pistol 20; Nuclear Plant: rifle 30, pistol 60). [Corrected - 00_PROGRESS.md, gap_closing_gamefiles.md]

### 6.3 Ammo pickups per mission (Xbox/PC)

| Mission | Pickups | Where | Confidence |
|---|---|---|---|
| Training Facility | None listed; one medkit in the laser room | Laser room | [ONE SOURCE: RUW] |
| Panama | +60 rifle rounds (2 magazines), +40 pistol rounds (2 magazines) | 5.7 mm ammo on a desk in the Security 1 room; 5.56 mm ammo on a bench in the locker room (3 guards) | [ONE SOURCE: RUW] |
| Seoul 3 | +30 SC-20K rounds; +2 smoke grenades; 3 medkits | Ammo in the small fish store (in-game note); smoke in the back of the extraction truck; medkits in the hotel bathroom, the fish store, by the cafe door | [Ammo ONE SOURCE: RUW, location CONFIRMED by XB477 + PC105 notes; smoke and medkits CONFIRMED - several sources: RUW + RYB] |
| Chemical Bunker | None listed in the sources | - | [UNKNOWN] |
| Train Station | +60 SC-20K, +40 pistol | Not stated | [ONE SOURCE: RUW] |
| Nuclear Plant | +120 SC-20K, +80 pistol ("four magazines of each") | Not stated | [ONE SOURCE: RUW] |
| UN HQ | +60 SC-20K, +40 pistol, +1 gas grenade | Ammo "to the left of the elevator near the turret" on the lower floors, and in the security room | [ONE SOURCE: RUW] |

- Pickup magazine counts are consistent with 30-round rifle and 20-round pistol magazines (Nuclear Plant 120 = 4 x 30, 80 = 4 x 20). [ANALYSIS]
- Elite: ammo found in the level can still be picked up. [ONE SOURCE: cheat text]
- Maps launched directly from a batch file behave like test builds ("lots of ammo, no dialogue"). [ONE SOURCE: Steam discussion 133262738417485094]

### 6.4 PS2/GC pickups
- Wall mines (see 4.9). Explosive / EMP charges used in Panama East Wing and Train Station Repair Station (see 4.8, 4.12). No ammo pickups documented. [ONE SOURCE: FW / PRIMA / SHOCK-25 as tagged above]

---

## 7. Loadouts

### 7.1 Where the numbers come from
- **Xbox/PC wiki totals:** RUW per-mission tables (Mission and Elite), the only Xbox/PC loadout tables (no English equivalent). [ONE SOURCE: RUW]
- **Xbox/PC game files:** the map settings `.ini` of each co-op map, read from the PC 1.05 install (PC105), the Xbox dev-kit build 477 (XB477, base maps) and the Xbox Live download packages (XBDLC, Nuclear Plant and UN HQ). Identical across builds. Keys are per role: host and client. [CONFIRMED - several sources: PC105 + XB477 + XBDLC]
- **Host = Agent One, client = Agent Two.** On every map the host values match the wiki's Agent One and the client values match Agent Two. [ANALYSIS - from the match; Steam "blue host" supports it]
- **PRIMA gear boxes:** one "Agent 1's gear / Agent 2's gear" box per Xbox/PC mission (OCR loses most counts) and one shared "Agent's gear" box per PS2/GC mission. [ONE SOURCE: PRIMA]
- **Verdict:** the wiki totals are confirmed by the game files on all seven maps, except that UN HQ gives BOTH agents an identical kit. [CONFIRMED - several sources: RUW + PC105/XB477/XBDLC]

### 7.2 Raw map-settings values, all seven Xbox/PC co-op maps
Non-zero values only. `AmmoClip*` = SPARE magazines (`AmmoClipSC20k` = SC-20K, `AmmoClip57` = pistol). `StartupAttach=Launcher` on all. [CONFIRMED - several sources: PC105 map .ini, identical in XB477 (base maps) and XBDLC (download maps)]

| Map file | Host (Agent One), Mission | Client (Agent Two), Mission | Host, Elite | Client, Elite |
|---|---|---|---|---|
| `00_Training_COOP` | GazGrenade=1 | GazGrenade=1 | GazGrenade=1 | GazGrenade=1 |
| `01_Panama` | AmmoClip57=2, StickyCamera=1, StickyShocker=1 | AmmoClip57=2, FlashGrenade=2, SmokeGrenade=2 | StickyShocker=1, RingAirfoilRound=1 | RingAirfoilRound=1, FlashGrenade=2 |
| `02_seoulthree` | AmmoClipSC20k=2, AmmoClip57=2, StickyShocker=3, RingAirfoilRound=3, FlashGrenade=2 | AmmoClipSC20k=2, AmmoClip57=2, StickyCamera=3, FragGrenade=2 | GazGrenade=4 | FlashGrenade=4 |
| `03_ChemBunker` | AmmoClipSC20k=2, AmmoClip57=2, StickyCamera=3, StickyShocker=3, RingAirfoilRound=3 | AmmoClipSC20k=2, AmmoClip57=2, FragGrenade=2, FlashGrenade=2 | GazGrenade=4 | FlashGrenade=4 |
| `04_GCS` (Train Station) | AmmoClipSC20k=1, AmmoClip57=1, StickyShocker=3, RingAirfoilRound=3, FlashGrenade=2 | AmmoClipSC20k=1, AmmoClip57=1, StickyCamera=2, FragGrenade=2 | GazGrenade=4 | FlashGrenade=4 |
| `05_NuclearPlant` | AmmoClip57=2, StickyCamera=1, StickyShocker=1 | AmmoClip57=2, FlashGrenade=2, SmokeGrenade=2 | StickyShocker=1, RingAirfoilRound=1 | RingAirfoilRound=1, FlashGrenade=2 |
| `07_UNhq` | StickyCamera=3, StickyShocker=3, RingAirfoilRound=3, FlashGrenade=3, SmokeGrenade=3 | StickyCamera=3, StickyShocker=3, RingAirfoilRound=3, FlashGrenade=3, SmokeGrenade=3 | StickyShocker=1, RingAirfoilRound=1 | RingAirfoilRound=1, FlashGrenade=2 |

- Gap-pass wording for the two download maps (same data): Nuclear Plant: "host gets launcher, 2 pistol clips, 1 sticky camera, 1 sticky shocker; client gets launcher, 2 pistol clips, 2 flash grenades, 2 smoke grenades; no spare SC-20K magazines for either. Elite: host 1 sticky shocker + 1 ring airfoil; client 1 ring airfoil + 2 flash grenades." UN HQ: "both agents get 3 sticky cameras, 3 sticky shockers, 3 ring airfoils, 3 flash, 3 smoke, launcher, no spare magazines (pistol or SC-20K). Elite: host 1 shocker + 1 airfoil; client 1 airfoil + 2 flash." [CONFIRMED - several sources: XBDLC + PC105 ini]
- Internal numbering: base co-op maps are 00-04 (identities 100-105); Nuclear Plant is map 05 / mission 55 / identity 201; UN HQ is map 07 / identity 202; slot 06 is missing. [ONE SOURCE: PC105/XBDLC; Steam 133262738417485094 for the file list]

### 7.3 The max-capacity block
- The settings files also hold a block that reads like carry limits. Panama example: `AmmoClipSC20k=5, AmmoClip57=2, AmmoClipShotgun=5, AmmoClipSniper=5, StickyCamera=3, StickyShocker=3, GazGrenade=3, RingAirfoilRound=3, FragGrenade=4, FlashGrenade=2, SmokeGrenade=4, InfraRedStressGen=2, WallMine=1`. [ONE SOURCE: PC105 map ini; meaning of the block INFERRED / UNCERTAIN: inferred as carry limits]
- Readings [ANALYSIS]:
  - It lists item types never issued in co-op (shotgun and sniper magazines, IR stress generator, wall mine), so the engine supports them.
  - Only Panama's block was quoted; UN HQ issues 3 flash grenades, above Panama's `FlashGrenade=2`, and Nuclear Plant's pickups (4 pistol magazines) exceed `AmmoClip57=2`, so either the block differs per map or it is not a hard limit.

### 7.4 Xbox/PC Mission-mode loadout, totals per agent
Totals = file value plus the loaded magazine / loaded sticky camera (section 6.2). Adrenaline is 1 per agent everywhere (training text). [Totals CONFIRMED - several sources: RUW + map settings, except where noted]

| Mission | Agent One (host) | Agent Two (client) | Derivation notes |
|---|---|---|---|
| Training Facility | SC-20K 30, pistol 20, gas grenade 1, adrenaline 1 | Same | 0 spare magazines. Gas grenade from the files only; the wiki omits it [ONE SOURCE: game files]. Whether a loaded sticky camera is present is not shown (the wiki lists none) [INFERRED / UNCERTAIN] |
| Panama | SC-20K 30, pistol 60, sticky cam 2, sticky shocker 1, adrenaline 1 | SC-20K 30, pistol 60, sticky cam 1, flash 2, smoke 2, adrenaline 1 | Pistol 20 + 2 x 20; host sticky cam 1 + 1 loaded; client 0 + 1 loaded |
| Seoul 3 | SC-20K 90, pistol 60, sticky cam 1, sticky shocker 3, ring airfoil 3, flash 2, adrenaline 1 | SC-20K 90, pistol 60, sticky cam 4, frag 2, adrenaline 1 | Rifle 30 + 2 x 30; client sticky cam 3 + 1 |
| Chemical Bunker | SC-20K 90, pistol 60, sticky cam 4, sticky shocker 3, ring airfoil 3, adrenaline 1 | SC-20K 90, pistol 60, sticky cam 1, frag 2, flash 2, adrenaline 1 | Host sticky cam 3 + 1. PRIMA's box: Agent 1 = launcher attachment, sticky camera, airfoil round, sticky shocker, pistol, adrenaline; Agent 2 = SC-20K 90 rounds, sticky camera, flash grenade, pistol with OCP attachment, frag grenade, adrenaline [CONFIRMED - several sources: RUW + PRIMA] |
| Train Station | SC-20K 60, pistol 40, sticky cam 1, sticky shocker 3, ring airfoil 3, flash 2, adrenaline 1 | SC-20K 60, pistol 40, sticky cam 3, frag 2, adrenaline 1 | 1 spare of each magazine; client sticky cam 2 + 1. PRIMA's Agent Two box: launcher attachment, sticky camera, frag, pistol 40 rounds + OCP, adrenaline x1 [CONFIRMED - several sources: RUW + PRIMA]. Agent One's PRIMA box is lost in the OCR |
| Nuclear Plant | SC-20K 30, pistol 60, sticky cam 2, sticky shocker 1, adrenaline 1 | SC-20K 30, pistol 60, sticky cam 1, flash 2, smoke 2, adrenaline 1 | Same kit as Panama. [CONFIRMED - several sources: RUW + XBDLC + PC105] |
| UN HQ | SC-20K 30, pistol 20, sticky cam 4, sticky shocker 3, ring airfoil 3, flash 3, smoke 3, adrenaline 1 | **Identical** | 0 spare magazines; sticky cam 3 + 1. [CONFIRMED - several sources: XBDLC + PC105]. The wiki splits it: Agent One sticky cam 4, shocker 3, airfoil 3; Agent Two sticky cam 4, flash 3, smoke 3 [ONE SOURCE: RUW, superseded by the files]. Earlier note in the UN HQ research: "8 sticky cameras, 3 shockers, 3 airfoils" for the team [superseded: the files give 8 sticky cameras, 6 shockers, 6 airfoils, 6 flash, 6 smoke for the team] |

**Kit tone** [ANALYSIS - the researchers' reading]:
- Light kit (30 rifle rounds): Panama, Nuclear Plant and UN HQ, the stealth-heavy missions; UN HQ, with its no-kill rule, has the largest non-lethal stock in the campaign and no spare magazines at all.
- Heavy kit (90 rounds): Seoul (a war zone) and Chemical Bunker. Train Station is in between (60).
- "The kit states the rules": a reviewer shown only the loadout should be able to guess a mission's special rule (13_principles.md #35).

### 7.5 Xbox/PC Elite loadout, totals per agent
Elite = Mission mode where firearms start with no ammunition; unlocked by finishing co-op Story. Internally the level info stores mission mode as Story / Mission / "SILENT" (= Elite). [CONFIRMED - several sources: XBM, PRIMA, Cheat Index for the mode; ONE SOURCE: XB477 `common.lin` for "SILENT"]

| Mission | Agent One (host) | Agent Two (client) | Confidence |
|---|---|---|---|
| Training Facility | SC-20K 0, pistol 0, gas grenade 1, adrenaline 1 | Same | [Ammo + adrenaline ONE SOURCE: RUW ("0 / 0 ammo, adrenaline 1"); gas grenade ONE SOURCE: game files, omitted by RUW] |
| Panama | SC-20K 0, pistol 0, sticky cam 1, sticky shocker 1, ring airfoil 1, adrenaline 1 | SC-20K 0, pistol 0, sticky cam 1, ring airfoil 1, flash 2, adrenaline 1 | [CONFIRMED - several sources: RUW + map settings] |
| Seoul 3 | SC-20K 0, pistol 0, sticky cam 1, gas grenade 4, adrenaline 1 | SC-20K 0, pistol 0, sticky cam 1, flash 4, adrenaline 1 | [CONFIRMED - several sources: RUW + map settings] |
| Chemical Bunker | SC-20K 0, pistol 0, sticky cam 1, gas grenade 4, adrenaline 1 | SC-20K 0, pistol 0, sticky cam 1, flash 4, adrenaline 1 | [CONFIRMED - several sources: RUW + map settings] |
| Train Station | SC-20K 0, pistol 0, sticky cam 1, gas grenade 4, adrenaline 1 | SC-20K 0, pistol 0, sticky cam 1, flash 4, adrenaline 1 | [CONFIRMED - several sources: RUW + map settings] |
| Nuclear Plant | SC-20K 0, pistol 0, sticky cam 1, sticky shocker 1, ring airfoil 1, adrenaline 1 | SC-20K 0, pistol 0, sticky cam 1, ring airfoil 1, flash 2, adrenaline 1 | [CONFIRMED - several sources: RUW + XBDLC + PC105] |
| UN HQ | SC-20K 0, pistol 0, sticky cam 1, sticky shocker 1, ring airfoil 1, adrenaline 1 | SC-20K 0, pistol 0, sticky cam 1, ring airfoil 1, flash 2, adrenaline 1 | [CONFIRMED - several sources: RUW + XBDLC + PC105] |

- **Two Elite patterns:** gas x4 (Agent One) + flash x4 (Agent Two) on Seoul, Chemical Bunker, Train Station; shocker 1 + airfoil 1 (Agent One) and airfoil 1 + flash 2 (Agent Two) on Panama, Nuclear Plant, UN HQ. [CONFIRMED - several sources: RUW + map settings]
- **"Elite cuts each agent to one or two non-lethal items"** (06 §6) is true counting item TYPES; by count, Seoul/Chemical Bunker/Train Station Elite give 4 of one grenade type. [ANALYSIS - clarification]
- **Sticky camera 1 each in Elite** comes from the wiki; the Elite blocks have no `StickyCamera` key, so this is the loaded launcher round. [ANALYSIS]
- **Zero firearm ammo:** the Elite blocks hold no `AmmoClip*` keys (0 spare), and the mode itself empties the loaded magazines. [Zero ammo CONFIRMED - several sources: XBM, RUW, SuperCheats tip summary, cheat sites, V339 description ("elite mode means no starting ammo"), a YouTube co-op 100% run ("no ammo on spawn"); the mechanism is ANALYSIS]
- **Knife in Elite:** see 2.3. [INFERRED / UNCERTAIN: XBM vs PRIMA]
- **Superseded / disputed claims about Elite:**
  - PRIMA: "restricted to non-lethal weapons". [ONE SOURCE: PRIMA; looser paraphrase of the manual]
  - A Steam poster: Elite strips all weapons and gadgets except the knife, with Expert-level damage. Contradicted by the game files and RUW, which give each agent gadgets in Elite. [ONE SOURCE: Steam; superseded]
  - Research notes asked "whether Elite removes gadgets or only ammo" (systems_rules.md gaps). Answered by the files: ammo only, with a reduced gadget set. [CONFIRMED - several sources: map settings + RUW]
- **Elite and difficulty:** Elite is a mode, not a difficulty tier, but is typically played on Expert. [ONE SOURCE: YouTube playlist description]. On Elite, guards reportedly come to investigate at the slightest noise and fire at once, unlike Expert. [INFERRED / UNCERTAIN: YouTube comments on hexen2k7's runs]
- **Elite runs on video (zero-ammo context):** hexen2k7 "100% Elite No KO/Kill" set: Training 3:14; Panama 1/2-2/2 (6:15 each, in-game 10:58, zero detections); Seoul 1/2-2/2 (6:18, 6:34, in-game 10:46; one knockout and two civilian knockouts, all objectives); Chemical Bunker 1/2-2/2 (10:10 each, in-game 19:39); Train Station 1/2-2/2 (6:36, 6:44, in-game 11:41); Nuclear Plant 1/3-3/3 (8:02, 8:03, 8:07, in-game 22:44, 0 KOs, 0 kills, 0 alarms, 0 bodies); UN HQ 1/3-3/3 (7:43, 7:43, 8:05, in-game 21:32, one objective knockout); playlist of 15 videos, all 7 missions, 100% Elite, Hard. Suru Train Station Elite 100% (13:38). V339 Expert/Elite/Ghost runs. [ONE SOURCE: video titles/descriptions; not watched]
- **Unlock and the downloads:** Elite opens after co-op Story is completed. [CONFIRMED - several sources: XBM, PRIMA, Cheat Index]. On Xbox the two download maps first appeared only after Co-op Story was played through on Elite, then stayed selectable in Mission mode. [ONE SOURCE: MN (Major Nelson, Xbox.com)]. The PC 1.05 readme mentions no Elite precondition. [UNKNOWN]. Both downloads are Mission and Elite only, never Story. [CONFIRMED - several sources: MN + PC 1.05 notes]

### 7.6 Normal / Hard / Expert
- Co-op difficulty names are Normal / Hard / Expert (internally Easy / Normal / Hard). [CONFIRMED - several sources: XB477 + PC105 menu text]
- No source gives a different loadout per difficulty, and the map settings hold only a Mission block and an Elite block. So the kit appears to be the same on Normal, Hard and Expert. [ANALYSIS - INFERRED / UNCERTAIN]
- What difficulty does change that touches the kit: damage taken rises; Expert makes hacking harder; medkits restore full health on Normal, 50% on Hard, less on Expert; wall mines can only be disarmed on a green light on Expert; Chemical Bunker's mixing sequence is 3 / 4 / 5 inputs per agent. [CONFIRMED - several sources: FW, PRIMA, XBM; mixing ONE SOURCE: FW]
- Whether difficulty changes guard perception. [UNKNOWN - see 06-open-questions.md, R-10]

### 7.7 PS2/GameCube loadout (identical for both agents)
**Base kit, every sub-level:** SC-20K 60 (with launcher), SC Pistol 40 (+OCP), adrenaline syringe 2. [Item list CONFIRMED - several sources: FW + PRIMA PS2 gear boxes; counts ONE SOURCE: FW]

| Mission (PS2/GC order) | Sub-level | Extra kit per agent | Level pickups / used items | Confidence |
|---|---|---|---|---|
| Team Training | (single level) | Flash 1 | One neutralised figure in the stats | [ONE SOURCE: FAN] |
| Seoul | Streets | Sticky cam 1, flash 1 | Wall mine +1 (2nd floor) | [ONE SOURCE: FW; mine CONFIRMED - PRIMA + RUW] |
| Seoul | Rooftops | Sticky cam 1, flash 1 | - | [ONE SOURCE: FW] |
| Seoul | Gardens | Sticky cam 1 (no flash) | Explosive charge on the AA vehicle (contextual) | [ONE SOURCE: FW] |
| Seoul | Fish Market | Sticky cam 1, flash 1 | Wall mine +1 (pilings) | [ONE SOURCE: FW; mine CONFIRMED - PRIMA + RUW] |
| Seoul | Cyber-Cafe | Sticky cam 1, flash 1 | - | [ONE SOURCE: FW] |
| Chemical Bunker | Silo, Laboratories, Cryogenic Chamber, Storage Room, The Docks | Sticky cam 1, flash 1 (all five) | The Docks: wall mines +2 | [ONE SOURCE: FW; Docks mines CONFIRMED - PRIMA + FW] |
| Train Station | Train Repair Station, Hydro Tunnel, Subway, The Station | Sticky cam 2, frag 1 (all four) | Wall mines: Repair Station +4, Hydro Tunnel +1, Subway +1; explosive charge used on the Repair Station iron gate | [ONE SOURCE: FW; PRIMA's box shows a flash grenade instead of frag: UNKNOWN - see 06-open-questions.md, R-18] |
| Panama | The Alley | Sticky cam 1, flash 1 | - | [CONFIRMED - several sources: FAN + PRIMA gear panel (SC-20K + launcher, sticky camera x1, flash x1, adrenaline x2)] |
| Panama | East Wing | Sticky cam 2, flash 1 | EMP / explosive charge used on the elevator | [ONE SOURCE: FW; charge CONFIRMED - PRIMA + FAN] |
| Panama | Archives | Sticky cam 2, flash 1 | - | [ONE SOURCE: FW] |
| Panama | Server Room | Sticky cam 2, flash 1 | Fuse (mission item) | [ONE SOURCE: FW; fuse ONE SOURCE: PRIMA] |

- No sticky shocker, ring airfoil, smoke or gas grenade appears in any PS2/GC table. [ANALYSIS - absence in FW tables]
- No Elite mode on PS2/GC (not in the PS2 manual). [ONE SOURCE: PS2M; cheat-site Elite entries for PS2 are INFERRED / UNCERTAIN, probably copied from Xbox]
- PS2/GC adrenaline 2 each is unchecked against game files. [UNKNOWN - see 06-open-questions.md, R-03]

### 7.8 Conflicts and superseded values (kept for the record)
| Claim | Source | Status |
|---|---|---|
| "0 spare magazines" = no ammunition (Nuclear Plant, UN HQ) | Early gap-pass draft | Wrong, reverted: the loaded magazine is extra |
| UN HQ kit split between agents (shockers/airfoils to One, flash/smoke to Two) | RUW | Superseded: the files give both agents the full kit |
| Each agent carries two adrenaline shots (Xbox/PC) | PRIMA basics | Superseded: one each (training text, PRIMA's own gear boxes, RUW) |
| Gas grenades only in Elite (+1 UN HQ pickup) | RUW, 06, coop notes | Incomplete: Training gives 1 each in the files |
| Sticky shocker and airfoil "Agent One only" | 06, coop notes | True in Mission mode except UN HQ (both) and Elite airfoil (both) |
| Smoke "Agent Two" in UN HQ | RUW | Superseded: both agents 3 |
| Seoul vs Chemical Bunker sticky-cam split "possibly a wiki inconsistency" | Chemical Bunker research note | Both splits confirmed by the files |
| Launcher in "Agent One's gear" | PRIMA box reading | Both agents start with `StartupAttach=Launcher` |
| PC split-screen | PRIMA | Superseded: PC has LAN / Online only (R-13) |
| Elite strips all gadgets | Steam poster | Superseded by files + RUW |
| PS2/GC Train Station grenade: frag (FW) vs flash (PRIMA) | FW vs PRIMA | Open (R-18) |

---

## 8. Differences from solo

### 8.1 What solo has that co-op lacks
- **Whistle** (the button becomes Co-op Action). In co-op the pair lures guards with sticky-camera noise, shooting lights, the throw onto a guard, and (online) talking into the headset. [CONFIRMED - several sources: PRIMA, XBM, Steam user]. A preview said whistling into the headset replaces the whistle button. [ONE SOURCE: GF; INFERRED / UNCERTAIN, retail has the button mapped to Co-op Action]
- **The fire-and-forget OCP:** solo's OCP is replaced by the hold-to-jam co-op version. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FW]
- **EEV remote hacking** (per PRIMA; R-02 open). [ONE SOURCE: PRIMA]
- **Loadout choice:** solo has Recommended / Stealth / Assault-style loadout selection (PS2M); nothing equivalent is documented for co-op. [ONE SOURCE: PS2M for solo; absence INFERRED / UNCERTAIN]
- **Rifle attachments other than the launcher** are never issued in co-op (section 3). [ANALYSIS from the files]
- **Automatic checkpoints:** none in Xbox/PC co-op (manual Quick Save / Save / Load from pause, waiting for the partner); PS2/GC saves only between sub-levels. [CONFIRMED - several sources: XB477/PC105 menu text, PRIMA, PS2M; R-07 closed]
- **Mission map:** PS2M says the OPSAT map is displayed "in Solo mode", implying no map in co-op on PS2. [ONE SOURCE: PS2M; INFERRED / UNCERTAIN]. Xbox/PC co-op has an OPSAT with Goals, Notes, Data, Map, Equipment pages. [ONE SOURCE: `InGameMenus.int`]

### 8.2 What co-op has that solo lacks
- **The jammer** as the co-op-only gadget. [CONFIRMED - several sources: XBM, PS2M]
- **Share Equipment** (hand items marked with a dot to the partner). [CONFIRMED - several sources: XBM, PS2M, PRIMA] Details:
  - Equip the item, approach the partner, pick "Share Equipment" in the Interaction menu (HUD label "Share Equip."); both agents must be near each other. [CONFIRMED - several sources: XBM, PS2M, PRIMA, XB477 + PC105 HUD text]
  - The request can be cancelled before the partner answers. [ONE SOURCE: PS2M]
  - Only items marked with a dot can be shared; training pop-ups explain this. [CONFIRMED - several sources: XB477 + PC105 + PC manual]. Which items carry the dot is not listed anywhere. [UNKNOWN]
  - The Training map has an e-mail dated 06/23/07 from "Dan" to "Seb" explaining Share Equipment, and a designer comment in French says the note is not used for now and exists only so it gets translated. So the tutorial note was cut, not the feature (FW calls it "deleted" data). [ONE SOURCE: XB477 training `.lin` + `00_Training_COOP.int`; R-04 closed]
  - Versus comparison (Xbox): A = heal partner, give / accept gadget; White = start/finish a co-op move. [ONE SOURCE: XBM p.31]
  - [ANALYSIS] With the asymmetric Xbox/PC kits, sharing makes inventory a team resource (05_coop_moves_catalogue.md).
- **Share View** of the partner's sticky-camera feed. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Adrenaline revive** of a downed partner (solo has no revive item). [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Goggle-lamp colours** to tell two agents apart. [CONFIRMED - several sources: FW, WP, Steam]
- **Asymmetric kits (Xbox/PC):** Agent One = precise single-target shooter (shocker, airfoil, cameras), Agent Two = area-effect thrower (grenades), except UN HQ (identical). [CONFIRMED - several sources: RUW + PRIMA + files; reading ANALYSIS]
- **Mission items that force one agent to act alone:** the single antidote dose (Train Station). [CONFIRMED - several sources: RUW + PRIMA]
- **Elite mode** (co-op only on Xbox/PC). [CONFIRMED - several sources: XBM, PRIMA]
- **Proximity voice:** on Xbox Live (and PC online) guards can hear players' headset speech (default sensitivity 50 = about 2 m in game for normal speech; can be disabled or resized); talking can lure guards. [CONFIRMED - several sources: XBM pp.22, 26; PRIMA; GF] (see 03-mechanics.md)

### 8.3 Xbox/PC vs PS2/GC kit differences
- Xbox/PC: asymmetric per agent; per-mission counts vary widely; launcher payloads include shockers and airfoils. PS2/GC: identical kit for both, the same base kit everywhere (60 / 40 / 2 adrenaline), only sticky cameras, flash or frag on top. [CONFIRMED - several sources: RUW, FW, PRIMA]
- PS2/GC adds wall-mine pickups and contextual charges; Xbox/PC adds ammo pickups. [ANALYSIS - from the tables above]

---

## 9. Handheld (N-Gage / DS) kit

A separate Gameloft campaign (five parts: Rooftops, Breakdown, Corruption, Prison Rescue, Escape), two players, local only (N-Gage Bluetooth; DS local wireless, one cartridge each), no AI partner. [CONFIRMED - several sources: FW + Ubisoft PR + reviews + NG-TXT]

| | Shadownet Hacker | Shadownet Assault |
|---|---|---|
| Internal id | coopspy2 | coopspy1 |
| Lobby colour (FW) | Blue tag, blue goggles; FW maps him to "Agent One" | Red tag, purple goggles; FW maps him to "Agent Two" |
| Weapon | Sticky Shocker gun, unlimited | SC-20K (30 rounds), Five-seveN pistol (30 rounds) |
| Grenades | 3 chaff, 3 flashbang | 3 frag |
| Other gear | - | 3 sticky cameras |
| Health packs | 1 | 1 |
| Vision | No night or thermal vision (FW) | Night and thermal vision (only this role, per FW) |
| Can do | Hack computers | Short-circuit ("hack") electric panels |
| Cannot do | Short-circuit panels | Hack computers |

[Kit, colours and vision ONE SOURCE: FW (identical table on all five part pages); can/cannot rule CONFIRMED - several sources: FW + NG-TXT refusal pop-ups; internal ids ONE SOURCE: NG-TXT]

- **Choosing a class:** each player picks Hacker or Assault ("EXPERTISE" / "CHANGE EXPERTISE") in the lobby before the match. [CONFIRMED - several sources: NG-TXT + Ubisoft press release via NWR + Gaming Target]. Italian calls the Assault "Spia" (spy). [ONE SOURCE: NG-TXT]
- **Gadget text:** chaff grenade disables all electronics in range for 20 seconds; health pack = 50 HP; the sticky shocker gun fires a device that sticks to a target and shocks it; in the solo training text a shocker hit disables a camera for 15 seconds. [ONE SOURCE: NG-TXT]
- **Shocker as electronics tool:** in this version the sticky shocker works like the console OCP, temporarily knocking out electronics, so wasting shots can make some lasers or cameras impossible to pass (FW, stated for the game generally). The Hacker's shocker is unlimited in co-op, which would remove that risk. [ONE SOURCE: FW; the co-op inference INFERRED / UNCERTAIN]
- **"Unarmed hacker":** Pocket Gamer describes the Hacker as unarmed and the Assault as his protector; FW gives the Hacker an unlimited sticky shocker. Reconciled as: the Hacker has no lethal weapon. [INFERRED / UNCERTAIN: Pocket Gamer vs FW]
- **Thermal shows lasers:** in the solo training text thermal is the mode that shows lasers, so the Hacker relies on the Assault to spot lasers. [ONE SOURCE: NG-TXT for the training text; reliance is ANALYSIS]
- **Extra supplies:** only Prison Rescue lists them: Assault SC-20K 30+60 rounds, frags 3+2, health packs 1+1; Hacker chaff 3+2. FW writes "+N", which probably means level pickups. [ONE SOURCE: FW; meaning of "+" INFERRED / UNCERTAIN]
- **Mines:** can be shot (Assault) or temporarily disabled by a shocker hit (Hacker). [ONE SOURCE: FW (EN + RU); role split is inference]
- **Turrets (Escape):** four automatic machine-gun turrets that only the Hacker can switch off by hacking computers; each lowers the alarm level. [ONE SOURCE: FW; turret-off string CONFIRMED - NG-TXT + FW]
- **Lock picking:** three-pin stylus pick on DS; which class picks is unknown. [ONE SOURCE: FW; UNKNOWN - see 06-open-questions.md, R-23]
- **Other items:** a fuse (Prison Rescue panel #1 missing a fuse; panel #2 "fuse acquired"), the Block B key. [CONFIRMED - several sources: NG-TXT + FW]
- **Interaction verbs:** 37 in the N-Gage text (open/bash door, lock pick, hack computer, hack panel, heal ally, grab, interrogate, optic cable, rappel, switch on/off, use keypad, pick-ups); no boost, ladder, throw or other two-man move; the only partner action is "HEAL ALLY". [ONE SOURCE: NG-TXT; conclusion INFERRED / UNCERTAIN]
- **Revive:** a man down must be found and given a health pack within 30 seconds. [ONE SOURCE: NG-TXT]
- **Vision controls:** N-Gage key 3 cycles thermal / night / normal; DS touch screen buttons for vision modes, weapons and inventory; DS stylus lock-picking. [ONE SOURCE: N-Gage media kit; CONFIRMED - several sources: IGN DS + NWR + Pocket Gamer for DS]
- **Design reading** [ANALYSIS]: a lock-and-key split. The Hacker carries the electronics-defeating tools (shocker, chaff) and flash for crowd control; the Assault carries lethal force, frags, scouting cameras and the vision modes that show lasers. Each must rely on the other.
- **Gaps:** layouts, device effects, who picks locks, N-Gage vs DS map differences. [UNKNOWN - see 06-open-questions.md, R-23]

---

## 10. Translation guide entries for the kit (original names only)
From 14_translation_guide.md §2 and §3, left column, as the researchers summarised the originals [ANALYSIS - summaries, not new facts]:
- OCP in co-op mode ("jammer"): hold to disable lights, cameras, lasers, turrets; drains; moving cancels.
- Sticky camera: recon, noise lure, knockout gas.
- Sticky shocker / ring airfoil: one-shot KO, limited count.
- Flash / smoke / gas grenades: area tools.
- Night / thermal / EM vision: reveal hidden information (wires, people, electronics).
- EEV: remote hack/scan, disabled in co-op.
- Optic cable: look under doors. Lockpick / break lock: quiet slow vs fast noisy entry.
- Keypad codes from emails and interrogation (and observing a guard type).
- Wall mines: booby traps. Automated machine-gun turrets. Drone (PS2/GC UAV).
- Adrenaline syringe: limited revives per mission. Mission items (antidote, fuse, sample): single-use items that assign roles.
- Story / Mission / Elite (Elite as "start with no lethal ammunition").
- Mission-specific loadouts: "the no-kill finale gives both agents three of every non-lethal tool and no spare magazines".
- Blue / red goggle lamps: partner identification.
- (§6 of the guide holds only new-game options, no original names.)

---

## 11. Design reading of the kit [ANALYSIS]
1. **Two-person gates through a "hold" mechanic.** The jammer makes every camera, laser or turret a gate that needs one player holding and one moving; the cheapest way to force cooperation without scripting.
2. **Complementary kits.** On Xbox/PC one agent is the precise single-target shooter and the other the area-effect thrower; combined with sharing this nudges players to plan together ("you shock the near guard, I'll flash the pair").
3. **Goggle-gated information.** Live wires appear only in thermal; mines and cameras show best in EMF; players share it by voice.
4. **Loadout as tone-setter.** Low ammo and non-lethal emphasis in infiltration missions; more ammo and frags in the war zone; UN HQ's identical heavy non-lethal kit with no spare magazines signals the no-kill rule.
5. **Mission items that create role asymmetry.** One antidote, one agent in the contaminated room.
6. **Knockout tools as alarm control.** Gas cameras, shockers and airfoil rounds let a pair neutralise two guards at once, supporting the simultaneous-takedown tactic. [ONE SOURCE: PRIMA for the routes]
7. **Elite as a gadget puzzle.** With zero firearm ammo, Elite turns every mission into a run on a handful of non-lethal items, which the 100% Elite no-KO runs show is possible on all seven maps.

---

## 12. Open questions for the kit
- EEV usable in co-op? [UNKNOWN - see 06-open-questions.md, R-02]
- PS2/GC adrenaline count and the both-down rule. [UNKNOWN - see 06-open-questions.md, R-03]
- PS2/GC Train Station frag vs flash. [UNKNOWN - see 06-open-questions.md, R-18]
- Chemical Bunker serum vial count. [UNKNOWN - see 06-open-questions.md, R-16]
- Friendly fire on PC (sticky-shocker-on-partner bug). [UNKNOWN - see 06-open-questions.md, R-08]
- Handheld kit details. [UNKNOWN - see 06-open-questions.md, R-23]
- Rifle attachments other than the launcher; IR stress generator; which items carry the Share Equipment dot; whether the knife works in Elite; whether Training agents have a loaded sticky camera; Chemical Bunker pickups; meaning of the max-capacity block. [UNKNOWN - no R-number]

---

## Sources used for this file

**/home/user/docs files:**
- /home/user/docs/06_gadgets_and_tools.md
- /home/user/docs/research_notes/coop_gadgets_controls_comms.md
- /home/user/docs/14_translation_guide.md (sections 2, 3 and 6)
- /home/user/docs/04_mission_breakdowns/training.md, panama.md, seoul.md, chemical_bunker.md, train_station.md, nuclear_plant.md, un_headquarters.md, ngage_ds_campaign.md
- /home/user/docs/research_notes/gap_closing_gamefiles.md
- /home/user/docs/research_notes/gap_closing_community.md
- /home/user/docs/research_notes/mission_training.md, mission_panama.md, mission_seoul.md, mission_chemical_bunker.md, mission_train_station.md, mission_nuclear_plant.md, mission_un_hq.md, mission_ngage_ds.md
- /home/user/docs/research_notes/systems_rules.md
- /home/user/docs/research_notes/platforms_versions.md
- /home/user/docs/research_notes/coop_moves.md
- /home/user/docs/research_notes/music_and_atmosphere.md
- /home/user/docs/research_notes/reception.md
- /home/user/docs/research_notes/dev_and_design_intent.md
- /home/user/docs/research_notes/videos.md
- /home/user/docs/03_coop_overview.md
- /home/user/docs/05_coop_moves_catalogue.md
- /home/user/docs/10_ai_detection_and_alarms.md
- /home/user/docs/13_principles.md
- /home/user/docs/15_music_and_atmosphere.md
- /home/user/docs/OPEN_QUESTIONS.md
- /home/user/docs/00_PROGRESS.md
- /home/user/docs/01_sources.md
- Raw map-settings values as supplied in the task brief (PC 1.05 map settings, identical on Xbox build and download packages)

**External URLs cited (via the files above):**
- https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory (XBM; PDF https://archive.org/download/xboxmanual_Splinter_Cell_3_Chaos_Theory/Splinter_Cell_3_Chaos_Theory.pdf)
- https://www.docdroid.net/kYAIsM5/tom-clancys-splinter-cell-chaos-theory-manual-xbox-pdf (Xbox manual copy) and https://www.manualslib.com/manual/379207/Ubisoft-Splinter-Cell-Chaos-Theory.html
- https://archive.org/details/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA (PS2M; OCR https://archive.org/download/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA/Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA_djvu.txt)
- https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide (PRIMA)
- https://archive.org/details/tomclancyssplint0000loec (Prima print edition, lending only)
- https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601 (PC105) and https://archive.org/download/tom-clancys-splinter-cell-chaos-theory_202601/Tom%20Clancys%20Splinter%20Cell%20Chaos%20Theory.rar/
- https://archive.org/details/og-xbox-dlcupdates (XBDLC), https://archive.org/download/og-xbox-dlcupdates/DLC%20and%20Title%20Update%20Downloads/Splinter%20Cell%20CT%20DLC%20Installer.rar/ ; same file in https://archive.org/details/Original-Xbox-Live-Updates-and-DLC and https://archive.org/details/XbDLC2
- https://archive.org/details/sc-3-xb-build-477-retail (XB477) and https://archive.org/download/sc-3-xb-build-477-retail/SC3XB_Build477_Retail.zip/
- https://archive.org/details/scct_20250728 (PCDVD) and https://archive.org/download/scct_20250728/SCCT.zip/
- https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit_Image.iso/ (N-Gage media kit)
- https://splintercell.fandom.com/api.php (FW) and https://splintercell.fandom.com/ru/api.php (RUW)
- https://splintercell.fandom.com/wiki/Training_Facility , https://splintercell.fandom.com/wiki/Team_Training , https://splintercell.fandom.com/wiki/Agent_One , https://splintercell.fandom.com/wiki/Agent_Two , https://splintercell.fandom.com/wiki/Panama_(PS2/GameCube) , https://splintercell.fandom.com/ru/wiki/Взаимодействия
- https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Training_Facility , https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Panama_Bank , https://www.ign.com/wikis/tom-clancys-splinter-cell-chaos-theory/Seoul (IGNW)
- https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/ (GF)
- https://news.xbox.com/en-us/2005/08/25/splinter-cell-content/ (MN)
- https://www.gamesindustry.biz/tom-clancyrsquos-splinter-cell-chaos-theory-tm-for-the-n-gage-platform-shipping-now
- https://bit-tech.net/reviews/gaming/pc/scct_sm20_sm30/2/
- https://www.gamerevolution.com/review/36141-splinter-cell-chaos-theory-review and https://www.gamerevolution.com/?p=32392
- https://www.reddit.com/r/Splintercell/comments/1qfdvur/ , https://www.reddit.com/r/Splintercell/comments/1m3rm7z/ , https://www.reddit.com/r/Splintercell/comments/1e9pwjx/
- Videos: https://www.youtube.com/watch?v=WQ__XNyWP0M , https://www.youtube.com/watch?v=2VRGQUT2JvQ , https://www.youtube.com/watch?v=TvecAMtS_vk , https://www.youtube.com/watch?v=a7m1K7VaJOI , https://www.youtube.com/watch?v=KlU0002suD4 , https://www.youtube.com/watch?v=1-KpQGqaYd8 , https://www.youtube.com/watch?v=M3kPwc52rmI , https://www.youtube.com/watch?v=A9qRzUt9RtE , https://www.youtube.com/watch?v=chb66dBOt74 , https://www.youtube.com/watch?v=ILxhYQ1BHc0 , https://www.youtube.com/watch?v=2X5MvQPOQ14 , https://www.youtube.com/watch?v=yDq17RUC8fs , https://www.youtube.com/watch?v=-JnlamHBZrc , https://www.youtube.com/watch?v=OBU3MtaoKb4 , https://www.youtube.com/watch?v=rVg3fr3OrPA , https://www.youtube.com/watch?v=jry663Tx5bg , https://www.youtube.com/watch?v=5RBmv-nRtTs , https://www.youtube.com/watch?v=Vmob0mzcINg , https://www.youtube.com/watch?v=-mU9NO8dxVw , https://www.youtube.com/playlist?list=PL8CD4BB2EF76017B9 , https://www.youtube.com/watch?v=ge7dEnjp6MU (Ziggity PS2 Train Station, vibration cue) , https://www.youtube.com/watch?v=-Y6zjZ7oVNM (SHOCK-25 DS) , https://www.youtube.com/watch?v=jnQ74p1Klf8 (arronmunroe DS)
