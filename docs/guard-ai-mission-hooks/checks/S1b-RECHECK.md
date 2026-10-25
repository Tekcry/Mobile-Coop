# guard-ai-mission-hooks S1b: fix re-check (checks A + B)
Owner: Guard AI Build. Status: current.

Head checked: `4947ef2c8` (fix diff `8b8dac0fc..4947ef2c8`: `missionOrders.ts`, `missionGroups.test.ts`,
`e2e-stealth-ai.mjs`). Checker: fresh Opus 5.5. Read: S1b-CHECK-A (Fix 1), S1b-CHECK-B (polish 2), the whole fix diff,
`OrderBoard` / `OrderLeg` in full, `missionOrder`, `placeSlot`'s join, `orderTick`, `Enemy.orderStep` / `endOrder` /
`calmDecide`, BRIEF A6, PLAN walk items.

Lead decision implemented (2026-10-26): `joinWait` starts at the current leader's arrival at the via and runs only
while he is there; a member dropped at the offer never joins, the next member leads.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/missionGroups.test.ts tests/missionOrders.test.ts tests/missionOrdersManager.test.ts
  tests/enemyManagerDespawn.test.ts`: 4 files, 76 tests, all pass.
- e2e not run here (laptop queue; the builder did not run it either).

## Verdict: PASS

1. **Check A Fix 1 closed (Split Shift).** `markVia` starts `waitT` only for `lead[slot]`; `gatherStep` (called only
   in `orderTick`, right after `lead = firstLive`) holds `waitT` at -1 and returns false while the leader's `memVia`
   is 0, and starts / runs it while it is 1. #7 (first event) leads; #1 (1.75 m from `s2-reception`, inside `atVia`)
   marks the via but starts no clock and stands in `LEG_WAIT_VIA`. When #7 gets within `atVia` (40-50 s by path, well
   under `giveUp` 120 s) every member is there, so the group leaves that same tick: #7 takes `LEG_TO_POST` from the via
   (one tick in `LEG_WAIT_VIA`: he "stops at reception"), #1 goes `LEG_FOLLOW`. C7's "Two of them coming" now fires
   with the two together.
2. **No member stuck forever.** A gathering group waits only on its leader. A leader on `LEG_TO_VIA` runs `walkT`
   every leg step and gives up at 120 s (`endOrder(false, 'giveUp')` -> dropped); the next live member leads. A
   promoted leader still walking resets the clock to -1 and is bounded by his own `giveUp` (counted from his start,
   so it can only be shorter); a promoted leader already at the via starts the clock that tick. The chain ends: each
   step drops one member, and with no live member `gatherStep` clears `gath`. Leg pauses (suspicious with `rate > 0`)
   are pre-existing S1a behaviour and transient (the meter either falls or reaches investigating, which drops him). A
   late second event after the leader passed the via (`gath` set again, leader `memVia` 0) now waits on the leader's
   end ('lead') or his drop (then the late member leads from the via, `joinWait`, alone): bounded.
3. **Check B polish 2 impossible as claimed.** A `LEG_WAIT_VIA` member turns `LEG_FOLLOW` only once `gath` is 0, and
   `gatherStep` can clear `gath` (with a live member) only with the leader's `memVia` 1, so no member at the via ever
   walks back to a leader still on his via leg. The only remaining "walk back" is a leader dropping after the group
   left with the next in event order behind (polish 2 below), a different case.
4. **Tests test it.** Against the old rule each new case fails: the 35 m wiring case asserts `waitT` -1 until A is in
   `LEG_WAIT_VIA`, `aAt * 0.1 > joinWait`, `leftAt === aAt`, B never moves before leaving and never in `LEG_FOLLOW`
   while A is on `LEG_TO_VIA` (old: leaves at 20 s with A ~15 m out). The leader-drop wiring case asserts `waitT` -1
   at 15 s, the clock at 0.1 the tick B is promoted, and leaving at `joinWait` +-0.25 s. The board cases cover the
   follower-no-clock rule and both leader-change branches (already there: clock starts; still walking: clock -1, then
   `joinWait` after his arrival). The old busy case (b) still passes unchanged (the busy member is never the leader).
5. **e2e change sound.** A grunt on an order walks 0.9 x `PACE.patrol` 1.1 = 0.99 m/s; from 23-26 m he needs
   20.5-23.5 m to get within `atVia`, i.e. 20.7-23.7 s plus the start, so `aAt > joinWait` holds by construction
   (thinnest at 23 m, tried only if 24 and 25 m find no spot at any of nine bearings). Map, seed and sim steps are
   fixed, so the pick and timings are deterministic, not flaky. Caps: (a) ~25 + 12 + 8 = ~45 s against 120 s; (b) ~25
   + 20 + 12 + 8 = ~65 s against 150 s.
6. **Hot path, TS, flag.** `gatherStep` adds one `at()` index loop; no allocation, no closure, no `Math.hypot` in
   `src`. Typecheck clean. Flag off: `orderTick` never runs (`live` 0); nothing on a shared path changed.

## Open edge: busy first-event guard (pre-existing): polish, not blocking
If the first event's guard is busy (or down), the slot reads 'dropped', `isLive` is false, and the second event's
`open()` resets it: the second guard gets a lone order and walks via -> post at once, with no 20 s wait. For Split
Shift that is #7 busy (#1 then goes alone from reception straight away). BRIEF A6's stated Split Shift case is the
other way round (#1 busy, #7 waits `joinWait` and goes alone), and that path is right. The reverse case still ends as
intended in play: one guard walks to the plant room and resets both boards, C7 sees one member (no "two of them"
line). Only the symmetric 20 s pause at reception and the recorded drop of #7 are lost. Off-symmetry, not off-intent:
polish 1.

## Polish
1. Busy first-event guard (above): keep the slot open for a same-name event in the same frame (e.g. `open()` treats a
   'dropped' slot whose drops are all offer-time and whose `seq` is this frame's as live), so #1 waits `joinWait`
   like #7 does. Before S2's walk at the latest, or log it as accepted.
2. A leader dropping after the group left, with the next live member in event order still behind (on his via leg):
   followers already past the via turn back to him. Rare (needs 3+ members or a late join); a "first live member who
   has left the via" lead rule would cover it.
3. A leader change while the clock runs keeps the old leader's elapsed wait (new leader already at the via). Consistent
   with "he has been there all along"; say so in ai.md.
4. Late second event after the leader passed the via (A polish 2 / B polish 3): the late member now waits at the via
   until the leader's look-round ends ('lead'), phase 'gathering' while the leader walks. Still worth "leader past the
   via = left" when a mission fires same-name events on different frames.
5. e2e: 23 m leaves ~0.7 s over `joinWait`; dropping 23 from the radius list (24-26 only) would widen the margin.
   Earlier polish (A 1, 3-5; B 1, 4-8) stands.
