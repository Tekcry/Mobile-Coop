# Resume - Night Shift | Player Build (2026-10-24 ~22:35 local; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Walk cap 3 (ROADMAP Decided ~21:50): no new animation features until Michael walks AF0-AF6; every anim PR carries a ~1-2 min look video path in its body. Checker PASS -> `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-24 ~22:35. OVERNIGHT (orchestrator 22:30): no swap tonight, burn to the cap per 5-hour window, save at ~92%, orchestrator resumes us after each reset; no question dialogs: assume, log in BRIEF, carry on)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models, #314 optic-coop, #331 player-batch-24 | - | - | MERGED (trains 58 / 59 / 62). |
| gm-flip (follow-up PR, open it from THIS branch, never from gm-perf) | feature/gm-flip (node_modules junction) | 7c0c0456 | guard-models + gm-perf + gm-mc-polish + gm-perf-polish + gm-look-seeds (all PASS) + MERGE-CHECK polish, ONE fragment changes/feature-gm-flip.md. Next: merge gm-g10a after its rebake passes and the GLBs are copied in, flip src/core/flags.ts guardModels `!== '0'`, laptop flag-on suites (enemies coop ctcourse combat guard-carry), PR to master. |
| G10a guard defects | feature/gm-g10a | fd366d86 (D4b PASS) | Full desktop bake (heavy.lock, BelowNormal): steps 1-3 OK (heads all pass; bake/guard-models d9271aa901). Step 4 garments: the old console died at the 22:20 swap (exit 0xC0000142 on every spawn); only average shirt + trousers done. RESTARTED 22:25 from this session: scratch/ctcore/g10a-desktop-bake2.sh (steps 4-8 = g10a-bake/steps2.txt; logs g10a-bake/run2.log, r-step4..8.log). A bake started from a session dies with that session's console: restart the same way after a swap. Then copy 12 GLBs + 3 JSON into src/operators/assets/guards/, D6 assertion tests/guardAssets.test.ts, sheet to Michael, merge into gm-flip. |
| coop-real (orchestrator 21:30; ROADMAP line in) | feature/coop-real (own npm ci) | a174b082 | Plan check applied; H2 + H2b done. H1a/H1b code on feature/cr-h1 c7241fdd: Opus finisher (22:30) runs probe + smoke on the desktop dev lane (heavy2.lock, port 4189), fills docs/coop-real/H1-REPORT.md. Opus writing docs/coop-real/briefs/C1.md. Cloud briefs F1a / F1b (S2) going to cloud-queue (orchestrator 22:30: overnight, keep Cloud Builder 1 fed). Next: merge H1, C1 (Sonnet, Opus brief) + C2 (Opus), K1 + laptop run 1. F1 / F2: #317 coop4 (d0f574cb) owns coopClient, coopHost, coopUi, holdPulse, joinWatch, protocol, remoteAvatar, remotePlayer, session: build F1 / F2 ON TOP of feature/coop4 or ask Guard AI first. Checker PASS -> checker commit status. |

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
