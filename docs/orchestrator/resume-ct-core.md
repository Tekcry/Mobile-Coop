# Resume - Night Shift | Player Build (2026-10-25 ~18:20 SAVE; older log: history at the end)

Rules: docs/RULES.md on origin/master: "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap, checker status, train-ready and locks: RULES "Walk pacing" (the cap limits switch-on only, G355), "A job.", "Getting to master", "Machines". Every anim PR carries a ~1-2 min look video path in its body.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~18:20 SAVE at the 5-hour meter; row 6 SIGNED OFF ~17:00, full burn; plan FOLDED-PLAN.md + ROADMAP Decided Q34-Q39)
CPU HOLD (orchestrator ~18:10, desktop 100%): start NO new agents until it says CPU < 80%. All worktrees pushed.
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| J1 docs PR #437 | feature/player-docs-j1 | 16c6cb99 | Checker FIX (2 doc lines) applied + Moth purple. Fresh Opus recheck on 4732d28a..16c6cb99, post `checker`, tell the orchestrator. Src comment fixes moved to J6; scale-sheet rope line waits for J24. |
| tuner-clarity-polish PR #440 | feature/tuner-clarity-polish | 83a30ea8 | Built (82 tests, tsc, build). Fresh Opus checker, post `checker`, tell the orchestrator. (#430 SHIPPED 4.103.0.) |
| J6 player-hygiene | feature/player-hygiene | c72008ad | PLAN done (docs/player-hygiene/). Fresh Opus plan checker, then S1 (Opus) S2 (Sonnet) S3 (Opus, land before J15 / J19) S4 (Sonnet) in parallel; S5 after #317; S6 after #437. |
| J19 player-batch-j19 | feature/player-batch-j19 | c8764773 | WIP plan (Opus planner was running at the save). If its BRIEF / PLAN are incomplete, restart a planner from scratch/ctcore/phase-b/PLANNER-COMMON.md + the J19 rows (R6-R11 R13 R14 R16-R19 R21-R23 R25-R31 R33 R38, Q34-Q39). Then plan checker. |
| J24 coop-kit | feature/coop-kit | 34cfcad2 | PLAN DONE: part 1 A1 rope descent (no wire), A2 descent anim, B1 shoulder stand (wire kind `stand`), B2 stand anim, A3 holder steers; part 2 K0 + K1-K5 the five new moves (after Campaign's kit registry PR). Flag `kitMoves` list. Orchestrator agreed (~18:25): part 1 first, Campaign adds `stand`; one flag `kitMoves` (Campaign's coopKit folds in); Campaign fixes missions PLAN row 106; Marlow rewords scale sheet line 56. Next: fresh Opus plan checker. |
| gm-look | feature/gm-look | 1873de49 | Cloth-through FIXED (skin 141/20/7 -> 14/1/0; LOOK_LIMITS; 9 GLBs bundled) BUT NEW dark blotches on every outfit (scratch/ctcore/gm-look/after-outfits.png): likely LOD0 bake cage (bake_guard.py:60, :651, ~9 mm) shorter than the fit push (19 mm; fit :986 before bake :1063). Not for Michael. Fix, rebake via the hidden task at BelowNormal, re-measure, crops. |
| coop-real draft #388 / c2 | feature/coop-real ffb7f02a, feature/coop-real-c2 fc6d52c7 | - | Triage 3 harness fixes (STATE 30931bcf). Verdicts: laptop-e2e/coop-real-c1c, coop-real-c2b. A boot fail naming the lobby screen gives the cause (game path -> T1 + KNOWN BUG). Then merge c2 into coop-real, K1. |
| gm-polish | feature/gm-polish | 7945363b | e2e-offline laptop rerun requested (set gm-polish); PR after #375. |
| gm-flip #375 | feature/gm-flip | a76fa924 | DRAFT until Michael's look picks (Q37 "decide at your walk"); then `gh pr ready 375`. |

Next: on the CPU OK, the two checkers (#437, #440) and the J6 plan checker first; then J6 S1-S4 builders; J19 / J24 plan checkers; gm-look cage fix + rebake.

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
