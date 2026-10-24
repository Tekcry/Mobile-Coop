# Laptop queue: suite names checked at request time, confirm rerun before a guessed auto-drop, spare work when idle
kind: patch

### Changed
- Laptop queue: `request.mjs --suites` takes names split by spaces or commas, and refuses an unknown suite name at request time (checked against the sha's `scripts/`; `name:N` parts by their base name) instead of letting it reach the runner as a false failure.
- Auto train: when a train's own laptop failure maps to no member (a tier 2-3 guess), it first reruns the failing suites once on the same head; a member is dropped only if that rerun fails too.
- Laptop queue: after 5 idle minutes (`LQ_SPARE_IDLE_MIN`, 0 = off) the laptop queues one spare job from `docs/laptop-queue/spare-jobs.json` on the master head (full e2e, e2e-coop x5, guard-cap ctcourse 24 / campusops 32, campusOps perf), round-robin, one at a time, each once per master sha.
