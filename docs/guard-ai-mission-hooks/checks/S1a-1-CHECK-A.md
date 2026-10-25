# guard-ai-mission-hooks S1a-1 check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker A (Opus 5.5, fresh: design vs PLAN), branch `feature/guard-ai-mission-hooks-s1a1`, head 758e3fe03, base
ca9f4d56a (flags.ts +15, src/ai/missionOrders.ts +528, tests/missionOrders.test.ts +264).

## Checks run
- `npm run typecheck:fast`, eslint, `git diff --check`: clean. `npx vitest run tests/missionOrders.test.ts`: 15 pass.
- Scratch typecheck: a `SectorDef` is assignable to `OrderSection` (C4 can pass sector defs). Scratch probe of four edge
  cases (scratchpad only). Purity: mathx, hearing, posts, type imports only; no randomness or clock; `step` and board
  methods allocate nothing; `hyp2`.

## Design vs PLAN
- Types, `ORDER` (+ `arrive` 0.8, S1a-a), `matchesTag` (A1), `resolvePoint` (A2) match. `OrderBoard` fixed slots,
  `Int32Array` ids (9000+ tested), `live` / `pendN` gates; `holdsCircuit` counts live reset members (cut-first and
  order-first rules); `clear()` keeps identity.
- Phases: walking > arrived > offered > done > dropped, free = none; 'gathering' typed and live, produced by S1b.
- `OrderLeg`: via, post (0.8 m, same storey 1.2 m), look (lure sweep for `lookT`) or reset (faces the switch; caller
  times `BREAKER.resetT`), done / give-up (walking time only); reused goal.
- `checkMissionOrders`: unmatched tags, unresolved post / via, high-security and lookout slots (lead decision 2), bad
  circuits, duplicate posts, bad bell reach, unheard bell through one wall plus masking; readable errors; the Two-Key and
  Split Shift fixtures pass (porter 2.5 m vs 9 m reach; 2.27 m under a 12 dB generator).
- Flags: names, URL switches, default off, doc text as PLAN "Flags".

## The builder's 7 choices
All sound: (1) one name keeps one slot (else `find` returns a stale slot); (2) a repeat offer never drops a walking
member (prevents a real bug); (3) `add` / `set` refresh (S1b puts 'gathering' in `refresh`); (4) `fail` keeps a running
order's members; (5) arrival heading from the via; (6) face wrapped to +-pi; (7) every post checked.

## Fix list
None.

## Polish
1. missionOrders.ts:236: `add` on a live member with a cause writes `cause[slot]` though nobody dropped.
2. missionOrders.ts:419: starting on the post with no via and no yaw, `base` = 0 (+Z), not his facing.
3. missionOrders.ts:509-523: a tag that also matches a dog / melee slot is not flagged (runtime refuses 'dog').
4. missionOrders.ts:520: the bell error could add the effective reach.
5. 10 module and 8 test lines over 120 chars.

## For S1a-2
1. Same name, same step, after a total drop: a second event reopens and resets the slot; S1b should treat a slot
   opened this step as joinable.
2. `add(M_WALKING)` revives a guard recorded dropped; `offer()` should skip a guard already on the slot (A6).
3. `fail()` on a full board does nothing (name reads 'none'): give it `open`'s dev warn.
4. Only `Enemy.endOrder` / `orderTick` move a live member off; mark `M_ARRIVED` on the walking -> LOOK / RESET step;
   check `leg.state` after `step` for GIVEUP / DONE; `pend` writes need `refresh`.
5. Re-pin enemy.ts / enemyManager.ts after PR4 lands (master changed both).
6. S1b: waiting state in `liveSt` and `refresh`; group fields (join timer, leader); a "group leaves" input and the
   leader position for `step`.
