# Resume - Night Shift | Player Build (resumed 2026-10-23 18:35 after the swap)

Rules: CLAUDE.md on origin/master "Session titles", "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; Haiku chores; desktop CPU < 80%. e2e always
E2E_GPU=1: laptop (Test Runner) for coop / netmove / ctcourse and batches, one verdict per batch; desktop heavy.lock (4191)
/ heavy2.lock (4192) for single suites. Agent rules: scratch/ctcore/COMMON-27.md. Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

Orchestrator 19:15 ("Pipeline speed-ups"): NO e2e on the desktop (heavy.lock = build / check only); every suite to the
laptop queue; fresh checker + laptop request on the same commit in parallel; fix round reruns only what failed;
train-ready = message + `gh pr edit <n> --add-label train-ready` (auto mode denied the label 19:2x: Michael adds it or
allows it); use `node scripts/run-e2e.mjs --affected origin/master --list` once it lands. Prompts are stateless from the
next swap: this block carries all state.
Orchestrator 19:25 ("Tokens for progress"): lead at high effort (set in the app; a session cannot raise its own);
an Opus agent keeps briefs for the next 2-3 slices ready (scratch/ctcore/briefs/); 2 independent checkers on AI /
src/net changes; Opus triage agent at once on every laptop failure; a checker FAIL gets an Opus fix round and Opus
siblings; questions to Michael carry a decision pack (prototype / shots / GPU sheets). Desktop CPU < ~80%.
Released: #227 (4.76.0), #207 batch 22 (4.77.0), #214 -> #223 -> #231 stack (4.79.0, train 30, PROTOCOL 40).

## Open (master 4f6db420 = 4.79.0, train 30, PROTOCOL 40; PROTOCOL asserts 11 files 210/210 + tsc green on it, 18:38)
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #239 optic cable (doors, no wire) | feature/optic-cable (optic-cable) | 193724a3 | Train 31, TRAIN-READY sent. Merges clean onto master 4f6db420. |
| anim-fix-pass (walk P1-P5; PLAN.md:7 maps P1-P7, P6-P7 = #231 released) | feature/anim-fix-pass | e1cafbe1 | AF0-AF3, AF4a, AF5, AF6 merged, all checker PASS. Waits on AF4b. |
| AF4b | feature/afp-af4b (afp-af4b) | 3b61826e + WIP | e2e-anim fail: low ready crouch->stand wristL 14.5 > 11.5 (afp-af4b-e2e-anim.log). Opus agent fixing (18:36); e2e-anim + e2e-clip go to the laptop. |
| stealth-pays (ROADMAP stealth over shooting 9 / 12 / 7; docs/stealth-pays/PLAN.md) | feature/stealth-pays (stealth-pays) | 956c1243 | 7 and 12 already on master; S1 (feature/stealth-pays-s1 53e89d69, done) + S2 (feature/stealth-pays-s2, building) -> merge into stealth-pays -> one checker + laptop e2e-ctcourse / e2e-sectorops in parallel -> S3 docs -> one batch PR. P1 (hang-down intel, wire) parked. |

## Next
1. AF4b fixed -> fresh Opus checker -> merge into anim-fix-pass -> PR to master.
2. Entering its train: merge master; conflicts = src/net/protocol.ts, the 11 PROTOCOL assert tests, settingsScreen.ts
   (git merge-tree). AF6 wire number after Guard AI 41 and marlow-final 42: orchestrator confirms (43?); renumber with
   scratch/ctcore/tests40.js. Laptop e2e-coop + netmove on the merged head.
3. After ANY master / train merge: run every test file with a PROTOCOL_VERSION assert (git grep -l PROTOCOL_VERSION -- tests)
   + tsc; master check worktree C:/NightShift/Mobile-Coop-proto-check (detached, node_modules junction to Mobile-Coop-train).
4. Follow-ups (not in a PLAN yet): intel part B (onIntelCode); relay climber sub bit; stealth-over-shooting CT Core items
   9 / 12 / 7 (ROADMAP "Next: stealth over shooting").

## Resume prompt
```
Night Shift | Player Build: RESUME after the account swap. Model Opus, effort medium. set_session_title "self" ->
"Night Shift | Player Build". Read CLAUDE.md (origin/master "Sessions"), then docs/orchestrator/resume-ct-core.md on
origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to
C:/NightShift/scratch/ctcore/resume-ct-core.md and push updates with scratch/ctcore/push-resume.sh. A heavy.lock /
heavy2.lock naming Player Build with no node / bash process of ours is stale: delete it. Turn off unused connectors.
Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / Michael needed. Work "Next" top down.
e2e always E2E_GPU=1.
```

## History
- 2026-10-23 16:05-18:30: stack #214 -> #223 -> #231 released in train 30 (4.79.0); #207 in 4.77.0; #227 4.76.0; #239 opened;
  AF1, AF4a, AF6, AF3 built, checked, merged into anim-fix-pass; AF4b started.
- 2026-10-23 12:20-14:05: restarted r3 / team-climb / sd-rounds, spare 9, ipad-fit, spare 6; opened #214, #221, #223.
