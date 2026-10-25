# Task: <Map name> - <one-line pitch>

<!-- How to use: copy this file, fill every <...>, delete these comments, paste into Claude Code.
     Sections marked (fixed) stay as written. Sections marked (fill) describe this map.
     Sections marked (fill or delegate) can say "Propose in Phase 1/2 for my approval" instead of a design. -->

## Context (fill)
Night Shift (repo Tekcry/Mobile-Coop). Base branch: `master`. Create branch `feature/<map-id>-map` from master in
`C:/NightShift/Mobile-Coop-<map-id>-map` and work only there; the job folder is `docs/<map-id>-map/`. Never merge into
any branch and never merge any branch into yours; the train merges it (`docs/RULES.md` "Getting to master").

Goal: a new listed map, `<map-id>` ("<Map name>"): <2-3 sentences: the building, the setting, the fantasy>. It follows
`docs/level-design.md` (the level design standard) in full.

Mode: <campaign | sector | training>. The mode's profile in `docs/level-design.md` ("Modes and tags") binds this map;
its graph sets `meta.mode` to the same value.

## Scope: existing systems only (fixed)
- This work builds a map, its missions as data for the mission engine, tests, dev scripts and docs. It adds no new game
  systems: no new movement, co-op moves, AI behaviour, takedown kinds, interactable kinds, net messages, HUD elements,
  input bindings or mode logic.
- Missions use the mission engine (`src/game/mission/`, `missionDef.ts`, on feature/mission-engine until it merges; the
  mission-framework job, `docs/missions/PLAN.md`): sections, objective steps, parallel team tracks and strict rules are
  `MissionDef` data. An objective step or rule kind the engine lacks, or a co-op move the kit lacks
  (`docs/level-design.md` 11.9), is built by the mission-framework or co-op job first, never in this map job. A map that
  starts before the engine is on master asks the orchestrator.
- TypeScript you write: `src/world/maps/<map-id>.ts` (one file per section when it is large), its registration in
  `src/world/maps/index.ts` and `src/world/maps/listed.ts`, its sectors and missions
  (`src/world/maps/<map-id>Sectors.ts`, `<map-id>Missions.ts`), an exported constant of the map's co-op lips, unit
  tests. The map's graph (`docs/level-validator/` schema, with the mission nodes) goes in the job folder. Scripts: e2e
  suites (and `scripts/plan-svg.mjs` if it does not exist yet).
- If a step seems to need anything else, stop and report it as a "Future" item. Do not build it.
- Enemies and tuning tables never change. If a set piece does not engage, change the building.
- Other maps: no changes.

## Originality (fixed)
- This map is an original design. Do not open, read or copy any other map file (`src/world/maps/*.ts` other than
  `index.ts`, `listed.ts`, `storey.ts`) and do not reuse another map's layout, coordinates, room ids or names, colours,
  set pieces or guard routes.
- Learn each `LevelBuilder` call from its signature and doc comment in `src/world/levelBuilder.ts`, the storey helpers
  from `src/world/maps/storey.ts`, the anchors from `src/world/anchors.ts`.

## Rules for working (fixed)
1. Read `CLAUDE.md`, `docs/RULES.md` and `docs/VISION.md` from origin/master, then `docs/level-design.md`, then this
   spec.
2. Before referencing any file, type, function, field or constant, confirm it exists with grep and note where. If
   something named here does not exist or differs, stop and report it; never invent a substitute.
3. One phase at a time. At the start of each phase re-read this spec (`docs/<map-id>-map/SPEC.md`), the progress log and
   the approved design docs, then print a short plan (files and functions, one line each). Do only that phase.
4. End of each phase: run the listed checks, report results honestly (never claim a check passed unless you ran it in
   this phase; paste the summary line), list what changed, update the progress log, commit and push. Michael's gates are
   the one-click sign-offs of `docs/level-design.md` section 14.
5. Save this spec verbatim to `docs/<map-id>-map/SPEC.md` in Phase 0. Never edit it without approval; proposed changes
   go in the progress log under "Spec change requests".
6. Progress log: the job's `docs/<map-id>-map/STATE.md` (resume block on top, `docs/RULES.md` "A job"; below it the
   phase, status, files changed, decisions, tests with results, open issues, spec change requests).
