status: open

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
