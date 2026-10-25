# Mission audit part 1 - current level design docs and rules (2026-10-24)

Read-only audit. Pointers are `branch:path:line` (master unless named). Raw notes first, final synthesis at the end.

## Raw notes (appended while reading)

### CLAUDE.md (master)
- L8: "A 2-player co-op campaign only: cannot be completed solo; no bot partner, no 3-4 player play (G2, G48, G50)". Conflicts with coop4 job and Michael's 4-player Sector Ops ask.
- L28: training level = Marlow Yard (map `ctcourse`, Course mode).
- L211-213: every map follows level-design.md, spec from templates/map-spec.md; standard changes only with Michael's approval.
- L251: modes = Infiltration (campaign mode), sandbox, course (+ `course/` framework), Hunter `clear` and Mission parked.

### docs/level-design.md (master)
- Sections: none called "section"; unit is the **encounter space** on a linear spine joined by quiet connectors (3, L28-50).
- Routes per space: shadow / high / loud + secret in >= half of guarded spaces; no route strictly best; rejoin at a pinch point; no route skips a space (3.2-3.3, L32-37). Loop on shadow route (3.4).
- Guidance: 6.4 "Guide without waypoints. Landmarks visible from afar, light leading the eye, sightlines into the next space" (L87-88) - ONE line, no method. Quiet connectors glimpse next space (3.8 L47-48); 10.3 glass/sightlines (L111); entry vantage (3.1 L30-31); circulation hierarchy so a player can guess stairs (16.6.4 L343); consistent visual language (2.5 L23-24); gate with real things (2.6, 16.3.5).
- Objectives: only "objective/checkpoint at end of a space on a floor, in the dark" (3.9 L49-50); "set piece that uses everything" (6.1 L82-83). No objective types, no multi-step structure, no parallel objectives.
- Mission rules: 7.3 "Ghost, non-lethal and lethal all viable. Mission rules reward the harder styles (no alarms, no kills, undetected as bonuses)" (L94-95) - bonuses, not constraints; 9.3 "Instant failure only through a mission's own rules (e.g. no-detection)" (L106). 15 "ghost run succeeds with every bonus" (L287).
- Pacing: teach/test/twist, tension/release beat chart, no forced timers (6.1-6.3 L82-86).
- Co-op: Section 11 is SOLO FIRST (co-op routes extra, never required, solo invariance, no co-op markers) L113-124 - overruled for campaign maps by Michael 2026-10-22 (Open item 1, L389-393) but section 11 not yet rewritten. Co-op verbs: brace+boost, human ladder, dual takedown (11.6). G81 boosts only at marked spots (L179, L395-396) vs 11.2 "no co-op markers".
- 12.2 L181 "Two players only (G2, G50)". No 4-player rule anywhere.
- Deliverables (13): space sheet has Routes / Exit / Tension but NO field for objective, mission rule, guidance cue, co-op gate or player split. Template map-spec "Mission and modes" (map-spec.md:89-93) is one line: objectives in route order, rules.
- Interrogation: not mentioned in level-design.md, map-spec.md.
- 16 Level logic: architecture-first, reason test, element register; 16.6.1 no zig-zag forcing; 16.6.4 hierarchy readable.

### docs/templates/map-spec.md
- L16-18 scope: "no new objective types, mode logic, HUD elements" - a map job cannot add mission mechanics.
- L21 missions live in `src/config/missions.json`; L90-93 mission fields: id, name, insertion(s), brief, objectives in route order, rules, reinforce, alarms, hideSpots, switches.
- L84-87 co-op routes "solo route to the same surface" - solo-first wording, stale vs co-op only.
- L8 still says "Silent But Deadly", L109 "phone notes" - stale.

### docs/design/scale-sheet.md
- Pure dimensions (corridors 3.5-4.0, play space >= 6 m, cover every 8 m, no straight run > 12 m: L37-68). Nothing on missions or guidance. Measured on old camera (2026-10-10).

