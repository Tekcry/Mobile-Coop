# Train lock wait
kind: patch
- Tooling: `scripts/merge-train.mjs` `build` waits at most 5 min (was 30) for the heavy lock before its vitest run, then
  exits 4 (pending; CI still runs the unit tests). `TRAIN_LOCK_WAIT_MIN` (minutes) overrides it.
