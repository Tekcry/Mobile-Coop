# Resume - Night Shift | Player Build (2026-10-24 ~20:25 local; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (master bd54dfcd 4.95.3; resumed 2026-10-24 ~20:40 local, new account)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models, #314 optic-coop, #331 player-batch-24 | - | - | MERGED (trains 58 / 59 / 62). |
| gm-flip (follow-up PR, open it from THIS branch, never from gm-perf) | feature/gm-flip (node_modules junction) | 7c0c0456 | guard-models + gm-perf + gm-mc-polish + gm-perf-polish + gm-look-seeds (all PASS) + MERGE-CHECK polish, ONE fragment changes/feature-gm-flip.md. Next: merge gm-g10a after its rebake passes and the GLBs are copied in, flip src/core/flags.ts guardModels `!== '0'`, laptop flag-on suites (enemies coop ctcourse combat guard-carry), PR to master. |
| G10a guard defects | feature/gm-g10a | 81a1f3b8 | Laptop request WITHDRAWN 21:30 (orchestrator OK: full bake on the DESKTOP, heavy.lock, BelowNormal, release at once). Desktop haircaps smoke 21:32: receding LOD1 102.6 / 100.8 deg FAIL (> 75), all other caps pass. Opus builder on the fix (briefs/gm-g10a-hairline-fix.md: corner_slide). Then full desktop bake (the 8 steps of request 7ccf), copy 12 GLBs + 3 JSON into src/operators/assets/guards/, D6 assertion in tests/guardAssets.test.ts, sheet to Michael, merge into gm-flip. |
| coop-real (NEW, orchestrator 21:30: input-only co-op e2e; P6 hostage prompt, P7 doubled audio, S2 client lamp shots, rejoin after multitasking) | feature/coop-real (node_modules junction to gm-flip: lock differs, npm ci before builders) | master | Opus planner writing docs/coop-real BRIEF / PLAN / STATE; then tell the orchestrator (it adds the ROADMAP line), one Opus checker, slices in parallel. |

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
