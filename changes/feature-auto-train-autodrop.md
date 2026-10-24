# Auto-train drops the failing member and rebuilds at once
kind: patch
- Pipeline: a train whose laptop e2e fails (or whose laptop rerun after a desktop failure fails) no longer waits for
  the orchestrator. Auto-train maps each member's changed files to suites with the `--affected` folder map
  (`DIRECT_COVERS` in `scripts/e2e-affected.mjs`), drops every member that touches a failing suite (else the one with
  the most `src/` files under that suite's `--quick` folders, else the newest-labelled; never `feature/menu`), removes
  its `train-ready` label with a comment naming the train, suite and assert, closes the train PR and builds the next
  train in the same tick. Status `dropped: [{ pr, branch, suite }]` and `lastDrop`, log "DROPPED" lines;
  `--no-autodrop` restores the wait. No drop (left for the orchestrator) over 3 failing suites, when every code member
  matches, on a suite the last auto-dropped train also failed, or on a desktop / rerun failure without a usable FAIL
  list. CI / build-time vitest failures, the desktop-fail laptop rerun and the exit-3 rebuild guard are unchanged.
