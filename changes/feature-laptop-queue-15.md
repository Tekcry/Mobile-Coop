# Queue fixes: CI-length train hold, early conflict retire
kind: patch
- Auto-train holds the build for a train-ready PR whose CI is still running until its expected CI finish (its CI run's
  start + the median CI time of the open PRs' green checks + 2 min, capped at 20 min, `AUTO_TRAIN_CHECK_WAIT_CAP_MIN`),
  not a flat 3 min (F50: train 131 gave up on #591 71 s before its CI finished). Unknown start or median: the old 3 min.
- The laptop queue re-reads each open affected request's PR mergeable state after origin/master moves (every
  `LQ_MERGE_RECHECK_S` 60 s while UNKNOWN, for `LQ_MERGE_RECHECK_MIN` 10 min) and retires a conflicting one at once with
  its error statuses, instead of finding the conflict at pick time (F51: #581 / #590 waited 36-50 min).
