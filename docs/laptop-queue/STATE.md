# laptop-queue - state

## Now (2026-10-23 ~19:55)
S1 built (Sonnet) ad0196cc: lib / service / request / serve / install-task, 16 vitest, tsc clean, dry runs ok (train 31
bins 895 / 894 s). Follow-up in progress: failure comments carry assert + log path + last ~40 lines (Michael ~19:25).
Builder deviations to check: old train heads skipped (ancestor of master or > 24 h, LQ_TRAIN_MAX_AGE_H); weights seeded
from scripts/e2e-times.json; aged alone blocks new pr work until both slots idle; "known flaky" in the description;
self-update via LQ_FOLLOW (set origin/feature/laptop-queue until merged); crash mid-train after `pending` is not
re-run (needs a fix: treat a stale own `pending` as not done); eslint ignores scripts/**/*.mjs (config).
Worktree node_modules is a junction to Mobile-Coop-testrun-4189/node_modules (gitignored).

## Next
1. S1 build lands (lib / service / request / serve / install-task, tests, testing-tools section, fragment).
2. Fresh Opus checker on S1 (one fix round at most).
3. Live overlap: svc worktree C:/NightShift/Mobile-Coop-laptop-queue-svc, one pr request + the next train through the
   service beside the manual chains; sharded train wall vs one slot (JOBS=5 316 s, JOBS=3 559 s).
4. PR (train-ready), message the orchestrator, tell the leads the request command.

## Open
- feature/e2e-affected (`run-e2e.mjs --affected origin/master --list`) not on master yet: requests list suites.

## Done
- 2026-10-23 ~19:15: job started (orchestrator, Michael approved ~19:10).

## Resume prompt
```
Night Shift | Test Runner, laptop-queue job: read docs/laptop-queue/BRIEF.md, PLAN.md and this STATE on
origin/feature/laptop-queue (worktree C:/NightShift/Mobile-Coop-laptop-queue). Do "Next" in order. The manual queue
(docs/flake-fix/STATE.md newest SAVE) keeps priority until the service is live.
```
