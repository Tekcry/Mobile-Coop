# Level standard, scale sheet and map spec, sorted (N42, 2026-11-02)
Owner: the orchestrator. Status: current (review input for Michael; sorted against vision v3 and N1-N43).

| File section (line) | Short title (under 10 words) | Bucket | Why (one line) |
|---|---|---|---|
| level-design header (2-4) | Standard changes only with Michael's approval | DIRECTION-FITS (in template) | CLAUDE.md and the template keep the approval rule; owner "Marlow Build" is an old job name |
| level-design header (5-8) | Constants re-checked by grep; sizes in scale sheet | TECH | Where numbers live and how they are confirmed |
| level-design Modes and tags (10-15) | Mode tags and validator profiles | TECH | Validator scoping; the [SectorOps] tag now covers only removed things |
| level-design Campaign profile (17-18) | Mission 1 Tallow Wharf on Sector Ops runtime | GONE | Tallow Wharf as Mission 1 removed (N2); the engine is D18 |
| level-design Campaign profile (19-27) | Campaign profile rule list | DIRECTION-FITS (in template) | A pointer list sorted rule by rule below; its 32 ceiling and no-civilians items are REPLACED (N38, N37) |
| level-design Sector Ops profile (29-38) | Sector Ops profile, 1-4 players, dogs | GONE | Sector Ops and 3-4 players removed (N1) |
| level-design Training profile (40-43) | Marlow Yard is a guided training course | DIRECTION-FITS (missing) +FB | Prologue (vision s6, G292); FB: "heavily guided and must teach the players the basics of coop gameplay" |
| level-design Training profile (44) | Prologue two players, 15-20 minutes | DIRECTION-FITS (missing) | G272, G308 two-player part; vision s6 gives no length |
| level-design Training profile (45-51) | One linear route, side routes only late | DIRECTION-FITS (missing) +FB | G388 "Close all side routes, force all sections", G363 |
| level-design Training profile (52-53) | Guidance marks and objective list, no pads | DIRECTION-FITS (missing) | G277, G383 prologue guidance |
| level-design Training profile (53) | Prologue has no compass or blip | REPLACED | Compass bar for the whole game (D8, vision s9; G339) |
| level-design Training profile (54) | Prologue: no strict rules, every failure retries | DIRECTION-FITS (missing) +FB | G370 "all are retries in marlow yard, as its a training exercise" |
| level-design Training profile (55) | Timed drills; failed drill retries only itself | DIRECTION-FITS (missing) +FB | G342 "it must force players into situations", G361 |
| level-design Training profile (56-57) | Prologue lit by default, players cut lights | DIRECTION-FITS (missing) +FB | G279 "In game levels are quite dark and not realistic" |
| level-design Training profile (58) | Only the guards each exercise needs | DIRECTION-FITS (missing) +FB | G376 "Doesn't necessarily always need a guard"; the 3-per-set cap is TECH |
| level-design Training profile (59-61) | Each exercise forces its move in place | DIRECTION-FITS (missing) | G392, G389; vision s6 teaches each move on its own |
| level-design Training profile (62-63) | Campaign two-player checks skip Marlow | TECH | Validator scoping |
| level-design 1 (66-68) | Player is predator, not prey | DIRECTION-FITS (missing) | Chaos Theory fantasy; nothing newer contradicts it |
| level-design 1 (67-68) | Combat possible, never required | ASK | Same question as G127 (may a mission ever require a kill?); vision s8 also says hiding, not fighting, is the answer |
| level-design 1 (70) | Core loop: observe, plan, execute, improvise, release | DIRECTION-FITS (missing) | Fits vision s4 and the dark lookout per area |
| level-design 2.1 (73-75) | Real building first; change the idea, not building | ASK | When a fun team move has no believable reason in the building, drop the move (old rule) or adjust the building? |
| level-design 2.2 (76-78) | "Why is it here?" for every element | DIRECTION-FITS (missing) | Template asks for a real place but not a reason per element |
| level-design 2.3 (79-80) | Moves come from real building elements | DIRECTION-FITS (missing) | Template has no verb-to-element mapping |
| level-design 2.4 (81) | Real proportions for era and type | DIRECTION-FITS (in template) | Template step 2 "real dimensions" |
| level-design 2.5 (82-83) | Same look means same behaviour | DIRECTION-FITS (missing) | Supports pillar 4 (always know where to go) |
| level-design 2.6 (84-86) | Gate with real locks, never invisible walls | DIRECTION-FITS (missing) | Template has clear level bounds but not owned locks / no invisible walls |
| level-design 3 (89) | Spine of encounter spaces and connectors | DIRECTION-FITS (in template) | Areas joined by quiet connectors |
| level-design 3.1 (90-92) | Dark entry vantage, all guards seen, 70% | DIRECTION-FITS (in template) | Template "Entry vantage" (G284 numbers) |
| level-design 3.1 (92-93) | Vantage has room for both players | DIRECTION-FITS (in template) | Vision s7 "room for two" (G404) |
| level-design 3.1 (93-94) | Prologue vantage lit until the drill cuts it | DIRECTION-FITS (missing) | Prologue rule (G279) |
| level-design 3.2 (95-100) | Shadow, high, loud routes plus a secret | REPLACED | Vision s7: 2-3 ways (shadow, high, team move, tool/trick/intel); no loud route, no fourth secret route |
| level-design 3.3 (101-103) | Routes cross and rejoin at a pinch point | DIRECTION-FITS (in template) | Template "Routes" |
| level-design 3.4 (104-107) | Loops, no dead ends, line of sight broken in 5 s | DIRECTION-FITS (in template) | Template "Routes" |
| level-design 3.5 (108-109) | Stepping stones on shadow routes | DIRECTION-FITS (in template) | Template sizes (4-8 m) |
| level-design 3.6 (110-111) | Height is safety; guards see poorly above | DIRECTION-FITS (missing) | G44; template has a vertical team route but not the height principle |
| level-design 3.6 (111-113) | Static lookouts on some high routes | DIRECTION-FITS (missing) | G335, G378 |
| level-design 3.7 (114-115) | Sightline control at corners and doorways | DIRECTION-FITS (missing) | Readable layout; not in template |
| level-design 3.8 (116-117) | Quiet connectors glimpse the next space | DIRECTION-FITS (in template) | Template space rules |
| level-design 3.9 (118-122) | Dark checkpoint before every area; section restart | DIRECTION-FITS (in template) | Vision s10; spacing still open as D25 |
| level-design 3.10 (123-124) | Both reach exit; exit under 2 min or new route | DIRECTION-FITS (in template) | G138, G404; template beat chart shape |
| level-design 4.1 (127-129) | Every guard has a job and employer | DIRECTION-FITS (in template) | Vision s8; people sheet "Job tonight" |
| level-design 4.2 (130-131) | Mix patrol types; adjacent spaces differ | DIRECTION-FITS (missing) | Fits pillar 3; template has no patrol-mix rule |
| level-design 4.3 (132-133) | Clockwork patrols, no planning-breaking randomness | DIRECTION-FITS (in template) | Template patrol timings |
| level-design 4.4 (134-135) | Every guard has a moment alone | DIRECTION-FITS (in template) | Vision s8; people sheet "Moment alone" |
| level-design 4.4 (135-137) | Paired patrols: split them or synced takedown | DIRECTION-FITS (in template) | G335, G180; people sheet "Pair for a double drop?" |
| level-design 4.4 (137-139) | Patrol pockets with separate takedown spots | GONE | [SectorOps] only (G190 spirit kept in vision s7) |
| level-design 4.5 (140-141) | Guards cover each other | DIRECTION-FITS (in template) | People sheet "Covers / covered by" |
| level-design 4.6 (142-143) | Lures send guards somewhere useful | DIRECTION-FITS (missing) | Fits N37 world tricks; template does not say where a lure must send a guard |
| level-design 4.7 (144-145) | Hide spot near takedowns; a patrol finds bodies | DIRECTION-FITS (in template) | Template "Bodies get found" |
| level-design 4.8 (146-147) | Every spotting place has a hide or escape | DIRECTION-FITS (in template) | Template "every search area has a hiding spot" |
| level-design 4.9 (148-152) | As many guards as realistically possible | REPLACED +FB | N38 (20-30 per mission); FB G289 "As many guards as realistically possible" |
| level-design 4.9 (153-154) | Campaign: 32 alive per section ceiling | REPLACED | N38 (G359); "spawns its sections" means loading, not reinforcements |
| level-design 4.9 (155-159) | Sector Ops counts S1-S5 per player count | GONE | Sector Ops, 3-4 players |
| level-design 4.9 (160-161) | Prologue sets: only needed guards, max 3 | DIRECTION-FITS (missing) | G376 (prologue) |
| level-design 4.10 (162) | No heavies or dogs; armour with alarm stages | DIRECTION-FITS (in template) | G155; template "an alarm makes the guards already there tougher" |
| level-design 4.10 (163) | Alarm teams carry no riot shields | REPLACED | Vision s8: no alarm teams, never spawned (G377) |
| level-design 4.10 (163-165) | Sector Ops dogs, riot shields, late armour | GONE | Sector Ops; dogs parked (G348, G374) |
| level-design 4.10 (165-166) | Helmets by difficulty | REPLACED | One difficulty (vision s10; G350) |
| level-design 4.11 (167-169) | Every security device protects something named | DIRECTION-FITS (in template) +FB | Template step 2; FB G295 "why would they be there in that location, what are they protecting" |
| level-design 4.11 (169-172) | Devices placed like real ones; weak spots have reasons | DIRECTION-FITS (missing) | Door contacts, high motion sensors, real camera blind spots; template has the weak-spot part only |
| level-design 4.11 (172-176) | Security rises by section; bulletproof, thermal cameras | GONE | [SectorOps]; which ideas carry over is already asked as G307 |
| level-design 4.12 (177-178) | Unavoidable guards | GONE | [SectorOps] only; already asked as G303 |
| level-design 5.1 (181-183) | Every lit pool has a visible source and switch | DIRECTION-FITS (in template) | Template "Light, sound and devices" |
| level-design 5.1 (183-185) | Every lamp on; darkness only from gaps or cut power | DIRECTION-FITS (missing) +FB | G367 ("Never"); template does not forbid dead lamps |
| level-design 5.2 (186-188) | Lit chokepoint: two ways to darken or hardened | DIRECTION-FITS (in template) | G333, G152 |
| level-design 5.3 (189-191) | Loud and quiet floors from the real finish | DIRECTION-FITS (missing) | Pillar 6; template has the side-by-side part only |
| level-design 5.3 (191-192) | Quiet and loud version of an action side by side | DIRECTION-FITS (in template) | Template "Light, sound and devices" |
| level-design 5.4 (193) | Readable at Low; lit and dark match meter | DIRECTION-FITS (missing) | Vision pillar 2; CLAUDE.md light parity |
| level-design 5.5 (194-200) | Real-world light levels per space type | DIRECTION-FITS (missing) +FB | G329 "Real-world levels", G368; template does not mention light bands |
| level-design 5.5 (200-201) | Floor shadow share is information only | TECH | Validator reporting |
| level-design 5.5 (201-202) | Prologue lighting never the campaign fallback | DIRECTION-FITS (missing) | G279 narrowed by G367 |
| level-design 5.6 (203-205) | Machines show on and off; lit windows expose | DIRECTION-FITS (in template) | G144 |
| level-design 5.6 (205-206) | Weather only where the map has weather | DIRECTION-FITS (missing) | Not in template; vision silent |
| level-design 6.1 (209-210) | One new mechanic per space | REPLACED | Vision s7: at most one new mission toy per mission; template four-step teaching |
| level-design 6.1 (210-211) | Ends in a set piece; finale seen early | DIRECTION-FITS (in template) | Joint climax; "the final area is seen early" |
| level-design 6.2 (212-214) | Tension and release; never three 4-5 in a row | DIRECTION-FITS (in template) | Template beat chart shape |
| level-design 6.2 (214-217) | Minute targets, signature moments, twist at 40-60% | DIRECTION-FITS (in template) | Vision s7 (C6) |
| level-design 6.3 (218-220) | Player sets the pace; soft windows only | DIRECTION-FITS (in template) | G334 |
| level-design 6.3 (220-223) | Prologue timed drills, drill limit in graph | DIRECTION-FITS (missing) +FB | G342 "Marlow can use timed drills" |
| level-design 6.4 (224-227) | Objectives name what and where; level leads | DIRECTION-FITS (missing) +FB | Vision s9; FB G336 "level design must flow naturally towards each objective"; template has landmarks but no objective-text rule |
| level-design 6.4 (227-229) | Objective fades; View or O shows it 5 s | DIRECTION-FITS (missing) | G343; a HUD rule rather than a mission rule |
| level-design 6.4 (229-230) | No markers, maps, minimap, compass or blip | REPLACED | Compass bar (D8, vision s9; G339) |
| level-design 6.4 (230) | Optional hint layer, off by default | ASK | Already queued as D17 (difficulty and assists) |
| level-design 6.4 (230-232) | Two-minute test at every blocked route | DIRECTION-FITS (in template) | Template "Blocked spots" |
| level-design 7.1 (236-237) | Several tools per problem, and vice versa | DIRECTION-FITS (missing) | Fits vision s7 (2-3 ways); template lacks it |
| level-design 7.2 (238) | At least two toys in every space | DIRECTION-FITS (in template) | Template "world tricks in each area" |
| level-design 7.3 (239-240) | Ghost, non-lethal and lethal all viable | DIRECTION-FITS (in template) | Vision s10 rating; template "testably 100%-able" |
| level-design 7.4 (241) | Gadgets help, never required | DIRECTION-FITS (missing) | Fits vision s10 (missions may limit gear) |
| level-design 8.1 (244) | Always tell why you were seen | DIRECTION-FITS (missing) | Vision pillar 3 "every detection can be explained" |
| level-design 8.2 (245) | Threats telegraphed (lasers, torches, barks) | DIRECTION-FITS (missing) | Pillar 3 and 6 |
| level-design 8.3 (246) | Same detection states everywhere | DIRECTION-FITS (in template) | Template "One stealth ruleset everywhere" |
| level-design 8.4 (247-248) | Harmless noises read as harmless | DIRECTION-FITS (in template) | G404 |
| level-design 9.1 (251) | Detection escalates in steps | DIRECTION-FITS (in template) | Template "no instant fail on detection" |
| level-design 9.2 (252) | Failure is a new situation, not a reload | DIRECTION-FITS (in template) | Vision s8 narrows "fighting": hiding is the answer |
| level-design 9.3 (253-255) | Up to 2 strict rules; break one, restart section | DIRECTION-FITS (in template) | G290, vision s10 |
| level-design 9.3 (255-256) | Killing a civilian restarts the section | REPLACED | N37: harming staff costs rating (G353) |
| level-design 9.3 (256) | Rules per team or per split | GONE | [SectorOps] |
| level-design 9.4 (257-259) | Revive within 30 s, twice; both down, checkpoint | DIRECTION-FITS (missing) | Vision s10 (G126); D10 still tests a no-limit option |
| level-design 9.4 (260-263) | Revive syringes; die after 30 s | GONE | [SectorOps] (G188, G385) |
| level-design 10.1 (266) | Secrets, anchor takedowns, shortcuts reward curiosity | DIRECTION-FITS (in template) | Template "optional goal found by exploring" |
| level-design 10.2 (267) | Environmental storytelling through props | DIRECTION-FITS (missing) | Fits vision s6 (story told through documents) |
| level-design 10.3 (268) | Sightlines and glass preview the next space | DIRECTION-FITS (in template) | Template "Quiet connectors glimpse the next space" |
| level-design 11 (271) | CT co-op research is the co-op authority | REPLACED | Vision s1 "inspired by"; CLAUDE.md authority order (G3) |
| level-design 11 (271-274) | Targets declared in graph, measured, fail if missed | ASK | Already asked as G284 (keep the route-map check, with vision v3 numbers?) |
| level-design 11.1 (275-276) | Completable by two and by no fewer | DIRECTION-FITS (missing) | G2, G50, G253, vision s3; template implies it but never says it |
| level-design 11.1 (276-278) | Sector Ops 1-4 players, solo past doors | GONE | Sector Ops, 3-4 players |
| level-design 11.2 (279-281) | Sections in a fixed order, no skipping | DIRECTION-FITS (missing) | Vision s7 steps; template does not state the spine |
| level-design 11.2 (281-283) | Two independent routes per section | DIRECTION-FITS (in template) | Vision s7 2-3 ways |
| level-design 11.3 (286-288) | Split leg at most 90 s | REPLACED | Vision s7: splits end within about 3 minutes (G404) |
| level-design 11.3 (288-290) | Split legs within 20% of each other | DIRECTION-FITS (in template) | Template "Splits" |
| level-design 11.4 (291-292) | Every split has an assist for the other leg | DIRECTION-FITS (missing) | Pillar 1; template has light sharing but not an assist per split |
| level-design 11.5 (293-294) | An overwatch spot per split | DIRECTION-FITS (in template) | Template "Splits" |
| level-design 11.6 (295-298) | Downed partner reachable within 15 s | DIRECTION-FITS (in template) | Template "Splits" |
| level-design 11.6 (299-301) | Every forced gate has a solo way back | DIRECTION-FITS (missing) | Keeps revives possible across team gates |
| level-design 11.6 (302-303) | No softlock: solo route to every surface | GONE | [SectorOps] (G280) |
| level-design 11.7 (304-305) | Shared routes at least 2.0 m wide | DIRECTION-FITS (in template) | Template "Shared links at least 2.0 m wide" |
| level-design 11.8 (306-308) | Co-op lips between solo and boost reach | TECH | Size band from code (3.8 / 4.5 m) |
| level-design 11.8 (308-310) | Co-op routes are real architecture with a reason | DIRECTION-FITS (in template) | Template "Every two-person requirement has a real-world reason" |
| level-design 11.8 (310-313) | Unplanned boost targets removed or planned | TECH | Build check; G151 team moves work anywhere with room |
| level-design 11.9 (314-317) | Co-op kit, including five new moves | DIRECTION-FITS (missing) +FB | G293, G403 (SCOPE); FB "Any other creative coop ideas" |
| level-design 11.9 (318-322) | Graph kinds per kit move | TECH | Validator schema |
| level-design 11.9 (322-323) | Co-op routes in half the spaces, every section | DIRECTION-FITS (missing) | Pillar 1; template has beat minimums, not a coverage share |
| level-design 11.9 (318) | Missing move built by its co-op job first | GONE | Old job split (N4) |
| level-design 11.10 (325-327) | A forced co-op gate per section | DIRECTION-FITS (missing) +FB | G292 "must have forced coop traversal to proceed"; template has one two-body place per mission only |
| level-design 11.10 (328) | Team doors with a solo route past | GONE | [SectorOps] (G280) |
| level-design 11.11 (330-332) | Teamwork minimums per mission | DIRECTION-FITS (in template) | Template beat minimums |
| level-design 11.11 (333) | Nobody waits more than 60 s | DIRECTION-FITS (missing) | Vision s5 / It Takes Two "both always busy"; no number in template |
| level-design 11.11 (333-334) | Roles swap: not always the same booster | DIRECTION-FITS (in template) | N34, template beat chart |
| level-design 11.11 (334) | Joint actions forgiving, work with pings | DIRECTION-FITS (in template) | Template rules |
| level-design 11.11 (335) | Failed joint action raises alarm, never kills | DIRECTION-FITS (missing) | Fits vision s10 (alarms never fail) |
| level-design 12 (338-339) | Never change tuning for a map; change geometry | DIRECTION-FITS (missing) | Same as map-spec 34; not in template |
| level-design 12.1 (342-345) | Nav layers, depth, slopes up to 45 deg | TECH | Engine fact |
| level-design 12.1 (346-351) | Guard caps per mode (32, 3, 12, 9) | TECH | Code caps; Infiltration and Hunter modes are gone (N2) |
| level-design 12.1 (352-353) | Guard sight eases above eye line | TECH | Code (G44) |
| level-design 12.1 (354-356) | Automatic split gaps, hang lips, ambient zones | TECH | Build facts |
| level-design 12.1 (357-358) | Reach: 3.8 solo, 4.5 boost, 4.1 ladder | TECH | Code values |
| level-design 12.1 (359-361) | Five speeds; silent footsteps up to walk | TECH | Code (G40) |
| level-design 12.1 (362-368) | Door light cut, auto-close, door menu | TECH | Code; the door menu itself is asked as G19 / G198 |
| level-design 12.1 (369-373) | Hold noise and hearing model | TECH | Code (guard-ai S1) |
| level-design 12.1 (374-375) | Health only from wall medkits, no regen | TECH | Code (G98) |
| level-design 12.1 (376-377) | Sizes measured on the old camera | TECH | G54 |
| level-design 12.2 (382-383) | Guards notice a door left open | DIRECTION-FITS (missing) | G41; a guard rule rather than a mission rule |
| level-design 12.2 (384) | Re-measure widths on the CT camera | TECH | G54 |
| level-design 12.2 (385) | Human ladder reaches 4.5 m | DIRECTION-FITS (missing) | G57 stands (C8); template lists no human-ladder band |
| level-design 12.2 (386) | A medkit station in every map | DIRECTION-FITS (missing) | G98 |
| level-design 12.3 (391-393) | Sector Ops shot check relied on old hearing | GONE | Sector Ops |
| level-design 12.3 (394) | Kestrel paused, relies on old facts | REPLACED | N1 keeps Kestrel as the level editor; scope D19 (G53) |
| level-design 12.3 (395-396) | Door light cut 0.05 to 0.15 | TECH | Engine change log |
| level-design 13 (399-401) | One docs folder per map | TECH | G55 repo layout |
| level-design 13 (403-404) | Map spec from the map-spec template | REPLACED | MISSION-TEMPLATE.md, once Michael approves it |
| level-design 13 (406-413) | Connectivity graph passes the validator first | ASK | Already asked as G284; template step 5 keeps a connectivity graph and plan |
| level-design 13 (415-418) | Building brief contents | DIRECTION-FITS (in template) | Template step 2 |
| level-design 13 (420-423) | To-scale floor plans with gameplay overlays | DIRECTION-FITS (in template) | Template step 5 top-down plan; format details are TECH |
| level-design 13 (425-434) | Objective and lead plan | DIRECTION-FITS (missing) | Pillar 4; template has no per-objective plan; its Sector Ops "Who" column is GONE |
| level-design 13 (436-439) | Light plan per space | ASK | Keep the old extra design documents (space sheets, light plan, security register, element register, coverage table, tool/problem matrix, self-critique) or only the template's set? |
| level-design 13 (441-442) | Sound plan per space | DIRECTION-FITS (in template) | Template "soundscape note per area" |
| level-design 13 (444-449) | Security register and site security summary | ASK | Same question as the light plan row; its "alarm chain" also clashes with never-spawned guards (vision s8) |
| level-design 13 (451-452) | Checkpoint plan, at most 10 minutes lost | DIRECTION-FITS (in template) | G126, template checkpoints |
| level-design 13 (452-454) | Revive syringes and ammo crate per section | GONE | [SectorOps]; the ammo crate idea is already asked as G307 |
| level-design 13 (456-461) | Co-op plan per space | DIRECTION-FITS (in template) | Template beat chart columns; Sector Ops part GONE |
| level-design 13 (463-465) | Medkit and civilian plan | DIRECTION-FITS (in template) | Staff in the people sheet (N37); medkits are the 12.2 row |
| level-design 13 (465-466) | Mission 1 has no civilians | REPLACED | N37: 1-3 staff per mission (G373) |
| level-design 13 (468-484) | Space sheet per encounter space | ASK | Same question as the light plan row |
| level-design 13 (486-496) | Guard sheet per guard | DIRECTION-FITS (in template) | Template people sheet (it drops route points, gaps, lures, search) |
| level-design 13 (498-503) | Beat chart; three wow moments, five tests | DIRECTION-FITS (in template) | Template beat chart and ingredients |
| level-design 13 (505-506) | Coverage table of every verb | ASK | Same question as the light plan row |
| level-design 13 (508-510) | Tool / problem matrix, three tools each | ASK | Same question as the light plan row |
| level-design 13 (512) | Metrics check against constant windows | TECH | Measurement step |
| level-design 13 (514) | Element register | ASK | Same question as the light plan row |
| level-design 13 (516-518) | Self-critique: ten weakest points | ASK | Same question as the light plan row |
| level-design 13 (520-529) | Playtest checklist | DIRECTION-FITS (in template) | Template step 9 (PLAYTEST-KIT.md) |
| level-design 14 (532) | Phases back to back under a job lead | GONE | Old process (G87) |
| level-design 14 (533-534) | One-click sign-off: one-page plan, 5-line intent | DIRECTION-FITS (in template) | Template step 7 (G288 (4)) |
| level-design 14 (534) | 10-minute walk card after release | GONE | Old process (G288) |
| level-design 14 (534-535) | Tallow Wharf greyboxed before sign-off | GONE | Tallow Wharf as Mission 1 (G293) |
| level-design 14 (537-539) | G157: 12 changes, confirmed on Tallow walk | REPLACED | Settled by G404; Tallow Wharf removed (N2) |
| level-design 14 Phase 0 (540-541) | Setup: branch, spec verbatim, progress log | GONE | Old job process |
| level-design 14 Phase 1-2 (542-545) | Docs-only design phases; docs are the contract | DIRECTION-FITS (in template) | Template steps 1-7 |
| level-design 14 Phase 2 (546-549) | Validator gate before greybox | ASK | Already asked as G284 |
| level-design 14 Phase 3 (550-551) | Build with no guards first | DIRECTION-FITS (in template) | Template step 8 "walk it with no guards first" |
| level-design 14 Phase 3 (552-554) | Greybox exit: measured validator pass | ASK | Already asked as G284 |
| level-design 14 Phase 3 (554-558) | Bot route-runs, never stuck | TECH +FB | G330, G372; FB "Never stuck" |
| level-design 14 Phase 4-5 (559-560) | Guards, then dressing and verification | DIRECTION-FITS (in template) | Template steps 8 and 10 |
| level-design 15 (563-568) | Validator pass and measured targets | ASK | Already asked as G284 |
| level-design 15 (569-570) | Route-runs pass | TECH | Test rule (G372) |
| level-design 15 (571-574) | Engage, anchors, split gaps, nav order tests | TECH | Automated checks |
| level-design 15 (575-577) | Darkness test at vantages and lit pools | TECH | Test of pillar 2 parity |
| level-design 15 (578) | Loud floor draws the planned guard | TECH | Test |
| level-design 15 (579) | Patrol points on nav grid, cycle times | TECH | Test |
| level-design 15 (580-582) | Ghost run by two players earns every bonus | DIRECTION-FITS (in template) | Template "testably 100%-able" (G138) |
| level-design 15 (583-585) | Co-op host/client, solo-proof lips, revive per surface | TECH | Tests; Sector Ops solo part GONE |
| level-design 15 (586-588) | Goggle-light colours told apart at 20 m | ASK | Depends on G73 (do the Mixamo operators wear glowing goggles?) |
| level-design 15 (589) | Performance budgets on desktop | TECH | Perf |
| level-design 16 (592-594) | Michael's building-logic notes, 2026-10-10 | FEEDBACK | His own playtest notes behind 16.1-16.10; worth keeping as a record |
| level-design 16.0, 16.3.5, 16.8 (596-598, 635, 680-685) | Pointer rules back to sections 2, 4, 5 | TECH | Cross-references only; sorted at their targets |
| level-design 16.1.1 (601-603) | Building brief first, approved at the gate | DIRECTION-FITS (in template) | Template steps 2 and 7 |
| level-design 16.1.2 (604-605) | Sizes by era; gameplay widths never smaller | DIRECTION-FITS (in template) | Template sizes |
| level-design 16.1.3 (606) | A structural grid | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.1 (609-611) | Only stairs and plant ladders join floors | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.2 (612) | Never a ladder beside a stair | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.3 (613-614) | No ladder in a hole in a floor | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.4 (615-616) | Every stair complete with rails | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.5 (617-618) | Roof access by bulkhead or fire stair | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.6 (619-620) | Exterior climbing uses real elements | DIRECTION-FITS (missing) | Building realism |
| level-design 16.2.7 (621-622) | Two separate staircases per multi-storey building | DIRECTION-FITS (missing) | G404 |
| level-design 16.3.1 (625-626) | Every opening has a stated function | DIRECTION-FITS (missing) | Building realism |
| level-design 16.3.2 (627-629) | No hole except real openings | DIRECTION-FITS (missing) | Building realism |
| level-design 16.3.3 (630-631) | No barrier blocking a door or window | DIRECTION-FITS (missing) | Building realism |
| level-design 16.3.4 (632-633) | A vent ends a real duct system | DIRECTION-FITS (missing) | Building realism |
| level-design 16.3.6 (634-635) | Escape exits open from inside | DIRECTION-FITS (missing) | G404 |
| level-design 16.4.1 (640-641) | No block without a named real object | DIRECTION-FITS (missing) | Building realism |
| level-design 16.4.2 (642-643) | Real clearances at panels, doors, exits | DIRECTION-FITS (missing) | Building realism |
| level-design 16.4.3 (644-645) | Roof objects are roof equipment | DIRECTION-FITS (missing) | Building realism |
| level-design 16.4.4 (646-647) | Low cover from real objects | DIRECTION-FITS (missing) | Building realism |
| level-design 16.5.1-16.5.2 (650-652) | Roofs and upper floors fully covered | DIRECTION-FITS (missing) | Building realism |
| level-design 16.5.3 (653) | Parapet or rail at worked roof edges | DIRECTION-FITS (missing) | Building realism |
| level-design 16.6.1 (655-657) | No zig-zag partitions to force a path | DIRECTION-FITS (missing) | Building realism |
| level-design 16.6.2 (658-659) | Every space has a purpose and fitting access | DIRECTION-FITS (missing) | Building realism |
| level-design 16.6.3 (660-661) | No dead end needing an invented door | DIRECTION-FITS (missing) | Building realism |
| level-design 16.6.4 (662-663) | Circulation reads as a hierarchy | DIRECTION-FITS (missing) | Supports pillar 4 |
| level-design 16.6.5 (664-665) | Realistic signs; secure rooms unsigned | DIRECTION-FITS (missing) | G404 |
| level-design 16.7.1 (668-670) | Tunnels and ducts only as real systems | DIRECTION-FITS (missing) | Building realism |
| level-design 16.7.2 (671-672) | Walk-in tunnels 2.1 m, guards can enter | TECH | Size and nav fact |
| level-design 16.7.3 (673-674) | Crouch ducts 1.2 x 1.5 m, no auto-crawl | DIRECTION-FITS (in template) | G56; template "crouch duct 1.2 x 1.5 m" |
| level-design 16.7.4 (675-676) | Duct ends real; grilles look-through only | DIRECTION-FITS (missing) | Building realism |
| level-design 16.7.5 (677-678) | Ducts inside walls; boxes become lips | TECH | Engine fact (accidental mantles and lips) |
| level-design 16.9 (687-694) | Element register for every route element | ASK | Same question as the light plan row |
| level-design 16.10 (696-714) | 16-question building review checklist | ASK +FB | Keep your 2026-10-10 building checklist as a pass/fail review for every mission, or as guidance only? |
| level-design Rule index (716-766) | Rule-to-check index | TECH | Validator mapping |
| level-design Open item 1 (770-771) | Human ladder 4.1 m in code vs 4.5 m | TECH | Settled as C8 (code catches up in Phase 4) |
| level-design Open item 2 (772) | Crouch-duct height re-measured | TECH | G54 |
| level-design Open item 3 (773-774) | Fire alarm unlocking doors as a tool | ASK | May players set off a fire alarm to unlock electric doors, as one of the world tricks? |
| scale-sheet header (2-4) | Measured from code; never resize the player | TECH | Source of every size |
| scale-sheet 1 (10-12) | Capsule, eye height, camera | TECH | Code values |
| scale-sheet 1 (13-14) | Speeds and silent speeds | TECH | Code (G40) |
| scale-sheet 1 (15) | Guard walk speeds (incl. heavy, sniper) | TECH | Code; heavies parked (G155) |
| scale-sheet 1 (16-20) | Step limit, stairs, nav grid, ladder, wall jump | TECH | Code values |
| scale-sheet 1 (22) | Door height 2.1 m, 2.0-2.2 | TECH | Proportion fact; template doors 1.2 x 2.1 |
| scale-sheet 2 (24-32) | Camera sets corridor and bend widths | TECH | Measured on the old camera (G54) |
| scale-sheet 3 (38-42) | Door, double door, opening, roller sizes | TECH | Template sizes |
| scale-sheet 3 (43-44) | Corridor 3.5-4.0 m; play space 6 m | TECH | Template sizes |
| scale-sheet 3 (45-46) | Ceilings 3.0 m, storey 3.3 m, 2.4 m floor | TECH | Template storey 3.3 m |
| scale-sheet 3 (47-50) | Fire stair, open stair, risers, ladder shaft | TECH | Building sizes |
| scale-sheet 3 (51-52) | Crouch duct 1.2 x 1.5 m; tunnel 2.1 m | TECH | Template sizes (was 0.9 x 1.3, too low for the camera) |
| scale-sheet 3 (53-55) | Co-op lip, split gap, pull-up lip bands | TECH | Pull-up "on the mission-framework branch" is stale |
| scale-sheet 3 (56) | Relay lip 4.3-4.6 m | TECH +FB | Template band; FB he picked "Keep 4.6 m (Recommended)" |
| scale-sheet 3 (57) | Two-person rope 2.2-6.0 m | TECH | Template band; the "/preview/" note is stale (N14) |
| scale-sheet 3 (58) | Throw gap at most 2.7 m | TECH | Template band |
| scale-sheet 3 (59) | Long throw 4.9 m at named spots only | TECH +FB | FB "Mix of both"; both named spots were in Tallow Wharf (gone), so none exist now |
| scale-sheet 3 (60-63) | Shutter gap, low cover, step band, recess | TECH | Template sizes |
| scale-sheet 4 (65-75) | Nav limits for doors and stairs | TECH | Derived from code |
| scale-sheet 5 (79-82) | Door spacing rules | DIRECTION-FITS (missing) | Layout craft; not in template |
| scale-sheet 5 (83) | Cover every 8 m; no 12 m bare run | DIRECTION-FITS (in template) | Template "cover every 8 m" |
| scale-sheet 5 (84) | Stepping stones 4-8 m apart | DIRECTION-FITS (in template) | Template sizes |
| scale-sheet 6 (86-90) | Australian building code check | TECH | Reference |
| scale-sheet 7 (94-100) | Rooms scaled 1.4 x real | TECH +FB | Validator input; FB "Add 1-4 as extras" |
| scale-sheet 7 (102-117) | Camera floors per room kind | TECH | Validator parameters |
| scale-sheet 7 (121-140) | Room size table by class | TECH | Validator data |
| scale-sheet 8 (148-149) | Split and reach speeds | TECH | Code speeds |
| scale-sheet 8 (150) | Split leg at most 90 s | REPLACED | Vision s7: about 3 minutes; metrics.json still holds 90 |
| scale-sheet 8 (151-153) | Legs within 20%; reach 15 s; shared 2.0 m | DIRECTION-FITS (in template) | Template "Splits" |
| scale-sheet 8 (154-155) | Shadow share 0.4-0.6, information only | TECH | Validator INFO |
| scale-sheet 8 (156-157) | Vantage 70%; line of sight broken in 5 s | DIRECTION-FITS (in template) | Template space rules |
| scale-sheet 8 (158-160) | Step band, snap grid | TECH | Code |
| scale-sheet 8 (161) | Dead end at most 15 m, payoff only | DIRECTION-FITS (in template) | Template "Routes" |
| scale-sheet 8 (162-163) | Guard bands 3-6 early, 6-10 late, no top | REPLACED +FB | N38; FB "as many guards as realistically possible" |
| scale-sheet 8 (164) | 32 alive per section ceiling | REPLACED | N38 (G332, G359) |
| scale-sheet 8 (165-166) | Safe drop 4.5 m; nav floor depth 1.5 m | TECH | Code |
| scale-sheet 8 (167) | Mission 3-6 steps | REPLACED | Vision s7: 3-5 steps |
| scale-sheet 8 (168) | Each step 2-5 minutes | DIRECTION-FITS (in template) | Template beat chart |
| scale-sheet 8 (169) | Mission 10-30 minutes | REPLACED | Vision s7: 20-30 minutes (C5) |
| scale-sheet 8 (170) | At most 2 strict rules | DIRECTION-FITS (in template) | G290, vision s10 |
| scale-sheet 8 (171-172) | Sector Ops parallel objectives, sync nodes | GONE | Sector Ops |
| scale-sheet 8 (174) | Targets measured in greybox; miss fails | ASK | Already asked as G284 |
| scale-sheet 9 (176-181, 188-198) | Light bands per space type (all TBD) | DIRECTION-FITS (missing) +FB | G329 "Real-world levels", G368; values still empty |
| scale-sheet 9 (183-186) | Interim: light like a real site at night | DIRECTION-FITS (missing) | G329; prologue lighting is never the fallback |
| scale-sheet 10 (200-209) | Patrol cycle 25-45 s, stops, gaps | DIRECTION-FITS (in template) | Template people sheet rules |
| map-spec title (1-6) | Copy, fill and paste the job spec | REPLACED | MISSION-TEMPLATE.md, once Michael approves it |
| map-spec Context (8-11) | Job branch and worktree; the train merges | GONE | Merge trains and old branches (N4, N14) |
| map-spec Context (13-14) | New listed map follows the standard | REPLACED | MISSION-TEMPLATE.md, once approved |
| map-spec Context (16-17) | Mode: campaign, sector or training | GONE | Sector mode removed |
| map-spec Scope (19-22, 33) | Map job adds no new game systems | GONE | Old job split (N4); vision s7 allows one new mission toy |
| map-spec Scope (23-27) | Missions on the mission-engine branch | GONE | Branch gone (N14); engine choice is D18 |
| map-spec Scope (28-32) | Files a map job writes | TECH | Code layout; the Sectors file is gone |
| map-spec Scope (34) | Enemies and tuning never change; change the building | DIRECTION-FITS (missing) | Same as level-design 12 |
| map-spec Scope (35) | Other maps: no changes | GONE | Old job split |
| map-spec Originality (37-40) | Original design; never reuse other maps | DIRECTION-FITS (missing) | Fits N2 (fresh Mission 1) and N7 (never embed old maps) |
| map-spec Originality (41-42) | Learn builder calls from their signatures | TECH | Code practice |
| map-spec Rules 1 (45-46) | Read CLAUDE.md, RULES.md, VISION.md first | GONE | RULES.md and VISION.md are history (N9) |
| map-spec Rules 2 (47-48) | Confirm every name by grep; never invent | TECH | Code practice; fits N12 |
| map-spec Rules 3-6 (49-57) | Phase-by-phase job, spec verbatim, STATE.md | GONE | Old job process |
| map-spec Rules 7 (58-59) | Docs are the contract; deviations need approval | DIRECTION-FITS (missing) | Matches N12 (ask first) |
| map-spec Rules 8-9 (60-62) | Changelog fragment; hyphens; hard rules | TECH | G183, CLAUDE.md |
| map-spec Rules 10 (63-64) | Checks, e2e through the laptop queue | GONE | Test queues removed (N1, N4) |
| map-spec Building brief (66-80) | Building brief fields | DIRECTION-FITS (in template) | Template step 2; its two-staircase and weather lines are sorted at 16.2.7 and 5.6 |
| map-spec Stealth verbs (82-95) | Each stealth verb found in a real element | DIRECTION-FITS (missing) | Level-design 2.3 |
| map-spec Route (97-101) | Spaces with shadow, high, loud, secret routes | REPLACED | Vision s7 route kinds |
| map-spec Route (102) | Guard total as many as possible, per player count | REPLACED | N38 |
| map-spec Route (103-108) | Lookouts, blocked routes, exit run | DIRECTION-FITS (in template) | Template space rules and beat chart shape |
| map-spec Co-op routes (110-114) | Forced co-op gate per section, way back | DIRECTION-FITS (missing) | Level-design 11.10 and 11.6; Sector Ops part GONE |
| map-spec Co-op routes (115-118) | Teamwork minimums, role swaps, pings | DIRECTION-FITS (in template) | Template beat minimums and rules |
| map-spec Co-op routes (119) | Revive check per team-move surface | TECH | Test |
| map-spec Mission (122) | Map modes list (sector, sandbox) | GONE | Old modes |
| map-spec Mission (123) | Player counts per mode | GONE | 1-4 players and Sector Ops removed |
| map-spec Mission (124-127) | Mission data: sections, steps, strict rules | TECH | Engine data shape; rules part in template |
| map-spec Mission (128-131) | Objective chain, twist, wow moments | DIRECTION-FITS (in template) | Template beat chart |
| map-spec Mission (132) | Final test: two-player unseen run | DIRECTION-FITS (in template) | Template "testably 100%-able" |
| map-spec Mission (132-133) | Final test: goggle-light colours | ASK | Depends on G73 (glowing goggles on the Mixamo operators?) |
| map-spec Mission (134) | Theme: time, light bands, faction, weather | DIRECTION-FITS (missing) | Not in template |
| map-spec Mission (135) | Reinforcements, alarms, hide spots, switches | REPLACED | Vision s8: never spawned, so no reinforcements |
| map-spec Engine questions (137-138) | Phase 0 engine questions | TECH | Practice |
| map-spec Phases (140-144) | Validator gate, measured exit, walk card | ASK | Already asked as G284; walk card GONE (G288) |
| map-spec Future (146-148) | Future-systems paragraph, do not build | GONE | Old job process |
| map-spec Report (150-152) | Report format, walk-card lines, STOP | GONE | Old job process |
