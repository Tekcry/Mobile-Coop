# Test Runner batch (J20), PR-C: quarantine and hard-rule checks
kind: patch
- Every REQUIRED e2e suite has an owner in `scripts/e2e-quarantine.json`, and `tests/e2eQuarantine.test.ts` checks the
  file (owners, complete entries, ISO expiry, each quarantined suite written up in `docs/backlog.md`).
- New unit tests for three hard rules: no route timer in Sector Ops (rule 6), the graphics import boundary (rule 10)
  and patrol and detection replay under a poisoned `Math.random` (rule 8).
- `e2e-sectorops` part 6 checks every spawned guard is alive at start on Saltmarsh Park sections 2-5, and `e2e-ctcourse`
  checks every guard is alive at each Marlow Yard set (rule 9).
