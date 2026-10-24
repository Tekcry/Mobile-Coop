# Resume - Night Shift | Player Build (2026-10-24 ~18:10 local, resumed on the new account; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (master 6e8a450b train 56; resumed 2026-10-24 ~18:00 local on the new account)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models | feature/guard-models | dbfec6ad + merge in flight | Laptop green: G9 16/17 on 89c10827 + e2e-offline (set guard-models-sw) on aba0953a. Was CONFLICTING (src/ai/body.ts, enemyManager.ts) + CI test FAIL (visionIsolation: guardBody.ts setHeat; render-only like dogModel -> exempt). Opus agent merging master + test fix. Then: merge gm-perf (after its checker), flip src/core/flags.ts guardModels `!== '0'`, flag-on laptop suites (enemies, coop, ctcourse, combat, guard-carry), label train-ready. |
| guard-models perf | feature/gm-perf | a64fb335 | Cap A/B on 408ab154 = GATE PASS (origin/shots/gm-perf-408ab154): 24 guards frame p95 ON/OFF sectorops patrol 6.5/6.5, alert 7.2/7.4; campus patrol 9.0/9.7, alert 9.2/10.0. Opus checker running (reports/GM-PERF-CHECK.md). S13 armour merge not measured (fewer meshes; optional perf.mjs). |
| #314 optic-coop | feature/optic-coop | 979da9d7 + merge in flight | Checks A/B/R3 PASS, laptop coop+netmove 52258028 + pad+mouse c69b698c PASS, CI green. Was CONFLICTING (src/net/remotePlayer.ts, tests/net.test.ts): Opus agent merging master. Then CI -> label train-ready. |
| G10a guard defects (plan) | - | - | Opus plan of the lead-found sheet defects (shield missing, debug markers, seam gaps) -> C:/NightShift/scratch/ctcore/briefs/gm-g10a.md. Look items wait on Michael's sheet notes (G10). |

#308 rig-pose-fix: DONE (4.92.0; e2e-course pass; tuner-phone solo pass on 23353993, so the train-54 failure was a flake: fix the e2e-tuner-phone drawer scroll wait in the next Player batch PR).

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
