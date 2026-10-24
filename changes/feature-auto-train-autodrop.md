# Auto-train drops the failing member and rebuilds at once
kind: patch
- Pipeline: a train whose laptop e2e fails (or whose laptop rerun after a desktop failure fails) no longer waits for
  the orchestrator. Auto-train maps each member's changed files to suites with the `e2e:quick` folder map (now in
  `scripts/quick-covers.mjs`, shared with `run-e2e.mjs`), drops every member that touches a failing suite (else the one
  with the most `src/` files under that suite's folders, else the newest-labelled; never `feature/menu`), removes its
  `train-ready` label with a comment naming the train, suite and assert, closes the train PR and builds the next train
  in the same tick. Status `dropped: [{ pr, branch, suite }]`, log "DROPPED" lines; `--no-autodrop` restores the wait.
  CI / build-time vitest failures, the desktop-fail laptop rerun and the exit-3 rebuild guard are unchanged.
