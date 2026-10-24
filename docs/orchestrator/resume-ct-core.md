# Resume - Night Shift | Player Build (2026-10-24 ~19:55 local, SAVED; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (master 6e8a450b train 56; 2026-10-24 ~19:35 local)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models (flag OFF) | feature/guard-models | 1569b0f8 | TRAIN-READY (in the next train). |
| #314 optic-coop | feature/optic-coop | 762b479f | TRAIN-READY. |
| #331 player-batch-24 | feature/player-batch-24 | fdaef3af | TRAIN-READY (e2e-tuner-phone flake fix, test-only). |
| gm-flip (follow-up PR, open it from THIS branch, never from gm-perf: gm-perf lacks master's guardHead) | feature/gm-flip (node_modules junction) | 82f7ac87 | guard-models + gm-perf (checker PASS) + docs / fragment + gm-mc-polish (checker PASS 787f05a2, GM-MC-POLISH-CHECK polish P1-P4). Cap gate PASS. Next: merge gm-g10a after its checker + laptop rebake pass and the GLBs are copied in, then the cloud branches, flip src/core/flags.ts guardModels `!== '0'`, laptop flag-on suites (enemies coop ctcourse combat guard-carry), PR to master. |
| G10a guard defects | feature/gm-g10a | 81a1f3b8 | 6 defects built (G10A-REPORT.md). Sonnet check FAIL 10617941 on one blocker (D6 local `out` shadowed the out dir: lods-broad TypeError) -> fixed 81a1f3b8 (rename). Laptop full rebake 20261024T084744-...-81a1f3b8-7ccf (the 2d810799 request withdrawn). On pass: copy 12 GLBs + 3 JSON from bake/guard-models into src/operators/assets/guards/, D6 assertion in tests/guardAssets.test.ts, sheet to Michael, merge into gm-flip. Risk: receding LOD1 maxTurnDeg was 90.5 (> 75) in the last desktop smoke. |
| cloud briefs | origin/cloud-queue 10edabfe | open | player-gm-perf-polish (shield merge key, shield receiveShadows; S) + player-gm-look-seeds (distinct looks per section, no wire change; M). Both off gm-flip 979a02b3. On done: fetch, checker, merge into gm-flip. Keep 1-2 briefs queued ahead. |

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
