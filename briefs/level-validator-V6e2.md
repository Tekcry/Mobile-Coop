status: done feature/level-validator-v6e2 425c4e20

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

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/level-validator-v6e2` @ 425c4e20 (base 220596bc). Full write-up: `docs/level-validator/campus-run/V6-REPORT.md`.
- Run: `level-measure --write` on the five graphs: build 1.2-1.5 s, nav 0.7 s, ONE bake for all five 110-115 s, measure S1-S5 2.3 / 0.6 / 0.3 / 20 / 3 s; whole run 2 min 22-25 s (< 4 min). Second run after the pins left S1-S3 byte-identical.
- Pins (`at` only): S4 `s4-baskets -> s4-hall` (5 gaps) `[14, 4.4, 41.3]`; S5 `s5-gal -> s5-hall` (2 gaps) `[-47.5, 4.2, 23.5]`; S5 roof -> terrace had no gap ERR, not pinned. 21 other links still report 2+ gaps (listed in the report; need the lead's points).
- Splits: no campus space has a `split:<id>:a|b` tag, so `meta.measured.splits` is `{}` alone and merged; no reach measured.
- Verdict: 3 of 25 encounters PASS (s1-dyard, s2-foyer, s4-lobby). Three worst: s5-garden (shadow 0.93, vantage 0.00), s3-hall (shadow 0.05, vantage 0.30), s5-terrace (shadow 0.67, vantage 0.04). s5-well 0 cells; small rooms s5-vest 11, s5-pass 16, s5-shaft 6, s5-core-r 16, s4-mantrap 20.
- Finding for the tool: `drop` links are not nav edges on the campus (no drop-off edge from basket edge / hatch / over rail), so their measured times are walk-rounds (S1 canopy -> forecourt 43 s for a 12.5 m drop). Suggest treating drop as off-nav or fall + walk; script not changed.
- Tests: `npx vitest run tests/levelMeasureCampus.test.ts --maxWorkers=2` 5/5 pass twice (134 s, 136 s); a hand-planted drift (s3-hall shadow 0.05 -> 0.2) failed it as expected, then reverted. `tests/levelValidate.test.ts tests/levelMeasure.test.ts` 91/91 pass. typecheck:fast and eslint on the new test clean.
- `level-measure --check`: exit 1 with 128 FAIL (target misses) and 0 DRIFT: `--check` fails on target misses by design; script unchanged, as the brief says.
- `level-validate --require-measured`: per section alone only structure ERRs (cross-section links, `start` in S1): 1 / 2 / 2 / 2 / 1, 0 WARN. Merged five: 250 ERR, 211 WARN (was 149 / 173; 174 ERR with the flag before). Per section (lines naming its spaces): S1 26 ERR / 30 WARN, S2 71 / 46, S3 42 / 35, S4 43 / 45, S5 68 / 57.
- Deviations: the drift test also fails when a measured space or split has nothing stored (so it cannot pass empty); one shared bake in `beforeAll` (600 s) and one `it` per section (600 s).
