# V6 - greybox measurement (M4) - plan

> **History, archived 2026-10-25 (doc-clarity).** The level-validator job's record, kept for reference only. The
> current rules are `docs/level-design.md`, the graph format `docs/level-validator/graph-schema.md`, the numbers
> `docs/design/scale-sheet.md`. Where this file differs from them, they win.

Opus plan, 2026-10-24. Lead: Night Shift | Marlow Build. Follows the level-validator PR (PLAN.md M4, slice table V6).
Docs only until the lead starts the slices; every builder starts from `docs/systems/agent-preamble.md`.

## Goal
Measure on the built greybox what the graph only declares, write it as `measured` beside each target, and make
`scripts/level-validate.mjs` fail a map whose measurement misses its target. Five measurements:
1. **Floor shadow %** per encounter space: share of its walkable floor where a standing body reads dark on the meter.
2. **Vantage visibility %**: share of the space's walkable floor the vantage eye has a clear sight line to.
3. **LOS-break time**: worst nav-path time from an exposed floor cell to the nearest break cell, at the run speed.
4. **Partner revive reach** per split: worst nav-path time from any cell of one leg to the nearest cell of the other.
5. **Link traversal times**: nav-path time `from` centre -> link point -> `to` centre, at the kind's speed.
Numbers come from `docs/design/metrics.json` `rules` (shadow 0.4-0.6 as INFO, vantage 0.7, LOS 5 s, reach 15 s, split 90 s /
20%, speeds 1.3 / 3.0); none is hard-coded (M2).

## Approach: node only, no browser, no GPU (no laptop queue)
Everything V6 needs is pure TypeScript already run in node by tests and one script:
- **Light bake.** `bakeLevelLight` (`src/world/lightBake.ts:75`) only wraps pure bakers behind the worker pool; the tests
  call them directly: `canonicalLightSet` -> `buildAmbientGrid` -> `bakeMoon` -> `bakeLamps` -> `new LightField(...)`
  (`tests/campusArtLight.test.ts:35-50` on the whole campus; `tests/warehouseS1Light.test.ts:49-53`). `bakeLamps`
  carries the bounce (`src/voxel/lampBake.ts:66`), the field builds its bounce grid from it (`src/world/lightField.ts:165`).
  Cost: ~25 s per campus bake (`docs/sector-redesign/checks/art-check.md:14`: 48 s for two).
- **Meter parity.** The meter is `LightField.bodyLevel(x, feetY, z, height)` (`src/game/gameState.ts:1667`,
  `src/world/lightField.ts:224`); dark = below `LIGHT.shadow` 0.28 (`src/world/lights.ts:89`). V6 samples exactly that
  (standing height 1.7, no character occluder, flashlights off): gameplay data, never graphics state (hard rule).
- **Nav grid.** `navGridFromLevel` (`src/ai/navBuild.ts:56`, cell 0.5, step 0.45, agent radius 0.32) is what the game
  builds; `tests/helpers/runtimeNav.ts:22,117` feeds it an analytic down-cast in place of Havok
  (`tests/campusRuntimeNav.test.ts:14` builds the whole campus; `tests/campusS4.test.ts:632` floods it). Paths:
  `NavGrid.findPath` (`src/ai/navGrid.ts:591`); many-source distances: `flowField` (`:722`, result in CELLS, x 0.5 m).
- **Sight.** `SightWorld` (`src/game/sectorCheck.ts:48`, pure, clear glass passes sight) as
  `tests/campusS4NocSight.test.ts:28` uses it; eye `EYE_STAND` 1.55 (`src/ai/perception.ts:68`), range
  `PERCEPTION.focusRange` 25 m (`:21`). This is the static-geometry line `losClear` tests at runtime (`:84`).
- **Loading TS from a node script.** `scripts/lamp-audit.mjs:36-62` runs Vite's SSR loader (`createServer` +
  `ssrLoadModule`) headless and bakes light fields in node: V6's CLI copies that pattern.
- **Hard rules.** Babylon only through `src/core/babylon.ts` (`runtimeNav.ts:7` and `campusOps.ts:1` already do; V6
  adds no Babylon import). No-allocation applies to game hot paths only; V6 is tooling, and the field / nav queries it
  calls are allocation-free anyway. Not a heavy run (one node process, like one Vitest file): desktop agent CPU, no lock.

