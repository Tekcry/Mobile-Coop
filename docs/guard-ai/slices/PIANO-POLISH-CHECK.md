# Piano polish check (feature/guard-ai-piano-polish, head 23d664e08 on e910abee2 / #624)
PASS

Checker: Opus 5.5, 2026-10-27. Slice: `git diff e910abee2 23d664e08` (the two Polish items of `PIANO-GA6-CHECK-A.md`
"Polish (re-check)"). Builder's report `PIANO-POLISH-REPORT.md` read in full, including its notes for the checker.

## FIX
None.

## Findings
1. **Stranded off his storey (item 1): works.**
   - Away, no path home: `sweepWalk` (`src/ai/enemy.ts:3037`) adds up `swNoPath`, walks straight at the stop (the
     #624 result). At `strandT` it arms `swRetryT` and calls `routeFresh` once.
   - Stranded: `sweepStranded` (`:3017`) returns true, so the walker steps with `away && !strand` = false. He walks the
     lap at the stops' (x, z) on this floor: walk, hold, pan, on schedule.
   - A stop with no floor path calls `sweepHere`, which is consumed once in `sweepStep` and dropped when away or when a
     hold ends. He holds and pans in place, one A* per unreachable stop.
   - One home `goTo` runs per `strandRetry`. A hit zeroes `swNoPath` and keeps the plan, which is walked the same tick
     (the second `goTo` in `sweepWalk` returns `routePath[0]`, no replan). A miss clears the route again, so the floor
     plan is made at once.
2. **Route state (`routeFresh`, `routeGoal` ignoring height): correct.**
   - It is cleared only at the strand moment and around each retry. A single ping-pong is possible: one retry hit,
     then a home miss again. It needs the nav to change (a closure toggling), and then costs a fresh 4 s give-up.
   - No case skips a stop: `here` is reset after the first stop of the pass and after a hold ends.
   - No case stops moving: a stop is always either walked to, or held for at most its schedule.
   - Checked with the real `goTo` (scratch test, not committed: the real `Enemy.goTo` on a fake nav with
     `lineClear` false and a `findPath` that blocks the home storey).
     - 60 s blocked: 11 home A* (4 misses at 1/s, then one per 8 s) and 8 floor A*. At most 2 A* in any tick. The lap
       reached x 5.76 of 6.
     - Floor blocked too: 15 ticks with any A* in 60 s; both stops held and panned in place.
     - Path opened mid-lap: walking home 3.0 s later, and never stranded again over 20 s with the path open.
3. **No freeze.** The longest still spell with the real `goTo` was 8.07 s: a 4 s stand under the stop, then the 3 s
   hold there plus the turn onto the pan. That is `strandT` plus one hold. The cases covered:
   - no path home and no reachable stop: holds in place round the lap;
   - path opens mid-lap: found within `strandRetry`;
   - investigate then cooldown: `onLevel` -> `rejoinHome` zeroes `swNoPath`, a fresh 4 s, longest still 7.5 s over 40 s;
   - `stopSweep` while stranded: `clearSweep` clears `swCut` / `swHere`, and the first calm tick off the sweep zeroes
     `swNoPath` before any use.
4. **Cut pan (item 2): works.**
   - Away mid-hold: `swCut` is set and `swPanE` is NaN. `swHoldEnd` is kept, so expiry while away still advances `idx`.
   - Back on his storey, the hold resumes only at the stop (within `arrive`, or `sweepHere`). `swPan` restarts from its
     start yaw through the N2 gate.
   - `setSweep`, `clearSweep` and `sweepRejoin` clear the new flags.
5. **Off the scene sweep: unchanged.**
   - The non-sweep branch still calls `walker.step(..., NaN, away)` and `homeStep`. `swNoPath = 0` there is inert.
   - Talking pairs return before `sweepWalk` and are not built in the dark.
   - Investigations and alerts do not touch the new code. The GA6 storey return with a path is the same `goTo(g, homeY)`
     result.
6. **Allocation:** nothing new per tick. `findPath`'s array appears only on a plan, at most one home try per 8 s
   stranded, plus the floor replan after a miss.
7. **Tests are real and fail without the fix.** `src/ai/{patrol,enemy}.ts` were reverted to e910abee2 (constants kept):
   7 of the 8 new cases fail. The one that passes is the expiry-while-away regression guard, as the report says.

## Polish
- Stranded and walking the floor, a stop whose floor (x, z) is unwalkable but within `nearestWalkable` range still gets
  a full path. That path ends at the goal point itself (`src/ai/navGrid.ts:703`). He would press towards it and never
  reach `arrive`. The sweep has no stuck give-up, so it lasts until a retry finds the way home. Check A reports the hall
  floor under the deck stops as walkable, so this is not hit today. A later round could treat no progress on the floor
  plan like a miss (`sweepHere`).
- The stranding tests in `tests/pianoGuards.test.ts:799` use a `goTo` stand-in, so `routeFresh` and the real `goTo`
  throttle are unproven by a committed test. One case with the real `goTo` on a fake nav, as in the checker's scratch
  run, would pin them.
- A retry hit plans to `pts[idx]` before `walker.step`. If that same tick a hold ends and `idx` moves on, he walks the
  old stop's plan for up to 1 s (`routeT`) before the replan. This is cosmetic.
- As the report says: a way home past `goTo`'s 3000-cell budget is never found by the retry. `waiting` reports a cut
  hold's time left while he walks back to the stop.

## Commands and results
- `npm run typecheck:fast`: clean (exit 0).
- `npx vitest run tests/patrolSweep.test.ts tests/pianoGuards.test.ts tests/lockedDoorPath.test.ts
  tests/guardAiAllocManager.test.ts tests/responseWiring.test.ts`: 5 files, 95 passed. These are all the test files
  that use sweepStep, sweepClock, sweepCalm, sceneDark, setSweep, startSweep or sweepGuard.
- The same new cases against the pre-fix `src/ai/patrol.ts` and `src/ai/enemy.ts`: 7 failed, 1 passed. The source was
  restored after.
- Scratch real-`goTo` test (4 cases, deleted, not committed): 4 passed, with the numbers in Findings 2 and 3.
