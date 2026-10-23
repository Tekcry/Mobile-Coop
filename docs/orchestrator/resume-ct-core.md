# Resume - Night Shift | Player Build (resumed 2026-10-23 16:05 after the swap)

Rules: CLAUDE.md on origin/feature/menu "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; desktop CPU < 80%. e2e always E2E_GPU=1:
laptop (Test Runner, bridge in docs/orchestrator/STATE.md) for coop / netmove / ctcourse and batches, one verdict per
batch; desktop heavy.lock (4191) / heavy2.lock (4192) for single suites. Agent rules: scratch/mt2/COMMON.md,
COMMON-SPARE.md (subagents are refused REPORT.md: the lead writes it from the hand-back). Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

## Open (master f16600f5 after train 28 incl. #207). Train 29 origin/train/29 61972cf1 = PROTOCOL 38. Train 30 = my stack (40) right after train 29. Guard AI S9 = train 31 at 41. AF6 = 42 (one wire bump per train, merge order).
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #214 batch 23 (+iPad fit, Anim Studio main menu only) | feature/ctcore-batch-23 (ctcore-batch) | 596773d7 | + master 518c3fa1 (4.78.0); + master f16600f5 (coop shot noise: SD_OPEN_NOISE on open rounds) + train/29 (38). |
| #223 pose-parity | feature/pose-parity | 0b78ed7e | PROTOCOL 40 (one bump for the stack; asserts 40; net.test hello 39 refused / 40 joins). |
| #231 coop-walk-fixes (walk P6-P7) | feature/coop-walk-fixes | 5fdda912 | PROTOCOL 40 tip (master 4.78.0 merged; all PROTOCOL assert files pass). Laptop green on 0d7f04ce (coop) + d86007b5 (rest). CI pass x3, TRAIN-READY sent (train 30). |
| anim-fix-pass (walk P1-P5; PLAN.md:7 maps P1-P7) | feature/anim-fix-pass | origin | AF0 / AF1 / AF2 / AF4a / AF5 merged (20a67cd7; AF1, AF4a checker PASS). AF3 running (afp-af3, node_modules junction to afp-af1). AF6 checker PASS 2bb1ba3f (polish: wall, lowerBody, test titles; AF6-CHECK.md). Merge into anim-fix-pass after laptop e2e-coop + netmove (brings the stack in). AF6 head b1de49f5 (merged 0d7f04ce); laptop e2e-coop + netmove requested. |
| spare 15 optic cable (doors, local view, no wire) | feature/optic-cable (optic-cable) | 193724a3 | PR #239 open, checker PASS (docs/optic-cable/CHECK.md), e2e-stealth-ai GPU PASS. CI watch -> train-ready. |

## Next
1. AF3 hand-back -> checker (batch with AF4a / AF6) -> merge; then AF4b (animGraph, after AF3).
2. AF4b brief adds: pistol grip back to 1.0 (crouchStrafe.test.ts:32), hip swing 4.6-4.9 cm, kneel knee-out 10 cm (AF4a-CHECK.md).
3. Stack train-ready sent; renumber only if the orchestrator says so at the build. AF6 -> 42 when it merges into anim-fix-pass via the stack (scratch/ctcore/tests40.js renumbers asserts).
4. After ANY master / train merge: run every test file with a PROTOCOL_VERSION assert (git grep -l PROTOCOL_VERSION -- tests) + tsc. Agent rules: scratch/ctcore/COMMON-27.md. Follow-ups: intel part B (onIntelCode); relay climber sub bit.

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