## Schema additions (graph-schema.md; all optional, so V1 graphs stay valid)
| Field | On | Meaning |
| --- | --- | --- |
| `area` | space | Where the space is on the map: a RoomDef id of the map's rooms (`"gatehouse"`, `src/world/rooms.ts:51`; box and `minY` / `maxY` from code), or a list of `[minX, minZ, maxX, maxZ]` boxes (L-shapes, route surfaces with no RoomDef). Floor cells = walkable nav cells inside it within 1.0 m of `storey`. Required for V6 on encounter and split-leg spaces |
| `vantage.at` | space | Vantage feet point `[x, y, z]`. Absent: V6 picks the best cell of the `from` space at 1 m stride and writes it to `measured.vantage_at` (the designer pins it after) |
| `at` | link | The opening / door point `[x, y, z]` the link passes. Absent: the walkable cell on the shared edge of the two `area`s nearest both centres (ERR in the measure report when the edge has 2+ gaps) |
| `measured` | space | `{ shadow_pct, sees_pct, vantage_at, los_break_s, cells, geom }` |
| `measured` | link | `{ time_s, path_m }`, or `{ time_s: null, why }` for a kind the nav grid does not model |
| `meta.measured` | meta | `{ tool: "level-measure 1", date, geom, splits: { "<id>": { a_s, b_s, reach_s } } }` |
`geom` = the canonical light-shape hash (`canonicalLightSet(...).hash`) + the nav input hash: stale detection.

## Measurement definitions (V6b implements, its test pins each on a synthetic room)
- **Shadow.** Over floor cells: dark if `bodyLevel(x, h, z, 1.7) < LIGHT.shadow`; `shadow_pct` = dark / all. Doors open
  (the nav grid has no door bodies, `runtimeNav.ts:5`; the light field gets `open: 1` as `campusArtLight` does).
- **Vantage.** Eye = `vantage.at` + 1.55; a floor cell is seen when `SightWorld.clear(eye, cell + 1.0)` within 25 m.
  Light is ignored (the vantage player wears goggles).
- **LOS break.** Observers = the vantage eye + every guard of the map's sector data whose post or route point lies in
  the `area` (eye 1.55). A cell is exposed when lit (>= 0.28) and seen by any observer; a break cell is any walkable
  cell (the space plus 6 m round it, so doors and the next room count) that is not exposed. `flowField(break cells)`;
  `los_break_s` = max over exposed floor cells of cells x 0.5 / `reach_speed_mps` (3.0, the run).
- **Reach.** Per split: leg cells = floor cells of every `split:<id>:a` / `:b` space; `flowField` from leg b, max over
  leg a, and the reverse; `reach_s` = the larger / 3.0. Unreached (legs joined only by rope, rappel, co-op moves): null.
- **Links.** `findPath` centre -> `at` -> centre, waypoint lengths summed, / `split_speed_mps` 1.3. Kinds off the nav
  (`coop_boost`, `human_ladder`, `team_rope`, `rappel`, `wall_jump`, `split_jump`, `ledge`, `pipe`, `duct`, `window`,
  `hatch`): `time_s: null`, `why`; the validator keeps the declared `time_s`. `ladder` and `drop` are nav links.

## Validator rules (V6d, `checkMeasured`)
- INFO `measured.shadow_pct` outside `shadow_min_frac`-`shadow_max_frac` (the light band wins, level-design 5.5; its
  lux check comes with the light-realism values); ERR `measured.sees_pct` < `vantage_min_frac`;
  ERR `measured.los_break_s` > `los_break_max_s`; ERR `meta.measured.splits.<id>.reach_s` > `reach_max_s`.
