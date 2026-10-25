status: done feature/route-runs-r4a e15df01e3caba746f8e3a929b75941761247f951
# J13 route-runs, slice R4a (Opus-grade brief): harness core, one page

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 6fab6ef0f). R1, R2 and R3 are on master.
Sector Ops' campus v2 greybox exit waits on this harness: build it next.

- Base: origin/master (57a02d4ef or newer: it holds `scripts/route-run/plan.mjs`, `progress.mjs`, `report.mjs` from
  R1-R3). New branch: `feature/route-runs-r4a`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/route-runs-2:docs/route-runs/PLAN.md` slice **R4a** (search `**R4a Harness core`, ~line 135
  to the R4b slice) - build it word for word, including the three seam modules (`steps.mjs`, `causes.mjs`,
  `course.mjs`, every kind `stub` / no-op here) and the selftest fixture with its `expect` block - and the BRIEF entries
  it cites (`docs/route-runs/BRIEF.md` on the same branch: Restarts and retries :117-138, Dead stops :77-82, A2, A5, A13,
  A14, A15). Reuse `scripts/e2e-lib.mjs` (`launch`) and the patterns in `scripts/e2e-ctcourse.mjs:304` (courseBay) and
  `scripts/e2e-sectorops.mjs` part 6 (sections through the connector cycle). `--publish` follows the
  `scripts/laptop-queue/request.mjs` git-plumbing pattern (temp index, no checkout, retry on a lost push race) to
  branch `route-run-results`.
- Extra requirement (Sector Ops, campus v2 greybox exit): the boot URL keeps any query params the caller passes in
  `<url>` - in particular `?campusv2=N` - on every page the harness opens (R4b adds the second page; build the URL
  helper so both pages share it). A unit test pins it.
- J14 hooks now on their way (dark, `feature/marlow-replan-r1`): `window.__course.restarts`, `lastRetry = { st, cause }
  | null`, host-only `__course.retryOff(n)`, `?course=station:<n>`. R4a's `course.mjs` stays no-op; do not depend on
  them yet.
- Only files to edit: `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/publish.mjs`,
  `scripts/route-run/steps.mjs`, `scripts/route-run/causes.mjs`, `scripts/route-run/course.mjs`,
  `tests/fixtures/route-run/selftest.graph.json`, a unit test for the pure parts (args parsing, URL helper, `--merge`,
  the dry run) `tests/routeRunCli.test.ts`, and `changes/feature-route-runs-r4a.md` (kind: patch). Do not edit R1-R3's
  modules; if you need a change there, write it in your report for the lead.
- Hard rules (`CLAUDE.md` on origin/master): headless and invisible, never `E2E_HEADED`, no pointer lock; hot paths in
  the in-page driver allocate nothing per step; use `hyp2` / `hyp3`.
- Tests to run (unit only, no e2e, no GPU, no browser, no npm run check): `npx tsc --noEmit -p .`,
  `npx vitest run tests/routeRunCli.test.ts` plus the R1-R3 test files (`tests/routeRun*.test.ts`), and
  `node scripts/route-run.mjs --dry-run ...` on the campus S1 graph (it must not launch a browser). Every browser check
  (the selftest, the campus S1 code-route run) is "pending PC run": the lead requests it on the laptop queue.
- Done: the R4a "Done" line's code parts hold; the laptop runs are left for the lead.
- Report: append what changed, tests with counts, deviations, and anything the lead must request on the laptop; set
  `status: done feature/route-runs-r4a <sha>`.

## Report (Night Shift | Cloud Builder 3, 2026-10-26): DONE, code parts of R4a; every browser check pending PC run
Branch `feature/route-runs-r4a` from origin/master 38e92f5d, head e15df01e3caba746f8e3a929b75941761247f951 (2 commits). No R1-R3 module edited.
- **Built:** `scripts/route-run.mjs` (CLI: every PLAN option; graph plan, `--routes code`, `--selftest [fixture]`,
  `--dry-run` (no browser), `--merge <map> <sha> --out`, `--publish`; outputs run log + route-run.json + REPORT.md +
  shots/; the log also between `ROUTE-RUN-REPORT BEGIN/END`). `bootUrl` keeps every caller query param (`?campusv2=N`)
  as e2e-lib params, the harness's own (autostart, mode, gear from the pace, net=local for two) only for keys the caller
  did not set; R4b's second page uses the same call. `scripts/route-run/driver.mjs`: the in-page robot (R3 injected;
  0.05 s `stepHeadless` chunks under `loop.manual`; steer, A4 stuck clock, A at a shut door it is stopped at, guard
  levels and camera alarms polled every 0.1 s, noises via wrapped `enemyMgr.hear` / `noise`, A2 forgive; no per-chunk
  allocation) and the Node run loop (restartCheckpoint per run, A15 guards check, dead stops classed by a findPath
  probe (`locked` when a locked door is within 1.5 m) with a screenshot and a placement past the link, door links,
  steps.mjs for every other action, Sector Ops objectives, sections by the connector cycle as e2e-sectorops part 6,
  course bay lookup by id). `publish.mjs` (request.mjs plumbing to `route-run-results`, `<map>/<sha8>-<time>/`, 5 tries;
  the reader for --merge). Seams: `steps.mjs` (every kind `stub`), `causes.mjs` (`readCauses` on R3 `inferCause`),
  `course.mjs` (`onPoll` / `onLockedDoor` no-ops). `tests/fixtures/route-run/selftest.graph.json`: R1's campus S1 copy
  + link 22 (forecourt into the locked C1 vestibule through the solid pavilion block east of it, at (-17, 0, -31.5)),
  its points, and `expect`: run `door-leg` (path [1], the gatehouse front door: walked, no stops, all guards) and
  `walled-link` (path [4, 7, 22]: 4 and 7 walked, 22 a `no-nav-path` stop within 9 s of the last progress).
- **Tests:** `npx tsc --noEmit -p .` clean; `npx vitest run tests/routeRunCli.test.ts tests/routeRunPlan.test.ts
  tests/routeRunProgress.test.ts tests/routeRunReport.test.ts --maxWorkers=2` **99 / 99** (routeRunCli 33: args, boot URL,
  bays / sectors, selftest steps and verdict, code routes, publish paths and merge, dry run, the seams, the Node run loop
  on a scripted page, and the page script itself run in a Node vm against a fake game: arrive, 8 s stall + probe,
  rises + A2 forgive, place / restart); eslint clean on the test; changesFragments 1 / 1. Dry run on campus S1
  (`node scripts/route-run.mjs --dry-run --graph tests/fixtures/route-run/campusOps-S1.graph.json --points
  tests/fixtures/route-run/campusOps-S1.points.json`): 3 runs (S1-high, S1-shadow, S1-loud), no browser.
- **Deviations (the lead's call):** (1) `--players 2` is refused until R4b (default 1 here; BRIEF A6's default 2 comes
  with the pair). (2) Objectives: A tapped at the objective and re-tapped every 3 s until the mode's download runs (as
  e2e-sectorops), not held (a hold opens the held context menu); Sector Ops only, other modes log "no objective hook".
  (3) `stepsForPath` (selftest) repeats plan.mjs's kind -> action table (not exported); exporting it from R1 would
  remove the copy. (4) Course: a set past bay 1 is `unplannable` at one page (solo boots at bay 1; `courseBay` is the
  host session's, set before the client joins: R4b). (5) Campaign / other modes: only the first section (no section
  setup yet). (6) `--routes code` takes the map, mode and sections from `--graph`. (7) The run log adds `links`,
  `objectives`, `walkedLinks` and a stop's `since` (R2 ignores them). (8) The pad is woken with D-pad up, not L3
  (L3 is back-to-wall cover). (9) **PR size: 1,954 counted lines > 1,500** (driver 839, test 465, CLI 448; the PLAN's
  1,200 was code only): needs `big-pr` or a split.
- **Risks to read on the first laptop run:** the door leg taps A at the gatehouse front door; if the lamp switch or
  the alarm panel by that door wins the context pick, the leg reads `step-timeout` (fixture or driver fix, not a map
  fault). The walled link relies on C1's near door staying locked (guard-ai S28: locked doors are shut on the grid).
- **Laptop requests (pending PC run; the lead sends them, with the PR number):**
  - `node scripts/laptop-queue/request.mjs --sha e15df01e3caba746f8e3a929b75941761247f951 --pr <n> --alone --step "serve scripts/route-run.mjs http://127.0.0.1:4189/ --selftest --players 1" --set route-run-selftest --requester "Night Shift | Marlow Build"`
  - `node scripts/laptop-queue/request.mjs --sha e15df01e3caba746f8e3a929b75941761247f951 --pr <n> --alone --step "serve scripts/route-run.mjs http://127.0.0.1:4189/ --graph tests/fixtures/route-run/campusOps-S1.graph.json --routes code --section S1 --players 1 --publish" --set route-run-campus-s1-code --requester "Night Shift | Marlow Build"`, twice (same detections at the same times), then `--merge campusOps <sha> --out <dir>` on the desktop.
