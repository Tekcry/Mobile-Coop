# route-runs: plan
Owner: Marlow Build. Status: current.

Lead: Night Shift | Marlow Build. Planner: Opus 5.5, master 2148ec969. Brief: `docs/route-runs/BRIEF.md`.
Branch per slice: `feature/route-runs-<slice>` in `C:/NightShift/Mobile-Coop-route-runs-<slice>` (lowercase slice id,
e.g. `feature/route-runs-r1`), cut from origin/master; one PR per slice, each with its fragment
`changes/feature-route-runs-<slice>.md` (`kind: patch`: tooling and tests). Gate for the whole plan: the plan checker
(FOLDED-PLAN J13, `docs/templates/plan-check.md`).

## Claims
```claims
files:
  - scripts/route-run.mjs
  - scripts/route-run/**
  - tests/routeRun*.test.ts
  - tests/fixtures/route-run/**
  - docs/route-runs/**
  - docs/level-design.md
  - docs/systems/testing-tools.md
maps: none
protocol: none
save: none
```
Read only (imported or driven, never edited): `scripts/level-validate.mjs` (`mergeGraphs`, `COOP_KINDS`, `LINK_KINDS`,
`isOneWay`), `scripts/e2e-lib.mjs`, `scripts/e2e-net-lib.mjs`, `scripts/laptop-queue/serve.mjs`, the map graphs, the
built game (`dist/`). `docs/level-design.md` is touched by R8 only (two lines of section 14 / 15);
`docs/systems/testing-tools.md` by R8 only (one new section). Changelog fragments are shared files (not claimed).
`claims-check` (2026-10-25 ~18:00): one overlap, `docs/systems/testing-tools.md` with `feature/test-runner-j20` (J20,
Test Runner); R8 is a late docs slice, so it is cut from master after J20 merges and adds only its own section (or
Test Runner adds it, the lead's call). `feature/marlow-docs-j1` and `feature/doc-level` have no claims
block and may touch `docs/level-design.md`, so R8 is cut from master after they land and writes its two lines on top. Guard AI's G1 (below) is claimed on Guard AI's own branch,
not here: `src/ai/detectionCause.ts` (new), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/game/gameState.ts` (the
debug overlay line), `tests/detectionCause.test.ts`.

**No game code changes in this job.** The robots are a harness (scripts and tests); nothing ships to players, so no
flag is needed. G1 is instrumentation with no behaviour change (host only, not on the wire); Guard AI decides whether
it wants a flag.

## Shape
```
graph files ─┐                         ┌─ laptop queue alone step, one per section (E2E_GPU=1)
points (R6) ─┼─> plan.mjs (R1) ─ runs ─┼─> route-run.mjs (R4a/R4b) ── 2 pages ?net=local&autostart=<map>&mode=<mode>
             │                         │      driver.mjs in page: steer (R3), steps (R5), stubs, objectives,
             │                         │      detections (R7: G1 record, else inferred), dead stops (R3)
             │                         └─> run log JSON ─> report.mjs (R2) ─> route-run.json + REPORT.md + walk-card lines
             └─ --publish (branch route-run-results) ─> --merge on the desktop ─> <graph folder>/route-run/
```

## Slices
**R1 Route planner (Opus).** Pure, Babylon-free: `scripts/route-run/plan.mjs`. Input: the map's graph files (merged with
`mergeGraphs` from `scripts/level-validate.mjs`, same file order rules as the validator) and a points table (R6 shape:
per space `centre` / `floorY` / `boxes`, per link `at`). Output: `runs[]`, each `{ id, section, kind, covers: [[space,
kind]], steps[] }`, steps `walk { to, space, link }`, `link { index, kind, from, to, at, action, limit_s }` (action
`door`, `ladder`, `drop`, ... or `stub` with `hold_s`), `objective { space }`, `split { id, a: steps[], b: steps[],
rejoin }`. Rules (BRIEF "Which routes"): per section, for each kind in `shadow`, `high`, `loud`, the (encounter space,
kind) pairs it declares; for each pair the cheapest path `entry` -> in through a link of that kind -> objective (when
the section has one) -> `exit` (Dijkstra on `time_s`, else `length` / `split_speed_mps`, links of other kinds x3, `spine`
x1; `one_way`, `drop` direction honoured; two players, so co-op and `bolted` links are normal ways); then a greedy set
cover keeps the fewest runs that cover every pair; identical step lists merge. Training (`meta.mode: training`): one run
`start` -> `exfil`. A run through a space with no `area` or a link with no point is returned as `unplannable` with the
reason (BRIEF A8). `--dry-run` in R4a prints this plan.
- Files: `scripts/route-run/plan.mjs`, `tests/routeRunPlan.test.ts`, `tests/fixtures/route-run/` (a two-section
  campaign graph with areas, points, a split and a co-op gate; a small training graph; a copy of the V6 campus S1
  graph, `origin/feature/level-validator-v6:docs/sector-redesign/graph/campusOps-S1.json`). Est. lines: 700.
- Checks: `npx vitest run tests/routeRunPlan.test.ts`; `npm run typecheck:fast` (no TS touched, sanity only).
- Done looks like: on the fixtures every declared (encounter space, kind) pair is covered by exactly the runs printed;
  the campus S1 fixture gives at most one run per kind more than the minimum; a removed `area` gives `unplannable`
  naming the space; the training fixture gives one run start to exfil.

**R2 Report (Sonnet, from an Opus brief).** Pure: `scripts/route-run/report.mjs`. Run log (R4a's JSON) -> `route-run.json`
(the stable shape below) and `REPORT.md` (plain English: a summary table per section and route, then per run the
detections, notices, dead stops and stubs, then the walk-card snippet), the pass rule (Q7: verdict `pass` when no run
has a dead stop and no run is `unplannable`; detections never fail), the Marlow time line (M9: total, walk, holds
against 900-1200 s, report only), and `merge(parts[])` for the per-section step outputs.
- JSON shape: `{ tool: "route-run 1", map, mode, version, sha, date, players, pace, detections: "forgive" | "keep",
  graphs: [file], geom, routes: "graph" | "code", runs: [{ id, section, kind, covers, verdict: "pass" | "stuck" |
  "unplannable", time_s | null, walked_m, deadStops: [{ t, robot, at, space, link, class: "no-nav-path" |
  "could-not-follow" | "step-timeout" | "locked", shot }], detections: [{ t, robot, guard: { id, kind, role, zone },
  sense, inferred, level, guardAt, robotAt, space, inputs }], notices: [same], stubs: [{ link, kind, hold_s, why }] }],
  summary: { runs, stuck, unplannable, detections, notices, stubbed, walkedLinks, verdict, runTime_s } }`.
- Walk-card snippet, one line per route: "S1 shadow route (gatehouse, car park): 2:31, never stuck. Seen once: the gate
  officer saw you at the barrier (0:42, lit, 9 m). Noticed twice: the smoker heard you on the gravel (1:10)."
- Files: `scripts/route-run/report.mjs`, `tests/routeRunReport.test.ts`. Est. lines: 600.
- Checks: `npx vitest run tests/routeRunReport.test.ts`.
- Done looks like: a fixture log gives the JSON above byte-stable, a REPORT.md with no jargon or hashes in the
  walk-card lines, `verdict: fail` for one stuck run, `pass` for detections only, a merged report equal to the one-run
  report.

**R3 Progress, stuck and steering math (Opus).** Pure: `scripts/route-run/progress.mjs`. Progress along a polyline
(nearest-point arc length, monotonic, storey-aware by `y`), `StuckWatch` (BRIEF A4: under 0.5 m in 8 s of game time
while walking; per-step limits door 5 s, ladder 15 s + 1 s/m, drop 5 s, window / hatch 8 s, duct 2 s/m, objective hold
+ 5 s; named constants with the A4 note), the stick vector from the heading to the next waypoint and the camera yaw
(arrival radius 0.4 m, look-ahead on the path), the stick scale that gives `split_speed_mps` crouched (read from
`docs/design/metrics.json`, `--pace walk|run` options), the follower's trail point (2 m behind on the leader's walked
path), and the inferred-cause classifier (pure part of R7's fallback: inputs per rise, output sense + `inferred: true`).
- Files: `scripts/route-run/progress.mjs`, `tests/routeRunProgress.test.ts`. Est. lines: 500.
- Checks: `npx vitest run tests/routeRunProgress.test.ts`.
- Done looks like: tests cover a straight leg (no stop), a robot pinned on a wall (stop at 8 s, not 7.9), a door pause
  of 1.5 s (no stop), a ladder over its limit (step-timeout), a storey change on an overlapping plan, the follower
  trail through a corner, and each inferred sense.

**R4a Harness core, one page (Opus).** `scripts/route-run.mjs` (CLI) and `scripts/route-run/driver.mjs` (the in-page
driver, injected with `page.addInitScript` / `evaluate`, using `window.__app`, `window.__pad` and
`loop.stepHeadless`). CLI: `node scripts/route-run.mjs <url> --graph <files...> [--points <file>] [--section S1]
[--routes graph|code] [--players 1|2] [--pace sneak|walk|run] [--detections forgive|keep] [--out <dir>] [--publish]
[--dry-run] [--selftest]`, `--merge <map> <sha> --out <dir>` (no browser). One page: boot (`e2e-lib` `launch`, autostart
params from the graph's `meta.map` / `meta.mode`), damage off, section setup (Sector Ops / campaign: the section's
checkpoint through `window.__sector`, the earlier sections passed by the connector cycle as `e2e-sectorops` part 6 does;
course: the host's `courseBay`), `restartSection` between runs (guards back on their fixed patrols, calm), then the run:
the driver steps the game in 0.05 s chunks in the page, steering with R3, opening doors with the pad (A near a shut door
on the path), using objectives (A held), holding and placing at every stub, logging dead stops (class from a nav
`findPath` probe; a screenshot; recovery past the link), polling guard levels every 0.1 s game time for detections
(inferred senses, R3), wrapping `enemyMgr.hear` in the page to see noises, reading camera alarms from
`window.__ctdev.debug()`, and the forgive step (BRIEF A2). Writes the run log; `--publish` commits it to branch
`route-run-results` with git plumbing (`request.mjs` pattern: temp index, no checkout, retry on a lost push race);
the JSON is also printed between `ROUTE-RUN-REPORT` markers. `--routes code` walks the map's own `SectorRoute` lists
(`src/game/sectors.ts:73`, `climbs` legs stubbed) for an early number before J12: its report header says "code
routes, not a gate run". `--selftest`: a fixture graph on campusOps S1 (R1's copy) plus one link drawn through a solid
wall: the walled link must give a `no-nav-path` stop inside 8 s + 1 s and a known clear door leg must pass.
- Files: `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/publish.mjs`,
  `tests/fixtures/route-run/selftest.graph.json`. Est. lines: 1,100.
- Checks: `npm run typecheck:fast`; the R1-R3 vitest files; on the laptop queue (`E2E_GPU=1`):
  `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --alone --step "serve scripts/route-run.mjs
  http://127.0.0.1:4189/ --selftest --players 1" --set route-run-selftest --requester "Night Shift | Marlow Build"`,
  then one `--routes code --section S1 --players 1` run on campusOps. Verdict: `laptop-e2e/alone-route-run-selftest`.
- Done looks like: the selftest passes on the laptop; the campus S1 code-route run writes a REPORT.md a person can read,
  every number in game seconds, and a second run on the same head gives the same detections at the same times
  (fixed patrols, VISION 4 rule 8).

**R4b The robot pair (Opus).** Two pages on `?net=local` (`e2e-net-lib` `hostAndJoin` / `waitSim` / `setSimPages`,
as `e2e-ctcourse`): the leader on the host, the follower on the client steered to R3's trail point, both stepped on the
host clock; splits (leg a leader, leg b follower, both wait at the rejoin); co-op stubs (both at the near `at` point,
crouched, hold, then both placed past it; `allowTeleport` on the host's remote as `moveClient` does); detections and
notices for either robot; `--players 2` the default for every map (BRIEF A6).
- Files: `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/pair.mjs`. Est. lines: 600.
- Checks: R1-R3 vitest; laptop alone runs `--selftest --players 2` and `--routes code --section S1`.
- Done looks like: both robots are seen in the log (a guard rises on the follower at least once on S1, or the report
  says neither was seen); a split in the fixture graph is walked by both legs at once; every co-op link is listed as a
  stub with its time.

**R5 Link steps (Opus).** `scripts/route-run/steps.mjs`, called by the driver for `link` steps, pad only, from the
traversal helpers' patterns (`scripts/e2e-traverse.mjs`): `ladder` (walk into the foot, climb, step off at the top;
down from the top), `drop` (walk off the edge; a hang-drop where the edge needs it), `window` / `hatch` (the vault or
climb-through the game offers), `duct` (crouch-crawl), `fire_stair` / `open_stair` (walked), `rappel`. Any other solo
kind (`ledge`, `pipe`, `wall_jump`, `split_jump`) stays a stub in this slice, listed in the report. Each step has its
R3 limit.
- Files: `scripts/route-run/steps.mjs`, `scripts/route-run/driver.mjs` (dispatch only). Est. lines: 700.
- Checks: laptop alone `--selftest` (the fixture gains one ladder and one drop on S1) and a code-route run of S1 and S2.
- Done looks like: the campus S1 / S2 ladders and drops are walked, not stubbed; a missing ladder in the fixture gives a
  `step-timeout` stop at its limit.

**R6 Points from the V6 port (Sonnet; after J12).** `scripts/route-run/points.mjs`: the points table R1 reads, taken from
J12's resolver (interface below) so the robots and the measure tool use the same door points; the run log records the
`geom` hash. Fallback if J12 ships no resolver: declared `at`, else the middle of the facing edges of the two `area`s
snapped to the nearest walkable nav cell in the page (`nav.nearestWalkable`), marked `approx` in the report.
- Files: `scripts/route-run/points.mjs`, `tests/routeRunPoints.test.ts`. Est. lines: 250.
- Checks: `npx vitest run tests/routeRunPoints.test.ts`; one laptop alone run of campus S1 from the graph.
- Done looks like: campus S1 runs from its graph (not code routes) and the report names graph spaces and links.

**R7 Cause record reader (Sonnet; after G1).** The driver reads Guard AI's cause ring when it exists
(`enemyMgr.causes`, feature-detected) and maps each record to a detection or notice line; without it the R3 inference
stays. Records and inferences never mix in one run (the report header says which).
- Files: `scripts/route-run/driver.mjs`, `scripts/route-run/causes.mjs`, `tests/routeRunCauses.test.ts`. Est. lines:
  250.
- Checks: vitest; one laptop alone run of campus S1 on a head with G1 merged.
- Done looks like: no `inferred` senses on that run; a sighting names light, distance and stance.

**R8 Docs and the first gate runs (Sonnet).** `docs/level-design.md` section 14 (2) and 15: the pass rule (Q7) and the
stuck definition (BRIEF A4), one line each (Michael's Q7 answer is the approval; Marlow owns the file);
`docs/systems/testing-tools.md` a "Route-runs" section (command, laptop request, outputs, `--publish` / `--merge`). Then
the first runs: Marlow Yard (M9 baseline, training graph from J12) and campus S1-S5 when J17's greybox v2 exits; each
report goes to the map lead for its docs; this job keeps a copy of each first run in `docs/route-runs/runs/<map>/`.
- Files: `docs/level-design.md`, `docs/systems/testing-tools.md`, `docs/route-runs/runs/**`. Est. lines: 120 (docs).
- Checks: CI `check` (doc lint); the laptop alone runs.
- Done looks like: LD 15's "Every declared route passes its bot route-run" says what passing means; Marlow's REPORT.md
  gives a run time against 15-20 min; campus gets its first graph-driven REPORT.md.

**R9 Real co-op moves (Opus; after Q1).** Replace stubs with real two-robot moves where the game's helpers already script
them: `coop_boost` and `human_ladder` with the leg-up (`scripts/e2e-ctcourse.mjs:157-178`: crouch, RB offer, RB take,
hang, pull up), then `team_pull`, `shutter` and `pair_gate` as their test helpers exist (`e2e-sectorops` parts 3-5).
Q1's second answer moves R9 ahead of the first gate run and adds every kind.
- Files: `scripts/route-run/coop.mjs`, `scripts/route-run/steps.mjs`. Est. lines: 500.
- Checks: laptop alone `--selftest --players 2` (fixture gains one boost), a campus S5 run (rope, team door).
- Done looks like: the report counts leg-ups as walked; a leg-up that cannot reach the lip is a `step-timeout` stop.

**G1 Per-detection cause record (Guard AI, Opus; two Opus checkers: `src/ai`).** Built and owned by Guard AI (FOLDED-PLAN
J13 "+ Guard AI cause record", conformance G C5). What route-runs needs from it:
- A Babylon-free `src/ai/detectionCause.ts`: a fixed ring (256 records in typed arrays, nothing allocated on write) and
  the cause kinds `sight`, `close` (the felt term, `src/ai/perception.ts:181-188`), `hearing`, `shadowCue` (Q14, filled
  once J16 builds it), `told` (radio or shout), `body`, `smell` (dogs), `shot`.
- Written on the host at every rise of a guard's alert level (to `suspicious`, `investigating`, `alert`, and to
  `searching` when told), where the level changes: `seq` (monotonic), `t` (match game time), guard index and id,
  from / to level, cause, target player slot (-1 none), guard position, target (or stimulus) position; for sight,
  close and shadow cue the sight inputs (`P_SIGHT`, `src/ai/enemy.ts:92`: distance, angle, light, crouched, speed,
  exposure) and the rate; for hearing the noise radius and kind; for told the teller's id.
- Read API (debug and tests only, may allocate): `enemyMgr.causes.count`, `enemyMgr.causes.read(seq)` returning a plain
  object or null; one debug overlay line (F3) with the latest cause. No wire, no save, no behaviour change.
- Tests: `tests/detectionCause.test.ts` (ring wrap, cause choice per stimulus); `e2e-stealth-ai` on the laptop.
- Fallback until it lands: R3 / R4a inference, every sense marked `inferred` in the report.

## Dependencies
| Needs | From | What exactly | Fallback | Blocks |
| --- | --- | --- | --- | --- |
| V6 positions on master | J12 validator port (feature/validator-port, Marlow) | (1) master's schema accepts `area`, `vantage.at`, link `at`, `measured` and `meta.measured.geom` on every profile, `training` included; (2) `scripts/level-validate.mjs` keeps exporting `mergeGraphs`, `COOP_KINDS`, `LINK_KINDS`, `isOneWay`; (3) one point resolver both tools use: `node scripts/level-measure.mjs <graphs> --points <out.json>` writing per space `{ id, section, storey, floorY, boxes, centre, cells }` and per merged link index `{ from, to, kind, route, at, atFrom: declared / edge / none, gaps, measured }` plus `geom`, or the same as an exported `resolvePoints(graph, nav, opts)` in `src/world/levelMeasure.ts` that R6 calls through Vite's SSR loader (the `level-measure.mjs` pattern) | R6's own approximate points (marked `approx`) | R6, R8 gate runs |
| Graphs with `area` on every space a route passes | map leads: Sector Ops (J17 campus), Marlow (ctcourse, J12 H6 / J14), Campaign (J23 Tallow) | V6 needs `area` only on encounter and split spaces | none: such runs are `unplannable` (BRIEF A8) | R8 gate runs |
| Cause record | Guard AI G1 (conformance G C5) | above | inference, marked | R7 only |
| Shadow cue | J16 (Sector Ops, Guard AI) | the cue writes `shadowCue` records | the sense is absent until built | nothing |
| Answer to BRIEF Q1 | Michael | stubs or real moves | BRIEF A1 | R9's priority |

**Can start now, before J12:** R1, R2, R3 (fixtures carry V6-shaped fields; the schema is stable on
`origin/feature/level-validator-v6`), R4a, R4b and R5 (selftest fixture and `--routes code` on campusOps), and G1 on
Guard AI's side. **After J12:** R6, then R8's gate runs. **After G1:** R7. **After Q1:** R9 (or before the first gate
run, by Q1's second answer). Parallel: R1 / R2 / R3 at once; R4a after R3; R4b and R5 after R4a, in parallel.

## Tests
- Vitest for every pure module (R1, R2, R3, R6, R7): Node only, no browser, `npx vitest run tests/routeRun<Name>.test.ts`.
- The harness runs only on the laptop queue as alone requests, `E2E_GPU=1`, one step per section, never in
  `npm run e2e` or `affected-e2e` (BRIEF A10). A crash or timeout mid-run is not a pass.
- No changes to any e2e suite, `scripts/run-e2e.mjs`, `scripts/e2e-affected.mjs` or the laptop queue.

## Checker gate
- Plan: the J13 plan checker (BRIEF + PLAN; `docs/route-runs/PLAN-CHECK.md`).
- Per slice: one fresh Opus checker per batch (R1 + R3; R2; R4a; R4b + R5; R6 + R7; R8; R9), status `checker` on the
  head. Harness slices pass only with their laptop alone status green (`laptop-e2e/alone-<set>`); the PR's own
  `affected-e2e` is "no browser suites" (scripts and tests only). G1: two Opus checkers (`src/ai`) and its laptop e2e.
- The map gate (greybox exit, G330 / level-design 14): the map's REPORT.md says "Verdict: pass" (no dead stop, no
  unplannable run) on the head being exited, and its walk-card lines go onto Michael's card.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| none (no game code) | - | - | - | - |

## Walk items
- None for the tool itself. Each map's walk card gets its route-run lines (BRIEF "Output"); Marlow Yard's card gets the
  measured run time beside the 15-20 min target.

## Risks and open questions
- Wall time: campus S1-S5 is about 20-25 runs (25 encounter spaces, 147 links); at the sneak pace that is about 40 min
  of game time plus setup, likely 1-2 h on the laptop. Mitigation: one alone step per section (a train preempts one
  section at most), `--section` reruns, `stepHeadless` chunks.
- The robots may stop where a person would not (a corner the stick cuts badly). The stop class tells "no nav path" (the
  map) from "could not follow" (the robot or the collider); the checker reruns a stop and reads its screenshot before a
  map lead is asked to fix anything.
- Stubs hide whether a co-op or rare solo move works (BRIEF A1, Q1); every stub is listed, the map's co-op e2e covers the
  moves, R9 replaces the common ones.
- Page-side calming of a guard (BRIEF A2) uses Guard AI internals (`aware.set`, `resetAlarm`); a Guard AI change can
  break it. Mitigation: the selftest asserts a calmed guard is back on his route; G1 may add a test hook for it.
- Results from the laptop rely on `--publish` (BRIEF A9); if pushing from an alone step is refused, Test Runner copies
  the log's `ROUTE-RUN-REPORT` block.
- J12's resolver shape may differ from the table above; R6 adapts, the plan's other slices do not depend on it.
