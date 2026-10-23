# Release speed-ups
kind: patch
- Merge trains: `merge-train.mjs build <n> <version> "<title>" <branch>...` now makes the version commit, opens the
  train PR and runs the unit tests on the train head, so CI runs beside the laptop e2e run; `release` only merges,
  tags and moves dev, and `release --resume` finishes after a fix on the train branch.
- One train may carry several wire changes: the train build bumps PROTOCOL_VERSION once, and tests read the constant
  instead of asserting its number.
- CI runs lint, tests and build in parallel with a cached `node_modules`, and a new push cancels the older run.
