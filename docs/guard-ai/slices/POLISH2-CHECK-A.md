FIX - 1 blocking item (A184: the partial end ignores the storey). A186, A187, A189, A190, A194 pass.

# Polish batch 2 - check A (A184, A186, A187, A189, A190, A194)

Checker: fresh Opus, read-only. Branch `feature/guard-ai-polish2`, head d45d526e9 (PR #377). Delta reviewed:
`git diff origin/feature/guard-ai-polish...HEAD`. Line numbers are on that head.

## Blocking

1. **A184: the partial end can be on another storey.** `findPath` picks the reached cell with the lowest 2D
   octile (navGrid.ts:612, :634). `octile` (navGrid.ts:675) ignores height, so on a multi-layer grid the cell
   straight above or below the goal scores 0. If any route to that storey is inside the 3000-expansion budget, it
   beats the near side of the locked door (octile >= 1-2). `goTo` passes no height for an investigate spot
   (enemy.ts:2612 `y = this.pos.y`), so the goal cell sits on the guard's own storey and the cell above it wins.
   Probe (scratch test, head code): a 20 x 10 m grid, ground floor split by a wall at x 10, an upper floor at 4 m over
   x >= 8, a ramp at z 8-10. `findPath([2, 2], [15, 5], 3000, 0, 0, true)` returned
   `[[0.75, 8.25], [9.75, 8.25], [15.25, 5.25]]`. That route goes up the ramp, across the upper floor over the wall
   and ends 4 m above the goal. In game: a guard sent to a noise behind a locked door (every door has a closure,
   lockedDoors.ts) on a multi-storey map (campus, Marlow) can climb a flight of stairs, stand on the floor above,
   look 4 s and stand down. This is not the "near side" the plan's Fix and test describe. It does not freeze him
   and does not walk him through a wall. It is still wrong behaviour that a player will see.
   **Smallest fix (navGrid.ts `findPath`, only when `partial` is set, no allocation):** add the height gap in
   cells to the best-cell score:
   ```ts
   const gy = this.height[g]!;                       // after g is known
   let bestH = this.octile(s, gx, gz) + (partial ? Math.abs(this.height[s]! - gy) / this.cell : 0);
   ...
   const h = this.octile(j, gx, gz);
   if (partial) {
     const hp = h + Math.abs(this.height[j]! - gy) / this.cell;
     if (hp < bestH) { bestH = hp; best = j; }
   }
   heap.push(j, ng + h);
   ```
   Add a case to `tests/nav.test.ts`: the grid above (two layers, a ramp, a wall on the ground floor). The partial end
   must be on the ground floor (`heightAt(end, 0)` about 0) on the guard's side of the wall.

## Evidence per item

### A184 (findPath partial + the investigate fallback)
- navGrid.ts:598-655. `partialEnd` is reset on every call. `best` and `bestH` are scalars. The partial end's
  centre goes into the `endP` field scratch (`centerInto`). No allocation is added beyond today's path build
  (`cells`, `via`, `out`). With `partial` false the result is as before: `if (!partial) return null` (:646). The only
  extra work is one compare per push (polish 1). Callers that pass 5 args are unchanged: enemy.ts:3043, :3501,
  :3605, enemyManager.ts:333, gameState.ts:1777, sectorStage.ts:186/189 (its interface takes 5 params, still
  assignable), spawnPlace.ts:88, vip.ts:91.
- The partial end is a cell A* reached through `fillNeighbours`, so it never crosses a shut closure or leaves the
  nav. The `came` chain from `best` back to `s` is the A* tree. Smoothing is today's `smoothCells`.
- `goTo` (enemy.ts:2609-2642): `routeNear = partial && routeMiss && partialEnd` (:2635). A line-clear return clears
  it (:2620). The investigating branch (enemy.ts:2808-2815) treats `!wp && routeNear` as arrived: `spotArrived`
  true, facing the spot. `AlertMachine` (alertState.ts:180-186) then counts `lookT` and ends the investigation at
  `investigateLook` 4 s. The 1 s `routeT` retry is today's, and each retry gives the same null with `routeNear`
  true, so the investigation ends. A door unlocked mid-walk bumps `nav.version`, which replans to the full path.
  Searching keeps its skip (`part` is false for searching), and patrol and chase pass no `partial`.
- Tests: `nav.test.ts` "(polish2 A184)" and `lockedDoorPath.test.ts` "(polish2 A184)". Both fail on
  origin/feature/guard-ai-polish (lockedDoorPath.test.ts:393, `minDoor` 3 not < 1.5) and both fail with
  `NEAR_SIDE = false` (same assert).

### A186 (high-cover overwatch holds his peek point)
- enemy.ts:3373 `owSuppress`, :3374 `suppressLkp`, :3392 `!cp.low && (peeking || (OW_HIGH_PEEK && owSuppress))`.
  `tryFire` aimed fire and `peekCycles` are still gated on `peeking` (:3380-3383). Low cover is untouched.
- S27 / A7-A8 suppress rules are unchanged (enemy.ts:3067-3092): the cast goes from `muzzle(..,'suppress')`, has a
  0.25 s cache and uses `SUPPRESS_LINE` STATIC | PROP. Holding the edge means fewer muzzle moves while a verdict is
  cached. The verdict from behind the wall is conservative (blocked) until the next cast, and once the mate stops
  `owSuppress` is false, so no round goes out from behind the wall on a stale "clear".
- One-mover rule: the overwatch stays `inCover` and is not a point or flank `seekCover`, so the e2e `movers` and
  `roleBound` counts (e2e-stealth-ai.mjs:2744-2747) do not change.
- Test guardPolish2.test.ts:207 fails on origin (:227, `hideAtEdge` 0 vs >= 322) and with `OW_HIGH_PEEK = false`
  (same assert). Test :231 (mate stops) passes on both.

### A187 (alert-step recall)
- enemy.ts:2061-2071. `told` is taken before `takeSighting` (whose recall stays false when told). `calledMask` gets
  `told`, and `hunt` only when not told or when hunt is the told one. `callContact()` runs once when called, on the
  net, told, and seeing someone else. `callContact` marks the bit itself (:1578-1583). Not called but told:
  today's own call at :2082-2084 still names the seen player.
- G139: he hunts B only because he sees B, and he calls B in because he saw him. The told A stays marked called.
- Test twoIntruders.test.ts "(polish2 A187)" fails on origin (:684, 0 contact calls) and with `ALERT_RECALL = false`.

### A189 (flank detour 2.5x)
- enemy.ts:265 `flankK: 2.5`. :3046 `boundTo` passes `flankK` only for `R_FLANK`. `detour(.., k = COVER_DETOUR.k)`
  (:3512) keeps `pickCover` (:3605) and point bounds on `k`. `boundTo` has one caller (enemy.ts:2987, a point or
  flank role bound).
- Test guardPolish2.test.ts:383 passes on head. With `flankK = 1.5` (the const assert removed) it fails at :387:
  the flank is rejected, `['chase', -1]`.

### A190 (instant detect for any player)
- enemy.ts:2394, :2457, :2468. Calm and non-passive only. The pick is the nearest player for whom
  `instantDetect(P_SIGHT)` holds, using the same `si` fields the tail rebuilds (dist, angle, light, exposure, pitch).
  So the tail's `instantDetect(si)` at :2510 fills the meter for him. Combat (`alerted`) is unchanged. No allocation.
  G139: the pick is a player he senses this think.
- Test coopPerception.test.ts "(polish2 A190)" fails on origin and with `INSTANT_ANY = false` (:417, target A). The
  combat case passes.

### A194 (known-spot exits need a spot)
- enemy.ts:3334: `blindCover` also needs `sawOnce || hasStimulus || huntPos() !== null`. `huntPos` is a lookup
  (`lkpOf`), with no allocation. With none of them he uses today's feet rule, as the plan says.
- Test guardPolish2.test.ts:457 fails on origin and with `KNOWN_NEEDS_SPOT = false` (:463, `attack`). Test :467
  (with a sighting, he still leaves) passes.

### Runs
- Head: `npx vitest run --maxWorkers=1` guardPolish2, lockedDoorPath, nav, twoIntruders, coopPerception,
  guardPolishA: 6 files, 87 tests pass.
- origin/feature/guard-ai-polish (`git archive` copy in the scratchpad, the head test files copied in): all 10 new
  polish2 tests fail on a behaviour assert (A189's on the const). The 57 older tests in those files pass.
- Head copy with all five enemy.ts undo consts false and `flankK` 1.5: the A184, A186, A187, A189, A190 and A194 tests
  fail. The other 44 tests in those files pass, so each undo restores the old behaviour.

## Polish (non-blocking)
1. navGrid.ts:633-637: the `bestH` / `best` tracking also runs for callers that pass no `partial` (one compare per
   push). It could be gated on `partial`; the fix above does that for the height term.
2. enemy.ts:2641 `return this.routePath[0] ?? p`: after the last partial waypoint is shifted he steers one frame
   towards the unreachable spot before the next replan sets `routeNear`. This is today's pattern for full routes and
   does not take him through the closure (lockedDoorPath A184: `finds` < 30, x < 0 throughout).
3. A187: a guard told by the net says "joining" (enemy.ts:2030) and in the same step shouts and calls in B (the
   contact). That is two lines in one step.
4. A194: with no spot of any kind, the fallback is the player's real feet. It is unreachable today (roles need
   `hunt >= 0`), as the plan says. A later pass could hold cover with no exit test instead.
5. A190: with `TARGETS.all` false (S23's undo), `inst` still overrides the nearest pick. This does no harm, but that
   undo is no longer the exact pre-S23 rule.
6. A189 test: the first assert pins the const (2.5), so with the undo it fails on the number before the behaviour
   check. Asserting the behaviour alone would make the undo check direct.
