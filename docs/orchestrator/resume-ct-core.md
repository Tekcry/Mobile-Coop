# Resume - Night Shift | Player Build (2026-10-24 ~22:35 local; older log: history at the end)

Rules: CLAUDE.md "Sessions" ("Heavy-usage throughput", "Token rules", "Account swap"). Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; failure excerpts from Test Runner.
Walk cap 3 (ROADMAP Decided ~21:50): no new animation features until Michael walks AF0-AF6; every anim PR carries a ~1-2 min look video path in its body. Checker PASS -> `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-24 ~23:30, resumed after the unplanned 23:20 swap; 5-hour resets 2026-10-25 04:10. OVERNIGHT: burn to the cap per window, save at ~92%; no question dialogs: assume, log in BRIEF, carry on)
- 23:43: G10a bake RESTART 4 (orchestrator waste audit): par 1 every stage, launched HIDDEN + DETACHED (cmd Start-Process of scratch/ctcore/g10a-launch4.cmd -> g10a-desktop-bake4.sh, steps g10a-bake/steps4.txt, logs run4.log + r4-step1..5.log), survives a console death. Garments 11 unchanged / 5 to run (average-jacket first; it OOMed at par 2), then gear / lods / check / sheet. If a job fails again on its own: Opus triage before any restart 5. Owed: guard-bake.mjs aborts the stage on the first 0xC0000142 (after this bake; ships in the gm-flip PR).
- 00:12: cr-h1 6204d95f MERGED into feature/coop-real (d91c3f8e). H1 probe + smoke NOT RUN (desktop CPU): laptop set cr-h1-probe queued (its PROBE lines pick B1 / B2, then C2 Opus). C1 DONE (Sonnet): parts 1-2 committed 85f4f5e7 on feature/coop-real (node --check + brief greps clean); laptop set coop-real-c1 (e2e-coop-real:1 :2) queued. Next: probe result -> C2 (Opus, part 3) -> K1 checker (Opus) + run 1 (coop-real-1: e2e-coop-real e2e-coop).
- 00:05 SAVE (resume at the 04:10 reset). RUNNING: G10a bake restart 4 (detached, survives); the Opus H1 finisher (relaunch from H1-REPORT.md if PROBE_RESULT / SMOKE_RESULT are still placeholders; cr-h1 clean at 2fe0c510). QUEUED on the laptop: cr-f1a 144190a0 (e2e-ctcourse e2e-course), cr-f1b dadacd58 (e2e-coop e2e-netmove e2e-ctcourse): read statuses laptop-e2e/cr-f1a, cr-f1b. coop-real STATE 91ce34c3.
- coop-real: Opus H1 finisher on feature/cr-h1 (probe + smoke on the desktop dev lane heavy2.lock / 4189, CPU < 60% gate; fills H1-REPORT). F1a feature/cr-f1a 144190a0 + F1b feature/cr-f1b dadacd58: 2 Opus checkers PASS WITH FIXES, fix round done, `checker` status posted. Follow-ups (not done): restart-in-flight lamp guard (coopHost onLampShot vs mode restart time), lamp-shot round-count authority, Course onRay install-order test. #317 overlap: only docs/systems/coop.md :469 (take ours, then coop4's lines). Next: H1 report -> merge cr-h1 into coop-real -> C1 (Sonnet, briefs/C1.md) || C2 (Opus) -> K1 + laptop run 1; F1a/F1b stack into PR B.
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models, #314 optic-coop, #331 player-batch-24 | - | - | MERGED (trains 58 / 59 / 62). |
| gm-flip (follow-up PR, open it from THIS branch, never from gm-perf) | feature/gm-flip (node_modules junction) | 7c0c0456 | guard-models + gm-perf + gm-mc-polish + gm-perf-polish + gm-look-seeds (all PASS) + MERGE-CHECK polish, ONE fragment changes/feature-gm-flip.md. Next: merge gm-g10a after its rebake passes and the GLBs are copied in, flip src/core/flags.ts guardModels `!== '0'`, laptop flag-on suites (enemies coop ctcourse combat guard-carry), PR to master. |
| G10a guard defects | feature/gm-g10a | fd366d86 (D4b PASS) | Full desktop bake (heavy.lock, BelowNormal): steps 1-3 OK (heads all pass; bake/guard-models d9271aa901). Step 4 garments: the old console died at the 22:20 swap (exit 0xC0000142 on every spawn); only average shirt + trousers done. RESTARTED 22:25 from this session: scratch/ctcore/g10a-desktop-bake2.sh (steps 4-8 = g10a-bake/steps2.txt; logs g10a-bake/run2.log, r-step4..8.log). A bake started from a session dies with that session's console: restart the same way after a swap. Then copy 12 GLBs + 3 JSON into src/operators/assets/guards/, D6 assertion tests/guardAssets.test.ts, sheet to Michael, merge into gm-flip. |
| coop-real (orchestrator 21:30; ROADMAP line in) | feature/coop-real (own npm ci) | a174b082 | Plan check applied; H2 + H2b done. H1 on feature/cr-h1 2fe0c510 (23:05 WIP save): the Opus finisher (probe + smoke, desktop dev lane heavy2.lock port 4189, H1-REPORT.md) may be cut at the cap: if H1-REPORT still has PROBE_RESULT / SMOKE_RESULT placeholders, restart it from that report. C1 brief DONE (docs/coop-real/briefs/C1.md c6c70d94; STATE 56b176c3, A10 / A11). Cloud F1a / F1b briefs on cloud-queue ad3a025b: check status lines. Next: merge H1, C1 (Sonnet, Opus brief) + C2 (Opus), K1 + laptop run 1. F1 / F2: #317 coop4 (d0f574cb) owns coopClient, coopHost, coopUi, holdPulse, joinWatch, protocol, remoteAvatar, remotePlayer, session: build F1 / F2 ON TOP of feature/coop4 or ask Guard AI first. Checker PASS -> checker commit status. |

## Open
- guard-models STATE.md top: G8 numbers, S11 merge notes (in master merge now), G10 look list (no sheet notes from Michael yet), garment seam gaps, MERGE-CHECK-A/B polish (lightRig caster refill not behind the flag; `die` figure update after frozen solveNow).
- Test Runner owns guard-render phase 2 (feature/guard-render-2 PLAN2: S9 sun cascades, S9b updateSunCasters skip disabled, S10 freeze); guard-cap.mjs is ours until guard-models merges.
- Spare jobs #2 #3 #7 #11 #16 already on master; #12 = #308; #15 = #314.
- AF7-AF9 (briefs/afp-next-pass.md) wait for Michael's walk of AF0-AF6.
- Long bakes (orchestrator audit 22:55): launch the NEXT one through a scheduled task (hidden, like the laptop-queue service) so it survives a session / console exit; the current G10a restart stays as is.
- Owed to Marlow (mission-framework, agreed 22:55): team poses pull (b pullOffer/pullCatch/pullHaul, a pullJump/pullHang/pullScramble) and shutter (b shutterOffer/Lift/Hold/Drop, a crawlUnder), after Michael walks AF0-AF6.
- Disk: scratch copies (mt2 7.3 GB, b22chk, msc3chk*, psc, tfc, n12-fix, vk-check, n2-check5) wait for Michael (auto mode denied rm; his OK covered worktrees only).

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
