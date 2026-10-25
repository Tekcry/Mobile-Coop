# laptop-queue-7 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26)
Branch feature/laptop-queue-7, worktree C:/NightShift/Mobile-Coop-laptop-queue-7, cut from origin/master 2a937eb6.
BRIEF.md and PLAN.md written (Opus planner); no code yet.
- Slices in order on the branch: A conflicting affected heads, B front / green smallest-first, C moved train head
  (carry or run), D train rerun sharding, F aged alone after the coming train, E verify laptop-queue-6 across the
  next train + docs + fragment.
- Builders: A, B, E Sonnet; C, D, F Opus. One Opus checker for the PR (queue code).
- Plan checker FIX round 1 done (starvation bound over greens, carry from the newest final verdict, polish); slice F
  added from the Orchestrator's 09:48 audit.

Slice A done: lib.mjs prBoard :700, affectedNeeds conflicting :1010ish, conflictRetire :1042, conflictStatuses :1055;
service.mjs env :PR_BOARD_MS / SKIP_CONFLICTING, affectedPass skip :469, prBoardNow :573, applyConflicts :1446, pass()
call :1510; tests in "affected e2e on every PR head" (4 new). Vitest 156 pass, typecheck:fast clean.

Slice B done: lib.mjs isFront :234, greenIds :245, pickFrom order tiers :305 (+ arrivalNext after it), pick doc header;
service.mjs env GREEN_FIRST / FRONT_BRANCHES / GREEN_MAX_WAIT_MS ~:147, queue.order + "order:" log :1602 (before the pick loop);
tests: describe "pick: front, green smallest first" (11) beside the first pick describe. Vitest 167 pass, typecheck:fast clean.

Slice C done: lib.mjs docsOnlyFiles :467 (watchdog.mjs:227 re-exports it), isVersionHead :470, versionAt :480,
carryFiles :496, carryFrom :510 (live injected), carryDesc :520; service.mjs env TRAIN_CARRY / TRAIN_CARRY_DEPTH :151,
nextTrainNow isVersion :611, trainChain :631, carryMoved :656 (chain reads, live(P), carry / wait / run), pendingTrains
moved-head call :753, openTrainHeads Map :760, followsTrain :772, voidHeads :791 (void watch :1112), carryOnto :1195
(after a pass). lastTrainEndFrom left for slice F (PLAN places it there). Tests: describe "train head moves (trains 111
/ 112)" :1534 (5), autoTrain carried-release case :810. Vitest 243 pass (+ watchdog 28), typecheck:fast clean.
PR body note (PLAN Risks): no src/ or e2e read of a docs/ .md file; only offline scripts/kestrel/p03b-*-check-*.mjs read
docs/kestrel/*.md (not laptop suites).

Slice D done: lib.mjs pickFrom rerun shard branch :301 (returns ports both), suiteParts :407 (expectedWallS calls it);
service.mjs env RERUN_SHARD :153, runRequest(r, port, pair) :1239 (ctls per slot, dropSlot :1262 = lock / prepare
fallback to the other slot alone, "rerun sharded on" :1343, bins split :1414), dispatch p.ports :1491, pass()
queue.shardRerun :1777. Tests: 6 new in "train reruns" :1202. Vitest 249 pass, typecheck:fast clean. Header comment
:22 (reruns "on one slot") left for slice E's header pass.

Next: slice F (aged alone after the coming train; Opus).
