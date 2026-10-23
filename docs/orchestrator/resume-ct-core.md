# Resume - Night Shift | Player Build (formerly CT Core Build; resumed 2026-10-23 swap 2, agents launched)

Rules: CLAUDE.md on origin/feature/menu "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; desktop CPU < 80%. e2e always E2E_GPU=1:
laptop (Test Runner, bridge in docs/orchestrator/STATE.md) for coop / netmove / ctcourse and batches, one verdict per
batch; desktop heavy.lock (4191) / heavy2.lock (4192) for single suites. Agent rules: scratch/mt2/COMMON.md,
COMMON-SPARE.md (subagents are refused REPORT.md: the lead writes it from the hand-back). Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

## Open (master 4.74.0; #221 in train 26, origin/train/26 a63e6f4b). Train 27: #207 + #214 + #223 once green.
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #207 batch 22 | feature/ctcore-batch-22 (b22-fix) | 99c37251 + WIP | Opus agent fixing e2e-clip ladder knees 8.9 vs > 9.0 cm (scripts/e2e-clip.mjs:250) via src/anim/clips/traverse.ts:389 fLX; report docs/ctcore-batch-22/LADDER-KNEES.md; then e2e-clip / traverse / anim. |
| #214 batch 23 | feature/ctcore-batch-23 (ctcore-batch) | 92ba8c94 + WIP | Opus agent: commit Anim Studio out of pause (main menu only, tuner stays), merge origin/master 4.74.0, patrol-timing intel via Enemy.patrolRoute (src/ai/enemy.ts:651), report docs/interrogation-intel/PATROL-TIMING.md; e2e-menus / studio. Then merge batch-22 in, laptop request, train-ready. iPad fit already PASS. |
| #223 batch 24 pose-parity | feature/pose-parity | 19248c01 | PROTOCOL 36. Green; stacked on #214: merge batch-23 in when green, train-ready. |
| spare 7 crouch-pops | feature/crouch-pops (crouch-pops) | 191c3565 | Opus agent restarted: pops 9.6 / 8.3 cm -> <= 0.5 (docs/anim-bake-targets/STATE.md:19). Stacks on #221. |
| walk P1-P5 anim fix pass | feature/anim-fix-pass (anim-fix-pass) | 191c3565 | Opus planner: docs/anim-fix-pass/BRIEF.md + PLAN.md + before sheets; then build slices in parallel, one checker. |
| walk P6-P7 co-op | feature/coop-walk-fixes (coop-walk-fixes) | 19248c01 | Opus builder: hostage takedown both ways, partner shot audio once + suppressed; laptop e2e-coop / netmove after. |

## Next
1. As each agent hands back: one Opus checker per batch, laptop request to Test Runner (coop / netmove / ctcourse + clip), train-ready to the orchestrator.
2. Anim-fix-pass: launch the PLAN's parallel groups as soon as it lands (CPU < 80%).
3. Agent rules: scratch/ctcore/COMMON-27.md. Walk report copy: scratch/ctcore/walk472.md.
4. Follow-ups: intel part B (modes' onIntelCode) after marlow-final / sector-redesign; relay climber sub bit (pose-parity open item).

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
