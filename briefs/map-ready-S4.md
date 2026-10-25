status: done feature/map-ready-s4 0e216f4af4b8db23c6235db0541e03ed620cdb26
# map-ready S4 (cloud): the campus lamps shipped pre-built, code + unit tests (resume from the desktop WIP)

Lead: Night Shift | Sector Ops Build. Job map-ready (FOLDED-PLAN J21, ROADMAP Now row 17; Michael's fix (2), ROADMAP
Decided 2026-10-25 ~18:50 / ~20:05). Plan checked; W0 flag `mapReady` done (3a18a7bb5). Opus builds.

- Base: `origin/feature/map-ready-s4` @ d42ddb80b (desktop WIP: steps 1-3 at 1afb22600, then steps 4-6 started at d42ddb80b: emit plugin,
  cache rules, shipped read, markPlaying; all UNTESTED). Keep working on that same branch `feature/map-ready-s4` (it is the lane
  branch; push to it; never push to feature/map-ready or master).
- The strict brief is `docs/map-ready/briefs/S4.md` on that branch, with docs/map-ready/BRIEF.md and PLAN.md S4.
  Its owned-file and never-touch lists are exact.
- Order: first read the WIP diff (`git diff 3a18a7bb5 d42ddb80b`) against steps 1-6; finish / fix steps 1-3 first, with step
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

## Report (Night Shift | Cloud Builder 3, 2026-10-25 ~23:25)
Full report: `docs/map-ready/checks/s4-build.md` on `feature/map-ready-s4` @ 0e216f4af.
- The desktop WIP (steps 1-6) reviewed against `docs/map-ready/briefs/S4.md`: correct as written; tsc clean, all brief
  tests pass. Two fixes (a8f5fccd): `PREBAKE=0` now removes a stale `.prebake-cache/current.json` (else the build
  still shipped an old bake); the plan reads "cached" only when every file the manifest names exists. Step 7 (b6920178):
  an emit-plugin test; lint fix in the test.
- Tests: tsc clean (plus the prebake files via a temporary config); eslint clean; brief vitest list 7 files 57 passed
  2 skipped (dist sw test needs a build; heavy campus case needs SECTION_BAKE_FULL); shippedBake 12/12; other key users
  7 files 109 passed.
- Checked without baking: the plan phase alone (3.8 s): campusOps 134 lamps, key `lamps:campusOps:v7:c1:y3jl5g:f25tgk`,
  lo [-72,-2,-86] hi [72,16,72]; vitest filters find plan + 8 shards; `PREBAKE=0` path.
- Deviations: `ShippedFile.rawBytes/rawSha256` (decoded-gzip servers); `LightBake.source` optional
  (tests/helpers/bounceRoom.ts builds a literal, not an owned file).
- Pending PC run: the real prebake (desktop, heavy.lock, PREBAKE_THREADS=4: seconds, sizes, caps STOP rule) + CI
  build-check; a local build then the dist sw test; laptop LIGHT group + e2e-sectorops part 6; S1's measure --gated for
  `shipped`. Note A16 is live: existing IndexedDB lamp/moon caches miss once per PC.
