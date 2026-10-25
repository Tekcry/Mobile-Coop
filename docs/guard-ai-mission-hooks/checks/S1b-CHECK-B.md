# guard-ai-mission-hooks S1b: check B (code correctness and robustness)
Owner: Guard AI Build. Status: current.

Checker: fresh Opus 5.5 (B), independent of check A (not read). Diff checked: e138b2a7e..9f81055a1 (+1,068 / -40)
over `src/ai/missionOrders.ts`, `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `tests/missionGroups.test.ts`,
`tests/missionOrdersManager.test.ts`, `scripts/e2e-stealth-ai.mjs`. Against `slices/S1b-BRIEF.md` (steps 1-5, rules,
assumptions S1b-a..i, lead decisions). Every changed line read; the e2e scenario read, not run.

Runs: `npm run typecheck:fast` clean. `npx vitest run tests/missionGroups.test.ts tests/missionOrdersManager.test.ts
tests/missionOrders.test.ts tests/enemyManagerDespawn.test.ts`: 4 files, 72 tests, all pass.

## Verdict: PASS

No broken, unplayable or off-intent path found. The state machine has no dead end, slot reuse is clean, the hot path
allocates nothing, the flag-off path is unchanged, and the tests exercise each brief rule.

### What was checked
- **No member stuck.** `LEG_WAIT_VIA` exits when `gath` drops to 0. `gatherStep` runs every tick for a live slot, and
  `waitT` starts at the first `markVia`, so `joinWait` always fires. With no live member left, `gath` drops to 0.
  `LEG_FOLLOW` exits on giveUp while he walks, on leading (`lead === me` -> `LEG_TO_POST`), on the leader's end
  (`finishOrder`, cause 'lead'), or on any S1a drop. A follower whose leader left the list cannot stand on a NaN
  `leadP`: `orderTick` first drops the gone leader ('down'), so `firstLive` picks the next one (at worst himself, who
  then leads).
- **Leader drops mid-group.** While gathering, the next live member becomes `lead` before `gatherStep` in the same
  tick. A dropped member who had reached the via still counts as there (`memVia`, any state; S1b-a). After the group
  leaves, the new leader takes `LEG_TO_POST` from where he stands and keeps `walkT`. A new leader who is already
  `M_ARRIVED` (`ordAt`) is not re-set.
- **Order of a frame.** Legs step, then `orderTick` writes `lead` / `leadP`, then `gatherStep`. A member that switches
  to `LEG_FOLLOW` (at leave or S1b-h) therefore always has a valid `leadP` already, never NaN. The `lx !== lx` guard
  covers the rest.
- **Slot reuse.** `reset` clears `postId`, `viaId`, `gath`, `left`, `waitT`, `lead`, `leadP` and `memVia` over the
  slot's members. `OrderLeg.start` / `end` reset `me` and `near`. A revived guard is a new `Enemy` (orderSlot -1), and
  `add` never revives a dropped num, so no stale leg survives a knockout.
- **Drops.** Despawn, knockout and kill go through `orderTick` ('down'), held through `dropOrder`, alert through
  `onLevel`, and incident / breaker / lure through `calmDecide` ('task'). All go through `endOrder`, so the group just
  loses a member.
- **Flag off.** `missionOrder` returns first, `live` stays 0 and `orderTick` never runs. The only other change on a
  shared path is `takeOrder`'s extra `num` argument, and that call is unreachable with the flag off.
- **Hot path.** `orderTick` and the leg's `waitVia` / `follow` use index loops and `hyp2`, with one `atan2` per
  standing step. They create no closures, iterators or objects. The dev log builds its string only when `gatherStep`
  returns true and only under DEV. The `Map` and `for..of` in `checkMissionOrders` run at data time. No
  `Math.hypot` in `src`.
- **Co-op.** The work is host / solo sim state only; there is no wire, save or `src/net` change, and remotes pose from
  `MoveState` as before.
- **Tests.** The pure board and leg cases match the brief's items 1-3. The wiring cases cover: (a) a full group whose
  phase sequence forces the follower's `M_ARRIVED` rule (otherwise 'arrived' never shows), a 1.0-3.5 m gap and
  `finishOrder` once; (b) the busy-at-offer member, with the wait at `joinWait` +-0.25 s; (c) a breaker-walk 'task'
  drop; (d) a leader knockout, after which the follower leads to the post; (e) a reset group where only the leader
  calls `breakerReset`; (f) a lone order with a via; (g) flag off; (h) array and goal identity.
- **e2e 'mission group' scenario.** The setup is sound: a seeded `Math.random`, the player hidden at least 12 m from
  every point, a floor-checked via / post / spawn on straight clear lines, and `setMissionMap([], [])` in `finally`.
  The bounds are realistic: with `atVia` 2.5 m, B, spawned 1 m off V, waits at once (`bFar <= 1.5`). The case where B
  starts on the post side of A is handled by the `passed` gate. `joinWait` +-1 s and `atPost < 1` (arrive 0.8) leave
  margin. The step caps are 90 s for (a) and 120 s for (b), against roughly 45 s of sim time for the longer case (b).

## Polish (non-blocking; lead's call)
1. **A single event can form a group.** One event whose tag names 2+ guards and has a via now gathers, because
   `group()` counts `memN`. In S1a each of those guards walked alone. This is consistent with the brief's `group()`
   spec and with "lone = one member", but ai.md should say so. Undo: count members per event.
2. **The leader can lag behind the group.** The leader is the first live member in event order (S1b-e). If he is still
   on the via leg when `joinWait` ends, the members waiting at the via switch to `LEG_FOLLOW` and walk back towards
   him. This matches the brief, but it reads oddly in play. Option: followers keep waiting at the via until the
   leader passes it.
3. **Events of one name on different frames.** If the second event of a name fires after the first member already
   passed the via, the group still gathers (`left` is 0). The newcomer waits up to `joinWait` at the via. If the
   first member's look-round ends first, the newcomer is ended 'lead' while still at the via. This only matters if a
   mission fires same-name events on different frames; Split Shift fires them together.
4. **`missionOrder` only calls `group(s)` when this event has a via** (`via !== undefined`). A disagreeing second
   event with no via that joins a slot with a via skips grouping. `group()` already checks the slot's via, so the
   guard can go. This is a data error that `checkMissionOrders` already reports.
5. **A second pending tag overwrites the first** (S1a-2, pre-existing). `pend` holds one tag per slot. If both events
   of a group name tags that are not placed yet, the second tag overwrites the first, and the first guard never gets
   the order. Groups make this reachable on late-placed sections. Worth a line in ai.md, or a per-member pend in S3/S4.
6. **Test name contradicts the test.** `missionGroups.test.ts` "a member recorded dropped never counts as there"
   first marks the dropped member at the via, then asserts the group leaves. The second half and wiring case (b) test
   the real rule. Rename the case or drop its first half.
7. **The e2e measures against unsnapped points.** It checks `aAt` and `atPost` against the raw V / P, while the leg
   uses the nav-snapped points (a cell-centre offset). This is within the 0.5 s and 1 m bounds today; it is the first
   place to look if 'leaves within 0.5 s' flakes.
8. **Possible stop-start.** A follower who is faster than his leader can alternate standing and walking at the
   `followGap + FOLLOW_SLACK` edge, because there is no hysteresis. At equal pace the gap settles just past 2.0 m and
   holds. Watch for it in the visual pass.
