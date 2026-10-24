# Level validator V6: greybox measurement (level-measure), measured gate
kind: minor
- Tooling: the level-graph schema gains the V6 fields (`docs/level-validator/graph-schema.md`, all optional so V1 graphs
  stay valid): `area` on a space (a RoomDef id or `[minX, minZ, maxX, maxZ]` boxes), `vantage.at`, `at` on a link,
  `measured` on spaces and links and `meta.measured`; the example graph carries them.
- Tooling: `src/world/levelMeasure.ts` is the measurement core: floor shadow % (`LightField.bodyLevel` below the dark
  line), vantage visibility % and LOS-break time (static sight lines from the vantage and the sector guards), partner
  revive reach per split and link traversal times (guard nav grid paths), every speed from `docs/design/metrics.json`.
  Tests: `tests/levelMeasure.test.ts`.
- Tooling: `scripts/level-validate.mjs` reads `measured`: ERR on an encounter space a measured shadow share outside the
  band, a vantage share below the minimum, a LOS break over the limit; ERR a partner reach over the limit (measured links
  re-timed from `path_m` at the reach speed); measured link times feed the split leg checks; WARN a
  measurement far from its declared target; INFO `pending V6` per encounter space with no `measured`.
  `--require-measured` turns that INFO into an ERR. Tests: `tests/levelValidate.test.ts`.
- Tooling: `npm run level-measure -- <graph.json...> [--write] [--check] [--doors shut]`
  (`scripts/level-measure.mjs`) builds the graph's map in node (no browser, no GPU), measures it and prints a declared /
  measured table per space, split and link; `--write` stores the `measured` values in the graph file, `--check` exits 1 on
  a missed target, a drift over 0.05 (fractions) / 1.5 s (seconds) or a measure-step ERR. A `drop` or `ladder` whose nav
  path takes no nav link of its kind is not timed (`time_s: null`; the guard nav links only 1.0-2.2 m drops).
- Design: `docs/level-design.md` section 14 makes `node scripts/level-validate.mjs --require-measured` with 0 errors,
  after `npm run level-measure -- <graph> --write`, part of the greybox exit, and section 15 says how the greybox
  measurements are taken (Michael 2026-10-24, "Yes, require it").
- Tooling: the campus run measures the five Sector Ops sections (`area`, `vantage.at` and link `at` added to the graphs),
  report in `docs/level-validator/campus-run/V6-REPORT.md`.
