# test-runner-j20: state

## Resume block
- Folder `C:/NightShift/Mobile-Coop-test-runner-j20`, branch `feature/test-runner-j20` (upstream origin), base master
  2148ec969. Guard before every write: `git -C C:/NightShift/Mobile-Coop-test-runner-j20 branch --show-current`.
- Job: FOLDED-PLAN J20 (Test Runner batch). Read `docs/archive/test-runner-j20/BRIEF.md` (Michael's Q27 / Q30 / Q31, A1-A11)
  and `docs/archive/test-runner-j20/PLAN.md` (slices, builder briefs with file:line on 2148ec969, PR grouping).
- Plan: Opus plan checker PASS on 4341582a5 (`plan-checker` status posted 2026-10-25 ~18:40).
- Worktrees `C:/NightShift/Mobile-Coop-test-runner-j20-<slice|prc|pra>`, branches `feature/test-runner-j20-<...>`,
  node_modules junctioned to this worktree's; typecheck with a per-slice buildinfo in
  C:/NightShift/scratch/tsc-j20-<slice>.tsbuildinfo, never typecheck:fast (shared cache). Builders never run
  service.mjs (its --dry-run fetches into the shared repo store).
- Status 2026-10-26: PR-C (#445, train 111) and PR-A (#492, train 116) merged. PR-B (#538, `-prb2`) conflicted with
  master again (#552, #572, #586, #587, #597); re-ported as `feature/test-runner-j20-prb3` (worktree
  `C:/NightShift/Mobile-Coop-test-runner-j20-prb3`) on current master: S3b, S3a, S7 and D-B, master's code kept where
  it covers the same thing (F48 one automatic list: the desktop decides no quarantine or blocking; affectedPick's wire
  rule and cap: report suites take only the slots the cap leaves, lib `affectedReport`; kept / split bins in
  runRequest). Precheck j20-parity-pre-1..3 on master b81c4945: all green, so parity ships ON. PR body carries
  `Job-done: test-runner-j20`, the fixjob alert kind and the RULES "Test tiers" train-row line (the orchestrator's).
  Checker polish for later: report names unknown at the sha, perfStep on chained steps.
- Watcher (background, this session only): scratchpad watch-j20.sh exits on the first J20 queue result.
- Sent: Sector Ops (Q27 + loadSection), Guard AI (Math.random x5: acked, after J6 alloc and PR-C; ping it when PR-C
  merges), orchestrator (PR-C open, fixjob alerts, J20 shape). Still to send: Marlow Build (H8 check in e2e-ctcourse).
- S7 way out: `config/train-parity.json` `{ "off": true, "why", "by" }` on the `laptop-queue` branch, or
  `LQ_TRAIN_PARITY=off` per worker.
- Out of scope: Q31 load time (Sector Ops, J21), T14 allocations (Player / Sector Ops, J21).
- Next: fresh checker on the PR-B head, then train-ready; on its merge the train archives `docs/archive/test-runner-j20/`.

## Done
- 2026-10-25: BRIEF, PLAN, STATE, fragment placeholder (Opus planner, master 2148ec969); head d395132e8.
- 2026-10-25: fix round for the plan checker FIX on d395132e8.
- 2026-10-26: PR-B ported to `-prb2` on master 99fbd37f with D-B (Opus builder).
- 2026-10-26: PR-B re-ported to `-prb3` on current master (Opus builder).
