# Piano GA6 check A (head 89f13ef1c)
**FIX**

Checker A (correctness and intent): Opus 5.5 (fresh), 2026-10-26. Scope: `git diff e772cb25d...89f13ef1c`, plus the
lead's merge 4bb733e14 (section "Merge 4bb733e14"). Read: origin/master CLAUDE.md, VISION section 4, the plan (section 8
over sections 2-5), the plan check, both builder reports, the full code diff, `pairs.ts` (`PairMeet.watch`),
`alertState.ts`, S4's `pianoScene.ts` and `thornbeckMill.ts` (origin/feature/piano-escape-s4 3fe34ca04).

Runs at 89f13ef1c:
- `npm run typecheck:fast`: clean.
- vitest pianoGuards, patrolSweep, sceneSweep, pairs, pairsWiring, replayDeterminism, awarenessWiring: 7 files, 138
  passed, 1 todo.
- Scratch runs (outside the repo, or deleted after): the real `sweepPlan` on the S4 mill routes (below), and a real-class
  watch case (FIX 1).
- The merge commit was read, not run.

## FIX
1. **The sweep pair's watch is deaf while the survivor is in cooldown, and GA7 puts both partners there.**
   - Where: `src/ai/enemyManager.ts:2472-2481` `fillPair`, which sets `g.calm = e.pairCalm`. `pairCalm`
     (`enemy.ts:1831`) is `unaware && caution === 0 && incident < 0`. `PairMeet.watch` (`pairs.ts:403-406`) resets
     `goneT` while the survivor is not calm.
   - When this happens:
     - After any sight investigation the guard is in `cooldown` for 45 s (`alertState.ts:186`, `cooldownTime` 45). The
       partner sent by `followGlimpse` also ends in cooldown, because incident -1 means `calmEnd` is false.
     - After one missing call, the section is cautious for 180 s (`MISSING.cautious`).
     - After a body is found, a held caution lasts until every guard aware of it is down.
   - Effect: during those windows one player can knife one partner, then the other, with no notice. Nothing happens if
     both are taken within the window. That is the hole F1 was raised to close: Michael's "Must force stealth,
     stalking, kills, coop kills". The storm's flashes make glimpses, and so cooldowns, common.
   - Proof: a scratch real-class case (the pianoGuards harness; the file was deleted after). On the sweep, partner A is
     taken while B is in `cooldown`. After 30 s of `pairStep`: 0 reports, `pairCalm` false. The same case with B
     `unaware` reports `missing` after 3 s.
   - Fix (scene only):
     - For `watchOnly` pairs, fill `calm` as "walking his sweep": up, not held, level `unaware` or `cooldown`, no board
       task. Caution is not tested.
     - Off the scene keep `pairCalm`.
     - Test in pianoGuards: one partner taken with the survivor in cooldown, and with the section cautious, gives
       `missing` after 3 s.
     - Log it as an assumption: a cautious guard still notices his partner gone.
2. **(At merge 4bb733e14) A sweeping gallery guard who goes down to the floor can never get back up.** This is the P2-2
   bug that master's #588 fixed for the walk home, and it comes back on the sweep.
   - Where:
     - `enemy.ts` calm patrol (4bb733e14 ~:3076-3105): on the sweep it calls `walker.step(dt, x, z, motion.yaw)` with
       no `away`, and walks with `goTo(g, dt, 0.05)` with no `y`.
     - `goTo` with no height picks "the storey nearest its own" (`enemy.ts` ~:2906).
     - `PatrolWalker.sweepStep` (`patrol.ts:240-247`) decides arrival in 2D.
   - Effect: G7-G12 stand on the deck (`y: DECK_Y`). Several things can send one of them to the floor:
     - a flash glimpse of a player below (G8 and G9 look into the crane well),
     - the follow,
     - a missing or body incident.

     On his rejoin he plans to the floor cell under his deck stop, "arrives" there, and holds and pans there. He then
     walks his whole lap on the floor under the gallery for the rest of the scene. The lane, the pair and the K8 and
     K10 co-op kills are gone.

     This assumes the floor under the stop is walkable. The gallery's crane bay and the landing at z 15-18 sit over
     the hall.
   - Fix:
     - Keep the merge's choice of plain `goTo` with no give-up.
     - Pass the home storey: `goTo(g, dt, 0.05, this.homeY) ?? g`.
     - Pass `away` (`|pos.y - homeY| >= 1.2`) on the sweep too. `sweepStep` should treat `away` as not arrived: it
       returns the stop instead of holding.
     - Test: a swept deck guard placed on the floor below his stop walks to the deck stop and does not hold under it.