7. Approved design docs are the build contract. Deviations go under "Decisions" with the reason; a deviation that
   changes a route, a guard job or a room needs approval first.
8. Update the map's docs and the changelog fragment (`changes/<branch-with-dashes>.md`; never `CHANGELOG.md`, G183) at the end
   of each phase that adds playable content.
9. Hyphens, never em dashes. Follow `CLAUDE.md` "Hard rules" and `docs/systems/conventions.md`.
10. Checks: `npm run typecheck:fast` and single `npx vitest run <file>` runs; CI runs `npm run check`; e2e through the
    laptop queue (`docs/RULES.md` "Test tiers").

## Building brief (fill)
- Building type and era: <e.g. 2021 colocation data centre>
- Original purpose and how it worked: <...>
- Present-day use and who is there tonight: <...>
- Site: <street, neighbours, yard, lane, footprint size>
- Construction: <grid, wall thicknesses, storey heights (max 3 walkable surfaces per column), windows, materials>
- Rooms (original purpose / now): <list, or "propose in Phase 1">
- Real dimensions for this building type: <corridors, doors, stairs, storeys, key equipment sizes>
- Palette, lighting character, grade, weather: <...>

## Stealth verbs found in the building (fill or delegate)
| Verb | Real building element |
| --- | --- |
| Split jump | <...> |
| Horizontal pipe | <...> |
| Lip hang / shimmy / gap jump / corner | <...> |
| Wall jump | <...> |
| Ladders, drainpipes | <...> |
| Ducts and vents | <...> |
| Rappel | <...> |
| Fence | <...> |
| Doors, windows | <...> |
| Cover, hide spots | <...> |
| Not used (no believable element) | <...> |

## The route (fill or delegate)
Spaces in path order. For each: what it is, what is there tonight, the new mechanic, the routes (shadow / high / loud /
secret), the loop, the guards' jobs, isolation moments and overlaps, toys, the objective, the connector after it.
1. <Space> (<storey>, <n> guards): <...>
2. <...>
Guard total per player count: <n> (as many as realistically possible, inside the mode's caps; level-design 4.9, 12.1).

## Co-op routes (fill or delegate)
The co-op kit of `docs/level-design.md` 11.9 (moves the game lacks are built by their co-op job first). Each route:
where, its graph kind, the real reason one player cannot use it, and per mode: campaign, the forced co-op gate of each
section and its way back (11.10, 11.6); Sector Ops, the solo route past it (11.6, G280); training, the move it teaches.
- C1: <...>

## Mission and modes (fill)
- `modes` (`MapDef.modes`): <e.g. ['sector', 'sandbox']>. Do not change any mode's default map.
- Players: <campaign: exactly 2 | Sector Ops: 1-4, solo always possible | training: 2>.
- Each mission (a `MissionDef`): id <...>, name <...>, insertion(s) <...>, brief <...>, sections and their checkpoints
  <...>, objective steps in route order, each naming what and where (level-design 6.4, 13 "Objective and lead plan")
  <...>; for Sector Ops the parallel team tracks and how one solo player does them all <...>; strict rules (up to 2,
  signposted in the briefing and objective list; breaking one restarts the section, level-design 9.3) <...>.
- Theme: <time of day, light bands per space type (level-design 5.5), faction, grade, weathers>.
- `reinforce`, `alarms`, `hideSpots`, `switches`: <...>

## Engine questions for Phase 0 (fill)
<Anything this map relies on that needs confirming, e.g. "Is a 10 m rappel allowed?">

## Phases (fixed)
`docs/level-design.md` section 14 owns the phases and their gates (validator gate before greybox, one-click sign-off,
greybox exit with `--require-measured`, route-runs and the walk card); section 13 owns the deliverables, section 15 the
acceptance tests. Phase 0 also confirms by grep every fact this spec and level-design section 12 rely on and reports how
to build each element from the engine files only.

## Future recommendations (fixed)
At the end of the last phase, one paragraph each on systems this map would benefit from (how they would fit the existing
code, which space would use them). Do not build them.

## Report format (fixed)
Files changed (one line each); Decisions; checks run with their summary lines; anything left undone; the walk-card
lines for Michael per space (also in `TESTING.md`); then STOP.
