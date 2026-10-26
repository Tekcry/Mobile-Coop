# laptop-queue-8 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26, builder)
Branch feature/laptop-queue-8 holds origin/feature/laptop-queue-7 (merge 624cb7278; #507 still open). The `fix` label
already existed (red, "Bug fix: tested ahead of new features"). Slices A, B, C built (Opus builder); D, E, F not built.
Pointers are this branch after slice C.
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
Verify per slice: `npm run typecheck:fast`, `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`.
Next: slice D (Sonnet, PLAN "Slice D"), then E (Opus); F (Sonnet, own worktree) alongside E. Dry run
(`node scripts/laptop-queue/service.mjs --once --dry-run`) not yet run.

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
