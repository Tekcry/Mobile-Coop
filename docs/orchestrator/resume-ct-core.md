# Resume - Night Shift | Player Build (formerly CT Core Build; saved 2026-10-23 ~13:45 at the orchestrator's 90% save)

Rules: CLAUDE.md on origin/feature/menu "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; desktop CPU < 80%. e2e always E2E_GPU=1:
laptop (Test Runner, bridge in docs/orchestrator/STATE.md) for coop / netmove / ctcourse and batches, one verdict per
batch; desktop heavy.lock (4191) / heavy2.lock (4192) for single suites. Agent rules: scratch/mt2/COMMON.md,
COMMON-SPARE.md (subagents are refused REPORT.md: the lead writes it from the hand-back). Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

## Open (master 4.74.0 after train 25). All four PRs go in train 26 together, once #207 is fixed.
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #207 batch 22 | feature/ctcore-batch-22 (folder b22-fix) | 99c37251 + WIP | Out of train 24: e2e-clip "ladder climb: knees never knock" 8.9 vs > 9.0 cm (scripts/e2e-clip.mjs:250; master passes). Opus fix agent's WIP: src/anim/clips/traverse.ts:389 CLIMB_UP `fLX` holds -0.12 over 0.36-0.5 (plus debug-only logs in e2e-clip.mjs, drop before commit); saved at refs/heads/wip/b22-ladder-knees (7a56088d). Finish: e2e-clip / traverse / anim green, commit, push. |
| #214 batch 23 | feature/ctcore-batch-23 (folder ctcore-batch) | 92ba8c94 | sd-rounds + team-climb + interrogation-intel + ipad-fit. Checker PASS (scratch/ctcore/b23-CHECK.md). Laptop 10/10 GREEN on dc8919cd; ipad-fit e2e-menus / desktop PASS. After #207's fix: merge batch-22 in, laptop e2e-clip (+ the batch's suites if src changed), train-ready message. |
| #221 mocap-strafe | feature/mocap-strafe | 191c3565 | Recheck PASS, e2e-anim / clip PASS; train-ready sent. Polish list: docs/mocap-trial/MT2-STRAFE.md "Recheck after round 3". |
| #223 batch 24 pose-parity | feature/pose-parity | 19248c01 | PROTOCOL 36 (renumber at train if taken). Check PASS, laptop coop / netmove / takedown GREEN; train-ready sent. Stacked on #214. |

## Next, at once (parallel)
1. If the b22-fix agent was lost: restart an Opus agent in folder b22-fix from the WIP above with the table's goal.
2. When #207 is green: steps in the #214 row; message the orchestrator train-ready for #207 + #214 (+ #221 + #223).
3. Then start spare 7 crouch pops (spare-jobs.md row 7, feature/menu; characterRig / footPlanner, after the b22 fix):
   write a strict brief, Opus builder, own folder off batch 24 or master 4.74.0.
4. Follow-ups noted: Guard AI `Enemy.patrolRoute` getter (forwarded by the orchestrator); intel part B (modes'
   onIntelCode) after marlow-final / sector-redesign; relay climber sub bit (pose-parity open item); Michael's iPad look.

## Resume prompt
```
Night Shift | Player Build: RESUME after the account swap. Model Opus, effort medium. Read CLAUDE.md ("Sessions":
"Heavy-usage throughput", "Token rules", "Account swap"; on origin/feature/menu if newer than master), then
docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to C:/NightShift/scratch/ctcore/resume-ct-core.md and
push updates with scratch/ctcore/push-resume.sh. A heavy.lock / heavy2.lock naming Player Build with no node / bash
process of ours is stale: delete it. Turn off unused connectors. Message "Night Shift | Orchestrator" once that you
resumed, then only at PR open / train-ready / blocked / Michael needed. Work "Next" top down. e2e always E2E_GPU=1.
```

## History (2026-10-23 window 12:20-14:05)
Restarted r3 / team-climb / sd-rounds, started spare 9, ipad-fit (Michael ~13:05) and spare 6. #207 laptop 8/8 green,
then out of train 24 on e2e-clip. Opened #214, #221, #223. Spare 16 was already merged (partner-seed); spare 12 is in #207.