## Focus answers
1. **Off the scene: unchanged.**
   - Every new path is gated:
     - `placeSlot` runs `sweepify` only when `darkOn`, else `buildPair` as before.
     - `walker.step` is the old path when `sw` is null. `bodyYaw` is ignored off the sweep.
     - The pace and investigate branches test `walker.sweeping`.
     - `steerFrom` gets `skip` = null, because `sweepMate` is null.
     - `inherit` copies null / 1 / null.
     - `swapSlot` is guarded on `sweepMate` and `darkOn`.
     - The bark hush is off, because `quietRise` is always false.
     - The sweep clock and `glimpseFollow` run only when `darkOn`.
   - Setting false when it is already false does nothing.
   - The one off-scene allocation is the resize of `followSeen`, at section load only.
2. **On the scene.**
   - Schedules, pans and pairs:
     - Partners share one plan shape: same stops, waits and start.
     - Sides are +1 for the lower slot and -1 for the partner, and are set both ways (N5).
     - The watch-only `PairMeet` has `open == close == 0`, so `inWindow` is always false: it never meets and never
       talks.
   - Set true: it acts on every set. The clock goes to 0, the pairs are cleared and rebuilt, and every guard is swept.
     This is safe with S4's `spawnBeat` (dark, then spawn) and on restart.
   - Set false (N4): `clearSweep` and then `rejoin` as built. The watch pairs and the buffer are cleared. Talking pairs
     come back only at the next section load (GA6b-A3, acceptable).
   - Rejoin:
     - Every calm return (search end, investigation, lure, breaker, revive through `inherit`) goes through
       `sweepRejoin`.
     - `rejoinStop` keeps its order over time: a stop whose `t` is smallest stays smallest until its window passes. So
       a second rejoin (cooldown to unaware, 45 s later) keeps or improves the target, and does not flip a guard who
       is on time.
     - A late arrival leaves at once and catches up through slack and the over-estimated turn time.
     - More than half a lap late: he holds into the next lap. No guard drifts for good.
   - Stuck: a hold is at most one lap (G3: 75.6 s). There is no loop without progress (`sweepStep` passes at most n+1
     stops a step). Legs are walked with `goTo` (A*), not straight, so a guard does not walk into a wall. Only the
     timing uses straight lengths.
   - Watch: one partner taken while the other is calm gives `missing` in 3 s, and both taken nothing, as tested.
     Cooldown and caution are gaps (FIX 1).
   - GA7 follow:
     - The trigger is a sight rise, the guard suspicious or investigating, and a partner up, calm and within 4 m.
       That is explainable.
     - Each rise is seen once (`followSeen`), so he is never sent twice.
     - There is no echo loop:
       - the partner's rise is `RISE_SOUND`;
       - even if it were sight, the first guard is not calm.
     - One line (`checking`), because `quietRise` hushes the suspicious and investigating barks.
