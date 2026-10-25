status: open
# map-ready S1 (cloud): the load record and the measure script (code + unit tests)

Lead: Night Shift | Sector Ops Build. Job map-ready (FOLDED-PLAN J21, ROADMAP Now row 17; Michael's near-instant loads,
ROADMAP Decided 2026-10-25 ~18:50 / ~20:05, Q31 / Q32). Plan checked; W0 flag `mapReady` done (3a18a7bb5). W1 runs
S1, S4, S9 in parallel (disjoint files; S4 done). Sonnet-level work from a strict brief; any cloud model builds.

- Base: `origin/feature/map-ready` @ 3a18a7bb5470b697f9c748b5b9e23ce449ae2e6b. New branch: `feature/map-ready-s1` (create it from that commit and push it;
  never push to feature/map-ready, another lane or master).
- The strict brief is `docs/map-ready/briefs/S1.md` on that base, with docs/map-ready/BRIEF.md and PLAN.md. Its owned-file
  and never-touch lists are exact.
- Cloud changes to the brief:
  - Ignore its desktop worktree path, `npm ci` line and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/map-ready-s1`.
  - Its "Cloud-safe: no" means the e2e / GPU / laptop legs: those are "pending PC run" here (the lead runs them). Build
    every code and unit-test step.
  - Step 5 (`scripts/map-ready-measure.mjs`): write it and `node --check` it; never launch a browser here. Step 6 is
    the lead's hand-over: write its commands into the report.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Allocation tests read V8 per process: report every bytes-per-call line.
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: every buildable step pushed; report `docs/map-ready/checks/s1-build.md` (per step: files, tests with counts,
  deviations, pending PC runs with the brief's request commands); then `status: done feature/map-ready-s1 <sha>` here.