### docs/design-bible.md (master)
- 1 L55-56 / 5.9 C1 L590-591 / 6 L886: two players exactly, no 3-4 player play, "four-operator plan" out of scope.
- P3 L97-103: every space >1 route (high / shadow / loud), lethal + non-lethal; ghost always possible; "no mission forces a kill" (G127); test = 100% rating each mission (G146).
- P6 L118-121 / C4 L599: "levels built for the pair: team moves part of the route" - contradicts level-design 11 solo-first (resolved by G253 for campaign only).
- 3 Mission flow L134-144: briefing (text + annotated top-down map + fixed complementary kits G134/G153), insertion choice, space-by-space via vantage -> checkpoint, text radio, objectives in the MENU (G108; primary / secondary / opportunity), both extract (G138), results.
- 3 L151-152 + 5.7 L503-506 + G125: alarm level 0-3 escalates, no mission fails on alarm count; **"a mission has at most one hard rule, and it is signposted"**.
- 5.4 L403-421: grab is the hub; interrogate shows only when guard "has information" (G203-G205); "1-3 subtitled lines per guard type, data-driven per mission; can reveal an opportunity objective, a code or a patrol; intel into the field menu"; two-person non-violent questioning (G148: one distracts/bluffs, other reads a device or reaction) - not built.
- 5.7 L517-518 (G143): some codes / items / rooms vary per run, read in the world; patrols fixed. L520-522 civilians: flee to raise alarm, grab/interrogate, KO = rating penalty, killing one fails the mission.
- **5.8 L534-548 = the only mission-framework spec**: mission is data (map, spaces, insertions, objectives, rules, triggers, radio, checkpoints, kits, co-op moments), `validateMissions` schema. Objective tiers primary/secondary/opportunity; types terminal/download, plant, intel, rescue/escort, sabotage, extract, interrogate a named target. Rules `noAlarms`, `noKills`, `noBodiesFound`, `maxAlarmLevel`, each bonus OR fail, max one fail rule (G125); protected story characters (G145). Triggers (enter area, objective state, alert/alarm level, interrogation, item taken, light group) -> actions (radio, add/complete/fail objective, squad on/off, lock/unlock door, light group, reinforcements, checkpoint, end). No timers in stealth.
- 5.8 L552-554 checkpoints one per space, <= ~10 min loss (G126); L559-562 rating 0-100%, 100% = no kills + no alarms + all primaries; per-player stats.
- 5.8 L575-584 Sector Ops: Warehouse sections + connectors, objective then exit, ghosting always possible, no lives, stars; G201 fun-flow overhaul parked (G224); team doors G280.
- 5.9 C12-C18 L621-623: split-and-converge spaces, Sync countdowns, team results = "research", undecided.
- 5.9 C10 L609-611 (G135): no partner marker. 6 L917: "Never: world waypoints; forced timers in stealth".
- 7 L928-958: campaign maps recreate CT co-op levels (G3); per-map light plan "which route each light change opens", checkpoint plan, **co-op plan per space**; G157 12 proposed standard changes go to Michael before the first real mission map (not yet done). Marlow notes G272/G277/G279.
- 11 L1044: G157 still open.

### docs/DECISIONS.md (master)
- G2 L54, G50 L251 ("2 player maximum only"), G71 L334, G111 L497, G132 L704 ("strictly two humans, no solo variants"): no 3-4 players. **No G decision yet records a 4-player Sector Ops** (coop4 job is on a branch).
- G185 L995-998: Sector Ops = "solo or co-op", "for testing movement and gunplay without a partner"; section done by objective then exit; ghost always possible. Contradicts G132 "no solo variants" - Sector Ops is the explicit exception.
- G186 L1000-1003 sections + connectors that load/unload; G187 L1005 20-25 guards/section, own cap 32; G188 L1009 revive syringes, checkpoint = connector; G189 L1013 difficulty stars `sector:ops` kv; **G190 L1017-1021 every section 2-3 routes to objective and exit, patrols in separate pockets with takedown spots out of other guards' sight; check proves it per section**.
- G201 L1069 fun-flow overhaul may loosen level-design.md (parked by G224 L1196).
- G125 L677, G126 L682, G127 L687, G138 L728, G143 L744, G145 L750, G146 L753, G148 L760, G153 L781 (see bible).
- G108 L487 objectives in menu (CT) vs G277 L1431 Marlow "objective list updates per area and guides both players, per-player lines where the team splits" - Marlow uses an always-on list as the guidance device.
- G206 L1096 one interrogation guard in Marlow. G203-G205 grab menu.
- G253 L1327 campaign maps co-op only (level-design 11 solo rules void for campaign). G255 L1334 campaign spec waits until Marlow + Sector Ops warehouse done.
- G272 L1405 Marlow co-op scenarios: timed light isolation, cameras, locks, security room, timed jammer, sync hacking. G280 L1455 team doors true 2-player pathways, solo route kept.
- G238 L1267 Sector Ops fixes: security room, laser power panels, more co-op routes.
- MISSION RULES IN SECTOR OPS (orchestrator correction): nothing in DECISIONS or the bible forbids rules in Sector Ops; but nothing defines them either. G185 "kills optional, ghost always possible" and G189 stars are the only Sector Ops scoring. The bible 5.8 rules list (`noAlarms`/`noKills`/`noBodiesFound`/`maxAlarmLevel`, one fail rule max, G125) is written for "a mission" generally, not campaign-only, so it can apply to Sector Ops ops; the G125 "max one hard (fail) rule" cap would bind a Sector Ops op unless Michael exempts it. "Interrogate a named target" is an objective type, not a rule.

