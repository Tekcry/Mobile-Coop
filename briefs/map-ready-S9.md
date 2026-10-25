status: done feature/map-ready-s9 a89726ef02747e6e83c1c376f9f2f0b50fc179db
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

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
Full report: `docs/map-ready/checks/s9-build.md` on the branch (head a89726ef). Steps 1-5 built; step 6 waits for S1's
merge (as the brief says).
- Commits: step 1 dc1a4fda, 2 7a054fe6, 3 c8412b92, 4 43adf0fb, 5 948d8060, report a89726ef; 7 owned files, +615 / -8;
  no never-touch file.
- Step 1 `src/core/keptParts.ts` (no Babylon): one reference per texture per hand-over; unused 2 hand-overs in a row is
  released once; LRU past 256 MB; `dropTextures` releases all; flag off every call is a no-op; scenes only as WeakMap keys.
- Step 2 `figure.ts`: `texture(..., keep = true)` under a stable per-image key, the image bytes as the buffer (Babylon 9.29
  buffer path works; URL `data:<key>`; KTX2 keeps `.ktx2`); `buildLodAsset` keeps all but the hero. Flag off / keep false:
  today's blob path.
- Step 3: kit, props and campus art read their GLB through the parsed-file cache with the flag on (`loadKeptModel`).
- Step 4: `App.kept`; with the flag on a context loss or a Textures setting change drops the held textures;
  `releaseState` hands the scene over just before `scene.dispose()`; `releaseEffects` unchanged (S10).
- Step 5: NullEngine test, two create / hand-over / dispose cycles: flag on the second scene reuses the internal texture
  (`texReused` > 0, `texDecoded` unchanged), the kit GLB fetched once; a context loss leaves 0 held; the hero and flag
  off hold nothing.
- Tests: tsc clean each step; keptParts 11 / 11; the brief's set 7 files 81 passed 1 skipped (+ facilityKit /
  facilityProps: 9 files 113 passed 1 skipped). Allocation (campusArtRender, ALLOC_TRACE=1): best 0.0 B per call every
  run (lines in the report; 847 B de-optimised rounds skipped by the best-of rule).
- Deviations: key carries a colour-space suffix (`:s` / `:l`, Babylon keeps `gammaSpace` on the shared texture);
  `KeptTex._references` optional field; `forgetFile` and `loadKeptModel` added; the App observer and `onChange` handler
  only with the flag on; the NullEngine test gives the engine a real release-from-cache (the buffer path itself needs
  the GPU run).
- Pending PC run (request lines in the report): affected; `e2e-coop` + `e2e-netmove`; `e2e-lightbake` flag off and with
  `mapready=1`; a GPU look check flag on / off; after S1 + S9 merge, `map-ready-measure.mjs --gated` repeat rows
  (`texDecoded` 0, `filesFetched` 0, heap after 3 campus loads within 5% of after 1). Step 6: the lead's one-commit
  follow-up adds the 4 counter increments to S1's `loadCounters`.
