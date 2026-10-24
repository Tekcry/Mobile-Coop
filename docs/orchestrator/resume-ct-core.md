# Resume - Night Shift | Player Build (2026-10-25 ~04:20 local; older log: history at the end)

Rules: CLAUDE.md "Sessions": "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap 3 (ROADMAP Decided ~21:50): no new animation features until Michael walks AF0-AF6; every anim PR carries a ~1-2 min look video path in its body. Checker PASS -> `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~04:20, window reset 04:10, next 09:10)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #318 guard-models, #314 optic-coop, #331 player-batch-24 | - | - | MERGED (trains 58 / 59 / 62). |
| S2 lamp fix PR #371 | feature/coop-lamp-fix (junction to coop-real node_modules) | 36f827ae | F1a + F1b cherry-picked onto master (checker status posted; vitest 27/27, tsc ok). Laptop set coop-lamp-fix (e2e-coop e2e-netmove e2e-ctcourse e2e-course) queued: green + CI -> label train-ready + message orchestrator. |
| gm-flip | feature/gm-flip (node_modules junction) | 7c0c0456 | Waits on G10a. Then merge gm-g10a, copy GLBs in, flip src/core/flags.ts guardModels `!== '0'`, laptop flag-on suites (enemies coop ctcourse combat guard-carry), PR. Cloud brief player-gm-bake-abort (guard-bake.mjs abort on 0xC0000142) -> merge into gm-flip. |
| G10a guard defects | feature/gm-g10a | fd366d86 (D4b PASS) | Bake restart 4 DONE 02:07 (detached, par 1): garments 16 built, gear / lods / check / sheet pushed to bake/guard-models (lods 031e7445, check b4ed3f8f, sheet bf8fdfeb); guardGarmentCheck FAILS 6 garments on "seam gap before the weld > 30 mm" (avg jacket 32.9, broad shirt 41.8, lean trousers 52.5, lean work_trousers 35.7, + chains). Opus seam triage RUNNING (ship as is / fix + rerun only those 6 / other). Then copy 12 GLBs + 3 JSON into src/operators/assets/guards/, D6 assert tests/guardAssets.test.ts, sheet to Michael, merge into gm-flip. Next bake: detached (g10a-launch4.cmd pattern). |
| coop-real | feature/coop-real (own npm ci) | 85f4f5e7 | H1 merged (d91c3f8e) + C1 parts 1-2 (85f4f5e7). Laptop: H1 probe PASS, smoke FAIL; C1 :1 :2 FAIL (1360 s). Opus triage-and-fix RUNNING (B1 / B2 pick into H1-REPORT, root causes, harness fixes or KNOWN BUG marks, queues set coop-real-c1b itself). Then C2 (Opus, part 3, needs B1 / B2), K1 (Opus) + run 1 (e2e-coop-real e2e-coop) -> PR A. PR B = #371 now. Cloud brief player-coop-real-F1c (restart-in-flight lamp guard, onRay order test) being written. |

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
