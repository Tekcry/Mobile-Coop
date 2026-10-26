# Test Runner batch (J20), PR-B: laptop queue
kind: patch
- Every train run also runs `e2e-darkness`: a light meter that disagrees with the picture holds the release. Off
  without a release: `config/train-parity.json` `{ "off": true, "why", "by" }` on the `laptop-queue` branch, or
  `LQ_TRAIN_PARITY=off` on a worker.
- Affected runs gate only on their gate suites; the legacy and audio suites they reach run after them, REPORT ONLY, in
  the slots the affected cap leaves. A desktop failure's laptop rerun keeps gate suites only.
- A perf step in an alone request enforces its budgets unless it says `--no-budget`.
- `flake-budget.md` lists known-flaky failures and quarantined suites, escapes owners with `|`, and warns while fewer
  than 7 days of runs are counted.
- A suite over its flake budget again within 14 days of its last quarantine is BLOCKING: no new quarantine, a
  `alerts/<ts>-<worker>-fixjob-<suite>.json` alert on the `laptop-queue` branch and a line in the PR comment.
