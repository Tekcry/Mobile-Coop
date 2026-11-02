# Design bible, sorted (N42, 2026-11-02)
Owner: the orchestrator. Status: current (review input for Michael; sorted against vision v3 and N1-N43).

| Bible section (line) | Short title (under 10 words) | Bucket | Why (one line) |
|---|---|---|---|
| 0 (3) | Bible states today's game, rewritten in place | REPLACED | CLAUDE.md puts the bible at level 4 under N decisions; Phase 1 writes the new short docs (N9) |
| 0 (12), 9 (1167) | Authority order kept in CLAUDE.md | REPLACED | CLAUDE.md revised authority order (N9; G86) |
| 0 (16), 11 (1238) | Every number is a starting value | DIRECTION-FITS | G356 and C17: CT numbers are targets, tuned by feel |
| 0 (17), 5.3 (352), 11 (1238) | Michael tunes movement himself | REPLACED | G227 replaced by the Mixamo switch (N1) and the master plan phases (N5) |
| 0 (20), 4 (173), 11 (1232) | CT is the authority; "research" verbs stay only if CT | REPLACED | Vision s1 "inspired by CT, our own ideas" replaces G1 / G180; Phase 4 fixes the verb list (SCOPE) |
| 0 (25) | Cover-shooter, phone, PvP, bot history | GONE | Removed directions |
| 0 (29) | Read only the sections your resume block names | GONE | Old process (RULES.md is history) |
| 0 (31), 6 (1062) | Reference-game IP and naming rule | TECH | G5, G6, G114, G154; already in CLAUDE.md |
| 1 (42) | "Pure chaos theory" quote | REPLACED +FB | Vision s1 replaces G1; his original quote is worth keeping as a record |
| 1 (45), 1 (56), 5.8 (638), 7 (1084) | Recreate CT's co-op levels | REPLACED | G3 replaced by vision s1 / s6-7 and N2: fresh, story-first missions; count is N31 |
| 1 (50), 2 P6 (122), 5.9 C1 (691), 5.9 C20 (745), 6 (1029) | Exactly two humans, no solo, no bot | DIRECTION-FITS +FB | Vision s1; his words "2 player coop campaign only, unable to be completed solo" |
| 1 (53) | Marlow Yard is the training prologue | DIRECTION-FITS | Vision s6 (G371) |
| 1 (55), 5.8 (657), 5.8 (665), 5.9 C1 (692) | Sector Ops mode, 1-4 players, solo route | GONE | Sector Ops and 3-4 players removed (N1) |
| 1 (58), 9 (1173) | A prototype, not polish | DIRECTION-FITS +FB | Vision s11 / s13 polish ban (G422); his "only the basics required" quote; /preview/ part gone |
| 1 (62) | Present-day techno-thriller: Wren, Moth, nine nights | DIRECTION-FITS | Vision s6 (P3); the radio crew is the G112 question |
| 1 (67) | Heightened moves; combat means something went wrong | DIRECTION-FITS | G130; fits the stealth-first rating (vision s10) |
| 1 (69), 8 (1137) | Desktop-only installable browser PWA | REPLACED | N32: Windows on Steam (Electron), Deck a goal; the browser build is for development and tests |
| 1 (70), 5.14 (907), 5.16 (941) | Realistic look everywhere, nothing voxel | DIRECTION-FITS +FB | G68 / G282; his words "nothing should be voxel" |
| 1 (72) | Light and shadow is the heart of the game | REPLACED | Vision s3 / s4: forced co-op is the one rule; light and shadow is pillar 2 |
| 2 (77) | Pillars P1-P7 and their ranking | REPLACED | Vision s4 ranks co-op, light, guards, guidance, movement, sound |
| 2 P1 (81-82), 5.1 L6 (272-274) | Darkness safe; the meter never lies | DIRECTION-FITS | Vision pillar 2; meter thresholds belong in `docs/systems/lighting.md` |
| 2 P1 (84), 4 (193), 5.1 L8 (283) | Light is a toy: switches, lamps, jammer | DIRECTION-FITS | Pillar 2; N37 world tricks (cut power) |
| 5.1 L8 (284-285), 7 (1116-1117) | Hardened lit choke points with a route around | DIRECTION-FITS | G333 |
| 2 P1 (86), 5.1 L17 (303-310), 5.8 (685) | Real-world light levels; players make the shadows | DIRECTION-FITS | G329, G367, G368 |
| 5.1 L17 (306-307) | S1 car-park light approval; S2-S5 relight | GONE | Sector Ops and Warehouse (G415) |
| 2 P1 (88), 5.1 L1-L5 (250-270) | Light parity: one source, same at every preset | TECH | Light-parity hard rule in CLAUDE.md (G47, G391) |
| 2 P7 (131), 8 (1150) | Gameplay never reads graphics settings | TECH | CLAUDE.md hard rule |
| 5.1 L10, L13, L14 (287-298) | Light sync, re-mix cost, baked moon | TECH | Lighting engineering |
| 5.1 L11 (289-293) | Character shadows count; cast shadow is a faint cue | DIRECTION-FITS | G352, G379; not built yet |
| 5.1 L12 (294) | Closed doors block light | DIRECTION-FITS | Pillar 2 |
| 5.1 L15 (299) | Clear glass sees, frosted does not | DIRECTION-FITS | G45 |
| 5.1 L16 (301) | Lit windows expose anyone in them | DIRECTION-FITS | G144 |
| 5.1 L18 (311-315) | One realistic lighting system; flicker; pendants | DIRECTION-FITS | G315, G316, G323 |
| 5.1 L7 (275-282), 5.5 (458) | Darkness near-black; night vision blows out in light | REPLACED | Vision s9: picture lifted, night vision never blows out (C19); G213's wide thin outline stays |
| 2 P2 (93), 5.2 S2-S3 (323-327) | Loud places mask noise | DIRECTION-FITS | Pillar 6; switching a machine off is a world trick (N37) |
| 2 P2 (95), 5.2 S4 (328) | Sound meter against the ambient level | DIRECTION-FITS | G61; noise stays readable |
| 5.2 S1 (321) | Every noise event has a radius | DIRECTION-FITS | Pillar 6 |
| 5.2 S5-S6 (330-333) | Silent speeds; soft own footsteps; one run sound | DIRECTION-FITS | G40, G61, G62 |
| 5.2 S6 (333) | Footsteps volume slider for testing | TECH | G60 |
| 5.2 S7 (334), 5.16 (952-954), 6 (1063-1070) | Free assets whose licence allows sale | TECH | G58, G59, G407; the CMU and own-rig lines are replaced by N1 |
| 5.2 S8 (338-339) | Music follows guard state; searching plays Cautious | DIRECTION-FITS | G63; vision s11 music states |
| 5.2 S8 (340-341), 11 (1248-1249) | Long menu theme ships; music job; "Dark orchestral" | REPLACED +FB | N16 / N35 and D15b set the sonic identity in Phase 1; his "Dark orchestral" pick was "not firm" |
| 5.2 S8 (340) | Old music plans and test lab kept | GONE | Music labs removed (N1) |
| 5.2 S9 (343), 11 (1242) | Missing sounds after the prototype | REPLACED | Vision s11: sound first for readability (G66) |
| 5.2 S10, 5.9 C22, 6 (1074-1075), 10 (1219) | Earpiece partner voice; proximity voice option | REPLACED | Vision s9: voice chat stays outside the game (G129, G140, G156) |
| 2 P3 (100) | More than one route through every space | DIRECTION-FITS | Vision s7: 2-3 ways through each room or yard |
| 2 P3 (102-105), 5.8 (629-630) | Ghosting always possible; no forced kill | ASK | Same as G127 (may a mission require a kill?) and G303 (unavoidable guards); not a new question |
| 2 P4 (109), 5.3 (350) | CT movement measured from footage | REPLACED | G210 drops CT footage references; N1 Mixamo animations |
| 2 P4 (111-112), 5.3 (370), 5.12.1 (806) | Instant control, weighted body, no auto moves | DIRECTION-FITS | Vision pillar 5 "weighted and controllable" |
| 2 P5 (116-118) | Predictable patrols; every detection explainable | DIRECTION-FITS | Vision pillar 3 |
| 2 P6 (123), 5.9 C4 (703-704), 7 (1086) | Every section forces a co-op traversal move | ASK | Must every route still need a two-person climb or throw, or can some routes rest on other teamwork (distract, cover me, two-key)? |
| 2 P6 (125), 5.17 D8 (996) | Every feature works in co-op | DIRECTION-FITS | Vision s3 one rule |
| 2 P7 (129), 5.17 D1 (967-968) | Pad first, then keyboard and mouse | DIRECTION-FITS | CLAUDE.md pad first; Steam Deck goal (N32) |
| 2 P7 (130), 5.17 D1 (969) | Pad layout copies CT button for button | REPLACED | G96 replaced by the G210 / G212 button rework |
| 3 (139), 5.5 (474), 5.6 (528-529), 5.14 (929) | Kits fixed per mission, complementary | REPLACED | Vision s10: players choose gear before each mission (G134, G153) |
| 3 (139-140) | Briefing signposts strict rules; no map | DIRECTION-FITS | G290; D8 (no pause map) |
| 3 (141) | Insertion choice where a mission offers one | DIRECTION-FITS | Nothing newer contradicts it |
| 3 (142) | Scout from the entry vantage, then execute | DIRECTION-FITS | Vision s7: each area opens on a dark lookout for two |
| 3 (144), 5.8 (624-625) | Text radio, never blocks input, logged | DIRECTION-FITS | Vision s6 / s9 (one radio line at a time); G82 |
| 3 (145), 5.8 (594) | Primary, secondary and opportunity objectives | DIRECTION-FITS | Vision s7: intel and overheard talk open opportunities |
| 3 (146), 5.8 (604) | Both players must reach the exit | DIRECTION-FITS | G138; SCOPE Must |
| 3 (152-154), 5.7 (541-542), 5.9 C5 (711-713) | Detection ladder; guards know only what they saw | DIRECTION-FITS | Pillar 3; vision s8 search where last seen (G139, G380) |
| 3 (155), 5.7 (540) | Shared alert tier; no fail on alarms | DIRECTION-FITS | Vision s10 (G125) |
| 3 (156), 5.8 (599-601) | Up to 2 signposted strict rules; section restart | DIRECTION-FITS | Vision s10 (G290) |
| 3 (158), 5.8 (620) | Encounter checkpoints cap loss at 10 minutes | REPLACED | Vision s10: area starts and before set pieces; spacing open as D25 |
| 3 (161-167) | "A good session feels like" list | DIRECTION-FITS | Matches pillars 1-2 and the team-move routes |
| 4 (180), 5.3 (361-363), 6 (1031) | Analogue speed, no sprint, silent slow speeds | DIRECTION-FITS | G40, G210, G31 |
| 4 (181), 5.3 (365-368), 5.12.1 (810-815), 6 (1032) | Frozen-stride stops and CT turns | REPLACED | G25-G27 replaced by G210 and N1 (Mixamo); the 0.4 s flick turn (G33) stays a target |
| 4 (182), 5.3 (355-357), 5.3 (369), 6 (1037) | Stand and crouch, roll, tense sneak, no prone | DIRECTION-FITS | G32, G110, G160 |
| 4 (183-185), 5.3 (375-381) | Jumps, pipes, ledges, ducts, rappel, crawl spaces | DIRECTION-FITS | Pillar 5 traversal; the set is checked in Phase 4 |
| 4 (186), 5.3 (383-389), 6 (1033) | Back-to-wall on L3, button only | DIRECTION-FITS | G18, G34-G37 |
| 5.3 (390), 6 (1033) | No lean-out aiming, no SWAT turn | ASK | Already queued as D28 (Phase 3); not a new question |
| 5.3 (390-391) | No snap cover, glide, cover dash or blind fire | DIRECTION-FITS | Pillar 5: the player places the body |
| 5.3 (392) | Enemy cover AI stays | TECH | Code fact (`src/cover`) |
| 4 (187), 5.3 (394-395), 5.4 (432) | CT door list and hold-A action menu | ASK | Same as G19 / G198 (pop-up list or N37's one button that does the right thing); not a new question |
| 4 (194-195), 5.3 (397-398) | Carry, drag and hide bodies | DIRECTION-FITS | N37 "hide a body" |
| 4 (196) | Lockpick as a short minigame | DIRECTION-FITS | Fits the context action "open"; nothing newer contradicts it |
| 4 (197), 5.5 (472) | Hands-on hacking, no remote tool | DIRECTION-FITS | G142 |
| 4 (198) | Optic cable under closed doors | DIRECTION-FITS | G37, G97 |
| 4 (199), 5.4 (445-448) | Interrogation and two-person questioning | DIRECTION-FITS | N37 "question someone"; G148; SCOPE Should |
| 4 (200-201), 4 (208), 5.4 (430-431), 6 (1034) | Grab is the hub: shield, interrogate, scanner | DIRECTION-FITS | N2 keeps the grab (G23, G43) |
| 4 (202) | Whistle, fuse boxes, thrown objects | DIRECTION-FITS | N37 world tricks |
| 4 (209), 5.4 (438-440) | Positional takedowns: tap knocks out, hold kills | DIRECTION-FITS | G43, G206, G210; the kill is the paired knife kill (N2) |
| 4 (210), 5.4 (427-429), 6 (1034) | Palm strike: one-hit knockout, about 1.4 s | DIRECTION-FITS | G42, G396; the Sector Ops dog part is gone |
| 4 (211) | Knife role follows the research | REPLACED | N2: the paired knife kill is the lethal takedown everywhere |
| 4 (212), 5.4 (449-450), 6 (1038) | Synced takedown, no dedicated dual move | DIRECTION-FITS | Fits "one action both do at once" (vision s7); Sector Ops reward part gone |
| 4 (213), 5.6 (493-499) | Holstered, low ready, aiming; no hip fire | DIRECTION-FITS | G21, G210, G212, G214 |
| 5.4 (433-437) | Grab menu: no release, no return row | DIRECTION-FITS | G203-G205; how it is shown hangs on the G198 question |
| 5.4 (441-444) | Takedowns in 1-1.5 s from many states | DIRECTION-FITS | Short exposure keeps co-op sync simple |
| 4 (219), 4 (222), 5.5 (456-457), 5.5 (462) | Goggle modes include electro | ASK | Same as G99 (keep the third "electro" mode?); not a new question |
| 4 (220), 5.5 (463) | CT-style grain on night vision | DIRECTION-FITS | G101 |
| 4 (221), 5.5 (461), 5.16 (950) | Thermal as CT, through closed doors | ASK | Already queued as D27 and D29 (G102); not a new question |
| 5.5 (460) | Wheel A cycles vision modes | DIRECTION-FITS | G213 |
| 5.5 (464) | Vision modes never change detection | DIRECTION-FITS | Pillar 3 fairness |
| 5.5 (465), 5.14 (915-917) | Goggle on brow, glows over eyes | ASK | Same as G73 (Mixamo operators or the menu Wren only?); the no three-lens rule (G69) is TECH |
| 5.5 (466) | Wren keeps her current goggle | FEEDBACK | G195: he rejected the redesign options |
| 5.5 (467) | Goggle flicker only at launch | FEEDBACK | G194: his preference for the launch effect |
| 4 (230), 5.5 (468), 5.6 (488), 11 (1230) | CT's full gadget set, settled by research | REPLACED | Vision s10 gadget list (G76) |
| 4 (228), 5.6 (484) | Rifle attachments: sniper, shotgun, launcher | ASK | Does the rifle keep sniper, shotgun and launcher attachments (gadgets fired from it), or is it a plain rifle? |
| 5.6 (480-488), 6 (1028) | One rifle, one pistol, the knife; no other guns | DIRECTION-FITS | Vision s10 pistol and rifle; the knife is the paired kill (N2) |
| 5.5 (468-472) | Selection wheel on LB hold; no time slow | DIRECTION-FITS | G181, G192, G220 |
| 4 (229), 5.6 (490-491) | Pistol's held jammer: 5 s, standing still | DIRECTION-FITS | Vision s10: the jammer is always carried (G152, G212) |
| 4 (229), 5.5 (472-473), 5.6 (491), 6 (1039-1040) | Thrown EMP and player-chosen loadouts ruled out | REPLACED | Vision s10: EMP choosable and gear chosen per mission (queue "Gear") |
| 5.6 (489) | Original weapon names, no real brands | TECH | IP rule |
| 5.6 (497) | Low ready: A interacts, X hold reloads | DIRECTION-FITS | G212 |
| 5.6 (499-500) | Swap rules; gadgets work holstered | DIRECTION-FITS | Control rule; nothing newer contradicts it |
| 5.6 (501-503), 5.12.2 (845) | Real-world draw timings | TECH +FB | G243; his words "Research what is believable and realistic" |
| 5.6 (504) | Releasing aim never cancels a reload | DIRECTION-FITS | Control rule |
| 5.3 (406-407), 5.6 (508) | Aim to shoot, no zoom, scope holds breath | DIRECTION-FITS | G17, G29, G104 |
| 5.6 (509), 6 (1035) | No aim assist | ASK | Same as G16; not a new question |
| 5.6 (510-512) | Spread, shot noise, every shot can kill a lamp | DIRECTION-FITS | Pillars 2 and 6 |
| 5.6 (513-515), 5.7 (571-574), 5.9 C7, 5.13 (892), 5.13 (897-898), 6 (1026), 5.17 D7 (992) | Difficulty levels and what they scale | REPLACED | Vision s10: one difficulty plus assists (G106, G131, G338, G341, G350) |
| 5.6 (516-519), 5.7 (539-540) | Alarm levels bring torches, helmets, armour | DIRECTION-FITS | Vision s8: an alarm makes the guards already there tougher (G155) |
| 5.6 (520-521), 5.8 (608), 5.8 (684) | Limited ammo; crate refill between sections | ASK | Same as G307 (which hardening ideas still stand); not a new question |
| 5.6 (522) | Aiming from attached states | DIRECTION-FITS | Nothing newer contradicts it |
| 5.6 (523), 5.9 C11 (730-737), 5.17 D8 (998-1007) | MoveState, host approval, netmove tests | TECH | Co-op sync rules for `docs/systems/coop.md` (G52, G400) |
| 5.6 (524-526) | Guns held properly; rifle slung on the back | FEEDBACK | G177 / G178: his bar for believable holding; the Wren mounts are replaced by N1 |
| 5.7 (535-538) | Perception, last-seen spot, archetypes, barks | DIRECTION-FITS | Pillar 3; each guard has a job (vision s8) |
| 5.7 (540), 5.7 (579-580), 5.8 (613) | Level 3 reinforcements; spawn action | REPLACED | Vision s8: guards are never spawned (C4) |
| 5.7 (543-545) | Guards react to change; doors past 15% | DIRECTION-FITS | G41; vision s8 guards come to fix lights |
| 5.7 (546-548) | Guards see poorly above; high-route lookouts | DIRECTION-FITS | G44, G335, G378 |
| 5.1 L9 (286), 5.7 (549-550) | Paired patrols; torches; relight lamps | DIRECTION-FITS | G335; vision s8 |
| 5.7 (552-554) | Cameras see by their own IR in darkness | ASK | Same as G240; not a new question |
| 5.7 (554-555) | Faint red laser grid shows a camera's view | DIRECTION-FITS | G222, his own readability idea; pillar 3 |
| 5.7 (555-556) | Lethal automatic defences only at compounds | ASK | Same as G128; not a new question |
| 5.7 (555) | Laser trip beams | DIRECTION-FITS | Purposeful security (G295) |
| 5.7 (557-558), 6 (1071) | Fixed patrols; some codes vary per run | DIRECTION-FITS | G143 |
| 5.7 (559) | Per-stop facing | TECH | Data field (`SquadSlot`) |
| 5.7 (560-562) | Unarmed people flee to a guard or alarm | DIRECTION-FITS | N37: staff react and can be avoided, questioned or used |
| 5.7 (562-563), 5.8 (603-604), 5.8 (639) | Killing a civilian restarts; Mission 1 has none | REPLACED | N37: 1-3 staff per mission, harming them costs rating (G353, G373) |
| 5.7 (564-568), 7 (1115-1116), 11 (1263-1264) | As many guards as possible, 32 cap | REPLACED | N38: 20-30 per mission (G254, G289, G359); room to manoeuvre (G190) still fits |
| 5.7 (567), 7 (1095-1096) | Marlow Yard posts only the guards needed | DIRECTION-FITS | G376 |
| 5.7 (569-570), 8 (1144-1149), 11 (1241) | Performance budgets, off-screen guards, loading | TECH | G14, G327, G369, G382, G394, G405 |
| 5.7 (575), 11 (1232) | On-screen awareness arcs | ASK | Keep on-screen arcs that show a guard noticing you, or rely on barks, body language and the meters? |
| 5.7 (576-582) | Realistic guards: hear, wake, report, fight smart | DIRECTION-FITS | G298-G300, G312; pillar 3; the reinforcement part is replaced (vision s8) |
| 5.7 (583-585) | Later Sector Ops: response teams, riot shields | GONE | Sector Ops; no spawned teams (C4); riot shields parked; bulletproof cameras sit in the G307 question |
| 5.8 (591-592) | A mission is data, schema-validated | TECH | Mission framework code |
| 5.8 (595-596) | Objective types include rescue / escort | REPLACED | C12 (master brief): no escort missions; the other types fit |
| 5.8 (596-597), 5.10 (759-762) | Plain objectives name what and where; fade in | DIRECTION-FITS | Vision s9 (G336, G343, G351); Marlow's always-on list (G277) |
| 5.8 (601-602) | Sector Ops strict rules per team or split | GONE | Sector Ops |
| 5.8 (602-603), 5.8 (615-616), 7 (1097-1099) | Marlow Yard: every failure a retry; timed drills | DIRECTION-FITS | G342, G361, G370 |
| 5.8 (603) | Story-critical characters protected | DIRECTION-FITS | G145 |
| 5.8 (606-609) | Section restart restores the saved state | DIRECTION-FITS | Vision s10; Marlow's full reset (G312) |
| 5.8 (611-613) | Trigger and action list | TECH | Mission framework data |
| 5.8 (613-616), 6 (1071-1072) | Soft time windows only, no countdowns | DIRECTION-FITS | G334 |
| 5.8 (618) | No quicksave, checkpoints only | DIRECTION-FITS | Vision s10 |
| 5.8 (620-622), 5.11 (777-779) | Autosave to IndexedDB; Continue; save version | TECH | Save code |
| 5.8 (627-631) | Percent rating with breakdown; no rewards | DIRECTION-FITS | Vision s10 (G146, G384) |
| 5.8 (633-636) | Shared progress; host owns it; any partner joins | DIRECTION-FITS | G147; fits the Friend's Pass and reconnects |
| 5.8 (639-641), 6 (1058), 7 (1087-1088) | Mission 1 is Tallow Wharf | REPLACED | N2: Mission 1 is a fresh design (G340, G401, G425) |
| 5.8 (640) | Throw gaps force co-op | DIRECTION-FITS | G387 |
| 5.8 (642), 11 (1260) | Site and company names come with missions | DIRECTION-FITS | Story docs own them |
| 5.8 (642-647) | Four signed-off mission prototypes | ASK | Same as G402 (Split Shift and Code Relay were Sector Ops and are gone); not a new question |
| 5.8 (649), 5.15 (933), 6 (1022) | No traitor, no player-versus-player finale | DIRECTION-FITS | N36 / N41 (G9) |
| 5.15 (933-934) | Finale designed with the missions | REPLACED | N36 / N41: the ending "Two switches" is written in Phase 1 |
| 5.8 (651-655), 5.2 S8 (342) | Piano escape scene and its music | GONE +FB | Piano scene removed; his music picks "Investigation Piano", "Suspense Thriller" (G430) |
| 5.8 (659-664), 7 (1106) | Saltmarsh Park, Warehouse, S1 re-plan | GONE | Saltmarsh and Warehouse removed |
| 5.8 (667-670) | Sector Ops objectives; Split Shift, Code Relay | GONE | Sector Ops |
| 5.8 (671-672) | Patrol pockets with takedown spots out of sight | DIRECTION-FITS | G190 room to manoeuvre; useful beyond Sector Ops |
| 5.8 (672-673) | Some guards unavoidable | ASK | Same as G303; not a new question |
| 5.8 (673-674) | Security escalates to dogs and armed response | GONE | Sector Ops; dogs parked; no spawned response |
| 5.8 (675-676) | Dogs: no takedown, gas, score cost | GONE | Dogs parked (SCOPE) |
| 5.8 (677-680) | Sector Ops guard counts per section | GONE | Sector Ops |
| 5.8 (681-683), 5.9 C6 (716-719), 5.13 (894) | Stars, revive syringes, die after 30 s | GONE | Sector Ops |
| 5.9 C2 (694-696) | Host authority; no host migration | DIRECTION-FITS | SCOPE parks host migration; host-leaving rules parked (N26) |
| 4 (237), 5.9 C3 (697-699) | CT's team moves plus "any others CT has" | REPLACED | SCOPE verb budget: Phase 4 keeps the moves that pass |
| 4 (236), 5.9 C3 (700-702) | Team moves anywhere with room; one ledge band | DIRECTION-FITS | G57, G151, C8; no brace |
| 4 (238), 5.9 C4 (704-710) | Campaign kit, five extra kit moves | DIRECTION-FITS | SCOPE Must / Should / Could; each passes the Phase 4 gym (G293, G403, G423) |
| 4 (239), 5.9 C6 (714-715), 5.9 C6 (719) | Revive in 30 s, twice, 35% health | DIRECTION-FITS | Vision s10 (G126, G349); D10 still tests a no-limit option |
| 4 (239-240), 5.9 C12-C18 (738-740) | Carry downed partner, engagement systems by research | REPLACED | Vision s7 / s9 and SCOPE (coloured pings, compass, partner readouts, splits that meet); others need the five questions |
| 5.9 C8 (723) | Friendly fire: host option, on by default | DIRECTION-FITS | G141 |
| 5.9 C9 (724-725) | Co-op tests: two tabs, local net | TECH | Testing; the bunker test switch is gone |
| 5.9 C10 (726), 5.14 (921) | Each player a different operator | DIRECTION-FITS | Vision s5; cosmetics part gone |
| 5.9 C10 (727-728), 5.10 (756), 5.10 (765-769), 5.14 (918), 6 (1041-1044) | No compass, partner marker or blip; goggle beacon | REPLACED | Compass bar with objective and partner mark (D8, vision s9, C1); no pause map still holds |
| 5.9 C10 (728-729), 11 (1233) | Soft team-mate outline | ASK | Keep the soft outline that shows your partner through walls (guards never see it)? |
| 5.9 C19 (741), 8 (1152-1153) | Online, split-screen and LAN | ASK | Same as G133 (is LAN still wanted?); not a new question |
| 5.9 C19 (742-744), 11 (1269) | Relay server decided later | REPLACED | N24 / N25: Metered relay; D22 open for release |
| 5.9 C21 (746-748) | Network version bump | TECH | N15: co-op version raised with each co-op message change |
| 5.3 (373), 5.14 (913-914) | Operators move the same; one capsule | DIRECTION-FITS | N34 same abilities; one Mixamo body now (N1) |
| 5.3 (371-372) | Modern animation layer, only what CT shows | REPLACED | G30 replaced by G210 and N1 |
| 5.3 (400-404) | Manual, rigid camera; boom its only auto move | DIRECTION-FITS | G28, G29, G159, G397 |
| 5.3 (405) | Shoulder offset 0.15 m, FOV 86 | DIRECTION-FITS | C9: no change |
| 5.3 (408-410) | Same camera height; framing for attached states | DIRECTION-FITS | G38 |
| 5.3 (411-413) | Camera collision test | TECH | Camera engineering |
| 5.3 (414-415) | Strict corner peek | DIRECTION-FITS | G137 |
| 5.3 (417-421), 7 (1125-1128), 11 (1239) | Metrics in level-design s12; sizes re-measured | TECH | G54; engine facts |
| 5.10 (756-758) | CT-like HUD: meters, health, prompts | DIRECTION-FITS | G77, G98, G107; vision adds the compass bar |
| 5.10 (763-764) | Menus follow the menu style plan | DIRECTION-FITS | G77; the G113 timing is gone |
| 5.10 (768) | Optional hint layer, off by default | DIRECTION-FITS | SCOPE Could |
| 5.10 (770) | Field menu: objectives, radio log, notes | DIRECTION-FITS | Nothing newer contradicts it |
| 5.10 (771) | Test Chamber dev menus; tuner only there | TECH | N2, N13, N17 |
| 5.10 (772-773), 5.17 D7 (987-991), 8 (1156-1158) | Full remapping, hold or toggle, accessibility | DIRECTION-FITS | SCOPE Must accessibility (G22, G398) |
| 5.11 (780) | Parked credits, unlocks, cosmetics stay in saves | GONE | Progression and cosmetics removed; N21 starts saves fresh |
| 5.12 (784-794), 5.17 D8 (1001-1003), 11 (1240) | Hand-made, CMU and Mixamo sets; toggles | REPLACED | N1: Mixamo character and animations only (G208, G264, G406-G411) |
| 5.12 (795-796) | Every animation realistic, no clipping | DIRECTION-FITS | G199, G210 (trained-operator reference) |
| 5.12 (797-798) | Feel notes: legs and elbows in, not crab-like | FEEDBACK | G207: his animation notes |
| 5.12 (799-800) | Feel notes: fewer strides, no lean, arms in | FEEDBACK | G217: his walk notes |
| 5.12 (801-802) | Priorities: readability, believability, then polish | DIRECTION-FITS | Pillar 3; polish last |
| 5.12.1 (808-817) | One-step gameplay, continuous pose, anticipation | TECH | Animation engine rules |
| 5.12.2 (819-858) | Realism limits: continuity, contact, motion, timing | TECH | Audit limits in `src/anim/audit/limits.ts` |
| 5.12.2 (860-862) | Guard postures readable at 15 m | DIRECTION-FITS | Pillar 3 |
| 5.12.3, 5.12.4 (864-883) | Pose viewer, tuner, audit harness, MPFB2 | TECH | Tools (G211, G219, G226, G228) |
| 5.17 D2 (971-983) | No-bobble limits | TECH | Audit limits; no camera bob fits G29 |
| 5.13 (887), 6 (1027) | Health bar, no regen, wall medkits only | DIRECTION-FITS | G20, G98 |
| 5.13 (893) | Checkpoint restores at least 50% health | DIRECTION-FITS | Nothing newer contradicts it |
| 5.13 (895) | Late scanner hack costs 10 HP | DIRECTION-FITS | G193 |
| 5.13 (898-899) | Headshots on players do double damage | DIRECTION-FITS | Nothing newer contradicts it |
| 5.14 (903) | Two operators, Wren and Moth | DIRECTION-FITS | Vision s5 (G71) |
| 5.14 (903-904) | Tally and Sexton as radio crew | ASK | Same as G112; not a new question |
| 5.14 (906-912), 10 (1211-1212), 11 (1266-1267) | Own operator pipeline; Wren for both; Wren's kit | REPLACED | N1: Mixamo character for players, Wren the menu hero (G72, G74, G123) |
| 5.14 (908), 11 (1251-1252) | Operators branch keeps its own decisions | GONE | Old branches (N14) |
| 5.14 (917-920), 5.14 (923-926) | Wren green, Moth purple; cyan stopgap | DIRECTION-FITS | Vision s9 (G196); the cyan stopgap ends once both operators are playable |
| 5.14 (928) | Roles are personality, never stats | DIRECTION-FITS | N34 |
| 5.16 (938-940) | CT's look copied, never its assets | TECH | IP rule (G5) in CLAUDE.md |
| 5.16 (939) | Aim to surpass CT's fidelity | FEEDBACK | Michael 2026-10-09 |
| 5.16 (942-945) | Realistic, varied guards; new guard models on | REPLACED | N1: Mixamo guards; his variety wish is FB in G310 / G320 |
| 5.16 (945), 10 (1220) | More co-op player characters after all levels | GONE | Only Wren and Moth (vision s5, s12) |
| 5.16 (946-948) | Win on lighting and atmosphere | DIRECTION-FITS | Pillar 2; after the polish ban |
| 5.16 (949) | Hollowmere: sodium orange against moonlight | DIRECTION-FITS | "Deep blacks" tempered by the vision s9 lift |
| 5.16 (951) | Filmic grading, subtle grain | DIRECTION-FITS | Look rule |
| 5.16 (955) | Each map sets its palette and lighting key | TECH | Map docs |
| 5.16 (956-957) | Beauty shots compared privately with CT | TECH | Never in the repo (N33) |
| 5.16 (958), 10 (1218) | Art guide waits for the prototype | REPLACED | Polish ban (vision s11, SCOPE) |
| 5.17 D1 (969-970) | Touch gone except menu taps and touch look | TECH | G12, G395 |
| 6 (1015-1016) | Old cover-shooter systems | GONE | Removed |
| 6 (1017-1019) | Phones and touch controls | GONE | Phone work removed |
| 8 (1138-1143) | Phone test-launch presets; iPad fit | TECH | G182, G215, G216, G218, G311 |
| 6 (1020-1021) | Wave, deathmatch, PvP code | GONE | Old modes |
| 6 (1023-1024) | Retired maps | GONE | Removed |
| 6 (1025) | Emotes and solo Training mode | GONE | Removed |
| 6 (1026) | Drone, difficulty sliders, alarm tolerance | GONE | No drone (vision s10); one difficulty |
| 6 (1045-1046) | Four non-CT movement ideas; 62-item list | GONE | Removed under "pure CT" (G11, G39); any return goes through SCOPE's five questions |
| 6 (1050-1051) | Hunter and the old Mission mode | GONE | N2 |
| 6 (1052) | Credits, XP, shop, cosmetics | GONE | Progression and cosmetics removed |
| 6 (1053) | Drone operator guard | GONE | SCOPE parks drone operators |
| 6 (1054), 7 (1107-1108), 11 (1257-1258) | Fallow bunker | GONE | N1 |
| 6 (1055-1056) | Parked maps; frozen Warehouse | GONE | N23; N2 |
| 6 (1058), 11 (1235), 11 (1254-1255) | Kestrel paused | REPLACED | N1: kept, to become the level editor; scope is D19 |
| 6 (1073) | No kill cams, no monetisation | DIRECTION-FITS | Vision s1 (sold once, Friend's Pass) and s12 (no progression) |
| 6 (1074) | Voiced story lines later | DIRECTION-FITS | G82; voice is D16 |
| 7 (1081-1082) | Level-design standard governs every map | TECH | Map rule in CLAUDE.md; the standard itself is sorted separately (N42) |
| 7 (1086-1087) | Linear spine with loops inside sections | DIRECTION-FITS | G284; vision s7 splits meet within about 3 minutes |
| 7 (1089-1093) | Marlow Yard guided; side routes closed | DIRECTION-FITS | Vision s6 (G292, G363, G388) |
| 7 (1093-1095) | Each exercise forces one move; coverage exempt | DIRECTION-FITS | G389, G392 |
| 7 (1096-1097) | Marlow guidance marks; no explainer pads | DIRECTION-FITS | G277, G383 |
| 7 (1099-1102) | Marlow luxurious facility, dressed after greybox | REPLACED | Polish ban (vision s11); SCOPE: the prologue is rebuilt (G225, G272, G278) |
| 7 (1102-1105) | Marlow lit; instructor gallery; armed guards | DIRECTION-FITS | G206, G279, G298, G312 |
| 7 (1109-1111) | Connectivity JSON and validator before greybox | ASK | Same as G284; not a new question |
| 7 (1111-1113) | Greybox exit: light measured, bot route-runs | TECH | G330, G372 |
| 7 (1113-1114) | Walk card; one-click plan sign-off | GONE | Old process (G288) |
| 7 (1118), 10 (1208-1209) | ROADMAP.md holds the order | GONE | The control panel issue holds state (N5) |
| 7 (1119-1123) | Twelve level-rule changes adopted | DIRECTION-FITS | G404; Tallow walk part replaced; splits now about 3 minutes |
| 7 (1124) | One folder per map | TECH | G55 |
| 7 (1130-1131) | Required map deliverables | TECH | level-design s13 |
| 8 (1152) | Installs and loads offline | TECH | No runtime network dependency (CLAUDE.md) |
| 8 (1154-1155) | Personal project; no store builds | REPLACED | N5, vision s1 / s13: Steam release with a Friend's Pass, nothing spent beyond Steam's fees |
| 9 (1168-1171) | Branches, rolling trains, preview slots | GONE | N4, N14: one build, no trains |
| 9 (1172-1176) | Prototype-then-orchestrator; walk cap; idle lead | GONE | Old process |
| 9 (1177-1181) | Daily decision folding; ROADMAP jobs; doc lint | GONE | N5, N9 |
| 9 (1182-1186) | Model split, pacing, checkers, session layout | GONE | Old process (N4) |
| 9 (1187) | Overnight rule loosenings | REPLACED | N12: no assumed rules (G358) |
| 9 (1188-1192) | Laptop queue, watchdog, automatic trains | GONE | N1, N4 |
| 9 (1193-1195) | Version numbers per merge | TECH | G84, G93, G183 |
| 9 (1196-1197), 9 (1200) | Test tiers; quarantine makes a suite blocking | GONE | N4: GitHub CI tests every change |
| 9 (1198-1200) | Checklists; picture gate needs Michael's sign-off | TECH | G92, G391 |
| 9 (1201-1202) | Token hygiene | GONE | Old process |
| 10 (1213-1217) | Goal and the work under it | GONE | Master plan phases (N5); Sector Ops, Tallow and piano work gone |
| 11 (1234) | Fire alarm unlocks electric doors | DIRECTION-FITS | A world trick in the N37 family; a per-mission call |
| 11 (1244-1246) | Open menu-job items | DIRECTION-FITS | Menu details for their phase; a briefing with no map matches D8 |
| 11 (1265) | Look-at order, muzzle rule, thermal cooling | TECH | Phase 3-4 tuning details; the electro list hangs on G99 |
| 11 (1268) | Course callsigns; bunker solo switch | REPLACED | Vision s5: Wren and Moth throughout; bunker gone |
| App. B (1273-1284) | Job report template | GONE | Old process |
| App. C (1291) | Checker asks "Is it Chaos Theory?" | REPLACED | Vision s3 one rule and SCOPE's five questions |
| App. C (1288-1300) | Other checker items | TECH | Hot paths, saves, wire versions, names (CLAUDE.md) |
