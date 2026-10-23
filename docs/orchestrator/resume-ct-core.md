# Resume - Night Shift | Player Build (resumed 2026-10-23 16:05 after the swap)

Rules: CLAUDE.md on origin/feature/menu "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; desktop CPU < 80%. e2e always E2E_GPU=1:
laptop (Test Runner, bridge in docs/orchestrator/STATE.md) for coop / netmove / ctcourse and batches, one verdict per
batch; desktop heavy.lock (4191) / heavy2.lock (4192) for single suites. Agent rules: scratch/mt2/COMMON.md,
COMMON-SPARE.md (subagents are refused REPORT.md: the lead writes it from the hand-back). Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

## Open (4.76.0 = train 27 incl. #227). Train 28 origin/train/28 3a2b1e9a = #207 + Guard AI #230. Train 29 = #229 S9 + #232 + #228 (master PROTOCOL 38). Stack #214 -> #223 -> #231 = a later train, ONE bump: at that train's master merge set PROTOCOL 39 at the stack tip (#231) + asserts. AF6 = 40 (renumber at its own merge; branch says 39 now).
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #207 batch 22 | feature/ctcore-batch-22 (b22-fix) | f1fac44a | TRAIN-READY sent 16:15 (ladder knees 14.4 cm, e2e-clip GPU PASS, CI green). |
| #214 batch 23 (+iPad fit, Anim Studio main menu only) | feature/ctcore-batch-23 (ctcore-batch) | 498b65df | +batch-22; intel feed fix 498b65df (coopClient feed -> hud.feedItem, desktop e2e-coop PASS). Train-ready on the laptop verdict for d86007b5. |
| #223 pose-parity | feature/pose-parity | b8f45be7 | +batch-23 merged, PROTOCOL 36, crateWire assert 36. Same verdict. |
| #231 coop-walk-fixes (walk P6-P7) | feature/coop-walk-fixes | 0d7f04ce | PROTOCOL 37. Laptop d86007b5 6/7 (coop failed on intel, fixed); laptop e2e-coop rerun on 0d7f04ce requested -> train-ready x3 (train 29). |
| anim-fix-pass (walk P1-P5; PLAN.md:7 maps P1-P7) | feature/anim-fix-pass | origin | AF0 / AF1 / AF2 / AF5 merged (44ed5389; AF1 checker PASS). AF3 running (afp-af3, node_modules junction to afp-af1). AF4a done c0fab095 (e2e-anim GPU PASS; pistol grip 1.01 vs 1.0 -> AF4b; AF4a-REPORT.md open items). AF6 handed back 9048e2b7 (PROTOCOL 39; pops ~0, gait ok; wall 21-31 cm vs 20, lowerBody 15-45 vs 10 miss: causes in characterRig / footPlanner, outside AF6 -> checker decides, polish per current goal). AF6 head b1de49f5 (merged 0d7f04ce); laptop e2e-coop + netmove requested. |

## Next
1. AF3 hand-back -> checker (batch with AF4a / AF6) -> merge; then AF4b (animGraph, after AF3).
2. AF4a / AF6 hand-backs -> one Opus checker for the batch -> merge into anim-fix-pass; AF6 merges coop-walk-fixes head first.
3. Laptop verdict on d86007b5 -> train-ready #214 / #223 / #231 to the orchestrator.
4. Agent rules: scratch/ctcore/COMMON-27.md. Follow-ups: intel part B (onIntelCode); relay climber sub bit.

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
