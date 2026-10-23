# S22 (AI side) - fresh check

PASS (fresh Opus checker, 2026-10-23), commit 301ade39 on walk 906765a4. No blocking findings.

## Checks run
- `tsc --noEmit` clean.
- 24 vitest files, 358 tests: consoleFault, breaker, incidents, enemyLightsOut, securityRoom, securityBodies, alarmCall,
  sectorRestart, postsWiring, guardDoors, deviceTrip, sectionAlert, enemyManagerDespawn and every other wiring test that
  touches EnemyManager. No e2e (reviewer scope; Test Runner runs stealth-ai, ct-warehouse, ctcourse, sectorops:6).

## Matches the ask (G6)
- Notices only with the screens in view (12 m cone, or 4 m to the side) and the same room or one clear `MASK.SIGHT`
  ray; walls block it; radio does not count.
- A distracted guard (task, investigating, suspicious, held, alarm) never notices; once calm, `consoleStep` lets him.
- One walker at patrol pace, works it 2 s, the host resets it, he goes back calm.
- A second cut within 60 s gets the S2 check (`consoleCheck` line), then the reset walk. Nobody sees it: nothing happens.

## Fake ids are safe
- Board keys 150000 + index; light ids stay below 100000, course groups are small (10-13): no collision.
- `findMerge` merges a breaker incident only with the same key; `DarkList.markKey` is skipped for console keys; real
  groups never reach `isConsoleGroup`.
- Breaker, light and Sector Ops paths unchanged apart from routing in the `breakerOff` / `breakerReset` callbacks;
  lights untouched, light parity holds.

## Hot paths
Typed arrays only, no allocation per step (`grow` only when a console registers). Reads `pos` / `yaw` and collision, no
graphics state.

## Game-side plan (slices/S22.md) against marlow-final 67794f95
`gateRt`, `endWindow`, `flagCleared`, `consoleGate`, `devices[cid].y`, `handle()` every step and `bayRestart` ->
`dropSquad(true)` -> `resetMemory` all exist as the plan assumes. Expect e2e-ctcourse A4 step 3 (`setPassive` officer) to
change, as documented.

## Polish list
1. `enemyManager.ts` `consoleStep` inner loop: `seesConsole` (a raycast) runs before the cheap `consoleBusy` check;
   swap the order.
2. No host, or `reset` returns false: the console stays off and a guard re-walks about every 3 s plus the walk time
   (only when the game wiring is missing or out of sync).
3. Same-room shortcut in `seesConsoleAt`: no ray, so racks or furniture in the room do not block the view (as the light
   rule).
4. `boardStep`: `con` (a `keyOf` slot scan) is computed for every send; compute it only for light or breaker sends.
5. Michael sees no change until the game wiring lands (the refusal is still `guard.alive`).
