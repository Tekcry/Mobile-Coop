# Task: <Map name> - <one-line pitch>

<!-- How to use: copy this file, fill every <...>, delete these comments, paste into Claude Code.
     Sections marked (fixed) stay as written. Sections marked (fill) describe this map.
     Sections marked (fill or delegate) can say "Propose in Phase 1/2 for my approval" instead of a design. -->

## Context (fill)
Silent But Deadly (repo Tekcry/Mobile-Coop). Base branch: `<base branch>`. Create branch `feature/<map-id>-map` from
`<base branch>` and work only there. Never merge into any branch and never merge any branch into yours; Michael merges
to test on the preview.

Goal: a new listed map, `<map-id>` ("<Map name>"): <2-3 sentences: the building, the setting, the fantasy>. It follows
`docs/level-design.md` (the level design standard) in full.

## Scope: existing systems only (fixed)
- This work builds a map, a mission entry, tests, dev scripts and docs. It adds no new game systems: no new movement,
  AI behaviour, takedown kinds, interactable kinds, objective types, net messages, HUD elements, input bindings or mode
  logic.
- TypeScript you write: `src/world/maps/<map-id>.ts`, its registration in `src/world/maps/index.ts` and
  `src/world/maps/listed.ts`, an exported constant of the map's co-op lips, unit tests. JSON: one entry in
  `src/config/missions.json`. Scripts: e2e suites (and `scripts/plan-svg.mjs` if it does not exist yet).
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
1. Read `CLAUDE.md` in full, then `docs/level-design.md`, then this spec.
2. Before referencing any file, type, function, field or constant, confirm it exists with grep and note where. If
   something named here does not exist or differs, stop and report it; never invent a substitute.
3. One phase at a time. At the start of each phase re-read this spec (`docs/prompts/<map-id>.md`), the progress log and
   the approved design docs, then print a short plan (files and functions, one line each). Do only that phase.
4. End of each phase: run the listed checks, report results honestly (never claim a check passed unless you ran it in
   this phase; paste the summary line), list what changed, update the progress log, commit and push, then STOP and wait
   for Michael's go-ahead.
5. Save this spec verbatim to `docs/prompts/<map-id>.md` in Phase 0. Never edit it without approval; proposed changes go
   in the progress log under "Spec change requests".
6. Progress log: `docs/prompts/<map-id>-progress.md` (phase, status, files changed, decisions, tests with results, open
   issues, spec change requests).
7. Approved design docs are the build contract. Deviations go under "Decisions" with the reason; a deviation that
   changes a route, a guard job or a room needs approval first.
8. Update `CLAUDE.md` and `CHANGELOG.md` at the end of each phase that adds playable content.
9. Hyphens, never em dashes. Follow `CLAUDE.md` Conventions and Hard rules.
10. Checks: `npm run check`; e2e after a build, single suites with `npm run e2e -- <suite>`.

## Building brief (fill)
- Building type and era: <e.g. 1934 telephone exchange>
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
Guard total: <n> (9 or fewer so every guard spawns at the start).

## Co-op routes (fill or delegate)
Existing verbs only (brace and boost, human ladder, dual takedown). Each route: where, the real reason solo cannot use
it, the solo route to the same surface.
- C1: <...>

## Mission and modes (fill)
- `modes`: <e.g. ['infiltration', 'clear', 'sandbox']>. Do not change any mode's default map.
- Mission: id <...>, name <...>, insertion(s) <...>, brief <...>, objectives in route order <...>, rules <...>.
- Theme: <time of day, light level, faction, grade, weathers>.
- `reinforce`, `alarms`, `hideSpots`, `switches`: <...>

## Engine questions for Phase 0 (fill)
<Anything this map relies on that needs confirming, e.g. "Is a 10 m rappel allowed?">

## Phases (fixed; per `docs/level-design.md` section 14)
- **Phase 0** - Setup and investigation: branch, save this spec, progress log; confirm every fact this spec and
  `docs/level-design.md` section 12 rely on by grep; answer the engine questions; report how to build each element
  from the engine files only. Stop.
- **Phase 1** - Architectural design (docs only): building brief and floor plans per section 13. Stop for review.
- **Phase 2** - Gameplay design (docs only): every section 13 deliverable, self-critique included. Stop for approval.
- **Phase 3..n** - Build one storey or area per phase, no guards; `scripts/plan-svg.mjs` comparison; the section 15
  tests that need no guards; perf budgets. Stop after each.
- **Guards and mission** - squads, alarms, mission entry; the remaining section 15 tests; `e2e-missions`, `e2e-clear`
  updated; full `npm run e2e`; perf with guards. Stop.
- **Dressing, readability and verification** - Michael's phone notes first; dressing that tells the building's story;
  full checks; vantage screenshots at Low and Ultra. Stop.

## Future recommendations (fixed)
At the end of the last phase, one paragraph each on systems this map would benefit from (how they would fit the existing
code, which space would use them). Do not build them.

## Report format (fixed)
Files changed (one line each); Decisions; checks run with their summary lines; anything left undone; manual phone checks
for Michael per space (also in `TESTING.md`); then STOP.
