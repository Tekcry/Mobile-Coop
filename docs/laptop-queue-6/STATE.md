# laptop-queue-6 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-25)
Branch feature/laptop-queue-6, worktree C:/NightShift/Mobile-Coop-laptop-queue-6. PLAN.md built (Opus builder), no PR yet.
- lib.mjs: `readyHeads` :684 (green / running split; `readyOrPending` = their count), `seenSince` :705,
  `nextTrain` :726 (replaces trainSoon / RELEASE_HOLD_MS), `fitsBeforeTrain` :747, `FIT_SLACK` 1.2.
- service.mjs: env :130-136 (LQ_TRAIN_GAP_MIN 6.5, READY_LAG 3, MERGE_LAG 2, LATE 5, LQ_FIT_PREP_S 120);
  `readyNow` :561 (state.trainReady, one gh call per pass), `nextTrainNow` :572; both run in pendingTrains :623 before
  sparePass and the alone check read `ready` (checker note a). Claim filter :1523, fit log :1556.
- --dry-run writes no state.json (writeJson returns in DRY; checker note b needed no change). Dry run 2026-10-25
  12:32Z: "train 107 released, 1 train-ready PR(s) waiting, next train ~12:35Z: only runs that fit start", one 11 s
  affected run fitted.
- Tests: tests/laptop-queue.test.ts :792 nextTrain (incl. replays 102-106), :851 fitsBeforeTrain, :870 train-ready heads.
- Doc home: docs/systems/testing-tools.md "Laptop queue" "Train soon"; changelog changes/feature-laptop-queue-6.md.

Next: Opus checker review, then PR; live check over 3 releases (PLAN "Verify": no `preempted by train` on pr runs
claimed after a "next train ~" line, idle slots no longer than ETA + 5 min after each merge).
