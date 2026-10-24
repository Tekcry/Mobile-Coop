# Resume - Night Shift | Player Build (2026-10-25 ~04:20 local; older log: history at the end)

Rules: CLAUDE.md "Sessions": "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap 3 (ROADMAP Decided ~21:50): no new animation features until Michael walks AF0-AF6; every anim PR carries a ~1-2 min look video path in its body. Checker PASS -> `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~05:22 SAVE; resume at the 09:10 reset. All worktrees clean + pushed. No agents running. Laptop queued: coop-lamp-guard, e2e-boot, gm-flip, gm-flip-cap, coop-real-c1b, coop-real-probe2.)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models, #314 optic-coop, #331 player-batch-24 | - | - | MERGED (trains 58 / 59 / 62). |
| bake-abort PR #380 (TRAIN-READY 05:17, checker PASS; polish: ABORT text should name spawn errors, runJob code/bytes test) | feature/bake-abort (worktree Mobile-Coop-gm-bake-abort2) | aa856b3d | Cloud gm-bake-abort cherry-picked onto master + fragment; 47 tests. Opus checker RUNNING -> status + train-ready (CI red on pr-size until #378 merges: then gh run rerun --failed). |
| F1c = feature/coop-lamp-guard (stacked on #371) | worktree Mobile-Coop-coop-lamp-guard | e7bd1201 | cr-f1c cherry-picked onto coop-lamp-fix + fragment renamed; 35 tests. Checker 1 PASS (low: Sector Ops pause restart lags lampRestartAt by <= 1 frame: noteRestart() in onLampShot); checker 2 PASS too (status posted). Polish both flagged (not applied, keeps the queued laptop run valid): in onLampShot above coopHost.ts:1328 add ; optional LAMP_RESTART_SLACK 0.18. Laptop set coop-lamp-guard (coop netmove ctcourse sectorops) queued. After #371 merges: open PR to master, checker status, train-ready. |
| S2 lamp fix PR #371 (TRAIN-READY 05:12) | feature/coop-lamp-fix (junction to coop-real node_modules) | 36f827ae | F1a + F1b cherry-picked onto master (checker status posted; vitest 27/27, tsc ok). CI green; laptop set coop-lamp-fix queued (+ affected-e2e running): green + CI -> label train-ready + message orchestrator. |
| e2e boot wait PR #373 (CI red only on pr-size bug: rerun failed after #378 merges) | feature/e2e-boot (worktree Mobile-Coop-e2e-boot) | bf515afc | e2e-lib openPage: co-op host alone in the lobby ends the autostart wait (~120 s per ctcourse / course boot). checker status posted; laptop set e2e-boot queued -> green + CI -> train-ready. |
| gm-flip PR #375 | feature/gm-flip (node_modules junction) | a76fa924 | Checker PASS WITH FIXES -> fix round a76fa924 (weld move warn > 20 / fail > 60; STATE look items + gaps), checker status posted. Look gate: runner elbow skin (crops sent to Michael), hem shards, close-view seam check. G10a merged (gm-g10a b58a9692: gate warn + weldMove > 60 fail, 9 base GLBs, D6 assert), flag ON. 653 guard tests pass. Laptop set gm-flip queued (enemies coop ctcourse combat takedown stealth-ai); fresh Opus checker RUNNING. NO train-ready until Michael one-click OKs the look (orchestrator, morning pack). Last gate PASS (gm-perf-408ab154: 24 grunts p95 ON vs OFF sectorops 6.5/6.5, 4.6/4.7, 7.2/7.4; campusops ON faster); re-measure on 41e2ea5c queued alone (set gm-flip-cap). Checker asked to judge seam visibility explicitly. Cloud brief player-gm-bake-abort -> next small PR after. Sheet sent to Michael (scratch/ctcore/guard-sheet-g10a.png). |
| coop-real | feature/coop-real (own npm ci) | 92edc3e5 | Triage DONE: every failure a harness bug, fixed (boot 120 s autostart wait, lounge door, mouse aim with a held button, pickRow / fireOne repress, faceTo nudge, door-close spots); only KNOWN BUG S2. Probe: headless tabs never go hidden / frozen, so B1 provisional = spoofHidden, B2 none; 3 new probe rows (minimize, minimize + frozen, Debugger.pause). QUEUED: coop-real-c1b (smoke :1 :2) and coop-real-probe2 (probe) at 92edc3e5. Next: probe2 -> C2 (Opus, part 3); c1b green -> K1 (Opus) + run 1 -> PR A. Told orchestrator: e2e-ctcourse loses ~120 s per part (same autostart wait); RMB-held mouse look check for Michael. |

## Open
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
