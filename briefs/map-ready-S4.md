status: open
# map-ready S4 (cloud): the campus lamps shipped pre-built, code + unit tests (resume from the desktop WIP)

Lead: Night Shift | Sector Ops Build. Job map-ready (FOLDED-PLAN J21, ROADMAP Now row 17; Michael's fix (2), ROADMAP
Decided 2026-10-25 ~18:50 / ~20:05). Plan checked; W0 flag `mapReady` done (3a18a7bb5). Opus builds.

- Base: `origin/feature/map-ready-s4` @ 1afb22600 (desktop WIP at the swap: step 1 keys + source, step 2 pack format,
  step 3 prebake scripts, all UNTESTED). Keep working on that same branch `feature/map-ready-s4` (it is the lane
  branch; push to it; never push to feature/map-ready or master).
- The strict brief is `docs/map-ready/briefs/S4.md` on that branch, with docs/map-ready/BRIEF.md and PLAN.md S4.
  Its owned-file and never-touch lists are exact.
- Order: first read the WIP diff (`git diff 3a18a7bb5 1afb22600`) against steps 1-3 and finish / fix them, with step
  7's key and format tests and `npm run typecheck:fast`; push. Then steps 4, 5, 6, 7 in order, each pushed.
- Cloud changes to the brief:
  - Ignore its desktop worktree path and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/map-ready-s4`.
  - Step 3's REAL prebake run (the campus bake, the size caps) is NOT run here: write the scripts, unit-test what is
    pure (plan / shard split / join / manifest / caps logic on a tiny fake map if the brief's tests allow), and list
    "real prebake run (desktop, heavy.lock) + CI build-check" as pending PC run. Do not set PREBAKE=0 anywhere to dodge it.
  - The `package.json` build script change and the deploy.yml cache steps are written as the brief says (CI proves
    them on the PR).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e / GPU / measure leg is "pending PC run".
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: steps 1-7 pushed; report `docs/map-ready/checks/s4-build.md` (per step: files, tests with counts, deviations,
  pending PC runs); then `status: done feature/map-ready-s4 <sha>` here.