### docs/ct-research/levels-digest.md (master) - the real-level evidence
- L99-111: CT rules: perfect = no kills/injuries (KO free), never identified, no bodies, no alarms, all objectives; lethal allowed except where a mission forbids it; mission-specific hard fails (protected person dies, tripwire, UN HQ general alarm, killing UN staff).
- L115-117 objective tiers + twists rewrite objectives mid-mission. **L120-122 Signposting: sparse HUD, no waypoints/partner markers; "navigation leans on objective text that names places, in-world intel, rooms with obvious functions, overlooks, guard chatter and light"** - the CT answer to Michael's "guide without visual cues".
- L128-147 objective type -> co-op dependency table (retrieve, search, interrogate, eavesdrop, plant, escort, person-as-key, sabotage, defuse, machinery, exfil); dependency strength ranking L146-147.
- Interrogation in CT: official gives 3 codes (L221, L232), double + officer (L301-321), joint interrogation needed for locker code (L493-494, L40); protect-while-act around interrogation (L134).
- Constraint-style missions: UN HQ "no room for kills or alarms" (L578-579, L604-606) = strictest, and the anti-pattern A15 stacked instant fails (L796); PS2/GC sub-levels "carry constraint objectives ('finish without an alarm', 'without killing')" (L622-623) - closest CT precedent for Michael's "strict rules" missions.
- Multi-path in CT: Panama "one big loop", entry = exit by different path, optional loops behind codes (L223-254, L284); Seoul cafe two ways in (L334-337); Train Station metro split either side of a train (L487-488); PS2 high/low split re-merging (L367-368). Guide routes are mostly ONE route per mission with role splits, not 3 routes per space.
- 3.2 L677-714: 15 recurring co-op beats incl. split-path-and-sync, parallel routes that re-merge (L697-699), protect-while-act, captive-as-key, operator+spotter; space patterns L711-714 (foreshadow and return, hub room, one-way drops, overlooks, entry=exit loops).
- 3.3 L716-739 pacing: small beat every 2-3 min, set piece 5-8 min, primary every 5-10 min, twist 1/3-2/3, generic mission shape; "no partner separation without a defined merge point".
- 3.5 L781-806 anti-patterns: A3 solution above/far from problem with no tell -> "line of sight from problem to solution; visible cause and effect (cable runs, lit panel, sound)"; A4 machine state; A7 optional intel guarding a hard fail; A15 stacked fails; red flag "co-op puzzle one player can solve alone".
- 4 L810-896 "Pumphouse Nine" prototype beat list (insertion, jam-and-pass, lure, throw+release, overlook rest, hang-down, parallel routes -> sync finale, one-way exit) - the only worked mission flow in the repo; fixes "every solution in line of sight of its problem" (L866-867).

### docs/ct-research/design-kit-digest.md (master)
- 1.4 L85-135 36 principles: A6 "split often, every split ends at a named merge point or sync" (L93); A7 real-world reason for every two-person requirement; C21 "solution visible from the problem" (L112); C23 overlooks before major encounters; C24 show climax early (L115); D25 objectives chain through fiction, each moves the pair into new space (L118); F35 "the kit states the rules: a special mission rule is obvious from the loadout" (L133-134); F36 guidance has a voice (handler).
- 1.7 L194-211 pacing numbers (30-60 min, 3-6 primaries, 1-3 optionals, separation < 3 min, extraction < 2 min or different route).
- 1.8 L213-231 objective rules: chaining via in-world intel (recipe / investigation / event-gated / extension); every mission has one two-body, one protect-while-act, one reach objective; hard fail only for the one declared rule or a protected person.
- 1.9 L233-249 beat density minimums incl. "parallel-route section with a defined merge" >= 1.
- 2.1-2.3 L304-370: full MISSION_TEMPLATE (security profile, objective chain table with dependency + in-world source, zone list, ideal stealth route with "alternative routes (loud/fast, slow/safe, vertical); named merge points", comms aids), 13-step process, review checklist (D2 solution visible from problem found within 2 min; E5 separation < 3 min; F1 zero-failure path for two; I8 loadout signals special rules). NOT adopted: level-design.md has none of it.
- 3.8 L536-546 + Appendix L612-648: 12 proposed level-standard changes + 6 template changes - **all pending Michael (G157)**; none applied. Items 1, 4, 5, 6, 8, 9, 11 are exactly the mission-structure / guidance rules the ask needs.

