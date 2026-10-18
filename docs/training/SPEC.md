# Task: Fallow - a two-player co-op training bunker that exercises every system

Status: written 2026-10-13 from Michael's answers (DECISIONS.md D1-D12). Under D12 the build runs start to finish without
Michael's gates; he reviews the finished map. This spec follows `docs/templates/map-spec.md`; the sections marked
(fixed) keep the template's words, adapted only where SPEC section "Approved exceptions" says so.

## Context (fill)
Night Shift (repo Tekcry/Mobile-Coop). Base branch: `feature/kestrel` (DECISIONS D6). Work only on
`feature/training-bunker`. Never commit to or push `feature/kestrel`, `feature/ct-locomotion`, `ct-movement`, `dev` or
`master`. Never merge into any other branch; Michael merges. Merging `origin/feature/kestrel` and
`origin/feature/ct-locomotion` into `feature/training-bunker` is allowed when a switch-on session needs a feature that has
landed there (PLAN section 3), never the other way.

Goal: a new map, `bunker` ("Fallow"): the Continuity Office's training site in a 1950s civil-defence bunker under Fallow
Hill, north of Hollowmere. Two operators run a linear course of nine bays joined by two-person airlocks, against
role-players with marking rounds, using every movement verb, team move, weapon, gadget, tool, takedown and security
device the game has or plans. It is a vertical slice of the fun and a test map of co-op sync. It follows
`docs/level-design.md` in full except the exceptions listed below (Michael's written approval: DECISIONS D10, D12).

## Scope: existing systems only (fixed, with one stated addition)
- Map work builds a map, course data, tests, dev scripts and docs. It adds no new game systems: no new movement, AI
  behaviour, takedown kinds, interactable kinds, objective types, net messages, HUD elements, input bindings or mode logic.
- The one system addition is the course framework (PLAN section 2, item 1; session T1), built as its own system session
  before the map, with pure Babylon-free logic and Vitest tests. Map sessions use it and never extend it; a missing
  framework feature is a "Future" item for a T1 follow-up.
- TypeScript map sessions write: `src/world/maps/bunker.ts`, its registration in `src/world/maps/index.ts` (and
  `listed.ts` only when Michael lists it; until then it is reached by `?autostart=bunker&mode=course` and the co-op
  lobby's course entry), `src/world/maps/bunkerCourse.ts` (the course data: bays, airlocks, gates, squads, radio lines),
  an exported constant of the map's co-op lips, unit tests. Scripts: `scripts/e2e-bunker.mjs`.
- If a step seems to need anything else, stop that step, log it as a "Future" item and carry on with the next step
  (D12: no consulting). Never build it in a map session.
- Enemies and tuning tables never change. If a set piece does not engage, change the building.
- Other maps: no changes.

## Originality (fixed)
- This map is an original design. Do not open, read or copy any other map file (`src/world/maps/*.ts` other than
  `index.ts`, `listed.ts`, `storey.ts`, `stairs.ts`) and do not reuse another map's layout, coordinates, room ids or names,
  colours, set pieces or guard routes.
- Learn each `LevelBuilder` call from its signature and doc comment in `src/world/levelBuilder.ts`, the storey helpers
  from `src/world/maps/storey.ts`, the anchors from `src/world/anchors.ts`.
- No Splinter Cell IP (bible 0): names, characters, organisations, story, logos, UI art.

## Rules for working (fixed, adapted by E8)
1. Read `CLAUDE.md` in full, then `docs/level-design.md`, then this spec, BAYS.md, FEATURES.md, PLAN.md, DECISIONS.md.
2. Before referencing any file, type, function, field or constant, confirm it exists with grep and note where. If
   something named here does not exist or differs, log it and use the nearest existing equivalent only if it changes no
   route, gate or guard job; else log a "Future" item. Never invent a substitute system.
3. The run follows docs/training/BRIEF.md and RULES.md: one step at a time from STATE.md, each step's file in
   `steps/`, an implementer subagent and a fresh checker subagent per step.
4. End of each step: the checker's PASS with the checks it re-ran (summary lines pasted), path-limited commit and push,
   LOG.md and STATE.md updated. There is no Michael gate between steps (E8): the checker and an Opus self-review at each
   block end replace it.
5. This spec is saved at `docs/training/SPEC.md`. Change it only through "Spec change requests" in the progress log,
   applied by the next Opus session with the reason; never silently.
6. Progress: `docs/training/STATE.md` (where the run is) and `docs/training/LOG.md` (one entry per step, spec change
   requests); GPU results in PC-PASS.md.
7. BAYS.md and FEATURES.md are the build contract. Deviations go under "Decisions" with the reason.
8. Update `CLAUDE.md` (a short Fallow section) and `CHANGELOG.md` at the end of each session that adds playable content.
9. Hyphens, never em dashes. Follow `CLAUDE.md` Conventions and Hard rules.
10. Checks: RULES.md "Checks" and "GPU on this PC" (the run is local: GPU items run at block ends).

## Building brief (fill)
- Building type and era: a 1950s regional civil-defence bunker cut into a hill (concrete box structure in rock, three
  levels), decommissioned in the 1990s, bought by the Continuity Office in 2019 and fitted out by Cresset Training Ltd as a
  covert training site.
- Original purpose and how it worked: a protected regional control centre: the entrance lift and guardroom (Upper),
  the cable hall where trunk cables entered (Upper), the intake shaft and fan chamber, the reservoir, the standby power
  plant and the communications centre (Plant level), and the spoil cavern, the workshop and the operations room with its
  plotting floor (Deep level). Air came down the intake shaft; water from the reservoir; power from the gensets.
- Present-day use and who is there tonight: Night Shift's rehearsal night. LANTERN runs the exercise from the surface
  (text radio). Cresset role-players (contracted, with marking rounds) play guards, operators and staff; the plant runs
  live. Why it is quiet: it is a night exercise with the site closed to everyone else.
- Site: under Fallow Hill; the surface house holds the lift head (not modelled). Footprint about 162 x 158 m in plan.
- Construction: reinforced concrete walls 0.45 (outer, in rock) and 0.2 block partitions; storey heights per bay (BAYS
  table); every bay is roofed with an overhead slab (visual; `overhead`). Nav: `MapDef.navLayers` 5 (DECISIONS C6).
- Rooms: BAYS.md (nine bays, eight airlocks, one stair, the lift).
- Real dimensions: corridors 2.0-2.4, doors 1.0-1.2 x 2.1, blast doors 1.2 x 2.1, stairs riser 0.182 going 0.28,
  ladders 0.45 wide, crouch ducts 1.5 x 1.2 (F32), the engine's crawl ducts where E6 allows.
- Palette, lighting character, grade, weather: all artificial light, no moon, no weather (`MapTheme` ambient 0.05
  (TUNE) in unlit air; zones per bay). Each bay has its own colour temperature (BAYS): warm tungsten B1, cool white B2,
  sodium amber B3, mercury green-white B4, plant white with red emergency B5, blue-white LED B6, warm house windows in a
  dark cavern B7, daylight range B8, mixed with a cyan map table and red alarms B9. Grade: concrete greys, high contrast.

## Stealth verbs found in the building (fill)
| Verb | Real building element |
| --- | --- |
| Split jump | B3 riser casing 1.6 m off the shaft wall |
| Horizontal pipe | B2 cable-support pipe over a cut gallery; B3 damper bar; B7 water main |
| Lip hang / shimmy / gap jump / corner | B2 crane-rail beam ledges round a column; B7 rock-bolting bench; B9 balcony edge |
| Wall jump | B3 headframe ring beam; B5 genset roofs; B7 annex roof |
| Ladders, drainpipes | B2 gallery ladders and gutter downpipes; B3 plant ladder; B4 cell ladders; B8 gantry ladder |
| Ducts and vents | B3 fan discharge duct and grille; B5 cable trench; B6 office supply duct; B9 message-tube duct |
| Rappel | B3 hoist beam; B9 exercise eye bolts on the bridge rail |
| Fence | B3 fan guard |
| Zipline | B3 spoil ropeway cable; B9 exercise cable |
| Doors, windows | Airlock blast doors; B2 inspection windows; B6 office doors; B7 house doors and windows |
| Cover, hide spots | Gensets, counters, partitions, sandbags, map table; lockers, recesses, trench panels, the skip |
| Not used | None: every verb has an element (FEATURES.md) |

## The route (fill)
Nine bays in order (BAYS.md has each sheet): B1 Muster, B2 The Lanes, B3 The Intake, B4 The Cistern, B5 Standby Plant,
B6 Mock Site, B7 The House, B8 The Range, B9 The Plot. Guards: B5 2, B6 3, B7 6, B8 3, B9 7 = 21 in all; each bay's squad
spawns when its entry airlock cycles, so at most 7 are alive at once (E10).

## Co-op routes (fill)
The whole course is co-op (D1). Gates per bay: B2 cross-lane levers; B3 fan isolator reached by the rappel; B4 boost +
bolt, human ladder, timed sluice; B5 mains breaker and mag lock; B6 operator / runner (feeds, egress, code); B7 the
officer's code; B8 the catwalk stair bolted from below; B9 two keys turned together. Co-op lips: B4 walls 4.4, the B9
balcony boost gap 4.5 (level-design 11.3 kept).

## Mission and modes (fill)
- `modes`: `['course']` (a new co-op mode from T1). Do not change any other mode's default map. Not listed for solo.
- Mission: id `fallow-course`, name "Fallow", insertion: the lift lobby (B1); brief (text): "Rehearsal night at Fallow.
  Nine bays, two of you, nobody goes on alone."; objectives: the bay chain, then B9's keys A and B, the case, the
  two-key lift, extract. Every bay's drills are mandatory and ticked per player (D30). Rules: none fail the course; the
  results show total and per-bay time, detections, alarms, knock-outs, kills, revives and team moves, with no penalty
  in the drill bays (D31); B9 has a ghost rating tier (D32: Ghost, Silent, Loud). First run 45-60 min (D34). Friendly
  fire is on (D38).
- Desktop only (D24): pad first, then keyboard and mouse; no phone checks or touch work.
- Kit: the full toolkit and every gadget at normal carry (FEATURES 4).
- Theme: night inside; ambient 0.05 (TUNE); faction colours: Cresset grey and orange; no weather.
- `reinforce`: B9 staff tunnel; `alarms`: B9 B-1 south; `hideSpots`: BAYS per bay; `switches`: BAYS light plans.

## Engine questions for T0 (fill)
1. Confirm the nav sampler's floor (y -2) and that nothing walkable is below y -1.5 (B5 trench floor y 4.5, B2 pit y 15.5).
2. Confirm `MapDef.navLayers` takes 5 and costs nothing on the other maps.
3. Can `Door.anchor.locked` change at run time and reach clients (doors sync open indices only)? T1 adds lock state if not.
4. Can a `TrainingDummy` stand on a floor above y 0 (B1 at y 16; its constructor takes y 0 in sandbox)?
5. Does `findJump` from a split reach a lip 4.0 above the split's floor (B3 RC)? If not, lower the casing top.
6. Do engine ducts (B3, B6) accept the sizes in BAYS, and does the B6 ceiling vent drop work over a 3.4 m ceiling?
7. Rappel length 15.4 m within `RAPPEL` and `RappelPoint` limits?
8. Zipline length (B3 about 22 m diagonal, B9 about 25 m) within `Zipline` limits?
9. How many lights may one map carry (bake, `LightRegistry`), and the lamp count per 2 m column (8)? BAYS lists about 150-170 including the airlocks.
10. Does `ClearMode` / `InfiltrationMode`'s `SQUAD_CAP` apply to the course mode, or does T1 spawn per bay?

## Course rules (Michael, 2026-10-14, walk 1: D40-D47; they bind every bay and win over BAYS v1)
| # | Rule | Check |
| --- | --- | --- |
| R1 | One linear path. Every bay is a chain of rooms the players must pass through in order; no corridor joins rooms so that one can be skipped; the exit is reachable only through every drill element. | Nav test: with the course's doors as gated, the only path from a bay's entry to its exit passes every drill element's trigger box, in order |
| R2 | Unavoidable elements. Each obstacle spans the full width of its room or corridor (or the walls funnel to it): there is no walk round, over or past it; a fall from it leads back to its start, never onward. | Per element: blocking the element's own traversal makes the exit unreachable (nav test with the element's passage removed) |
| R3 | Together unless the drill needs a split. Obstacle and movement drills are one shared course: both players run the same elements in the same order (no "ladder for one, pipe for the other"). Players split only where the drill's story needs it (one sneaks to a control room to open the way for the other; one holds while the other passes) and rejoin at once. | BAYS v2 lists every split with its reason; FEATURES "who" is "both" for every movement row |
| R4 | Compact. Rooms only as big as their drill needs: typical drill rooms 8-14 m across, ceilings 3-6 m unless the drill is vertical; no empty floor. | BAYS v2 sizes; each bay's footprint at most about 60% of v1's |
| R5 | Objectives on screen. The bay's objective list is always visible, each objective named explicitly and ticked as it is done (per player where both must do it). | e2e: the list shows on both pages from spawn, before any action |
| R6 | Automatic airlocks. A marked floor area inside each airlock; one player on it shows "Waiting for partner" to both; both on it (none downed, the bay's objectives done) closes and locks the door behind for good, cycles and opens the door ahead. No button. | e2e: one inside waits; both inside seals and opens; the rear door is shut and locked on both pages |
| R7 | Look: dark shell, glass and LED fit-out. The 1950s concrete shell stays dark; inside it the training spaces are fitted with glass partitions and screens, brushed steel, clean wall panels and LED strip lighting (an expensive modern facility). Glass is used for observation and sightlines, never as a way round an element. | BAYS v2 per bay; art layer T9a / T9b |
| R8 | Everything else in the design stays (drills, story, gates where a split is needed, the B9 ghost plan, light plans adapted to the new rooms). | T5c self-check |

## Approved exceptions (Michael, DECISIONS D10 and D12)
Only these rules are loosened, and only for this map. Every other rule of `docs/level-design.md`, the template and the
bible applies in full. E1-E4 were in the question Michael approved (D10); E5-E10 follow from his D12 instruction and are
flagged for his confirmation at the final review. E11 and E12 come from his answers D16 and D19.
| # | Rule | Loosened to | Why |
| --- | --- | --- | --- |
| E1 | Bible C1, level-design 11.1 (solo always complete; co-op routes never required) | The course needs two players; co-op gates are required | D1 co-op only |
| E2 | Level-design 11.2 (solo invariance, no co-op markers) | Gates are explicit course devices (two-person airlocks, lane levers); LANTERN names them | A training course states its drills |
| E3 | Level-design 11.4 (every co-op surface reachable solo) | Every surface has a way back to its bay's airlock for a revive, or the bay restarts when both are down; a disconnect ends the session (bible C2) | Two players always |
| E4 | Level-design 3.2 (three routes plus a secret in every guarded space) | Guarded bays B5-B9 have at least two routes and a loop; secrets in B5 and B9; unguarded bays B1-B4 are drill lanes; a bay may force its drill's verbs (D16) | A course, not a mission; D10, D16 |
| E5 | Level-design 6.1 (one new mechanic per space) | Each bay teaches a themed set of verbs | Nine bays must cover every system |
| E6 | Level-design 16.7.3, 16.7.4 (no auto-crawl duct anchors; no grille into a room as a shortcut) | Engine crawl ducts in B3 and B6; the B6 ceiling vent drop over the records desk (a Cresset training drop point) | The engine's duct verbs must be exercised |
| E7 | Level-design 16.2 (circulation only by stairs and plant ladders) for training structures | B2 obstacle ladders and downpipes, B4 padlocked cell ladders and B9 exercise ropes are training rig, not circulation | It is a training site |
| E8 | Level-design 14 (stop for Michael after each phase) and 16.1.1 (D0 approval before gameplay design) | No stops; an Opus self-review per session; Michael reviews once at the end | D12 |
| E9 | Level-design 13 (SVG plans before blockout) | BAYS.md text sketches and tables are the plans; `scripts/plan-svg.mjs` renders the built level in T2-T5 | D12 |
| E10 | Level-design 15 ("every guard is alive at the start") and 12 (`SQUAD_CAP` nearest first) | Each bay's squad spawns when its entry airlock cycles; at most 7 alive | A linear course of 21 guards; the course framework |
| E11 | Bible 6 "Never: world waypoints" | Tutorial markers on the next drill's device or move, on by default, hidden by a course setting | D18, D19 |
| E12 | Bible P3 test and level-design 7.3 (ghost, non-lethal and lethal play all viable everywhere) | Drills may force takedowns (B7) and combat (B8); every bay stays passable non-lethally | D16 |

## Phases (fixed shape; steps in PLAN.md section 4 and steps/)
- **T0** setup and investigation: progress log, confirm every fact by grep, answer the engine questions. No gameplay.
- **T1a-T1c** course framework (logic; mode and sync; tutorial, drills, results, bay select).
- **T2-T5** build: Upper (B1, A1, B2, A2), Plant shaft and reservoir (B3, A3, B4, A4), Plant (B5, A5, B6, S6, A6), Deep
  (B7, A7, B8, A8, B9, L9); no guards; `plan-svg` comparison; section 15 tests that need no guards.
- **T5b** walk notes, **TM** locomotion merge, **T6** light, zones and surfaces, **T7a** course data and drills,
  **T7b** guards; **T8a / T8b** `e2e-bunker` and the full checks; **T9a / T9b** voxel art layer; **T10** light showcase,
  readability and REVIEW.md.
- **SW-n** switch-on sessions as features land (PLAN section 3).

## Future recommendations (fixed)
At the end of T9, one paragraph each on systems this map would benefit from (how they would fit the existing code,
which bay would use them). Do not build them.

## Report format (fixed)
Files changed (one line each); Decisions; checks run with their summary lines; anything left undone; manual PC checks
for Michael per bay (also in `TESTING.md`); then STOP or chain per PLAN.
