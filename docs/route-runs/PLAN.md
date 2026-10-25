# route-runs: plan
Owner: Marlow Build. Status: current.

Lead: Night Shift | Marlow Build. Planner: Opus 5.5, master 2148ec969; plan-check fix round 1 against master 94e72b1cd
(#443 merged). Brief: `docs/route-runs/BRIEF.md`.
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
Read only (imported or driven, never edited): the graph helpers (`mergeGraphs`, `COOP_KINDS`, `LINK_KINDS`,
`isOneWay`, index and arcs) from `scripts/level-graph-lib.mjs` once J12 S0 is on master, through
`scripts/level-validate.mjs`'s re-exports until then; J12's `src/world/levelMeasure.ts` (`resolvePoints`) and
`scripts/level-measure.mjs --points`; `scripts/e2e-lib.mjs`, `scripts/e2e-net-lib.mjs`, `scripts/laptop-queue/serve.mjs`,
the map graphs, the built game (`dist/`). `docs/level-design.md` is touched by R8 only (one line each in section 14 (2)
and 15); `docs/systems/testing-tools.md` by R8 only (one new section). Changelog fragments are shared files (not
claimed).
**R8 goes last on the shared docs, with no fixed wait list.** Many branches touch the two docs R8 edits (claims-check
on 6bf1f95cb: 24 overlaps, all on `docs/level-design.md` and `docs/systems/testing-tools.md`; for example J12's docs
slices D-A / D-C, J20's PRs, coop-kit, light-realism, campus-greybox, char-shadow-meter, hud-guidance and map-ready),
and the list changes daily. So R8 reruns `claims-check` when it is cut, cuts from current origin/master, re-reads LD
14, LD 15 and the Training profile there and writes on top; an overlap that merges first is a conflict R8 fixes on its
own branch (one new section and two one-line edits), and the train handles the rest. R8 does not wait for big jobs
(light-realism could hold it for days). Test Runner may add the "Route-runs" section instead (the lead's call).
Guard AI's G1 (below) is claimed on Guard AI's own branch,
not here: `src/ai/detectionCause.ts` (new), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/game/gameState.ts` (the
debug overlay line), `tests/detectionCause.test.ts`.

**No game code changes in this job.** The robots are a harness (scripts and tests); nothing ships to players, so no
flag is needed. G1 is instrumentation with no behaviour change (host only, not on the wire); Guard AI decides whether
it wants a flag.

## Shape
```
graph files ─┐                         ┌─ laptop queue alone step, one per section (E2E_GPU=1)
points (R6) ─┼─> plan.mjs (R1) ─ runs ─┼─> route-run.mjs (R4a/R4b) ── 2 pages ?net=local&autostart=<map>&mode=<mode>
             │                         │      driver.mjs in page: steer (R3), stubs, objectives, dead stops (R3);
             │                         │      seams: steps.mjs (R5), causes.mjs (R7: G1 record, else inferred),
             │                         │      course.mjs (R4c: drill gates, restarts), coop.mjs (R9)
             │                         └─> run log JSON ─> report.mjs (R2) ─> route-run.json + REPORT.md + walk-card lines
             └─ --publish (branch route-run-results) ─> --merge on the desktop ─> <graph folder>/route-run/
```

## Slices
**R1 Route planner (Opus).** Pure, Babylon-free: `scripts/route-run/plan.mjs`. Input: the map's graph files (merged with
`mergeGraphs`, same file order rules as the validator; imported from `scripts/level-graph-lib.mjs` when J12 S0 is on
master, else `scripts/level-validate.mjs`) and a points table (R6 shape, the J12 `resolvePoints` table: per space
`centre` / `floorY` / `boxes`, per merged link index `at`). Output: `runs[]`, each `{ id, section, kind, covers: [[space,
kind]], steps[] }`, steps `walk { to, space, link }`, `link { index, kind, from, to, at, action, limit_s }` (action
`door`, `ladder`, `drop`, ... or `stub` with `hold_s`), `objective { space }`, `split { id, a: steps[], b: steps[],
rejoin }`. Rules (BRIEF "Which routes"): per section, for each kind in `shadow`, `high`, `loud`, the (encounter space,
kind) pairs it declares; for each pair the cheapest path `entry` -> in through a link of that kind -> objective (when
the section has one) -> `exit` (Dijkstra on `time_s`, else `length` / `split_speed_mps`, links of other kinds x3, `spine`
x1; `one_way`, `drop` direction honoured; two players, so co-op and `bolted` links are normal ways); then a greedy set
cover keeps the fewest runs that cover every pair, and adds a run for any route kind a section's links declare that no
kept run walks (BRIEF "Which routes": a kind ending at a connector); identical step lists merge. Training
(`meta.mode: training`): one run `start` -> `exfil` (its steps cut per section for the laptop steps), plus, for each
section after `meta.taught_by` with 2+ routes, the campaign coverage above on that section (BRIEF "Which routes"; J12
BRIEF A9). A training graph with no `taught_by` gives the one run and a plan note "side routes not run". A run through a
space with no `area` or a link with no point is returned as `unplannable` with the reason (BRIEF A8). `--dry-run` in
R4a prints this plan.
- Files: `scripts/route-run/plan.mjs`, `tests/routeRunPlan.test.ts`, `tests/fixtures/route-run/` (a two-section
  campaign graph with areas, points, a split and a co-op gate; a training graph of three sections with `taught_by` on
  the second and a late third section that keeps a side route: one guarded encounter space with `shadow` and `loud`
  approaches and a `high` route to a connector, like J14's A8; a copy of the V6 campus S1 graph,
  `origin/feature/level-validator-v6:docs/sector-redesign/graph/campusOps-S1.json`, refreshed from master once J12 S10
  re-measures it). Est. lines: 750.
- Checks: `npx vitest run tests/routeRunPlan.test.ts`; `npm run typecheck:fast` (no TS touched, sanity only).
- Done looks like: on the fixtures every declared (encounter space, kind) pair and every section route kind is covered
  by exactly the runs printed; the campus S1 fixture gives at most one run per kind more than the minimum; a removed
  `area` gives `unplannable` naming the space; the training fixture gives the start-to-exfil run plus runs covering the
  late section's three kinds, none in the first two sections; the same fixture without `taught_by` gives the one run
  and the note.

**R2 Report (Sonnet, from an Opus brief).** Pure: `scripts/route-run/report.mjs`. Run log (R4a's JSON) -> `route-run.json`
(the stable shape below) and `REPORT.md` (plain English: a summary table per section and route, then per run the
detections, notices, dead stops and stubs, then the walk-card snippet), the pass rule (Q7: verdict `pass` when no run
has a dead stop and no run is `unplannable`; detections never fail, however many, and neither does a push past after
a repeat detection or a drill stub after two timer retries: BRIEF A5, A14), the Marlow time line (M9: total, walk,
holds against 900-1200 s, report only, listing every drill stub, co-op stub, restart by cause, push past and step "not
made at sneak pace"), the plan notes ("side routes not
run", 2 players only), and `merge(parts[])` for the per-section step outputs.
- JSON shape: `{ tool: "route-run 1", map, mode, version, sha, date, players, pace, detections: "forgive" | "keep",
  graphs: [file], geom, routes: "graph" | "code", notes: [text], runs: [{ id, section, kind, covers, verdict: "pass" |
  "stuck" | "unplannable", why, time_s | null, walked_m, guards: { spawned, alive }, deadStops: [{ t, robot, at, space,
  link, class: "no-nav-path" | "could-not-follow" | "step-timeout" | "locked" | "restart-loop", shot }], detections: [{
  t, robot, guard: { id, kind, role, zone }, sense, inferred, level, restart: "set" | "retry" | null, guardAt, robotAt,
  space, inputs }], notices: [same], stubs: [{ link, kind, hold_s, why }], drills: [{ id, player, verb, hold_s, why:
  "gate" | "timer" }], restarts: [{ t, space, set, restart: "set" | "retry" | "timer" | "other", detection: <index> |
  null, then: "rejoined" | "pushed-past" | "drill-stub" | "dead-stop" }] }], summary: { runs, stuck, unplannable,
  detections, notices, stubbed, drillStubs, restarts, pushedPast, notAtSneakPace, walkedLinks, verdict, runTime_s } }`.
  A seen restart is both a detection line (with `restart: set | retry`) and a restart line pointing at it; a timer or
  other restart is a restart line only.
- Walk-card snippet, one line per route: "S1 shadow route (gatehouse, car park): 2:31, never stuck. Seen once: the gate
  officer saw you at the barrier (0:42, lit, 9 m). Noticed twice: the smoker heard you on the gravel (1:10)." A course
  line with a push past: "A2 Carriage Shed: 3:05, never stuck. Seen twice by the shunter at the pit edge (1:12, 1:40);
  seen again at the pit edge, robot pushed past."
- Files: `scripts/route-run/report.mjs`, `tests/routeRunReport.test.ts`. Est. lines: 650.
- Checks: `npx vitest run tests/routeRunReport.test.ts`.
- Done looks like: a fixture log gives the JSON above byte-stable, a REPORT.md with no jargon or hashes in the
  walk-card lines, `verdict: fail` for one stuck run, `pass` for detections only, a merged report equal to the one-run
  report; a course fixture log with two drill stubs and one retry gives an M9 line naming both drills and the retry;
  a course log with two seen restarts from one space (a push past) gives `pass`, a valid time marked "includes 1
  push-past" and the walk-card line "seen again at <place>, robot pushed past"; a log with two timer retries on one
  step gives `pass`, no detection for them, and an M9 line listing the step "not made at sneak pace"; a log with a
  `restart-loop` stop (two `other` restarts) gives `fail`.

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
[--dry-run] [--selftest [<fixture>]]`, `--merge <map> <sha> --out <dir>` (no browser). One page: boot (`e2e-lib`
`launch`, autostart params from the graph's `meta.map` / `meta.mode`), damage off, section setup (Sector Ops /
campaign: the section's checkpoint through `window.__sector`, the earlier sections passed by the connector cycle as
`e2e-sectorops` part 6 "campus ops (S1, S2)" does; course: the bay index of the section's first set read from the course
data in the page (its 1-based position in `CourseDef.bays`, matched by id; J14 numbers 18 steps, so never "set A<n> is
bay n"), passed as the host session's `courseBay` as `scripts/e2e-ctcourse.mjs:304` does), the guards check at each
section start (BRIEF A15), `restartSection` between runs (guards back on their fixed patrols, calm), then the run: the driver steps the game in 0.05 s chunks in the page,
steering with R3, opening doors with the pad (A near a shut door on the path), using objectives (A held), holding and
placing at every stub, logging dead stops (class from a nav `findPath` probe; a screenshot; recovery past the link),
polling guard levels every 0.1 s game time for detections, wrapping `enemyMgr.hear` in the page to see noises, reading
camera alarms from `window.__ctdev.debug()`, and the forgive step (BRIEF A2). Writes the run log; `--publish` commits
it to branch `route-run-results` with git plumbing (`request.mjs` pattern: temp index, no checkout, retry on a lost
push race); the JSON is also printed between `ROUTE-RUN-REPORT` markers. `--routes code` walks the map's own
`SectorRoute` lists (`src/game/sectors.ts:73`, `climbs` legs stubbed) for an early number before J12: its report
header says "code routes, not a gate run".
- **Seams, so later slices never share a file.** R4a ships three small modules the driver calls: `steps.mjs` (a table
  from link kind to step; every kind `stub` here; R5 owns it next, then R9). Each step is a Node-side async call,
  `step(ctx, link)`, where `ctx` carries both pages (`host`, `client`; `client` null at `--players 1`), the pads, the
  host clock and the limit, so R9's leg-up (which drives host and client from Node, as `e2e-ctcourse` does) needs no
  driver change; `causes.mjs` (`readCauses(since)`: here
  the inference reader on R3's classifier; R7 owns it next), `course.mjs` (`onPoll`, `onLockedDoor`: no-ops here, so a
  locked course door is a `locked` stop; R4c owns it next). A later slice that needs a driver change sends it to the
  lead as an R4b fix, not an edit of its own.
- **Selftest fixtures carry their own expectations.** `--selftest [<fixture>]` runs a fixture graph whose `expect`
  block names each link's outcome (walked / stub / a stop class) and each expected log line; default
  `tests/fixtures/route-run/selftest.graph.json`. Each later slice adds its own fixture file and never edits another's.
  R4a's: campusOps S1 (R1's copy) plus one link drawn through a solid wall: the walled link gives a `no-nav-path` stop
  inside 8 s + 1 s and a known clear door leg passes.
- Files: `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/publish.mjs`,
  `scripts/route-run/steps.mjs`, `scripts/route-run/causes.mjs`, `scripts/route-run/course.mjs` (the three seams),
  `tests/fixtures/route-run/selftest.graph.json`. Est. lines: 1,200.
- Checks: `npm run typecheck:fast`; the R1-R3 vitest files; on the laptop queue (`E2E_GPU=1`):
  `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --alone --step "serve scripts/route-run.mjs
  http://127.0.0.1:4189/ --selftest --players 1" --set route-run-selftest --requester "Night Shift | Marlow Build"`,
  then one `--routes code --section S1 --players 1` run on campusOps. Verdict: `laptop-e2e/alone-route-run-selftest`.
- Done looks like: the selftest passes on the laptop; the campus S1 code-route run writes a REPORT.md a person can read,
  every number in game seconds, its guards line shows every spawned guard alive, and a second run on the same head
  gives the same detections at the same times (fixed patrols, VISION 4 rule 8).

**R4b The robot pair (Opus).** Two pages on `?net=local` (`e2e-net-lib` `hostAndJoin` / `waitSim` / `setSimPages`,
as `e2e-ctcourse`): the leader on the host, the follower on the client steered to R3's trail point, both stepped on the
host clock; splits (leg a leader, leg b follower, both wait at the rejoin); co-op stubs (both at the near `at` point,
crouched, hold, then both placed past it; `allowTeleport` on the host's remote as `moveClient` does); detections and
notices for either robot; `--players 2` the default for every map (BRIEF A6). The only slice after R4a that edits
`route-run.mjs` and `driver.mjs`.
- Files: `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/pair.mjs`,
  `tests/fixtures/route-run/selftest-pair.graph.json`. Est. lines: 600.
- Checks: R1-R3 vitest; laptop alone runs `--selftest selftest-pair.graph.json --players 2` and `--routes code
  --section S1`.
- Done looks like: both robots are seen in the log (a guard rises on the follower at least once on S1, or the report
  says neither was seen); the fixture's split is walked by both legs at once; every co-op link is listed as a stub with
  its time.

**R4c Course mode: drill gates and restarts (Opus).** Fills R4a's `course.mjs` seam for Marlow Yard (BRIEF "Marlow Yard
drill gates", "Restarts and retries", A13, A14): at a door in `window.__course.debug().locks`, the drill hold, then each
drill still open for either player (`state.nextDrill(p)`, `count` times) through `window.__course.verb(p, verb)`, or
`state.setFlag(name)` for a `flag:<name>` verb, each logged as a drill stub; a door still locked 5 s later is a
`locked` stop. On every poll: a rise of `window.__course.restarts`, or a robot moved over 3 m with no harness
placement, is a restart or retry; the path is re-joined at the nearest step and the cause is named (BRIEF A14):
**seen** (a guard alert on a robot or a camera alarm in the 2 s of game time before it, or J14's recorded cause) is a
detection with `restart: set | retry`; the second seen one from the same space turns the set's spotted / retry rule
off (master: the bay's `spotFail`; after J14: its retry rule) and places the robots past the link, a push past, never
a dead stop. **Timer** (no guard or camera in the window, a timed step in the course data or J14's recorded cause) is
a `restart: timer` line, not a detection; the second from the same step completes its open drills as drill stubs
(`why: timer`). **Other** is a `restart: other` line; the second from the same space is the only `restart-loop` dead
stop, then the push past. Pure parts (open drills to actions, the A13 hold choice, the cause classifier, the per-place
counts and what follows) are unit tested.
- Files: `scripts/route-run/course.mjs`, `tests/routeRunCourse.test.ts`,
  `tests/fixtures/route-run/selftest-course.graph.json` (master's yard, sets A1 Gate and A2 Carriage Shed). Est. lines:
  450.
- Not here: campaign strict-rule restarts (G290: a break restarts the section; built by J7 / J22). Only course mode
  has this watcher. Tallow Wharf (J23) is the first campaign user: its lead generalises the watcher or turns strict
  rules off in the page before its gate run (BRIEF Limits).
- Checks: `npx vitest run tests/routeRunCourse.test.ts`; laptop alone `--selftest selftest-course.graph.json`
  (`--players 1` before R4b lands: the host's `verb(p, ...)` ticks either player's drills; `--players 2` after).
- Done looks like: in the fixture A1's exit door is cleared by drill stubs, each listed by id and hold, none counted as
  walked; in A2 the harness raises the shunter to alert through the page once: one `restart: set` detection and the
  run walks on to the exit; raised twice from the same space: two `restart: set` detections, `spotFail` off, a push
  past, the run reaches the exit without looping and its verdict is `pass`. Unit tests (no page): two timer restarts on
  one step give two `restart: timer` lines, no detection and drill stubs with `why: timer`; two `other` restarts from one
  space give one `restart-loop` stop.

**R5 Link steps (Opus).** `scripts/route-run/steps.mjs` (R4a's seam), called by the driver for `link` steps, pad only,
from the traversal helpers' patterns (`scripts/e2e-traverse.mjs`): `ladder` (walk into the foot, climb, step off at the
top; down from the top), `drop` (walk off the edge; a hang-drop where the edge needs it), `window` / `hatch` (the vault
or climb-through the game offers), `duct` (crouch-crawl), `fire_stair` / `open_stair` (walked), `rappel`. Any other
solo kind (`ledge`, `pipe`, `wall_jump`, `split_jump`) stays a stub in this slice, listed in the report. Each step has
its R3 limit.
- Files: `scripts/route-run/steps.mjs`, `tests/fixtures/route-run/selftest-steps.graph.json` (one ladder and one drop
  on campus S1, and one ladder link where the map has none). No driver edit. Est. lines: 700.
- Checks: laptop alone `--selftest selftest-steps.graph.json` and a code-route run of S1 and S2.
- Done looks like: the campus S1 / S2 ladders and drops are walked, not stubbed; the fixture's missing ladder gives a
  `step-timeout` stop at its limit.

**R6 Points from the V6 port (Sonnet; after J12).** `scripts/route-run/points.mjs`: the points table R1 reads, from
J12's one resolver (lead's decision, 2026-10-25): `resolvePoints(graph, nav, opts)` exported from
`src/world/levelMeasure.ts` (J12 S1), called through Vite's SSR loader as `scripts/level-measure.mjs` does, or the
same table written by `node scripts/level-measure.mjs <graphs> --points <out.json>` (J12 S2) in the laptop step before
the run. Links are keyed by their merged index (the order `mergeGraphs` gives under the validator's file order rules),
and the table carries the graphs' `geom` (the map's light + nav hash, not a graph hash). The harness refuses a table
whose `geom` or link count differs from the graph it plans, or where any merged index's `from` / `to` / `kind` differs
from the merged graph's link at that index, so a re-ordered or edited graph cannot shift a point onto the wrong link.
This answers J12 PLAN section 8's open link-`id` question: route-runs needs no link `id`. Fallbacks, inside R6 only (no other slice
changes): if J12 ships only its lower exports (`spaceCells`, `linkPoint`, `linkPath`, `MEASURE_DEF`), R6 builds the
same table from them; if it ships none, declared `at`, else the middle of the facing edges of the two `area`s snapped
to the nearest walkable nav cell in the page (`nav.nearestWalkable`), marked `approx` in the report.
- Files: `scripts/route-run/points.mjs`, `tests/routeRunPoints.test.ts`. Est. lines: 250.
- Checks: `npx vitest run tests/routeRunPoints.test.ts`; one laptop alone run of campus S1 from the graph.
- Done looks like: campus S1 runs from its graph (not code routes), the report names graph spaces and links, and a
  table with a stale `geom`, or with two links swapped, is refused with a plain message.

**R7 Cause record reader (Sonnet; after G1).** `scripts/route-run/causes.mjs` (R4a's seam) reads Guard AI's cause ring
when it exists (`enemyMgr.causes`, feature-detected) and maps each record to a detection or notice line; without it the
R3 inference stays. Records and inferences never mix in one run (the report header says which).
- Files: `scripts/route-run/causes.mjs`, `tests/routeRunCauses.test.ts`. No driver edit. Est. lines: 250.
- Checks: vitest; one laptop alone run of campus S1 on a head with G1 merged.
- Done looks like: no `inferred` senses on that run; a sighting names light, distance and stance.

**R8 Docs and the first gate runs (Sonnet).** Runs last; when cut, reruns `claims-check`, cuts from current
origin/master and re-reads LD 14, LD 15 and the Training profile there; any overlap that lands first is a conflict R8
fixes on its branch ("Claims"). `docs/level-design.md` 14 (2) and 15: Q7's pass rule only, one line each, e.g. "A map passes its
route-runs when no run has a dead stop; the times the robots were seen go on the walk card (Michael, 2026-10-25 ~16:40,
Q7). What a dead stop is: `docs/systems/testing-tools.md` "Route-runs"." Q7 is Michael's approval for that sentence
only: the A4 tolerances, the drill and restart rules and the co-op stub policy (A1, until Q1 is answered) are not
written into the standard. `docs/systems/testing-tools.md` gets a "Route-runs" section: command, laptop request,
outputs, `--publish` / `--merge`, the dead-stop classes with the A4 tolerances as the tool's named constants (file and
line in `progress.mjs`), drill stubs and restarts (A13, A14), stubs (A1). Then the first runs: a Marlow Yard baseline
on the yard as built (J12 S9's `docs/marlow-final/graph/ctcourse.json`; report only, not a gate run: the yard is being
rebuilt to J14's re-plan); campus S1-S5 when J17's greybox v2 exits. Marlow Yard's gate run belongs to J14: its lead
requests it at the re-planned yard's greybox exit, from J14's graph with `meta.taught_by` (BRIEF "First users"). Each
report goes to the map lead for its docs; this job keeps a copy of each first run in `docs/route-runs/runs/<map>/`.
- Files: `docs/level-design.md`, `docs/systems/testing-tools.md`, `docs/route-runs/runs/**`. Est. lines: 140 (docs).
- Checks: CI `check` (doc lint); the laptop alone runs.
- Done looks like: LD 14 (2) and 15 say what passing means and point to "Route-runs" for the rest, with no tool number
  in the standard; Marlow's baseline REPORT.md gives a run time against 15-20 min and lists its drill stubs; campus
  gets its first graph-driven REPORT.md.

**R9 Real co-op moves (Opus; after Q1, R4b and R5).** Replace stubs with real two-robot moves where the game's helpers
already script them: `coop_boost` and `human_ladder` with the leg-up (`scripts/e2e-ctcourse.mjs:157-178`: crouch, RB
offer, RB take, hang, pull up), then `team_pull`, `shutter` and `pair_gate` as their test helpers exist
(`e2e-sectorops` parts 3-5). Takes `steps.mjs` over from R5 (the co-op kinds' entries point at `coop.mjs`). Q1's second
answer moves R9 ahead of the first gate run and adds every kind.
- Files: `scripts/route-run/coop.mjs`, `scripts/route-run/steps.mjs`,
  `tests/fixtures/route-run/selftest-coop.graph.json`. Est. lines: 500.
- Checks: laptop alone `--selftest selftest-coop.graph.json --players 2` (one boost), a campus S5 run (rope, team door).
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
| V6 positions on master | J12 validator port (feature/validator-port, Marlow) | (1) master's schema accepts `area`, `vantage.at`, link `at`, `measured` and `meta.measured.geom` on every profile, `training` included (J12 D-A); (2) the graph helpers `mergeGraphs`, `COOP_KINDS`, `LINK_KINDS`, `isOneWay`, index and arcs from `scripts/level-graph-lib.mjs` (J12 S0), still re-exported by `scripts/level-validate.mjs`; (3) one point resolver both tools use (lead's decision, J12 PLAN being fixed to promise it): `resolvePoints(graph, nav, opts)` exported from `src/world/levelMeasure.ts` (J12 S1, built on its `spaceCells`, `linkPoint`, `linkPath`, `MEASURE_DEF`), which R6 calls through Vite's SSR loader (the `level-measure.mjs` pattern), and the same table from `node scripts/level-measure.mjs <graphs> --points <out.json>` (J12 S2): per space `{ id, section, storey, floorY, boxes, centre, cells }`, per merged link index `{ from, to, kind, route, at, atFrom: declared / edge / none, gaps, measured }`, plus `geom`. Links keyed by merged index, so no link `id` is needed (answers J12 PLAN section 8) | R6 builds the table from J12's lower exports; with none, its own approximate points (marked `approx`) | R6, R8 gate runs |
| Late-section field | J12 S4 (`meta.taught_by`, `training.mjs`) and J14 (writes `taught_by` / `teach` into the re-planned graph) | `meta.taught_by` on the training graph; `teach` on the link a set teaches (A13's hold) | one start-to-exfil run, "side routes not run"; A13's 10 s hold | Marlow gate run |
| Graphs with `area` on every space a route passes | map leads: Sector Ops (J17 campus), Marlow (ctcourse, J12 S9 / J14), Campaign (J23 Tallow) | V6 needs `area` only on encounter and split spaces (J12 PLAN section 8: S9 and S10 graphs already have them on every space) | none: such runs are `unplannable` (BRIEF A8) | R8 gate runs |
| Cause record | Guard AI G1 (conformance G C5) | above | inference, marked | R7 only |
| Shadow cue | J16 (Sector Ops, Guard AI) | the cue writes `shadowCue` records | the sense is absent until built | nothing |
| Answer to BRIEF Q1 | Michael | stubs or real moves | BRIEF A1 | R9's priority |

**Can start now, before J12:** R1, R2, R3 (fixtures carry V6-shaped fields; the schema is stable on
`origin/feature/level-validator-v6`), R4a, then R4b, R4c and R5 (selftest fixtures and `--routes code` on campusOps),
and G1 on Guard AI's side. Why before J12 although FOLDED-PLAN lists J13 "Depends on J12": what J13 needs from J12 is
positions on master and the resolver, used only by R6 and the gate runs; R1-R5 build against fixtures and code routes
and import only helpers master already exports, so no gate run happens before J12. **After J12:** R6, then R8's gate
runs. **After G1:** R7. **After Q1, R4b and R5:** R9 (before the first gate run, by Q1's second answer).
**Order and file ownership** (RULES "A job": parallel agents never edit the same file): R1 / R2 / R3 at once; R4a
after R3; then R4b, R4c and R5 in parallel (R4b alone edits `route-run.mjs` and `driver.mjs`; R4c owns `course.mjs`;
R5 owns `steps.mjs`); R7 owns only `causes.mjs`, so it can run beside any of them once G1 lands; R9 after R5 (it takes
`steps.mjs` over) and R4b; R6 owns only `points.mjs`; R8 last.

## Tests
- Vitest for every pure module (R1, R2, R3, R4c, R6, R7): Node only, no browser,
  `npx vitest run tests/routeRun<Name>.test.ts`.
- The harness runs only on the laptop queue as alone requests, `E2E_GPU=1`, one step per section, never in
  `npm run e2e` or `affected-e2e` (BRIEF A10). A crash or timeout mid-run is not a pass.
- No changes to any e2e suite, `scripts/run-e2e.mjs`, `scripts/e2e-affected.mjs` or the laptop queue.

## Checker gate
- Plan: the J13 plan checker (BRIEF + PLAN; `docs/route-runs/PLAN-CHECK.md`).
- Per slice: one fresh Opus checker per batch (R1 + R3; R2; R4a; R4b + R4c + R5; R6 + R7; R8; R9), status `checker` on
  the head. Harness slices pass only with their laptop alone status green (`laptop-e2e/alone-<set>`); the PR's own
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
- A robot does not wait out a patrol, so on Marlow Yard it can be seen twice where a person would wait. That is a
  detection and a push past for the walk card, never a stop (BRIEF A14, Q7); the map lead reads the push-past lines with
  Michael's walk, not as a failure. A cause misread (a seen restart taken for `other`) could fail a run wrongly: the
  2 s window is a constant, and the checker reruns any `restart-loop` stop and reads its screenshot before a map lead is
  asked to fix anything.
- Stubs hide whether a co-op or rare solo move works (BRIEF A1, Q1); every stub is listed, the map's co-op e2e covers the
  moves, R9 replaces the common ones. Drill stubs hide whether a Marlow drill can be done (BRIEF A13); `e2e-ctcourse`
  plays the drills, and the M9 line lists every drill stub.
- Page-side calming of a guard (BRIEF A2) and turning off a set's spotted rule (A14) use game internals (`aware.set`,
  `resetAlarm`, the bay's `spotFail`); a Guard AI or J14 change can break them. Mitigation: the selftests assert a
  calmed guard is back on his route and a set's rule is off; G1 or J14 may add a test hook.
- J14 rebuilds Marlow Yard's sets (18 stations, retries in place); R4c's restart watcher reads J14's retry rule once it
  is built. Until then it covers master's `spotFail` restart only.
- Results from the laptop rely on `--publish` (BRIEF A9); if pushing from an alone step is refused, Test Runner copies
  the log's `ROUTE-RUN-REPORT` block.
- J12's resolver ships later than R1-R5: R6 holds the only adapter (fallbacks above), the other slices do not depend on
  it.