3. **Real mill data (S4 3fe34ca04, real `sweepPlan`).**
   - Laps (s):

     | Guard | Lap (s) |
     | --- | --- |
     | G1 / G2 | 29.18 / 29.18 |
     | G3 | 75.60 |
     | **G4 / G5** | **52.98 / 51.47** |
     | G6 | 16.00 |
     | G7 | 33.33 |
     | G8 / G9 | 40.04 / 40.04 |
     | G10 | 12.00 |
     | G11 / G12 | 28.04 / 28.04 |

   - Pairs both ways: yes. Posts G6 and G10 face-pan correctly: two points on one spot, legs of length 0, a lap of 2 x
     wait.
   - **G4 and G5 do not share a period.** S4 tuned them "no turn time" to 40 s, but `sweepPlan` adds the N2 turn time
     and the 0.8 s slack.
     - They leave the door 5.2 s apart on the first lap.
     - The gap closes by 1.5 s a lap, crosses near lap 4, then opens again.
     - So the K5 door check and their watch's "together" happen only now and then.
   - This is Campaign's data, not this PR. It must go to S4 with the numbers:
     - Walking time per lap at the real `sweepPlan`: G4 42.127 s, G5 30.901 s, so 40 s cannot be reached.
     - A 50 s lap: G4 `waits[0]` 3.8730, G5 `waits[0]` 15.0988, G4 `start {0, 0}`, G5 `start {0, 6.5317}`. Both lap
       50.000 s and both leave the door at 23.56 s on every lap (checked with `sweepPlan`).
     - S4's tests should assert `sweepPeriod` equality, not hand sums.
   - At the EMP:
     - G1 (1.1 m from his start), G4 (9.8 m) and G3 (0.5 m, just over the 0.45 m arrive radius) rejoin.
     - G2 and G5 hold at their start stop.
     - G1-G4 are searched anyway.
4. **Determinism.** Nothing in the GA6 code reads the clock or random.
   - The sweep clock resets on every set to true.
   - A guard's time is `phase + sweepClock` at placement, plus his own walker clock, which ticks every update while he
     is alive. Revive adds `downFor`.
   - Same inputs give the same schedule. replayDeterminism passes.
