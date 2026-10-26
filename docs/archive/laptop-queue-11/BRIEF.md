# laptop-queue-11 - brief
Owner: Test Runner. Status: current.

Small fix job under the fix freeze, branch `feature/laptop-queue-11` from origin/master bea28daec. Rows F35, F36 of
`docs/orchestrator/FIXES.md` (origin/feature/menu).

- F36 (the bug): lib `suiteParts` expanded a named suite from the keys of times.json. Those keys go stale and differ
  from the head being run (times.json today: `e2e-desktop:3`, `e2e-sectorops:mission`; #568 moves e2e-sectorops to
  parts 1-9). A sharded plain `e2e-sectorops` request on #568's head would run 1-6 only, and master heads could be
  sharded into parts that do not exist. Fix: the run-time shard expands from the head's own run-e2e; the planning uses
  never invent parts the head lacks. Unknown parts with no time get a default weight.
- F35: #568's runner prints `SLOW: <suite> <s>s of <limit>s` (a passing suite over 75% of its kill limit). The queue
  reads it from a finished run's logs and raises it on the run's status description (140 chars max) and in
  `flake-budget.md`. Harmless when no SLOW line exists (master today).
- Out of scope: `scripts/run-e2e.mjs`, `scripts/e2e-verdict.mjs` (#568 owns them). Keep hunks small and away from
  feature/laptop-queue-10b (Player Build) and feature/laptop-queue-9 (Marlow).
