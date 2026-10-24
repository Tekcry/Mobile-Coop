# Level validator: connectivity graph, validator, metrics JSON, scale-sheet room table, level standard
kind: minor
- Tooling: every map now has a connectivity graph (JSON, one object or one file per section) written before any
  geometry; the schema, every rule each field feeds and an example graph are in `docs/level-validator/graph-schema.md`
  and `docs/level-validator/example.graph.json`, and `docs/templates/map-spec.md` requires a passing validator run
  before Phase 3.
- Tooling: `node scripts/level-validate.mjs <graph.json> [more.json ...] [--metrics <path>]` validates a graph against
  our metrics: reachability and no softlock for two players, the linear spine between sections, 3+ approaches of 2+
  kinds per encounter space (links that can enter it), dead ends (counted by ways out), room-class sizes, opening
  minimums, the 0.5 m grid, ceilings, 2+ independent routes per section, co-op coverage, co-op moves one player can
  make anyway (a solo twin: ERROR on a campaign map, WARN on Sector Ops), split parity and beat pacing. Exit 0 / 1 (any ERROR) / 2 (bad usage). Tests:
  `tests/levelValidate.test.ts`.
- Tooling: `docs/design/metrics.json`, generated from `docs/design/scale-sheet.md` by `scripts/metrics-gen.mjs`, is the
  one source of every size and time the validator uses (no constant in the script); `tests/metricsGen.test.ts` fails
  when the sheet changes without a regeneration.
- Design: `docs/design/scale-sheet.md` gains section 7, "Room sizes by type" (a room table scaled about 1.4x real and
  floored by the camera rule: 6 m short side for encounter spaces, 3.5 m for any walk-through room), and section 8,
  "Validator numbers" (speeds, split and reach times, shared width, shadow, vantage and line-of-sight targets).
- Design: `docs/level-design.md` section 11 is rewritten for two players (spine between sections, splits <= 90 s per
  leg within 20% by traversal time, partners act for each other, an overwatch spot per split, a downed partner
  reachable within 15 s, shared routes >= 2.0 m wide), and the numeric targets are added: a vantage sees about 70% of
  an encounter space, 40-60% of its floor in shadow, routes cross at least once, line of sight breakable within about
  5 s, guard counts 3-6 early / 6-10 late. The graph is a Phase 2 deliverable and the validator run its gate to
  greybox (Michael 2026-10-24, "Add 1-4 as extras").
- Tooling: the first validator run covers all five campus Sector Ops sections (S1-S5; Michael, about 20:12), with a
  patch or re-plan verdict per section in `docs/level-validator/campus-run/REPORT.md`.
