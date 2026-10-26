# Route-runs (`scripts/route-run.mjs`)
Owner: Marlow Build. Status: current.
Purpose: the robot pair that walks a map's declared routes against live guards (G330, the greybox-exit gate): how to run
it, what it writes, and what counts as a dead stop. The pass rule itself lives in `docs/level-design.md` 14 (2) and 15.

A robot pair walks every declared route of a map against its live guards and writes a plain report (job route-runs,
Marlow Build). It is the greybox exit's bot route-run (`docs/level-design.md` 14 (2)):
a map passes when no run has a dead stop. Detections, notices and times never fail it; they go on the walk card.
- Command: `node scripts/route-run.mjs <url> --graph <files...> [options]`, `--merge <map> <sha> --out <dir>` (no
  browser) or `--selftest [<fixture>]`. Options (`parseArgs` in the script): `--points <file|auto>` (the point table;
  `auto` makes it with `level-measure`, `points.mjs` refuses a table that does not match the graphs), `--section S1`,
  `--routes graph|code` (code: the map's own `SectorRoute` lists, "code routes, not a gate run"), `--players 1|2`
  (default 2; a selftest takes its fixture's), `--pace sneak|walk|run` (default `sneak`: crouched at
  `split_speed_mps`), `--detections forgive|keep` (default `forgive`: each detected guard is calmed after it is logged),
  `--out <dir>`, `--publish`, `--dry-run` (prints the plan, opens no browser). Query params on `<url>` are kept.
- Request (laptop only, a browser run, `E2E_GPU=1` is set for alone steps): one alone request per section, so a train
  preempts one section at most:
  `node scripts/laptop-queue/request.mjs --sha <full sha> --alone --step "serve scripts/route-run.mjs
  http://127.0.0.1:4189/ --graph docs/sector-redesign/graph/campusOps-S1.json --points auto --section S1 --publish"
  --set route-run-s1 --requester "<lead title>"`; verdict `laptop-e2e/alone-route-run-s1`. Not an e2e suite: never in
  `npm run e2e` or `affected-e2e`. A crash or timeout mid-run is not a pass. Selftests (a fixture carries its own graph,
  points and `expect` block): `tests/fixtures/route-run/selftest*.graph.json` (default `selftest.graph.json`).
- Outputs (in `--out`, default a temp folder that is printed): `route-run-log.json` (the run log), `route-run.json` and
  `REPORT.md` (summary per run, every detection, notice, dead stop, stub and drill, the walk-card lines), `shots/` (one
  screenshot per dead stop). The log is also printed between `ROUTE-RUN-REPORT BEGIN` / `END`. `--publish` commits the
  log and `REPORT.md` to branch `route-run-results` (`<map>/<sha8>-<time>/`, git plumbing, no checkout:
  `scripts/route-run/publish.mjs`). On the desktop, `--merge <map> <sha> --out <dir>` joins one commit's parts into the
  map's `route-run.json` and `REPORT.md`; the map lead commits them beside its graph at greybox exit. Times are game
  seconds. A run with a dead stop has no valid time ("n/a, stuck").
- Dead stops (`deadStops[].class`; each logged with place, graph link and a screenshot, then the robot is placed past the
  link so one run reports every stop):
  - `no-nav-path` and `could-not-follow`: a walking robot made under `STUCK_MIN_PROGRESS_M` (0.5 m) of progress along
    its path in `STUCK_WINDOW_S` (8 s). A nav probe tells the map (no path from there) from the robot (path exists).
  - `step-timeout`: a link step ran past its limit (`stepLimit`, `scripts/route-run/progress.mjs:315`), or a run past
    `RUN_CAP_S` (`driver.mjs:53`). Limits: door `DOOR_LIMIT_S` 5 s, ladder `LADDER_LIMIT_S` 15 s plus
    `LADDER_LIMIT_PER_M_S` 1 s per metre, drop `DROP_LIMIT_S` 5 s, window `WINDOW_LIMIT_S` and hatch `HATCH_LIMIT_S` 8 s,
    duct `DUCT_LIMIT_PER_M_S` 2 s per metre, objective its hold plus `OBJECTIVE_EXTRA_S` 5 s
    (`progress.mjs:23-37`).
  - `locked`: a door on the path stays locked (in course mode, `UNLOCK_WAIT_S` 5 s after its drills,
    `course.mjs:37`).
  - `restart-loop` (course mode): the game sent the pair back twice from one place (`PER_PLACE`, `course.mjs:33`) with no
    guard, camera or timer behind it.
  - A run that could not be planned (a space with no `area`, a link with no point) or set up (a guard missing at the
    section start) is `unplannable`: not walked, so not passed.
  These are tool tolerances, not level numbers: change them in `progress.mjs` / `course.mjs`, never in the standard.
- Marlow Yard (course mode): `course.mjs` holds the rules. A course door locked by its set's drills (`onLockedDoor`):
  both robots stand at it crouched for the drill hold (`drillHold`: the set's `teach` link time, else `DRILL_HOLD_S`
  10 s, `course.mjs:35`), then each drill still open is completed through the page and listed as a drill stub (never
  walked). Restarts and retries (`onRestart`, `onPoll`): a restart seen within `CAUSE_WINDOW_S` (2 s,
  `course.mjs:31`) of a guard rise or camera alarm is a detection; the second from one place turns that set's spotted
  rule off and places the robots past the link (a push past, `pass`, walk-card line "seen again at <place>, robot pushed
  past"). A restart with a timer behind it is a restart line only; the second from one step drill-stubs that step ("not
  made at sneak pace"). Any other restart is logged and the second from one place is the `restart-loop` stop. The
  report's Marlow time line (total, walked, holds against 15-20 min, 900-1200 s) is a report only.
- Stubs (every one listed with its hold, never counted as walked): every co-op link kind (`COOP_KINDS`) is a stub: both
  robots stand at its near point crouched in the live guard field for the move's time, then are placed past it.
  Their own co-op tests cover the moves. `ledge`, `pipe`, `wall_jump` and `split_jump` are stubs too (`steps.mjs`
  `RARE_KINDS`). Walked with real pad input: doors, `ladder`, `drop`, `window`, `hatch`, `duct`, `rappel`. R9
  (`coop.mjs`) replaces the co-op boost and human ladder stubs with the real leg-up.
- Limits: two players only (Sector Ops guards that spawn only at 3 or 4 players never meet the pair);
  campaign strict-rule restarts are not watched; only course mode (Marlow Yard) has drill and restart handling.
- Tests: `npx vitest run tests/routeRun*.test.ts` (pure parts).
