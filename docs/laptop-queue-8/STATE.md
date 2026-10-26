# laptop-queue-8 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26, builder)
Branch feature/laptop-queue-8 holds origin/feature/laptop-queue-7 (merge 624cb7278; #507 still open). The `fix` label
already existed (red, "Bug fix: tested ahead of new features"). Slices A, B built (Opus builder); C next, then D, E, F.
- Slice A (fixes first, keep place): lib `placeKey` :20, `isFix` :253, pickFrom fix tier :332 (nonAlone sorted by
  place), `placeFor` :472, prBoard `fix` :931; service `FIX_FIRST` :159, `pushFile` mustExist :368, prBoardNow labels
  :611, `keepPlaces` :1655 (called from applySupersedes), order block "order: fix" :1882; request.mjs `--fix` :13, :28,
  :98; tests describe "pick: fixes first, keep place" :157.
- Slice B (stop a running request on a newer head; kind pr only, full runs never stop): lib `supersededRunning` :496,
  cutShort 'superseded' :781; service `STOP_SUPERSEDED` :160, `runningSup` / `progressById` :1134, watch :1348,
  cutEnd 'superseded' (result `superseded-run`) :1377, `stopSuperseded` :1672 (place push onto an open N via
  keepPlaces), pass call :1829; tests describe "supersededRunning" :411.
- PLAN Risks gained the affected-cap refileOverCap line (checker polish).
Verify per slice: `npm run typecheck:fast`, `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`.
Next: slice C (PLAN "Slice C"); D (Sonnet), E (Opus), F (Sonnet) after.

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
