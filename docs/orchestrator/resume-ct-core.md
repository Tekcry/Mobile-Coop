# Resume - Night Shift | Player Build (saved 2026-10-23 ~15:15 at the 82% swap save; all agent worktrees WIP-pushed)

Rules: CLAUDE.md on origin/feature/menu "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; desktop CPU < 80%. e2e always E2E_GPU=1:
laptop (Test Runner, bridge in docs/orchestrator/STATE.md) for coop / netmove / ctcourse and batches, one verdict per
batch; desktop heavy.lock (4191) / heavy2.lock (4192) for single suites. Agent rules: scratch/mt2/COMMON.md,
COMMON-SPARE.md (subagents are refused REPORT.md: the lead writes it from the hand-back). Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

## Open (master f5912402 after train 26, PROTOCOL 35; #221 merged). Train 27: #207 + #214 + #223 + #227 once green.
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #207 batch 22 | feature/ctcore-batch-22 (b22-fix) | 59d69a76 WIP | Opus agent on ladder knees (e2e-clip 8.9 vs > 9.0, src/anim/clips/traverse.ts:389 fLX); told to merge master f5912402 and set tests/hangDownNet.test.ts:15 to 35 (CI red). If lost: restart from 59d69a76 with that goal. |
| #214 batch 23 | feature/ctcore-batch-23 (ctcore-batch) | 0eaba0f8 | Recheck PASS. Merged master f5912402 (train 26, protocol 35); hangDownNet asserts 35 (CI was red on 31). Waiting on #207: merge batch-22 in, laptop batch (coop, netmove, ctcourse, clip, pad), train-ready. |
| #223 batch 24 pose-parity | feature/pose-parity | 19248c01 | PROTOCOL 36. Green; stacked on #214: merge batch-23 in when green, train-ready. |
| spare 7 crouch-pops #227 | feature/crouch-pops (crouch-pops) | 642ad971 | Checker PASS, e2e-anim / clip PASS. PR #227 open, train-ready sent (stacks on #221). Polish: docs/crouch-pops/CHECK.md 1-3 (OFF running crouch-down wristR 9.47 cm). |
| walk P1-P5 anim fix pass | feature/anim-fix-pass (anim-fix-pass) | 0c886207 | Merged AF0, AF5, AF2 (run pelvis / lean / bank PASS; wrist jerk 1.44-2.45 vs bar 1.0 and sprint knee 45 deg not met - remeasure after AF1, polish). Running: AF1 afp-af1, AF4a afp-af4a (off 0c886207), AF6 afp-af6 (off coop-walk-fixes). Next: AF3 after AF1 merges (animGraph), then AF4b; one checker; flag M4 narrowing (AF5) at PR. |
| walk P6-P7 co-op | feature/coop-walk-fixes (coop-walk-fixes) | a4e1fe64 | Checker PASS, PROTOCOL 37. Laptop c6b4f4a3: netmove ok, e2e-coop FAIL at the old dual-takedown step right after the new hostage step (new step passes). Opus fix round 1 running; then laptop e2e-coop rerun, PR, train-ready; AF6 merges the fix. |

## Next
1. As each agent hands back: one Opus checker per batch, laptop request to Test Runner (coop / netmove / ctcourse + clip), train-ready to the orchestrator.
2. AF6 worktree ready (Mobile-Coop-afp-af6, feature/afp-af6 off coop-walk-fixes a4e1fe64; wire change -> PROTOCOL 38): start when desktop CPU < 80% (97% at 14:5x). Anim-fix-pass: launch the PLAN's parallel groups as soon as it lands (CPU < 80%).
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
