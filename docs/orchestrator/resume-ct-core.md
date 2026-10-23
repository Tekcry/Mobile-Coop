# Resume - Night Shift | Player Build (resumed 2026-10-23 19:58 after the swap; locks absent, connectors lean)

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
Cloud builder ("Night Shift | Cloud Builder 1", one-way): briefs as briefs/<job>-<slice>.md on orphan branch
`cloud-queue`, line 1 `status: open` (format: README.md there); at each check `done <branch> <sha>` -> fetch, review,
check; `blocked <reason>` -> answer in the file, set open. Use it first for CPU-heavy builder slices.
Laptop queue: self-service from feature/laptop-queue (docs/systems/testing-tools.md "Laptop queue"; results as GitHub statuses laptop-e2e/<set>); until it merges, ask Test Runner.
Released: #227 (4.76.0), #207 batch 22 (4.77.0), #214 -> #223 -> #231 stack (4.79.0, train 30, PROTOCOL 40).

## Open (master 41204e30 = 4.80.0, train 31, PROTOCOL 41; train 32 25c712c9 at PROTOCOL 42 on the laptop 19:49, status laptop-e2e; #247 merge-tree vs train/32 = the brief's 15 files exactly, 19:59)
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| (#239 optic cable released in train 31, 4.80.0) | | | |
| #247 anim-fix-pass (walk P1-P5; PLAN.md:7 maps P1-P7, P6-P7 = #231 released) | feature/anim-fix-pass | 3168f31a+STATE | PR open 19:45, all AF0-AF6 checker PASS; AF4b laptop e2e-anim + clip PASS. Train 33 (orchestrator 19:50): after train 32 releases (~20:15+, brings #244: PROTOCOL bump moves into the train build, number asserts removed) merge master, take master's side in protocol.ts + assert tests (NO renumber), brief briefs/afp-train-entry.md, laptop e2e-coop + netmove, train-ready. |
| #249 stealth-pays (stealth over shooting 9; 7 and 12 already on master; docs/stealth-pays/) | feature/stealth-pays (stealth-pays) | d228ce59 (STATE only past 30ab34e7) | TRAIN-READY sent 19:3x, labelled (laptop ctcourse + sectorops PASS on bf9445d6; S3 docs after). Orchestrator labels. P1 parked (wire). |

## Next
1. #247: once train 32 is on master, run briefs/afp-train-entry.md (master's side, no renumber), laptop e2e-coop + netmove, message train-ready (orchestrator labels until Michael adds a permission rule).
2. Entering its train: merge master; conflicts = src/net/protocol.ts, the 11 PROTOCOL assert tests, settingsScreen.ts
   (git merge-tree). AF6 wire number after Guard AI 41 and marlow-final 42: orchestrator confirms (43?); NO renumber from train 32 (#244). Laptop e2e-coop + netmove on the merged head.
3. After ANY master / train merge: run every test file with a PROTOCOL_VERSION assert (git grep -l PROTOCOL_VERSION -- tests)
   + tsc; master check worktree C:/NightShift/Mobile-Coop-proto-check (detached, node_modules junction to Mobile-Coop-train).
4. Draft next anim pass briefs/afp-next-pass.md (AF0b, AF7 drawn legs on mocap, AF8a glide cadence / back step, AF9 idle,
   AF8b, AF9r parked): starts after Michael walks AF0-AF6 unless the orchestrator says go; D1 for Michael (idle stance width:
   G27 feet-together vs CT audit row 20 0.3-0.4 m) needs a decision pack (sheets) when asked.
5. Follow-ups (not in a PLAN yet): intel part B (onIntelCode); relay climber sub bit; stealth-over-shooting CT Core items
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
