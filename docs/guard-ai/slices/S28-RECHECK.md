# S28 re-check (fix round 902c86c7)

Checker: fresh Opus, read-only. Worktree `C:/NightShift/Mobile-Coop-guard-ai-s28`, branch `feature/guard-ai-s28`, diff
`147c4a34..902c86c7`, against `S28-CHECK-A.md`, `S28-CHECK-B.md` and S28.md "Fix round".

## Verdict: PASS

Every FAIL finding is closed. No broken or wrong behaviour found. Two minor notes below, neither blocking.

## Runs
- `npx vitest run tests/lockedDoorPath.test.ts`: 9/9 pass.
- `npx vitest run tests/ctcourse/a7LockedCage.test.ts`: 1/1 pass. Its log line: "through the cage 391 pops; cage locked
  1611 pops, 47.8 m". This matches the report.
- `npm run typecheck:fast`: clean. `node --check scripts/e2e-sectorops.mjs`: ok. No e2e run (as briefed).

## F1 e2e-sectorops level reads: closed
- Six evaluates were changed (~641, ~1951, ~2033, ~2300, ~3019, ~3373). Each one collects `doors.list` where
  `anchor.locked` is true, calls `setLocked(d, false)`, runs its queries and then calls `setLocked(d, true)`. All of this
  happens in one synchronous evaluate with no `await`, so no frame runs in between.
- The state is restored exactly:
  - `Doors.setLocked` writes only `anchor.locked` and fires `onLocked`. It never touches `target`, `open` or the body,
    so open or shut state is unchanged.
  - The reads call `world.doors.setLocked`, not `sectorMode.lockDoor`, so door items and the Sector Ops closures (bolt,
    keypad, lockdown, pair gate) are untouched.
  - `onLocked` calls `LockedDoorNav.sync`. Unlocking opens the S28 closures. Relocking re-shuts the same ones, because
    `target` is still 0. Locked doors that stand open have no closure either way.
  - `world.doors.onLocked` is assigned in one place only (`enemyManager.ts:2701`), so it is not overwritten.
  - One `NavGrid` and one `EnemyManager` exist per world (`gameState.ts:671-672`). No rebuild per section leaves a stale
    closure set behind.
  - With all locks off, the grid matches the pre-S28 grid, so the reads measure what they measured before.
- The only lasting side effect is `nav.version` going up by 2 per read. It is read only by `Enemy.goTo` (one replan)
  and the manager's flow field (one rebuild), and no e2e assert reads it.
  - Warehouse block: the read is the last step of its own `run`.
  - Campus blocks: every one runs after `g.enemyMgr.update = () => {}`, so the bump never reaches the AI.
  - If a manager never updated, `onLocked` is null. The read then runs on a grid that has no S28 closures, which is
    still correct.
  - A throw mid-read would leave the doors unlocked, but the run fails at that point anyway.
- The claim "no Sector Ops guard needs a path through a locked connector" holds:
  - Order of events: `findDoors` locks near, far and seal at load. `connEvents` unlocks through `lockDoor` ->
    `setLocked` -> `onLocked`, which syncs at once. CONN_LOAD comes before CONN_UNLOCK_FAR within the cycle.
  - Guards of the new section live inside it. Its far and seal doors face its own side; the campus seal door is a side
    door of section 2.
  - Reinforcements use `reinforceSlot`: the stage response route, else `reinforce` points.
  - No map authors `entries`.
  - Both response routes stay inside their section: campus S4 stage 2 and S5 stage 1. The S4 lockdown door at (14, 17)
    is not on its route.
  - Spot checks found no spawn, static post or reinforce point inside a lock closure:
    - warehouse s2 loader (-6, 16.2) against C2 near (-4, 14.55);
    - stocktaker end (-21.4, 11.0) against the cage door line at z 12, closure z 11.65-12.35;
    - campus s1 reinforce (-33, -41) and (-31.7, -41) against the dock door, closure z -40.35 to -39.65.
  - Since S20, `doorGate` has refused every locked leaf, so no path that crossed a locked door before S28 was
    walkable then either.

## F2 doc matches code: closed
- S28.md's play line is corrected, and the fix-round section describes the real behaviour: investigate stands, chase
  stands, search skips, patrol walks straight to the doorway.
- No "nearest point" claim is left in `S28.md`, `ai.md` or the changelog fragment.
- `TESTING.md` says "with no other way he stops short". That wording is loose for investigate (he does not move) but
  not false.

## F3 A7 detour against the A* budget: closed
- `tests/ctcourse/a7LockedCage.test.ts` is real. It uses:
  - the real `buildCtcourse` grid through `runtimeNav`;
  - the production `LockedDoorNav` on the real door anchors, with the cage W/E doors and `L7-near` (`A7_EAST_DOOR`)
    locked, which are the doors the `a7-sync` gates hold;
  - `addClosure`, which starts open, so the "through the cage" baseline is honest.
- It asserts:
  - the round path exists at `goTo`'s 3000 budget;
  - the path is longer than 20 m, so it goes round;
  - the minimum pops are 3000 or fewer (1611 measured);
  - after unlocking, the pop count is exactly the baseline again (391).
- The `anchorLock` gates in A7 are climbing anchors, not doors, so leaving them out is correct.

## Polish: no regression, no hot-path allocation
- `Doors.setOpen` fires `onLocked` when a locked door is shut. It runs after `target = 0`, so `lockedShut` is true and
  the closure shuts at once.
  - The early return `(target === 1) === open` stops repeat firing.
  - Every caller is a one-off event: `lockDoor`, `applyLocks`, `sectorReset.applyDoors` and the studio `doorsShut`.
    None is per frame.
  - On the client, `onLocked` is null.
  - The new `lockedDoorPath` case (locked while open stays walkable, then a shut closes it with no update between) is
    a real test.
- `goTo`:
  - `routeMiss` is cleared when the straight line is clear (a boolean write).
  - The retry radius for a missed goal is now 0.5 m. This only adds retries compared with 1.5 m, and is still far fewer
    A* calls than master, which replanned an empty route every frame.
  - Reachable goals behave as before.
  - No new allocation. The `?? []` on a miss was already there and still runs at most about once per 0.5 m of goal
    movement.
- The `doorGate.ts` comment is updated and accurate.

## Notes (not blocking)
- N1: `setOpen(d, true)` on a door that is still locked does not fire `onLocked`, so its closure opens one manager
  update later. No in-game caller does this: `connEvents` unlocks the far door before opening it. Making the hook fire
  on both directions (`if (d.anchor.locked) this.onLocked?.(d)`) would make it symmetric.
- N2: `BRIEF.md` A116 (on `feature/guard-ai`) still needs the amendment the fix round wrote out. That is for the job
  lead.
