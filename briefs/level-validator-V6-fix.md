status: done feature/level-validator-v6 8f551e180fc76fe7649622b1d47570f4eda5f78a

# level-validator V6 fix round (checker FIX, 4 must-fix + 3 polish)
Lead: Night Shift | Marlow Build.
- Base: origin/feature/level-validator-v6 @ 425c4e20.
- Work on that branch directly (push to `feature/level-validator-v6`); it is the V6 PR branch, and nobody else writes to it now.
- npm ci once. Unit tests and node CLIs only: no e2e, no GPU, no `npm run check`.
- The campus light bake takes ~2-3 min per section; run `--write` in the background if your tooling allows.

## Checker report (verbatim must-fix; desktop file C:/NightShift/scratch/v6-check.md)
1. **False ERR on non-encounter spaces.**
   - scripts/level-validate.mjs:1000-1012 (checkMeasured) applies the 0.4-0.6 shadow band to every space that has `measured`.
   - 70 of the 101 measured ERRs on the campus hit connectors, stair cores, utility, exterior, objective and hub spaces (e.g. "s2-core-sw: measured shadow_pct 0 below 0.4").
   - graph-schema.md:52 scopes `shadow_pct` to encounters. The CLI has the same bug at scripts/level-measure.mjs:248-251 (`--check` FAILs).
   - Fix:
     - Apply the target ERR / FAIL only when `s.type === 'encounter'`.
     - Keep drift WARN only where a target is declared.
     - Then update V6-REPORT.md's counts (250 ERR and the per-section table).
2. **Reach mixes speeds.**
   - level-validate.mjs:813 `timeOf` returns `measured.time_s` for every caller, including the partner-reach path at :907 (`timeOf(l, reachSpeed)`).
   - `measured.time_s` is path / 1.3 m/s (the split speed), so reach comes out ~2.3x too long and raises false "downed partner" ERRs over 15 s.
   - Fix:
     - On the reach path use `measured.path_m / reachSpeed` when present.
     - Change tests/levelValidate.test.ts:864 to match.
3. **Wrong drop times.**
   - src/world/levelMeasure.ts:353-368 measures a `drop` link as a walk around by stairs.
   - The guard nav links only 1.0-2.2 m drops (navBuild.ts:11-12), so player drops are not on it: S1 canopy -> forecourt reads 43 s for a 12.5 m drop.
   - These times are stored in the graphs and feed the split legs first.
   - Fix:
     - When the path uses no nav link, return `{ time_s: null, why: 'drop not on the guard nav (1.0-2.2 m only)' }`.
     - Do the same for a `ladder` with no link on its path.
     - Re-run `npm run level-measure -- <each campus graph> --write` (docs/sector-redesign/graph/campusOps-S1..S5.json).
     - Update the drift test's expected values if it stores them.
4. **Docs contradict code and Michael's guard decision.**
   - docs/level-design.md:71-75 (4.9) still says "INFO targets ... never above 10 ... validator prints them as INFO".
   - docs/level-validator/graph-schema.md:55 says "INFO outside ...; ERR > 10".
   - Fix: replace both with "WARN below 3-6 early / 6-10 late, no upper limit (Michael 2026-10-24, 'as many guards as realistically possible')", as section 14 line 328 and graph-schema :171 already say.

## Polish (do these too)
- level-measure `--check` uses one 0.05 tolerance for fractions and seconds:
  - Use 0.05 for fractions and 1.5 s for seconds (as the drift test does).
  - Say in level-design 15 and docs/systems/testing-tools.md that `--check` also exits 1 on a measure-step ERR.
- testing-tools.md: change the "~25 s" campus bake time to the measured 110-180 s.
- level-validate.mjs:609: remove the stale "bands are INFO until Michael rules" comment.

