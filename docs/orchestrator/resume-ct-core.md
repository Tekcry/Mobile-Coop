# Resume - Night Shift | Player Build (2026-10-24 ~20:25 local; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Walk cap 3 (ROADMAP Decided ~21:50): no new animation features until Michael walks AF0-AF6; every anim PR carries a ~1-2 min look video path in its body. Checker PASS -> `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (master bd54dfcd 4.95.3; SAVE 2026-10-24 ~22:08 local)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models, #314 optic-coop, #331 player-batch-24 | - | - | MERGED (trains 58 / 59 / 62). |
| gm-flip (follow-up PR, open it from THIS branch, never from gm-perf) | feature/gm-flip (node_modules junction) | 7c0c0456 | guard-models + gm-perf + gm-mc-polish + gm-perf-polish + gm-look-seeds (all PASS) + MERGE-CHECK polish, ONE fragment changes/feature-gm-flip.md. Next: merge gm-g10a after its rebake passes and the GLBs are copied in, flip src/core/flags.ts guardModels `!== '0'`, laptop flag-on suites (enemies coop ctcourse combat guard-carry), PR to master. |
| G10a guard defects | feature/gm-g10a | 027a8f51 (WIP) | Laptop request WITHDRAWN (orchestrator OK: full bake on the DESKTOP, heavy.lock, BelowNormal, release at once). Desktop smoke 81a1f3b8: receding LOD1 102.6 / 100.8 deg FAIL, other caps pass. Opus builder mid-fix (briefs/gm-g10a-hairline-fix.md corner_slide, WIP 027a8f51 = build_head.py + trials/hairline_selfcheck.py): resume = finish, smoke haircaps-average,haircaps-lean (--out C:/NightShift/scratch/guard-bake-g10a), guardHeadCheck receding <= 75, report D4b. Then full desktop bake = the 8 steps of the withdrawn request (git show 2d496f54^:requests/...7ccf.json on laptop-queue: probe, prep+bodies, heads, garments, gear, lods, check, sheet; --push), copy 12 GLBs + 3 JSON into src/operators/assets/guards/, D6 assertion tests/guardAssets.test.ts, sheet to Michael, merge into gm-flip. |
| coop-real (orchestrator 21:30; ROADMAP line in) | feature/coop-real (own npm ci) | e735dc8a | PLAN 436ecaf4 (docs/coop-real). H2 runner wiring DONE + merged (SUITE_ENV netsim typical + gate, hideAutomation, KNOWN BUG summary). H1 harness core: Opus on feature/cr-h1 (worktree Mobile-Coop-cr-h1, junction to coop-real node_modules; probe first, then lib, smoke <= 3 under heavy.lock). Plan checker (Opus) writing docs/coop-real/PLAN-CHECK.md (uncommitted in coop-real worktree). Next: merge H1, C1 (Sonnet, Opus brief) + C2 (Opus), K1 + laptop run 1. F1 / F2: #317 coop4 (d0f574cb) owns coopClient, coopHost, coopUi, holdPulse, joinWatch, protocol, remoteAvatar, remotePlayer, session: build F1 / F2 ON TOP of feature/coop4 or ask Guard AI first. Checker PASS -> checker commit status. |

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
