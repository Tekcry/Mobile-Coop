# Resume - Night Shift | Player Build (2026-10-25 ~08:40 local; older log: history at the end)

Rules: docs/RULES.md on origin/master: "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap, checker status, train-ready and locks: RULES "Walk pacing" (the cap limits switch-on only, G355), "A job.", "Getting to master", "Machines". Docs-first hold (G346, G355): conformance review first (BOOT.md common start); finished PRs may ship. Every anim PR carries a ~1-2 min look video path in its body.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~09:05 SAVE before the 100% swap; meter resets 13:10. All branches pushed. Laptop queued: player-batch-25, gm-polish, coop-real-c2 (:3), coop-real-c1b-logs (smoke), client-intel. Cloud-queue open: player-gm-polish-p2, player-batch-25-polish. Agents at the save: coop-real triage, gm-look (bake), client-intel checkers A/B: on resume read their reports / branch heads, not their transcripts.)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #371 lamp-fix, #318, #314, #331 | - | - | MERGED. |
| bake-abort PR #380 | feature/bake-abort (Mobile-Coop-gm-bake-abort2) | aa856b3d | TRAIN-READY (orchestrator re-labelled 21:21Z; train 77 drop was an e2e-stealth-ai flake). Watch the train. |
| coop-lamp-guard PR #384 (F1c) | feature/coop-lamp-guard | e7bd1201 | checker PASS x2 + laptop 12/12. CI red ONLY on pr-size (branch lacks the new script): waits on #378 (rides a train with Guard AI #387 + #374 + #380). NO gh run rerun --failed (old merge sha): the orchestrator close / reopen sweeps #384 / #373 / #375, then label on green. |
| e2e-boot PR #373 | feature/e2e-boot | bf515afc | laptop e2e-boot 7/7, checker PASS. CI red only on pr-size: after #378 merges the orchestrator sweep re-runs CI -> train-ready. |
| gm-flip PR #375 | feature/gm-flip | a76fa924 | checker PASS, laptop gm-flip 9/9, gm-flip-cap 3/3 (on 41e2ea5c). CI red only on pr-size (#378). NO train-ready until Michael one-click OKs the look. |
| coop-real (draft PR #388 so laptop failures post logs; use --pr 388) | feature/coop-real | 92edc3e5 | c1b 0/3 on the laptop. AGENT: Opus triage + fix (desktop dev lane if heavy2.lock / CPU allow, else laptop) -> set coop-real-c1c. Smoke rerun for logs queued (set coop-real-c1b-logs, --pr 388). probe2 1/1. |
| coop-real C2 part 3 | feature/coop-real-c2 | d2f1d940 | Built, not run (B1 = minimize + spoofHidden, B2 = CDP Debugger.pause; lib wants in C2-REPORT.md; likely > 120 s: B3/B4 -> part 4). Laptop set coop-real-c2 (:3, --pr 388) queued. Merge into coop-real after the triage agent lands, then K1. |
| gm-look | feature/gm-look (from gm-flip) | 6a5237f2 | Cause = LOD stage (bake_guard.py clustering fused the 2 cloth surfaces + collapsed sleeves), not build_garment. Fix: LODs from the welded shell, per-LOD push-out from body / under layers, face-blended weights (compiled, never run). New assert guardClothCheck + guardAssets test (placeholder LOOK_LIMITS; FAILS on bundled GLBs until rebake copied). Bake = hidden scheduled task "NightShift gm-look bake" (logs scratch/ctcore/gm-look/bake/; STARTED ~09:10 holding heavy.lock, ~90 min lods then check + sheet, --push bake/guard-models; first run of the new LOD code). RISK: boot LOD0 fit lifted 950 body points (pushed max 17.7 mm; fitted parts still decimate the clustered hero): check the boots on the new sheet; if bloated, skip lift (maybe push) for fitted parts in bake_guard.py and rerun lods. Next: STATE gm-look entry steps 1-7 (read run.log, set limits, copy 9 GLB + 3 JSON, vitest, after crops). |
| gm-polish | feature/gm-polish (from gm-flip) | 7945363b | checker PASS posted (polish: scratch/ctcore/gm-polish-CHECK.md; P2 gfx=min warm lacks average-lod1 for the helmet drop). Laptop set gm-polish (e2e-offline e2e-menus) queued. STATE.md: mark Offline (~:156) + polish items 2-3 done. PR after #375. |
| client-intel PR #389 (ROADMAP Now 15) | feature/client-intel | e094eabe | checker PASS x2 posted (A PASS, B PASS WITH FIXES = docs only, fixed by lead e094eabe; reports scratch/ctcore/ci-CHECK-A.md / -B.md, polish: client hears no guard lines, no retry if the host misses a read, no unit test for coopClient setIntel call). Laptop set client-intel on 82236fa9 (counts for e094eabe: docs / fragment delta). Green + CI -> train-ready (wire: train bumps PROTOCOL_VERSION). |
| rig-pose fixes (ROADMAP Now 14) | - | - | STALE ROW: all 8 REPORT slices shipped in #308 (merged, train 54). Orchestrator told ~09:15 to close it. Empty branch feature/rig-pose-fix-2 pushed by mistake (worktree removed; deleting it is Michael's call). |
| player-batch-25 | feature/player-batch-25 (#384 + #380 merged in) | b16c0ee7 | checker PASS x2 posted (polish: scratch/ctcore/b25-CHECK-A.md / -B.md). Laptop set player-batch-25 queued. PR after #384 / #380 merge. |

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
Night Shift | Player Build: RESUME after the account swap. Model Opus 5.5, effort high (BOOT.md). set_session_title "self" ->
"Night Shift | Player Build". Read docs/RULES.md and docs/VISION.md (origin/master), then docs/orchestrator/resume-ct-core.md on
origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to
C:/NightShift/scratch/ctcore/resume-ct-core.md and push updates with scratch/ctcore/push-resume.sh. Locks: RULES "Machines". Turn off unused connectors.
Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / Michael needed. First the conformance
review (BOOT.md common start); then work "Now" top down: check each laptop status listed, label per RULES "Getting to
master". e2e always E2E_GPU=1.
```

## History
- Full log before 2026-10-24 ~19:45: git history of this file on feature/menu (and scratch/ctcore/resume-history-2026-10-24.md on the desktop).
