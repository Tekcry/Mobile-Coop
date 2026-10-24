# Resume - Night Shift | Player Build (2026-10-24 ~19:45, SAVE at weekly 91%; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (master 4.92.0 has #308 rig-pose-fix)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models (flag OFF) | feature/guard-models (guard-models) | dbfec6ad | Laptop G9 set on 89c10827 (20261024T043619-...-6637) + e2e-offline on aba0953a (52107-...-3749); delta since 89c10827 = SW + docs + tests. Green -> gh pr edit 318 --add-label train-ready + orchestrator. Wire: G6n `al` look bits (train bumps PROTOCOL). |
| guard-models perf | feature/gm-perf (gm-perf) | 408ab154 | Cap A/B queued (set gm-perf-cap, 20261024T045507-...-c37c; Test Runner pushes shots/*). Gate: figures ON within +0.5 ms CPU p95 of OFF at 24 guards (was +1.1 to +2.5). Read render.figure vs render.s1 and active_gun_per_guard. Pass -> merge gm-perf into guard-models, flip src/core/flags.ts guardModels to `!== '0'`, docs. S13 DONE a64fb335 (PERF-REPORT "## S13"): the 15-19 meshes were the rifle as 18 parts, already merged by master perfg (in 408ab154 via the master merge); S13 adds armour + shield merges (geared guard 7 -> 4). The 408ab154 cap run measures gun + F1 + F2; armour merge needs a perf.mjs run (MAP=warehouseOps MODE=sector EXTRA=guardmodels=0) before / after. Next: read the cap; pass -> merge gm-perf into guard-models (+ an Opus checker on gm-perf), flip the flag. |
| #314 optic-coop | feature/optic-coop (optic-coop) | 979da9d7 | Checks A / B / M-fix RECHECK / R3 all PASS. Waiting: CI, laptop coop + netmove on 52258028 (40217-...-60f5), pad + mouse on c69b698c (41745-...-47f6). Green -> label train-ready. Michael M1 (gap optic from the action menu), M2 (ping middle mouse / R3; R3 zoom only while scoped) are in docs/optic-coop/BRIEF.md. |
| #308 rig-pose-fix | feature/rig-pose-fix | eab79164 | RELEASED in 4.92.0. Confirmation runs: e2e-course (52232-...-f1c7), e2e-tuner-phone flake check (51717-...-cb4a): a failure -> follow-up PR. |

## Open
- guard-models STATE.md top: G8 numbers, S11 merge notes (in master merge now), G10 look list (no sheet notes from Michael yet), garment seam gaps, MERGE-CHECK-A/B polish (lightRig caster refill not behind the flag; `die` figure update after frozen solveNow).
- Test Runner owns guard-render phase 2 (feature/guard-render-2 PLAN2: S9 sun cascades, S9b updateSunCasters skip disabled, S10 freeze); guard-cap.mjs is ours until guard-models merges.
- Spare jobs #2 #3 #7 #11 #16 already on master; #12 = #308; #15 = #314.
- AF7-AF9 (briefs/afp-next-pass.md) wait for Michael's walk of AF0-AF6.

## Resume prompt
```
Night Shift | Player Build: RESUME after the account swap. Model Opus, effort medium. set_session_title "self" ->
"Night Shift | Player Build". Read CLAUDE.md (origin/master "Sessions"), then docs/orchestrator/resume-ct-core.md on
origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to
C:/NightShift/scratch/ctcore/resume-ct-core.md and push updates with scratch/ctcore/push-resume.sh. A heavy.lock /
heavy2.lock naming Player Build with no node / bash process of ours is stale: delete it. Turn off unused connectors.
Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / Michael needed. Work "Now" top down:
check each laptop status listed, label green PRs train-ready. e2e always E2E_GPU=1.
```

## History
- Full log before 2026-10-24 ~19:45: git history of this file on feature/menu (and scratch/ctcore/resume-history-2026-10-24.md on the desktop).