5. **Assumptions.**
   - GA6a-A1 to A7: sound. A1 (the worse pan extreme) is what keeps partners on one plan. A3 is needed for one-stop
     posts.
   - GA6b, sound: A1, A2, A4, A6, A8, A9, A10, A11 (the helper is outside the plan's claims; harmless).
   - GA6b-A3: acceptable, because the scene ends the mission.
   - GA6b-A5: fine for the follow. The watch's calm is the issue (FIX 1).
   - GA6b-A7: boxed doubles within the `guardAiAlloc` bounds, with no objects, closures or arrays. Accept.

## Merge 4bb733e14
- **Resolution: right in shape.**
  - `step(dt, x, z, bodyYaw, away)` keeps the sweep branch first.
  - The sweep keeps plain `goTo`. `homeStep`'s `giveUp` (which calls `advance` on the route) would knock a sweeping
    guard off his plan's `idx` with nothing to resync it. Keeping it out is correct.
  - The sweep clock ticks after `sliceTick`. Its order against the guards is unchanged, because both run before the
    guard loop.
  - The test helper's home fields and slice stubs match the constructor.
- **#588 interactions:**
  - `rejoinHome` is `walker.rejoin` plus `homeG = null`, so it reaches `sweepRejoin` on revive, breaker, lure and
    calm. Fine.
  - The revive give-up (`reviveQuit`, `walkStalled`) and the alarm-runner give-up (`alarmBarred`) do not touch the
    walker. Fine.
  - `if (!g || pf === pf) homeG = null` is harmless on the sweep.
  - Lookout `slotPost` runs before `sweepify`. No mill guard has a post.
  - Gap: the storey. The sweep does not use `homeY` and `away`, which #588 added for this case (FIX 2).

## Polish
- `quietRise` stays set if the sent partner never rises: for example, he is taken in the same tick. It is cleared on
  his next transition other than to suspicious, so at most one hushed suspicious bark.
- `rejoinStop` uses straight distance without the turn or the storey, so rejoins land a little late. This is absorbed
  as GA6a-A4 says.
- The GA6b report says `update`'s clock tick and the `glimpseFollow` call are not driven by tests. A one-case
  `em.update` smoke test with `sceneDark` on would cover both lines.

## Re-check 1fe0bc3f6
**FIX** (both original FIXes closed; one red unit test on the PR head, from GA6b, not from this round)

Re-checker: Opus 5.5 (fresh), 2026-10-26. Scope: `git diff ad3c1afd9 1fe0bc3f6` (enemy.ts, enemyManager.ts, patrol.ts,
patrolSweep, pianoGuards, guardAiAllocManager), read against `pairs.ts` `watch` and `Enemy.goTo`.

Original FIXes:
1. FIX 1 (watch deaf in cooldown / caution): **closed.** `Enemy.sweepCalm` (`enemy.ts:1916-1919`: unaware or cooldown,
   no incident, not taken, no `camBody`, alive; caution not tested). `fillPair` takes it only for `watchOnly` pairs
   (`enemyManager.ts:2519`, `:2541`); `watchOnly` is set only by `sweepify` (`:2364`), so talking pairs and posted /
   S6 watch pairs keep `pairCalm`. No repeat calls: `PairMeet` latches `missing` until `reset` (`pairs.ts:327`). The
   reporter's own incident makes him not calm while the call runs.
2. FIX 2 (deck sweep leaves his storey): **closed.** `away` is passed on the sweep (`enemy.ts:3086-3089`), the walk is
   `goTo(g, dt, 0.05, this.homeY)` (`enemy.ts:3115`), and `sweepStep` treats `away` as not arrived (`patrol.ts:189`,
   `:229-248`): the stop to walk to, no hold, no pan. A hold that runs out while away still advances `idx`. A pending
   rejoin keeps its stop. Off the sweep the plain walker gets the same `away` as before.

Tests exercise the fixes: with `src/ai/{enemy,enemyManager,patrol}.ts` put back to ad3c1afd9 (restored after), 5
of the new cases fail: both patrolSweep away cases, FIX 1, FIX 2 and B Polish 2. The em.update smoke case passes either
way, as expected: it covers lines that were already there.

Polish claims: B1 (warm 30000, bound 4 x 16 B against a 48 B reading; an object on top still fails) fine. B2 (`clear()`
zeroes `sweepClock`, `enemyManager.ts:4242`, `darkOn` kept) fine. A3 / B8 smoke case fine. No hot-path allocation added
(a getter of booleans, a boolean local, an extra boolean argument).

## FIX (re-check)
1. **`tests/lockedDoorPath.test.ts` fails on this head** ("a noise inside the locked room ... not `investigateMax`"):
   `TypeError: Cannot read properties of undefined (reading 'sweeping')` at `enemy.ts:3271`. GA6b's sweep-pace line
   (f622ae8b8) reads `this.walker.sweeping` in the investigating branch. The test's hand-built enemy (`lockedDoorPath.test.ts:372-376`)
   has no `walker`. Not a game bug: a real `Enemy` always has a walker. But CI `test` will be red and the PR cannot merge.
   Not caught before because check A's runs did not include this file. Fix: add `walker: { sweeping: false }` to that
   test's `Object.assign` stub, then run every test file that imports `enemy.ts` / `enemyManager.ts`.

## Polish (re-check)
- With no path up (the deck unreachable from where he stands: the stair gate's nav closure shut behind him, or past
  `goTo`'s 3000-cell budget), a swept deck guard now stands under his stop with no give-up. Before the fix he walked
  his lap on the floor. Both are off-intent and both need an unusual state. A later round could drop `away` after some
  seconds of `routeMiss`.
- A hold interrupted by `away` keeps `swPanE` frozen. Back up mid-hold, the pan resumes where it stopped and is cut at
  `leave` (cosmetic).
- `sweepCalm` tests `alive`, which `fillPair` has already checked (harmless).

## Commands (re-check)
- `npm run typecheck:fast`: clean.
- `npx vitest run` patrolSweep, pianoGuards, guardAiAllocManager, responseWiring, sceneSweep, pairs, pairsWiring,
  replayDeterminism, awarenessWiring: 9 files, 173 passed, 1 todo.
- `npx vitest run` on every test file that imports `src/ai/patrol` or `src/ai/enemyManager` (66 files): 1536 passed,
  1 todo, **1 failed** (lockedDoorPath, above). The same failure shows when that file runs alone.
- The 3 named files against the pre-fix source (above): 5 failed, 49 passed.
