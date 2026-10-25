# route-runs: brief
Owner: Marlow Build. Status: current.

Lead: Night Shift | Marlow Build. Started: 2026-10-25 ~17:30 (Opus planner). Base: master 2148ec969. Job: FOLDED-PLAN
J13 (ROADMAP Now row 14, "J12 validator port + J13 route-runs (pass = never stuck, Q7)"); conformance rows Marlow H8,
V3, M9 and Guard AI C5 (`docs/conformance-marlow/CONFORMANCE.md`, `docs/conformance-guard-ai/parts/C-perception.md`).
Replaces the stale feature/route-runs (a 4-line STATE only).

## Michael said
- 2026-10-23 ~00:10 (overnight job marlow-final, G272): "i would like the marlow yard audit to include finalising the
  map, finishing touches, making sure it flows well, not just simple square rooms with random walls/pipes/ladders in
  random places for the sake of using. areas should be well designed training areas designed to replicate real map coop
  scenarios (all the cool actions that players can do together). The yard must focus heavily on coop gameplay,
  including those discussed recently eg. timed isolation of lights, cameras, locks, accessing security room to disable
  cameras, timed jammer exercises, hacking devices in sync, and any other coop "wow thats cool" experience. Ask
  questions if needed."
- 2026-10-25 ~09:05 (ROADMAP Decided "Realistic light and played flow", G329 / G330): "How do you know campus design
  gameplay flow is good, and that there is a realistic amount of light? On the current build the s1 car park is still
  very dark which is unrealistic, car parks are generally well lit"
- 2026-10-25 ~16:40 (FOLDED-PLAN Q5, ROADMAP Decided): "all are retries in marlow yard, as its a training exercise."
- 2026-10-25 ~16:50 (FOLDED-PLAN Q24, ROADMAP Decided): "Close all side routes, force all sections. Only keep a side
  route when training against enemies later in the training, same design rules as a campaign mission area"

