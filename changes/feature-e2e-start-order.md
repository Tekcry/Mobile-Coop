# E2E start order
kind: patch
- Tests: `scripts/e2e-times.json` refreshed from a full laptop GPU run (adds e2e-sectorops and its parts, e2e-studio,
  e2e-tuner-phone; e2e-anim 5 s -> 37 s), and a suite with no recorded time now sorts at the median known time instead
  of 0, so a new or renamed suite no longer starts last at E2E_JOBS=5 and sets the tail.