- Split legs use `measured.time_s` before `time_s` before `length` / speed, so the 90 s and 20% rules fail on measurement.
- WARN measured vs declared apart by > 0.10 (fractions) or > 1.5 s: the design doc's declared target is out of date.
- INFO `pending V6` per encounter with no `measured`; `--require-measured` turns it into ERR (the greybox gate).
  The flag is part of the greybox exit in `docs/level-design.md` section 14 (Michael 2026-10-24 ~22:00, "Yes, require
  it", G289 (2)).

## Slices (at most 5; one PR after a fresh Opus checker over all five)
| Id | What | Model | Files owned | Gate / tests | Est. |
| --- | --- | --- | --- | --- | --- |
| V6a | Schema additions above + the example graph gets `area`, `vantage.at`, one link `at` | Opus | `docs/level-validator/graph-schema.md`, `example.graph.json` | `node scripts/level-validate.mjs docs/level-validator/example.graph.json` still 0 ERR | 30 min |
| V6b | Pure measurement core: `measureGraph(graph, { builder, field, nav, sight, guards, metrics })` -> measured objects; `nodeLightField(b, map)` (the test bake, shared once) | Opus (nav / light / sight) | `src/world/levelMeasure.ts`, `tests/levelMeasure.test.ts` | `npx vitest run tests/levelMeasure.test.ts`, `npm run typecheck:fast`. Synthetic LevelBuilder room 12 x 8: one lamp over half -> shadow 0.5 +- 0.05; a 2 m wall -> known sees %; a door 6 m away -> LOS 2 s +- 0.2; a 20 m corridor link -> 15.4 s +- 0.5 | 2 h |
| V6c | CLI `scripts/level-measure.mjs <graph.json...> [--write] [--check] [--doors shut]`: Vite SSR (lamp-audit pattern), builds `meta.map` from `MAPS`, runtime nav (`tests/helpers/runtimeNav.ts`, unchanged), writes `measured` (2 decimals, stable key order), prints a declared / measured table; `--check` exits 1 on a target crossed or drift > 0.05; `npm run level-measure`; testing-tools entry, changelog fragment | Sonnet (strict brief from V6b's API) | `scripts/level-measure.mjs`, `package.json` (one script line), `docs/systems/testing-tools.md`, `changes/feature-level-validator-v6.md` | runs on `example.graph.json` against a tiny test map in < 30 s; campus all five < 4 min | 45 min |
| V6d | `checkMeasured` + measured-first split times + `--require-measured` | Sonnet | `scripts/level-validate.mjs`, `tests/levelValidate.test.ts` | `npx vitest run tests/levelValidate.test.ts` (fixture graphs with measured passes / misses / drift / pending) | 30 min |
| V6e | Campus run: `area` (RoomDef ids from each space's note; box lists where none), `vantage.at`, link `at` where a pair has 2+ doors, in the five graphs; `level-measure --write`; drift test; REPORT with declared vs measured and the verdict per space | Sonnet (data + run); verdict text checked by the Opus checker | `docs/sector-redesign/graph/campusOps-S1..S5.json`, `tests/levelMeasureCampus.test.ts`, `docs/level-validator/campus-run/V6-REPORT.md` | `node scripts/level-measure.mjs ... --check` 0; `npx vitest run tests/levelMeasureCampus.test.ts` (600 s timeout, as campusArtLight) | 1 h |
Order: V6a, then V6b + V6d in parallel, then V6c, then V6e, then the checker and the PR (tier: CI `check`; no e2e,
nothing in `src/` that the game imports).

## Risks
- **Sight cost.** `SightWorld.clear` tests every box (`sectorCheck.ts:63`): the vantage search (from-cells x floor cells)
  can take minutes on S2's hall. Pin `vantage.at` in V6e; V6b adds a 4 m bucket grid only if a campus run passes 60 s.
- **Nav models walk, ladders and drops only** (`navGrid.ts:30`). Ropes, rappel, ducts, co-op moves, ledges get no
  measured time; legs joined only by them give a null reach (WARN, not ERR). Ducts under 1.7 m headroom are not walkable.
- **Doors open everywhere.** Strictest for shadow (more light), loosest for sight lines; `--doors shut` re-runs shadow
  with doors shut for a space that passes only open.
- **Observers.** Posts and route points stand in for patrol timing (CHECK `longestIsolation`, `sectorCheck.ts:327`,
  is the timed model); LOS break is therefore conservative. A map with no sector guard data uses the vantage only.
- **Area mapping.** The campus notes give boxes as free text (`campusOps-S2.json` notes cite `campusS2.ts:147`); a wrong
  RoomDef id measures the wrong floor. V6e's report lists cells per space; a space with < 20 cells is an ERR in the report.
- **Stale numbers.** Geometry edits (campus art passes) move the light; `geom` + the drift test catch it. The drift test
  fails only when a target is crossed or a value moves > 0.05, so a dressing PR is not blocked for noise.
- **Campus will fail.** Graphs are AS BUILT (S1 gatehouse already declares shadow 0.0). V6 reports; fixes are a later
  greybox job, not V6.
- **Light parity.** Shadow uses the field, which the meter and perception read; the picture is not measured (GPU, out of
  scope). A parity gap shows only in the existing parity checks.

## What Michael sees
- `docs/level-validator/campus-run/V6-REPORT.md`: per section, a table of every encounter space with declared and
  measured shadow %, vantage %, LOS-break s; per split the measured leg times and revive reach; link times beside the
  declared ones; a PASS / FAIL column and the worst offenders first.
- `node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S*.json` prints lines such as
  `ERR s2-hall: measured sees_pct 0.55 below 0.7 (declared 0.75)` and `INFO s3-lab: pending V6`.
- Decided (Michael 2026-10-24 ~22:00, "Yes, require it"): `--require-measured` is part of the greybox exit in
  `docs/level-design.md` section 14.
