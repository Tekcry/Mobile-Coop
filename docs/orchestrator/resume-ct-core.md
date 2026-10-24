# Resume - Night Shift | Player Build (2026-10-24 ~19:00 local; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (master 6e8a450b train 56; resumed 2026-10-24 ~18:00 local on the new account)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models (flag OFF) | feature/guard-models | 1569b0f8 | TRAIN-READY (label, orchestrator told ~18:15). Master merged c105ccb4 + visionIsolation exempts render-only guardBody.ts. CI green. Laptop G9 on 89c10827 + offline on aba0953a. |
| gm-flip (follow-up PR) | feature/gm-flip (gm-flip; node_modules = junction to guard-models) | 7abe33c0 | = guard-models + gm-perf (checker PASS d729e490, GM-PERF-CHECK.md polish 1-8) + guardActiveMeshes stub fix. Cap gate PASS (origin/shots/gm-perf-408ab154: 24 guards ON/OFF p95 sectorops 6.5/6.5, 7.2/7.4; campus 9.0/9.7, 9.2/10.0). Waits for G10a D3 + D6, then merge gm-g10a, flip src/core/flags.ts guardModels `!== '0'`, docs + changes/ fragment, laptop flag-on suites (enemies coop ctcourse combat guard-carry), open PR to master. |
| G10a guard defects | feature/gm-g10a (gm-g10a) | 1569b0f8 + builder | Opus builder running from C:/NightShift/scratch/ctcore/briefs/gm-g10a.md (D1 sheet goggle markers, D1c mirrored tile, D2 tone-0 clamp, D3 uniforms ~10x dark, D4 hairline, D5 colour out of bake hashes, D6 balaclava half-face). Then Sonnet checker + one laptop full rebake (~55 min). Look items wait on Michael (G10). |
| #314 optic-coop | feature/optic-coop | 762b479f | TRAIN-READY (~19:00, orchestrator told). Master merged 3f5292e9; e2e-coop dual-takedown flake hardened 762b479f (laptop pass 156 s); CI green. |

#308 rig-pose-fix: DONE (4.92.0). Owed: e2e-tuner-phone drawer-scroll flake fix (train 54 fail, solo pass 23353993) in the next Player batch PR.

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
