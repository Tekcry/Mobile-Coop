status: done feature/level-validator-v1 e869ea92

# level-validator V1: scripts/level-validate.mjs + tests/levelValidate.test.ts (Marlow Build, job level-validator)

Lead: Night Shift | Marlow Build (desktop). Node + Vitest only: no src change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/level-validator` (head at claim time; the plan is 96d03285 or later).
- New branch: `feature/level-validator-v1`. Edit ONLY `scripts/level-validate.mjs` (new) and
  `tests/levelValidate.test.ts` (new). Other agents own every other file of the job (PLAN "File ownership").

## The brief
`docs/level-validator/PLAN.md` on the base, in this order of authority:
1. "## Michael's changes M1-M4" (OVERRIDES everything below it). For V1 that means:
   - M2: NO size or time constants in the validator. Every number (corridor / door / ceiling / step / grid / speeds /
     90 s / 15 s / 2.0 m / room table / shadow / vantage / LOS targets) comes from a metrics object. CLI flag
     `--metrics <file>` (default `docs/design/metrics.json`, generated later by slice V1a). Until V1a lands, the tests
     pass an inline metrics object, and the CLI without the file prints one WARN and skips the size checks.
     PLAN's "Constants at the top" list and `parseRoomTable` / `--rooms` are SUPERSEDED: read sizes from metrics.
   - M3: every space has `section`; `checkRedundancy` = 2+ edge-disjoint routes from each section's entry to its exit.
   - M4: shadow %, vantage 70%, LOS 5 s, revive 15 s are declared targets: a missing target is an ERROR, a declared
     value outside the metrics target is an ERROR. Split parity = summed link traversal TIME (link length / the link's
     movement-mode speed from metrics), not room length.
   - Guard counts (3-6 early / 6-10 late) print as `INFO:` lines only, never ERR / WARN.
2. "## Core schema" (fixed; V0 documents it in parallel).
3. "## V1 - validator port" (functions, CLI shape, exit codes, the failing-fixture list for the tests), minus what M1-M4 supersede.
Reference only: `docs/level-validator/source/validate_level.py` (Michael's skill; our rules win, port the algorithms
such as edge-disjoint paths). Michael widened the first run to ALL FIVE campus sections; nothing in V1 changes for that.

## Checks you run
- `npx vitest run tests/levelValidate.test.ts` green; `npx tsc --noEmit` clean; `npx eslint tests/levelValidate.test.ts`
  (scripts/**/*.mjs is eslint-ignored); `node --check scripts/level-validate.mjs`.
- Report the counts (tests passed / total).

## Done
Push `feature/level-validator-v1` (one or more commits; trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>").
Then add a report at the end of this file (exports, checks, test count, deviations, any M1-M4 point you could not
follow) and set `status: done feature/level-validator-v1 <sha>`. Marlow Build runs one Opus checker and merges it.

## Shared contract: docs/design/metrics.json shape (fixed by the lead 2026-10-24 ~20:16; V1 reads it, V1a writes it)
```
{
  "source": "docs/design/scale-sheet.md",
  "sizes": {            // from scale-sheet sections 1 and 3 (metres)
    "door_w": 1.2, "door_min_w": 1.0, "door_h": 2.1, "door_double_w": [1.8, 2.0], "opening_w": [2.5, 3.5],
    "corridor_min_w": 3.0, "corridor_w": [3.5, 4.0], "play_space_min_short": 6.0,
    "ceiling_room": 3.0, "ceiling_hall": [4.5, 6.0], "storey_h": 3.3,
    "fire_stair_w": 1.3, "open_stair_w": <from section 3 if listed, else omitted>,
    "step_player": 0.42, "step_nav": 0.45, "nav_cell": 0.5, "agent_radius": 0.32, "headroom": 1.7
  },
  "roomParams": { <section 7 parameter table, keys verbatim: room_scale, room_round_m, camera floors ...> },
  "rooms": { "<class>": { "minW", "minL", "maxW", "maxL", "cameraFloor", "ceilMin", "ceilMax" (number or "open"),
                          "encounter": "yes" | "conditional" | "no" } },   // section 7 GAME sizes (already scaled)
  "rules": { <section 8 table, keys verbatim: split_speed_mps, reach_speed_mps, split_max_s, split_parity_pct,
             reach_max_s, shared_min_w_m, shadow_min_frac, shadow_max_frac, vantage_min_frac, los_break_max_s,
             step_band_min_m, step_band_max_m, grid_m> }
}
```
A key missing from the sheet is omitted (never invented); the validator WARNs once for a missing key and skips that check.

## Answer (lead, 2026-10-24 ~20:26; applies even though the brief is claimed)
V0 landed: `docs/level-validator/graph-schema.md` on `origin/feature/level-validator` (3357d24e + lead decisions after it)
is the field reference. Follow its section "Lead decisions on the known gaps":
1. co-op kind `pair_gate` (team doors); 2. kinds `team_rope` (co-op) and `rappel` (solo, one way); 3. connectors are
single `spine` links and each counts as a release (tension 1) for pacing; 4. `length` is middle-to-middle, add nothing
per space; 5. a split leg or reach path through a link with no walking speed and no `time_s` -> WARN; 6. skip ceiling
checks for `open` ceilings and `exterior` spaces; 7. split-leg time rule and dead-end depth as in that doc's "How the
checks read the graph". V1a is done (feature/level-validator-v1a f72e640c): read its real `docs/design/metrics.json`
keys and match them.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/level-validator-v1` @ e869ea92 (one commit on origin/feature/level-validator c7784fc9). Only the two new files.

