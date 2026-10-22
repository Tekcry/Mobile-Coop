# flake-fix - state

**Done (2026-10-22):** PR #117 merged as 4.54.1 (6c2d50a4, ~15:20). Proven on 2b05f423 (check + netmove, mouse,
ctcourse, stealth-ai twice at JOBS=2). This file now also carries Character Build's resume (the last fenced block).

**Character Build now (2026-10-22 ~18:05):**
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
- Michael 17:50 (CLAUDE.md cbf7c0de / 13c7f6a6 on feature/menu): the laptop is the MAIN test machine, GPU included,
  Normal priority, E2E_JOBS=3 for full runs and trains. Two request slots at once, one per port, plus GPU as a third
  slot if CPU allows. A result also stands for a later commit whose only diff is docs / CHANGELOG / fragments / test
  scripts. Runner: -Slot 4191 (worktree Mobile-Coop-testrun) / 4192 (Mobile-Coop-testrun-4192) / 4189 GPU
  (Mobile-Coop-testrun-4189, E2E_GPU=1); lock C:/NightShift/heavy-<slot>.lock; raw "node "/"npm "/"npx " steps run as given.
- Sent ~18:00: #119 N4b 1e442236 solo: check, ctcourse, netmove PASS; e2e-clip FAIL "ladder down + slide" 30.1 cm;
  coop FAIL on the #125 teardown pageerror only.
- Running (~18:05): 4189 studiopairs-8091de94-gpu (Course Ready audit, under the old heavy.lock in the 4191 worktree:
  push docs/anim-natural/audit outputs to shots/studio-pairs-8091de94, send exit code, log tail, paths); 4192
  animn2-53e6dc03 (CT Core: check + e2e-anim e2e-studio e2e-clip; report e2e-anim ASSERTs, "rifle low ready jog"
  elbow, walk / low ready walk knee-out, run row, body motion block; bodyMotion alloc test is a known flake); then
  4189 sectorfixesl-f21cc2b1-gpu (Menu Notes: sector-lights-shots after + --sheet + e2e-darkness; commit outputs in
  docs/sector-fixes/l to feature/sector-fixes "sector-fixes L: GPU after shots and sheet (laptop)").
- Gap job test-speed-2 (orchestrator): feature/test-speed-2 in C:/NightShift/Mobile-Coop-test-speed-2 (off master
  170ee701, node_modules junction to testrun-4192). Goal full e2e ~27 -> ~15 min, tests only; an Opus implementer edits
  the six slow suites (no runs); its notes go to docs/test-speed-2/STATE.md. Proof: two full runs (JOBS=3) on a slot.

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
