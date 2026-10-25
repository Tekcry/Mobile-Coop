status: done feature/validator-port-s10 c0adf0c74ad36e3b3d96416514e6c44ba147fa74
# J12 validator-port, slice S10 (Sonnet, strict Opus brief): campus graphs - V6 positions, re-measure, drift test, run

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3). S3 (checkMeasured) is on master;
PR B2 (S1 core + S2 measure CLI) merged on master.

- Base: `feature/validator-port-c2` at `17871b9fe6eafd04c28136583a4e0498e48e44dc` (= PR C fede9015e merged with PR B2
  57c0a00a0: S3 `scripts/level-checks/measured.mjs`, S1 `src/world/levelMeasure.ts`, S2 `scripts/level-measure.mjs`,
  S5 `validate:levels`). New branch: `feature/validator-port-s10` cut from it. Push every sub-step. Guard before every
  write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/validator-port-s10`.
- Fetch the source first: `git fetch origin feature/level-validator-v6` (head 8f551e18; holds a1bc1e57, 425c4e20).
  Port rule (PLAN section 4, A1): no merge, cherry-pick or rebase of the V6 branch; files are taken with `git show`.
- Read first: `docs/systems/agent-preamble.md` (origin/master, "Cloud sessions"); the PLAN
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` row S10 (:114), its detail (`**S10 (Sonnet).**`,
  :299-304), section 4 rows a1bc1e57 / 425c4e20 / 8f551e18 (:319-324), section 7 "J17 campus-greybox" (:412-421: after
  PR C, J17 owns every later campus re-measure) and section 9 (light bake changed since V6: re-measure, copy nothing);
  BRIEF (same branch) A4, A5, A15, A17.

## Only files to create or edit
1. `docs/sector-redesign/graph/campusOps-S1.json` ... `campusOps-S5.json` (edit)
2. `docs/level-validator/campus-run/run.txt` (edit)
3. `docs/level-validator/campus-run/V6-areas.md` (new, from V6)
4. `docs/level-validator/campus-run/V6-REPORT.md` (new, from V6, refreshed)
5. `tests/levelMeasureCampus.test.ts` (new, from V6, fixed for master)
6. `changes/feature-validator-port-s10.md` (new, `kind: patch`: campus graphs carry their measured positions and values,
   a drift test re-measures them in CI; no game change)

Not yours: `docs/level-validator/graph-sets.json` (I-C rewrites the counts), `campus-run/REPORT.md`, `S1.md`-`S5.md`,
any script or `src/` file.

## What V6 changed (checked by the lead; do not re-derive)
- Master's five campus graphs are byte-identical to V6's base (25a36202 = a1bc1e57^).
- V6e-1 a1bc1e57 added the positions: `area` on every space, `vantage.at`, link `at`; no `measured`.
- V6e-2 425c4e20 added `measured` everywhere plus two link `at` by hand: S4 `s4-baskets -> s4-hall` (drop)
  `[14, 4.4, 41.3]` and S5 `s5-gal -> s5-hall` (drop) `[-47.5, 4.2, 23.5]`. 8f551e18 only re-measured (no position).
- So master + positions = a1bc1e57's files + those two `at`. Every V6 `measured` value is dropped (re-measured here).

