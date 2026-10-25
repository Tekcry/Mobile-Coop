# test-runner-j20: state

## Resume block
- Folder `C:/NightShift/Mobile-Coop-test-runner-j20`, branch `feature/test-runner-j20` (upstream origin), base master
  2148ec969. Guard before every write: `git -C C:/NightShift/Mobile-Coop-test-runner-j20 branch --show-current`.
- Job: FOLDED-PLAN J20 (Test Runner batch). Read `docs/test-runner-j20/BRIEF.md` (Michael's Q27 / Q30 / Q31, A1-A11)
  and `docs/test-runner-j20/PLAN.md` (slices, builder briefs with file:line on 2148ec969, PR grouping).
- Status: BRIEF + PLAN written and pushed (planner Opus); plan checker not run; no code yet.
- Parallel now (group A, no shared files): S1 (Sonnet), S3b (Opus), S4 (Sonnet), S5 (Sonnet), S6a (Sonnet),
  S6b (Sonnet), S6c (Sonnet). Then S2 and S3a (Opus, after S1; S3a also after S3b), then S7 (Opus, after S3a and the
  e2e-darkness precheck). Docs slices D-A / D-B / D-C close each PR.
- PRs: PR-C (S4, S6a-c) first, then PR-A (S1, S2, S5), then PR-B (S3b, S3a, S7). Last PR body: `Job-done: test-runner-j20`.
- Messages to send: Sector Ops Build (Q27: e2e-darkness is the train parity check until J11's per-map cards; H8 uses
  `loadSection`), Guard AI Build (H7 fix request: Math.random at enemy.ts:389,2336, enemyManager.ts:650,661,
  reconDrone.ts:34), Marlow Build (H8 in e2e-ctcourse), orchestrator (claims overlap with
  feature/mission-engine-flg-gb6; RULES "Test tiers" train row after S7).
- Out of scope: Q31 load time (Sector Ops, J21), T14 allocations (Player / Sector Ops, J21).
- Fragment: `changes/feature-test-runner-j20.md` (kind: patch, placeholder; fill per PR).
- Next: run the plan checker (`docs/templates/plan-check.md`; `node scripts/claims-check.mjs --plan docs/test-runner-j20/PLAN.md --name feature/test-runner-j20`), then start group A builders.

## Done
- 2026-10-25: BRIEF, PLAN, STATE, fragment placeholder (Opus planner, master 2148ec969).
