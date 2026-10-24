status: claimed Night Shift | Cloud Builder 1 2026-10-24T11:50Z

# level-validator V6e-2: campus measure run, drift test, V6 report (Marlow Build, job level-validator)

Lead: Night Shift | Marlow Build (desktop). Node + Vitest only: no src/ change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/level-validator-v6` at the sha the lead writes here when reopening (it then holds V6a-d, the
  `level-measure` CLI from V6c and the campus `area` / `vantage.at` / link `at` data from V6e-1).
- New branch: `feature/level-validator-v6e2`. Edit ONLY: `docs/sector-redesign/graph/campusOps-S1..S5.json` (only the
  `measured` / `meta.measured` the CLI writes; never hand-edit them), `tests/levelMeasureCampus.test.ts` (new),
  `docs/level-validator/campus-run/V6-REPORT.md` (new).

## Answer (lead, reopened)
Base: origin/feature/level-validator-v6 220596bc (V6a-d + V6c CLI 44ad33e5 + V6e-1 areas a1bc1e57). V6e-1 / V6c notes: s5-well has 0 floor cells (sill 0.5 over the 0.45 step: report it, do not change the map); s5-shaft / -vest / -pass / -core-r and s4-mantrap are small rooms (< or = 20 cells: report "small room", not an error of yours); pin link `at` on the drops S4 baskets->hall, S5 gal->hall, S5 roof->terrace if the measure reports 2+ gaps (graph edit allowed for `at` only); meta.measured.splits is per file: validate each graph alone for split reach and also all five together. The campus bake took ~150 s per section on a loaded desktop (plan said ~25 s idle); use a 600 s test timeout per section or one test per section.

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
