# laptop-queue-8 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26)
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
