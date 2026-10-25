# test-runner-j20: state

## Resume block
- Folder `C:/NightShift/Mobile-Coop-test-runner-j20`, branch `feature/test-runner-j20` (upstream origin), base master
  2148ec969. Guard before every write: `git -C C:/NightShift/Mobile-Coop-test-runner-j20 branch --show-current`.
- Job: FOLDED-PLAN J20 (Test Runner batch). Read `docs/test-runner-j20/BRIEF.md` (Michael's Q27 / Q30 / Q31, A1-A11)
  and `docs/test-runner-j20/PLAN.md` (slices, builder briefs with file:line on 2148ec969, PR grouping).
- Plan: Opus plan checker PASS on 4341582a5 (`plan-checker` status posted 2026-10-25 ~18:40).
- Worktrees `C:/NightShift/Mobile-Coop-test-runner-j20-<slice|prc|pra>`, branches `feature/test-runner-j20-<...>`,
  node_modules junctioned to this worktree's; typecheck with a per-slice buildinfo in
  C:/NightShift/scratch/tsc-j20-<slice>.tsbuildinfo, never typecheck:fast (shared cache). Builders never run
  service.mjs (its --dry-run fetches into the shared repo store).
- Status 2026-10-25 ~19:05 (all slices except S7 / D-A / D-B built):
  - PR-C #445 (`-prc` 0eed874e: S4, S6a, S6b, S6c, D-C): Opus checker PASS posted. Queue `laptop-e2e/j20-s6c` on the
    S6c head b22bcbc3 is the gate; known risks in the PR comment (S2 guard 7.1 m vs the 7 m spawn deferral, S3 slots
    without y vs the 4.4 deck). Red: move the player ~1 m off the start and use the start's y as the floor fallback.
  - PR-A (`-pra` 0d7eab1e: S1 + S2 + S5): checker FIX (e2e-verdict.mjs picked as a phantom suite) fixed by me; a narrow
    Opus re-check was running. Queue `laptop-e2e/j20-pra` (smoke e2e-move) on 0d7eab1e. Not opened yet: D-A goes on
    after PR-C merges (master), then open PR-A. S5 perf alone run j20-perf on 58125696 (information for J21).
  - PR-B: `-s3a` b4464dbd (S3b + S1 merge + S3a + NOT_SUITE_SCRIPTS e2e-verdict); Opus checker was running. S7 waits for
    the darkness precheck (j20-parity-pre-1..3 on master b81c4945) and Sector Ops' Q27 reply; then `-prb` = s3a + S7,
    D-B after PR-A merges; PR-B body: `Job-done: test-runner-j20`, the fixjob alert kind, the RULES train-row line.
- Sent: Sector Ops (Q27 + loadSection), Guard AI (Math.random x5: acked, after J6 alloc and PR-C; ping it when PR-C
  merges), orchestrator (PR-C open, fixjob alerts, J20 shape). Still to send: Marlow Build (H8 check in e2e-ctcourse).
- S7 way out: `config/train-parity.json` `{ "off": true, "why", "by" }` on the `laptop-queue` branch, or
  `LQ_TRAIN_PARITY=off` per worker.
- Out of scope: Q31 load time (Sector Ops, J21), T14 allocations (Player / Sector Ops, J21).
- Next: read the two checker verdicts and the queue runs; post `checker` on PR-A / PR-B heads; build S7 after the
  precheck; D-A on PR-C's merge.

## Done
- 2026-10-25: BRIEF, PLAN, STATE, fragment placeholder (Opus planner, master 2148ec969); head d395132e8.
- 2026-10-25: fix round for the plan checker FIX on d395132e8.