## Steps
1. Positions. For i in 1-5: `git show a1bc1e57:docs/sector-redesign/graph/campusOps-S$i.json >
   docs/sector-redesign/graph/campusOps-S$i.json`. Then by hand:
   - S4, the `s4-baskets -> s4-hall` drop (its note ends "Fall damage not modelled. time_s estimated."): its last line
     `"time_s": 12` becomes `"time_s": 12,` and a new line `      "at": [14, 4.4, 41.3]` follows.
   - S5, the line `{ "from": "s5-gal", "to": "s5-hall", "kind": "drop", "route": "high", "level_change": 4.2,
     "length": 6,` gains ` "at": [-47.5, 4.2, 23.5],` after `"length": 6,`.
   Check (must print `positions = V6` five times):
   ```
   node -e 'const {execSync}=require("child_process"),fs=require("fs");
   const strip=g=>{delete g.meta.measured;for(const x of [...g.spaces,...g.links])delete x.measured;return JSON.stringify(g)};
   for(let i=1;i<=5;i++){const f=`docs/sector-redesign/graph/campusOps-S${i}.json`;
   const v6=JSON.parse(execSync(`git show 8f551e18:${f}`,{maxBuffer:1e8}));const now=JSON.parse(fs.readFileSync(f,"utf8"));
   console.log(f, strip(v6)===strip(now)?"positions = V6":"DIFFERS");}'
   ```
   And `node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S1.json docs/sector-redesign/graph/campusOps-S2.json docs/sector-redesign/graph/campusOps-S3.json docs/sector-redesign/graph/campusOps-S4.json docs/sector-redesign/graph/campusOps-S5.json`
   still ends `127 error(s), 174 warning(s).` (the validator does not read positions). Commit:
   `validator-port S10: campus graphs carry V6e-1 / V6e-2 positions (area, vantage.at, link at)`.
2. Re-measure on this base (headless node, Vite SSR: no browser, no GPU; `npm ci` first if `node_modules` is missing;
   V6 took ~2.5 min in a cloud container, almost all of it the one light bake). Below, `<five>` = the five graph paths
   S1-S5 in order, written out in full as in step 1.
   - `node scripts/level-measure.mjs <five> --write`. Keep the stderr timing lines and any `ERR` line.
   - Commit, then run the same command again: `git diff --quiet docs/sector-redesign/graph/` must hold (deterministic).
   - `node scripts/level-measure.mjs <five> --check`: report the exit code and the failing lines (target misses are
     expected: the campus is as built).
   Commit: `validator-port S10: campus re-measured on master (level-measure --write)`.
   If the measure step cannot run in this container (an environment error, not a graph finding): stop before step 3,
   commit what you have, write the error in the report, `status: blocked measure cannot run: <error>`.
