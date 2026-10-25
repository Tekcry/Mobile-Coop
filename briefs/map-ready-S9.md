status: open
# map-ready S9 (cloud): kept parts - model files and textures (code + unit tests)

Lead: Night Shift | Sector Ops Build. Job map-ready (FOLDED-PLAN J21, ROADMAP Now row 17; Michael's near-instant loads,
ROADMAP Decided 2026-10-25 ~18:50 / ~20:05, Q31 / Q32). Plan checked; W0 flag `mapReady` done (3a18a7bb5). W1 runs
S1, S4, S9 in parallel (disjoint files; S4 done). Opus builds.

- Base: `origin/feature/map-ready` @ 3a18a7bb5470b697f9c748b5b9e23ce449ae2e6b. New branch: `feature/map-ready-s9` (create it from that commit and push it;
  never push to feature/map-ready, another lane or master).
- The strict brief is `docs/map-ready/briefs/S9.md` on that base, with docs/map-ready/BRIEF.md and PLAN.md. Its owned-file
  and never-touch lists are exact.
- Cloud changes to the brief:
  - Ignore its desktop worktree path, `npm ci` line and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/map-ready-s9`.
  - Its "Cloud-safe: no" means the e2e / GPU / laptop legs: those are "pending PC run" here (the lead runs them). Build
    every code and unit-test step.
  - Step 6 (S1's counters) waits for S1's merge: stop after step 5 and report, as the brief says.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Allocation tests read V8 per process: report every bytes-per-call line.
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: every buildable step pushed; report `docs/map-ready/checks/s9-build.md` (per step: files, tests with counts,
  deviations, pending PC runs with the brief's request commands); then `status: done feature/map-ready-s9 <sha>` here.
