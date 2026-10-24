| coop-lamp-guard PR #384 (F1c) | feature/coop-lamp-guard | e7bd1201 | checker PASS x2 + laptop 12/12. CI red ONLY on pr-size (branch lacks the new script): waits on #378 (orchestrator told 08:55) -> gh run rerun --failed -> train-ready. || coop-real C2 part 3 | feature/coop-real-c2 | d2f1d940 | Built, not run (B1 = minimize + spoofHidden, B2 = CDP Debugger.pause; lib wants in C2-REPORT.md; likely > 120 s: B3/B4 -> part 4). Laptop set coop-real-c2 (:3, --pr 388) queued. Merge into coop-real after the triage agent lands, then K1. || gm-polish | feature/gm-polish (from gm-flip) | 7945363b | checker PASS posted (polish: gm-polish-CHECK.md; P2 gfx=min warm lacks average-lod1 for the helmet drop). Laptop set gm-polish (e2e-offline e2e-menus) queued. STATE.md: mark Offline (~:156) + polish items 2-3 done. PR after #375. || player-batch-25 | feature/player-batch-25 (#384 + #380 merged in) | b16c0ee7 | checker PASS x2 posted (polish: scratch/ctcore/b25-CHECK-A.md / -B.md). Laptop set player-batch-25 queued. PR after #384 / #380 merge. |# Resume - Night Shift | Player Build (2026-10-25 ~08:40 local; older log: history at the end)

Rules: CLAUDE.md "Sessions": "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap 3 (ROADMAP Decided ~21:50): no new animation features until Michael walks AF0-AF6; every anim PR carries a ~1-2 min look video path in its body. Checker PASS -> `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~08:40, FULL BURN per orchestrator ~08:25. 5 Opus agents running; worktrees pushed at creation.)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #371 lamp-fix, #318, #314, #331 | - | - | MERGED. |
| bake-abort PR #380 | feature/bake-abort (Mobile-Coop-gm-bake-abort2) | aa856b3d | TRAIN-READY (orchestrator re-labelled 21:21Z; train 77 drop was an e2e-stealth-ai flake). Watch the train. |
| coop-lamp-guard PR #384 (F1c) | feature/coop-lamp-guard | e7bd1201 | Opened 08:30 on master. checker PASS x2 + laptop coop-lamp-guard 12/12 on this head. CI green -> train-ready label + tell orchestrator. |
| e2e-boot PR #373 | feature/e2e-boot | bf515afc | laptop e2e-boot 7/7, checker PASS. CI red only on pr-size: after #378 merges `gh run rerun --failed` -> train-ready. |
| gm-flip PR #375 | feature/gm-flip | a76fa924 | checker PASS, laptop gm-flip 9/9, gm-flip-cap 3/3 (on 41e2ea5c). CI red only on pr-size (#378). NO train-ready until Michael one-click OKs the look. |
| coop-real (draft PR #388 so laptop failures post logs; use --pr 388) | feature/coop-real | 92edc3e5 | c1b 0/3 on the laptop (logs only there). AGENT: Opus triage + fix on the desktop dev lane (heavy2.lock, 4189) -> laptop set coop-real-c1c. probe2 1/1. |
| coop-real C2 part 3 | feature/coop-real-c2 (Mobile-Coop-coop-real-c2) | 92edc3e5 | AGENT: Opus builder (part3.mjs only; lib changes in C2-REPORT.md). Then merge into coop-real -> K1 checker + run 1a/1b. |
| gm-look | feature/gm-look (from gm-flip) | a76fa924 | AGENT: lean elbow poke-through + hem shards in the garment build, D6-style assertion, desktop rebake (heavy.lock), crops in scratch/ctcore/gm-look/. Follow-up PR after #375. |
| gm-polish | feature/gm-polish (from gm-flip) | 7945363b | Built: offline guard GLB warm at the menu (items 1-3 already in code). Opus checker RUNNING (report scratch/ctcore/gm-polish-CHECK.md) + laptop set gm-polish (e2e-offline e2e-menus) queued. STATE.md: mark Offline (~:156) and polish items 2-3 (~:142/:146) done. PR after #375 merges. |
| player-batch-25 | feature/player-batch-25 (#384 + #380 merged in) | b16c0ee7 | Built (lamp drop while a restart is not yet noted; guard-bake spawn error cause + runJob tests; fragment). 2 Opus checkers RUNNING (scratch/ctcore/b25-CHECK-A.md / -B.md; lead posts the status) + laptop set player-batch-25 (coop netmove ctcourse sectorops) queued. PR after #384 / #380 merge. |

## Open
- e2e-coop quarantine is ours until 2026-10-26 (Test Runner 08:45): soak 5/5 alone on 3be7d1a2; one fail at JOBS=3 sharded (laptop scratch/laptop-queue/runs/20261024T173702-night-shift-test-run-3be7d1a2-b1fd/4189.log L821-921) "co-op on the guards": host holds its guard in front of the client (0.38 m). Load-only so far; soak-coop-41002 x5 queued on master 833db92e behind train 78. Repeats -> fix in the next batch PR (player-batch-25 or later).
- guard-models STATE.md top: G8 numbers, S11 merge notes (in master merge now), G10 look list (no sheet notes from Michael yet), garment seam gaps, MERGE-CHECK-A/B polish (lightRig caster refill not behind the flag; `die` figure update after frozen solveNow).
- Test Runner owns guard-render phase 2 (feature/guard-render-2 PLAN2: S9 sun cascades, S9b updateSunCasters skip disabled, S10 freeze); guard-cap.mjs is ours until guard-models merges.
- Spare jobs #2 #3 #7 #11 #16 already on master; #12 = #308; #15 = #314.
- AF7-AF9 (briefs/afp-next-pass.md) wait for Michael's walk of AF0-AF6.
- Long bakes (orchestrator audit 22:55): launch the NEXT one through a scheduled task (hidden, like the laptop-queue service) so it survives a session / console exit; the current G10a restart stays as is.
- Owed to Marlow (mission-framework, agreed 22:55): team poses pull (b pullOffer/pullCatch/pullHaul, a pullJump/pullHang/pullScramble) and shutter (b shutterOffer/Lift/Hold/Drop, a crawlUnder), after Michael walks AF0-AF6. Targets (Marlow 00:15; kit moves feature/mission-kit-pull 830abf69, feature/mission-kit-shut 85189e05, placeholders in place): pullCatch hands at catchDrop 1.8 m below the lip edge (partner reach REACH.grabMax 2.7 m) = prone / kneeling reach over the edge; shutter hold gap 0.9 m, crawlUnder back height <= 0.75 m, holder stands 0.45 m off the plane.
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
