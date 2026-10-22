# flake-fix - state

**Now (2026-10-22 ~13:00, account handoff):** WIP, paused. All four load-flaky steps have a fix written in the tests
(causes and fixes in `docs/backlog.md` "Flaky e2e suites", entry "Four load flakes"; CHANGELOG line added):
e2e-stealth-ai (peek spot checked over 4 s of the held peek with a 1 cm margin), e2e-netmove (`watchTeam` in
`scripts/e2e-net-lib.mjs` logs every team state with sim time), e2e-mouse (the page times the capture give-up),
e2e-ctcourse station 4 (the press waits until the client's view of the host matches the host). Syntax ok.
NOT yet verified: `npm run lint`, `npx vitest run`, and the proof (the four suites twice at E2E_JOBS=2) - the
implementer was stopped at the handoff before its proof run finished; no result was recorded.
**Next:** lint + vitest; review the diff (`git diff 71ce1bff HEAD -- scripts docs/backlog.md`) against BRIEF ("never
loosen what a test proves"); the proof runs; one checker; PR (test-only tier: CI + the edited suites); tell
"Night Shift | Orchestrator".

## Done
- 2026-10-22: BRIEF, STATE; implementer 1 (stopped for usage) -> WIP 58bb1b31; implementer 2 -> this WIP commit.

## Resume prompt
```
Night Shift | Character Build (new account, LAPTOP). You are the laptop test runner plus small jobs. Read CLAUDE.md "Sessions" (esp. "The laptop is the test runner" and the merge-train test tiers on master), docs/ROADMAP.md, then message "Night Shift | Orchestrator" that you are up and ask for the queue.

Test runner: worktree C:/NightShift/Mobile-Coop-testrun (detached at each requested commit). Runner script C:/NightShift/scratch/laptop-runner.ps1 (header explains: -Label -Commit -Steps "check;full" or "build;<suites>", RUN_JOBS env, results in C:/NightShift/scratch/runs/<Label>/summary.txt with DONE at the end). Launch hidden and headless:
  powershell -NoProfile -Command "Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\NightShift\scratch\laptop-runner.ps1','-Label','<label>','-Commit','<sha>','-Steps','\"<steps>\"'"   (set RUN_JOBS=2 first; 1 for solo reruns)
Rules: E2E_PORT 4191, E2E_JOBS=2 normal priority (laptop is a full slot until Michael says otherwise), one run at a time, C:/NightShift/heavy.lock created atomically (never overwrite; delete only your own line). Solo-rerun (RUN_JOBS=1) any JOBS=2 failure on the same commit before calling it real. Reply to the requester with pass / fail per suite, the failing assert, times and the commit; copy the orchestrator. A result counts only for the exact commit.

Own job in progress: flake-fix, branch feature/flake-fix in C:/NightShift/Mobile-Coop-flake-fix (branch guard before every write). Read docs/flake-fix/BRIEF.md and STATE.md and continue from STATE "Next" between test requests (test runs first). Opus implementer + fresh checker, one fix round. Usage rule (Michael): check get_usage before each agent; at 97% start no new agent, at 98% commit, push and update STATE, stopped by 99%. Native multiple choice only, hyphens not em dashes.
```