## Michael picked
- 2026-10-23 ~00:10 (G272) Q: Marlow Yard run length -> picked: one co-op run "15-20 min".
- 2026-10-24 ~22:00 (G289 (2), native multiple choice on PR #346) Q: a measured validator pass at greybox exit ->
  picked: "Yes, require it".
- 2026-10-25 ~09:05 (G330) Q: how to know the played flow is good -> picked: "Bot route-runs + your walk" (recorded in
  ROADMAP Decided as: at greybox exit a scripted run walks every declared route (dark / high / loud) against live guards, logging time,
  detections and dead stops, then a 10-min walk card for Michael).
- 2026-10-25 ~16:40 (FOLDED-PLAN Q7) Q: "When does a robot test run of a map pass? Before your walk, a robot walks every
  route past live guards." -> picked: "Never stuck (Recommended)" (option text: "Pass = it never gets stuck; the times
  it was seen go on your walk card").
- 2026-10-25 ~16:50 (FOLDED-PLAN Q14) Q: "Can a guard notice your cast shadow?" -> picked: "A faint cue" (Guard AI
  C3's wording: a moving shadow in his focus cone raises suspicion only, never detection; built by J16).
- 2026-10-25 ~17:00: folded plan signed off, "Sign off, start (Recommended)".

## Goal
At greybox exit, one command runs a robot pair through every declared route of a map against its live guards and
writes a plain report: per route the time, every time a guard noticed or saw the robots and why (who, by sight,
hearing or the shadow cue, where), and every dead stop. The map passes when the robots never get stuck; the times they
were seen go on Michael's walk card. The same run measures Marlow Yard's run time against the 15-20 min target.

## Scope
- **What runs.** A Playwright harness (`scripts/route-run.mjs`) boots the map headless on the built game
  (`?autostart=<map>&mode=<mode>`, plus `net=local` for the robot pair), plans its runs from the map's connectivity
  graph (`docs/level-validator/graph-schema.md`) and walks them with the real player controller through the virtual
  pad (`window.__pad`, as every e2e suite does): stick and buttons only, no teleport inside a timed walk, except at the
  stubs below. Guards are live, on their fixed patrols; the robots cannot be hurt (`target.damageMul = 0`) and never
  fight.
- **Which routes.** Every declared route of every section: for each encounter space, each route kind it declares
  (`shadow`, `high`, `loud`; G330 says "dark", the schema calls it `shadow`) is entered once by some run. The planner
  picks the fewest runs that cover every (space, kind) approach, each run from the section's `entry` through its
  objective to its `exit`, preferring links of the run's kind; every route kind a section's links declare is walked by
  at least one run, also where it ends at a connector (J14's A8 loud route is the public stair to the gallery). A
  declared split's two legs are one route (as J12 counts them), walked at once by the pair. Training maps (Marlow Yard,
  G292) get one run `start` to `exfil`, plus the same coverage as a campaign section for every section after
  `meta.taught_by` that keeps a side route: Q24 keeps side routes only "when training against enemies later in the
  training, same design rules as a campaign mission area" (J12 BRIEF A9: the late sections are those after
  `taught_by`, the section where the last kit move is taught alone; J12 S4 `training.mjs` checks them; J14 keeps them
  only in A8 Strongroom). A training graph with no `meta.taught_by` (a validator ERR once J12 S4 lands) gets the one
  run only, and its report says the side routes were not run: never a gate run. Positions come from the V6 graph
  fields: space `area` and link `at` (J12, below).
- **Pace.** Crouched sneak at the graph's stealth pace (`split_speed_mps`, 1.3 m/s in `docs/design/metrics.json`) on
  every route: the pace a careful player walks and the one the graph's split times assume (A3).
- **Time.** Simulated game seconds from the run's first step to its exit (`loop.stepHeadless`), so a loaded laptop does
  not change the number.
- **Detections.** Logged per run: every guard that rises to `alert` on a robot is a **detection** (the game's own
  "detected" / "Spotted" count, `src/game/gameState.ts:2093-2097`, `src/game/sectors.ts:850`); every rise to
  `suspicious` or `investigating` is a **notice** (report only). Each line holds: when (run time), which robot, who
  (guard id, kind, role and zone from the map data), the sense (sight, close range, hearing, shadow cue, camera, told by
  radio or shout, body found, smell for dogs), where (guard and robot positions and the graph space the robot was in)
  and, for sight, the inputs (distance, angle, light, stance, speed). The record comes from Guard AI's per-detection
  cause record (G C5, built by Guard AI); until it lands the harness infers the sense and marks it "inferred" (PLAN R7).
  Cameras: a camera alarm counts as a detection with sense "camera" and the camera id. A shadow cue (Q14) can only
  ever be a notice; it appears once J16 builds it.
- **Dead stops.** A robot is **stuck** when its progress along the planned path grows by less than 0.5 m in 8 s of game
  time while it is walking (A4), or a link step (a door, ladder, drop) runs past its time limit, or a door on the path
  stays locked, or (course mode) the game sends the pair back twice from one place (A14). Each stop is logged with its
  place, the graph link, its class (no nav path / could not follow / step timed out / locked / restart loop) and a
  screenshot; the harness then moves the robot past that link (logged as a recovery) so one
  run reports every stop on the route. A run with any stop fails.
- **Pass (Q7).** A map passes its route-runs when no run has a dead stop. Detections never fail it; their times and
  causes go on Michael's walk card. Nothing else is a pass rule (not the time, not the number of detections); a run
  that could not be planned or set up (A8, A15) has not passed, because it was not walked.
- **Two players.** Campaign and Marlow Yard maps are exactly two players (G2, G292, G308); Sector Ops runs at 2 (its
  signed-off counts are for two, ROADMAP Decided ~11:55 (2)). Two pages on `?net=local`, host and client, as
  `e2e-ctcourse` does. The **leader** (host) walks the run; the **follower** (client) walks the same path about 2 m
  behind, so the guards see two bodies. On a split (`split:<id>:a` / `:b` tags) the leader walks leg a and the follower
  leg b at the same time; both wait at the rejoin space.
- **Co-op links (boost, human ladder, pull-up, hang, throw, shutter, team door, rope).** Version 1 stubs them: both
  robots walk to the link's near side (its `at` point), stand there crouched in the live guard field for the link's
  time (`measured.time_s`, else the declared `time_s`, else the kit move's sheet time), then both are placed on its far
  side. A stub is logged by link with its time and is never counted as walked. Why that is honest: (1) the guards see
  the pair standing at the move for its whole length, so a guard who would see a boost sees them; (2) a stub hides no
  stop on any walked link and the report counts walked and stubbed links apart; (3) whether each co-op move works is
  already its own acceptance test (level-design 15, "each co-op route works for host and client"; the map's co-op e2e
  suites walk them with real buttons). Real co-op moves replace stubs where the game's test helpers already script them
  (the leg-up, `scripts/e2e-ctcourse.mjs:157-178`) in PLAN R9. This reading of "walks every declared route" is Q1.
- **Solo off-nav links** (ladder, drop, window, hatch, ledge, pipe, duct, wall jump, split jump, rappel) are walked by
  link steps on the pad (PLAN R5); a kind with no step yet is stubbed like a co-op link and listed.
- **Objectives.** At an objective space the leader uses the objective with the pad (A held at it) for its real duration;
  the time counts.
- **Marlow Yard drill gates (course mode).** A course door stays locked until its set's drills are done
  (`CourseState.locked`, applied in `src/game/modes/courseMode.ts:1039`); a drill is done only by its verb
  (`CourseState.tick`, `src/game/course/courseState.ts:501`) or its `flag:` verb. Drills the robots do on the way (the
  game's own verb feed ticks them) count as walked. When the path reaches a door still in
  `window.__course.debug().locks`, both robots stand at the door's near side, crouched in the live guard field, for the
  drill hold (A13), then the harness completes each drill still open for either player (`state.nextDrill(p)`, `count`
  times) through the host's own hook `window.__course.verb(p, drill.verb)`, or `window.__course.state.setFlag(name)`
  for a `flag:<name>` verb. Each is logged as a **drill stub** with its drill id, player and hold time, and never
  counted as walked. A door still locked 5 s after that is a `locked` dead stop. Set A<n> is bay n: a section's run
  starts there through the host session's `courseBay`, as `scripts/e2e-ctcourse.mjs:304` does.
- **Restarts and retries (course mode).** On master a set with `spotFail` restarts from its start when one of its squad
  is alerted (`courseMode.ts:593-596`; set A2 Carriage Shed); after J14 every mistake is a retry of that station or step
  in place, and in set A8 the guards first react as on a mission (marlow-replan `REPLAN.md` "If it goes wrong" column
  and its BRIEF A1; Q5). The harness sees each one (`window.__course.restarts` going up, or a robot moved more than 3 m between two polls
  without a harness placement), logs it as a detection with `restart: set | retry`, re-joins its planned path at the
  step nearest where the game put the robots and walks on; the clock keeps running. The game's restart or retry is the
  forgive step there (A2 does not also calm the guards). A second restart from the same graph space in one run is a
  `restart-loop` dead stop: logged with a screenshot, then the harness turns that set's spotted rule off in the page for
  the rest of the set (master: the bay's `spotFail`; after J14: its retry rule, read from J14's build), logs that, and
  places the robots past the link where they were seen (a recovery). A run never loops (A14).
- **Output.** Per map a JSON report and a plain Markdown report saved with the map's docs, beside its graph:
  `<graph folder>/route-run/route-run.json` and `REPORT.md` (campus: `docs/sector-redesign/graph/route-run/`), each
  stamped with the game version, the commit, the graph files and their V6 `geom` hash. `REPORT.md` ends with a
  **walk-card snippet**: one plain line per route (route, time, "never stuck" or the stops, each time seen with who and
  why), ready to paste into `docs/templates/walk-card.md`'s items. The map lead commits the report at greybox exit.
- **Marlow Yard run time (M9).** The training run reports its total: walked time + co-op holds + objective and drill
  holds, against the 15-20 min band (900-1200 s, G272), summed over its per-section parts. The M9 line lists every
  stubbed drill and co-op move with its hold, and every restart or retry. It is a lower bound (a robot does not wait out
  patrols, and a stubbed drill is held for A13's time, not played) and report only; Michael's two-player walk confirms
  it.
- **Where it runs.** Every run is an e2e run: the laptop queue only, `E2E_GPU=1`, as an alone request with one step
  per section (`--alone --step "serve scripts/route-run.mjs ..."`), so a train preempting the run loses one section at
  most. A one-off on the desktop only when the lead says, under `heavy.lock`.
- **First users.** Saltmarsh Park S1-S5 (J17 greybox v2 exit, G330); Marlow Yard: a baseline on the yard as built
  (J12 S9's `ctcourse` graph, report only, not a gate run), then its gate run on J14's re-plan (approved by Michael
  2026-10-25 ~19:16, origin/feature/marlow-replan `docs/marlow-replan/`) from J14's graph once it carries
  `meta.taught_by` and the yard exits greybox: one forced route through A1-A7, side routes in A8 only, every failure a
  retry (Q5, Q24); Tallow Wharf (J23 exit).

## Limits
- Out of scope: real co-op moves beyond the leg-up (R9 adds more as the game's helpers exist); 1, 3 or 4 player runs;
  judging feel, pacing or light (the walk card and the light jobs do that); fixing any map (the map leads fix what a
  report finds); a gameplay bot of any kind.
- Sector Ops guards that spawn only at 3 or 4 players (Q16 "Live now", G331, G362) never meet a 2-robot run; the
  report header says the run was at 2 players and those guards were not present.
- The robots are test tools only: no game code, nothing the player can meet (G8 and VISION 6: never a bot partner;
  G48's "No bot anywhere" is about a partner in play; G330 is the newer decision for test runs).
- No game code in this job's slices. The only game-side change is Guard AI's cause record (G C5), which Guard AI builds
  and owns (PLAN G1).
- Rules that hold: G330, Q7, Q14, Q5, Q24, G289 (2), G272, G292, G2, G308, G146 (the robots take no kills), VISION 4 rule 8
  (every detection explainable), the hard rules in master `CLAUDE.md` (hot paths allocate nothing: the harness adds no
  per-frame game code), RULES "Test tiers" and "Machines".
- Areas touched and their unwalked count: none switched on; tooling only (scripts, tests, docs). Guard AI (AT CAP, 5)
  gets debug-only instrumentation in G1, with no behaviour change.

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~16:40 (Q7): pass = never stuck; detection times go on the walk card.
- M2 2026-10-25 ~16:50 (Q14): the cast shadow is a faint cue (suspicion only); the log names it "shadow cue".
- A1: Every co-op link is stubbed in version 1 (hold at the near side for its time, then both placed past it), listed
  per link. Not written into `docs/level-design.md` until Q1 is answered. Undo: R9 swaps a kind's stub for a real
  move; Q1's second option makes route-runs wait for all of them.
- A2: After a detection is logged the harness calms that guard and resets the section alarm (page-side: the guard's
  alert machine back to `unaware`, `enemyMgr.resetAlarm()`), so each detection marks one place a guard sees the route and
  one sighting does not snowball into a chase or an alarm lockdown that has nothing to do with the route ahead.
  Undo: `--detections keep` (the alert and alarm play out; counts then include the guards told by radio). In course
  mode the game's own restart or retry is the forgive step (Scope "Restarts and retries").
- A3: One pace, the crouched sneak at `split_speed_mps`, on all three route kinds. Undo: `--pace walk|run` for
  comparison runs; the default changes in `scripts/route-run/progress.mjs`.
- A4: Stuck = under 0.5 m of progress along the planned path in 8 s of game time while walking; a link step has its
  own limit (door 5 s, ladder 15 s + 1 s per metre, drop 5 s, window or hatch 8 s, duct 2 s per metre, objective its
  own hold + 5 s). 8 s is about four times the longest normal pause (a door swing and a ladder mount). These are tool
  tolerances, not level numbers: they live in the harness as named constants (`scripts/route-run/progress.mjs`, as
  `DRIFT_S` does in `scripts/level-measure.mjs`) and are documented in `docs/systems/testing-tools.md` "Route-runs"
  (R8). `docs/level-design.md` gets only Q7's pass rule (Michael's approval) with a pointer to that section; the
  standard changes only with Michael's approval (its header; master `CLAUDE.md`), and Q7 approved "never stuck", not
  these numbers. Undo: change the constants (a tool change). Moving them into the standard or scale-sheet 8 as level
  numbers needs Michael's approval first.
- A5: A run that needed a recovery has no valid time ("n/a, stuck"); the stop is what matters.
- A6: Sector Ops maps run with 2 players (the signed-off counts); the follower trails the leader. Undo: `--players`.
- A7: Secret routes are not run on their own (G330 names dark / high / loud); a planned path may pass a `secret` link.
  Undo: add `secret` to the planner's kinds.
- A8: A space on a planned route with no `area` (V6 needs `area` only on encounter and split spaces) makes that run
  "unplannable", which counts as not passed. Map leads add `area` to every space a route passes. Undo: the planner
  could guess a point from a neighbour's area (not planned: it would walk the robots into walls).
- A9: Reports from the laptop come back by `--publish`: the harness writes them to the branch `route-run-results`
  (path `<map>/<sha8>-<time>/`) with git plumbing only, as `scripts/laptop-queue/request.mjs` does, and
  `--merge` assembles the map report on the desktop. The full JSON is also printed between markers in the run log as a
  fallback. Undo: drop `--publish` and have Test Runner copy reports from `C:/NightShift/scratch/laptop-queue/runs/`.
- A10: Route-run is not an e2e suite in `scripts/run-e2e.mjs` (not in the full run or `affected-e2e`); the map lead
  requests it at greybox exit. Undo: register it as a REPORT-only suite (Test Runner's files).
- A11: Marlow Yard's time (M9) is report only, never a pass rule. Undo: make the 15-20 min band a WARN in the report.
- A12: Detection policy for the whole pair: a guard alerted on either robot counts once per rise; a guard who rises
  again later counts again.
- A13: Drill hold (course mode): the time the graph gives the set's `teach` element (J12 BRIEF A8: the `time_s` of the
  link that carries `teach`), with no second hold when that link was already held as a co-op stub on this run; else
  10 s. Never the space's `drill_s`: that is the drill's limit, not how long it takes. Undo: `--drill-hold <s>`, or the
  constant in `scripts/route-run/course.mjs`.
- A14: Restart loop (course mode): a second restart or retry from the same graph space in one run is a `restart-loop`
  dead stop, then the set's spotted rule goes off for the rest of that set and the robots are placed past the link (a
  recovery), so a run never loops. Why a stop: a pair sent back twice from one place has not got past it, which is what
  Q7's "never stuck" guards against. A robot does not wait out a patrol, so it can be seen twice where a person would
  wait: the checker reruns the stop and reads its screenshot before a map lead is asked to fix anything (PLAN Risks).
  Undo: allow more restarts per space (a constant in `course.mjs`).
- A15: Guards present (as J20's H8 alive-at-start check, J20 S6c): at each section's start the harness logs every
  guard the mode spawned, alive and above y -5. A section with a missing or fallen guard gives its runs `unplannable`
  (reason `guards missing`), so no run is scored against a missing guard field. Undo: log only.

## Questions for Michael (one click each, asked by day)
- Q1: "When the robots reach a move that needs both players (a boost, a throw, a held shutter), what should the robot
  run do?" - options: "Stand there for the move's time where guards can see them, then carry on; the move itself is
  tested by its own co-op test, and the report lists every one (Recommended)" / "Do the real move; robot runs wait
  until every co-op move can be done by the robots" / "Skip routes that have a co-op move". Blocks: nothing (R1-R8 build
  either way; the second option adds R9 for every kind before the first gate run). Default until answered: A1.

## Sign-off needed
No (a test tool; no map, layout or look).
