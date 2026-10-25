# Resume - Night Shift | Player Build (2026-10-25 ~18:20 SAVE; older log: history at the end)

Rules: docs/RULES.md on origin/master: "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap, checker status, train-ready and locks: RULES "Walk pacing" (the cap limits switch-on only, G355), "A job.", "Getting to master", "Machines". Every anim PR carries a ~1-2 min look video path in its body.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~18:20 SAVE at the 5-hour meter; row 6 SIGNED OFF ~17:00, full burn; plan FOLDED-PLAN.md + ROADMAP Decided Q34-Q39)
CPU CAP (orchestrator ~18:50): up to 2 builder agents per lead, tsc / single vitest only, no Blender / npm run build / e2e by hand, until it says CPU < 80%. RUNNING 19:00: Opus gm-polish offline fix builder (requests laptop e2e-offline + e2e-menus on its new head), Opus gm-look checker, Opus #440 checker. All worktrees pushed.
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| J1 docs PR #437 | feature/player-docs-j1 | 16c6cb99 | TRAIN-READY 19:00 (Opus recheck PASS, `checker` posted, orchestrator told). Polish (later docs PR): Moth still amber in docs/operators/SPEC.md:65,:498, BRIEF.md:35, steps/13:7 (G196 purple); movement.md:61-62 'under an override' too broad (cover glide has no pivot). |
| tuner-clarity-polish PR #440 | feature/tuner-clarity-polish | 83a30ea8 | Built (82 tests, tsc, build). Opus checker RUNNING 19:00; post `checker`, tell the orchestrator. (#430 SHIPPED 4.103.0.) |
| J6 player-hygiene | feature/player-hygiene | c72008ad | PLAN done (docs/player-hygiene/). Fresh Opus plan checker, then S1 (Opus) S2 (Sonnet) S3 (Opus, land before J15 / J19) S4 (Sonnet) in parallel; S5 after #317; S6 after #437. |
| J19 player-batch-j19 | feature/player-batch-j19 | 9abe854c | PLAN DONE: W1 S1 takedowns + menu (Opus), S2 palm 1.4 s (Opus), S3 co-op wire rules R9 R33 R38 (Opus, 2 checkers), S4 guard arms + goggle (Sonnet), S5 lean / audit / mocapRaw (Opus), S8a look-video tool (Sonnet); W2 S6 hop / slide / camera (after S1); W3 S7 carry + put-down (dark `putDown`); S8b walk pack. J6 S1 / S3 land first in traversal / takedown files. Next: fresh Opus plan checker. |
| J24 coop-kit | feature/coop-kit | 34cfcad2 | PLAN DONE: part 1 A1 rope descent (no wire), A2 descent anim, B1 shoulder stand (wire kind `stand`), B2 stand anim, A3 holder steers; part 2 K0 + K1-K5 the five new moves (after Campaign's kit registry PR). Flag `kitMoves` list. Orchestrator agreed (~18:25): part 1 first, Campaign adds `stand`; one flag `kitMoves` (Campaign's coopKit folds in); Campaign fixes missions PLAN row 106; Marlow rewords scale sheet line 56. Next: fresh Opus plan checker. |
| gm-look | feature/gm-look | bb13025d | 18:40 cause backed by the bake logs (LOD0 fit pushes shirts 7-18 mm, boots 16-18, gloves 6-15; bake ray reaches ~9 mm): Fix A DONE f5cda6d8 (bake on the pre-fit surface, bake_guard.py :335-342 helpers, :987 snapshot, :1069-1079 swap, :1100-1104 restore); Opus checker RUNNING; rebake when Blender is allowed again. Before: Cloth-through FIXED (skin 141/20/7 -> 14/1/0; LOOK_LIMITS; 9 GLBs bundled) BUT NEW dark blotches on every outfit (scratch/ctcore/gm-look/after-outfits.png): likely LOD0 bake cage (bake_guard.py:60, :651, ~9 mm) shorter than the fit push (19 mm; fit :986 before bake :1063). Not for Michael. Fix, rebake via the hidden task at BelowNormal, re-measure, crops. |
| coop-real draft #388 / c2 | feature/coop-real ffb7f02a, feature/coop-real-c2 fc6d52c7 | - | Triage 3 harness fixes (STATE 30931bcf). Verdicts: laptop-e2e/coop-real-c1c, coop-real-c2b. A boot fail naming the lobby screen gives the cause (game path -> T1 + KNOWN BUG). Then merge c2 into coop-real, K1. |
| gm-polish | feature/gm-polish | 7945363b | e2e-offline FAILED 3/3 (laptop too, 18 s) (its new assert: 'the menu warmed the guard files into the offline cache (missing)'; logs scratch/laptop-queue-desktop/runs/20261025T065835-...-6240/); laptop rerun 20261025T070823-...-551f pending. Suite ends in 89 s, under the 90 s guard wait: the wait likely errors early, or the warm sits behind loadMenuLods' hero load (menuScene.ts:445). On a laptop fail: Opus fix slice. PR after #375. |
| gm-flip #375 | feature/gm-flip | a76fa924 | DRAFT until Michael's look picks (Q37 "decide at your walk"); then `gh pr ready 375`. |

Next (18:45, CPU still 100%, hold on): on the CPU OK, the two checkers (#437, #440) and the J6 plan checker first; then J6 S1-S4 builders; J19 / J24 plan checkers; gm-look cage fix + rebake.

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