3. Drift test: `git show 8f551e18:tests/levelMeasureCampus.test.ts > tests/levelMeasureCampus.test.ts`, then fix it for
   master so it re-measures exactly as the CLI on this branch does: read `scripts/level-measure.mjs` (`prepare`,
   `measureMap` and the per-file write-back). Known difference: master's CLI measures the five files MERGED
   (`mergeGraphs`, file order) once and writes each file only its own spaces and links (link index = merged index minus
   the file's offset); V6's test measured each file alone. Make the test measure the merged graph once (import
   `mergeGraphs` from `scripts/level-graph-lib.mjs` with the `// @ts-expect-error` line other tests use for `.mjs`) and
   compare each file's stored values with the merged result by the same mapping, splits included. Keep V6's tolerances
   (0.05, 1.5 s), its geom-stale and nothing-stored checks, its "never fails on a target miss" rule and its 600 s
   timeouts. Update the header comment (master paths; the archive V6-PLAN is `docs/archive/level-validator/V6-PLAN.md`).
   Commit: `validator-port S10: campus drift test (levelMeasureCampus, from V6e-2, merged measure as the CLI)`.
4. `git show 8f551e18:docs/level-validator/campus-run/V6-areas.md > docs/level-validator/campus-run/V6-areas.md`
   (unchanged since V6e-1). Fix only what doc lint flags (dead paths: V6-PLAN moved to `docs/archive/level-validator/`).
5. Validator after the measure:
   - `node scripts/level-validate.mjs <five> > docs/level-validator/campus-run/run.txt` (the saved run: the CLI's exact
     stdout, no flag, as the manifest's campus set runs it).
   - `node scripts/level-validate.mjs --require-measured <five>`: counts for the report (PLAN section 6: its ERRs must be
     only target misses of the as-built campus; list any other kind).
6. `docs/level-validator/campus-run/V6-REPORT.md`: start from `git show 8f551e18:docs/level-validator/campus-run/V6-REPORT.md`
   and refresh it with this run's numbers.
   - Title stays; under it a header line: `Owner: Marlow Build. Status: current.`, then one paragraph: re-measured on
     master by validator-port S10 (date, base `17871b9fe`); the shadow share is INFO, never an ERR (G329; BRIEF A4;
     Sector Ops conformance L13, `docs/conformance-sector-ops/CONFORMANCE.md:135`); after this PR every campus
     re-measure belongs to J17's SW-<N> PRs (PLAN section 7).
   - Run table (this run's times), the hand edits paragraph (the two `at`, kept), verdict and every table recomputed
     from the new `measured` values and the step 5 output; drop V6's numbers that no longer hold (no "was / now" pairs
     except one line: V6 180 ERR / 209 WARN vs this run's `--require-measured` counts).
   - Plain English, hyphens not em dashes, lines under 120 characters.
7. Fragment (file 6). Commit: `validator-port S10: saved run, V6 areas and report, changelog fragment`.

## Checks (unit only: no e2e, no GPU, no npm run check)
- `npx vitest run tests/levelMeasureCampus.test.ts`: green (~3 min; report the time).
- `npx vitest run tests/levelMeasure.test.ts tests/levelMeasureCli.test.ts tests/levelMeasured.test.ts
  tests/levelValidate.test.ts tests/changesFragments.test.ts`: green.
- `npx vitest run tests/levelGraphs.test.ts`: expected to FAIL on the campus set only (new counts against the manifest's
  127 / 174; the example set stays green). Do not edit the manifest; report the new counts (I-C rewrites them).
- `npx tsc --noEmit -p .`: clean. `node scripts/doc-lint.mjs`: 0 errors.
- Pending PC run: the lead reruns `node scripts/level-measure.mjs <five> --check` and the drift test on the desktop.

## Done
Positions = V6 (step 1 check), the five graphs re-measured on master, a second `--write` changes no byte, drift test
green, run.txt is the exact CLI output, V6-REPORT refreshed.

## Report (append below, then set line 1)
What changed (files, commits), measure times, `--check` result, plain and `--require-measured` counts (these go to
I-C), drift test time, what you changed in the test and why, tests with counts, deviations. Then
`status: done feature/validator-port-s10 <sha>`.

### Report (Night Shift | Cloud Builder 2, 2026-10-25)
**Built in full; blocked on one check outside the file list.** Branch `feature/validator-port-s10`, head 86672b1c0,
cut from 17871b9fe. Files: the five `campusOps-S1..S5.json`, `campus-run/run.txt`, `V6-areas.md` (new, as V6e-1),
`V6-REPORT.md` (new, refreshed), `tests/levelMeasureCampus.test.ts` (new), `changes/feature-validator-port-s10.md`.
- Commits: 3a0ddef49 positions, f3d6dbcdf re-measured, c4b2f35c7 drift test, 2f255025b run / areas / report /
  fragment, 86672b1c0 one V6-REPORT line under 120 characters.
- Step 1: `positions = V6` five times; the validator still ended `127 error(s), 174 warning(s).`
- Measure (cloud, 4 CPUs shared): first `--write` 2 min 35 s wall (build 1.3 s, nav 0.8 s, bake 121 s); second
  `--write` 2 min 28 s, all five files `unchanged`, `git diff --quiet` held. `geom` `y3jl5g-atld8s`. Measure ERRs are
  graph findings: `s5-well` 0 floor cells; small rooms `s5-vest` 11, `s5-pass` 16, `s5-shaft` 6, `s5-core-r` 16 cells;
  21 links with 2+ gaps on the shared edge and no `at`. 97 of 147 links have a measured time.
- `--check`: exit 1, 58 FAIL, 0 DRIFT: 19 shadow shares outside 0.40-0.60, 13 vantages below 0.70, the 26 measure ERRs
  above; no LOS-break fail. (13 vs the validator's 12 vantage ERRs: `s4-yard` is 0.70 after rounding.)
- Counts for I-C: plain run (= `run.txt`, re-checked byte for byte) and `--require-measured` print the same:
  **139 error(s), 200 warning(s)**, 47 INFO. The 12 new ERRs are all `measured sees_pct below 0.7` on encounters (target
  misses of the as-built campus); no other new ERR kind. Shadow is INFO only. Per section ERR / WARN: S1 14/28,
  S2 39/45, S3 24/35, S4 25/38, S5 37/55, map-wide 1/2. V6-REPORT keeps one comparison line (V6 180 / 209).
- Drift test: `npx vitest run tests/levelMeasureCampus.test.ts` 6 passed, 143.6 s. Changed from V6: measures the five
  files merged once in `beforeAll` (`mergeGraphs` with `// @ts-expect-error`), compares each file's spaces by id, links
  by merged index (file index plus its offset) and the splits its spaces tag, as the CLI writes them; one added check
  (one merged result per link) and a "split stored but no longer measured" line; V6's tolerances (0.05, 1.5 s),
  geom-stale and nothing-stored checks, never failing on a target miss, and 600 s timeouts kept; header paths updated.
- Tests: `npx vitest run tests/levelMeasure.test.ts tests/levelMeasureCli.test.ts tests/levelMeasured.test.ts
  tests/levelValidate.test.ts tests/changesFragments.test.ts` 138 passed, 1 failed (the block below).
  `npx tsc --noEmit -p .` clean. `node scripts/doc-lint.mjs` 0 errors (26 warnings, none in S10 files).
  `tests/levelGraphs.test.ts` 7 passed, 3 failed (base: 8 / 2): "set campus > the saved run is the level-validate CLI
  text" was failing on the base and is now cleared by the new `run.txt`; "level-graphs runner > exits 1 on a count that
  differs ..." fails on the base too (it runs `example.graph.json` and does not expect the "pending V6" INFO lines; not
  campus-related); "set campus > counts equal the manifest" and "the saved run says the same counts" are the expected
  new-count failures (139 / 200 vs the manifest's 127 / 174; manifest untouched for I-C).
- **Block:** `tests/levelMeasured.test.ts:486` ("the example and the campus graphs (no measured yet) print 'pending V6'
  INFO only") now fails: it asserts the campus graphs carry no `measured`, which S10 changes by design (passes on the
  base). The file is not in this brief's list, so it is unedited. Proposed fix (about 5 lines): loop that test over the
  example graph only, and either drop the campus from it or assert for the campus that every encounter has `measured`
  and the only ERRs are `measured sees_pct below` lines. Answer by reopening with that file added (or fold it into I-C).
- Left as the brief says: `V6-areas.md` still names `docs/level-validator/V6-PLAN.md` (now under `docs/archive/`); doc
  lint does not flag it.
- Pending PC run: `node scripts/level-measure.mjs <five> --check` (expect exit 1, 58 FAIL, 0 DRIFT) and the drift test
  on the desktop.

## Answer (Night Shift | Marlow Build, 2026-10-26 ~09:45)
Reopened. Resume from your branch head 86672b1c0 (do not start over). `tests/levelMeasured.test.ts` is added to the file
list for this one change only: take your proposed fix. The "pending V6 INFO only" test loops over the example graph
only; a new case asserts for the campus that every encounter has `measured` and that every campus ERR beyond the
pre-S10 set is a `measured sees_pct below 0.7` line. Rerun `npx vitest run tests/levelMeasured.test.ts` and the brief's
vitest line, then `status: done feature/validator-port-s10 <sha>`. The manifest counts stay for I-C, as you left them.

### Report 2 (Night Shift | Cloud Builder 3, 2026-10-25 ~22:45Z)
Resumed from 86672b1c0; one commit c0adf0c74, only `tests/levelMeasured.test.ts` (+21 / -9).
- The "pending V6 INFO only" test now reads `docs/level-validator/example.graph.json` alone (body unchanged).
- New case "the campus graphs (measured by S10) ...": merged S1-S5 (`mergeGraphs`), asserts all 25 encounters carry
  `measured`, and for `requireMeasured` false and true that every `checkMeasured` ERR matches
  `<id>: measured sees_pct <n> below 0.7 (declared <n>)` (pre-S10 the campus had none). Today: 12 ERRs, all that kind.
- Tests: `npx vitest run tests/levelMeasured.test.ts` 25 passed; the brief's line (levelMeasure, levelMeasureCli,
  levelMeasured, levelValidate, changesFragments) 140 passed, 0 failed. `npx tsc --noEmit -p .` clean; eslint on the
  file clean. Drift test and levelGraphs not rerun (no change to them; manifest counts left for I-C).
