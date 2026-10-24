# S28 check B - integration and gameplay (fresh Opus checker B)

Branch `feature/guard-ai-s28` at 147c4a34 (off master 79a527aa). Read-only review of `git diff 79a527aa HEAD`, the
builder report `S28.md`, and every lock / unlock site. Run: `npx vitest run tests/lockedDoorPath.test.ts` - 9/9 pass.
No e2e run (as briefed).

## Verdict: FAIL (one broken e2e suite; the game code itself is sound)

The code does what it says and the A7 fix is right. But the slice turns every locked shut door into a nav wall. One e2e
block that reads the guards' grid as the level's static connectivity was missed, and its asserts will now fail. The
preamble rule applies: grep `scripts/` for asserts on a changed behaviour and update them in the same change. The
builder did this for the Fallow read in `e2e-course` but not here.

## Findings

### F1 (blocking) - e2e-sectorops "sector ops: nav (M8 routes, sealed sections)" fails (scripts/e2e-sectorops.mjs ~636-697)
- `SectorMode.findDoors` (`src/game/modes/sectorMode.ts:368-382`) locks and shuts every connector's near and far door
  at load. The block runs after `sim(0.3)`, so `EnemyManager.update` has built `LockedDoorNav` and shut those doorways.
- Before S28, connector doors had no closure, so all three asserts in the block passed. Now:
  - `every walked route leg has a nav path`: WAREHOUSE_SECTORS s1 route 1 ends `[-14.5,-9.4] -> [-14.5,-7.4]`, which
    crosses C1's near door (`nearAt [-14.5,-8.8]`). The s2 routes start `[-14.5,-7.2] -> [-14.5,-5.4]` across C1's far
    door (`[-14.5,-6]`) and end `[-4.8,14.55] -> [-1.0,15.0]` across C2's near door. The s3 routes start across C2's far
    door (`[-0.95,12]`). Each of these legs gets "no path".
  - `each section's objective and exit are reachable from its start`: `toExit` runs to the connector box's centre,
    behind the locked near door, so it is null.
  - `a section is reached only through its connector`: `open` (start -> next objective) crosses both locked connector
    doors, so `s.path` is false.
- Probably also failing (same cause, depends on which way `nearestWalkable` snaps at the door centre): the campus
  per-section route checks `every walked route leg has a nav path` / `every S2|S3|S4|S5 route leg has a nav path`
  (~1954, ~2032, ~2297, ~3013, ~3364). Each section's routes end in its connector through the near door, which is
  still locked while the check runs. Example: campus s1 routes end `[-20,-34] -> [-20,-32]` through C1 near
  (`c1Near [-20,-34]`).
- Fix (test-side, the same pattern as the Fallow read): inside the same `evaluate`, unlock the locked doors
  (`doors.setLocked(d, false)`; `Doors.onLocked` opens the S28 closures at once), run the queries, then lock them back.
  Bolt, keypad and lockdown closures stay as they were, so these reads measure what they measured before.
- The builder's "Check on the laptop" list names only the e2e-sectorops bolt block (~1506-1563). That block is fine:
  Unbolt -> `lockDoor(false)` -> `setLocked` -> `onLocked` -> `sync` opens the closure in the same evaluate, so
  `n1.open` holds. The re-bolt leaves the closure open until the next update (`setLocked(true)` fires while `target` is
  still 1), but the bolt closure and `step(1.0)` cover it.

### F2 (should-fix, gameplay / docs) - an unreachable goal now stalls him in place, not at the door
- `findPath` has no nearest-reachable fallback, so a goal behind a locked door with no way round returns null:
  - investigating: `point` null, so he stands where he is up to `ALERT.investigateMax` 20 s (fresh noise keeps him
    there);
  - chase: `flowNext` is null, so he stands;
  - search: the point is skipped (good);
  - patrol: he walks straight at the point and is stopped by the closure.
- Before S28 he walked to the leaf and stood there. That is no worse, and arguably more natural for a noise behind a
  door. But S28.md's "Play" line says "a guard sent there goes round to the nearest reachable point or gives up", and
  he does not. "Make noise inside the cage" is also not doable before the sync: the cage is closed, with a lid.
