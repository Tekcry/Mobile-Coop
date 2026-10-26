PASS - the three blocking defects (CHECK-A 1, CHECK-B 1 and 2) are fixed by e68a035d4. Two optional notes below, neither blocking.

# POLISH2 re-check (Opus), fix round e68a035d4

Scope: only the A184, A193 and A188 fixes. Read-only apart from this file. Tests:
`npx vitest run --maxWorkers=1 tests/nav.test.ts tests/guardPolish2.test.ts tests/searchAreaWiring.test.ts`:
3 files, 51 passed, 1 skipped (the A193 "on" case, as intended).

## 1. A184: the partial end stays on the goal's storey - fixed

- `findPath` (src/ai/navGrid.ts:614-623, :643-654, :663-665) keeps two bests. `bestOn` is the lowest octile among
  reached cells within `LAYER_PICK` 1.2 m (navGrid.ts:85) of the goal cell's height `gy`. `best` is the lowest octile
  plus the height gap in cells (`dh / cell`) among the other cells. `bestOn` wins whenever one exists (:665). Units
  agree: `octile` is in cells (navGrid.ts:704-709).
- The start counts for `bestOn` when it is on the goal's storey (:621-622). So when nothing on that storey is nearer
  than where he stands, `best === s` returns null (:666) and he stays put. Before the fix he climbed to the cell over
  the goal.
- Check A's case (ground goal behind a wall, an upper floor over it reached up a ramp): the band is 0-1.2 m. The ramp
  cells in that band sit at x <= 2.4, far from the goal, and the upper floor is outside the band, so the near side of
  the wall wins. The new nav.test.ts case asserts exactly this (end height < 0.5, 8 < x < 9.5, no waypoint at z >= 8).
  The test passes.
- Mezzanine over the goal: outside the band (dh about 3 m > 1.2), so it never wins. Low stair steps (<= 1.2 m) can win
  only when they are nearer the goal in 2D than the near side. That is still "near, on that storey", which is fine.
- A guard upstairs with a goal upstairs: the band is the upper floor, so he never goes down a stair to stand under it.
- Goal on a ramp: the band is the ramp section within 1.2 m. If any of it is reached, its nearest cell wins.
- Fallback with nothing reached on the goal's storey: the lowest octile plus the gap. A guard on the ground with a
  goal on an unreachable upper floor stands under it (every reached cell has the same gap). He does not climb a
  different stair, because there is no reached cell on that storey. Sane.
- Non-partial `findPath` is unchanged: the start's heap key is still `h0` = octile (:624, was `bestH` = octile). The
  best tracking now runs only under `partial` (:643). The only extra work is three scalar reads. No allocation: only
  scalars were added, `endP` scratch as before.

## 2. A193: deferred, off - fixed

- `HEAR_STOREY = false` (src/ai/enemy.ts:314-317). `hearSearch` snaps with
  `!SNAP_STOREY ? NaN : HEAR_STOREY && y === y ? y : this.pos.y` (enemy.ts:1216). When off, this is `pos.y` (or NaN
  with SNAP_STOREY off), the same as the pre-A193 line `SNAP_STOREY ? this.pos.y : NaN` (f07ffd52c). Nothing else
  reads `y`. The manager passing `pos.y` (enemyManager.ts hear) is therefore inert. The pre-A193 behaviour is
  restored exactly.
- BRIEF.md (A193 entry) and docs/systems/ai.md (A193 bullet) say DEFERRED, off, and name the spot-height slice. The
  changelog fragment drops the A193 line rather than saying "deferred". That is right for a player-facing fragment,
  because nothing ships. guardPolish2.test.ts asserts the off behaviour (spot x > 6), with the on case as `it.skip`.

## 3. A188: the LKP gets visited when its holder drops out - fixed

- Re-ask: a mate told no gets `searchK = 1` and `lkpWait = true` (enemy.ts:2778-2780). At each later pick of a
  combat plan search he asks again (:2781). On yes he gets `lkpLate`, and the spot is the LKP (:2786-2788).
  `searchLkpFor` (enemyManager.ts:3136-3146) then makes him the holder.
- No endless re-ask, no double visit:
  - The look end (:2824-2829) and the unreachable skip (:2847-2852) both clear `lkpLate` and `lkpWait` without
    `searchK++`. He then never asks again in this search.
  - Each pick first resets `lkpLate` (:2771). A spot replaced mid-walk (a heard noise) re-asks at the next pick. He is
    the holder by then, so he gets yes and resumes the LKP. That is no second visit.
  - While a holder stays, the mate's `lkpWait` stays set and each pick costs one `searchLkp` call that answers no.
    That is cheap, `buildPlan` is throttled, and he never gets stuck: he takes plan / ring points as before.
  - Departures: each holder who leaves after his look costs at most one more 3 s look, and the next taker becomes
    holder. This is bounded and documented.
- The invariant that `lkpWait` is clear whenever `searchK === 0` holds: all three `searchK = 0` sites also clear both
  flags (bodySearch enemy.ts:1094-1096, koSearch :1115-1117, the enter-searching transition :2120-2122). `searchK` is
  never set to 0 anywhere else. So the `else if` at :2781 cannot fire alongside a searchK-0 look, which would have
  been a double visit.
- `lkpBy` is freed (enemyManager.ts:3171-3177) when the holder is:
  - gone (`!e`)
  - dead or KO'd (`!e.alive`: `knockOut` zeroes hp, enemy.ts:2266-2270)
  - out of searching
  - on another hunt
  - in a crew sweep
  - on a body / KO search (`!inCombatSearch`, `combatSearch = false` at enemy.ts:1100 / :1121)
  - on his own stimulus (`ownSearch`, set by `searchAt` enemy.ts:1614)

  It is also freed when the centre moves (`reset` without `keep`, searchArea.ts:248-252).
- `ownSearch` getter (enemy.ts:569-571) returns `searchOwn`: correct. `inCombatSearch` (:564) returns
  `combatSearch`.
- Tests: searchAreaWiring.test.ts has two new cases on the real manager. In one, the holder is KO'd and the mate's
  next pick takes the LKP and then goes on. In the other, a holder pulled onto a body search or his own search frees
  it. Both pass.

## Optional (non-blocking)

1. A184, rare tie: a goal cell at mid-storey height (a stair landing or mid-ramp, about 2 m) with no reached cell in
   its band scores the floor below and the floor above with the same gap. The octile then decides, so a cell on the
   floor above can beat the near side on his own floor. This needs three things at once: `goTo` gives his own `y`,
   so the goal lands on his storey unless no own-storey cell is within about 2 m of the spot; the stair is shut at
   both ends; and the floor above is within the 3000-expansion budget. Smallest tie-break if wanted (navGrid.ts:650):
   add `Math.abs(this.height[j]! - this.height[s]!) / this.cell * 0.5` to the fallback score only. That prefers his
   own storey among equal gaps.
2. A188: `hearSearch` (enemy.ts:1211-1221) leaves `lkpLate` set. With `HEARD_KEEPS_K = true` (enemy.ts:297, the
   default), the heard look end takes the `heardSpot` branch first and the next pick re-asks, so this is correct. Only
   under the A12 undo (`HEARD_KEEPS_K = false`) would a heard look end the wait without an LKP look. Smallest fix if
   wanted: `this.lkpLate = false;` in `hearSearch`.
