# flake-fix - state

**Done (2026-10-22):** PR #117 merged as 4.54.1 (6c2d50a4, ~15:20). Proven on 2b05f423 (check + netmove, mouse,
ctcourse, stealth-ai twice at JOBS=2). This file now also carries Character Build's resume (the last fenced block).

**Character Build now (2026-10-22 ~17:55):**
- Verdicts sent (CT Core, Course Ready, orchestrator copied): anim-bake-all a850e103 FAIL at check
  (animSkeletonRows.test.ts:127 never-allocate, 7981152 bytes; solo fail, fail, pass; master pass 3/3: real regression).
  N4b 0a6bc567 FAIL at check (tunerLayout.test.ts: sec:cq has no tab, cq:holdTwist label 33 chars; deterministic).
  The train/4 e2e-pad solo rerun was dropped (#121 merged).
- Verdicts sent ~16:30-16:45: sector-fixes C 6a144e53 (JOBS=1): ctcourse PASS 326 s, netmove PASS 127 s, coop FAIL
  137 s on a teardown pageerror only ("postMessage on BroadcastChannel: Channel is closed", localTransport.ts:15), all
  asserts ok; offered Menu Notes a second solo coop run. bake-all cba9e371 (JOBS=2): all 12 suites PASS, wall 283 s.
  N1 1e4556a8 and N4b 149003aa moved to the desktop (orchestrator). The a850e103 alloc "regression" was withdrawn
  (CT Core: GC timing, same on master).
- Own job pad-wheel-wait: PR #126 open (27a54dfd, test only); the orchestrator put it on train/5 as 47fecb0b
  (e2e-pad solo PASS 47 s there).
- train/5 4c10c8fc full e2e (JOBS=2, ~17:20): 32 ok; e2e-lightbake load (solo PASS); e2e-clip real (#118's slower
  draw vs the test waits, Menu Notes fixing); e2e-coop real (teardown pageerror). #125 c19b28fe (that fix) PASS at JOBS=2.
- Michael 17:50 (CLAUDE.md cbf7c0de on feature/menu): the laptop is the MAIN test machine, GPU included: Normal priority,
  E2E_JOBS=3 for full runs and trains, GPU / visual runs (anim-audit, anim-sheet, shots, E2E_GPU=1 suites) on port 4189.
  Runner: RUN_GPU=1 sets E2E_GPU=1 + port 4189; a step starting "node "/"npm "/"npx " runs as given.
- Queue (~17:55): animn4b-1e442236 (Course Ready #119: check + e2e-clip e2e-netmove e2e-coop e2e-ctcourse, JOBS=1,
  running), then studiopairs-8091de94-gpu (Course Ready: build + audit.mjs studio --only=10 pair rows, audit.mjs copied
  untracked into the testrun worktree from origin/feature/anim-natural 42cdfba6; outputs under the worktree's
  docs/anim-natural/audit/: push them to branch shots/studio-pairs-8091de94, send exit code, log tail, paths).

## Done
- 2026-10-22 ~15:20: PR #117 merged (4.54.1).
- 2026-10-22 ~13:45: lint, vitest, checker FIX, fix rounds 1 (bd8e5ebf) and 2 (e5211e02); proof on 2b05f423.
- 2026-10-22: BRIEF, STATE; implementer 1 (stopped for usage) -> WIP 58bb1b31; implementer 2 -> WIP commit.

## Resume prompt
```
Night Shift | Character Build (laptop, the MAIN test machine, GPU included). Read CLAUDE.md "Sessions" on origin/feature/menu ("Main test machine: the laptop" and "The laptop is the test runner"), then the "Character Build now" section of docs/flake-fix/STATE.md on origin/feature/flake-fix. Message "Night Shift | Orchestrator" that you are back and ask for the queue.

Runner: C:/NightShift/scratch/laptop-runner.ps1 (header explains; results C:/NightShift/scratch/runs/<label>/summary.txt, DONE at the end; chain log C:/NightShift/scratch/runs/chain-1022.log). Launch hidden: set RUN_JOBS (2, or 1 for solo), then Start-Process powershell.exe -WindowStyle Hidden with -File laptop-runner.ps1 -Label <label> -Commit <sha> -Steps '"<steps>"'. Only one waiting runner at a time (two waiters race for heavy.lock): queue the next once the current holds the lock, or chain them in one script. Port 4191. Solo-rerun any JOBS=2 failure on the same commit before calling it real. Reply to the requester with pass / fail per suite, failing assert, times and commit; copy the orchestrator. Order: CT Core, Menu Notes, Course Ready requests, then own jobs.

Collect the queue's results (see Queue above) and send them, then ask the orchestrator for the queue. Own job: PR #126 (pad-wheel-wait) open; if CI fails, read it and fix on the branch. Pacing: docs/orchestrator/STATE.md "Pacing" on origin/feature/menu (full burn; get_usage before each agent; 97% no new agent, 98% commit + push + STATE, stopped by 99%). Branch guard before every write. Native multiple choice only, hyphens not em dashes.
```
