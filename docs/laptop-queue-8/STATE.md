# laptop-queue-8 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26, builder)
Branch feature/laptop-queue-8 holds origin/feature/laptop-queue-7 (merge 624cb7278; #507 still open). The `fix` label
already existed (red, "Bug fix: tested ahead of new features"). Slices A-F built (A-C Opus builder; D, E builder
1bf8e909c, f1790d34d; F docs: RULES "Machines", testing-tools.md "Laptop queue", changes/feature-laptop-queue-8.md,
docs/laptop-queue/STATE.md).
A-C pointers are this branch after slice C (shifted by D, E: find by name); D, E pointers after E.
- Slice A (fixes first, keep place): lib `placeKey` :20, `isFix` :253, pickFrom fix tier :332 (nonAlone sorted by
  place), `placeFor` :472, prBoard `fix` :1008; service `FIX_FIRST` :159, `pushFile` mustExist :370, prBoardNow labels
  :613, `keepPlaces` :1726 (called from applySupersedes and stopSuperseded), order block "order: fix" :1954;
  request.mjs `--fix` :13, :28, :98; tests describe "pick: fixes first, keep place" :157.
- Slice B (stop a running request on a newer head; kind pr only, full runs never stop): lib `supersededRunning` :496,
  cutShort 'superseded' :781; service `STOP_SUPERSEDED` :160, `runningSup` / `progressById` :1136, watch :1350,
  cutEnd 'superseded' (result `superseded-run`) :1399, `stopSuperseded` :1701 (place push onto an open N), pass call
  :1858; tests describe "supersededRunning" :411.
- Slice C (keep passed suites on a train preempt): run-e2e.mjs streamed result line :231; lib `finishedSuites` :845,
  `keptPlan` :861 (third arg `times`: a base name keeps only when all its parts are kept); service `KEEP_FINISHED`
  :161, updateBudget skips kept rows :1080, finish "; K kept" :1113, `keepFinished` :1374 (called in cutEnd's train
  branch :1413; re-reads the request file before the kept push), runRequest plan / keptRows :1504, :1531; tests
  describe "kept suites after a train preempt" :1298.
- PLAN Risks gained the affected-cap refileOverCap line (checker polish).
- Slice D (desktop: fixes, then smallest wall at one job; 15 min skip; CPU mode): lib `desktopGate` mode :143, `gateCpu`
  :247, `desktopTooLong` :254, pickFrom `order.smallest` :356; service `DESKTOP_MAX_S` / `CPU_MODE` :166-167,
  `tooLongLogged` :657, desktop skip filter :1948, gate calls :1959, :1975, order block `smallest: DESKTOP` :2013;
  install-task.ps1 `-DesktopCpuMode` :14; tests :736 and describe "desktop order and long-run skip" :748.
- Slice E (docs-only affected-e2e carry for PR heads): lib `prChain` :695; service header :103-106, `PR_CARRY` :168,
  affectedPass call :488 (skipped for a conflicting head under LQ_SKIP_CONFLICTING), `prCarry` :527; tests describe
  "docs-only carry for PR heads" :2091.
- Slice G (lost train verdict, 778c08658; PLAN fix round 1 2e6a28c21): lib `claimBlocks` beats :132, `trainHold` lost
  :1000, `trainFinal` :1006, `trainRepair` :1024; service header :108, `TRAIN_RETRY` / `CLAIM_BEATS` / `blocks`
  :173-176, writeClaims per-id claim check and `beat` :360-373, hold log every 15 min `HOLD_LOG_MS` :655 / :2045,
  `trainHeadsNow` :811 (split out of pendingTrains), `trainLost` :849, `syncTrains` :863 (called in pass :2023 on
  both workers), heartbeat on both workers :1313, finish `result.posted` / `desc` :1278, `trainVerdict` :1328,
  runTrain finally `doneSynced` :1437; tests "claimBlocks: heartbeat bound" :660, workerActivity done train 118 :861,
  trainHold lost :1040, describe "trainRepair" :1050. 298 tests pass (laptop-queue + autoTrain), typecheck clean.
Verify per slice: `npm run typecheck:fast`, `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`.
Dry runs not run: `--dry-run` still fetches origin (listRequests, train refs) into the shared
C:/NightShift/Mobile-Coop/.git; run them where that is allowed.
- Checker FIX round 1 (Opus fixer): heartbeat sets lastBeat only on a landed push (a failed one retries every loop);
  writeClaims `{ taken, guard }` reports ids another worker now holds, `takenBy` stops those runs (lib cutShort
  'taken', first of all; runRequest cutEnd and runTrain closedEnd post nothing, push no done; log "<id>: claim taken
  by <worker>, stopped"). Polish: syncTrains still pushes done when the status read fails, the done push re-checks
  the fresh parent (guard), a laptop entry whose sha is no open train head is marked posted; desktopTooLong and its
  log use keptPlan rest; runRequest skips prepare when every suite is kept. testing-tools "Laptop queue" Claims bullet
  (beats, both heartbeat, LQ_TRAIN_RETRY, hold drop), desktop bullet points to auto-train.md for the build marker;
  changes fragment slice G bullet. Tests: cutShort taken, desktopTooLong kept. Skipped: prCarry cache.
- laptop-queue-9 item: auto-train's 3 h claim note (checker polish, skipped here).
Next: narrow re-check of fix round 1 (heartbeat stop, docs), then post the checker status, then PR to master.
Carry-ins (2026-10-26 ~13:45, after #517 merges):
- #517 checker polish: refileOverCap passes `mustExist` to pushFile (withdrawal race); a null / [] recompute goes in a
  skip set; capAffected's coop / smoke checks use `norm()`; testing-tools.md:38 drop the restated "at most 3" and wrap;
  selfUpdate watches e2e-times.json; request.mjs usage says `--requester affected-e2e` is narrowed.
- Train 118 stall (00:57-01:00Z swap outage): a failed train status post and a failed done claim were dropped, so the
  head sat on laptop-e2e pending and the alone hold blocked every PR claim for 1.5 h. Retry both on later passes
  (state.trains entry without a posted status), and log the hold once per 15 min while it blocks.

## Planning (2026-10-26)
Branch feature/laptop-queue-8, worktree C:/NightShift/Mobile-Coop-laptop-queue-8, cut from origin/master 34b96b9c.
BRIEF.md (A1-A14) and PLAN.md written by the Opus planner; no code yet.
- Builds on laptop-queue-7 (PR #507, open at planning): PLAN "Start" merges origin/feature/laptop-queue-7, or rebases
  on origin/master if #507 has merged. Line pointers are laptop-queue-7 3791f2f1c.
- Create the `fix` label if missing (PLAN "Start").
- Slices in order: A fixes first + keep place (Opus), B stop the old run on a new head (Opus), C keep finished suites
  on a train preempt (Opus), D desktop smallest / 15 min skip / CPU mode (Sonnet), E docs-only PR carry + header
  (Opus); F docs + fragment (Sonnet, parallel with E, own worktree).
- One Opus checker for the PR. One PR (~950 lines); split A+B / C+D+E only past ~1.5k.
- Overlap with affected-cap: request.mjs, run-e2e.mjs, RULES, testing-tools, different hunks (PLAN "Claims").
- Plan checker FIX round 1 done (running stop uses superseded pairing, N may be claimed / running; polish).
- Verify per slice: `npm run typecheck:fast`, `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`.
Next: run PLAN "Start", then brief the slice A Opus builder from PLAN "Slice A".
