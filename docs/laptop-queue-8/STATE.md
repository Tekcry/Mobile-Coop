# laptop-queue-8 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26, builder)
Branch feature/laptop-queue-8 holds origin/feature/laptop-queue-7 (merge 624cb7278; #507 still open). The `fix` label
already existed (red, "Bug fix: tested ahead of new features"). Slices A-E built (A-C Opus builder; D, E builder 1bf8e909c, f1790d34d); F not built.
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
Verify per slice: `npm run typecheck:fast`, `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`.
Next: slice F (Sonnet, own worktree), then the Opus checker on the head. Dry runs
(`node scripts/laptop-queue/service.mjs --once --dry-run`, also with `LQ_WORKER=desktop`) not yet run.

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
