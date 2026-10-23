# Train vitest retry
kind: patch
- `scripts/merge-train.mjs build`: when the full vitest run fails only on timeouts or in at most 3 test files, those files
  rerun once in isolation (`--no-file-parallelism`); a pass counts as ok, so desktop CPU load no longer fails a train build.
