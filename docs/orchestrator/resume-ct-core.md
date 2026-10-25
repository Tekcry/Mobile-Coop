# Resume - Night Shift | Player Build (2026-10-25 ~13:55 local; older log: history at the end)

Rules: docs/RULES.md on origin/master: "A job." (Full burn bullet), "Machines.", "Swaps and context.". Opus builds / checks anim, net, AI;
Sonnet strict briefs / data checks. No desktop e2e: laptop queue (C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full>
--suites "..." | --alone --step "..."); results = GitHub statuses laptop-e2e/<set>; desktop-worker logs in
C:/NightShift/scratch/laptop-queue-desktop/runs/<request id>/.
Walk cap, checker status, train-ready and locks: RULES "Walk pacing" (the cap limits switch-on only, G355), "A job.", "Getting to master", "Machines". Docs-first hold (G346, G355): conformance review first (BOOT.md common start); finished PRs may ship. Every anim PR carries a ~1-2 min look video path in its body.
Message the orchestrator only at PR open / train-ready / blocked / Michael. Push this file with push-resume.sh.

## Now (2026-10-25 ~16:40, new account; resumed 16:33)
| Job | Branch (worktree C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| tuner-clarity (ROADMAP Now 0c, ahead of the hold by Michael) | feature/tuner-clarity (Mobile-Coop-tuner-clarity) | f0bdc14d | PR #430 open, `big-pr` (orchestrator). S1-S5 Opus PASS; affected 8/8 green on a404bfc9 and 47af68ea; e2e-coop + e2e-netmove 2/2 on dc151427. 17:35 TRAIN-READY on f0bdc14d (CI check, checker, affected-e2e 8/8 all green; label fix 'foot twist, toes out' after CI caught brackets); orchestrator told. Next: watch the train; if it drops #430, Opus triage (G319). Code polish left for the next batch (STATE: syncReach hysteresis, keyToolWarn fallback, badge ellipsis). e2e-coop + e2e-netmove requested (set tuner-clarity-coop on dc151427, code-identical); affected-e2e by itself. `big-pr` asked of the orchestrator (2.7k counted). Job STATE: docs/tuner-clarity/STATE.md. |
| Conformance review PR #416 | - | - | MERGED. HOLD (Michael 13:53 "plan comes first") until the orchestrator says resume after row 6 sign-off. |
| player-doc-fixes (stopped) | feature/player-doc-fixes (Mobile-Coop-player-doc-fixes) | 71ba10e1 | WIP, unreviewed, no PR: 2 operators docs (H6 names, S7). Resume after sign-off: S1-S9 + H6 per CONFORMANCE.md 1c (bible / DECISIONS rows are the orchestrator's fold). |
| #380, #384, #373, #389 | - | - | MERGED (train 88 and before). |
| player-batch-25 PR #427 | - | - | MERGED (polish left: fragment name lacks -r2; "spawn spawn" cause text when no e.code). |
| gm-flip PR #375 | feature/gm-flip | a76fa924 | DRAFT (orchestrator, ~14:05, Michael OK 13:40) so it is not re-queued. After Michael's look picks: `gh pr ready 375` (triggers a fresh affected-e2e). Base 675 commits behind master. |
| gm-polish | feature/gm-polish (from gm-flip) | 7945363b | checker PASS; laptop-e2e/gm-polish FAILURE on the desktop worker (e2e-offline 1/2, 2026-10-24 23:25Z): needs an Opus triage (G319) or a laptop rerun. PR after #375. |
| gm-look | feature/gm-look (from gm-flip) | 6a5237f2 | Bake via hidden scheduled task "NightShift gm-look bake" (logs scratch/ctcore/gm-look/bake/); read run.log; STATE gm-look entry steps 1-7. Its cloth assert counts triangles, not bible 5.12.2's 2 cm (conformance note). |
| coop-real (draft PR #388) | feature/coop-real | 80b9a0ad | c1b 0/3; triage agent from the old account is gone: restart an Opus triage (use --pr 388). |
| coop-real C2 part 3 | feature/coop-real-c2 | d2f1d940 | laptop-e2e/coop-real-c2 FAILURE (e2e-coop-real:3 0/1, desktop 2026-10-24 22:37Z); merge into coop-real after the triage lands, then K1. |

Next: tuner-clarity first (STATE.md); everything else HOLD (Michael 13:53 "plan comes first"). On the orchestrator's resume after row 6 sign-off: work its folded plan for the Player rows of #416 (S1-S9 docs on feature/player-doc-fixes first), then the jobs above top down (gm-polish triage, coop-real triage, #375 `gh pr ready` after the look picks).

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
