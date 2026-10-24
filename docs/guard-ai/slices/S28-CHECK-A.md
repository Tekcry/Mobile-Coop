# S28 check A (correctness and hot path)

Checker: fresh Opus, read-only. Worktree `C:/NightShift/Mobile-Coop-guard-ai-s28`, head 147c4a34, diff `79a527aa..HEAD`.

## Verdict: FAIL

One broken e2e check (static reading, not run: no e2e on this pass). The runtime change itself reads correct.

## Runs
- `npx vitest run tests/lockedDoorPath.test.ts`: 9/9 pass.
- `npx vitest run tests/guardDoors.test.ts tests/navClosure.test.ts`: 13/13 pass.
- `npx tsc --noEmit -p .`: clean.

## Findings

### F1 (FAIL) e2e-sectorops "sector ops: nav (M8 routes, sealed sections)" will fail
- `scripts/e2e-sectorops.mjs:633-697`, PARAMS `autostart=warehouseOps&mode=sector&sectorGuards=4`, `sim(0.3)` then the
  nav read.
- `SectorMode` locks every connector's near, far and seal doors at load (`src/game/modes/sectorMode.ts:370-383`,
  `lockDoor` = `setLocked(true)` + `setOpen(false)`) and adds no nav closure for them. Before S28 the grid ignored them;
  now the first `EnemyManager.update` (inside `sim(0.3)`) shuts all of them through `LockedDoorNav.sync`.
- `reach[].exit` (objective -> connector box centre) must pass the connector's near door, still locked before the
  objective: false. `seals[].path` (start i -> objective i+1) must pass near and far: null. Both asserts at ~694-695
  fail. The near door unlocks only on `CONN_UNLOCK_NEAR` (objective done).
- Same class as the Fallow read the builder already fixed in `e2e-course.mjs`: these are level-connectivity reads.
  Fix: in that evaluate, unlock the locked doors for the queries and lock them back (as in Fallow), or leave the
  `reach` / `seals` reads on an unlocked grid. Also re-check the campus route-leg reads (`e2e-sectorops.mjs` ~1954,
  2032, 2297, 3013, 3364) on the laptop: campusS1/S2/S4/S5 author `locked: true` doors; a guard route leg that crosses a
  plain locked door now fails there (it would also have stalled in play before S28).

### F2 (polish) goTo: a near-by goal can be skipped after a miss
- `src/ai/enemy.ts:2143-2155`. After a miss (`routeMiss`), a new goal within 1.5 m of the missed one is not planned
  until `routeT` runs out (<= 1 s) unless the line is clear. A search point that is reachable but sits within 1.5 m of a
  just-skipped unreachable one (e.g. the near side of a locked door) returns null and is skipped by the
  `searching ... d > 1.1` rule (~2306). Same if `routeMiss` is stale and the guard's own start moved (A* from a new spot
  could succeed). Low impact; clearing `routeMiss` when `lineClear` succeeds, or comparing to the goal at 0.5 m on a
  miss, would close it.

### F3 (polish) lock then shut lags one update
- `sectorMode.lockDoor` and `courseMode.applyLocks` call `setLocked(true)` before `setOpen(false)`. `onLocked` fires
  while `target` is still 1 (`lockedShut` false), so the closure shuts on the next manager update, not at once. Harmless
  in play (Sector Ops' own closures cover its doors); only an e2e that queries nav in the same evaluate would see it.

## Checked and fine
- Geometry: closure centre `d.cx, d.cz` = hinge + (sin yaw, cos yaw) * width/2, long axis along yaw (the leaf),
  0.35 half depth, (width + 0.5)/2 half length: identical to `addDoorClosure` (Sector Ops). With 0.5 m cells and no
  corner cutting the band always forms a wall. Off-doorway cells it touches are already inside the agent-radius wall
  margin.
- Guard in the doorway when it locks: `lockedShut` needs `target === 0`; `Doors.close` refuses with anyone within
  `DOOR.clearance`. Forced `setOpen(false)` can shut on someone (pre-existing); `findPath` / `lineClear` then start from
  `nearestWalkable` (his side), no wall-in.
- Overlap with Sector Ops closures: per-cell counts in `NavGrid.setClosed`; `addClosure` includes cells already held
  shut by another closure, so build order does not matter; a cell reopens only when both are open (tested).
- Version bumps: only on a real change (sync compares a Uint8Array; `setLocked` early-out). N locks in a frame = N
  bumps but one replan per guard / flow field next update. No toggling caller per frame.
- goTo for normal reachable goals: identical (empty route with `routeMiss` false replans at once as before). Goal
  becomes reachable: the lock change bumps `nav.version` -> replan that frame. Patrol point behind a locked door: same
  fallback as before (`?? g` straight walk, gate stops him).
- Allocation: `sync` loops typed arrays, no closures (allocPerCall test passes); the `onLocked` closure is made once;
  goTo adds no allocation (`?? []` on a miss is pre-existing, now at most once a second).
- `setLocked` no-op: before S28 it only wrote the flag, so no caller can rely on a repeat firing side effects. Callers
  (`courseMode` 1040/1318, `sectorMode.lockDoor`, `coopClient` 881) either guard already or do their side effects
  outside `setLocked`. Direct `anchor.locked` writes are editor-only; the per-update `sync` would catch them anyway.
- Client: puppets build no nav / manager, `onLocked` stays null there.
- `checkStageActions` softlock check is test-only (no `LockedDoorNav` there), unaffected.