### Marlow Yard - docs/marlow-final/SPEC.md + BRIEF.md (master; CTCOURSE-SPEC.md is superseded history, L3-8)
- BRIEF L19-21 (M4/G277): objective list is THE guidance; per-player lines where the team splits; no pads.
- SPEC 9 L332-357: 8 sets A1-A8 + holding rooms L1-L7 (quiet connectors with a glass slot onto the next set's first 6 m = the CT "glimpse"); roles A/B are jobs claimed by first press/zone entry (L334-338). One hard rule (A3 send-back, L347). Timed windows are device behaviour, never a fail (L348-349).
- Per-set sheets: "Observe, then plan" (e.g. A7 L639 glazed doors + fire plan show both routes), "Routes" (ghost / clear / loud / loop, e.g. A8 L703-706), "Objective lines" tables Shared / A / B / Done-when (A7 L664-668, A8 L733-740). A7 = split paths (hall vs plant corridor) -> synced hack = CT "parallel routes that re-merge". A8 L688-689 scale model of the set in L7 = planning aid.
- 13 L880-885: objective list = "the only guidance: no pads, no panels, no world markers (bible 6), only the striped leg-up marks (P16)".
- 12 L833-849: co-op table "why one player cannot" + "way back for a lone/downed player" (no solo route, G253).
- 14 L921-936: N1 objective steps with per-player lines + role claims (course code), N2 timed isolator, N3 timed console loop, N6 multiple scanner pairs (DONE).
- 15 L954-972 proposals P1-P17 applied "logged and undoable": P3 device timers vs "no forced timers", P11 "two or three ways per set" vs LD 3.2 three routes + secret, P14 info lines on three guards vs G206 one, P16 striped marks vs LD 11.2 no co-op markers.
- 13 L906-907 rating per set (`courseRating.ts`); L910-913 no reinforcements/alarm panels in Course mode; `em.stealth = true`.
- Rules field (L906): both extract, revive 30 s x2, set restart, A3 send-back. No ghost/no-kill rule as a constraint; rating only.

### docs/section-rating (master, merged train 30)
- BRIEF L16-19: rating at the end of every Sector Ops section and every rated Marlow set on four marks: undetected, no kills, no alarms, bodies hidden; rewards = in-run top-ups (R1 L46), card (R2), best per section saved `rating:sections` kv (R3), synced takedown bonus (R4). A2 KO is not a kill (L56); A3 camera sighting breaks undetected (L58-59); A7 solo gets the same table (L66-67). Code: `src/game/rating/sectionRating.ts`, `src/ui/hud/ratingCard.ts`, `src/save/ratingRecord.ts`.
- These four marks are exactly Michael's "strict rules" list, but as REWARDS, not pass/fail constraints.

### Sector Ops - docs/sector-redesign/SPEC.md (origin/feature/sector-redesign-polish = master copy, 604 lines; code on master: src/world/maps/campus*.ts)
- L17-21: Saltmarsh Park, 5 sections, "Solo or co-op (DEC G185); co-op gets extra routes, solo always completes".
- L115-131 campus-wide co-op rules: co-op lips 4.3-4.5 with solo-reach tests; rule 7 "every co-op top also reachable solo"; rule 8 "each co-op route names its solo bypass ... never the only way" = level-design 11 solo-first applied to Sector Ops (opposite of campaign G253).
- L133-135 team doors = pair gates (two key switches in a window) + pair bolts; plain bolt not used (one player alone unbolts it).
- L178-180 two-person vantage per space.
- Per section: ONE objective (S1 download L206, S2 hack L282, S3 grab L335, S4 download L388, S5 grab + extract L445); routes Stealth / Shadow (made) / High / Loud / Co-op only (S1 L209-222). Linear chain L536.
- L499-514 M12 unavoidable posted guards K1-K4 (distract/KO/kill to pass) - a "must deal with this person" gate, not interrogation.
- L529-538 Mission and modes: `modes: ['sector']`, no mission entry, briefing as text radio, no rules field.
- L566-593 applied loosenings A23-A45 (lit by default, device timers, extra co-op verbs, visible dual-control doors) - map-only, standard not edited.
- No interrogation objective, no mission rules, no parallel objectives, no 3-4 player content in the spec.

### Code on master (what exists)
- `src/game/sectors.ts:13-18,20-29,104-153`: SectorDef has exactly one `objective` (kind hack | grab | download), `routes` (>= 2, M8 check), `bolts`, `pairGates`, `keypads` + `intel` (overhear / board / objective, L181-184), `stageActions`, `crate`. No rules, no objective list, no parallel objectives, no interrogation intel kind.
- `src/game/missions.ts:10,33-38,166`: Infiltration missions: ObjectiveType download | plant | rescue | sabotage | intel | extract (no interrogate); `MissionRules` noAlarms / noKills / undetected each off | bonus | fail; `ObjectiveChain` is strictly sequential. Bible's noBodiesFound / maxAlarmLevel / triggers / opportunity objectives are not built. Only `missions.json` entries are Warehouse ones.
- `src/ai/guardInfo.ts`: per-slot `info` lines, INTERROGATE shows only when set, spent once. `src/game/intel.ts`: `GuardIntel.codes` (door-code flags) + derived camera/patrol reveal (`intelReveal.ts`). `src/game/jointInterrogation.ts`: G148 joint read (holder interrogates + partner BLUFF within 6 s / 3 m) gives joint-only lines and a course flag.
- Course framework: `src/game/course/courseDef.ts` steps with A/B lines (N1), `securityRoom.ts`, `scanners.ts`, `passZones.ts` (PassZone.any), `spotFail.ts` (send-back), `courseRating.ts`, `courseMarks.ts`.
- Sector: `sectorTeamDoors.ts`, `sectorKeypads.ts`, `sectorDesks.ts` (security desk), `sectorStage.ts` (alarm extras), `sectorReset.ts`, `sectorCheck.ts`, `src/ai/alarm.ts`, `src/ai/sectorTags.ts`, `src/save/sectorRecord.ts` (stars), `src/net/objectiveMirror.ts`.

### docs/coop4/BRIEF.md (origin/feature/coop4; only AI briefs on master)
- L5-7: Michael 2026-10-23 ~10:25 "increase sector ops to 4 player coop ... marlow yard stays at 2"; overturns G2/G50 for Sector Ops only; new G entry and CLAUDE.md L8 / bible 5.9 / coop.md updates deferred to the merge (L24-28) - so master docs still say "no 3-4 player play".
- L12 goal 1-4 players on both Sector Ops maps; A2 L38 solo stays playable (G280).
- A3 L39 team doors / pair devices stay 2-person, "any 2 of the team"; L21 "no 3- or 4-person devices"; A20 L56 two pairs may run moves at once.
- A8 L44 up to 2 extra guards per section tagged `minPlayers` 3/4; A9 L45 reinforcements +1 per player beyond 2; A4 L40 syringes per team scale; A13 L49 rating per team.
- M1 L33-34 (answered (b)): at 3-4 players an out operator waits and returns at the next connector.
- NOTHING about separate objectives, two teams, or parallel tasks: coop4 scales numbers, not mission structure.

### docs/level-validator (origin/feature/level-validator)
- BRIEF L7-19 Michael 2026-10-24 ~20:05 "Level standard extras" (approved as ADD to level-design.md, L49-56): graph JSON per map before geometry; 3+ approaches of 2+ kinds; routes cross at least once; vantage ~70%; 40-60% shadow; LOS breakable in ~5 s; guard counts per space and per player count; co-op: splits <= 90 s, path parity within 20% (by traversal time, M4), "partners act for each other", overwatch per split, downed partner reachable in 15 s, shared routes >= 2.0 m; linear spine between sections, loops inside; 2+ edge-disjoint routes per SECTION entry -> exit (M3 L36-37).
- BRIEF L103 "solo completability dropped ... 2-player completability (ERR)"; graph-schema L33 `players` `[2]` "for every campaign and campus map", Sector Ops may list [2,3,4] - conflicts with G185 / coop4 A2 (Sector Ops solo must complete) and campus SPEC rule 7-8.
- graph-schema L45 space type `objective`; L77 `assist` link (one leg's action opens / darkens / disables for the other) - the only machine-checkable "act for each other" rule. No objective ordering, no mission rule, no guidance / landmark field.
- campus-run/REPORT L19-40: campus fails (149 ERR): 19 of 25 encounter spaces lack a shadow, high or loud approach; S3 is a single chain of doors (re-plan); co-op touches 6 of 25 spaces; **"No section has a split"**; S5 CR7 "co-op only" rope works solo (breaks G280).

### Michael's skill (C:/NightShift/scratch/stealth-level-design: SKILL.md 287 lines, validate_level.py, example_level.json)
- SKILL 4.2 L121-127 rule of three approaches of 2+ types, routes cross at least once; 4.3 L129-133 encounter anatomy (entry, observation point >= 70%, play space, >= 2 exits, LOS break ~5 s).
- **5.3 L157 "the gate and its key should be visible to the player before the solution is"; 5.6 L163 "each section has one landmark visible from several points ... the next objective's direction should be readable from each observation point"** - the skill's no-marker guidance rules; manual checklist L268 "landmark visible from every observation point".
- 5.4 L159 objectives: primary on critical path, secondary on branches adding 10-25%, opportunity (intel, hacking, interrogation) inside encounter spaces; 5.1 25-45 min, 4-6 spaces + climax; 5.2 prefer hub-and-spoke and loops.
- 6.1 L169 "co-op adds, solo never loses" (solo-first: fits Sector Ops, contradicts campaign G2/G253); 6.3 splits <= 90 s, parity 20%, paths interact; 6.4 overwatch; 6.5 sync pairs, split by distraction in solo; 6.7 enemy counts per player count.
- 7 L185-198 deniable-ops arena: loops, Hunt / Defend / Ghost / Duel variants, 3+ candidate objective positions (validator port drops this, "arena mode parked").
- Validator only knows objective tags (`objective_primary`, `exfil`) for reachability; no mission rules.

### ROADMAP Decided (origin/feature/menu)
- L66 "Level standard extras" (2026-10-24 ~20:05) = level-validator ask; **L61 (~22:00): campus S1-S5 fixes and S3 re-plan "wait for the mission design audit", then planned with its multi-route / objective rules + Michael's one-click sign-off; measured validator pass required at greybox exit; guards "as many as realistically possible"**.
- L85 "Stealth over shooting" (2026-10-23 ~10:10): (5) section rating, (9) interrogation gives door codes / camera routes / patrol timing, (12) synced takedowns rewarded.
- L84 Sector Ops 4 players; L89 unavoidable guards (M12); L97 sector redesign: "coop only pathways but still able to complete solo"; L62 process audit: no-refining rule LIFTED, one-click sign-off before greybox.
- L140 / campaign-spec branch (BRIEF, STATE): first campaign level = story Mission 1 "Dead Line", PARKED 2026-10-21 before SPEC was written; G255 waits until Marlow + Sector Ops done. STATE research notes: campaign needs section loading, keycards, living-key captive, mantrap, civilian - none built.
- story.md 6 L223-232: per-mission co-op highlights already imply rules / structures: M2 "two manifests at once" (split-and-converge), M4 split floors, M5 vault + alarm at once, M6 no radio, pings only, M7 blackout. 6.1 L249-275 Dead Line: "He must never know" (undetected), civilian "Never kill them", optional objectives, borrowed authorised person (living key), twist on exit.

---

## SYNTHESIS (the deliverable; raw notes above hold the detail)

### (a) What the rules say today
- **Sections.** A level is a linear spine of encounter spaces joined by guard-free quiet connectors, with a checkpoint before each space (level-design.md:28-50). Sector Ops: sections plus connector rooms that load / unload and become the checkpoint (DECISIONS G186 L1000; sectors.ts:13-18). Marlow: 8 sets plus 7 holding rooms (marlow-final/SPEC.md:332-357). Validator: a single spine between sections, 2+ edge-disjoint routes from entry to exit inside each (level-validator/BRIEF.md:36-37). Checkpoint per space, <= ~10 min loss (bible L552, G126).
- **Routes per section.** LD 3.2-3.5: shadow / high / loud per guarded space plus a secret route in half of them; no route strictly best; routes rejoin at a pinch point; a loop on the shadow route (L32-40). G190 L1017: 2-3 routes to objective and exit, guards in separate pockets. Validator adds 3+ approaches of 2+ kinds and "routes cross" (BRIEF L98-102). What CT actually did: one guide route per mission with role splits, plus a few parallel routes that re-merge (levels-digest L677-714).
- **Guidance.** LD 6.4 is one line: landmarks, light leading the eye, sightlines (L87-88). Also: connector glimpses (3.8), entry vantage (3.1), readable circulation (16.6.4), consistent visual language (2.5), real gates (2.6, 16.3.5). Bible 6 L917: "never world waypoints"; G135: no partner marker. CT method: objective text that names places, in-world intel, rooms with an obvious function, overlooks, guard chatter, light (levels-digest L120-122); "solution visible from the problem" (anti-pattern A3 L787; design-kit C21-C24 L112-115; checklist D2 L361). Skill: the gate and its key are seen before the solution; one landmark per section; the next objective is readable from each vantage (SKILL.md:157,163). Marlow: the objective list with per-player lines is "the only guidance" (SPEC:880-885, G277).
- **Objectives / structure.** Bible 5.8 L534-548: a mission is data; tiers primary / secondary / opportunity; objective types include "interrogate a named target"; triggers drive actions. Mission flow L134-144: briefing, insertion choice, space by space, both players extract (G138). The level standard only says the objective sits at a space's end, on a dark floor (3.9). Design-kit 1.7-1.8 (pacing; chaining through in-world intel; one two-body, one protect-while-act and one reach objective; one twist) is NOT adopted: G157 is still pending.
- **Mission rules.** Bible 5.8 L541-544: `noAlarms`, `noKills`, `noBodiesFound`, `maxAlarmLevel`, each either bonus or fail, at most ONE fail rule, signposted (G125 L677). No mission forces a kill (G127). Protected characters (G145). 100% = no kills + no alarms + all primaries (G146). LD 7.3: "ghost, non-lethal and lethal all viable; rules reward the harder styles as bonuses" (L93-95). LD 9.3: instant fail only through a mission's own rule. **Sector Ops: no doc allows or forbids rules.** G185 only says kills are optional and ghosting is possible. The bible's rules section says "a mission" with no mode named, so G125's one-fail-rule cap would bind an op unless Michael exempts it. Sector Ops scoring today: the section-rating marks (undetected, no kills, no alarms, bodies hidden) as rewards, plus stars.
- **Interrogation.** The grab is the hub. INTERROGATE shows only when the guard has information, and a held guard is never released (bible 5.4 L403-421, G203-G205). Lines can reveal an opportunity objective, a code or a patrol. Joint non-violent questioning (G148). G206: one information guard in Marlow. ROADMAP Decided L85 item 9: interrogation gives door codes, camera routes and patrol timing.
- **Co-op gates.** LD 11 still says solo first and no co-op markers (L113-124). G253 (L1327) voided that for campaign maps. The rewrite is approved but not written yet (validator BRIEF L49-56). Bible C3/C4: levels are built for the pair. G151: team moves anywhere with room. G280: team doors are 2-player only, but a solo route stays (Sector Ops). Campus rules 7-8: every co-op route names its solo bypass (sector SPEC:127-131).
- **Player counts / solo.** Master: exactly 2 players, no 3-4 (CLAUDE.md:8, bible L55-56, G2 / G50 / G111 / G132). Sector Ops: solo or co-op (G185 L995). feature/coop4: 1-4 players in Sector Ops, Marlow stays 2 (coop4/BRIEF.md:5-12, A2 L38). The G entry and the CLAUDE.md / bible edits wait for the coop4 merge (BRIEF L24-28).
- **Modes.** Course: Marlow (`ctcourse`), steps plus set restart, no missions.json entry. Sector Ops: `campusOps` and `warehouseOps`, sections, stars. Infiltration: the campaign mode, missions.json, Warehouse entries only. There is no campaign map yet; the campaign spec is parked (G255).
- **Rating / rewards.** Bible: 0-100% (L559-562). `courseRating.ts`: Ghost / Silent / Loud. Section-rating: four marks with in-run top-ups, a card, best result per section in kv (section-rating/BRIEF.md:16-51); synced takedowns pay more than shooting. Sector stars per difficulty (G189).

### (b) Contradictions and gaps (between docs, and against Michael's ask)
1. Player count: master says no 3-4 players anywhere; coop4 and ROADMAP L84 say Sector Ops takes 1-4. No G entry records it yet.
2. Solo: Michael's ask (a solo player can try every Sector Ops objective) matches G185, campus rules 7-8 and coop4 A2. The validator contradicts it: it drops solo completability and sets `players: [2]` "for every campaign and campus map" (graph-schema.md:33; BRIEF L103).
3. Campaign is co-op only (G253), but LD 11 and map-spec.md:84-87 still demand a solo route to every co-op surface.
4. Strict rules: "ghost only" or "no kills" as hard constraints clash with LD 7.3 (lethal must stay viable), with P3, and with G125's one-fail-rule cap. "Ghost" means undetected + no kills, which is two rules unless it is defined as one. CT precedent exists: UN HQ was "no kills or alarms", and PS2 sub-levels carried constraint objectives (levels-digest L578-579, L622-623). CT's anti-pattern A15 warns against stacked fail rules (L796). Michael needs to rule: is a rule a fail condition or a rating condition, and is a Sector Ops op a "mission" under G125?
5. Interrogation as an objective: the bible has the type, but the code has no objective type for it (`missions.ts:10`) and no interrogate kind in `SectorIntel` (`sectors.ts:181-184`). The campus has zero information guards. Marlow has three against G206's one (SPEC P14 L969).
6. Parallel / separate objectives: no doc defines simultaneous objectives or two teams. `ObjectiveChain` is strictly sequential. `SectorDef` has one `objective`. coop4 has no team split and no 3-4-person devices (BRIEF L21, A3). Validator splits are two legs for two partners. Bible C12-C18 "split-and-converge spaces" is still marked "research". The only hint is story mission 2: "two manifests at once".
7. Guidance without visual cues: LD 6.4 relies on "light leading the eye", but lit-by-default (LR1 / A33, SPEC P4) weakens light contrast as a guide. Marlow guides with HUD text (the objective list), striped leg-up marks (P16, against LD 11.2), door status lamps and hazard stripes (CTCOURSE-SPEC D6, V11-V12), which are all visual cues. No doc tells a designer how to steer a multi-step route without markers. Skill 5.3 / 5.6 and design-kit D2 are not adopted.
8. Multi-step missions: Sector Ops has 1 objective per section, in a straight chain (sector SPEC:536). Marlow has 1 exercise per set. No chaining, twist, opportunity objectives or intel-driven next steps are built. The campus K-guards (M12, SPEC:499-514) are the only "must deal with a person" beats.
9. "Not open world" matches our spine with loops inside sections (validator M3). The skill's hub-and-spoke (5.2) and arena mode (7) are parked.
10. G108 puts objectives in the menu; G277 uses an always-on objective list. It is unclear which one the campaign and Sector Ops use.
11. Timers: bible 6 and LD 6.3 forbid forced timers, but device windows are applied in Marlow (P3) and on the campus (A38). That is fine for devices; any timed mission rule needs a ruling.
12. Stale docs: map-spec still says "Silent But Deadly" and phone (L8, L109); LD 13 doc paths (open item 5); CTCOURSE-SPEC is superseded (L3-8); G157's 12 standard changes are still unreviewed.

### (c) What the maps implement vs the docs
- **Marlow Yard** (`ctcourse`, marlow-final merged): 8 sets; objective steps with shared + A / B lines and role claims (`courseDef.ts:160-211`); timed isolator, console loop and scanner pairs; information guards on A1 / A4 / A8 (`a1Gate.ts:218`, `a4GoodsShed.ts:380`, `a8Strongroom.ts:541`); one hard rule (the A3 send-back); a rating per set. Sets have 2-3 routes, not 3 plus a secret (P11). One true split: A7, hall vs plant corridor, ending in a sync hack. A8 has a role split. No mission rules work as constraints.
- **Campus** (`campusOps`, 5 sections, on master): one objective per section (`campusSectors.ts:315, :361, :406`, plus the S4 / S5 data files). Pair gates in S4 / S5 (`campusS4Data.ts:203`, `campusS5Data.ts:183`). Board intel in S4 / S5 (`:202`, `:182`). The S2 keypad code beat was cut (`campusSectors.ts:360`). No interrogation guard. Solo can complete it. Validator run: 149 errors; 19 of 25 spaces miss a shadow, high or loud way in; S3 is a single chain of doors (needs a re-plan); co-op reaches only 6 of 25 spaces; no section has a split; the S5 CR7 "co-op only" rope works solo (campus-run/REPORT.md:19-40). Campus fixes wait for this audit (ROADMAP L61).
- **Warehouse** (`warehouseOps`, 3 sections): one objective per section. Its team doors are plain bolts (`warehouseSectors.ts:61, :125, :183`), which the campus spec rejects because one player alone can unbolt them (sector SPEC:133-135). The G201 rebuild is parked. `missions.json` holds Warehouse Infiltration missions with `noAlarms` / `noKills` bonus rules: the only data missions that have rules.

### (d) Systems a mission framework can reuse
- Objectives: course steps with per-player lines and role claims (`courseDef.ts:160-211`), `PassZone.any` (`passZones.ts`), `ObjectiveChain` and `MissionRules` off / bonus / fail (`missions.ts:33-38, :166`), `SectorObjective` and connectors (`sectors.ts:20-29, :104-153`), `objectiveMirror.ts` (net).
- Rules / rating: `MissionRules`; `sectionRating.ts` four marks with `ratingCard.ts` and `ratingRecord.ts`; `courseRating.ts`; `spotFail.ts` (the send-back is already a hard-rule mechanism); `sectorRecord.ts` stars.
- Interrogation / intel: `guardInfo.ts` (information lines), `intel.ts` codes with `intelReveal.ts` (cameras, patrols), `jointInterrogation.ts` (bluff, joint lines, a flag), `SectorIntel` overhear / board / objective flags, `sectorKeypads.ts`.
- Alarms: `ai/alarm.ts`, stages 0-3, `sectorStage.ts` stage actions, guard-ai response teams, `sectorTags.ts`, posted guards (GA3 `post`).
- Checkpoints: the connector machine, the course set restart, `sectorReset.ts`, and coop4's "out player waits for the next connector".
- Team gates: `sectorTeamDoors.ts` pair bolts, `SectorPairGate` (`sectors.ts:396-443`), `scanners.ts` pairs, `securityRoom.ts` / `sectorDesks.ts` consoles, the timed isolator and loop (N2 / N3), the jam relay.
- coop4 (branch): `playerSlots.ts`, `SECTOR_MAX` 4, `minPlayers` guard tags, syringes and reinforcements scaled by team size, pair devices usable by any 2 of the team, two pairs running moves at once.
- Design tooling: the validator graph (`split` / `assist` / overwatch, per-section redundancy; objective and rule nodes can be added), the design-kit MISSION_TEMPLATE with its process and checklist (design-kit-digest.md:304-370), the Pumphouse Nine beat list (levels-digest L810-896).