## Run
- `npx vitest run tests/levelMeasure.test.ts tests/levelMeasureCampus.test.ts tests/levelValidate.test.ts tests/metricsGen.test.ts`
- `npm run typecheck:fast`
- `node scripts/level-validate.mjs` on the five campus graphs with `--require-measured`: report the new ERR / WARN counts. The ERR count should fall well below 250; list what remains, by kind.

## Done when
- Tests green.
- Pushed to feature/level-validator-v6.
- A report at the end of this brief: what changed (file:line), test counts, the new campus counts.
- `status: done feature/level-validator-v6 <sha>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Commits on feature/level-validator-v6: 0410023e (code + tests), 2ab1fe18 (docs), c9e520ed (drop / ladder rule by link kind + unit case), 8f551e18 (campus re-measure, V6-REPORT, changelog fragment).
1. False ERR on non-encounter spaces: scripts/level-validate.mjs checkMeasured (~:1000-1035) applies the shadow / vantage / LOS target ERRs only when `s.type === 'encounter'`; drift WARN stays where a target is declared. scripts/level-measure.mjs (~:248-253) FAILs targets on encounter spaces only. New test "target ERRs are encounter rules" in tests/levelValidate.test.ts.
2. Reach speed: level-validate.mjs `timeOf` (:812) re-times a measured link from `measured.path_m / speed` when the speed is not the split speed (the reach path); test at levelValidate.test.ts ~:864 now asserts 26.0 s with path_m 39 (2 x 13 s) and no downed-partner ERR at path_m 21.
3. Drop times: src/world/levelMeasure.ts `pathLength` now counts ladder and drop nav links; a `drop` whose path takes no drop link, or a `ladder` with no ladder link, returns `{ time_s: null, why }` (drop why exactly as the brief). Deviation: the brief said "no nav link"; the S1 canopy -> forecourt walk-round takes the plantroof ladder link, so "no nav link" left it at 43 s. Matching the link kind nulls all seven campus drops; ladders keep their times. Unit case added to tests/levelMeasure.test.ts (links 7, 8). Re-measured all five campus graphs with --write (bake 150-162 s): only the seven drop links changed (S1, S4, S5).
4. Docs: docs/level-design.md 4.9 and graph-schema.md guards row now "WARN below 3-6 early / 6-10 late, no upper limit (Michael 2026-10-24, 'as many guards as realistically possible')".
Polish: --check drift tolerance 0.05 fractions / 1.5 s seconds (level-measure.mjs DRIFT_FRAC / DRIFT_S); level-design 15 and testing-tools.md say --check also exits 1 on a measure-step ERR; testing-tools bake time 110-180 s; stale "INFO until Michael rules" comment at level-validate.mjs:609 replaced. graph-schema link-measure line also documents the drop / ladder null and the reach re-timing.
Tests: `npx vitest run tests/levelMeasure.test.ts tests/levelValidate.test.ts tests/metricsGen.test.ts` 97/97; `tests/levelMeasureCampus.test.ts` 5/5 (200 s); `npm run typecheck:fast` exit 0.
Campus counts (`node scripts/level-validate.mjs campusOps-S1..S5 --require-measured`): **180 ERR / 209 WARN** (was 250 / 211). Measured ERRs 31 (was 101). Per section ERR (measured) / WARN: S1 18 (4) / 30, S2 47 (6) / 46, S3 28 (3) / 35, S4 34 (6) / 43, S5 53 (12) / 57. Remaining by kind: routes / reach / pacing 73 (26 untagged dead ends, 12 no high, 10 no loud, 5 no shadow approach, 9 too few approaches, 7 too few route kinds, s5-yard unreachable, 1 section routes, co-op reach 6/25, 1 three-high run); declared targets 32; measured targets 31 (18 shadow, 12 sees, 1 other); sizes 44 (35 class minimums, 5 short sides under 6.0, 4 widths). `level-measure --check`: 58 FAIL (was 128), 0 DRIFT. Full table in docs/level-validator/campus-run/V6-REPORT.md "Checks".
