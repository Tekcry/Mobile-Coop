# Validator port S10: campus graphs measured
kind: patch
- Level validator (tooling, no game change): the five campus graphs in `docs/sector-redesign/graph/` carry their
  measured positions (`area`, `vantage.at`, link `at`) and the values `level-measure` stored from the built campus. A
  new test, `tests/levelMeasureCampus.test.ts`, re-measures the campus in CI and fails when a stored value has moved
  or the stored geometry hash is stale. The saved validator run and report are in `docs/level-validator/campus-run/`.
