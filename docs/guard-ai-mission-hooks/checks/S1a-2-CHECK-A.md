# guard-ai-mission-hooks S1a-2: check A (Enemy / EnemyManager mission orders)
Owner: Guard AI Build. Status: current.

Head checked: `777f1467f` (base `5db49d2ec`). Checker A (Opus 5.5), independent of checker B.
Read: S1a-BRIEF Part 2, PLAN Design 1 (offer table, breaker composition), BRIEF A4-A8, the S1a-1 `OrderBoard` API,
the whole diff (`enemy.ts`, `enemyManager.ts`, `tests/missionOrdersManager.test.ts`, `scripts/e2e-stealth-ai.mjs`).

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/missionOrders.test.ts tests/missionOrdersManager.test.ts tests/enemyGunMerge.test.ts
  tests/enemyLightsOut.test.ts tests/enemyManagerDespawn.test.ts`: 5 files, 60 tests, all green.
- e2e not run (queued separately: `laptop-e2e/mh-s1a2-early`).

## Verdict: FIX (1 item)

### 1. Order first: a cut held by a reset order is never put on the relight watch (`src/ai/enemyManager.ts:1327-1330`)
The new early return in `circuitOut` marks the lamps known (`dark.markGroup`) but skips `this.trackCut(group)`. If
the order then ends without relighting (dropped: the walker goes investigating, is knocked out, held, gives up, or
the board takes him off it), the circuit is off, its lamps are known, and it is on no watch: `relightStep` never
unmarks it, so late discovery never finds it again and nobody ever walks to the switch. That is the "dark for good"
hole polish B1 closed (`relightStep` doc, ~1386-1390), reopened under the flag. In "cut first" the first
`circuitOut` already tracked the cut, so only "order first" is hit; in Split Shift that is the player cutting 55 / 56
while #7 is on his reset, then drawing #7 off it.
Done looks like: `trackCut(group)` (idempotent, event rate, no allocation once the list has room) before the early
return, with the comment updated; `relightStep` then keeps the watch idle while `circuitBusy` sees the holder, and
after a drop it unmarks the group `BREAKER_WALK.retry` s later as today. One vitest case in the "order first" test:
order live, the cut noticed, the order dropped (e.g. `orderTick` 'down' or `onLevel` investigating on the probe /
`set(M_DROPPED)` on the board), then after `BREAKER_WALK.retry` (+ a `LATE_SCAN.tick`) of `lateStep` the circuit's
lamps are back on the dark list (or a fresh `circuitOut` reports as today). Flag off: unchanged (`holdsCircuit`
false).

## The rest of Focus A (correct)
- One offer at the event through the gate: `offer` reads `orderRefusal`, records the refusal as `add(M_DROPPED, why)`,
  else `add(M_WALKING)` and `takeOrder` only on true (false: logged, not taken); a guard dropped on a live order is
  never revived (`add` returns false). Matches the S1a-1 board API; `takeOrder`'s own refusal re-check can never
  fail after `''`, and its `set(M_DROPPED, 'refused')` fallback is harmless.
- Secure / lookout: `'secure'` from `Enemy.secure` (a flag-on lookout is a high-security copy); lead decision 2 (no
  runtime lookout check with the flag off) respected.
- Woken guard: never offered a pending order (no `placeSlot` on `revive`; a body at the event is recorded 'down', no
  `pend`). See polish 6 for a later event.
- Bell: tagged guards by `tierOf` (walls, masking) at the floor under the bell, `>= ORDER.bellTier`; out of reach or
  unheard -> 'unheard'; bystanders in reach with tier >= 1 get `hearTurn(x, z, 0)` only (no meter bump, no `hear`, no
  report, no incident); the guard who took it does not turn.
- Breaker: the reset takes over his own breaker walk (`orderRefusal` lets `brkGroup` on the order's circuit through
  before the incident test; `endBreaker` frees the `MODE_BREAKER` incident, the board closes it at its next `follow`);
  other walkers of the circuits `leaveBreaker`; `circuitBusy` and `circuitOut` treat `holdsCircuit` as the holder
  (apart from item 1). The reset at the board, the 'on' early end and only-still-off resets match the brief.
- Pair: `fillPair` reads `e.ordered` as not present (J15 S6 partner-gone path, as briefed).
- `clear()`: `orders.clear()` with every Enemy disposed in the same call; the mission map is kept.
- Drops on the way: `onLevel` past suspicious drops with the level as cause; a glimpse (`suspicious`, `rate > 0`)
  pauses; a board task / lure / breaker walk drops 'task' at the next `calmDecide`. Lead ruling (not `turning`; a
  glimpse that grows to investigating drops it) holds.
- Flag off: `missionOrder` returns first; every hook is gated by `live` / `pendN` / `holdsCircuit` (`live === 0`
  early out) / `ordered` / `orderSlot`, so no behaviour change and no per-step allocation. The `OrderBoard`,
  `OrderLeg` and goal objects are constructor-time, as the brief specified.
- Hot paths: `orderStep`, `orderTick`, `holdsCircuit`, `fillPair` allocate nothing (index loops, reused goal);
  `hyp3` / `hyp2` only, no `Math.hypot` in `src`. Strict TS clean.

## Builder's deviations (judged)
- Refusal by another order reads 'order', not 'busy': accepted (the brief's own `orderRefusal` list names 'order').
- A tagged guard down / held / passive at a bell is recorded with his cause, not 'unheard': accepted (more exact).
- e2e K's body hidden: accepted (keeps a bystander finding a body out of the scenario; K is still a body at the event).
- e2e P has a 2 m patrol: accepted (makes "then he walks back to his route" observable).
- Fail causes 'noPost' / 'noVia' / 'noCircuits': accepted (readable, recorded, one dev warn per name).
- `orderTick` also drops 'lost' (on the board, off the order): accepted as a safety net; it keeps a stale member
  from holding circuits for good.

## Polish list (not blocking)
1. `missionOrder` re-raised with the same live name rewrites the running slot's points, face, circuits and bell
   (`enemyManager.ts:2615-2626`); a second event with another post or kind would redirect walkers or null a reset's
   circuits (losing `holdsCircuit`). Fill those only for a fresh slot, or dev-warn and keep the first.
2. A pending tag (nobody placed yet) with a bell: the bell does not ring at the event (`:2638`), so bystanders do
   not turn. PLAN reads the bell as a sound at the event.
3. `pend` holds one tag per slot and clears at the first matching placement (`offerPlaced`, `:2783`): a zone tag
   naming two late-placed guards offers only the first.
4. `offerPlaced`: a placed guard who is not alive reads 'unheard' instead of 'down' (`:2797`).
5. `offer` re-offered to a guard already walking the same order logs "dropped (order)" though nothing changes
   (`:2718`).
6. A woken guard keeps his zone / slot tags (`inherit`), so a later event (not a pending one) offers him once he is
   calm. Reads right under A6 ("a woken guard never" picks up the pending offer); flag for the lead if PLAN's line
   "A woken guard ... is never offered an order" was meant absolutely.
7. A bystander already on another order gets `turnT` from a bell; it plays after his order ends (`:2777`). Skip
   `e.ordered` there.
