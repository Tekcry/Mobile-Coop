# flake-fix - state

**Done (2026-10-22):** PR #117 merged as 4.54.1 (6c2d50a4, ~15:20). Proven on 2b05f423 (check + netmove, mouse,
ctcourse, stealth-ai twice at JOBS=2). This file now also carries Character Build's resume (the last fenced block).

**Character Build now (2026-10-22 ~16:20):**
- Verdicts sent (CT Core, Course Ready, orchestrator copied): anim-bake-all a850e103 FAIL at check
  (animSkeletonRows.test.ts:127 never-allocate, 7981152 bytes; solo fail, fail, pass; master pass 3/3: real regression).
  N4b 0a6bc567 FAIL at check (tunerLayout.test.ts: sec:cq has no tab, cq:holdTwist label 33 chars; deterministic).
  The train/4 e2e-pad solo rerun was dropped (#121 merged).
- Laptop queue: sectorfixesc-6a144e53 (Menu Notes: build + e2e-ctcourse e2e-coop e2e-netmove, JOBS=1, running),
  animn1-1e4556a8 (CT Core N1: check + e2e-clip e2e-anim e2e-move, JOBS=1, waiting), then chain-1022e.ps1:
  Course Ready N4b 149003aa (check + 7 suites, JOBS=2), then the pad-wheel-wait proof on 27a54dfd (build + e2e-pad solo; e2e-pad e2e-move twice at JOBS=2).
- Own job pad-wheel-wait: branch feature/pad-wheel-wait (C:/NightShift/Mobile-Coop-pad-wheel-wait, off master 9287a095,
  node_modules a junction to the flake-fix worktree, never npm ci there). 27a54dfd: scripts/e2e-pad.mjs, the
  (sector-fixes W) stick-right / let-go step waits 0.3 s of sim time (`__afterSim`) instead of 300 ms wall. Pushed,
  PR not opened yet: open it once the proof passes (tests-only tier: CI + e2e-pad solo), tell the orchestrator.

## Done
- 2026-10-22 ~15:20: PR #117 merged (4.54.1).
- 2026-10-22 ~13:45: lint, vitest, checker FIX, fix rounds 1 (bd8e5ebf) and 2 (e5211e02); proof on 2b05f423.
- 2026-10-22: BRIEF, STATE; implementer 1 (stopped for usage) -> WIP 58bb1b31; implementer 2 -> WIP commit.

## Resume prompt
```
Night Shift | Character Build (laptop, the test runner). Read CLAUDE.md "Sessions" ("The laptop is the test runner"; the laptop is a full slot: Normal priority, E2E_JOBS=2), then the "Character Build now" section of docs/flake-fix/STATE.md on origin/feature/flake-fix. Message "Night Shift | Orchestrator" that you are back and ask for the queue.

Runner: C:/NightShift/scratch/laptop-runner.ps1 (header explains; results C:/NightShift/scratch/runs/<label>/summary.txt, DONE at the end; chain log C:/NightShift/scratch/runs/chain-1022.log). Launch hidden: set RUN_JOBS (2, or 1 for solo), then Start-Process powershell.exe -WindowStyle Hidden with -File laptop-runner.ps1 -Label <label> -Commit <sha> -Steps '"<steps>"'. Only one waiting runner at a time (two waiters race for heavy.lock): queue the next once the current holds the lock, or chain them in one script. Port 4191. Solo-rerun any JOBS=2 failure on the same commit before calling it real. Reply to the requester with pass / fail per suite, failing assert, times and commit; copy the orchestrator. Order: CT Core, Menu Notes, Course Ready requests, then own jobs.

First collect the queue's verdicts (sectorfixesc-6a144e53 to Menu Notes, animn1-1e4556a8 to CT Core, animn4b-149003aa to Course Ready, padwait-27a54dfd-{solo,j2a,j2b} for the own job) and send them. Own job: if the pad proof passes, open the PR for feature/pad-wheel-wait (test-only, tier CI + e2e-pad solo) and tell the orchestrator; on a fail, read the suite log and fix. Pacing: docs/orchestrator/STATE.md "Pacing" on origin/feature/menu (full burn; get_usage before each agent; 97% no new agent, 98% commit + push + STATE, stopped by 99%). Branch guard before every write. Native multiple choice only, hyphens not em dashes.
```
