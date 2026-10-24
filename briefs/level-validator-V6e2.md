status: blocked waits for V6c + V6e-1 to merge into feature/level-validator-v6 (the lead reopens this with the base sha)

# level-validator V6e-2: campus measure run, drift test, V6 report (Marlow Build, job level-validator)

Lead: Night Shift | Marlow Build (desktop). Node + Vitest only: no src/ change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/level-validator-v6` at the sha the lead writes here when reopening (it then holds V6a-d, the
  `level-measure` CLI from V6c and the campus `area` / `vantage.at` / link `at` data from V6e-1).
- New branch: `feature/level-validator-v6e2`. Edit ONLY: `docs/sector-redesign/graph/campusOps-S1..S5.json` (only the
  `measured` / `meta.measured` the CLI writes; never hand-edit them), `tests/levelMeasureCampus.test.ts` (new),
  `docs/level-validator/campus-run/V6-REPORT.md` (new).

## Read
`docs/systems/agent-preamble.md`; `docs/level-validator/V6-PLAN.md` (whole, ~110 lines: "Measurement definitions",
"Risks", "What Michael sees"); `docs/level-validator/campus-run/V6-areas.md` (V6e-1's area sources and doubts);
`scripts/level-measure.mjs` usage (`--write`, `--check`); `tests/campusArtLight.test.ts` (600 s timeout pattern).

## Build
1. `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S{1..5}.json --write` (one process; expect
   ~25 s bake per section, < 4 min total). Record the time per section.
2. `tests/levelMeasureCampus.test.ts`: for each of the five graphs, re-measure in-process (same API the CLI uses) and
   fail only when a stored `measured` value moves > 0.05 (fractions) / > 1.5 s, or a stored `geom` hash differs
   (stale). Never fail on a target miss (the campus is AS BUILT and expected to miss; V6-PLAN "Campus will fail").
   Timeout 600 s.
3. `V6-REPORT.md`: per section a table of every encounter space: declared vs measured shadow %, vantage %, LOS-break s,
   floor cells, PASS / FAIL; per split the leg times and revive reach (null = joined only by co-op moves); link times
   beside the declared ones; worst offenders first; a space with < 20 cells flagged "area suspect". Then the
   `node scripts/level-validate.mjs ... --require-measured` ERR / WARN counts per section. No fixes to the campus.

## Tests and done
- `npx vitest run tests/levelMeasureCampus.test.ts --maxWorkers=2` passes (twice in a row: proves no drift).
- `npx vitest run tests/levelValidate.test.ts tests/levelMeasure.test.ts --maxWorkers=2` still pass.
- `node scripts/level-measure.mjs <five graphs> --check` exits 0 (no drift) even though targets miss: if `--check`
  also fails on target misses by design, report it and do not change the script.
- Push the branch, report at the end of this brief (times, counts, the three worst spaces), `status: done`.
