# affected-flake - state

Process audit 2026-10-24 findings 5 + 12 (docs/orchestrator/PROCESS-AUDIT-2026-10-24.md on feature/menu), Michael
approved ~21:55. Lead: Night Shift | Test Runner. Worktree C:/NightShift/Mobile-Coop-affected-flake, off master 92d0205d.

## Now (2026-10-24 ~22:35)
- (1) auto affected-e2e: f43596ec (lib helpers) + 10dbea9a (service pass every LQ_AFFECTED_POLL_MIN, verdict on
  `affected-e2e`, newer head supersedes). Built by the previous account; no checker verdict recorded.
- (2) flake budget + quarantine: lib.mjs "flake budget and quarantine" block (quarantined, suiteOwner, countRuns,
  flakeBudget, autoQuarantine, flakeSummary; flakeStands removed), service.mjs updateBudget() before finish's comment,
  E2E_QUARANTINE_FILE in e2e(); scripts/e2e-quarantine.json (owners + e2e-pad); run-e2e.mjs reads both lists.
  Docs: testing-tools.md "Known flaky = quarantined" + "Flakes and the flake budget"; backlog "Flaky e2e suites".
- Assumed A1: budget 2 flakes / 7 d, auto quarantine 48 h; undo = lib FLAKE_BUDGET / QUARANTINE_TTL_MS.
- Assumed A2: suite owners in e2e-quarantine.json by area (Marlow ctcourse/course/section-rating, Sector Ops
  sectorops/lightbake, Guard AI stealth-ai/guard-carry/tactics, Player the rest of movement/coop); unknown = Orchestrator.
- Assumed A3: no seed quarantine for ctcourse:1 / sectorops:1 / :6 (the fix order): the budget quarantines them when
  they go over, owners fix them in that order.

## Next
- One Opus checker on the branch head (both parts) + laptop request smoke e2e-pad on the same commit; FIX round if
  needed; CI green; PR to master; train-ready; message the Orchestrator.