- Correct the report's play line. A follow-up could path to the closure's near side.

### F3 (risk, unverified) - long detours vs the `goTo` A* budget (3000 expansions)
- A7: the technician's way to the pod round the cage is lobby -> plant corridor -> `A7-pod-s`, about 45 m against
  about 14 m straight. Heap pops count stale duplicates, so that search may run near 3000. If it runs out, he gets "no
  path" and the F2 stand-still, which looks like the reported stall.
- Not testable here without a map build (brief: only the one vitest). Check it on the laptop A7 run: a noise at T2 in
  the pod should bring the technician round by the corridor.

### F4 (polish, docs)
- `src/ai/doorGate.ts:14-16` still says "the grid keeps every doorway walkable" (A116).
- `docs/guard-ai/BRIEF.md:478` A116 still says "the guard stops at its leaf and waits there". Amend both, or add an
  S28 A-entry.
- `Enemy.goTo` `routeMiss`: a new goal within 1.5 m of a goal that failed is not re-planned for up to 1 s (it returns
  null). A reachable search ring point next to an unreachable one can be skipped. Minor.

## Lock sites checked (all reach `LockedDoorNav`: by `onLocked`, or by the per-update `sync`)
- `courseMode.applyLocks` (`setLocked`, then `setOpen(false)` for an airlock rear door: shut on the next update). Hold
  and timedHold gates lock without shutting, and a locked open door stays walkable, as designed.
- `applyCourseWire` / `coopClient.ts:881`: client only. A puppet has no nav and no `EnemyManager`, so `onLocked` is
  null there and nothing changes. `src/net` is untouched and nothing new goes on the wire.
- `sectorMode.lockDoor`: connectors, seal doors, keypad `enterCode` / `rekey`, team bolts / pair gates through
  `SectorTeamDoors`, and stage lockdown through `StageHooks.lock`. Overlap with the Sector Ops closures is counted per
  cell; both must open.
- Editor (`openingCatalogue`, `security.ts` reader doors): these set `a.locked` at authoring time and are picked up by
  `sync`. A reader door is a wall to every guard ("no guard has a key"; no G entry says otherwise).
- `sectorReset.applyDoors`: restores open or shut only; picked up by `sync`.
- Benchmark flight: `openAll` runs before any manager update, so it is unaffected.

## Marlow sets (A1-A8), guards against locked doors
- A7: the technician's loop (x <= 84.4) stays clear of the cage-w closure (x 85.65-86.35). The cage doors and `L7-near`
  unlock on `a7-sync`, and the closures open at once. The fix covers the reported stall when a way round exists.
- A8: N2's grille stop (133.2, 62.0) is about 0.8 m from the grille line, outside its closure (x 133.65-134.35), so
  e2e step 5 "N2 is at the grille stop" holds. The officer (gallery, y 4.4) can no longer route through the locked stair
  foot. He reaches the hall by the public stair. The vault lobby is unreachable while the grille is locked, which is
  correct.
- A4: `A4_DOCK2_ROUTE` (x 78.3+) clears the L4 east wicket (push bar at 76.5, 34.6). A6 cage: no route through it.
- No Marlow patrol, post or e2e step relies on a guard waiting at, or crossing, a locked door. e2e-ctcourse A7 / A8 read
  only lock states, not nav.

## Other e2e suites
- e2e-tactics and e2e-stealth (`proving`), e2e-stealth-ai, e2e-enemies, e2e-levels and e2e-ct-warehouse (`warehouse`,
  which has no locked doors): no assert affected.
- e2e-course: the edited Fallow read is honest. It unlocks, queries and relocks in one evaluate, `onLocked` makes the
  grid follow both ways, and `applyLocks` never sees a change.
- e2e-sectorops: see F1. e2e-missions `isWalkable` objective reads: only at risk if an objective sits within 0.35 m of a
  locked door line (none seen).

## Docs
- `ai.md` (doors and nav, multi-level paragraph) and the changelog fragment match the code.
- `TESTING.md`'s "with no other way he stops short" holds loosely: for an investigation he does not move at all (F2).