Exports: `mergeGraphs`, `validate(graph, { metrics, metricsPath })`; checks `checkStructure`, `checkDimensions`,
`checkReach`, `checkSpine`, `checkEncounters`, `checkRedundancy`, `checkCoop`, `checkPacing` (each
`(graph, metrics) -> { errors, warns, infos }`); helpers `edgeDisjointPaths` (port of edge_disjoint_paths), `isOneWay`,
`parseArgs`, `run(argv, { log, root })` (returns the exit code); constants `SPACE_TYPES`, `LINK_KINDS`, `COOP_KINDS`,
`DEFAULT_METRICS` (the path). CLI guarded as in heavy-lock.mjs.
CLI: `node scripts/level-validate.mjs <graph.json> [more.json ...] [--metrics <file>]` (default docs/design/metrics.json).
ERROR, then WARN, then INFO lines, then "N error(s), M warning(s)." Exit 0 clean, 1 any error, 2 bad usage (no file,
bad JSON, unknown flag; `--rooms` now unknown). No metrics file: one WARN, size/time checks skipped; presence checks
(e.g. missing shadow_pct) still ERROR.

Checks: vitest tests/levelValidate.test.ts 48/48; `npx tsc --noEmit` clean; eslint on the test clean (script is
eslint-ignored); `node --check` ok. CLI on docs/level-validator/example.graph.json with the real metrics: 0 errors,
9 WARNs (all missing-metrics-key), exit 0. No campus graphs on the base yet.

M1-M4: M2 no size/time constant in the script (missing key -> one WARN, check skipped; guard bands print INFO);
M3 per-section entry->exit edge-disjoint routes inside the section (exactly one entry and one exit per section, else
ERROR); M4 missing target ERROR, declared target outside the metrics range ERROR, split parity by summed link time;
guard counts INFO only. Lead decisions 1-7 followed (pair_gate / team_rope co-op; drop / rappel one-way; spine link =
tension-1 release; length middle-to-middle; untimed climb/crawl WARN; open-ceiling / exterior skip ceiling checks).
Structural counts kept in code (3 approaches, 2 route kinds, 2 routes, half the encounters, tension 4+ high / 1-2
release): standard wording, not sizes.

Keys metrics.json lacks (validator reads these names; WARN + skip until metrics-gen extracts them; tests add them
inline): sizes `ceiling_min` 2.4, `door_h_min` 2.0, `door_h_max` 2.2, `roller_door_w` 3.0, `duct_w` 1.2, `duct_h` 1.5,
`tunnel_h` 2.1, `wall_jump_max_up` 3.8, `coop_lip` [4.3, 4.5], `split_jump_w` [1.2, 1.95], `split_jump_h` 3.6;
rules `safe_drop_m` 3.5, `dead_end_max_m` 15, `guards_early` [3, 6], `guards_late` [6, 10], `guards_max` 10. So today
guards > 10, ceilings < 2.4, door heights, ducts, roller doors and co-op lips are not error-checked: a V1a follow-up.

Deviations: `parseRoomTable` / `--rooms` dropped (superseded). 0.5 m grid WARN only on space w/l, link length and
corridor / opening / roller-door widths (door, stair, duct widths and all heights are sheet sizes off the grid;
literal "every width/height" would WARN every door). Safe drop above the limit is a WARN (no fall-damage constant in src).
Decided: partner reach skips links with no time_s and no walking speed (0 s made ducts free shortcuts; if only such
links would bring reach under 15 s -> WARN), worst case over both legs to the nearest space of the other leg. Split
legs: solo links only; fork = outside space leading into both legs' first spaces; rejoin = first space (file order)
both last leg spaces lead to, not the fork; untimed link = 0 s + WARN, parity then not judged. Routes cross: inside
each section, excluding entry/exit, the route kinds must connect through shared spaces (else ERROR). Spine: a
non-spine link crossing sections ERROR; spine must run exit -> next entry (else ERROR); start outside first section /
exfil outside last WARN. Structure: any structure error stops the run; campaign map must be players [2]; door /
passage / stair / duct without width or height ERROR; climb without level_change WARN; unknown room_class ERROR.
Pacing: a peak with no tension 1-2 before the next peak or the end WARN. No-softlock flags only spaces at the end of
a co-op link (graph-schema wording).
