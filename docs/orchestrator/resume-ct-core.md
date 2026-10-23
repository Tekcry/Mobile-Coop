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
| #231 coop-walk-fixes (walk P6-P7) | feature/coop-walk-fixes | 907bea89 | PROTOCOL 40 tip. Train 30 (7e8b8c51) 38/39: e2e-stealth-ai shot fake read lastShotNoise 0 (gameState.ts:620); test fix 907bea89 (stealth-ai x3, sectorops x1). Desktop e2e-stealth-ai + e2e-sectorops GPU PASS on 907bea89 (sent 18:16); orchestrator rebuilds train 30. Laptop green on 0d7f04ce (coop) + d86007b5 (rest). CI pass x3, TRAIN-READY sent (train 30). |
| anim-fix-pass (walk P1-P5; PLAN.md:7 maps P1-P7) | feature/anim-fix-pass | origin | AF0-AF3, AF4a, AF5, AF6 merged (236601dc; all checker PASS). AF4b running, WIP save asked 18:1x (afp-af4b from 6dc4ccb2 = afp + AF3; owns animGraph / motion incl. any AF3 fix; carries AF4a pistol grip 1.0, hip swing, kneel knee-out, AF3 elbows 5.9). AF6 checker PASS 2bb1ba3f (polish: wall, lowerBody, test titles; AF6-CHECK.md). Merge into anim-fix-pass after laptop e2e-coop + netmove (brings the stack in). AF6 head b1de49f5 (merged 0d7f04ce); laptop e2e-coop + netmove requested. |
| spare 15 optic cable (doors, local view, no wire) | feature/optic-cable (optic-cable) | 193724a3 | PR #239 TRAIN-READY sent (CI pass, checker PASS, e2e-stealth-ai GPU PASS). |

## Next
1. AF4b hand-back -> checker -> merge -> anim-fix-pass PR (AF6 renumber to 42 then).
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
