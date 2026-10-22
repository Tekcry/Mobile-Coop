# flake-fix - state

**Now (2026-10-22 ~13:45, new account):** fixes verified except the final proof. Lint 0 errors, vitest 242 files
pass. Checker (fresh): FIX - stealth-ai vetted grid spots, not the guard's real standing point; ctcourse cause
overstated. Fix round 1 bd8e5ebf (snapped points, ctcourse cause "suspected", `teamLog` prints the press gates).
Proof on 54c3576d (JOBS=2, two rounds): netmove, mouse, ctcourse 2/2 pass; stealth-ai 0/2 (the strict filter left no
spot: the head-only wedge is a few cm wide). Fix round 2 e5211e02 (5 cm floor grid, per-step sway check, a passive
grunt placed on the exact spot, the guard's own los + head at every think over 2 s): stealth-ai 2/2 at JOBS=2.
**Next:** final proof on e5211e02 (label flakefix-e5211e02-proof: check + the four suites twice at JOBS=2, queued
behind run requests); then PR (test-only tier: CI + the edited suites) and tell "Night Shift | Orchestrator".

## Done
- 2026-10-22 ~13:45: lint, vitest, checker FIX, fix rounds 1 (bd8e5ebf) and 2 (e5211e02); proof partial.
- 2026-10-22: BRIEF, STATE; implementer 1 (stopped for usage) -> WIP 58bb1b31; implementer 2 -> this WIP commit.

## Resume prompt
```
Night Shift | Character Build (new account, LAPTOP). You are the laptop test runner plus small jobs. Read CLAUDE.md "Sessions" (esp. "The laptop is the test runner" and the merge-train test tiers on master), docs/ROADMAP.md, then message "Night Shift | Orchestrator" that you are up and ask for the queue.

Test runner: worktree C:/NightShift/Mobile-Coop-testrun (detached at each requested commit). Runner script C:/NightShift/scratch/laptop-runner.ps1 (header explains: -Label -Commit -Steps "check;full" or "build;<suites>", RUN_JOBS env, results in C:/NightShift/scratch/runs/<Label>/summary.txt with DONE at the end). Launch hidden and headless:
  powershell -NoProfile -Command "Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\NightShift\scratch\laptop-runner.ps1','-Label','<label>','-Commit','<sha>','-Steps','\"<steps>\"'"   (set RUN_JOBS=2 first; 1 for solo reruns)
Rules: E2E_PORT 4191, E2E_JOBS=2 normal priority (laptop is a full slot until Michael says otherwise), one run at a time, C:/NightShift/heavy.lock created atomically (never overwrite; delete only your own line). Solo-rerun (RUN_JOBS=1) any JOBS=2 failure on the same commit before calling it real. Reply to the requester with pass / fail per suite, the failing assert, times and the commit; copy the orchestrator. A result counts only for the exact commit.

Own job in progress: flake-fix, branch feature/flake-fix in C:/NightShift/Mobile-Coop-flake-fix (branch guard before every write). Read docs/flake-fix/BRIEF.md and STATE.md and continue from STATE "Next" between test requests (test runs first). Opus implementer + fresh checker, one fix round. Usage rule (Michael): check get_usage before each agent; at 97% start no new agent, at 98% commit, push and update STATE, stopped by 99%. Native multiple choice only, hyphens not em dashes.
```
