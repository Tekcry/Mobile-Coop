# guard-ai-mission-hooks S1a-2: check B (intent and integration)
Owner: Guard AI Build. Status: current.

Checker: fresh Opus 5.5 (B). Head checked: 777f1467f (base 5db49d2ec), diff 1,491 lines (+1,491 / -4) over
`src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `tests/missionOrdersManager.test.ts`, `scripts/e2e-stealth-ai.mjs`.
Against: S1a-BRIEF Part 2, PLAN Design 1 / "Order with J15" / C1-C7, BRIEF (Michael said / picked, A4-A8), the S1a-1
board API ruling (add first, take only on true) and the lead ruling (the order walk is not `turning`).

## Verdict: FIX (one item, small)

The work is on intent: the bell sends the tagged guard who hears it (walls, masking) and bystanders, the dog included,
only `hearTurn(x, z, 0)`; a reset takes a running breaker walk over (one goes, no tamper clock, he relights it); the
phases read walking -> arrived -> done; the flag-off path is a no-op. One J15 / polish B1 rule breaks with the flag on,
in the path Split Shift is most likely to take.

### Fix 1: a dropped reset order in "Order first" leaves the circuit dark for good (A168 regression)
`src/ai/enemyManager.ts:1327-1331` returns from `circuitOut` on `holdsCircuit` before `this.trackCut(group)`. The lamps
are marked known (`dark.markGroup`) but the circuit never goes on the relight watch (`cutGroups`). If the order then
drops with the circuit still off (the facilities officer knocked out, alerted or past `giveUp` on the way),
`relightStep` never unmarks the group, so late discovery never sees those lamps again and no guard ever resets it.
That is the "stayed dark for good" bug polish B1 (A168) fixed. Split Shift reaches it naturally: an unwitnessed cut
(`n === 0` returns before `trackCut` too), the order arrives, late discovery then finds the dark lamps under the hold,
and the player knocks out #7 on his way. A6 says a dropped order hands him back to "his normal AI"; the site should go
back to its normal AI too.
- Done looks like: `this.trackCut(group);` runs before the `holdsCircuit` return (`trackCut` is idempotent, and
  `relightStep` already treats a held circuit as busy through `circuitBusy`, so nothing changes while the order runs).
  One `it` in `tests/missionOrdersManager.test.ts` ("Order first" block): hold 55, `circuitOut(55, ...)` with a witness,
  drop the order with 55 still off, step `relightStep` past `BREAKER_WALK.retry` -> `dark.known` for the 55 lamp is 0
  again (late discovery may find it). About +12 lines.

## What was checked (all PASS except Fix 1)
1. Intent (Michael's words, sign-offs). Two-Key Ledger "Hears and reacts": the bell is judged per tagged guard through
   `tierOf` (walls `WALL_FACTOR`, ambient masking, G299 "depending on whether they are near something noisey"); out of
   reach or masked = dropped 'unheard'; bystanders turn only, no `hear`, no incident, no report (`ringBell`
   `enemyManager.ts:2757-2779`). A KO'd porter reads 'dropped' ('down', via `bodies`), so C7's lamp / line stay off.
   Code Relay supervisor walk: via then post, look round 8 s, `walker.rejoin`. Split Shift reset via reception: the via
   leg and the reset at the board's own switch (`switchOf`) work for a single guard; grouping is S1b.
2. Campaign Build API vs C1-C7: `setMissionMap(sectionIds, posts)` (kept through `clear()`), `onMissionEvent(ev)`
   (circuits -> reset, A3), `orderPhase(name)`, `orderMembers(name)` (walking + arrived, no allocation), `orderOf(e)`
   (debug) all match C1 / C3 / C6 / C7. Tags `<sectionId>:<k>` read `missionSecs[e.section]` with `section` =
   `run.index` (`sectorMode.ts:924`), as C1's `run.defs.map((d) => d.id)` lays out. A replayed event with a pending
   tag is offered once at `placeSlot` (C3); a woken guard (`inherit`, `enemyManager.ts:1761`) never calls `placeSlot`.
3. J15 with the flag off: every hook gates on board state that stays empty (`live` 0, `pendN` 0, `holdsCircuit`
   false, `ordered` false); only `missionOrder` reads the flag. Flag on, no order: the same. Flag on with an order:
   pairs read an ordered guard as gone (PLAN rule), lookouts are `secure` (refused), an alerted / alarm-run / responder
   / crew guard is refused, a rise past suspicious drops the order (`onLevel`), a board task / lure / breaker walk drops
   it at the next `calmDecide`. The take-over frees the walker's incident (`endBreaker` -> -1) and the board closes it
   at its next `follow` (`incidents.ts:824-862`: an investigator off the task leaves; `busy === 0` closes); no second
   guard is sent because `circuitBusy` counts the hold. J15 test files unedited.
4. Board API ruling: `offer` adds `M_WALKING` first and calls `takeOrder` only when `add` returned true; a guard
   dropped on the slot is never revived (`add` refuses). Lead ruling: `takeOrder` sets `turnT = 0` and the walker is
   not `hearTurn`ed by his own bell (`e.orderSlot !== s`).
5. e2e 'mission order': it would fail on a wrong build (O walks if tagging ignores hearing; B has no `turning` if
   bystanders are skipped; `bad` catches a second guard or a re-sent breaker incident; phase list exact; one reset;
   look time 8 +-1 s). Setup is sound: `scen` resets first, the KO'd body is hidden (KO guards only wake when found),
   the post finder checks floor, line and distance from the player and O, sim-time steps (1,250 x 0.1 s in one
   evaluate, as other scenarios). It is the last scenario and restores `Math.random`, the mission map, crouch and
   light; `t.reset()` clears the board. `missionorders=1` for the page changes no other scenario (nothing else calls
   `missionOrder`).
6. Tests: 29 cases, real coverage of every brief case (flag off, offer table, causes, late placement, bell open / wall
   / masking / bystanders, cut first, order first, reset at the board, phases, giveUp, drops, orderTick, pairs, clear,
   torch, identity). The ~240 harness lines are the two copies the brief asked for, not padding. Nothing needs to move
   out: 1,491 lines is at the cap, and Fix 1 adds ~12.

Runs on 777f1467f: `npm run typecheck:fast` clean. `npx vitest run` missionOrders, missionOrdersManager, hearing,
breaker, guardRelight, campusS2Board, consoleFault, guardPolishB, pairs, pairsWiring, lookout, postsWiring,
enemyManagerDespawn, coopTorches, barkCause, dogRelease: 16 files, 252 passed; alarmRepeat, alarmCall: 2 files, 31
passed. e2e not run (lead queues it).

## Polish list (not blocking)
1. e2e `kOn` (`scripts/e2e-stealth-ai.mjs:3518`) cannot fail: a woken K is a new Enemy with `orderSlot` -1. Assert
   instead that K's `num` sits on the 'e2e-bell' slot as dropped with cause 'down' (`em.orders.mem` / `memSt`).
2. e2e (b) `otherBrk === -1` (`:3547`) is true before the order in this setup (only one walker); `leaveBreaker` is
   covered by vitest only. Fine; say so in the comment.
3. Untested paths: `offerPlaced` with a bell (`enemyManager.ts:2783-2801`); a tagged guard who hears the bell but is
   ineligible (dropped with his cause and turns); the `orderTick` 'lost' safety net (`:2817`).
4. `offerPlaced` reads a dead placed guard as 'unheard' (`e.alive &&`, ~2795); 'down' would match `missionOrder`.
5. For S1b: a second event with the same live name rewrites the slot's points, circuits and bell
   (`enemyManager.ts:2605-2626`), and a slot holds one `pend` tag, so Split Shift's two events ('s2:6', 's2:0', one
   name) both pending after a restart (C3) keep only the last tag. S1b's groups need a pending tag per member.
6. `ordWarned` is never cleared, so a mission re-raised after a restart with the same bad post warns once per page,
   not per load (dev only).
7. The fake guard harness carries stubs nothing here calls (check with a run before trimming) if the cap bites.

## ai.md lines
Nothing to add beyond the builder's report; Fix 1 adds "a held circuit is on the relight watch (`trackCut`), so a
dropped reset order hands it back to late discovery after `BREAKER_WALK.retry`".
